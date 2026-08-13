// =============================================================================
// Sim-Lab-001 — Topology vs interaction-count recovery explanation
// =============================================================================
// Isolated experiment. writesToBrain: false. Never promoteToBrain.
// =============================================================================

import { deriveTopologyMetrics } from "../../field-intelligence/topology-metrics.mjs";
import { buildDeckStrategicTopology } from "../../field-intelligence/strategic-topology.mjs";
import { normalizeCommanderIdentity } from "../../field-intelligence/level-a-forensics.mjs";
import { buildPlanGraphFromDeck } from "../plan-graph.mjs";
import { baselineResilience } from "../recovery.mjs";
import { SIM_LAB_VERSION, assertSandboxInvariants } from "../schema.mjs";

const freeze = (value) => Object.freeze(value);
const SEATS = Object.freeze([
  "commander",
  "engine",
  "payoff",
  "tutor",
  "protection",
  "recovery",
]);

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

function topologyOf(record, analysis) {
  if (analysis) return buildDeckStrategicTopology(analysis, record);
  return buildDeckStrategicTopology({
    commanders: (record.commanders || []).map((c) => (typeof c === "string" ? c : c.name)),
    annotatedRows: record.rows || [],
    packages: [],
    interactionGraph: {},
    evidenceQuality: { weight: record.performanceWeight || 0.4 },
  }, record);
}

function topologyComposite(metrics = {}) {
  return Number((
    (metrics.planConnectedInteractionRatio || 0) * 0.35
    + (metrics.meaningfulEdgeDensity || 0) * 0.35
    + (1 - (metrics.isolatedInteractiveRatio || 0)) * 0.15
    + (metrics.commanderProtectionCoverage || 0) * 0.15
  ).toFixed(3));
}

function evaluateDeck(record, analysis) {
  const graph = buildPlanGraphFromDeck(record, analysis);
  const topology = topologyOf(record, analysis);
  const metrics = deriveTopologyMetrics(topology);
  const resilience = baselineResilience(graph);
  const bySeat = {};
  for (const seat of SEATS) {
    bySeat[seat] = freeze({
      recoveryProbability: resilience.byKind[seat]?.recoveryProbability ?? 0,
      recoveryDistance: resilience.byKind[seat]?.recoveryDistance ?? 0,
      recoveryCost: resilience.byKind[seat]?.recoveryCost ?? 0,
      recoveryBranchCount: resilience.byKind[seat]?.recoveryBranchCount ?? 0,
      recoverable: resilience.byKind[seat]?.recoverable ?? false,
      missingKinds: freeze([...(resilience.byKind[seat]?.missingKinds || [])]),
      remainingSupport: freeze([...(resilience.byKind[seat]?.remainingSupport || [])].slice(0, 8)),
    });
  }
  const recoveryPs = SEATS.map((seat) => bySeat[seat].recoveryProbability);
  return freeze({
    deckId: record.id,
    eventId: record.eventId || null,
    commanders: freeze([...(graph.commanders || [])]),
    commanderIdentity: normalizeCommanderIdentity(record.commanders || graph.commanders || []),
    performanceClass: record.performanceClass || "unset",
    meanRecoveryProbability: Number(mean(recoveryPs).toFixed(3)),
    meanRecoveryDistance: Number(mean(SEATS.map((s) => bySeat[s].recoveryDistance)).toFixed(3)),
    meanRecoveryBranches: Number(mean(SEATS.map((s) => bySeat[s].recoveryBranchCount)).toFixed(3)),
    bySeat: freeze(bySeat),
    predictors: freeze({
      interactionCount: metrics.interactiveCardCount || (graph.nodes || []).length,
      planConnectedRatio: metrics.planConnectedInteractionRatio,
      meaningfulEdgeDensity: metrics.meaningfulEdgeDensity,
      isolatedRatio: metrics.isolatedInteractiveRatio,
      commanderProtectionCoverage: metrics.commanderProtectionCoverage,
      engineProtectionCoverage: metrics.engineProtectionCoverage,
      topologyComposite: topologyComposite(metrics),
    }),
    writesToBrain: false,
  });
}

