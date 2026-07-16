import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerCharacterSheet } from "../app/player-character-sheet.mjs";

test("does not reveal a personality verdict from wins and losses",()=>{
  const sheet=buildPlayerCharacterSheet({matches:Array.from({length:20},(_,i)=>({result:i%2?"win":"loss"}))});
  assert.equal(sheet.ready,false);assert.equal(sheet.decisionEvidence,0);assert.ok(sheet.traits.every(t=>t.confidence==="unobserved"));
});

test("builds traits from repeated observable decisions",()=>{
  const decisions=[{kind:"attack-window",tookPressureLine:true},{kind:"risk-window",acceptedRisk:true},{kind:"resource-window",preservedResource:true},{kind:"plan-pivot",changedPlan:true},{kind:"decision-time",seconds:3},{kind:"attack-window",tookPressureLine:true}];
  const sheet=buildPlayerCharacterSheet({matches:Array.from({length:8},(_,i)=>({playerDecisions:i?[]:decisions}))});
  assert.equal(sheet.ready,true);assert.ok(sheet.traits.find(t=>t.key==="aggression").value>50);
});
