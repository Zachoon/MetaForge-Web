// =============================================================================
// Atlas Vocabulary Registry v0 — Age of Vocabulary engineering surface
// =============================================================================
// Stable meanings + illustrative equivalence. Naming is not promotion.
// Atlas never writes to Brain. coverageScore does not exist.
// writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

/** Core Atlas terms — working meanings locked for Age of Vocabulary. */
export const ATLAS_CORE_TERMS = freeze([
  freeze({ id: "capability", term: "Capability", meaning: "A transferable strategic job across archetypes", status: "stable" }),
  freeze({ id: "seat", term: "Seat", meaning: "A capability slot that must remain occupiable; cards are fillers", status: "stable" }),
  freeze({ id: "coverage", term: "Coverage", meaning: "Multidimensional profile of which seats/capabilities are present and substitutable — never one scalar", status: "stable" }),
  freeze({ id: "plan", term: "Plan", meaning: "A local sequence toward a win or defense", status: "stable" }),
  freeze({ id: "principle", term: "Principle", meaning: "An Academy claim about elite structure, inert until promoted", status: "stable" }),
  freeze({ id: "card", term: "Card", meaning: "Concrete game object that implements one or more capabilities", status: "stable" }),
  freeze({ id: "package", term: "Package", meaning: "Recurring co-occurrence of cards/roles with a shared mid-level job", status: "stable" }),
  freeze({ id: "equivalence", term: "Equivalence", meaning: "Atlas statement: card A and card B both implement seat S (not a quality rank)", status: "stable" }),
  freeze({ id: "dependency", term: "Dependency", meaning: "A plan or capability that fails when another seat is vacant", status: "stable" }),
  freeze({ id: "recovery", term: "Recovery", meaning: "Ability to re-occupy vacated seats or restore a disrupted plan", status: "stable" }),
  freeze({ id: "pressure", term: "Pressure", meaning: "Force opponents to answer or lose tempo / life / resources", status: "stable" }),
  freeze({ id: "conversion", term: "Conversion", meaning: "Turn resources / board / timing into a winning line", status: "stable" }),
  freeze({ id: "interaction-count", term: "Interaction count", meaning: "Cheap observable proxy — not a primitive", status: "stable" }),
  freeze({ id: "topology", term: "Topology (current)", meaning: "Incomplete graph abstraction; not measuring seat optionality well", status: "stable" }),
]);

/**
 * Working capability vocabulary — draft labels only.
 * Coverage Observation 001 admitted **0** of these to Atlas as earned Capabilities.
 */
export const ATLAS_CAPABILITY_DRAFT = freeze([
  "Threat Removal",
  "Stack Protection",
  "Plan Protection",
  "Commander Protection",
  "Path Protection",
  "Combo Protection",
  "Tempo Recovery",
  "Pressure Conversion",
  "Resource Recovery",
  "Pivot",
  "Acceleration",
  "Closure",
  "Path Clearing",
  "Initiative Conversion",
  "Emergency Interaction",
  "Multifunction Seat",
].map((label) => freeze({
  id: label.toLocaleLowerCase("en").replace(/\s+/g, "-"),
  label,
  status: "draft_not_admitted",
  atlasAdmitted: false,
})));

/** Multidimensional coverage axes — forever non-scalar. */
export const ATLAS_COVERAGE_DIMENSIONS = freeze([
  freeze({ id: "protection", label: "Protection / Defensive", question: "Survive disruption" }),
  freeze({ id: "recovery", label: "Recovery", question: "Rebuild after interruption" }),
  freeze({ id: "pressure", label: "Pressure / Offensive", question: "Convert toward a win" }),
  freeze({ id: "flexibility", label: "Flexibility", question: "Pivot when the original plan fails" }),
  freeze({ id: "information", label: "Information", question: "Tutors, selection, digging, reconnaissance" }),
  freeze({ id: "acceleration", label: "Acceleration / Resource", question: "Mana, cards, recursion, efficiency" }),
]);

/**
 * Illustrative equivalence bindings — NOT authoritative Academy admissions.
 * Used so Mentor / reports can speak seat language without inventing rankings.
 */
