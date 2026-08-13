// =============================================================================
// Philosophy presentation adapter (UI lane) — Compass v1.1
// =============================================================================
// Maps server `pre-choice-coaching-v1.5` builds into display fields.
// Never scores candidates, never reads distances/fit math, never invents
// recommendation reasons. Prefer server-provided explanation strings.
// writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);
const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const FORBIDDEN_JARGON = /stronger play structure|play structure among these philosophies|fitScore|distance|tieThreshold/i;

export const DECIDED_BY_LABELS = freeze({
  commission: "Recommended from what you asked MetaForge to build.",
  requested_experience: "Recommended from the experience you asked for.",
  player_compass: "Best match for how you said you enjoy playing.",
  structural_evidence: "Recommended from how this deck is built.",
  only_legal_option: "Only one direction satisfied your request.",
  true_tie: "These options fit equally well.",
});

export function isPlayerFacingRecommendCopy(text = "") {
  const value = clean(text);
  if (!value) return false;
  return !FORBIDDEN_JARGON.test(value);
}

export function provenanceLabelFor(decidedBy = "") {
  return DECIDED_BY_LABELS[clean(decidedBy)] || null;
}

/**
 * Prefer server presentation fields. Fall back only to already player-facing
 * identity copy (feel / tradeoff / prioritizes). Do not reinterpret scores.
 */
export function presentPhilosophyBuild(build = {}, { reportDecidedBy = null } = {}) {
  const decidedBy = clean(build.decidedBy || (build.recommended ? reportDecidedBy : "")) || null;
  const recommendedBecause = [
    build.recommendedBecause,
    build.playerFacingRecommend,
    isPlayerFacingRecommendCopy(build.recommendedWhy) ? build.recommendedWhy : null,
  ].map(clean).find(Boolean) || null;

  const strengths = (Array.isArray(build.strengths) && build.strengths.length
    ? build.strengths
    : Array.isArray(build.prioritizes) ? build.prioritizes : []
  ).map(clean).filter(Boolean).slice(0, 3);

  return freeze({
    id: build.id,
    label: clean(build.label) || "Philosophy",
    recommended: Boolean(build.recommended),
    alone: Boolean(build.alone),
    decidedBy,
    provenanceLabel: build.recommended ? provenanceLabelFor(decidedBy) : null,
    badge: build.recommended
      ? (clean(build.fitBadge) || (build.alone ? "THIS EXPERIENCE" : "BEST FIT FOR YOU"))
      : (clean(build.alternativeBecause) ? "CLOSER TO YOUR USUAL PLAY PREFERENCES" : null),
    recommendedBecause,
    alternativeBecause: clean(build.alternativeBecause) || null,
    playerFit: clean(build.playerFit || build.builtForPlayersWho) || null,
    whatThisFeelsLike: clean(build.whatThisFeelsLike || build.feel) || null,
    strengths: freeze(strengths),
    expectedTradeoff: clean(build.expectedTradeoff) || null,
    whyNotTheAlternative: clean(build.whyNotTheAlternative) || null,
    commissionFit: build.commissionFit || null,
    keyDifferences: build.keyDifferences || null,
    fullComparison: build.fullComparison || null,
    whyBuilt: clean(build.whyBuilt || build.whySurvived) || null,
  });
}

export function presentPhilosophyComparison(builds = [], { decidedBy = null } = {}) {
  const presented = (Array.isArray(builds) ? builds : [])
    .map((build) => presentPhilosophyBuild(build, { reportDecidedBy: decidedBy }));
  const recommended = presented.find((build) => build.recommended) || null;
  const alternatives = presented.filter((build) => !build.recommended);
  const conflictAlternatives = alternatives.filter((build) => Boolean(build.alternativeBecause));
  return freeze({
    version: "philosophy-presentation-v1.1",
    decidedBy: clean(decidedBy || recommended?.decidedBy) || null,
    provenanceLabel: provenanceLabelFor(decidedBy || recommended?.decidedBy),
    recommended,
    alternatives: freeze(alternatives),
    conflictAlternatives: freeze(conflictAlternatives),
    all: freeze(presented),
  });
}
