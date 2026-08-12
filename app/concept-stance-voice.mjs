// =============================================================================
// Concept Stance Voice — Era 2.1 product presentation of Strategic Concepts
// =============================================================================
// Concepts are research objects. Stance is a VOICE, not a section.
// 90/10: grounded observation first; light hedge second.
// Request Recognition must never mention concepts.
// writesToBrain: false · naming ≠ promotion
// =============================================================================

import { buildStrategicConceptLibrary } from "./knowledge/strategic-concept.mjs";

const freeze = (value) => Object.freeze(value);

const CONCEPT_BADGE = freeze({
  strongly_supported: freeze({ emoji: "🟢", label: "Strongly Supported Principle" }),
  emerging: freeze({ emoji: "🟡", label: "Emerging Principle" }),
  candidate: freeze({ emoji: "🟡", label: "Candidate Principle" }),
  contradicted: freeze({ emoji: "🔴", label: "Contested Principle" }),
  retired: freeze({ emoji: "⚫", label: "Retired Principle" }),
});

export function badgeForConcept(concept = null) {
  if (!concept) return null;
  const badge = CONCEPT_BADGE[concept.status] || CONCEPT_BADGE.candidate;
  return freeze({
    ...badge,
    status: concept.status,
    title: `${badge.emoji} ${badge.label}`,
  });
}

/**
 * Present a Strategic Concept as product stance language.
 */
export function presentAsConceptStance(concept = null) {
  if (!concept) return null;
  const badge = badgeForConcept(concept);
  const description = String(concept.description || "").replace(/\s+/g, " ").trim();
  const observation = `Current understanding suggests ${description.charAt(0).toLowerCase()}${description.slice(1)}`;
  const forward = concept.predictions?.[0]
    ? ` We're watching whether ${String(concept.predictions[0]).charAt(0).toLowerCase()}${String(concept.predictions[0]).slice(1).replace(/\.$/, "")}.`
    : ` Evidence is still ${concept.confidence?.level || "limited"}.`;
  // ~90% observation (full description line) + ~10% forward hedge.
  return freeze({
    writesToBrain: false,
    kind: "ConceptStance",
    conceptId: concept.id,
    name: concept.name,
    status: concept.status,
    badge,
    leadIn: "Current understanding suggests",
    statement: `${observation}${forward}`.trim(),
    whyWeBelieve: freeze([
      `experts=${concept.evidence?.experts || "none"}`,
      `tournament=${concept.evidence?.tournament || "none"}`,
      `fixtures=${concept.evidence?.fixtures?.length || 0}`,
      ...(concept.evidence?.notes || []).slice(0, 2),
    ]),
    whatWouldChangeOurMind: freeze(concept.retirementCriteria || concept.contradictions || []),
    brainInheritance: concept.brainInheritance || "none",
  });
}

/**
 * Pick concepts relevant to commission / list context (not commander netdeck).
 */
export function selectRelevantConcepts({
  fantasyLabel = "",
  priorities = [],
  decisionSummary = "",
  concepts = null,
  limit = 2,
} = {}) {
  const library = concepts || buildStrategicConceptLibrary().concepts;
  const pool = (concepts ? concepts : library).filter((c) => c.status !== "retired");
  const text = `${fantasyLabel} ${priorities.join(" ")} ${decisionSummary}`.toLocaleLowerCase("en");

  const scored = pool.map((concept) => {
    let score = concept.status === "emerging" ? 2 : concept.status === "candidate" ? 1 : 0;
    score += (concept.confidence?.score || 0);
    if (/interaction|permission|counter|removal|protect|swan|force/i.test(text)
      && concept.id === "commitment-timing") score += 3;
    if (/theme|fantasy|planeswalker|superfriend|aura|equipment|combo|engine/i.test(text)
      && concept.id === "plan-integrity") score += 3;
    if (/threat|attack|politic|seat|table|kingmake/i.test(text)
      && concept.id === "seat-pressure") score += 3;
    if (/unknown|open mana|information|hand|reveal|bluff/i.test(text)
      && concept.id === "information-asymmetry") score += 3;
    // Default gravity toward Plan Integrity + Commitment Timing for list coaching.
    if (!text.trim() && (concept.id === "plan-integrity" || concept.id === "commitment-timing")) score += 1.5;
    return { concept, score };
  }).sort((a, b) => b.score - a.score);

  return freeze(scored.slice(0, limit).map((row) => row.concept));
}

