// =============================================================================
// Concept ← Expert evidence bridge (Academy fixtures)
// =============================================================================
// Attach authored expert reasoning to Strategic Concept Library members.
// Same honesty rules as Stream 002: fixtures prove the pipeline; not scraped truth.
// Naming is not promotion. writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Expert observations explicitly mapped to founding Strategic Concepts.
 * Includes both new concept-targeted fixtures and bridges from Stream 002 voices.
 */
export const CONCEPT_EXPERT_OBSERVATIONS = freeze([
  // --- Commitment Timing ---
  freeze({
    id: "expert-commit-hof-permission-timing",
    conceptId: "commitment-timing",
    implementation: "Permission Timing",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "interview",
    title: "Save the counter for the thing that ends you",
    excerpt:
      "Counters are finite. I do not spend them on every tutor. "
      + "I spend them when the spell on the stack is the actual winning line. "
      + "Setup is dangerous; payoff is lethal. Timing the commitment is the skill.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-commit-pro-hold-removal",
    conceptId: "commitment-timing",
    implementation: "Removal Timing",
    authorKey: "expert_b_pro",
    independenceGroup: "voice_b",
    sourceType: "tournament_report",
    title: "Top 4: the removal I did not cast",
    excerpt:
      "I had the Path for three turns and did not cast it. "
      + "The first threat was not the one that won. Opportunity cost on spot removal "
      + "is the same problem as permission: spend now or keep the answer for later.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-commit-stream002-permission",
    conceptId: "commitment-timing",
    implementation: "Permission Timing",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "interview",
    stream002SourceId: "fixture-hof-permission-04",
    title: "How much permission is enough? (Stream 002 bridge)",
    excerpt:
      "Threat assessment is the skill. Interaction density is the tool. "
      + "I do not count counters for comfort — I count answers that stop the actual winning line.",
    relation: "strengthens",
  }),

  // --- Seat Pressure ---
  freeze({
    id: "expert-seat-pro-role-assignment",
    conceptId: "seat-pressure",
    implementation: "Threat Hierarchy",
    authorKey: "expert_b_pro",
    independenceGroup: "voice_b",
    sourceType: "tournament_report",
    stream002SourceId: "fixture-pro-tempo-02",
    title: "Police the combo seat, not your feelings",
    excerpt:
      "Role assignment at the table matters more than the modal 99 — sometimes you are the police, "
      + "not the combo seat. Point answers at whoever actually ends the game.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-seat-coach-no-grudge",
    conceptId: "seat-pressure",
    implementation: "Political Seating",
    authorKey: "expert_c_coach",
    independenceGroup: "voice_c",
    sourceType: "feature_match_commentary",
    title: "The kill that lost the match",
    excerpt:
      "They killed the guy who exiled their commander and left the combo player at four. "
      + "Grudge seating feels good until the table loses. Threat hierarchy is who wins next, "
      + "not who wronged you last.",
    relation: "strengthens",
  }),

  // --- Plan Integrity ---
  freeze({
    id: "expert-plan-hof-primary-plan",
    conceptId: "plan-integrity",
    implementation: "Package Cohesion",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "coaching_writeup",
    stream002SourceId: "fixture-hof-sequencing-01",
    title: "Ramp only if it advances the plan",
    excerpt:
      "Early ramp is only good if it advances your primary plan. Opportunity cost matters: "
      + "the wrong rock can cost a full turn of interaction.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-plan-coach-engine-before-payoff",
    conceptId: "plan-integrity",
    implementation: "Win Condition Preservation",
    authorKey: "expert_c_coach",
    independenceGroup: "voice_c",
    sourceType: "feature_match_commentary",
    stream002SourceId: "fixture-coach-redundancy-03",
    title: "Engine before payoff — stop breaking your own line",
    excerpt:
      "Sequencing the engine before the payoff is basic, but players still cast the finisher first. "
      + "Do not spend the plan piece to solve a local problem if it deletes the line.",
    relation: "strengthens",
  }),

  // --- Information Asymmetry ---
  freeze({
    id: "expert-info-analyst-open-mana",
    conceptId: "information-asymmetry",
    implementation: "Play-Around Discipline",
    authorKey: "expert_d_analyst",
    independenceGroup: "voice_d",
    sourceType: "article",
    title: "Open mana is a range, not a blank",
    excerpt:
      "Untapped blue is not 'probably nothing.' It is a range. "
      + "Good players sequence as if the counter is there until information collapses. "
      + "Unknown is not absent.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-info-pro-convert-on-reveal",
    conceptId: "information-asymmetry",
    implementation: "Known-Empty Conversion",
    authorKey: "expert_b_pro",
    independenceGroup: "voice_b",
    sourceType: "tournament_report",
    title: "After the discard: go",
    excerpt:
      "Once their hand was empty on board, hesitation was incorrect. "
      + "Playing around a range that no longer exists is how you miss the window. "
      + "Update when information collapses.",
    relation: "strengthens",
  }),

  // --- Third independent voices (Era 2 founding closeout) ---
  freeze({
    id: "expert-commit-coach-forced-spend",
    conceptId: "commitment-timing",
    implementation: "Permission Timing",
    authorKey: "expert_c_coach",
    independenceGroup: "voice_c",
    sourceType: "feature_match_commentary",
    title: "Sometimes the tutor is the last chance",
    excerpt:
      "Holding forever is not always correct. If the find wins before you untap with another answer, "
      + "the commitment is now. Timing includes knowing when preservation has no future.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-seat-analyst-clock-coincide",
    conceptId: "seat-pressure",
    implementation: "Clock Priority",
    authorKey: "expert_d_analyst",
    independenceGroup: "voice_d",
    sourceType: "article",
    title: "When revenge and hierarchy agree",
    excerpt:
      "People mock grudge kills until the grudge seat is also the only clock. "
      + "Seat Pressure is who ends the game — if that is also who wronged you, the assignment is still correct.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-plan-pro-survive-first",
    conceptId: "plan-integrity",
    implementation: "Win Condition Preservation",
    authorKey: "expert_b_pro",
    independenceGroup: "voice_b",
    sourceType: "tournament_report",
    title: "Dead players have no plan",
    excerpt:
      "I blocked with my win condition because it was the only flyer. "
      + "Plan Integrity is not martyrdom. You keep the line by staying alive to cast it later.",
    relation: "strengthens",
  }),
  freeze({
    id: "expert-info-hof-race-math",
    conceptId: "information-asymmetry",
    implementation: "Partial-Information Sequencing",
    authorKey: "expert_a_hof",
    independenceGroup: "voice_a",
    sourceType: "interview",
    title: "When the range cannot save you",
    excerpt:
      "Playing around open mana is default. But if you are dead on the crack-back either way, "
      + "you convert. Information Asymmetry includes knowing when race math overrides the range.",
    relation: "strengthens",
  }),
]);

