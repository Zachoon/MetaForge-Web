#!/usr/bin/env node
// Field Intelligence v1.2 runner — evidence only, no Brain v2 mutation.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runFieldIntelligenceV1 } from "../../app/field-intelligence/pipeline.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const webRoot = join(__dirname, "../..");

/** Load gitignored .env.local into process.env without overriding existing vars. */
function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = join(webRoot, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
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

loadLocalEnv();

const tryLive = process.argv.includes("--live");

const result = await runFieldIntelligenceV1({
  tryLive,
  fixtureOnly: !tryLive,
  topdeckApiKey: process.env.TOPDECK_API_KEY,
  spicerackApiKey: process.env.SPICERACK_API_KEY,
});

mkdirSync(outDir, { recursive: true });
const artifactPath = join(outDir, "corpus-intelligence-v1.json");
const reportPath = join(outDir, "FIELD_INTELLIGENCE_REPORT.md");

writeFileSync(artifactPath, JSON.stringify(result.artifact, null, 2));
writeFileSync(reportPath, renderReport(result));

console.log(renderReport(result));
console.log(`\nWrote ${artifactPath}`);
console.log(`Wrote ${reportPath}`);

function renderReport(result) {
  const a = result.artifact;
  const c = a.corpus;
  const rec = result.recommendation;
  const lines = [];
  lines.push("# MetaForge Field Intelligence v1.2 — Level-A Converter Forensics");
  lines.push("");
  lines.push("Brain v1 remains frozen. No construction policy changes in this batch.");
  lines.push("Do not implement Brain v2 from this report.");
  lines.push("");
  lines.push("## North star");
  lines.push("When equally situated players bring the same commander into the same tournament, what structural decisions consistently distinguish converters from non-converters?");
  lines.push("");
  lines.push("## Evidence hierarchy");
  lines.push("Repeated converter > single-event converter > tournament participant > curated expert > broad community > public/user.");
  lines.push("Level-A (same commander + same event) is the primary controlled comparison.");
  lines.push("");
  lines.push("## Corpus coverage");
  lines.push(`- Records ingested: **${c.recordsIngested}**`);
  lines.push(`- Decks analyzed: **${c.decksAnalyzed}**`);
  lines.push(`- Events represented: **${c.eventsRepresented}**`);
  lines.push(`- Unique commanders: **${c.uniqueCommanders}**`);
  lines.push(`- Top-cut decks: **${c.topCutDecks}**`);
  lines.push(`- Winning decks (placement 1): **${c.winningDecks}**`);
  lines.push(`- Lower-performing comparison decks: **${c.lowerPerformingDecks}**`);
  lines.push(`- Repeated converters: **${c.repeatedConverters}**`);
  lines.push(`- Single-event converters: **${c.singleEventConverters}**`);
  lines.push(`- Tournament participants: **${c.tournamentParticipants}**`);
  lines.push(`- EDHREC aggregates (secondary): **${c.edhrecAggregates}**`);
  lines.push(`- Evidence tier distribution: \`${JSON.stringify(c.evidenceTierDistribution)}\``);
  lines.push(`- Performance class distribution: \`${JSON.stringify(c.performanceClassDistribution)}\``);
  lines.push(`- Placement distribution: \`${JSON.stringify(c.placementDistribution)}\``);
  lines.push(`- Event-size distribution: \`${JSON.stringify(c.eventSizeDistribution)}\``);
  lines.push(`- Source distribution: \`${JSON.stringify(c.sourceDistribution)}\``);
  lines.push(`- Dedupe: \`${JSON.stringify(c.dedupe)}\``);
  lines.push("");
  lines.push("## Corpus quality / semantic bridge");
  lines.push("```json");
  lines.push(JSON.stringify(a.corpusQuality, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Commander / family resolution");
  lines.push("```json");
  lines.push(JSON.stringify({
    commanderResolutionRate: a.familyResolution?.commanderResolutionRate,
    familyResolutionRate: a.familyResolution?.familyResolutionRate,
    structurallyTyped: a.familyResolution?.structurallyTyped,
    unresolved: a.familyResolution?.unresolved,
    unresolvedDetails: a.familyResolution?.unresolvedDetails?.slice?.(0, 12),
    familyDistributionTop: Object.entries(a.familyResolution?.familyDistribution || {}).slice(0, 12),
  }, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Level-A forensics (usable cohorts)");
  lines.push(`- Usable Level-A cohorts: **${a.levelAForensics?.usableCohorts ?? 0}**`);
  for (const cohort of (a.levelAForensics?.cohorts || [])) {
    const top = (cohort.strongestDeltas || []).slice(0, 4)
      .map((d) => `${d.feature}:${d.delta} (n=${d.sampleSize}, conf=${d.confidence})`)
      .join("; ");
    lines.push(`- **${cohort.commanderIdentity}** @ \`${cohort.eventId}\` high=${cohort.highCount} low=${cohort.lowCount} eventSize=${cohort.eventSize ?? "?"} cov=${cohort.semanticCoverage}`);
    lines.push(`  - strongest: ${top || "n/a"}`);
  }
  lines.push("");
  lines.push("## PerformanceStructureHypotheses (replication)");
  lines.push(`- By status: \`${JSON.stringify(a.performanceHypotheses?.byStatus)}\``);
  lines.push("### Replicated");
  for (const h of (a.performanceHypotheses?.replicated || [])) {
    lines.push(`- ${h.id}: ${h.feature} ${h.observedDirection} effect=${h.weightedEffect} conf=${h.confidence} support=${JSON.stringify(h.levelAEventsSupporting)} brainEligible=${h.brainV2Eligible}`);
  }
  if (!(a.performanceHypotheses?.replicated || []).length) lines.push("- (none)");
  lines.push("### Mixed / contradicted");
  for (const h of (a.performanceHypotheses?.mixedOrContradicted || []).slice(0, 12)) {
    lines.push(`- ${h.replicationStatus} ${h.id}: ${h.feature} effect=${h.weightedEffect} contradict=${JSON.stringify(h.levelAEventsContradicting)}`);
  }
  if (!(a.performanceHypotheses?.mixedOrContradicted || []).length) lines.push("- (none)");
  lines.push("### Single-event leads (not Brain v2 evidence)");
  for (const h of (a.performanceHypotheses?.singleEventLeads || []).slice(0, 16)) {
    lines.push(`- ${h.id}: ${h.feature} ${h.observedDirection} effect=${h.weightedEffect} conf=${h.confidence} event=${h.levelAEventsSupporting?.[0]}`);
  }
  lines.push("");
  lines.push("## Rograkh/Thrasios threat decomposition");
  lines.push("```json");
  lines.push(JSON.stringify(a.levelASynthesis?.rograkhThrasiosThreat, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Kinnan spell decomposition");
  lines.push("```json");
  lines.push(JSON.stringify(a.levelASynthesis?.kinnanSpells, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Interaction density vs shape");
  lines.push("```json");
  lines.push(JSON.stringify(a.levelASynthesis?.interactionDensity?.moreVsBetter, null, 2));
  lines.push("```");
  for (const row of (a.levelASynthesis?.interactionDensity?.findings || []).slice(0, 10)) {
    lines.push(`- ${row.commanderIdentity} @ ${row.eventId}: densityΔ=${row.interactionDensityDelta} countΔ=${row.interactionCountDelta} shape=${row.shapeVerdict}`);
  }
  lines.push("");
  lines.push("## Role-balance fingerprints");
  for (const row of (a.levelASynthesis?.roleBalance?.fingerprints || []).slice(0, 10)) {
    lines.push(`- ${row.commanderIdentity} @ ${row.eventId}: signal=${JSON.stringify(row.winningSignal)}`);
    lines.push(`  - high: \`${JSON.stringify(row.highFingerprint)}\``);
    lines.push(`  - low: \`${JSON.stringify(row.lowFingerprint)}\``);
  }
  lines.push("");
  lines.push("## Package blind-spot candidates (catalog NOT expanded)");
  for (const row of (a.packageBlindSpotCandidates || []).slice(0, 10)) {
    lines.push(`- ${row.signature} decks=${row.deckCount} events=${row.eventCount} conf=${row.confidence}`);
  }
  if (!(a.packageBlindSpotCandidates || []).length) lines.push("- (none)");
  lines.push("");
  lines.push("## Role-taxonomy blind-spot candidates (semantics NOT expanded)");
  for (const row of (a.roleTaxonomyBlindSpotCandidates || []).slice(0, 12)) {
    lines.push(`- ${row.candidate} @ ${row.commanderIdentity} / ${row.eventId}: ${row.note}`);
  }
  if (!(a.roleTaxonomyBlindSpotCandidates || []).length) lines.push("- (none)");
  lines.push("");
  lines.push("## Cross-commander transfer (validation only)");
  for (const row of (a.crossCommanderTransfer?.results || []).slice(0, 12)) {
    lines.push(`- ${row.status} ${row.hypothesisId}: support=${JSON.stringify(row.supportingCommanders)} contradict=${JSON.stringify(row.contradictingCommanders)}`);
  }
  if (!(a.crossCommanderTransfer?.results || []).length) lines.push("- (none)");
  lines.push("");
  lines.push("## Brain v1 classifications");
  lines.push(`- Counts: \`${JSON.stringify(a.brainV1Classifications?.counts)}\``);
  for (const row of (a.brainV1Classifications?.classifications || []).slice(0, 16)) {
    lines.push(`- ${row.classification} ${row.hypothesisId}: ${row.note}`);
  }
  lines.push("");
  lines.push("## Comparable cohorts (A→D summary)");
  lines.push(`- Counts: \`${JSON.stringify(a.comparableCohorts?.counts)}\``);
  for (const cohort of (a.comparableCohorts?.strongestControlled || []).slice(0, 8)) {
    const top = (cohort.contrast?.structuralDeltas || [])[0];
    lines.push(`- Level ${cohort.level} conf=${cohort.confidence} family=${cohort.commanderFamily || "n/a"} high=${cohort.highPerformers} low=${cohort.lowPerformers} topDelta=${top ? `${top.feature}:${top.delta}` : "n/a"}`);
  }
  lines.push("");
  lines.push("## Repeated converter analysis");
  lines.push("```json");
  lines.push(JSON.stringify(a.repeatedConverterAnalysis, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Agreement diagnosis");
  lines.push("```json");
  lines.push(JSON.stringify(a.agreementDiagnosis, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Live sample bounds");
  lines.push("```json");
  lines.push(JSON.stringify(result.liveSample, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Fixture sample (offline proof)");
  lines.push(`- TopDeck-shaped events: ${result.fixtureStats.topdeckShapedEvents}`);
  lines.push(`- TopDeck-shaped decks: ${result.fixtureStats.topdeckShapedDecks}`);
  lines.push(`- Spicerack-shaped decks: ${result.fixtureStats.spicerackShapedDecks}`);
  lines.push(`- Curated expert decks: ${result.fixtureStats.curatedExpertDecks}`);
  lines.push("");
  lines.push("## Live adapter coverage / source failures");
  lines.push("```json");
  lines.push(JSON.stringify(a.liveCoverage, null, 2));
  lines.push("```");
  if (a.liveCoverage?.topdeck?.status === "needs_credentials") {
    lines.push("");
    lines.push("### TopDeck actionable status");
    lines.push("```json");
    lines.push(JSON.stringify(a.liveCoverage.topdeck.actionable || a.sourceSafety?.topdeckMissingKey, null, 2));
    lines.push("```");
  }
  if (a.liveCoverage?.spicerack?.docBlocker || a.sourceSafety?.spicerackDocBlocker) {
    lines.push("");
    lines.push("### Spicerack Public Decklist Database blocker");
    lines.push("```json");
    lines.push(JSON.stringify(a.liveCoverage?.spicerack?.docBlocker || a.sourceSafety.spicerackDocBlocker, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push("## Compared to fixture sample");
  lines.push("```json");
  lines.push(JSON.stringify(a.comparedToFixture, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Strongest Brain ↔ human agreements");
  for (const row of (a.brainHumanCompare?.agreements || []).slice(0, 5)) {
    lines.push(`- ${row.packageId || row.kind}: brain ${row.brainTheory} vs corpus ${row.corpusWeightedMean} (n=${row.n})`);
  }
  if (!(a.brainHumanCompare?.agreements || []).length) lines.push("- (none above threshold in this sample)");
  lines.push("");
  lines.push("## Strongest disagreements / blind spots");
  for (const row of (a.brainHumanCompare?.humanSupportedBlindSpots || []).slice(0, 5)) {
    lines.push(`- BLIND SPOT: ${row.note} (${row.packageId || row.kind})`);
  }
  for (const row of (a.brainHumanCompare?.metaforgeDisagreements || []).slice(0, 5)) {
    lines.push(`- DISAGREEMENT: ${row.note} (${row.packageId})`);
  }
  lines.push("");
  lines.push("## Competitive contrast (controlled preferred)");
  for (const contrast of (a.competitiveContrasts || []).slice(0, 8)) {
    const top = (contrast.structuralDeltas || [])[0];
    lines.push(`- level=${contrast.cohortLevel || "?"} conf=${contrast.cohortConfidence ?? "?"} event=${contrast.eventId || "n/a"} family=${contrast.commanderFamily || "broad"} high=${contrast.highPerformers} low=${contrast.lowPerformers} topDelta=${top ? `${top.feature}:${top.delta}` : "n/a"}`);
  }
  lines.push("");
  lines.push("## Hold-out generalization");
  lines.push(`- train=${a.holdout.trainDecks} holdout=${a.holdout.holdoutDecks}`);
  lines.push(`- package band hit rate: ${a.holdout.packageBandHitRate}`);
  lines.push(`- package band null reason: ${a.holdout.packageBandNullReason}`);
  lines.push(`- family transfer hit rate: ${a.holdout.familyTransferHitRate}`);
  lines.push(`- family transfer null reason: ${a.holdout.familyTransferNullReason}`);
  lines.push("");
  lines.push("## Anti-netdeck safeguards");
  lines.push(`- novel coherent candidate beats popular card: **${a.antiNetdeck.structuralBeatsPopular.novelWins}**`);
  lines.push("");
  lines.push("## Highest-confidence Brain v2 candidate (NOT implemented)");
  lines.push("```json");
  lines.push(JSON.stringify(rec, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Evidence gate snapshot");
  lines.push("```json");
  lines.push(JSON.stringify(a.brainV2EvidenceGate, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Attribution");
  for (const attr of a.attribution || []) {
    lines.push(`- ${attr.name}${attr.url ? ` — ${attr.url}` : ""}`);
  }
  lines.push("");
  lines.push("North star: learn structural principles from controlled comparisons — not memorize winning 99s.");
  return lines.join("\n");
}
