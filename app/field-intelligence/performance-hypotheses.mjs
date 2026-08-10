// =============================================================================
// Field Intelligence v1.2 — PerformanceStructureHypothesis + replication
// =============================================================================
// A single-event Level-A delta is a lead, not a learned principle.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export const HYPOTHESIS_STATUS = Object.freeze([
  "single_event_lead",
  "replicated",
  "mixed",
  "contradicted",
  "insufficient_sample",
]);

const FEATURE_ALIASES = Object.freeze({
  // Group closely related absolute/share pairs for replication.
  interaction: ["interactionDensity", "interactionCount", "interactionShare", "removal", "ix_stack", "ix_removal", "ix_flexible"],
  threats: ["threatDensity", "threatShare", "threat_standalone", "threat_combo_component", "threat_value_engine"],
  spells: ["spells", "spellShare", "spell_interaction", "spell_card_advantage", "spell_tutor"],
  ramp: ["ramp", "rampShare"],
  package: ["packageCore", "packageSupport", "packageHealth"],
  protection: ["protection", "ix_protection", "spell_protection"],
  tutors: ["tutor", "spell_tutor", "spell_tutor_for_win"],
  draw: ["draw", "drawShare", "spell_card_advantage"],
});

function familyKey(identity = "") {
  return String(identity).toLocaleLowerCase("en");
}

function directionOf(delta) {
  if (delta > 0.05) return "high_greater";
  if (delta < -0.05) return "high_lesser";
  return "near_zero";
}

function opposite(direction) {
  if (direction === "high_greater") return "high_lesser";
  if (direction === "high_lesser") return "high_greater";
  return direction;
}

function featureFamily(feature) {
  for (const [family, keys] of Object.entries(FEATURE_ALIASES)) {
    if (keys.includes(feature)) return family;
  }
  return feature;
}

/**
 * Build PerformanceStructureHypothesis set from Level-A forensic cohorts.
 * Replication requires same feature family + same direction across events.
 */
export function buildPerformanceStructureHypotheses(levelABatch = null) {
  const cohorts = levelABatch?.cohorts || [];
  const leads = [];

  for (const cohort of cohorts) {
    for (const delta of (cohort.strongestDeltas || []).slice(0, 10)) {
      if (delta.magnitude < 0.5 && Math.abs(delta.delta) < 0.05) continue;
      leads.push(freeze({
        commanderIdentity: cohort.commanderIdentity,
        family: familyKey(cohort.commanderIdentity),
        eventId: cohort.eventId,
        feature: delta.feature,
        featureFamily: featureFamily(delta.feature),
        direction: directionOf(delta.delta),
        delta: delta.delta,
        magnitude: delta.magnitude,
        confidence: delta.confidence,
        highMean: delta.highMean,
        lowMean: delta.lowMean,
        sampleHigh: delta.sampleHigh,
        sampleLow: delta.sampleLow,
        sampleSize: delta.sampleSize,
      }));
    }
  }

  // Group by commander family + feature family (not exact feature) for replication.
  const groups = new Map();
  for (const lead of leads) {
    const key = `${lead.family}::${lead.featureFamily}`;
    groups.set(key, (groups.get(key) || []).concat([lead]));
  }

  const hypotheses = [];
  for (const [key, group] of groups) {
    const [family, featFamily] = key.split("::");
    const events = [...new Set(group.map((g) => g.eventId))];
    const supporting = [];
    const contradicting = [];
    // Pick primary feature as the highest-magnitude observation.
    const primary = [...group].sort((a, b) => b.magnitude - a.magnitude)[0];
    const primaryDirection = primary.direction;

    for (const eventId of events) {
      const eventLeads = group.filter((g) => g.eventId === eventId);
      const eventPrimary = [...eventLeads].sort((a, b) => b.magnitude - a.magnitude)[0];
      if (eventPrimary.direction === "near_zero") continue;
      if (eventPrimary.direction === primaryDirection) supporting.push(eventId);
      else if (eventPrimary.direction === opposite(primaryDirection)) contradicting.push(eventId);
    }

    const uniqueSupporting = [...new Set(supporting)];
    const uniqueContradicting = [...new Set(contradicting)];
    const totalHigh = group.reduce((sum, g) => sum + (g.sampleHigh || 0), 0);
    const totalLow = group.reduce((sum, g) => sum + (g.sampleLow || 0), 0);
    const weightedEffect = round(
      group.reduce((sum, g) => sum + g.delta * g.sampleSize, 0)
      / Math.max(1, group.reduce((sum, g) => sum + g.sampleSize, 0)),
    );

    let status = "insufficient_sample";
    if (events.length === 1 && uniqueSupporting.length === 1) status = "single_event_lead";
    else if (uniqueSupporting.length >= 2 && uniqueContradicting.length === 0) status = "replicated";
    else if (uniqueSupporting.length >= 1 && uniqueContradicting.length >= 1) {
      status = uniqueContradicting.length >= uniqueSupporting.length ? "contradicted" : "mixed";
    } else if (uniqueContradicting.length >= 2 && uniqueSupporting.length === 0) status = "contradicted";
    else if (events.length >= 1) status = "single_event_lead";

    // Confidence: never treat single-event as high-confidence principle.
    let confidence = primary.confidence || 0.3;
    if (status === "single_event_lead") confidence = round(Math.min(0.45, confidence));
    if (status === "replicated") {
      confidence = round(Math.min(0.9, 0.45 + 0.15 * uniqueSupporting.length + Math.min(0.2, Math.abs(weightedEffect) / 20)));
    }
    if (status === "mixed") confidence = round(Math.min(0.55, confidence * 0.7));
    if (status === "contradicted") confidence = round(Math.min(0.35, confidence * 0.4));
    if (status === "insufficient_sample") confidence = round(Math.min(0.25, confidence));

    hypotheses.push(freeze({
      id: `psh:${family}:${featFamily}`,
      kind: "PerformanceStructureHypothesis",
      commanderFamily: primary.commanderIdentity,
      familyKey: family,
      feature: primary.feature,
      featureFamily: featFamily,
      observedDirection: primaryDirection,
      levelAEventsSupporting: freeze(uniqueSupporting),
      levelAEventsContradicting: freeze(uniqueContradicting),
      totalHighDecks: totalHigh,
      totalLowDecks: totalLow,
      weightedEffect,
      confidence,
      replicationStatus: status,
      observations: freeze(group),
      // Gate: single event never auto-qualifies as Brain v2 evidence.
      brainV2Eligible: status === "replicated" && confidence >= 0.55 && Math.abs(weightedEffect) >= 0.5,
    }));
  }

  return freeze({
    version: "performance-structure-hypothesis-v1",
    leadCount: leads.length,
    hypothesisCount: hypotheses.length,
    byStatus: freeze(Object.fromEntries(
      HYPOTHESIS_STATUS.map((status) => [
        status,
        hypotheses.filter((h) => h.replicationStatus === status).length,
      ]),
    )),
    hypotheses: freeze(hypotheses.sort((a, b) =>
      b.confidence - a.confidence
      || Math.abs(b.weightedEffect) - Math.abs(a.weightedEffect)
      || a.id.localeCompare(b.id))),
    replicated: freeze(hypotheses.filter((h) => h.replicationStatus === "replicated")),
    mixedOrContradicted: freeze(hypotheses.filter((h) =>
      h.replicationStatus === "mixed" || h.replicationStatus === "contradicted")),
    singleEventLeads: freeze(hypotheses.filter((h) => h.replicationStatus === "single_event_lead")),
  });
}
