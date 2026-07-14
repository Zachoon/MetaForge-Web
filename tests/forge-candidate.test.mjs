import assert from "node:assert/strict";
import test from "node:test";
import CANDIDATE, { CANDIDATES } from "../app/forge-candidate.mjs";
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

test("candidate tournament ranks three distinct legal decks with legal sideboards", () => {
  assert.equal(CANDIDATES.length, 3);
  assert.deepEqual(CANDIDATES.map((candidate) => candidate.rank), [1, 2, 3]);
  assert.equal(new Set(CANDIDATES.map((candidate) => candidate.name)).size, 3);
  for (const candidate of CANDIDATES) {
    assert.equal(candidate.sideboard.reduce((sum, entry) => sum + entry.quantity, 0), 15);
    const sideRows = candidate.sideboard.map((entry) => ({ name: entry.card, quantity: entry.quantity }));
    assert.deepEqual(validateDeckLegality([...sideRows, { name: "Island", quantity: 60 }], candidate.format).issues, []);
    const mainNames = new Set(candidate.deck.map((entry) => entry.card));
    assert.ok(candidate.sideboard.every((entry) => !mainNames.has(entry.card)));
  }
});
