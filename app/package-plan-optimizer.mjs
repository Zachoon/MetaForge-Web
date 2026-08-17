import {
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  cardIsPackageFalseFriend,
  validateStrategicCohesion,
} from "./strategic-intent.mjs";
import {
  buildJustificationFootprint,
  buildSlotJustification,
  justificationPreservationScore,
} from "./slot-justification-ledger.mjs";
import {
  buildLiveDeficitState,
  prospectiveSlotDelta,
} from "./prospective-slot-delta.mjs";

// =============================================================================
// Package Plan Optimizer
// =============================================================================
// Bounded, deterministic package-level search ABOVE slot machinery.
// Never brute-forces arbitrary subsets of the full pool.
// =============================================================================

export const PACKAGE_PLAN_VERSION = "package-plan-v1";

const DEFAULT_LIMITS = Object.freeze({
  maxConfigs: 24,
  maxRemovals: 3,
  maxAdditions: 3,
  topKPerLeg: 5,
  topKRemovals: 4,
  minAcceptTotal: 12,
});

const TRACKED_ROLES = Object.freeze(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const uniqueSorted = (values = []) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

function nonlandRows(rows = []) {
  return rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
}

function entrySemantics(entry) {
  if (entry?.strategicSemantics instanceof Set) return entry.strategicSemantics;
  if (Array.isArray(entry?.strategicSemantics)) return new Set(entry.strategicSemantics);
  return new Set();
}

function curveBucket(cmc) {
  if (cmc <= 1) return "1";
  if (cmc >= 5) return "5+";
  return String(Math.round(Number(cmc) || 0));
}

function memberKind(entry, packageSpec, intent) {
  if (cardSatisfiesPackageCore(entry, packageSpec.id, intent)) return "core";
  if (cardSatisfiesPackageSupport(entry, packageSpec.id, intent)) return "support";
  if (cardIsPackageFalseFriend(entry, packageSpec.id, intent)) return "falseFriend";
  return null;
}

function legsFor(entry, packageSpec) {
  const semantics = entrySemantics(entry);
  return (packageSpec.requireBalancedLegs || []).filter((leg) => semantics.has(leg));
}

/**
 * Reusable package-state snapshot for one package inside a deck.
 */
export function buildPackageState(rows, packageSpec, intent = {}, options = {}) {
  const nonlands = nonlandRows(rows);
  const members = [];
  for (const row of nonlands) {
    const kind = memberKind(row, packageSpec, intent);
    if (!kind) continue;
    const justification = options.justifications?.byName?.[normalized(row.name)]
      || buildSlotJustification(row, intent, rows);
    members.push(Object.freeze({
      name: row.name,
      quantity: Number(row.quantity || 1),
      kind,
      legs: Object.freeze(legsFor(row, packageSpec)),
      roles: Object.freeze([...(row.roles || [])]),
      cmc: Number(row.cmc || 0),
      commanderConnected: (row.commanderConnectionSignals || []).length > 0,
      strength: justification.strength,
      flags: justification.flags,
      weaklyJustified: justification.flags.weaklyJustified,
      redundant: justification.flags.redundant,
      packageCritical: justification.flags.packageCritical,
      budgetUsd: Number(row.card?.priceUsd ?? options.priceByName?.get?.(normalized(row.name)) ?? 0) || 0,
    }));
  }
  members.sort((a, b) => a.name.localeCompare(b.name));

  const coreMembers = members.filter((entry) => entry.kind === "core");
  const supportMembers = members.filter((entry) => entry.kind === "support");
  const falseFriends = members.filter((entry) => entry.kind === "falseFriend");
  const coreCount = coreMembers.reduce((sum, entry) => sum + entry.quantity, 0);
  const supportCount = supportMembers.reduce((sum, entry) => sum + entry.quantity, 0);

  const legs = {};
  for (const leg of packageSpec.requireBalancedLegs || []) {
    const current = members.reduce((sum, entry) => sum + (entry.legs.includes(leg) ? entry.quantity : 0), 0);
    legs[leg] = Object.freeze({
      current,
      target: packageSpec.legFloor || 0,
      deficit: Math.max(0, (packageSpec.legFloor || 0) - current),
      surplus: Math.max(0, current - (packageSpec.legFloor || 0)),
    });
  }

  const curve = {};
  for (const member of members) {
    const bucket = curveBucket(member.cmc);
    curve[bucket] = (curve[bucket] || 0) + member.quantity;
  }

  const roleCoverage = {};
  for (const role of TRACKED_ROLES) {
    roleCoverage[role] = members.reduce((sum, entry) => sum + (entry.roles.includes(role) ? entry.quantity : 0), 0);
  }

  const produces = new Map();
  const rewards = new Map();
  for (const row of nonlands) {
    if (!members.some((member) => normalized(member.name) === normalized(row.name))) continue;
    for (const signal of row.mechanics?.produces || []) produces.set(signal, (produces.get(signal) || 0) + 1);
    for (const signal of row.mechanics?.rewards || []) rewards.set(signal, (rewards.get(signal) || 0) + 1);
  }
  let interactionEdges = 0;
  for (const [signal, count] of produces) interactionEdges += Math.min(count, rewards.get(signal) || 0);

  return Object.freeze({
    id: packageSpec.id,
    label: packageSpec.label,
    members: Object.freeze(members),
    coreMembers: Object.freeze(coreMembers.map((entry) => entry.name)),
    supportMembers: Object.freeze(supportMembers.map((entry) => entry.name)),
    falseFriends: Object.freeze(falseFriends.map((entry) => entry.name)),
    legs: Object.freeze(legs),
    density: Object.freeze({
      core: coreCount,
      support: supportCount,
      floor: packageSpec.coreMin,
      supportFloor: packageSpec.supportMin,
      surplus: Math.max(0, coreCount - packageSpec.coreMin),
      deficit: Math.max(0, packageSpec.coreMin - coreCount),
    }),
    roleCoverage: Object.freeze(roleCoverage),
    curve: Object.freeze(curve),
    commanderContribution: members.filter((entry) => entry.commanderConnected).length,
    interactionDensity: interactionEdges,
    anchors: Object.freeze(members.filter((entry) => entry.cmc >= 5 || entry.commanderConnected).map((entry) => entry.name)),
    packageCritical: Object.freeze(members.filter((entry) => entry.packageCritical).map((entry) => entry.name)),
    redundancy: members.filter((entry) => entry.redundant).length,
    weaklyJustified: members.filter((entry) => entry.weaklyJustified).length,
    budgetCost: round(members.reduce((sum, entry) => sum + entry.budgetUsd * entry.quantity, 0), 2),
    slotCost: members.reduce((sum, entry) => sum + entry.quantity, 0),
  });
}

// weak_commander_connection used to fire whenever the commander had ANY
// reward category at all (forge-interaction-graph.mjs's PAYOFFS vocabulary
// - tokens, treasure, artifacts, auras, sacrifice, graveyard, spells, lands,
// etb, combat, protection, etc.), regardless of whether that category had
// anything to do with the package being checked. Confirmed on real data:
// Urza's only reward category is "artifacts", but every Urza deck's
// unrelated stax package still got flagged "weak commander connection".
// stax and typal have no corresponding reward category in that vocabulary
// at all (tax/tribal synergy isn't a "whenever X, get Y" pattern), so they
// were structurally guaranteed to almost always false-positive - confirmed
// empirically: 55 of 84 real weak_commander_connection instances across
// affected packages were pure category mismatches (0 of 21 stax, 0 of 8
// typal, 0 of 12 reanimator, 0 of 14 tokens genuinely relevant; only
// spellslinger kept real signal, 13 of 29). Local to this file rather than
// added to PACKAGE_CATALOG in strategic-intent.mjs, which is under active
// concurrent maintenance outside this lane.
const PACKAGE_RELEVANT_REWARDS = Object.freeze({
  auras: Object.freeze(["auras"]),
  equipment: Object.freeze([]),
  aristocrats: Object.freeze(["sacrifice", "tokens"]),
  reanimator: Object.freeze(["graveyard"]),
  tokens: Object.freeze(["tokens", "treasure", "clues", "food", "blood", "gold", "maps", "junk", "powerstones"]),
  landfall: Object.freeze(["lands"]),
  typal: Object.freeze([]),
  spellslinger: Object.freeze(["spells"]),
  blink: Object.freeze(["etb"]),
  stax: Object.freeze([]),
});

/**
 * Machine-readable package health evaluation.
 */
export function evaluatePackageHealth(packageState, intent = {}) {
  const issues = [];
  const packageSpec = (intent.packages || []).find((entry) => entry.id === packageState.id) || packageState;
  if (packageState.density.deficit > 0) issues.push(Object.freeze({ kind: "underfilled", detail: `${packageState.density.core}/${packageState.density.floor}` }));
  // Oversaturation was a flat surplus>=6 regardless of package size, so wide
  // packages like spellslinger (floor 14, real median surplus 7) got
  // penalized just for being naturally large - 337 real decks, 55.5%
  // flagged oversaturated at the old threshold. Scaling the bar to the
  // package's own floor (capped at a floor of 6 so small packages keep a
  // real bar) fixes that without hardcoding any package by name. Harness-
  // verified 2026-08-17: 112/112 regression tests, smoke 13/13, field mode
  // 0 hard failures (two independent runs, matching results).
  if (packageState.density.surplus >= Math.max(6, packageSpec.coreMin || 0)) issues.push(Object.freeze({ kind: "oversaturated", detail: `surplus ${packageState.density.surplus}` }));
  for (const [leg, state] of Object.entries(packageState.legs || {})) {
    if (state.deficit > 0) issues.push(Object.freeze({ kind: "missing_leg", detail: leg }));
  }
  const legValues = Object.values(packageState.legs || {});
  if (legValues.length >= 2) {
    const max = Math.max(...legValues.map((leg) => leg.current));
    const min = Math.min(...legValues.map((leg) => leg.current));
    if (max >= min * 3 && max - min >= 3) issues.push(Object.freeze({ kind: "poor_enabler_payoff_ratio", detail: `${min}:${max}` }));
  }
  if (packageState.anchors.length && packageState.interactionDensity === 0) {
    issues.push(Object.freeze({ kind: "unsupported_anchor", detail: packageState.anchors[0] }));
  }
  if (packageState.redundancy >= 3) issues.push(Object.freeze({ kind: "excessive_redundancy", detail: `${packageState.redundancy}` }));
  const relevantRewards = PACKAGE_RELEVANT_REWARDS[packageState.id] || [];
  const hasRelevantCommanderReward = (intent.commanderMechanics?.rewards || []).some((reward) => relevantRewards.includes(reward));
  if (packageState.commanderContribution === 0 && hasRelevantCommanderReward) {
    issues.push(Object.freeze({ kind: "weak_commander_connection", detail: "0 connected members" }));
  }
  // The flat slotCost>=28 bar sat at roughly the 65th percentile of real
  // spellslinger decks (floor 14, real p90 slotCost ~35), so over a third
  // of ordinary real spellslinger decks were flagged "wasting slots" for
  // running a normal amount of spells - 121 of 124 total real
  // slot_inefficient instances this session's diagnostics found were
  // spellslinger. Scaling to the package's own floor (capped at the
  // original 28 so small packages keep a real bar) keeps this a genuinely
  // rare, extreme-tail signal instead of a common false positive.
  if (packageState.slotCost >= Math.max(28, Math.ceil((packageSpec.coreMin || 0) * 2.5)) && packageState.density.surplus >= 8) {
    issues.push(Object.freeze({ kind: "slot_inefficient", detail: `${packageState.slotCost} slots` }));
  }
  const highCurve = (packageState.curve["5+"] || 0);
  if (highCurve >= Math.max(4, Math.ceil(packageState.slotCost * 0.45))) {
    issues.push(Object.freeze({ kind: "curve_conflict", detail: `${highCurve} high-CMC members` }));
  }
  if (packageState.weaklyJustified >= 3) {
    issues.push(Object.freeze({ kind: "collective_duplication", detail: `${packageState.weaklyJustified} weak members` }));
  }

  const severity = issues.reduce((sum, issue) => {
    if (issue.kind === "underfilled" || issue.kind === "missing_leg") return sum + 18;
    if (issue.kind === "poor_enabler_payoff_ratio") return sum + 14;
    if (issue.kind === "unsupported_anchor") return sum + 12;
    return sum + 8;
  }, 0);
  const score = Math.max(0, 100 - severity);
  return Object.freeze({
    id: packageState.id,
    score,
    status: issues.length === 0 ? "healthy" : score >= 70 ? "strained" : "unhealthy",
    issues: Object.freeze(issues),
  });
}

function applyPackageEdit(rows, removeNames, addEntries) {
  const remove = new Map();
  for (const name of removeNames) remove.set(normalized(name), (remove.get(normalized(name)) || 0) + 1);
  const next = [];
  for (const row of rows) {
    const key = normalized(row.name);
    const cut = remove.get(key) || 0;
    if (!cut) {
      next.push({ ...row });
      continue;
    }
    const quantity = Number(row.quantity || 1) - cut;
    remove.set(key, 0);
    if (quantity > 0) next.push({ ...row, quantity });
  }
  for (const entry of addEntries) {
    const key = normalized(entry.name || entry.card?.name);
    const existing = next.find((row) => normalized(row.name) === key);
    if (existing) existing.quantity += 1;
    else {
      next.push({
        quantity: 1,
        name: entry.card?.name || entry.name,
        roles: entry.roles || [],
        cmc: entry.cmc,
        strategicSemantics: entry.strategicSemantics,
        mechanics: entry.mechanics,
        commanderConnectionSignals: entry.commanderConnectionSignals || [],
        sequenceStages: entry.sequenceStages || [],
        colorPips: entry.colorPips,
        score: entry.score || entry.roleScore || 0,
      });
    }
  }
  return next;
}

function setInteractionScore(addEntries, remainingRows) {
  const produces = new Set();
  const rewards = new Set();
  for (const entry of addEntries) {
    for (const signal of entry.mechanics?.produces || []) produces.add(signal);
    for (const signal of entry.mechanics?.rewards || []) rewards.add(signal);
  }
  let internal = 0;
  for (const signal of produces) if (rewards.has(signal)) internal += 1;
  let external = 0;
  for (const row of remainingRows) {
    for (const signal of row.mechanics?.produces || []) if (rewards.has(signal)) external += 1;
    for (const signal of row.mechanics?.rewards || []) if (produces.has(signal)) external += 1;
  }
  return { internal, external, total: internal * 8 + Math.min(24, external * 2) };
}

/**
 * Whole-deck package counterfactual. Not a sum of independent slot deltas.
 */
export function counterfactualPackageDelta(currentRows, removeSet, addSet, intent = {}, options = {}) {
  const removeNames = removeSet.map((entry) => entry.name || entry);
  const afterRows = applyPackageEdit(currentRows, removeNames, addSet);
  const beforeState = buildLiveDeficitState(currentRows, intent, options);
  const afterState = buildLiveDeficitState(afterRows, intent, options);
  const beforeHealth = {};
  const afterHealth = {};
  for (const packageSpec of intent.packages || []) {
    const beforePkg = buildPackageState(currentRows, packageSpec, intent, options);
    const afterPkg = buildPackageState(afterRows, packageSpec, intent, options);
    beforeHealth[packageSpec.id] = evaluatePackageHealth(beforePkg, intent);
    afterHealth[packageSpec.id] = evaluatePackageHealth(afterPkg, intent);
  }

  const remainingAfterCuts = nonlandRows(currentRows).filter((row) => !removeNames.some((name) => normalized(name) === normalized(row.name)));
  const setSynergy = setInteractionScore(addSet, remainingAfterCuts);

  // Individual deltas are diagnostic only — package score uses set synergy.
  const individualSum = addSet.reduce((sum, entry) => {
    const delta = prospectiveSlotDelta(remainingAfterCuts, entry, intent, options);
    return sum + delta.total;
  }, 0);

  let healthDelta = 0;
  for (const id of Object.keys(afterHealth)) {
    healthDelta += (afterHealth[id].score - (beforeHealth[id]?.score || 0));
  }

  let thresholdDelta = 0;
  for (const packageSpec of intent.packages || []) {
    const before = beforeState.packages[packageSpec.id]?.core;
    const after = afterState.packages[packageSpec.id]?.core;
    if (!before || !after) continue;
    if (before.current >= before.target && after.current < after.target) thresholdDelta -= 70;
    if (before.current < before.target && after.current >= after.target) thresholdDelta += 30;
    for (const leg of packageSpec.requireBalancedLegs || []) {
      const beforeLeg = beforeState.packages[packageSpec.id]?.legs?.[leg];
      const afterLeg = afterState.packages[packageSpec.id]?.legs?.[leg];
      if (beforeLeg && afterLeg && beforeLeg.deficit > 0 && afterLeg.deficit === 0) thresholdDelta += 18;
    }
  }

  const beforeCurvePenalty = Object.values(beforeState.curve || {}).filter((band) => band.status === "congested").length;
  const afterCurvePenalty = Object.values(afterState.curve || {}).filter((band) => band.status === "congested").length;
  const curveDelta = (beforeCurvePenalty - afterCurvePenalty) * 10;

  const commanderDelta = (afterState.commanderConnections - beforeState.commanderConnections) * 4;

  let budgetDelta = 0;
  if (options.budgetConstraint) {
    const price = (entry) => Number(entry.card?.priceUsd ?? entry.priceUsd ?? 0) || 0;
    const removedCost = removeSet.reduce((sum, entry) => sum + price(entry), 0);
    const addedCost = addSet.reduce((sum, entry) => sum + price(entry), 0);
    budgetDelta = (removedCost - addedCost) * 0.4;
    if (addedCost > removedCost + 15) budgetDelta -= 20;
  }

  let powerDelta = 0;
  if (options.powerConstraint && options.powerSignalCategoryFor) {
    const addedPower = addSet.filter((entry) => options.powerSignalCategoryFor(entry.card || entry)).length;
    const removedPower = removeSet.filter((entry) => options.powerSignalCategoryFor(entry.card || entry)).length;
    powerDelta = (removedPower - addedPower) * 12;
  }

  // Critical protection: never reward destroying package-critical members
  // unless the add set restores the same package floor.
  const criticalCuts = removeSet.filter((entry) => {
    const row = nonlandRows(currentRows).find((item) => normalized(item.name) === normalized(entry.name || entry));
    return row && (intent.packages || []).some((pkg) => {
      const state = buildPackageState(currentRows, pkg, intent, options);
      return state.packageCritical.includes(row.name);
    });
  });
  let criticalPenalty = 0;
  if (criticalCuts.length) {
    const collapsed = (intent.packages || []).some((pkg) => {
      const before = beforeState.packages[pkg.id]?.core;
      const after = afterState.packages[pkg.id]?.core;
      return before && after && before.current >= before.target && after.current < after.target;
    });
    if (collapsed) criticalPenalty = -80;
  }

  const total = round(
    healthDelta * 0.9
    + setSynergy.total
    + thresholdDelta
    + curveDelta
    + commanderDelta
    + budgetDelta
    + powerDelta
    + criticalPenalty
    + individualSum * 0.08,
  );

  return Object.freeze({
    version: PACKAGE_PLAN_VERSION,
    total,
    healthDelta: round(healthDelta),
    setSynergy: Object.freeze(setSynergy),
    individualSum: round(individualSum),
    thresholdDelta,
    curveDelta,
    commanderDelta,
    budgetDelta: round(budgetDelta),
    powerDelta,
    criticalPenalty,
    beforeHealth: Object.freeze(beforeHealth),
    afterHealth: Object.freeze(afterHealth),
    afterRows,
    removeNames: Object.freeze(uniqueSorted(removeNames)),
    addNames: Object.freeze(uniqueSorted(addSet.map((entry) => entry.card?.name || entry.name))),
  });
}

function rankedLegCandidates(pool, packageSpec, leg, deckNames, limit, intent) {
  return pool
    .filter((entry) => !deckNames.has(normalized(entry.card?.name || entry.name)))
    .filter((entry) => entrySemantics(entry).has(leg) || (leg === "core" && cardSatisfiesPackageCore(entry, packageSpec.id, intent)))
    .sort((left, right) => (right.score || right.roleScore || 0) - (left.score || left.roleScore || 0) || (left.card?.name || left.name).localeCompare(right.card?.name || right.name))
    .slice(0, limit);
}

function removableMembers(packageState, packageSpec, limit) {
  // Prefer weakly justified / redundant / surplus-leg members; never cut
  // below floors when that would collapse the package.
  return [...packageState.members]
    .filter((member) => member.kind === "core" || member.kind === "support")
    .sort((left, right) =>
      Number(right.weaklyJustified) - Number(left.weaklyJustified)
      || Number(right.redundant) - Number(left.redundant)
      || left.strength - right.strength
      || left.name.localeCompare(right.name))
    .filter((member) => {
      if (member.packageCritical && packageState.density.core <= packageSpec.coreMin) return false;
      return true;
    })
    .slice(0, limit);
}

function combinations(list, size) {
  if (size <= 0) return [[]];
  if (size > list.length) return [];
  const out = [];
  const walk = (start, chosen) => {
    if (chosen.length === size) {
      out.push([...chosen]);
      return;
    }
    for (let index = start; index < list.length; index += 1) {
      chosen.push(list[index]);
      walk(index + 1, chosen);
      chosen.pop();
      if (out.length >= 48) return;
    }
  };
  walk(0, []);
  return out;
}

/**
 * Bounded deterministic package search + rebalance.
 */
export function optimizePackagePlan(candidate, analysis, input = {}, options = {}) {
  const started = Date.now();
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const intent = analysis.strategicIntent || candidate.strategicIntent;
  const instrumentation = {
    alternativesConsidered: 0,
    candidatesPruned: 0,
    configsEvaluated: 0,
    runtimeMs: 0,
  };
  if (!intent?.packages?.length) {
    instrumentation.runtimeMs = Date.now() - started;
    return {
      ...candidate,
      packagePlanOptimization: Object.freeze({
        version: PACKAGE_PLAN_VERSION,
        applied: false,
        reason: "no-active-packages",
        instrumentation: Object.freeze(instrumentation),
      }),
    };
  }

  const pool = analysis.spells || analysis.cards || [];
  const priceByName = new Map((input.cards || []).filter((card) => Number.isFinite(card.priceUsd)).map((card) => [normalized(card.name), card.priceUsd]));
  const justifications = candidate.slotJustificationLedger || null;
  const roleTargets = intent.roleTargets || {};
  const evalOptions = {
    roleTargets,
    priceByName,
    justifications,
    budgetConstraint: input.budget === "Budget conscious",
    powerConstraint: input.targetPowerTier === "Casual",
    powerSignalCategoryFor: options.powerSignalCategoryFor,
  };

  const proposals = [];
  const deckNames = new Set(candidate.rows.map((row) => normalized(row.name)));

  for (const packageSpec of intent.packages) {
    const state = buildPackageState(candidate.rows, packageSpec, intent, evalOptions);
    const health = evaluatePackageHealth(state, intent);
    if (health.status === "healthy" && state.density.surplus < 4) continue;

    const removals = removableMembers(state, packageSpec, limits.topKRemovals);
    const additionPools = [];
    for (const [leg, legState] of Object.entries(state.legs)) {
      if (legState.deficit <= 0 && health.issues.every((issue) => issue.kind !== "poor_enabler_payoff_ratio")) continue;
      const preferLeg = legState.deficit > 0 || (health.issues.some((issue) => issue.kind === "poor_enabler_payoff_ratio") && legState.current === Math.min(...Object.values(state.legs).map((entry) => entry.current)));
      if (!preferLeg) continue;
      additionPools.push({
        leg,
        candidates: rankedLegCandidates(pool, packageSpec, leg, deckNames, limits.topKPerLeg, intent),
      });
    }
    if (!additionPools.length && state.density.deficit > 0) {
      additionPools.push({
        leg: "core",
        candidates: pool
          .filter((entry) => !deckNames.has(normalized(entry.card.name)) && cardSatisfiesPackageCore(entry, packageSpec.id, intent))
          .sort((left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name))
          .slice(0, limits.topKPerLeg),
      });
    }

    // Rebalance: cut surplus/redundant, add missing legs — size-matched.
    for (const poolEntry of additionPools) {
      const addChoices = poolEntry.candidates.slice(0, limits.maxAdditions);
      instrumentation.alternativesConsidered += addChoices.length;
      for (let size = 1; size <= Math.min(limits.maxRemovals, limits.maxAdditions, removals.length, addChoices.length); size += 1) {
        const removalCombos = combinations(removals, size);
        const addCombos = combinations(addChoices, size);
        for (const removeCombo of removalCombos) {
          for (const addCombo of addCombos) {
            if (proposals.length + instrumentation.configsEvaluated >= limits.maxConfigs * 2) {
              instrumentation.candidatesPruned += 1;
              continue;
            }
            // Protect critical members unless an add restores same package core.
            if (removeCombo.some((member) => member.packageCritical)
              && !addCombo.some((entry) => cardSatisfiesPackageCore(entry, packageSpec.id, intent))) {
              instrumentation.candidatesPruned += 1;
              continue;
            }
            proposals.push({
              kind: "rebalance",
              packageId: packageSpec.id,
              removeSet: removeCombo.map((member) => candidate.rows.find((row) => normalized(row.name) === normalized(member.name))).filter(Boolean),
              addSet: addCombo,
            });
          }
        }
      }
    }

    // Contraction-only for oversaturated packages: drop weak surplus members.
    if (state.density.surplus >= 4) {
      for (const size of [1, 2]) {
        for (const removeCombo of combinations(removals, size)) {
          if (state.density.core - size < packageSpec.coreMin) {
            instrumentation.candidatesPruned += 1;
            continue;
          }
          if (removeCombo.some((member) => member.packageCritical)) {
            instrumentation.candidatesPruned += 1;
            continue;
          }
          proposals.push({
            kind: "contract",
            packageId: packageSpec.id,
            removeSet: removeCombo.map((member) => candidate.rows.find((row) => normalized(row.name) === normalized(member.name))).filter(Boolean),
            addSet: [],
          });
        }
      }
    }
  }

  // Supporting-plan competition: compare secondary packages that are in the
  // catalog but not primary, using role/package evidence from the pool.
  const primaryIds = new Set(intent.packages.map((entry) => entry.id));
  const secondary = (analysis.strategicIntent?.packages || []).filter((entry) => !primaryIds.has(entry.id));
  // If blueprint requested multiple mechanics, packages already listed. For
  // true alternatives we look at pool-supported catalog packages with enough
  // candidates that are NOT already active.
  void secondary;

  // Deterministic prune to maxConfigs by a cheap heuristic before expensive eval.
  const prelim = proposals
    .map((proposal, index) => ({
      proposal,
      index,
      heuristic: proposal.addSet.length * 3 + proposal.removeSet.filter((entry) => entry).length
        + (proposal.kind === "rebalance" ? 5 : 0),
    }))
    .sort((left, right) => right.heuristic - left.heuristic || left.index - right.index)
    .slice(0, limits.maxConfigs);
  instrumentation.candidatesPruned += Math.max(0, proposals.length - prelim.length);

  let best = null;
  for (const { proposal } of prelim) {
    const delta = counterfactualPackageDelta(candidate.rows, proposal.removeSet, proposal.addSet, intent, evalOptions);
    instrumentation.configsEvaluated += 1;
    // Cohesion must not regress to failed when it previously passed.
    const cohesion = validateStrategicCohesion({ rows: delta.afterRows }, intent, options.cohesionOptions || {});
    if (candidate.strategicCohesionGate?.passed && !cohesion.passed) {
      instrumentation.candidatesPruned += 1;
      continue;
    }
    if (delta.total < limits.minAcceptTotal) {
      instrumentation.candidatesPruned += 1;
      continue;
    }
    if (!best || delta.total > best.delta.total || (delta.total === best.delta.total && proposal.packageId.localeCompare(best.proposal.packageId) < 0)) {
      best = { proposal, delta, cohesion };
    }
  }

  instrumentation.runtimeMs = Date.now() - started;
  if (!best) {
    return {
      ...candidate,
      packagePlanOptimization: Object.freeze({
        version: PACKAGE_PLAN_VERSION,
        applied: false,
        reason: "no-improving-bounded-config",
        instrumentation: Object.freeze(instrumentation),
      }),
    };
  }

  const rows = best.delta.afterRows;
  return {
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    strategicCohesionGate: best.cohesion,
    packagePlanOptimization: Object.freeze({
      version: PACKAGE_PLAN_VERSION,
      applied: true,
      kind: best.proposal.kind,
      packageId: best.proposal.packageId,
      removed: best.delta.removeNames,
      added: best.delta.addNames,
      deltaTotal: best.delta.total,
      setSynergy: best.delta.setSynergy,
      instrumentation: Object.freeze(instrumentation),
    }),
  };
}
