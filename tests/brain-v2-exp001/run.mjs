#!/usr/bin/env node
/**
 * Brain v2 Experiment 001 — Interaction Structure A/B runner.
 * Compares brain_v1_control vs brain_v2_exp001_interaction.
 * Does NOT promote Exp001 into default construction.
 *
 *   node tests/brain-v2-exp001/run.mjs --mode smoke
 *   node tests/brain-v2-exp001/run.mjs --mode field --baseline ../validation-harness/brain-v1-frozen-benchmark.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { forgeNativeMasterwork } from "../../app/native-masterwork-engine.mjs";
import {
  expandCorpus,
  buildValidationRecord,
  buildValidationReport,
  renderValidationReportMarkdown,
} from "../../app/validation-harness.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "../commander-torture-bench/fixtures.mjs";
import {
  BRAIN_POLICY_V1_CONTROL,
  BRAIN_POLICY_V2_EXP001_INTERACTION,
  BRAIN_V2_EXP001_INTERACTION_WIRING,
  resolveBrainPolicy,
} from "../../app/brain-policy.mjs";
import { buildInteractionGraph, extractMechanicalSignals } from "../../app/forge-interaction-graph.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "out");

// Evidence train set — do not score promotion on these Level-A events.
const EVIDENCE_TRAIN_EVENTS = Object.freeze([
  "4-onslaught-invasion-2026-event-series",
  "tq1-sweater-series-nr2",
]);
const EVIDENCE_TRAIN_COMMANDER = "Kraum, Ludevic's Opus / Tymna the Weaver";

function parseArgs(argv) {
  const args = {
    mode: "smoke",
    seeds: [11],
    limit: Infinity,
    baseline: null,
    includeRecords: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--mode") args.mode = argv[++i] || "smoke";
    else if (token === "--seeds") {
      args.seeds = String(argv[++i] || "11").split(",").map((p) => Number(p.trim())).filter(Number.isFinite);
    } else if (token === "--limit") args.limit = Number(argv[++i]);
    else if (token === "--baseline") args.baseline = argv[++i];
    else if (token === "--no-records") args.includeRecords = false;
  }
  if (args.mode === "smoke") {
    args.seeds = [11];
    args.limit = TORTURE_FIXTURES.length;
  } else if (args.mode === "field" && args.seeds.length === 1 && args.seeds[0] === 11) {
    args.seeds = [11, 13, 17, 19, 23, 29, 31, 37];
  }
  return args;
}

function loadBaseline(path) {
  if (!path) return null;
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) {
    console.error(`Baseline not found: ${abs}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, "utf8"));
}

function deckRows(report) {
  return (report?.selected?.rows || report?.selected?.mainboard || []).filter(Boolean);
}

function interactionDensityOf(report) {
  const rows = deckRows(report);
  const cards = rows.map((row) => {
    const card = row.card || row;
    const mechanics = row.mechanics || extractMechanicalSignals(card);
    return {
      name: row.name || card.name,
      roles: row.roles || [],
      mechanics,
    };
  });
  const graph = buildInteractionGraph(cards);
  return (graph.edges || []).length;
}

function roleCount(report, role) {
  return deckRows(report)
    .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .filter((row) => (row.roles || []).includes(role))
    .length;
}

function seMetrics(report) {
  const se = report?.selected?.selfEvaluation || {};
  const forensics = report?.selected?.weakSlotForensics?.aggregate || {};
  const critique = report?.selected?.slotJustificationLedger?.critique || {};
  const counts = se.controlCaseCounts || {};
  return {
    finalWeak: forensics.weakSlotCount ?? critique.weaklyJustified?.length ?? null,
    avoidableWeak: forensics.avoidableCount ?? null,
    constraintForcedWeak: forensics.constraintForcedCount ?? null,
    beneficialEmergence: counts.beneficial_emergence ?? null,
    genuineBadBelief: counts.genuine_bad_belief ?? null,
    laterPackageOversupply: counts.later_package_oversupply ?? null,
    unsupportedAnchors: (critique.underSupportedAnchors || []).length,
    cohesionPassed: report?.selected?.strategicCohesionGate?.passed ?? se.cohesionPassed ?? null,
    interactionDensity: interactionDensityOf(report),
    interactionRoleCount: roleCount(report, "interaction"),
  };
}

function changedPicks(controlReport, expReport, limit = 8) {
  const controlNames = new Set(deckRows(controlReport).map((r) => r.name));
  const expNames = new Set(deckRows(expReport).map((r) => r.name));
  const onlyControl = [...controlNames].filter((n) => !expNames.has(n)).sort();
  const onlyExp = [...expNames].filter((n) => !controlNames.has(n)).sort();
  const pairs = [];
  const n = Math.min(limit, Math.max(onlyControl.length, onlyExp.length));
  for (let i = 0; i < n; i += 1) {
    pairs.push({
      brainV1Card: onlyControl[i] || null,
      exp001Card: onlyExp[i] || null,
    });
  }
  return {
    cardsOnlyInControl: onlyControl.length,
    cardsOnlyInExp: onlyExp.length,
    overlap: [...controlNames].filter((n) => expNames.has(n)).length,
    examples: pairs,
  };
}

function classifyPromotion({ controlReport, expReport, heldOut, powerTier }) {
  const regressions = [];
  const cAgg = controlReport.aggregate || {};
  const eAgg = expReport.aggregate || {};
  const eRates = eAgg.controlRates || {};
  const cRates = cAgg.controlRates || {};

  if ((eAgg.hardFailureRunCount || eAgg.hardFailureRuns || 0) > (cAgg.hardFailureRunCount || cAgg.hardFailureRuns || 0)) {
    regressions.push("hard_failures_increased");
  }
  if ((eAgg.passRate || 0) + 1e-9 < (cAgg.passRate || 0)) {
    regressions.push("pass_rate_regressed");
  }
  if ((eRates.avoidable_weak_slots ?? 0) > (cRates.avoidable_weak_slots ?? 0) + 0.05) {
    regressions.push("avoidable_weak_regressed");
  }
  if ((eRates.beneficial_emergence ?? 0) + 0.15 < (cRates.beneficial_emergence ?? 0)) {
    regressions.push("beneficial_emergence_lost");
  }
  if ((eRates.later_package_oversupply ?? 0) > (cRates.later_package_oversupply ?? 0) + 0.1) {
    regressions.push("later_package_oversupply_increased");
  }
  for (const row of expReport.comparison?.regressions || []) {
    regressions.push(`baseline:${row.metric}`);
  }
  const cRt = controlReport.aggregate?.meanRuntimeMs || controlReport.runtime?.meanMs || 0;
  const eRt = expReport.aggregate?.meanRuntimeMs || expReport.runtime?.meanMs || 0;
  if (cRt > 0 && eRt > cRt * 1.35) {
    regressions.push("runtime_regression");
  }
  if (powerTier?.casualInheritedCedhDensity) {
    regressions.push("casual_inherited_cedh_density");
  }

  const uniqueRegressions = [...new Set(regressions)];
  const heldOutImproved = Boolean(heldOut?.densityImproved && !heldOut?.contaminated);

  // Frozen-benchmark regressions fail the promotion gate hard.
  const baselineRegressions = uniqueRegressions.filter((r) => r.startsWith("baseline:") || r === "beneficial_emergence_lost" || r === "later_package_oversupply_increased");
  if (baselineRegressions.length || uniqueRegressions.includes("hard_failures_increased") || uniqueRegressions.includes("casual_inherited_cedh_density")) {
    return {
      verdict: "reject",
      regressions: uniqueRegressions,
      heldOutImproved,
      note: "Failed promotion gate (frozen-benchmark / quality regressions). Experiment remains opt-in for research only.",
    };
  }
  if (!heldOutImproved && !heldOut?.skipped) {
    return { verdict: "needs_more_evidence", regressions: uniqueRegressions, heldOutImproved };
  }
  if (heldOut?.skipped) {
    return {
      verdict: "needs_more_evidence",
      regressions: uniqueRegressions,
      heldOutImproved,
      note: "Harness healthy but held-out tournament validation incomplete/skipped.",
    };
  }
  return { verdict: "promote_candidate", regressions: uniqueRegressions, heldOutImproved };
}

function runPolicyCorpus(corpus, policyId) {
  const records = [];
  const forgeReports = [];
  for (const caseSpec of corpus) {
    const started = Date.now();
    let report = null;
    let error = null;
    try {
      const input = {
        ...fixtureInput(caseSpec.fixture, caseSpec.seed),
        brainPolicy: policyId,
      };
      report = forgeNativeMasterwork(input);
    } catch (err) {
      error = err;
    }
    const record = buildValidationRecord(caseSpec, report, error, Date.now() - started);
    records.push(record);
    forgeReports.push({ caseSpec, report, error, metrics: report ? seMetrics(report) : null });
    const status = record.passed ? "PASS" : "FAIL";
    console.log(`${policyId} ${status.padEnd(4)} ${caseSpec.runId.padEnd(36)} ms=${record.runtimeMs}`);
  }
  return { records, forgeReports };
}

/**
 * Held-out validation: compare Exp001 vs control on fixtures that are NOT
 * the evidence commander family. Full live tournament held-out requires
 * corpus decks; here we use torture archetypes as structural proxies and
 * mark train-event contamination explicitly.
 */
