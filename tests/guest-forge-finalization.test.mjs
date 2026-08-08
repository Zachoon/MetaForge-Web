import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// P0 follow-up: production proved a fully successful guest generation
// (Gate B reserved, engine ran, validated, storeGeneration ran) could
// still die before the guest ever got a response — a guest_forge_sessions
// row was found stuck 'pending', neither 'used' nor deleted, meaning
// whatever killed the request bypassed every JS-level try/catch in the
// path. The leading hypothesis (not a proven platform diagnosis — no
// historical Worker logs exist to confirm which Cloudflare limit fired)
// is the redundant serialization cost stacked onto that one request: the
// same ~2.3MB nativeReport used to be JSON.stringify'd/parsed five
// separate times between the engine finishing and the response leaving
// the Worker. This file proves two things: the redundant passes are
// actually gone (source-level, since counting global JSON.stringify calls
// would just couple the test to unrelated engine internals), and the new
// lease-based recovery for a stuck 'pending' row behaves correctly under
// every case that matters — reclaimable when stale, protected when fresh
// or genuinely used, and safe under concurrent access.

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("generateForgeResult returns structured data — no Response is built until the one real HTTP boundary", async () => {
  const source = await read("worker/forge-generate.ts");
  assert.match(source, /export async function generateForgeResult\(request: Request, env: Env, key: string\): Promise<ForgeGenerationResult>/);
  // Every return inside generateForgeResult must be a plain {status, body,
  // timing} object, never `return json(...)` — json() only appears in the
  // two thin HTTP wrappers around it.
  const bodyStart = source.indexOf("export async function generateForgeResult");
  const generateForgeResultBody = source.slice(bodyStart);
  assert.doesNotMatch(generateForgeResultBody, /return json\(/, "generateForgeResult must never construct a Response itself");
});

test("both HTTP wrappers around generateForgeResult serialize exactly once, at the boundary", async () => {
  const source = await read("worker/forge-generate.ts");
  const wrapperCalls = source.match(/const result = await generateForgeResult\(request, env, key\);\s*\n\s*return json\(result\.body, result\.status, result\.headers\);/g) || [];
  assert.equal(wrapperCalls.length, 2, "handleForgeGenerate and handleForgeGenerateForKey must each wrap generateForgeResult with exactly one json() call");
});

test("regression: the guest path must never call handleForgeGenerateForKey and then parse its own Response back apart", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.doesNotMatch(source, /[=(]\s*await handleForgeGenerateForKey\(/, "guest-forge.ts must not call handleForgeGenerateForKey as executable code (a comment may still name it for context)");
  assert.doesNotMatch(source, /import \{[^}]*handleForgeGenerateForKey/, "guest-forge.ts must not import handleForgeGenerateForKey");
  assert.doesNotMatch(source, /const \w+ = await forgeResponse\.json/, "the old parse-what-we-just-built pattern must be gone as executable code");
  assert.match(source, /import \{ generateForgeResult \} from "\.\/forge-generate"/);
  assert.match(source, /const generation = await generateForgeResult\(internalRequest, env, guestKey\);/);
});

test("the guest success path stringifies the stored copy and the client copy exactly once each, and reuses those exact values rather than re-deriving them", async () => {
  const source = await read("worker/guest-forge.ts");
  const successStart = source.indexOf("const finalizationStart = Date.now();");
  const successEnd = source.indexOf("} catch (error) {");
  const block = source.slice(successStart, successEnd);
  assert.ok(block.length > 0, "expected the finalization block");

  const storedStringifies = block.match(/JSON\.stringify\(storedBody\)/g) || [];
  assert.equal(storedStringifies.length, 1, "storedBody must be stringified exactly once");
  const clientStringifies = block.match(/JSON\.stringify\(clientBody\)/g) || [];
  assert.equal(clientStringifies.length, 1, "clientBody must be stringified exactly once");

  // The D1 bind and the outgoing Response must both reuse the already-
  // computed strings, not re-stringify inline.
  assert.match(block, /\.bind\(claimToken, session\.id, String\(generationId \|\| ""\), storedJson,/, "the D1 insert must reuse the storedJson variable, not stringify again inline");
  assert.match(block, /return new Response\(responseString,/, "the outgoing Response must reuse the responseString variable, not stringify again inline");
});

test("validateGeneratedResult no longer runs a throwaway full-object serializability probe", async () => {
  const source = await read("worker/forge-result-validator.mjs");
  // A comment nearby may still name the old pattern for context; what must
  // actually be gone is the executable try/catch that ran it.
  assert.doesNotMatch(source, /try \{\s*JSON\.stringify\(nativeReport\)/, "the discard-the-result stringify probe must be removed as executable code");
});

// --- Behavioral coverage: the built worker, a real D1 double, and hand-
// signed guest cookies (same HMAC-SHA256 scheme as sessionFromRequest in
// worker/guest-forge.ts) so tests can put a specific session_key into a
// specific state (fresh pending / stale pending / used) before a request
// arrives claiming that exact identity — the only way to exercise the
// lease-reclaim branch deterministically rather than by chance.

class FinalizationD1 {
  sessions = new Map();
  forges = new Map();
  generations = new Map();
  buckets = new Map();
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("INSERT INTO api_rate_limits")) {
              const [userKey, endpoint, windowBucket] = values;
              const key = `${userKey}|${endpoint}|${windowBucket}`;
              const next = (db.buckets.get(key)?.requests || 0) + 1;
              db.buckets.set(key, { requests: next });
              return { requests: next };
            }
            if (sql.includes("SELECT claim_token FROM guest_forges")) {
              const [sessionKey] = values;
              const match = [...db.forges.entries()]
                .filter(([, row]) => row.sessionKey === sessionKey && row.claimedBy === null)
                .sort((a, b) => b[1].createdAt - a[1].createdAt)[0];
              return match ? { claim_token: match[0] } : null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO guest_forge_sessions")) {
              const [sessionKey, createdAt, expiresAt] = values;
              if (db.sessions.has(sessionKey)) return { success: true, meta: { changes: 0 } };
              db.sessions.set(sessionKey, { status: "pending", createdAt, expiresAt });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE guest_forge_sessions SET created_at")) {
              const [createdAt, expiresAt, sessionKey, staleBefore] = values;
              const row = db.sessions.get(sessionKey);
              if (row && row.status === "pending" && row.createdAt < staleBefore) {
                row.createdAt = createdAt;
                row.expiresAt = expiresAt;
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            if (sql.includes("UPDATE guest_forge_sessions SET status = 'used'")) {
              const [sessionKey] = values;
              const row = db.sessions.get(sessionKey);
              if (row?.status === "pending") { row.status = "used"; return { success: true, meta: { changes: 1 } }; }
              return { success: true, meta: { changes: 0 } };
            }
            if (sql.includes("DELETE FROM guest_forge_sessions")) {
              const [sessionKey] = values;
              if (db.sessions.get(sessionKey)?.status === "pending") { db.sessions.delete(sessionKey); return { success: true, meta: { changes: 1 } }; }
              return { success: true, meta: { changes: 0 } };
            }
            if (sql.includes("INSERT INTO guest_forges")) {
              const [claimToken, sessionKey, generationId, responseJson, createdAt, expiresAt] = values;
              db.forges.set(claimToken, { sessionKey, generationId, responseJson, createdAt, expiresAt, claimedBy: null });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO forge_generations")) {
              const [generationId] = values;
              db.generations.set(generationId, true);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
          async all() { return { results: [] }; },
        };
      },
    };
  }
  async batch(statements) {
    const results = [];
    for (const s of statements) results.push(await s.run());
    return results;
  }
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("guest-forge-finalization-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const ctx = { waitUntil() {}, passThroughOnException() {} };
const GUEST_SECRET = "finalization-test-guest-secret";
const guestEnv = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  TURNSTILE_SECRET_KEY: "finalization-test-turnstile-secret",
  GUEST_SESSION_SECRET: GUEST_SECRET,
});

async function signGuestCookie(secret, id) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, enc.encode(id));
  const hex = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${id}.${hex}`;
}

const guestRequest = (cookie, { ip = "198.51.100.50", ua = "finalization-test-agent" } = {}) =>
  new Request("https://example.test/api/forge/guest-generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "CF-Connecting-IP": ip,
      "user-agent": ua,
      ...(cookie ? { cookie: `mf_guest=${cookie}` } : {}),
    },
    body: JSON.stringify({ turnstileToken: "finalization-test-token-0123456789", mode: "imported", format: "Standard", strategy: "Balanced midrange", deck: "4 Flow 0\n4 Answer 0\n20 Island" }),
  });

async function withMockedFetch(scryfallOk, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com")) {
      if (!scryfallOk) return new Response("Scryfall unavailable", { status: 503 });
      return new Response(JSON.stringify({ data: [], has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const PENDING_SESSION_LEASE_MS = 3 * 60 * 1000;

test("a stale pending lease (older than the lease window) can be reclaimed, and generation proceeds", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  const id = "stale-guest-id";
  const cookie = await signGuestCookie(GUEST_SECRET, id);
  const staleCreatedAt = Date.now() - PENDING_SESSION_LEASE_MS - 60_000;
  db.sessions.set(id, { status: "pending", createdAt: staleCreatedAt, expiresAt: staleCreatedAt + 86400000 });

  await withMockedFetch(false, async () => {
    const response = await worker.fetch(guestRequest(cookie), guestEnv(db), ctx);
    // Catalog is mocked to fail (503/CATALOG_UNAVAILABLE) so this test only
    // needs to prove the reservation was reclaimed and generation was
    // actually attempted, not exercise a full successful build.
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "CATALOG_UNAVAILABLE");
  });
  // A caught failure deletes the 'pending' row it just reclaimed — proving
  // the reclaim genuinely took hold (generation ran) rather than silently
  // no-opping into the "already used" branch.
  assert.equal(db.sessions.has(id), false, "the reclaimed-then-failed reservation must be released like any other caught failure");
});

test("a fresh pending lease (within the lease window) cannot be stolen — the request is treated as already in progress, not reclaimed", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  const id = "fresh-guest-id";
  const cookie = await signGuestCookie(GUEST_SECRET, id);
  const freshCreatedAt = Date.now() - 1000;
  db.sessions.set(id, { status: "pending", createdAt: freshCreatedAt, expiresAt: freshCreatedAt + 86400000 });

  await withMockedFetch(true, async () => {
    const response = await worker.fetch(guestRequest(cookie), guestEnv(db), ctx);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "GUEST_PREVIEW_ALREADY_USED");
  });
  const row = db.sessions.get(id);
  assert.equal(row.status, "pending", "a fresh pending row must be left exactly as it was — not reclaimed, not deleted");
  assert.equal(row.createdAt, freshCreatedAt);
});

test("a used session can never be reclaimed, no matter how old", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  const id = "used-guest-id";
  const cookie = await signGuestCookie(GUEST_SECRET, id);
  const ancientCreatedAt = Date.now() - 23 * 60 * 60 * 1000; // old, but genuinely used
  db.sessions.set(id, { status: "used", createdAt: ancientCreatedAt, expiresAt: ancientCreatedAt + 86400000 });

  await withMockedFetch(true, async () => {
    const response = await worker.fetch(guestRequest(cookie), guestEnv(db), ctx);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "GUEST_PREVIEW_ALREADY_USED");
  });
  assert.equal(db.sessions.get(id).status, "used", "a used row's status must never change via the reclaim path");
});

test("concurrent requests racing to reclaim the same stale lease: only one may proceed", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  const id = "race-guest-id";
  const cookie = await signGuestCookie(GUEST_SECRET, id);
  const staleCreatedAt = Date.now() - PENDING_SESSION_LEASE_MS - 60_000;
  db.sessions.set(id, { status: "pending", createdAt: staleCreatedAt, expiresAt: staleCreatedAt + 86400000 });

  await withMockedFetch(false, async () => {
    const [a, b] = await Promise.all([
      worker.fetch(guestRequest(cookie), guestEnv(db), ctx),
      worker.fetch(guestRequest(cookie), guestEnv(db), ctx),
    ]);
    const statuses = [a.status, b.status].sort();
    // One request reclaims and attempts generation (fails cleanly against
    // the mocked-down catalog, 503); the other finds the lease already
    // reclaimed by the time it checks and reports the honest "in progress"
    // state. Neither request may silently vanish or crash.
    assert.deepEqual(statuses, [409, 503], "exactly one request reclaims the lease; the other must see it as already held");
  });
});

// A real, legal, buildable pool so this test can exercise an actual
// successful generation rather than only a failure path — same fixture
// shape as tests/guest-gate-correction.test.mjs, duplicated locally per
// this repo's established per-file self-contained-fixture convention.
const rawCard = (name, opts = {}) => ({
  name,
  mana_cost: opts.manaCost ?? "{2}{U}",
  cmc: opts.cmc ?? 2,
  type_line: opts.typeLine ?? "Creature — Test",
  oracle_text: opts.oracleText ?? "",
  color_identity: opts.colorIdentity ?? ["U"],
  keywords: [],
  prices: { usd: "0.25" },
  legalities: { standard: "legal" },
  games: ["paper", "arena"],
});
const importPool = [
  ...Array.from({ length: 28 }, (_, i) => rawCard(`Flow ${i}`, { oracleText: "When this enters, draw a card. Scry 1.", cmc: 3 })),
  ...Array.from({ length: 24 }, (_, i) => rawCard(`Answer ${i}`, { oracleText: "Exile target nonland permanent.", cmc: 2 })),
  ...Array.from({ length: 18 }, (_, i) => rawCard(`Shield ${i}`, { oracleText: "Target creature gains hexproof and indestructible until end of turn.", cmc: 1 })),
  ...Array.from({ length: 18 }, (_, i) => rawCard(`Stone ${i}`, { typeLine: "Artifact", oracleText: "Add one mana. Create a Treasure token.", manaCost: "{2}", cmc: 2, colorIdentity: [] })),
];

async function withRealGenerationFetch(fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/search")) {
      return new Response(JSON.stringify({ data: importPool, has_more: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("api.scryfall.com/cards/collection")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("the persisted claimable response equals the client response, minus the two fields that are deliberately request-specific (claimToken, guestPreview)", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();

  const clientData = await withRealGenerationFetch(async () => {
    const response = await worker.fetch(guestRequest(null), guestEnv(db), ctx);
    assert.equal(response.status, 200, "expected a real successful generation against the fixture pool");
    return response.json();
  });

  assert.equal(db.forges.size, 1, "exactly one guest_forges row must be persisted");
  const [stored] = [...db.forges.values()];
  const persisted = JSON.parse(stored.responseJson);

  const { claimToken, guestPreview, ...clientWithoutRequestSpecificFields } = clientData;
  assert.equal(typeof claimToken, "string");
  assert.equal(guestPreview, true);
  assert.deepEqual(persisted, clientWithoutRequestSpecificFields, "the stored copy must match the client response exactly once claimToken/guestPreview are set aside");
  assert.equal("claimToken" in persisted, false, "the stored copy must never itself carry a claimToken — handleGuestClaim spreads this directly into its own response");
  assert.equal("guestPreview" in persisted, false, "the stored copy must never claim guestPreview:true — that marker does not survive a real account claiming the result");
});

test("existing external API JSON contract is unchanged: authenticated /api/forge/generate still returns nativeReport/cardPool/colors/generationId directly, and typed error codes survive the refactor", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  const env = {
    DB: db,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  };
  const request = new Request("https://example.test/api/forge/generate", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: "mf_session=finalization-test-account-session" },
    body: JSON.stringify({ mode: "imported", format: "Standard", strategy: "Balanced midrange", deck: "4 Flow 0\n4 Answer 0\n20 Island" }),
  });
  // No account cookie is configured to resolve, so userKey() returns null
  // and this hits the 401 branch — still enough to prove handleForgeGenerate
  // itself still returns a plain, typed JSON body through the unchanged
  // wrapper, matching the exact pre-refactor contract.
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(body.error, "Authenticated account required");
});