function correlationsFor(rows, yKey = "meanRecoveryProbability") {
  const y = rows.map((r) => r[yKey]);
  return freeze({
    n: rows.length,
    interactionCount: pearson(rows.map((r) => r.predictors.interactionCount), y),
    planConnectedRatio: pearson(rows.map((r) => r.predictors.planConnectedRatio), y),
    meaningfulEdgeDensity: pearson(rows.map((r) => r.predictors.meaningfulEdgeDensity), y),
    isolatedRatio: pearson(rows.map((r) => r.predictors.isolatedRatio), y),
    topologyComposite: pearson(rows.map((r) => r.predictors.topologyComposite), y),
  });
}

function winner(corr) {
  const t = corr?.topologyComposite;
  const i = corr?.interactionCount;
  if (t == null || i == null) return "insufficient";
  if (t > i + 0.05) return "topology";
  if (i > t + 0.05) return "interaction_count";
  return "tie";
}

function stratify(rows) {
  const classes = ["repeated_converter", "single_event_converter", "tournament_participant"];
  const out = {};
  for (const cls of classes) {
    const subset = rows.filter((r) => r.performanceClass === cls);
    const corr = correlationsFor(subset);
    out[cls] = freeze({
      n: subset.length,
      meanRecoveryProbability: Number(mean(subset.map((r) => r.meanRecoveryProbability)).toFixed(3)),
      correlations: corr,
      explainsBetter: winner(corr),
    });
  }
  return freeze(out);
}

function perSeatExplanations(rows) {
  const out = {};
  for (const seat of SEATS) {
    const y = rows.map((r) => r.bySeat[seat]?.recoveryProbability ?? 0);
    const corr = freeze({
      interactionCount: pearson(rows.map((r) => r.predictors.interactionCount), y),
      topologyComposite: pearson(rows.map((r) => r.predictors.topologyComposite), y),
      planConnectedRatio: pearson(rows.map((r) => r.predictors.planConnectedRatio), y),
      meaningfulEdgeDensity: pearson(rows.map((r) => r.predictors.meaningfulEdgeDensity), y),
    });
    out[seat] = freeze({
      correlations: corr,
      explainsBetter: winner(corr),
      meanRecoveryProbability: Number(mean(y).toFixed(3)),
    });
  }
  return freeze(out);
}

function isHighPerformer(record) {
  if (record.performanceClass === "repeated_converter" || record.performanceClass === "single_event_converter") {
    return true;
  }
  if (record.topCut === true) return true;
  if (Number.isFinite(record.placement) && record.placement > 0 && record.placement <= 4) return true;
  return false;
}

/**
 * Level-A: same commander + same event — does topology delta explain recovery delta?
 */
