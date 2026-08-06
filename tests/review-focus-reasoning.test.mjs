import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_FOCUS_OPTIONS } from "../app/review-focus.mjs";
import { evaluateReviewFocus } from "../app/review-focus-reasoning.mjs";

// Fixtures below are shaped exactly like the real fields worker/
// forge-generate.ts's forgeImportedMasterwork attaches to nativeReport
// (app/native-masterwork-engine.mjs, app/commander-power-signal.mjs,
// app/forge-structural-pipeline.mjs) — synthetic values, real shapes, so
// every assertion below is checking evaluateReviewFocus reads and reports
// those exact numbers/names rather than inventing its own.

const row = (name, overrides = {}) => ({
  name, quantity: 1, roles: [], cmc: 2, colorPips: {}, colorIdentity: [], ...overrides,
});

function baseReport(overrides = {}) {
  return {
    selected: {
      rows: [
        row("Swift Rider", { roles: ["interaction"], cmc: 2 }),
        row("Answer Spell", { roles: ["interaction"], cmc: 1 }),
        row("Plains", { roles: ["land"], cmc: 0, quantity: 20 }),
      ],
      evaluation: {
        score: 70, roleCoverage: 0.6, multiRoleDensity: 0.2,
        averageCmc: 2.4, curveHealth: 82, cohesion: 55, resilience: 40,
      },
    },
    manaConsistency: { overall: 0.94, sourcesByColor: { W: 12 }, cards: [], risky: [] },
    powerSignal: null,
    structuralAnalysis: { systems: { strongestSystem: null } },
    unusedEnginePartners: [],
    ...overrides,
  };
}

test("returns null when no focus was selected", () => {
  assert.equal(evaluateReviewFocus("", baseReport()), null);
  assert.equal(evaluateReviewFocus(undefined, baseReport()), null);
});

test("returns null for a value outside the six canonical options — never trusts an unvalidated focus", () => {
  assert.equal(evaluateReviewFocus("Something made up", baseReport()), null);
});

for (const focus of REVIEW_FOCUS_OPTIONS) {
  test(`${focus}: result follows the three-beat rhythm — acknowledge, evidence, one thing to watch for`, () => {
    const result = evaluateReviewFocus(focus, baseReport());
    assert.equal(result.focus, focus);
    assert.ok(result.asked.length > 0);
    assert.ok(result.evidence.length > 0);
    assert.ok(result.nextStep.length > 0);
    assert.equal(result.concise, `${result.asked} ${result.evidence} ${result.nextStep}`);
    assert.equal(typeof result.insufficientEvidence, "boolean");
  });
}

// --- Voice: no internal engine vocabulary reaches player-facing text ---

const RICH_REPORT = baseReport({
  powerSignal: {
    tier: "High Power", note: "x", extraTurns: ["Time Warp Test"], repeatableValueEngine: ["Grind Engine Test"],
    comboProximity: { pairs: ["A + B"], count: 1 }, efficientInteraction: ["Swift Rider", "Answer Spell"], fastMana: ["Sol Ring Test"],
  },
  structuralAnalysis: {
    systems: { strongestSystem: { name: "Sacrifice Engine", members: ["Blood Artist", "Viscera Seer"] } },
  },
  unusedEnginePartners: [{ card: "Zulaport Cutthroat", partner: "Blood Artist", strength: 80, reason: "x", evidence: "x" }],
});

test("no result — plain baseReport or the fully-populated RICH_REPORT — ever prints raw engine metric names", () => {
  const forbidden = [/power signal/i, /resilience score/i, /curve health/i, /strongest system/i, /average cmc/i, /role coverage/i];
  for (const focus of REVIEW_FOCUS_OPTIONS) {
    for (const report of [baseReport(), RICH_REPORT, baseReport({ powerSignal: null })]) {
      const result = evaluateReviewFocus(focus, report);
      for (const pattern of forbidden) {
        assert.doesNotMatch(result.concise, pattern, `${focus} leaked ${pattern} into player-facing copy`);
      }
    }
  }
});

