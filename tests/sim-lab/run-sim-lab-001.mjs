#!/usr/bin/env node
// Sim-Lab-001 runner — isolated sandbox report. Brain untouched.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeCompetitiveFixtureCorpus } from "../../app/field-intelligence/fixtures/competitive-corpus.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { runSimLab001 } from "../../app/sim-lab/experiments/sim-lab-001.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;

const fixture = materializeCompetitiveFixtureCorpus();
const records = fixture.records.filter((r) => (r.rows || []).length > 12).slice(0, 100);
const analyses = analyzeCorpus(records);
const report = runSimLab001(records, { analyses });

mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, "sim-lab-001-report.json");
const mdPath = join(outDir, "SIM_LAB_001_REPORT.md");

writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, renderMarkdown(report));

console.log(renderMarkdown(report));
console.log(`\nWrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

function renderMarkdown(r) {
  const c = r.correlationsWithMeanRecoveryProbability || {};
  return [
    "# Sim-Lab-001 Report",
    "",
    "**Sandbox only. writesToBrain: false. constructionMutated: false.**",
    "",
    `## Question`,
    r.question,
    "",
    `## Sample`,
    `- Decks analyzed: **${r.decksAnalyzed}**`,
    `- Seats probed: ${(r.seatsProbed || []).join(", ")}`,
    "",
    `## Correlations with mean recovery probability`,
    `- interactionCount: **${c.interactionCount}**`,
    `- planConnectedRatio: **${c.planConnectedRatio}**`,
    `- meaningfulEdgeDensity: **${c.meaningfulEdgeDensity}**`,
    `- isolatedRatio: **${c.isolatedRatio}**`,
    `- topologyComposite: **${c.topologyComposite}**`,
    "",
    `## Verdict`,
    r.verdict,
    "",
    `## Recommendation`,
    `- promoteToBrain: **${r.recommendation?.promoteToBrain}**`,
    `- runValidationHarness: **${r.recommendation?.runValidationHarness}**`,
    `- next: ${r.recommendation?.next}`,
    "",
    "No card rankings. No construction scores. Reasoning correlations only.",
  ].join("\n");
}
