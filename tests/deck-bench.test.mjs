import assert from "node:assert/strict";
import test from "node:test";
import { attachMatches, emptyDeckBench, mergeDeckBenches, rankedFamilies, recordExperiment, updateFamily } from "../app/deck-bench.mjs";

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

test("merges account and local histories without losing unique revisions or matches", () => {
  const base = { id: "trial", deckName: "Landfall", originalDeck: "old", proposedDeck: "new", originalFingerprint: "a".repeat(24), proposedFingerprint: "b".repeat(24), status: "testing", startedAt: "2026-07-15T00:00:00Z" };
  const remote = attachMatches(recordExperiment(emptyDeckBench(), base, "Standard"), [{ id: "remote-match", deckFingerprint: "b".repeat(24), result: "win" }]);
  const localExperiment = { ...base, id: "trial-2", proposedDeck: "newer", proposedFingerprint: "c".repeat(24) };
  const local = attachMatches(recordExperiment(recordExperiment(emptyDeckBench(), base, "Standard"), localExperiment, "Standard"), [{ id: "local-match", deckFingerprint: "b".repeat(24), result: "loss" }]);
  const merged = mergeDeckBenches(local, remote);
  assert.equal(merged.families.length, 1);
  assert.equal(merged.families[0].revisions.length, 3);
  assert.equal(merged.families[0].revisions.find((revision) => revision.fingerprint === "b".repeat(24)).matches.length, 2);
});

test("syncs a Coach Pulse debrief onto its exact match", () => {
  const experiment = { id:"trial", deckName:"Tempo", originalDeck:"old", proposedDeck:"new", originalFingerprint:"a".repeat(24), proposedFingerprint:"b".repeat(24), status:"testing", startedAt:"2026-07-15T00:00:00Z" };
  const remote = attachMatches(recordExperiment(emptyDeckBench(), experiment, "Standard"), [{ id:"same", deckFingerprint:"b".repeat(24), result:"loss" }]);
  const local = attachMatches(recordExperiment(emptyDeckBench(), experiment, "Standard"), [{ id:"same", deckFingerprint:"b".repeat(24), result:"loss", coachDebrief:{ read:"Their speed", recordedAt:"now" } }]);
  const match = mergeDeckBenches(local, remote).families[0].revisions[1].matches[0];
  assert.equal(match.coachDebrief.read, "Their speed");
});
