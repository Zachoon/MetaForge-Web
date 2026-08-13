// =============================================================================
// Sim-Lab — public API (isolated sandbox)
// =============================================================================

export {
  SIM_LAB_VERSION,
  PLAN_GRAPH_VERSION,
  SIM_REPORT_VERSION,
  PLAN_NODE_KINDS,
  PLAN_EDGE_KINDS,
  assertSandboxInvariants,
  createPlanNode,
  createPlanEdge,
  createPlanGraph,
  createSimulationReport,
  createRecoveryMetrics,
} from "./schema.mjs";

export { buildPlanGraphFromDeck, summarizePlanGraph } from "./plan-graph.mjs";
export { measureRecovery, baselineResilience } from "./recovery.mjs";
export { simulateRemoveKind, simulateRemoveNodes } from "./what-if.mjs";
export { runSimLab001 } from "./experiments/sim-lab-001.mjs";
export {
  LIVE_ACADEMY_SAMPLE,
  loadCachedTopDeckTournaments,
  materializeLiveAcademyCorpus,
} from "./live-corpus.mjs";
export {
  extractProxyCandidates,
  runProxyDecomposition,
} from "./proxy-decomposition.mjs";
