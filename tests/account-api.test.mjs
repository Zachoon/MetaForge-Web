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
        async all() { return { results: [] }; },
      };
    }, async all() { return { results: [] }; }, async run(){ return { meta:{ changes:0 } }; } };
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
const founderRequest = (email) => new Request("https://example.test/api/founder/overview", { headers: email ? { "cf-access-authenticated-user-email": email } : {} });
const goblinRequest = (email) => new Request("https://example.test/api/founder/goblins", { headers: email ? { "cf-access-authenticated-user-email": email } : {} });
const chatRequest = (email) => new Request("https://example.test/api/forge/chat", { method:"POST", headers:{ ...(email ? {"cf-access-authenticated-user-email":email}:{}), "content-type":"application/json" }, body:JSON.stringify({messages:[{role:"user",content:"Help me build a deck"}],context:{format:"Standard"}}) });
const coachStatusRequest=()=>new Request("https://example.test/api/forge/status");
const profileRequest=(method,email,body)=>new Request("https://example.test/api/account/player-profile",{method,headers:{...(email?{"cf-access-authenticated-user-email":email}:{}),...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});

class ProfileD1 {
  rows=new Map();
  prepare(sql){const db=this;return{bind(...values){return{async first(){return db.rows.get(values[0])||null},async run(){db.rows.set(values[0],{profile_json:values[1],revision:values[2],updated_at:"now"});return{success:true}}}}}}
}

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

test("founder command center rejects buddies even when they know the API route", async () => {
  const worker = await loadWorker();
  const DB = new FakeD1();
  const founderEnv = { ...env(DB), METAFORGE_FOUNDER_USER_KEY: "f45237c471be9524242fb124700a61b6916cbbff9967c8ba74e43af0617bea90" };
  assert.equal((await worker.fetch(founderRequest("buddy@example.com"), founderEnv, ctx)).status, 403);
  const accepted = await worker.fetch(founderRequest("ZACH@DUKECITY.GAMES"), founderEnv, ctx);
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).totals.testers, 0);
});

test("Forge conversation requires an account and falls back to native coaching without a model key", async () => {
  const worker=await loadWorker(); const DB=new FakeD1();
  assert.equal((await worker.fetch(chatRequest(null),env(DB),ctx)).status,401);
  const native=await worker.fetch(chatRequest("one@example.com"),env(DB),ctx);assert.equal(native.status,200);const body=await native.json();assert.equal(body.model,"metaforge-native-v1");assert.match(body.answer,/Paste the decklist/);
});
test("Coach readiness distinguishes native and model modes before a tester composes",async()=>{const worker=await loadWorker(),DB=new FakeD1(),pending=[];const awaitedCtx={...ctx,waitUntil(promise){pending.push(promise)}};const offline=await (await worker.fetch(coachStatusRequest(),env(DB),awaitedCtx)).json();assert.equal(offline.ready,true);assert.equal(offline.modelReady,false);assert.equal(offline.mode,"native");assert.match(offline.fallback,/Native Coach/i);const online=await (await worker.fetch(coachStatusRequest(),{...env(DB),OPENAI_API_KEY:"test"},awaitedCtx)).json();assert.equal(online.ready,true);assert.equal(online.modelReady,true);assert.equal(online.mode,"model");await Promise.all(pending)});

test("Player DNA coaching preferences restore across devices without stale overwrites",async()=>{
  const worker=await loadWorker(),DB=new ProfileD1();
  assert.equal((await worker.fetch(profileRequest("GET",null),env(DB),ctx)).status,401);
  const first=await worker.fetch(profileRequest("PUT","one@example.com",{profile:{coachingNotes:"Explain the math and challenge greedy keeps",learningStyle:"adaptive"},baseRevision:0}),env(DB),ctx);
  assert.equal(first.status,200);assert.equal((await first.json()).revision,1);
  const restored=await (await worker.fetch(profileRequest("GET","ONE@example.com"),env(DB),ctx)).json();
  assert.equal(restored.profile.coachingNotes,"Explain the math and challenge greedy keeps");assert.equal(restored.revision,1);
  const stale=await worker.fetch(profileRequest("PUT","one@example.com",{profile:{coachingNotes:"Overwrite it"},baseRevision:0}),env(DB),ctx);
  assert.equal(stale.status,409);assert.equal((await stale.json()).profile.coachingNotes,"Explain the math and challenge greedy keeps");
  const other=await (await worker.fetch(profileRequest("GET","two@example.com"),env(DB),ctx)).json();assert.deepEqual(other.profile,{});
});

test("founder operations expose runtime readiness without exposing secrets",async()=>{
  const worker=await loadWorker();const DB=new FakeD1();const founderEnv={...env(DB),METAFORGE_FOUNDER_USER_KEY:"f45237c471be9524242fb124700a61b6916cbbff9967c8ba74e43af0617bea90"};
  assert.equal((await worker.fetch(goblinRequest("buddy@example.com"),founderEnv,ctx)).status,403);
  const missing=await (await worker.fetch(goblinRequest("zach@dukecity.games"),founderEnv,ctx)).json();
  assert.equal(missing.readiness.coach,false);assert.equal(missing.readiness.officialSourceIndexing,true);assert.equal(missing.readiness.collectorHealth,"awaiting-first-run");assert.match(missing.readiness.schedule,/Hourly/);assert.equal("OPENAI_API_KEY" in missing,false);
  const ready=await (await worker.fetch(goblinRequest("zach@dukecity.games"),{...founderEnv,OPENAI_API_KEY:"test-secret"},ctx)).json();
  assert.equal(ready.readiness.coach,true);
});
