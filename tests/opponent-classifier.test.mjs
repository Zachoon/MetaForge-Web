import assert from "node:assert/strict";
import test from "node:test";
import { classifyRevealedOpponent } from "../app/opponent-classifier.mjs";

test("labels partial opponent observations with explicit confidence", () => {
  const result = classifyRevealedOpponent(["Hired Claw", "Emberheart Challenger", "Slickshot Show-Off", "Lightning Strike", "Mountain"]);
  assert.equal(result.strategy, "Aggro");
  assert.equal(result.confidence, "developing");
  assert.ok(result.colors.includes("R"));
});

test("does not invent an archetype from one revealed card", () => {
  const result = classifyRevealedOpponent(["Island"]);
  assert.equal(result.strategy, "Unknown");
  assert.equal(result.confidence, "low");
});
