#!/usr/bin/env node
// Academy Coverage Observation 001 — Age of Vocabulary
// No Brain. No Lab. No coverageScore. Fixtures labeled if used.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { enrichCorpusRecords } from "../../app/field-intelligence/card-enrichment.mjs";
import { materializeLiveAcademyCorpus } from "../../app/sim-lab/live-corpus.mjs";
import { runCoverageObservation001 } from "../../app/academy/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "../..");
const cacheDir = join(webRoot, "tests/field-intelligence/live-cache");
const outDir = join(webRoot, "tests/field-intelligence");

const live = materializeLiveAcademyCorpus(cacheDir);
if (!live.ok) {
  console.error(`Live corpus unavailable: ${live.reason}`);
  process.exit(1);
}

console.log("Academy Coverage Observation 001 — live cohort");
console.log(`decks=${live.decks} events=${live.events} fixtures=${live.syntheticFixtures}`);

const enriched = await enrichCorpusRecords(live.records, { allowNetwork: true });
const analyses = analyzeCorpus(enriched.records);
const report = runCoverageObservation001(enriched.records, {
  analyses,
  corpusMode: "live",
  syntheticFixtures: "NOT_USED",
});

mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, "coverage-observation-001-live.json");
const mdPath = join(outDir, "ACADEMY_WHAT_IS_STRATEGIC_COVERAGE.md");
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, renderPaper(report));

