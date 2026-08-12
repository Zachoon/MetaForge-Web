import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONCEPT_TOURNAMENT_OBSERVATIONS,
  buildTournamentEvidenceForConcept,
  summarizeConceptTournamentCoverage,
} from "../../app/knowledge/concept-tournament-evidence.mjs";

describe("Concept tournament-structure evidence bridge", () => {
  it("maps structural observations honestly — info stays none", () => {
    assert.ok(CONCEPT_TOURNAMENT_OBSERVATIONS.length >= 5);
    assert.equal(buildTournamentEvidenceForConcept("plan-integrity").band, "medium");
    assert.equal(buildTournamentEvidenceForConcept("commitment-timing").band, "medium");
    assert.equal(buildTournamentEvidenceForConcept("information-asymmetry").band, "none");
    assert.ok(["low", "medium", "none"].includes(buildTournamentEvidenceForConcept("seat-pressure").band));
  });

  it("records explicit non-evidence for Information Asymmetry", () => {
    const info = buildTournamentEvidenceForConcept("information-asymmetry");
    assert.ok(info.observations.some((row) => row.countsAsSupport === false));
    assert.match(info.notes[0], /No supportive|gameplay/i);
  });

  it("friday summary separates preparation structure from in-game proof", () => {
    const summary = summarizeConceptTournamentCoverage();
    assert.match(summary.friday.note, /not in-game proof/i);
    assert.equal(summary.friday.concepts.length, 4);
  });
});
