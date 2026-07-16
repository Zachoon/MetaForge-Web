import test from "node:test";
import assert from "node:assert/strict";
import RIFTBOUND_CATALOG from "../app/riftbound-card-catalog.mjs";
import { riftboundCoachContext } from "../app/riftbound-coach-context.mjs";

test("Riftbound Coach receives rules and a card pool even without a pasted deck", () => {
  const result = riftboundCoachContext("Build a deck that can challenge the current meta", "");
  assert.equal(result.catalogSize, Object.keys(RIFTBOUND_CATALOG.cards).length);
  assert.ok(result.catalogSize > 500);
  assert.ok(result.rules.some(rule => rule.includes("40 cards")));
  assert.ok(result.rules.some(rule => rule.includes("3 copies")));
  assert.ok(result.facts.length >= 30);
});

test("Riftbound Coach retrieval finds directly relevant official card text", () => {
  const result = riftboundCoachContext("I need a spell counter with Predict", "", 20);
  assert.ok(result.facts.some(fact => fact.startsWith("Abandon [") && fact.includes("Counter a spell")));
});
