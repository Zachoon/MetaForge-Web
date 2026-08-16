#!/usr/bin/env node
// Epic 6 — remaining catalog occupancy detect, commander oracles only.
// Empty blueprint (no rows) so composition-of-the-99 cannot hide a
// detectCommander hole or invent an open. Read-only. writesToBrain: false.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { buildStrategicIntent } from "../../app/strategic-intent.mjs";
import { STRATEGIC_PACKAGE_IDS } from "./run-epic6-unseen-packages-report.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const EMPTY_BLUEPRINT = Object.freeze({
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
});

/** Commanders that must stay closed. Not detection misses. */
export const REMAINING_DETECT_REJECTS = Object.freeze({
  aristocrats: Object.freeze(["Magda"]),
});

export const REMAINING_DETECT_CANARIES = Object.freeze({
  auras: Object.freeze(["Light-Paws", "Sythis", "Pearl-Ear", "Galea", "Uril", "Calix"]),
  equipment: Object.freeze(["Ardenn, Intrepid Archaeologist", "Nahiri, the Lithomancer", "Wyleth, Soul of Steel", "Balan, Wandering Knight", "Akiri, Line-Slinger"]),
  aristocrats: Object.freeze(["Teysa Karlov", "Korvold", "Prossh", "Chatterfang", "Elenda"]),
  blink: Object.freeze(["Brago", "Yorion", "Preston", "Roon", "Ephara"]),
  reanimator: Object.freeze(["Meren", "Muldrotha", "Nethroi", "Karador"]),
  landfall: Object.freeze(["Tatyova", "Aesi", "Omnath"]),
  spellslinger: Object.freeze(["Kess, Dissident Mage", "Stella Lee", "Niv-Mizzet"]),
  stax: Object.freeze(["Grand Arbiter", "Derevi", "Drannith Magistrate"]),
  tokens: Object.freeze(["Chatterfang", "Krenko", "Rhys the Redeemed"]),
  typal: Object.freeze(["Sliver", "Edgar Markov", "The Ur-Dragon"]),
});

function packagesOpenedBy(commander = {}) {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander },
    { blueprint: EMPTY_BLUEPRINT },
  );
  return [...(intent.packageIds || [])];
}

function canaryHit(name, needle) {
  const hay = String(name || "").toLowerCase();
  const want = String(needle || "").toLowerCase();
  if (want === "balan") return hay === "balan" || hay.startsWith("balan,") || hay.startsWith("balan ");
  if (want === "magda") return hay.includes("magda");
  return hay === want || hay.startsWith(`${want},`) || hay.startsWith(`${want} `) || hay.includes(` ${want}`) || hay.startsWith(`${want}+`) || hay.includes(`+${want}`);
}

export function classifyRemainingDetect(records = []) {
  const byCommander = new Map();
  for (const record of records) {
    for (const commander of record.commanders || []) {
      const name = commander.name || "unknown";
      const entry = byCommander.get(name) || {
        name,
        decks: 0,
        packages: packagesOpenedBy(commander),
      };
      entry.decks += 1;
      byCommander.set(name, entry);
    }
  }
  const rows = [...byCommander.values()].sort((a, b) => b.decks - a.decks || a.name.localeCompare(b.name));
  const opened = Object.fromEntries(STRATEGIC_PACKAGE_IDS.map((id) => [
    id,
    rows.filter((row) => row.packages.includes(id)),
  ]));
  const watched = Object.fromEntries(Object.entries(REMAINING_DETECT_CANARIES).map(([id, needles]) => {
    const hits = rows.filter((row) => needles.some((needle) => canaryHit(row.name, needle)));
    return [id, hits.map((row) => ({
      name: row.name,
      decks: row.decks,
      opens: row.packages.includes(id),
      packages: row.packages,
    }))];
  }));
  const detectionFailures = Object.entries(watched)
    .filter(([, hits]) => hits.some((hit) => !hit.opens))
    .map(([id, hits]) => ({
      id,
      closed: hits.filter((hit) => !hit.opens),
      opened: hits.filter((hit) => hit.opens),
    }));
  const sampleGaps = Object.entries(watched)
    .filter(([, hits]) => !hits.length)
    .map(([id]) => id);
  const rejects = Object.fromEntries(Object.entries(REMAINING_DETECT_REJECTS).map(([id, needles]) => {
    const hits = rows.filter((row) => needles.some((needle) => canaryHit(row.name, needle)));
    return [id, hits.map((row) => ({
      name: row.name,
      decks: row.decks,
      opens: row.packages.includes(id),
      packages: row.packages,
    }))];
  }));
  return {
    commanderCount: rows.length,
    openedCounts: Object.fromEntries(STRATEGIC_PACKAGE_IDS.map((id) => [id, opened[id].length])),
    opened,
    watched,
    rejects,
    detectionFailures,
    sampleGaps,
  };
}

function formatReport(classification) {
  const lines = [];
  lines.push("# MetaForge Epic 6 — Remaining Occupancy Detect Closeout");
  lines.push("");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no");
  lines.push("");
  lines.push("Commander oracles only — empty blueprint, no composition-of-the-99.");
  lines.push(`Commanders observed: **${classification.commanderCount}**.`);
  lines.push("");
  lines.push("## Packages opened by detectCommander");
  lines.push("");
  for (const id of STRATEGIC_PACKAGE_IDS) {
    const count = classification.openedCounts[id];
    lines.push(`- **${id}**: ${count} commander${count === 1 ? "" : "s"}`);
  }
  lines.push("");
  lines.push("## Watched canaries");
  lines.push("");
  for (const [id, hits] of Object.entries(classification.watched)) {
    if (!hits.length) {
      lines.push(`- **${id}**: not in this sample`);
      continue;
    }
    for (const hit of hits) {
      lines.push(`- **${id} / ${hit.name}** (${hit.decks}): ${hit.opens ? "opens" : "still closed"} [${hit.packages.join(", ") || "none"}]`);
    }
  }
  lines.push("");
  lines.push("## Reject watches (must stay closed)");
  lines.push("");
  const rejectEntries = Object.entries(classification.rejects || {});
  if (!rejectEntries.some(([, hits]) => hits.length)) {
    lines.push("None of the reject names are in this sample.");
  } else {
    for (const [id, hits] of rejectEntries) {
      for (const hit of hits) {
        lines.push(`- **${id} / ${hit.name}** (${hit.decks}): ${hit.opens ? "FALSE OPEN" : "still closed"}`);
      }
    }
  }
  lines.push("");
  if (classification.detectionFailures.length) {
    lines.push("## Detection misses (canary present, package still closed)");
    lines.push("");
    for (const row of classification.detectionFailures) {
      for (const hit of row.closed) {
        lines.push(`- ${row.id}: ${hit.name}`);
      }
    }
    lines.push("");
  } else {
    lines.push("## Detection misses");
    lines.push("");
    lines.push("None among watched canaries that are actually in this sample.");
    lines.push("");
  }
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
  const classification = classifyRemainingDetect(live.records);
  const report = formatReport(classification);
  writeFileSync(join(outDir, "epic6-remaining-detect-closeout.md"), report);
  writeFileSync(join(outDir, "epic6-remaining-detect-closeout.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    classification: {
      commanderCount: classification.commanderCount,
      openedCounts: classification.openedCounts,
      watched: classification.watched,
      rejects: classification.rejects,
      detectionFailures: classification.detectionFailures,
      sampleGaps: classification.sampleGaps,
    },
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
