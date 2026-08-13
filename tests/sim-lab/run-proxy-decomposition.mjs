#!/usr/bin/env node
// Academy Proxy Decomposition — Interaction Count Doesn't Win
// (alias: Why Interaction Count Still Wins)
// Observation only. No Sim-Lab-002. No Brain.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import { enrichCorpusRecords } from "../../app/field-intelligence/card-enrichment.mjs";
import { materializeLiveAcademyCorpus } from "../../app/sim-lab/live-corpus.mjs";
import { runProxyDecomposition } from "../../app/sim-lab/proxy-decomposition.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "../..");
const cacheDir = join(webRoot, "tests/field-intelligence/live-cache");
const fiOut = join(webRoot, "tests/field-intelligence");
const simOut = join(webRoot, "tests/sim-lab");

const live = materializeLiveAcademyCorpus(cacheDir);
if (!live.ok) {
  console.error(`Live corpus unavailable: ${live.reason}`);
  process.exit(1);
}

console.log("Academy Proxy Decomposition — live cohort");
console.log(`decks=${live.decks} events=${live.events} fixtures=${live.syntheticFixtures}`);

const enriched = await enrichCorpusRecords(live.records, { allowNetwork: true });
const analyses = analyzeCorpus(enriched.records);
const report = runProxyDecomposition(enriched.records, {
  analyses,
  corpusMode: "live",
  syntheticFixtures: "NOT_USED",
});

mkdirSync(fiOut, { recursive: true });
mkdirSync(simOut, { recursive: true });
const jsonPath = join(simOut, "proxy-decomposition-live.json");
const mdPath = join(fiOut, "ACADEMY_INTERACTION_COUNT_DOESNT_WIN.md");
const aliasPath = join(fiOut, "ACADEMY_WHY_INTERACTION_COUNT_STILL_WINS.md");
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, renderPaper(report));
writeFileSync(aliasPath, renderAlias());

