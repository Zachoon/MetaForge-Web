// =============================================================================
// Reasoning Drift (Self-Evaluation v1)
// =============================================================================
// Compare pick-time prospective belief vs finished-deck retrospective truth.
// Observational only — does not mutate construction policy.
// =============================================================================

import { buildPackageState, evaluatePackageHealth } from "./package-plan-optimizer.mjs";
import {
  CONSTRUCTION_TRACE_VERSION,
  mutationEventsFromCandidate,
  sealConstructionTrace,
} from "./construction-trace.mjs";

export const REASONING_DRIFT_VERSION = "reasoning-drift-v1";
export const SELF_EVALUATION_ARTIFACT_VERSION = "self-evaluation-artifact-v1";
export const SELF_EVALUATION_AGGREGATE_VERSION = "self-evaluation-aggregate-v1";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const freeze = (value) => Object.freeze(value);

export const DRIFT_CLASSES = Object.freeze([
  "stable_good_prediction",
  "became_redundant",
  "later_package_oversupply",
  "expected_package_value_not_realized",
  "expected_commander_connection_not_realized",
  "became_package_critical",
  "underestimated_interaction_value",
  "overestimated_interaction_value",
  "curve_need_disappeared",
  "downstream_repair_invalidated_pick",
  "unsupported_anchor_emerged",
  "final_weak_justification",
  "raw_power_overvalued",
  "retrospective_gain_not_seen_prospectively",
  "early_scaffolding_matured",
  "unclassified",
  "ambiguous",
]);

export const CONTROL_CASES = Object.freeze([
  "genuine_bad_belief",
  "invalidated_by_later_decisions",
  "early_scaffolding_matured",
  "beneficial_emergence",
  "stable",
  "ambiguous",
]);

const MUTATION_REMOVED = new Set([
  "removed_budget_repair",
  "removed_power_repair",
  "removed_package_optimization",
  "removed_unsupported_bomb_repair",
  "removed_weak_slot_repair",
  "replaced_refill",
  "removed_other",
]);

function median(values = []) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function packageHealthById(candidate, intent) {
  const map = {};
  for (const packageSpec of intent?.packages || []) {
    const state = buildPackageState(candidate.rows || [], packageSpec, intent);
    const health = evaluatePackageHealth(state, intent);
    map[packageSpec.id] = freeze({
      status: health.status,
      densityDeficit: state.density?.deficit || 0,
      densitySurplus: state.density?.surplus || 0,
      issues: freeze((health.issues || []).map((issue) => issue.kind)),
    });
  }
  return freeze(map);
}

function relevantPackageHealth(pick, packageHealth) {
  const ids = pick.packageIds?.length
    ? pick.packageIds
    : Object.keys(packageHealth);
  const relevant = {};
  for (const id of ids) {
    if (packageHealth[id]) relevant[id] = packageHealth[id];
  }
  // Also include packages named in deficitsFilled.
  for (const tag of pick.prospectiveDelta?.deficitsFilled || []) {
    const match = String(tag).match(/^package_(?:core|support|leg):([^:]+)/);
    if (match && packageHealth[match[1]]) relevant[match[1]] = packageHealth[match[1]];
  }
  return freeze(relevant);
}

function countLaterSameDeficitFills(pick, allPicks) {
  const tags = new Set(pick.prospectiveDelta?.deficitsFilled || []);
  if (!tags.size) return 0;
  let count = 0;
  for (const other of allPicks) {
    if (other.pickIndex <= pick.pickIndex) continue;
    const filled = other.prospectiveDelta?.deficitsFilled || [];
    if (filled.some((tag) => tags.has(tag))) count += 1;
  }
  return count;
}

/**
 * Factual prospective↔retrospective comparison for one decision.
 * expectedValue stays in prospective-delta units; realizedValue stays in
 * ledger strength units. Drift magnitude uses a comparable projection so
 * direction/class are meaningful without pretending the units were identical.
 */
