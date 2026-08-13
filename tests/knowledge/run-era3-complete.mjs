#!/usr/bin/env node
// Era 3 Complete — communication era engineering closeout.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ERA3_CARD_INSPECT_SURFACES } from "../../app/context-card-inspector.mjs";
import { buildCommissionContract } from "../../app/commission-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const page = readFileSync(join(root, "app/page.tsx"), "utf8");
  const contract = buildCommissionContract({
    note: "Build me a Doubling Season Superfriends deck that feels thematic",
    commanderName: "Atraxa, Praetors' Voice",
    selected: {
      rows: [
        { name: "Atraxa, Praetors' Voice", quantity: 1, typeLine: "Legendary Creature" },
        { name: "Doubling Season", quantity: 1, typeLine: "Enchantment" },
        { name: "Jace, the Mind Sculptor", quantity: 1, typeLine: "Legendary Planeswalker — Jace" },
      ],
    },
  });

  const surfacesPresent = ERA3_CARD_INSPECT_SURFACES.filter((surface) =>
    page.includes(`"${surface}"`),
  );

  const report = [
    "# Era 3 Complete",
    "",
    "Engineering complete · Founder Confirmed still requires Live Founder Trial",
    "",
    "## Scoreboard",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Conversation stages | 4 |`,
    `| Founder issues #020–#024 | shipped |`,
    `| #021 inspect surfaces | ${surfacesPresent.length}/${ERA3_CARD_INSPECT_SURFACES.length} |`,
    `| Soft-heard honesty | ${contract.matchHonesty ? "on" : "n/a"} |`,
    `| Brain | none |`,
    "",
    "## Conversation Contract",
    "",
    "```text",
    "1. I heard you",
    "2. Here are the philosophies",
    "3. Here's the deck",
    "4. Here's how to pilot it",
    "Deep Forge — How do you know?",
    "```",
    "",
    "## Deferred",
    "",
    "- Prioritize Theme vs Performance fork",
    "- Brain inheritance / package stuffing",
    "- Founder Confirmed promotions (human trial)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "era3-complete.md"), report, "utf8");
  writeFileSync(
    join(outDir, "era3-complete.json"),
    JSON.stringify(
      {
        era: "3",
        engineeringComplete: true,
        founderConfirmed: false,
        surfaces: surfacesPresent,
        sampleMatch: {
          matchPercent: contract.matchPercent,
          matchLabel: contract.matchLabel,
          matchHonesty: contract.matchHonesty,
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(report);
}

main();
