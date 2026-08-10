// =============================================================================
// Field Intelligence v1.1 — Comparable competitive cohorts (A→D)
// =============================================================================
// Confidence decreases: same commander+event > family+event > family nearby > broad
// =============================================================================

import { buildCompetitiveContrastAnalysis } from "./competitive-contrast.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

const LEVEL_CONFIDENCE = Object.freeze({
  A: 1.0,
  B: 0.75,
  C: 0.5,
  D: 0.25,
});

function identityKey(record) {
  return (record.commanders || []).map((c) => c.name).sort((a, b) => a.localeCompare(b)).join(" / ");
}

function familyIdFrom(record, familyByDeckId) {
  return familyByDeckId.get(record.id)?.familyId
    || familyByDeckId.get(record.id)?.identityKey
    || null;
}

/**
 * High performer for Level-A/B contrasts.
 * Does NOT invent top-cut from placement alone when the source left cut unknown.
 */
export function isHighPerformerRecord(record) {
  if (record.topCut === true) return true;
  if (record.placement === 1) return true;
  if (Boolean(record.performance?.strongFinish)) return true;
  // Explicit cut size from the source: placements inside that cut are converters.
  if (
    Number.isFinite(record.topCutSize)
    && record.topCutSize > 0
    && Number.isFinite(record.placement)
    && record.placement > 0
    && record.placement <= record.topCutSize
  ) {
    return true;
  }
  return false;
}

/**
 * Build layered cohorts with decreasing confidence.
 * Grouping uses nested Maps — never reconstruct event/family from delimiter keys.
 */
