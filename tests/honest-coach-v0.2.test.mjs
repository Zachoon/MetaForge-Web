import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  buildHonestCoachSummary,
  enrichTabletWithHonestWhy,
  HONEST_COACH_FEEDBACK_OPTIONS,
  HONEST_COACH_NOT_HELPFUL_REASONS,
} from "../app/honest-coach-summary.mjs";
import {
  buildHonestCoachAnalysisId,
  buildHonestCoachRecommendationId,
} from "../app/honest-coach-ids.mjs";
import {
  validateCoachFeedbackPayload,
  buildAlphaCoachMetricsShape,
  GUEST_FEEDBACK_LIMIT_PER_HOUR,
} from "../app/honest-coach-feedback.mjs";

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

const selectedFixture = {
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

describe("Honest Coach v0.2 — unmissable + measurable", () => {
  it("builds stable analysis and recommendation IDs without PII", () => {
    const a = buildHonestCoachAnalysisId({
      generationId: "gen-1",
      commanderName: "Light-Paws",
      packageLabels: ["Aura package", "Tokens package"],
    });
    const b = buildHonestCoachAnalysisId({
      generationId: "gen-1",
      commanderName: "Light-Paws",
      packageLabels: ["Tokens package", "Aura package"],
    });
    assert.equal(a.analysisId, b.analysisId);
    assert.match(a.analysisId, /^hca-[a-f0-9]{8}$/);
    const rec = buildHonestCoachRecommendationId({
      analysisId: a.analysisId,
      cut: "Filler Charm",
      add: "Reliable Draw",
      reasonClass: "weak_slot",
    });
    assert.match(rec.recommendationId, /^hcr-[a-f0-9]{8}$/);
    assert.equal(JSON.stringify(a).toLowerCase().includes("email"), false);
  });

  it("attaches analysis IDs and confidence reasons grounded in Brain v1 state", () => {
    const summary = buildHonestCoachSummary({
      selected: selectedFixture,
      isImported: true,
      generationId: "gen-imported-1",
    });
    assert.ok(summary.version.startsWith("honest-coach-v0"));
    assert.ok(summary.analysisIds.analysisId);
    assert.equal(summary.confidence.level, "high");
    assert.match(summary.confidence.reason, /commander|package|plan/i);
    assert.ok(summary.observedFindings.length);
    assert.ok(summary.interpretiveGuidance.length);
    assertNoResearchLeak(JSON.stringify(summary));
  });

  it("persists recommendation IDs through tablet enrichment and feedback validation", () => {
    const summary = buildHonestCoachSummary({
      selected: selectedFixture,
      isImported: true,
      generationId: "gen-imported-1",
    });
    const enriched = enrichTabletWithHonestWhy(
      {
        type: "experiment",
        change: { cut: "Filler Charm", add: "Reliable Draw" },
        expectedBenefit: "Covers more jobs.",
        tradeoff: "Minor defensive loss.",
        confident: true,
      },
      selectedFixture,
      summary.analysisIds,
    );
    assert.ok(enriched.recommendationIds.recommendationId);
    assert.equal(enriched.recommendationIds.analysisId, summary.analysisIds.analysisId);
    assert.ok(enriched.honestWhy.observed);
    assert.ok(enriched.honestWhy.inferred);

    const validated = validateCoachFeedbackPayload({
      optionId: "not-helpful",
      notHelpfulReason: "wrong-plan",
      analysisId: summary.analysisIds.analysisId,
      recommendationId: enriched.recommendationIds.recommendationId,
      note: "Plan read felt off",
    });
    assert.equal(validated.ok, true);
    assert.equal(validated.context.analysisId, summary.analysisIds.analysisId);
    assert.equal(validated.context.recommendationId, enriched.recommendationIds.recommendationId);
    assert.equal(validated.context.notHelpfulReason, "wrong-plan");
  });

  it("accepts guest feedback payloads and rejects invalid / rate-limit shape constants", () => {
    const analysis = buildHonestCoachAnalysisId({ generationId: "g", commanderName: "X" });
    assert.equal(
      validateCoachFeedbackPayload({ optionId: "helpful", analysisId: analysis.analysisId, guest: true }).ok,
      true,
    );
    assert.equal(
      validateCoachFeedbackPayload({ optionId: "helpful", analysisId: "bad", guest: true }).ok,
      false,
    );
    assert.equal(
      validateCoachFeedbackPayload({ optionId: "not-helpful", analysisId: analysis.analysisId }).ok,
      false,
    );
    assert.ok(GUEST_FEEDBACK_LIMIT_PER_HOUR >= 5);
    assert.ok(HONEST_COACH_NOT_HELPFUL_REASONS.length >= 6);
    assert.ok(HONEST_COACH_FEEDBACK_OPTIONS.some((o) => o.id === "helpful"));
  });

  it("builds Alpha Coach metrics report shape", () => {
    const report = buildAlphaCoachMetricsShape({
      analysesCompleted: 10,
      coachBriefViews: 8,
      whyExplanationOpens: 4,
      feedbackHelpful: 5,
      feedbackNotHelpful: 2,
      feedbackWrongPlan: 1,
      feedbackGuest: 4,
      feedbackSignedIn: 3,
      confidenceHigh: 5,
      confidenceModerate: 3,
      confidenceLimited: 2,
    });
    assert.equal(report.version, "alpha-coach-metrics-v1");
    assert.equal(report.coachBriefViewRate, 0.8);
    assert.equal(report.whyExplanationOpenRate, 0.5);
    assert.equal(report.wrongPlanFeedbackCount, 1);
    assert.equal(report.guestVsSignedInFeedback.guest, 4);
  });

  it("keeps coach brief visible after import in progressive CSS and guest route wired", async () => {
    const root = new URL("../", import.meta.url);
    const css = await readFile(new URL("app/testing-anvil.css", root), "utf8");
    const page = await readFile(new URL("app/page.tsx", root), "utf8");
    const worker = await readFile(new URL("worker/index.ts", root), "utf8");
    assert.match(css, /chapter-1-active .*honest-coach-v0/);
    assert.match(page, /imported-deck-review/);
    assert.match(page, /\/api\/coach\/feedback/);
    assert.match(page, /coach_brief_viewed/);
    assert.match(page, /HONEST_COACH_NOT_HELPFUL_REASONS/);
    assert.match(worker, /\/api\/coach\/feedback/);
    assert.match(worker, /handleCoachFeedback/);
    const coachSource = await readFile(new URL("app/honest-coach-summary.mjs", root), "utf8");
    const feedbackSource = await readFile(new URL("app/honest-coach-feedback.mjs", root), "utf8");
    assert.doesNotMatch(coachSource, /native-masterwork-engine|prospective-slot-delta|construction-phase/);
    assert.doesNotMatch(feedbackSource, /native-masterwork-engine|prospective-slot-delta|construction-phase/);
  });

  it("confidence limited reason appears when packages compete without cohesion", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        evaluation: { cohesion: 20, roleCoverage: 0.4 },
        strategicIntent: {
          packages: [
            { id: "a", label: "A package" },
            { id: "b", label: "B package" },
          ],
          commanders: [{ name: "Tester" }],
        },
        strategicCohesionGate: { ok: true },
        slotJustificationLedger: { critique: { weaklyJustified: [] } },
      },
      isImported: true,
      generationId: "low-conf",
    });
    assert.equal(summary.confidence.level, "limited");
    assert.match(summary.confidence.reason, /competing plans|thin/i);
  });
});
