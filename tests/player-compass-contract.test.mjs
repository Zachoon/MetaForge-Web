import assert from "node:assert/strict";
import test from "node:test";
import {
  matchPlayerCompassCandidates,
  normalizePlayerCompass,
  playerCompassFitForTemper,
} from "../app/player-compass.mjs";
import {
  buildPreChoiceCoaching,
  explainPlayConsequences,
  explainRecommendedBadge,
} from "../app/strategy-build-comparison.mjs";

const compass = {
  pace: "long-game",
  risk: "recoverable",
  interaction: "reactive",
  complexity: "meaningful",
};

test("Player Compass is optional, bounded, and honest about completion", () => {
  assert.equal(normalizePlayerCompass(null).answered, 0);
  assert.equal(normalizePlayerCompass({ pace: "invalid" }).answered, 0);
  assert.deepEqual(normalizePlayerCompass({ pace: "long-game" }), {
    version: "player-compass-v1", skipped: false, completed: false,
    answers: { pace: "long-game", risk: null, interaction: null, complexity: null },
    answered: 1, updatedAt: null,
  });
  assert.equal(normalizePlayerCompass(compass).completed, true);
});

test("the same explicit preferences fit different philosophies differently", () => {
  const resilient = playerCompassFitForTemper(compass, "resilient");
  const precision = playerCompassFitForTemper(compass, "precision");
  assert.ok(resilient.score > precision.score);
  assert.match(resilient.explanation, /recovering after setbacks|longer games/);
});

test("SKIP-2: partial answers are stored but never eligible for matching", () => {
  const partial = normalizePlayerCompass({ pace: "early", risk: "explosive" });
  assert.equal(partial.answered, 2);
  assert.equal(partial.completed, false);
  assert.equal(playerCompassFitForTemper(partial, "precision"), null);
  assert.equal(matchPlayerCompassCandidates(partial, [
    { id: "fast", temper: "precision" },
    { id: "safe", temper: "resilient" },
  ]), null);
});

test("DIFF-1/2: completed opposite profiles choose different winners deterministically", () => {
  const candidates = [
    { id: "fast", temper: "precision" },
    { id: "safe", temper: "resilient" },
  ];
  const fast = { pace: "early", risk: "explosive", interaction: "own-plan", complexity: "straightforward" };
  const safe = { pace: "long-game", risk: "recoverable", interaction: "reactive", complexity: "meaningful" };
  assert.equal(matchPlayerCompassCandidates(fast, candidates).winnerId, "fast");
  assert.equal(matchPlayerCompassCandidates(safe, candidates).winnerId, "safe");
  assert.equal(matchPlayerCompassCandidates(fast, candidates).winnerId, matchPlayerCompassCandidates(fast, candidates).winnerId);
});

test("DIFF-3/EDGE-2: neutral and exact-tie cases are deterministic and honest", () => {
  const neutral = { pace: "midgame", risk: "balanced", interaction: "mixed", complexity: "meaningful" };
  const exact = matchPlayerCompassCandidates(neutral, [
    { id: "zeta", vector: { pace: 0, risk: 0, interaction: 0, complexity: 0 } },
    { id: "alpha", vector: { pace: 0, risk: 0, interaction: 0, complexity: 0 } },
  ]);
  assert.equal(exact.trueTie, true);
  assert.equal(exact.tieBreak, "stable-display-order");
  assert.equal(exact.winnerId, "alpha");
  assert.ok(Number.isFinite(exact.ranked[0].fitScore));
});

test("recommendation language names observable play consequences, never play structure", () => {
  const recommended = { recommended: true, scores: { cohesion: 84, resilience: 92, curveHealth: 88 }, commissionFit: { matchPercent: 50 } };
  const other = { recommended: false, scores: { cohesion: 88, resilience: 65, curveHealth: 70 }, commissionFit: { matchPercent: 50 } };
  assert.match(explainPlayConsequences(recommended, [other]), /recover after removal|early plays/);
  const copy = explainRecommendedBadge([recommended, other]);
  assert.match(copy, /fit your request equally well/i);
  assert.doesNotMatch(copy, /play structure|commission fit/i);
});

