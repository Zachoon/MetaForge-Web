import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHonestCoachSummary,
  explainRecommendationWhy,
  enrichTabletWithHonestWhy,
  HONEST_COACH_FEEDBACK_OPTIONS,
} from "../app/honest-coach-summary.mjs";

const FORBIDDEN = [
  "Strategic Coverage",
  "Capability",
  "Seat Vacancy",
  "Decision Pattern",
  "Strategic Cognition",
  "higher score",
  "coverageScore",
];

function assertNoResearchLeak(text = "") {
  for (const bad of FORBIDDEN) {
    assert.equal(
      String(text).toLowerCase().includes(bad.toLowerCase()),
      false,
      `leaked research/product-forbidden phrase: ${bad}`,
    );
  }
}

describe("Honest Coach v0 — Brain v1 surface mapping", () => {
  it("maps strategic intent + weak slots into player language without research vocabulary", () => {
    const selected = {
      evaluation: { cohesion: 72, roleCoverage: 0.8, resilience: 60 },
      strategicIntent: {
        strategy: "Focused",
        packages: [
          { id: "aura", label: "Aura package" },
          { id: "tokens", label: "Tokens package" },
        ],
        commanders: [{ name: "Light-Paws" }],
      },
      strategicCohesionGate: { ok: true, reasons: [] },
      slotJustificationLedger: {
        critique: {
          weaklyJustified: ["Filler Charm"],
          redundant: ["Extra Aura"],
          overSupported: [],
          underSupportedAnchors: [],
          rawPowerDominant: [],
          packageCritical: [],
        },
        byName: {
          "filler charm": {
            name: "Filler Charm",
            flags: { weaklyJustified: true },
            footprint: { packageCore: [], commanderSignals: [] },
            confidence: { commanderLinked: false },
          },
        },
      },
    };

    const summary = buildHonestCoachSummary({
      selected,
      isImported: true,
      structuralSystems: {
        strongestSystem: { name: "Aura density" },
        weakestSystem: { name: "Card advantage" },
      },
    });

    assert.equal(summary.brainAuthority, "brain_v1");
    assert.equal(summary.researchVocabularyUsed, false);
    assert.ok(summary.version.startsWith("honest-coach-v0"));
    assert.match(summary.whatIThink, /Light-Paws/i);
    assert.match(summary.whatIThink, /aura/i);
    assert.match(summary.planStory.title, /Aura/i);
    assert.match(summary.intentions.establish, /Develop mana|cheap auras|Land Light-Paws/i);
    assert.match(summary.intentions.dependsOn, /dangerous|online/i);
    assert.match(summary.intentions.firstVulnerability, /Removal|sweeper|Filler Charm|Tokens package/i);
    assert.match(summary.whatLooksStrong, /Aura|package|plan/i);
    assert.ok(summary.fixFirst);
    assert.equal(summary.confidence.level, "high");
    assertNoResearchLeak(JSON.stringify(summary));
  });

  it("answers the four coaching questions without vague placeholders", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        evaluation: { cohesion: 70, roleCoverage: 0.7 },
        strategicIntent: {
          strategy: "Focused",
          packages: [{ id: "equipment", label: "Equipment package" }],
          commanders: [{ name: "Tony Stark, Iron Man" }],
        },
        strategicCohesionGate: { ok: true, reasons: [] },
        slotJustificationLedger: { critique: { weaklyJustified: [], redundant: [], overSupported: [], underSupportedAnchors: [], rawPowerDominant: [], packageCritical: [] } },
      },
      structuralSystems: {
        strongestSystem: { name: "Artifact value loop" },
        weakestSystem: { name: "Commander protection" },
      },
      isImported: true,
    });

    const blob = [
      summary.planStory.title,
      summary.planStory.plan,
      summary.planStory.early,
      summary.planStory.mid,
      summary.planStory.stop,
      summary.intentions.accomplish,
      summary.intentions.establish,
      summary.intentions.dependsOn,
      summary.intentions.firstVulnerability,
    ].join("\n");

    assert.match(summary.planStory.title, /Equipment|Artifact/i);
    assert.match(blob, /Tony Stark/i);
    assert.match(blob, /Develop mana|cheap artifact|equipment/i);
    assert.match(blob, /dangerous/i);
    assert.match(blob, /Removal|sweeper|protection/i);

    for (const vague of [
      "Built for your commander",
      "Built For Your Commander",
      "Advance the main game plan",
      "Opening trials are still resolving",
      "Watch for things that stop the plan",
      "Still resolving",
      "Awaiting trials",
    ]) {
      assert.equal(blob.toLowerCase().includes(vague.toLowerCase()), false, `vague phrase leaked: ${vague}`);
    }
    assertNoResearchLeak(blob);
  });

  it("explains recommendations without saying higher score", () => {
    const why = explainRecommendationWhy({
      selected: {
        slotJustificationLedger: {
          byName: {
            "filler charm": {
              name: "Filler Charm",
              flags: { weaklyJustified: true, redundant: false },
              footprint: { packageCore: [] },
              confidence: {},
            },
          },
        },
      },
      cut: "Filler Charm",
      add: "Reliable Draw",
      tablet: {
        expectedBenefit: "The replacement covers more of the deck's important jobs (+2.0%) and changes the mana curve by +0.1.",
        tradeoff: "No obvious defensive job is lost.",
        confident: true,
      },
    });

    assert.match(why.summary, /Filler Charm/i);
    assert.match(why.summary, /Reliable Draw/i);
    assert.equal(why.summary.toLowerCase().includes("higher score"), false);
    assertNoResearchLeak(why.summary);
  });

  it("enriches tablets with honestWhy and keeps feedback options production-safe", () => {
    const enriched = enrichTabletWithHonestWhy(
      {
        type: "experiment",
        change: { cut: "A", add: "B" },
        expectedBenefit: "Covers more jobs.",
        tradeoff: "Minor defensive loss.",
        confident: true,
      },
      { slotJustificationLedger: { byName: {} } },
    );
    assert.ok(enriched.honestWhy?.summary);
    assert.ok(enriched.recommendationIds?.recommendationId);
    assert.ok(HONEST_COACH_FEEDBACK_OPTIONS.length >= 4);
    for (const opt of HONEST_COACH_FEEDBACK_OPTIONS) {
      assert.ok(opt.apiCategory);
      assertNoResearchLeak(opt.label);
    }
  });
});
