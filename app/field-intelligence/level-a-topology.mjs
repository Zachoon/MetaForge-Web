// =============================================================================
// Field Intelligence v1.3 — Level-A topology comparisons
// =============================================================================
// Same commander + same event only. Observation only.
// =============================================================================

import { normalizeCommanderIdentity, isHighPerformer } from "./level-a-forensics.mjs";
import { deriveTopologyMetrics } from "./topology-metrics.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

const METRIC_KEYS = Object.freeze([
  "meaningfulEdgeDensity",
  "isolatedInteractiveRatio",
  "multifunctionInteractionRatio",
  "planConnectedInteractionRatio",
  "winSequenceProtectionCoverage",
  "commanderProtectionCoverage",
  "engineProtectionCoverage",
  "interactionRedundancy",
  "interactionDiversity",
  "lowCmcInteractionCoverage",
  "deadNarrowInteractionRisk",
  "meanStrategicDegree",
  "strongEdgeCount",
]);

function metricsByDeckId(topologies = [], metrics = null) {
  const derived = metrics || topologies.map((t) => deriveTopologyMetrics(t));
  const map = new Map();
  for (const row of derived) {
    if (row.deckId) map.set(row.deckId, row);
  }
  return map;
}

/**
 * Compare topology metrics within one Level-A cohort.
 */
export function compareLevelATopology(cohortRecords = [], topologies = [], options = {}) {
  const metricsMap = metricsByDeckId(topologies, options.metrics);
  const high = [];
  const low = [];
  for (const record of cohortRecords) {
    const metrics = metricsMap.get(record.id);
    if (!metrics) continue;
    if (isHighPerformer(record)) high.push(metrics);
    else low.push(metrics);
  }
  if (high.length < 1 || low.length < 1) {
    return freeze({
      usable: false,
      reason: "insufficient_high_low_with_topology",
      highCount: high.length,
      lowCount: low.length,
      deltas: freeze([]),
    });
  }

  const deltas = METRIC_KEYS.map((feature) => {
    const highMean = mean(high.map((m) => Number(m[feature]) || 0));
    const lowMean = mean(low.map((m) => Number(m[feature]) || 0));
    const delta = highMean - lowMean;
    const sampleSize = high.length + low.length;
    const confidence = round(Math.min(0.9, 0.35 + Math.log2(1 + sampleSize) * 0.12 + Math.min(0.25, Math.abs(delta) * 0.4)));
    return freeze({
      feature,
      highMean: round(highMean),
      lowMean: round(lowMean),
      delta: round(delta),
      sampleSize,
      confidence,
      direction: delta > 0.02 ? "high_greater" : delta < -0.02 ? "high_lesser" : "similar",
    });
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.confidence - a.confidence);

  return freeze({
    usable: true,
    highCount: high.length,
    lowCount: low.length,
    deltas: freeze(deltas),
    strongest: freeze(deltas.slice(0, 6)),
  });
}

/**
 * Build Level-A topology forensics across the corpus.
 * Grouping uses nested Maps (event -> commander identity).
 */
export function buildAllLevelATopology(records = [], topologies = [], options = {}) {
  const metrics = options.metrics || topologies.map((t) => deriveTopologyMetrics(t));
  const byEventCommander = new Map();
  for (const record of records) {
    if (!record.eventId) continue;
    const identity = normalizeCommanderIdentity(record.commanders);
    if (!identity) continue;
    if (!byEventCommander.has(record.eventId)) byEventCommander.set(record.eventId, new Map());
    const byIdentity = byEventCommander.get(record.eventId);
    byIdentity.set(identity, (byIdentity.get(identity) || []).concat([record]));
  }

  const cohorts = [];
  for (const [eventId, byIdentity] of byEventCommander) {
    for (const [commanderIdentity, cohort] of byIdentity) {
      const high = cohort.filter(isHighPerformer).length;
      const low = cohort.length - high;
      if (cohort.length < 2 || high < 1 || low < 1) continue;
      const comparison = compareLevelATopology(cohort, topologies, { metrics });
      if (!comparison.usable) continue;
      cohorts.push(freeze({
        level: "A",
        eventId,
        commanderIdentity,
        highCount: high,
        lowCount: low,
        cohortSize: cohort.length,
        ...comparison,
      }));
    }
  }

  cohorts.sort((a, b) => {
    const aTop = Math.abs(a.strongest?.[0]?.delta || 0);
    const bTop = Math.abs(b.strongest?.[0]?.delta || 0);
    return bTop - aTop || b.cohortSize - a.cohortSize;
  });

  return freeze({
    version: "level-a-topology-v1",
    usableCohorts: cohorts.length,
    cohorts: freeze(cohorts),
    kraumTymnaFocus: freeze(
      cohorts.filter((c) => /kraum/i.test(c.commanderIdentity) && /tymna/i.test(c.commanderIdentity)),
    ),
    brainPolicyTouched: false,
  });
}
