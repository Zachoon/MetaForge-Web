import {
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  validateStrategicCohesion,
} from "./strategic-intent.mjs";
import { buildPackageState, evaluatePackageHealth } from "./package-plan-optimizer.mjs";

// =============================================================================
// Strategic Plan Competition
// =============================================================================
// First-class competing strategic plans ABOVE construction.
// Evidence-driven — never a fixed menu tried against every commander.
// =============================================================================

export const STRATEGIC_PLAN_VERSION = "strategic-plan-v1";

const DEFAULT_LIMITS = Object.freeze({
  maxGenerated: 8,
  maxBuilt: 3,
  minEvidenceScore: 18,
  diversityMinDistance: 0.34,
});

const SUPPORT_PROFILES = Object.freeze([
  Object.freeze({
    id: "protection_support",
    label: "Protection-heavy support",
    roles: Object.freeze(["protection"]),
    packageAffinity: Object.freeze(["auras", "equipment"]),
    signals: Object.freeze(["protection"]),
    require: Object.freeze({ minRoleCards: 6, minAffinityOrSignals: 1 }),
  }),
  Object.freeze({
    id: "recursion_support",
    label: "Recursion-heavy resilience",
    roles: Object.freeze(["recursion"]),
    packageAffinity: Object.freeze(["reanimator", "aristocrats"]),
    signals: Object.freeze(["graveyard", "recursion"]),
    require: Object.freeze({ minRoleCards: 5, minAffinityOrSignals: 1 }),
  }),
  Object.freeze({
    id: "engine_value",
    label: "Engine / value support",
    roles: Object.freeze(["draw"]),
    packageAffinity: Object.freeze(["auras", "tokens", "landfall", "aristocrats"]),
    signals: Object.freeze(["draw", "card_advantage"]),
    require: Object.freeze({ minRoleCards: 8, minAffinityOrSignals: 1 }),
  }),
]);

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const uniqueSorted = (values = []) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

function poolRoleCount(spells, role) {
  return spells.reduce((sum, entry) => sum + ((entry.roles || []).includes(role) ? 1 : 0), 0);
}

function poolSignalCount(spells, signal) {
  return spells.reduce((sum, entry) => {
    const mechanics = entry.mechanics || {};
    return sum + (mechanics.produces?.includes(signal) || mechanics.rewards?.includes(signal) ? 1 : 0);
  }, 0);
}

function packageDepth(spells, packageId) {
  return spells.filter((entry) => cardSatisfiesPackageCore(entry, packageId) || cardSatisfiesPackageSupport(entry, packageId)).length;
}

function evidenceForSupportProfile(profile, analysis, intent) {
  const spells = analysis.spells || [];
  const reasons = [];
  let score = 0;

  const roleCards = profile.roles.reduce((sum, role) => sum + poolRoleCount(spells, role), 0);
  if (roleCards >= profile.require.minRoleCards) {
    score += Math.min(24, roleCards);
    reasons.push(`${roleCards} ${profile.roles.join("/")} cards in pool`);
  } else {
    return Object.freeze({ ok: false, score: 0, reasons: Object.freeze([`insufficient ${profile.roles.join("/")} depth (${roleCards})`]) });
  }

  const primaryIds = intent.packages?.map((pkg) => pkg.id) || [];
  const affinityHits = profile.packageAffinity.filter((id) => primaryIds.includes(id) || packageDepth(spells, id) >= 6);
  const signalHits = profile.signals.filter((signal) => poolSignalCount(spells, signal) >= 4);
  const affinityOrSignals = affinityHits.length + signalHits.length;
  if (affinityOrSignals < profile.require.minAffinityOrSignals) {
    return Object.freeze({ ok: false, score: 0, reasons: Object.freeze(["no package affinity or signal evidence"]) });
  }
  if (affinityHits.length) {
    score += affinityHits.length * 12;
    reasons.push(`affinity ${affinityHits.join(",")}`);
  }
  if (signalHits.length) {
    score += signalHits.length * 8;
    reasons.push(`signals ${signalHits.join(",")}`);
  }

  // Commander connection: protection matters more for voltron-like packages;
  // recursion matters when commander rewards graveyard/death; etc.
  const rewards = intent.commanderMechanics?.rewards || [];
  const produces = intent.commanderMechanics?.produces || [];
  if (profile.id === "protection_support" && (primaryIds.includes("auras") || primaryIds.includes("equipment") || rewards.includes("auras"))) {
    score += 14;
    reasons.push("commander/package benefits from protection");
  }
  if (profile.id === "recursion_support" && (rewards.includes("graveyard") || produces.includes("graveyard") || primaryIds.includes("reanimator") || primaryIds.includes("aristocrats"))) {
    score += 14;
    reasons.push("commander/package benefits from recursion");
  }
  if (profile.id === "engine_value" && (rewards.length > 0 || primaryIds.length > 0)) {
    score += 10;
    reasons.push("engine support for active commander plan");
  }

  return Object.freeze({ ok: score >= 18, score, reasons: Object.freeze(reasons), affinityHits: Object.freeze(affinityHits), signalHits: Object.freeze(signalHits), roleCards });
}

