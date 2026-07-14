import assert from "node:assert/strict";
import test from "node:test";
import { parseDeck } from "../app/deck-analysis.mjs";
import { validateDeckLegality } from "../app/deck-legality.mjs";

test("accepts a format-legal Standard shell", async () => {
  const result = await validateDeckLegality(parseDeck("4 Llanowar Elves\n4 Mossborn Hydra\n52 Forest"), "Standard");
  assert.equal(result.legal, true);
});

test("rejects banned Standard cards", async () => {
  const result = await validateDeckLegality(parseDeck("4 Monstrous Rage\n56 Mountain"), "Standard");
  assert.equal(result.legal, false);
  assert.ok(result.issues.some((issue) => issue.card === "Monstrous Rage"));
});

test("enforces nonbasic copy limits", async () => {
  const result = await validateDeckLegality(parseDeck("5 Llanowar Elves\n55 Forest"), "Standard");
  assert.ok(result.issues.some((issue) => issue.type === "copy-limit"));
});
