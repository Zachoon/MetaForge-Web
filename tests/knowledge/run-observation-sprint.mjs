#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAtlasVocabularyRegistry } from "../../app/knowledge/atlas-vocabulary.mjs";
import { buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";
import { buildExpertStrategyCorpusFromFixtures } from "../../app/knowledge/expert-strategy-corpus.mjs";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const atlas = buildAtlasVocabularyRegistry();
  const mentor = buildMentorShadowReport({
    cardNames: ["Teferi's Protection"],
    commanderName: "Atraxa, Praetors' Voice",
    fantasyLabel: "Superfriends",
  });
  const stream002 = buildExpertStrategyCorpusFromFixtures();
  const evaluation = evaluateStrategicDecision({
    decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
    commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
  });

  const report = [
    "# Observation Sprint — Post Era 3",
    "",
    "```text",
    "Knowledge Era 1 Complete",
    "Age of Vocabulary Complete",
    "Stream 002 Fixtures Complete",
    "Mentor Shadow v0 embodied",
    "Era 4 Insight Founded (not complete)",
    "Brain: 0",
    "```",
    "",
    `| Layer | Signal |`,
    `|-------|--------|`,
    `| Atlas core terms | ${atlas.summary.coreTermCount} |`,
    `| Capability admitted | ${atlas.summary.capabilityAdmittedCount} |`,
    `| Stream 002 answer | ${stream002.outcome?.answer || "see epic4"} |`,
    `| Mentor explanations | ${mentor.explanations.length} |`,
    `| Evaluation ok | ${evaluation.ok} |`,
    `| Brain | none |`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "observation-sprint.md"), report, "utf8");
  console.log(report);
}

main();
