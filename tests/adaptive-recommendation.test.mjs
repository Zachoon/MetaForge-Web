import assert from "node:assert/strict";
import test from "node:test";
import CANDIDATE from "../app/forge-candidate.mjs";
import { evaluateMatchupEvidence } from "../app/adaptive-recommendation.mjs";

const aggroCards = ["Hired Claw", "Emberheart Challenger", "Slickshot Show-Off", "Lightning Strike", "Mountain"];
const match = (id, result, cards = aggroCards) => ({ id, result, revealedOpponentCards: cards });

test("does not rewrite a deck from one noisy matchup result", () => {
  const result = evaluateMatchupEvidence([match("1", "loss")], CANDIDATE);
  assert.equal(result.status, "observe");
  assert.equal(result.proposedDeck, undefined);
});

test("creates a card-for-card repair for a repeated classified weakness", () => {
  const result = evaluateMatchupEvidence([match("1", "loss"), match("2", "loss"), match("3", "win")], CANDIDATE);
  assert.equal(result.status, "repair-ready");
  assert.equal(result.weakness.strategy, "Aggro");
  assert.equal(result.changes.reduce((sum, change) => sum + change.quantity, 0), 0);
  assert.match(result.proposedDeck, /Floodpits Drowner/);
  assert.notEqual(result.proposedDeck, CANDIDATE.deckText);
});

test("keeps matchup histories separate instead of averaging away a weakness", () => {
  const controlCards = ["Day of Judgment", "Three Steps Ahead", "Get Lost", "Winternight Stories"];
  const matches = [match("a1", "loss"), match("a2", "loss"), match("a3", "win"), ...Array.from({ length: 6 }, (_, index) => match(`c${index}`, "win", controlCards))];
  const result = evaluateMatchupEvidence(matches, CANDIDATE);
  assert.equal(result.status, "repair-ready");
  assert.equal(result.weakness.strategy, "Aggro");
});
