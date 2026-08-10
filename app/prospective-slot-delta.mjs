import {
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  strategicSemanticsFor,
} from "./strategic-intent.mjs";
import {
  buildJustificationFootprint,
  curveBandFor,
  justificationPreservationScore,
} from "./slot-justification-ledger.mjs";
import {
  getNeedClosureView,
  incrementalFootprintNovelty,
  isPrimaryOversupplyChase,
  footprintSignature,
  saturationMultiplier,
} from "./deficit-closure-memory.mjs";
import { activeInteractionWiring } from "./brain-policy.mjs";

// =============================================================================
// Prospective Slot Delta
// =============================================================================
// Live construction reasoning: what does adding this candidate to the current
// partial deck improve, preserve, duplicate, or damage?
// Retrospective ledger + cohesion gate remain the audit layer.
// Closure memory (optional) adds temporal saturation awareness so recently
// solved needs do not keep earning full strategic reward.
// =============================================================================

export const PROSPECTIVE_DELTA_VERSION = "prospective-slot-delta-v2";
export const PROSPECTIVE_DELTA_EXPERIMENT_HOOK = "brain-policy-v2-exp001";

const TRACKED_ROLES = Object.freeze(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function entryCard(entry) {
  return entry?.card || entry || {};
}

function entryName(entry) {
  return entry?.card?.name || entry?.name || "";
}

function entrySemantics(entry) {
  if (entry?.strategicSemantics instanceof Set) return entry.strategicSemantics;
  if (Array.isArray(entry?.strategicSemantics)) return new Set(entry.strategicSemantics);
  return strategicSemanticsFor(entryCard(entry));
}

function nonlandRows(rows = []) {
  return rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
}

function curveBucket(cmc) {
  if (cmc <= 1) return "1";
  if (cmc >= 5) return "5+";
  return String(Math.round(cmc));
}

function countRole(rows, role) {
  return rows.reduce((sum, row) => sum + ((row.roles || []).includes(role) ? Number(row.quantity || 1) : 0), 0);
}

function countPackageCore(rows, packageId) {
  return rows.reduce((sum, row) => sum + (cardSatisfiesPackageCore(row, packageId) ? Number(row.quantity || 1) : 0), 0);
}

function countPackageSupport(rows, packageId) {
  return rows.reduce((sum, row) => {
    if (cardSatisfiesPackageCore(row, packageId)) return sum;
    return sum + (cardSatisfiesPackageSupport(row, packageId) ? Number(row.quantity || 1) : 0);
  }, 0);
}

function countSemantic(rows, semantic) {
  return rows.reduce((sum, row) => sum + (entrySemantics(row).has(semantic) ? Number(row.quantity || 1) : 0), 0);
}

function signalMaps(rows) {
  const produced = new Map();
  const rewarded = new Map();
  for (const row of rows) {
    const quantity = Number(row.quantity || 1);
    for (const signal of row.mechanics?.produces || []) produced.set(signal, (produced.get(signal) || 0) + quantity);
    for (const signal of row.mechanics?.rewards || []) rewarded.set(signal, (rewarded.get(signal) || 0) + quantity);
  }
  return { produced, rewarded };
}

/**
 * Live deficit / surplus snapshot for the partial deck.
 */
export function buildLiveDeficitState(partialRows = [], intent = {}, options = {}) {
  const rows = nonlandRows(partialRows);
  const roleTargets = options.roleTargets || intent.roleTargets || {};
  const curveGoals = options.curveGoals || {};
  const sequenceGoals = options.sequenceGoals || {};
  const { produced, rewarded } = signalMaps(rows);

  const roles = {};
  for (const role of TRACKED_ROLES) {
    const target = Number(roleTargets[role] || 0);
    const current = countRole(rows, role);
    roles[role] = Object.freeze({
      current,
      target,
      deficit: Math.max(0, target - current),
      surplus: Math.max(0, current - target),
      status: !target ? "untracked" : current < target ? "deficient" : current > target + 2 ? "oversupplied" : "satisfied",
    });
  }

  const packages = {};
  for (const packageSpec of intent.packages || []) {
    const coreCurrent = countPackageCore(rows, packageSpec.id);
    const supportCurrent = countPackageSupport(rows, packageSpec.id);
    const legs = {};
    for (const leg of packageSpec.requireBalancedLegs || []) {
      const current = countSemantic(rows, leg);
      const floor = packageSpec.legFloor || 0;
      legs[leg] = Object.freeze({
        current,
        target: floor,
        deficit: Math.max(0, floor - current),
        surplus: Math.max(0, current - floor),
        status: current < floor ? "deficient" : "satisfied",
      });
    }
    packages[packageSpec.id] = Object.freeze({
      label: packageSpec.label,
      core: Object.freeze({
        current: coreCurrent,
        target: packageSpec.coreMin,
        deficit: Math.max(0, packageSpec.coreMin - coreCurrent),
        surplus: Math.max(0, coreCurrent - packageSpec.coreMin),
        status: coreCurrent < packageSpec.coreMin ? "deficient" : coreCurrent > packageSpec.coreMin + 6 ? "oversupplied" : "satisfied",
      }),
      support: Object.freeze({
        current: supportCurrent,
        target: packageSpec.supportMin,
        deficit: Math.max(0, packageSpec.supportMin - supportCurrent),
        surplus: Math.max(0, supportCurrent - packageSpec.supportMin),
        status: supportCurrent < packageSpec.supportMin ? "deficient" : "satisfied",
      }),
      legs: Object.freeze(legs),
    });
  }

  const curve = {};
  const congested = [];
  const underfilled = [];
  for (const [bucket, target] of Object.entries(curveGoals)) {
    const current = rows.reduce((sum, row) => sum + (curveBucket(row.cmc) === bucket ? Number(row.quantity || 1) : 0), 0);
    const deficit = Math.max(0, target - current);
    const surplus = Math.max(0, current - target);
    const status = deficit > 0 ? "underfilled" : surplus >= Math.max(2, Math.ceil(target * 0.35)) ? "congested" : "satisfied";
    if (status === "congested") congested.push(bucket);
    if (status === "underfilled") underfilled.push(bucket);
    curve[bucket] = Object.freeze({ current, target, deficit, surplus, status });
  }

  const sequence = {};
  for (const [stage, target] of Object.entries(sequenceGoals)) {
    const current = rows.reduce((sum, row) => sum + ((row.sequenceStages || []).includes(stage) ? Number(row.quantity || 1) : 0), 0);
    sequence[stage] = Object.freeze({
      current,
      target,
      deficit: Math.max(0, target - current),
      surplus: Math.max(0, current - target),
      status: current < target ? "deficient" : "satisfied",
    });
  }

  const commanderConnections = rows.reduce((sum, row) => sum + ((row.commanderConnectionSignals || []).length ? Number(row.quantity || 1) : 0), 0);

  return Object.freeze({
    version: PROSPECTIVE_DELTA_VERSION,
    nonlandCount: rows.reduce((sum, row) => sum + Number(row.quantity || 1), 0),
    roles: Object.freeze(roles),
    packages: Object.freeze(packages),
    curve: Object.freeze(curve),
    sequence: Object.freeze(sequence),
    congestedCurveBands: Object.freeze(congested),
    underfilledCurveBands: Object.freeze(underfilled),
    commanderConnections,
    producedSignals: Object.freeze(Object.fromEntries([...produced.entries()].sort((a, b) => a[0].localeCompare(b[0])))),
    rewardedSignals: Object.freeze(Object.fromEntries([...rewarded.entries()].sort((a, b) => a[0].localeCompare(b[0])))),
  });
}

/**
 * Diminishing returns once a need is already satisfied.
 * Deficit remaining → full weight. Surplus → rapidly decaying reward.
 * Optional closureMemory makes recently re-filled needs decay harder than
 * long-stable satisfied needs, while novelty/resilience can retain value.
 */
export function marginalUtility(deficit, surplus, baseWeight, options = {}) {
  const softCap = options.softCap ?? 6;
  if (deficit > 0) return round(baseWeight * Math.min(2.2, 1 + deficit * 0.35));
  const over = Math.max(0, surplus);
  let weight;
  if (over === 0) weight = baseWeight * 0.55;
  else {
    // 1 over target ≈ half; deep surplus collapses toward residual flavor value.
    weight = baseWeight / (1 + over * 0.85 + Math.max(0, over - softCap) * 0.5);
  }
  if (options.needView) {
    weight *= saturationMultiplier(options.needView, {
      novelty: options.novelty,
      resilienceJustification: options.resilienceJustification,
    });
  } else if (Number.isFinite(options.saturation)) {
    weight *= Math.max(0.08, Math.min(1, options.saturation));
  }
  return round(weight);
}

function pushDelta(bucket, kind, detail, weight) {
  if (!weight) return;
  bucket.push(Object.freeze({ kind, detail, weight: round(weight) }));
}

function needOptions(memory, needKey, deficitState, novelty, resilienceJustification) {
  if (!memory) return {};
  return {
    needView: getNeedClosureView(memory, needKey, deficitState),
    novelty,
    resilienceJustification,
  };
}

/**
 * Prospective justification footprint delta for adding `candidate` now.
 */
export function prospectiveSlotDelta(partialRows = [], candidate = {}, intent = {}, options = {}) {
  const state = options.deficitState || buildLiveDeficitState(partialRows, intent, options);
  const rows = nonlandRows(partialRows);
  const positives = [];
  const negatives = [];
  const deficitsFilled = [];
  const surplusIntroduced = [];
  const closureMemory = options.closureMemory || null;

  const semantics = entrySemantics(candidate);
  const roles = candidate.roles || [];
  const cmc = Number(candidate.cmc ?? entryCard(candidate).cmc) || 0;
  const bucket = curveBucket(cmc);
  const commanderSignals = candidate.commanderConnectionSignals || [];
  const produces = candidate.mechanics?.produces || [];
  const rewards = candidate.mechanics?.rewards || [];
  const sequenceStages = candidate.sequenceStages || [];

  const candidateFootprint = options.footprintCache?.get?.(normalized(entryName(candidate)))
    || buildJustificationFootprint(candidate, intent);
  if (options.footprintCache && !options.footprintCache.has(normalized(entryName(candidate)))) {
    options.footprintCache.set(normalized(entryName(candidate)), candidateFootprint);
  }
  const candidateSig = footprintSignature(candidate, candidateFootprint);

  // Package cores / support / false friends / legs
  for (const packageSpec of intent.packages || []) {
    const pkg = state.packages[packageSpec.id];
    if (!pkg) continue;
    const isCore = cardSatisfiesPackageCore(candidate, packageSpec.id);
    const isSupport = !isCore && cardSatisfiesPackageSupport(candidate, packageSpec.id);
    const isFalseFriend = (packageSpec.falseFriendSemantics || []).some((tag) => semantics.has(tag))
      && !(packageSpec.coreSemantics || []).some((tag) => semantics.has(tag));
    const coreNeed = `package_core:${packageSpec.id}`;
    const supportNeed = `package_support:${packageSpec.id}`;
    const coreNovelty = incrementalFootprintNovelty(candidateSig, getNeedClosureView(closureMemory, coreNeed, state));
    // Resilience: surplus core that still protects a near-floor package.
    const resilienceCore = pkg.core.surplus >= 0 && pkg.core.current <= (packageSpec.coreMin || 0) + 1;

    if (isCore) {
      const weight = marginalUtility(pkg.core.deficit, pkg.core.surplus, 26, needOptions(
        closureMemory, coreNeed, state, coreNovelty, resilienceCore && pkg.core.deficit <= 0,
      ));
      pushDelta(positives, "package_core", packageSpec.id, weight);
      if (pkg.core.deficit > 0) deficitsFilled.push(coreNeed);
      else surplusIntroduced.push(coreNeed);
      if (pkg.core.deficit <= 0 && coreNovelty >= 0.55) {
        pushDelta(positives, "footprint_novelty", packageSpec.id, round(6 * coreNovelty));
      }
    } else if (isSupport) {
      const supportNovelty = incrementalFootprintNovelty(candidateSig, getNeedClosureView(closureMemory, supportNeed, state));
      const weight = marginalUtility(pkg.support.deficit, pkg.support.surplus, 12, needOptions(
        closureMemory, supportNeed, state, supportNovelty, false,
      ));
      pushDelta(positives, "package_support", packageSpec.id, weight);
      if (pkg.support.deficit > 0) deficitsFilled.push(supportNeed);
      else if (pkg.support.deficit <= 0) surplusIntroduced.push(supportNeed);
    } else if (isFalseFriend) {
      // False friends never fill the precise deficit; punish harder while core is short.
      const penalty = pkg.core.deficit > 0 ? -42 : -12;
      pushDelta(negatives, "false_friend", packageSpec.id, penalty);
    }

    for (const [leg, legState] of Object.entries(pkg.legs || {})) {
      if (!semantics.has(leg)) continue;
      const legNeed = `package_leg:${packageSpec.id}:${leg}`;
      const legNovelty = incrementalFootprintNovelty(candidateSig, getNeedClosureView(closureMemory, legNeed, state));
      const weight = marginalUtility(legState.deficit, legState.surplus, 22, needOptions(
        closureMemory, legNeed, state, legNovelty, false,
      ));
      pushDelta(positives, "package_leg", `${packageSpec.id}:${leg}`, weight);
      if (legState.deficit > 0) deficitsFilled.push(legNeed);
      else surplusIntroduced.push(legNeed);
    }
  }

  // Tracked roles
  const wiring = activeInteractionWiring(
    options.brainPolicy || intent.brainPolicy,
    intent.targetPowerTier ?? options.targetPowerTier,
  );
  for (const role of roles) {
    if (!TRACKED_ROLES.includes(role)) continue;
    const roleState = state.roles[role];
    if (!roleState || roleState.status === "untracked") continue;
    const roleNeed = `role:${role}`;
    const roleNovelty = incrementalFootprintNovelty(candidateSig, getNeedClosureView(closureMemory, roleNeed, state));
    const roleBase = role === "interaction"
      ? (wiring.trackedRoleInteractionBaseWeight ?? 10)
      : 10;
    const weight = marginalUtility(roleState.deficit, roleState.surplus, roleBase, needOptions(
      closureMemory, roleNeed, state, roleNovelty, false,
    ));
    pushDelta(positives, "tracked_role", role, weight);
    if (roleState.deficit > 0) deficitsFilled.push(roleNeed);
    else if (roleState.surplus > 0 || roleState.status === "satisfied") surplusIntroduced.push(roleNeed);
  }

  // Sequence stages
  for (const stage of sequenceStages) {
    const stageState = state.sequence[stage];
    if (!stageState) continue;
    const seqNeed = `sequence:${stage}`;
    const weight = marginalUtility(stageState.deficit, stageState.surplus, 6, needOptions(
      closureMemory, seqNeed, state, 0.4, false,
    ));
    pushDelta(positives, "sequence_stage", stage, weight);
    if (stageState.deficit > 0) deficitsFilled.push(seqNeed);
  }

  // Curve band
  const curveState = state.curve[bucket];
  if (curveState) {
    if (curveState.status === "underfilled") {
      pushDelta(positives, "curve_deficit", bucket, 14 + Math.min(8, curveState.deficit));
      deficitsFilled.push(`curve:${bucket}`);
    } else if (curveState.status === "congested") {
      pushDelta(negatives, "curve_congestion", bucket, -16 - Math.min(10, curveState.surplus));
      surplusIntroduced.push(`curve:${bucket}`);
    } else {
      const curveNeed = `curve:${bucket}`;
      const sat = saturationMultiplier(getNeedClosureView(closureMemory, curveNeed, state), { novelty: 0.3 });
      pushDelta(positives, "curve_band", bucket, round(3 * sat));
    }
  }

  // Commander connection
  if (commanderSignals.length) {
    const need = Math.max(0, 8 - state.commanderConnections);
    const commanderNeed = "commander_connection";
    const commanderNovelty = incrementalFootprintNovelty(candidateSig, getNeedClosureView(closureMemory, commanderNeed, state));
    if (need > 0) {
      pushDelta(positives, "commander_connection", commanderSignals.join(","), 18 + need);
      deficitsFilled.push(commanderNeed);
    } else {
      const weight = marginalUtility(0, Math.max(0, state.commanderConnections - 6), 6, needOptions(
        closureMemory, commanderNeed, state, commanderNovelty, false,
      ));
      pushDelta(positives, "commander_connection", commanderSignals.join(","), weight);
      surplusIntroduced.push(commanderNeed);
    }
  }

  // Interaction partners present / missing
  // Brain v1 control: partnersPresent * 4 (cap 16) / missing * 5 (cap 18).
  // Exp001 raises connected-wiring reward (interactionDensity evidence) without
  // raising role:interaction floors — quality/wiring over raw removal count.
  let partnersPresent = 0;
  let partnersMissing = 0;
  for (const signal of rewards) {
    if ((state.producedSignals[signal] || 0) > 0) partnersPresent += 1;
    else partnersMissing += 1;
  }
  for (const signal of produces) {
    if ((state.rewardedSignals[signal] || 0) > 0) partnersPresent += 1;
  }
  if (partnersPresent) {
    let presentWeight = Math.min(wiring.partnerPresentCap, partnersPresent * wiring.partnerPresentWeight);
    // Multifunction connected pieces beat single-purpose orphans of equal raw count.
    if (wiring.multifunctionConnectedBonus && roles.length >= 2) {
      presentWeight += wiring.multifunctionConnectedBonus;
    }
    if (
      wiring.efficientConnectedCmcBonus
      && cmc <= (wiring.efficientCmcThreshold ?? 2)
    ) {
      presentWeight += wiring.efficientConnectedCmcBonus;
    }
    pushDelta(positives, "interaction_present", `${partnersPresent}`, presentWeight);
  }
  if (partnersMissing) {
    pushDelta(
      negatives,
      "interaction_missing",
      `${partnersMissing}`,
      -Math.min(wiring.partnerMissingCap, partnersMissing * wiring.partnerMissingWeight),
    );
  }

  // Unsupported anchor: high-CMC package/commander piece with no partners, or orphan payoff
  const isPackageCore = (intent.packages || []).some((pkg) => cardSatisfiesPackageCore(candidate, pkg.id));
  const becomesUnsupportedAnchor = (cmc >= 5 && (isPackageCore || commanderSignals.length) && partnersPresent === 0)
    || (rewards.length > 0 && partnersPresent === 0 && produces.length === 0);
  if (becomesUnsupportedAnchor) {
    pushDelta(negatives, "unsupported_anchor", entryName(candidate), -36);
  }
  if (rewards.length > 0 && partnersPresent === 0) {
    // Orphan payoffs are speculative during live fill even if they look thematic.
    pushDelta(negatives, "orphan_payoff", rewards.join(","), -Math.min(28, 12 + rewards.length * 8));
  }

  // Raw power / unsupported high CMC
  const bombLike = semantics.has("bomb_cmc") || cmc >= 10;
  const highCmc = semantics.has("high_cmc_threat") || cmc >= 8;
  const hasFooting = commanderSignals.length > 0 || isPackageCore
    || countSemantic(rows, "reanimation") >= 2
    || countSemantic(rows, "cost_cheat") >= 1
    || countSemantic(rows, "ramp") >= (intent.rampSupportFloor || 8);
  if (bombLike && !hasFooting) {
    pushDelta(negatives, "unsupported_high_cmc", entryName(candidate), -55);
  } else if (highCmc && !hasFooting && !isPackageCore) {
    pushDelta(negatives, "unsupported_high_cmc", entryName(candidate), -24);
  } else if (bombLike && hasFooting) {
    pushDelta(positives, "supported_threat", entryName(candidate), 8);
  }

  // Justification overlap / redundancy with already-selected cards
  let bestOverlap = 0;
  const selectedFootprints = options.selectedFootprints || rows.map((row) => {
    const key = normalized(row.name);
    if (options.footprintCache?.has(key)) return options.footprintCache.get(key);
    const footprint = buildJustificationFootprint(row, intent);
    options.footprintCache?.set?.(key, footprint);
    return footprint;
  });
  for (const footprint of selectedFootprints) {
    const overlap = justificationPreservationScore(candidateFootprint, footprint);
    if (overlap > bestOverlap) bestOverlap = overlap;
  }
  if (bestOverlap >= 0.85 && deficitsFilled.length === 0) {
    pushDelta(negatives, "justification_overlap", round(bestOverlap), -18);
  } else if (bestOverlap >= 0.92 && surplusIntroduced.length) {
    pushDelta(negatives, "justification_overlap", round(bestOverlap), -10);
  }

  // Opportunity cost: filling only saturated needs while material deficits remain
  const openPackageDeficits = Object.values(state.packages).reduce((sum, pkg) => sum + (pkg.core.deficit > 0 ? 1 : 0) + Object.values(pkg.legs || {}).filter((leg) => leg.deficit > 0).length, 0);
  const openRoleDeficits = Object.values(state.roles).filter((role) => role.deficit > 0).length;
  const openDeficits = openPackageDeficits + openRoleDeficits;
  if (openDeficits > 0 && deficitsFilled.length === 0) {
    pushDelta(negatives, "opportunity_cost", "ignores open deficits", -14);
  }

  // Oversupply guardrail: chasing a recently closed need without secondary justification.
  const chasingOversupply = isPrimaryOversupplyChase(deficitsFilled, surplusIntroduced, closureMemory, state);
  const secondaryJustification = partnersPresent > 0
    || roles.filter((role) => TRACKED_ROLES.includes(role) && (state.roles[role]?.deficit || 0) > 0).length > 0
    || commanderSignals.length > 0
    || Number(candidate.score || 0) >= 55;
  const globalNovelty = Math.max(
    0,
    ...surplusIntroduced.map((needKey) => incrementalFootprintNovelty(
      candidateSig,
      getNeedClosureView(closureMemory, needKey, state),
    )),
  );
  if (chasingOversupply) {
    let penalty = -12 - Math.min(16, surplusIntroduced.length * 4);
    if (globalNovelty < 0.35) penalty -= 10;
    if (bestOverlap >= 0.85) penalty -= 8;
    if (openDeficits > 0) penalty -= 8;
    if (secondaryJustification && globalNovelty >= 0.55) penalty = Math.round(penalty * 0.35);
    else if (secondaryJustification) penalty = Math.round(penalty * 0.6);
    pushDelta(negatives, "oversupply_guardrail", surplusIntroduced.join(","), penalty);
  }

  // Budget / power feasibility soft signals
  if (options.budgetConstraint && Number(entryCard(candidate).priceUsd) > 7.5) {
    pushDelta(negatives, "budget_pressure", entryName(candidate), -8);
  }
  if (options.powerConstraint && options.powerSignalCategoryFor?.(entryCard(candidate))) {
    pushDelta(negatives, "power_pressure", entryName(candidate), -10);
  }

  const total = round([...positives, ...negatives].reduce((sum, entry) => sum + entry.weight, 0));
  return Object.freeze({
    version: PROSPECTIVE_DELTA_VERSION,
    name: entryName(candidate),
    total,
    positives: Object.freeze(positives),
    negatives: Object.freeze(negatives),
    deficitsFilled: Object.freeze([...new Set(deficitsFilled)].sort()),
    surplusIntroduced: Object.freeze([...new Set(surplusIntroduced)].sort()),
    falseFriendRisk: negatives.some((entry) => entry.kind === "false_friend"),
    unsupportedAnchorRisk: becomesUnsupportedAnchor,
    unsupportedHighCmcRisk: negatives.some((entry) => entry.kind === "unsupported_high_cmc"),
    overlapRatio: round(bestOverlap),
    curveBand: bucket,
    footprintNovelty: round(globalNovelty || incrementalFootprintNovelty(candidateSig, null)),
    oversupplyGuarded: chasingOversupply,
    footprintSignature: candidateSig,
  });
}

/**
 * Whole-deck strategic delta for replacing cut with add.
 */
export function counterfactualSwapDelta(beforeRows, afterRows, cutEntry, addEntry, intent = {}, options = {}) {
  const beforeState = buildLiveDeficitState(beforeRows, intent, options);
  const afterState = buildLiveDeficitState(afterRows, intent, options);
  const addProspective = prospectiveSlotDelta(
    nonlandRows(beforeRows).filter((row) => normalized(row.name) !== normalized(cutEntry?.name || "")),
    addEntry,
    intent,
    { ...options, deficitState: buildLiveDeficitState(
      nonlandRows(beforeRows).filter((row) => normalized(row.name) !== normalized(cutEntry?.name || "")),
      intent,
      options,
    ) },
  );
  const preservation = justificationPreservationScore(
    buildJustificationFootprint(cutEntry || {}, intent),
    buildJustificationFootprint(addEntry || {}, intent),
  );

  const packageThresholds = [];
  for (const packageSpec of intent.packages || []) {
    const before = beforeState.packages[packageSpec.id]?.core;
    const after = afterState.packages[packageSpec.id]?.core;
    if (!before || !after) continue;
    if (before.current >= before.target && after.current < after.target) {
      packageThresholds.push(Object.freeze({ id: packageSpec.id, kind: "collapsed" }));
    } else if (before.current < before.target && after.current >= after.target) {
      packageThresholds.push(Object.freeze({ id: packageSpec.id, kind: "repaired" }));
    }
  }

  const roleDelta = {};
  for (const role of TRACKED_ROLES) {
    roleDelta[role] = (afterState.roles[role]?.current || 0) - (beforeState.roles[role]?.current || 0);
  }

  let thresholdPenalty = 0;
  for (const change of packageThresholds) {
    thresholdPenalty += change.kind === "collapsed" ? -60 : 28;
  }

  const total = round(addProspective.total * 0.55 + (preservation - 0.5) * 40 + thresholdPenalty);
  return Object.freeze({
    version: PROSPECTIVE_DELTA_VERSION,
    total,
    preservation: round(preservation),
    addProspective,
    packageThresholds: Object.freeze(packageThresholds),
    roleDelta: Object.freeze(roleDelta),
    commanderConnectionDelta: afterState.commanderConnections - beforeState.commanderConnections,
    beforePackageCores: Object.freeze(Object.fromEntries(Object.entries(beforeState.packages).map(([id, pkg]) => [id, pkg.core.current]))),
    afterPackageCores: Object.freeze(Object.fromEntries(Object.entries(afterState.packages).map(([id, pkg]) => [id, pkg.core.current]))),
  });
}
