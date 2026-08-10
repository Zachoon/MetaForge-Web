// =============================================================================
// Strategic Principle Engine — registry merge + confidence evolution
// =============================================================================
// Accumulates principles across runs. Never activates Brain construction.
// =============================================================================

import {
  PRINCIPLE_REGISTRY_VERSION,
  createStrategicPrinciple,
  createConfidencePoint,
  derivePrincipleStatus,
  isInactivePrinciple,
} from "./strategic-principle-schema.mjs";
import { liftStrategicPrinciples } from "./principle-lift.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function recomputeConfidence(principle, { supporting, contradicting }) {
  const supportN = supporting.length;
  const contradictN = contradicting.length;
  let confidence = Number(principle.confidence) || 0.3;
  if (supportN >= 2 && contradictN === 0) {
    confidence = Math.min(0.96, 0.45 + 0.08 * supportN + Math.min(0.2, Math.abs(principle.evidence?.weightedEffect || 0) / 25));
  } else if (contradictN > 0 && supportN > 0) {
    confidence = Math.min(0.55, confidence * 0.75);
  } else if (contradictN >= supportN && contradictN > 0) {
    confidence = Math.min(0.35, confidence * 0.45);
  } else if (supportN === 1) {
    confidence = Math.min(0.45, confidence);
  }
  return round(confidence);
}

/**
 * Merge a newly lifted principle with a prior stored principle.
 */
export function mergePrincipleEvidence(prior = null, next = null, options = {}) {
  if (!next && prior) return prior;
  if (!prior && next) return next;
  const at = options.at || new Date().toISOString();
  const supporting = unique([
    ...(prior.evidence?.supportingEvents || []),
    ...(next.evidence?.supportingEvents || []),
  ]);
  const contradicting = unique([
    ...(prior.evidence?.contradictingEvents || []),
    ...(next.evidence?.contradictingEvents || []),
  ]);
  const families = unique([
    ...(prior.evidence?.commanderFamilies || []),
    ...(next.evidence?.commanderFamilies || []),
  ]);
  const confidence = recomputeConfidence(next, { supporting, contradicting });
  const status = derivePrincipleStatus({
    supportingCount: supporting.length,
    contradictingCount: contradicting.length,
    confidence,
    priorStatus: prior.status,
  });
  const history = [
    ...(prior.confidenceHistory || []),
    createConfidencePoint({
      at,
      confidence,
      independentEvents: supporting.length + contradicting.length,
      decks: Math.max(prior.evidence?.sampleSize || 0, next.evidence?.sampleSize || 0),
      note: "registry_merge",
    }),
  ];
  // Keep history bounded.
  const trimmedHistory = history.slice(-40);

  const merged = createStrategicPrinciple({
    ...next,
    id: prior.id || next.id,
    title: next.title || prior.title,
    description: next.description || prior.description,
    lesson: next.lesson || prior.lesson,
    status: next.rejected || prior.rejected ? "rejected" : status,
    confidence,
    confidenceHistory: trimmedHistory,
    origins: unique([...(prior.origins || []), ...(next.origins || [])]),
    whatBrainV1Understands: next.whatBrainV1Understands || prior.whatBrainV1Understands,
    whatAppearsMissing: next.whatAppearsMissing || prior.whatAppearsMissing,
    evidence: {
      supportingEvents: supporting,
      contradictingEvents: contradicting,
      sampleSize: Math.max(prior.evidence?.sampleSize || 0, next.evidence?.sampleSize || 0),
      independentEvents: supporting.length + contradicting.length,
      commanderFamilies: families,
      transferClass: next.evidence?.transferClass || prior.evidence?.transferClass || "commander_specific",
      converterAssociation: next.evidence?.converterAssociation ?? prior.evidence?.converterAssociation,
      weightedEffect: next.evidence?.weightedEffect ?? prior.evidence?.weightedEffect,
    },
    rejected: next.rejected || prior.rejected || status === "rejected",
  });

  // Hard enforce inactivity even if someone tampers upstream.
  return freeze({
    ...merged,
    writesToBrain: false,
    activated: false,
    promoted: false,
  });
}

/**
 * Extract prior principles from research-store rows.
 */
