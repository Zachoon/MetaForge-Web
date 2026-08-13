// =============================================================================
// Concept ← Tournament-structure evidence bridge
// =============================================================================
// Map elite fingerprint / Level-A structural observations to Strategic Concepts.
// Decklists teach Plan Integrity well; gameplay concepts stay thinner — be honest.
// writesToBrain: false · Anti-netdeck: popular ≠ correct
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Authored structural observations (Epic 2 fixture corpus facts + transferable claims).
 * Not "tournaments proved gameplay." Lists show preparation structure.
 */
export const CONCEPT_TOURNAMENT_OBSERVATIONS = freeze([
  freeze({
    id: "tour-plan-primary-replication-pearl-ear",
    conceptId: "plan-integrity",
    implementation: "Package Cohesion",
    sourceKind: "elite_fingerprint_replication",
    corpus: "epic2-competitive-fixtures",
    title: "Primary plan replicates in elite fingerprints",
    claim:
      "Pearl-Ear converter fingerprints show primary plan auras replicated 36/36 in the Epic 2 fixture corpus — "
      + "elite preparation concentrates on one coherent plan rather than diluted pet packages.",
    relation: "strengthens",
    independenceKey: "replication-primary-plan",
  }),
  freeze({
    id: "tour-plan-equipment-marshal-replication",
    conceptId: "plan-integrity",
    implementation: "Package Cohesion",
    sourceKind: "elite_fingerprint_replication",
    corpus: "epic2-competitive-fixtures",
    title: "Equipment primary plan holds across samples",
    claim:
      "Test Equipment Marshal fingerprints replicate primary plan equipment 20/20 — "
      + "structural plan integrity appears as repeated package identity, not singleton bombs.",
    relation: "strengthens",
    independenceKey: "replication-equipment-plan",
  }),
  freeze({
    id: "tour-commit-interaction-composition",
    conceptId: "commitment-timing",
    implementation: "Permission Timing",
    sourceKind: "elite_fingerprint_composition",
    corpus: "epic2-competitive-fixtures",
    title: "Finite interaction is a prepared resource",
    claim:
      "Elite fingerprints carry explicit interaction composition (interaction + protection density). "
      + "Lists prepare a limited answer budget — the structural precondition for Commitment Timing in play.",
    relation: "strengthens",
    independenceKey: "composition-interaction",
    note: "Supports that answers are scarce; does not by itself prove in-game timing.",
  }),
  freeze({
    id: "tour-commit-threat-density-range",
    conceptId: "commitment-timing",
    implementation: "Threat Timing",
    sourceKind: "elite_fingerprint_composition",
    corpus: "epic2-competitive-fixtures",
    title: "Threat density is bounded in profiles",
    claim:
      "Commander profiles aggregate threat-density ranges rather than unbounded piles — "
      + "preparation treats threats as timed commitments inside a plan, not maximal stuffing.",
    relation: "strengthens",
    independenceKey: "composition-threat-density",
  }),
  freeze({
    id: "tour-seat-threat-density-not-grudge",
    conceptId: "seat-pressure",
    implementation: "Threat Hierarchy",
    sourceKind: "structural_inference",
    corpus: "epic2-competitive-fixtures",
    title: "Lists prepare for real threats, not grievances",
    claim:
      "Fingerprints emphasize threat density and primary plans aimed at ending games. "
      + "Tournament preparation is weak evidence for seating politics — noted as thin, not absent.",
    relation: "strengthens",
    independenceKey: "inference-threat-prep",
    note: "Seat Pressure is mostly a gameplay concept; tournament support stays limited.",
  }),
  freeze({
    id: "tour-info-lists-are-blind",
    conceptId: "information-asymmetry",
    implementation: "Play-Around Discipline",
    sourceKind: "explicit_non_evidence",
    corpus: "epic2-competitive-fixtures",
    title: "Decklists do not capture hidden information",
    claim:
      "Tournament decklists and fingerprints do not encode open-mana ranges or known-empty reveals. "
      + "Information Asymmetry remains gameplay-first — tournament band stays none until play data exists.",
    relation: "strengthens",
    independenceKey: "non-evidence-info",
    countsAsSupport: false,
    note: "Honest non-evidence — unknown is not absent, and lists are not play states.",
  }),
]);

function tournamentBand(rows) {
  const supportive = rows.filter((row) => row.countsAsSupport !== false);
  const keys = new Set(supportive.map((row) => row.independenceKey));
  if (keys.size >= 3) return "high";
  if (keys.size >= 2) return "medium";
  if (keys.size >= 1) return "low";
  return "none";
}

export function buildTournamentEvidenceForConcept(conceptId, {
  observations = CONCEPT_TOURNAMENT_OBSERVATIONS,
} = {}) {
  const rows = observations.filter((row) => row.conceptId === conceptId);
  const supportive = rows.filter((row) => row.countsAsSupport !== false);
  const band = tournamentBand(rows);
  return freeze({
    writesToBrain: false,
    conceptId,
    band,
    independentObservations: new Set(supportive.map((r) => r.independenceKey)).size,
    observationCount: rows.length,
    observations: freeze(rows.map((row) => freeze({
      id: row.id,
      title: row.title,
      claim: row.claim,
      implementation: row.implementation || null,
      sourceKind: row.sourceKind,
      corpus: row.corpus,
      relation: row.relation || "strengthens",
      countsAsSupport: row.countsAsSupport !== false,
      note: row.note || null,
    }))),
    notes: freeze([
      band === "none"
        ? "No supportive tournament-structure observations (gameplay-first concept or not yet mapped)."
        : `${supportive.length} supportive observation(s); band=${band}. Structural fingerprints — not netdeck recipes.`,
    ]),
  });
}

export function tournamentEvidencePatch(conceptId) {
  const tournament = buildTournamentEvidenceForConcept(conceptId);
  return freeze({
    tournament: tournament.band,
    tournamentDetail: tournament,
    notes: tournament.notes,
    sources: tournament.observations
      .filter((row) => row.countsAsSupport)
      .map((row) => freeze({
        kind: "tournament_structure_observation",
        id: row.id,
        corpus: row.corpus,
      })),
  });
}

export function summarizeConceptTournamentCoverage({
  conceptIds = [
    "commitment-timing",
    "seat-pressure",
    "plan-integrity",
    "information-asymmetry",
  ],
} = {}) {
  const byConcept = freeze(Object.fromEntries(
    conceptIds.map((id) => [id, buildTournamentEvidenceForConcept(id)]),
  ));
  return freeze({
    writesToBrain: false,
    version: "concept-tournament-evidence-v0",
    kind: "ConceptTournamentEvidenceSummary",
    observationCount: CONCEPT_TOURNAMENT_OBSERVATIONS.length,
    byConcept,
    friday: freeze({
      note: "Tournament bands reflect preparation structure — not in-game proof.",
      concepts: freeze(conceptIds.map((id) => freeze({
        conceptId: id,
        tournament: byConcept[id].band,
        independentObservations: byConcept[id].independentObservations,
        observations: byConcept[id].observationCount,
      }))),
    }),
  });
}
