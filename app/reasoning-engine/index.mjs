// =============================================================================
// Reasoning engine entry point and model hook
// =============================================================================
// The built-in coach reasons from rules text and a running deck profile; it
// needs no AI model. A model can plug in later through the ReasoningProvider
// interface below: it receives the rule-based result (so it can refine, never
// replace, the structured reasons) and must return the same shape. Anything
// malformed from a provider is ignored and the rule-based result stands.
//
// interface ReasoningProvider {
//   id: string;
//   refineCandidate?(ruleResult, context): ruleResult-shaped object;
//   refineListAnalysis?(ruleResult, context): ruleResult-shaped object;
// }
// =============================================================================

import { reasonAboutCandidate, REASONING_LIMITS } from "./reasoner.mjs";
import { analyzePartialList } from "./partial-list-analysis.mjs";
import { buildDeckProfile, categoryUrgency } from "./deck-profile.mjs";

export { reasonAboutCandidate, confidenceLabel, REASONING_LIMITS } from "./reasoner.mjs";
export { analyzePartialList } from "./partial-list-analysis.mjs";
export { buildDeckProfile, categoryUrgency, CATEGORY_ROLE, ROLE_TARGETS_100, ARCHETYPES, inferPlan, commanderReasoningEntry, producedColorsOf, unreliableManaNote } from "./deck-profile.mjs";
export { buildInteractionGraph, candidateSynergy, linksBetween, mechanicsOf } from "./mechanic-graph.mjs";
export { parseOracleMechanics, RESOURCES } from "./oracle-mechanics.mjs";

export const RULES_PROVIDER = Object.freeze({ id: "rules-v1" });

const validCandidateResult = (value) => value && typeof value === "object" && Number.isFinite(value.delta)
  && Array.isArray(value.reasons) && Number.isFinite(value.confidence);

/** Rule-based reasoning, optionally refined by a provider. Always returns a valid result. */
export function reasonWithProvider(candidate, context, provider = null) {
  const base = reasonAboutCandidate(candidate, context);
  if (!provider || typeof provider.refineCandidate !== "function") return base;
  try {
    const refined = provider.refineCandidate(base, context);
    if (!validCandidateResult(refined)) return base;
    const delta = Math.max(REASONING_LIMITS.maxPenalty, Math.min(REASONING_LIMITS.maxBoost, refined.delta));
    return delta === refined.delta ? refined : { ...refined, delta: Number(delta.toFixed(2)) };
  } catch {
    return base;
  }
}

export function analyzeListWithProvider(input, provider = null) {
  const base = analyzePartialList(input);
  if (!provider || typeof provider.refineListAnalysis !== "function") return base;
  try {
    const refined = provider.refineListAnalysis(base, input);
    if (!refined || typeof refined !== "object" || !Array.isArray(refined.flagged) || refined.autoFilled !== false) return base;
    // A list review never becomes a list of cards to add.
    if (Array.isArray(refined.additions) && refined.additions.length > 0) return base;
    if (!("additions" in refined)) return refined;
    const copy = { ...refined };
    delete copy.additions;
    return copy;
  } catch {
    return base;
  }
}

/**
 * Step order from the profile: keeps completed and current steps fixed and
 * returns a 0..1 urgency per remaining step, for blending with the existing
 * ledger/compass ordering.
 */
export function profileStepUrgencies(profile, categories = []) {
  return Object.freeze(Object.fromEntries(categories.map((category) => [category, categoryUrgency(profile, category)])));
}

/**
 * Builds everything the guided ranker needs for one request.
 * @param {{ commanders?: any[], picks?: any[], deckSize?: number, hints?: string, colorIdentity?: string[] | null }} [input]
 */
export function buildReasoningContext({ commanders = [], picks = [], deckSize = 100, hints = "", colorIdentity = null } = {}) {
  return Object.freeze({ commanders, deckEntries: picks, profile: buildDeckProfile({ commanders, picks, deckSize, hints, colorIdentity }) });
}
