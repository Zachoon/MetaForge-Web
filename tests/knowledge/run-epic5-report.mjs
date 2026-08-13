#!/usr/bin/env node
// Epic 5 — Strategic Knowledge Retriever report (human-inspectable).
// Observation only. Unknown is not absent.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadKnowledgeSnapshot,
  retrieveStrategicKnowledge,
  summarizeRetrieverCoverage,
} from "../../app/knowledge/strategic-knowledge-retriever.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatReport({ coverage, samples }) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 5");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 5 — Strategic Knowledge Retriever");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Unknown is not absent.**");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Epic 1 cards in snapshot | ${coverage.epic1Cards} |`);
  lines.push(`| Commander profiles | ${coverage.commanderProfiles} |`);
  lines.push(`| Substitution seat families | ${coverage.seatFamilies} |`);
  lines.push(`| When-not-to-substitute claims | ${coverage.whenNotToSubstitute} |`);
  lines.push(`| Decision concept candidates | ${coverage.decisionCandidates} |`);
  lines.push(`| Decision concept rejects | ${coverage.decisionRejects} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");
  lines.push("## What MetaForge now knows");
  lines.push("");
  lines.push("Knowledge from Epics 1–4 is **queryable** without mutating construction.");
  lines.push("The retriever returns inspectable evidence or an explicit unknown — never a fake strategic absence.");
  lines.push("");
  lines.push("### Sample retrievals");
  lines.push("");
  for (const sample of samples) {
    lines.push(`#### Query: \`${JSON.stringify(sample.query)}\``);
    lines.push(`- ok: ${sample.result.ok}`);
    lines.push(`- kind: ${sample.result.kind || "unknown"}`);
    if (sample.result.unknown) {
      lines.push(`- reason: ${sample.result.reason}`);
      lines.push(`- note: ${sample.result.note}`);
    } else if (sample.result.kind === "card_intelligence") {
      lines.push(`- card: ${sample.result.card.identity.canonicalName}`);
      lines.push(`- classes: ${sample.result.card.knowledgeClasses.map((c) => c.label).join(", ")}`);
    } else if (sample.result.kind === "commander_profile") {
      lines.push(`- commander: ${sample.result.profile.commanderIdentity}`);
      lines.push(`- sampleSize: ${sample.result.profile.sampleSize} · confidence: ${sample.result.profile.confidence?.level}`);
    } else if (sample.result.kind === "substitution_seats") {
      lines.push(`- families: ${sample.result.families.length} · whenNot: ${sample.result.whenNot.length}`);
    } else if (sample.result.kind === "decision_concept") {
      lines.push(`- concept: ${sample.result.candidate.label} · experts: ${sample.result.candidate.independentExperts}`);
    } else if (sample.result.kind === "decision_concepts") {
      lines.push(`- candidates: ${sample.result.candidates.length}`);
    }
    lines.push("");
  }
  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- No Brain recommendation API.");
  lines.push("- No inventing answers when evidence is thin.");
  lines.push("- No netdeck popularity ranking as truth.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 6: Brain Shadow Evaluation (read-only compare Brain v1 vs knowledge — still no mutation).");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const snapshot = loadKnowledgeSnapshot();
  const coverage = summarizeRetrieverCoverage(snapshot);
  const commander = snapshot.epic2.commanderProfiles[0]?.commanderIdentity;
  const familyCard = snapshot.epic3.seatFamilies[0]?.members?.[0]?.name;
  const concept = snapshot.epic4.candidates[0]?.conceptId;

  const queries = [
    { kind: "card", name: "Doubling Season" },
    { kind: "commander", commander },
    { kind: "substitution", commander, card: familyCard },
    { kind: "concept", concept },
    { kind: "concept" },
    { name: "Definitely Not A Real Card 999" },
  ];
  const samples = queries.map((query) => ({
    query,
    result: retrieveStrategicKnowledge(query, snapshot),
  }));

  const report = formatReport({ coverage, samples });
  const json = {
    writesToBrain: false,
    epic: 5,
    brainChanges: 0,
    coverage,
    samples: samples.map((sample) => ({
      query: sample.query,
      ok: sample.result.ok,
      kind: sample.result.kind || null,
      unknown: sample.result.unknown || false,
      reason: sample.result.reason || null,
    })),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, "epic5-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic5-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic5-knowledge-report.md")}`);
}

main();
