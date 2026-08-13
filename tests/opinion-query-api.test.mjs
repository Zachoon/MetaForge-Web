import assert from "node:assert/strict";
import test from "node:test";

class OpinionD1 {
  inserts = [];
  prepare(sql) {
    const inserts = this.inserts;
    return {
      bind(...values) {
        return {
          async run() { inserts.push({ sql, values }); return { success: true }; },
          async first() { return null; },
          async all() { return { results: [] }; },
        };
      },
    };
  }
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("opinion-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = (DB) => ({
  DB,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
  ALLOW_DEV_AUTH_BYPASS: "true",
});
const ctx = { waitUntil() {}, passThroughOnException() {} };
const request = (email, body) => new Request("https://example.test/api/coach/opinion", {
  method: "POST",
  headers: { ...(email ? { "x-dev-user-email": email } : {}), "content-type": "application/json" },
  body: JSON.stringify(body),
});

test("opinion query is authenticated, construction-read-only, and archived", async () => {
  const worker = await loadWorker();
  const DB = new OpinionD1();
  assert.equal((await worker.fetch(request(null, { question: "Should Atraxa play Doubling Season?" }), env(DB), ctx)).status, 401);

  const response = await worker.fetch(request("founder@example.com", {
    question: "Should my Atraxa deck play Doubling Season?",
    commanderName: "Atraxa, Praetors' Voice",
    subject: "Doubling Season",
    opinionKey: "founder-025-jay-atraxa-doubling-season",
  }), env(DB), ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.constructionReadOnly, true);
  assert.equal(body.writesToBrain, false);
  assert.match(body.opinion.headline, /recommends this/i);
  assert.equal(body.lineage.archived, true);
  assert.equal(DB.inserts.length, 1);
  assert.match(DB.inserts[0].sql, /INSERT OR IGNORE INTO opinion_revisions/);
});

test("opinion catalog exposes registered revision contexts without accepting caller claims", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://example.test/api/coach/opinion", { headers: { "x-dev-user-email": "founder@example.com" } }), env(new OpinionD1()), ctx);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.writesToBrain, false);
  assert.equal(body.questions.length, 3);
  assert.ok(body.questions.every((question) => question.deckRevision));
  assert.ok(body.cardIdentities.length >= 5);
});

test("unknown strategic questions return unresolved instead of invented evidence", async () => {
  const worker = await loadWorker();
  const DB = new OpinionD1();
  const response = await worker.fetch(request("founder@example.com", {
    question: "Is an unsupported mystery card correct here?",
    commanderName: "Mystery Commander",
    subject: "Mystery Card",
  }), env(DB), ctx);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.opinion.headline, /does not have enough separation/i);
  assert.match(body.opinion.answer, /does not have enough applicable evidence/i);
});

test("card-name similarity cannot borrow Jay's commission opinion", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(request("other@example.com", {
    question: "Should my Atraxa deck play Doubling Season?",
    commanderName: "Atraxa, Praetors' Voice",
    subject: "Doubling Season",
  }), env(new OpinionD1()), ctx);
  const body = await response.json();
  assert.match(body.opinion.headline, /does not have enough separation/i);
});
