#!/usr/bin/env node
/**
 * Field Validation step 3 — Brain-built vs corpus list disagreement.
 *
 *   node tests/validation-harness/run-disagreement.mjs --limit 4
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildValidationReport,
  renderValidationReportMarkdown,
} from "../../app/validation-harness.mjs";
import { runOfflineListDisagreement } from "../../app/validation-harness-disagreement.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "out");

function parseArgs(argv) {
  const args = { limit: 4, seeds: [11], includeRecords: true };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--limit") args.limit = Number(argv[++i]);
    else if (token === "--seeds") {
      args.seeds = String(argv[++i] || "11").split(",").map((p) => Number(p.trim())).filter(Number.isFinite);
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
    console.log(`MetaForge Field Validation — list disagreement
  --limit N     corpus pairs (default 4; each pair runs native + import)
  --seeds 11
  --no-records`);
    process.exit(0);
  }

  mkdirSync(outDir, { recursive: true });
  console.log("Architecture freeze: construction policy unchanged.");
  console.log(`Running Brain-vs-corpus disagreement (limit=${args.limit})...\n`);

  const packed = runOfflineListDisagreement({
    limit: args.limit,
    seeds: args.seeds,
    preferTopCut: true,
  });

  for (const record of packed.records) {
    const d = record.listDisagreement || {};
    const status = record.passed ? "PASS" : "FAIL";
    const jac = Number.isFinite(d.jaccard) ? d.jaccard : "-";
    console.log(
      `${status.padEnd(4)} jaccard=${String(jac).padEnd(5)} onlyBrain=${d.onlyBrainCount ?? "-"} onlyCorpus=${d.onlyCorpusCount ?? "-"} ${record.archetype}`,
    );
  }

  const report = buildValidationReport(packed.records, {
    mode: "list-disagreement",
    includeRecords: args.includeRecords,
  });
  const markdown = renderValidationReportMarkdown(report);
  const tag = `list-disagreement-${stamp()}`;
  writeFileSync(resolve(outDir, `report-${tag}.json`), JSON.stringify(report, null, 2));
  writeFileSync(resolve(outDir, `report-${tag}.md`), markdown);
  writeFileSync(resolve(outDir, "latest-list-disagreement-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(resolve(outDir, "latest-list-disagreement-report.md"), markdown);

  console.log("\n=== VALIDATION REPORT (list-disagreement) ===");
  console.log(markdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