export function compareProspectiveToRetrospective(tracePick, finalOutcome, context = {}) {
  const expectedValue = round(Number(tracePick?.prospectiveDelta?.total) || 0);
  const realizedValue = finalOutcome?.justificationStrength == null
    ? null
    : round(Number(finalOutcome.justificationStrength) || 0);
  const comparableExpected = round(Math.max(0, Math.min(100, expectedValue * 1.05 + 10)));
  const comparableRealized = realizedValue == null ? null : realizedValue;
  const driftMagnitude = comparableRealized == null ? null : round(comparableRealized - comparableExpected);
  const driftDirection = driftMagnitude == null
    ? "ambiguous"
    : driftMagnitude > 12 ? "positive" : driftMagnitude < -12 ? "negative" : "stable";

  const expectedReasons = freeze([
    ...(tracePick?.prospectiveDelta?.deficitsFilled || []),
    ...((tracePick?.prospectiveDelta?.positives || []).map((entry) => `${entry.kind}:${entry.key}`)),
  ].slice(0, 16));
  const realizedReasons = freeze((finalOutcome?.reasons || []).map(reasonKey).slice(0, 16));

  const expectedSet = new Set(expectedReasons);
  const realizedSet = new Set(realizedReasons);
  const expectedReasonsPreserved = freeze([...expectedSet].filter((reason) => realizedSet.has(reason)));
  const expectedReasonsLost = freeze([...expectedSet].filter((reason) => !realizedSet.has(reason)));
  const unexpectedReasonsGained = freeze([...realizedSet].filter((reason) => !expectedSet.has(reason)));

  const deficitsPredicted = freeze([...(tracePick?.prospectiveDelta?.deficitsFilled || [])]);
  const laterSame = Number(context.laterSameDeficitFills || 0);
  const packageHealth = finalOutcome?.packageHealth || {};
  const deficitStillOpen = deficitsPredicted.filter((tag) => {
    const core = String(tag).match(/^package_core:(.+)$/);
    if (core && packageHealth[core[1]]) return (packageHealth[core[1]].densityDeficit || 0) > 0;
    return false;
  });
  const deficitInvalidated = deficitsPredicted.filter((tag) => {
    const core = String(tag).match(/^package_core:(.+)$/);
    if (core && packageHealth[core[1]]) return (packageHealth[core[1]].densitySurplus || 0) >= 3;
    const curve = String(tag).match(/^curve:(.+)$/);
    if (curve && finalOutcome?.flags?.redundant) return true;
    return false;
  });

  const flags = finalOutcome?.flags || {};
  const mutation = finalOutcome?.mutation || "survived_final";
  const source = tracePick?.source || "live_fill";
  const classification = classifyDrift({
    expectedValue,
    realizedValue: realizedValue ?? 0,
    driftMagnitude: driftMagnitude ?? 0,
    driftDirection,
    flags,
    mutation,
    source,
    deficitsPredicted,
    deficitPredictionsInvalidated: deficitInvalidated,
    laterSameDeficitFills: laterSame,
    commanderSignals: tracePick?.commanderConnectionSignals || [],
    surplusAtPick: tracePick?.prospectiveDelta?.surplusIntroduced || [],
  });

  const controlCase = classifyControlCase({
    expectedValue,
    realizedValue: realizedValue ?? 0,
    driftMagnitude: driftMagnitude ?? 0,
    flags,
    mutation,
    source,
    laterSameDeficitFills: laterSame,
    surplusAtPick: tracePick?.prospectiveDelta?.surplusIntroduced || [],
    classification: classification.primary,
  });

  return freeze({
    version: REASONING_DRIFT_VERSION,
    expectedValue,
    realizedValue,
    comparableExpected,
    comparableRealized,
    driftMagnitude,
    driftDirection,
    expectedReasonsPreserved,
    expectedReasonsLost,
    unexpectedReasonsGained,
    deficitPredictionsValid: freeze(deficitsPredicted.filter((tag) => !deficitInvalidated.includes(tag) && !deficitStillOpen.includes(tag))),
    deficitPredictionsInvalidated: freeze(deficitInvalidated),
    deficitPredictionsStillOpen: freeze(deficitStillOpen),
    classificationTags: freeze(classification.tags),
    primaryClass: classification.primary,
    confidence: classification.confidence,
    controlCase: controlCase.id,
    controlCaseConfidence: controlCase.confidence,
    controlCaseId: controlCase.id,
  });
}

