import assert from "node:assert/strict";
import test from "node:test";
import { coachingProgress, evaluateIntervention, inferCoachingTarget } from "../app/coaching-progress.mjs";

test("awards mastery for reviewed games without daily-loss punishment",()=>{const result=coachingProgress([{matchId:"1",read:"My mana"},{matchId:"2",read:"My mana"},{matchId:"3",read:"My mana"}]);assert.equal(result.level,"Observer");assert.equal(result.patternsCaught,1);assert.equal(result.remaining,5);});
test("maps a mana recommendation to a measurable player signal",()=>assert.equal(inferCoachingTarget({title:"Fix color access"}),"My mana"));
test("requires before and after evidence before calling an intervention promising",()=>{const intervention={targetTag:"My mana",originalFingerprint:"a",proposedFingerprint:"b"};assert.equal(evaluateIntervention(intervention,[{deckFingerprint:"b",read:"My plan worked"},{deckFingerprint:"b",read:"My plan worked"}]).status,"testing");assert.equal(evaluateIntervention(intervention,[{deckFingerprint:"a",read:"My mana"},{deckFingerprint:"a",read:"My mana"},{deckFingerprint:"b",read:"My plan worked"},{deckFingerprint:"b",read:"My plan worked"},{deckFingerprint:"b",read:"My plan worked"}]).status,"promising");});
