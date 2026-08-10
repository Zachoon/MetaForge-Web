// =============================================================================
// Field Intelligence v1.1 — Repeated converter structural analysis
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function classOf(record) {
  return record.performanceClass
    || (record.topCut || record.placement === 1
      ? ((record.independentConverterEvents || 0) >= 2 ? "repeated_converter" : "single_event_converter")
      : "tournament_participant");
}

function snapshot(analysis) {
  const packages = analysis.packages || [];
  const core = mean(packages.map((p) => p.density?.core ?? 0));
  const health = mean(packages.map((p) => p.healthScore ?? 0));
  const legs = {};
  for (const pkg of packages) {
    for (const [leg, state] of Object.entries(pkg.legs || {})) {
      legs[`${pkg.id}::${leg}`] = (legs[`${pkg.id}::${leg}`] || 0) + (state.current || 0);
    }
  }
  const roles = analysis.roleDistribution || {};
  const roleTotal = Object.values(roles).reduce((s, n) => s + n, 0) || 1;
  return freeze({
    packageCoreDensity: core,
    packageHealth: health,
    packageCount: packages.length,
    interactionDensity: analysis.interactionGraph?.edgeCount || 0,
    weakSlotDensity: analysis.justification?.slotCount
      ? (analysis.justification.weaklyJustifiedCount || 0) / analysis.justification.slotCount
      : 0,
    redundancy: analysis.justification?.redundantCount || 0,
    commanderAlignment: analysis.commanderConnection?.ratio || 0,
    curveHigh: analysis.curve?.["5+"] || 0,
    roleCoverage: freeze(Object.fromEntries(
      Object.entries(roles).map(([role, count]) => [role, round(count / roleTotal)]),
    )),
    legs: freeze(legs),
  });
}

function aggregateClass(records, analysesById, className) {
  const subset = records.filter((r) => classOf(r) === className);
  const snaps = subset.map((r) => analysesById.get(r.id)).filter(Boolean).map(snapshot);
  if (!snaps.length) {
    return freeze({ n: 0, className });
  }
  const legKeys = unique(snaps.flatMap((s) => Object.keys(s.legs || {})));
  return freeze({
    className,
    n: snaps.length,
    packageCoreDensity: round(mean(snaps.map((s) => s.packageCoreDensity))),
    packageHealth: round(mean(snaps.map((s) => s.packageHealth))),
    packageDetectionRate: round(mean(snaps.map((s) => (s.packageCount > 0 ? 1 : 0)))),
    interactionDensity: round(mean(snaps.map((s) => s.interactionDensity))),
    weakSlotDensity: round(mean(snaps.map((s) => s.weakSlotDensity))),
    redundancy: round(mean(snaps.map((s) => s.redundancy))),
    commanderAlignment: round(mean(snaps.map((s) => s.commanderAlignment))),
    curveHigh: round(mean(snaps.map((s) => s.curveHigh))),
    legMeans: freeze(Object.fromEntries(legKeys.map((key) => [
      key,
      round(mean(snaps.map((s) => s.legs[key] || 0))),
    ]))),
  });
}

function unique(values) {
  return [...new Set(values)];
}

/**
 * Compare repeated converters vs single-event converters vs participants.
 * Optionally control within a commander identity or structural family.
 */
export function analyzeRepeatedConverters(records = [], analyses = [], options = {}) {
  const analysesById = new Map(analyses.map((a) => [a.deckId, a]));
  const topologyById = new Map((options.topologyMetrics || []).map((m) => [m.deckId, m]));
  const control = options.controlFamilyId || options.controlCommander || null;

  let scoped = records;
  if (options.controlCommander) {
    scoped = records.filter((r) =>
      (r.commanders || []).map((c) => c.name).sort().join(" / ") === options.controlCommander);
  } else if (options.controlFamilyId) {
    scoped = records.filter((r) =>
      (analysesById.get(r.id)?.commanderFamily?.familyId) === options.controlFamilyId);
  }

  const groups = freeze({
    repeated_converter: aggregateClass(scoped, analysesById, "repeated_converter"),
    single_event_converter: aggregateClass(scoped, analysesById, "single_event_converter"),
    tournament_participant: aggregateClass(scoped, analysesById, "tournament_participant"),
  });

  const topologySignatures = freeze(Object.fromEntries(
    ["repeated_converter", "single_event_converter", "tournament_participant"].map((className) => {
      const subset = scoped.filter((r) => classOf(r) === className);
      const metrics = subset.map((r) => topologyById.get(r.id)).filter(Boolean);
      if (!metrics.length) return [className, freeze({ n: 0 })];
      return [className, freeze({
        n: metrics.length,
        meanPlanConnectedRatio: round(mean(metrics.map((m) => m.planConnectedInteractionRatio || 0))),
        meanIsolatedRatio: round(mean(metrics.map((m) => m.isolatedInteractiveRatio || 0))),
        meanMultifunctionRatio: round(mean(metrics.map((m) => m.multifunctionInteractionRatio || 0))),
        meanMeaningfulEdgeDensity: round(mean(metrics.map((m) => m.meaningfulEdgeDensity || 0))),
        meanCommanderProtection: round(mean(metrics.map((m) => m.commanderProtectionCoverage || 0))),
        meanEngineProtection: round(mean(metrics.map((m) => m.engineProtectionCoverage || 0))),
      })];
    }),
  ));

  const deltas = freeze({
    coreDensity_repeated_minus_participant: round(
      (groups.repeated_converter.packageCoreDensity || 0)
      - (groups.tournament_participant.packageCoreDensity || 0),
    ),
    interaction_repeated_minus_participant: round(
      (groups.repeated_converter.interactionDensity || 0)
      - (groups.tournament_participant.interactionDensity || 0),
    ),
    weakSlot_repeated_minus_participant: round(
      (groups.repeated_converter.weakSlotDensity || 0)
      - (groups.tournament_participant.weakSlotDensity || 0),
    ),
    coreDensity_repeated_minus_single: round(
      (groups.repeated_converter.packageCoreDensity || 0)
      - (groups.single_event_converter.packageCoreDensity || 0),
    ),
    planConnected_repeated_minus_participant: round(
      (topologySignatures.repeated_converter.meanPlanConnectedRatio || 0)
      - (topologySignatures.tournament_participant.meanPlanConnectedRatio || 0),
    ),
  });

  return freeze({
    version: "repeated-converter-analysis-v1.3",
    control,
    groups,
    topologySignatures,
    deltas,
    note: "associative_not_causal",
  });
}