function classifyDrift(input) {
  const tags = [];
  let primary = "unclassified";
  let confidence = "low";
  const source = input.source || "live_fill";
  const realized = Number(input.realizedValue) || 0;
  const expected = Number(input.expectedValue) || 0;

  if (MUTATION_REMOVED.has(input.mutation)) {
    tags.push("downstream_repair_invalidated_pick");
    primary = "downstream_repair_invalidated_pick";
    confidence = "high";
    return { primary, tags, confidence };
  }

  // Anchors/presets without live prospective belief are timeline scaffolding,
  // not prediction-error events.
  if ((source === "anchor" || source === "preset") && expected <= 0.01) {
    if (realized >= 35) {
      tags.push("early_scaffolding_matured");
      return { primary: "early_scaffolding_matured", tags, confidence: "medium" };
    }
    tags.push("ambiguous");
    return { primary: "ambiguous", tags, confidence: "low" };
  }

  const flags = input.flags || {};
  if (flags.rawPowerDominant && expected >= 12) {
    tags.push("raw_power_overvalued");
    primary = "raw_power_overvalued";
    confidence = "medium";
  }
  if (flags.underSupportedAnchor) {
    tags.push("unsupported_anchor_emerged");
    if (primary === "unclassified") primary = "unsupported_anchor_emerged";
    confidence = "medium";
  }
  if (flags.packageCritical && expected < 12) {
    tags.push("became_package_critical");
    if (primary === "unclassified" || primary === "raw_power_overvalued") primary = "became_package_critical";
    confidence = "medium";
  }
  if (flags.redundant && expected >= 18) {
    tags.push("became_redundant");
    if (input.laterSameDeficitFills >= 2 || (input.deficitPredictionsInvalidated || []).length) {
      tags.push("later_package_oversupply");
      primary = "later_package_oversupply";
      confidence = "medium";
    } else if ((input.surplusAtPick || []).some((tag) => /package_/.test(tag))) {
      primary = "became_redundant";
      confidence = "medium";
    } else {
      primary = "became_redundant";
      confidence = "low";
    }
  }
  if (flags.overSupported && (input.deficitsPredicted || []).some((tag) => /package_/.test(tag))) {
    tags.push("later_package_oversupply");
    if (primary === "unclassified") primary = "later_package_oversupply";
  }
  if (flags.weaklyJustified && expected >= 18) {
    tags.push("final_weak_justification");
    if (primary === "unclassified") primary = "final_weak_justification";
    confidence = confidence === "high" ? confidence : "medium";
  }
  if ((input.deficitsPredicted || []).some((tag) => /package_/.test(tag))
    && realized < 25
    && expected >= 18
    && !flags.redundant) {
    tags.push("expected_package_value_not_realized");
    if (primary === "unclassified") primary = "expected_package_value_not_realized";
  }
  if ((input.commanderSignals || []).length && realized < 20 && expected >= 15) {
    tags.push("expected_commander_connection_not_realized");
    if (primary === "unclassified") primary = "expected_commander_connection_not_realized";
  }
  if ((input.deficitsPredicted || []).some((tag) => /^curve:/.test(tag)) && flags.redundant) {
    tags.push("curve_need_disappeared");
    if (primary === "unclassified") primary = "curve_need_disappeared";
  }

  // Beneficial emergence: modest pick-time belief, strong finished role.
  if (source === "live_fill" && expected <= 12 && realized >= 55) {
    tags.push("retrospective_gain_not_seen_prospectively");
    tags.push("underestimated_interaction_value");
    primary = "retrospective_gain_not_seen_prospectively";
    confidence = "medium";
  }
  if (source === "live_fill" && expected >= 25 && realized < 22 && !tags.includes("became_redundant")) {
    tags.push("overestimated_interaction_value");
    if (primary === "unclassified") primary = "overestimated_interaction_value";
  }

  // Stable good: both sides look structurally healthy — magnitude gap alone
  // is not disagreement when units differ.
  if (expected >= 15 && realized >= 40 && !flags.weaklyJustified && !flags.redundant && !flags.rawPowerDominant
    && primary === "unclassified") {
    if (input.laterSameDeficitFills >= 2) {
      tags.push("early_scaffolding_matured");
      primary = "early_scaffolding_matured";
      confidence = "medium";
    } else {
      tags.push("stable_good_prediction");
      primary = "stable_good_prediction";
      confidence = "high";
    }
  }

  if (tags.length >= 3 && primary !== "stable_good_prediction" && primary !== "early_scaffolding_matured") {
    tags.push("ambiguous");
    if (confidence === "low") primary = "ambiguous";
  }
  if (!tags.length) tags.push(primary);

  return { primary, tags: [...new Set(tags)], confidence };
}

