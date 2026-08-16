#!/usr/bin/env node
// Epic 6 — composition-based ("the 99") package presence, for the four
// packages that detectCommander (commander oracle-text only) cannot see on
// ANY real deck: aristocrats, auras, equipment, blink (0/118 real
// commanders matched, verified empirically this session). detectBlueprint
// is also structurally disabled during real-corpus analysis (corpus-analyze.mjs
// always passes empty requestedMechanics/desiredRoles/packageSignals), so
// today Field Intelligence has exactly zero ways to see these four
// archetypes when they're built by the 99 rather than announced by the
// commander's own text.
//
// This does NOT touch app/strategic-intent.mjs's real detectCommander /
// detectBlueprint / buildStrategicIntent — those are live, construction-
// critical, and under active concurrent edit. This is a separate, read-only
// composition check built purely for this diagnostic: it mirrors (does not
// import or modify) the four packages' own coreSemantics and constructedCore
// floors from PACKAGE_CATALOG, and asks "does this real deck's 99 clear
// Brain's own bar for this package?" using strategicSemanticsFor, which IS
// already exported and safe to import.
//
// Read-only. writesToBrain: false. Opens no Laboratory experiment. Proposes
// no change to detectCommander/detectBlueprint — quantifies the blind spot
// so a change (if any) can be scoped with real numbers instead of guessing.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeLiveTournamentRecords } from "../../app/knowledge/live-tournament-ingest.mjs";
import { strategicSemanticsFor } from "../../app/strategic-intent.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

// Mirrors app/strategic-intent.mjs PACKAGE_CATALOG for these four packages
// only (coreSemantics + density.constructedCore). Not imported — that file
// is shared and under active concurrent edit; PACKAGE_CATALOG itself isn't
// exported. Verified against source on 2026-08-16; if strategic-intent.mjs's
// numbers for these four packages move, this mirror goes stale and should
// be re-checked, not trusted blindly.
const COMMANDER_BLIND_PACKAGES = {
  aristocrats: {
    label: "Aristocrats package",
    detectCommander: (oracle) => /whenever [^.]* dies/i.test(oracle) && /sacrifice/i.test(oracle),
    // requireBalancedLegs needs all three; composition presence uses the two
    // structural legs (sac outlet + death payoff) at Brain's own
    // balancedLegFloor.constructed (2) — token_generator is too generic
    // across other archetypes to use alone as a presence signal.
    hasCore: (counts) => counts.sacrifice_outlet >= 2 && counts.death_payoff >= 2,
    countedSemantics: ["sacrifice_outlet", "death_payoff"],
  },
  auras: {
    label: "Aura package",
    detectCommander: (oracle) => /\bauras?\b/i.test(oracle) && (/\baffinity for auras\b/i.test(oracle) || /whenever [^.]*\baura\b/i.test(oracle) || /auras? you control/i.test(oracle) || /enchanted creature/i.test(oracle)),
    hasCore: (counts) => counts.aura >= 8, // density.constructedCore
    countedSemantics: ["aura"],
  },
  equipment: {
    label: "Equipment package",
    detectCommander: (oracle) => /\bequipment\b/i.test(oracle) || /\bequipped creature\b/i.test(oracle),
    hasCore: (counts) => counts.equipment >= 6, // density.constructedCore
    countedSemantics: ["equipment"],
  },
  blink: {
    label: "Blink package",
    detectCommander: (oracle) => /exile (?:target|another)[^.]*return (?:it|that|them) to the battlefield/i.test(oracle),
    hasCore: (counts) => counts.blink_effect >= 2, // density.constructedCore
    countedSemantics: ["blink_effect"],
  },
};

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "");
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function pct(part, whole) {
  if (!whole) return "0%";
  return `${round1((part / whole) * 100)}%`;
}

