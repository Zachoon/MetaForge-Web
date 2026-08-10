#!/usr/bin/env node
/**
 * MetaForge Validation Harness runner.
 * Field-test the frozen brain. Does not change construction policy.
 *
 * Examples:
 *   node tests/validation-harness/run.mjs --mode smoke
 *   node tests/validation-harness/run.mjs --mode field --seeds 11,13,17,19 --limit 52
 *   node tests/validation-harness/run.mjs --mode smoke --baseline tests/commander-torture-bench/weak-slot-forensics-after-cleanup.json
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
import { TORTURE_FIXTURES, fixtureInput } from "../commander-torture-bench/fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "out");

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
      args.seeds = String(argv[++i] || "11").split(",").map((part) => Number(part.trim())).filter(Number.isFinite);
    } else if (token === "--limit") args.limit = Number(argv[++i]);
    else if (token === "--baseline") args.baseline = argv[++i];
    else if (token === "--no-records") args.includeRecords = false;
    else if (token === "--help" || token === "-h") args.help = true;
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

function stamp() {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d+Z$/, "Z");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`MetaForge Validation Harness
  --mode smoke|field
  --seeds 11,13,17
  --limit N
  --baseline path/to/baseline.json
  --no-records`);
    process.exit(0);
  }

  mkdirSync(outDir, { recursive: true });
  const corpus = expandCorpus(TORTURE_FIXTURES, { seeds: args.seeds, limit: args.limit });
  console.log(`Running ${corpus.length} forges (mode=${args.mode}, seeds=${args.seeds.join(",")})`);
  console.log("Architecture freeze: construction policy unchanged.\n");

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
    const status = record.passed ? "PASS" : "FAIL";
    console.log(`${status.padEnd(4)} ${caseSpec.runId.padEnd(36)} weak=${weak} hard=${record.hardFailures.length} ms=${record.runtimeMs}`);
  }

  const baseline = loadBaseline(args.baseline);
  const report = buildValidationReport(records, {
    mode: args.mode,
    baseline,
    includeRecords: args.includeRecords,
  });
  const markdown = renderValidationReportMarkdown(report);
  const tag = `${args.mode}-${stamp()}`;
  const jsonPath = resolve(outDir, `report-${tag}.json`);
  const mdPath = resolve(outDir, `report-${tag}.md`);
  const latestJson = resolve(outDir, "latest-report.json");
  const latestMd = resolve(outDir, "latest-report.md");

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, markdown);
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, markdown);

  console.log("\n=== VALIDATION REPORT ===");
  console.log(markdown);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);

  if (report.comparison?.regressions?.some((entry) => entry.metric === "hard_failure_runs")) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
