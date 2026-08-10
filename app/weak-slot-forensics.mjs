// =============================================================================
// Weak-Slot Forensics (Final Weak Justification)
// =============================================================================
// Diagnostic-first tooling: explain why weaklyJustified final slots survived,
// distinguish avoidable vs constraint-forced weakness, and attribute source/
// phase. Observational by default — does not change construction weights.
// =============================================================================

import {
  counterfactualSwapDelta,
} from "./prospective-slot-delta.mjs";
import {
  buildSlotJustification,
} from "./slot-justification-ledger.mjs";

export const WEAK_SLOT_FORENSICS_VERSION = "weak-slot-forensics-v1";

export const WEAK_SLOT_CAUSAL_CLASSES = Object.freeze([
  "weak_at_selection",
  "became_weak_downstream",
  "redundant_at_finish",
  "repair_degraded_slot",
  "refill_degraded_slot",
  "package_optimizer_degraded_slot",
  "plan_drift_survivor",
  "no_better_candidate_available",
  "raw_score_leak",
  "interaction_graph_undervaluation",
  "ledger_false_negative",
  "constraint_forced_compromise",
  "ambiguous",
]);

const TRACKED_ROLES = Object.freeze(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);
const CORE_ROLES = TRACKED_ROLES;

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const freeze = (value) => Object.freeze(value);

const DEFAULT_ALTERNATIVE_CAP = 28;
const MATERIAL_JUSTIFICATION_GAIN = 8;
const WEAK_AT_SELECTION_PROSPECTIVE = 12;
const RAW_SCORE_LEAK_FLOOR = 38;

function isLand(row) {
  return (row.roles || []).includes("land");
}
function isCommander(row) {
  return (row.roles || []).includes("commander");
}

function roleTargets(format, strategy) {
  const commander = format === "Commander" || format === "Brawl";
  const scale = commander ? 1 : 0.55;
  const control = /Control/i.test(strategy || "");
  return {
    ramp: Math.round(10 * scale),
    draw: Math.round(10 * scale),
    interaction: Math.round((control ? 13 : 10) * scale),
    protection: Math.round(5 * scale),
    recursion: Math.round(4 * scale),
    sweeper: Math.round((control ? 4 : 2) * scale),
  };
}

function connectivityShare(nonlands, nonlandCount) {
  const producerCounts = new Map();
  const payoffCounts = new Map();
  for (const row of nonlands) {
    const mechanics = row.mechanics || { produces: [], rewards: [] };
    for (const signal of mechanics.produces || []) producerCounts.set(signal, (producerCounts.get(signal) || 0) + 1);
    for (const signal of mechanics.rewards || []) payoffCounts.set(signal, (payoffCounts.get(signal) || 0) + 1);
  }
  let connectedQuantity = 0;
  for (const row of nonlands) {
    const mechanics = row.mechanics || { produces: [], rewards: [] };
    const rewardConnected = (mechanics.rewards || []).some((signal) =>
      (producerCounts.get(signal) || 0) - ((mechanics.produces || []).includes(signal) ? 1 : 0) > 0);
    const produceConnected = (mechanics.produces || []).some((signal) =>
      (payoffCounts.get(signal) || 0) - ((mechanics.rewards || []).includes(signal) ? 1 : 0) > 0);
    if (rewardConnected || produceConnected) connectedQuantity += Number(row.quantity || 1);
  }
  return connectedQuantity / Math.max(1, nonlandCount);
}

function evaluateStructure(rows, options = {}) {
  const nonlands = rows.filter((row) => !isLand(row) && !isCommander(row));
  const nonlandCount = Math.max(1, nonlands.reduce((sum, row) => sum + Number(row.quantity || 0), 0));
  const counts = Object.fromEntries(CORE_ROLES.map((role) => [role, 0]));
  for (const row of nonlands) {
    for (const role of row.roles || []) {
      if (role in counts) counts[role] += Number(row.quantity || 1);
    }
  }
  const targets = roleTargets(options.format, options.strategy);
  const roleCoverage = Object.entries(targets).reduce(
    (sum, [role, target]) => sum + Math.min(1, counts[role] / Math.max(1, target)),
    0,
  ) / Object.keys(targets).length;
  const multiRoleDensity = nonlands
    .filter((row) => (row.roles || []).filter((role) => CORE_ROLES.includes(role)).length >= 2)
    .reduce((sum, row) => sum + Number(row.quantity || 1), 0) / nonlandCount;
  const averageCmc = nonlands.reduce((sum, row) => sum + Number(row.cmc || 0) * Number(row.quantity || 1), 0) / nonlandCount;
  const curveIdeal = /Aggressive|Tempo/i.test(options.strategy || "") ? 2.5
    : /Control/i.test(options.strategy || "") ? 3.3
      : 3;
  const curveHealth = Math.min(100, Math.max(0, 100 - Math.abs(averageCmc - curveIdeal) * 24));
  const resilienceDensity = (counts.interaction + counts.protection + counts.recursion) / nonlandCount;
  const cohesion = connectivityShare(nonlands, nonlandCount);
  const score = roleCoverage * 50 + multiRoleDensity * 18 + curveHealth * 0.2
    + Math.min(100, Math.max(0, resilienceDensity * 100)) * 0.12
    + Math.min(100, Math.max(0, cohesion * 100)) * 0.1;
  return {
    score: round(score),
    roleCoverage: round(roleCoverage),
    multiRoleDensity: round(multiRoleDensity),
    averageCmc: round(averageCmc, 2),
    curveHealth: round(curveHealth),
    resilienceDensity: round(resilienceDensity),
    cohesion: round(cohesion),
    roles: counts,
  };
}

