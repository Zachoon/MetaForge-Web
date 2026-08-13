// =============================================================================
// Trust Calibration — Product Sprint Alpha A3
// =============================================================================
// Aggregates Honest Coach feedback into founder-facing misunderstanding maps.
// Does not change Brain construction. Does not invent research vocabulary.
// Users define the questions. The Academy seeks the answers.
// =============================================================================

const freeze = (value) => Object.freeze(value);

function cleanLabel(value = "", max = 64) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function isCoachFeedback(row = {}) {
  const context = row.context || {};
  const surface = String(context.surface || "");
  return surface.startsWith("honest-coach")
    || Boolean(context.analysisId)
    || Boolean(context.feedbackId);
}

function feedbackKind(row = {}) {
  const context = row.context || {};
  const id = String(context.feedbackId || "").trim();
  if (id) return id;
  if (row.category === "helped") return "helpful";
  if (row.category === "confusing") return "not-helpful";
  if (row.category === "missed-interaction") return "misunderstands-plan";
  return "other";
}

function notHelpfulReason(row = {}) {
  const context = row.context || {};
  if (context.notHelpfulReason) return String(context.notHelpfulReason);
  if (feedbackKind(row) === "misunderstands-plan") return "wrong-plan";
  return null;
}

function commanderOf(row = {}) {
  const context = row.context || {};
  return cleanLabel(context.commander || context.commanderName || "", 80) || "Unknown commander";
}

function packagesOf(row = {}) {
  const context = row.context || {};
  const raw = context.inferredPlan || context.packageLabels || context.packages || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => cleanLabel(entry, 48)).filter(Boolean).slice(0, 5);
}

function archetypeOf(row = {}) {
  const packages = packagesOf(row);
  if (packages.length) return packages[0];
  return "Unlabeled plan";
}

function confidenceOf(row = {}) {
  const level = String(row.context?.confidence || "").toLowerCase();
  if (level === "high" || level === "moderate" || level === "limited") return level;
  return "unknown";
}

