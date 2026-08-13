#!/usr/bin/env node
// Epic 4 — Expert Strategy Corpus / Stream 002 report (human-inspectable).
// Observation only. Naming is not promotion. Admission may be zero.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExpertStrategyCorpusFromFixtures } from "../../app/knowledge/expert-strategy-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatReport(intel) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 4");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 4 — Expert Strategy Corpus (Academy Evidence Stream 002)");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**activated:** false");
  lines.push("**promoted:** false");
  lines.push("**Naming is not promotion.**");
  lines.push("");
  lines.push("## Falsifiable question");
  lines.push("");
  lines.push(`> ${intel.falsifiableQuestion}`);
  lines.push("");
  lines.push(`**Outcome:** \`${intel.outcome.answer}\` — ${intel.outcome.replicatedConcepts} candidate(s), ${intel.outcome.rejectedConcepts} reject(s).`);
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Fixture expert sources | ${intel.corpus.sources} |`);
  lines.push(`| Independent voices | ${intel.corpus.independentVoices} |`);
  lines.push(`| Sources with no concept hit | ${intel.corpus.emptyExtracted} |`);
  lines.push(`| Replicated candidates (≥2 voices) | ${intel.candidates.length} |`);
  lines.push(`| Rejects (insufficient replication) | ${intel.rejects.length} |`);
  lines.push(`| Context tensions archived | ${intel.contradictions.length} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");
  lines.push("## What MetaForge now knows");
  lines.push("");
  lines.push("Expert *reasoning* is now an inspectable evidence stream (fixtures first).");
  lines.push("Concepts only become **candidates** when they replicate across independent voices.");
  lines.push("Single-voice hits stay in Archive as rejects — honesty over completeness.");
  lines.push("");
  lines.push("### Candidate decision concepts");
  lines.push("");
  for (const candidate of intel.candidates) {
    lines.push(`#### ${candidate.label} (\`${candidate.conceptId}\`)`);
    lines.push(`- Independent experts: ${candidate.independentExperts}`);
    lines.push(`- Authors: ${candidate.authors.join(", ")}`);
    lines.push(`- Sources: ${candidate.sources.map((s) => s.title).join(" · ")}`);
    lines.push(`- activated: false · promoted: false`);
    lines.push("");
  }
  if (!intel.candidates.length) {
    lines.push("- **Honest zero admission** — no concept replicated across ≥2 independent experts.");
    lines.push("");
  }
  lines.push("### Rejects (Archive)");
  lines.push("");
  for (const reject of intel.rejects.slice(0, 12)) {
    lines.push(`- **${reject.label}** — ${reject.rejectReason} (${reject.authors.join(", ")})`);
  }
  if (!intel.rejects.length) lines.push("- None.");
  lines.push("");
  lines.push("### Empty / non-strategic sources");
  lines.push("");
  for (const row of intel.extractions.filter((e) => e.emptyReason)) {
    lines.push(`- ${row.title || row.sourceId} — ${row.emptyReason}`);
  }
  if (!intel.extractions.some((e) => e.emptyReason)) lines.push("- None.");
  lines.push("");
  lines.push("### Context tensions");
  lines.push("");
  for (const row of intel.contradictions) {
    lines.push(`- ${row.authorKey}: ${row.note}`);
  }
  if (!intel.contradictions.length) lines.push("- None in this slice.");
  lines.push("");
  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- No scraping the internet for completeness.");
  lines.push("- No Brain / Mentor / new institution.");
  lines.push("- No promoting candidates because they sound expert.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 5: Strategic Knowledge Retriever (query inspectable knowledge — still observation).");
  lines.push("- Live Stream 002 ingestion only under separate authorization; fixtures proved the pipeline.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const intel = buildExpertStrategyCorpusFromFixtures();
  const report = formatReport(intel);
  const json = {
    writesToBrain: false,
    activated: false,
    promoted: false,
    epic: 4,
    stream: intel.stream,
    brainChanges: 0,
    falsifiableQuestion: intel.falsifiableQuestion,
    outcome: intel.outcome,
    corpus: intel.corpus,
    candidates: intel.candidates,
    rejects: intel.rejects,
    contradictions: intel.contradictions,
    archiveNote: intel.archiveNote,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, "epic4-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic4-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic4-knowledge-report.md")}`);
}

main();