function applyOneSlot(rows, cutName, addRow) {
  const next = rows.map((row) => ({ ...row, roles: [...(row.roles || [])] }));
  const cut = next.find((row) => normalized(row.name) === normalized(cutName));
  if (!cut || isLand(cut) || isCommander(cut)) return null;
  cut.quantity -= 1;
  const existing = next.find((row) => normalized(row.name) === normalized(addRow.name));
  if (existing) existing.quantity += 1;
  else next.push({ ...addRow, quantity: 1, roles: [...(addRow.roles || [])] });
  return next.filter((row) => Number(row.quantity || 0) > 0);
}

function gateSwap(rows, before, after, delta, options = {}) {
  const reasons = [];
  const expected = Number(options.target || rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0));
  const actual = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  if (actual !== expected) reasons.push("deck_size_changed");
  if (delta.roleCoverage < -0.005) reasons.push("role_coverage_regressed");
  if (delta.curveHealth < -2) reasons.push("curve_regressed");
  if (delta.resilienceDensity < -0.015) reasons.push("resilience_regressed");
  if (delta.cohesion < -0.03) reasons.push("cohesion_regressed");
  const nonlandCount = rows.filter((row) => !isLand(row) && !isCommander(row))
    .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const scoreFloor = 0.35 * (36 / Math.max(1, nonlandCount));
  if (delta.score < scoreFloor) reasons.push("structural_gain_too_small");
  return { passed: reasons.length === 0, reasons, scoreFloor: round(scoreFloor) };
}

/**
 * Convert an analysis.spells pool entry (or scored candidate) into a deck row.
 */
export function poolEntryToRow(entry) {
  if (!entry) return null;
  if (entry.card) {
    return {
      quantity: 1,
      name: entry.card.name,
      roles: [...(entry.roles || [])],
      score: Number(entry.score || 0),
      cmc: Number(entry.cmc ?? entry.card.cmc ?? 0),
      directTribes: [...(entry.directTribes || [])],
      tribalSupport: [...(entry.tribalSupport || [])],
      identityHits: [...(entry.identityHits || [])],
      blueprintRoleHits: [...(entry.blueprintRoleHits || [])],
      blueprintMechanicHits: [...(entry.blueprintMechanicHits || [])],
      commanderConnectionSignals: [...(entry.commanderConnectionSignals || [])],
      sequenceStages: [...(entry.sequenceStages || [])],
      strategicSemantics: entry.strategicSemantics,
      mechanics: entry.mechanics || { produces: [], rewards: [] },
      colorPips: entry.colorPips,
      manaCost: entry.card.manaCost || entry.card.mana_cost || "",
    };
  }
  return {
    quantity: 1,
    name: entry.name,
    roles: [...(entry.roles || [])],
    score: Number(entry.score || 0),
    cmc: Number(entry.cmc || 0),
    directTribes: [...(entry.directTribes || [])],
    tribalSupport: [...(entry.tribalSupport || [])],
    identityHits: [...(entry.identityHits || [])],
    blueprintRoleHits: [...(entry.blueprintRoleHits || [])],
    blueprintMechanicHits: [...(entry.blueprintMechanicHits || [])],
    commanderConnectionSignals: [...(entry.commanderConnectionSignals || [])],
    sequenceStages: [...(entry.sequenceStages || [])],
    strategicSemantics: entry.strategicSemantics,
    mechanics: entry.mechanics || { produces: [], rewards: [] },
    colorPips: entry.colorPips,
    manaCost: entry.manaCost || "",
  };
}

function entryName(entry) {
  return entry?.card?.name || entry?.name || "";
}

function sharesRoleOrPackage(weakSlot, entry, intent) {
  const weakRoles = new Set(weakSlot.roles || []);
  const entryRoles = entry.roles || [];
  if (entryRoles.some((role) => weakRoles.has(role) && TRACKED_ROLES.includes(role))) return true;
  const weakPackages = new Set([
    ...(weakSlot.footprint?.packageCore || []),
    ...(weakSlot.footprint?.packageSupport || []),
  ]);
  if (!weakPackages.size) return entryRoles.some((role) => TRACKED_ROLES.includes(role));
  for (const packageSpec of intent?.packages || []) {
    if (!weakPackages.has(packageSpec.id)) continue;
    const semantics = entry.strategicSemantics instanceof Set
      ? entry.strategicSemantics
      : new Set(entry.strategicSemantics || []);
    const core = new Set(packageSpec.coreSemantics || []);
    const support = new Set(packageSpec.supportSemantics || []);
    for (const tag of semantics) {
      if (core.has(tag) || support.has(tag)) return true;
    }
  }
  return false;
}

