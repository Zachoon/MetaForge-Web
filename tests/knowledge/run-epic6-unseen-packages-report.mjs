#!/usr/bin/env node
// Epic 6 follow-up — the all-package density audit only saw 6 of 10 catalog
// packages. This asks whether auras / equipment / aristocrats / blink are
// missing because the live sample has no such commanders, or because
// detectCommander is failing the way typal used to.
// Read-only. writesToBrain: false. Opens no Laboratory experiment.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

/** Catalog ids from `PACKAGE_CATALOG` — not torture-fixture archetypes. */
export const STRATEGIC_PACKAGE_IDS = Object.freeze([
  "auras",
  "equipment",
  "aristocrats",
  "reanimator",
  "tokens",
  "landfall",
  "typal",
  "spellslinger",
  "blink",
  "stax",
]);

/**
 * Famous commanders a human would expect to open these packages.
 * Name canaries only — never construction inputs, never commander-specific
 * production branches. Used to tell "this cEDH slice has no voltron" from
 * "Light-Paws is here and auras still did not open."
 */
export const UNSEEN_PACKAGE_CANARIES = Object.freeze({
  auras: Object.freeze(["Light-Paws", "Sythis", "Pearl-Ear", "Galea", "Uril", "Calix"]),
  equipment: Object.freeze(["Ardenn, Intrepid Archaeologist", "Nahiri, the Lithomancer", "Wyleth, Soul of Steel", "Balan, Wandering Knight", "Akiri, Line-Slinger"]),
  aristocrats: Object.freeze(["Teysa Karlov", "Korvold", "Prossh", "Chatterfang", "Elenda"]),
  blink: Object.freeze(["Brago", "Yorion", "Preston", "Roon", "Ephara"]),
});

export function classifyCatalogCoverage(analyses = []) {
  const observed = new Set();
  const commandersByPackage = new Map();
  const allCommanders = new Map();
  for (const analysis of analyses) {
    const commanderKey = (analysis.commanders || []).join("+") || "unknown";
    const decks = allCommanders.get(commanderKey) || 0;
    allCommanders.set(commanderKey, decks + 1);
    for (const pkg of analysis.packages || []) {
      if (!pkg?.id) continue;
      observed.add(pkg.id);
      const rows = commandersByPackage.get(pkg.id) || new Map();
      rows.set(commanderKey, (rows.get(commanderKey) || 0) + 1);
      commandersByPackage.set(pkg.id, rows);
    }
  }
  const unseen = STRATEGIC_PACKAGE_IDS.filter((id) => !observed.has(id));
  const seen = STRATEGIC_PACKAGE_IDS.filter((id) => observed.has(id));
  const canaryHits = Object.fromEntries(
    unseen.map((id) => {
      const needles = UNSEEN_PACKAGE_CANARIES[id] || [];
      const hits = [...allCommanders.keys()].filter((name) =>
        needles.some((needle) => {
          const hay = name.toLowerCase();
          const want = needle.toLowerCase();
          return hay === want || hay.startsWith(`${want}+`) || hay.includes(`+${want}`) || hay.startsWith(`${want} //`) || hay.includes(` ${want}`) || hay.startsWith(want);
        }),
      );
      return [id, hits];
    }),
  );
  const detectionFailures = unseen.filter((id) => (canaryHits[id] || []).length > 0);
  const sampleGaps = unseen.filter((id) => !(canaryHits[id] || []).length);
  return {
    catalogCount: STRATEGIC_PACKAGE_IDS.length,
    seen,
    unseen,
    detectionFailures,
    sampleGaps,
    canaryHits,
    commanderCount: allCommanders.size,
    deckCount: [...allCommanders.values()].reduce((sum, n) => sum + n, 0),
    commanders: [...allCommanders.entries()]
      .map(([commander, decks]) => ({ commander, decks }))
      .sort((a, b) => b.decks - a.decks || a.commander.localeCompare(b.commander)),
  };
}

function formatReport(coverage) {
  const lines = [];
  lines.push("# MetaForge Epic 6 — Unseen Catalog Packages");
  lines.push("");
  lines.push("**Follow-up to:** `npm run report:knowledge-epic6:all-packages`");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no");
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("The all-package density audit could not speak for auras, equipment, aristocrats,");
  lines.push("or blink. That absence is either a sample gap (this tournament slice has no such");
  lines.push("commanders) or a detection gap (the commanders are here and `detectCommander` still");
  lines.push("does not open the package — the typal-before-occupancy shape). Those are different");
  lines.push("next questions. This report only classifies which one we are in.");
  lines.push("");
  lines.push(`Live sample: **${coverage.deckCount} decks**, **${coverage.commanderCount} commander identities**.`);
  lines.push("");
  lines.push("## Catalog coverage");
  lines.push("");
  lines.push(`- Observed: **${coverage.seen.join(", ") || "(none)"}**`);
  lines.push(`- Unseen: **${coverage.unseen.join(", ") || "(none)"}**`);
  lines.push("");
  if (coverage.detectionFailures.length) {
    lines.push("## Detection failures (canary commanders present, package still closed)");
    lines.push("");
    lines.push("This is the typal-shaped bug: the sample contains a commander a human would");
    lines.push("expect to open the package, and analysis still has no package row.");
    lines.push("");
    for (const id of coverage.detectionFailures) {
      lines.push(`- **${id}**: ${coverage.canaryHits[id].join("; ")}`);
    }
    lines.push("");
  } else {
    lines.push("## No detection failure on the named canaries");
    lines.push("");
    lines.push("None of the unseen packages have a canary commander in this sample. That is");
    lines.push("**not** proof detection is correct — only that this slice cannot expose a");
    lines.push("Light-Paws / Brago class miss. Do not treat unseen as healthy.");
    lines.push("");
  }
  if (coverage.sampleGaps.length) {
    lines.push("## Sample gaps");
    lines.push("");
    lines.push(`No canary commander for: **${coverage.sampleGaps.join(", ")}**.`);
    lines.push("The floor-and-force-fill question stays unanswered for these packages until a");
    lines.push("slice that actually contains them is observed — not until we invent a Lab.");
    lines.push("");
  }
  lines.push("## Commanders in this sample (top 20)");
  lines.push("");
  lines.push("| Commander | Decks |");
  lines.push("|---|---:|");
  for (const row of coverage.commanders.slice(0, 20)) {
    lines.push(`| ${row.commander} | ${row.decks} |`);
  }
  lines.push("");
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("No density retune, no new detectCommander branch, no commander-name production");
  lines.push("logic. If this is a sample gap, the next observation is a wider or differently");
  lines.push("sliced corpus — not a construction change.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const live = await materializeLiveTournamentRecords({});
  if (!live.ok || !live.records.length) {
    console.error(`Live corpus unavailable: ${live.reason || "no records"}`);
    process.exitCode = 1;
    return;
  }
  const analyses = analyzeCorpus(live.records);
  const coverage = classifyCatalogCoverage(analyses);
  const report = formatReport(coverage);
  writeFileSync(join(outDir, "epic6-unseen-packages-report.md"), report);
  writeFileSync(join(outDir, "epic6-unseen-packages-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    coverage,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-unseen-packages-report.md")}`);
}

const isDirectRun = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
