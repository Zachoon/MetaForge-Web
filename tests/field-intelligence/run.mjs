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
  readResearchIndex,
  summarizeResearchDelta,
} from "../../app/field-intelligence/research-store.mjs";
import { defaultLiveCacheDir } from "../../app/field-intelligence/live-ingest-cache.mjs";

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

/** Parse `--flag value` or `--flag=value` from argv. */
function argValue(flag) {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) return argv[idx + 1];
  return null;
}

function argInt(flag, fallback) {
  const raw = argValue(flag);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const tryLive = process.argv.includes("--live");
const persistResearch = tryLive || process.argv.includes("--persist-research");

// Phase 1 Academy observation defaults (live). Fixture runs keep pipeline defaults.
const observationWindow = Object.freeze({
  lastDays: argInt("--last-days", tryLive ? 90 : undefined),
  maxEvents: argInt("--max-events", tryLive ? 75 : undefined),
  maxDecksPerEvent: argInt("--max-decks-per-event", tryLive ? 24 : undefined),
  participantMin: argInt("--participant-min", tryLive ? 16 : undefined),
});

const storePath = defaultResearchStorePath(outDir);
const storeDir = join(outDir, "research-store");
const priorStore = readResearchStore(storePath);
const priorIndex = readResearchIndex(storeDir);
const liveCacheDir = defaultLiveCacheDir(outDir);

console.log("MetaForge Academy — Observation Window");
console.log("--------------------------------------");
console.log(`Mode:                      ${tryLive ? "LIVE observation" : "fixture"}`);
console.log(`Last Days:                 ${observationWindow.lastDays ?? "(pipeline default)"}`);
console.log(`Maximum Events:            ${observationWindow.maxEvents ?? "(pipeline default)"}`);
console.log(`Maximum Decks/Event:       ${observationWindow.maxDecksPerEvent ?? "(pipeline default)"}`);
console.log(`Minimum Participants:      ${observationWindow.participantMin ?? "(pipeline default)"}`);
console.log("Formats:                   Commander / cEDH");
console.log("Prefer Top Cut:            true");
console.log("Include Lower Comparison:  true");
console.log(`Persistence:               ${persistResearch}`);
console.log("Deduplicate:               true");
console.log("Incremental Store:         true (append-only JSONL)");
console.log(`Live cache:                ${liveCacheDir}`);
console.log("Brain mutations:           NONE");
console.log("Experiments / promotions:  NONE");
console.log("");

const result = await runFieldIntelligenceV1({
  tryLive,
  fixtureOnly: !tryLive,
  topdeckApiKey: process.env.TOPDECK_API_KEY,
  spicerackApiKey: process.env.SPICERACK_API_KEY,
  priorStoreRows: priorStore.rows,
  liveCacheDir: tryLive ? liveCacheDir : null,
  onTopDeckProgress: (line) => console.log(`TopDeck: ${line}`),
  ...(observationWindow.lastDays != null ? { lastDays: observationWindow.lastDays } : {}),
  ...(observationWindow.maxEvents != null ? { maxEvents: observationWindow.maxEvents } : {}),
  ...(observationWindow.maxDecksPerEvent != null ? { maxDecksPerEvent: observationWindow.maxDecksPerEvent } : {}),
  ...(observationWindow.participantMin != null ? { participantMin: observationWindow.participantMin } : {}),
});

mkdirSync(outDir, { recursive: true });
const artifactPath = join(outDir, "corpus-intelligence-v1.json");
const reportPath = join(outDir, "FIELD_INTELLIGENCE_REPORT.md");
const registryPath = join(outDir, "strategic-principles-registry.json");

let researchPersist = null;
let researchDelta = null;
if (persistResearch) {
  researchPersist = appendResearchObservations(storePath, observationsFromArtifact(result.artifact));
  researchDelta = summarizeResearchDelta({
    priorIndex,
    appendResult: researchPersist,
    currentArtifact: result.artifact,
  });
  writeResearchIndex(storeDir, {
    lastRun: result.artifact.generatedAt,
    live: tryLive,
    written: researchPersist.written,
    skipped: researchPersist.skipped,
    totalRows: readResearchStore(storePath).count,
    principleCount: result.artifact.strategicPrincipleRegistry?.principleCount || 0,
    promotableCount: result.artifact.strategicPrincipleRegistry?.promotable?.length || 0,
    corpusMode: result.artifact.provenance?.corpusMode || null,
    snapshot: {
      events: result.artifact.corpus?.eventsRepresented || 0,
      decks: result.artifact.corpus?.decksAnalyzed || 0,
      commanders: result.artifact.corpus?.uniqueCommanders || 0,
      principles: result.artifact.strategicPrincipleRegistry?.principleCount || 0,
      corpusMode: result.artifact.provenance?.corpusMode || null,
    },
    researchDelta,
  });
}

const reportResult = { ...result, researchDelta };

writeFileSync(artifactPath, JSON.stringify(result.artifact, null, 2));
writeFileSync(reportPath, renderReport(reportResult));
if (result.artifact.strategicPrincipleRegistry) {
  writeFileSync(registryPath, JSON.stringify(result.artifact.strategicPrincipleRegistry, null, 2));
}

console.log(renderReport(reportResult));
console.log(`\nWrote ${artifactPath}`);
console.log(`Wrote ${reportPath}`);
if (result.artifact.strategicPrincipleRegistry) console.log(`Wrote ${registryPath}`);
if (researchPersist) {
  console.log(`Research store append: written=${researchPersist.written} skipped=${researchPersist.skipped} path=${researchPersist.path}`);
  if (researchDelta) {
    console.log(`What changed since last run: eventsΔ=${researchDelta.deltas.events} decksΔ=${researchDelta.deltas.decks} principlesΔ=${researchDelta.deltas.principles} written=${researchDelta.append.written}`);
  }
}

function renderReport(result) {
  const a = result.artifact;
  const c = a.corpus;
  const rec = result.recommendation;
  const p = a.provenance || result.provenance || {};
  const health = a.sourceHealth || result.sourceHealth;
  const lines = [];

  lines.push("# MetaForge Academy Report");
  lines.push("");
  lines.push("## Provenance");
  lines.push("```");
  lines.push(`Generated:              ${p.generatedAt || a.generatedAt || "n/a"}`);
  lines.push(`Observation Window:     ${p.observationWindowDays ?? result.liveSample?.lastDays ?? "n/a"} days`);
  lines.push(`Events:                 ${p.events ?? c.eventsRepresented ?? 0}`);
  lines.push(`Decks:                  ${p.decks ?? c.decksAnalyzed ?? 0}`);
  lines.push(`Commanders:             ${p.commanders ?? c.uniqueCommanders ?? 0}`);
  lines.push(`TopDeck:                ${p.topdeck || "n/a"}`);
  lines.push(`Spicerack:              ${p.spicerack || "n/a"}`);
  lines.push(`EDHTop16:               ${p.edhtop16 || "n/a"}`);
  lines.push(`Synthetic Fixtures:     ${p.syntheticFixtures || "n/a"}`);
  lines.push(`Corpus Mode:            ${p.corpusMode || "n/a"}`);
  if (p.chunkProgress) lines.push(`Chunk Progress:         ${p.chunkProgress}`);
  lines.push("```");
  lines.push("");

  lines.push("## Source health");
  for (const src of health?.sources || []) {
    lines.push(`- **${src.id}**: ${src.label} — latency=${src.latencyMs ?? "n/a"}ms events=${src.coverageEvents} decks=${src.coverageDecks}`);
    if (src.detail) lines.push(`  - ${src.detail}`);
  }
  if (!(health?.sources || []).length) lines.push("- (no live sources attempted)");
  lines.push("");

  if (result.researchDelta) {
    const d = result.researchDelta;
    lines.push("## What changed since last run");
    lines.push(`- Question: ${d.questionAnswered}`);
    lines.push(`- Prior run: ${d.priorRunAt || "(none)"}`);
    lines.push(`- Store append: written=${d.append.written} skipped=${d.append.skipped}`);
    lines.push(`- Deltas: events=${d.deltas.events} decks=${d.deltas.decks} commanders=${d.deltas.commanders} principles=${d.deltas.principles}`);
    lines.push("");
  }

  lines.push("Brain v1 remains frozen. Principles never activate construction. Exp001 remains rejected.");
  lines.push("Success criterion: discover strategic principles no human explicitly taught MetaForge.");
  lines.push("Observation only — no Brain mutations, experiments, or promotions.");
  lines.push("");
  lines.push("## Observation window");
  lines.push("```");
  lines.push(`Last Days:                ${result.liveSample?.lastDays ?? "n/a"}`);
  lines.push(`Maximum Events:           ${result.liveSample?.maxEvents ?? "n/a"}`);
  lines.push(`Maximum Decks/Event:      ${result.liveSample?.maxDecksPerEvent ?? "n/a"}`);
  lines.push(`Minimum Participants:     ${result.liveSample?.participantMin ?? "n/a"}`);
  lines.push("Formats:                  Commander / cEDH");
  lines.push(`Prefer Top Cut:           ${result.liveSample?.preferTopCut ?? true}`);
  lines.push(`Include Lower Comparison: ${result.liveSample?.includeLowerComparison ?? true}`);
  lines.push("Persistence:              append-only research store");
  lines.push("Deduplicate:              true");
  lines.push("```");
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
  lines.push("## Forge Academy — Principle lessons");
  lines.push(`- Principle count: **${a.strategicPrincipleRegistry?.principleCount ?? 0}**`);
  lines.push(`- By status: \`${JSON.stringify(a.strategicPrincipleRegistry?.byStatus)}\``);
  lines.push(`- writesToBrain: **${a.strategicPrincipleRegistry?.writesToBrain}**`);
  lines.push(`- activateBrain: **${a.strategicPrincipleRegistry?.recommendations?.activateBrain}**`);
  for (const lesson of (a.strategicPrincipleRegistry?.academyLessons || []).slice(0, 10)) {
    lines.push("");
    lines.push(`### Observation #${lesson.observationNumber} — ${lesson.title}`);
    lines.push(`- Status: **${lesson.status}** (candidate only)`);
    lines.push(`- Confidence: **${lesson.confidence}**`);
    lines.push(`- Independent events: **${lesson.independentEvents}**`);
    lines.push(`- Families: ${(lesson.commanderFamilies || []).join("; ") || "n/a"}`);
    lines.push(`- Transfer: ${lesson.transferClass}`);
    lines.push(`- Finding: ${lesson.finding}`);
    lines.push(`- Lesson: ${lesson.lesson}`);
  }
  if (!(a.strategicPrincipleRegistry?.academyLessons || []).length) {
    lines.push("- (no academy lessons above confidence floor)");
  }
  lines.push("");
  lines.push("## Promotable principles (NOT activated)");
  for (const pRow of (a.strategicPrincipleRegistry?.promotable || []).slice(0, 8)) {
    lines.push(`- ${pRow.id}: conf=${pRow.confidence} events=${pRow.evidence?.independentEvents} — ${pRow.title}`);
  }
  if (!(a.strategicPrincipleRegistry?.promotable || []).length) lines.push("- (none)");
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
  for (const row of (a.contextualCardFunctions?.cards || []).filter((card) => card.contextDependent).slice(0, 10)) {
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
  lines.push("North star: accumulate strategic principles over years — not heuristics.");
  return lines.join("\n");
}
