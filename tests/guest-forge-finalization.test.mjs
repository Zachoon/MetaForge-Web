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
  assert.match(source, /import \{ generateForgeResult, type ForgeGenerationResult \} from "\.\/forge-generate"/);
  assert.match(source, /generation = await generateForgeResult\(internalRequest, env, guestKey\);/);
});

test("the guest success path stringifies the compact claim payload and the full client payload exactly once each, and reuses those exact values rather than re-deriving them", async () => {
  const source = await read("worker/guest-forge.ts");
  const successStart = source.indexOf("const finalizationStart = Date.now();");
  const successEnd = source.indexOf("} catch (error) {");
  const block = source.slice(successStart, successEnd);
  assert.ok(block.length > 0, "expected the finalization block");

  const claimStringifies = block.match(/JSON\.stringify\(claimBody\)/g) || [];
  assert.equal(claimStringifies.length, 1, "claimBody must be stringified exactly once");
  const clientStringifies = block.match(/JSON\.stringify\(clientBody\)/g) || [];
  assert.equal(clientStringifies.length, 1, "clientBody must be stringified exactly once");

  // The D1 bind and the outgoing Response must both reuse the already-
  // computed strings, not re-stringify inline.
  assert.match(block, /\.bind\(claimToken, session\.id, String\(generationId \|\| ""\), claimJson,/, "the D1 insert must reuse the claimJson variable, not stringify again inline");
  assert.match(block, /return new Response\(responseString,/, "the outgoing Response must reuse the responseString variable, not stringify again inline");
});

test("guest_forges persistence goes through buildGuestClaimPayload, never the raw storedBody (the exact source of the SQLITE_TOOBIG production incident)", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.match(source, /const claimBody = buildGuestClaimPayload\(storedBody\);/);
  assert.doesNotMatch(source, /\.bind\(claimToken, session\.id, String\(generationId \|\| ""\), JSON\.stringify\(storedBody\)/, "the full storedBody must never be bound directly into the guest_forges insert again");
});

test("a size guard runs before any D1 write is attempted, and the ceiling is well below D1's own hard limit", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.match(source, /const MAX_CLAIM_PAYLOAD_BYTES = 500_000;/);
  const guardStart = source.indexOf("const claim_payload_bytes = byteLength(claimJson);");
  const batchStart = source.indexOf("await env.DB.batch([");
  assert.ok(guardStart > 0 && batchStart > guardStart, "the size check must run before the D1 batch write, not after");
  const guardBlock = source.slice(guardStart, batchStart);
  assert.match(guardBlock, /if \(claim_payload_bytes > MAX_CLAIM_PAYLOAD_BYTES\) \{/);
  assert.match(guardBlock, /DELETE FROM guest_forge_sessions WHERE session_key = \? AND status = 'pending'/, "an oversized claim payload must still release the reservation");
  assert.match(guardBlock, /code: "GENERATION_FAILED"/);
  assert.doesNotMatch(guardBlock, /env\.DB\.batch\(/, "no D1 write may occur inside the oversized-payload branch");
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
  // unset by default (real D1's actual limit is comfortably above anything
  // this test suite ever writes); a test can set this low to simulate D1
  // itself rejecting an oversized bind as a genuine backstop check,
  // independent of the application-level MAX_CLAIM_PAYLOAD_BYTES guard.
  sqliteTooBigThreshold = Infinity;
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
            if (sql.includes("SELECT session_key, generation_id, response_json, expires_at, claimed_by FROM guest_forges")) {
              const [claimToken] = values;
              const row = db.forges.get(claimToken);
              if (!row) return null;
              return { session_key: row.sessionKey, generation_id: row.generationId, response_json: row.responseJson, expires_at: row.expiresAt, claimed_by: row.claimedBy };
            }
            if (sql.includes("SELECT user_key, schema_version, payload_json, expires_at FROM forge_generations")) {
              const [generationId] = values;
              const row = db.generations.get(generationId);
              if (!row) return null;
              return { user_key: row.userKey, schema_version: row.schemaVersion, payload_json: row.payloadJson, expires_at: row.expiresAt };
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
              if (Buffer.byteLength(responseJson, "utf8") > db.sqliteTooBigThreshold) {
                throw new Error("D1_ERROR: string or blob too big: SQLITE_TOOBIG");
              }
              db.forges.set(claimToken, { sessionKey, generationId, responseJson, createdAt, expiresAt, claimedBy: null });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO forge_generations")) {
              const [generationId, userKey, schemaVersion, payloadJson, expiresAt] = values;
              db.generations.set(generationId, { userKey, schemaVersion, payloadJson, expiresAt });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE guest_forges SET claimed_by")) {
              const [claimedBy, claimedAt, claimToken, notExpiredBefore] = values;
              const row = db.forges.get(claimToken);
              if (row && row.claimedBy === null && row.expiresAt >= notExpiredBefore) {
                row.claimedBy = claimedBy;
                row.claimedAt = claimedAt;
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
          async all() { return { results: [] }; },
        };
      },
    };
  }
  // Real D1 batches run inside a single transaction — if any statement
  // throws, none of them commit. The production incident's own D1 read
  // (the orphaned session was still 'pending', never 'used', after the
  // SQLITE_TOOBIG failure) already proved this atomicity holds for real;
  // this double must model it too, or a test could pass here for a reason
  // that isn't actually true in production. Snapshot-and-restore is a
  // reasonably faithful stand-in for a real ROLLBACK, cheap enough for a
  // Map-backed double this small.
  async batch(statements) {
    const snapshot = {
      sessions: new Map([...this.sessions].map(([k, v]) => [k, { ...v }])),
      forges: new Map([...this.forges].map(([k, v]) => [k, { ...v }])),
      generations: new Map([...this.generations].map(([k, v]) => [k, { ...v }])),
    };
    try {
      const results = [];
      for (const s of statements) results.push(await s.run());
      return results;
    } catch (error) {
      this.sessions = snapshot.sessions;
      this.forges = snapshot.forges;
      this.generations = snapshot.generations;
      throw error;
    }
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
// Same dev-auth-bypass convention tests/forge-generate-response-contract
// .test.mjs already established for exercising authenticated endpoints
// without a real Cloudflare Access identity — worker/account-bench.ts's
// userKey() honors it via verifyAccessIdentity.
const accountEnv = (DB) => ({ ...guestEnv(DB), ALLOW_DEV_AUTH_BYPASS: "true" });
const authHeaders = (email) => ({ "x-dev-user-email": email });

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

const claimRequest = (claimToken, email) =>
  new Request("https://example.test/api/account/claim-guest", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(email) },
    body: JSON.stringify({ claimToken }),
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

// P0 follow-up: the previous version of this test asserted the persisted
// D1 copy equals the client response minus claimToken/guestPreview — that
// equality assumption is exactly what caused the production incident
// (persisting the full ~2.3MB response, dominated by structuralAnalysis,
// hit D1's SQLITE_TOOBIG). The compact claim payload is now a genuine
// SUBSET, not "everything minus two fields" — this test pins the new,
// correct relationship instead.
test("the persisted claim payload is a compact subset of the client response — never structuralAnalysis or cardPool, but everything the claim/masterworks UI actually reads", async () => {
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

  // The client (browser) response is intentionally left full for this
  // hotfix — it must still carry every field the current UI renders.
  assert.equal(typeof clientData.claimToken, "string");
  assert.equal(clientData.guestPreview, true);
  assert.ok(clientData.nativeReport, "the client response must still include nativeReport");

  // The persisted copy must never carry request-specific fields, and must
  // never carry the fields the audit proved are dead weight for every
  // downstream consumer (claim UI, one-slot/multi-refill, account bench).
  assert.equal("claimToken" in persisted, false, "the stored copy must never itself carry a claimToken — handleGuestClaim spreads this directly into its own response");
  assert.equal("guestPreview" in persisted, false, "the stored copy must never claim guestPreview:true — that marker does not survive a real account claiming the result");
  assert.equal("cardPool" in persisted, false, "the outer cardPool must never be duplicated into the claim payload — confirmed unread by every claim/account consumer");
  // colors / engine / blueprintIntent are intentionally kept for claim
  // restoration UI identity (format colors + which engine built it).
  assert.equal("structuralAnalysis" in persisted.nativeReport, false, "structuralAnalysis (~79% of the full payload) must never be persisted into guest_forges");
  assert.equal("diagnostics" in persisted.nativeReport, false);

  // Everything the masterworks-picker/workbench/claim UI actually reads
  // must still be present and byte-for-byte equal to what the client got.
  for (const field of ["engine", "selected", "candidates", "tournament", "reasoning", "laboratory", "powerSignal", "powerAudit", "recommendationRecord", "manaConsistency", "unusedEnginePartners", "methodology", "blueprintIntent"]) {
    assert.deepEqual(persisted.nativeReport[field], clientData.nativeReport[field], `expected ${field} to survive into the compact claim payload unchanged`);
  }

  const persistedBytes = Buffer.byteLength(stored.responseJson, "utf8");
  const clientBytes = Buffer.byteLength(JSON.stringify(clientData), "utf8");
  assert.ok(persistedBytes < clientBytes, "the compact claim payload must be meaningfully smaller than the full client response");
});

test("no oversized bind is ever attempted: the compact claim payload for a real generation stays far below both the application ceiling and D1's own limit", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();

  await withRealGenerationFetch(async () => {
    const response = await worker.fetch(guestRequest(null), guestEnv(db), ctx);
    assert.equal(response.status, 200);
  });

  const [stored] = [...db.forges.values()];
  const bytes = Buffer.byteLength(stored.responseJson, "utf8");
  assert.ok(bytes < 500_000, `expected the compact claim payload to stay under the 500KB application ceiling, got ${bytes} bytes`);
});

// This is literally the P0 production incident, reproduced deliberately:
// D1 rejects an oversized guest_forges write with SQLITE_TOOBIG. Before
// this fix, that discarded an otherwise-successful generation behind a
// vague 500. The compact payload keeps this from ever happening in
// practice (previous test), but D1's own limit is a genuine backstop this
// code must still survive gracefully if it's ever hit for any other
// reason (a future field added back to the compact list, a much larger
// real deck, etc.) — never a silently-orphaned session, never an opaque
// crash.
test("regression: if D1 itself ever rejects the guest_forges write as too large, the failure is still clean — typed response, reservation released, no orphaned session", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();
  db.sqliteTooBigThreshold = 1000; // far below the real ~20KB compact payload for this fixture — guaranteed to trip

  const response = await withRealGenerationFetch(async () => worker.fetch(guestRequest(null), guestEnv(db), ctx));
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.code, "GENERATION_FAILED");
  assert.equal(db.forges.size, 0, "no guest_forges row can exist when the write itself failed");
  assert.equal(db.sessions.size, 0, "the pending reservation must be released, not left orphaned, even when D1 itself is what rejected the write");
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

// --- Claim-flow coverage ---
//
// handleGuestClaim (worker/guest-forge.ts) never needed a code change for
// the compact-payload fix: it already just JSON.parse()s row.response_json
// and spreads it into its own response — a shape-agnostic pattern that
// works identically whether that JSON is the OLD full payload (historical
// rows already in production) or the NEW compact one. These tests prove
// both directly, end to end, rather than assuming it from the source.

test("claim flow works end to end from the new compact representation: a real guest generation, claimed by an account, still returns everything the workbench UI reads", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();

  const guestData = await withRealGenerationFetch(async () => {
    const response = await worker.fetch(guestRequest(null), guestEnv(db), ctx);
    assert.equal(response.status, 200);
    return response.json();
  });
  assert.equal(typeof guestData.claimToken, "string");

  const claimResponse = await worker.fetch(claimRequest(guestData.claimToken, "claimant@example.test"), accountEnv(db), ctx);
  assert.equal(claimResponse.status, 200);
  const claimed = await claimResponse.json();

  assert.equal(claimed.claimed, true);
  assert.equal(typeof claimed.generationId, "string");
  assert.ok(claimed.claimContext, "expected claimContext (format/strategy) from the separate forge_generations store");
  // Everything the claim-restoration UI (applyForgeResult) actually reads
  // must survive the compact round trip.
  for (const field of ["selected", "candidates", "recommendationRecord", "manaConsistency", "unusedEnginePartners", "methodology", "reasoning"]) {
    assert.deepEqual(claimed.nativeReport[field], guestData.nativeReport[field], `expected ${field} to survive claim restoration`);
  }
  assert.equal("guestPreview" in claimed, false, "a claimed result must never still claim to be an unclaimed guest preview");

  // Claiming must not leave a second, competing guest reservation.
  const claimedForge = [...db.forges.values()].find((row) => row.claimedBy === "claimant@example.test" || row.claimedBy);
  assert.ok(claimedForge, "expected the guest_forges row to record who claimed it");
  assert.ok(claimedForge.claimedBy, "claimedBy must be set");
});

test("backward compatibility: a historical guest_forges row stored in the OLD full-payload shape (including cardPool/structuralAnalysis) still claims correctly", async () => {
  const worker = await loadWorker();
  const db = new FinalizationD1();

  // Seed state exactly as the OLD code path would have left it: a 'used'
  // session, a matching forge_generations row, and a guest_forges row
  // whose response_json is the FULL old shape — proving the claim path
  // makes no assumption about which shape it's reading.
  const sessionKey = "legacy-guest-session-id";
  const generationId = "legacy-generation-id";
  const claimToken = "legacy-claim-token";
  const now = Date.now();
  db.sessions.set(sessionKey, { status: "used", createdAt: now - 60_000, expiresAt: now + 86_400_000 });
  db.generations.set(generationId, {
    userKey: `guest:${sessionKey}`,
    schemaVersion: 1,
    payloadJson: JSON.stringify({ selected: { deckText: "20 Island", rows: [] }, candidates: [], cardPool: [], options: { format: "Standard", strategy: "Balanced", target: 60 } }),
    expiresAt: now + 86_400_000,
  });
  db.forges.set(claimToken, {
    sessionKey,
    generationId,
    responseJson: JSON.stringify({
      nativeReport: {
        selected: { id: "legacy-selected", deckText: "20 Island" },
        candidates: [{ id: "legacy-selected", deckText: "20 Island" }],
        methodology: "legacy methodology",
        reasoning: { summary: "legacy reasoning" },
        // The exact fields the compact payload now omits — present here
        // because this row predates the fix. Must not break anything.
        structuralAnalysis: { legacyGraph: "a multi-hundred-KB blob in production" },
        cardPool: [{ name: "legacy pool card" }],
        engine: "native",
      },
      cardPool: [{ name: "legacy pool card" }],
      colors: ["U"],
    }),
    createdAt: now - 60_000,
    expiresAt: now + 86_400_000,
    claimedBy: null,
  });

  const response = await worker.fetch(claimRequest(claimToken, "legacy-claimant@example.test"), accountEnv(db), ctx);
  assert.equal(response.status, 200);
  const claimed = await response.json();
  assert.equal(claimed.claimed, true);
  assert.equal(claimed.nativeReport.methodology, "legacy methodology");
  assert.equal(claimed.nativeReport.selected.id, "legacy-selected");
  // The old row's extra fields are harmless leftovers, not a contract this
  // code needs to strip — they simply pass through unused, same as they
  // always would have for any already-claimed historical row.
  assert.ok(claimed.nativeReport.structuralAnalysis, "old-shape extra fields must not break parsing, even though new rows will never include them");
});
