// =============================================================================
// Concept ← Simulation witness evidence bridge
// =============================================================================
// Aggregates heuristic witnesses from Era 2 fixtures per concept.
// Not a play engine. writesToBrain: false
// =============================================================================

import { SITUATIONAL_FIXTURES_V0 } from "../gameplay/fixtures/situational-v0.mjs";
import {
  summarizeConceptSimulationEvidence,
  witnessSituationalLine,
} from "../gameplay/simulation-witness.mjs";

const freeze = (value) => Object.freeze(value);

export function buildSimulationEvidenceForConcept(conceptId, {
  fixtures = SITUATIONAL_FIXTURES_V0,
} = {}) {
  const rows = fixtures
    .filter((fixture) => fixture.teaches?.conceptId === conceptId)
    .map((fixture) => {
      const chosen = (fixture.lines || []).find((line) => line.id === fixture.chosenId)
        || fixture.lines?.[0]
        || null;
      return witnessSituationalLine({
        state: fixture.state,
        chosenLine: chosen,
        alternatives: fixture.lines || [],
        teaches: fixture.teaches,
      });
    });
  const summary = summarizeConceptSimulationEvidence(rows);
  return freeze({
    ...summary,
    conceptId,
    witnesses: freeze(rows),
  });
}

export function simulationEvidencePatch(conceptId) {
  const simulation = buildSimulationEvidenceForConcept(conceptId);
  return freeze({
    simulation: simulation.band,
    simulationDetail: simulation,
    notes: freeze([simulation.note]),
    sources: freeze([{
      kind: "simulation_witness_aggregate",
      id: `sim:${conceptId}`,
      sampleSize: simulation.sampleSize,
    }]),
  });
}

export function summarizeConceptSimulationCoverage({
  conceptIds = [
    "commitment-timing",
    "seat-pressure",
    "plan-integrity",
    "information-asymmetry",
  ],
} = {}) {
  const byConcept = freeze(Object.fromEntries(
    conceptIds.map((id) => [id, buildSimulationEvidenceForConcept(id)]),
  ));
  return freeze({
    writesToBrain: false,
    version: "concept-simulation-evidence-v0",
    kind: "ConceptSimulationEvidenceSummary",
    byConcept,
    friday: freeze({
      note: "Simulation bands are heuristic witnesses — not Monte Carlo truth.",
      concepts: freeze(conceptIds.map((id) => freeze({
        conceptId: id,
        simulation: byConcept[id].band,
        supports: byConcept[id].supports,
        pressures: byConcept[id].pressures,
        sampleSize: byConcept[id].sampleSize,
      }))),
    }),
  });
}
