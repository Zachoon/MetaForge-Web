import assert from "node:assert/strict";
import test from "node:test";

import { applyLibraryOperation, simulateDeck } from "../app/forge-simulation.mjs";
import { parseDeck } from "../app/deck-analysis.mjs";

test("search removes one eligible card", () => {
  const library = ["Spell", "Forest", "Spell"];
  assert.deepEqual(applyLibraryOperation(library, {
    selection: "search", eligibleNames: ["Forest"], count: 1,
  }), ["Forest"]);
  assert.deepEqual(library, ["Spell", "Spell"]);
});

test("top-card operations support any removal quantity", () => {
  const library = ["Bottom", "Middle", "Top"];
  assert.deepEqual(applyLibraryOperation(library, { selection: "top", count: 2 }), ["Top", "Middle"]);
  assert.deepEqual(library, ["Bottom"]);
});

test("fetch-aware simulation is deterministic", () => {
  const rows = parseDeck("16 Forest\n4 Fabled Passage\n4 Evolving Wilds\n36 Spell");
  const first = simulateDeck(rows, 500, 42);
  assert.deepEqual(first, simulateDeck(rows, 500, 42));
  assert.ok(first.fetchActivationRate > 0);
  assert.ok(first.keepableRate > 0.5);
});