function findTracePick(selfEvaluation, nameKey, constructionTrace = null) {
  const picks = selfEvaluation?.picks?.length
    ? selfEvaluation.picks
    : (constructionTrace?.picks || []);
  // Prefer surviving live-construction belief over post-construction additions.
  const survivors = picks.filter((pick) =>
    pick.nameKey === nameKey
    && !String(pick.outcome?.mutation || "").startsWith("removed_"));
  if (!survivors.length) return picks.find((pick) => pick.nameKey === nameKey) || null;
  const withIndex = survivors.filter((pick) => pick.pickIndex != null);
  if (withIndex.length) {
    return withIndex.sort((a, b) => a.pickIndex - b.pickIndex)[0];
  }
  return survivors[0];
}

function survivalPathFor(pick) {
  if (!pick) return "unknown_untraced";
  const addedBy = pick.outcome?.addedBy || null;
  if (addedBy === "added_budget_repair") return "budget_repair";
  if (addedBy === "added_power_repair") return "power_repair";
  if (addedBy === "added_package_optimization") return "package_optimization";
  if (addedBy === "added_weak_slot_repair") return "weak_slot_repair";
  if (pick.source === "post_construction_addition") {
    if (String(pick.outcome?.mutation || "").includes("budget")) return "budget_repair";
    if (String(pick.outcome?.mutation || "").includes("power")) return "power_repair";
    if (String(pick.outcome?.mutation || "").includes("package")) return "package_optimization";
    if (String(pick.outcome?.mutation || "").includes("weak_slot")) return "weak_slot_repair";
    return "post_construction_addition";
  }
  if (pick.source === "preset") return "preset";
  if (pick.source === "anchor") return "anchor_reservation";
  if (pick.source === "live_fill") return "live_fill";
  if (pick.source === "refill") return "refill";
  return pick.source || "unknown";
}

function sourceBucket(survivalPath, pick) {
  if (survivalPath === "budget_repair") return "budget_repair";
  if (survivalPath === "power_repair") return "power_repair";
  if (survivalPath === "package_optimization") return "package_optimization";
  if (survivalPath === "refill") return "refill";
  if (survivalPath === "preset") return "preset_import";
  if (survivalPath === "anchor_reservation") return "anchor_reservation";
  if (survivalPath === "live_fill") return "live_fill";
  if (pick?.source === "live_fill") return "live_fill";
  return "unknown";
}

/**
 * Bounded final-slot counterfactual: does a realistically eligible alternative
 * materially improve this weak slot without damaging structural floors?
 */
