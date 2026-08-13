#!/usr/bin/env node
// Era 2 — Situational Strategic Evaluation v0.1 report
// Judgment without construction. Not a combat engine. Brain inheritance: none.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function format(fixture, evaluation) {
  const lines = [];
  lines.push(`### ${fixture.title}`);
  lines.push("");
  lines.push(`**Claim:** ${evaluation.claim}`);
  lines.push("");
  lines.push(`**Chosen:** ${evaluation.decision.chosenLabel}`);
  lines.push(`**Alternatives:** ${evaluation.decision.alternatives.join(" · ")}`);
  if (evaluation.decision.stackTop) {
    lines.push(`**Stack top:** ${evaluation.decision.stackTop.spell} (terminal=${evaluation.decision.stackTop.terminalThreat})`);
  }
  lines.push(`**Confidence:** ${evaluation.confidence.level} (${evaluation.confidence.score})`);
  lines.push(`**State:** ${evaluation.stateLabel} · modelCompleteness=${evaluation.state.modelCompleteness.band}`);
  lines.push(`**Hypothesis id:** \`${evaluation.hypothesis?.id || "none"}\``);
  if (evaluation.concept) {
    lines.push(`**Teaches:** ${evaluation.concept.name} · ${evaluation.teaches.implementation} · ${evaluation.teaches.relation}`);
  }
  lines.push("");
  lines.push("**Pros**");
  for (const p of evaluation.pros) lines.push(`- ${p}`);
  lines.push("");
  lines.push("**Cons**");
  for (const c of evaluation.cons) lines.push(`- ${c}`);
  lines.push("");
  lines.push("**Strategic tradeoff**");
  for (const t of evaluation.strategicTradeoff) lines.push(`- ${t}`);
  lines.push("");
  lines.push("**Retirement criteria**");
  for (const r of evaluation.retirementCriteria) lines.push(`- ${r}`);
  lines.push("");
  if (evaluation.witness) {
    lines.push(`**1v1 witness (not EDH judge):** ${evaluation.witness.status} — ${evaluation.witness.message}`);
    lines.push("");
  }
  lines.push(`> ${evaluation.coachVoice.paragraph}`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const evaluations = SITUATIONAL_FIXTURES_V0.map((fixture) => ({
    fixture,
    evaluation: evaluateSituationalFixture(fixture),
  }));

  const report = [
    "# MetaForge Situational Strategic Evaluation v0.1 (Era 2)",
    "",
    "**Judgment without construction.** Brain inheritance: none.",
    "**Not a rules engine. Not Monte Carlo. Not Brain.**",
    "Unknown zones stay unknown. Incomplete ≠ absent.",
    "",
    "## What this is",
    "",
    "Era 2: inspectable play decisions under incomplete information.",
    "v0.1 adds stack-aware priority judgment and bridges each fixture into a",
    "**Strategic Hypothesis** research object (naming ≠ promotion).",
    "",
    "## Fixtures",
    "",
    ...evaluations.map(({ fixture, evaluation }) => format(fixture, evaluation)),
    "## Gameplay → Hypothesis bridge",
    "",
    "Each fixture yields `gameplay:<fixture-id>` with prediction + retirement criteria.",
    "These stay sandbox until expert notes / richer capture / simulation witnesses earn more.",
    "",
    "## Pipeline position",
    "",
    "```text",
    "Knowledge → Hypotheses → Stance (voice) → Evaluation (Era 1 construction)",
    "                                        → Situational Evaluation (Era 2) ← you are here",
    "                                          └─→ Strategic Hypothesis (gameplay:*)",
    "                                        → Simulation (witness later)",
    "                                        → Lab → Harness → Brain (rare)",
    "```",
    "",
    "## Explicit non-goals (v0.1)",
    "",
    "- No full multiplayer combat / stack engine",
    "- No Epic 7 simulation scale",
    "- No Brain / package / weight changes",
    "- No claiming the board is fully known",
    "- No promoting gameplay hypotheses into Stance product voice yet",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  const outPath = join(outDir, "situational-evaluation-v0-report.md");
  writeFileSync(outPath, report, "utf8");

  const jsonPath = join(outDir, "situational-evaluation-v0.json");
  writeFileSync(jsonPath, JSON.stringify({
    version: "situational-strategic-evaluation-v0.1",
    writesToBrain: false,
    fixtures: evaluations.map(({ fixture, evaluation }) => ({
      id: fixture.id,
      chosenId: evaluation.decision?.chosenId,
      confidence: evaluation.confidence,
      hypothesisId: evaluation.hypothesis?.id || null,
      ok: evaluation.ok,
    })),
  }, null, 2), "utf8");

  console.log(report);
  console.log(`\nWrote ${outPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main();
