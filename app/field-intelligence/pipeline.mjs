// =============================================================================
// Field Intelligence — Pipeline + corpus-intelligence-v1 artifact
// =============================================================================

import { CORPUS_INTELLIGENCE_VERSION, createCorpusDeckRecord } from "./corpus-schema.mjs";
import { analyzeCorpus } from "./corpus-analyze.mjs";
import { buildStructuralEvidence } from "./structural-evidence.mjs";
import { compareCorpusEvidenceToBrainTheory } from "./brain-human-compare.mjs";
import { buildCorpusRelationshipGraph } from "./relationship-graph.mjs";
import { discoverPackageCandidates, discoverSemanticBlindSpots } from "./discovery.mjs";
import { buildAllCompetitiveContrasts } from "./competitive-contrast.mjs";
import { runHoldoutValidation } from "./holdout.mjs";
import { antiNetdeckPolicy, assertStructuralBeatsPopular } from "./anti-netdeck.mjs";
import { materializeCompetitiveFixtureCorpus } from "./fixtures/competitive-corpus.mjs";
import {
  fetchTopDeckTournaments,
  normalizeTopDeckCorpus,
  TOPDECK_ATTRIBUTION,
  TOPDECK_MISSING_KEY,
} from "./adapters/topdeck.mjs";
import {
  fetchSpicerackTournaments,
  normalizeSpicerackCorpus,
  SPICERACK_ATTRIBUTION,
  SPICERACK_DOC_BLOCKER,
} from "./adapters/spicerack.mjs";
import { CEDH_DDB_ATTRIBUTION } from "./adapters/cedh-ddb.mjs";
import { EDHREC_ATTRIBUTION } from "./adapters/edhrec.mjs";
import {
  fetchEdhTop16CommanderStats,
  normalizeEdhTop16Corroboration,
  EDHTOP16_ATTRIBUTION,
  EDHTOP16_CONSUMPTION,
} from "./adapters/edhtop16.mjs";
import { isolateSource } from "./live-http.mjs";
import {
  DEFAULT_LIVE_SAMPLE,
  annotatePerformanceClasses,
  dedupeCorpusRecords,
} from "./live-sample.mjs";
import { enrichCorpusRecords } from "./card-enrichment.mjs";
import { resolveCorpusFamilies } from "./commander-family.mjs";
import { buildComparableCohorts } from "./comparable-cohorts.mjs";
import { analyzeRepeatedConverters } from "./repeated-converter-analysis.mjs";
import { buildCorpusQualityReport } from "./corpus-quality.mjs";
import { buildAllLevelAForensics } from "./level-a-forensics.mjs";
import { buildPerformanceStructureHypotheses } from "./performance-hypotheses.mjs";
import {
  classifyHypothesesAgainstBrain,
  findPackageBlindSpotCandidates,
  findRoleTaxonomyBlindSpots,
  testCrossCommanderTransfer,
  synthesizeLevelAFindings,
  selectHighestConfidenceBrainV2Candidate,
} from "./level-a-synthesis.mjs";
import { buildCorpusStrategicTopologies } from "./strategic-topology.mjs";
import { deriveCorpusTopologyMetrics } from "./topology-metrics.mjs";
import { buildAllLevelATopology } from "./level-a-topology.mjs";
import { mineStrategicSequences } from "./strategic-sequences.mjs";
import { mineContextualCardFunctions } from "./contextual-card-function.mjs";
import { mineSubstitutionEvidence } from "./substitution-evidence.mjs";
import { buildTopologyDiscoveryQueue } from "./topology-discovery.mjs";
import { measureCorpusGrowth } from "./corpus-growth.mjs";
import { STRATEGIC_TOPOLOGY_VERSION, ALL_STRATEGIC_EDGE_TYPES } from "./strategic-edge-ontology.mjs";
import { buildPrincipleRegistry } from "./principle-registry.mjs";
import { PRINCIPLE_REGISTRY_VERSION } from "./strategic-principle-schema.mjs";

