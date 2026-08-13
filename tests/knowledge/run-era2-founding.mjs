#!/usr/bin/env node
// Era 2 Founding Complete — unified closeout report.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStrategicConceptLibrary } from "../../app/knowledge/strategic-concept.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { assertFixtureTeachesConcept } from "../../app/knowledge/strategic-concept.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";
import { summarizeConceptExpertCoverage } from "../../app/knowledge/concept-expert-evidence.mjs";
import { summarizeConceptTournamentCoverage } from "../../app/knowledge/concept-tournament-evidence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const library = buildStrategicConceptLibrary();
  const experts = summarizeConceptExpertCoverage();
  const tournament = summarizeConceptTournamentCoverage();

  const orphan = SITUATIONAL_FIXTURES_V0.filter((f) => !assertFixtureTeachesConcept(f).ok);
  const lessons = SITUATIONAL_FIXTURES_V0.map((f) => {
    const e = evaluateSituationalFixture(f);
    return {
      id: f.id,
      concept: e.concept?.name,
      implementation: e.teaches?.implementation,
      relation: e.teaches?.relation,
      ok: e.ok,
    };
  });

  const era1 = evaluateStrategicDecision({
    decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
    commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
    commanderName: "Atraxa, Praetors' Voice",
    selected: {
      slotJustificationLedger: {
        byName: { "smothering tithe": { flags: { rawPowerDominant: true } } },
      },
    },
  });

  const report = [
    "# Era 2 Founding Complete",
    "",
    library.era2Founding.label,
    "",
    library.era2Founding.note,
    "",
    "## Scoreboard",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Concepts | ${library.summary.conceptCount} |`,
    `| Emerging | ${library.summary.emergingCount} |`,
    `| Candidates | ${library.summary.candidateCount} |`,
    `| Fixtures | ${SITUATIONAL_FIXTURES_V0.length} |`,
    `| Fixture evidence links | ${library.summary.fixtureEvidenceCount} |`,
    `| Expert observations | ${experts.observationCount} |`,
    `| Tournament observations | ${tournament.observationCount} |`,
    `| Orphan fixtures | ${orphan.length} |`,
    `| Brain inheritance | none |`,
    `| writesToBrain | false |`,
    "",
    "## Friday-shaped concepts",
    "",
    "```text",
    ...library.concepts.map((c) => [
      c.name,
      `  status ${c.status}`,
      `  fixtures ${c.evidence.fixtures.length} · experts ${c.evidence.experts} · tournament ${c.evidence.tournament}`,
      `  confidence ${c.confidence.level} (${c.confidence.score})`,
    ].join("\n")),
    "```",
    "",
    "## Era 1 bridge sample",
    "",
    `Cited: ${(era1.conceptsCited || []).map((c) => c.name).join(", ")}`,
    "",
    `> ${era1.coachVoice.paragraph}`,
    "",
    "## Deferred",
    "",
    ...(library.era2Founding.deferredToLaterEras || library.era2Founding.deferred || []).map((d) => `- ${d}`),
    "",
    "## Fixture → concept",
    "",
    "| Fixture | Concept | Implementation |",
    "|---------|---------|----------------|",
    ...lessons.map((r) => `| \`${r.id}\` | ${r.concept} | ${r.implementation} |`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "era2-founding-complete.md"), report, "utf8");
  writeFileSync(join(outDir, "era2-founding-complete.json"), JSON.stringify({
    era2Founding: library.era2Founding,
    summary: library.summary,
    fixtureCount: SITUATIONAL_FIXTURES_V0.length,
    orphanCount: orphan.length,
    lessons,
    era1ConceptsCited: era1.conceptsCited,
  }, null, 2), "utf8");
  console.log(report);
}

main();
