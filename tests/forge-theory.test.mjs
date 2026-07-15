import assert from "node:assert/strict";
import test from "node:test";
import { FORGE_THEORY } from "../app/forge-theory.mjs";
import { parseDeck } from "../app/deck-analysis.mjs";
import { validateDeckLegality } from "../app/deck-legality.mjs";

test("Forge Theory remains a legal controlled 75-card hypothesis", async () => {
  const main = parseDeck(FORGE_THEORY.deckText);
  const side = parseDeck(FORGE_THEORY.sideboardText);
  assert.equal(main.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.equal(side.reduce((sum, row) => sum + row.quantity, 0), 15);
  assert.equal((await validateDeckLegality(main, "Standard")).legal, true);
  const copies = [...main, ...side].filter((row) => row.name === "Mjölnir, Hammer of Thor").reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(copies <= 4);
});
