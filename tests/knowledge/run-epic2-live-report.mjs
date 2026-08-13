#!/usr/bin/env node
// Continuous observation — live TopDeck → Epic 2 fingerprints NOW.
// Friday is the heartbeat. Learning does not wait for Friday.
// writesToBrain: false

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEliteTournamentIntelligenceFromLive } from "../../app/knowledge/live-tournament-ingest.mjs";

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

function formatReport(bundle) {
  const intel = bundle.intelligence;
  const ingest = bundle.ingest;
  const lines = [];
  lines.push("# MetaForge Live Tournament Observation — Epic 2");
  lines.push("");
  lines.push("**Mode:** continuous observation (not Friday-gated)");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push(`**Ingest mode:** ${ingest.ingestMode}`);
  lines.push(`**Attribution:** ${ingest.attribution?.name || "TopDeck.gg"}`);
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Tournaments loaded | ${ingest.stats?.tournaments ?? 0} |`);
  lines.push(`| Decks fingerprinted | ${intel.corpus.fingerprints} |`);
  lines.push(`| Events | ${intel.corpus.events} |`);
  lines.push(`| Unique commanders | ${intel.corpus.uniqueCommanders} |`);
  lines.push(`| Commander profiles | ${intel.commanderProfiles.length} |`);
  lines.push(`| Level-A usable cohorts | ${intel.levelA.usableCohorts} |`);
  lines.push(`| Strongly replicated observations | ${intel.strongestReplicatedObservations.length} |`);
  lines.push(`| Contradictions | ${intel.contradictions.length} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");
  lines.push("## What MetaForge is learning now");
  lines.push("");
  lines.push("Live tournament decks are becoming strategic fingerprints and commander profiles.");
  lines.push("This is textbook expansion — not Brain mutation.");
  lines.push("");
  lines.push("### Strongest replicated observations");
  lines.push("");
  for (const obs of intel.strongestReplicatedObservations.slice(0, 15)) {
    lines.push(`- **${obs.commanderIdentity}** — ${obs.observation} _(confidence: ${obs.confidence})_`);
  }
  if (!intel.strongestReplicatedObservations.length) {
    lines.push("- None above replication threshold yet.");
  }
  lines.push("");
  lines.push("### Commander profiles (top)");
  lines.push("");
  for (const profile of intel.commanderProfiles.slice(0, 12)) {
    const plans = profile.observedSuccessfulStructures.primaryPlans
      .slice(0, 3)
      .map((plan) => `${plan.id}×${plan.count}`)
      .join(", ") || "—";
    lines.push(`- **${profile.commanderIdentity}** — n=${profile.sampleSize}, events=${profile.independentEvents}, conf=${profile.confidence.level}, plans: ${plans}`);
  }
  lines.push("");
  lines.push("### Contradictions");
  lines.push("");
  for (const entry of intel.contradictions.slice(0, 12)) {
    lines.push(`- **${entry.commanderIdentity}** — ${entry.text}`);
  }
  if (!intel.contradictions.length) lines.push("- None surfaced.");
  lines.push("");
  lines.push("## Friday heartbeat (later)");
  lines.push("");
  lines.push("Ask then: what surprised MetaForge? what did it stop believing?");
  lines.push("Observation itself does not wait for Friday.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  loadLocalEnv();
  mkdirSync(outDir, { recursive: true });
  const refresh = argFlag("--refresh");
  const enrich = !argFlag("--no-enrich");

  console.log("MetaForge — Live tournament observation");
  console.log(`refresh=${refresh} enrich=${enrich} brainChanges=0`);
  if (refresh) console.log("Refreshing TopDeck newest window (older chunks use cache)...");
  else console.log("Using existing live-cache (no network required for TopDeck chunks)...");

  const bundle = await buildEliteTournamentIntelligenceFromLive({
    refresh,
    enrich,
    onProgress: (line) => console.log(`TopDeck: ${line}`),
  });

  if (!bundle.ok) {
    console.error(`Live observation failed: ${bundle.reason}`);
    console.error("Run with --refresh and TOPDECK_API_KEY, or ensure tests/field-intelligence/live-cache/topdeck exists.");
    process.exitCode = 1;
    return;
  }

  const report = formatReport(bundle);
  const json = {
    writesToBrain: false,
    brainChanges: 0,
    continuousObservation: true,
    fridayIsHeartbeatOnly: true,
    ingest: {
      ok: bundle.ingest.ok,
      ingestMode: bundle.ingest.ingestMode,
      stats: bundle.ingest.stats,
      sample: bundle.ingest.sample,
      fetchMeta: bundle.ingest.fetchMeta,
      attribution: bundle.ingest.attribution,
    },
    intelligence: {
      label: bundle.intelligence.label,
      corpus: bundle.intelligence.corpus,
      commanderProfiles: bundle.intelligence.commanderProfiles.map((profile) => ({
        commanderIdentity: profile.commanderIdentity,
        sampleSize: profile.sampleSize,
        independentEvents: profile.independentEvents,
        confidence: profile.confidence,
        stronglyReplicated: profile.stronglyReplicated,
        contradictions: profile.contradictions,
      })),
      levelA: {
        usableCohorts: bundle.intelligence.levelA.usableCohorts,
        observationCount: bundle.intelligence.levelA.observations.length,
      },
      strongestReplicatedObservations: bundle.intelligence.strongestReplicatedObservations,
      contradictions: bundle.intelligence.contradictions,
      comparableCohorts: bundle.intelligence.comparableCohorts,
    },
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(outDir, "epic2-live-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic2-live-tournament-intelligence.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic2-live-knowledge-report.md")}`);
  console.log(`Wrote ${join(outDir, "epic2-live-tournament-intelligence.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
