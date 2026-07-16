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
            if(!db.claims.some(x=>x.id===v[0]))db.claims.push({id:v[0],source_url:v[1],source_title:v[2],author:v[3],published_at:v[4],source_type:v[5],summary:v[6],principle:v[7],format:v[8],stance:v[9],tags_json:v[10],cards_json:v[11],status:"quarantined",created_at:"now",reviewed_at:null});
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
const claim={sourceUrl:"https://example.com/pro",sourceTitle:"Pro interview",author:"Named Pro",publishedAt:"2026-07-01",sourceType:"interview",summary:"A sufficiently detailed paraphrase about protecting the opening turns.",principle:"Protect the early turns",format:"Standard",stance:"supports",tags:["tempo"]};

test("knowledge API quarantines submissions and keeps them away from buddies until approved",async()=>{const w=await worker(),DB=new KnowledgeD1();assert.equal((await w.fetch(req("/api/founder/knowledge","GET",buddy),env(DB),ctx)).status,403);const created=await (await w.fetch(req("/api/founder/knowledge","POST",founder,claim),env(DB),ctx)).json();assert.equal(created.status,"quarantined");assert.equal((await (await w.fetch(req("/api/coach/knowledge?format=Standard","GET",buddy),env(DB),ctx)).json()).claims.length,0);await w.fetch(req("/api/founder/knowledge","PATCH",founder,{id:created.id,status:"approved"}),env(DB),ctx);assert.equal((await (await w.fetch(req("/api/coach/knowledge?format=Standard","GET",buddy),env(DB),ctx)).json()).claims.length,1)});
