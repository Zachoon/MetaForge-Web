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

  it("surfaces the engine's weakest construction stage as a named weakness and observed finding", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        strategicSequence: {
          status: "sequence-needs-support",
          weakestStage: "close",
          overallCoverage: 0.8,
          stages: {
            setup: { count: 33, floor: 10, coverage: 1 },
            stabilize: { count: 12, floor: 7, coverage: 1 },
            convert: { count: 18, floor: 8, coverage: 1 },
            recover: { count: 21, floor: 7, coverage: 1 },
            close: { count: 0, floor: 6, coverage: 0 },
          },
        },
      },
      isImported: true,
    });
    assert.ok(
      summary.weaknesses.some((line) => /closing out a game you're ahead in/i.test(line) && /0 of the ~6/.test(line)),
      `expected a weakest-stage weakness, got: ${JSON.stringify(summary.weaknesses)}`,
    );
    assert.ok(
      summary.observedFindings.some((line) => /thinnest construction stage/i.test(line)),
      `expected a weakest-stage observed finding, got: ${JSON.stringify(summary.observedFindings)}`,
    );
    assertNoResearchLeak(JSON.stringify(summary));
  });

  it("stays silent about construction sequence when the deck has full stage coverage", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        strategicSequence: { status: "complete-sequence", weakestStage: "close", overallCoverage: 1, stages: {} },
      },
      isImported: true,
    });
    assert.ok(!summary.weaknesses.some((line) => /thinnest construction stage/i.test(line)));
    assert.ok(!summary.observedFindings.some((line) => /thinnest construction stage/i.test(line)));
  });

  it("names a commander package that had no supported piece in the legal pool", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        commanderCompatibility: { status: "no-supported-connection-in-pool" },
      },
      isImported: true,
    });
    assert.ok(
      summary.weaknesses.some((line) => /none of it was available in this legal pool/i.test(line)),
      `expected a commander-connection weakness, got: ${JSON.stringify(summary.weaknesses)}`,
    );
    assert.ok(summary.observedFindings.some((line) => /no supported piece was legal in this pool/i.test(line)));
    assertNoResearchLeak(JSON.stringify(summary));
  });

  it("stays silent about commander connection when a supported piece was legal and connected", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        commanderCompatibility: { status: "connected" },
      },
      isImported: true,
    });
    assert.ok(!summary.weaknesses.some((line) => /legal pool/i.test(line)));
  });

  it("names orphan payoffs with no supporting producer in the deck", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        strategicCoherence: { status: "connected-with-isolated-payoffs", orphanPayoffs: ["Lonely Reaper", "Stranded Idol"] },
      },
      isImported: true,
    });
    assert.ok(
      summary.weaknesses.some((line) => /Lonely Reaper/.test(line) && /Stranded Idol/.test(line) && /supporting producer/i.test(line)),
      `expected an orphan-payoff weakness, got: ${JSON.stringify(summary.weaknesses)}`,
    );
    assert.ok(summary.observedFindings.some((line) => /2 orphan payoffs/i.test(line)));
    assertNoResearchLeak(JSON.stringify(summary));
  });

  it("stays silent about orphan payoffs when there are none", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        strategicCoherence: { status: "connected", orphanPayoffs: [] },
      },
      isImported: true,
    });
    assert.ok(!summary.weaknesses.some((line) => /orphan|producer elsewhere/i.test(line)));
  });

  const emptyCritique = { weaklyJustified: [], redundant: [], overSupported: [], underSupportedAnchors: [], rawPowerDominant: [], packageCritical: [] };

  it("fixFirst and interpretive guidance fall back to a named orphan payoff when no card is flagged", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        slotJustificationLedger: { critique: emptyCritique },
        strategicCoherence: { status: "connected-with-isolated-payoffs", orphanPayoffs: ["Lonely Reaper"] },
      },
      isImported: true,
    });
    assert.equal(summary.fixFirst, "Lonely Reaper");
    assert.ok(
      summary.interpretiveGuidance.some((line) => /Lonely Reaper/.test(line) && /before adding more raw power/i.test(line)),
      `expected structural interpretive guidance, got: ${JSON.stringify(summary.interpretiveGuidance)}`,
    );
  });

  it("fixFirst falls back to the weakest construction stage when there are no flagged cards or orphan payoffs", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        slotJustificationLedger: { critique: emptyCritique },
        strategicSequence: {
          status: "sequence-needs-support",
          weakestStage: "close",
          overallCoverage: 0.8,
          stages: { close: { count: 0, floor: 6, coverage: 0 } },
        },
      },
      isImported: true,
    });
    assert.equal(summary.fixFirst, "Closing out a game you're ahead in");
  });

  it("fixFirst falls back to commander connection only when nothing more specific is flagged", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        slotJustificationLedger: { critique: emptyCritique },
        commanderCompatibility: { status: "no-supported-connection-in-pool" },
      },
      isImported: true,
    });
    assert.equal(summary.fixFirst, "commander connection");
  });

  it("prefers a flagged card over structural signals for fixFirst when both exist", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        ...selectedFixture,
        strategicCoherence: { status: "connected-with-isolated-payoffs", orphanPayoffs: ["Lonely Reaper"] },
      },
      isImported: true,
    });
    assert.equal(summary.fixFirst, "Filler Charm");
  });

  it("locks in weakness priority order when every signal fires at once (push order wins the 5-slot cap)", () => {
    const summary = buildHonestCoachSummary({
      selected: {
        evaluation: { cohesion: 72, roleCoverage: 0.8, resilience: 60 },
        strategicIntent: {
          strategy: "Focused",
          packages: [{ id: "aura", label: "Aura package" }],
          commanders: [{ name: "Light-Paws" }],
        },
        strategicCohesionGate: { ok: false, reasons: ["Gate failure reason."] },
        slotJustificationLedger: {
          critique: {
            weaklyJustified: ["Weak Card"],
            redundant: ["Redundant Card"],
            overSupported: ["OverSupported Card"],
            underSupportedAnchors: ["Anchor Card"],
            rawPowerDominant: ["Power Card"],
            packageCritical: [],
          },
        },
        strategicSequence: {
          status: "sequence-needs-support",
          weakestStage: "close",
          overallCoverage: 0.8,
          stages: { close: { count: 0, floor: 6, coverage: 0 } },
        },
        commanderCompatibility: { status: "no-supported-connection-in-pool" },
        strategicCoherence: { status: "connected-with-isolated-payoffs", orphanPayoffs: ["Orphan Card"] },
      },
      structuralSystems: { weakestSystem: { name: "Weakest System" } },
      isImported: true,
    });
    assert.deepEqual([...summary.weaknesses], [
      "1 card look weakly justified for the plan (including Weak Card).",
      "Redundant package pieces: Redundant Card.",
      "Package density may be over-supported: OverSupported Card.",
      "High-cost package anchors lack enough support: Anchor Card.",
      "Some expensive cards read more like raw power than plan support: Power Card.",
    ]);
  });

  it("feeds real commission priorities into concept selection instead of always reading them as empty", () => {
    const selected = {
      evaluation: { cohesion: 72, roleCoverage: 0.8, resilience: 60 },
      strategicIntent: { strategy: "Focused", packages: [], commanders: [{ name: "Light-Paws" }] },
      strategicCohesionGate: { ok: true, reasons: [] },
      slotJustificationLedger: { critique: emptyCritique },
    };
    const withoutPriority = buildHonestCoachSummary({
      selected,
      isImported: true,
      commissionNote: "",
      activeCommanderName: "Light-Paws",
    });
    const withPriority = buildHonestCoachSummary({
      selected,
      isImported: true,
      commissionNote: "theme over optimization please",
      activeCommanderName: "Light-Paws",
    });
    // No priority clause: falls back to the concept library's default gravity.
    assert.equal(withoutPriority.principleVoice?.conceptId, "commitment-timing");
    // A real "Theme over optimization" priority clause should pull concept
    // selection toward Plan Integrity (the theme-matching concept) instead
    // of leaving it stuck on the same default every time.
    assert.equal(withPriority.principleVoice?.conceptId, "plan-integrity");
    assertNoResearchLeak(JSON.stringify(withPriority));
  });

  it("never narrates a fantasy label, construction stage, or connection gap as a card to watch", () => {
    const structuralSystems = {
      systems: [
        { name: "Token Engine", signal: "tokens", health: { overall: 80 }, members: Array(6).fill("x") },
        { name: "Counter Engine", signal: "counters", health: { overall: 70 }, members: Array(4).fill("x") },
        { name: "Treasure Engine", signal: "treasure", health: { overall: 30 }, members: Array(2).fill("x") },
      ],
      strongestSystem: { name: "Token Engine" },
      weakestSystem: { name: "Treasure Engine" },
    };
    const selected = {
      evaluation: { cohesion: 72, roleCoverage: 0.8, resilience: 60 },
      strategicIntent: { strategy: "Focused", packages: [], commanders: [{ name: "Atraxa, Praetors' Voice" }] },
      strategicCohesionGate: { ok: true, reasons: [] },
      slotJustificationLedger: { critique: emptyCritique },
    };
    const summary = buildHonestCoachSummary({
      selected,
      isImported: true,
      structuralSystems,
      activeCommanderName: "Atraxa, Praetors' Voice",
      commissionNote: "superfriends and counters please",
    });
    assert.equal(summary.fixFirst, "Superfriends");
    assert.equal(summary.fixFirstKind, "fantasy");
    // The exact composition of planStory.stop is free to evolve (e.g. a
    // dedicated fantasy-protect line instead of an appended watch clause) —
    // the one invariant this guards is that a fantasy/theme label is never
    // asserted to be a literal card.
    assert.doesNotMatch(
      summary.planStory.stop,
      /first card I'd watch in real games is Superfriends/i,
      `fixFirst is a fantasy label, not a card: ${summary.planStory.stop}`,
    );
  });
});
