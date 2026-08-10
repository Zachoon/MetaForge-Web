// =============================================================================
// Field Intelligence v1 — Evidence Quality + Competitive Weights
// =============================================================================
// Hierarchy: tournament performance > curated expert > EDHREC > public/user.
// Frequency alone is never strategic quality. Winner ≠ automatic truth.
// =============================================================================

import { evidenceTierRank } from "./corpus-schema.mjs";

const freeze = (value) => Object.freeze(value);
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

const TIER_BASE = Object.freeze({
  tournament_performance: 0.9,
  curated_expert: 0.72,
  broad_community: 0.42,
  public_user: 0.28,
  alpha_player: 0.35,
  synthetic_fixture: 0.55,
});

const PERFORMANCE_CLASS_BASE = Object.freeze({
  repeated_converter: 0.96,
  single_event_converter: 0.88,
  tournament_participant: 0.62,
  curated_expert: 0.72,
  broad_community: 0.42,
  public_user: 0.28,
  synthetic_fixture: 0.55,
});

const SOURCE_RELIABILITY = Object.freeze({
  topdeck_tournament: 0.95,
  spicerack_tournament: 0.9,
  edhtop16_tournament: 0.88,
  cedh_decklist_database: 0.8,
  edhrec_aggregate: 0.45,
  moxfield_tournament_linked: 0.55,
  moxfield_explicit_public: 0.35,
  alpha_player_deck: 0.4,
  hand_authored_public_seed: 0.55,
  synthetic_competitive_fixture: 0.6,
  public_list: 0.3,
  tournament: 0.9,
  community_aggregate: 0.45,
});

/**
 * Transparent competitive evidence weight.
 * Rewards large events, strong finishes, conversion, recency, and
 * independent-event replication — without letting a single result dominate.
 */
export function calculateCompetitiveEvidenceWeight(record = {}, options = {}) {
  const tier = record.evidenceTier || "public_user";
  const performanceClass = record.performanceClass || null;
  const dimensions = {
    tierBase: PERFORMANCE_CLASS_BASE[performanceClass]
      ?? TIER_BASE[tier]
      ?? 0.3,
    eventSize: 0.35,
    placement: 0.35,
    topCutConversion: 0.35,
    matchRecord: 0.35,
    recency: 0.4,
    independentReplication: clamp01(Math.log2(1 + (Number(options.independentEventCount) || record.independentConverterEvents || 1)) / 4),
    // Soft-cap: one event cannot monopolize a strategy's evidence mass.
    singleEventCaution: 1,
  };

  const eventSize = Number(record.eventSize);
  if (Number.isFinite(eventSize) && eventSize > 0) {
    // 8-player → ~0.25, 32 → ~0.55, 64 → ~0.7, 128+ → ~0.85+
    dimensions.eventSize = clamp01(Math.log2(Math.max(2, eventSize)) / 8);
  }

  const placement = Number(record.placement);
  if (Number.isFinite(placement) && placement > 0 && Number.isFinite(eventSize) && eventSize > 0) {
    const relative = 1 - ((placement - 1) / Math.max(1, eventSize - 1));
    dimensions.placement = clamp01(0.25 + relative * 0.75);
  } else if (Number.isFinite(placement) && placement > 0) {
    dimensions.placement = clamp01(1 / Math.sqrt(placement));
  }

  if (record.topCut === true) dimensions.topCutConversion = 0.85;
  else if (record.topCut === false) dimensions.topCutConversion = 0.35;
  else dimensions.topCutConversion = 0.45;

  const record_ = record.matchRecord || {};
  const wins = Number(record_.wins);
  const losses = Number(record_.losses);
  const draws = Number(record_.draws) || 0;
  if (Number.isFinite(wins) && Number.isFinite(losses)) {
    const games = wins + losses + draws;
    dimensions.matchRecord = games > 0 ? clamp01((wins + 0.5 * draws) / games) : 0.4;
  }

  if (record.observedAt) {
    const year = Number(String(record.observedAt).slice(0, 4));
    const month = Number(String(record.observedAt).slice(5, 7)) || 6;
    if (Number.isFinite(year)) {
      const ageYears = Math.max(0, (2026 + 8 / 12) - (year + month / 12));
      dimensions.recency = clamp01(1 - ageYears / 5);
    }
  }

  // Winner ≠ truth: dampen extreme single-event spikes when replication is 1.
  if ((Number(options.independentEventCount) || record.independentConverterEvents || 1) <= 1 && record.placement === 1) {
    dimensions.singleEventCaution = 0.82;
  }
  // Repeated converters get a small explicit boost already via class base;
  // still require multi-event signal before removing single-event caution.
  if (performanceClass === "repeated_converter") {
    dimensions.singleEventCaution = 1;
  }

  // EDHREC / public popularity must not override competitive weight.
  if (tier === "broad_community" || tier === "public_user") {
    dimensions.tierBase = Math.min(dimensions.tierBase, 0.45);
  }

  const raw = (
    dimensions.tierBase * 0.34
    + dimensions.eventSize * 0.16
    + dimensions.placement * 0.16
    + dimensions.topCutConversion * 0.12
    + dimensions.matchRecord * 0.08
    + dimensions.recency * 0.06
    + dimensions.independentReplication * 0.08
  ) * dimensions.singleEventCaution;

  return freeze({
    weight: round(clamp01(raw)),
    dimensions: freeze(Object.fromEntries(
      Object.entries(dimensions).map(([key, value]) => [key, round(value)]),
    )),
    notes: freeze([
      `tier:${tier}`,
      performanceClass ? `performance_class:${performanceClass}` : "performance_class:unset",
      Number.isFinite(eventSize) ? `event_size:${eventSize}` : "event_size:unknown",
      Number.isFinite(placement) ? `placement:${placement}` : "placement:unknown",
      record.topCut === true ? "top_cut" : "not_top_cut_or_unknown",
      (Number(options.independentEventCount) || record.independentConverterEvents || 1) > 1
        ? "replicated_across_events"
        : "single_event_damped",
      "winner_is_not_automatic_truth",
      "repeated_converter_gt_single_event_gt_participant",
    ]),
  });
}

