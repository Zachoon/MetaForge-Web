import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendLandCount, colorSourceTargets, proposeBasics, proposeManaBase, rankUtilityLands,
  finishStatus, finishedDeckText, finishGate, validFinishState, basicsTotal, producedColors,
} from "../app/guided-finish.mjs";

// The guided finish only reasons and proposes; these pin that reasoning.
const spell = (name, cmc, { roles = [], pips = {}, text = "" } = {}) => ({ card: { name, typeLine: "Sorcery", oracleText: text }, cmc, roles, colorPips: pips });
const land = (name, text, identity, typeLine = "Land") => ({ card: { name, typeLine, oracleText: text, colorIdentity: identity } });

test("land count starts at the Commander baseline and moves with the curve, ramp and land payoffs, each with a reason", () => {
  assert.equal(recommendLandCount({ deckTarget: 100, nonlandRows: [] }).count, 37);
  const heavy = Array.from({ length: 30 }, (_, i) => spell(`Big ${i}`, 5));
  const heavyResult = recommendLandCount({ deckTarget: 100, nonlandRows: heavy });
  assert.equal(heavyResult.count, 40, "heavy curve +2 and almost no ramp +1");
  assert.ok(heavyResult.reasons.some((line) => /average 5\.0 mana/.test(line)));
  const lean = Array.from({ length: 30 }, (_, i) => spell(`Cheap ${i}`, 2, { roles: i < 10 ? ["ramp"] : [] }));
  assert.equal(recommendLandCount({ deckTarget: 100, nonlandRows: lean }).count, 33, "low curve -2 and 10 ramp -2");
  const landfall = Array.from({ length: 12 }, (_, i) => spell(`Lf ${i}`, 3, { text: "Landfall — Whenever a land you control enters, draw a card." }));
  assert.match(recommendLandCount({ nonlandRows: landfall }).reasons.join(" "), /reward land drops/);
  assert.equal(recommendLandCount({ deckTarget: 60, nonlandRows: [] }).count, 24, "Brawl-sized decks scale down");
});

test("color sources and the basics split follow the pips in the player's picks", () => {
  const picks = [spell("A", 2, { pips: { W: 3 } }), spell("B", 2, { pips: { U: 1 } })];
  const sources = colorSourceTargets({ colors: ["W", "U"], spellRows: picks, landCount: 36 });
  assert.deepEqual(sources.map((row) => row.color), ["W", "U"]);
  assert.ok(sources[0].target > sources[1].target);
  assert.ok(sources[1].target >= 8, "a light splash still gets a floor of sources");
  assert.deepEqual(proposeBasics({ colors: ["W", "U"], spellRows: picks, basicSlots: 32 }), { Plains: 24, Island: 8 });
  assert.deepEqual(proposeBasics({ colors: [], basicSlots: 5 }), { Wastes: 5 });
  assert.deepEqual(proposeBasics({ colors: ["W", "U"], spellRows: [], basicSlots: 3 }), { Plains: 2, Island: 1 });
});

test("utility lands are ranked within the commander's colors and each says why", () => {
  const lands = [
    land("Hallowed Fountain", "({T}: Add {W} or {U}.)", ["W", "U"], "Land — Plains Island"),
    land("Blood Crypt", "({T}: Add {B} or {R}.)", ["B", "R"], "Land — Swamp Mountain"),
    land("Tapped Dual", "This land enters tapped.\n{T}: Add {W} or {U}.", ["W", "U"]),
    land("Plains", "({T}: Add {W}.)", ["W"], "Basic Land — Plains"),
    land("Picked Already", "{T}: Add {W}.", ["W"]),
  ];
  const ranked = rankUtilityLands({ lands, colors: ["W", "U"], spellRows: [spell("A", 2, { pips: { W: 2, U: 2 } })], exclude: ["Picked Already"] });
  assert.deepEqual(ranked.map((row) => row.name), ["Hallowed Fountain", "Tapped Dual"]);
  assert.match(ranked[0].reason, /Fixes/);
  assert.match(ranked[1].reason, /enters tapped/);
  assert.deepEqual(producedColors(lands[0]).sort(), ["U", "W"]);
});

test("the mana proposal fills only the land slots the player's own lands leave", () => {
  const picked = [spell("A", 3, { pips: { W: 2 } }), land("Command Tower", "{T}: Add one mana of any color in your commander's color identity.", [])];
  const proposal = proposeManaBase({ deckTarget: 100, colors: ["W"], pickedRows: picked, poolLands: [], landTarget: 36 });
  assert.equal(proposal.landTarget, 36);
  assert.deepEqual(proposal.landsPicked, ["Command Tower"]);
  assert.deepEqual(proposal.basics, { Plains: 35 });
});

test("the deck is complete only when the player's confirmed cards reach the exact size", () => {
  const picks = Array.from({ length: 62 }, (_, i) => `Card ${i}`);
  assert.deepEqual(finishStatus({ deckTarget: 100, commanderCount: 1, picks, basics: { Plains: 30 } }), { deckTarget: 100, confirmed: 93, open: 7, over: 0 });
  assert.equal(finishGate({ deckTarget: 100, commanderCount: 1, picks, finish: { stage: "review", manaConfirmed: true, basics: { Plains: 30 } } }).ok, false);
  assert.equal(finishGate({ deckTarget: 100, commanderCount: 1, picks, finish: { stage: "slots", manaConfirmed: true, basics: { Plains: 37 } } }).ok, false);
  assert.equal(finishGate({ deckTarget: 100, commanderCount: 1, picks, finish: { stage: "review", manaConfirmed: false, basics: { Plains: 37 } } }).ok, false);
  assert.match(finishGate({ deckTarget: 100, commanderCount: 1, picks, finish: { stage: "review", manaConfirmed: true, basics: { Plains: 38 } } }).error, /1 too many card/);
  assert.equal(finishGate({ deckTarget: 100, commanderCount: 1, picks, finish: { stage: "review", manaConfirmed: true, basics: { Plains: 37 } } }).ok, true);
  assert.equal(finishGate({ deckTarget: 100, commanderCount: 2, picks, finish: { stage: "review", manaConfirmed: true, basics: { Plains: 36 } } }).ok, true, "partners count as two");
  assert.equal(finishedDeckText(["Sol Ring"], { Plains: 2, Island: 0 }), "1 Sol Ring\n2 Plains");
  assert.equal(basicsTotal({ Plains: 2, Island: 3 }), 5);
});

test("finish state validation", () => {
  assert.equal(validFinishState(undefined), true);
  assert.equal(validFinishState({ stage: "mana", basics: { "Snow-Covered Island": 4 } }), true);
  assert.equal(validFinishState({ stage: "mana", basics: { Island: 1.5 } }), false);
  assert.equal(validFinishState({ stage: "mana", basics: {}, landTarget: 400 }), false);
  assert.equal(validFinishState({ stage: "mana", basics: [] }), false);
});