test("Understanding the deck: introduces \"engine\" only after explaining the concept in plain language first", () => {
  const result = evaluateReviewFocus("Understanding the deck", RICH_REPORT);
  assert.match(result.evidence, /work together to create this deck's clearest, most repeatable plan/);
  assert.match(result.evidence, /Commander players often call a group of cards like this an "engine\."/);
});

test("Faster starts: grounds the plain-language curve read in the real averageCmc, rounded for a player, not printed as a raw score", () => {
  const result = evaluateReviewFocus("Faster starts", baseReport());
  assert.match(result.evidence, /around 2 mana/);
  assert.match(result.evidence, /should let the deck begin making meaningful plays reasonably early/);
});

test("Faster starts: names the actual risky early card and its real turn/probability", () => {
  const report = baseReport({
    manaConsistency: {
      overall: 0.7, sourcesByColor: {}, cards: [],
      risky: [{ name: "Doubtful Dryad", turn: 2, colors: ["G"], probability: 0.61 }],
    },
  });
  const result = evaluateReviewFocus("Faster starts", report);
  assert.match(result.evidence, /Doubtful Dryad/);
  assert.match(result.evidence, /61%/);
  assert.match(result.nextStep, /Doubtful Dryad/);
});

test("More consistency: reports the real overall percentage and a clean mana base honestly when there is nothing risky", () => {
  const result = evaluateReviewFocus("More consistency", baseReport());
  assert.match(result.evidence, /94%/);
  assert.match(result.evidence, /Nothing in the deck is a real risk on colors/);
  assert.doesNotMatch(result.evidence, /found nothing/i);
});

test("More consistency: names the single worst card as the next step when risk exists", () => {
  const report = baseReport({
    manaConsistency: {
      overall: 0.55, sourcesByColor: {}, cards: [],
      risky: [
        { name: "Thirsty Colossus", turn: 4, colors: ["B", "B"], probability: 0.4 },
        { name: "Faint Hope", turn: 3, colors: ["U"], probability: 0.7 },
      ],
    },
  });
  const result = evaluateReviewFocus("More consistency", report);
  assert.match(result.nextStep, /Thirsty Colossus/);
});

test("Closing games: never ends on \"we found nothing\" when the format has no power signal — pivots to a plain-language coverage/curve read instead", () => {
  const result = evaluateReviewFocus("Closing games", baseReport({ powerSignal: null }));
  assert.equal(result.insufficientEvidence, true);
  assert.doesNotMatch(result.evidence, /^we found nothing/i);
  assert.doesNotMatch(result.concise, /^we found nothing/i);
  assert.match(result.evidence, /covers about 60%/); // roleCoverage from the fixture, in plain language
  assert.match(result.evidence, /should let the deck begin making meaningful plays reasonably early/); // curveHealth from the fixture
  assert.ok(result.nextStep.length > 20, "must offer a real next step, not a bare admission of the gap");
});

test("Closing games: a real power signal never claims a single card is proven to close games — only that it contributes", () => {
  const report = baseReport({
    powerSignal: {
      tier: "High Power", note: "Real repeatable engines present.",
      extraTurns: ["Time Warp Test"], repeatableValueEngine: ["Grind Engine Test"],
      comboProximity: { pairs: [], count: 0 }, efficientInteraction: [], fastMana: [],
    },
  });
  const result = evaluateReviewFocus("Closing games", report);
  assert.equal(result.insufficientEvidence, false);
  assert.match(result.evidence, /Time Warp Test/);
  assert.match(result.evidence, /Grind Engine Test/);
  assert.match(result.evidence, /contribute.* directly to how this deck can finish a game/);
  assert.doesNotMatch(result.evidence, /doing real work here — built to actually close a game out/);
});

test("Closing games: a verified combo pair is never claimed to win the game outright, only that it's a real, verified interaction", () => {
  const report = baseReport({
    powerSignal: {
      tier: "High Power", note: "x", extraTurns: [], repeatableValueEngine: [],
      comboProximity: { pairs: ["Card A + Card B"], count: 1 }, efficientInteraction: [], fastMana: [],
    },
  });
  const result = evaluateReviewFocus("Closing games", report);
  assert.match(result.evidence, /Card A \+ Card B/);
  assert.match(result.evidence, /doesn't guarantee it wins the game outright/);
  assert.doesNotMatch(result.evidence, /can end a game on its own/);
});

test("Closing games: an exhausted-but-not-exhaustive search is reported as \"not detected in the evidence tracked,\" never as an absolute claim nothing exists", () => {
  const report = baseReport({
    powerSignal: {
      tier: "Casual", note: "No high-ceiling categories detected.",
      extraTurns: [], repeatableValueEngine: [], comboProximity: { pairs: [], count: 0 },
      efficientInteraction: [], fastMana: [],
    },
  });
  const result = evaluateReviewFocus("Closing games", report);
  assert.equal(result.insufficientEvidence, true);
  assert.match(result.evidence, /The Forge did not detect a dedicated finisher or a known two-card combination in the evidence it currently tracks/);
  assert.match(result.evidence, /steady pressure/);
  assert.doesNotMatch(result.evidence, /^nothing in this deck is a dedicated finisher/i);
  assert.doesNotMatch(result.evidence, /found nothing/i);
});

test("Better interaction: does not fabricate a concern when the deck already has real interaction coverage", () => {
  const report = baseReport({
    powerSignal: {
      tier: "High Power", note: "x", extraTurns: [], repeatableValueEngine: [],
      comboProximity: { pairs: [], count: 0 }, fastMana: [],
      efficientInteraction: ["Answer One", "Answer Two", "Answer Three", "Answer Four", "Answer Five", "Answer Six"],
    },
  });
  const result = evaluateReviewFocus("Better interaction", report);
  assert.match(result.evidence, /You've got 6 cards that can answer an opponent's threat/);
  assert.doesNotMatch(result.nextStep, /gap this points to/i);
  assert.match(result.nextStep, /unlikely to be caught with nothing to do/);
});

test("Better interaction: honestly reports zero coverage as the real gap when the deck truly has none, without an absolute \"no way\" claim", () => {
  const report = baseReport({
    selected: {
      rows: [row("Plains", { roles: ["land"], quantity: 40, cmc: 0 })],
      evaluation: { score: 10, roleCoverage: 0.1, multiRoleDensity: 0, averageCmc: 3, curveHealth: 50, cohesion: 20, resilience: 0 },
    },
  });
  const result = evaluateReviewFocus("Better interaction", report);
  assert.match(result.evidence, /The Forge did not detect a card in the deck built to answer/);
  assert.match(result.nextStep, /gap this points to/i);
});

test("Understanding the deck: pivots to a plain-language coverage read instead of ending on \"nothing found\" when no system or unused partner exists", () => {
  const result = evaluateReviewFocus("Understanding the deck", baseReport());
  assert.equal(result.insufficientEvidence, true);
  assert.doesNotMatch(result.evidence, /found nothing/i);
  assert.match(result.evidence, /covers about 60%/);
});

test("Understanding the deck: names the actual strongest system's real members, translated before the term is introduced", () => {
  const report = baseReport({
    structuralAnalysis: {
      systems: { strongestSystem: { name: "Sacrifice Engine", members: ["Blood Artist", "Viscera Seer"], health: 80 } },
    },
  });
  const result = evaluateReviewFocus("Understanding the deck", report);
  assert.match(result.evidence, /Blood Artist/);
  assert.match(result.evidence, /Viscera Seer/);
  // The system's internal name ("Sacrifice Engine") is not printed verbatim
  // — only the real card names and the taught, generic term "engine" are.
  assert.doesNotMatch(result.evidence, /Sacrifice Engine/);
});

test("Understanding the deck: surfaces a real unused-engine-partner suggestion by name", () => {
  const report = baseReport({
    unusedEnginePartners: [{ card: "Zulaport Cutthroat", partner: "Blood Artist", strength: 80, reason: "x", evidence: "x" }],
  });
  const result = evaluateReviewFocus("Understanding the deck", report);
  assert.match(result.evidence, /Zulaport Cutthroat/);
  assert.match(result.nextStep, /Zulaport Cutthroat/);
});

test("Not sure yet: leads with the always-available consistency evidence rather than ending on a gap", () => {
  const result = evaluateReviewFocus("Not sure yet", baseReport());
  assert.equal(result.insufficientEvidence, false);
  assert.match(result.evidence, /94%/);
});

test("no evaluator ever produces the literal phrase forbidden by the coaching contract, across a plain, a rich, and a null-power-signal report", () => {
  for (const focus of REVIEW_FOCUS_OPTIONS) {
    for (const report of [baseReport(), RICH_REPORT, baseReport({ powerSignal: null })]) {
      const result = evaluateReviewFocus(focus, report);
      assert.doesNotMatch(result.concise, /^we found nothing\.?$/i);
    }
  }
});
