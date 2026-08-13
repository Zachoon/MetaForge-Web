#!/usr/bin/env node
// Epic 3 — Strategic Substitution Intelligence report (human-inspectable).
// Observation only. Brain unchanged. Selection behavior unchanged.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStrategicSubstitutionIntelligenceFromFixtures,
  summarizeLiveSubstitutionArtifact,
} from "../../app/knowledge/strategic-substitution-intelligence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function formatReport({ intel, live }) {
  const lines = [];
  lines.push("# MetaForge Strategic Knowledge Report — Epic 3");
  lines.push("");
  lines.push("**Program:** Knowledge Expansion");
  lines.push("**Epic:** 3 — Strategic Substitution Intelligence");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**selectionBehaviorChanged:** false");
  lines.push("**Anti-netdeck:** popular card ≠ correct card");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|------:|");
  lines.push(`| Fixture decks / topologies | ${intel.corpus.decks} / ${intel.corpus.topologies} |`);
  lines.push(`| Seat families | ${intel.seatFamilies.length} |`);
  lines.push(`| Commanders with families | ${intel.corpus.uniqueCommandersInFamilies} |`);
  lines.push(`| Near-equivalent claims (mined XOR) | ${intel.nearEquivalents.length} |`);
  lines.push(`| When-not-to-substitute claims | ${intel.whenNotToSubstitute.length} |`);
  lines.push(`| Contradictions (seat has both) | ${intel.contradictions.length} |`);
  lines.push(`| Brain construction changes | 0 |`);
  lines.push("");

  if (live) {
    lines.push("## Live Field Intelligence projection (read-only)");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|------:|");
    lines.push(`| Generated at | ${live.generatedAt || "—"} |`);
    lines.push(`| Near-equivalent pairs | ${live.nearEquivalentPairs} |`);
    lines.push(`| brainPolicyTouched | ${live.brainPolicyTouched} |`);
    lines.push(`| selectionBehaviorChanged | ${live.selectionBehaviorChanged} |`);
    lines.push(`| constructionMutated | ${live.constructionMutated} |`);
    lines.push("");
    lines.push("### Live near-equivalent sample");
    lines.push("");
    for (const row of live.sample.slice(0, 10)) {
      lines.push(`- **${row.commanderIdentity}:** ${row.cardA} ↔ ${row.cardB} (xor ${row.xorRate}, conf ${row.confidence})`);
    }
    lines.push("");
  }

  lines.push("## What MetaForge now knows");
  lines.push("");
  lines.push("Substitution is no longer a popularity swap. MetaForge observes:");
  lines.push("1. **Seat families** — cards that occupy the same strategic seat (roles / stages / cmc band / topology).");
  lines.push("2. **Near-equivalents** — similar footprint + rare co-occurrence (XOR) → candidate replacements.");
  lines.push("3. **When not to substitute** — same seat + high coexistence → complements, not replacements.");
  lines.push("");

  lines.push("### Seat families (top)");
  lines.push("");
  for (const family of intel.seatFamilies.slice(0, 10)) {
    const members = family.members.slice(0, 6).map((m) => m.name).join(", ");
    lines.push(`#### ${family.commanderIdentity}`);
    lines.push(`- Seat: roles=${(family.seat.roles || []).join("+") || "—"} · stages=${(family.seat.stages || []).join("+") || "—"} · cmc=${family.seat.cmcBand}`);
    lines.push(`- Members (${family.memberCount}): ${members}`);
    lines.push(`- Confidence: ${family.confidence.level}`);
    lines.push(`- Near-equivalents in seat: ${family.nearEquivalents.length} · Complements: ${family.complements.length}`);
    lines.push("");
  }

  lines.push("### When not to substitute");
  lines.push("");
  for (const claim of intel.whenNotToSubstitute.slice(0, 12)) {
    lines.push(`- **${claim.commanderIdentity}:** ${claim.cardA} + ${claim.cardB} — ${claim.note} (coexist ${claim.coexistRate})`);
  }
  if (!intel.whenNotToSubstitute.length) {
    lines.push("- None above coexistence threshold in fixtures.");
  }
  lines.push("");

  lines.push("### Contradictions / context flags");
  lines.push("");
  for (const entry of intel.contradictions.slice(0, 10)) {
    lines.push(`- **${entry.commanderIdentity}** — ${entry.text}`);
  }
  if (!intel.contradictions.length) {
    lines.push("- No seat simultaneously held strong XOR and complement signals.");
  }
  lines.push("");

  lines.push("## Explicit non-goals (still)");
  lines.push("");
  lines.push("- Do not change card selection / Brain construction.");
  lines.push("- Do not treat co-occurrence popularity as quality.");
  lines.push("- Do not auto-swap cards in production without harness-gated promotion.");
  lines.push("");
  lines.push("## Next");
  lines.push("");
  lines.push("- Epic 4: Expert Strategy Corpus (Stream 002) — expert reasoning as evidence, not vibes.");
  lines.push("- Keep Brain frozen until field evidence earns a change.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const intel = buildStrategicSubstitutionIntelligenceFromFixtures();

  let live = null;
  const livePath = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
  if (existsSync(livePath)) {
    try {
      live = summarizeLiveSubstitutionArtifact(JSON.parse(readFileSync(livePath, "utf8")));
    } catch {
      live = null;
    }
  }

  const report = formatReport({ intel, live });
  const json = {
    writesToBrain: false,
    epic: 3,
    brainChanges: 0,
    selectionBehaviorChanged: false,
    antiNetdeck: intel.antiNetdeck,
    corpus: intel.corpus,
    seatFamilies: intel.seatFamilies.slice(0, 20).map((family) => ({
      commanderIdentity: family.commanderIdentity,
      seatKey: family.seatKey,
      memberCount: family.memberCount,
      confidence: family.confidence,
      members: family.members.slice(0, 8),
      nearEquivalents: family.nearEquivalents.slice(0, 4),
      complements: family.complements.slice(0, 4),
    })),
    nearEquivalents: intel.nearEquivalents.slice(0, 20),
    whenNotToSubstitute: intel.whenNotToSubstitute.slice(0, 30),
    contradictions: intel.contradictions,
    minedEvidence: intel.minedEvidence,
    liveProjection: live,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(outDir, "epic3-knowledge-report.md"), report);
  writeFileSync(join(outDir, "epic3-knowledge-report.json"), JSON.stringify(json, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic3-knowledge-report.md")}`);
}

main();
