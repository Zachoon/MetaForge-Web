#!/usr/bin/env node
// Field Intelligence v1.3 runner — strategic relationship mining, no Brain mutation.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runFieldIntelligenceV1 } from "../../app/field-intelligence/pipeline.mjs";
import {
  appendResearchObservations,
  defaultResearchStorePath,
  observationsFromArtifact,
  writeResearchIndex,
  readResearchStore,
} from "../../app/field-intelligence/research-store.mjs";

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
const persistResearch = tryLive || process.argv.includes("--persist-research");

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

let researchPersist = null;
if (persistResearch) {
  const storePath = defaultResearchStorePath(outDir);
  researchPersist = appendResearchObservations(storePath, observationsFromArtifact(result.artifact));
  writeResearchIndex(join(outDir, "research-store"), {
    lastRun: result.artifact.generatedAt,
    live: tryLive,
    written: researchPersist.written,
    skipped: researchPersist.skipped,
    totalRows: readResearchStore(storePath).count,
  });
}

console.log(renderReport(result));
console.log(`\nWrote ${artifactPath}`);
console.log(`Wrote ${reportPath}`);
if (researchPersist) {
  console.log(`Research store append: written=${researchPersist.written} skipped=${researchPersist.skipped} path=${researchPersist.path}`);
}