export const ATLAS_EQUIVALENCE_ILLUSTRATIVE = freeze([
  freeze({ card: "Force of Will", seats: freeze(["Stack Protection", "Emergency Interaction", "Multifunction Seat"]) }),
  freeze({ card: "Silence", seats: freeze(["Path Protection", "Combo Protection", "Initiative Conversion"]) }),
  freeze({ card: "Flawless Maneuver", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Lightning Greaves", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Skrelv, Defector Mite", seats: freeze(["Commander Protection"]) }),
  freeze({ card: "Teferi's Protection", seats: freeze(["Commander Protection", "Plan Protection"]) }),
  freeze({ card: "Doubling Season", seats: freeze(["Pressure Conversion", "Acceleration"]) }),
]);

/** Coverage Observation 001 — honest Age of Vocabulary result. */
export const ATLAS_OBSERVATION_001 = freeze({
  paper: "What Is Strategic Coverage?",
  verdict: "PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION",
  capabilityLabelsAdmitted: 0,
  capabilityLabelsRejectedLevelA: 7,
  coverageScoreExists: false,
  brainUntouched: true,
  note: "Global residuals correlate after interaction-count controls, but several reverse under Level-A same-commander contrasts. Atlas refused Capability words from elegant but commander-uncontrolled signals.",
});

/** Logged vocabulary revisions (Age of Vocabulary success criterion #1). */
export const ATLAS_VOCABULARY_REVISIONS = freeze([
  freeze({
    date: "2026-08-11",
    change: "Named Age of Vocabulary; Atlas primary focus; Capability admission stays 0 after Coverage 001",
  }),
  freeze({
    date: "2026-08-12",
    change: "Registry v0 engineering surface — stable core terms + illustrative equivalence; still 0 Capability admissions",
  }),
]);

export function seatsImplementedBy(cardName = "") {
  const want = String(cardName || "").trim().toLocaleLowerCase("en");
  if (!want) return freeze([]);
  const hit = ATLAS_EQUIVALENCE_ILLUSTRATIVE.find(
    (row) => row.card.toLocaleLowerCase("en") === want,
  );
  return freeze(hit ? [...hit.seats] : []);
}

export function cardsImplementingSeat(seatLabel = "") {
  const want = String(seatLabel || "").trim().toLocaleLowerCase("en");
  if (!want) return freeze([]);
  return freeze(
    ATLAS_EQUIVALENCE_ILLUSTRATIVE
      .filter((row) => row.seats.some((seat) => seat.toLocaleLowerCase("en") === want))
      .map((row) => row.card),
  );
}

/**
 * Atlas Vocabulary Registry — inspectable Age of Vocabulary artifact.
 */
export function buildAtlasVocabularyRegistry() {
  return freeze({
    kind: "AtlasVocabularyRegistry",
    version: "atlas-vocabulary-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    ageOfVocabulary: freeze({
      complete: true,
      label: "Age of Vocabulary — Engineering Complete",
      note: "Atlas terms stable · equivalence inspectable · Coverage multidimensional · Capability admissions: 0 · Brain: 0",
    }),
    coreTerms: ATLAS_CORE_TERMS,
    capabilityDraft: ATLAS_CAPABILITY_DRAFT,
    coverageDimensions: ATLAS_COVERAGE_DIMENSIONS,
    equivalenceIllustrative: ATLAS_EQUIVALENCE_ILLUSTRATIVE,
    observation001: ATLAS_OBSERVATION_001,
    revisions: ATLAS_VOCABULARY_REVISIONS,
    summary: freeze({
      coreTermCount: ATLAS_CORE_TERMS.length,
      capabilityDraftCount: ATLAS_CAPABILITY_DRAFT.length,
      capabilityAdmittedCount: ATLAS_CAPABILITY_DRAFT.filter((c) => c.atlasAdmitted).length,
      coverageDimensionCount: ATLAS_COVERAGE_DIMENSIONS.length,
      equivalenceBindingCount: ATLAS_EQUIVALENCE_ILLUSTRATIVE.length,
      coverageScoreExists: false,
    }),
    brainInheritance: "none",
  });
}
