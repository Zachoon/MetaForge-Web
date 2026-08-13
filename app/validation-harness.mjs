// =============================================================================
// MetaForge Validation Harness
// =============================================================================
// Field-test instrumentation around the frozen reasoning brain.
// Observes, aggregates, compares baselines, suggests next evidence focus.
// Does NOT change construction weights or planning layers.
// =============================================================================

import { aggregateSelfEvaluationArtifacts } from "./reasoning-drift.mjs";
import { aggregateWeakSlotForensics } from "./weak-slot-forensics.mjs";
import {
  aggregateTortureResults,
  buildTortureScorecard,
} from "./torture-bench-audit.mjs";
import { summarizeCorpusObservation } from "./validation-harness-corpus.mjs";

export const VALIDATION_HARNESS_VERSION = "validation-harness-v1";
export const VALIDATION_REPORT_VERSION = "validation-report-v1";

const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const freeze = (value) => Object.freeze(value);

export const CONTROL_METRIC_KEYS = Object.freeze([
  "final_weak_justification",
  "later_package_oversupply",
  "invalidated_by_later_decisions",
  "genuine_bad_belief",
  "beneficial_emergence",
  "early_scaffolding_matured",
  "unclassified",
]);

/**
 * Expand a fixture corpus across seeds for field coverage without inventing
 * new construction logic. Deterministic ordering.
 */
export function expandCorpus(fixtures = [], options = {}) {
  const seeds = (options.seeds || [11]).map((seed) => Number(seed)).filter(Number.isFinite);
  const limit = Number.isFinite(options.limit) ? options.limit : Infinity;
  const cases = [];
  for (const seed of seeds) {
    for (const fixture of fixtures) {
      if (cases.length >= limit) return freeze(cases);
      cases.push(freeze({
        runId: `${fixture.id}::seed-${seed}`,
        fixtureId: fixture.id,
        archetype: fixture.archetype,
        seed,
        fixture,
      }));
    }
  }
  return freeze(cases);
}

/**
 * Build one harness record from a forge report (or forge failure).
 */
export function buildValidationRecord(caseSpec, report, error = null, runtimeMs = 0) {
  if (error || !report?.selected) {
    return freeze({
      version: VALIDATION_HARNESS_VERSION,
      runId: caseSpec.runId,
      fixtureId: caseSpec.fixtureId,
      archetype: caseSpec.archetype,
      seed: caseSpec.seed,
      passed: false,
      hardFailures: freeze([`forge_threw:${error?.message || "unknown"}`]),
      warnings: freeze([]),
      runtimeMs,
      selfEvaluation: null,
      weakSlotForensics: null,
      weakSlotRepair: null,
      justification: null,
      cohesionPassed: null,
    });
  }

  const scorecard = buildTortureScorecard(report, caseSpec.fixture, { runtimeMs });
  const se = report.selected.selfEvaluation || null;
  const forensics = report.selected.weakSlotForensics || null;
  return freeze({
    version: VALIDATION_HARNESS_VERSION,
    runId: caseSpec.runId,
    fixtureId: caseSpec.fixtureId,
    archetype: caseSpec.archetype,
    seed: caseSpec.seed,
    passed: scorecard.passed,
    hardFailures: freeze([...(scorecard.hardFailures || [])]),
    warnings: freeze([...(scorecard.warnings || [])]),
    failureClasses: freeze([...(scorecard.failureClasses || [])]),
    runtimeMs,
    selfEvaluation: se && freeze({
      totalTracedPicks: se.totalTracedPicks,
      liveFillPicks: se.liveFillPicks,
      meaningfulDisagreements: se.meaningfulDisagreements,
      disagreementsByClass: se.disagreementsByClass,
      controlCaseCounts: se.controlCaseCounts,
      meanAbsDriftMagnitude: se.meanAbsDriftMagnitude,
      prospectiveVsRetrospectiveAgreementRate: se.prospectiveVsRetrospectiveAgreementRate,
      strongestRecurringWarningSignals: se.strongestRecurringWarningSignals,
      // Keep full artifact optional for callers that need picks.
      _full: se,
    }),
    weakSlotForensics: forensics && freeze({
      weakSlotCount: forensics.aggregate?.weakSlotCount ?? forensics.records?.length ?? 0,
      aggregate: forensics.aggregate,
      records: forensics.records,
    }),
    weakSlotRepair: report.selected.weakSlotRepair && freeze({
      applied: Boolean(report.selected.weakSlotRepair.applied),
      appliedCount: Number(report.selected.weakSlotRepair.appliedCount) || 0,
    }),
    justification: scorecard.justification && freeze({
      strongRatio: scorecard.justification.strongRatio,
      weaklyJustified: scorecard.justification.weaklyJustified,
      rawPowerDominant: scorecard.justification.rawPowerDominant,
    }),
    cohesionPassed: report.selected.strategicCohesionGate?.passed !== false,
  });
}