function slotAllocation(intent, supportProfile) {
  const primary = (intent.packages || []).map((pkg) => Object.freeze({
    packageId: pkg.id,
    slots: pkg.coreMin + Math.ceil(pkg.supportMin / 2),
  }));
  const supportSlots = supportProfile.id === "engine_value" ? 10 : supportProfile.id === "protection_support" ? 8 : 7;
  return Object.freeze({
    primary: Object.freeze(primary),
    support: Object.freeze([{ profileId: supportProfile.id, slots: supportSlots }]),
    estimatedNonlandPressure: primary.reduce((sum, entry) => sum + entry.slots, 0) + supportSlots + 24,
  });
}

/**
 * Evidence-driven strategic plan candidate generation.
 */
export function generateStrategicPlanCandidates(analysis, intent, input = {}, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const instrumentation = {
    generated: 0,
    pruned: 0,
    reasons: [],
  };
  const primaryPackages = (intent.packages || []).map((pkg) => pkg.id);
  const candidates = [];

  // Baseline: primary packages only (always valid when intent has them, or empty-support).
  const baseline = Object.freeze({
    id: "primary_baseline",
    label: primaryPackages.length ? `Primary ${primaryPackages.join("+")}` : "Baseline midrange structure",
    primaryPackages: Object.freeze([...primaryPackages]),
    supportingProfiles: Object.freeze([]),
    expectedSlotAllocation: slotAllocation(intent, { id: "none", label: "none" }),
    requiredLegs: Object.freeze((intent.packages || []).flatMap((pkg) => (pkg.requireBalancedLegs || []).map((leg) => `${pkg.id}:${leg}`))),
    commanderConnection: Object.freeze({
      produces: Object.freeze([...(intent.commanderMechanics?.produces || [])]),
      rewards: Object.freeze([...(intent.commanderMechanics?.rewards || [])]),
    }),
    evidence: Object.freeze({ score: primaryPackages.length ? 40 : 20, reasons: Object.freeze(["strategic-intent primary packages"]) }),
    confidence: primaryPackages.length ? 0.72 : 0.45,
  });
  candidates.push(baseline);
  instrumentation.generated += 1;

  for (const profile of SUPPORT_PROFILES) {
    const evidence = evidenceForSupportProfile(profile, analysis, intent);
    instrumentation.generated += 1;
    if (!evidence.ok || evidence.score < limits.minEvidenceScore) {
      instrumentation.pruned += 1;
      instrumentation.reasons.push(`${profile.id}: ${evidence.reasons[0]}`);
      continue;
    }
    // Reject aristocrats-like support without aristocrats package evidence —
    // broad creature overlap is not enough (handled by affinity/signal gates).
    if (profile.packageAffinity.includes("aristocrats") && profile.id === "recursion_support") {
      const aristocratsDepth = packageDepth(analysis.spells || [], "aristocrats");
      const hasAristocrats = (intent.packages || []).some((pkg) => pkg.id === "aristocrats");
      if (!hasAristocrats && aristocratsDepth < 8 && evidence.affinityHits.includes("aristocrats") === false) {
        // still ok if recursion signals exist without aristocrats affinity
      }
    }
    const allocation = slotAllocation(intent, profile);
    const confidence = Math.min(0.95, 0.4 + evidence.score / 100);
    candidates.push(Object.freeze({
      id: `${primaryPackages.join("_") || "base"}__${profile.id}`,
      label: `${baseline.label} + ${profile.label}`,
      primaryPackages: Object.freeze([...primaryPackages]),
      supportingProfiles: Object.freeze([profile.id]),
      supportProfile: profile,
      expectedSlotAllocation: allocation,
      requiredLegs: baseline.requiredLegs,
      commanderConnection: baseline.commanderConnection,
      evidence,
      confidence,
      resilienceProfile: profile.id === "protection_support" || profile.id === "recursion_support" ? "high" : "medium",
      budgetFeasible: input.budget !== "Budget conscious" || true,
      powerFeasible: input.targetPowerTier !== "Casual" || true,
    }));
  }

  // Deduplicate near-identical plans.
  const diverse = [];
  for (const plan of candidates.sort((left, right) => (right.evidence?.score || 0) - (left.evidence?.score || 0) || left.id.localeCompare(right.id))) {
    const duplicate = diverse.some((existing) => planDistance(existing, plan) < limits.diversityMinDistance);
    if (duplicate) {
      instrumentation.pruned += 1;
      instrumentation.reasons.push(`dedup ${plan.id}`);
      continue;
    }
    diverse.push(plan);
    if (diverse.length >= limits.maxGenerated) break;
  }

  return Object.freeze({
    version: STRATEGIC_PLAN_VERSION,
    plans: Object.freeze(diverse),
    instrumentation: Object.freeze(instrumentation),
  });
}

