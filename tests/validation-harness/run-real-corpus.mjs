#!/usr/bin/env node
/**
 * Field Validation step 2 — tournament-shaped corpus through the shared
 * validation harness report contract.
 *
 * Offline by default (competitive fixture corpus). Construction policy unchanged.
 *
 *   node tests/validation-harness/run-real-corpus.mjs
 *   node tests/validation-harness/run-real-corpus.mjs --limit 8
 *   node tests/validation-harness/run-real-corpus.mjs --limit 24 --seeds 11
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { forgeImportedMasterwork } from "../../app/native-masterwork-engine.mjs";
import {
  buildValidationRecord,
  buildValidationReport,
  renderValidationReportMarkdown,
} from "../../app/validation-harness.mjs";
import {
  loadOfflineFieldCorpusCases,
  withCorpusProvenance,
} from "../../app/validation-harness-corpus.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "out");

function parseArgs(argv) {
  const args = {
    limit: 8,
    seeds: [11],
    includeRecords: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--limit") args.limit = Number(argv[++i]);
    else if (token === "--seeds") {
      args.seeds = String(argv[++i] || "11")
        .split(",")
        .map((part) => Number(part.trim()))
        .filter(Number.isFinite);
    } else if (token === "--no-records") args.includeRecords = false;
    else if (token === "--help" || token === "-h") args.help = true;
  }
  return args;
}

function stamp() {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d+Z$/, "Z");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`MetaForge Field Validation — real/tournament-shaped corpus
  --limit N          max corpus cases (default 8)
  --seeds 11,13      seeds for determinism (default 11)
  --no-records       omit per-run records from JSON`);
    process.exit(0);
  }

  mkdirSync(outDir, { recursive: true });
  const packed = loadOfflineFieldCorpusCases({
    limit: args.limit,
    seeds: args.seeds,
    preferTopCut: true,
  });
  console.log(`Field corpus cases: ${packed.cases.length}`);
  console.log(`Source: ${packed.source.kind} — ${packed.source.honesty}`);
  console.log("Architecture freeze: construction policy unchanged.\n");

  const records = [];
  for (const caseSpec of packed.cases) {
    const started = Date.now();
    let report = null;
    let error = null;
    try {
      report = forgeImportedMasterwork(caseSpec.forgeInput);
    } catch (err) {
      error = err;
    }
    const base = buildValidationRecord(caseSpec, report, error, Date.now() - started);
    const record = withCorpusProvenance(base, caseSpec);
    records.push(record);
    const status = record.passed ? "PASS" : "FAIL";
    const place = caseSpec.corpus?.placement ?? "-";
    console.log(
      `${status.padEnd(4)} ${String(place).padStart(3)} ${caseSpec.archetype.padEnd(18)} weak=${record.weakSlotForensics?.weakSlotCount ?? "-"} hard=${record.hardFailures.length} ms=${record.runtimeMs}`,
    );
  }

  const report = buildValidationReport(records, {
    mode: "real-corpus",
    includeRecords: args.includeRecords,
  });
  const markdown = renderValidationReportMarkdown(report);
  const tag = `real-corpus-${stamp()}`;
  const jsonPath = resolve(outDir, `report-${tag}.json`);
  const mdPath = resolve(outDir, `report-${tag}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, markdown);
  writeFileSync(resolve(outDir, "latest-real-corpus-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(resolve(outDir, "latest-real-corpus-report.md"), markdown);

  console.log("\n=== VALIDATION REPORT (real-corpus) ===");
  console.log(markdown);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