export function priorPrinciplesFromStore(storeRows = []) {
  const byId = new Map();
  for (const row of storeRows) {
    if (row.kind !== "strategic_principle" || !row.principle) continue;
    const principle = row.principle;
    const prev = byId.get(principle.id);
    if (!prev || (principle.confidence || 0) >= (prev.confidence || 0)) {
      byId.set(principle.id, principle);
    }
  }
  return freeze([...byId.values()]);
}

/**
 * Build Academy-style lesson entries from principles.
 */
export function renderAcademyLessons(principles = [], options = {}) {
  const limit = options.limit || 12;
  return freeze(principles.slice(0, limit).map((principle, index) => freeze({
    observationNumber: options.observationOffset
      ? options.observationOffset + index + 1
      : index + 1,
    principleId: principle.id,
    title: principle.title,
    commanderFamilies: principle.evidence?.commanderFamilies || [],
    independentEvents: principle.evidence?.independentEvents || 0,
    sampleSize: principle.evidence?.sampleSize || 0,
    confidence: principle.confidence,
    status: principle.status,
    transferClass: principle.evidence?.transferClass,
    supportingEvents: principle.evidence?.supportingEvents || [],
    contradictingEvents: principle.evidence?.contradictingEvents || [],
    lesson: principle.lesson,
    finding: principle.description,
    writesToBrain: false,
    candidateOnly: true,
  })));
}

/**
 * Build the Strategic Principle Registry from a FI artifact + optional prior store.
 */
export function buildPrincipleRegistry({
  performanceHypotheses = null,
  topologyDiscovery = null,
  brainClassifications = null,
  crossCommanderTransfer = null,
  priorStoreRows = [],
  generatedAt = null,
} = {}) {
  const at = generatedAt || new Date().toISOString();
  const lifted = liftStrategicPrinciples({
    performanceHypotheses,
    topologyDiscovery,
    brainClassifications,
    crossCommanderTransfer,
  });
  const priors = priorPrinciplesFromStore(priorStoreRows);
  const priorById = new Map(priors.map((p) => [p.id, p]));

  const merged = lifted.map((principle) => {
    const prior = priorById.get(principle.id);
    if (!prior) {
      return freeze({
        ...principle,
        writesToBrain: false,
        activated: false,
        promoted: false,
      });
    }
    priorById.delete(principle.id);
    return mergePrincipleEvidence(prior, principle, { at });
  });

  // Keep priors not seen this run (aged knowledge) with unchanged inactivity flags.
  for (const prior of priorById.values()) {
    merged.push(freeze({
      ...prior,
      writesToBrain: false,
      activated: false,
      promoted: false,
    }));
  }

  const principles = merged
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));

  const byStatus = Object.fromEntries(
    ["candidate", "replicated_candidate", "promotable", "mixed", "contradicted", "rejected"]
      .map((status) => [status, principles.filter((p) => p.status === status).length]),
  );

  const candidates = principles.filter((p) =>
    p.status === "candidate"
    || p.status === "replicated_candidate"
    || p.status === "promotable");

  const lessons = renderAcademyLessons(
    candidates.filter((p) => p.confidence >= 0.45),
    { limit: 16 },
  );

  // Safety check — none may be active.
  const inactiveOk = principles.every(isInactivePrinciple);

  return freeze({
    version: PRINCIPLE_REGISTRY_VERSION,
    generatedAt: at,
    principleCount: principles.length,
    byStatus: freeze(byStatus),
    byKind: freeze(Object.fromEntries(
      ["topology", "sequence", "structure", "semantic", "substitution", "package"]
        .map((kind) => [kind, principles.filter((p) => p.kind === kind).length]),
    )),
    principles: freeze(principles),
    candidates: freeze(candidates.slice(0, 40)),
    promotable: freeze(principles.filter((p) => p.status === "promotable").slice(0, 12)),
    contradicted: freeze(principles.filter((p) => p.status === "contradicted").slice(0, 20)),
    academyLessons: lessons,
    recommendations: freeze({
      activateBrain: false,
      implementExp002: false,
      note: "Registry recommends candidate principles only. Brain promotion requires a Validation Harness experiment.",
    }),
    writesToBrain: false,
    brainPolicyTouched: false,
    constructionMutated: false,
    allInactive: inactiveOk,
  });
}
