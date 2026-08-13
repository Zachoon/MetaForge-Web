// =============================================================================
// Sim-Lab — recovery metrics after structural disruption
// =============================================================================

import { createRecoveryMetrics } from "./schema.mjs";

const freeze = (value) => Object.freeze(value);

function nodesOfKind(graph, kind) {
  return (graph.nodes || []).filter((n) => n.kind === kind);
}

function countKinds(graph) {
  const counts = {};
  for (const node of graph.nodes || []) {
    counts[node.kind] = (counts[node.kind] || 0) + 1;
  }
  return counts;
}

/**
 * Structural recovery after deleting a strategic seat kind (or named node).
 * Not playtesting — graph reasoning only.
 */
export function measureRecovery(graph = {}, intervention = {}) {
  const removedKind = intervention.removedKind || null;
  const removedIds = new Set((intervention.removedNodeIds || []).map(String));
  const remaining = (graph.nodes || []).filter((n) => !removedIds.has(String(n.id)));
  const remainingGraph = { ...graph, nodes: remaining };
  const kinds = countKinds(remainingGraph);

  const hasCommander = (kinds.commander || 0) > 0;
  const engines = kinds.engine || 0;
  const payoffs = kinds.payoff || 0;
  const protection = kinds.protection || 0;
  const tutors = kinds.tutor || 0;
  const recoveryNodes = kinds.recovery || 0;
  const support = kinds.support || 0;

  const missingKinds = [];
  if (!hasCommander && removedKind === "commander") missingKinds.push("commander");
  if (engines === 0) missingKinds.push("engine");
  if (payoffs === 0) missingKinds.push("payoff");
  if (protection === 0 && (removedKind === "protection" || removedKind === "payoff")) {
    missingKinds.push("protection");
  }

  // Branches: alternate engines/payoffs/protection/recovery seats still present.
  const branchParts = [
    engines > 1 ? engines - 1 : 0,
    payoffs > 1 ? payoffs - 1 : 0,
    protection > 0 ? protection : 0,
    recoveryNodes,
    tutors > 0 ? 1 : 0,
    support > 2 ? 1 : 0,
  ];
  const recoveryBranchCount = branchParts.reduce((a, b) => a + b, 0);

  // Distance: how many strategic seats must be re-established.
  let recoveryDistance = 0;
  if (removedKind === "commander") recoveryDistance += hasCommander ? 0 : 2;
  if (removedKind === "engine") recoveryDistance += engines > 0 ? 1 : 3;
  if (removedKind === "payoff") recoveryDistance += payoffs > 0 ? 1 : 3;
  if (removedKind === "tutor") recoveryDistance += tutors > 0 ? 1 : 2;
  if (removedKind === "protection") recoveryDistance += protection > 0 ? 1 : 2;
  if (recoveryDistance === 0 && removedIds.size) recoveryDistance = 1;

  // Cost: CMC-ish burden of remaining recovery/protection/support seats (proxy).
  const costNodes = remaining.filter((n) => (
    n.kind === "recovery" || n.kind === "protection" || n.kind === "tutor" || n.kind === "support"
  ));
  const recoveryCost = costNodes.reduce((sum, n) => sum + (Number(n.cmc) || 1.5), 0);

  // Probability: structural seats only — do NOT use topology ratios here.
  // Topology predictors must remain independent for Sim-Lab-001.
  let recoveryProbability = 0.12
    + Math.min(0.4, recoveryBranchCount * 0.07)
    + Math.min(0.22, protection * 0.055)
    + Math.min(0.18, recoveryNodes * 0.06)
    + Math.min(0.12, engines * 0.03)
    + Math.min(0.12, payoffs * 0.03)
    + Math.min(0.08, tutors * 0.04);
  if (engines === 0 && payoffs === 0) recoveryProbability -= 0.28;
  if (removedKind === "commander" && !hasCommander && engines === 0) recoveryProbability -= 0.22;
  if (removedKind === "protection" && protection === 0) recoveryProbability -= 0.12;
  if (removedKind === "engine" && engines === 0) recoveryProbability -= 0.1;

  const recoverable = recoveryProbability >= 0.35 && (engines + payoffs + recoveryNodes + protection) > 0;

  const remainingSupport = remaining
    .filter((n) => ["protection", "recovery", "tutor", "engine", "payoff"].includes(n.kind))
    .slice(0, 12)
    .map((n) => `${n.kind}:${n.name}`);

  return createRecoveryMetrics({
    recoverable,
    recoveryDistance,
    recoveryCost: Number(recoveryCost.toFixed(2)),
    recoveryProbability,
    recoveryBranchCount,
    missingKinds,
    remainingSupport,
    note: removedKind
      ? `Structural recovery after removing ${removedKind} seat(s).`
      : "Structural recovery after node deletion.",
  });
}

export function baselineResilience(graph = {}) {
  const kinds = ["commander", "engine", "payoff", "tutor", "protection", "recovery"];
  const byKind = {};
  for (const kind of kinds) {
    const targets = nodesOfKind(graph, kind);
    const intervention = {
      removedKind: kind,
      removedNodeIds: targets.map((n) => n.id),
    };
    byKind[kind] = measureRecovery(graph, intervention);
  }
  return freeze({ version: "baseline-resilience-v0.1", byKind: freeze(byKind) });
}