function evaluateHeldOutProxy(controlForgeReports, expForgeReports) {
  let densityWins = 0;
  let densityLosses = 0;
  let weakWins = 0;
  let weakLosses = 0;
  const perArchetype = [];
  for (let i = 0; i < controlForgeReports.length; i += 1) {
    const c = controlForgeReports[i];
    const e = expForgeReports[i];
    if (!c.metrics || !e.metrics) continue;
    const row = {
      fixtureId: c.caseSpec.fixtureId,
      densityDelta: e.metrics.interactionDensity - c.metrics.interactionDensity,
      interactionCountDelta: e.metrics.interactionRoleCount - c.metrics.interactionRoleCount,
      avoidableWeakDelta: (e.metrics.avoidableWeak ?? 0) - (c.metrics.avoidableWeak ?? 0),
      beneficialEmergenceDelta: (e.metrics.beneficialEmergence ?? 0) - (c.metrics.beneficialEmergence ?? 0),
      unsupportedAnchorsDelta: e.metrics.unsupportedAnchors - c.metrics.unsupportedAnchors,
    };
    perArchetype.push(row);
    if (row.densityDelta > 0) densityWins += 1;
    else if (row.densityDelta < 0) densityLosses += 1;
    if (row.avoidableWeakDelta < 0) weakWins += 1;
    else if (row.avoidableWeakDelta > 0) weakLosses += 1;
  }
  return {
    kind: "torture_held_out_proxy",
    contaminated: false,
    trainEventsExcluded: EVIDENCE_TRAIN_EVENTS,
    trainCommanderExcluded: EVIDENCE_TRAIN_COMMANDER,
    note: "Torture fixtures are not the Level-A evidence cohort (Kraum/Tymna). Live tournament held-out still preferred for promotion.",
    densityImproved: densityWins > densityLosses,
    densityWins,
    densityLosses,
    weakImproved: weakWins > weakLosses,
    weakWins,
    weakLosses,
    perArchetype,
  };
}