export function runWeakSlotCounterfactual(candidate, weakSlot, poolEntries = [], options = {}) {
  const intent = options.intent || candidate.strategicIntent || {};
  const rows = candidate.rows || [];
  const present = new Set(
    rows.filter((row) => !isLand(row) && !isCommander(row)).map((row) => normalized(row.name)),
  );
  const cap = Number(options.alternativeCap) || DEFAULT_ALTERNATIVE_CAP;
  const before = evaluateStructure(rows, options);
  const weakRow = rows.find((row) => normalized(row.name) === normalized(weakSlot.name));
  if (!weakRow) {
    return freeze({
      replacementAvailable: false,
      bestAlternative: null,
      wholeDeckDelta: null,
      justificationGain: 0,
      structuralTradeoffs: freeze([]),
      constraintForced: true,
      candidateDepth: 0,
      betterAlternativesAvailable: 0,
      evaluated: 0,
      note: "weak_row_missing",
    });
  }

  const roleOrPackagePool = poolEntries
    .map((entry) => ({ entry, row: poolEntryToRow(entry) }))
    .filter(({ row }) => row && row.name && !present.has(normalized(row.name)))
    .filter(({ entry }) => {
      if (typeof options.isForbiddenAdd === "function" && options.isForbiddenAdd(entry, poolEntryToRow(entry))) {
        return false;
      }
      return true;
    })
    .filter(({ entry, row }) => sharesRoleOrPackage(weakSlot, entry.card ? entry : row, intent)
      || (row.commanderConnectionSignals || []).length > 0);

  const candidateDepth = roleOrPackagePool.length;
  const shortlist = [...roleOrPackagePool]
    .sort((left, right) =>
      Number(right.entry.score || right.row.score || 0) - Number(left.entry.score || left.row.score || 0)
      || left.row.name.localeCompare(right.row.name))
    .slice(0, cap);

  let best = null;
  let betterAlternativesAvailable = 0;
  const constrainedReasons = new Map();

  for (const { row: addRow } of shortlist) {
    const afterRows = applyOneSlot(rows, weakSlot.name, addRow);
    if (!afterRows) continue;
    const after = evaluateStructure(afterRows, options);
    const delta = {
      score: round(after.score - before.score),
      roleCoverage: round(after.roleCoverage - before.roleCoverage),
      multiRoleDensity: round(after.multiRoleDensity - before.multiRoleDensity),
      curveHealth: round(after.curveHealth - before.curveHealth),
      resilienceDensity: round(after.resilienceDensity - before.resilienceDensity),
      cohesion: round(after.cohesion - before.cohesion),
    };
    const strategicDelta = counterfactualSwapDelta(rows, afterRows, weakRow, addRow, intent, {
      roleTargets: roleTargets(options.format, options.strategy),
    });
    const gate = gateSwap(afterRows, before, after, delta, options);
    if ((strategicDelta.packageThresholds || []).some((change) => change.kind === "collapsed")) {
      gate.passed = false;
      gate.reasons = [...new Set([...gate.reasons, "package_floor_collapsed"])];
    }
    const altJustification = buildSlotJustification(addRow, intent, afterRows, {
      budgetConstraint: options.budgetConstraint,
      powerConstraint: options.powerConstraint,
    });
    const justificationGain = round(altJustification.strength - Number(weakSlot.strength || 0));
    const escapesWeak = Number(weakSlot.strength || 0) < 18 && altJustification.strength >= 18;
    // Weak-slot forensics may accept a justification-led upgrade even when the
    // generic one-slot structural score delta is tiny, as long as floors hold.
    const floorSafe = !gate.reasons.some((reason) =>
      reason === "deck_size_changed"
      || reason === "role_coverage_regressed"
      || reason === "curve_regressed"
      || reason === "resilience_regressed"
      || reason === "cohesion_regressed"
      || reason === "package_floor_collapsed");
    const material = floorSafe && (
      justificationGain >= MATERIAL_JUSTIFICATION_GAIN
      || escapesWeak
      || (gate.passed && strategicDelta.total >= 8)
    );
    if (!floorSafe) {
      for (const reason of gate.reasons) {
        constrainedReasons.set(reason, (constrainedReasons.get(reason) || 0) + 1);
      }
      continue;
    }
    if (!material) continue;
    betterAlternativesAvailable += 1;

    const ranking = round(delta.score + strategicDelta.total * 0.08 + justificationGain * 0.12 + (escapesWeak ? 5 : 0));
    if (!best
      || ranking > best.ranking
      || (ranking === best.ranking && addRow.name.localeCompare(best.bestAlternative) < 0)) {
      best = {
        replacementAvailable: true,
        bestAlternative: addRow.name,
        wholeDeckDelta: freeze({
          structural: freeze(delta),
          strategicTotal: strategicDelta.total,
          preservation: strategicDelta.preservation,
          packageThresholds: strategicDelta.packageThresholds,
          commanderConnectionDelta: strategicDelta.commanderConnectionDelta,
        }),
        justificationGain,
        alternativeStrength: altJustification.strength,
        structuralTradeoffs: freeze(gate.reasons.filter((reason) => reason !== "structural_gain_too_small")),
        constraintForced: false,
        ranking,
      };
    }
  }

  if (!best) {
    const mostlyConstrained = constrainedReasons.size > 0 && shortlist.length > 0;
    return freeze({
      replacementAvailable: false,
      bestAlternative: null,
      wholeDeckDelta: null,
      justificationGain: 0,
      structuralTradeoffs: freeze([...constrainedReasons.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 6)
        .map(([reason, count]) => freeze({ reason, count }))),
      constraintForced: mostlyConstrained || candidateDepth <= 2,
      candidateDepth,
      betterAlternativesAvailable: 0,
      evaluated: shortlist.length,
      note: mostlyConstrained ? "alternatives_blocked_by_constraints" : "no_material_alternative",
    });
  }

  return freeze({
    replacementAvailable: true,
    bestAlternative: best.bestAlternative,
    wholeDeckDelta: best.wholeDeckDelta,
    justificationGain: best.justificationGain,
    alternativeStrength: best.alternativeStrength,
    structuralTradeoffs: best.structuralTradeoffs,
    constraintForced: false,
    candidateDepth,
    betterAlternativesAvailable,
    evaluated: shortlist.length,
    note: "avoidable_replacement_found",
  });
}

/**
 * Narrow causal taxonomy for weak final slots only.
 */
