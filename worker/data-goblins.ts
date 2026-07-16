import { userKey } from "./account-bench";
import { discoverOfficialLinks, extractSourceMetadata } from "../app/data-goblin-discovery.mjs";
import { claimCollectorBootstrap } from "../app/collector-bootstrap.mjs";
interface Env{DB:D1Database;METAFORGE_FOUNDER_USER_KEY?:string;OPENAI_API_KEY?:string;OPENAI_MODEL?:string}
const TARGETS=[
  {game:"mtg",url:"https://magic.wizards.com/en/news",host:"magic.wizards.com",sourceClass:"official-news"},
  {game:"riftbound",url:"https://playriftbound.com/en-us/news/",host:"playriftbound.com",sourceClass:"official-news",seeds:["https://playriftbound.com/en-us/rules-hub/","https://playriftbound.com/en-us/card-gallery/","https://playriftbound.com/en-us/news/rules-and-releases/deckbuilding-primer/"]},
];
const id=async value=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24);
async function extractStrategicClaims(env:Env,source:any,document:any){if(!env.OPENAI_API_KEY||!document.published||!/strategy|interview|top.?decks|championship|tournament/i.test(source.url))return;const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5.6-luna",store:false,max_output_tokens:1200,reasoning:{effort:"low"},input:`Extract at most 3 strategic card-game claims from this official ${source.game} article. Return ONLY JSON array. Each item: {author,principle,summary,stance,tags,cards}. Paraphrase; do not quote. Ignore promotional or purely factual text. stance must be supports, challenges, or contextual. Article title: ${document.title}\nURL: ${source.url}\nTEXT:\n${document.text}`})});if(!response.ok)return;const result:any=await response.json();const raw=result.output_text||(result.output||[]).flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==="output_text")?.text||"[]";let claims:any[];try{claims=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,""))}catch{return}for(const claim of claims.slice(0,3)){if(!claim?.principle||String(claim.summary||"").length<20)continue;const claimId=await id(`${source.game}|${source.url}|${claim.principle}|${claim.stance||"contextual"}`);await env.DB.prepare("INSERT OR IGNORE INTO coaching_knowledge_claims (id,game,source_url,source_title,author,published_at,source_type,summary,principle,format,stance,tags_json,cards_json,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'quarantined')").bind(claimId,source.game,source.url,document.title,String(claim.author||"Official coverage"),document.published,"event-coverage",String(claim.summary).slice(0,2000),String(claim.principle).slice(0,500),"General",["supports","challenges","contextual"].includes(claim.stance)?claim.stance:"contextual",JSON.stringify(Array.isArray(claim.tags)?claim.tags.slice(0,20):[]),JSON.stringify(Array.isArray(claim.cards)?claim.cards.slice(0,30):[])).run()}}
export async function runDataGoblins(env:Env,fetcher:typeof fetch=fetch){
  for(const target of TARGETS){
    const runId=await id(`${target.game}|${Date.now()}`);
    await env.DB.prepare("INSERT INTO data_goblin_runs (id,game,status) VALUES (?,?,?)").bind(runId,target.game,"running").run();
    try{
      const response=await fetcher(target.url,{headers:{"User-Agent":"MetaForgeResearch/1.0 (+private alpha; source discovery only)"}});
      if(!response.ok)throw new Error(`source returned ${response.status}`);
      const html=(await response.text()).slice(0,2_000_000);
      const links=[...new Set([target.url,...("seeds" in target?target.seeds:[]),...discoverOfficialLinks(html,target.url,target.host)])];
      let discovered=0;
      for(const url of links){
        const sourceId=await id(`${target.game}|${url}`);
        const result=await env.DB.prepare("INSERT OR IGNORE INTO data_goblin_sources (id,game,url,source_class,trust_tier,status) VALUES (?,?,?,?,?,'verified-source')").bind(sourceId,target.game,url,target.sourceClass,"official").run();
        discovered+=Number(result.meta?.changes||0);
        await env.DB.prepare("UPDATE data_goblin_sources SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(sourceId).run();
      }
      const pending=await env.DB.prepare("SELECT id,game,url FROM data_goblin_sources WHERE game=? AND content_hash IS NULL ORDER BY first_seen_at DESC LIMIT 4").bind(target.game).all();
      for(const source of pending.results||[]){
        try{
          const pageResponse=await fetcher(String((source as any).url),{headers:{"User-Agent":"MetaForgeResearch/1.0"}});
          if(!pageResponse.ok)continue;
          const page=(await pageResponse.text()).slice(0,2_000_000);
          const document=extractSourceMetadata(page,String((source as any).url));
          const hash=await id(document.text);
          await env.DB.prepare("UPDATE data_goblin_sources SET title=?,published_at=?,content_hash=?,extracted_at=CURRENT_TIMESTAMP WHERE id=?").bind(document.title,document.published,hash,(source as any).id).run();
          await extractStrategicClaims(env,source,document);
        }catch{}
      }
      await env.DB.prepare("UPDATE data_goblin_runs SET status='complete',finished_at=CURRENT_TIMESTAMP,sources_checked=?,sources_discovered=? WHERE id=?").bind(links.length,discovered,runId).run();
    }catch(error){
      await env.DB.prepare("UPDATE data_goblin_runs SET status='failed',finished_at=CURRENT_TIMESTAMP,error=? WHERE id=?").bind(String(error).slice(0,500),runId).run();
    }
  }
}
export async function ensureDataGoblinsStarted(env:Env,fetcher:typeof fetch=fetch){
  return claimCollectorBootstrap(env.DB,()=>runDataGoblins(env,fetcher));
}
export async function handleGoblinOperations(request:Request,env:Env){
  const key=await userKey(request);
  if(!key||key!==env.METAFORGE_FOUNDER_USER_KEY)return Response.json({error:"Founder access required"},{status:403});
  if(request.method==="POST"){await runDataGoblins(env);return Response.json({started:true});}
  const runs=await env.DB.prepare("SELECT * FROM data_goblin_runs ORDER BY started_at DESC LIMIT 20").all();
  const totals=await env.DB.prepare("SELECT game,COUNT(*) sources,SUM(CASE WHEN extracted_at IS NOT NULL THEN 1 ELSE 0 END) extracted,MAX(last_seen_at) last_seen FROM data_goblin_sources GROUP BY game").all();
  const latest=(runs.results||[])[0] as any;
  const latestTime=latest?.finished_at||latest?.started_at||null;
  const ageHours=latestTime?(Date.now()-Date.parse(String(latestTime)+(/Z|[+-]\d\d:?\d\d$/.test(String(latestTime))?"":"Z")))/3_600_000:null;
  return Response.json({runs:runs.results||[],totals:totals.results||[],readiness:{coach:Boolean(env.OPENAI_API_KEY),strategicExtraction:Boolean(env.OPENAI_API_KEY),officialSourceIndexing:true,schedule:"Hourly at minute 0 UTC",collectorHealth:!latest?"awaiting-first-run":latest.status==="failed"?"failed":ageHours!==null&&ageHours>3?"stale":"healthy",lastRunAt:latestTime}},{headers:{"Cache-Control":"no-store"}});
}