export function planDistance(left, right) {
  const leftKeys = new Set([...(left.primaryPackages || []), ...(left.supportingProfiles || [])]);
  const rightKeys = new Set([...(right.primaryPackages || []), ...(right.supportingProfiles || [])]);
  if (!leftKeys.size && !rightKeys.size) return 0;
  let intersection = 0;
  for (const key of leftKeys) if (rightKeys.has(key)) intersection += 1;
  const union = leftKeys.size + rightKeys.size - intersection;
  return 1 - (intersection / Math.max(1, union));
}

/**
 * Predicted structural quality before building the 99.
 */
export function evaluateStrategicPlan(plan, analysis, intent = {}, options = {}) {
  const spells = analysis.spells || [];
  const reasons = [];
  let score = 0;

  // Commander alignment
  const commanderSignals = (intent.commanderMechanics?.produces?.length || 0) + (intent.commanderMechanics?.rewards?.length || 0);
  const commanderScore = Math.min(20, commanderSignals * 4 + (plan.evidence?.score || 0) * 0.15);
  score += commanderScore;
  reasons.push(`commander alignment ${round(commanderScore)}`);

  // Package compatibility / depth
  let packageScore = 0;
  for (const packageId of plan.primaryPackages || []) {
    const depth = packageDepth(spells, packageId);
    const floor = (intent.packages || []).find((pkg) => pkg.id === packageId)?.coreMin || 8;
    packageScore += Math.min(18, (depth / Math.max(1, floor)) * 12);
    if (depth < floor) reasons.push(`thin ${packageId} depth ${depth}/${floor}`);
  }
  score += packageScore;

  // Support depth
  if (plan.supportProfile) {
    const roleCards = plan.supportProfile.roles.reduce((sum, role) => sum + poolRoleCount(spells, role), 0);
    const supportScore = Math.min(16, roleCards * 1.2);
    score += supportScore;
    reasons.push(`support depth ${roleCards}`);
    if (roleCards < plan.supportProfile.require.minRoleCards) {
      score -= 20;
      reasons.push("insufficient support candidate depth");
    }
  }

  // Slot pressure
  const pressure = plan.expectedSlotAllocation?.estimatedNonlandPressure || 50;
  const targetSpells = options.spellTarget || 63;
  let slotScore = 12;
  if (pressure > targetSpells + 8) {
    slotScore = -25;
    reasons.push(`impossible slot pressure ${pressure}/${targetSpells}`);
  } else if (pressure > targetSpells) {
    slotScore = 2;
    reasons.push(`tight slot pressure ${pressure}/${targetSpells}`);
  }
  score += slotScore;

  // Curve / mana feasibility proxies
  const avgCmc = spells.length
    ? spells.reduce((sum, entry) => sum + (entry.cmc || 0), 0) / spells.length
    : 3;
  if (avgCmc > 4.2 && (plan.supportingProfiles || []).includes("protection_support") === false) {
    score -= 6;
    reasons.push("pool curves high");
  } else {
    score += 6;
  }

  // Budget / power
  if (options.budgetConstraint) {
    const expensive = spells.filter((entry) => Number(entry.card?.priceUsd) > 7.5).length;
    if (expensive > spells.length * 0.45) {
      score -= 10;
      reasons.push("budget pressure on pool");
    }
  }
  if (options.powerConstraint) {
    score += 4;
    reasons.push("Casual power constraint acknowledged");
  }

  // Interaction density estimate
  let edges = 0;
  const produces = new Map();
  const rewards = new Map();
  for (const entry of spells.slice(0, 120)) {
    for (const signal of entry.mechanics?.produces || []) produces.set(signal, (produces.get(signal) || 0) + 1);
    for (const signal of entry.mechanics?.rewards || []) rewards.set(signal, (rewards.get(signal) || 0) + 1);
  }
  for (const [signal, count] of produces) edges += Math.min(count, rewards.get(signal) || 0);
  const interactionScore = Math.min(14, edges / 3);
  score += interactionScore;

  const confidence = Math.min(0.95, (plan.confidence || 0.5) * 0.6 + Math.max(0, score) / 200);

  return Object.freeze({
    planId: plan.id,
    predictedScore: round(score),
    confidence: round(confidence),
    reasons: Object.freeze(reasons),
    components: Object.freeze({
      commanderScore: round(commanderScore),
      packageScore: round(packageScore),
      slotScore,
      interactionScore: round(interactionScore),
    }),
    reject: slotScore < 0 || score < 8,
  });
}

