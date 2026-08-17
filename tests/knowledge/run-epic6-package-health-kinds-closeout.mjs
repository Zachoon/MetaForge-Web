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

export const UNNAMED_PACKAGE_HEALTH_KINDS = Object.freeze([
  "missing_leg",
  "poor_enabler_payoff_ratio",
  "unsupported_anchor",
  "weak_commander_connection",
  "slot_inefficient",
  "curve_conflict",
  "collective_duplication",
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


export function tallyUnnamedOccupiedHealthKinds(decks = []) {
  const totals = Object.fromEntries(UNNAMED_PACKAGE_HEALTH_KINDS.map((kind) => [kind, 0]));
  const byPackage = {};
  let occupiedDecks = 0;
  for (const deck of decks) {
    const occupied = new Set(deck.occupiedPackageIds || []);
    let counted = false;
    for (const pkg of deck.packages || []) {
      if (!occupied.has(pkg.id)) continue;
      if (!counted) {
        occupiedDecks += 1;
        counted = true;
      }
      if (!byPackage[pkg.id]) {
        byPackage[pkg.id] = Object.fromEntries(UNNAMED_PACKAGE_HEALTH_KINDS.map((kind) => [kind, 0]));
        byPackage[pkg.id].decks = 0;
      }
      byPackage[pkg.id].decks += 1;
      const kinds = new Set((pkg.issues || []).map((issue) => issue.kind || issue));
      for (const kind of UNNAMED_PACKAGE_HEALTH_KINDS) {
        if (kinds.has(kind)) {
          totals[kind] += 1;
          byPackage[pkg.id][kind] += 1;
        }
      }
    }
  }
  return { occupiedDecks, totals, byPackage };
}


function parseRatioDetail(detail = "") {
  const match = String(detail || "").match(/^(\d+):(\d+)$/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

/**
 * Diagnose the two remaining unnamed kinds on occupancy-opened packages.
 * Observation only — does not seat, retune floors, or change evaluatePackageHealth.
 */
export function diagnoseUnnamedOccupiedHealth(decks = []) {
  const ratio = {
    occupied: 0,
    minZero: 0,
    withMissingLeg: 0,
    byPackage: {},
    byDetail: {},
  };
  const anchors = {
    occupied: 0,
    byPackage: {},
    byDetail: {},
  };
  for (const deck of decks) {
    const occupied = new Set(deck.occupiedPackageIds || []);
    for (const pkg of deck.packages || []) {
      if (!occupied.has(pkg.id)) continue;
      const issues = pkg.issues || [];
      const kinds = new Set(issues.map((issue) => issue.kind || issue));
      if (kinds.has("poor_enabler_payoff_ratio")) {
        ratio.occupied += 1;
        if (!ratio.byPackage[pkg.id]) ratio.byPackage[pkg.id] = { decks: 0, minZero: 0, withMissingLeg: 0 };
        ratio.byPackage[pkg.id].decks += 1;
        const issue = issues.find((row) => (row.kind || row) === "poor_enabler_payoff_ratio");
        const parsed = parseRatioDetail(issue?.detail);
        const detail = String(issue?.detail || "unknown");
        ratio.byDetail[detail] = (ratio.byDetail[detail] || 0) + 1;
        if (parsed?.min === 0) {
          ratio.minZero += 1;
          ratio.byPackage[pkg.id].minZero += 1;
        }
        if (kinds.has("missing_leg")) {
          ratio.withMissingLeg += 1;
          ratio.byPackage[pkg.id].withMissingLeg += 1;
        }
      }
      if (kinds.has("unsupported_anchor")) {
        anchors.occupied += 1;
        if (!anchors.byPackage[pkg.id]) anchors.byPackage[pkg.id] = { decks: 0 };
        anchors.byPackage[pkg.id].decks += 1;
        const issue = issues.find((row) => (row.kind || row) === "unsupported_anchor");
        const detail = String(issue?.detail || "unknown");
        anchors.byDetail[detail] = (anchors.byDetail[detail] || 0) + 1;
      }
    }
  }
  return { ratio, anchors };
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
  lines.push("Named kinds: underfilled, oversaturated, excessive_redundancy.");
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
  lines.push("");
  const unnamed = options.unnamed || tallyUnnamedOccupiedHealthKinds([]);
  lines.push("## Unnamed health kinds (observation only)");
  lines.push("");
  lines.push("Do not seat. Do not invent a threshold.");
  lines.push("");
  if (!unnamed.occupiedDecks) {
    lines.push("No occupancy-opened packages in this sample.");
  } else {
    for (const kind of UNNAMED_PACKAGE_HEALTH_KINDS) {
      lines.push(`- **${kind}**: ${unnamed.totals[kind] || 0}`);
    }
    const pkgRows = Object.entries(unnamed.byPackage || {}).filter(([, row]) => row.decks);
    if (pkgRows.length) {
      lines.push("");
      lines.push("Per occupied package:");
      for (const [id, row] of pkgRows.sort((a, b) => a[0].localeCompare(b[0]))) {
        const parts = UNNAMED_PACKAGE_HEALTH_KINDS.filter((kind) => row[kind]).map((kind) => `${kind} ${row[kind]}/${row.decks}`);
        lines.push(`- **${id}**: ${parts.join(", ") || "no unnamed strain"}`);
      }
    }
  }
  lines.push("");
  const diagnosis = options.diagnosis || diagnoseUnnamedOccupiedHealth([]);
  lines.push("## Unnamed diagnosis (observation only)");
  lines.push("");
  lines.push("Do not seat. Do not invent a threshold. Do not change evaluatePackageHealth or balancedLegFloor.");
  lines.push("");
  lines.push("### poor_enabler_payoff_ratio");
  lines.push("");
  if (!diagnosis.ratio?.occupied) {
    lines.push("No occupancy-opened flags in this sample.");
  } else {
    const ratio = diagnosis.ratio;
    lines.push(`- Occupied flags: **${ratio.occupied}**`);
    lines.push(`- min=0 (empty-leg shadow): **${ratio.minZero}/${ratio.occupied}**`);
    lines.push(`- co-occurs with missing_leg: **${ratio.withMissingLeg}/${ratio.occupied}**`);
    const pkgRows = Object.entries(ratio.byPackage || {}).filter(([, row]) => row.decks);
    for (const [id, row] of pkgRows.sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- **${id}**: ${row.decks} flags, min=0 ${row.minZero}/${row.decks}, with missing_leg ${row.withMissingLeg}/${row.decks}`);
    }
    const details = Object.entries(ratio.byDetail || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    if (details.length) {
      lines.push("- Ratio details (top): " + details.map(([name, count]) => `${name} ${count}`).join("; "));
    }
    if (ratio.withMissingLeg >= ratio.occupied && ratio.occupied > 0) {
      lines.push("");
      lines.push("This kind is missing_leg's shadow on occupancy-opened packages — an empty required leg, not a separate occupancy engine.");
    } else if (ratio.withMissingLeg >= Math.ceil(ratio.occupied * 0.75) && ratio.occupied > 0) {
      lines.push("");
      lines.push("Most occupancy-opened flags travel with missing_leg. That is still not a separate occupancy engine. Do not seat.");
    } else if (ratio.minZero >= Math.ceil(ratio.occupied * 0.8) && ratio.occupied > 0) {
      lines.push("");
      lines.push("Most occupancy-opened flags have min=0. That is an empty required leg, not a new ratio engine. Do not seat.");
    }
  }
  lines.push("");
  lines.push("### unsupported_anchor");
  lines.push("");
  if (!diagnosis.anchors?.occupied) {
    lines.push("No occupancy-opened flags in this sample.");
  } else {
    const anchors = diagnosis.anchors;
    lines.push(`- Occupied flags: **${anchors.occupied}**`);
    const pkgRows = Object.entries(anchors.byPackage || {}).filter(([, row]) => row.decks);
    for (const [id, row] of pkgRows.sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- **${id}**: ${row.decks}`);
    }
    const details = Object.entries(anchors.byDetail || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    if (details.length) {
      lines.push("- Anchor details (top): " + details.map(([name, count]) => `${name} ${count}`).join("; "));
    }
    lines.push("");
    lines.push("Occupancy-opened unsupported_anchor stays unnamed. A named occupancy engine is not a verified interaction graph.");
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
  const unnamed = tallyUnnamedOccupiedHealthKinds(decks);
  const diagnosis = diagnoseUnnamedOccupiedHealth(decks);
  const report = formatPackageHealthKindsReport(tally, { deckCount: live.records.length, unnamed, diagnosis });
  writeFileSync(join(outDir, "epic6-package-health-kinds-closeout.md"), report);
  writeFileSync(join(outDir, "epic6-package-health-kinds-closeout.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    floorProposal: false,
    deckCount: live.records.length,
    tally,
    unnamed,
    diagnosis,
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