function powerTierProbe(fixture) {
  // Use first fixture; forge Casual+Exp001 vs Casual+Control wiring density.
  const seed = 11;
  const base = fixtureInput(fixture, seed);
  const control = forgeNativeMasterwork({ ...base, targetPowerTier: "Casual", brainPolicy: BRAIN_POLICY_V1_CONTROL });
  const exp = forgeNativeMasterwork({ ...base, targetPowerTier: "Casual", brainPolicy: BRAIN_POLICY_V2_EXP001_INTERACTION });
  const cDense = interactionDensityOf(control);
  const eDense = interactionDensityOf(exp);
  const cIx = roleCount(control, "interaction");
  const eIx = roleCount(exp, "interaction");
  // With gate, Casual should not inherit Exp001 wiring — lists should match control.
  const namesEqual = JSON.stringify(deckRows(control).map((r) => r.name).sort())
    === JSON.stringify(deckRows(exp).map((r) => r.name).sort());
  return {
    fixtureId: fixture.id,
    casualControlDensity: cDense,
    casualExpDensity: eDense,
    casualControlInteraction: cIx,
    casualExpInteraction: eIx,
    casualListsIdentical: namesEqual,
    casualInheritedCedhDensity: !namesEqual && (eDense - cDense >= 20 || eIx - cIx >= 3),
  };
}

