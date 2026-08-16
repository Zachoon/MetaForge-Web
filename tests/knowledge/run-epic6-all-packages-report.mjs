#!/usr/bin/env node
// Epic 6 — same-commander-controlled density check across EVERY package,
// not just typal/tokens. The question: was tokens (60%+ of real decks
// below floor, broad across 29 commanders) a one-off, or does "a hard
// floor that force-adds cards toward a fixed number doesn't match real
// deck shape" repeat elsewhere?
//
// Reuses breakdownByCommander from the typal/tokens closeout report
// (imported, not reimplemented) so the same-commander discipline stays
// identical across reports instead of drifting.
// Read-only. writesToBrain: false. Opens no Laboratory experiment.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { breakdownByCommander } from "./run-epic6-package-level-a-report.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pct(part, whole) {
  if (!whole) return "0%";
  return `${round2((part / whole) * 100)}%`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : round2((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Every package id the real corpus actually detected, with its theoretical floor. */
function discoverPackages(analyses) {
  const byId = new Map();
  for (const analysis of analyses) {
    for (const pkg of analysis.packages || []) {
      if (!byId.has(pkg.id)) {
        byId.set(pkg.id, { id: pkg.id, label: pkg.label || pkg.id, floor: pkg.density?.floor ?? null });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const VERDICT_LABEL = {
  matches_theory: "Matches theory — most real decks clear the floor",
  moderate_mismatch: "Moderate mismatch",
  concentrated_mismatch: "Real gap, but too few commanders to call it broad",
  broad_mismatch: "Broad mismatch — majority run under the floor, many commanders",
  severe_mismatch: "Severe mismatch — majority run under HALF the floor, many commanders",
  insufficient_sample: "Too few real decks observed to say anything",
  no_data: "No real decks observed running this package",
  no_floor: "No theoretical floor found on this package",
};

/**
 * Same-commander-controlled verdict. "Broad"/"severe" require at least 3
 * distinct commanders — a gap that only shows up on one or two commanders
 * is exactly the kind of concentrated, non-general signal the tokens
 * follow-up was built to catch, not evidence of a systemic pattern.
 */
export function verdictFor(cores, floor, commanders) {
  if (!cores.length) return "no_data";
  if (floor == null) return "no_floor";
  if (cores.length < 3) return "insufficient_sample";
  const shareBelow = cores.filter((c) => c < floor).length / cores.length;
  const shareBelowHalf = cores.filter((c) => c < floor / 2).length / cores.length;
  if (shareBelow < 0.25) return "matches_theory";
  const broadEnough = commanders >= 3;
  if (shareBelowHalf >= 0.4 && broadEnough) return "severe_mismatch";
  if (shareBelow >= 0.6 && broadEnough) return "broad_mismatch";
  if (shareBelow >= 0.6 || shareBelowHalf >= 0.4) return "concentrated_mismatch";
  return "moderate_mismatch";
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

  const packages = discoverPackages(analyses);
  const results = packages.map((pkg) => {
    const rows = breakdownByCommander(pkg.id, analyses, recordById);
    const cores = rows.flatMap((row) => row.cores || []);
    const commanders = rows.length;
    const decks = cores.length;
    const belowFloor = pkg.floor != null ? cores.filter((c) => c < pkg.floor).length : null;
    const verdict = verdictFor(cores, pkg.floor, commanders);
    return {
      id: pkg.id,
      label: pkg.label,
      floor: pkg.floor,
      commanders,
      decks,
      medianCore: median(cores),
      meanCore: decks ? round2(cores.reduce((sum, c) => sum + c, 0) / decks) : null,
      belowFloor,
      belowFloorShare: belowFloor != null && decks ? pct(belowFloor, decks) : null,
      verdict,
      verdictLabel: VERDICT_LABEL[verdict],
    };
  });

  const lines = [];
  lines.push("# MetaForge Epic 6 — Real-List Density Check, Every Package");
  lines.push("");
  lines.push("**Follow-up to:** `npm run report:knowledge-epic6:package-level-a` (typal/tokens closeout)");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no — this is a diagnostic, not a proposal");
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("`tokens` showed a broad, same-commander-controlled mismatch between Brain's theoretical");
  lines.push("core-density floor and what real tournament decks actually run — 60%+ of real tokens decks");
  lines.push("sit below even a lowered floor, across 29 commanders. That raised a bigger question than one");
  lines.push("package: is a hard floor that force-adds cards toward a fixed number the wrong mechanism");
  lines.push("generally, or was tokens a one-off? This checks every package the real corpus exercises,");
  lines.push("using the identical same-commander-controlled method — imported, not reimplemented, so the");
  lines.push("discipline can't drift between reports.");
  lines.push("");
  lines.push("## Every package, real decks vs. Brain's theoretical floor");
  lines.push("");
  lines.push("| Package | Floor | Commanders | Decks | Median core | Mean core | Below floor | Verdict |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    lines.push(`| ${r.label} | ${r.floor ?? "—"} | ${r.commanders} | ${r.decks} | ${r.medianCore ?? "—"} | ${r.meanCore ?? "—"} | ${r.belowFloorShare ?? "—"} | ${r.verdictLabel} |`);
  }
  lines.push("");

  const broadOrSevere = results.filter((r) => r.verdict === "broad_mismatch" || r.verdict === "severe_mismatch");
  const concentrated = results.filter((r) => r.verdict === "concentrated_mismatch");
  const matches = results.filter((r) => r.verdict === "matches_theory");
  const noData = results.filter((r) => r.verdict === "no_data" || r.verdict === "insufficient_sample");

  lines.push("## Reading this honestly");
  lines.push("");
  if (broadOrSevere.length) {
    lines.push(`**${broadOrSevere.length} of ${results.length} observed packages show the same broad/severe pattern tokens did:**`);
    for (const r of broadOrSevere) {
      lines.push(`- **${r.label}**: floor ${r.floor}, real median ${r.medianCore}, ${r.belowFloorShare} of decks below floor, across ${r.commanders} commanders.`);
    }
    lines.push("");
    if (broadOrSevere.length >= 3) {
      lines.push("This is no longer a one-package quirk. Enough packages show the same shape that the");
      lines.push("floor-and-force-fill mechanism itself deserves scrutiny, not just individual density");
      lines.push("numbers. That is a bigger, architectural question than any single Laboratory experiment");
      lines.push("settles — a decision for a human, not an automatic next step from this report.");
    } else {
      lines.push("Still a small number relative to the full catalog — worth watching each one individually,");
      lines.push("not yet enough to call the floor mechanism itself the problem.");
    }
    lines.push("");
  } else {
    lines.push("**No other package shows the broad/severe pattern tokens did.** Tokens looks like a genuine");
    lines.push("one-off — a package-specific miscalibration, not a symptom of the floor mechanism being");
    lines.push("wrong in general.");
    lines.push("");
  }
  if (concentrated.length) {
    lines.push(`**Real gaps that don't (yet) qualify as broad:** ${concentrated.map((r) => `${r.label} (${r.commanders} commander${r.commanders === 1 ? "" : "s"})`).join(", ")}.`);
    lines.push("Worth a second look once more real decks for these commanders are observed — a gap on one or");
    lines.push("two commanders is exactly the shape a concentrated outlier takes, not proof of a real pattern.");
    lines.push("");
  }
  if (matches.length) {
    lines.push(`**Matches Brain's theory reasonably well:** ${matches.map((r) => r.label).join(", ")}.`);
    lines.push("");
  }
  if (noData.length) {
    lines.push(`**No usable real-corpus signal yet for:** ${noData.map((r) => r.label).join(", ")} — absence of data, not evidence of a match either way.`);
    lines.push("");
  }
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("Nothing here retunes any density constant. This exists to answer whether tokens was a");
  lines.push("one-off or a pattern, using evidence instead of guessing either way.");
  lines.push("");

  const report = lines.join("\n");
  writeFileSync(join(outDir, "epic6-all-packages-density-report.md"), report);
  writeFileSync(join(outDir, "epic6-all-packages-density-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    results,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-all-packages-density-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
