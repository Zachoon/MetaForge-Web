// =============================================================================
// Sim-Lab — what-if interventions (reasoning reports, no scores)
// =============================================================================

import { createSimulationReport } from "./schema.mjs";
import { measureRecovery } from "./recovery.mjs";
import { summarizePlanGraph } from "./plan-graph.mjs";

const freeze = (value) => Object.freeze(value);

function removeNodes(graph, predicate) {
  const removed = (graph.nodes || []).filter(predicate);
  const removedIds = new Set(removed.map((n) => String(n.id)));
  const nodes = (graph.nodes || []).filter((n) => !removedIds.has(String(n.id)));
  const edges = (graph.edges || []).filter((e) => (
    !removedIds.has(String(e.from)) && !removedIds.has(String(e.to))
  ));
  return {
    removed,
    next: freeze({ ...graph, nodes: freeze(nodes), edges: freeze(edges) }),
  };
}

/**
 * Delete all nodes of a strategic kind and explain pathway impact.
 */
export function simulateRemoveKind(graph, kind) {
  const { removed, next } = removeNodes(graph, (n) => n.kind === kind);
  const before = summarizePlanGraph(graph);
  const after = summarizePlanGraph(next);
  const recovery = measureRecovery(graph, {
    removedKind: kind,
    removedNodeIds: removed.map((n) => n.id),
  });

  const pathwaysDisappeared = [];
  if (kind === "protection") {
    pathwaysDisappeared.push("protected_convert_close");
  }
  if (kind === "engine") {
    pathwaysDisappeared.push("engine_to_payoff");
  }
  if (kind === "payoff") {
    pathwaysDisappeared.push("closing_line");
  }
  if (kind === "commander") {
    pathwaysDisappeared.push("commander_centric_engine");
  }
  if (kind === "tutor") {
    pathwaysDisappeared.push("tutor_into_close");
  }

  const plansFragile = [];
  if ((after.byKind.engine || 0) === 0) plansFragile.push("plan_a_engine_collapse");
  if ((after.byKind.payoff || 0) === 0) plansFragile.push("closing_plan_collapse");
  if ((after.byKind.protection || 0) === 0) plansFragile.push("protection_map_empty");
  if (!recovery.recoverable) plansFragile.push("recovery_tree_insufficient");

  const narrative = [
    `Removed strategic seat kind: ${kind} (${removed.length} node(s)).`,
    recovery.recoverable
      ? `Recovery still plausible (p≈${recovery.recoveryProbability}, branches=${recovery.recoveryBranchCount}).`
      : `Recovery looks fragile (p≈${recovery.recoveryProbability}, distance=${recovery.recoveryDistance}).`,
    pathwaysDisappeared.length
      ? `Pathways under pressure: ${pathwaysDisappeared.join(", ")}.`
      : "No named primary pathways fully deleted.",
  ];

  return createSimulationReport({
    deckId: graph.deckId,
    intervention: freeze({
      type: "remove_kind",
      kind,
      removedNodeIds: freeze(removed.map((n) => n.id)),
      removedCount: removed.length,
      before,
      after,
    }),
    pathwaysAppeared: freeze([]),
    pathwaysDisappeared: freeze(pathwaysDisappeared),
    plansFragile: freeze(plansFragile),
    plansStrengthened: freeze([]),
    recovery,
    narrative: freeze(narrative),
  });
}

/**
 * Generic node-id deletion what-if.
 */
export function simulateRemoveNodes(graph, nodeIds = []) {
  const idSet = new Set(nodeIds.map(String));
  const { removed, next } = removeNodes(graph, (n) => idSet.has(String(n.id)));
  const recovery = measureRecovery(graph, { removedNodeIds: [...idSet] });
  return createSimulationReport({
    deckId: graph.deckId,
    intervention: freeze({
      type: "remove_nodes",
      removedNodeIds: freeze(removed.map((n) => n.id)),
      removedCount: removed.length,
      before: summarizePlanGraph(graph),
      after: summarizePlanGraph(next),
    }),
    pathwaysDisappeared: freeze(removed.map((n) => `${n.kind}:${n.name}`)),
    plansFragile: freeze(recovery.recoverable ? [] : ["recovery_tree_insufficient"]),
    recovery,
    narrative: freeze([
      `Removed ${removed.length} named node(s).`,
      recovery.note || "",
    ].filter(Boolean)),
  });
}
