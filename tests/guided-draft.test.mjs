import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { guidedCompletionReview, guidedGenerationPayload, validGuidedDraft } from '../app/guided-draft.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
let temporary, api;
before(async () => {
  temporary = mkdtempSync(join(root, 'node_modules', '.draft-test-'));
  const outfile = join(temporary, 'worker.mjs');
  await build({entryPoints:[join(root,'worker/guided-draft.ts')], outfile, bundle:true, platform:'node', format:'esm', plugins:[{
    name:'controlled-identity-and-generation', setup(b) {
      b.onResolve({filter:/\/account-bench$|^\.\/account-bench$/},()=>({path:'identity',namespace:'fixture'}));
      b.onResolve({filter:/\/forge-generate$|^\.\/forge-generate$/},()=>({path:'generate',namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'}, a=>({contents:a.path==='identity' ? 'export const userKey = async request => request.headers.get("x-test-user");' : 'export const handleForgeGenerateForKey = (...args) => globalThis.__guidedGenerate(...args);',loader:'js'}));
    }
  }]});
  api = await import(pathToFileURL(outfile).href);
});
after(()=>rmSync(temporary,{recursive:true,force:true}));
function environment() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(join(root,'migrations/0018_guided_drafts.sql'),'utf8'));
  sqlite.exec('CREATE TABLE api_rate_limits (user_key TEXT, endpoint TEXT, window_bucket INTEGER, requests INTEGER, updated_at TEXT, PRIMARY KEY(user_key,endpoint,window_bucket))');
  return {sqlite, DB:{prepare(sql) {let values=[]; return {bind(...args){values=args;return this;}, async first(){return sqlite.prepare(sql).get(...values)||null;}, async run(){const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}};}}};
}
const draft = (overrides={}) => ({schemaVersion:1,format:'Commander',commander:{name:'Commander',colors:['W']},shell:{id:'auras'},preferences:{budget:'Under $100',maxCardPrice:5,commonsOnly:true,note:'Keep these picks'},session:{key:'Commander|Commander||auras',generationId:'pool',categories:['ramp'],categoryIndex:0,accepted:['Sol Ring'],declined:[],manualCards:{}},completion:{id:'aaaaaaaa-aaaa-aaaa-aaaa',deckId:'bbbbbbbb-bbbb-bbbb-bbbb',seed:123},...overrides});
const request = (method,body,user='alice') => new Request('https://example.test/api',{method,headers:{'content-type':'application/json',...(user?{'x-test-user':user}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function save(env, value=draft(), baseRevision=0,user='alice') {return api.handleGuidedDraft(request('PUT',{draft:value,baseRevision},user),env);}
const finish = (env,baseRevision=1) => api.handleGuidedComplete(request('POST',{baseRevision,completionId:draft().completion.id}),env);
const success = () => Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n98 Plains'}}});
test('draft validation rejects malformed completion and payload preserves picks and filters',()=>{
  assert.equal(validGuidedDraft(draft()),true);
  assert.equal(validGuidedDraft(draft({completion:{id:'oops'}})),false);
  const payload=guidedGenerationPayload(draft()); assert.equal(payload.deck,'1 Sol Ring');assert.equal(payload.maxCardPrice,5);assert.equal(payload.commonsOnly,true);assert.equal(payload.seed,123);
  assert.equal(guidedCompletionReview('1 Front // Back\n1 Plains',['Front']).missing.length,0);
});
test('account isolation, revision conflicts and discard tombstones',async()=>{
  const env=environment(); assert.equal((await save(env)).status,200);
  assert.equal((await api.handleGuidedDraft(request('GET',null,null),env)).status,401);
  assert.equal((await (await api.handleGuidedDraft(request('GET',null,'bob'),env)).json()).draft,null);
  assert.equal((await save(env,draft(),0)).status,409);
  assert.equal((await api.handleGuidedDraft(request('DELETE',{baseRevision:1}),env)).status,200);
  assert.equal((await save(env,draft(),1)).status,409);
  assert.equal((await api.handleGuidedDraft(request('GET'),env)).headers.get('cache-control'),'no-store');
});
test('concurrent finish runs once and replay returns the durable result',async()=>{
  const env=environment();await save(env);let calls=0,release;
  globalThis.__guidedGenerate=async()=>{calls++;await new Promise(resolve=>release=resolve);return success();};
  const first=finish(env);while(!release) await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await finish(env)).status,202);
  assert.equal((await api.handleGuidedDraft(request('DELETE',{baseRevision:2}),env)).status,409);
  release();const completed=await (await first).json();assert.equal(completed.guidedReview.kept[0],'Sol Ring');
  assert.deepEqual(await (await finish(env)).json(),completed);assert.equal(calls,1);
});
test('missing picks fail visibly and definitive failures unlock the same draft',async()=>{
  const env=environment();await save(env);
  globalThis.__guidedGenerate=async()=>Response.json({nativeReport:{selected:{deckText:'1 Commander\n99 Plains'}}});
  const failed=await finish(env);assert.equal(failed.status,422);assert.deepEqual((await failed.json()).missingPicks,['Sol Ring']);
  const account=await (await api.handleGuidedDraft(request('GET'),env)).json();assert.equal(account.phase,'active');assert.deepEqual(account.draft.session.accepted,['Sol Ring']);
});
test('an interrupted completion can recover after its lease and stores one result',async()=>{
  const env=environment();await save(env);globalThis.__guidedGenerate=async()=>{throw Error('interruption fixture');};
  assert.equal((await finish(env)).status,202);
  env.sqlite.exec("UPDATE guided_drafts SET updated_at=datetime('now','-16 minutes')");
  globalThis.__guidedGenerate=async()=>success();assert.equal((await finish(env,2)).status,200);
  assert.equal((await (await api.handleGuidedDraft(request('GET'),env)).json()).phase,'complete');
});
test('a late expired request cannot overwrite a recovered completion',async()=>{
  const env=environment();await save(env);let release;
  globalThis.__guidedGenerate=async()=>{await new Promise(resolve=>release=resolve);return Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n98 Island'}}});};
  const late=finish(env);while(!release) await new Promise(resolve=>setImmediate(resolve));
  env.sqlite.exec("UPDATE guided_drafts SET updated_at=datetime('now','-16 minutes')");
  globalThis.__guidedGenerate=async()=>success();const recovered=await (await finish(env,2)).json();
  release();assert.equal((await late).status,202);
  assert.deepEqual(await (await finish(env,2)).json(),recovered);
});
