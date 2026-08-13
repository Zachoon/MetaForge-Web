#!/usr/bin/env node
// Era 2 Complete — unified closeout.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStrategicConceptLibrary } from "../../app/knowledge/strategic-concept.mjs";
import { summarizeConceptPlayCoverage } from "../../app/knowledge/concept-play-evidence.mjs";
import { summarizeConceptSimulationCoverage } from "../../app/knowledge/concept-simulation-evidence.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";
import { buildSessionConceptVoice } from "../../app/concept-stance-voice.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const library = buildStrategicConceptLibrary();
  const play = summarizeConceptPlayCoverage();
  const simulation = summarizeConceptSimulationCoverage();
  const voice = buildSessionConceptVoice({ fantasyLabel: "Superfriends", priorities: ["theme"] });
  const sample = evaluateSituationalFixture(
    SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-hold-counter-vs-dangerous-tutor"),
  );

  const report = [
    "# Era 2 Complete",
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
    `| Fixtures | ${SITUATIONAL_FIXTURES_V0.length} |`,
    `| Play captures | ${play.captureCount} |`,
    `| Info Asymmetry play band | ${library.summary.playBands["information-asymmetry"]} |`,
    `| Info Asymmetry tournament band | ${library.summary.tournamentBands["information-asymmetry"]} |`,
    `| Simulation bands | ${JSON.stringify(library.summary.simulationBands)} |`,
    `| Concept stance voice | ${voice.version} |`,
    `| Brain | none |`,
    "",
    "## Friday-shaped concepts",
    "",
    "```text",
    ...library.concepts.map((c) => [
      c.name,
      `  status ${c.status} · confidence ${c.confidence.level} (${c.confidence.score})`,
      `  experts ${c.evidence.experts} · tournament ${c.evidence.tournament} · play ${c.evidence.play} · simulation ${c.evidence.simulation}`,
    ].join("\n")),
    "```",
    "",
    "## Simulation witness sample",
    "",
    `Fixture: hold counter vs dangerous tutor`,
    `Verdict: ${sample.simulationWitness?.verdict} (${sample.simulationWitness?.status})`,
    `Note: ${sample.simulationWitness?.note}`,
    "",
    "## Deferred to later eras",
    "",
    ...library.era2Founding.deferredToLaterEras.map((d) => `- ${d}`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  writeFileSync(join(outDir, "era2-complete.md"), report, "utf8");
  writeFileSync(join(outDir, "era2-complete.json"), JSON.stringify({
    era2: library.era2Founding,
    summary: library.summary,
    play: play.friday,
    simulation: simulation.friday,
    sampleWitness: sample.simulationWitness,
  }, null, 2), "utf8");
  console.log(report);
}

main();
