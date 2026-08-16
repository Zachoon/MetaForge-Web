#!/usr/bin/env node
// Epic 6 — Brain Shadow Evaluation against REAL tournament records, not
// fixtures. Closes a real gap: Epic 6 previously only ever ran against
// materializeCompetitiveFixtureCorpus(). Read-only. Brain v1 remains frozen.
// writesToBrain: false

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { buildBrainShadowEvaluation } from "../../app/knowledge/brain-shadow-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
    }
  }
}

function argFlag(flag) {
  return process.argv.includes(flag);
}

function formatReport(shadow, ingest) {
  const lines = [];
  lines.push("# MetaForge Brain Shadow Evaluation — Epic 6 (Live Corpus)");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 6 — Brain Shadow Evaluation");
  lines.push("**Corpus:** real TopDeck.gg tournament decks, not fixtures");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**brainV1RemainsFrozen:** true");
  lines.push("**promoted:** false");
  lines.push("");
  lines.push(`**Ingest mode:** ${ingest.ingestMode}`);
  lines.push(`**Attribution:** ${ingest.attribution?.name || "TopDeck.gg"}`);
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Real decks shadowed | ${shadow.corpus.decks} |`);
  lines.push(`| Package core ranges compared | ${shadow.corpus.packageCoreRanges} |`);
  lines.push(`| Brain↔corpus agreements | ${shadow.brainHumanCompare.agreements} |`);
  lines.push(`| Human-supported blind spots | ${shadow.brainHumanCompare.humanSupportedBlindSpots} |`);
  lines.push(`| Brain theory divergences | ${shadow.brainHumanCompare.metaforgeDisagreements} |`);
  lines.push(`| Elite contradictions cross-checked | ${shadow.knowledgeCrossCheck.eliteContradictions} |`);
  lines.push(`| Expert concept candidates noted | ${shadow.knowledgeCrossCheck.expertCandidates} |`);
  lines.push(`| Shadow findings (capped) | ${shadow.shadowFindings.length} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("`npm run report:knowledge-epic6` only ever shadowed Brain v1 against a");
  lines.push("synthetic fixture corpus. This is the same shadow-evaluation machinery,");
  lines.push("pointed at real cached TopDeck.gg tournament decks instead — the same");
  lines.push("\"check against real controls before trusting a fixture signal\" discipline");
  lines.push("that already falsified two earlier plausible-sounding models (see");
  lines.push("`docs/INSTITUTIONAL_STATUS.md`'s falsified-models table).");
  lines.push("");
  lines.push("### Brain↔corpus sample (real decks)");
  lines.push("");
  for (const row of shadow.brainHumanCompare.sampleAgreements.slice(0, 8)) {
    lines.push(`- Agreement: ${row.packageId} — brain ${row.brainTheory} vs corpus ${row.corpusWeightedMean} (n=${row.n})`);
  }
  for (const row of shadow.brainHumanCompare.sampleBlindSpots.slice(0, 8)) {
    lines.push(`- Blind spot: ${row.packageId || row.kind} — ${row.note}`);
  }
  for (const row of shadow.brainHumanCompare.sampleDisagreements.slice(0, 8)) {
    lines.push(`- Divergence: ${row.packageId} — brain ${row.brainTheory} vs corpus ${row.corpusWeightedMean} (n=${row.n}) — ${row.note}`);
  }
  if (!shadow.brainHumanCompare.sampleAgreements.length
    && !shadow.brainHumanCompare.sampleBlindSpots.length
    && !shadow.brainHumanCompare.sampleDisagreements.length) {
    lines.push("- No package-density comparisons crossed sample thresholds in this real slice.");
  }
  lines.push("");
  lines.push("### Shadow findings on real decks (none promote)");
  lines.push("");
  for (const finding of shadow.shadowFindings.slice(0, 20)) {
    lines.push(`- **${finding.kind}** · ${finding.subject} — ${finding.detail}`);
  }
  if (!shadow.shadowFindings.length) lines.push("- None surfaced against this real slice.");
  lines.push("");
  lines.push("## Promotion gate");
  lines.push("");
  lines.push(`- ${shadow.promotionGate.note}`);
  lines.push(`- Required next: ${shadow.promotionGate.requiredNext}`);
  lines.push("");
  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- No Brain weight / package / branch changes.");
  lines.push("- No opening a Laboratory experiment from this report alone.");
  lines.push("- Epic 7 simulation scale remains deferred until the textbook exists.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  loadLocalEnv();
  mkdirSync(outDir, { recursive: true });
  const refresh = argFlag("--refresh");

  console.log("MetaForge — Epic 6 Brain Shadow Evaluation, live corpus");
  console.log(`refresh=${refresh} brainChanges=0`);

  const live = await materializeLiveTournamentRecords({ refresh });
  if (!live.ok || !live.records.length) {
    console.error(`Live corpus unavailable: ${live.reason || "no records"}`);
    console.error("Run with --refresh and TOPDECK_API_KEY, or ensure the live-cache exists.");
    process.exitCode = 1;
    return;
  }

  const shadow = buildBrainShadowEvaluation({ records: live.records, label: "live-tournament-corpus" });
  const report = formatReport(shadow, live);
  const json = {
    writesToBrain: false,
    brainV1RemainsFrozen: true,
    epic: 6,
    corpusSource: "live",
    brainChanges: 0,
    ingestMode: live.ingestMode,
    attribution: live.attribution,
    corpus: shadow.corpus,
    brainHumanCompare: shadow.brainHumanCompare,
    knowledgeCrossCheck: shadow.knowledgeCrossCheck,
    shadowFindings: shadow.shadowFindings,
    promotionGate: shadow.promotionGate,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, "epic6-live-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic6-live-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-live-knowledge-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