function sumCounts(maps = []) {
  const out = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map || {})) {
      out[key] = (out[key] || 0) + Number(value || 0);
    }
  }
  return out;
}

function topEntries(counts = {}, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => freeze({ key, count }));
}

/**
 * Aggregate many validation records into a field report body.
 */
export function aggregateValidationRecords(records = []) {
  const tortureLike = records.map((record) => ({
    id: record.fixtureId,
    archetype: record.archetype,
    passed: record.passed,
    hardFailures: record.hardFailures || [],
    warnings: record.warnings || [],
    failureClasses: record.failureClasses || [],
    runtimeMs: record.runtimeMs || 0,
  }));
  const tortureAggregate = aggregateTortureResults(tortureLike);

  const seArtifacts = records
    .filter((record) => record.selfEvaluation?._full || record.selfEvaluation)
    .map((record) => {
      const full = record.selfEvaluation?._full || record.selfEvaluation;
      return {
        ...full,
        archetype: record.archetype,
        meta: { ...(full.meta || {}), archetype: record.archetype, fixtureId: record.fixtureId, seed: record.seed },
      };
    });
  const seAggregate = aggregateSelfEvaluationArtifacts(seArtifacts);

  const forensicRecords = records.flatMap((record) =>
    (record.weakSlotForensics?.records || []).map((entry) => ({
      ...entry,
      archetype: record.archetype,
      fixtureId: record.fixtureId,
      seed: record.seed,
    })));
  const weakAggregate = aggregateWeakSlotForensics(forensicRecords);

  const byArchetype = {};
  for (const record of records) {
    const key = record.archetype || "unknown";
    byArchetype[key] = byArchetype[key] || {
      runs: 0,
      passes: 0,
      hardFailureRuns: 0,
      weakSlots: 0,
      avoidableWeak: 0,
      constraintForcedWeak: 0,
      cleanupApplied: 0,
    };
    const bucket = byArchetype[key];
    bucket.runs += 1;
    if (record.passed) bucket.passes += 1;
    if ((record.hardFailures || []).length) bucket.hardFailureRuns += 1;
    bucket.weakSlots += record.weakSlotForensics?.weakSlotCount || 0;
    bucket.avoidableWeak += record.weakSlotForensics?.aggregate?.avoidableCount || 0;
    bucket.constraintForcedWeak += record.weakSlotForensics?.aggregate?.constraintForcedCount || 0;
    if (record.weakSlotRepair?.applied) bucket.cleanupApplied += 1;
  }

  const controlCaseCounts = seAggregate.controlCaseCounts || {};
  const driftClassCounts = seAggregate.driftClassCounts || {};

  const runCount = records.length;
  const controlMetrics = freeze({
    final_weak_justification: driftClassCounts.final_weak_justification || 0,
    later_package_oversupply: driftClassCounts.later_package_oversupply || 0,
    invalidated_by_later_decisions: controlCaseCounts.invalidated_by_later_decisions || 0,
    genuine_bad_belief: controlCaseCounts.genuine_bad_belief || 0,
    beneficial_emergence: controlCaseCounts.beneficial_emergence || 0,
    early_scaffolding_matured: controlCaseCounts.early_scaffolding_matured || 0,
    unclassified: driftClassCounts.unclassified || 0,
    ledger_weak_slots: weakAggregate.weakSlotCount || 0,
    avoidable_weak_slots: weakAggregate.avoidableCount || 0,
    constraint_forced_weak_slots: weakAggregate.constraintForcedCount || 0,
    hard_failure_runs: records.filter((record) => (record.hardFailures || []).length > 0).length,
  });
  const perForge = (value) => round(runCount ? Number(value || 0) / runCount : 0);
  const controlRates = freeze({
    final_weak_justification: perForge(controlMetrics.final_weak_justification),
    later_package_oversupply: perForge(controlMetrics.later_package_oversupply),
    invalidated_by_later_decisions: perForge(controlMetrics.invalidated_by_later_decisions),
    genuine_bad_belief: perForge(controlMetrics.genuine_bad_belief),
    beneficial_emergence: perForge(controlMetrics.beneficial_emergence),
    early_scaffolding_matured: perForge(controlMetrics.early_scaffolding_matured),
    unclassified: perForge(controlMetrics.unclassified),
    ledger_weak_slots: perForge(controlMetrics.ledger_weak_slots),
    avoidable_weak_slots: perForge(controlMetrics.avoidable_weak_slots),
    constraint_forced_weak_slots: perForge(controlMetrics.constraint_forced_weak_slots),
    hard_failure_runs: perForge(controlMetrics.hard_failure_runs),
  });

  return freeze({
    version: VALIDATION_HARNESS_VERSION,
    runCount,
    passCount: records.filter((record) => record.passed).length,
    hardFailureRunCount: records.filter((record) => (record.hardFailures || []).length > 0).length,
    passRate: round(runCount ? records.filter((r) => r.passed).length / runCount : 1),
    tortureAggregate,
    selfEvaluationAggregate: seAggregate,
    weakSlotAggregate: weakAggregate,
    controlMetrics,
    controlRates,
    byArchetype: freeze(byArchetype),
    topDriftClasses: freeze(topEntries(driftClassCounts, 10)),
    topWeakCausalClasses: freeze(topEntries(weakAggregate.causalClassCounts || {}, 8)),
    topWeakSources: freeze(topEntries(weakAggregate.sourceCounts || {}, 6)),
    meanRuntimeMs: round(runCount
      ? records.reduce((sum, record) => sum + (record.runtimeMs || 0), 0) / runCount
      : 0),
  });
}