export function selectStrategicPlans(analysis, intent, input = {}, options = {}) {
  const started = Date.now();
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const generated = generateStrategicPlanCandidates(analysis, intent, input, { limits });
  const evaluated = generated.plans.map((plan) => {
    const prediction = evaluateStrategicPlan(plan, analysis, intent, {
      spellTarget: options.spellTarget || 63,
      budgetConstraint: input.budget === "Budget conscious",
      powerConstraint: input.targetPowerTier === "Casual",
    });
    return Object.freeze({ plan, prediction });
  });
  const pruned = evaluated.filter((entry) => !entry.prediction.reject);
  pruned.sort((left, right) =>
    right.prediction.predictedScore - left.prediction.predictedScore
    || right.prediction.confidence - left.prediction.confidence
    || left.plan.id.localeCompare(right.plan.id));

  // Diversity-aware top-K: keep meaningfully distinct plans.
  const selected = [];
  for (const entry of pruned) {
    if (selected.length >= limits.maxBuilt) break;
    if (selected.some((existing) => planDistance(existing.plan, entry.plan) < limits.diversityMinDistance)) continue;
    selected.push(entry);
  }
  // Always ensure at least the baseline survives.
  if (!selected.length && evaluated.length) selected.push(evaluated[0]);

  return Object.freeze({
    version: STRATEGIC_PLAN_VERSION,
    selected: Object.freeze(selected),
    generated: generated.plans.length,
    pruned: generated.instrumentation.pruned + (evaluated.length - pruned.length),
    instrumentation: Object.freeze({
      ...generated.instrumentation,
      evaluated: evaluated.length,
      built: selected.length,
      predictionMs: Date.now() - started,
    }),
  });
}

/**
 * Overlay a chosen support plan onto analysis intent for construction.
 */
export function applyStrategicPlanToAnalysis(analysis, plan) {
  if (!plan) return analysis;
  const intent = analysis.strategicIntent;
  const roleTargets = { ...(intent.roleTargets || {}) };
  if (plan.supportProfile) {
    for (const role of plan.supportProfile.roles || []) {
      roleTargets[role] = Math.max(roleTargets[role] || 0, (roleTargets[role] || 0) + (role === "draw" ? 2 : 3));
    }
  }
  const strategicIntent = Object.freeze({
    ...intent,
    roleTargets: Object.freeze(roleTargets),
    activePlan: Object.freeze({
      id: plan.id,
      label: plan.label,
      supportingProfiles: Object.freeze([...(plan.supportingProfiles || [])]),
      primaryPackages: Object.freeze([...(plan.primaryPackages || [])]),
    }),
  });
  return {
    ...analysis,
    strategicIntent,
    context: {
      ...analysis.context,
      strategicIntent,
    },
  };
}

/**
 * Compare predicted plan quality to the realized finished candidate.
 */
export function realizeStrategicPlanScore(candidate, plan, prediction, intent) {
  const cohesion = candidate.strategicCohesionGate || validateStrategicCohesion(candidate, intent);
  const ledger = candidate.slotJustificationLedger;
  const avgStrength = ledger?.slots?.length
    ? ledger.slots.reduce((sum, slot) => sum + slot.strength, 0) / ledger.slots.length
    : 0;
  let packageHealth = 0;
  for (const packageSpec of intent.packages || []) {
    const state = buildPackageState(candidate.rows, packageSpec, intent);
    packageHealth += evaluatePackageHealth(state, intent).score;
  }
  packageHealth = (intent.packages || []).length ? packageHealth / intent.packages.length : 70;

  const realized = round(
    (cohesion.passed ? 28 : -20)
    + avgStrength * 0.25
    + packageHealth * 0.35
    + (prediction?.predictedScore || 0) * 0.15,
  );
  const gap = round(realized - (prediction?.predictedScore || 0));
  const underperformed = cohesion.passed === false || gap <= -22;
  return Object.freeze({
    planId: plan.id,
    predictedScore: prediction?.predictedScore ?? null,
    realizedScore: realized,
    gap,
    underperformed,
    cohesionPassed: cohesion.passed !== false,
    averageJustificationStrength: round(avgStrength),
    packageHealth: round(packageHealth),
  });
}
