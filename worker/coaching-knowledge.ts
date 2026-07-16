import { userKey } from "./account-bench";

interface Env { DB:D1Database; METAFORGE_FOUNDER_USER_KEY?:string }
const SOURCE_TYPES=new Set(["interview","article","event-coverage","video-transcript","podcast-transcript"]);
const STANCES=new Set(["supports","challenges","contextual"]);
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
const cleanList=(value:unknown)=>Array.isArray(value)?value.map(String).map(x=>x.trim()).filter(Boolean).slice(0,30):[];
async function idFor(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24)}
function mapped(row:any){return {id:row.id,sourceUrl:row.source_url,sourceTitle:row.source_title,author:row.author,publishedAt:row.published_at,sourceType:row.source_type,summary:row.summary,principle:row.principle,format:row.format,stance:row.stance,tags:JSON.parse(row.tags_json||"[]"),cards:JSON.parse(row.cards_json||"[]"),status:row.status,createdAt:row.created_at,reviewedAt:row.reviewed_at}}

export async function handleCoachingKnowledge(request:Request,env:Env,founderOnly=false){
  const key=await userKey(request); if(!key)return json({error:"Authenticated account required"},401);
  const founder=Boolean(env.METAFORGE_FOUNDER_USER_KEY&&key===env.METAFORGE_FOUNDER_USER_KEY);
  if(founderOnly&&!founder)return json({error:"Founder access required"},403);
  if(request.method==="GET"){
    const query=founderOnly?"SELECT * FROM coaching_knowledge_claims ORDER BY created_at DESC LIMIT 500":"SELECT * FROM coaching_knowledge_claims WHERE status='approved' ORDER BY reviewed_at DESC LIMIT 500";
    const result=await env.DB.prepare(query).all(); let claims=(result.results||[]).map(mapped);
    if(!founderOnly){const url=new URL(request.url),format=url.searchParams.get("format");if(format)claims=claims.filter((c:any)=>c.format==="General"||c.format===format)}
    return json({claims});
  }
  if(!founderOnly)return json({error:"Method not allowed"},405);
  let body:any;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
  if(request.method==="POST"){
    const sourceUrl=String(body.sourceUrl||"").trim(),sourceTitle=String(body.sourceTitle||"").trim(),author=String(body.author||"").trim(),summary=String(body.summary||"").trim(),principle=String(body.principle||"").trim(),publishedAt=String(body.publishedAt||"").trim(),sourceType=String(body.sourceType||"").trim(),stance=String(body.stance||"contextual").trim(),format=String(body.format||"General").trim();
    try{const parsed=new URL(sourceUrl);if(!["http:","https:"].includes(parsed.protocol))throw 0}catch{return json({error:"Valid public source URL required"},400)}
    if(!sourceTitle||!author||summary.length<20||principle.length<8||!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)||!SOURCE_TYPES.has(sourceType)||!STANCES.has(stance))return json({error:"Complete provenance and strategic claim required"},400);
    const id=await idFor(`${sourceUrl.toLowerCase()}|${author.toLowerCase()}|${principle.toLowerCase()}|${stance}`);
    await env.DB.prepare("INSERT OR IGNORE INTO coaching_knowledge_claims (id,source_url,source_title,author,published_at,source_type,summary,principle,format,stance,tags_json,cards_json,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'quarantined')").bind(id,sourceUrl,sourceTitle,author,publishedAt,sourceType,summary,principle,format,stance,JSON.stringify(cleanList(body.tags)),JSON.stringify(cleanList(body.cards))).run();
    return json({id,status:"quarantined"},201);
  }
  if(request.method==="PATCH"){
    const status=String(body.status||"");if(!["approved","rejected"].includes(status)||!body.id)return json({error:"Valid review decision required"},400);
    await env.DB.prepare("UPDATE coaching_knowledge_claims SET status=?, reviewer_key=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,key,String(body.id)).run();return json({id:body.id,status});
  }
  return json({error:"Method not allowed"},405);
}
