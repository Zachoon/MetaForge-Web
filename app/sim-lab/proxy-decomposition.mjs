// =============================================================================
// Academy — Proxy Decomposition
// Interaction count doesn't win — it reveals Strategic Coverage.
// =============================================================================
// Observation only. writesToBrain: false. Not Sim-Lab-002. Not Brain.
// =============================================================================

import { deriveTopologyMetrics } from "../field-intelligence/topology-metrics.mjs";
import { buildDeckStrategicTopology } from "../field-intelligence/strategic-topology.mjs";
import { buildPlanGraphFromDeck } from "./plan-graph.mjs";
import { baselineResilience } from "./recovery.mjs";

const freeze = (value) => Object.freeze(value);

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let used = 0;
  for (let i = 0; i < n; i += 1) {
    const x = Number(xs[i]);
    const y = Number(ys[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    used += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  if (used < 3) return null;
  const num = used * sxy - sx * sy;
  const den = Math.sqrt((used * sxx - sx * sx) * (used * syy - sy * sy));
  if (!den) return 0;
  return Number((num / den).toFixed(4));
}

function mean(values = []) {
  const xs = values.filter((v) => Number.isFinite(Number(v))).map(Number);
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Partial correlation r(X,Y|Z) via residuals.
 */
function partialPearson(xs, ys, zs) {
  const n = Math.min(xs.length, ys.length, zs.length);
  if (n < 4) return null;
  const rxy = pearson(xs, ys);
  const rxz = pearson(xs, zs);
  const ryz = pearson(ys, zs);
  if (rxy == null || rxz == null || ryz == null) return null;
  const den = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  if (!den) return null;
  return Number(((rxy - rxz * ryz) / den).toFixed(4));
}

function roleEntropy(nodes = []) {
  const counts = new Map();
  let total = 0;
  for (const node of nodes) {
    for (const role of node.roles || []) {
      counts.set(role, (counts.get(role) || 0) + 1);
      total += 1;
    }
  }
  if (!total) return 0;
  let h = 0;
  for (const c of counts.values()) {
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return Number(h.toFixed(3));
}

function uniqueRoleCount(nodes = []) {
  const roles = new Set();
  for (const node of nodes) {
    for (const role of node.roles || []) roles.add(role);
  }
  return roles.size;
}

function kindCounts(nodes = []) {
  const counts = {};
  for (const node of nodes) {
    counts[node.kind] = (counts[node.kind] || 0) + 1;
  }
  return counts;
}

/**
 * Candidate latent variables that interaction count may be proxying.
 */
export function extractProxyCandidates(record, analysis) {
  const graph = buildPlanGraphFromDeck(record, analysis);
  const topology = analysis
    ? buildDeckStrategicTopology(analysis, record)
    : buildDeckStrategicTopology({
      commanders: (record.commanders || []).map((c) => (typeof c === "string" ? c : c.name)),
      annotatedRows: record.rows || [],
      packages: [],
      interactionGraph: {},
      evidenceQuality: { weight: record.performanceWeight || 0.4 },
    }, record);
  const metrics = deriveTopologyMetrics(topology);
  const resilience = baselineResilience(graph);
  const seats = ["commander", "engine", "payoff", "tutor", "protection", "recovery"];
  const meanRecoveryP = mean(seats.map((s) => resilience.byKind[s]?.recoveryProbability || 0));
  const nodes = graph.nodes || [];
  const kinds = kindCounts(nodes);
  const disruption = kinds.disruption || 0;
  const protection = kinds.protection || 0;
  const recovery = kinds.recovery || 0;
  const multifunctionNodes = nodes.filter((n) => n.multifunction).length;
  const planConnectedNodes = nodes.filter((n) => n.planConnected).length;
  const interactive = Math.max(1, metrics.interactiveCardCount || nodes.length);

  return freeze({
    deckId: record.id,
    eventId: record.eventId || null,
    performanceClass: record.performanceClass || "unset",
    meanRecoveryProbability: Number(meanRecoveryP.toFixed(3)),
    interactionCount: metrics.interactiveCardCount || nodes.length,
    candidates: freeze({
      // Quantity / coverage family
      interactionCount: metrics.interactiveCardCount || nodes.length,
      disruptionSeatCount: disruption,
      protectionSeatCount: protection,
      recoverySeatCount: recovery,
      lowCmcInteractionCoverage: metrics.lowCmcInteractionCoverage || 0,
      // Optionality / redundancy / flexibility
      interactionRedundancy: metrics.interactionRedundancy || 0,
      interactionDiversity: metrics.interactionDiversity || 0,
      multifunctionRatio: metrics.multifunctionInteractionRatio || 0,
      multifunctionCount: multifunctionNodes,
      roleEntropy: roleEntropy(nodes),
      uniqueRoleCount: uniqueRoleCount(nodes),
      // Topology family (current abstraction)
      planConnectedRatio: metrics.planConnectedInteractionRatio || 0,
      meaningfulEdgeDensity: metrics.meaningfulEdgeDensity || 0,
      isolatedRatio: metrics.isolatedInteractiveRatio || 0,
      deadNarrowInteractionRisk: metrics.deadNarrowInteractionRisk || 0,
      meanStrategicDegree: metrics.meanStrategicDegree || 0,
      planConnectedCount: planConnectedNodes,
      // Protection / sequence coverage
      commanderProtectionCoverage: metrics.commanderProtectionCoverage || 0,
      engineProtectionCoverage: metrics.engineProtectionCoverage || 0,
      winSequenceProtectionCoverage: metrics.winSequenceProtectionCoverage || 0,
      // Graph size controls
      nodeCount: nodes.length,
      strongEdgeCount: metrics.strongEdgeCount || 0,
      interactiveDenom: interactive,
    }),
    writesToBrain: false,
  });
}

/**
 * Academy Proxy Decomposition report.
 * Finds which candidates (a) correlate with recovery, (b) correlate with interaction count,
 * (c) retain recovery signal after partialling out interaction count.
 */
export function runProxyDecomposition(records = [], options = {}) {
  const analyses = options.analyses || [];
  const byId = new Map(analyses.map((a) => [a.deckId, a]));
  const rows = records.map((record) => extractProxyCandidates(record, byId.get(record.id) || null));

  const y = rows.map((r) => r.meanRecoveryProbability);
  const ix = rows.map((r) => r.interactionCount);
  const names = Object.keys(rows[0]?.candidates || {});

  const table = names.map((name) => {
    const xs = rows.map((r) => r.candidates[name]);
    const withRecovery = pearson(xs, y);
    const withInteraction = pearson(xs, ix);
    const recoveryGivenInteraction = partialPearson(xs, y, ix);
    const interactionGivenCandidate = partialPearson(ix, y, xs);
    return freeze({
      variable: name,
      corrWithRecovery: withRecovery,
      corrWithInteractionCount: withInteraction,
      // Survives after removing interaction-count variance?
      partialCorrRecoveryGivenIx: recoveryGivenInteraction,
      // Does interaction count still predict recovery after removing this variable?
      partialCorrIxGivenVariable: interactionGivenCandidate,
      absRecovery: Math.abs(withRecovery || 0),
      proxyScore: Number((
        Math.abs(withRecovery || 0) * 0.45
        + Math.abs(withInteraction || 0) * 0.25
        + Math.max(0, Math.abs(recoveryGivenInteraction || 0)) * 0.30
      ).toFixed(4)),
    });
  }).sort((a, b) => b.proxyScore - a.proxyScore);

  const latentLeads = table.filter((row) => (
    row.variable !== "interactionCount"
    && (row.corrWithRecovery || 0) > 0.15
    && (row.partialCorrRecoveryGivenIx || 0) > 0.08
  ));

  const pureProxies = table.filter((row) => (
    row.variable !== "interactionCount"
    && Math.abs(row.corrWithInteractionCount || 0) > 0.35
    && (row.corrWithRecovery || 0) > 0.15
    && Math.abs(row.partialCorrRecoveryGivenIx || 0) < 0.08
  ));

  const topologyStillWeak = table.filter((row) => (
    ["planConnectedRatio", "meaningfulEdgeDensity", "isolatedRatio", "meanStrategicDegree"].includes(row.variable)
  ));

  const topNonCount = table.find((row) => row.variable !== "interactionCount") || null;
  const ixRow = table.find((row) => row.variable === "interactionCount");

  let primaryHypothesis = "insufficient_signal";
  if (latentLeads.length) {
    primaryHypothesis = `latent_lead:${latentLeads[0].variable}`;
  } else if (pureProxies.length) {
    primaryHypothesis = `interaction_count_proxies:${pureProxies[0].variable}`;
  } else if (topNonCount && (topNonCount.corrWithRecovery || 0) > (ixRow?.corrWithRecovery || 0)) {
    primaryHypothesis = `outperforms_count:${topNonCount.variable}`;
  } else {
    primaryHypothesis = "interaction_count_still_dominant_or_entangled";
  }

  return freeze({
    version: "proxy-decomposition-v0.1",
    paper: "Interaction Count Doesn't Win",
    paperSubtitle: "It Merely Reveals Strategic Coverage",
    academyConcept: "Strategic Coverage",
    question: "What information does interaction count contain that current topology throws away?",
    decksAnalyzed: rows.length,
    eventsRepresented: new Set(rows.map((r) => r.eventId).filter(Boolean)).size,
    corpusMode: options.corpusMode || "unspecified",
    syntheticFixtures: options.syntheticFixtures || null,
    interactionCountCorrWithRecovery: ixRow?.corrWithRecovery ?? null,
    rankedCandidates: freeze(table),
    latentLeads: freeze(latentLeads),
    pureProxiesOfInteractionCount: freeze(pureProxies),
    currentTopologySlice: freeze(topologyStillWeak),
    primaryHypothesis,
    openQuestions: freeze([
      "Is interaction count encoding answer optionality / redundancy rather than 'more interaction'?",
      "Which latent lead survives Level-A same-commander deltas?",
      "Can a new representation beat interaction count without collapsing back into quantity?",
    ]),
    recommendation: freeze({
      promoteToBrain: false,
      runSimLab002: false,
      next: "Strategic Coverage Project (Academy): which capabilities remain predictive after controlling for commander, archetype, and interaction count; multidimensional profiles — not a single coverageScore; then Laboratory with a new representation.",
    }),
    writesToBrain: false,
    constructionMutated: false,
    generatedAt: new Date().toISOString(),
  });
}
