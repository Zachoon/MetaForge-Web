#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAtlasVocabularyRegistry } from "../../app/knowledge/atlas-vocabulary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const registry = buildAtlasVocabularyRegistry();
  const report = [
    "# Atlas Vocabulary / Age of Vocabulary",
    "",
    registry.ageOfVocabulary.label,
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Core terms | ${registry.summary.coreTermCount} |`,
    `| Capability drafts | ${registry.summary.capabilityDraftCount} |`,
    `| Capability admitted | ${registry.summary.capabilityAdmittedCount} |`,
    `| Coverage dimensions | ${registry.summary.coverageDimensionCount} |`,
    `| Equivalence bindings | ${registry.summary.equivalenceBindingCount} |`,
    `| coverageScore | ${registry.summary.coverageScoreExists} |`,
    `| Brain | none |`,
    "",
    `Observation 001: ${registry.observation001.verdict}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  writeFileSync(join(outDir, "atlas-vocabulary.md"), report, "utf8");
  writeFileSync(join(outDir, "atlas-vocabulary.json"), JSON.stringify(registry, null, 2), "utf8");
  console.log(report);
}

main();