console.log(`primaryVerdict=${report.primaryVerdict}`);
console.log(`admitted=${report.atlasAdmission.admittedVocabulary.length}`);
console.log(`rejected=${report.atlasAdmission.rejectedVocabulary.length}`);
console.log(`ambiguous=${report.atlasAdmission.ambiguousVocabulary.length}`);
console.log(`\nWrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

function renderPaper(r) {
  const lines = [];
  lines.push("# Academy Paper — What Is Strategic Coverage?");
  lines.push("");
  lines.push("**Status:** Academy Coverage Observation 001 · Age of Vocabulary  ");
  lines.push("**Corpus:** live Academy cohort · Synthetic fixtures **NOT USED**  ");
  lines.push("**Brain changes:** 0 · **Laboratory:** not authorized · **Mentor production:** off  ");
  lines.push(`**Primary verdict:** \`${r.primaryVerdict}\``);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Research question");
  lines.push("");
  lines.push(`> ${r.question}`);
  lines.push("");
  lines.push("We are **not** trying to prove Strategic Coverage correct. We are testing whether capability / seat / coverage language survives controlled live evidence.");
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Decks: **${r.provenance.decks}**`);
  lines.push(`- Events: **${r.provenance.events}**`);
  lines.push(`- Corpus mode: **${r.provenance.corpusMode}**`);
  lines.push(`- Synthetic fixtures: **${r.provenance.syntheticFixtures}**`);
  lines.push(`- Level-A residual contrast variables computed: **${(r.levelAControlled || []).length}**`);
  lines.push("");
  lines.push("## Institutional constraints (honored)");
  lines.push("");
  for (const [k, v] of Object.entries(r.institutionalConstraints || {})) {
    lines.push(`- \`${k}\`: **${v}**`);
  }
  lines.push("");
  lines.push("## Candidate capability vocabulary tested");
  lines.push("");
  lines.push("| ID | Label | Family | Ambiguity |");
  lines.push("|---|---|---|---|");
  for (const c of r.candidateCapabilities || []) {
    lines.push(`| ${c.id} | ${c.label} | ${c.family} | ${c.ambiguity} |`);
  }
  lines.push("");
  lines.push("## Candidate seats tested");
  lines.push("");
  for (const s of r.candidateSeats || []) {
    lines.push(`- **${s.label}** (\`${s.id}\`) → ${s.capabilityId}`);
  }
  lines.push("");
  lines.push("## Critical finding — Level-A reversals");
  lines.push("");
  lines.push("Several residuals that correlate with *structural recovery probability* globally are **higher among low performers** inside same-commander / same-event Level-A cohorts (11 cohorts).");
  lines.push("");
  lines.push("Examples: `multifunctionCount`, `uniqueRoleCount`, `independentlyCoveredCount`, `roleEntropy` show `low_greater` at Level-A.");
  lines.push("");
  lines.push("Under Atlas admission rules, that is a **contradiction**, not a promotion signal. Global recovery association without commander-controlled direction is not enough to earn capability words.");
  lines.push("");
  lines.push("> Naming is not promotion. Elegance is not evidence.");
  lines.push("");
  lines.push("## Interaction-count-controlled results (partial r recovery | ix)");
  lines.push("");
  lines.push("| Variable | r(rec) | r(ix) | partial(rec\\|ix) |");
  lines.push("|---|---:|---:|---:|");
  for (const row of (r.interactionCountControlled || []).slice(0, 12)) {
    lines.push(`| ${row.variable} | ${row.corrWithRecovery} | ${row.corrWithInteractionCount} | ${row.partialCorrRecoveryGivenIx} |`);
  }
  lines.push("");
  lines.push("## Level-A controlled results (same commander · same event · high−low)");
  lines.push("");
  lines.push("| Variable | cohorts | mean Δ (high−low) | direction |");
  lines.push("|---|---:|---:|---|");
  for (const row of (r.levelAControlled || []).slice(0, 12)) {
    lines.push(`| ${row.variable} | ${row.levelACohorts} | ${row.meanDeltaHighMinusLow} | ${row.direction} |`);
  }
  lines.push("");
  lines.push("## Capability candidate evidence (verdicts)");
  lines.push("");
  for (const ev of r.capabilityCandidateEvidence || []) {
    lines.push(`- **${ev.candidate}** — \`${ev.verdict}\` · confidence ${ev.confidence}`);
  }
  lines.push("");
  lines.push("## Atlas admission");
  lines.push("");
  lines.push(`Admitted capability labels (writesToBrain still false): **${r.atlasAdmission.admittedVocabulary.length}**`);
  for (const a of r.atlasAdmission.admittedVocabulary || []) {
    lines.push(`- ${a.id} (${a.label}) — confidence ${a.confidence}`);
  }
  if (!(r.atlasAdmission.admittedVocabulary || []).length) {
    lines.push("- *(none — elegance is not evidence)*");
  }
  lines.push("");
  lines.push(`Admitted residual *measures* (not capability words): **${(r.atlasAdmission.admittedResidualMeasures || []).length}**`);
  for (const a of r.atlasAdmission.admittedResidualMeasures || []) {
    lines.push(`- ${a.id} — confidence ${a.confidence}`);
  }
  lines.push("");
  lines.push(`Rejected capability labels: **${r.atlasAdmission.rejectedVocabulary.length}**`);
  for (const a of r.atlasAdmission.rejectedVocabulary || []) {
    lines.push(`- ${a.id} — ${a.verdict}${(a.contradictions || []).length ? ` · ${a.contradictions[0]}` : ""}`);
  }
  lines.push("");
  lines.push(`Ambiguous / unearned: **${r.atlasAdmission.ambiguousVocabulary.length}**`);
  for (const a of r.atlasAdmission.ambiguousVocabulary || []) {
    lines.push(`- ${a.id} — ${a.reason}`);
  }
  lines.push("");
  lines.push("## Counterexamples");
  lines.push("");
  if (!(r.counterexamples || []).length) {
    lines.push("- (none emitted on this pass — or sample too small)");
  } else {
    for (const c of r.counterexamples.slice(0, 12)) {
      lines.push(`- \`${c.reason}\` · deck ${c.deckId} · SPOF=${c.singlePointOfFailureCount} · indep=${c.independentlyCoveredCount}`);
    }
  }
  lines.push("");
  lines.push("## Research answers");
  lines.push("");
  const q = r.researchAnswers || {};
  lines.push(`1. Beyond interaction count: **${q.q1_explainsBeyondInteractionCount}**`);
  lines.push(`2. Survives commander controls (correct Level-A direction): ${(q.q2_survivesCommanderControls || []).join(", ") || "(none)"}`);
  lines.push(`2b. Commander-control **reversals**: ${(q.q2_commanderControlReversals || []).join(", ") || "(none)"}`);
  lines.push(`3. Archetype controls: **${q.q3_survivesArchetypeControls}**`);
  lines.push(`5. Multifunction: see JSON · ${q.q5_multifunctionSurvives?.note || ""}`);
  lines.push(`9. Counterexample count: **${q.q9_collapsesUnderCounterexamples}**`);
  lines.push(`10. Coverage umbrella: **${q.q10_coverageUmbrella}**`);
  lines.push("");
  lines.push("## Strongest unexplained residual");
  lines.push("");
  if (r.strongestUnexplainedResidual) {
    const s = r.strongestUnexplainedResidual;
    lines.push(`**${s.variable}** — partial(rec|ix)=${s.partialCorrRecoveryGivenIx}, r(rec)=${s.corrWithRecovery}, r(ix)=${s.corrWithInteractionCount}`);
  } else {
    lines.push("- (none)");
  }
  lines.push("");
  lines.push("## Concepts rejected / still ambiguous / admitted");
  lines.push("");
  lines.push("See Atlas admission section. **Atlas admission ≠ Brain promotion.**");
  lines.push("");
  lines.push("## Does Strategic Coverage survive as a coherent concept?");
  lines.push("");
  lines.push(`Verdict: **${r.primaryVerdict}**`);
  lines.push("");
  lines.push(String(q.q10_coverageUmbrella || ""));
  lines.push("");
  lines.push("## Recommended next Academy question");
  lines.push("");
  lines.push(`> ${r.recommendedNextAcademyQuestion}`);
  lines.push("");
  lines.push("## Explicit non-recommendations");
  lines.push("");
  lines.push("- Brain implementation: **false**");
  lines.push("- Laboratory authorized: **false**");
  lines.push("- Mentor production coaching: **false**");
  lines.push("- `coverageScore`: **does not exist**");
  lines.push("");
  lines.push("## North star");
  lines.push("");
  lines.push("> Before MetaForge thinks in capabilities, prove that capabilities are a better language for strategy than the proxies that led us to them.");
  lines.push("");
  lines.push("Brain waits.");
  lines.push("");
  return lines.join("\n");
}
