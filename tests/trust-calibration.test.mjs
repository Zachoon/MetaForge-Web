import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { buildTrustCalibrationReport } from "../app/trust-calibration.mjs";
import { validateCoachFeedbackPayload } from "../app/honest-coach-feedback.mjs";
import { buildHonestCoachAnalysisId } from "../app/honest-coach-ids.mjs";

function coachRow({
  feedbackId,
  notHelpfulReason = null,
  commander = "Pearl-Ear",
  packageLabels = ["Aura package"],
  confidence = "high",
  recommendationId = null,
  guest = false,
} = {}) {
  return {
    category: feedbackId === "helpful" ? "helped" : "confusing",
    context: {
      surface: "honest-coach-v0.2",
      feedbackId,
      notHelpfulReason,
      commander,
      packageLabels,
      confidence,
      recommendationId,
      guest,
      analysisId: "hca-deadbeef",
    },
  };
}

describe("Trust Calibration A3", () => {
  it("clusters wrong-plan reports by commander and archetype without recommending Brain changes", () => {
    const report = buildTrustCalibrationReport({
      feedback: [
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "Pearl-Ear", packageLabels: ["Aura package"] }),
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "Ellivere", packageLabels: ["Aura package"] }),
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "Light-Paws", packageLabels: ["Aura package"] }),
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "Calix", packageLabels: ["Aura package"] }),
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "Pearl-Ear", packageLabels: ["Aura package"] }),
        coachRow({ feedbackId: "helpful", commander: "Yuriko", packageLabels: ["Ninjutsu package"], confidence: "moderate" }),
        coachRow({ feedbackId: "helpful", commander: "Yuriko", packageLabels: ["Ninjutsu package"], confidence: "moderate" }),
        coachRow({ feedbackId: "misunderstands-plan", commander: "Atraxa", packageLabels: ["Counters package"], confidence: "high" }),
      ],
      funnel: {
        coach_brief_viewed: { events: 20, sessions: 18 },
        coach_why_opened: { events: 8, sessions: 7 },
        forge_succeeded: { events: 25, sessions: 22 },
      },
    });

    assert.equal(report.version, "trust-calibration-v1");
    assert.equal(report.priorities.brainChangeRecommended, false);
    assert.equal(report.topMisunderstoodCommanders[0].label, "Pearl-Ear");
    assert.equal(report.topMisunderstoodCommanders[0].count, 2);
    assert.equal(report.topMisunderstoodArchetypes[0].label, "Aura package");
    assert.ok(report.mostCommonFeedback.some((row) => row.label === "wrong-plan"));
    assert.equal(report.misunderstandingClusters[0].reason, "wrong-plan");
    assert.ok(report.misunderstandingClusters[0].commanders.some((c) => c.label === "Pearl-Ear"));
    assert.match(report.confusionMap.mostTrustedStrategies[0].label, /Ninjutsu/i);
    assert.ok(report.weeklyReview.whereBrainLosesTrust.includes("Pearl-Ear"));
    assert.equal(typeof report.weeklyReview.deservesAcademyInvestigation, "boolean");
    assert.equal(report.confidenceVsTrust.high.wrongPlan > 0, true);
  });

  it("stores commander + packages on coach feedback for clustering", () => {
    const analysis = buildHonestCoachAnalysisId({ generationId: "g1", commanderName: "Pearl-Ear", packageLabels: ["Aura package"] });
    const validated = validateCoachFeedbackPayload({
      optionId: "not-helpful",
      notHelpfulReason: "wrong-plan",
      analysisId: analysis.analysisId,
      commander: "Pearl-Ear",
      packageLabels: ["Aura package", "Tokens package"],
      confidence: "high",
    });
    assert.equal(validated.ok, true);
    assert.equal(validated.context.commander, "Pearl-Ear");
    assert.deepEqual([...validated.context.packageLabels], ["Aura package", "Tokens package"]);
  });

  it("wires Trust Calibration into founder overview + constitution sentence", async () => {
    const root = new URL("../", import.meta.url);
    const founderWorker = await readFile(new URL("worker/founder-dashboard.ts", root), "utf8");
    const founderPage = await readFile(new URL("app/founder/page.tsx", root), "utf8");
    const constitution = await readFile(new URL("docs/INTELLIGENCE_CONSTITUTION.md", root), "utf8");
    const calibration = await readFile(new URL("app/trust-calibration.mjs", root), "utf8");
    assert.match(founderWorker, /buildTrustCalibrationReport/);
    assert.match(founderWorker, /trustCalibration/);
    assert.match(founderPage, /Trust Calibration/);
    assert.match(founderPage, /BRAIN CONFUSION MAP|Brain Confusion Map/);
    assert.match(founderPage, /Users define the questions/);
    assert.match(constitution, /Users define the questions\. The Academy seeks the answers\./);
    assert.doesNotMatch(calibration, /native-masterwork-engine|prospective-slot-delta|construction-phase/);
  });

  it("earns Academy investigation only after repeated misunderstanding evidence", () => {
    const thin = buildTrustCalibrationReport({
      feedback: [
        coachRow({ feedbackId: "not-helpful", notHelpfulReason: "wrong-plan", commander: "A" }),
        coachRow({ feedbackId: "helpful", commander: "B" }),
      ],
    });
    assert.equal(thin.weeklyReview.deservesAcademyInvestigation, false);

    const thick = buildTrustCalibrationReport({
      feedback: Array.from({ length: 6 }, (_, i) =>
        coachRow({
          feedbackId: "not-helpful",
          notHelpfulReason: "wrong-plan",
          commander: ["Pearl-Ear", "Ellivere", "Light-Paws", "Calix", "Sythis", "Pearl-Ear"][i],
          packageLabels: ["Aura package"],
          confidence: "high",
        }),
      ),
    });
    assert.equal(thick.weeklyReview.deservesAcademyInvestigation, true);
    assert.match(thick.weeklyReview.academyQuestion, /Academy question/i);
    assert.equal(thick.priorities.brainChangeRecommended, false);
  });
});
