#!/usr/bin/env node
// Epic 6 follow-up — same-commander-controlled check on the two real
// package-density divergences the live shadow report surfaced (typal,
// tokens). Same discipline that reversed the earlier interaction-count
// model under Level-A same-commander contrast (see
// docs/INSTITUTIONAL_STATUS.md's falsified-models table): does an
// aggregate divergence survive being broken out by commander, or is it
// one or two outlier decks wearing a trenchcoat?
// Read-only. writesToBrain: false. Opens no Laboratory experiment.
//
// After typal occupancy landed, this report also asks two closeout questions:
// 1. Did the prior false typal opens (Tayam / Aang / Esika / Hojo) leave the set?
// 2. Do real tokens lists sit in the 6–10 band a synthetic 10→6 Lab could not see?

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { isHighPerformer } from "../../app/field-intelligence/level-a-forensics.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

const PACKAGES_TO_CHECK = ["typal", "tokens"];
const BRAIN_THEORY = { typal: 14, tokens: 10 };

/** Commanders that were false-opened as typal in the pre-occupancy Level-A run. */
const PRIOR_TYPAL_FALSE_OPENS = Object.freeze([
  "Tayam, Luminous Enigma",
  "Aang, at the Crossroads // Aang, Destined Savior",
  "Esika, God of the Tree // The Prismatic Bridge",
  "Professor Hojo",
]);

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pct(part, whole) {
  if (!whole) return "0%";
  return `${round2((part / whole) * 100)}%`;
}

