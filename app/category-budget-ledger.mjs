import { buildSlotJustificationLedger, TRACKED_ROLES } from "./slot-justification-ledger.mjs";
import { fundamentalTargetFor, isWinConditionCard } from "./fundamentals-target-table.mjs";

// =============================================================================
// Category Budget Ledger
// =============================================================================
// Read-only "target vs. actual" data for architecture/GUIDED_CONSTRUCTION_FLOW.md's
// live budget ledger (flow step 4) — purely informational, never blocks (only
// format legality does that, unchanged elsewhere in construction). Generalizes
// slot-justification-ledger.mjs's existing packageCounts pattern (sum a
// per-card contribution, compare against a floor) across the three different
// kinds of category this build loop walks through:
//   - fundamentals (ramp/draw/interaction/protection/recursion/sweeper):
//     counted directly off each row's classified roles, targeted from the
//     new power-tier-keyed table (fundamentals-target-table.mjs, Phase 1).
//   - win conditions: counted via isWinConditionCard (Phase 1). Deliberately
//     no numeric target yet — see winConditionRow below for why.
//   - synergy pieces: package core+support counts and coreMin/supportMin
//     targets, unchanged from the existing packageCounts computation.
// Built against candidate.rows, so it can be prototyped read-only against an
// already-completed deck before it's wired into a live guided build.
// =============================================================================

export const CATEGORY_BUDGET_LEDGER_VERSION = "category-budget-v1";

// Fixed teaching sequence from the spec's resolved design decision #3 —
// ramp before interaction before protection before sweepers before
// recursion before draw, then win conditions, then synergy pieces last.
// Exposed so a caller building the guided build loop's UI walks categories
// in this exact order instead of re-deriving it.
export const CATEGORY_SEQUENCE = Object.freeze([
  "ramp", "interaction", "protection", "sweeper", "recursion", "draw", "winConditions", "synergyPieces",
]);

function nonlandNonCommanderRows(rows = []) {
  return rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
}

function statusFor(actual, target) {
  if (!target) return "no-target";
  if (actual < target.min) return "under";
  if (actual > target.max) return "over";
  return "in-range";
}

function fundamentalsRows(rows, targetPowerTier) {
  return TRACKED_ROLES.map((role) => {
    const actual = rows.reduce((sum, row) => sum + ((row.roles || []).includes(role) ? Number(row.quantity || 1) : 0), 0);
    const target = fundamentalTargetFor(role, targetPowerTier);
    return Object.freeze({ category: role, actual, target, status: statusFor(actual, target) });
  });
}

function winConditionRow(rows) {
  const winConditionCards = rows.filter((row) => isWinConditionCard(row, row.roles || []));
  const actual = winConditionCards.reduce((sum, row) => sum + Number(row.quantity || 1), 0);
  return Object.freeze({
    category: "winConditions",
    actual,
    // Deliberately no numeric target: isWinConditionCard's basis (the broad
    // "threat" role, plus true alt-win-condition text) and a package's
    // coreMin are two different definitions of "win condition," and
    // aggregating package coreMin here the way synergyPiecesRow does below
    // would compare a threat/creature count against an unrelated
    // archetype-density number. Left open until archetype/shell selection
    // (spec phasing step 3) exists and can say which specific triggered
    // package's coreMin actually represents a given build's win-condition
    // target — not something this phase can source honestly on its own.
    target: null,
    status: "no-target",
    names: Object.freeze(winConditionCards.map((row) => row.name).sort()),
  });
}

function synergyPiecesRow(packageCounts = {}) {
  let core = 0;
  let support = 0;
  let coreMin = 0;
  let supportMin = 0;
  for (const counts of Object.values(packageCounts)) {
    core += counts.core || 0;
    support += counts.support || 0;
    coreMin += counts.coreMin || 0;
    supportMin += counts.supportMin || 0;
  }
  const actual = core + support;
  const target = coreMin || supportMin ? Object.freeze({ min: coreMin, max: coreMin + supportMin }) : null;
  return Object.freeze({
    category: "synergyPieces",
    actual,
    target,
    status: statusFor(actual, target),
    byPackage: Object.freeze({ ...packageCounts }),
  });
}

/**
 * Build the full category budget ledger for a candidate. Accepts an
 * already-built slotJustificationLedger (e.g. from attachSlotJustificationLedger)
 * to avoid recomputing it, or builds one itself when absent.
 */
export function buildCategoryBudgetLedger(candidate, intent = {}, options = {}) {
  const slotJustificationLedger = candidate?.slotJustificationLedger
    || buildSlotJustificationLedger(candidate, intent, options);
  const rows = nonlandNonCommanderRows(candidate?.rows || []);
  const targetPowerTier = options.targetPowerTier ?? intent?.targetPowerTier ?? null;

  const categories = Object.freeze([
    ...fundamentalsRows(rows, targetPowerTier),
    winConditionRow(rows),
    synergyPiecesRow(slotJustificationLedger.packageCounts),
  ]);

  return Object.freeze({
    version: CATEGORY_BUDGET_LEDGER_VERSION,
    targetPowerTier,
    categories,
    byCategory: Object.freeze(Object.fromEntries(categories.map((row) => [row.category, row]))),
  });
}
