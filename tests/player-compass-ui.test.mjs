import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  PLAYER_COMPASS_QUESTIONS,
  emptyPlayerCompass,
  normalizePlayerCompass,
  withPlayerCompassOnBench,
} from "../app/player-compass.mjs";
import {
  isPlayerFacingRecommendCopy,
  presentPhilosophyBuild,
  presentPhilosophyComparison,
  provenanceLabelFor,
} from "../app/philosophy-presentation.mjs";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const compare = await readFile(new URL("../app/components/forge/philosophy-compare.tsx", import.meta.url), "utf8");
const compassUi = await readFile(new URL("../app/components/forge/player-compass-card.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/components/forge/player-compass.css", import.meta.url), "utf8");
const presentation = await readFile(new URL("../app/philosophy-presentation.mjs", import.meta.url), "utf8");
const worker = await readFile(new URL("../worker/forge-generate.ts", import.meta.url), "utf8");
// pendingCandidateChoice's own consumption moved to forge-session-context.tsx
// during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("Player Compass is optional, one-question, and never blocks the Forge", () => {
  assert.equal(PLAYER_COMPASS_QUESTIONS.length, 4);
  assert.match(compassUi, /Skip the rest|Skip for now/);
  assert.match(compassUi, /Help MetaForge learn how you like to play/);
  assert.match(compassUi, /QUESTION \{step \+ 1\} OF 4|QUESTION \$\{step \+ 1\} OF 4/);
  assert.match(compassUi, /DRAFT UNTIL COMPLETE|NOT ACTIVE YET/);
  assert.match(compassUi, /savedDraft/, "partial answers must be resumable after leaving the flow");
  assert.match(compassUi, /never block the Forge/i);
  assert.match(page, /PlayerCompassCard/);
  assert.match(page, /persistPlayerCompass/);
  assert.doesNotMatch(page, /playerCompass.*required/i);
});

test("Player Compass persists beside Deck Bench rather than a second profile system", () => {
  const skipped = normalizePlayerCompass(emptyPlayerCompass({ skipped: true }));
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.completed, false);
  const bench = withPlayerCompassOnBench({ schemaVersion: 1, families: [{ id: "a" }] }, {
    skipped: false,
    completed: true,
    answers: {
      pace: "long-game",
      risk: "recoverable",
      interaction: "mixed",
      complexity: "meaningful",
    },
  });
  assert.equal(bench.schemaVersion, 1);
  assert.equal(bench.families.length, 1);
  assert.equal(bench.playerCompass.completed, true);
  assert.equal(bench.playerCompass.answers.pace, "long-game");
});

test("philosophy presentation maps decidedBy and never invents play-structure jargon", () => {
  assert.equal(isPlayerFacingRecommendCopy("Recommended for stronger play structure among these philosophies."), false);
  assert.equal(
    provenanceLabelFor("player_compass"),
    "Best match for how you said you enjoy playing.",
  );
  assert.equal(
    provenanceLabelFor("commission"),
    "Recommended from what you asked MetaForge to build.",
  );
  const presented = presentPhilosophyBuild({
    id: "resilient",
    label: "Resilient Temper",
    recommended: true,
    decidedBy: "commission",
    recommendedWhy: "Recommended for stronger play structure among these philosophies.",
    recommendedBecause: "Recommended from what you asked MetaForge to build. It offers reliable early plays and ways to recover after removal.",
    feel: "Patient, steady",
    prioritizes: ["Consistency", "Interaction", "Recovering from setbacks"],
    expectedTradeoff: "Usually wins later than explosive versions.",
    scores: { cohesion: 99, resilience: 99, curveHealth: 99 },
  });
  assert.match(presented.recommendedBecause, /asked MetaForge to build/i);
  assert.doesNotMatch(presented.recommendedBecause, /play structure/i);
  assert.equal(presented.decidedBy, "commission");
  assert.equal(presented.provenanceLabel, "Recommended from what you asked MetaForge to build.");
  assert.equal("scores" in presented, false);
  assert.doesNotMatch(presentation, /\bcompassMatch\b/);
  assert.doesNotMatch(presentation, /playerCompassFitForTemper|matchPlayerCompassCandidates/);
});

test("philosophy UI surfaces provenance, conflicts, and side-by-side compare", () => {
  assert.match(page, /PhilosophyCompare/);
  assert.match(page, /decidedBy=\{strategyBuildComparison\.decidedBy/);
  assert.match(compare, /BEST FIT FOR YOU/);
  assert.match(compare, /CLOSER TO YOUR USUAL PLAY PREFERENCES/);
  assert.match(compare, /recommendedBecause/);
  assert.match(compare, /alternativeBecause/);
  assert.match(compare, /whatThisFeelsLike/);
  assert.match(compare, /expectedTradeoff/);
  assert.match(compare, /philosophy-side-by-side/);
  assert.match(compare, /Compare both|Compare all three/);
  assert.doesNotMatch(compare, /stronger play structure/i);
  assert.doesNotMatch(compare, /fitScore|distance|tieThreshold|scores\.cohesion|compassMatch/);
  assert.match(css, /\.philosophy-card\.is-best-fit/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /min-height: 48px/);
  const comparison = presentPhilosophyComparison([
    {
      id: "a",
      label: "Resilient Temper",
      recommended: true,
      decidedBy: "commission",
      recommendedBecause: "Recommended from what you asked MetaForge to build.",
      feel: "Steady",
      expectedTradeoff: "Slower",
      prioritizes: ["Consistency"],
    },
    {
      id: "b",
      label: "Explosive Momentum",
      recommended: false,
      alternativeBecause: "This direction may be closer to your usual play preferences, but it did not match your explicit request as closely.",
      feel: "Fast",
      expectedTradeoff: "Fragile",
      prioritizes: ["Pressure"],
    },
  ], { decidedBy: "commission" });
  assert.equal(comparison.recommended?.label, "Resilient Temper");
  assert.equal(comparison.alternatives.length, 1);
  assert.equal(comparison.conflictAlternatives.length, 1);
  assert.match(comparison.conflictAlternatives[0].alternativeBecause, /closer to your usual play preferences/i);
});

test("CLIENT-1/2: Worker selects and explains; client only presents the response", () => {
  assert.match(worker, /buildServerPreChoice/);
  assert.match(worker, /preChoiceCoaching:\s*buildServerPreChoice/);
  assert.match(forgeSessionContext, /pendingCandidateChoice\?\.preChoiceCoaching/);
  assert.doesNotMatch(page, /buildPreChoiceCoaching|matchPlayerCompassCandidates/);
  assert.doesNotMatch(compare, /fitScore|distance|tieThreshold|scores\.cohesion/);
  assert.doesNotMatch(page, /import \{[^}]*buildPreChoiceCoaching/);
});