/** Counts, across a deck's 99, how many rows carry each tracked semantic (by copies, not distinct cards). */
function semanticCounts(rows, tracked) {
  const counts = Object.fromEntries(tracked.map((s) => [s, 0]));
  for (const row of rows || []) {
    const semantics = strategicSemanticsFor(row);
    const qty = Number(row.quantity) || 1;
    for (const s of tracked) {
      if (semantics.has(s)) counts[s] += qty;
    }
  }
  return counts;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const live = await materializeLiveTournamentRecords({});
  if (!live.ok || !live.records.length) {
    console.error(`Live corpus unavailable: ${live.reason || "no records"}`);
    process.exitCode = 1;
    return;
  }
  const records = live.records;

  const results = Object.entries(COMMANDER_BLIND_PACKAGES).map(([id, pkg]) => {
    const matches = [];
    for (const record of records) {
      const commanders = record.commanders || [];
      const commanderMatch = commanders.some((c) => pkg.detectCommander(oracleOf(c)));
      const counts = semanticCounts(record.rows, pkg.countedSemantics);
      const compositionMatch = pkg.hasCore(counts);
      if (compositionMatch) {
        matches.push({
          commander: commanders.map((c) => c.name).join(" // ") || "(unknown)",
          counts,
          commanderMatch,
        });
      }
    }
    const distinctCommanders = new Set(matches.map((m) => m.commander)).size;
    const invisibleToCommanderText = matches.filter((m) => !m.commanderMatch).length;
    return {
      id,
      label: pkg.label,
      totalRecords: records.length,
      compositionMatches: matches.length,
      distinctCommanders,
      invisibleToCommanderText,
      examples: matches.slice(0, 5).map((m) => `${m.commander} (${pkg.countedSemantics.map((s) => `${s}=${m.counts[s]}`).join(", ")})`),
    };
  });

  const lines = [];
  lines.push("# MetaForge Epic 6 — Composition Blind Spot (\"the 99\", not just the commander)");
  lines.push("");
  lines.push("**Follow-up to:** empirical finding that 0/118 real commanders match `detectCommander` for");
  lines.push("aristocrats, auras, equipment, or blink.");
  lines.push("**Brain changes:** 0");
  lines.push("**writesToBrain:** false");
  lines.push("**Opens a Laboratory experiment:** no — quantifies the blind spot, proposes no fix");
  lines.push("**Touches strategic-intent.mjs:** no — mirrors its known constants, does not import/edit it");
  lines.push("");
  lines.push("## Why this report exists");
  lines.push("");
  lines.push("Field Intelligence has exactly one way to see a package on a real deck today:");
  lines.push("`detectCommander`, a regex against the commander's own oracle text. `detectBlueprint` — the");
  lines.push("path meant to catch archetypes built by the 99 rather than announced by the commander — is");
  lines.push("structurally disabled during real-corpus analysis (`corpus-analyze.mjs` always passes empty");
  lines.push("`requestedMechanics`/`desiredRoles`/`packageSignals`). For 4 of 10 real packages that means");
  lines.push("Field Intelligence is currently blind to them on every real deck, full stop — not a density");
  lines.push("question, a *visibility* question.");
  lines.push("");
  lines.push("This asks: if we instead looked at the 99 directly — does this deck actually run enough");
  lines.push("aristocrats/aura/equipment/blink cards to clear Brain's own `constructedCore` bar for that");
  lines.push("package — how many real decks would light up that `detectCommander` currently misses entirely?");
  lines.push("");
  lines.push("## Real decks that clear the composition bar, by package");
  lines.push("");
  lines.push("| Package | Decks over composition bar | Distinct commanders | Share of corpus | Invisible to detectCommander |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const r of results) {
    lines.push(`| ${r.label} | ${r.compositionMatches} | ${r.distinctCommanders} | ${pct(r.compositionMatches, r.totalRecords)} | ${r.invisibleToCommanderText} of ${r.compositionMatches} |`);
  }
  lines.push("");
  lines.push(`_Corpus: ${records.length} real tournament decks._`);
  lines.push("");
  lines.push("## Examples (first 5 per package, composition counts shown)");
  lines.push("");
  for (const r of results) {
    lines.push(`**${r.label}:**`);
    if (r.examples.length) {
      for (const ex of r.examples) lines.push(`- ${ex}`);
    } else {
      lines.push("- (no real deck in this corpus clears the composition bar either)");
    }
    lines.push("");
  }
  lines.push("## Reading this honestly");
  lines.push("");
  const anyVisible = results.some((r) => r.compositionMatches > 0);
  if (anyVisible) {
    const total = results.reduce((sum, r) => sum + r.compositionMatches, 0);
    lines.push(`**${total} real-deck package instances across these 4 packages are currently invisible to`);
    lines.push("Field Intelligence and would become visible under a composition-based check.** Every single");
    lines.push("one is \"invisible to detectCommander\" by construction — that column exists to catch a false");
    lines.push("premise (a commander-text match that composition would double-count), and this corpus has");
    lines.push("none, consistent with the 0/118 finding.");
    lines.push("");
    lines.push("This is a scope estimate for a real fix, not the fix itself. The actual mechanism change —");
    lines.push("wiring composition-based detection into `detectBlueprint` (or a new detection path) inside");
    lines.push("`strategic-intent.mjs` — touches construction-critical, actively-edited code and belongs on");
    lines.push("the same ladder as any other detection change: proposal, review, then implementation, not a");
    lines.push("silent edit from a diagnostic report.");
  } else {
    lines.push("**No real deck in this corpus clears the composition bar for any of these 4 packages either.**");
    lines.push("That would mean the blind spot is real but currently empty in this specific corpus — worth");
    lines.push("rechecking as the live tournament corpus grows, not evidence the detection gap doesn't matter.");
  }
  lines.push("");

  const report = lines.join("\n");
  writeFileSync(join(outDir, "epic6-composition-blind-spot-report.md"), report);
  writeFileSync(join(outDir, "epic6-composition-blind-spot-report.json"), JSON.stringify({
    writesToBrain: false,
    brainChanges: 0,
    opensLaboratoryExperiment: false,
    touchesStrategicIntent: false,
    results,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(report);
  console.log(`\nWrote ${join(outDir, "epic6-composition-blind-spot-report.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
