import assert from "node:assert/strict";
import test from "node:test";
import FORGE_CANDIDATE from "../app/forge-candidate.mjs";
import { drawOpeningHand, evaluateMatchupMatrix, isKeepable, simulateMatchupScenarios, MATCHUP_PROFILES } from "../app/matchup-simulation.mjs";
function mulberry32(seed) { return () => { let value = seed += 0x6D2B79F5; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
const land = (name, colors) => ({ card: name, role: "land", colorIdentity: colors });
const spell = (name, cmc, pips) => ({ card: name, role: "stabilizer", cmc, colorPips: pips });

test("matchup scenarios are deterministic and explicitly bounded", () => {
  const first = simulateMatchupScenarios(FORGE_CANDIDATE.deck, "Aggro", 300, 42);
  assert.deepEqual(first, simulateMatchupScenarios(FORGE_CANDIDATE.deck, "Aggro", 300, 42));
  assert.match(first.warning, /not rules-complete games|not a predicted match win rate/i);
});

test("matchup matrix exposes weaknesses and pilot sensitivity", () => {
  const matrix = evaluateMatchupMatrix(FORGE_CANDIDATE.deck, ["Aggro", "Midrange", "Control"], 300, 9);
  assert.equal(matrix.rows.length, 3);
  assert.ok(matrix.weakest.opponent);
  assert.ok(matrix.rows.every((row) => row.modelCoverage > .9 && row.pilotSensitivity >= 0));
});

test("unknown opponent profiles cannot produce confidence", () => {
  assert.equal(simulateMatchupScenarios(FORGE_CANDIDATE.deck, "Combo", 100, 1).gate, "unsupported-opponent");
});

test("ramp and protection are modeled roles against every opponent archetype", () => {
  const deck = [
    { quantity: 24, card: "Forest", role: "land", cmc: undefined },
    { quantity: 6, card: "Rampant Growth", role: "ramp", cmc: 2 },
    { quantity: 6, card: "Heroic Intervention", role: "protection", cmc: 2 },
    { quantity: 24, card: "Big Threat", role: "finisher", cmc: 4 },
  ];
  for (const opponent of ["Aggro", "Midrange", "Control", "Tempo"]) {
    const result = simulateMatchupScenarios(deck, opponent, 300, 4);
    assert.deepEqual(result.unsupportedCards, [], `expected no unsupported cards against ${opponent}`);
    assert.equal(result.modelCoverage, 1, `expected full model coverage against ${opponent}`);
  }
});

test("protection earns more matchup credit against Aggro's combat pressure than against Control", () => {
  // Same reasoning the goldfish sim's role weights encode: protection
  // matters most against decks that actually attack into your board.
  assert.ok(
    MATCHUP_PROFILES.Aggro.answers.protection > MATCHUP_PROFILES.Control.answers.protection,
    "expected protection to be weighted higher against Aggro than Control",
  );
});

test("isKeepable requires 2-5 lands and no color-locked spell, same band as the goldfish simulator", () => {
  assert.equal(isKeepable([land("Forest", ["G"]), land("Forest", ["G"]), spell("A", 2)]), true);
  assert.equal(isKeepable([land("Forest", ["G"])]), false, "1 land is not keepable");
  assert.equal(isKeepable(Array.from({ length: 6 }, () => land("Forest", ["G"]))), false, "6 lands is not keepable");
  assert.equal(isKeepable([land("Forest", ["G"]), land("Forest", ["G"]), spell("A", 2, { R: 1 })]), false, "a red spell with only green sources is color-trapped");
});

test("drawOpeningHand never mulligans a deck where every possible hand is already keepable", () => {
  // Exactly 7 cards means the whole deck is always the opening hand,
  // regardless of shuffle order or seed.
  const deck = [land("Forest", ["G"]), land("Forest", ["G"]), land("Forest", ["G"]), spell("A", 1), spell("B", 2), spell("C", 3), spell("D", 4)];
  for (const seed of [1, 2, 3, 4, 5]) {
    const drawn = drawOpeningHand(deck, mulberry32(seed));
    assert.equal(drawn.mulligans, 0, `seed ${seed} should never need to mulligan`);
    assert.equal(drawn.hand.length, 7);
  }
});

test("drawOpeningHand stops at the mulligan cap on a hand that can never be fixed", () => {
  const deck = Array.from({ length: 7 }, (_, i) => spell(`S${i}`, i + 1));
  const drawn = drawOpeningHand(deck, mulberry32(9));
  assert.equal(drawn.mulligans, 2, "should stop exactly at the mulligan cap");
  assert.equal(drawn.hand.length, 5, "a 7-card hand kept after 2 mulligans bottoms 2 cards");
});

test("simulateMatchupScenarios reports averageMulligans/mulliganRate, and a deck with zero sources of its only color always hits the mulligan cap", () => {
  const deck = [
    { quantity: 36, card: "Lightning Strike", role: "removal", cmc: 1, colorPips: { R: 1 } },
    { quantity: 24, card: "Island", role: "land", colorIdentity: ["U"] },
  ];
  const result = simulateMatchupScenarios(deck, "Midrange", 300, 5);
  assert.equal(result.averageMulligans, 2, "no amount of mulliganing fixes a structurally impossible manabase");
  assert.equal(result.mulliganRate, 1);
});
