import test from "node:test";
import assert from "node:assert/strict";
import { classifyPlayerSignal, learnRevisionPreferences } from "../app/revision-learning.mjs";

test("keeps one player comment as a clue instead of rewriting preferences", () => {
  const result = learnRevisionPreferences([{ revision: 1, result: "loss", opponent: "Aggro", signal: "I needed more removal" }], 1);
  assert.equal(result.patterns[0].confidence, "single clue");
  assert.equal(result.actionable.length, 0);
});

test("promotes repeated same-revision feedback into a bounded preference", () => {
  const result = learnRevisionPreferences([
    { revision: 2, result: "loss", opponent: "Aggro", signal: "I died before I could answer anything" },
    { revision: 2, result: "loss", opponent: "Aggro", signal: "I needed more early interaction" },
    { revision: 1, result: "loss", opponent: "Control", signal: "I ran out of cards" },
  ], 2);
  assert.equal(result.sampleSize, 2);
  assert.equal(result.actionable[0].preference, "more early interaction");
  assert.match(result.guidance, /smallest change/i);
});

test("does not call a matchup weakness from fewer than four classified games", () => {
  const early = learnRevisionPreferences([
    { revision: 1, result: "loss", opponent: "Control", signal: "" },
    { revision: 1, result: "loss", opponent: "Control", signal: "" },
    { revision: 1, result: "win", opponent: "Control", signal: "" },
  ], 1);
  assert.equal(early.matchups[0].actionable, false);
  const developed = learnRevisionPreferences([...Array(4)].map((_, index) => ({ revision: 1, result: index ? "loss" : "win", opponent: "Control", signal: "" })), 1);
  assert.equal(developed.matchups[0].actionable, true);
});

test("classifies multiple meanings without assigning personality", () => {
  assert.deepEqual(classifyPlayerSignal("The commander kept dying and I ran out of gas"), ["more card advantage", "more protection"]);
});