function levelARecoveryCohorts(records, rowById) {
  const groups = new Map();
  for (const record of records) {
    const identity = normalizeCommanderIdentity(record.commanders || []);
    const eventId = record.eventId;
    if (!identity || !eventId) continue;
    const key = `${eventId}::${identity}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const cohorts = [];
  for (const [key, cohortRecords] of groups) {
    const high = cohortRecords.filter((r) => isHighPerformer(r));
    const low = cohortRecords.filter((r) => !isHighPerformer(r));
    if (high.length < 1 || low.length < 1) continue;
    const highRows = high.map((r) => rowById.get(r.id)).filter(Boolean);
    const lowRows = low.map((r) => rowById.get(r.id)).filter(Boolean);
    if (!highRows.length || !lowRows.length) continue;

    const deltaRecovery = mean(highRows.map((r) => r.meanRecoveryProbability))
      - mean(lowRows.map((r) => r.meanRecoveryProbability));
    const deltaTopology = mean(highRows.map((r) => r.predictors.topologyComposite))
      - mean(lowRows.map((r) => r.predictors.topologyComposite));
    const deltaInteraction = mean(highRows.map((r) => r.predictors.interactionCount))
      - mean(lowRows.map((r) => r.predictors.interactionCount));

    const seatDeltas = {};
    for (const seat of SEATS) {
      seatDeltas[seat] = Number((
        mean(highRows.map((r) => r.bySeat[seat]?.recoveryProbability ?? 0))
        - mean(lowRows.map((r) => r.bySeat[seat]?.recoveryProbability ?? 0))
      ).toFixed(3));
    }

    const [eventId, commanderIdentity] = key.split("::");
    cohorts.push(freeze({
      eventId,
      commanderIdentity,
      highCount: highRows.length,
      lowCount: lowRows.length,
      deltaRecoveryProbability: Number(deltaRecovery.toFixed(3)),
      deltaTopologyComposite: Number(deltaTopology.toFixed(3)),
      deltaInteractionCount: Number(deltaInteraction.toFixed(3)),
      topologyAgreesWithRecovery: Math.sign(deltaRecovery) === Math.sign(deltaTopology) && deltaRecovery !== 0,
      interactionAgreesWithRecovery: Math.sign(deltaRecovery) === Math.sign(deltaInteraction) && deltaRecovery !== 0,
      seatRecoveryDeltas: freeze(seatDeltas),
    }));
  }

  const usable = cohorts.filter((c) => c.highCount >= 1 && c.lowCount >= 1);
  const topoAgree = usable.filter((c) => c.topologyAgreesWithRecovery).length;
  const ixAgree = usable.filter((c) => c.interactionAgreesWithRecovery).length;
  const deltaCorr = freeze({
    topologyVsRecoveryDelta: pearson(
      usable.map((c) => c.deltaTopologyComposite),
      usable.map((c) => c.deltaRecoveryProbability),
    ),
    interactionVsRecoveryDelta: pearson(
      usable.map((c) => c.deltaInteractionCount),
      usable.map((c) => c.deltaRecoveryProbability),
    ),
  });

  return freeze({
    usableCohorts: usable.length,
    topologyAgreementRate: usable.length ? Number((topoAgree / usable.length).toFixed(3)) : null,
    interactionAgreementRate: usable.length ? Number((ixAgree / usable.length).toFixed(3)) : null,
    deltaCorrelations: deltaCorr,
    explainsBetter: winner({
      topologyComposite: deltaCorr.topologyVsRecoveryDelta,
      interactionCount: deltaCorr.interactionVsRecoveryDelta,
    }),
    cohorts: freeze(usable.slice(0, 40)),
  });
}

function familyEffects(rows) {
  const byFamily = new Map();
  for (const row of rows) {
    const key = row.commanderIdentity || "unknown";
    if (!byFamily.has(key)) byFamily.set(key, []);
    byFamily.get(key).push(row);
  }
  const families = [];
  for (const [commanderIdentity, subset] of byFamily) {
    if (subset.length < 4) continue;
    const corr = correlationsFor(subset);
    families.push(freeze({
      commanderIdentity,
      n: subset.length,
      meanRecoveryProbability: Number(mean(subset.map((r) => r.meanRecoveryProbability)).toFixed(3)),
      correlations: corr,
      explainsBetter: winner(corr),
    }));
  }
  families.sort((a, b) => b.n - a.n);
  const topoFamilies = families.filter((f) => f.explainsBetter === "topology").length;
  const ixFamilies = families.filter((f) => f.explainsBetter === "interaction_count").length;
  return freeze({
    familiesWithNge4: families.length,
    topologyPreferredFamilies: topoFamilies,
    interactionPreferredFamilies: ixFamilies,
    transferClass: topoFamilies > 0 && ixFamilies > 0
      ? "mixed"
      : topoFamilies > ixFamilies
        ? "topology_leaning"
        : ixFamilies > topoFamilies
          ? "interaction_leaning"
          : "insufficient",
    top: freeze(families.slice(0, 12)),
  });
}

function deriveVerdict({ overall, levelA, stratified, fixtureBaseline }) {
  const overallWinner = winner(overall);
  const levelAWinner = levelA?.explainsBetter || "insufficient";
  const converter = stratified?.repeated_converter?.explainsBetter;

  let liveLabel = "inconclusive";
  if (overallWinner === "topology" && (levelAWinner === "topology" || levelAWinner === "tie" || levelAWinner === "insufficient")) {
    liveLabel = "supports_topology";
  } else if (overallWinner === "interaction_count" && levelAWinner === "interaction_count") {
    liveLabel = "rejects_topology";
  } else if (overallWinner === "topology" && levelAWinner === "interaction_count") {
    liveLabel = "mixed";
  } else if (overallWinner === "interaction_count" && levelAWinner === "topology") {
    liveLabel = "mixed";
  } else if (overallWinner === "tie" || overallWinner === "insufficient") {
    liveLabel = "inconclusive";
  } else if (overallWinner === "topology") {
    liveLabel = "supports_topology";
  } else if (overallWinner === "interaction_count") {
    liveLabel = "rejects_topology";
  }

  const fixtureFlipped = Boolean(
    fixtureBaseline
    && fixtureBaseline.topologyExplainsRecoveryBetter === false
    && liveLabel === "supports_topology",
  );
  const fixtureSurvived = Boolean(
    fixtureBaseline
    && fixtureBaseline.topologyExplainsRecoveryBetter === false
    && (liveLabel === "rejects_topology" || liveLabel === "inconclusive" || liveLabel === "mixed"),
  );

  return freeze({
    label: liveLabel,
    overallWinner,
    levelAWinner,
    repeatedConverterWinner: converter || null,
    fixtureNegativeSurvived: fixtureSurvived,
    fixtureNegativeFlipped: fixtureFlipped,
  });
}

/**
 * Run Sim-Lab-001.
 * @param {object[]} records corpus deck records
 * @param {object} options analyses, corpusMode, fixtureBaseline, persistRows
 */
export function runSimLab001(records = [], options = {}) {
  const analyses = options.analyses || [];
  const byAnalysis = new Map(analyses.map((a) => [a.deckId, a]));
  const rows = records.map((record) => evaluateDeck(record, byAnalysis.get(record.id) || null));
  const rowById = new Map(rows.map((r) => [r.deckId, r]));

  const overall = correlationsFor(rows);
  const stratified = stratify(rows);
  const seatExplanations = perSeatExplanations(rows);
  const levelA = levelARecoveryCohorts(records, rowById);
  const families = familyEffects(rows);
  const events = new Set(rows.map((r) => r.eventId).filter(Boolean));

  const contradictions = [];
  if (winner(overall) === "topology" && levelA.explainsBetter === "interaction_count") {
    contradictions.push("Overall topology correlation wins, but Level-A recovery deltas favor interaction count.");
  }
  if (winner(overall) === "interaction_count" && levelA.explainsBetter === "topology") {
    contradictions.push("Overall interaction count wins, but controlled Level-A deltas favor topology.");
  }
  if (stratified.repeated_converter?.explainsBetter === "topology"
    && stratified.tournament_participant?.explainsBetter === "interaction_count") {
    contradictions.push("Repeated converters favor topology; participants favor interaction count.");
  }
  for (const [seat, info] of Object.entries(seatExplanations)) {
    if (info.explainsBetter === "interaction_count" && winner(overall) === "topology") {
      contradictions.push(`Seat ${seat}: interaction count explains recovery better than topology.`);
    }
  }

  const verdict = deriveVerdict({
    overall,
    levelA,
    stratified,
    fixtureBaseline: options.fixtureBaseline || null,
  });

  const topologyWinsGlobal = verdict.label === "supports_topology";

  const report = freeze({
    version: "sim-lab-001-v0.2",
    simLabVersion: SIM_LAB_VERSION,
    experimentId: "Sim-Lab-001",
    question: "Does plan topology explain strategic resilience better than simply counting interaction?",
    corpusMode: options.corpusMode || "unspecified",
    syntheticFixtures: options.syntheticFixtures || null,
    decksAnalyzed: rows.length,
    eventsRepresented: events.size,
    seatsProbed: SEATS,
    correlationsWithMeanRecoveryProbability: overall,
    overallExplainsBetter: winner(overall),
    stratifiedByPerformanceClass: stratified,
    nodeRemovalClassExplanations: seatExplanations,
    levelARecovery: levelA,
    commanderFamilyEffects: families,
    crossFamilyTransfer: freeze({
      class: families.transferClass,
      topologyPreferredFamilies: families.topologyPreferredFamilies,
      interactionPreferredFamilies: families.interactionPreferredFamilies,
    }),
    contradictions: freeze(contradictions),
    fixtureComparison: freeze({
      fixtureTopologyWon: options.fixtureBaseline?.topologyExplainsRecoveryBetter ?? null,
      fixtureNegativeSurvived: verdict.fixtureNegativeSurvived,
      fixtureNegativeFlipped: verdict.fixtureNegativeFlipped,
    }),
    topologyExplainsRecoveryBetter: topologyWinsGlobal,
    verdict: verdict.label,
    verdictDetail: verdict,
    recommendation: freeze({
      promoteToBrain: false,
      runValidationHarness: false,
      next: verdict.label === "supports_topology"
        ? "Replication on a second live window / source — still no Brain write, no Harness promotion request."
        : "Do not promote. Optionally refine plan-graph seat labeling or expand Level-A sample — still no Brain write.",
    }),
    rows: freeze(rows.slice(0, options.persistRows === false ? 0 : Math.min(rows.length, options.maxPersistRows || rows.length))),
    writesToBrain: false,
    constructionMutated: false,
    generatedAt: new Date().toISOString(),
  });

  assertSandboxInvariants(report);
  return report;
}
