import assert from"node:assert/strict";import test from"node:test";import{validateRiftboundMainDeck}from"../app/riftbound-analysis.mjs";
const catalog={cards:{alpha:{name:"Alpha"},beta:{name:"Beta"}}};
test("enforces official 40-card and three-copy main-deck rules",()=>{const result=validateRiftboundMainDeck([{name:"Alpha",quantity:4}],catalog);assert.equal(result.legal,false);assert.ok(result.issues.some(x=>x.type==="deck-size"));assert.ok(result.issues.some(x=>x.type==="copy-limit"))});
test("keeps full tournament legality explicitly bounded",()=>{const result=validateRiftboundMainDeck([{name:"Alpha",quantity:3},{name:"Beta",quantity:37}],catalog);assert.match(result.boundary,/Chosen Champion/) });
