#!/usr/bin/env node
// Epic 6 — package-health kinds on occupancy-opened packages only.
// Occupancy from empty blueprint (no rows) so composition cannot hide detect.
// Health from the 99, then filtered to occupancy-opened package ids.
// Read-only. writesToBrain: false. Opens no Laboratory experiment.
// Does not propose floors, surplus ceilings, or redundancy retunes.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { buildStrategicIntent } from "../../app/strategic-intent.mjs";
import { analyzeCorpusDeck } from "../../app/field-intelligence/corpus-analyze.mjs";
import { STRATEGIC_PACKAGE_IDS } from "./run-epic6-unseen-packages-report.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

export const NAMED_PACKAGE_HEALTH_KINDS = Object.freeze([
  "underfilled",
  "oversaturated",
  "excessive_redundancy",
]);

const EMPTY_BLUEPRINT = Object.freeze({
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
});

const UNDERFILL_WATCH = Object.freeze(["tokens", "stax", "typal", "blink"]);

export function occupiedPackageIdsFor(record = {}) {
  const commanders = record.commanders || [];
  const intent = buildStrategicIntent(
    {
      format: record.format || "Commander",
      strategy: "Balanced midrange",
      commander: commanders[0],
      secondCommander: commanders[1],
    },
    { blueprint: EMPTY_BLUEPRINT },
  );
  return [...(intent.packageIds || [])];
}

/**
 * Count named health kinds only on occupancy-opened packages.
 * Composition-opened packages and unnamed issue kinds are ignored.
 */
export function tallyOccupiedHealthKinds(decks = []) {
  const byPackage = {};
  for (const id of STRATEGIC_PACKAGE_IDS) {
    byPackage[id] = {
      id,
      decks: 0,
      underfilled: 0,
      oversaturated: 0,
      excessive_redundancy: 0,
    };
  }
  for (const deck of decks) {
    const occupied = new Set(deck.occupiedPackageIds || []);
    for (const pkg of deck.packages || []) {
      if (!occupied.has(pkg.id)) continue;
      if (!byPackage[pkg.id]) {
        byPackage[pkg.id] = {
          id: pkg.id,
          decks: 0,
          underfilled: 0,
          oversaturated: 0,
          excessive_redundancy: 0,
        };
      }
      const bucket = byPackage[pkg.id];
      bucket.decks += 1;
      const kinds = new Set((pkg.issues || []).map((issue) => issue.kind || issue));
      for (const kind of NAMED_PACKAGE_HEALTH_KINDS) {
        if (kinds.has(kind)) bucket[kind] += 1;
      }
    }
  }
  return byPackage;
}

function dominantNamedKinds(bucket) {
  if (!bucket?.decks) return [];
  const ranked = NAMED_PACKAGE_HEALTH_KINDS
    .map((kind) => ({ kind, count: bucket[kind] || 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
  return ranked;
}

function spellslingerReplicated(bucket) {
  if (!bucket?.decks) return false;
  return (bucket.oversaturated || 0) > 0 || (bucket.excessive_redundancy || 0) > 0;
}

export function formatPackageHealthKindsReport(tally, options = {}) {
  const lines = [];
  lines.push("# MetaForge Epic 6 — Package Health Kinds Closeout");
  lines.push("");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no");
  lines.push("**Floor / surplus / redundancy retune:** none");
  lines.push("");
  lines.push("Occupancy from commander oracles only — empty blueprint, no rows.");
  lines.push("Health from the 99, then filtered to occupancy-opened package ids.");
  lines.push("Named kinds only: underfilled, oversaturated, excessive_redundancy.");
  lines.push("");
  if (options.deckCount != null) {
    lines.push(`Decks observed: **${options.deckCount}**.`);
    lines.push("");
  }
  lines.push("## Occupied package health kinds");
  lines.push("");
  for (const id of STRATEGIC_PACKAGE_IDS) {
    const bucket = tally[id];
    if (!bucket?.decks) {
      lines.push(`- **${id}**: not occupancy-opened in this sample`);
      continue;
    }
    const named = dominantNamedKinds(bucket)
      .map((row) => `${row.kind} ${row.count}/${bucket.decks}`)
      .join(", ");
    lines.push(`- **${id}** (${bucket.decks}): ${named || "no named strain"}`);
  }
  lines.push("");
  lines.push("## Replication check");
  lines.push("");
  for (const id of UNDERFILL_WATCH) {
    const bucket = tally[id];
    if (!bucket?.decks) {
      lines.push(`- **${id}**: not occupancy-opened — no underfill claim`);
      continue;
    }
    const under = bucket.underfilled || 0;
    const over = bucket.oversaturated || 0;
    const red = bucket.excessive_redundancy || 0;
    const dominated = under >= over && under >= red && under > 0;
    lines.push(`- **${id}**: underfilled ${under}/${bucket.decks}${dominated ? " — dominates named strain" : " — does not dominate named strain"}`);
  }
  const spell = tally.spellslinger;
  if (!spell?.decks) {
    lines.push("- **spellslinger**: not occupancy-opened — no oversaturation claim");
    lines.push("");
    lines.push("STOP — spellslinger did not replicate oversaturated/excessive_redundancy. Do not invent a threshold.");
  } else if (!spellslingerReplicated(spell)) {
    lines.push(`- **spellslinger**: ${spell.decks} occupied decks, 0 oversaturated, 0 excessive_redundancy`);
    lines.push("");
    lines.push("STOP — spellslinger did not replicate oversaturated/excessive_redundancy. Do not invent a threshold.");
  } else {
    lines.push(`- **spellslinger**: oversaturated ${spell.oversaturated}/${spell.decks}, excessive_redundancy ${spell.excessive_redundancy}/${spell.decks}`);
    lines.push("");
    lines.push("Spellslinger replicated oversaturated and/or excessive_redundancy. Naming is not a Lab, and not a new ceiling.");
  }
  lines.push("");
  return lines.join("\n");
}

function collectDeckRows(records = []) {
  return records.map((record) => {
    const occupiedPackageIds = occupiedPackageIdsFor(record);
    const analysis = analyzeCorpusDeck(record);
    return {
      occupiedPackageIds,
      packages: (analysis.packages || []).map((pkg) => ({
        id: pkg.id,
        issues: pkg.issues || [],
      })),
    };
  });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const live = await materializeLiveTournamentRecords({});
  if (!live.ok || !live.records.length) {
    console.error(`Live corpus unavailable: ${live.reason || "no records"}`);
    process.exitCode = 1;
    return;
  }
  const decks = collectDeckRows(live.records);
  const tally = tallyOccupiedHealthKinds(decks);
  const report = formatPackageHealthKindsReport(tally, { deckCount: live.records.length });
  writeFileSync(join(outDir, "epic6-package-health-kinds-closeout.md"), report);
  writeFileSync(join(outDir, "epic6-package-health-kinds-closeout.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    floorProposal: false,
    deckCount: live.records.length,
    tally,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
}

const isDirectRun = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
