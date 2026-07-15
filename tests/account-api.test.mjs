import assert from "node:assert/strict";
import test from "node:test";

class FakeD1 {
  rows = new Map();
  feedback = [];
  prepare(sql) {
    const db = this;
    return { bind(...values) {
      return {
        async first() { return db.rows.get(values[0]) || null; },
        async run() { if (sql.includes("founder_feedback")) db.feedback.push(values); else db.rows.set(values[0], { bench_json: values[1], revision: values[2], updated_at: "now" }); return { success: true }; },
      };
    } };
  }
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("account-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = (DB) => ({ DB, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, METAFORGE_BOOTSTRAP_LOCK: "unlocked" });
const ctx = { waitUntil() {}, passThroughOnException() {} };
const request = (method, email, body) => new Request("https://example.test/api/account/deck-bench", { method, headers: { ...(email ? { "cf-access-authenticated-user-email": email } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
const feedbackRequest = (email, body) => new Request("https://example.test/api/account/feedback", { method: "POST", headers: { ...(email ? { "cf-access-authenticated-user-email": email } : {}), "content-type": "application/json" }, body: JSON.stringify(body) });

test("account API rejects anonymous access and isolates users", async () => {
  const worker = await loadWorker();
  const DB = new FakeD1();
  assert.equal((await worker.fetch(request("GET"), env(DB), ctx)).status, 401);
  const bench = { schemaVersion: 1, families: [{ id: "mine" }] };
  const saved = await worker.fetch(request("PUT", "one@example.com", { bench, baseRevision: 0 }), env(DB), ctx);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).revision, 1);
  const own = await (await worker.fetch(request("GET", "ONE@example.com"), env(DB), ctx)).json();
  assert.deepEqual(own.bench, bench);
  const other = await (await worker.fetch(request("GET", "two@example.com"), env(DB), ctx)).json();
  assert.equal(other.bench, null);
});

test("account API prevents stale devices from overwriting newer data", async () => {
  const worker = await loadWorker();
  const DB = new FakeD1();
  const bench = { schemaVersion: 1, families: [] };
  await worker.fetch(request("PUT", "one@example.com", { bench, baseRevision: 0 }), env(DB), ctx);
  const conflict = await worker.fetch(request("PUT", "one@example.com", { bench, baseRevision: 0 }), env(DB), ctx);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).revision, 1);
});

test("feedback API requires an account and stores contextual founder signals", async () => {
  const worker = await loadWorker();
  const DB = new FakeD1();
  assert.equal((await worker.fetch(feedbackRequest(null, { category: "broken", message: "Nope" }), env(DB), ctx)).status, 401);
  assert.equal((await worker.fetch(feedbackRequest("one@example.com", { category: "invalid", message: "Nope" }), env(DB), ctx)).status, 400);
  const response = await worker.fetch(feedbackRequest("one@example.com", { category: "missed-interaction", message: "Fetch land synergy was missed", context: { experimentId: "trial" } }), env(DB), ctx);
  assert.equal(response.status, 201);
  assert.equal(DB.feedback.length, 1);
  assert.equal(DB.feedback[0][1], "missed-interaction");
});
