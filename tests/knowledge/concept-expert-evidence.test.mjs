import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONCEPT_EXPERT_OBSERVATIONS,
  buildExpertEvidenceForConcept,
  summarizeConceptExpertCoverage,
} from "../../app/knowledge/concept-expert-evidence.mjs";

describe("Concept expert evidence bridge", () => {
  it("maps observations to founding concepts with independent voices", () => {
    assert.ok(CONCEPT_EXPERT_OBSERVATIONS.length >= 8);
    for (const id of [
      "commitment-timing",
      "seat-pressure",
      "plan-integrity",
      "information-asymmetry",
    ]) {
      const evidence = buildExpertEvidenceForConcept(id);
      assert.equal(evidence.writesToBrain, false);
      assert.ok(evidence.independentVoices >= 3, id);
      assert.equal(evidence.band, "high");
    }
  });

  it("friday summary lists expert bands without claiming live scrape", () => {
    const summary = summarizeConceptExpertCoverage();
    assert.match(summary.friday.note, /without new fixtures/i);
    assert.equal(summary.friday.concepts.length, 4);
  });
});
