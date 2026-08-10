// =============================================================================
// Field Intelligence v1.3 — Topology discovery queue
// =============================================================================
// Evidence candidates only. No Brain mutation. No arrow back into construction.
// =============================================================================

import { EDGE_STRENGTH } from "./strategic-edge-ontology.mjs";
import { normalizeCommanderIdentity } from "./level-a-forensics.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function transferClass(commanders = [], families = []) {
  if (commanders.length <= 1 && families.length <= 1) return "commander_specific";
  if (families.length <= 1 && commanders.length > 1) return "family_specific";
  if (families.length > 1 && commanders.length > 1) return "cross_family";
  return "mixed";
}

/**
 * Build discovery-queue candidates from topology / sequences / substitutions / Level-A.
 */
export function buildTopologyDiscoveryQueue({
  topologies = [],
  topologyMetrics = [],
  levelATopology = null,
  sequences = null,
  substitutions = null,
  contextualFunctions = null,
  packageCandidates = [],
  semanticBlindSpots = [],
  analyses = [],
  records = [],
} = {}) {
  const candidates = [];
  const recordById = new Map(records.map((r) => [r.id, r]));

  // Topology blind spots from Level-A deltas Brain cannot currently represent as construction.
  for (const cohort of levelATopology?.cohorts || []) {
    for (const delta of (cohort.strongest || []).slice(0, 4)) {
      if (Math.abs(delta.delta) < 0.05 && Math.abs(delta.highMean - delta.lowMean) < 0.5) continue;
      candidates.push(freeze({
        kind: "topology_blind_spot_candidate",
        id: `topo_blind_${normalized(cohort.commanderIdentity)}_${delta.feature}_${normalized(cohort.eventId)}`,
        observedEvidence: freeze({
          eventId: cohort.eventId,
          commanderIdentity: cohort.commanderIdentity,
          feature: delta.feature,
          delta: delta.delta,
          direction: delta.direction,
          highMean: delta.highMean,
          lowMean: delta.lowMean,
        }),
        sampleSize: delta.sampleSize,
        independentEvents: 1,
        commanderFamilyDiversity: 1,
        converterAssociation: delta.direction === "high_greater" ? "converters_higher" : "converters_lower",
        contradictions: freeze([]),
        confidence: delta.confidence,
        whatBrainV1Understands: "interactionDensity_and_role_floors_without_topology_roles",
        whatAppearsMissing: `strategic_topology_metric:${delta.feature}`,
        transferClass: "commander_specific",
        autoMutateBrain: false,
      }));
    }
  }

  for (const seq of sequences?.evidence || []) {
    if (seq.confidence < 0.45) continue;
    candidates.push(freeze({
      kind: "sequence_blind_spot_candidate",
      id: `seq_blind_${seq.sequenceId}`,
      observedEvidence: freeze({
        sequenceId: seq.sequenceId,
        stages: seq.stages,
        requiredRelationships: seq.requiredRelationships,
        converterEnrichmentRate: seq.converterEnrichmentRate,
        eliteTag: seq.eliteTag,
      }),
      sampleSize: seq.decksObserved,
      independentEvents: seq.independentEvents,
      commanderFamilyDiversity: (seq.familiesObserved || []).length,
      converterAssociation: seq.eliteTag,
      contradictions: freeze([]),
      confidence: seq.confidence,
      whatBrainV1Understands: "sequenceStages_as_card_annotations",
      whatAppearsMissing: "construction_preference_for_covered_strategic_sequences",
      transferClass: transferClass(seq.commandersObserved || [], seq.familiesObserved || []),
      autoMutateBrain: false,
    }));
  }

  for (const row of semanticBlindSpots || []) {
    candidates.push(freeze({
      kind: "semantic_blind_spot_candidate",
      id: row.id || `semantic_${normalized(row.likelyMissingRelationship || "unknown")}`,
      observedEvidence: row.corpusSupport || freeze({}),
      sampleSize: 1,
      independentEvents: 1,
      commanderFamilyDiversity: (row.corpusSupport?.commanders || []).length || 1,
      converterAssociation: null,
      contradictions: freeze([]),
      confidence: row.confidence || 0.4,
      whatBrainV1Understands: row.existingBrainInterpretation || "partial_semantics",
      whatAppearsMissing: row.likelyMissingRelationship || "unknown_relationship",
      transferClass: "mixed",
      autoMutateBrain: false,
    }));
  }

  for (const sub of substitutions?.evidence || []) {
    if (sub.confidence < 0.45) continue;
    candidates.push(freeze({
      kind: "substitution_candidate",
      id: `subst_${normalized(sub.cardA)}__${normalized(sub.cardB)}`,
      observedEvidence: freeze({
        commanderIdentity: sub.commanderIdentity,
        cardA: sub.cardA,
        cardB: sub.cardB,
        xorRate: sub.xorRate,
        footprintKey: sub.footprintKey,
      }),
      sampleSize: sub.decksWithA + sub.decksWithB,
      independentEvents: 1,
      commanderFamilyDiversity: 1,
      converterAssociation: freeze({
        a: sub.converterAssociationA,
        b: sub.converterAssociationB,
      }),
      contradictions: freeze([]),
      confidence: sub.confidence,
      whatBrainV1Understands: "budget_power_substitution_audits_only",
      whatAppearsMissing: "strategic_footprint_substitution_clusters",
      transferClass: "commander_specific",
      autoMutateBrain: false,
      selectionBehaviorChanged: false,
    }));
  }

  for (const pkg of packageCandidates || []) {
    candidates.push(freeze({
      kind: "package_candidate",
      id: pkg.id || `pkg_${normalized(pkg.signature || "unknown")}`,
      observedEvidence: freeze({
        signature: pkg.signature,
        roles: pkg.roles,
        mechanics: pkg.mechanics,
        decks: pkg.decks,
        commanders: pkg.commanders,
      }),
      sampleSize: pkg.decks || 0,
      independentEvents: 1,
      commanderFamilyDiversity: pkg.commanders || 1,
      converterAssociation: null,
      contradictions: freeze([]),
      confidence: round(Math.min(0.8, (pkg.weightedEvidence || 0) / 10)),
      whatBrainV1Understands: "PACKAGE_CATALOG_known_ids",
      whatAppearsMissing: "unknown_structural_cluster",
      transferClass: (pkg.commanders || 0) > 1 ? "cross_family" : "commander_specific",
      autoMutateBrain: false,
      autoCreateBrainPackage: false,
    }));
  }

  // Contextual function diversity as soft semantic blind spot.
  for (const card of (contextualFunctions?.cards || []).filter((c) => c.contextDependent).slice(0, 20)) {
    candidates.push(freeze({
      kind: "semantic_blind_spot_candidate",
      id: `ctx_fn_${normalized(card.cardName)}`,
      observedEvidence: freeze({
        cardName: card.cardName,
        distinctFunctions: card.distinctFunctions,
        functionDistribution: card.functionDistribution,
      }),
      sampleSize: card.decksObserved,
      independentEvents: 1,
      commanderFamilyDiversity: (card.contexts || []).length,
      converterAssociation: null,
      contradictions: freeze([]),
      confidence: round(Math.min(0.85, 0.4 + card.distinctFunctions * 0.1)),
      whatBrainV1Understands: "single_role_classification_per_card",
      whatAppearsMissing: "context_dependent_strategic_function",
      transferClass: "mixed",
      autoMutateBrain: false,
    }));
  }

  // Aggregate transfer classification for topology edges enriched among converters.
  const edgeSupport = new Map();
  for (const topology of topologies) {
    const record = recordById.get(topology.deckId);
    if (!record) continue;
    const identity = normalizeCommanderIdentity(record.commanders || topology.commanders);
    for (const edge of (topology.edges || []).filter((e) => e.strength === EDGE_STRENGTH.strong)) {
      const key = `${edge.type}`;
      const entry = edgeSupport.get(key) || {
        type: edge.type,
        commanders: new Set(),
        families: new Set(),
        decks: new Set(),
        events: new Set(),
      };
      entry.decks.add(topology.deckId);
      if (record.eventId) entry.events.add(record.eventId);
      if (identity) entry.commanders.add(identity);
      edgeSupport.set(key, entry);
    }
  }

  const transferResults = [...edgeSupport.values()].map((entry) => freeze({
    edgeType: entry.type,
    decks: entry.decks.size,
    independentEvents: entry.events.size,
    commanders: entry.commanders.size,
    transferClass: transferClass([...entry.commanders], [...entry.commanders]),
    automaticTransfer: false,
  })).sort((a, b) => b.decks - a.decks);

  // Dedupe by id, keep highest confidence.
  const byId = new Map();
  for (const row of candidates) {
    const prev = byId.get(row.id);
    if (!prev || row.confidence > prev.confidence) byId.set(row.id, row);
  }

  const finalized = [...byId.values()].sort((a, b) => b.confidence - a.confidence);

  return freeze({
    version: "topology-discovery-v1",
    candidates: freeze(finalized.slice(0, 80)),
    byKind: freeze(Object.fromEntries(
      ["topology_blind_spot_candidate", "sequence_blind_spot_candidate", "semantic_blind_spot_candidate", "substitution_candidate", "package_candidate"]
        .map((kind) => [kind, finalized.filter((c) => c.kind === kind).length]),
    )),
    crossCommanderTransfer: freeze({
      automaticTransfer: false,
      edgeTypeTransfer: freeze(transferResults.slice(0, 24)),
    }),
    writesToBrain: false,
    brainPolicyTouched: false,
  });
}
