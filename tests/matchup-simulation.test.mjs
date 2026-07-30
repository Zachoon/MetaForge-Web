import assert from "node:assert/strict";
import test from "node:test";
import FORGE_CANDIDATE from "../app/forge-candidate.mjs";
import { evaluateMatchupMatrix, simulateMatchupScenarios, MATCHUP_PROFILES } from "../app/matchup-simulation.mjs";

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
