// =============================================================================
// Field Intelligence v1.3 — Strategic edge ontology
// =============================================================================
// Observation only. Co-occurrence alone never yields a strong edge.
// Dynamic pressure topology is deferred — see FIELD_INTELLIGENCE_V1_3.md.
// =============================================================================

export const STRATEGIC_TOPOLOGY_VERSION = "strategic-topology-v1";

/** Strong edge types require semanticSupport === true. */
export const STRONG_EDGE_TYPES = Object.freeze([
  "supports",
  "protects_commander",
  "protects_engine",
  "protects_combo_or_close",
  "enables",
  "payoff_for",
  "feeds",
  "recovers",
  "tutors_for",
  "clears_path_for",
  "disrupts_for",
  "sequence_precedes",
  "multifunction_with",
]);

/** Weak / corpus-level types — never strong from co-occurrence alone. */
export const WEAK_EDGE_TYPES = Object.freeze([
  "commonly_cooccurs",
  "redundant_with",
  "substitutes_for",
]);

export const ALL_STRATEGIC_EDGE_TYPES = Object.freeze([
  ...STRONG_EDGE_TYPES,
  ...WEAK_EDGE_TYPES,
]);

export const EDGE_STRENGTH = Object.freeze({
  strong: "strong",
  weak: "weak",
});

/**
 * Classify edge strength. Co-occurrence without semantics is always weak.
 */
export function classifyEdgeStrength({ type, semanticSupport = false } = {}) {
  if (WEAK_EDGE_TYPES.includes(type)) return EDGE_STRENGTH.weak;
  if (!semanticSupport) return EDGE_STRENGTH.weak;
  if (STRONG_EDGE_TYPES.includes(type)) return EDGE_STRENGTH.strong;
  return EDGE_STRENGTH.weak;
}

/**
 * Confidence for a single-deck observational edge (0–1).
 * Corpus aggregation may raise this later via independent decks/events.
 */
export function edgeConfidence({
  type,
  semanticSupport = false,
  evidenceWeight = 0.4,
  partnerCount = 1,
} = {}) {
  const strength = classifyEdgeStrength({ type, semanticSupport });
  if (strength === EDGE_STRENGTH.weak || type === "commonly_cooccurs") {
    return Math.min(0.35, 0.12 + Number(evidenceWeight || 0) * 0.2);
  }
  const base = 0.42 + Number(evidenceWeight || 0) * 0.28;
  const partners = Math.min(0.15, Math.log2(1 + Math.max(0, partnerCount)) * 0.06);
  return Math.min(0.92, Number((base + partners).toFixed(3)));
}

export function isStrongEdge(edge = {}) {
  return classifyEdgeStrength(edge) === EDGE_STRENGTH.strong
    && edge.semanticSupport === true
    && !edge.weakBecauseCooccurrenceOnly;
}

export const CONSTRUCTIVE_ROLES = Object.freeze([
  "ramp",
  "draw",
  "selection",
  "recursion",
  "threat",
  "combat",
]);

export const INTERACTIONISH_ROLES = Object.freeze([
  "interaction",
  "protection",
]);

export const SEQUENCE_STAGE_ORDER = Object.freeze([
  "setup",
  "stabilize",
  "convert",
  "recover",
  "close",
]);