function classifyControlCase(input) {
  if (MUTATION_REMOVED.has(input.mutation)) {
    return freeze({ id: "invalidated_by_later_decisions", confidence: "high" });
  }
  if ((input.source === "anchor" || input.source === "preset") && input.expectedValue <= 0.01) {
    return freeze({
      id: input.realizedValue >= 35 ? "early_scaffolding_matured" : "ambiguous",
      confidence: "medium",
    });
  }
  if (input.classification === "retrospective_gain_not_seen_prospectively"
    || (input.source === "live_fill" && input.expectedValue <= 12 && input.realizedValue >= 55)) {
    return freeze({ id: "beneficial_emergence", confidence: "medium" });
  }
  if (input.classification === "early_scaffolding_matured") {
    return freeze({ id: "early_scaffolding_matured", confidence: "medium" });
  }
  if (input.classification === "later_package_oversupply"
    || (input.flags?.redundant && input.laterSameDeficitFills >= 2 && input.expectedValue >= 15)) {
    return freeze({ id: "invalidated_by_later_decisions", confidence: "medium" });
  }
  if ((input.flags?.redundant || input.flags?.weaklyJustified || input.flags?.rawPowerDominant)
    && input.expectedValue >= 18
    && input.laterSameDeficitFills < 2
    && (input.surplusAtPick || []).length === 0) {
    return freeze({ id: "genuine_bad_belief", confidence: "medium" });
  }
  if (input.classification === "stable_good_prediction"
    || (input.expectedValue >= 15 && input.realizedValue >= 40 && !input.flags?.weaklyJustified && !input.flags?.redundant)) {
    return freeze({ id: "stable", confidence: "high" });
  }
  return freeze({ id: "ambiguous", confidence: "low" });
}

function reasonKey(reason) {
  if (typeof reason === "string") return reason;
  if (!reason || typeof reason !== "object") return String(reason);
  if (reason.packageId) return `${reason.kind}:${reason.packageId}`;
  if (reason.signal) return `${reason.kind}:${reason.signal}`;
  if (reason.role) return `${reason.kind}:${reason.role}`;
  if (reason.semantic) return `${reason.kind}:${reason.semantic}`;
  if (reason.stage) return `${reason.kind}:${reason.stage}`;
  if (reason.band) return `${reason.kind}:${reason.band}`;
  if (reason.key) return `${reason.kind}:${reason.key}`;
  return reason.kind || "unknown";
}