/**
 * Compare a fresh aggregate against a frozen baseline snapshot.
 * Uses per-forge rates when both sides expose runCount, so a 104-forge
 * field sweep does not look like a regression against a 13-forge smoke.
 */
export function compareToBaseline(aggregate, baseline = null) {
  if (!baseline) {
    return freeze({
      compared: false,
      normalized: false,
      regressions: freeze([]),
      improvements: freeze([]),
      deltas: freeze({}),
    });
  }

  const baselineAggregate = baseline.aggregate || baseline;
  const baselineControls = baseline.controlMetrics
    || baselineAggregate.controlMetrics
    || baseline.selfEvaluationControls?.driftClassCounts && {
      final_weak_justification: baseline.selfEvaluationControls.driftClassCounts.final_weak_justification || 0,
      later_package_oversupply: baseline.selfEvaluationControls.driftClassCounts.later_package_oversupply || 0,
      invalidated_by_later_decisions: baseline.selfEvaluationControls.controlCaseCounts?.invalidated_by_later_decisions || 0,
      genuine_bad_belief: baseline.selfEvaluationControls.controlCaseCounts?.genuine_bad_belief || 0,
      beneficial_emergence: baseline.selfEvaluationControls.controlCaseCounts?.beneficial_emergence || 0,
      unclassified: baseline.selfEvaluationControls.driftClassCounts.unclassified || 0,
      ledger_weak_slots: baseline.weakSlotAggregate?.weakSlotCount || 0,
      avoidable_weak_slots: baseline.weakSlotAggregate?.avoidableCount || 0,
      constraint_forced_weak_slots: baseline.weakSlotAggregate?.constraintForcedCount || 0,
      hard_failure_runs: 0,
    }
    || baseline.aggregate?.driftClassCounts && {
      final_weak_justification: baseline.aggregate.driftClassCounts.final_weak_justification || 0,
      later_package_oversupply: baseline.aggregate.driftClassCounts.later_package_oversupply || 0,
      invalidated_by_later_decisions: baseline.aggregate.controlCaseCounts?.invalidated_by_later_decisions || 0,
      genuine_bad_belief: baseline.aggregate.controlCaseCounts?.genuine_bad_belief || 0,
      beneficial_emergence: baseline.aggregate.controlCaseCounts?.beneficial_emergence || 0,
      unclassified: baseline.aggregate.driftClassCounts.unclassified || 0,
      ledger_weak_slots: null,
      avoidable_weak_slots: null,
      constraint_forced_weak_slots: null,
      hard_failure_runs: 0,
    }
    || {};

  const currentRates = aggregate.controlRates || null;
  const baselineRates = baselineAggregate.controlRates || null;
  const currentRunCount = Number(aggregate.runCount) || 0;
  const baselineRunCount = Number(baselineAggregate.runCount)
    || (baseline.selfEvaluationControls ? 13 : 0)
    || 0;
  const useRates = Boolean(currentRates)
    && (baselineRates || baselineRunCount > 0)
    && currentRunCount > 0;

  const rateFrom = (controls, rates, runCount, key) => {
    if (rates && rates[key] != null) return Number(rates[key]);
    if (controls[key] == null || !runCount) return null;
    return round(Number(controls[key]) / runCount);
  };

  const current = useRates
    ? Object.fromEntries(Object.keys(aggregate.controlMetrics || {}).map((key) => [
      key,
      rateFrom(aggregate.controlMetrics, currentRates, currentRunCount, key),
    ]))
    : (aggregate.controlMetrics || {});
  const beforeMap = useRates
    ? Object.fromEntries(Object.keys(baselineControls).map((key) => [
      key,
      rateFrom(baselineControls, baselineRates, baselineRunCount || 13, key),
    ]))
    : baselineControls;

  const deltas = {};
  const regressions = [];
  const improvements = [];
  // Absolute epsilon for totals; rate epsilon for per-forge comparisons.
  const epsilon = useRates ? 0.08 : 0;

  const watch = [
    ["hard_failure_runs", "up_bad"],
    ["ledger_weak_slots", "up_bad"],
    ["avoidable_weak_slots", "up_bad"],
    ["final_weak_justification", "up_bad"],
    ["later_package_oversupply", "up_bad"],
    ["genuine_bad_belief", "up_bad"],
    ["beneficial_emergence", "down_bad"],
    ["constraint_forced_weak_slots", "neutral"],
    ["invalidated_by_later_decisions", "neutral"],
    ["unclassified", "neutral"],
  ];

  for (const [key, polarity] of watch) {
    if (beforeMap[key] == null || current[key] == null) continue;
    const before = Number(beforeMap[key]);
    const after = Number(current[key]);
    const delta = round(after - before);
    deltas[key] = freeze({ before, after, delta, unit: useRates ? "per_forge" : "absolute" });
    if (Math.abs(delta) <= epsilon) continue;
    if (polarity === "up_bad" && delta > 0) {
      regressions.push(freeze({ metric: key, before, after, delta, note: useRates ? "per-forge rate increased (bad)" : "increased (bad direction)" }));
    } else if (polarity === "down_bad" && delta < 0) {
      regressions.push(freeze({ metric: key, before, after, delta, note: useRates ? "per-forge rate collapsed (bad)" : "collapsed (bad direction)" }));
    } else if (polarity === "up_bad" && delta < 0) {
      improvements.push(freeze({ metric: key, before, after, delta, note: useRates ? "per-forge rate decreased (good)" : "decreased (good)" }));
    } else if (polarity === "down_bad" && delta > 0) {
      improvements.push(freeze({ metric: key, before, after, delta, note: useRates ? "per-forge rate increased (good)" : "increased (good)" }));
    }
  }

  return freeze({
    compared: true,
    normalized: useRates,
    regressions: freeze(regressions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.metric.localeCompare(b.metric))),
    improvements: freeze(improvements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.metric.localeCompare(b.metric))),
    deltas: freeze(deltas),
  });
}

