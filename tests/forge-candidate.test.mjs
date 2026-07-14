import assert from "node:assert/strict";
import test from "node:test";
import CANDIDATE from "../app/forge-candidate.mjs";
import { parseDeck } from "../app/deck-analysis.mjs";
import { validateDeckLegality } from "../app/deck-legality.mjs";
import { simulateDeck } from "../app/forge-simulation.mjs";

test("generated Forge candidate is exactly 60 cards and Standard legal", () => {
  const rows = parseDeck(CANDIDATE.deckText);
  assert.equal(rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.deepEqual(validateDeckLegality(rows, CANDIDATE.format).issues, []);
});

test("generated candidate contains required strategic roles", () => {
  const roles = new Set(CANDIDATE.deck.map((entry) => entry.role));
  for (const role of ["removal", "counter", "draw", "sweeper", "finisher", "land", "dual-land"]) assert.ok(roles.has(role), role);
  assert.equal(CANDIDATE.target, "Aggro");
  assert.equal(CANDIDATE.strategy, "Control");
  assert.equal(CANDIDATE.confidence, "experimental");
});

test("generated candidate passes the opening-hand consistency gate", () => {
  const metrics = simulateDeck(parseDeck(CANDIDATE.deckText), 5000, 4815);
  assert.ok(metrics.keepableRate >= 0.76, metrics.keepableRate);
  assert.ok(metrics.averageOpeningLands >= 2.6 && metrics.averageOpeningLands <= 3.0, metrics.averageOpeningLands);
});