function expertBand(independentVoices) {
  if (independentVoices >= 3) return "high";
  if (independentVoices >= 2) return "medium";
  if (independentVoices >= 1) return "low";
  return "none";
}

/**
 * Aggregate expert observations for one strategic concept.
 */
export function buildExpertEvidenceForConcept(conceptId, {
  observations = CONCEPT_EXPERT_OBSERVATIONS,
} = {}) {
  const rows = observations.filter((row) => row.conceptId === conceptId);
  const voices = new Set(rows.map((row) => row.independenceGroup || row.authorKey));
  const band = expertBand(voices.size);
  return freeze({
    writesToBrain: false,
    conceptId,
    band,
    independentVoices: voices.size,
    observationCount: rows.length,
    observations: freeze(rows.map((row) => freeze({
      id: row.id,
      authorKey: row.authorKey,
      independenceGroup: row.independenceGroup,
      implementation: row.implementation || null,
      title: row.title,
      relation: row.relation || "strengthens",
      stream002SourceId: row.stream002SourceId || null,
      excerpt: row.excerpt,
    }))),
    notes: freeze([
      band === "none"
        ? "No expert observations mapped yet — fixtures only."
        : `${voices.size} independent voice(s); band=${band}. Academy fixtures, not live scrape.`,
    ]),
  });
}

/**
 * Merge expert evidence into a Strategic Concept (immutable via caller recreate).
 */
export function expertEvidencePatch(conceptId) {
  const expert = buildExpertEvidenceForConcept(conceptId);
  return freeze({
    experts: expert.band,
    expertDetail: expert,
    notes: expert.notes,
    sources: expert.observations.map((row) => freeze({
      kind: "academy_expert_fixture",
      id: row.id,
      authorKey: row.authorKey,
    })),
  });
}

export function summarizeConceptExpertCoverage({
  conceptIds = [
    "commitment-timing",
    "seat-pressure",
    "plan-integrity",
    "information-asymmetry",
  ],
} = {}) {
  const byConcept = freeze(Object.fromEntries(
    conceptIds.map((id) => [id, buildExpertEvidenceForConcept(id)]),
  ));
  return freeze({
    writesToBrain: false,
    version: "concept-expert-evidence-v0",
    kind: "ConceptExpertEvidenceSummary",
    observationCount: CONCEPT_EXPERT_OBSERVATIONS.length,
    byConcept,
    friday: freeze({
      note: "Expert bands move concept confidence without new fixtures.",
      concepts: freeze(conceptIds.map((id) => freeze({
        conceptId: id,
        experts: byConcept[id].band,
        independentVoices: byConcept[id].independentVoices,
        observations: byConcept[id].observationCount,
      }))),
    }),
  });
}