/**
 * Derive the next evidence-driven engineering focus without inventing layers.
 * Thresholds are per-forge rates so field sweeps stay comparable to smoke.
 */
export function suggestNextFocus(aggregate, comparison = null) {
  const rates = aggregate.controlRates || null;
  const metrics = aggregate.controlMetrics || {};
  const runCount = Math.max(1, Number(aggregate.runCount) || 1);
  const rate = (key) => {
    if (rates && rates[key] != null) return Number(rates[key]);
    return Number(metrics[key] || 0) / runCount;
  };
  const candidates = [];

  const push = (id, score, rationale) => {
    candidates.push({ id, score, rationale });
  };

  if ((metrics.hard_failure_runs || 0) > 0 || rate("hard_failure_runs") > 0) {
    push("hard_failures", 1_000_000 + (metrics.hard_failure_runs || 0), "Hard failures must return to zero before soft-quality work.");
  }
  if (rate("avoidable_weak_slots") >= 0.6) {
    push("avoidable_weak_slots", 200 + rate("avoidable_weak_slots") * 100,
      "Avoidable weak finals remain elevated per forge — revisit selection or bounded cleanup eligibility.");
  }
  if (rate("final_weak_justification") >= 2.2 && rate("avoidable_weak_slots") >= 0.4) {
    push("final_weak_justification", 150 + rate("final_weak_justification") * 40,
      "SE still flags many weak finals that forensics may show as avoidable.");
  }
  if (rate("later_package_oversupply") >= 3.0) {
    push("later_package_oversupply", 120 + rate("later_package_oversupply") * 20,
      "Package oversupply has returned to a dominant SE class.");
  }
  if (rate("genuine_bad_belief") >= 1.8) {
    push("genuine_bad_belief", 110 + rate("genuine_bad_belief") * 30,
      "Pick-time belief errors dominate — prospective selection evidence needed.");
  }
  if (rate("constraint_forced_weak_slots") >= 1.4 && rate("avoidable_weak_slots") <= 0.3) {
    push("pool_scarcity_and_real_corpora", 90,
      "Remaining weakness is mostly constraint-forced — synthetic pools may be the ceiling; field-test real lists next.");
  }
  if (rate("unclassified") >= 15 && rate("avoidable_weak_slots") <= 0.4 && (metrics.hard_failure_runs || 0) === 0) {
    push("taxonomy_expansion_for_unclassified", 40,
      "Only after concrete quality defects are quiet — expand drift taxonomy carefully.");
  }

  if (comparison?.regressions?.length) {
    const top = comparison.regressions[0];
    push(`regression:${top.metric}`, 500 + Math.abs(top.delta) * 100,
      `Baseline regression on ${top.metric} (${top.before} → ${top.after}${comparison.normalized ? " per forge" : ""}).`);
  }

  if (!candidates.length) {
    push("collect_more_field_evidence", 10,
      "No urgent defect class — expand corpus / real-list comparison before Brain Sprint 2.");
  }

  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return freeze({
    primary: freeze(candidates[0]),
    alternates: freeze(candidates.slice(1, 4)),
    note: "Suggestions are evidence prioritization, not permission to invent new planning layers.",
  });
}

