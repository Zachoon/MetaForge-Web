// =============================================================================
// Honest Coach v0.2 — guest-safe feedback validation (product, not Brain)
// =============================================================================

import {
  HONEST_COACH_FEEDBACK_OPTIONS,
  HONEST_COACH_NOT_HELPFUL_REASONS,
} from "./honest-coach-summary.mjs";

const freeze = (value) => Object.freeze(value);

export const COACH_FEEDBACK_OPTION_IDS = freeze(
  HONEST_COACH_FEEDBACK_OPTIONS.map((entry) => entry.id),
);
export const COACH_NOT_HELPFUL_REASON_IDS = freeze(
  HONEST_COACH_NOT_HELPFUL_REASONS.map((entry) => entry.id),
);

export const GUEST_FEEDBACK_LIMIT_PER_HOUR = 12;
export const GUEST_FEEDBACK_MESSAGE_MAX = 500;

function cleanId(value = "", max = 64) {
  return String(value || "").trim().slice(0, max);
}

/**
 * Validate a coach feedback payload for guest or signed-in submit.
 * Does not store PII. Requires analysisId so feedback joins to a coach read.
 */
export function validateCoachFeedbackPayload(payload = {}) {
  const optionId = String(payload.optionId || payload.feedbackId || "").trim();
  const option = HONEST_COACH_FEEDBACK_OPTIONS.find((entry) => entry.id === optionId);
  if (!option) {
    return freeze({ ok: false, status: 400, error: "Valid feedback option required" });
  }

  const analysisId = cleanId(payload.analysisId || payload.context?.analysisId);
  if (!analysisId || !/^hca-[a-f0-9]{8}$/i.test(analysisId)) {
    return freeze({ ok: false, status: 400, error: "Valid analysisId required" });
  }

  const recommendationId = cleanId(
    payload.recommendationId || payload.context?.recommendationId || "",
  );
  if (recommendationId && !/^hcr-[a-f0-9]{8}$/i.test(recommendationId)) {
    return freeze({ ok: false, status: 400, error: "Invalid recommendationId" });
  }

  let notHelpfulReason = String(payload.notHelpfulReason || "").trim();
  if (option.id === "not-helpful") {
    if (!notHelpfulReason) {
      return freeze({ ok: false, status: 400, error: "Not-helpful reason required" });
    }
    if (!COACH_NOT_HELPFUL_REASON_IDS.includes(notHelpfulReason)) {
      return freeze({ ok: false, status: 400, error: "Invalid not-helpful reason" });
    }
  } else {
    notHelpfulReason = "";
  }

  const note = String(payload.note || payload.message || "").trim().slice(0, GUEST_FEEDBACK_MESSAGE_MAX);
  const message = note
    || `Honest Coach: ${option.label}${notHelpfulReason ? ` · ${notHelpfulReason}` : ""}`;

  const commander = String(payload.commander || payload.context?.commander || "")
    .normalize("NFKC")
    .trim()
    .slice(0, 80);
  const packageLabels = [...(payload.packageLabels || payload.inferredPlan || payload.context?.packageLabels || [])]
    .map((entry) => String(entry || "").normalize("NFKC").trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, 5);

  const context = freeze({
    surface: "honest-coach-v0.2",
    feedbackId: option.id,
    analysisId,
    recommendationId: recommendationId || null,
    notHelpfulReason: notHelpfulReason || null,
    diagnosticClass: cleanId(payload.diagnosticClass || payload.context?.diagnosticClass || "", 40) || null,
    reasonClass: cleanId(payload.reasonClass || payload.context?.reasonClass || "", 40) || null,
    brainVersion: cleanId(payload.brainVersion || payload.context?.brainVersion || "brain_v1", 32) || "brain_v1",
    confidence: cleanId(payload.confidence || payload.context?.confidence || "", 16) || null,
    commander: commander || null,
    packageLabels: freeze(packageLabels),
    inferredPlan: freeze(packageLabels),
    guest: Boolean(payload.guest),
  });

  return freeze({
    ok: true,
    option,
    message,
    context,
    apiCategory: option.apiCategory,
  });
}

export function buildAlphaCoachMetricsShape({
  analysesCompleted = 0,
  coachBriefViews = 0,
  whyExplanationOpens = 0,
  confidenceDrilldowns = 0,
  recommendationViews = 0,
  feedbackHelpful = 0,
  feedbackNotHelpful = 0,
  feedbackWrongPlan = 0,
  feedbackGuest = 0,
  feedbackSignedIn = 0,
  confidenceHigh = 0,
  confidenceModerate = 0,
  confidenceLimited = 0,
} = {}) {
  const feedbackTotal = feedbackHelpful + feedbackNotHelpful;
  return freeze({
    version: "alpha-coach-metrics-v1",
    analysesCompleted,
    coachBriefViewRate: analysesCompleted ? coachBriefViews / analysesCompleted : 0,
    whyExplanationOpenRate: coachBriefViews ? whyExplanationOpens / coachBriefViews : 0,
    confidenceDrilldownRate: coachBriefViews ? confidenceDrilldowns / coachBriefViews : 0,
    recommendationViewRate: analysesCompleted ? recommendationViews / analysesCompleted : 0,
    helpfulNotHelpfulRatio: feedbackNotHelpful
      ? feedbackHelpful / feedbackNotHelpful
      : feedbackHelpful,
    feedbackTotal,
    wrongPlanFeedbackCount: feedbackWrongPlan,
    confidenceDistribution: freeze({
      high: confidenceHigh,
      moderate: confidenceModerate,
      limited: confidenceLimited,
    }),
    guestVsSignedInFeedback: freeze({
      guest: feedbackGuest,
      signedIn: feedbackSignedIn,
    }),
  });
}
