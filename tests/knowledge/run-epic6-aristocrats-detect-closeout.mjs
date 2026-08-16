#!/usr/bin/env node
// Epic 6 — aristocrats occupancy closeout.
// Uses detectAristocratsCommander on live commander oracles only.
// Does not go through analyzeCorpus (composition wiring may be in-flight).
// Read-only. writesToBrain: false. Opens no Laboratory experiment.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { detectAristocratsCommander } from "../../app/strategic-intent.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "");
}

export function classifyAristocratsDetect(records = []) {
  const byCommander = new Map();
  for (const record of records) {
    for (const commander of record.commanders || []) {
      const name = commander.name || "unknown";
      const entry = byCommander.get(name) || { name, decks: 0, opens: false };
      entry.decks += 1;
      entry.opens = entry.opens || detectAristocratsCommander(oracleOf(commander));
      byCommander.set(name, entry);
    }
  }
  const rows = [...byCommander.values()].sort((a, b) => b.decks - a.decks || a.name.localeCompare(b.name));
  const open = rows.filter((row) => row.opens);
  const watched = ["Chatterfang", "Korvold", "Magda"];
  const watchedRows = watched.map((needle) => ({
    needle,
    hits: rows.filter((row) => row.name.toLowerCase().includes(needle.toLowerCase())),
  }));
  return { commanderCount: rows.length, openCount: open.length, open, watchedRows };
}

function formatReport(classification) {
  const lines = [];
  lines.push("# MetaForge Epic 6 — Aristocrats Occupancy Detect Closeout");
  lines.push("");
  lines.push("**Brain changes:** 0 in this report (occupancy detect already shipped)");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no");
  lines.push("");
  lines.push("Live commander oracles only — not composition-of-the-99.");
  lines.push(`Commanders observed: **${classification.commanderCount}**. Opens aristocrats: **${classification.openCount}**.`);
  lines.push("");
  lines.push("## Watched names");
  lines.push("");
  for (const row of classification.watchedRows) {
    if (!row.hits.length) {
      lines.push(`- **${row.needle}**: not in this sample`);
      continue;
    }
    for (const hit of row.hits) {
      lines.push(`- **${hit.name}** (${hit.decks} decks): ${hit.opens ? "opens" : "still closed"}`);
    }
  }
  lines.push("");
  lines.push("## Commanders that now open");
  lines.push("");
  if (!classification.open.length) {
    lines.push("None.");
  } else {
    for (const row of classification.open) {
      lines.push(`- ${row.name} (${row.decks})`);
    }
  }
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
  const classification = classifyAristocratsDetect(live.records);
  const report = formatReport(classification);
  writeFileSync(join(outDir, "epic6-aristocrats-detect-closeout.md"), report);
  writeFileSync(join(outDir, "epic6-aristocrats-detect-closeout.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    classification,
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
