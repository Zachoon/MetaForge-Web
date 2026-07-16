import assert from "node:assert/strict";
import test from "node:test";
import { nativeCoachAnswer } from "../worker/native-coach.ts";

test("native MTG Coach explains a concrete recommendation and evidence contract",()=>{const answer=nativeCoachAnswer([{role:"user",content:"Why this change?"}],{game:"Magic: The Gathering",format:"Standard",deckText:"22 Mountain\n2 Expensive Spell\n36 Core Spell"});assert.match(answer,/Change:/);assert.match(answer,/Expected gain:/);assert.match(answer,/Tradeoff:/);assert.match(answer,/2500 opening hands/);assert.match(answer,/not silently rewrite/i)});
test("native Coach reviews a result as a decision question rather than hindsight",()=>{const answer=nativeCoachAnswer([{role:"user",content:"I lost my last game. Did I misplay?"}],{game:"Magic: The Gathering",deckText:"24 Mountain\n36 Spell"});assert.match(answer,/without pretending the result proves/i);assert.match(answer,/legal lines/i);assert.match(answer,/credible punishment/i)});
test("native Riftbound Coach uses its own verified-text analysis",()=>{const answer=nativeCoachAnswer([{role:"user",content:"What is this deck doing?"}],{game:"Riftbound",deckText:"3 Yasuo, Windrider\n3 Yi, Honed"});assert.match(answer,/verified text pattern/i);assert.match(answer,/five games/i);assert.match(answer,/Champion, Legend, domain/i)});