const freeze = (value) => Object.freeze(value);
const unique = (values) => [...new Set(values)];
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function tierDistribution(records = []) {
  const counts = {};
  for (const record of records) {
    const tier = record.evidenceTier || "unknown";
    counts[tier] = (counts[tier] || 0) + 1;
  }
  return freeze(counts);
}

function classDistribution(records = []) {
  const counts = {};
  for (const record of records) {
    const key = record.performanceClass || "unset";
    counts[key] = (counts[key] || 0) + 1;
  }
  return freeze(counts);
}

function sourceDistribution(records = []) {
  const counts = {};
  for (const record of records) {
    const key = record.sourceType || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return freeze(counts);
}

function placementDistribution(records = []) {
  const buckets = { top1: 0, topCut: 0, mid: 0, lower: 0, unknown: 0 };
  for (const record of records) {
    if (!Number.isFinite(record.placement)) {
      buckets.unknown += 1;
      continue;
    }
    if (record.placement === 1) buckets.top1 += 1;
    else if (record.topCut) buckets.topCut += 1;
    else if (record.placement <= 16) buckets.mid += 1;
    else buckets.lower += 1;
  }
  return freeze(buckets);
}

function eventSizeDistribution(records = []) {
  const sizes = records.map((r) => Number(r.eventSize)).filter((n) => Number.isFinite(n) && n > 0);
  if (!sizes.length) return freeze({ n: 0 });
  const sorted = [...sizes].sort((a, b) => a - b);
  return freeze({
    n: sizes.length,
    min: sorted[0],
    p50: sorted[Math.floor((sorted.length - 1) * 0.5)],
    max: sorted[sorted.length - 1],
    mean: round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
  });
}

/**
 * Diagnose empty Brain↔human agreements without lowering thresholds.
 */
export function diagnoseAgreementGaps({
  analyses = [],
  enrichmentStats = null,
  familyResolution = null,
  brainHuman = null,
} = {}) {
  const packageRate = analyses.length
    ? analyses.filter((a) => (a.packages || []).length > 0).length / analyses.length
    : 0;
  const causes = [];
  if ((enrichmentStats?.semanticCoverageRate ?? 1) < 0.75) {
    causes.push("semantic_enrichment_missing_or_incomplete");
  }
  if ((familyResolution?.familyResolutionRate ?? 1) < 0.5) {
    causes.push("commander_family_unresolved");
  }
  if (packageRate < 0.2) {
    causes.push("package_extraction_failing_or_catalog_miss");
  }
  if ((brainHuman?.agreements || []).length === 0 && packageRate >= 0.2) {
    causes.push("genuine_disagreement_or_sparse_overlap");
  }
  if ((brainHuman?.agreements || []).length === 0 && packageRate < 0.2) {
    causes.push("agreements_unmeasurable_until_packages_exist");
  }
  return freeze({
    agreementCount: brainHuman?.agreements?.length || 0,
    packageDetectionRate: round(packageRate),
    causes: freeze(causes),
    thresholdLowered: false,
  });
}

/**
 * Run Field Intelligence over a record set (fixtures and/or live adapters).
 * Enrichment + family resolution happen before Brain observation.
 */
export async function buildCorpusIntelligenceArtifact({
  records = [],
  edhrecAggregates = [],
  corroboration = null,
  liveCoverage = {},
  dedupeStats = null,
  analyses: presetAnalyses = null,
  comparedToFixture = null,
  enrich = false,
  enrichOptions = {},
  priorStoreRows = [],
} = {}) {
  let workingRecords = records;
  let enrichmentStats = null;
  const exclusions = [];

  if (enrich) {
    const enriched = await enrichCorpusRecords(workingRecords, enrichOptions);
    workingRecords = enriched.records.map((record) => createCorpusDeckRecord(record));
    enrichmentStats = enriched.stats;
  }

  // Drop decks with zero commanders after enrichment only if explicitly required.
  workingRecords = workingRecords.filter((record) => {
    if ((record.commanders || []).length) return true;
    exclusions.push({ id: record.id, reason: "missing_commander" });
    return false;
  });

  let analyses = presetAnalyses || analyzeCorpus(workingRecords);
  const familyResolution = resolveCorpusFamilies(workingRecords, analyses);
  analyses = familyResolution.analyses;

  const structuralEvidence = buildStructuralEvidence(analyses, workingRecords);
  const brainHuman = compareCorpusEvidenceToBrainTheory(structuralEvidence, analyses);
  const agreementDiagnosis = diagnoseAgreementGaps({
    analyses,
    enrichmentStats,
    familyResolution,
    brainHuman,
  });
  const relationshipGraph = buildCorpusRelationshipGraph(analyses, workingRecords);
  const legacyContrasts = buildAllCompetitiveContrasts(workingRecords, analyses);
  const cohorts = buildComparableCohorts(workingRecords, analyses, familyResolution);
  const packageDiscovery = discoverPackageCandidates(analyses, workingRecords);
  const semanticBlindSpots = discoverSemanticBlindSpots(analyses, cohorts.strongestControlled.map((c) => c.contrast));
  const holdout = runHoldoutValidation(workingRecords, analyses);
  const quality = buildCorpusQualityReport({
    records: workingRecords,
    analyses,
    enrichmentStats,
    familyResolution,
    exclusions,
  });
  const levelAForensics = buildAllLevelAForensics(workingRecords, analyses);
  const performanceHypotheses = buildPerformanceStructureHypotheses(levelAForensics);
  const brainClassifications = classifyHypothesesAgainstBrain(performanceHypotheses, quality);
  const packageBlindSpots = findPackageBlindSpotCandidates(levelAForensics, analyses, workingRecords);
  const roleTaxonomyBlindSpots = findRoleTaxonomyBlindSpots(levelAForensics);
  const crossCommanderTransfer = testCrossCommanderTransfer(performanceHypotheses, levelAForensics);
  const levelASynthesis = synthesizeLevelAFindings(levelAForensics);
  const brainV2CandidateGate = selectHighestConfidenceBrainV2Candidate({
    hypothesesBatch: performanceHypotheses,
    brainClassifications,
    synthesis: levelASynthesis,
    quality,
  });
  const antiNetdeck = freeze({
    policy: antiNetdeckPolicy(),
    structuralBeatsPopular: assertStructuralBeatsPopular(),
  });

  // --- Field Intelligence v1.3: strategic relationship mining (observation only) ---
  const strategicTopologies = buildCorpusStrategicTopologies(analyses, workingRecords);
  const topologyMetrics = deriveCorpusTopologyMetrics(strategicTopologies);
  const repeatedConverters = analyzeRepeatedConverters(workingRecords, analyses, {
    topologyMetrics,
  });
  const levelATopology = buildAllLevelATopology(workingRecords, strategicTopologies, { metrics: topologyMetrics });
  const strategicSequences = mineStrategicSequences(strategicTopologies, analyses, workingRecords);
  const contextualCardFunctions = mineContextualCardFunctions(strategicTopologies, analyses);
  const substitutionEvidence = mineSubstitutionEvidence(strategicTopologies, analyses, workingRecords);
  const topologyDiscovery = buildTopologyDiscoveryQueue({
    topologies: strategicTopologies,
    topologyMetrics,
    levelATopology,
    sequences: strategicSequences,
    substitutions: substitutionEvidence,
    contextualFunctions: contextualCardFunctions,
    packageCandidates: packageDiscovery.candidates,
    semanticBlindSpots: semanticBlindSpots.candidates,
    analyses,
    records: workingRecords,
  });

  // Strategic Principle Engine — observation only; never activates Brain.
  const strategicPrincipleRegistry = buildPrincipleRegistry({
    performanceHypotheses,
    topologyDiscovery,
    brainClassifications,
    crossCommanderTransfer,
    priorStoreRows,
  });

  const corpusGrowth = measureCorpusGrowth({
    currentArtifact: {
      corpus: {
        decksAnalyzed: analyses.length,
        eventsRepresented: unique(workingRecords.map((r) => r.eventId).filter(Boolean)).length,
        uniqueCommanders: unique(workingRecords.flatMap((r) => (r.commanders || []).map((c) => c.name))).length,
      },
      levelAForensics: { usableCohorts: levelAForensics.usableCohorts },
      levelATopology,
      performanceHypotheses,
      topologyDiscovery,
      strategicPrincipleRegistry,
    },
    priorSnapshot: comparedToFixture?.priorGrowthSnapshot || null,
  });

  const events = unique(workingRecords.map((r) => r.eventId).filter(Boolean));
  const commanders = unique(workingRecords.flatMap((r) => (r.commanders || []).map((c) => c.name)));

  return freeze({
    version: CORPUS_INTELLIGENCE_VERSION,
    generatedAt: new Date().toISOString(),
    brainPolicyTouched: false,
    constructionMutated: false,
    strategicRelationshipMining: freeze({
      version: STRATEGIC_TOPOLOGY_VERSION,
      layer: "static",
      dynamicPressureDeferred: true,
      writesToBrain: false,
      edgeOntology: ALL_STRATEGIC_EDGE_TYPES,
      recommendedExp002: "Prefer interaction that closes an uncovered strategic dependency (protects unprotected engine/combo/commander, or bridges a missing sequence stage) over interaction that merely increases interaction count/density.",
    }),
    strategicPrincipleEngine: freeze({
      version: PRINCIPLE_REGISTRY_VERSION,
      writesToBrain: false,
      activateBrain: false,
      successCriteria: "discover_strategic_principles_not_taught_explicitly",
    }),
    strategicPrincipleRegistry,
    attribution: freeze([
      TOPDECK_ATTRIBUTION,
      SPICERACK_ATTRIBUTION,
      CEDH_DDB_ATTRIBUTION,
      EDHREC_ATTRIBUTION,
      EDHTOP16_ATTRIBUTION,
    ]),
    liveCoverage: freeze(liveCoverage),
    sourceSafety: freeze({
      topdeckMissingKey: TOPDECK_MISSING_KEY.actionable,
      spicerackDocBlocker: SPICERACK_DOC_BLOCKER,
      edhtop16Consumption: EDHTOP16_CONSUMPTION,
      noApiKeysStored: true,
    }),
    corpus: freeze({
      decksAnalyzed: analyses.length,
      recordsIngested: workingRecords.length,
      eventsRepresented: events.length,
      uniqueCommanders: commanders.length,
      commanders: freeze(commanders.sort()),
      evidenceTierDistribution: tierDistribution(workingRecords),
      performanceClassDistribution: classDistribution(workingRecords),
      sourceDistribution: sourceDistribution(workingRecords),
      placementDistribution: placementDistribution(workingRecords),
      eventSizeDistribution: eventSizeDistribution(workingRecords),
      topCutDecks: workingRecords.filter((r) => r.topCut).length,
      winningDecks: workingRecords.filter((r) => r.placement === 1).length,
      lowerPerformingDecks: workingRecords.filter((r) => r.topCut === false || (Number.isFinite(r.placement) && r.placement > 8)).length,
      repeatedConverters: workingRecords.filter((r) => r.performanceClass === "repeated_converter").length,
      singleEventConverters: workingRecords.filter((r) => r.performanceClass === "single_event_converter").length,
      tournamentParticipants: workingRecords.filter((r) => r.performanceClass === "tournament_participant").length,
      edhrecAggregates: edhrecAggregates.length,
      dedupe: dedupeStats,
    }),
    corpusQuality: quality,
    corpusGrowth,
    familyResolution: freeze({
      commanderResolutionRate: familyResolution.commanderResolutionRate,
      familyResolutionRate: familyResolution.familyResolutionRate,
      structurallyTyped: familyResolution.structurallyTyped,
      unresolved: familyResolution.unresolved,
      unresolvedDetails: familyResolution.unresolvedDetails,
      familyDistribution: familyResolution.familyDistribution,
    }),
    structuralEvidence,
    comparableCohorts: freeze({
      counts: cohorts.counts,
      strongestControlled: cohorts.strongestControlled,
      cohorts: freeze(cohorts.cohorts.slice(0, 40)),
    }),
    competitiveContrasts: freeze(
      cohorts.strongestControlled.map((c) => c.contrast).concat(
        legacyContrasts.filter((c) => c.commanderFamily).slice(0, 8),
      ).slice(0, 24),
    ),
    repeatedConverterAnalysis: repeatedConverters,
    levelAForensics: freeze({
      usableCohorts: levelAForensics.usableCohorts,
      // Full cohort forensics — primary v1.2 deliverable surface.
      cohorts: levelAForensics.cohorts,
    }),
    levelATopology,
    topologyMetricsSummary: freeze({
      decks: topologyMetrics.length,
      meanMeaningfulEdgeDensity: round(
        topologyMetrics.reduce((s, m) => s + (m.meaningfulEdgeDensity || 0), 0) / Math.max(1, topologyMetrics.length),
      ),
      meanPlanConnectedRatio: round(
        topologyMetrics.reduce((s, m) => s + (m.planConnectedInteractionRatio || 0), 0) / Math.max(1, topologyMetrics.length),
      ),
      meanIsolatedRatio: round(
        topologyMetrics.reduce((s, m) => s + (m.isolatedInteractiveRatio || 0), 0) / Math.max(1, topologyMetrics.length),
      ),
      meanMultifunctionRatio: round(
        topologyMetrics.reduce((s, m) => s + (m.multifunctionInteractionRatio || 0), 0) / Math.max(1, topologyMetrics.length),
      ),
    }),
    strategicTopologies: freeze(strategicTopologies.map((t) => freeze({
      deckId: t.deckId,
      commanders: t.commanders,
      eventId: t.eventId,
      performanceClass: t.performanceClass,
      strongEdgeCount: t.strongEdgeCount,
      weakEdgeCount: t.weakEdgeCount,
      interactiveCardCount: t.interactiveCardCount,
      isolatedInteractiveCount: t.isolatedInteractiveCount,
      multifunctionInteractiveCount: t.multifunctionInteractiveCount,
      planConnectedInteractiveCount: t.planConnectedInteractiveCount,
      meanStrategicDegree: t.meanStrategicDegree,
      // Cap per-deck edges in the artifact for size; full edges available in-module.
      edges: freeze((t.edges || []).filter((e) => e.strength === "strong").slice(0, 24)),
    }))),
    strategicSequences,
    contextualCardFunctions,
    substitutionEvidence,
    topologyDiscovery,
    performanceHypotheses,
    brainV1Classifications: brainClassifications,
    packageBlindSpotCandidates: packageBlindSpots.candidates,
    roleTaxonomyBlindSpotCandidates: roleTaxonomyBlindSpots.candidates,
    crossCommanderTransfer,
    levelASynthesis,
    brainV2EvidenceGate: brainV2CandidateGate,
    relationshipGraph: freeze({
      nodeCount: relationshipGraph.nodeCount,
      edgeCount: relationshipGraph.edgeCount,
      highConfidence: relationshipGraph.highConfidence,
      weakCooccurrence: relationshipGraph.weakCooccurrence.slice(0, 20),
    }),
    brainHumanCompare: brainHuman,
    agreementDiagnosis,
    packageDiscoveryCandidates: packageDiscovery.candidates,
    semanticBlindSpotCandidates: semanticBlindSpots.candidates,
    holdout,
    antiNetdeck,
    corroboration,
    comparedToFixture,
    analyses: freeze(analyses.map((a) => freeze({
      deckId: a.deckId,
      commanders: a.commanders,
      sourceType: a.sourceType,
      evidenceWeight: a.evidenceQuality?.weight,
      cohesionPassed: a.cohesion?.passed,
      weaklyJustified: a.justification?.weaklyJustifiedCount,
      familyId: a.commanderFamily?.familyId || null,
      familyKeys: a.commanderFamily?.familyKeys || [],
      packages: (a.packages || []).map((p) => freeze({
        id: p.id,
        status: p.status,
        core: p.density?.core,
        healthScore: p.healthScore,
      })),
    }))),
  });
}

function summarizeLiveCoverageEntry(isolated, normalized = null) {
  const result = isolated.result || {};
  return freeze({
    attempted: true,
    ok: isolated.ok && result.ok !== false,
    status: result.status || isolated.status,
    reason: result.reason || isolated.reason || null,
    actionable: result.actionable || isolated.actionable || null,
    elapsedMs: isolated.elapsedMs,
    tournaments: result.tournaments?.length || normalized?.events?.length || 0,
    decks: normalized?.records?.length || result.decks || 0,
    skippedExternal: normalized?.skippedExternal?.length || 0,
    errors: result.errors || null,
    commanders: result.commanders?.length || null,
    docBlocker: result.docBlocker || null,
    consumption: result.consumption || null,
  });
}

/**
 * Fixture corpus always; live adapters when requested.
 * Source failures are isolated — one down source cannot kill the run.
 */
export async function runFieldIntelligenceV1(options = {}) {
  const fixture = materializeCompetitiveFixtureCorpus();
  const sample = {
    ...DEFAULT_LIVE_SAMPLE,
    lastDays: options.lastDays ?? DEFAULT_LIVE_SAMPLE.lastDays,
    participantMin: options.participantMin ?? DEFAULT_LIVE_SAMPLE.participantMin,
    maxEvents: options.maxEvents ?? DEFAULT_LIVE_SAMPLE.maxEvents,
    maxDecksPerEvent: options.maxDecksPerEvent ?? DEFAULT_LIVE_SAMPLE.maxDecksPerEvent,
  };

  const liveCoverage = {
    topdeck: freeze({ attempted: false, ok: false, reason: "not_attempted" }),
    spicerack: freeze({ attempted: false, ok: false, reason: "not_attempted" }),
    edhtop16: freeze({ attempted: false, ok: false, reason: "not_attempted" }),
  };

  let liveRecords = [];
  let corroborationResult = null;
  let liveEvents = 0;
  let liveDecklists = 0;

  if (options.tryLive) {
    const topdeckIsolated = await isolateSource("topdeck", () => fetchTopDeckTournaments({
      apiKey: options.topdeckApiKey,
      lastDays: sample.lastDays,
      participantMin: sample.participantMin,
      maxEvents: sample.maxEvents,
      fetchImpl: options.fetchImpl,
    }));
    let topdeckNormalized = null;
    if (topdeckIsolated.ok && topdeckIsolated.result?.ok) {
      topdeckNormalized = normalizeTopDeckCorpus(topdeckIsolated.result.tournaments, sample);
      liveRecords = liveRecords.concat(topdeckNormalized.records);
      liveEvents += topdeckNormalized.events.length;
      liveDecklists += topdeckNormalized.records.length;
    }
    liveCoverage.topdeck = summarizeLiveCoverageEntry(topdeckIsolated, topdeckNormalized);

    const spicerackIsolated = await isolateSource("spicerack", () => fetchSpicerackTournaments({
      apiKey: options.spicerackApiKey,
      numDays: sample.lastDays,
      participantMin: sample.participantMin,
      maxEvents: sample.maxEvents,
      allowUnauthenticated: options.allowSpicerackUnauthenticated === true,
      fetchImpl: options.fetchImpl,
    }));
    let spicerackNormalized = null;
    if (spicerackIsolated.ok && spicerackIsolated.result?.ok) {
      spicerackNormalized = normalizeSpicerackCorpus(spicerackIsolated.result.tournaments, sample);
      liveRecords = liveRecords.concat(spicerackNormalized.records);
      liveEvents += spicerackNormalized.events.length;
      liveDecklists += spicerackNormalized.records.length;
    }
    liveCoverage.spicerack = summarizeLiveCoverageEntry(spicerackIsolated, spicerackNormalized);

    const edhtop16Isolated = await isolateSource("edhtop16", () => fetchEdhTop16CommanderStats({
      fetchImpl: options.fetchImpl,
    }));
    if (edhtop16Isolated.ok && edhtop16Isolated.result?.ok) {
      corroborationResult = normalizeEdhTop16Corroboration(edhtop16Isolated.result.commanders || []);
    }
    liveCoverage.edhtop16 = summarizeLiveCoverageEntry(edhtop16Isolated);
  }

  const useLive = options.fixtureOnly === false && liveRecords.length > 0;
  const combined = useLive ? liveRecords : fixture.records;
  const classified = annotatePerformanceClasses(combined);
  const deduped = dedupeCorpusRecords(classified);
  const records = deduped.records;

  const comparedToFixture = useLive
    ? freeze({
      liveMode: true,
      liveTournamentsRetrieved: liveEvents,
      liveDecklistsRetrieved: liveDecklists,
      fixtureDecks: fixture.stats.topdeckShapedDecks
        + fixture.stats.spicerackShapedDecks
        + fixture.stats.curatedExpertDecks,
      note: "Compare live structural contrasts against the offline fixture-shaped baseline before proposing Brain v2.",
    })
    : freeze({
      liveMode: false,
      note: "Offline fixture-shaped sample only. Set TOPDECK_API_KEY and re-run with --live for real tournament evidence.",
    });

  const corroboration = corroborationResult
    || freeze({
      source: "edhtop16",
      kind: "skipped_or_unavailable",
      entries: freeze([]),
      consumption: EDHTOP16_CONSUMPTION,
    });

  const artifact = await buildCorpusIntelligenceArtifact({
    records,
    edhrecAggregates: fixture.edhrecAggregates,
    corroboration,
    liveCoverage,
    dedupeStats: deduped.stats,
    comparedToFixture,
    priorStoreRows: options.priorStoreRows || [],
    // Live decks need Scryfall enrichment; fixture decks are already annotated.
    enrich: useLive || options.enrich === true,
    enrichOptions: {
      allowNetwork: options.allowNetwork !== false,
      fetchImpl: options.fetchImpl,
      force: options.forceEnrich === true,
    },
  });

  return freeze({
    artifact,
    fixtureStats: fixture.stats,
    liveSample: freeze(sample),
    recommendation: recommendFirstBrainV2Candidate(artifact),
  });
}

/**
 * Evidence-backed recommendation only — does NOT implement Brain v2.
 * Level-A replication gate prefers controlled same-commander evidence.
 */
export function recommendFirstBrainV2Candidate(artifact) {
  const quality = artifact.corpusQuality || {};
  const enrichWasAttempted = Boolean(quality.enrichment);
  const agreement = artifact.brainHumanCompare?.agreements?.[0] || null;
  const gated = artifact.brainV2EvidenceGate || null;

  let candidate = gated?.candidate || null;
  // Prefer not to trust candidates when interpretability is still broken on enriched live corpora.
  const bridgeBroken = enrichWasAttempted
    && ((quality.packageDetectionRate ?? 0) < 0.15 || (quality.semanticCoverageRate ?? 0) < 0.5);
  if (bridgeBroken) {
    candidate = freeze({
      kind: "semantic_bridge_incomplete",
      summary: "Fix corpus interpretability before proposing Brain construction changes",
      evidence: freeze({
        semanticCoverageRate: quality.semanticCoverageRate,
        packageDetectionRate: quality.packageDetectionRate,
        familyResolutionRate: quality.familyResolutionRate,
        agreementDiagnosis: artifact.agreementDiagnosis,
      }),
      priority: "blocking",
      brainV2Eligible: false,
    });
  }

  return freeze({
    implementBrainV2: false,
    brainV1RemainsFrozen: true,
    candidateChangedBecauseOfBridge: candidate?.kind === "semantic_bridge_incomplete",
    strongestAgreement: agreement,
    firstCandidate: candidate,
    evidenceGate: gated?.evidenceGate || null,
    levelAUsableCohorts: artifact.levelAForensics?.usableCohorts ?? null,
    replicatedHypotheses: artifact.performanceHypotheses?.byStatus?.replicated ?? 0,
    rationale: freeze([
      "Evidence system first; construction policy unchanged.",
      "Level-A same-commander + same-event is the primary controlled comparison.",
      "Single-event structural deltas remain research leads, not Brain v2 evidence.",
      "Replicated Level-A (or strong cross-family confirmation) required for Brain v2 eligibility.",
      "Any Brain v2 change requires Validation Harness report.",
      "This batch does not implement Brain v2.",
    ]),
  });
}
