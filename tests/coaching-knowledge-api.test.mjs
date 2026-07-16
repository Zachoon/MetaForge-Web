import assert from "node:assert/strict";
import test from "node:test";

class KnowledgeD1 {
  claims=[];
  prepare(sql){
    const db=this;
    return {
      bind(...v){
        return {async run(){
          if(sql.startsWith("INSERT")){
            if(!db.claims.some(x=>x.id===v[0]))db.claims.push({id:v[0],game:v[1],source_url:v[2],source_title:v[3],author:v[4],published_at:v[5],source_type:v[6],summary:v[7],principle:v[8],format:v[9],stance:v[10],tags_json:v[11],cards_json:v[12],status:"quarantined",created_at:"now",reviewed_at:null});
          }else if(sql.startsWith("UPDATE")){
            const x=db.claims.find(x=>x.id===v[2]);
            if(x){x.status=v[0];x.reviewed_at="now";}
          }
          return {success:true};
        }};
      },
      async all(){return {results:db.claims.filter(x=>!sql.includes("status='approved'")||x.status==="approved")};}
    };
  }
}
async function worker(){const url=new URL("../dist/server/index.js",import.meta.url);url.searchParams.set("knowledge",`${Date.now()}-${Math.random()}`);return (await import(url.href)).default}
const founder="ZACH@DUKECITY.GAMES",buddy="buddy@example.com",ctx={waitUntil(){},passThroughOnException(){}},env=(DB)=>({DB,ASSETS:{fetch:async()=>new Response("no",{status:404})},METAFORGE_BOOTSTRAP_LOCK:"unlocked",METAFORGE_FOUNDER_USER_KEY:"f45237c471be9524242fb124700a61b6916cbbff9967c8ba74e43af0617bea90"});
const req=(path,method,email,body)=>new Request(`https://test${path}`,{method,headers:{"cf-access-authenticated-user-email":email,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
const claim={game:"mtg",sourceUrl:"https://example.com/pro",sourceTitle:"Pro interview",author:"Named Pro",publishedAt:"2026-07-01",sourceType:"interview",summary:"A sufficiently detailed paraphrase about protecting the opening turns.",principle:"Protect the early turns",format:"Standard",stance:"supports",tags:["tempo"]};

test("knowledge API quarantines submissions and keeps them away from buddies until approved",async()=>{const w=await worker(),DB=new KnowledgeD1();assert.equal((await w.fetch(req("/api/founder/knowledge","GET",buddy),env(DB),ctx)).status,403);const created=await (await w.fetch(req("/api/founder/knowledge","POST",founder,claim),env(DB),ctx)).json();assert.equal(created.status,"quarantined");assert.equal((await (await w.fetch(req("/api/coach/knowledge?game=mtg&format=Standard","GET",buddy),env(DB),ctx)).json()).claims.length,0);await w.fetch(req("/api/founder/knowledge","PATCH",founder,{id:created.id,status:"approved"}),env(DB),ctx);assert.equal((await (await w.fetch(req("/api/coach/knowledge?game=mtg&format=Standard","GET",buddy),env(DB),ctx)).json()).claims.length,1);assert.equal((await (await w.fetch(req("/api/coach/knowledge?game=riftbound&format=Standard","GET",buddy),env(DB),ctx)).json()).claims.length,0)});