export function classifyWeakSlotCause(record) {
  const tags = [];
  let primary = "ambiguous";
  let confidence = "low";

  const path = record.survivalPath;
  const expected = Number(record.pickTimeProspectiveTotal);
  const raw = Number(record.pickTimeRawScore);
  const finalStrength = Number(record.finalJustificationStrength);
  const flags = record.flags || {};
  const cf = record.counterfactual || {};

  if (path === "budget_repair" || path === "power_repair") {
    tags.push("repair_degraded_slot");
    primary = "repair_degraded_slot";
    confidence = "high";
  } else if (path === "package_optimization") {
    tags.push("package_optimizer_degraded_slot");
    primary = "package_optimizer_degraded_slot";
    confidence = "high";
  } else if (path === "refill") {
    tags.push("refill_degraded_slot");
    primary = "refill_degraded_slot";
    confidence = "high";
  }

  if (flags.redundant) {
    tags.push("redundant_at_finish");
    if (primary === "ambiguous") {
      primary = "redundant_at_finish";
      confidence = "medium";
    }
  }

  const weakAtPick = !Number.isFinite(expected) || expected < WEAK_AT_SELECTION_PROSPECTIVE;
  const strongAtPick = Number.isFinite(expected) && expected >= 18;

  // Selection-time evidence first: a weak pick belief is the causal story even
  // when the finished pool also lacks a clean upgrade.
  if (weakAtPick && (path === "live_fill" || path === "anchor_reservation" || path === "preset")) {
    tags.push("weak_at_selection");
    if (primary === "ambiguous") {
      primary = "weak_at_selection";
      confidence = path === "live_fill" ? "medium" : "low";
    }
  }
  if (strongAtPick && finalStrength < 18) {
    tags.push("became_weak_downstream");
    if (primary === "ambiguous" || primary === "weak_at_selection") {
      primary = "became_weak_downstream";
      confidence = "medium";
    }
  }
  if (weakAtPick && raw >= RAW_SCORE_LEAK_FLOOR && path === "live_fill") {
    tags.push("raw_score_leak");
    if (primary === "weak_at_selection" || primary === "ambiguous") {
      primary = "raw_score_leak";
      confidence = "medium";
    }
  }

  if (cf.constraintForced && !cf.replacementAvailable) {
    tags.push("constraint_forced_compromise");
    if (primary === "ambiguous") {
      primary = "constraint_forced_compromise";
      confidence = cf.candidateDepth <= 2 ? "medium" : "low";
    }
  } else if (!cf.replacementAvailable && (cf.candidateDepth || 0) >= 6) {
    tags.push("no_better_candidate_available");
    if (primary === "ambiguous") {
      primary = "no_better_candidate_available";
      confidence = "medium";
    }
  }

  // Plan drift: predicted package value, but final package health collapsed / surplus elsewhere.
  const predictedPackages = (record.expectedReasons || [])
    .map((reason) => String(reason).match(/^package_(?:core|support|leg):(.+)$/))
    .filter(Boolean)
    .map((match) => match[1]);
  if (predictedPackages.length) {
    const health = record.finalPackageState || {};
    const collapsed = predictedPackages.some((id) => (health[id]?.issues || []).includes("collective_duplication")
      || ((health[id]?.densitySurplus || 0) >= 4 && finalStrength < 18));
    if (collapsed && strongAtPick) {
      tags.push("plan_drift_survivor");
      if (primary === "became_weak_downstream" || primary === "ambiguous") {
        primary = "plan_drift_survivor";
        confidence = "low";
      }
    }
  }

  const edges = record.interactionGraphCoverage?.edges;
  const orphan = record.interactionGraphCoverage?.orphanRewardHit;
  if ((edges == null || edges === 0) && orphan && finalStrength < 18 && (record.pickTimeProspectiveTotal || 0) >= 10) {
    tags.push("interaction_graph_undervaluation");
    if (primary === "ambiguous") {
      primary = "interaction_graph_undervaluation";
      confidence = "low";
    }
  }

  // Ledger false negative: no better alternative, not redundant, card has strategic footprint that
  // still failed the weak threshold — evidence may be undervaluing, not construction failure.
  if (!cf.replacementAvailable
    && !flags.redundant
    && ((record.finalReasons || []).length > 0)
    && finalStrength >= 12
    && finalStrength < 18
    && (record.flags?.packageCritical || (record.finalReasons || []).some((r) => /package_|commander_/.test(r)))) {
    tags.push("ledger_false_negative");
    if (primary === "no_better_candidate_available" || primary === "constraint_forced_compromise") {
      // Keep constraint/no-better as more actionable; tag only.
    } else if (primary === "ambiguous") {
      primary = "ledger_false_negative";
      confidence = "low";
    }
  }

  if (!tags.length) tags.push("ambiguous");

  return freeze({
    causalClass: primary,
    causalTags: freeze([...new Set(tags)]),
    causalConfidence: confidence,
    avoidable: Boolean(cf.replacementAvailable) && primary !== "ledger_false_negative",
    constraintForced: Boolean(cf.constraintForced) && !cf.replacementAvailable,
  });
}

/**
 * Build one machine-readable forensic record for a weakly justified final card.
 */
