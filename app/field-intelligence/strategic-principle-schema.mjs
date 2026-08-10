// =============================================================================
// Strategic Principle Engine — schema
// =============================================================================
// Principles are reusable strategic knowledge mined from Field Intelligence.
// They never modify Brain construction. Observation / registry only.
// =============================================================================

export const STRATEGIC_PRINCIPLE_VERSION = "strategic-principle-v1";
export const PRINCIPLE_REGISTRY_VERSION = "strategic-principle-registry-v1";

export const PRINCIPLE_KINDS = Object.freeze([
  "topology",
  "sequence",
  "structure",
  "semantic",
  "substitution",
  "package",
]);

export const PRINCIPLE_STATUSES = Object.freeze([
  "candidate",
  "replicated_candidate",
  "mixed",
  "contradicted",
  "rejected",
  "promotable",
]);

export const TRANSFER_CLASSES = Object.freeze([
  "commander_specific",
  "family_specific",
  "cross_family",
  "mixed",
]);

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

/**
 * Stable principle id from kind + scope + signal — never card popularity.
 */
export function principleFingerprint({
  kind = "structure",
  feature = "",
  featureFamily = "",
  direction = "",
  scope = "broad",
  sequenceId = "",
  missing = "",
} = {}) {
  const key = [
    kind,
    normalized(featureFamily || feature || sequenceId || missing || "unknown"),
    normalized(direction || "any"),
    normalized(scope || "broad"),
  ].join("::");
  return `sp:${key}`;
}

export function createConfidencePoint({
  at = new Date().toISOString(),
  confidence = 0,
  independentEvents = 0,
  decks = 0,
  note = null,
} = {}) {
  return freeze({
    at,
    confidence: round(confidence),
    independentEvents: Number(independentEvents) || 0,
    decks: Number(decks) || 0,
    note: note || null,
  });
}

/**
 * Create a frozen StrategicPrinciple. Activation/promotion always false here.
 */
export function createStrategicPrinciple(input = {}) {
  const at = input.at || new Date().toISOString();
  const confidence = round(Number(input.confidence) || 0);
  const supporting = freeze([...(input.evidence?.supportingEvents || [])].filter(Boolean));
  const contradicting = freeze([...(input.evidence?.contradictingEvents || [])].filter(Boolean));
  const families = freeze([...(input.evidence?.commanderFamilies || [])].filter(Boolean));
  const history = freeze([
    ...(input.confidenceHistory || []),
    ...(input.confidenceHistory?.length
      ? []
      : [createConfidencePoint({
        at,
        confidence,
        independentEvents: input.evidence?.independentEvents ?? supporting.length,
        decks: input.evidence?.sampleSize || 0,
      })]),
  ]);

  const status = PRINCIPLE_STATUSES.includes(input.status) ? input.status : "candidate";
  const kind = PRINCIPLE_KINDS.includes(input.kind) ? input.kind : "structure";
  const transferClass = TRANSFER_CLASSES.includes(input.evidence?.transferClass)
    ? input.evidence.transferClass
    : "commander_specific";

  const id = input.id || principleFingerprint({
    kind,
    feature: input.feature,
    featureFamily: input.featureFamily,
    direction: input.observedDirection,
    scope: families[0] || "broad",
    sequenceId: input.sequenceId,
    missing: input.whatAppearsMissing,
  });

  return freeze({
    version: STRATEGIC_PRINCIPLE_VERSION,
    id,
    title: input.title || "Untitled principle",
    description: input.description || "",
    kind,
    status,
    feature: input.feature || null,
    featureFamily: input.featureFamily || null,
    observedDirection: input.observedDirection || null,
    sequenceId: input.sequenceId || null,
    confidence,
    confidenceHistory: history,
    evidence: freeze({
      supportingEvents: supporting,
      contradictingEvents: contradicting,
      sampleSize: Number(input.evidence?.sampleSize) || 0,
      independentEvents: Number(input.evidence?.independentEvents) || supporting.length,
      commanderFamilies: families,
      transferClass,
      converterAssociation: input.evidence?.converterAssociation ?? null,
      weightedEffect: input.evidence?.weightedEffect ?? null,
    }),
    origins: freeze([...(input.origins || [])]),
    whatBrainV1Understands: input.whatBrainV1Understands || "unknown",
    whatAppearsMissing: input.whatAppearsMissing || "unknown",
    lesson: input.lesson || "",
    // Hard invariants — Principle Engine never activates Brain behavior.
    writesToBrain: false,
    activated: false,
    promoted: false,
    rejected: status === "rejected" || input.rejected === true,
  });
}

/**
 * Status machine from evidence counts + confidence.
 * Never returns an activated/promoted construction state.
 */
export function derivePrincipleStatus({
  supportingCount = 0,
  contradictingCount = 0,
  confidence = 0,
  priorStatus = "candidate",
} = {}) {
  if (contradictingCount > 0 && contradictingCount >= supportingCount) return "contradicted";
  if (contradictingCount > 0 && supportingCount > 0) return "mixed";
  if (supportingCount >= 2 && confidence >= 0.75 && contradictingCount === 0) return "promotable";
  if (supportingCount >= 2 && contradictingCount === 0) return "replicated_candidate";
  if (priorStatus === "rejected") return "rejected";
  return "candidate";
}

export function isInactivePrinciple(principle = {}) {
  return principle.writesToBrain === false
    && principle.activated === false
    && principle.promoted === false;
}
