// =============================================================================
// Field Intelligence v1.3 — Observational topology metrics
// =============================================================================
// Brain must not consume these. Observation / Level-A only.
// =============================================================================

import { EDGE_STRENGTH } from "./strategic-edge-ontology.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

/**
 * Derive topology metrics from a per-deck strategic topology artifact.
 */
export function deriveTopologyMetrics(topology = {}) {
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];
  const interactive = Math.max(1, nodes.length || topology.interactiveCardCount || 0);
  const strong = edges.filter((e) => e.strength === EDGE_STRENGTH.strong || (e.semanticSupport && !e.weakBecauseCooccurrenceOnly));
  const isolated = nodes.filter((n) => n.isolated);
  const multifunction = nodes.filter((n) => n.multifunction);
  const planConnected = nodes.filter((n) => n.planConnected);
  const lowCmcIx = nodes.filter((n) => n.interactive !== false && (Number(n.cmc) || 0) <= 2);
  const protectCommander = strong.filter((e) => e.type === "protects_commander");
  const protectEngine = strong.filter((e) => e.type === "protects_engine");
  const protectClose = strong.filter((e) => e.type === "protects_combo_or_close");
  const types = new Set(strong.map((e) => e.type));

  // Redundancy: interactive cards with same role set and both isolated-or-wired similarly.
  const roleKeys = new Map();
  for (const node of nodes) {
    const key = (node.roles || []).slice().sort().join("+") || "none";
    roleKeys.set(key, (roleKeys.get(key) || 0) + 1);
  }
  const redundantPairs = [...roleKeys.values()].filter((n) => n >= 2).reduce((s, n) => s + (n - 1), 0);

  return freeze({
    version: "topology-metrics-v1",
    deckId: topology.deckId || null,
    meaningfulEdgeDensity: round(strong.length / interactive),
    strongEdgeCount: strong.length,
    isolatedInteractiveCount: isolated.length,
    isolatedInteractiveRatio: round(isolated.length / interactive),
    multifunctionInteractionRatio: round(multifunction.length / interactive),
    planConnectedInteractionRatio: round(planConnected.length / interactive),
    winSequenceProtectionCoverage: round(protectClose.length / Math.max(1, protectClose.length + isolated.length * 0.25)),
    commanderProtectionCoverage: round(Math.min(1, protectCommander.length / Math.max(1, (topology.commanders || []).length || 1))),
    engineProtectionCoverage: round(Math.min(1, protectEngine.length / Math.max(1, protectEngine.length + 1))),
    interactionRedundancy: redundantPairs,
    interactionDiversity: types.size,
    lowCmcInteractionCoverage: round(lowCmcIx.length / interactive),
    deadNarrowInteractionRisk: round(isolated.length / interactive),
    meanStrategicDegree: topology.meanStrategicDegree
      ?? round(nodes.reduce((sum, n) => sum + (n.degree || 0), 0) / interactive),
    interactiveCardCount: nodes.length,
  });
}

export function deriveCorpusTopologyMetrics(topologies = []) {
  return freeze(topologies.map((topology) => deriveTopologyMetrics(topology)));
}
