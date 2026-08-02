import assert from "node:assert/strict";
import test from "node:test";

// Models the api_rate_limits table's atomic upsert+RETURNING query (for
// checkRateLimit) and the age-based DELETE (for cleanupExpiredRateLimits)
// well enough to exercise both deterministically — a plain first-key-only
// map, like other tests' FakeD1, can't model the composite
// user+endpoint+window bucket key or a real age comparison. Each bucket
// tracks its own updatedAt (ms) so tests can simulate time passing by
// setting it directly, mirroring D1's real updated_at column.
class RateLimitD1 {
  buckets = new Map();
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("INSERT INTO api_rate_limits")) {
              const [userKey, endpoint, windowBucket] = values;
              const bucketKey = `${userKey}|${endpoint}|${windowBucket}`;
              const existing = db.buckets.get(bucketKey);
              const next = (existing?.requests || 0) + 1;
              db.buckets.set(bucketKey, { requests: next, updatedAt: Date.now() });
              return { requests: next };
            }
            return null;
          },
          async run() {
            if (sql.includes("DELETE FROM api_rate_limits")) {
              // bound value is the SQLite datetime() modifier, e.g. "-2 hours"
              const match = String(values[0]).match(/^-(\d+(?:\.\d+)?)\s+hours?$/);
              const maxAgeMs = (match ? Number(match[1]) : 2) * 60 * 60 * 1000;
              const cutoff = Date.now() - maxAgeMs;
              let changes = 0;
              for (const [key, bucket] of [...db.buckets.entries()]) {
                if (bucket.updatedAt < cutoff) {
                  db.buckets.delete(key);
                  changes += 1;
                }
              }
              return { success: true, meta: { changes } };
            }
            return { success: true, meta: { changes: 0 } };
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
  workerUrl.searchParams.set("api-hardening-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

// These tests exercise rate limiting/validation/size-cap behavior, not
// the Access identity mechanism itself (see access-identity.test.mjs
// for that) — so they use the explicitly-gated local dev bypass.
const env = (DB) => ({ DB, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked", ALLOW_DEV_AUTH_BYPASS: "true" });
const ctx = { waitUntil() {}, passThroughOnException() {} };

const authHeaders = (email) => (email ? { "x-dev-user-email": email } : {});

const analyzeRequest = (email, body, extraHeaders = {}) =>
  new Request("https://example.test/api/forge/structural-analyze", {
    method: "POST",
    headers: { ...authHeaders(email), "content-type": "application/json", ...extraHeaders },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const generateRequest = (email, body, extraHeaders = {}) =>
  new Request("https://example.test/api/forge/generate", {
    method: "POST",
    headers: { ...authHeaders(email), "content-type": "application/json", ...extraHeaders },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const VALID_CARDS = [
  { name: "Krenko, Baron of Tin Street", quantity: 1, typeLine: "Legendary Creature — Goblin Noble", oracleText: "Whenever you create one or more Goblins...", cmc: 3, isCommander: true },
  { name: "Rubble Rouser", quantity: 4, typeLine: "Creature — Dwarf Berserker", oracleText: "Landfall — Whenever a land enters the battlefield under your control...", cmc: 2, isCommander: false },
];

test("structural-analyze rejects unauthenticated requests without leaking identity details", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest(null, { cards: VALID_CARDS }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.deepEqual(body, { error: "Authenticated account required" });
});

test("generate rejects unauthenticated requests without leaking identity details", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest(null, { mode: "native", format: "Standard", strategy: "Balanced midrange" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.deepEqual(body, { error: "Authenticated account required" });
});

test("structural-analyze runs the real engine for an authenticated, valid request", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: VALID_CARDS, commanderName: "Krenko, Baron of Tin Street" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.report.engine, "metaforge-structural-pipeline-v1");
  assert.ok(Array.isArray(body.report.graph.edges));
  assert.ok(Array.isArray(body.report.systems.systems));
  assert.ok("failureAnalysis" in body.report);
  // computeSimulation defaults to false (not sent) — no client-side
  // deckIntegrity gate was replicated server-side, so the endpoint takes
  // the client's word for whether simulation is meaningful right now.
  assert.equal(body.report.simulationDossier, null);
  // revisionLearning/interventionLearning always compute — cheap, pure,
  // and there's no equivalent "is this meaningful yet" gate for them.
  assert.equal(body.report.revisionLearning.sampleSize, 0);
  assert.ok(Array.isArray(body.report.interventionLearning.experiments));
});

test("structural-analyze computes a real simulation dossier when computeSimulation is true", async () => {
  const worker = await loadWorker();
  const cardsWithManaData = VALID_CARDS.map((card) => ({ ...card, colorIdentity: ["R"], manaCost: "{2}{R}" }));
  const response = await worker.fetch(
    analyzeRequest("one@example.com", { cards: cardsWithManaData, strategy: "Aggressive pressure", computeSimulation: true }),
    env(new RateLimitD1()),
    ctx,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.report.simulationDossier);
  assert.equal(body.report.simulationDossier.goldfish.expert.strategy, "Aggro");
  assert.ok(body.report.simulationDossier.matrix.rows.length > 0);
  assert.ok(typeof body.report.simulationDossier.roleCounts === "object");
});

test("structural-analyze computes real revision and intervention learning from real history", async () => {
  const worker = await loadWorker();
  const matchLog = [
    { id: "m1", result: "loss", opponent: "Aggro", signal: "Kept a risky hand and lost to fast pressure", playedAt: "2026-08-01", revision: 1 },
    { id: "m2", result: "loss", opponent: "Aggro", signal: "Kept a risky hand and lost to fast pressure", playedAt: "2026-08-01", revision: 1 },
  ];
  const response = await worker.fetch(
    analyzeRequest("one@example.com", { cards: VALID_CARDS, matchLog, revisionsCount: 1 }),
    env(new RateLimitD1()),
    ctx,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.report.revisionLearning.sampleSize, 2);
});

test("structural-analyze rejects a matchLog that isn't an array", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: VALID_CARDS, matchLog: "not an array" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("structural-analyze rejects an oversized matchLog", async () => {
  const worker = await loadWorker();
  const tooMany = Array.from({ length: 2001 }, (_, index) => ({ id: `m${index}` }));
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: VALID_CARDS, matchLog: tooMany }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("structural-analyze rejects a forgeInterventions that isn't an array", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: VALID_CARDS, forgeInterventions: "nope" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("structural-analyze rejects malformed JSON with 400", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest("one@example.com", "{not valid json"), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects malformed JSON with 400", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", "{not valid json"), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("structural-analyze rejects a cards field that isn't an array", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: "not an array" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("structural-analyze rejects an oversized cards array", async () => {
  const worker = await loadWorker();
  const tooMany = Array.from({ length: 301 }, (_, index) => ({ name: `Card ${index}`, quantity: 1 }));
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: tooMany }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects an unknown mode", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", { mode: "steal-the-engine", format: "Standard", strategy: "Balanced midrange" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects an unknown format", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", { mode: "native", format: "Legacy", strategy: "Balanced midrange" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects imported mode with no decklist", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", { mode: "imported", format: "Standard", strategy: "Balanced midrange" }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects an oversized evidenceCards array", async () => {
  const worker = await loadWorker();
  const tooMany = Array.from({ length: 501 }, () => ({}));
  const response = await worker.fetch(generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange", evidenceCards: tooMany }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("generate rejects an out-of-range maxCardPrice", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(generateRequest("one@example.com", { mode: "native", format: "Standard", strategy: "Balanced midrange", maxCardPrice: -5 }), env(new RateLimitD1()), ctx);
  assert.equal(response.status, 400);
});

test("both endpoints reject non-POST methods", async () => {
  const worker = await loadWorker();
  const analyzeGet = await worker.fetch(new Request("https://example.test/api/forge/structural-analyze", { method: "GET", headers: authHeaders("one@example.com") }), env(new RateLimitD1()), ctx);
  assert.equal(analyzeGet.status, 405);
  const generateGet = await worker.fetch(new Request("https://example.test/api/forge/generate", { method: "GET", headers: authHeaders("one@example.com") }), env(new RateLimitD1()), ctx);
  assert.equal(generateGet.status, 405);
});

test("structural-analyze rejects a body over the size cap even when Content-Length is understated", async () => {
  const worker = await loadWorker();
  const bigCards = Array.from({ length: 260 }, (_, index) => ({
    name: `Card ${index}`,
    quantity: 1,
    // ~4KB of oracle text per card * 260 cards ≈ 1MB, well over the 512KB cap.
    oracleText: "x".repeat(4000),
  }));
  const payload = JSON.stringify({ cards: bigCards });
  // A stream body with no content-length header at all — the only way the
  // endpoint can catch this is by actually counting decoded bytes as it
  // reads, not by trusting a declared length.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
  const request = new Request("https://example.test/api/forge/structural-analyze", {
    method: "POST",
    headers: { ...authHeaders("one@example.com"), "content-type": "application/json" },
    body: stream,
    duplex: "half",
  });
  const response = await worker.fetch(request, env(new RateLimitD1()), ctx);
  assert.equal(response.status, 413);
});

test("structural-analyze enforces a durable per-user rate limit and reports a retry time", async () => {
  const worker = await loadWorker();
  const DB = new RateLimitD1();
  let lastResponse;
  for (let i = 0; i < 155; i += 1) {
    lastResponse = await worker.fetch(analyzeRequest("busy@example.com", { cards: VALID_CARDS }), env(DB), ctx);
  }
  assert.equal(lastResponse.status, 429);
  const body = await lastResponse.json();
  assert.ok(body.retryAfterSeconds > 0);
  assert.ok(lastResponse.headers.get("Retry-After"));
  // A different user is not affected by the first user's usage.
  const otherUser = await worker.fetch(analyzeRequest("quiet@example.com", { cards: VALID_CARDS }), env(DB), ctx);
  assert.equal(otherUser.status, 200);
});

test("generate enforces a lower per-user rate limit than structural-analyze", async () => {
  const worker = await loadWorker();
  const DB = new RateLimitD1();
  // Rate limiting happens before body validation, so a deliberately
  // invalid body (400, no network call) still counts toward the limit —
  // this confirms exhaustion without making 15 real Scryfall requests.
  let lastResponse;
  for (let i = 0; i < 16; i += 1) {
    lastResponse = await worker.fetch(generateRequest("busy2@example.com", { mode: "not-a-real-mode" }), env(DB), ctx);
  }
  assert.equal(lastResponse.status, 429);
});

test("structural-analyze never echoes a raw exception message on unexpected failure", async () => {
  const worker = await loadWorker();
  // Cards with deeply malformed nested fields that still pass the basic
  // shape check but could confuse an engine internal — confirms the
  // response body never contains a raw stack-shaped message even if
  // something inside throws, and confirms the endpoint stays defensive
  // in the first place (buildForgeStructuralAnalysis is written to
  // tolerate malformed cards, so the expected outcome here is actually a
  // clean 200 with a degraded report, not a crash).
  const weirdCards = [{ name: "Weird Card", quantity: "not-a-number", typeLine: null, oracleText: 12345, cmc: "NaN", isCommander: "yes" }];
  const response = await worker.fetch(analyzeRequest("one@example.com", { cards: weirdCards }), env(new RateLimitD1()), ctx);
  assert.ok(response.status === 200 || response.status === 500);
  const body = await response.json();
  if (response.status === 500) {
    assert.equal(body.error, "Structural analysis could not complete for this deck.");
    assert.doesNotMatch(body.error, /at .*\(|TypeError|ReferenceError|node_modules/);
  }
});

test("the hourly scheduled handler deletes expired rate-limit buckets and leaves current ones", async () => {
  const worker = await loadWorker();
  const DB = new RateLimitD1();
  // A bucket from well over 2 hours ago (expired) and one from just now
  // (current), planted directly rather than through checkRateLimit so
  // each bucket's age is exact and independent of real wall-clock timing
  // during the test run.
  DB.buckets.set("old-user|forge-generate|100", { requests: 3, updatedAt: Date.now() - 3 * 60 * 60 * 1000 });
  DB.buckets.set("recent-user|forge-generate|999999", { requests: 2, updatedAt: Date.now() });

  // scheduled() also runs the data-goblin collectors, which fetch real
  // external URLs — not this test's concern, and not something a test
  // suite should depend on the network for. Fail those fast instead of
  // letting them actually reach magic.wizards.com etc.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  const pending = [];
  const awaitedCtx = { waitUntil(promise) { pending.push(promise); }, passThroughOnException() {} };
  try {
    await worker.scheduled({}, { DB, METAFORGE_BOOTSTRAP_LOCK: "unlocked" }, awaitedCtx);
    await Promise.all(pending);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(DB.buckets.has("old-user|forge-generate|100"), false);
  assert.equal(DB.buckets.has("recent-user|forge-generate|999999"), true);
  assert.equal(DB.buckets.get("recent-user|forge-generate|999999").requests, 2);
});