/**
 * Attach Field Intelligence corpus metrics alongside harness reports.
 * Observational only — does not alter Brain construction baselines.
 */
export function attachCorpusIntelligenceSummary(report, corpusArtifact = null) {
  if (!corpusArtifact) {
    return freeze({
      ...report,
      corpusIntelligence: freeze({
        present: false,
        note: "Run npm run report:field-intelligence to populate.",
      }),
    });
  }
  return freeze({
    ...report,
    corpusIntelligence: freeze({
      present: true,
      version: corpusArtifact.version,
      decksAnalyzed: corpusArtifact.corpus?.decksAnalyzed ?? 0,
      eventsRepresented: corpusArtifact.corpus?.eventsRepresented ?? 0,
      uniqueCommanders: corpusArtifact.corpus?.uniqueCommanders ?? 0,
      evidenceTierDistribution: corpusArtifact.corpus?.evidenceTierDistribution || {},
      topCutDecks: corpusArtifact.corpus?.topCutDecks ?? 0,
      holdoutPackageBandHitRate: corpusArtifact.holdout?.packageBandHitRate ?? null,
      antiNetdeckNovelWins: corpusArtifact.antiNetdeck?.structuralBeatsPopular?.novelWins ?? null,
      brainHumanAgreements: corpusArtifact.brainHumanCompare?.agreements?.length ?? 0,
      semanticBlindSpots: corpusArtifact.semanticBlindSpotCandidates?.length ?? 0,
      packageDiscoveryCandidates: corpusArtifact.packageDiscoveryCandidates?.length ?? 0,
      brainPolicyTouched: corpusArtifact.brainPolicyTouched === true,
    }),
  });
}

