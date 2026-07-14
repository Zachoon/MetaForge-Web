import assert from "node:assert/strict";
import test from "node:test";

import { isLand, normalizeCardName, parseDeck } from "../app/deck-analysis.mjs";

const arenaDeck = `Deck
4 Mossborn Hydra (FDN) 107
16 Forest (EOE) 266
4 Fabled Passage (TLE) 57
4 Evolving Wilds (AFR) 256
4 Llanowar Elves (FDN) 227`;

test("normalizes Arena set and collector metadata", () => {
  assert.equal(normalizeCardName("Fabled Passage (TLE) 57"), "Fabled Passage");
});

test("counts fetch-style utility lands as lands", () => {
  const rows = parseDeck(arenaDeck);
  const landCount = rows
    .filter((row) => isLand(row.name))
    .reduce((total, row) => total + row.quantity, 0);

  assert.equal(landCount, 24);
});

test("does not include sideboard cards in main-deck composition", () => {
  const rows = parseDeck("Deck\n20 Forest\nSideboard\n4 Evolving Wilds");
  assert.equal(rows.reduce((total, row) => total + row.quantity, 0), 20);
});