function renderReport(result) {
  const a = result.artifact;
  const c = a.corpus;
  const rec = result.recommendation;
  const lines = [];
  lines.push("# MetaForge Field Intelligence v1.3 — Strategic Relationship Mining");
  lines.push("");
  lines.push("Brain v1 remains frozen. No construction policy changes in this batch.");
  lines.push("Discovery queue does not write into Brain. Exp001 remains rejected.");
  lines.push("");
  lines.push("## North star");
  lines.push("Learn how elite players connect cards into functioning strategic systems — not merely which cards, roles, or quantities appear in winning decks.");
  lines.push("");
  lines.push("## Corpus coverage");
  lines.push(`- Records ingested: **${c.recordsIngested}**`);
  lines.push(`- Decks analyzed: **${c.decksAnalyzed}**`);
  lines.push(`- Events represented: **${c.eventsRepresented}**`);
  lines.push(`- Unique commanders: **${c.uniqueCommanders}**`);
  lines.push(`- Artifact version: **${a.version}**`);
  lines.push(`- Live sample: \`${JSON.stringify(result.liveSample)}\``);
  lines.push(`- Performance class distribution: \`${JSON.stringify(c.performanceClassDistribution)}\``);
  lines.push("");
  lines.push("## Corpus growth / marginal evidence");
  lines.push("```json");
  lines.push(JSON.stringify(a.corpusGrowth, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Strategic relationship mining");
  lines.push("```json");
  lines.push(JSON.stringify(a.strategicRelationshipMining, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Topology metrics summary");
  lines.push("```json");
  lines.push(JSON.stringify(a.topologyMetricsSummary, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Level-A topology (same commander + same event)");
  lines.push(`- Usable Level-A topology cohorts: **${a.levelATopology?.usableCohorts ?? 0}**`);
  for (const cohort of (a.levelATopology?.cohorts || []).slice(0, 12)) {
    const top = (cohort.strongest || []).slice(0, 4)
      .map((d) => `${d.feature}:${d.delta} (${d.direction})`)
      .join("; ");
    lines.push(`- **${cohort.commanderIdentity}** @ \`${cohort.eventId}\` high=${cohort.highCount} low=${cohort.lowCount}`);
    lines.push(`  - strongest topology: ${top || "n/a"}`);
  }
  lines.push("");
  lines.push("### Kraum/Tymna topology focus");
  for (const cohort of (a.levelATopology?.kraumTymnaFocus || [])) {
    lines.push(`- @ \`${cohort.eventId}\`: ${JSON.stringify((cohort.strongest || []).slice(0, 6))}`);
  }
  if (!(a.levelATopology?.kraumTymnaFocus || []).length) lines.push("- (no usable Kraum/Tymna Level-A topology cohorts in this sample)");
  lines.push("");
  lines.push("## Strategic sequences (structural, not play order)");
  for (const seq of (a.strategicSequences?.evidence || []).slice(0, 12)) {
    lines.push(`- ${seq.sequenceId}: decks=${seq.decksObserved} events=${seq.independentEvents} conf=${seq.confidence} elite=${seq.eliteTag} impliesGameOrder=${seq.impliesObservedGameOrder}`);
  }
  if (!(a.strategicSequences?.evidence || []).length) lines.push("- (none)");
  lines.push("");
  lines.push("## Substitution evidence");
  for (const row of (a.substitutionEvidence?.evidence || []).slice(0, 12)) {
    lines.push(`- ${row.cardA} ↔ ${row.cardB} @ ${row.commanderIdentity}: xor=${row.xorRate} conf=${row.confidence}`);
  }
  if (!(a.substitutionEvidence?.evidence || []).length) lines.push("- (none)");
  lines.push("");
  lines.push("## Contextual card functions (context-dependent)");
  lines.push(`- Context-dependent cards: **${a.contextualCardFunctions?.contextDependentCards ?? 0}**`);
  for (const row of (a.contextualCardFunctions?.cards || []).filter((c) => c.contextDependent).slice(0, 10)) {
    lines.push(`- ${row.cardName}: functions=${JSON.stringify(row.functionDistribution)}`);
  }
  lines.push("");
  lines.push("## Topology discovery queue (no Brain writes)");
  lines.push(`- By kind: \`${JSON.stringify(a.topologyDiscovery?.byKind)}\``);
  lines.push(`- writesToBrain: **${a.topologyDiscovery?.writesToBrain}**`);
  for (const row of (a.topologyDiscovery?.candidates || []).slice(0, 16)) {
    lines.push(`- ${row.kind} ${row.id}: conf=${row.confidence} missing=${row.whatAppearsMissing}`);
  }
  lines.push("");
  lines.push("## Cross-commander topology transfer (never automatic)");
  lines.push(`- automaticTransfer: **${a.topologyDiscovery?.crossCommanderTransfer?.automaticTransfer}**`);
  for (const row of (a.topologyDiscovery?.crossCommanderTransfer?.edgeTypeTransfer || []).slice(0, 10)) {
    lines.push(`- ${row.edgeType}: decks=${row.decks} events=${row.independentEvents} class=${row.transferClass}`);
  }
  lines.push("");
  lines.push("## Level-A forensics (v1.2 quantity/shape)");
  lines.push(`- Usable Level-A cohorts: **${a.levelAForensics?.usableCohorts ?? 0}**`);
  for (const cohort of (a.levelAForensics?.cohorts || []).slice(0, 8)) {
    const top = (cohort.strongestDeltas || []).slice(0, 3)
      .map((d) => `${d.feature}:${d.delta}`)
      .join("; ");
    lines.push(`- **${cohort.commanderIdentity}** @ \`${cohort.eventId}\`: ${top || "n/a"}`);
  }
  lines.push("");
  lines.push("## Repeated converter topology signatures");
  lines.push("```json");
  lines.push(JSON.stringify(a.repeatedConverterAnalysis?.topologySignatures || a.repeatedConverterAnalysis, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Recommended Brain v2 Exp002 (NOT implemented)");
  lines.push(a.strategicRelationshipMining?.recommendedExp002 || rec?.summary || "(none)");
  lines.push("");
  lines.push("## Highest-confidence legacy Brain v2 candidate gate (NOT implemented)");
  lines.push("```json");
  lines.push(JSON.stringify(rec, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Attribution");
  for (const attr of a.attribution || []) {
    lines.push(`- ${attr.name}${attr.url ? ` — ${attr.url}` : ""}`);
  }
  lines.push("");
  lines.push("North star: accumulate strategic relationship evidence over years — not heuristics.");
  return lines.join("\n");
}