function buildOutcomeForSurviving(slot, pick, packageHealth, interaction) {
  return freeze({
    mutation: "survived_final",
    justificationStrength: round(slot.strength),
    reasons: freeze((slot.reasons || []).map(reasonKey).slice(0, 12)),
    removalConsequence: freeze({
      severity: round(slot.removalConsequence?.severity ?? 0),
      packageCollapses: freeze([...(slot.removalConsequence?.packageCollapses || [])]),
      lostReasons: freeze([...(slot.removalConsequence?.lostReasons || [])].slice(0, 8)),
    }),
    flags: freeze({ ...(slot.flags || {}) }),
    packageHealth: relevantPackageHealth(pick, packageHealth),
    interaction: freeze({
      edges: interaction?.edges ?? null,
      orphanRewardHit: Boolean(interaction?.orphanRewards?.some?.((signal) =>
        (pick.prospectiveDelta?.positives || []).some((entry) => entry.key === signal))),
    }),
  });
}

/**
 * Attach retrospective outcomes + drift to a sealed construction trace.
 */
export function attachSelfEvaluationToCandidate(candidate, options = {}) {
  const started = Date.now();
  const intent = candidate.strategicIntent || options.intent || {};
  const trace = candidate.constructionTrace || sealConstructionTrace(null);
  const ledger = candidate.slotJustificationLedger;
  const packageHealth = packageHealthById(candidate, intent);
  const mutations = mutationEventsFromCandidate(candidate);
  const removedByKey = new Map();
  for (const event of mutations) {
    if (String(event.mutation).startsWith("removed_")) {
      removedByKey.set(event.nameKey, event.mutation);
    }
  }

  const finalNames = new Set(
    (candidate.rows || [])
      .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
      .map((row) => normalized(row.name)),
  );

  const picks = [];
  for (const pick of trace.picks || []) {
    const mutation = removedByKey.get(pick.nameKey);
    let outcome;
    if (mutation) {
      outcome = freeze({
        mutation,
        justificationStrength: 0,
        reasons: freeze([`removed_by:${mutation}`]),
        removalConsequence: null,
        flags: freeze({ removed: true }),
        packageHealth: relevantPackageHealth(pick, packageHealth),
        interaction: freeze({ edges: null, orphanRewardHit: false }),
      });
    } else if (finalNames.has(pick.nameKey) && ledger?.byName?.[pick.nameKey]) {
      outcome = buildOutcomeForSurviving(ledger.byName[pick.nameKey], pick, packageHealth, options.interaction);
    } else if (finalNames.has(pick.nameKey)) {
      outcome = freeze({
        mutation: "survived_final",
        justificationStrength: null,
        reasons: freeze(["survived_without_ledger_slot"]),
        removalConsequence: null,
        flags: freeze({}),
        packageHealth: relevantPackageHealth(pick, packageHealth),
        interaction: freeze({ edges: null, orphanRewardHit: false }),
      });
    } else {
      outcome = freeze({
        mutation: "removed_other",
        justificationStrength: 0,
        reasons: freeze(["absent_from_final_without_known_mutation"]),
        removalConsequence: null,
        flags: freeze({ removed: true }),
        packageHealth: relevantPackageHealth(pick, packageHealth),
        interaction: freeze({ edges: null, orphanRewardHit: false }),
      });
    }

    const laterSameDeficitFills = countLaterSameDeficitFills(pick, trace.picks || []);
    const drift = compareProspectiveToRetrospective(pick, outcome, { laterSameDeficitFills });
    picks.push(freeze({
      ...pick,
      outcome,
      drift,
      laterSameDeficitFills,
    }));
  }

  // Post-construction additions that never had a pick-time belief.
  for (const event of mutations) {
    if (!String(event.mutation).startsWith("added_")) continue;
    if (picks.some((pick) => pick.nameKey === event.nameKey)) continue;
    const slot = ledger?.byName?.[event.nameKey];
    const synthetic = freeze({
      pickIndex: null,
      source: "post_construction_addition",
      name: event.name,
      nameKey: event.nameKey,
      constructionPhase: null,
      prospectiveDelta: null,
      outcome: slot
        ? buildOutcomeForSurviving(slot, { packageIds: trace.meta?.packageIds || [], prospectiveDelta: { deficitsFilled: [], positives: [] } }, packageHealth, options.interaction)
        : freeze({
          mutation: event.mutation,
          justificationStrength: null,
          reasons: freeze([event.mutation]),
          removalConsequence: null,
          flags: freeze({}),
          packageHealth: freeze({}),
          interaction: freeze({ edges: null, orphanRewardHit: false }),
        }),
      drift: freeze({
        version: REASONING_DRIFT_VERSION,
        expectedValue: null,
        realizedValue: slot ? round(slot.strength) : null,
        driftMagnitude: null,
        driftDirection: "ambiguous",
        expectedReasonsPreserved: freeze([]),
        expectedReasonsLost: freeze([]),
        unexpectedReasonsGained: freeze([]),
        deficitPredictionsValid: freeze([]),
        deficitPredictionsInvalidated: freeze([]),
        deficitPredictionsStillOpen: freeze([]),
        classificationTags: freeze(["ambiguous"]),
        primaryClass: "ambiguous",
        confidence: "low",
        controlCase: "ambiguous",
        controlCaseConfidence: "low",
        controlCaseId: "ambiguous",
      }),
      laterSameDeficitFills: 0,
    });
    // Fix outcome mutation for additions that survived.
    if (finalNames.has(event.nameKey) && synthetic.outcome.mutation === "survived_final") {
      picks.push(freeze({
        ...synthetic,
        outcome: freeze({ ...synthetic.outcome, mutation: "survived_final", addedBy: event.mutation }),
      }));
    } else {
      picks.push(synthetic);
    }
  }

  const artifact = buildSelfEvaluationArtifact(picks, {
    intent,
    cohesionPassed: candidate.strategicCohesionGate?.passed !== false,
    packageHealth,
    timingMs: Date.now() - started,
    traceTiming: trace.timing,
    meta: trace.meta,
  });

  return {
    ...candidate,
    constructionTrace: freeze({
      ...trace,
      picks: freeze(picks),
      pickCount: picks.filter((pick) => pick.pickIndex != null).length,
      finalized: true,
    }),
    selfEvaluation: artifact,
  };
}

