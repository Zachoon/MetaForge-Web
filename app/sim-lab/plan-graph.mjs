// =============================================================================
// Sim-Lab — build plan graphs from FI strategic topology (read-only)
// =============================================================================

import { buildDeckStrategicTopology } from "../field-intelligence/strategic-topology.mjs";
import {
  createPlanEdge,
  createPlanGraph,
  createPlanNode,
} from "./schema.mjs";

const freeze = (value) => Object.freeze(value);

function classifyKind(node = {}, commanders = []) {
  const name = String(node.name || "");
  const roles = new Set(node.roles || []);
  const stages = new Set(node.sequenceStages || []);
  if (commanders.some((c) => String(c).toLocaleLowerCase("en") === name.toLocaleLowerCase("en"))) {
    return "commander";
  }
  // Prefer specific strategic seats before broad tags.
  if (roles.has("tutor") || roles.has("selection") || /tutor|demonic|vampiric|imperial seal|mystical tutor/i.test(name)) {
    return "tutor";
  }
  if (roles.has("wincon") || roles.has("combo") || stages.has("close")) return "payoff";
  if (roles.has("engine") || (stages.has("convert") && !roles.has("interaction"))) return "engine";
  if (roles.has("recursion") || stages.has("recover")) return "recovery";
  if (roles.has("protection") || /greaves|boots|swiftfoot|teferi's protection|silence|grand abolisher|defender of wits/i.test(name)) {
    return "protection";
  }
  if (roles.has("ramp") || roles.has("mana") || stages.has("setup") && roles.has("ramp")) return "mana";
  if (roles.has("interaction") || roles.has("removal") || roles.has("counterspell")) return "disruption";
  if (node.packageMember) return "support";
  if (node.planConnected) return "support";
  return "unknown";
}

function mapEdgeKind(type = "") {
  if (type.startsWith("protects")) return "protects";
  if (type === "enables" || type === "feeds") return "enables";
  if (type === "recovers" || type.includes("reanimat")) return "recovers";
  if (type.includes("combo") || type.includes("close") || type === "finishes") return "closes";
  if (type.includes("disrupt") || type.includes("answers")) return "disrupts_for";
  return "depends_on";
}

function pathwayFromStages(nodes = []) {
  const byStage = {
    setup: nodes.filter((n) => (n.sequenceStages || []).includes("setup")).map((n) => n.id),
    convert: nodes.filter((n) => (n.sequenceStages || []).includes("convert")).map((n) => n.id),
    close: nodes.filter((n) => (n.sequenceStages || []).includes("close")).map((n) => n.id),
    recover: nodes.filter((n) => (n.sequenceStages || []).includes("recover") || n.kind === "recovery").map((n) => n.id),
    stabilize: nodes.filter((n) => (n.sequenceStages || []).includes("stabilize") || n.kind === "protection").map((n) => n.id),
  };
  return freeze(byStage);
}

/**
 * Build a Sim-Lab plan graph from a corpus deck record + optional analysis row.
 * Uses FI topology only — never Brain construction.
 */
export function buildPlanGraphFromDeck(record = {}, analysis = null) {
  const topology = analysis
    ? buildDeckStrategicTopology(analysis, record)
    : buildDeckStrategicTopology({
      commanders: (record.commanders || []).map((c) => (typeof c === "string" ? c : c.name)),
      annotatedRows: record.rows || [],
      packages: [],
      interactionGraph: {},
      evidenceQuality: { weight: record.performanceWeight || 0.4 },
    }, record);
  const commanders = [
    ...(record.commanders || []).map((c) => (typeof c === "string" ? c : c.name)),
    ...(topology.commanders || []),
  ].filter(Boolean);

  const nodes = (topology.nodes || []).map((node) => createPlanNode({
    id: node.name,
    name: node.name,
    kind: classifyKind(node, commanders),
    roles: node.roles,
    sequenceStages: node.sequenceStages,
    planConnected: node.planConnected,
    isolated: node.isolated,
    multifunction: node.multifunction,
    cmc: node.cmc,
  }));

  // Ensure commanders exist as nodes even if topology omitted them.
  for (const name of commanders) {
    if (nodes.some((n) => n.name === name)) continue;
    nodes.push(createPlanNode({
      id: name,
      name,
      kind: "commander",
      planConnected: true,
      isolated: false,
    }));
  }

  const edges = (topology.edges || [])
    .filter((e) => e.type !== "commonly_cooccurs")
    .slice(0, 200)
    .map((e) => createPlanEdge({
      from: e.from,
      to: e.to,
      kind: mapEdgeKind(e.type),
      strength: e.strength || (e.semanticSupport ? "strong" : "weak"),
    }));

  const pathways = pathwayFromStages(nodes);
  const planA = freeze({
    id: "plan_a",
    label: "Primary convert/close path",
    nodeIds: freeze([
      ...pathways.setup.slice(0, 6),
      ...pathways.convert.slice(0, 6),
      ...pathways.close.slice(0, 6),
    ]),
  });
  const recovery = freeze({
    id: "recovery",
    label: "Recovery / restabilize path",
    nodeIds: freeze([
      ...pathways.recover.slice(0, 8),
      ...pathways.stabilize.slice(0, 8),
    ]),
  });
  const closing = freeze({
    id: "closing",
    label: "Closing path",
    nodeIds: freeze(pathways.close.slice(0, 10)),
  });

  return createPlanGraph({
    deckId: record.id || topology.deckId || null,
    commanders,
    nodes,
    edges,
    plans: { planA, recovery, closing },
  });
}

export function summarizePlanGraph(graph = {}) {
  const nodes = graph.nodes || [];
  const byKind = {};
  for (const node of nodes) {
    byKind[node.kind] = (byKind[node.kind] || 0) + 1;
  }
  return freeze({
    deckId: graph.deckId,
    nodeCount: nodes.length,
    edgeCount: (graph.edges || []).length,
    byKind: freeze(byKind),
    planConnectedRatio: nodes.length
      ? Number((nodes.filter((n) => n.planConnected).length / nodes.length).toFixed(3))
      : 0,
    isolatedRatio: nodes.length
      ? Number((nodes.filter((n) => n.isolated).length / nodes.length).toFixed(3))
      : 0,
  });
}
