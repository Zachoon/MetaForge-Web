import assert from "node:assert/strict";
import test from "node:test";

const ownerBench = { schemaVersion: 1, families: [{
  id: "owner-family", game: "mtg", format: "Commander", name: "Owner Atraxa",
  commander: { name: "Atraxa, Praetors' Voice" }, commissionNote: "True Superfriends with Doubling Season as a star",
  revisions: [{ id: "owner-revision", fingerprint: "deck-owner", version: 1, deckText: "1 Atraxa, Praetors' Voice\n1 Doubling Season\n1 Sol Ring" }],
}] };
const otherBench = { schemaVersion: 1, families: [{ id: "other-family", game: "mtg", format: "Commander", name: "Other", commander: { name: "Atraxa, Praetors' Voice" }, commissionNote: "Superfriends Doubling Season star", revisions: [{ id: "other-revision", fingerprint: "deck-other", deckText: "1 Atraxa, Praetors' Voice\n1 Doubling Season" }] }] };

class RevisionD1 {
  constructor() { this.rows = new Map(); this.inserts = []; }
  prepare(sql) { const rows=this.rows,inserts=this.inserts; return { bind(...values) { return {
    async first() { return rows.get(values[0]) || null; },
    async run() { inserts.push({ sql, values }); return { success: true }; },
    async all() { return { results: [] }; },
  }; } }; }
}
async function worker() { const url=new URL("../dist/server/index.js",import.meta.url);url.searchParams.set("revision-opinion",`${Date.now()}-${Math.random()}`);return (await import(url.href)).default; }
const ctx={waitUntil(){},passThroughOnException(){}};
const env=(DB)=>({DB,ASSETS:{fetch:async()=>new Response("no",{status:404})},METAFORGE_BOOTSTRAP_LOCK:"unlocked",ALLOW_DEV_AUTH_BYPASS:"true"});
const req=(email,body)=>new Request("https://example.test/api/coach/revision-opinion",{method:"POST",headers:{...(email?{"x-dev-user-email":email}:{}),"content-type":"application/json"},body:JSON.stringify(body)});
async function keyFor(email){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`metaforge-account:${email}`));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}

test("revision opinion requires authentication and uses only the owner's saved Bench",async()=>{
  const w=await worker(),DB=new RevisionD1();
  DB.rows.set(await keyFor("owner@example.com"),{bench_json:JSON.stringify(ownerBench)});
  DB.rows.set(await keyFor("other@example.com"),{bench_json:JSON.stringify(otherBench)});
  assert.equal((await w.fetch(req(null,{familyId:"owner-family",revisionId:"owner-revision"}),env(DB),ctx)).status,401);
  const own=await (await w.fetch(req("owner@example.com",{familyId:"owner-family",revisionId:"owner-revision",claims:[{statement:"caller belief"}]}),env(DB),ctx)).json();
  assert.equal(own.eligible,true);assert.equal(own.revision.fingerprint,"deck-owner");assert.equal(own.constructionReadOnly,true);assert.equal(own.writesToBrain,false);
  assert.doesNotMatch(JSON.stringify(own),/caller belief/);
  const stolen=await (await w.fetch(req("owner@example.com",{familyId:"other-family",revisionId:"other-revision"}),env(DB),ctx)).json();
  assert.equal(stolen.eligible,false);assert.equal(stolen.reason,"family_not_found");
  assert.equal(DB.inserts.length,1);assert.match(DB.inserts[0].sql,/opinion_revisions/);
});

test("revision opinion keeps stale and unregistered revisions unresolved without Archive writes",async()=>{
  const w=await worker(),DB=new RevisionD1();DB.rows.set(await keyFor("owner@example.com"),{bench_json:JSON.stringify(ownerBench)});
  const stale=await (await w.fetch(req("owner@example.com",{familyId:"owner-family",revisionId:"missing"}),env(DB),ctx)).json();
  assert.equal(stale.eligible,false);assert.equal(stale.reason,"stale_or_missing_revision");assert.equal(stale.presentation,null);assert.equal(DB.inserts.length,0);
});

