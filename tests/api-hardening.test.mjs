import assert from "node:assert/strict";
import test from "node:test";

// Models the api_rate_limits table's atomic upsert+RETURNING query well
// enough to exercise real increment-and-check behavior deterministically
// (a plain first-key-only map, like other tests' FakeD1, can't model the
// composite user+endpoint+window bucket key checkRateLimit relies on).
class RateLimitD1 {
  buckets = new Map();
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("api_rate_limits")) {
              const [userKey, endpoint, windowBucket] = values;
              const bucketKey = `${userKey}|${endpoint}|${windowBucket}`;
              const next = (db.buckets.get(bucketKey) || 0) + 1;
              db.buckets.set(bucketKey, next);
              return { requests: next };
            }
            return null;
          },
          async run() {
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
  workerUrl.searchParams.set("api-hardening-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = (DB) => ({ DB, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked" });
const ctx = { waitUntil() {}, passThroughOnException() {} };

const authHeaders = (email) => (email ? { "cf-access-authenticated-user-email": email } : {});

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
