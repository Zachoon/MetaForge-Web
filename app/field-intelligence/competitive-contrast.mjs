// =============================================================================
// Field Intelligence — Competitive Contrast Analysis
// =============================================================================
// Same event / same commander family: high placers vs low placers.
// Separates meta popularity from performance-associated structure.
// Correlation ≠ causation — results are flagged as associative evidence only.
// =============================================================================

import { isHighPerformerRecord } from "./comparable-cohorts.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function isHighPerformer(record) {
  return isHighPerformerRecord(record);
}

function packageLegSnapshot(analysis) {
  const out = {};
  for (const pkg of analysis.packages || []) {
    out[`${pkg.id}::core`] = pkg.density?.core ?? 0;
    for (const [leg, state] of Object.entries(pkg.legs || {})) {
      out[`${pkg.id}::${leg}`] = state.current ?? 0;
    }
  }
  return out;
}

function roleSnapshot(analysis) {
  return { ...(analysis.roleDistribution || {}) };
}

function cardFrequency(analyses, recordsById) {
  const counts = new Map();
  for (const analysis of analyses) {
    const record = recordsById.get(analysis.deckId);
    if (!record) continue;
    for (const row of record.rows || []) {
      if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) continue;
      const key = String(row.name);
      counts.set(key, (counts.get(key) || 0) + (Number(row.quantity) || 1));
    }
  }
  return counts;
}

/**
 * Build CompetitiveContrastAnalysis for one event (or commander cohort).
 */
export function buildCompetitiveContrastAnalysis({
  eventId = null,
  commanderFamily = null,
  records = [],
  analyses = [],
  prefiltered = false,
  cohortLevel = null,
  cohortConfidence = null,
} = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const recordsById = new Map(records.map((r) => [r.id, r]));
  const cohort = records.filter((record) => {
    if (!analysisById.has(record.id)) return false;
    if (prefiltered) return true;
    if (eventId && record.eventId !== eventId) return false;
    if (commanderFamily) {
      const names = (record.commanders || []).map((c) => c.name).join(" / ");
      const familyId = analysisById.get(record.id)?.commanderFamily?.familyId;
      const identity = analysisById.get(record.id)?.commanderFamily?.identityKey;
      if (
        names !== commanderFamily
        && !names.includes(commanderFamily)
        && !(record.archetypeTags || []).includes(commanderFamily)
        && familyId !== commanderFamily
        && identity !== commanderFamily
      ) {
        return false;
      }
    }
    return true;
  });

  const high = cohort.filter(isHighPerformer);
  const low = cohort.filter((record) => !isHighPerformer(record));
  const highAnalyses = high.map((r) => analysisById.get(r.id)).filter(Boolean);
  const lowAnalyses = low.map((r) => analysisById.get(r.id)).filter(Boolean);

  const featureKeys = new Set();
  const highFeatures = highAnalyses.map((a) => {
    const snap = { ...packageLegSnapshot(a), ...roleSnapshot(a), cohesion: a.cohesion?.passed ? 1 : 0, weakRatio: a.justification?.slotCount ? a.justification.weaklyJustifiedCount / a.justification.slotCount : 0 };
    Object.keys(snap).forEach((k) => featureKeys.add(k));
    return snap;
  });
  const lowFeatures = lowAnalyses.map((a) => {
    const snap = { ...packageLegSnapshot(a), ...roleSnapshot(a), cohesion: a.cohesion?.passed ? 1 : 0, weakRatio: a.justification?.slotCount ? a.justification.weaklyJustifiedCount / a.justification.slotCount : 0 };
    Object.keys(snap).forEach((k) => featureKeys.add(k));
    return snap;
  });

  const structuralDeltas = [...featureKeys].map((key) => {
    const highMean = mean(highFeatures.map((f) => Number(f[key]) || 0));
    const lowMean = mean(lowFeatures.map((f) => Number(f[key]) || 0));
    return freeze({
      feature: key,
      highMean: round(highMean),
      lowMean: round(lowMean),
      delta: round(highMean - lowMean),
      interpretation: "associative_not_causal",
    });
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.feature.localeCompare(b.feature));

  const highCards = cardFrequency(highAnalyses, recordsById);
  const lowCards = cardFrequency(lowAnalyses, recordsById);
  const allCards = new Set([...highCards.keys(), ...lowCards.keys()]);
  const cardDeltas = [...allCards].map((card) => {
    const highRate = high.length ? (highCards.get(card) || 0) / high.length : 0;
    const lowRate = low.length ? (lowCards.get(card) || 0) / low.length : 0;
    const everyoneRate = cohort.length
      ? ((highCards.get(card) || 0) + (lowCards.get(card) || 0)) / cohort.length
      : 0;
    return freeze({
      card,
      highRate: round(highRate),
      lowRate: round(lowRate),
      everyoneRate: round(everyoneRate),
      performanceLift: round(highRate - lowRate),
      // Popular across everyone vs disproportionately in converters.
      merelyPopular: everyoneRate >= 0.6 && Math.abs(highRate - lowRate) < 0.15,
      conversionAssociated: highRate - lowRate >= 0.25 && highRate >= 0.4,
      interpretation: "associative_not_causal",
    });
  }).sort((a, b) => b.performanceLift - a.performanceLift || a.card.localeCompare(b.card));

  return freeze({
    version: "competitive-contrast-v1",
    eventId,
    commanderFamily,
    cohortLevel,
    cohortConfidence,
    cohortSize: cohort.length,
    highPerformers: high.length,
    lowPerformers: low.length,
    structuralDeltas: freeze(structuralDeltas.slice(0, 24)),
    cardDeltas: freeze(cardDeltas.slice(0, 40)),
    conversionAssociatedCards: freeze(cardDeltas.filter((row) => row.conversionAssociated).slice(0, 20)),
    merelyPopularCards: freeze(cardDeltas.filter((row) => row.merelyPopular).slice(0, 20)),
    caveats: freeze([
      "correlation_does_not_imply_causation",
      "sample_size_limits_confidence",
      "do_not_copy_modal_99_from_converters",
    ]),
  });
}

/**
 * Contrast across all events that have both high and low placers.
 */
export function buildAllCompetitiveContrasts(records = [], analyses = []) {
  const byEvent = new Map();
  for (const record of records) {
    if (!record.eventId) continue;
    byEvent.set(record.eventId, (byEvent.get(record.eventId) || 0) + 1);
  }
  const contrasts = [];
  for (const eventId of byEvent.keys()) {
    const contrast = buildCompetitiveContrastAnalysis({ eventId, records, analyses });
    if (contrast.highPerformers > 0 && contrast.lowPerformers > 0) contrasts.push(contrast);
  }

  // Commander-family contrasts (placement differences for same commander).
  const byCommander = new Map();
  for (const record of records) {
    const key = (record.commanders || []).map((c) => c.name).sort().join(" / ");
    if (!key) continue;
    byCommander.set(key, (byCommander.get(key) || []).concat([record]));
  }
  for (const [commanderFamily, cohort] of byCommander) {
    if (cohort.length < 4) continue;
    const high = cohort.filter(isHighPerformer).length;
    const low = cohort.length - high;
    if (high < 1 || low < 1) continue;
    contrasts.push(buildCompetitiveContrastAnalysis({
      commanderFamily,
      records: cohort,
      analyses,
    }));
  }

  return freeze(contrasts);
}
