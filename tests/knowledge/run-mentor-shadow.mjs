#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const report = buildMentorShadowReport({
    cardNames: ["Teferi's Protection", "Lightning Greaves", "Doubling Season"],
    commanderName: "Atraxa, Praetors' Voice",
    fantasyLabel: "Superfriends",
    commissionMismatch: true,
  });
  const md = [
    "# Mentor Shadow v0",
    "",
    report.note,
    "",
    ...report.explanations.map((e) => `## ${e.card}\n\n${e.paragraph}\n`),
    "",
    "Deferred:",
    ...report.deferred.map((d) => `- ${d}`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  writeFileSync(join(outDir, "mentor-shadow.md"), md, "utf8");
  writeFileSync(join(outDir, "mentor-shadow.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(md);
}

main();
