#!/usr/bin/env node
// Epic 6 — does Brain's cohesion gate (the pass/fail verdict every forged
// deck is held to) actually correlate with real-world tournament
// performance? Every prior report this session measured whether specific
// numbers (package floors) matched real decks. This asks a more
// foundational question: does the health system's own verdict predict
// which real decks actually did well, or is it orthogonal to results?
//
// isHighPerformer (topCut/placement=1/strongFinish) is independent real
// tournament data, not derived from anything strategic-intent.mjs computes.
// Read-only. writesToBrain: false. Opens no Laboratory experiment.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { isHighPerformer } from "../../app/field-intelligence/level-a-forensics.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pct(part, whole) {
  if (!whole) return null;
  return round2((part / whole) * 100);
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

  const rows = analyses.map((analysis) => {
    const record = recordById.get(analysis.deckId);
    return {
      commanders: (analysis.commanders || []).join(" // "),
      cohesionPassed: analysis.cohesion?.passed !== false,
      strongRatio: analysis.justification?.strongRatio ?? null,
      highPerformer: record ? isHighPerformer(record) : false,
    };
  });

  const high = rows.filter((r) => r.highPerformer);
  const low = rows.filter((r) => !r.highPerformer);
  const cohesionPassShare = (group) => pct(group.filter((r) => r.cohesionPassed).length, group.length);

  const highPass = cohesionPassShare(high);
  const lowPass = cohesionPassShare(low);
  const gap = highPass != null && lowPass != null ? round2(highPass - lowPass) : null;

  // Package status/issue distribution, independent of the performance question.
  const statusCounts = new Map();
  const issueCounts = new Map();
  for (const analysis of analyses) {
    for (const pkg of analysis.packages || []) {
      statusCounts.set(pkg.status, (statusCounts.get(pkg.status) || 0) + 1);
      for (const issue of pkg.issues || []) {
        const key = issue?.kind || String(issue);
        issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
      }
    }
  }
  const totalPackageInstances = [...statusCounts.values()].reduce((a, b) => a + b, 0);

  const lines = [];
  lines.push("# MetaForge Epic 6 — Does the Cohesion Gate Track Real Performance?");
  lines.push("");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no");
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("Every prior real-corpus report this session checked whether a specific number (a package");
  lines.push("floor) matched real decks. This checks something more foundational: does the cohesion gate's");
  lines.push("own pass/fail verdict — applied post-hoc to real decklists — actually track which decks did");
  lines.push("well in real tournaments? `isHighPerformer` (topCut / placement=1 / strongFinish) is real");
  lines.push("tournament data, independent of anything strategic-intent.mjs computes.");
  lines.push("");
  lines.push("## Cohesion pass rate: high performers vs. everyone else");
  lines.push("");
  lines.push(`| Group | Decks | Cohesion pass rate |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| High performers (topCut/won/strong finish) | ${high.length} | ${highPass ?? "—"}% |`);
  lines.push(`| Everyone else | ${low.length} | ${lowPass ?? "—"}% |`);
  lines.push(`| Gap | | ${gap != null ? `${gap}pt` : "—"} |`);
  lines.push("");
  lines.push("## Reading this honestly");
  lines.push("");
  if (gap == null || high.length < 10) {
    lines.push("Too few high performers in this sample to say anything meaningful about the gap.");
  } else if (Math.abs(gap) < 5) {
    lines.push("**No meaningful gap.** The cohesion gate passes real winning decks and real non-winning");
    lines.push("decks at essentially the same rate — its verdict doesn't predict tournament performance");
    lines.push("either way. That's not necessarily damning (deck power and \"did Brain like the deckbuild");
    lines.push("shape\" are different questions), but it means cohesion pass/fail shouldn't be read as a");
    lines.push("proxy for \"this deck is good.\"");
  } else if (gap > 0) {
    lines.push(`**High performers pass cohesion ${gap}pt more often.** Weak, directional evidence that the`);
    lines.push("gate tracks something real about deck quality, not just an arbitrary internal bar.");
  } else {
    lines.push(`**High performers pass cohesion ${Math.abs(gap)}pt LESS often than everyone else.** That's`);
    lines.push("the opposite of what you'd want from a health gate — worth real scrutiny, not dismissal.");
  }
  lines.push("");
  lines.push("## Package status distribution across all real decks");
  lines.push("");
  lines.push(`${totalPackageInstances} total package instances observed across ${analyses.length} real decks.`);
  lines.push("");
  lines.push("| Status | Count | Share |");
  lines.push("|---|---:|---:|");
  for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${status} | ${count} | ${pct(count, totalPackageInstances)}% |`);
  }
  lines.push("");
  lines.push("## Most common health issues flagged");
  lines.push("");
  lines.push("| Issue | Count |");
  lines.push("|---|---:|");
  for (const [issue, count] of [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    lines.push(`| ${issue} | ${count} |`);
  }
  lines.push("");
  lines.push("## Still not a Laboratory experiment");
  lines.push("");
  lines.push("No cohesion logic changed, no thresholds retuned. This only asks whether the existing gate's");
  lines.push("verdict lines up with real results.");
  lines.push("");

  const report = lines.join("\n");
  writeFileSync(join(outDir, "epic6-cohesion-vs-performance-report.md"), report);
  writeFileSync(join(outDir, "epic6-cohesion-vs-performance-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    high: { decks: high.length, cohesionPassShare: highPass },
    low: { decks: low.length, cohesionPassShare: lowPass },
    gap,
    statusCounts: Object.fromEntries(statusCounts),
    issueCounts: Object.fromEntries(issueCounts),
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-cohesion-vs-performance-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
