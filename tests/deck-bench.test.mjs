import assert from "node:assert/strict";
import test from "node:test";
import { attachMatches, emptyDeckBench, rankedFamilies, recordExperiment, updateFamily } from "../app/deck-bench.mjs";

test("keeps immutable revisions and attaches matches by exact fingerprint", () => {
  const experiment = { id: "trial", deckName: "Landfall", originalDeck: "60 original", proposedDeck: "60 proposed", originalFingerprint: "a".repeat(24), proposedFingerprint: "b".repeat(24), status: "testing", startedAt: "2026-07-15T00:00:00Z" };
  let bench = recordExperiment(emptyDeckBench(), experiment, "Standard");
  assert.equal(bench.families[0].revisions.length, 2);
  bench = attachMatches(bench, [{ id: "m1", deckFingerprint: "b".repeat(24), result: "win", revealedOpponentCards: [] }]);
  assert.equal(bench.families[0].revisions[0].matches.length, 0);
  assert.equal(bench.families[0].revisions[1].matches.length, 1);
  assert.equal(rankedFamilies(bench)[0].leader.fingerprint, "b".repeat(24));
});

test("promotes and archives without deleting history", () => {
  const experiment = { id: "trial", deckName: "Landfall", originalDeck: "old", proposedDeck: "new", originalFingerprint: "a".repeat(24), proposedFingerprint: "b".repeat(24), status: "kept", startedAt: "2026-07-15T00:00:00Z" };
  let bench = recordExperiment(emptyDeckBench(), experiment, "Standard");
  const family = bench.families[0];
  assert.equal(family.promotedFingerprint, "b".repeat(24));
  bench = updateFamily(bench, family.id, "archive");
  assert.equal(bench.families[0].revisions.length, 2);
  assert.equal(rankedFamilies(bench).length, 0);
});
