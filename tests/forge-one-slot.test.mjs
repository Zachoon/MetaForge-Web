import assert from "node:assert/strict";
import test from "node:test";

// Models both api_rate_limits (checkRateLimit) and forge_generations
// (forge-generation-store.ts) well enough to exercise the real endpoint
// end to end: the INSERT storeGeneration issues, the SELECT
// loadGeneration issues, and the age-based DELETE cleanupExpiredGenerations
// issues. expires_at is a plain epoch-ms INTEGER (not a SQLite datetime
// string), so no date-string parsing is needed here — just numeric
// comparison, mirroring exactly what forge-generation-store.ts itself does.
class ForgeD1 {
  buckets = new Map();
  generations = new Map();
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("INSERT INTO api_rate_limits")) {
              const [userKey, endpoint, windowBucket] = values;
              const bucketKey = `${userKey}|${endpoint}|${windowBucket}`;
              const next = (db.buckets.get(bucketKey)?.requests || 0) + 1;
              db.buckets.set(bucketKey, { requests: next, updatedAt: Date.now() });
              return { requests: next };
            }
            if (sql.includes("SELECT user_key, schema_version, payload_json, expires_at FROM forge_generations")) {
              const [generationId] = values;
              return db.generations.get(generationId) || null;
            }
            return null;
          },
          async run() {
            if (sql.includes("DELETE FROM forge_generations")) {
              const [cutoff] = values;
              let changes = 0;
              for (const [id, row] of [...db.generations.entries()]) {
                if (row.expires_at < cutoff) {
                  db.generations.delete(id);
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
  workerUrl.searchParams.set("forge-one-slot-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = (DB) => ({ DB, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked", ALLOW_DEV_AUTH_BYPASS: "true" });
const ctx = { waitUntil() {}, passThroughOnException() {} };
const authHeaders = (email) => (email ? { "x-dev-user-email": email } : {});

const oneSlotRequest = (email, body, extraHeaders = {}) =>
  new Request("https://example.test/api/forge/one-slot-experiment", {
    method: "POST",
    headers: { ...authHeaders(email), "content-type": "application/json", ...extraHeaders },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

// Mirrors account-bench.ts's userKey() exactly (SHA-256 of
// "metaforge-account:" + the lowercased email the dev bypass derives
// from x-dev-user-email) so tests can seed forge_generations under the
// same user_key the real endpoint will look up, without importing the
// worker's .ts identity modules directly.
async function computeUserKey(email) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`metaforge-account:${email.toLowerCase()}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// The endpoint's own reconstruction only needs {selected, candidates,
// cardPool, options} — exactly forge-generate.ts's storeGeneration
// payload shape — so tests seed forge_generations directly through the
// fake DB rather than depending on forge-generate.ts's live Scryfall calls.
function seedRow(DB, generationId, userKey, payload, { expiresInMs = 24 * 60 * 60 * 1000, schemaVersion = 1 } = {}) {
  DB.generations.set(generationId, {
    user_key: userKey,
    schema_version: schemaVersion,
    payload_json: JSON.stringify(payload),
    expires_at: Date.now() + expiresInMs,
  });
}

async function seedRowForEmail(DB, generationId, email, payload, opts) {
  seedRow(DB, generationId, await computeUserKey(email), payload, opts);
}

// Same fixture shape as tests/experiment-tablet.test.mjs: base vs. rival
// differ at three quantities plus one brand-new row ("Flexible Draw"),
// which is the only possible addition across every generated experiment.
const base = [
  { quantity: 24, name: "Island", roles: ["land"], cmc: 0 },
  { quantity: 4, name: "Slow Threat", roles: ["threat"], cmc: 6 },
  { quantity: 4, name: "Weak Draw", roles: ["draw"], cmc: 3 },
  { quantity: 4, name: "Weak Interaction", roles: ["interaction"], cmc: 2 },
  { quantity: 4, name: "Ramp", roles: ["ramp"], cmc: 2 },
  { quantity: 4, name: "Shield", roles: ["protection"], cmc: 2 },
  { quantity: 4, name: "Return", roles: ["recursion"], cmc: 3 },
  { quantity: 4, name: "Sweep", roles: ["sweeper"], cmc: 4 },
  { quantity: 4, name: "Body", roles: ["threat"], cmc: 3 },
  { quantity: 4, name: "Second Body", roles: ["threat"], cmc: 3 },
];
const rival = base.map((row) => ({ ...row, roles: [...row.roles] }));
rival.find((row) => row.name === "Slow Threat").quantity = 3;
rival.find((row) => row.name === "Weak Draw").quantity = 3;
rival.find((row) => row.name === "Weak Interaction").quantity = 3;
rival.push({ quantity: 1, name: "Flexible Draw", roles: ["draw", "interaction"], cmc: 2 });

const selected = { id: "selected", rows: base };
const candidates = [selected, { id: "rival", rows: rival }];
const options = { format: "Standard", strategy: "Balanced midrange", target: 60 };
const currentRows = base.map((row) => ({ quantity: row.quantity, name: row.name }));

const realCard = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const realPool = [
  ...Array.from({ length: 28 }, (_, i) => realCard(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => realCard(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => realCard(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => realCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => realCard(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("one-slot rejects unauthenticated requests without leaking identity details", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest(null, { generationId: "x", currentRows }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authenticated account required" });
});

test("one-slot rejects non-POST methods", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://example.test/api/forge/one-slot-experiment", { method: "GET", headers: authHeaders("one@example.com") }),
    env(new ForgeD1()),
    ctx,
  );
  assert.equal(response.status, 405);
});

test("one-slot rejects malformed JSON with 400", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", "{not valid json"), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects a missing generationId", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", { currentRows }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects currentRows that isn't an array", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "x", currentRows: "nope" }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects an oversized currentRows array", async () => {
  const worker = await loadWorker();
  const tooMany = Array.from({ length: 301 }, (_, i) => ({ name: `Card ${i}`, quantity: 1 }));
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "x", currentRows: tooMany }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects a matchLog that isn't an array", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "x", currentRows, matchLog: "nope" }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects a causalityReport that isn't an object", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "x", currentRows, causalityReport: "nope" }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 400);
});

test("one-slot rejects an oversized causalityReport", async () => {
  const worker = await loadWorker();
  const hugeCausalityReport = { headline: "x".repeat(210 * 1024) };
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "x", currentRows, causalityReport: hugeCausalityReport }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 413);
});

test("one-slot returns a sanitized 404 for a generationId that was never issued", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(oneSlotRequest("one@example.com", { generationId: "never-issued", currentRows }), env(new ForgeD1()), ctx);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.match(body.error, /no longer available/i);
});

test("one-slot isolates generations by owner: another player's generationId 404s the same way a missing one does", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-1", "owner@example.com", { selected, candidates, cardPool: [], options });
  const asStranger = await worker.fetch(oneSlotRequest("stranger@example.com", { generationId: "gen-1", currentRows }), env(DB), ctx);
  assert.equal(asStranger.status, 404);
  const missing = await worker.fetch(oneSlotRequest("stranger@example.com", { generationId: "never-issued", currentRows }), env(DB), ctx);
  assert.equal(missing.status, 404);
  assert.deepEqual(await asStranger.json(), await missing.json());
});

test("one-slot returns a sanitized 404 for an expired generation, indistinguishable from a missing one", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-expired", "expiring@example.com", { selected, candidates, cardPool: [], options }, { expiresInMs: -1000 });
  const response = await worker.fetch(oneSlotRequest("expiring@example.com", { generationId: "gen-expired", currentRows }), env(DB), ctx);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.match(body.error, /no longer available/i);
});

test("one-slot returns a sanitized 404 for a schema version it no longer understands", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-old-schema", "veteran@example.com", { selected, candidates, cardPool: [], options }, { schemaVersion: 0 });
  const response = await worker.fetch(oneSlotRequest("veteran@example.com", { generationId: "gen-old-schema", currentRows }), env(DB), ctx);
  assert.equal(response.status, 404);
});

test("one-slot runs the real ranking engine and returns a report with no undefined fields anywhere", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-real", "player@example.com", { selected, candidates, cardPool: [], options });
  const response = await worker.fetch(oneSlotRequest("player@example.com", { generationId: "gen-real", currentRows, matchLog: [] }), env(DB), ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.report.status, "advance");
  assert.ok(body.report.tablets.length > 0);
  assert.doesNotMatch(JSON.stringify(body.report), /undefined/);
});

test("one-slot reconstructs the current deck from currentRows, not the original generation's rows", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-edited", "editor@example.com", { selected, candidates, cardPool: [], options });

  // Accept the Flexible Draw swap client-side (as applyExperimentTablet
  // would): cut one Slow Threat, add Flexible Draw. The next request's
  // currentRows reflects that — Flexible Draw is already owned, so it
  // should never be proposed again as a *new* addition.
  const editedRows = base.map((row) => ({ ...row }));
  editedRows.find((row) => row.name === "Slow Threat").quantity -= 1;
  editedRows.push({ quantity: 1, name: "Flexible Draw" });

  const response = await worker.fetch(
    oneSlotRequest("editor@example.com", { generationId: "gen-edited", currentRows: editedRows, matchLog: [] }),
    env(DB),
    ctx,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  const adds = body.report.tablets.filter((t) => t.type === "experiment").map((t) => t.change.add);
  assert.ok(!adds.includes("Flexible Draw"), "Flexible Draw is already in the current revision and should not be proposed as a new addition");
});

test("one-slot never recommends an explicitly excluded card", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  await seedRowForEmail(DB, "gen-excluded", "excluder@example.com", { selected, candidates, cardPool: [], options });

  // Flexible Draw is the only possible addition in this fixture (see
  // comment above base/rival) — excluding it by name should leave zero
  // experiment tablets, not silently ignore the exclusion.
  const response = await worker.fetch(
    oneSlotRequest("excluder@example.com", {
      generationId: "gen-excluded",
      currentRows,
      matchLog: [],
      excludedCards: [{ name: "Flexible Draw", quantity: 1 }],
    }),
    env(DB),
    ctx,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  const experimentTablets = body.report.tablets.filter((t) => t.type === "experiment");
  assert.equal(experimentTablets.length, 0);
  const adds = body.report.tablets.map((t) => t.change?.add).filter(Boolean);
  assert.ok(!adds.includes("Flexible Draw"));
});

test("one-slot runs the practical simulation gate when the stored generation carries a real card pool", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  const { forgeNativeMasterwork } = await import("../app/native-masterwork-engine.mjs");
  const realInput = { format: "Standard", target: 60, strategy: "Balanced midrange", colors: ["U"], seed: 9, cards: realPool };
  const report = forgeNativeMasterwork(realInput);
  await seedRowForEmail(DB, "gen-practical", "practical@example.com", {
    selected: report.selected,
    candidates: report.candidates,
    cardPool: realPool,
    options: { format: realInput.format, strategy: realInput.strategy, target: realInput.target },
  });

  const response = await worker.fetch(
    oneSlotRequest("practical@example.com", {
      generationId: "gen-practical",
      currentRows: report.selected.rows.map((row) => ({ quantity: row.quantity, name: row.name })),
      matchLog: [],
    }),
    env(DB),
    ctx,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  const confident = body.report.tablets.filter((t) => t.type === "experiment" && t.confident);
  for (const tablet of confident) {
    assert.ok(tablet.practicalEvidence, "a confident tablet from a pool-backed generation must carry real practical evidence");
  }
});

test("one-slot enforces a durable per-user rate limit and reports a retry time", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  let lastResponse;
  for (let i = 0; i < 155; i += 1) {
    lastResponse = await worker.fetch(oneSlotRequest("busy@example.com", { generationId: "x", currentRows }), env(DB), ctx);
  }
  assert.equal(lastResponse.status, 429);
  const body = await lastResponse.json();
  assert.ok(body.retryAfterSeconds > 0);
  assert.ok(lastResponse.headers.get("Retry-After"));
});

test("one-slot rejects a body over the size cap even when Content-Length is understated", async () => {
  const worker = await loadWorker();
  const payload = JSON.stringify({ generationId: "x", currentRows, matchLog: Array.from({ length: 2000 }, (_, i) => ({ id: `m${i}`, note: "x".repeat(400) })) });
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
  const request = new Request("https://example.test/api/forge/one-slot-experiment", {
    method: "POST",
    headers: { ...authHeaders("one@example.com"), "content-type": "application/json" },
    body: stream,
    duplex: "half",
  });
  const response = await worker.fetch(request, env(new ForgeD1()), ctx);
  assert.equal(response.status, 413);
});

test("the hourly scheduled handler deletes expired generations and leaves current ones", async () => {
  const worker = await loadWorker();
  const DB = new ForgeD1();
  seedRow(DB, "old-gen", "some-user-key", { selected, candidates, cardPool: [], options }, { expiresInMs: -1000 });
  seedRow(DB, "fresh-gen", "some-user-key", { selected, candidates, cardPool: [], options }, { expiresInMs: 60_000 });

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

  assert.equal(DB.generations.has("old-gen"), false);
  assert.equal(DB.generations.has("fresh-gen"), true);
});
