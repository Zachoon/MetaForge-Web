#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const sample = evaluateStrategicDecision({
    decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
    commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
    commanderName: "Atraxa, Praetors' Voice",
  });
  const report = [
    "# Knowledge Era 1 Complete",
    "",
    "Strategic Evaluation locked · judgment not construction · Brain: none",
    "",
    `Sample: ${sample.decision?.summary || sample.summary}`,
    `Confidence: ${sample.confidence?.level}`,
    `Concepts: ${(sample.conceptsCited || []).map((c) => c.name).join(" · ")}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  writeFileSync(join(outDir, "knowledge-era1-complete.md"), report, "utf8");
  console.log(report);
}

main();
