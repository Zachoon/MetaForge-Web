import test from "node:test";
import assert from "node:assert/strict";
import { rankEdhrecSignals, scoreEdhrecSignal, wilsonLowerBound } from "../app/evidence-scoring.mjs";

test("shrinks tiny-sample synergy instead of presenting it as established", () => {
  const sparse = scoreEdhrecSignal({ decks: 2, eligibleDecks: 10, synergy: 0.8, category: "New Cards" });
  const established = scoreEdhrecSignal({ decks: 240, eligibleDecks: 800, synergy: 0.25, category: "High Synergy Cards" });
  assert.ok(sparse.shrunkSynergy < established.shrunkSynergy);
  assert.equal(sparse.confidence, "sparse");
  assert.equal(sparse.evidenceClass, "new-card discovery hypothesis");
  assert.ok(established.evidenceScore > sparse.evidenceScore);
});

test("retains promising new cards as hypotheses rather than suppressing them", () => {
  const signal = scoreEdhrecSignal({ decks: 8, eligibleDecks: 50, synergy: 0.2, category: "New Cards" });
  assert.equal(signal.newCardPotential, true);
  assert.equal(signal.confidence, "early");
  assert.ok(signal.evidenceScore > 0);
});

test("ranking uses conservative evidence score and deterministic tie breaks", () => {
  const ranked = rankEdhrecSignals([
    { name: "Viral Unknown", decks: 1, eligibleDecks: 2, synergy: 1, category: "New Cards" },
    { name: "Established Engine", decks: 300, eligibleDecks: 700, synergy: 0.22, category: "High Synergy Cards" },
  ]);
  assert.equal(ranked[0].name, "Established Engine");
  assert.ok(wilsonLowerBound(300, 700) < 300 / 700);
});