export function buildSelfEvaluationArtifact(picks = [], options = {}) {
  const decisionPicks = picks.filter((pick) => pick.source !== "post_construction_addition" || pick.drift?.expectedValue != null);
  const withDrift = picks.filter((pick) => pick.drift && pick.drift.expectedValue != null);
  const stable = withDrift.filter((pick) =>
    pick.drift.primaryClass === "stable_good_prediction"
    || pick.drift.primaryClass === "early_scaffolding_matured"
    || pick.drift.controlCaseId === "stable");
  const disagreements = withDrift.filter((pick) =>
    !["stable_good_prediction", "early_scaffolding_matured", "ambiguous", "unclassified"].includes(pick.drift.primaryClass)
    || ["genuine_bad_belief", "invalidated_by_later_decisions"].includes(pick.drift.controlCaseId));
  const byClass = {};
  const byPhase = {};
  const byPackage = {};
  const byControl = {};
  const magnitudes = [];

  for (const pick of withDrift) {
    const cls = pick.drift.primaryClass || "unclassified";
    byClass[cls] = (byClass[cls] || 0) + 1;
    const phase = pick.constructionPhase || "unknown";
    byPhase[phase] = byPhase[phase] || { count: 0, meanAbsDrift: 0, _sum: 0 };
    byPhase[phase].count += 1;
    byPhase[phase]._sum += Math.abs(pick.drift.driftMagnitude || 0);
    for (const packageId of pick.packageIds || []) {
      byPackage[packageId] = byPackage[packageId] || { count: 0, disagreements: 0 };
      byPackage[packageId].count += 1;
      if (pick.drift.driftDirection !== "stable") byPackage[packageId].disagreements += 1;
    }
    const control = pick.drift.controlCaseId || "ambiguous";
    byControl[control] = (byControl[control] || 0) + 1;
    magnitudes.push(pick.drift.driftMagnitude || 0);
  }
  for (const phase of Object.keys(byPhase)) {
    const entry = byPhase[phase];
    entry.meanAbsDrift = round(entry.count ? entry._sum / entry.count : 0);
    delete entry._sum;
  }

  const sortedByMag = [...withDrift].sort((a, b) =>
    Math.abs(b.drift.driftMagnitude) - Math.abs(a.drift.driftMagnitude)
    || a.name.localeCompare(b.name));
  const removed = picks.filter((pick) => String(pick.outcome?.mutation || "").startsWith("removed_"));
  const agreementRate = withDrift.length
    ? round(stable.length / withDrift.length)
    : 1;

  const warningSignals = Object.entries(byClass)
    .filter(([cls]) => !["stable_good_prediction", "unclassified", "ambiguous"].includes(cls))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([cls, count]) => freeze({ class: cls, count }));

  return freeze({
    version: SELF_EVALUATION_ARTIFACT_VERSION,
    traceVersion: CONSTRUCTION_TRACE_VERSION,
    driftVersion: REASONING_DRIFT_VERSION,
    totalTracedPicks: withDrift.length,
    totalRecords: picks.length,
    liveFillPicks: picks.filter((pick) => pick.source === "live_fill").length,
    anchorPicks: picks.filter((pick) => pick.source === "anchor").length,
    stablePredictions: stable.length,
    meaningfulDisagreements: disagreements.length,
    disagreementsByClass: freeze(byClass),
    controlCaseCounts: freeze(byControl),
    meanDriftMagnitude: round(magnitudes.length ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length : 0),
    medianDriftMagnitude: round(median(magnitudes)),
    meanAbsDriftMagnitude: round(magnitudes.length
      ? magnitudes.reduce((a, b) => a + Math.abs(b), 0) / magnitudes.length
      : 0),
    largestPositiveDrifts: freeze(sortedByMag
      .filter((pick) => (pick.drift.driftMagnitude || 0) > 0)
      .slice(0, 5)
      .map((pick) => freeze({
        name: pick.name,
        pickIndex: pick.pickIndex,
        driftMagnitude: pick.drift.driftMagnitude,
        primaryClass: pick.drift.primaryClass,
        controlCase: pick.drift.controlCaseId,
      }))),
    largestNegativeDrifts: freeze(sortedByMag
      .filter((pick) => (pick.drift.driftMagnitude || 0) < 0)
      .slice(0, 5)
      .map((pick) => freeze({
        name: pick.name,
        pickIndex: pick.pickIndex,
        driftMagnitude: pick.drift.driftMagnitude,
        primaryClass: pick.drift.primaryClass,
        controlCase: pick.drift.controlCaseId,
      }))),
    phaseDistributionOfDrift: freeze(byPhase),
    packageDistributionOfDrift: freeze(byPackage),
    prospectiveDecisionsLaterRemoved: removed.length,
    prospectiveVsRetrospectiveAgreementRate: agreementRate,
    strongestRecurringWarningSignals: freeze(warningSignals),
    cohesionPassed: options.cohesionPassed !== false,
    timing: freeze({
      finalizeMs: options.timingMs || 0,
      recordMs: options.traceTiming?.recordMs || 0,
    }),
    meta: freeze({ ...(options.meta || {}) }),
    // Raw per-pick records remain accessible beneath the summary.
    picks: freeze(picks),
  });
}