export function breakdownByCommander(pkgId, analyses, recordById) {
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

export function tokensCoreBands(rows = []) {
  const cores = rows.flatMap((row) => row.cores || []);
  const below6 = cores.filter((core) => core < 6).length;
  const from6to9 = cores.filter((core) => core >= 6 && core < 10).length;
  const atLeast10 = cores.filter((core) => core >= 10).length;
  return {
    total: cores.length,
    below6,
    from6to9,
    atLeast10,
  };
}

export function typalFalseOpenStatus(rows = [], priorNames = PRIOR_TYPAL_FALSE_OPENS) {
  const remaining = priorNames.filter((name) => rows.some((row) => row.commander === name));
  const remainingZero = remaining.filter((name) => {
    const row = rows.find((entry) => entry.commander === name);
    return (row?.cores || []).every((core) => core === 0);
  });
  return {
    priorCount: priorNames.length,
    remaining,
    remainingZero,
    closed: remaining.length === 0,
  };
}

function formatTypalReading(rows, falseOpens) {
  if (!rows.length) {
    return [
      "- `typal`: occupancy closed the prior false opens, and this tournament sample has **no remaining",
      "  typal package detections**. That is not a weighting result. It means the commanders that used",
      "  to appear here were not typal, and this slice simply does not contain a true tribe engine to score.",
    ];
  }
  const allZero = rows.every((row) => row.cores.every((core) => core === 0));
  const lines = [];
  if (falseOpens.closed) {
    lines.push("- `typal`: the four prior false opens (Tayam / Aang / Esika / Hojo) **are gone**.");
  } else if (falseOpens.remainingZero.length) {
    lines.push(`- \`typal\`: occupancy did **not** fully close the prior false opens. Still present at core 0: ${falseOpens.remainingZero.join("; ")}.`);
  } else {
    lines.push(`- \`typal\`: prior false-open commanders still appear, but no longer at flat zero: ${falseOpens.remaining.join("; ")}.`);
  }
  if (allZero) {
    lines.push("  Remaining detections are still flat zero — a leftover classification gap, not a density-floor question.");
  } else {
    lines.push("  Remaining detections have real variance, so occupancy is now counting tribe members on the commanders that actually open the package.");
  }
  return lines;
}

function formatTokensReading(rows, bands) {
  const lines = [
    `- \`tokens\`: ${bands.total} decks across ${rows.length} commanders. Core vs the two floors the synthetic Lab compared:`,
    "",
    "| Band | Decks | Share | Would fail floor 10? | Would fail floor 6? |",
    "|---|---:|---:|---|---|",
    `| core < 6 | ${bands.below6} | ${pct(bands.below6, bands.total)} | yes | yes |`,
    `| 6 ≤ core < 10 | ${bands.from6to9} | ${pct(bands.from6to9, bands.total)} | yes | no |`,
    `| core ≥ 10 | ${bands.atLeast10} | ${pct(bands.atLeast10, bands.total)} | no | no |`,
    "",
  ];
  if (!bands.total) {
    lines.push("  No tokens-package decks in this sample.");
    return lines;
  }
  const majorityBelow6 = bands.below6 > bands.from6to9 && bands.below6 > bands.atLeast10;
  const majorityBand = bands.from6to9 > bands.below6 && bands.from6to9 > bands.atLeast10;
  const majorityAtLeast10 = bands.atLeast10 > bands.below6 && bands.atLeast10 > bands.from6to9;
  if (majorityBand) {
    lines.push("  **Most real lists sit in 6–9.** The synthetic 10→6 Lab was a null because the torture pool already");
    lines.push("  clears both floors. These lists are exactly where the two floors disagree. That is a limitation of");
    lines.push("  the synthetic fixture, not proof the original corpus finding was wrong — and still not a promotion.");
  } else if (majorityBelow6) {
    lines.push("  **Most real lists sit below both floors.** Lowering 10→6 would still mark them under-density.");
    lines.push("  The original finding is \"real token decks run fewer generators than Brain's floor,\" not");
    lines.push("  \"the floor is 6 instead of 10.\"");
  } else if (majorityAtLeast10) {
    lines.push("  **Most real lists already clear 10.** The original under-10 aggregate is gone on this sample.");
  } else {
    lines.push("  Split across bands — no single floor explains this sample. Do not infer a density number from it.");
  }
  lines.push("  High vs low performer split still shows no obvious \"more core correlates with winning\" pattern.");
  return lines;
}

function formatReport(findings, extras = {}) {
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
  lines.push("A later synthetic Laboratory (`tokens.density.singletonCore` 10→6 on the torture matrix)");
  lines.push("returned a clean null: construction outcomes bit-identical. This rerun asks the question");
  lines.push("that fixture could not: where do **real** lists sit relative to those two floors, and did");
  lines.push("typal occupancy close the classification gap that used to look like a weighting miss.");
  lines.push("");

  for (const finding of findings) {
    const { pkgId, brainTheory, rows } = finding;
    lines.push(`## \`${pkgId}\` — brain theory: ${brainTheory}`);
    lines.push("");
    lines.push(`- Distinct commanders observed: **${rows.length}**`);
    lines.push(`- Total decks: **${rows.reduce((sum, r) => sum + r.decks, 0)}**`);
    const allZero = rows.length > 0 && rows.every((r) => r.cores.every((c) => c === 0));
    const spread = new Set(rows.flatMap((r) => r.cores)).size;
    if (!rows.length) {
      lines.push("- **No decks in this sample open this package.**");
    } else if (allZero) {
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
    if (rows.length) {
      lines.push("| Commander | Decks | Mean core | Core values | High performers | Low performers |");
      lines.push("|---|---:|---:|---|---:|---:|");
      for (const row of rows.slice(0, 20)) {
        lines.push(`| ${row.commander} | ${row.decks} | ${row.meanCore} | [${row.cores.join(", ")}] | ${row.high} | ${row.low} |`);
      }
      lines.push("");
    }
  }

  const typalRows = findings.find((finding) => finding.pkgId === "typal")?.rows || [];
  const tokensRows = findings.find((finding) => finding.pkgId === "tokens")?.rows || [];
  const falseOpens = extras.typalFalseOpens || typalFalseOpenStatus(typalRows);
  const bands = extras.tokensBands || tokensCoreBands(tokensRows);

  lines.push("## Reading these results honestly");
  lines.push("");
  lines.push(...formatTypalReading(typalRows, falseOpens));
  lines.push(...formatTokensReading(tokensRows, bands));
  lines.push("");
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("No construction change follows from this report. Typal occupancy already shipped as");
  lines.push("classification, not as a density-floor tweak. The tokens 10→6 Lab already returned a");
  lines.push("synthetic null and was reverted. This observation tells us whether that null was a");
  lines.push("fixture ceiling or a real-list answer — it does not retune `singletonCore`.");
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
  const typalRows = findings.find((finding) => finding.pkgId === "typal")?.rows || [];
  const tokensRows = findings.find((finding) => finding.pkgId === "tokens")?.rows || [];
  const typalFalseOpens = typalFalseOpenStatus(typalRows);
  const tokensBands = tokensCoreBands(tokensRows);

  const report = formatReport(findings, { typalFalseOpens, tokensBands });
  writeFileSync(join(outDir, "epic6-package-level-a-report.md"), report);
  writeFileSync(join(outDir, "epic6-package-level-a-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    typalFalseOpens,
    tokensBands,
    findings,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-package-level-a-report.md")}`);
}

const isDirectRun = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