console.log(renderPaper(report));
console.log(`\nWrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(`Wrote alias ${aliasPath}`);

function renderAlias() {
  return [
    "# Academy Paper — Why Interaction Count Still Wins",
    "",
    "**Renamed.** This title was the first draft of the Proxy Decomposition paper.",
    "",
    "The discovery is sharper than “interaction count still wins.”",
    "",
    "→ **[Interaction Count Doesn't Win](ACADEMY_INTERACTION_COUNT_DOESNT_WIN.md)**  ",
    "→ Subtitle: *It Merely Reveals Strategic Coverage*  ",
    "→ Next Academy sprint: [`docs/STRATEGIC_COVERAGE.md`](../../docs/STRATEGIC_COVERAGE.md)",
    "",
    "Full numbers, residual table, and institutional posture live on the renamed paper. This file remains as a stable alias so older Archive links do not break.",
    "",
  ].join("\n");
}

function renderPaper(r) {
  const top = (r.rankedCandidates || []).slice(0, 15);
  const lines = [];
  lines.push("# Academy Paper — Interaction Count Doesn't Win");
  lines.push("");
  lines.push("**Subtitle:** It Merely Reveals Strategic Coverage  ");
  lines.push("**Status:** observation / Proxy Decomposition · causal discovery  ");
  lines.push("**Corpus:** live Academy cohort · Synthetic fixtures **NOT USED**  ");
  lines.push("**Brain changes:** 0 · **Sim-Lab-002:** not run · **Harness:** not requested  ");
  lines.push("**Next Academy sprint:** [Strategic Coverage Project](../../docs/STRATEGIC_COVERAGE.md)");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Abstract");
  lines.push("");
  lines.push("Sim-Lab-001 rejected the hypothesis that our *current* topology abstraction explains structural recovery better than interaction count. Fixtures were negative; live elite evidence did not flip that result.");
  lines.push("");
  lines.push("Proxy Decomposition then asked why interaction count still predicts recovery. The residual table does not say “quantity wins.” It says interaction count is a **cheap observable proxy** for something deeper:");
  lines.push("");
  lines.push("> **Strategic Coverage** — breadth of distinct strategic jobs, interchangeable seats, and multifunction flexibility.");
  lines.push("");
  lines.push("So the honest title is not “why interaction count still wins.”  ");
  lines.push("It is: **interaction count doesn't win — it merely reveals coverage.**");
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Decks analyzed: **${r.decksAnalyzed}**`);
  lines.push(`- Events: **${r.eventsRepresented}**`);
  lines.push(`- Corpus mode: **${r.corpusMode}**`);
  lines.push(`- Interaction count ↔ recovery: **${r.interactionCountCorrWithRecovery}**`);
  lines.push(`- Primary hypothesis label: **${r.primaryHypothesis}**`);
  lines.push("- Named discovery: **Strategic Coverage** (Academy concept — not a Brain feature)");
  lines.push("");
  lines.push("## Causal discovery");
  lines.push("");
  lines.push("```");
  lines.push("Old hope:     Topology            → Recovery");
  lines.push("Observed:     InteractionCount    → Recovery");
  lines.push("Suspect:      InteractionCount    → (latent) → Recovery");
  lines.push("Academy name: InteractionCount    → Strategic Coverage → Recovery");
  lines.push("```");
  lines.push("");
  lines.push("## What Sim-Lab-001 actually taught");
  lines.push("");
  lines.push("| Claim | Status |");
  lines.push("|---|---|");
  lines.push("| Topology is useless | **Not proven** |");
  lines.push("| Current topology model is not predictive enough | **Supported** |");
  lines.push("| Interaction count is the true strategic primitive | **Not supported** — it is likely a proxy |");
  lines.push("| Residuals cluster on optionality / coverage / multifunction | **Supported** |");
  lines.push("| Therefore promote anything into Brain | **Forbidden / not requested** |");
  lines.push("");
  lines.push("Archive: `docs/archive/SIM_LAB_001_REJECTION.md`");
  lines.push("");
  lines.push("## Method — Proxy Decomposition");
  lines.push("");
  lines.push("For each live deck, measure structural recovery (Sim-Lab seat deletions) and a bank of candidate explanatory variables. Rank by:");
  lines.push("");
  lines.push("1. Correlation with recovery");
  lines.push("2. Correlation with interaction count (is it entangled?)");
  lines.push("3. Partial correlation with recovery **given** interaction count (does signal survive?)");
  lines.push("");
  lines.push("## Ranked candidates (top 15)");
  lines.push("");
  lines.push("| Variable | r(recovery) | r(ix count) | partial r(rec\\|ix) | partial r(ix\\|var) | proxyScore |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const row of top) {
    lines.push(`| ${row.variable} | ${row.corrWithRecovery} | ${row.corrWithInteractionCount} | ${row.partialCorrRecoveryGivenIx} | ${row.partialCorrIxGivenVariable} | ${row.proxyScore} |`);
  }
  lines.push("");
  lines.push("## The residual cluster screams one concept");
  lines.push("");
  lines.push("Top residuals that survive conditioning on interaction count:");
  lines.push("");
  lines.push("| Variable | Read |");
  lines.push("|---|---|");
  lines.push("| **roleEntropy** | How many different strategic jobs the deck can accomplish |");
  lines.push("| **uniqueRoleCount** | Capability breadth |");
  lines.push("| **recoverySeatCount** | Interchangeable answer seats |");
  lines.push("| **multifunctionCount** / **multifunctionRatio** | Cards that solve multiple problems — flexibility |");
  lines.push("");
  lines.push("These measure **strategic optionality / coverage**, not interaction quantity and not the current topology composite.");
  lines.push("");
  lines.push("## Latent leads (raw)");
  lines.push("");
  if ((r.latentLeads || []).length) {
    for (const row of r.latentLeads) {
      lines.push(`- **${row.variable}** — r(rec)=${row.corrWithRecovery}, partial(rec|ix)=${row.partialCorrRecoveryGivenIx}, r(ix)=${row.corrWithInteractionCount}`);
    }
  } else {
    lines.push("- (none cleared the latent-lead thresholds in this pass)");
  }
  lines.push("");
  lines.push("## Pure proxies of interaction count");
  lines.push("");
  if ((r.pureProxiesOfInteractionCount || []).length) {
    for (const row of r.pureProxiesOfInteractionCount) {
      lines.push(`- **${row.variable}** — r(rec)=${row.corrWithRecovery}, r(ix)=${row.corrWithInteractionCount}, partial(rec|ix)=${row.partialCorrRecoveryGivenIx}`);
    }
  } else {
    lines.push("- (none classified as pure proxies under current thresholds)");
  }
  lines.push("");
  lines.push("## Current topology slice");
  lines.push("");
  for (const row of r.currentTopologySlice || []) {
    lines.push(`- **${row.variable}**: r(rec)=${row.corrWithRecovery}, r(ix)=${row.corrWithInteractionCount}, partial(rec|ix)=${row.partialCorrRecoveryGivenIx}`);
  }
  lines.push("");
  lines.push("Topology is not wrong — it is **incomplete**. Stop adding edges until the graph can represent strategic seats.");
  lines.push("");
  lines.push("## Open questions");
  lines.push("");
  for (const q of r.openQuestions || []) lines.push(`- ${q}`);
  lines.push("- What is the smallest set of strategic capabilities that predicts elite resilience? (Strategic Coverage Project)");
  lines.push("");
  lines.push("## Recommendation");
  lines.push("");
  lines.push(`- promoteToBrain: **${r.recommendation?.promoteToBrain}**`);
  lines.push(`- runSimLab002: **${r.recommendation?.runSimLab002}**`);
  lines.push("- next: **Strategic Coverage Project** (Academy observation) — coverage candidates compete; then a Laboratory trial with a **new representation**, not another topology composite.");
  lines.push("");
  lines.push("## North star");
  lines.push("");
  lines.push("Don't ask whether topology is “better” until we know **what interaction count is actually counting.**");
  lines.push("");
  lines.push("Proxy Decomposition’s answer, for now:");
  lines.push("");
  lines.push("> It is counting (poorly) **Strategic Coverage**.");
  lines.push("");
  lines.push("Brain changes: **0**.");
  lines.push("");
  lines.push("Former title retained as alias: `ACADEMY_WHY_INTERACTION_COUNT_STILL_WINS.md`");
  return lines.join("\n");
}