/**
 * Aggregate many forge-level self-evaluation artifacts (deterministic).
 */
export function aggregateSelfEvaluationArtifacts(artifacts = []) {
  const byClass = {};
  const byPhase = {};
  const byPackage = {};
  const byControl = {};
  const byArchetype = {};
  let totalPicks = 0;
  let totalDisagreements = 0;
  let absSum = 0;
  let signedSum = 0;

  for (const artifact of artifacts) {
    const archetype = artifact.archetype || artifact.meta?.archetype || "unknown";
    byArchetype[archetype] = byArchetype[archetype] || {
      forges: 0,
      picks: 0,
      disagreements: 0,
      byClass: {},
      meanAbsDrift: 0,
      _abs: 0,
    };
    const arch = byArchetype[archetype];
    arch.forges += 1;
    arch.picks += artifact.totalTracedPicks || 0;
    arch.disagreements += artifact.meaningfulDisagreements || 0;

    totalPicks += artifact.totalTracedPicks || 0;
    totalDisagreements += artifact.meaningfulDisagreements || 0;
    absSum += (artifact.meanAbsDriftMagnitude || 0) * (artifact.totalTracedPicks || 0);
    signedSum += (artifact.meanDriftMagnitude || 0) * (artifact.totalTracedPicks || 0);

    for (const [cls, count] of Object.entries(artifact.disagreementsByClass || {})) {
      byClass[cls] = (byClass[cls] || 0) + count;
      arch.byClass[cls] = (arch.byClass[cls] || 0) + count;
    }
    for (const [phase, entry] of Object.entries(artifact.phaseDistributionOfDrift || {})) {
      byPhase[phase] = byPhase[phase] || { count: 0, _abs: 0 };
      byPhase[phase].count += entry.count || 0;
      byPhase[phase]._abs += (entry.meanAbsDrift || 0) * (entry.count || 0);
    }
    for (const [packageId, entry] of Object.entries(artifact.packageDistributionOfDrift || {})) {
      byPackage[packageId] = byPackage[packageId] || { count: 0, disagreements: 0 };
      byPackage[packageId].count += entry.count || 0;
      byPackage[packageId].disagreements += entry.disagreements || 0;
    }
    for (const [control, count] of Object.entries(artifact.controlCaseCounts || {})) {
      byControl[control] = (byControl[control] || 0) + count;
    }
    arch._abs += (artifact.meanAbsDriftMagnitude || 0) * (artifact.totalTracedPicks || 0);
  }

  for (const phase of Object.keys(byPhase)) {
    const entry = byPhase[phase];
    entry.meanAbsDrift = round(entry.count ? entry._abs / entry.count : 0);
    delete entry._abs;
  }
  for (const archetype of Object.keys(byArchetype)) {
    const arch = byArchetype[archetype];
    arch.meanAbsDrift = round(arch.picks ? arch._abs / arch.picks : 0);
    delete arch._abs;
    arch.topClasses = freeze(Object.entries(arch.byClass)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([cls, count]) => freeze({ class: cls, count })));
    arch.byClass = freeze(arch.byClass);
  }

  const topRecurrent = Object.entries(byClass)
    .filter(([cls]) => !["stable_good_prediction"].includes(cls))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([cls, count]) => freeze({ class: cls, count }));

  return freeze({
    version: SELF_EVALUATION_AGGREGATE_VERSION,
    forgeCount: artifacts.length,
    totalTracedPicks: totalPicks,
    totalMeaningfulDisagreements: totalDisagreements,
    driftClassCounts: freeze(byClass),
    driftByPhase: freeze(byPhase),
    driftByPackage: freeze(byPackage),
    controlCaseCounts: freeze(byControl),
    meanPredictionError: round(totalPicks ? signedSum / totalPicks : 0),
    meanAbsPredictionError: round(totalPicks ? absSum / totalPicks : 0),
    topRecurrentDisagreementClasses: freeze(topRecurrent),
    byArchetype: freeze(byArchetype),
  });
}

/**
 * Deterministic JSON for equality tests — strips timing fields.
 */
export function stableSelfEvaluationView(artifact) {
  if (!artifact) return null;
  const { timing, ...rest } = artifact;
  return freeze({
    ...rest,
    picks: freeze((artifact.picks || []).map((pick) => {
      const copy = { ...pick };
      return freeze(copy);
    })),
    timingExcluded: true,
  });
}
