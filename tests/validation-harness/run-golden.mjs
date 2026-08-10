#!/usr/bin/env node
/**
 * Golden commander canaries — Brain v1 regression gate.
 * Uses the same harness report contract. Fails if frozen rates regress.
 *
 *   node tests/validation-harness/run-golden.mjs
 *   npm run validate:golden
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { forgeNativeMasterwork } from "../../app/native-masterwork-engine.mjs";
import {
  expandCorpus,
  buildValidationRecord,
  buildValidationReport,
  renderValidationReportMarkdown,
} from "../../app/validation-harness.mjs";
import { fixtureInput } from "../commander-torture-bench/fixtures.mjs";
import {
  GOLDEN_SUITE_VERSION,
  listGoldenCommanders,
  evaluateGoldenRates,
  evaluateGoldenArchetypes,
  BRAIN_V1_FROZEN_RATES,
} from "./golden-commanders.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "out");
const frozenBenchmarkPath = resolve(__dirname, "brain-v1-frozen-benchmark.json");

function loadFrozenBenchmark() {
  if (!existsSync(frozenBenchmarkPath)) return null;
  return JSON.parse(readFileSync(frozenBenchmarkPath, "utf8"));
}

async function main() {
  const goldens = listGoldenCommanders();
  const fixtures = goldens.map((entry) => entry.fixture);
  const corpus = expandCorpus(fixtures, { seeds: [11], limit: fixtures.length });
  console.log(`Golden suite ${GOLDEN_SUITE_VERSION}: ${corpus.length} canaries (seed 11)`);
  console.log("Brain v1 freeze: construction policy unchanged.\n");

  const records = [];
  for (const caseSpec of corpus) {
    const started = Date.now();
    let report = null;
    let error = null;
    try {
      report = forgeNativeMasterwork(fixtureInput(caseSpec.fixture, caseSpec.seed));
    } catch (err) {
      error = err;
    }
    const record = buildValidationRecord(caseSpec, report, error, Date.now() - started);
    records.push(record);
    const weak = record.weakSlotForensics?.weakSlotCount ?? "-";
    console.log(`${record.passed ? "PASS" : "FAIL"} ${caseSpec.fixtureId.padEnd(28)} weak=${weak} hard=${record.hardFailures.length}`);
  }

  const frozen = loadFrozenBenchmark();
  const report = buildValidationReport(records, {
    mode: "golden",
    baseline: frozen,
    includeRecords: true,
  });

  const rateGate = evaluateGoldenRates(report.aggregate.controlRates, {
    passRate: report.aggregate.passRate,
    meanRuntimeMs: report.aggregate.meanRuntimeMs,
    baselineMeanRuntimeMs: frozen?.aggregate?.meanRuntimeMs ?? 2200,
    frozenRates: BRAIN_V1_FROZEN_RATES,
  });
  const archetypeGate = evaluateGoldenArchetypes(report.aggregate.byArchetype);
  const violations = [...rateGate.violations, ...archetypeGate.violations];
  const passed = rateGate.passed && archetypeGate.passed && report.aggregate.passRate === 1
    && report.aggregate.controlMetrics.hard_failure_runs === 0;

  mkdirSync(outDir, { recursive: true });
  const payload = {
    ...report,
    golden: {
      version: GOLDEN_SUITE_VERSION,
      passed,
      violations,
      canaryCount: goldens.length,
      stresses: [...new Set(goldens.flatMap((entry) => entry.stresses))].sort(),
    },
  };
  writeFileSync(resolve(outDir, "latest-golden-report.json"), JSON.stringify(payload, null, 2));
  writeFileSync(resolve(outDir, "latest-golden-report.md"), `${renderValidationReportMarkdown(report)}

## Golden gate
- passed: ${passed}
- violations: ${violations.length}
${violations.map((entry) => `- ${entry.metric}: actual=${entry.actual} max=${entry.expectedMax ?? "n/a"} min=${entry.expectedMin ?? "n/a"} (${entry.note})`).join("\n") || "- none"}
`);

  console.log("\n=== GOLDEN GATE ===");
  console.log(passed ? "PASSED — Brain v1 canaries healthy" : "FAILED — construction change blocked");
  for (const entry of violations) {
    console.log(`  ! ${entry.metric}: ${entry.note} (actual=${entry.actual})`);
  }
  if (!passed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