function stamp() {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d+Z$/, "Z");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(outDir, { recursive: true });
  const corpus = expandCorpus(TORTURE_FIXTURES, { seeds: args.seeds, limit: args.limit });
  console.log(`Exp001 A/B: ${corpus.length} forges × 2 policies`);
  console.log(`Policy under test: ${BRAIN_POLICY_V2_EXP001_INTERACTION}`);
  console.log(`Underweight: ${BRAIN_V2_EXP001_INTERACTION_WIRING.underweightLocation}\n`);

  const controlRun = runPolicyCorpus(corpus, BRAIN_POLICY_V1_CONTROL);
  const expRun = runPolicyCorpus(corpus, BRAIN_POLICY_V2_EXP001_INTERACTION);

  const baseline = loadBaseline(args.baseline);
  const controlReport = buildValidationReport(controlRun.records, {
    mode: `${args.mode}-control`,
    baseline,
    includeRecords: args.includeRecords,
  });
  const expReport = buildValidationReport(expRun.records, {
    mode: `${args.mode}-exp001`,
    baseline,
    includeRecords: args.includeRecords,
  });

  const heldOut = evaluateHeldOutProxy(controlRun.forgeReports, expRun.forgeReports);
  const powerTier = powerTierProbe(TORTURE_FIXTURES[0]);

  // Concrete counterfactual from first differing archetype
  let counterfactual = null;
  for (let i = 0; i < controlRun.forgeReports.length; i += 1) {
    const c = controlRun.forgeReports[i];
    const e = expRun.forgeReports[i];
    if (!c.report || !e.report) continue;
    const diff = changedPicks(c.report, e.report, 6);
    if (diff.cardsOnlyInControl + diff.cardsOnlyInExp > 0) {
      counterfactual = {
        fixtureId: c.caseSpec.fixtureId,
        seed: c.caseSpec.seed,
        controlMetrics: c.metrics,
        expMetrics: e.metrics,
        picks: diff,
      };
      break;
    }
  }

  const promotion = classifyPromotion({
    controlReport,
    expReport,
    heldOut,
    powerTier,
  });

  const artifact = {
    version: "brain-v2-exp001-report-v1",
    generatedAt: new Date().toISOString(),
    implementBrainV2Default: false,
    brainV1RemainsFrozen: true,
    hypothesis: {
      id: BRAIN_V2_EXP001_INTERACTION_WIRING.evidenceHypothesisId,
      feature: BRAIN_V2_EXP001_INTERACTION_WIRING.evidenceFeature,
      underweightLocation: BRAIN_V2_EXP001_INTERACTION_WIRING.underweightLocation,
      policy: resolveBrainPolicy(BRAIN_POLICY_V2_EXP001_INTERACTION),
    },
    control: {
      policy: BRAIN_POLICY_V1_CONTROL,
      aggregate: controlReport.aggregate,
      comparison: controlReport.comparison,
      runtime: controlReport.runtime,
    },
    experiment: {
      policy: BRAIN_POLICY_V2_EXP001_INTERACTION,
      aggregate: expReport.aggregate,
      comparison: expReport.comparison,
      runtime: expReport.runtime,
    },
    heldOut,
    powerTier,
    counterfactual,
    promotion,
    deltas: {
      passRate: (expReport.aggregate?.passRate || 0) - (controlReport.aggregate?.passRate || 0),
      hardFailures: (expReport.aggregate?.hardFailureRunCount || 0) - (controlReport.aggregate?.hardFailureRunCount || 0),
      meanRuntimeMs: (expReport.aggregate?.meanRuntimeMs || 0) - (controlReport.aggregate?.meanRuntimeMs || 0),
      beneficialEmergencePerForge: (expReport.aggregate?.controlRates?.beneficial_emergence || 0)
        - (controlReport.aggregate?.controlRates?.beneficial_emergence || 0),
      laterPackageOversupplyPerForge: (expReport.aggregate?.controlRates?.later_package_oversupply || 0)
        - (controlReport.aggregate?.controlRates?.later_package_oversupply || 0),
      avoidableWeakPerForge: (expReport.aggregate?.controlRates?.avoidable_weak_slots || 0)
        - (controlReport.aggregate?.controlRates?.avoidable_weak_slots || 0),
    },
  };

  const tag = `${args.mode}-${stamp()}`;
  const jsonPath = join(outDir, `exp001-${tag}.json`);
  const mdPath = join(outDir, `exp001-${tag}.md`);
  const latestJson = join(outDir, "latest-exp001.json");
  const latestMd = join(outDir, "latest-exp001.md");
  const md = renderExp001Markdown(artifact, controlReport, expReport);
  writeFileSync(jsonPath, JSON.stringify(artifact, null, 2));
  writeFileSync(mdPath, md);
  writeFileSync(latestJson, JSON.stringify(artifact, null, 2));
  writeFileSync(latestMd, md);
  writeFileSync(join(outDir, "control-report.json"), JSON.stringify(controlReport, null, 2));
  writeFileSync(join(outDir, "exp001-report.json"), JSON.stringify(expReport, null, 2));

  console.log("\n=== EXP001 PROMOTION VERDICT ===");
  console.log(md);
  console.log(`Wrote ${jsonPath}`);
}

