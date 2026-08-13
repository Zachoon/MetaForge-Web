// =============================================================================
// Sim-Lab — schemas (isolated research sandbox)
// =============================================================================
// Not Brain. Not construction. Reasoning artifacts only.
// =============================================================================

export const SIM_LAB_VERSION = "sim-lab-v0.1";
export const PLAN_GRAPH_VERSION = "plan-graph-v0.1";
export const SIM_REPORT_VERSION = "sim-report-v0.1";

const freeze = (value) => Object.freeze(value);

export const PLAN_NODE_KINDS = Object.freeze([
  "commander",
  "engine",
  "payoff",
  "protection",
  "tutor",
  "mana",
  "disruption",
  "recovery",
  "support",
  "unknown",
]);

export const PLAN_EDGE_KINDS = Object.freeze([
  "enables",
  "protects",
  "recovers",
  "feeds",
  "closes",
  "depends_on",
  "disrupts_for",
]);

export function assertSandboxInvariants(artifact = {}) {
  if (artifact.writesToBrain === true) {
    throw new Error("Sim-Lab invariant violated: writesToBrain must be false");
  }
  if (artifact.constructionMutated === true) {
    throw new Error("Sim-Lab invariant violated: constructionMutated must be false");
  }
  return true;
}

/**
 * Compact plan-graph node. Cards instantiate plans; nodes are strategic seats.
 */
export function createPlanNode(input = {}) {
  return freeze({
    id: String(input.id || input.name || "node"),
    name: String(input.name || input.id || "unknown"),
    kind: PLAN_NODE_KINDS.includes(input.kind) ? input.kind : "unknown",
    roles: freeze([...(input.roles || [])]),
    sequenceStages: freeze([...(input.sequenceStages || [])]),
    planConnected: Boolean(input.planConnected),
    isolated: Boolean(input.isolated),
    multifunction: Boolean(input.multifunction),
    cmc: Number.isFinite(Number(input.cmc)) ? Number(input.cmc) : null,
  });
}

export function createPlanEdge(input = {}) {
  return freeze({
    id: String(input.id || `${input.from}->${input.to}:${input.kind || "depends_on"}`),
    from: String(input.from),
    to: String(input.to),
    kind: PLAN_EDGE_KINDS.includes(input.kind) ? input.kind : "depends_on",
    strength: input.strength || "weak",
  });
}

/**
 * Deck-level plan graph — research object, not a decklist.
 */
export function createPlanGraph(input = {}) {
  const graph = freeze({
    version: PLAN_GRAPH_VERSION,
    simLabVersion: SIM_LAB_VERSION,
    deckId: input.deckId || null,
    commanders: freeze([...(input.commanders || [])]),
    nodes: freeze([...(input.nodes || [])]),
    edges: freeze([...(input.edges || [])]),
    plans: freeze({
      planA: freeze(input.plans?.planA || null),
      planB: freeze(input.plans?.planB || null),
      emergency: freeze(input.plans?.emergency || null),
      recovery: freeze(input.plans?.recovery || null),
      closing: freeze(input.plans?.closing || null),
    }),
    writesToBrain: false,
    constructionMutated: false,
  });
  assertSandboxInvariants(graph);
  return graph;
}

/**
 * Simulation report: reasoning only. No construction score. No card ranking.
 */
export function createSimulationReport(input = {}) {
  const report = freeze({
    version: SIM_REPORT_VERSION,
    simLabVersion: SIM_LAB_VERSION,
    deckId: input.deckId || null,
    intervention: freeze(input.intervention || null),
    pathwaysAppeared: freeze([...(input.pathwaysAppeared || [])]),
    pathwaysDisappeared: freeze([...(input.pathwaysDisappeared || [])]),
    plansFragile: freeze([...(input.plansFragile || [])]),
    plansStrengthened: freeze([...(input.plansStrengthened || [])]),
    recovery: freeze(input.recovery || null),
    narrative: freeze([...(input.narrative || [])]),
    writesToBrain: false,
    constructionMutated: false,
    scoring: freeze({
      // Explicitly absent construction surfaces.
      constructionScore: null,
      cardRanking: null,
      note: "Sim-Lab reports reasoning, not scores or rankings.",
    }),
  });
  assertSandboxInvariants(report);
  return report;
}

export function createRecoveryMetrics(input = {}) {
  return freeze({
    version: "recovery-metrics-v0.1",
    recoverable: Boolean(input.recoverable),
    recoveryDistance: Number(input.recoveryDistance) || 0,
    recoveryCost: Number(input.recoveryCost) || 0,
    recoveryProbability: clamp01(input.recoveryProbability),
    recoveryBranchCount: Number(input.recoveryBranchCount) || 0,
    missingKinds: freeze([...(input.missingKinds || [])]),
    remainingSupport: freeze([...(input.remainingSupport || [])]),
    note: input.note || null,
  });
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, Number(n.toFixed(3))));
}
