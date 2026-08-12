#!/usr/bin/env node
// Epic 2 — Elite Tournament Intelligence report (human-inspectable).
// Observation only. Brain unchanged. Popular card ≠ correct card.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEliteTournamentIntelligenceFromFixtures,
  summarizeLiveEliteArtifact,
} from "../../app/knowledge/elite-tournament-intelligence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatReport({ intel, live }) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 2");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 2 — Elite Tournament Intelligence");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Anti-netdeck:** popular card ≠ correct card");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Fixture decks fingerprinted | ${intel.corpus.fingerprints} |`);
  lines.push(`| Events represented | ${intel.corpus.events} |`);
  lines.push(`| Unique commanders | ${intel.corpus.uniqueCommanders} |`);
  lines.push(`| Commander profiles | ${intel.commanderProfiles.length} |`);
  lines.push(`| Archetype profiles | ${intel.archetypeProfiles.length} |`);
  lines.push(`| Level-A usable cohorts | ${intel.levelA.usableCohorts} |`);
  lines.push(`| Comparable cohorts (A/B/C/D) | ${intel.comparableCohorts.A}/${intel.comparableCohorts.B}/${intel.comparableCohorts.C}/${intel.comparableCohorts.D} |`);
  lines.push(`| Strongly replicated observations | ${intel.strongestReplicatedObservations.length} |`);
  lines.push(`| Contradictions surfaced | ${intel.contradictions.length} |`);
  lines.push(`| Structural package ranges | ${intel.structuralEvidence.packageCoreRanges} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");

  if (live) {
    lines.push("## Live Field Intelligence projection (read-only)");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|------:|");
    lines.push(`| Generated at | ${live.generatedAt || "—"} |`);
    lines.push(`| Decks analyzed | ${live.decksAnalyzed ?? "—"} |`);
    lines.push(`| Records ingested | ${live.recordsIngested ?? "—"} |`);
    lines.push(`| Events | ${live.eventsRepresented ?? "—"} |`);
    lines.push(`| Unique commanders | ${live.uniqueCommanders ?? "—"} |`);
    lines.push(`| Top-cut decks | ${live.topCutDecks ?? "—"} |`);
    lines.push(`| Level-A usable cohorts | ${live.levelAUsableCohorts ?? "—"} |`);
    lines.push(`| brainPolicyTouched | ${live.brainPolicyTouched} |`);
    lines.push(`| constructionMutated | ${live.constructionMutated} |`);
    lines.push("");
  }

  lines.push("## What MetaForge now knows");
  lines.push("");
  lines.push("Tournament decks are no longer just lists. Each deck becomes a **strategic fingerprint**:");
  lines.push("primary plan, supporting plans, role/curve/mana profiles, interaction composition,");
  lines.push("threat density, package legs, commander dependence, and performance provenance.");
  lines.push("");
  lines.push("Commander profiles aggregate those fingerprints into evidence-backed structural ranges");
  lines.push("with explicit confidence (insufficient / limited / moderate / high) and contradiction flags.");
  lines.push("");

  lines.push("### Strongest replicated observations");
  lines.push("");
  for (const obs of intel.strongestReplicatedObservations.slice(0, 12)) {
    lines.push(`- **${obs.commanderIdentity}** — ${obs.observation} _(confidence: ${obs.confidence})_`);
  }
  if (!intel.strongestReplicatedObservations.length) {
    lines.push("- None yet above replication threshold.");
  }
  lines.push("");

  lines.push("### Commander profiles (top by sample)");
  lines.push("");
  for (const profile of intel.commanderProfiles.slice(0, 8)) {
    const plans = profile.observedSuccessfulStructures.primaryPlans
      .map((plan) => `${plan.id}×${plan.count}`)
      .join(", ") || "—";
    lines.push(`#### ${profile.commanderIdentity}`);
    lines.push(`- Sample: ${profile.sampleSize} decks · ${profile.independentEvents} events · ${profile.converters} converters`);
    lines.push(`- Confidence: ${profile.confidence.level}`);
    lines.push(`- Primary plans: ${plans}`);
    if (profile.contradictions.length) {
      lines.push(`- Contradictions: ${profile.contradictions.join("; ")}`);
    }
    if (profile.unknown.length) {
      lines.push(`- Unknown: ${profile.unknown.join("; ")}`);
    }
    lines.push("");
  }

  lines.push("### Level-A structural comparisons (same commander · same event)");
  lines.push("");
  for (const obs of intel.levelA.observations.slice(0, 8)) {
    lines.push(`#### ${obs.commanderIdentity} @ ${obs.eventName || obs.eventId}`);
    lines.push(`- Cohort ${obs.cohortSize} (high ${obs.highCount} / low ${obs.lowCount})`);
    for (const diff of obs.structuralDifferences.slice(0, 5)) {
      lines.push(`- ${diff}`);
    }
    lines.push(`- _${obs.caveat}_`);
    lines.push("");
  }
  if (!intel.levelA.observations.length) {
    lines.push("- No Level-A cohorts in this fixture run.");
    lines.push("");
  }

  lines.push("### Contradictions discovered");
  lines.push("");
  for (const entry of intel.contradictions.slice(0, 12)) {
    lines.push(`- **${entry.commanderIdentity}** — ${entry.text}`);
  }
  if (!intel.contradictions.length) {
    lines.push("- None surfaced above thresholds.");
  }
  lines.push("");

  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- Do not copy modal 99s from elite lists.");
  lines.push("- Do not treat frequency as quality.");
  lines.push("- Do not mutate Brain construction without a Validation Harness report.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 3: Strategic Substitution Intelligence (families / near-equivalents / when-not-to-substitute)");
  lines.push("- Keep Brain frozen until field evidence earns a change.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const intel = buildEliteTournamentIntelligenceFromFixtures();

  let live = null;
  const livePath = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
  if (existsSync(livePath)) {
    try {
      live = summarizeLiveEliteArtifact(JSON.parse(readFileSync(livePath, "utf8")));
    } catch {
      live = null;
    }
  }

  const report = formatReport({ intel, live });
  const json = {
    writesToBrain: false,
    epic: 2,
    brainChanges: 0,
    antiNetdeck: intel.antiNetdeck,
    corpus: intel.corpus,
    commanderProfiles: intel.commanderProfiles.map((profile) => ({
      commanderIdentity: profile.commanderIdentity,
      sampleSize: profile.sampleSize,
      independentEvents: profile.independentEvents,
      confidence: profile.confidence,
      stronglyReplicated: profile.stronglyReplicated,
      contradictions: profile.contradictions,
    })),
    archetypeProfiles: intel.archetypeProfiles,
    levelA: {
      usableCohorts: intel.levelA.usableCohorts,
      observationCount: intel.levelA.observations.length,
      sample: intel.levelA.observations.slice(0, 8),
    },
    comparableCohorts: intel.comparableCohorts,
    strongestReplicatedObservations: intel.strongestReplicatedObservations,
    contradictions: intel.contradictions,
    structuralEvidence: intel.structuralEvidence,
    liveProjection: live,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(outDir, "epic2-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic2-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic2-knowledge-report.md")}`);
}

main();
