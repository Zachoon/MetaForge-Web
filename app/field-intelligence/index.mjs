// =============================================================================
// Field Intelligence v1 — public API
// =============================================================================

export {
  CORPUS_SCHEMA_VERSION,
  CORPUS_ANALYSIS_VERSION,
  CORPUS_INTELLIGENCE_VERSION,
  EVIDENCE_TIERS,
  PERFORMANCE_CLASSES,
  CORPUS_SOURCE_TYPES,
  createCorpusDeckRecord,
  parseDeckTextToRows,
  corpusDeckFingerprint,
  holdoutBucket,
  isHoldoutRecord,
  evidenceTierRank,
} from "./corpus-schema.mjs";

export {
  calculateCompetitiveEvidenceWeight,
  scoreEvidenceQuality,
  frequencyIsNotQuality,
  classifyEvidenceClaim,
} from "./evidence-quality.mjs";

export { analyzeCorpusDeck, analyzeCorpus, annotateCorpusCard } from "./corpus-analyze.mjs";
export { buildStructuralEvidence } from "./structural-evidence.mjs";
export { compareCorpusEvidenceToBrainTheory } from "./brain-human-compare.mjs";
export { buildCorpusRelationshipGraph } from "./relationship-graph.mjs";
export { discoverPackageCandidates, discoverSemanticBlindSpots } from "./discovery.mjs";
export { buildCompetitiveContrastAnalysis, buildAllCompetitiveContrasts } from "./competitive-contrast.mjs";
export { runHoldoutValidation } from "./holdout.mjs";
export { antiNetdeckPolicy, assertStructuralBeatsPopular, scoreCandidateAgainstCorpusPrior } from "./anti-netdeck.mjs";
export {
  buildCorpusIntelligenceArtifact,
  runFieldIntelligenceV1,
  recommendFirstBrainV2Candidate,
  diagnoseAgreementGaps,
} from "./pipeline.mjs";

export {
  fetchTopDeckTournaments,
  normalizeTopDeckTournament,
  normalizeTopDeckCorpus,
  TOPDECK_MISSING_KEY,
} from "./adapters/topdeck.mjs";
export {
  fetchSpicerackTournaments,
  normalizeSpicerackTournament,
  normalizeSpicerackCorpus,
  SPICERACK_DOC_BLOCKER,
} from "./adapters/spicerack.mjs";
export { normalizeCedhDdbEntries } from "./adapters/cedh-ddb.mjs";
export { normalizeEdhrecAggregate, fetchEdhrecCommanderAggregate } from "./adapters/edhrec.mjs";
export {
  fetchEdhTop16CommanderStats,
  normalizeEdhTop16Corroboration,
  EDHTOP16_CONSUMPTION,
} from "./adapters/edhtop16.mjs";
export { materializeCompetitiveFixtureCorpus } from "./fixtures/competitive-corpus.mjs";
export { liveFetch, isolateSource } from "./live-http.mjs";
export {
  DEFAULT_LIVE_SAMPLE,
  selectContrastStandings,
  resolveTopCutStatus,
  dedupeCorpusRecords,
  annotatePerformanceClasses,
} from "./live-sample.mjs";
export {
  rowsFromDeckObj,
  commandersFromDeckObj,
  parseTournamentDeckText,
} from "./decklist-parse.mjs";
export {
  enrichCorpusRecords,
  enrichCorpusRecord,
  resolveCardNames,
  scryfallLookupName,
  cardFromScryfall,
} from "./card-enrichment.mjs";
export { resolveCommanderFamily, resolveCorpusFamilies } from "./commander-family.mjs";
export { buildComparableCohorts, LEVEL_CONFIDENCE, isHighPerformerRecord } from "./comparable-cohorts.mjs";
export { analyzeRepeatedConverters } from "./repeated-converter-analysis.mjs";
export { buildCorpusQualityReport } from "./corpus-quality.mjs";
export {
  normalizeCommanderIdentity,
  isHighPerformer,
  decomposeThreatCard,
  decomposeSpellCard,
  decomposeInteractionCard,
  buildLevelACohortForensics,
  buildAllLevelAForensics,
} from "./level-a-forensics.mjs";
export {
  HYPOTHESIS_STATUS,
  buildPerformanceStructureHypotheses,
} from "./performance-hypotheses.mjs";
export {
  BRAIN_CLASSIFICATIONS,
  classifyHypothesesAgainstBrain,
  findPackageBlindSpotCandidates,
  findRoleTaxonomyBlindSpots,
  testCrossCommanderTransfer,
  synthesizeLevelAFindings,
  selectHighestConfidenceBrainV2Candidate,
} from "./level-a-synthesis.mjs";

// Field Intelligence v1.3 — Strategic Relationship Mining (observation only)
export {
  STRATEGIC_TOPOLOGY_VERSION,
  STRONG_EDGE_TYPES,
  WEAK_EDGE_TYPES,
  ALL_STRATEGIC_EDGE_TYPES,
  classifyEdgeStrength,
  edgeConfidence,
  isStrongEdge,
  EDGE_STRENGTH,
  CONSTRUCTIVE_ROLES,
} from "./strategic-edge-ontology.mjs";
export {
  buildDeckStrategicTopology,
  buildCorpusStrategicTopologies,
} from "./strategic-topology.mjs";
export {
  deriveTopologyMetrics,
  deriveCorpusTopologyMetrics,
} from "./topology-metrics.mjs";
export {
  compareLevelATopology,
  buildAllLevelATopology,
} from "./level-a-topology.mjs";
export { mineStrategicSequences } from "./strategic-sequences.mjs";
export { mineContextualCardFunctions } from "./contextual-card-function.mjs";
export { mineSubstitutionEvidence } from "./substitution-evidence.mjs";
export { buildTopologyDiscoveryQueue } from "./topology-discovery.mjs";
export {
  researchFingerprint,
  appendResearchObservations,
  readResearchStore,
  defaultResearchStorePath,
  observationsFromArtifact,
  writeResearchIndex,
} from "./research-store.mjs";
export { measureCorpusGrowth } from "./corpus-growth.mjs";
