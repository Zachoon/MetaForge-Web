#!/usr/bin/env node
// Strategic Concept Library — expert + tournament evidence + Era bridge.
// Naming ≠ promotion. Brain inheritance: none.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStrategicConceptLibrary } from "../../app/knowledge/strategic-concept.mjs";
import { summarizeConceptExpertCoverage } from "../../app/knowledge/concept-expert-evidence.mjs";
import { summarizeConceptTournamentCoverage } from "../../app/knowledge/concept-tournament-evidence.mjs";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatConcept(concept) {
  const lines = [];
  lines.push(`## ${concept.name}`);
  lines.push("");
  lines.push(`**Status:** ${concept.status} · **Confidence:** ${concept.confidence.level} (${concept.confidence.score})`);
  lines.push(`**Experts:** ${concept.evidence.experts} · **Tournament:** ${concept.evidence.tournament} · **Fixtures:** ${concept.evidence.fixtures.length}`);
  lines.push("");
  lines.push(concept.description);
  lines.push("");
  if (concept.evidence.tournamentDetail?.observations?.length) {
    lines.push("### Tournament-structure evidence");
    for (const obs of concept.evidence.tournamentDetail.observations) {
      const tag = obs.countsAsSupport ? "support" : "non-evidence";
      lines.push(`- *[${tag}]* **${obs.title}** — ${obs.claim}`);
    }
    lines.push("");
  }
  if (concept.evidence.expertDetail?.observations?.length) {
    lines.push(`### Expert evidence (${concept.evidence.expertDetail.independentVoices} voices)`);
    for (const obs of concept.evidence.expertDetail.observations.slice(0, 3)) {
      lines.push(`- **${obs.title}** (${obs.authorKey})`);
    }
    lines.push("");
  }
  lines.push(`**Construction:** ${concept.constructionImplications} · **Brain:** ${concept.brainInheritance}`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const library = buildStrategicConceptLibrary();
  const expertSummary = summarizeConceptExpertCoverage();
  const tournamentSummary = summarizeConceptTournamentCoverage();

  const era1Bridge = evaluateStrategicDecision({
    decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
    commission: { fantasyLabel: "Superfriends", priorities: ["theme", "planeswalkers"] },
    commanderName: "Atraxa, Praetors' Voice",
    selected: {
      slotJustificationLedger: {
        byName: { "smothering tithe": { flags: { rawPowerDominant: true } } },
      },
    },
  });

  const friday = library.concepts.map((c) => [
    `  ${c.name}`,
    `    Fixtures ${c.evidence.fixtures.length} · Experts ${c.evidence.experts} · Tournament ${c.evidence.tournament}`,
    `    Confidence ${c.confidence.level} (${c.confidence.score})`,
  ].join("\n")).join("\n");

  const report = [
    "# MetaForge Strategic Concept Library — Tournament + Era 1 Bridge",
    "",
    "Tournament bands = preparation structure. Not in-game proof. Brain: none.",
    "",
    "## Friday-shaped progress",
    "",
    "```text",
    friday,
    "```",
    "",
    "## Era 1 ↔ Era 2 bridge sample",
    "",
    `Decision: ${era1Bridge.decision.summary}`,
    `Concepts cited: ${(era1Bridge.conceptsCited || []).map((c) => c.name).join(", ") || "none"}`,
    "",
    `> ${era1Bridge.coachVoice.paragraph}`,
    "",
    `- Expert observations: ${expertSummary.observationCount}`,
    `- Tournament observations: ${tournamentSummary.observationCount}`,
    `- Tournament bands: ${JSON.stringify(library.summary.tournamentBands)}`,
    "",
    ...library.concepts.map(formatConcept),
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "strategic-concept-library-v0.md"), report, "utf8");
  writeFileSync(join(outDir, "strategic-concept-library-v0.json"), JSON.stringify({
    summary: library.summary,
    expertSummary: expertSummary.friday,
    tournamentSummary: tournamentSummary.friday,
    era1Bridge: {
      conceptsCited: era1Bridge.conceptsCited,
      confidence: era1Bridge.confidence,
    },
  }, null, 2), "utf8");
  console.log(report);
}

main();
