import assert from "node:assert/strict";import test from "node:test";import FORGE_CANDIDATE from "../app/forge-candidate.mjs";import{drawOpeningHand,evaluateSimulationGate,isKeepable,simulateGoldfish}from"../app/goldfish-simulation.mjs";
const land=(name,colors)=>({card:name,role:"land",colorIdentity:colors});
const spell=(name,cmc,pips)=>({card:name,role:"stabilizer",cmc,colorPips:pips});
test("isKeepable requires 2-5 lands and no color-locked spell",()=>{
  assert.equal(isKeepable([land("Forest",["G"]),land("Forest",["G"]),spell("A",2)]),true,"2 lands is keepable");
  assert.equal(isKeepable([land("Forest",["G"])]),false,"1 land is not keepable");
  assert.equal(isKeepable(Array.from({length:6},()=>land("Forest",["G"]))),false,"6 lands is not keepable");
  assert.equal(isKeepable([land("Forest",["G"]),land("Forest",["G"]),spell("A",2,{R:1})]),false,"a red spell with only green sources is color-trapped");
});
test("drawOpeningHand never mulligans a deck where every possible hand is already keepable",()=>{
  // Exactly 7 cards means library.splice(-7) always deals the whole deck —
  // the same 3 lands and 4 spells regardless of shuffle order or seed, so
  // this is deterministic across any rng.
  const deck=[land("Forest",["G"]),land("Forest",["G"]),land("Forest",["G"]),spell("A",1),spell("B",2),spell("C",3),spell("D",4)];
  for(const seed of[1,2,3,4,5]){
    const rng=mulberry32(seed);
    const drawn=drawOpeningHand(deck,rng);
    assert.equal(drawn.mulligans,0,`seed ${seed} should never need to mulligan a deck that can only ever deal a keepable hand`);
    assert.equal(drawn.hand.length,7);
  }
});
test("drawOpeningHand stops at the mulligan cap instead of looping forever on a hand that can never be fixed",()=>{
  // All 7 deck cards are nonland — 0 lands is never keepable, and since the
  // library only ever contains these same 7 cards, redrawing after a
  // mulligan deals the identical unkeepable hand every time. This proves
  // the loop terminates at MULLIGAN_CAP rather than looping indefinitely.
  const deck=Array.from({length:7},(_,i)=>spell(`S${i}`,i+1));
  const drawn=drawOpeningHand(deck,mulberry32(9));
  assert.equal(drawn.mulligans,2,"should stop exactly at the mulligan cap");
  assert.equal(drawn.keepable,false,"the hand it was forced to keep is still not actually keepable");
  assert.equal(drawn.hand.length,5,"a 7-card hand kept after 2 mulligans bottoms 2 cards, per the London mulligan rule");
});
test("bottoming after a forced mulligan sheds the most expensive nonland cards first",()=>{
  const deck=[spell("Cheap",1),spell("Mid",2),spell("Costly",3),spell("PricierStill",4),spell("Priciest",5),spell("MostExpensive",6),spell("VeryExpensive",7)];
  const drawn=drawOpeningHand(deck,mulberry32(9));
  const remaining=drawn.hand.map((c)=>c.card);
  assert.deepEqual(remaining.sort(),["Cheap","Costly","Mid","PricierStill","Priciest"].sort(),"the two highest-CMC cards should be bottomed, not an arbitrary two");
});
test("bottoming after a forced mulligan sheds excess lands first once the hand is flooded",()=>{
  const deck=[land("F1",["G"]),land("F2",["G"]),land("F3",["G"]),land("F4",["G"]),land("F5",["G"]),land("F6",["G"]),spell("OnlySpell",2)];
  const drawn=drawOpeningHand(deck,mulberry32(9));
  const lands=drawn.hand.filter((c)=>c.role==="land").length;
  assert.equal(lands,4,"should have bottomed 2 of the 6 lands rather than the lone spell");
  assert.ok(drawn.hand.some((c)=>c.card==="OnlySpell"),"the only spell in the deck must survive the bottoming");
});
function mulberry32(seed){return()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
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
  assert.equal(result.averageMulligans,2,"a hand that can structurally never be keepable should always be mulliganed to the cap");
  assert.equal(result.mulliganRate,1,"every single game should have mulliganed at least once");
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

test("isKeepable treats display Mana source roles as lands", () => {
  const mana = (name) => ({ card: name, role: "Mana source", cmc: 0 });
  assert.equal(isKeepable([mana("Command Tower"), mana("Reliquary Tower"), spell("A", 2)]), true);
  assert.equal(isKeepable([mana("Command Tower"), spell("A", 2)]), false);
});

test("isKeepable recognizes a castable mana rock that unlocks a missing color", () => {
  const talisman = { card: "Talisman of Creativity", role: "ramp", cmc: 2, producedMana: ["U", "R"] };
  const redSpell = spell("Curse of Opulence", 1, { R: 1 });
  const twoIslands = [land("Island", ["U"]), land("Island", ["U"])];
  assert.equal(isKeepable([...twoIslands, talisman, redSpell]), true, "two lands can cast the Talisman, which then unlocks red");
  assert.equal(isKeepable([...twoIslands, { ...talisman, cmc: 3 }, redSpell]), false, "an unaffordable source must not rescue the hand");
});

test("restricted mana cannot pay for an illegal spell merely because total mana is high enough", () => {
  const base = [
    { quantity: 24, card: "Wastes", role: "land", colorIdentity: [] },
    { quantity: 24, card: "Nonartifact Finisher", role: "finisher", cmc: 5, typeLine: "Creature" },
  ];
  const restricted = simulateGoldfish([
    ...base,
    { quantity: 12, card: "Powerstone", role: "ramp", cmc: 2, typeLine: "Artifact", producedMana: ["C"], oracleText: "{T}: Add {C}. This mana can't be spent to cast a nonartifact spell." },
  ], "Ramp", 400, 91);
  const unrestricted = simulateGoldfish([
    ...base,
    { quantity: 12, card: "Unrestricted Rock", role: "ramp", cmc: 2, typeLine: "Artifact", producedMana: ["C"], oracleText: "{T}: Add {C}." },
  ], "Ramp", 400, 91);
  assert.ok(unrestricted.averageManaSpent > restricted.averageManaSpent, `${unrestricted.averageManaSpent} should exceed ${restricted.averageManaSpent}`);
});

test("Galazeth-shaped restricted mana remains legal for instants and sorceries", () => {
  const result = simulateGoldfish([
    { quantity: 24, card: "Island", role: "land", colorIdentity: ["U"] },
    { quantity: 12, card: "Prismari Source", role: "ramp", cmc: 2, typeLine: "Artifact", producedMana: ["U"], oracleText: "{T}: Add one mana of any color. Spend this mana only to cast an instant or sorcery spell." },
    { quantity: 24, card: "Big Instant", role: "draw", cmc: 5, typeLine: "Instant" },
  ], "Midrange", 300, 92);
  assert.ok(result.averageManaSpent > 20, `restricted spell mana should remain usable for instants, got ${result.averageManaSpent}`);
});
