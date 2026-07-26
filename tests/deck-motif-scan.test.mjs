import assert from "node:assert/strict";
import test from "node:test";
import { motifWeightsFromStructuralCards } from "../app/deck-motif-scan.mjs";

const card = (overrides = {}) => ({
  name: overrides.name || "Test Card",
  typeLine: overrides.typeLine || "Creature — Human Soldier",
  oracleText: overrides.oracleText || "",
  quantity: overrides.quantity ?? 1,
  isCommander: overrides.isCommander || false,
});

test("returns no weights for an all-land deck", () => {
  const weights = motifWeightsFromStructuralCards([
    card({ name: "Island", typeLine: "Basic Land — Island", quantity: 40 }),
  ]);
  assert.deepEqual(weights, {});
});

test("excludes the commander row from the weighting", () => {
  const weights = motifWeightsFromStructuralCards([
    card({ isCommander: true, typeLine: "Legendary Creature", oracleText: "Whenever this creature attacks, draw a card.", quantity: 1 }),
    card({ name: "Slash", typeLine: "Instant", oracleText: "Destroy target creature.", quantity: 4 }),
  ]);
  assert.equal(weights.rune, 1);
  assert.equal(weights.blade, undefined);
});

test("normalizes weights against total non-commander quantity, including unclassified cards", () => {
  const weights = motifWeightsFromStructuralCards([
    card({ name: "Slash", typeLine: "Instant", oracleText: "Destroy target creature.", quantity: 3 }),
    card({ name: "Plains", typeLine: "Basic Land — Plains", quantity: 20 }),
  ]);
  assert.equal(weights.rune, 3 / 23);
});

test("ranks the motif with the most real structural weight highest", () => {
  const weights = motifWeightsFromStructuralCards([
    card({ name: "Reanimate", typeLine: "Sorcery", oracleText: "Return target creature card from your graveyard to the battlefield.", quantity: 8 }),
    card({ name: "Ward Totem", typeLine: "Artifact — Equipment", oracleText: "Equipped creature has protection from red.", quantity: 2 }),
  ]);
  assert.ok(weights.root > weights.shield);
});
