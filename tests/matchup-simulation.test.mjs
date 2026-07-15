import assert from "node:assert/strict";
import test from "node:test";
import FORGE_CANDIDATE from "../app/forge-candidate.mjs";
import { evaluateMatchupMatrix, simulateMatchupScenarios } from "../app/matchup-simulation.mjs";

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
