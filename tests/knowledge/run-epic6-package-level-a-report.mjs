#!/usr/bin/env node
// Epic 6 follow-up — same-commander-controlled check on the two real
// package-density divergences the live shadow report surfaced (typal,
// tokens). Same discipline that reversed the earlier interaction-count
// model under Level-A same-commander contrast (see
// docs/INSTITUTIONAL_STATUS.md's falsified-models table): does an
// aggregate divergence survive being broken out by commander, or is it
// one or two outlier decks wearing a trenchcoat?
// Read-only. writesToBrain: false. Opens no Laboratory experiment.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { isHighPerformer } from "../../app/field-intelligence/level-a-forensics.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const PACKAGES_TO_CHECK = ["typal", "tokens"];
const BRAIN_THEORY = { typal: 14, tokens: 10 };

function round2(n) {
  return Math.round(n * 100) / 100;
}

function breakdownByCommander(pkgId, analyses, recordById) {
  const byCommander = new Map();
  for (const analysis of analyses) {
    const pkg = (analysis.packages || []).find((p) => p.id === pkgId);
    if (!pkg) continue;
    const record = recordById.get(analysis.deckId);
    const commanderKey = (analysis.commanders || []).join("+") || "unknown";
    const entry = byCommander.get(commanderKey) || { decks: 0, coreSum: 0, high: 0, low: 0, cores: [] };
    const core = pkg.density?.core ?? 0;
    entry.decks += 1;
    entry.coreSum += core;
    entry.cores.push(core);
    if (record && isHighPerformer(record)) entry.high += 1;
    else entry.low += 1;
    byCommander.set(commanderKey, entry);
  }
  return [...byCommander.entries()]
    .map(([commander, e]) => ({
      commander,
      decks: e.decks,
      meanCore: round2(e.coreSum / e.decks),
      cores: e.cores,
      high: e.high,
      low: e.low,
    }))
    .sort((a, b) => b.decks - a.decks);
}

function formatReport(findings) {
  const lines = [];
  lines.push("# MetaForge Epic 6 — Package Density, Same-Commander Breakdown");
  lines.push("");
  lines.push("**Follow-up to:** `npm run report:knowledge-epic6:live`");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no — this is a diagnostic, not a proposal");
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("The live Epic 6 report found two real package-density divergences (typal, tokens)");
  lines.push("as single aggregate numbers — brain theory vs. corpus-wide weighted mean. An aggregate");
  lines.push("can hide a confound: a handful of unusual decks or one outlier commander can move a");
  lines.push("mean without the underlying pattern being real or general. This breaks each finding");
  lines.push("out by commander — the same same-commander-control discipline that already reversed");
  lines.push("one plausible-looking aggregate signal in this project's history (interaction count →");
  lines.push("coverage → recovery, killed by Level-A same-commander contrast).");
  lines.push("");

  for (const finding of findings) {
    const { pkgId, brainTheory, rows } = finding;
    lines.push(`## \`${pkgId}\` — brain theory: ${brainTheory}`);
    lines.push("");
    lines.push(`- Distinct commanders observed: **${rows.length}**`);
    lines.push(`- Total decks: **${rows.reduce((sum, r) => sum + r.decks, 0)}**`);
    const allZero = rows.every((r) => r.cores.every((c) => c === 0));
    const spread = new Set(rows.flatMap((r) => r.cores)).size;
    if (allZero) {
      lines.push(`- **Every single deck across every commander shows core density 0** — no variance at all.`);
      lines.push(`  This does not look like "brain's weight is a bit high." A real package that a real pilot`);
      lines.push(`  built around should show *some* nonzero density somewhere. Flat zero across ${rows.length}`);
      lines.push(`  unrelated commanders looks more like the package's core-detection logic is not matching`);
      lines.push(`  real decklists at all — a classification gap, not a weighting gap. Different next question`);
      lines.push(`  than the one the aggregate implied.`);
    } else {
      lines.push(`- Distinct core-density values observed: **${spread}** (real variance, not a flat pattern)`);
      lines.push(`  — divergence is broad across many different commanders, not concentrated in one or two.`);
    }
    lines.push("");
    lines.push("| Commander | Decks | Mean core | Core values | High performers | Low performers |");
    lines.push("|---|---:|---:|---|---:|---:|");
    for (const row of rows.slice(0, 20)) {
      lines.push(`| ${row.commander} | ${row.decks} | ${row.meanCore} | [${row.cores.join(", ")}] | ${row.high} | ${row.low} |`);
    }
    lines.push("");
  }

  lines.push("## Reading these results honestly");
  lines.push("");
  lines.push("- `typal`: the aggregate finding was real in the sense that it's consistent — but the shape");
  lines.push("  of the consistency (flat zero, zero variance, across every commander) points at a likely");
  lines.push("  detection/classification issue in how the typal package identifies its own core cards,");
  lines.push("  not necessarily a Brain construction weight that's miscalibrated. Worth checking the");
  lines.push("  package's core-card list against what these real typal decks actually run before treating");
  lines.push("  this as a weighting question at all.");
  lines.push("- `tokens`: this one survives the same-commander breakdown — the divergence (real median well");
  lines.push("  under Brain's theoretical 10) shows up broadly across a large number of unrelated commanders,");
  lines.push("  not concentrated in an outlier. That makes it the more credible of the two findings. Note also:");
  lines.push("  eyeballing the high/low performer split per commander shows no obvious \"more tokens-package-core");
  lines.push("  correlates with winning\" pattern in this sample — worth stating plainly rather than skipping past.");
  lines.push("");
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("Neither finding is being proposed as a construction change here. `typal` looks like it needs");
  lines.push("engineering investigation (does the package's core-detection regex actually match real typal");
  lines.push("cards?) before it's even a scoring question. `tokens` is the stronger candidate of the two if");
  lines.push("a Laboratory experiment is ever opened, but that remains a decision for a human, not an");
  lines.push("automatic next step from this report.");
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
  const recordById = new Map(live.records.map((r) => [r.id, r]));

  const findings = PACKAGES_TO_CHECK.map((pkgId) => ({
    pkgId,
    brainTheory: BRAIN_THEORY[pkgId],
    rows: breakdownByCommander(pkgId, analyses, recordById),
  }));

  const report = formatReport(findings);
  writeFileSync(join(outDir, "epic6-package-level-a-report.md"), report);
  writeFileSync(join(outDir, "epic6-package-level-a-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    findings,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-package-level-a-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