/**
 * Compose the full weekly-style validation report.
 */
export function buildValidationReport(records = [], options = {}) {
  const aggregate = aggregateValidationRecords(records);
  const comparison = compareToBaseline(aggregate, options.baseline || null);
  const nextFocus = suggestNextFocus(aggregate, comparison);
  const generatedAt = options.generatedAt || new Date().toISOString();

  const summaryLines = [
    `Validation harness ${VALIDATION_REPORT_VERSION}: ${aggregate.runCount} forges, pass rate ${round(aggregate.passRate * 100, 1)}%.`,
    `Hard-failure runs: ${aggregate.controlMetrics.hard_failure_runs}.`,
    `Ledger weak slots: ${aggregate.controlMetrics.ledger_weak_slots} (avoidable ${aggregate.controlMetrics.avoidable_weak_slots}, constraint-forced ${aggregate.controlMetrics.constraint_forced_weak_slots}) — ${aggregate.controlRates.ledger_weak_slots}/forge.`,
    `SE per forge: weak-final ${aggregate.controlRates.final_weak_justification}, oversupply ${aggregate.controlRates.later_package_oversupply}, genuine_bad ${aggregate.controlRates.genuine_bad_belief}, emergence ${aggregate.controlRates.beneficial_emergence}.`,
    `Next focus: ${nextFocus.primary.id} — ${nextFocus.primary.rationale}`,
  ];

  const corpusObservation = summarizeCorpusObservation(records);
  if (corpusObservation.present) {
    summaryLines.push(
      `Corpus observation: ${corpusObservation.cases} lists (${corpusObservation.topCutCases} top-cut) via ${corpusObservation.forgePath} path.`,
    );
  }

  return freeze({
    version: VALIDATION_REPORT_VERSION,
    harnessVersion: VALIDATION_HARNESS_VERSION,
    generatedAt,
    mode: options.mode || "custom",
    architectureFrozen: true,
    summary: freeze(summaryLines),
    aggregate,
    comparison,
    nextFocus,
    corpusObservation,
    records: options.includeRecords === false
      ? freeze([])
      : freeze(records.map((record) => freeze({
        runId: record.runId,
        fixtureId: record.fixtureId,
        archetype: record.archetype,
        seed: record.seed,
        passed: record.passed,
        hardFailures: record.hardFailures,
        warnings: record.warnings,
        runtimeMs: record.runtimeMs,
        weakSlotCount: record.weakSlotForensics?.weakSlotCount ?? null,
        avoidableWeak: record.weakSlotForensics?.aggregate?.avoidableCount ?? null,
        controlCaseCounts: record.selfEvaluation?.controlCaseCounts || null,
        disagreementsByClass: record.selfEvaluation?.disagreementsByClass || null,
        cleanupApplied: record.weakSlotRepair?.applied || false,
        corpus: record.corpus || null,
        forgePath: record.forgePath || null,
      }))),
  });
}

