import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { mockAccessJwks, signAccessJwt, accessJwtHeaders, TEST_TEAM_DOMAIN, TEST_AUD } from "./helpers/access-jwt.mjs";

// Records exactly which user_key each write landed under, so tests can
// confirm a verified JWT derives the same identity the pre-JWT header-only
// mechanism would have — the actual backward-compatibility guarantee.
class RecordingD1 {
  rows = new Map();
  lastWriteKey = null;
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            return db.rows.get(values[0]) || null;
          },
          async run() {
            if (sql.includes("account_deck_benches")) {
              db.lastWriteKey = values[0];
              db.rows.set(values[0], { bench_json: values[1], revision: values[2], updated_at: "now" });
            }
            return { success: true };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  }
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("access-identity-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const ctx = { waitUntil() {}, passThroughOnException() {} };

// Real Access verification configuration — no dev bypass here, since
// these tests exist specifically to prove the cryptographic path works
// (and that nothing else can substitute for it).
const accessEnv = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
  ACCESS_AUD: TEST_AUD,
});

const benchRequest = (headers, body) =>
  new Request("https://example.test/api/account/deck-bench", {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body ?? { bench: { schemaVersion: 1, families: [] }, baseRevision: 0 }),
  });

const expectedUserKey = async (email) =>
  crypto.createHash("sha256").update(`metaforge-account:${email}`).digest("hex");

test("rejects a request with no Access JWT and no dev bypass configured", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(benchRequest({}), accessEnv(new RecordingD1()), ctx);
  assert.equal(response.status, 401);
});

test("rejects a JWT with a valid shape but an invalid signature (forged/tampered token)", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const token = await signAccessJwt({ useWrongKey: true });
    const response = await worker.fetch(benchRequest(accessJwtHeaders(token)), accessEnv(new RecordingD1()), ctx);
    assert.equal(response.status, 401);
  } finally {
    restore();
  }
});

test("rejects a JWT signed for the wrong Access application (wrong audience)", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const token = await signAccessJwt({ audience: "some-other-applications-aud-tag" });
    const response = await worker.fetch(benchRequest(accessJwtHeaders(token)), accessEnv(new RecordingD1()), ctx);
    assert.equal(response.status, 401);
  } finally {
    restore();
  }
});

test("rejects a JWT from the wrong issuer (wrong Access team domain)", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const token = await signAccessJwt({ issuer: "https://a-different-team.cloudflareaccess.com" });
    const response = await worker.fetch(benchRequest(accessJwtHeaders(token)), accessEnv(new RecordingD1()), ctx);
    assert.equal(response.status, 401);
  } finally {
    restore();
  }
});

test("rejects an expired JWT", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const token = await signAccessJwt({ expiresInSeconds: -60 });
    const response = await worker.fetch(benchRequest(accessJwtHeaders(token)), accessEnv(new RecordingD1()), ctx);
    assert.equal(response.status, 401);
  } finally {
    restore();
  }
});

test("a forged email header alone, with no valid JWT, does not authenticate", async () => {
  const worker = await loadWorker();
  // This is the exact regression this whole change closes: before,
  // sending just this header was sufficient to authenticate as anyone.
  const response = await worker.fetch(
    benchRequest({ "cf-access-authenticated-user-email": "founder@metaforge.example" }),
    accessEnv(new RecordingD1()),
    ctx,
  );
  assert.equal(response.status, 401);
});

test("a forged email header alongside an otherwise-invalid JWT still does not authenticate", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const badToken = await signAccessJwt({ useWrongKey: true, email: "real-owner@example.com" });
    const response = await worker.fetch(
      benchRequest({
        ...accessJwtHeaders(badToken),
        "cf-access-authenticated-user-email": "attacker@example.com",
      }),
      accessEnv(new RecordingD1()),
      ctx,
    );
    assert.equal(response.status, 401);
  } finally {
    restore();
  }
});

test("a valid, correctly signed JWT authenticates and derives the same user_key the pre-JWT header-only mechanism used", async () => {
  const worker = await loadWorker();
  const restore = await mockAccessJwks();
  try {
    const DB = new RecordingD1();
    const token = await signAccessJwt({ email: "Real.Owner@Example.com" });
    const response = await worker.fetch(benchRequest(accessJwtHeaders(token)), accessEnv(DB), ctx);
    assert.equal(response.status, 200);
    // Access always populates its own convenience email header from this
    // exact JWT claim, normalized the same way (trim + lowercase) both
    // before and after this change — so this must be byte-identical to
    // what a pre-existing account's stored user_key already is.
    assert.equal(DB.lastWriteKey, await expectedUserKey("real.owner@example.com"));
  } finally {
    restore();
  }
});

test("local dev bypass is inert unless ALLOW_DEV_AUTH_BYPASS is explicitly set, even with the dev header present", async () => {
  const worker = await loadWorker();
  const DB = new RecordingD1();
  const envWithoutBypass = {
    DB,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    METAFORGE_BOOTSTRAP_LOCK: "unlocked",
    // Deliberately no ACCESS_TEAM_DOMAIN/ACCESS_AUD and no
    // ALLOW_DEV_AUTH_BYPASS — the shape any real deployed env has today.
  };
  const response = await worker.fetch(
    benchRequest({ "x-dev-user-email": "someone@example.com" }),
    envWithoutBypass,
    ctx,
  );
  assert.equal(response.status, 401);
});

test("local dev bypass works when explicitly enabled, deriving the same user_key as a real JWT would for the same email", async () => {
  const worker = await loadWorker();
  const DB = new RecordingD1();
  const bypassEnv = {
    DB,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    METAFORGE_BOOTSTRAP_LOCK: "unlocked",
    ALLOW_DEV_AUTH_BYPASS: "true",
  };
  const response = await worker.fetch(
    benchRequest({ "x-dev-user-email": "Real.Owner@Example.com" }),
    bypassEnv,
    ctx,
  );
  assert.equal(response.status, 200);
  assert.equal(DB.lastWriteKey, await expectedUserKey("real.owner@example.com"));
});

test("the dev bypass cannot supersede real Access verification when both are configured together", async () => {
  const worker = await loadWorker();
  const DB = new RecordingD1();
  // The exact accidental-deploy scenario this fail-closed check exists
  // for: ALLOW_DEV_AUTH_BYPASS somehow set alongside real production
  // Access config. No JWT is sent — only the dev header — so if the
  // bypass fired here it would be a real production auth hole.
  const misconfiguredEnv = {
    DB,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    METAFORGE_BOOTSTRAP_LOCK: "unlocked",
    ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
    ACCESS_AUD: TEST_AUD,
    ALLOW_DEV_AUTH_BYPASS: "true",
  };
  const response = await worker.fetch(
    benchRequest({ "x-dev-user-email": "attacker@example.com" }),
    misconfiguredEnv,
    ctx,
  );
  assert.equal(response.status, 401);
});
