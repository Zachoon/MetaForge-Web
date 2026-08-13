#!/usr/bin/env node
// Epic 6 — Brain Shadow Evaluation report (human-inspectable).
// Read-only. Brain v1 remains frozen. Naming is not promotion.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBrainShadowEvaluationFromFixtures,
  summarizeLiveBrainShadow,
} from "../../app/knowledge/brain-shadow-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatReport({ intel, live }) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 6");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 6 — Brain Shadow Evaluation");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**brainV1RemainsFrozen:** true");
  lines.push("**promoted:** false");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Fixture decks shadowed | ${intel.corpus.decks} |`);
  lines.push(`| Package core ranges compared | ${intel.corpus.packageCoreRanges} |`);
  lines.push(`| Brain↔corpus agreements | ${intel.brainHumanCompare.agreements} |`);
  lines.push(`| Human-supported blind spots | ${intel.brainHumanCompare.humanSupportedBlindSpots} |`);
  lines.push(`| Brain theory divergences | ${intel.brainHumanCompare.metaforgeDisagreements} |`);
  lines.push(`| Elite contradictions cross-checked | ${intel.knowledgeCrossCheck.eliteContradictions} |`);
  lines.push(`| Expert concept candidates noted | ${intel.knowledgeCrossCheck.expertCandidates} |`);
  lines.push(`| Shadow findings (capped) | ${intel.shadowFindings.length} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");

  if (live) {
    lines.push("## Live Field Intelligence Brain classifications (read-only)");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|------:|");
    lines.push(`| Generated at | ${live.generatedAt || "—"} |`);
    lines.push(`| brainPolicyTouched | ${live.brainPolicyTouched} |`);
    lines.push(`| constructionMutated | ${live.constructionMutated} |`);
    for (const [key, value] of Object.entries(live.counts || {})) {
      lines.push(`| ${key} | ${value} |`);
    }
    lines.push("");
    lines.push("### Live sample");
    lines.push("");
    for (const row of live.sample.slice(0, 8)) {
      lines.push(`- **${row.feature}** → \`${row.classification}\` (conf ${row.confidence}) — ${row.note}`);
    }
    lines.push("");
  }

  lines.push("## What MetaForge now knows");
  lines.push("");
  lines.push("Brain v1 can be **shadowed** against elite structure and expert concepts without changing it.");
  lines.push("Agreements, blind spots, and divergences are review signals — not auto-promotions.");
  lines.push("");
  lines.push("### Fixture Brain↔corpus sample");
  lines.push("");
  for (const row of intel.brainHumanCompare.sampleAgreements.slice(0, 5)) {
    lines.push(`- Agreement: ${row.packageId} — brain ${row.brainTheory} vs corpus ${row.corpusWeightedMean}`);
  }
  for (const row of intel.brainHumanCompare.sampleBlindSpots.slice(0, 5)) {
    lines.push(`- Blind spot: ${row.packageId || row.kind} — ${row.note}`);
  }
  for (const row of intel.brainHumanCompare.sampleDisagreements.slice(0, 5)) {
    lines.push(`- Divergence: ${row.packageId} — ${row.note}`);
  }
  if (!intel.brainHumanCompare.sampleAgreements.length
    && !intel.brainHumanCompare.sampleBlindSpots.length
    && !intel.brainHumanCompare.sampleDisagreements.length) {
    lines.push("- No package-density comparisons crossed sample thresholds in this fixture slice.");
  }
  lines.push("");
  lines.push("### Shadow findings (none promote)");
  lines.push("");
  for (const finding of intel.shadowFindings.slice(0, 15)) {
    lines.push(`- **${finding.kind}** · ${finding.subject} — ${finding.detail}`);
  }
  lines.push("");
  lines.push("## Promotion gate");
  lines.push("");
  lines.push(`- ${intel.promotionGate.note}`);
  lines.push(`- Required next: ${intel.promotionGate.requiredNext}`);
  lines.push("");
  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- No Brain weight / package / branch changes.");
  lines.push("- No \"finish Brain v2\" from shadow elegance.");
  lines.push("- Epic 7 simulation scale remains deferred until the textbook exists.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 7 stays deferred (Strategic Simulation scale) until knowledge textbook is earned.");
  lines.push("- Friday heartbeat: Is MetaForge becoming more knowledgeable? Brain changes still 0.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const intel = buildBrainShadowEvaluationFromFixtures();
  let live = null;
  const livePath = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
  if (existsSync(livePath)) {
    try {
      live = summarizeLiveBrainShadow(JSON.parse(readFileSync(livePath, "utf8")));
    } catch {
      live = null;
    }
  }
  const report = formatReport({ intel, live });
  const json = {
    writesToBrain: false,
    brainV1RemainsFrozen: true,
    epic: 6,
    brainChanges: 0,
    corpus: intel.corpus,
    brainHumanCompare: intel.brainHumanCompare,
    knowledgeCrossCheck: intel.knowledgeCrossCheck,
    shadowFindings: intel.shadowFindings,
    promotionGate: intel.promotionGate,
    liveProjection: live,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, "epic6-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic6-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-knowledge-report.md")}`);
}

main();
