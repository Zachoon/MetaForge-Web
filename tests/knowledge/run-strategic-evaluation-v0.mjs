#!/usr/bin/env node
// Strategic Evaluation v0 sample report — judgment without construction.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const samples = [
  evaluateStrategicDecision({
    decision: {
      kind: "cut_add",
      cut: "Smothering Tithe",
      add: "Swan Song",
      rationale: "Theme over generic value; protect walkers.",
    },
    commission: {
      fantasyLabel: "Doubling Season Superfriends",
      priorities: ["theme", "planeswalkers"],
    },
    commanderName: "Atraxa, Praetors' Voice",
    selected: {
      slotJustificationLedger: {
        byName: {
          "smothering tithe": { flags: { rawPowerDominant: true } },
        },
      },
    },
  }),
  evaluateStrategicDecision({
    decision: {
      kind: "freeform",
      summary: "I cut two planeswalkers for more interaction.",
    },
    commission: {
      fantasyLabel: "Superfriends",
      priorities: ["theme"],
    },
    commanderName: "Atraxa, Praetors' Voice",
  }),
];

function format(evaluation) {
  const lines = [];
  lines.push(`### ${evaluation.decision.summary}`);
  lines.push("");
  lines.push(`**Confidence:** ${evaluation.confidence.level}`);
  lines.push("");
  lines.push("**Pros**");
  for (const p of evaluation.pros) lines.push(`- ${p}`);
  lines.push("");
  lines.push("**Cons**");
  for (const c of evaluation.cons) lines.push(`- ${c}`);
  lines.push("");
  lines.push("**Strategic tradeoff**");
  for (const t of evaluation.strategicTradeoff) lines.push(`- ${t}`);
  lines.push("");
  lines.push(`**Evidence** · tournament ${evaluation.evidence.tournament} · experts ${evaluation.evidence.experts} · shadow ${evaluation.evidence.shadow} · hypothesis ${evaluation.evidence.hypothesis}`);
  lines.push("");
  lines.push(`> ${evaluation.coachVoice.paragraph}`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const report = [
    "# MetaForge Strategic Evaluation v0",
    "",
    "**Judgment without construction.** Brain inheritance: none.",
    "**Not a simulator. Not Brain.** An evaluator.",
    "",
    "## Samples",
    "",
    ...samples.map(format),
    "## Pipeline position",
    "",
    "```text",
    "Knowledge → Hypotheses → Stance voice → Strategic Evaluation ← next",
    "→ Simulation (witness) → Laboratory → Harness → Brain",
    "```",
    "",
    "Era 2 (gameplay / board-state intelligence) remains deferred.",
    "",
  ].join("\n");

  writeFileSync(join(outDir, "strategic-evaluation-v0.md"), report);
  writeFileSync(join(outDir, "strategic-evaluation-v0.json"), JSON.stringify({
    writesToBrain: false,
    brainInheritance: "none",
    samples,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "strategic-evaluation-v0.md")}`);
}

main();
