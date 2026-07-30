import assert from "node:assert/strict";import test from "node:test";import FORGE_CANDIDATE from "../app/forge-candidate.mjs";import{evaluateSimulationGate,simulateGoldfish}from"../app/goldfish-simulation.mjs";
test("goldfish simulation is deterministic",()=>{assert.deepEqual(simulateGoldfish(FORGE_CANDIDATE.deck,"Control",250,42),simulateGoldfish(FORGE_CANDIDATE.deck,"Control",250,42));});
test("simulation ladder reports coverage and pilot sensitivity",()=>{const result=evaluateSimulationGate(FORGE_CANDIDATE.deck,"Control",500,7);assert.match(result.gate,/goldfish|consistency|unsupported/);assert.ok(result.expert.modelCoverage>.9);assert.ok(["low","moderate","high"].includes(result.sensitivityLabel));assert.match(result.warning,/not a predicted match win rate/i);});
test("unsupported behavior blocks false confidence",()=>{const deck=[{quantity:24,card:"Land",role:"land"},{quantity:36,card:"Mystery",role:"combo-engine",cmc:2}];assert.equal(evaluateSimulationGate(deck,"Midrange",100,1).gate,"unsupported");});
test("colorScrewRate is null when the deck carries no color pip data at all",()=>{assert.equal(simulateGoldfish(FORGE_CANDIDATE.deck,"Control",250,42).colorScrewRate,null);});
test("colorScrewRate and keepableRate both go to their worst value when a deck has zero sources of its only color",()=>{
  const deck=[
    {quantity:36,card:"Lightning Strike",role:"removal",cmc:1,colorPips:{W:0,U:0,B:0,R:1,G:0}},
    {quantity:24,card:"Island",role:"land",colorIdentity:["U"]},
  ];
  const result=simulateGoldfish(deck,"Control",300,5);
  assert.equal(result.colorScrewRate,1,"every game should be color-screwed with zero red sources anywhere in the deck");
  assert.equal(result.keepableRate,0,"a hand can only be keepable if its lands cover its own spells' colors, which is impossible here");
  assert.equal(result.planRealizationRate,0,"nothing is ever castable, so the plan can never realize");
});
test("colorScrewRate and keepableRate recover once the deck actually has matching color sources",()=>{
  const deck=[
    {quantity:36,card:"Lightning Strike",role:"removal",cmc:1,colorPips:{W:0,U:0,B:0,R:1,G:0}},
    {quantity:24,card:"Mountain",role:"land",colorIdentity:["R"]},
  ];
  const result=simulateGoldfish(deck,"Control",300,5);
  assert.ok(result.colorScrewRate<0.05,`expected near-zero color screw with 24 matching sources, got ${result.colorScrewRate}`);
  assert.ok(result.keepableRate>0.3,`expected a healthy keepable rate with matching sources, got ${result.keepableRate}`);
});
test("ramp and protection are modeled roles, not unsupported cards that block the gate",()=>{
  const deck=[
    {quantity:24,card:"Forest",role:"land",cmc:undefined},
    {quantity:6,card:"Rampant Growth",role:"ramp",cmc:2},
    {quantity:6,card:"Heroic Intervention",role:"protection",cmc:2},
    {quantity:24,card:"Big Threat",role:"finisher",cmc:4},
  ];
  const result=simulateGoldfish(deck,"Midrange",300,3);
  assert.deepEqual(result.unsupportedCards,[]);
  assert.equal(result.modelCoverage,1);
});
test("a ramp spell mechanically adds a mana source starting next turn, accelerating every later turn",()=>{
  // Fodder is cheap and plentiful so any mana ramp frees up actually gets
  // spent — averageManaSpent then directly reflects how much extra mana
  // the ramp cards produced across the game, not just their own value.
  const rampDeck=[
    {quantity:24,card:"Forest",role:"land",cmc:undefined},
    {quantity:4,card:"Rampant Growth",role:"ramp",cmc:2},
    {quantity:32,card:"Fodder",role:"stabilizer",cmc:1},
  ];
  const noRampDeck=[
    {quantity:24,card:"Forest",role:"land",cmc:undefined},
    {quantity:4,card:"Generic Value",role:"stabilizer",cmc:2},
    {quantity:32,card:"Fodder",role:"stabilizer",cmc:1},
  ];
  const withRamp=simulateGoldfish(rampDeck,"Midrange",600,21);
  const withoutRamp=simulateGoldfish(noRampDeck,"Midrange",600,21);
  assert.ok(
    withRamp.averageManaSpent>withoutRamp.averageManaSpent,
    `expected ramp to spend more total mana over 8 turns than an equivalent non-ramp card, got ${withRamp.averageManaSpent} vs ${withoutRamp.averageManaSpent}`,
  );
});
