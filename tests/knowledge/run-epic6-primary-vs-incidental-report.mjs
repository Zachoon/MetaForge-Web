#!/usr/bin/env node
// Epic 6 — tests a narrower hypothesis than "the floor mechanism is broadly
// wrong": that floor mismatches track PRIMARY vs INCIDENTAL package
// engagement, not package identity. A commander whose oracle opens a
// package with one line, or a deck where composition clears the trigger's
// low bar but the package is one of several loosely running at once, was
// never necessarily built AROUND that package — but the floor force-fills
// toward "this is your strategy" regardless.
//
// Proxy for primary vs incidental (statedArchetype/archetypeTags are empty
// for all 359 real records — verified, not a usable signal): how many
// packages are open in the SAME deck at once. A deck with only 1-2 packages
// open has nowhere else for its identity to sit except those; a deck with
// 3+ open is running several light synergies, none obviously "the" plan.
// This is independent of the floor comparison itself — not circular.
//
// Read-only. writesToBrain: false. Opens no Laboratory experiment. Proposes
// no fix — tests whether the hypothesis holds before scoping one.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const FOCUSED_MAX_OPEN = 2; // this package + at most 1 other open in the same deck

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pct(part, whole) {
  if (!whole) return null;
  return round2((part / whole) * 100);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : round2((sorted[mid - 1] + sorted[mid]) / 2);
}

function summarize(group, floor) {
  if (!group.length || floor == null) return null;
  const cores = group.map((r) => r.core);
  const below = cores.filter((c) => c < floor).length;
  return {
    decks: group.length,
    medianCore: median(cores),
    belowFloorShare: pct(below, group.length),
  };
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

  const rows = [];
  for (const analysis of analyses) {
    const openCount = (analysis.packages || []).length;
    const bucket = openCount <= FOCUSED_MAX_OPEN ? "focused" : "diffuse";
    for (const pkg of analysis.packages || []) {
      rows.push({
        pkgId: pkg.id,
        label: pkg.label,
        bucket,
        floor: pkg.density?.floor ?? null,
        core: pkg.density?.core ?? 0,
        openCount,
      });
    }
  }

  const pkgIds = [...new Set(rows.map((r) => r.pkgId))].sort();
  const results = pkgIds.map((pkgId) => {
    const pkgRows = rows.filter((r) => r.pkgId === pkgId);
    const floor = pkgRows[0]?.floor ?? null;
    const focused = summarize(pkgRows.filter((r) => r.bucket === "focused"), floor);
    const diffuse = summarize(pkgRows.filter((r) => r.bucket === "diffuse"), floor);
    const gap = focused && diffuse && focused.belowFloorShare != null && diffuse.belowFloorShare != null
      ? round2(diffuse.belowFloorShare - focused.belowFloorShare)
      : null;
    return { pkgId, label: pkgRows[0]?.label, floor, totalDecks: pkgRows.length, focused, diffuse, gap };
  });

  const lines = [];
  lines.push("# MetaForge Epic 6 — Primary vs. Incidental Package Engagement");
  lines.push("");
  lines.push("**Follow-up to:** `npm run report:knowledge-epic6:all-packages` (4 of 9 packages showed");
  lines.push("broad/severe floor mismatches)");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no — tests a hypothesis, proposes no fix");
  lines.push("");
  lines.push("## The hypothesis");
  lines.push("");
  lines.push("Floor mismatches don't track *which package* — they track whether the deck was actually");
  lines.push("**built around** the package or only lightly engaging it. Proxy (statedArchetype/");
  lines.push("archetypeTags are empty for all 359 real records — checked, not usable): how many packages");
  lines.push("are open in the same deck at once. `focused` = this package plus at most 1 other open;");
  lines.push("`diffuse` = 3+ packages open in the same deck. If the hypothesis holds, `focused` decks");
  lines.push(`should clear the floor far more often than \`diffuse\` decks, for the *same* package.`);
  lines.push("");
  lines.push("## Focused vs. diffuse, by package");
  lines.push("");
  lines.push("| Package | Floor | Focused: decks / below-floor% | Diffuse: decks / below-floor% | Gap (diffuse − focused) |");
  lines.push("|---|---:|---|---|---:|");
  for (const r of results) {
    const f = r.focused ? `${r.focused.decks} / ${r.focused.belowFloorShare ?? "—"}%` : "— (0 decks)";
    const d = r.diffuse ? `${r.diffuse.decks} / ${r.diffuse.belowFloorShare ?? "—"}%` : "— (0 decks)";
    lines.push(`| ${r.label} | ${r.floor ?? "—"} | ${f} | ${d} | ${r.gap != null ? `${r.gap}pt` : "—"}`);
  }
  lines.push("");

  const withBothBuckets = results.filter((r) => r.gap != null);
  const bigGap = withBothBuckets.filter((r) => r.gap >= 20);
  const smallGap = withBothBuckets.filter((r) => r.gap < 20 && r.gap > -20);
  const inverted = withBothBuckets.filter((r) => r.gap <= -20);

  lines.push("## Reading this honestly");
  lines.push("");
  lines.push(`${withBothBuckets.length} of ${results.length} packages had real decks in both buckets to compare.`);
  lines.push("");
  if (bigGap.length) {
    lines.push(`**Supports the hypothesis (≥20pt gap, diffuse decks miss the floor much more than focused ones):**`);
    for (const r of bigGap) {
      lines.push(`- **${r.label}**: focused ${r.focused.belowFloorShare}% below floor (${r.focused.decks} decks) vs. diffuse ${r.diffuse.belowFloorShare}% (${r.diffuse.decks} decks).`);
    }
    lines.push("");
  }
  if (smallGap.length) {
    lines.push(`**Does not support the hypothesis (gap under 20pt either way):**`);
    for (const r of smallGap) {
      lines.push(`- **${r.label}**: focused ${r.focused.belowFloorShare}% vs. diffuse ${r.diffuse.belowFloorShare}%.`);
    }
    lines.push("");
  }
  if (inverted.length) {
    lines.push(`**Inverted (focused decks miss the floor MORE than diffuse ones — contradicts the hypothesis):**`);
    for (const r of inverted) {
      lines.push(`- **${r.label}**: focused ${r.focused.belowFloorShare}% vs. diffuse ${r.diffuse.belowFloorShare}%.`);
    }
    lines.push("");
  }
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("No floor retuned, no force-fill logic changed. This only tests whether \"primary vs.");
  lines.push("incidental\" explains the earlier mismatch pattern better than \"which package\" does.");
  lines.push("");

  const report = lines.join("\n");
  writeFileSync(join(outDir, "epic6-primary-vs-incidental-report.md"), report);
  writeFileSync(join(outDir, "epic6-primary-vs-incidental-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    focusedMaxOpen: FOCUSED_MAX_OPEN,
    results,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-primary-vs-incidental-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