function renderExp001Markdown(artifact, controlReport, expReport) {
  const lines = [];
  lines.push("# Brain v2 Experiment 001 — Interaction Structure");
  lines.push("");
  lines.push("Brain v1 remains the default/control. Exp001 is **not** promoted automatically.");
  lines.push("");
  lines.push("## Hypothesis");
  lines.push("```json");
  lines.push(JSON.stringify(artifact.hypothesis, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Promotion verdict");
  lines.push(`**${artifact.promotion.verdict}**`);
  lines.push(`- regressions: ${JSON.stringify(artifact.promotion.regressions)}`);
  lines.push(`- heldOutImproved: ${artifact.promotion.heldOutImproved}`);
  if (artifact.promotion.note) lines.push(`- note: ${artifact.promotion.note}`);
  lines.push("");
  lines.push("## Control vs Experiment aggregates");
  lines.push("### Control (Brain v1)");
  lines.push("```json");
  lines.push(JSON.stringify({ aggregate: controlReport.aggregate, runtime: controlReport.runtime, comparison: controlReport.comparison }, null, 2));
  lines.push("```");
  lines.push("### Experiment 001");
  lines.push("```json");
  lines.push(JSON.stringify({ aggregate: expReport.aggregate, runtime: expReport.runtime, comparison: expReport.comparison }, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Held-out proxy");
  lines.push("```json");
  lines.push(JSON.stringify(artifact.heldOut, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Power-tier Casual gate");
  lines.push("```json");
  lines.push(JSON.stringify(artifact.powerTier, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Counterfactual picks");
  lines.push("```json");
  lines.push(JSON.stringify(artifact.counterfactual, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Runtime delta");
  lines.push(`meanMs delta (exp - control): ${artifact.deltas.meanRuntimeMs}`);
  lines.push("");
  lines.push(renderValidationReportMarkdown(controlReport));
  lines.push("");
  lines.push(renderValidationReportMarkdown(expReport));
  return lines.join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
