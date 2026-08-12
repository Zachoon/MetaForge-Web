#!/usr/bin/env node
// Strategic Hypothesis v0 — falsifiable hypotheses from live tournament knowledge.
// Stance = product voice. Hypothesis = research object. Brain inheritance: none.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveStrategicHypothesesV0 } from "../../app/knowledge/strategic-hypothesis.mjs";
import { buildExpertStrategyCorpusFromFixtures } from "../../app/knowledge/expert-strategy-corpus.mjs";
import { summarizeLiveBrainShadow } from "../../app/knowledge/brain-shadow-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function stateEmoji(state) {
  if (state === "strongly_supported") return "🟢";
  if (state === "emerging") return "🟡";
  if (state === "contradicted") return "🔴";
  if (state === "retired") return "⚫";
  return "·";
}

function formatReport(bundle, provenance) {
  const lines = [];
  lines.push("# MetaForge Strategic Observatory — Hypothesis v0");
  lines.push("");
  lines.push("**Research object:** Strategic Hypothesis (falsifiable · can die)");
  lines.push("**Product voice:** Strategic Stance (\"current understanding suggests…\")");
  lines.push("**Brain changes:** 0");
  lines.push("**Brain inheritance:** none");
  lines.push("**writesToBrain:** false");
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Live Epic 2 artifact: ${provenance.liveEpic2 || "—"}`);
  lines.push(`- Shadow projection: ${provenance.shadow || "—"}`);
  lines.push(`- Expert corpus: ${provenance.expert || "fixtures"}`);
  lines.push("");
  lines.push("## Pipeline");
  lines.push("");
  lines.push("```text");
  lines.push(bundle.pipeline.join("\n↓\n"));
  lines.push("```");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| State | Count |");
  lines.push("|-------|------:|");
  lines.push(`| 🟢 Strongly supported | ${bundle.counts.strongly_supported} |`);
  lines.push(`| 🟡 Emerging | ${bundle.counts.emerging} |`);
  lines.push(`| 🔴 Contradicted | ${bundle.counts.contradicted} |`);
  lines.push(`| ⚫ Retired | ${bundle.counts.retired} |`);
  lines.push(`| Total (capped) | ${bundle.counts.total} |`);
  lines.push("");
  lines.push("## Current hypotheses");
  lines.push("");

  for (const hyp of bundle.hypotheses) {
    const stance = bundle.stances.find((s) => s.hypothesisId === hyp.id);
    lines.push(`### ${stateEmoji(hyp.state)} ${hyp.id}`);
    lines.push("");
    lines.push(`**Claim:** ${hyp.claim}`);
    lines.push("");
    lines.push(`**State:** \`${hyp.state}\` · **Confidence:** ${hyp.confidence.level} (${hyp.confidence.score})`);
    lines.push("");
    lines.push("| Evidence | Band |");
    lines.push("|----------|------|");
    lines.push(`| Tournament | ${hyp.evidence.tournament} |`);
    lines.push(`| Experts | ${hyp.evidence.experts} |`);
    lines.push(`| Shadow | ${hyp.evidence.shadow} |`);
    lines.push(`| Simulation | ${hyp.evidence.simulation} |`);
    lines.push("");
    if (hyp.evidence.notes?.length) {
      lines.push("**Evidence notes**");
      for (const note of hyp.evidence.notes) lines.push(`- ${note}`);
      lines.push("");
    }
    if (hyp.prediction) {
      lines.push("**Prediction**");
      lines.push(`If this hypothesis is correct, over the next ${hyp.prediction.windowDays} days we expect:`);
      for (const item of hyp.prediction.expectToObserve) lines.push(`- ${item}`);
      lines.push("");
    }
    lines.push("**What would change my mind (retirement)**");
    for (const item of hyp.retirementCriteria) lines.push(`- ${item}`);
    lines.push("");
    if (hyp.uniquenessAngle) {
      lines.push(`**Unique angle (candidate, not Brain):** ${hyp.uniquenessAngle}`);
      lines.push("");
    }
    if (stance) {
      lines.push("**Stance (product voice)**");
      lines.push(`> ${stance.statement}`);
      lines.push("");
      lines.push(`Coach may say: ${stance.coachMaySay.join(" / ")}`);
      lines.push("");
      lines.push(`Coach must not say: ${stance.coachMustNotSay.join(" / ")}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push("## Explicit non-goals");
  lines.push("");
  lines.push("- Hypotheses are not opinions or preferences.");
  lines.push("- Stances are not facts.");
  lines.push("- Nothing here mutates Brain construction.");
  lines.push("- v0 is capped at five — expand only when reality earns more.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const livePath = join(outDir, "epic2-live-tournament-intelligence.json");
  const live = loadJson(livePath);
  if (!live?.intelligence) {
    console.error("Missing live Epic 2 artifact. Run: npm run observe:tournament-live");
    process.exitCode = 1;
    return;
  }

  const corpusPath = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
  const corpusArtifact = loadJson(corpusPath);
  const shadowLive = summarizeLiveBrainShadow(corpusArtifact);
  const expertCorpus = buildExpertStrategyCorpusFromFixtures();

  const bundle = deriveStrategicHypothesesV0({
    liveIntelligence: live.intelligence,
    shadowLive,
    expertCorpus,
    limit: 5,
  });

  const provenance = {
    liveEpic2: livePath,
    shadow: shadowLive ? `live classifications (${shadowLive.sample?.length || 0} sample)` : "none",
    expert: "stream-002 fixtures",
  };
  const report = formatReport(bundle, provenance);
  const json = {
    writesToBrain: false,
    brainChanges: 0,
    brainInheritance: "none",
    ...bundle,
    provenance,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(outDir, "strategic-hypothesis-v0.md"), report);
  writeFileSync(join(outDir, "strategic-hypothesis-v0.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "strategic-hypothesis-v0.md")}`);
}

main();
