// =============================================================================
// Concept ← Play-capture evidence bridge
// =============================================================================
// Play states / sequenced decisions — NOT decklists.
// Especially for Information Asymmetry (lists cannot see open mana / reveals).
// Authored captures prove the pipeline. Live play ingest stays separately gated.
// writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Authored play captures mapped to founding concepts.
 * These are observation fixtures of *play*, not tournament list structure.
 */
export const CONCEPT_PLAY_CAPTURES = freeze([
  freeze({
    id: "play-info-uu-punish-001",
    conceptId: "information-asymmetry",
    implementation: "Play-Around Discipline",
    title: "Tapped out into UU open — punished",
    claim:
      "Pilot cast the expensive payoff into untapped UU with unknown hand; Counterspell resolved. "
      + "Treating unknown open mana as empty was incorrect.",
    outcome: "punished",
    relation: "strengthens",
    independenceKey: "play-open-mana-punish",
  }),
  freeze({
    id: "play-info-known-empty-convert-002",
    conceptId: "information-asymmetry",
    implementation: "Known-Empty Conversion",
    title: "Converted after hand emptied — held",
    claim:
      "After a discard emptied the threatening seat's hand, the pilot converted and won the race. "
      + "Continuing to play around a collapsed range would have missed the window.",
    outcome: "held",
    relation: "strengthens",
    independenceKey: "play-known-empty-convert",
  }),
  freeze({
    id: "play-info-race-forced-003",
    conceptId: "information-asymmetry",
    implementation: "Partial-Information Sequencing",
    title: "Forced convert at 2 life into open mana — mixed",
    claim:
      "At 2 life facing lethal next untap, pilot converted into open interaction. "
      + "Line was correct under race math even though a counter existed — delay lost harder.",
    outcome: "race_correct_though_punishable",
    relation: "strengthens",
    independenceKey: "play-race-forced",
  }),
  freeze({
    id: "play-commit-tutor-hold-004",
    conceptId: "commitment-timing",
    implementation: "Permission Timing",
    title: "Held counter through tutor — answered payoff later",
    claim:
      "Pilot let Demonic Tutor resolve, kept Counterspell, and stopped the Oracle two turns later. "
      + "Spending on setup would have left them naked to the real attempt.",
    outcome: "held",
    relation: "strengthens",
    independenceKey: "play-tutor-hold",
  }),
  freeze({
    id: "play-seat-grudge-fail-005",
    conceptId: "seat-pressure",
    implementation: "Threat Hierarchy",
    title: "Grudge kill — combo seat won",
    claim:
      "Pilot eliminated the seat that removed their engine and left the combo player at four. "
      + "Combo seat won next untap. Hierarchy beat grievance.",
    outcome: "punished",
    relation: "strengthens",
    independenceKey: "play-grudge-fail",
  }),
  freeze({
    id: "play-plan-chump-wincon-live-006",
    conceptId: "plan-integrity",
    implementation: "Win Condition Preservation",
    title: "Chumped with wincon vs lethal — rebuilt",
    claim:
      "Only legal blocker was the combo creature against lethal. Pilot blocked, survived, and reassembled. "
      + "Dying with the piece unused would have ended Plan Integrity harder.",
    outcome: "held",
    relation: "strengthens",
    independenceKey: "play-chump-live",
  }),
]);

function playBand(rows) {
  const keys = new Set(rows.map((row) => row.independenceKey));
  if (keys.size >= 3) return "high";
  if (keys.size >= 2) return "medium";
  if (keys.size >= 1) return "low";
  return "none";
}

export function buildPlayEvidenceForConcept(conceptId, {
  captures = CONCEPT_PLAY_CAPTURES,
} = {}) {
  const rows = captures.filter((row) => row.conceptId === conceptId);
  const band = playBand(rows);
  return freeze({
    writesToBrain: false,
    conceptId,
    band,
    independentCaptures: new Set(rows.map((r) => r.independenceKey)).size,
    captureCount: rows.length,
    captures: freeze(rows.map((row) => freeze({
      id: row.id,
      title: row.title,
      claim: row.claim,
      outcome: row.outcome,
      implementation: row.implementation || null,
      relation: row.relation || "strengthens",
    }))),
    notes: freeze([
      band === "none"
        ? "No play captures mapped yet — lists alone cannot teach this concept."
        : `${rows.length} authored play capture(s); band=${band}. Not live telemetry.`,
    ]),
  });
}

export function playEvidencePatch(conceptId) {
  const play = buildPlayEvidenceForConcept(conceptId);
  return freeze({
    play: play.band,
    playDetail: play,
    notes: play.notes,
    sources: play.captures.map((row) => freeze({
      kind: "authored_play_capture",
      id: row.id,
    })),
  });
}

export function summarizeConceptPlayCoverage({
  conceptIds = [
    "commitment-timing",
    "seat-pressure",
    "plan-integrity",
    "information-asymmetry",
  ],
} = {}) {
  const byConcept = freeze(Object.fromEntries(
    conceptIds.map((id) => [id, buildPlayEvidenceForConcept(id)]),
  ));
  return freeze({
    writesToBrain: false,
    version: "concept-play-evidence-v0",
    kind: "ConceptPlayEvidenceSummary",
    captureCount: CONCEPT_PLAY_CAPTURES.length,
    byConcept,
    friday: freeze({
      note: "Play captures teach what decklists cannot — especially Information Asymmetry.",
      concepts: freeze(conceptIds.map((id) => freeze({
        conceptId: id,
        play: byConcept[id].band,
        captures: byConcept[id].captureCount,
      }))),
    }),
  });
}
