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
const draft = (overrides={}) => ({schemaVersion:1,format:'Commander',commander:{name:'Commander',colors:['W']},shell:{id:'auras'},preferences:{budget:'Under $100',maxCardPrice:5,commonsOnly:true,note:'Keep these picks'},session:{key:'Commander|Commander||auras',generationId:'pool',categories:['ramp'],categoryIndex:0,accepted:['Sol Ring'],declined:[],manualCards:{},finish:{stage:'review',basics:{Plains:98},manaConfirmed:true,landTarget:98}},completion:{id:'aaaaaaaa-aaaa-aaaa-aaaa',deckId:'bbbbbbbb-bbbb-bbbb-bbbb',seed:123},...overrides});
const request = (method,body,user='alice') => new Request('https://example.test/api',{method,headers:{'content-type':'application/json',...(user?{'x-test-user':user}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function save(env, value=draft(), baseRevision=0,user='alice') {return api.handleGuidedDraft(request('PUT',{draft:value,baseRevision},user),env);}
const finish = (env,baseRevision=1) => api.handleGuidedComplete(request('POST',{baseRevision,completionId:draft().completion.id}),env);
const success = () => Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n98 Plains'}}});
test('draft validation rejects malformed completion and payload preserves picks and filters',()=>{
  assert.equal(validGuidedDraft(draft()),true);
  assert.equal(validGuidedDraft(draft({completion:{id:'oops'}})),false);
  const payload=guidedGenerationPayload(draft()); assert.equal(payload.deck,'1 Sol Ring\n98 Plains');assert.equal(payload.maxCardPrice,5);assert.equal(payload.commonsOnly,true);assert.equal(payload.seed,123);
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
  globalThis.__guidedGenerate=async()=>{await new Promise(resolve=>release=resolve);return Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n98 Plains'}}});};
  const late=finish(env);while(!release) await new Promise(resolve=>setImmediate(resolve));
  env.sqlite.exec("UPDATE guided_drafts SET updated_at=datetime('now','-16 minutes')");
  globalThis.__guidedGenerate=async()=>success();const recovered=await (await finish(env,2)).json();
  release();assert.equal((await late).status,202);
  assert.deepEqual(await (await finish(env,2)).json(),recovered);
});

// Guided finish: the deck only completes from a confirmed review with every
// slot filled by the player, and the analysis may never add or cut a card.
const withFinish = (finish, accepted=['Sol Ring']) => { const base=draft(); return draft({session:{...base.session,accepted,finish}}); };
test('finishing is refused until the mana base is confirmed and every slot is filled',async()=>{
  let calls=0; globalThis.__guidedGenerate=async()=>{calls++;return success();};
  for (const finish of [undefined,{stage:'slots',basics:{Plains:98},manaConfirmed:true},{stage:'review',basics:{Plains:98},manaConfirmed:false},{stage:'review',basics:{Plains:90},manaConfirmed:true},{stage:'review',basics:{Plains:99},manaConfirmed:true}]) {
    const env=environment(); assert.equal((await save(env,withFinish(finish))).status,200);
    const response=await finish_(env); assert.equal(response.status,409); assert.equal((await response.json()).code,'SLOTS_OPEN');
  }
  assert.equal(calls,0,'the Forge never runs on an unconfirmed or incomplete deck');
});
const finish_ = (env,baseRevision=1) => api.handleGuidedComplete(request('POST',{baseRevision,completionId:draft().completion.id}),env);
test('a confirmed deck is analysed exactly as chosen: an added or trimmed card stops the finish',async()=>{
  const env=environment();await save(env);
  let payload; globalThis.__guidedGenerate=async(req)=>{payload=await req.json();return Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n97 Plains\n1 Forge Pick'}}});};
  const refused=await finish_(env); assert.equal(refused.status,422); assert.deepEqual((await refused.json()).added,['Forge Pick']);
  assert.equal(payload.deck,'1 Sol Ring\n98 Plains'); assert.equal(payload.mode,'imported');
  assert.equal((await (await api.handleGuidedDraft(request('GET'),env)).json()).phase,'active');
  globalThis.__guidedGenerate=async()=>Response.json({nativeReport:{selected:{deckText:'1 Commander\n1 Sol Ring\n98 Plains'},changes:{added:[],trimmed:[{name:'Sol Ring',cut:1}]}}});
  assert.equal((await finish_(env,3)).status,422);
});
test('draft validation rejects a malformed finish block',()=>{
  assert.equal(validGuidedDraft(withFinish({stage:'mana',basics:{},manaConfirmed:false,landTarget:36})),true);
  assert.equal(validGuidedDraft(withFinish({stage:'done',basics:{}})),false);
  assert.equal(validGuidedDraft(withFinish({stage:'mana',basics:{'Sol Ring':3}})),false);
  assert.equal(validGuidedDraft(withFinish({stage:'mana',basics:{Plains:-1}})),false);
});

// Guests: the draft lives under the signed anonymous cookie, and signing in
// claims it into the account through /api/account/claim-guest.
import { createHmac } from 'node:crypto';
const SECRET='test-guest-secret';
const guestId='11111111-2222-3333-4444-555555555555';
const sign=(value)=>createHmac('sha256',SECRET).update(value).digest('hex');
const guestCookie=`mf_guest=${encodeURIComponent(`${guestId}.${sign(guestId)}`)}`;
const guestRequest=(method,body,cookie=guestCookie)=>new Request('https://example.test/api',{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const guestEnv=()=>{const env=environment();env.GUEST_SESSION_SECRET=SECRET;env.sqlite.exec(readFileSync(join(root,'migrations/0011_forge_generations.sql'),'utf8'));return env;};
test('a guest saves and resumes a guided draft under their signed cookie only',async()=>{
  const env=guestEnv();
  assert.equal((await api.handleGuidedDraft(guestRequest('PUT',{draft:draft(),baseRevision:0}),env)).status,200);
  const mine=await (await api.handleGuidedDraft(guestRequest('GET'),env)).json();
  assert.equal(mine.owner,'guest'); assert.equal(mine.guest,true); assert.deepEqual(mine.draft.session.accepted,['Sol Ring']);
  assert.match(mine.guestClaimToken,new RegExp(`^${guestId}\\.`));
  assert.equal((await api.handleGuidedDraft(guestRequest('GET',null,`mf_guest=${guestId}.forged`),env)).status,401,'a forged cookie is not a session');
  assert.equal((await api.handleGuidedDraft(guestRequest('GET',null,null),env)).status,401);
  assert.equal(env.sqlite.prepare('SELECT user_key FROM guided_drafts').get().user_key,`guest:${guestId}`);
});
test('signing in claims the guest build into the account, once, and never over an unfinished account build',async()=>{
  const env=guestEnv();
  await api.handleGuidedDraft(guestRequest('PUT',{draft:draft(),baseRevision:0}),env);
  env.sqlite.prepare('INSERT INTO forge_generations (generation_id,user_key,schema_version,payload_json,created_at,expires_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,?)').run('pool',`guest:${guestId}`,1,'{}',Date.now()+60000);
  const token=(await (await api.handleGuidedDraft(guestRequest('GET'),env)).json()).guestClaimToken;
  const claim=(user,guidedClaimToken=token)=>api.handleGuidedClaim(request('POST',{guidedClaimToken},user),env);
  assert.equal((await claim(null)).status,401);
  assert.equal((await claim('alice',`${guestId}.bad`)).status,404);
  const claimed=await claim('alice'); assert.equal(claimed.status,200); assert.equal((await claimed.json()).phase,'active');
  const account=await (await api.handleGuidedDraft(request('GET'),env)).json();
  assert.deepEqual(account.draft.session.accepted,['Sol Ring']);
  assert.equal(env.sqlite.prepare('SELECT user_key FROM forge_generations WHERE generation_id=?').get('pool').user_key,'alice','the pool follows the build');
  assert.equal((await claim('alice')).status,404,'a claim token works once');
  // An account with its own unfinished build keeps it.
  await api.handleGuidedDraft(guestRequest('PUT',{draft:draft(),baseRevision:0}),env);
  const conflict=await api.handleGuidedClaim(request('POST',{guidedClaimToken:token},'alice'),env);
  assert.equal(conflict.status,409); assert.ok((await conflict.json()).guestDraft);
});