/**
 * Philosophy Selection — concept as understanding voice (not a section).
 */
export function buildPhilosophyConceptVoice({
  fantasyLabel = "",
  priorities = [],
  concepts = null,
} = {}) {
  const [concept] = selectRelevantConcepts({ fantasyLabel, priorities, concepts, limit: 1 });
  if (!concept) return null;
  const stance = presentAsConceptStance(concept);
  const themeBit = fantasyLabel
    ? ` Under a "${fantasyLabel}" commission, that principle is load-bearing.`
    : "";
  return freeze({
    writesToBrain: false,
    surface: "philosophy_selection",
    kind: "concept",
    conceptId: concept.id,
    badge: stance.badge,
    leadIn: stance.leadIn,
    paragraph: `${stance.statement}${themeBit}`.trim(),
    whyWeBelieve: stance.whyWeBelieve,
    whatWouldChangeOurMind: stance.whatWouldChangeOurMind,
  });
}

/**
 * Honest Coach — concept as "one principle we're watching" (optional sibling to hyp voice).
 */
export function buildHonestCoachConceptVoice({
  fantasyLabel = "",
  priorities = [],
  concepts = null,
} = {}) {
  const picked = selectRelevantConcepts({ fantasyLabel, priorities, concepts, limit: 2 });
  // Prefer emerging / contested for "watching"
  const concept = picked.find((c) => c.status === "emerging" || c.status === "contradicted") || picked[0];
  if (!concept) return null;
  const stance = presentAsConceptStance(concept);
  const observation = `Current understanding of ${concept.name.toLowerCase()}: ${String(concept.description).charAt(0).toLowerCase()}${String(concept.description).slice(1)}`;
  const forward = concept.knownCorrectImmediateSpends?.[0]
    ? ` Exception worth watching: ${String(concept.knownCorrectImmediateSpends[0]).charAt(0).toLowerCase()}${String(concept.knownCorrectImmediateSpends[0]).slice(1)}.`
    : "";
  return freeze({
    writesToBrain: false,
    surface: "honest_coach",
    kind: "concept",
    conceptId: concept.id,
    badge: stance.badge,
    label: "One principle we're watching",
    paragraph: `${observation}${forward}`.trim(),
    whyWeBelieve: stance.whyWeBelieve,
    whatWouldChangeOurMind: stance.whatWouldChangeOurMind,
  });
}

/**
 * Deep Forge — concept research entries (alongside hypotheses).
 */
export function buildDeepForgeConceptDossier({
  fantasyLabel = "",
  priorities = [],
  concepts = null,
  limit = 4,
} = {}) {
  const picked = selectRelevantConcepts({ fantasyLabel, priorities, concepts, limit });
  if (!picked.length) return null;
  return freeze({
    writesToBrain: false,
    surface: "deep_forge",
    kind: "concept",
    title: "Strategic principles (research)",
    note: "Concepts can be retired. Naming is not promotion. Not Brain construction.",
    entries: freeze(picked.map((concept) => freeze({
      id: concept.id,
      name: concept.name,
      badge: badgeForConcept(concept),
      status: concept.status,
      description: concept.description,
      implementations: concept.implementations,
      evidence: freeze({
        experts: concept.evidence?.experts,
        tournament: concept.evidence?.tournament,
        fixtures: concept.evidence?.fixtures?.length || 0,
      }),
      predictions: concept.predictions,
      retirementCriteria: concept.retirementCriteria,
      confidence: concept.confidence,
      brainInheritance: concept.brainInheritance,
    }))),
  });
}

/**
 * Session concept voices. Request Recognition excluded on purpose.
 */
export function buildSessionConceptVoice({
  fantasyLabel = "",
  priorities = [],
  concepts = null,
} = {}) {
  const pool = concepts || buildStrategicConceptLibrary().concepts;
  return freeze({
    writesToBrain: false,
    version: "concept-stance-voice-v0",
    era: "2.1",
    requestRecognition: freeze({
      includeConcepts: false,
      note: "I heard you — strategic concepts stay out of recognition.",
    }),
    philosophy: buildPhilosophyConceptVoice({ fantasyLabel, priorities, concepts: pool }),
    honestCoach: buildHonestCoachConceptVoice({ fantasyLabel, priorities, concepts: pool }),
    deepForge: buildDeepForgeConceptDossier({ fantasyLabel, priorities, concepts: pool }),
  });
}