export function buildWeakSlotForensicRecord(candidate, weakSlot, options = {}) {
  const selfEvaluation = candidate.selfEvaluation || {};
  const nameKey = normalized(weakSlot.name);
  const pick = findTracePick(selfEvaluation, nameKey, candidate.constructionTrace);
  const survivalPath = survivalPathFor(pick);
  const source = sourceBucket(survivalPath, pick);
  const expectedReasons = [
    ...(pick?.prospectiveDelta?.deficitsFilled || []),
    ...((pick?.prospectiveDelta?.positives || []).map((entry) => `${entry.kind}:${entry.key}`)),
  ].slice(0, 16);
  const finalReasons = (weakSlot.reasons || []).map((reason) =>
    reason.kind ? `${reason.kind}:${reason.detail || reason.key || ""}` : String(reason)).slice(0, 16);

  const counterfactual = options.skipCounterfactual
    ? freeze({
      replacementAvailable: false,
      bestAlternative: null,
      wholeDeckDelta: null,
      justificationGain: 0,
      structuralTradeoffs: freeze([]),
      constraintForced: null,
      candidateDepth: null,
      betterAlternativesAvailable: null,
      evaluated: 0,
      note: "skipped",
    })
    : runWeakSlotCounterfactual(candidate, weakSlot, options.poolEntries || [], {
      intent: options.intent || candidate.strategicIntent,
      format: options.format || "Commander",
      strategy: options.strategy || "Balanced midrange",
      target: options.target,
      budgetConstraint: options.budgetConstraint,
      powerConstraint: options.powerConstraint,
      alternativeCap: options.alternativeCap,
    });

  const base = {
    card: weakSlot.name,
    nameKey,
    pickIndex: pick?.pickIndex ?? null,
    source,
    survivalPath,
    constructionPhase: pick?.constructionPhase || null,
    pickTimeRawScore: pick?.rawScore ?? null,
    pickTimeAdjustedScore: pick?.adjustedScore ?? null,
    pickTimeProspectiveTotal: pick?.prospectiveDelta?.total ?? null,
    expectedReasons: freeze(expectedReasons),
    finalJustificationStrength: round(Number(weakSlot.strength) || 0),
    finalReasons: freeze(finalReasons),
    flags: freeze({ ...(weakSlot.flags || {}) }),
    packageStateAtSelection: pick?.deficitBefore?.packages || freeze({}),
    finalPackageState: pick?.outcome?.packageHealth || freeze({}),
    redundancyState: freeze({
      redundant: Boolean(weakSlot.flags?.redundant),
      overSupported: Boolean(weakSlot.flags?.overSupported),
    }),
    strongestRejectedAlternative: pick?.rejectedAlternatives?.[0] || pick?.reasonOverNearest || null,
    interactionGraphCoverage: freeze({
      edges: pick?.outcome?.interaction?.edges ?? null,
      orphanRewardHit: Boolean(pick?.outcome?.interaction?.orphanRewardHit),
      supports: (weakSlot.supports || []).length,
      supportedBy: (weakSlot.supportedBy || []).length,
    }),
    shortlistSizeAtPick: pick?.shortlistSize ?? null,
    driftPrimaryClass: pick?.drift?.primaryClass || null,
    counterfactual,
  };

  const classification = classifyWeakSlotCause(base);
  return freeze({
    version: WEAK_SLOT_FORENSICS_VERSION,
    ...base,
    ...classification,
  });
}

export function aggregateWeakSlotForensics(records = []) {
  const byCausal = {};
  const bySource = {};
  const byPhase = {};
  let avoidable = 0;
  let constraintForced = 0;
  let lowDepth = 0;
  const depthSamples = [];

  for (const record of records) {
    byCausal[record.causalClass] = (byCausal[record.causalClass] || 0) + 1;
    bySource[record.source] = (bySource[record.source] || 0) + 1;
    const phase = record.constructionPhase || "unknown";
    byPhase[phase] = (byPhase[phase] || 0) + 1;
    if (record.avoidable) avoidable += 1;
    if (record.constraintForced) constraintForced += 1;
    const depth = record.counterfactual?.candidateDepth;
    if (Number.isFinite(depth)) {
      depthSamples.push(depth);
      if (depth <= 2) lowDepth += 1;
    }
  }

  const meanDepth = depthSamples.length
    ? round(depthSamples.reduce((sum, value) => sum + value, 0) / depthSamples.length)
    : null;

  const sortedCausal = Object.entries(byCausal).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const highestImpact = sortedCausal[0]?.[0] || null;

  return freeze({
    version: WEAK_SLOT_FORENSICS_VERSION,
    weakSlotCount: records.length,
    causalClassCounts: freeze(byCausal),
    sourceCounts: freeze(bySource),
    phaseCounts: freeze(byPhase),
    avoidableCount: avoidable,
    constraintForcedCount: constraintForced,
    lowCandidateDepthCount: lowDepth,
    meanCandidateDepth: meanDepth,
    highestImpactCausalClass: highestImpact,
  });
}

/**
 * Attach weak-slot forensics to a finalized candidate (after self-evaluation).
 */
export function attachWeakSlotForensics(candidate, options = {}) {
  const ledger = candidate.slotJustificationLedger;
  const intent = options.intent || candidate.strategicIntent || {};
  if (!ledger?.slots?.length) {
    return {
      ...candidate,
      weakSlotForensics: freeze({
        version: WEAK_SLOT_FORENSICS_VERSION,
        records: freeze([]),
        aggregate: aggregateWeakSlotForensics([]),
      }),
    };
  }

  const weakSlots = ledger.slots.filter((slot) => slot.flags?.weaklyJustified);
  const records = weakSlots.map((slot) => buildWeakSlotForensicRecord(candidate, slot, {
    ...options,
    intent,
  }));
  const aggregate = aggregateWeakSlotForensics(records);
  return {
    ...candidate,
    weakSlotForensics: freeze({
      version: WEAK_SLOT_FORENSICS_VERSION,
      records: freeze(records),
      aggregate,
    }),
  };
}