/**
 * Combined evidence quality for one deck analysis.
 * Structural cohesion still matters; competitive weight modulates teaching mass.
 */
export function scoreEvidenceQuality(record, analysis = {}, options = {}) {
  const competitive = calculateCompetitiveEvidenceWeight(record, options);
  const dimensions = { ...competitive.dimensions };
  const sourceType = record.sourceType || "public_list";
  dimensions.sourceReliability = SOURCE_RELIABILITY[sourceType] ?? 0.4;

  const cohesionPassed = analysis.cohesion?.passed === true;
  const weaklyJustified = analysis.justification?.weaklyJustifiedCount ?? 0;
  const slotCount = Math.max(1, analysis.justification?.slotCount || 1);
  const weakRatio = weaklyJustified / slotCount;
  dimensions.structuralCohesion = cohesionPassed ? clamp01(1 - weakRatio * 1.4) : clamp01(0.25 - weakRatio);

  const packageHealth = analysis.packages || [];
  const healthyPackages = packageHealth.filter((entry) => entry.status === "healthy").length;
  dimensions.packageHealth = packageHealth.length
    ? clamp01(healthyPackages / packageHealth.length)
    : 0.35;

  const popularityShare = Number(record.popularity?.share) || 0;
  dimensions.popularityCaution = clamp01(1 - Math.min(0.5, popularityShare));

  // Popularity may gently reinforce an already-supported pattern — never lead.
  const popularityAssist = (record.evidenceTier === "broad_community" && options.semanticallySupported)
    ? clamp01(popularityShare) * 0.08
    : 0;

  const raw = (
    competitive.weight * 0.42
    + dimensions.sourceReliability * 0.12
    + dimensions.structuralCohesion * 0.22
    + dimensions.packageHealth * 0.14
    + dimensions.popularityCaution * 0.04
    + popularityAssist
  );

  // Tier floor / ceiling: community data cannot outrank solid tournament evidence.
  const tier = record.evidenceTier || "public_user";
  const capped = tier === "broad_community" || tier === "public_user"
    ? Math.min(raw, 0.55)
    : raw;

  const discount = Number(record.evidenceQualityHints?.confidenceDiscount);
  const discounted = Number.isFinite(discount) ? capped * Math.max(0.2, Math.min(1, discount)) : capped;

  return freeze({
    weight: round(clamp01(discounted)),
    competitiveWeight: competitive.weight,
    confidenceDiscount: Number.isFinite(discount) ? round(discount) : 1,
    dimensions: freeze(Object.fromEntries(
      Object.entries(dimensions).map(([key, value]) => [key, round(value)]),
    )),
    notes: freeze([
      ...competitive.notes,
      cohesionPassed ? "cohesion_ok" : "cohesion_weak",
      popularityShare > 0.2 ? "popularity_secondary_only" : "popularity_not_dominant",
      `tier_rank:${evidenceTierRank(tier)}`,
      Number.isFinite(discount) && discount < 1 ? `semantic_discount:${round(discount)}` : "semantic_discount:none",
    ]),
  });
}

export function frequencyIsNotQuality(frequencyCount = 0, evidenceWeight = 0) {
  return freeze({
    frequencyCount: Number(frequencyCount) || 0,
    evidenceWeight: round(evidenceWeight),
    qualityFromFrequencyAlone: false,
    usableAsStructuralPrior: evidenceWeight >= 0.45 && (Number(frequencyCount) || 0) >= 3,
  });
}

/**
 * Compare claim strength across evidence types for one relationship.
 */
export function classifyEvidenceClaim(observations = {}) {
  return freeze({
    observedBroadly: Boolean(observations.broadCount > 0),
    observedAmongExperts: Boolean(observations.expertCount > 0),
    observedAmongTournamentPerformers: Boolean(observations.tournamentCount > 0),
    associatedWithStrongerResults: Boolean(observations.performanceDelta > 0),
    // Distinct claims — never collapse into one "popular" bit.
    claimStrength: round(clamp01(
      (observations.tournamentCount ? 0.4 : 0)
      + (observations.expertCount ? 0.25 : 0)
      + (observations.performanceDelta > 0 ? 0.25 : 0)
      + (observations.broadCount ? 0.1 : 0),
    )),
  });
}
