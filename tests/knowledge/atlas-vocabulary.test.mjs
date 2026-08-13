import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
} from "../../app/knowledge/atlas-vocabulary.mjs";

describe("Atlas Vocabulary Registry v0", () => {
  it("ships stable core terms with zero Capability admissions and no coverageScore", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.writesToBrain, false);
    assert.equal(registry.ageOfVocabulary.complete, true);
    assert.ok(registry.summary.coreTermCount >= 10);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.equal(registry.summary.coverageScoreExists, false);
    assert.equal(registry.observation001.capabilityLabelsAdmitted, 0);
    assert.equal(registry.brainInheritance, "none");
  });

  it("supports seat equivalence without shared-card ranking", () => {
    assert.ok(seatsImplementedBy("Lightning Greaves").includes("Commander Protection"));
    const holders = cardsImplementingSeat("Commander Protection");
    assert.ok(holders.includes("Flawless Maneuver"));
    assert.ok(holders.includes("Lightning Greaves"));
    assert.ok(holders.includes("Skrelv, Defector Mite"));
  });
});