test("pre-choice contract exposes presentation-ready Compass and tradeoff fields", () => {
  const candidate = (id, label, evaluation) => ({ id, label, evaluation, rows: [] });
  const report = buildPreChoiceCoaching({
    candidates: [
      candidate("safe", "Resilient Temper", { cohesion: 80, resilience: 92, curveHealth: 88 }),
      candidate("fast", "Precision Temper", { cohesion: 84, resilience: 65, curveHealth: 75 }),
    ],
    recommendedId: "safe",
    playerCompass: compass,
  });
  assert.equal(report.version, "pre-choice-coaching-v1.5");
  const safe = report.builds.find((build) => build.id === "safe");
  assert.match(safe.playerFit, /Strong fit|Possible fit/);
  assert.ok(safe.playerFitEvidence);
  assert.equal(safe.recommendedBecause, report.recommendedWhy);
  assert.equal(safe.whatThisFeelsLike, safe.feel);
  // "Why not the alternative" must say something the standalone Tradeoff line
  // doesn't already say — a real comparison against the actual alternative,
  // not a restated copy of this build's own cost.
  assert.notEqual(safe.whyNotTheAlternative, safe.expectedTradeoff);
  assert.match(safe.whyNotTheAlternative, /Precision Temper/);
  assert.doesNotMatch(report.recommendedWhy, /play structure/i);
});

test("only a completed Compass can replace the structural fallback", () => {
  const candidate = (id, label, evaluation) => ({ id, label, evaluation, rows: [] });
  const candidates = [
    candidate("structural-pick", "Resilient Temper", { cohesion: 80, resilience: 92, curveHealth: 88 }),
    candidate("compass-pick", "Precision Temper", { cohesion: 84, resilience: 65, curveHealth: 75 }),
  ];
  const partial = buildPreChoiceCoaching({
    candidates,
    recommendedId: "structural-pick",
    playerCompass: { pace: "early", risk: "explosive" },
  });
  assert.equal(partial.recommendedId, "structural-pick");
  assert.equal(partial.decidedBy, "structural_evidence");

  const completed = buildPreChoiceCoaching({
    candidates,
    recommendedId: "structural-pick",
    playerCompass: {
      pace: "early",
      risk: "explosive",
      interaction: "own-plan",
      complexity: "technical",
    },
  });
  assert.equal(completed.recommendedId, "compass-pick");
  assert.equal(completed.decidedBy, "player_compass");
  assert.match(completed.recommendedWhy, /way you told us you enjoy/i);
});

test("LANG-2/4 and EDGE-1: provenance stays honest with no usable Compass", () => {
  const candidate = (id, label) => ({ id, label, evaluation: { cohesion: 80, resilience: 80, curveHealth: 80 }, rows: [] });
  const only = buildPreChoiceCoaching({ candidates: [candidate("only", "Resilient Temper")], recommendedId: "only" });
  assert.equal(only.decidedBy, "only_legal_option");
  assert.match(only.recommendedWhy, /only direction/i);
  assert.equal(only.compassMatch, null);

  const skipped = buildPreChoiceCoaching({
    candidates: [candidate("safe", "Resilient Temper"), candidate("fast", "Precision Temper")],
    recommendedId: "safe",
    playerCompass: { skipped: true },
  });
  assert.equal(skipped.decidedBy, "structural_evidence");
  assert.match(skipped.recommendedWhy, /how this particular list came together/i);
  assert.match(skipped.recommendedWhy, / and /i);
  assert.ok(skipped.builds.every((build) => build.expectedTradeoff));
});

test("EDGE-3: an added philosophy is scored from the existing completed vector", () => {
  const initial = matchPlayerCompassCandidates(compass, [
    { id: "fast", temper: "precision" },
    { id: "safe", temper: "resilient" },
  ]);
  const expanded = matchPlayerCompassCandidates(compass, [
    { id: "fast", temper: "precision" },
    { id: "safe", temper: "resilient" },
    { id: "technical", temper: "synergy" },
  ]);
  assert.equal(initial.winnerId, "safe");
  assert.equal(expanded.ranked.length, 3);
  assert.ok(expanded.ranked.some((entry) => entry.id === "technical"));
});
