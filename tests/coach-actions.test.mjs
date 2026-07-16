import assert from "node:assert/strict";
import test from "node:test";
import { extractCoachDeck } from "../app/coach-actions.mjs";

test("extracts a complete fenced Coach deck proposal", () => {
  const deck = extractCoachDeck("Try this:\n```deck\n24 Forest\n36 Llanowar Elves\n```\nThen test five matches.");
  assert.match(deck, /24 Forest/);
});

test("does not turn ordinary coaching advice into a deck", () => {
  assert.equal(extractCoachDeck("Cut one slow land and preserve your landfall triggers."), null);
  assert.equal(extractCoachDeck("```deck\n4 Forest\n4 Llanowar Elves\n```"), null);
});