/**
 * Render a concise markdown weekly report from a validation report object.
 */
export function renderValidationReportMarkdown(report) {
  const lines = [];
  lines.push(`# MetaForge Validation Report`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Architecture frozen: ${report.architectureFrozen ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Summary");
  for (const line of report.summary || []) lines.push(`- ${line}`);
  lines.push("");
  lines.push("## Control metrics");
  const metrics = report.aggregate?.controlMetrics || {};
  const rates = report.aggregate?.controlRates || {};
  for (const [key, value] of Object.entries(metrics)) {
    const rate = rates[key];
    lines.push(rate == null ? `- ${key}: ${value}` : `- ${key}: ${value} (${rate}/forge)`);
  }
  lines.push("");
  lines.push("## Top drift classes");
  for (const entry of report.aggregate?.topDriftClasses || []) {
    lines.push(`- ${entry.key}: ${entry.count}`);
  }
  lines.push("");
  lines.push("## Weak-slot causal / source");
  for (const entry of report.aggregate?.topWeakCausalClasses || []) {
    lines.push(`- causal ${entry.key}: ${entry.count}`);
  }
  for (const entry of report.aggregate?.topWeakSources || []) {
    lines.push(`- source ${entry.key}: ${entry.count}`);
  }
  lines.push("");
  if (report.comparison?.compared) {
    lines.push(`## Baseline comparison${report.comparison.normalized ? " (per-forge normalized)" : ""}`);
    if (!report.comparison.regressions.length) lines.push("- No hard regressions flagged.");
    for (const entry of report.comparison.regressions) {
      lines.push(`- REGRESSION ${entry.metric}: ${entry.before} → ${entry.after} (${entry.delta})`);
    }
    for (const entry of report.comparison.improvements.slice(0, 6)) {
      lines.push(`- improvement ${entry.metric}: ${entry.before} → ${entry.after} (${entry.delta})`);
    }
    lines.push("");
  }
  lines.push("## Suggested next focus");
  lines.push(`- **${report.nextFocus.primary.id}**: ${report.nextFocus.primary.rationale}`);
  for (const alt of report.nextFocus.alternates || []) {
    lines.push(`- alternate ${alt.id}: ${alt.rationale}`);
  }
  lines.push("");
  lines.push("## Archetype snapshot");
  const archetypes = Object.entries(report.aggregate?.byArchetype || {})
    .sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, stats] of archetypes) {
    lines.push(`- ${name}: runs=${stats.runs} pass=${stats.passes} weak=${stats.weakSlots} avoidable=${stats.avoidableWeak} forced=${stats.constraintForcedWeak}`);
  }
  lines.push("");
  if (report.corpusObservation?.present) {
    lines.push("## Corpus observation");
    lines.push(`- Cases: ${report.corpusObservation.cases} (top-cut ${report.corpusObservation.topCutCases})`);
    lines.push(`- Forge path: ${report.corpusObservation.forgePath}`);
    lines.push(`- ${report.corpusObservation.honesty}`);
    for (const [tier, count] of Object.entries(report.corpusObservation.evidenceTierDistribution || {})) {
      lines.push(`- evidenceTier ${tier}: ${count}`);
    }
    lines.push("");
  }
  lines.push("_This report does not authorize new planning layers. Evidence first._");
  lines.push("");
  return lines.join("\n");
}

// Silence unused import warning if tree-shaken oddly — sumCounts reserved for extensions.
void sumCounts;
