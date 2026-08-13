#!/usr/bin/env node
// Sim-Lab-001 LIVE — Academy cohort only. Brain untouched. No promotion.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { enrichCorpusRecords } from "../../app/field-intelligence/card-enrichment.mjs";
import { materializeLiveAcademyCorpus } from "../../app/sim-lab/live-corpus.mjs";
import { runSimLab001 } from "../../app/sim-lab/experiments/sim-lab-001.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "../..");
const cacheDir = join(webRoot, "tests/field-intelligence/live-cache");
const outDir = __dirname;

const live = materializeLiveAcademyCorpus(cacheDir);
if (!live.ok) {
  console.error(`Live corpus unavailable: ${live.reason}`);
  console.error(`Expected cache at ${cacheDir}`);
  process.exit(1);
}

console.log("Sim-Lab-001 LIVE — loading Academy cohort");
console.log(`corpusMode=${live.corpusMode} syntheticFixtures=${live.syntheticFixtures}`);
console.log(`decks=${live.decks} events=${live.events}`);

// Enrich for roles/stages so plan-graph seats are meaningful (research only).
const enriched = await enrichCorpusRecords(live.records, {
  allowNetwork: true,
});
const records = enriched.records;
const analyses = analyzeCorpus(records);

let fixtureBaseline = null;
const fixtureReportPath = join(outDir, "sim-lab-001-report.json");
if (existsSync(fixtureReportPath)) {
  try {
    const prev = JSON.parse(readFileSync(fixtureReportPath, "utf8"));
    fixtureBaseline = {
      topologyExplainsRecoveryBetter: prev.topologyExplainsRecoveryBetter === true,
      verdict: prev.verdict || null,
      correlations: prev.correlationsWithMeanRecoveryProbability || null,
    };
  } catch {
    fixtureBaseline = null;
  }
}

const report = runSimLab001(records, {
  analyses,
  corpusMode: "live",
  syntheticFixtures: "NOT_USED",
  fixtureBaseline,
  maxPersistRows: 80,
});

mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, "sim-lab-001-live-report.json");
const mdPath = join(outDir, "SIM_LAB_001_LIVE_REPORT.md");
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, renderMarkdown(report, live));

console.log(renderMarkdown(report, live));
console.log(`\nWrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

function renderMarkdown(r, corpus) {
  const c = r.correlationsWithMeanRecoveryProbability || {};
  const la = r.levelARecovery || {};
  const strat = r.stratifiedByPerformanceClass || {};
  const seats = r.nodeRemovalClassExplanations || {};
  const lines = [];
  lines.push("# Sim-Lab-001 LIVE Report");
  lines.push("");
  lines.push("**Sandbox only. writesToBrain: false. promoteToBrain: false. constructionMutated: false.**");
  lines.push("**Synthetic fixtures: NOT USED.**");
  lines.push("");
  lines.push("## Question");
  lines.push(r.question);
  lines.push("");
  lines.push("## 1. Live decks / events evaluated");
  lines.push(`- Decks: **${r.decksAnalyzed}**`);
  lines.push(`- Events: **${r.eventsRepresented}**`);
  lines.push(`- Source: \`${corpus.source}\``);
  lines.push(`- Sample: \`${JSON.stringify(corpus.sample)}\``);
  lines.push("");
  lines.push("## 2. Usable Level-A recovery cohorts");
  lines.push(`- Usable cohorts: **${la.usableCohorts ?? 0}**`);
  lines.push(`- Topology agreement rate: **${la.topologyAgreementRate}**`);
  lines.push(`- Interaction agreement rate: **${la.interactionAgreementRate}**`);
  lines.push(`- Delta corr topology↔recovery: **${la.deltaCorrelations?.topologyVsRecoveryDelta}**`);
  lines.push(`- Delta corr interaction↔recovery: **${la.deltaCorrelations?.interactionVsRecoveryDelta}**`);
  lines.push(`- Level-A explains better: **${la.explainsBetter}**`);
  lines.push("");
  lines.push("## 3. Topology vs interaction-count (global)");
  lines.push(`- interactionCount: **${c.interactionCount}**`);
  lines.push(`- topologyComposite: **${c.topologyComposite}**`);
  lines.push(`- planConnectedRatio: **${c.planConnectedRatio}**`);
  lines.push(`- meaningfulEdgeDensity: **${c.meaningfulEdgeDensity}**`);
  lines.push(`- isolatedRatio: **${c.isolatedRatio}**`);
  lines.push(`- Overall explains better: **${r.overallExplainsBetter}**`);
  lines.push("");
  lines.push("## 4. Node-removal classes topology explains best");
  for (const seat of (r.seatsProbed || [])) {
    const s = seats[seat];
    if (!s) continue;
    lines.push(`- **${seat}**: explainsBetter=**${s.explainsBetter}** topo=${s.correlations?.topologyComposite} ix=${s.correlations?.interactionCount} meanRecoveryP=${s.meanRecoveryProbability}`);
  }
  lines.push("");
  lines.push("## 5. Repeated-converter recovery signatures");
  for (const cls of ["repeated_converter", "single_event_converter", "tournament_participant"]) {
    const s = strat[cls];
    if (!s) continue;
    lines.push(`- **${cls}** n=${s.n} meanRecoveryP=${s.meanRecoveryProbability} explainsBetter=**${s.explainsBetter}** topo=${s.correlations?.topologyComposite} ix=${s.correlations?.interactionCount}`);
  }
  lines.push("");
  lines.push("## 6. Commander / family-specific effects");
  lines.push(`- Families with n≥4: **${r.commanderFamilyEffects?.familiesWithNge4 ?? 0}**`);
  for (const f of (r.commanderFamilyEffects?.top || []).slice(0, 8)) {
    lines.push(`- ${f.commanderIdentity}: n=${f.n} explainsBetter=**${f.explainsBetter}** topo=${f.correlations?.topologyComposite} ix=${f.correlations?.interactionCount}`);
  }
  lines.push("");
  lines.push("## 7. Cross-family transfer");
  lines.push(`- Transfer class: **${r.crossFamilyTransfer?.class}**`);
  lines.push(`- Topology-preferred families: **${r.crossFamilyTransfer?.topologyPreferredFamilies}**`);
  lines.push(`- Interaction-preferred families: **${r.crossFamilyTransfer?.interactionPreferredFamilies}**`);
  lines.push("");
  lines.push("## 8. Contradictions");
  if ((r.contradictions || []).length) {
    for (const item of r.contradictions) lines.push(`- ${item}`);
  } else {
    lines.push("- (none flagged)");
  }
  lines.push("");
  lines.push("## 9. Fixture-negative survival");
  lines.push(`- Fixture topology won previously: **${r.fixtureComparison?.fixtureTopologyWon}**`);
  lines.push(`- Fixture-negative survived: **${r.fixtureComparison?.fixtureNegativeSurvived}**`);
  lines.push(`- Fixture-negative flipped: **${r.fixtureComparison?.fixtureNegativeFlipped}**`);
  lines.push("");
  lines.push("## 10. Verdict");
  lines.push(`**${r.verdict}**`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(r.verdictDetail, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Recommendation");
  lines.push(`- promoteToBrain: **${r.recommendation?.promoteToBrain}**`);
  lines.push(`- runValidationHarness: **${r.recommendation?.runValidationHarness}**`);
  lines.push(`- next: ${r.recommendation?.next}`);
  lines.push("");
  lines.push("No card rankings. No construction scores. No Harness promotion request.");
  return lines.join("\n");
}