const DEFAULT_MAX_WEAK_SLOT_REPAIRS = 6;

function packageFloorHolds(beforeGate, afterGate) {
  if (!beforeGate?.packages?.length) return true;
  if (!afterGate?.packages?.length) return false;
  const afterById = new Map(afterGate.packages.map((pkg) => [pkg.id, pkg]));
  for (const before of beforeGate.packages) {
    const after = afterById.get(before.id);
    if (!after) return false;
    if ((after.coreCount || 0) < (before.coreCount || 0) && (after.coreCount || 0) < (before.coreMin || before.coreCount || 0)) {
      return false;
    }
    // Never allow a package that met its floor to fall below it.
    if ((before.coreCount || 0) >= (before.coreMin || 0) && (after.coreCount || 0) < (before.coreMin || 0)) {
      return false;
    }
  }
  return true;
}

/**
 * Bounded final cleanup for avoidable weakly justified slots.
 * Only swaps when forensics finds a material eligible alternative and
 * structural / package / cohesion floors hold. Caps attempts.
 */
export function repairWeaklyJustifiedSlots(candidate, options = {}) {
  const maxRepairs = Number.isFinite(options.maxRepairs) ? options.maxRepairs : DEFAULT_MAX_WEAK_SLOT_REPAIRS;
  const intent = options.intent || candidate.strategicIntent || {};
  const poolEntries = options.poolEntries || [];
  const validateCohesion = options.validateCohesion;
  const diagnostics = {
    version: WEAK_SLOT_FORENSICS_VERSION,
    attempted: false,
    applied: false,
    appliedCount: 0,
    considered: 0,
    skippedPackageCritical: 0,
    skippedNoAlternative: 0,
    skippedFloorRegression: 0,
    skippedBlueprintRegression: 0,
    skippedForbiddenAdd: 0,
    removedNames: [],
    alternativesAddedNames: [],
    swaps: [],
    // Wall-clock timing is observational only and must not affect
    // forge determinism / deep equality of finished reports.
    runtimeMs: 0,
  };

  const ledger = candidate.slotJustificationLedger;
  if (!ledger?.slots?.length || maxRepairs <= 0) {
    return {
      ...candidate,
      weakSlotRepair: freeze(diagnostics),
    };
  }

  const forensicOptions = {
    intent,
    poolEntries,
    format: options.format || "Commander",
    strategy: options.strategy || "Balanced midrange",
    target: options.target,
    budgetConstraint: options.budgetConstraint,
    powerConstraint: options.powerConstraint,
    alternativeCap: options.alternativeCap || DEFAULT_ALTERNATIVE_CAP,
    isForbiddenAdd: options.isForbiddenAdd,
  };

  let rows = candidate.rows.map((row) => ({ ...row, roles: [...(row.roles || [])] }));
  let working = { ...candidate, rows };
  const appliedCuts = new Set();
  const appliedAdds = new Set();
  diagnostics.attempted = true;

  // Recompute forensics against the working deck each pass so later swaps
  // see updated floors — but cap total applied swaps, not total loops.
  while (diagnostics.appliedCount < maxRepairs) {
    const weakSlots = (working.slotJustificationLedger?.slots || ledger.slots)
      .filter((slot) => slot.flags?.weaklyJustified)
      .filter((slot) => !appliedCuts.has(normalized(slot.name)));

    const records = weakSlots
      .map((slot) => buildWeakSlotForensicRecord(working, slot, forensicOptions))
      .filter((record) => record.avoidable && record.counterfactual?.replacementAvailable)
      .filter((record) => {
        if (record.flags?.packageCritical) {
          diagnostics.skippedPackageCritical += 1;
          return false;
        }
        return true;
      })
      .sort((left, right) =>
        (right.counterfactual.justificationGain || 0) - (left.counterfactual.justificationGain || 0)
        || left.card.localeCompare(right.card));

    if (!records.length) break;
    diagnostics.considered += 1;

    const pick = records[0];
    const addName = pick.counterfactual.bestAlternative;
    if (!addName || appliedAdds.has(normalized(addName))) {
      diagnostics.skippedNoAlternative += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    const addEntry = poolEntries.find((entry) => normalized(entryName(entry)) === normalized(addName));
    const addRow = poolEntryToRow(addEntry);
    if (!addRow) {
      diagnostics.skippedNoAlternative += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    if (typeof options.isForbiddenAdd === "function" && options.isForbiddenAdd(addEntry, addRow)) {
      diagnostics.skippedForbiddenAdd += 1;
      // Try next alternative if the forensics best add is forbidden; mark this
      // weak slot skipped for this pass so we do not loop forever on it.
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    const cutRow = rows.find((row) => normalized(row.name) === normalized(pick.card));
    if (typeof options.isProtectedCut === "function" && options.isProtectedCut(cutRow, rows)) {
      diagnostics.skippedBlueprintRegression += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    const nextRows = applyOneSlot(rows, pick.card, addRow);
    if (!nextRows) {
      diagnostics.skippedNoAlternative += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    // Floor checks against the pre-cleanup cohesion gate when available.
    if (typeof validateCohesion === "function") {
      const beforeGate = working.strategicCohesionGate || validateCohesion(working);
      const afterProbe = { ...working, rows: nextRows };
      const afterGate = validateCohesion(afterProbe);
      if (beforeGate?.passed && afterGate && afterGate.passed === false) {
        diagnostics.skippedFloorRegression += 1;
        appliedCuts.add(normalized(pick.card));
        continue;
      }
      if (beforeGate && afterGate && !packageFloorHolds(beforeGate, afterGate)) {
        diagnostics.skippedFloorRegression += 1;
        appliedCuts.add(normalized(pick.card));
        continue;
      }
    }

    if (typeof options.blueprintAlignmentFor === "function") {
      const beforeAlign = options.blueprintAlignmentFor(rows);
      const afterAlign = options.blueprintAlignmentFor(nextRows);
      if ((afterAlign?.selectedContractCards || 0) < (beforeAlign?.selectedContractCards || 0)) {
        diagnostics.skippedBlueprintRegression += 1;
        appliedCuts.add(normalized(pick.card));
        continue;
      }
      const beforeMech = beforeAlign?.requestedMechanicCoverage || {};
      const afterMech = afterAlign?.requestedMechanicCoverage || {};
      const mechanicRegressed = Object.keys(beforeMech).some((mechanic) =>
        (afterMech[mechanic] || 0) < (beforeMech[mechanic] || 0));
      const beforeRole = beforeAlign?.requestedRoleCoverage || {};
      const afterRole = afterAlign?.requestedRoleCoverage || {};
      const roleRegressed = Object.keys(beforeRole).some((role) =>
        (afterRole[role] || 0) < (beforeRole[role] || 0));
      if (mechanicRegressed || roleRegressed) {
        diagnostics.skippedBlueprintRegression += 1;
        appliedCuts.add(normalized(pick.card));
        continue;
      }
    }

    // Structural floor-safe check via the same counterfactual gate.
    const before = evaluateStructure(rows, forensicOptions);
    const after = evaluateStructure(nextRows, forensicOptions);
    const delta = {
      score: round(after.score - before.score),
      roleCoverage: round(after.roleCoverage - before.roleCoverage),
      curveHealth: round(after.curveHealth - before.curveHealth),
      resilienceDensity: round(after.resilienceDensity - before.resilienceDensity),
      cohesion: round(after.cohesion - before.cohesion),
    };
    if (delta.roleCoverage < -0.005
      || delta.curveHealth < -2
      || delta.resilienceDensity < -0.015
      || delta.cohesion < -0.03) {
      diagnostics.skippedFloorRegression += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    const strategicDelta = counterfactualSwapDelta(rows, nextRows, cutRow, addRow, intent, {
      roleTargets: roleTargets(forensicOptions.format, forensicOptions.strategy),
    });
    if ((strategicDelta.packageThresholds || []).some((change) => change.kind === "collapsed")) {
      diagnostics.skippedFloorRegression += 1;
      appliedCuts.add(normalized(pick.card));
      continue;
    }

    rows = nextRows;
    appliedCuts.add(normalized(pick.card));
    appliedAdds.add(normalized(addName));
    diagnostics.appliedCount += 1;
    diagnostics.removedNames.push(pick.card);
    diagnostics.alternativesAddedNames.push(addName);
    diagnostics.swaps.push(freeze({
      cut: pick.card,
      add: addName,
      justificationGain: pick.counterfactual.justificationGain,
      causalClass: pick.causalClass,
      source: pick.source,
    }));

    // Refresh working ledger lightly so subsequent weak detection is honest.
    working = {
      ...working,
      rows,
      slotJustificationLedger: null,
    };
    const { buildSlotJustificationLedger } = options;
    if (typeof buildSlotJustificationLedger === "function") {
      working.slotJustificationLedger = buildSlotJustificationLedger(
        working,
        intent,
        {
          budgetConstraint: options.budgetConstraint,
          powerConstraint: options.powerConstraint,
        },
      );
    }
  }

  diagnostics.applied = diagnostics.appliedCount > 0;
  diagnostics.runtimeMs = 0;
  diagnostics.removedNames = freeze(diagnostics.removedNames);
  diagnostics.alternativesAddedNames = freeze(diagnostics.alternativesAddedNames);
  diagnostics.swaps = freeze(diagnostics.swaps);

  if (!diagnostics.applied) {
    return {
      ...candidate,
      weakSlotRepair: freeze(diagnostics),
    };
  }

  return {
    ...candidate,
    rows,
    deckText: rows.map((row) => `${row.quantity} ${row.name}`).join("\n"),
    weakSlotRepair: freeze(diagnostics),
  };
}