function increment(map, key, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

function topEntries(map, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => freeze({ label, count }));
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Build Trust Calibration report from founder feedback rows (+ optional telemetry).
 * Rows should already have parsed `context` objects.
 */
export function buildTrustCalibrationReport({
  feedback = [],
  funnel = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const coachRows = feedback.filter(isCoachFeedback);
  const reasonCounts = new Map();
  const commanderWrongPlan = new Map();
  const archetypeWrongPlan = new Map();
  const commanderHelpful = new Map();
  const archetypeHelpful = new Map();
  const disputedRecommendations = new Map();
  const confidenceBuckets = {
    high: { helpful: 0, notHelpful: 0, wrongPlan: 0, total: 0 },
    moderate: { helpful: 0, notHelpful: 0, wrongPlan: 0, total: 0 },
    limited: { helpful: 0, notHelpful: 0, wrongPlan: 0, total: 0 },
    unknown: { helpful: 0, notHelpful: 0, wrongPlan: 0, total: 0 },
  };
  const wrongPlanClusters = new Map(); // reason → Map(commander → count)
  let helpful = 0;
  let notHelpful = 0;
  let misunderstandsPlan = 0;
  let guest = 0;
  let signedIn = 0;

  for (const row of coachRows) {
    const kind = feedbackKind(row);
    const reason = notHelpfulReason(row);
    const commander = commanderOf(row);
    const archetype = archetypeOf(row);
    const confidence = confidenceOf(row);
    const bucket = confidenceBuckets[confidence] || confidenceBuckets.unknown;
    bucket.total += 1;

    if (row.context?.guest) guest += 1;
    else signedIn += 1;

    if (kind === "helpful") {
      helpful += 1;
      bucket.helpful += 1;
      increment(commanderHelpful, commander);
      increment(archetypeHelpful, archetype);
    }

    if (kind === "not-helpful" || kind === "misunderstands-plan" || kind === "wrong-constraints") {
      notHelpful += 1;
      bucket.notHelpful += 1;
      const reasonKey = reason
        || (kind === "misunderstands-plan" ? "wrong-plan" : kind === "wrong-constraints" ? "budget-issue" : "other");
      increment(reasonCounts, reasonKey);
      if (reasonKey === "wrong-plan" || kind === "misunderstands-plan") {
        misunderstandsPlan += 1;
        bucket.wrongPlan += 1;
        increment(commanderWrongPlan, commander);
        increment(archetypeWrongPlan, archetype);
        if (!wrongPlanClusters.has("wrong-plan")) wrongPlanClusters.set("wrong-plan", new Map());
        increment(wrongPlanClusters.get("wrong-plan"), commander);
      } else if (reasonKey) {
        if (!wrongPlanClusters.has(reasonKey)) wrongPlanClusters.set(reasonKey, new Map());
        increment(wrongPlanClusters.get(reasonKey), commander);
      }
    }

    if ((kind === "not-helpful" || kind === "misunderstands-plan") && row.context?.recommendationId) {
      const recKey = [
        String(row.context.recommendationId),
        commander,
        String(row.context.reasonClass || "unspecified"),
      ].join(" · ");
      increment(disputedRecommendations, recKey);
    }
  }

  const feedbackTotal = helpful + notHelpful;
  const confidenceVsTrust = freeze(
    Object.fromEntries(
      Object.entries(confidenceBuckets).map(([level, bucket]) => [
        level,
        freeze({
          total: bucket.total,
          helpfulRate: pct(bucket.helpful, bucket.total),
          notHelpfulRate: pct(bucket.notHelpful, bucket.total),
          wrongPlanRate: pct(bucket.wrongPlan, bucket.total),
          helpful: bucket.helpful,
          notHelpful: bucket.notHelpful,
          wrongPlan: bucket.wrongPlan,
        }),
      ]),
    ),
  );

  const misunderstandingClusters = freeze(
    [...wrongPlanClusters.entries()]
      .map(([reason, commanders]) => freeze({
        reason,
        count: [...commanders.values()].reduce((sum, n) => sum + n, 0),
        commanders: topEntries(commanders, 8),
        reading: reason === "wrong-plan"
          ? "Clustered plan misunderstandings — investigate shared strategy family, not single cards."
          : `Clustered "${reason}" reports — treat as a blind-spot family.`,
      }))
      .sort((a, b) => b.count - a.count),
  );

  const mostMisunderstoodStrategies = topEntries(archetypeWrongPlan, 8);
  const mostTrustedStrategies = topEntries(archetypeHelpful, 8);
  const highConfLowTrust = confidenceVsTrust.high.total >= 3 && confidenceVsTrust.high.wrongPlanRate >= 25
    ? "High confidence paired with elevated wrong-plan rate — inspect overconfident package reads."
    : confidenceVsTrust.high.total
      ? "High-confidence trust looks stable enough to keep watching."
      : "Not enough high-confidence feedback yet.";
  const lowConfHighTrust = confidenceVsTrust.limited.total >= 3 && confidenceVsTrust.limited.helpfulRate >= 70
    ? "Limited confidence still earns trust — coach humility may be working."
      : confidenceVsTrust.limited.total
      ? "Limited-confidence feedback is still sparse or mixed."
      : "Not enough limited-confidence feedback yet.";

  const confusionMap = freeze({
    mostMisunderstoodStrategies,
    mostTrustedStrategies,
    fastestImprovingStrategies: freeze([]), // needs week-over-week history; reserved
    highestConfidenceLowestTrust: highConfLowTrust,
    lowestConfidenceHighestTrust: lowConfHighTrust,
  });

  const topMisunderstoodCommanders = topEntries(commanderWrongPlan, 10);
  const topMisunderstoodArchetypes = mostMisunderstoodStrategies;
  const reasonTotal = [...reasonCounts.values()].reduce((sum, n) => sum + n, 0);
  const mostCommonFeedback = freeze(
    topEntries(reasonCounts, 10).map((entry) => freeze({
      ...entry,
      share: pct(entry.count, reasonTotal),
    })),
  );

  const weeklyReview = freeze({
    whereBrainEarnsTrust: mostTrustedStrategies[0]
      ? `${mostTrustedStrategies[0].label} leads helpful reports (${mostTrustedStrategies[0].count}).`
      : "Not enough helpful coach feedback yet to name a trusted strategy.",
    whereBrainLosesTrust: topMisunderstoodCommanders[0]
      ? `${topMisunderstoodCommanders[0].label} leads wrong-plan / mistrust reports (${topMisunderstoodCommanders[0].count}).`
      : "Not enough mistrust reports yet.",
    mostRepeatedMisunderstanding: misunderstandingClusters[0]
      ? `${misunderstandingClusters[0].reason} across ${misunderstandingClusters[0].commanders.map((c) => c.label).slice(0, 4).join(", ") || "unlabeled commanders"}.`
      : "No repeated misunderstanding cluster yet.",
    deservesAcademyInvestigation: misunderstandingClusters[0]?.count >= 5
      || (confidenceVsTrust.high.wrongPlanRate >= 30 && confidenceVsTrust.high.total >= 5),
    academyQuestion: misunderstandingClusters[0]?.count >= 5
      ? `Academy question: why does Brain v1 repeatedly misread plans in the ${misunderstandingClusters[0].commanders[0]?.label || "clustered"} family?`
      : "No Academy investigation earned yet — keep collecting product evidence.",
  });

  const briefViews = funnel.coach_brief_viewed?.events || funnel.coach_brief_viewed?.sessions || 0;
  const whyOpens = funnel.coach_why_opened?.events || funnel.coach_why_opened?.sessions || 0;
  const analyses = funnel.forge_succeeded?.events || funnel.forge_succeeded?.sessions || 0;

  return freeze({
    version: "trust-calibration-v1",
    generatedAt,
    sample: freeze({
      coachFeedback: coachRows.length,
      helpful,
      notHelpful,
      misunderstandsPlan,
      guest,
      signedIn,
      helpfulRate: pct(helpful, feedbackTotal),
      briefViews,
      whyOpenRate: pct(whyOpens, briefViews || analyses || 1),
    }),
    topMisunderstoodCommanders,
    topMisunderstoodArchetypes,
    mostCommonFeedback,
    disputedRecommendations: topEntries(disputedRecommendations, 10),
    confidenceVsTrust,
    misunderstandingClusters,
    confusionMap,
    weeklyReview,
    priorities: freeze({
      nextProductInvestigation: topMisunderstoodCommanders[0]?.label
        || mostMisunderstoodStrategies[0]?.label
        || null,
      nextAcademyQuestion: weeklyReview.deservesAcademyInvestigation
        ? weeklyReview.academyQuestion
        : null,
      brainChangeRecommended: false,
    }),
  });
}

/** Sanitize clustering fields for storage (no decklists / emails). */
export function sanitizeTrustCalibrationContext({
  commander = "",
  packageLabels = [],
} = {}) {
  return freeze({
    commander: cleanLabel(commander, 80) || null,
    packageLabels: freeze(
      [...(packageLabels || [])]
        .map((entry) => cleanLabel(entry, 48))
        .filter(Boolean)
        .slice(0, 5),
    ),
  });
}