export function buildComparableCohorts(records = [], analyses = [], familyResolution = null) {
  const familyByDeckId = new Map((familyResolution?.families || []).map((f) => [f.deckId, f]));
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const cohorts = [];

  // Level A — same commander, same event
  const byEventCommander = new Map(); // eventId -> Map(identity -> records[])
  for (const record of records) {
    if (!record.eventId || !analysisById.has(record.id)) continue;
    const identity = identityKey(record);
    if (!byEventCommander.has(record.eventId)) byEventCommander.set(record.eventId, new Map());
    const byIdentity = byEventCommander.get(record.eventId);
    byIdentity.set(identity, (byIdentity.get(identity) || []).concat([record]));
  }
  for (const [eventId, byIdentity] of byEventCommander) {
    for (const [commander, cohort] of byIdentity) {
      const high = cohort.filter(isHighPerformerRecord).length;
      const low = cohort.length - high;
      if (cohort.length < 2 || high < 1 || low < 1) continue;
      const contrast = buildCompetitiveContrastAnalysis({
        eventId,
        commanderFamily: commander,
        records: cohort,
        analyses,
        prefiltered: true,
        cohortLevel: "A",
        cohortConfidence: LEVEL_CONFIDENCE.A,
      });
      cohorts.push(freeze({
        level: "A",
        confidence: LEVEL_CONFIDENCE.A,
        label: commander,
        eventId,
        commanderFamily: commander,
        cohortSize: cohort.length,
        highPerformers: high,
        lowPerformers: low,
        contrast,
      }));
    }
  }

  // Level B — same structural family, same event
  const byEventFamily = new Map(); // eventId -> Map(familyId -> records[])
  for (const record of records) {
    if (!record.eventId || !analysisById.has(record.id)) continue;
    const familyId = familyIdFrom(record, familyByDeckId);
    if (!familyId || familyId.startsWith("identity:")) continue;
    if (!byEventFamily.has(record.eventId)) byEventFamily.set(record.eventId, new Map());
    const byFamily = byEventFamily.get(record.eventId);
    byFamily.set(familyId, (byFamily.get(familyId) || []).concat([record]));
  }
  for (const [eventId, byFamily] of byEventFamily) {
    for (const [familyId, cohort] of byFamily) {
      const high = cohort.filter(isHighPerformerRecord).length;
      const low = cohort.length - high;
      if (cohort.length < 3 || high < 1 || low < 1) continue;
      const contrast = buildCompetitiveContrastAnalysis({
        eventId,
        commanderFamily: familyId,
        records: cohort,
        analyses,
        prefiltered: true,
        cohortLevel: "B",
        cohortConfidence: LEVEL_CONFIDENCE.B,
      });
      cohorts.push(freeze({
        level: "B",
        confidence: LEVEL_CONFIDENCE.B,
        label: familyId,
        eventId,
        commanderFamily: familyId,
        cohortSize: cohort.length,
        highPerformers: high,
        lowPerformers: low,
        contrast,
      }));
    }
  }

  // Level C — same structural family across events
  const byFamily = new Map();
  for (const record of records) {
    if (!analysisById.has(record.id)) continue;
    const familyId = familyIdFrom(record, familyByDeckId);
    if (!familyId || familyId.startsWith("identity:")) continue;
    byFamily.set(familyId, (byFamily.get(familyId) || []).concat([record]));
  }
  for (const [familyId, cohort] of byFamily) {
    const events = new Set(cohort.map((r) => r.eventId).filter(Boolean));
    const high = cohort.filter(isHighPerformerRecord).length;
    const low = cohort.length - high;
    if (events.size < 2 || cohort.length < 4 || high < 1 || low < 1) continue;
    const contrast = buildCompetitiveContrastAnalysis({
      commanderFamily: familyId,
      records: cohort,
      analyses,
      prefiltered: true,
      cohortLevel: "C",
      cohortConfidence: LEVEL_CONFIDENCE.C,
    });
    cohorts.push(freeze({
      level: "C",
      confidence: LEVEL_CONFIDENCE.C,
      label: familyId,
      eventId: null,
      commanderFamily: familyId,
      eventCount: events.size,
      cohortSize: cohort.length,
      highPerformers: high,
      lowPerformers: low,
      contrast,
    }));
  }

  // Level D — broad format comparison (lowest confidence)
  const byEvent = new Map();
  for (const record of records) {
    if (!record.eventId || !analysisById.has(record.id)) continue;
    byEvent.set(record.eventId, (byEvent.get(record.eventId) || []).concat([record]));
  }
  for (const [eventId, cohort] of byEvent) {
    const high = cohort.filter(isHighPerformerRecord).length;
    const low = cohort.length - high;
    if (cohort.length < 6 || high < 1 || low < 1) continue;
    const contrast = buildCompetitiveContrastAnalysis({
      eventId,
      commanderFamily: null,
      records: cohort,
      analyses,
      prefiltered: true,
      cohortLevel: "D",
      cohortConfidence: LEVEL_CONFIDENCE.D,
    });
    cohorts.push(freeze({
      level: "D",
      confidence: LEVEL_CONFIDENCE.D,
      label: `event:${eventId}`,
      eventId,
      commanderFamily: null,
      cohortSize: cohort.length,
      highPerformers: high,
      lowPerformers: low,
      contrast,
      note: "broad_event_comparison_lowest_confidence",
    }));
  }

  const sorted = cohorts.sort((a, b) =>
    b.confidence - a.confidence
    || b.cohortSize - a.cohortSize
    || String(a.label).localeCompare(String(b.label)));

  return freeze({
    version: "comparable-cohorts-v1.1",
    counts: freeze({
      A: sorted.filter((c) => c.level === "A").length,
      B: sorted.filter((c) => c.level === "B").length,
      C: sorted.filter((c) => c.level === "C").length,
      D: sorted.filter((c) => c.level === "D").length,
    }),
    cohorts: freeze(sorted),
    strongestControlled: freeze(sorted.filter((c) => c.level === "A" || c.level === "B").slice(0, 12)),
  });
}

export function cohortConfidenceLabel(level) {
  return LEVEL_CONFIDENCE[level] ?? 0;
}

export { LEVEL_CONFIDENCE };
