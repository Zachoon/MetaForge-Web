import { TRACKED_ROLES } from "./slot-justification-ledger.mjs";
import { POWER_TIERS, isExplicitWinCondition } from "./commander-power-signal.mjs";

// =============================================================================
// Fundamentals Target Table
// =============================================================================
// Companion data for architecture/GUIDED_CONSTRUCTION_FLOW.md's category-by-
// category build loop. TRACKED_ROLES (ramp, draw, interaction, protection,
// recursion, sweeper) are the "fundamentals" — largely archetype-independent
// deckbuilding needs a player walks through before archetype/package pieces.
// How many of each a good build wants is mostly a power-tier question, not an
// archetype question (a cEDH Aristocrats deck and a cEDH Voltron deck want
// similar interaction counts despite very different creature counts) — see
// the spec's "Resolved design decisions" #2. This table is that small,
// hand-authored, power-tier-keyed lookup, deliberately kept separate from
// PACKAGE_CATALOG/strategic-intent.mjs's archetype-scoped coreMin/supportMin
// targets, which remain the source for win conditions and synergy pieces.
//
// Ranges are a first draft grounded in common Commander deckbuilding
// guidance, not yet play-tested or Zach-approved — expect these numbers to
// move once real guided-build sessions produce feedback.
// =============================================================================

const RAW_TARGETS = Object.freeze({
  ramp: Object.freeze({
    Casual: Object.freeze({ min: 8, max: 12 }),
    Focused: Object.freeze({ min: 9, max: 12 }),
    "High-Power": Object.freeze({ min: 10, max: 14 }),
    Maximum: Object.freeze({ min: 10, max: 16 }),
  }),
  draw: Object.freeze({
    Casual: Object.freeze({ min: 8, max: 10 }),
    Focused: Object.freeze({ min: 9, max: 11 }),
    "High-Power": Object.freeze({ min: 10, max: 12 }),
    Maximum: Object.freeze({ min: 8, max: 12 }),
  }),
  interaction: Object.freeze({
    Casual: Object.freeze({ min: 5, max: 8 }),
    Focused: Object.freeze({ min: 7, max: 10 }),
    "High-Power": Object.freeze({ min: 9, max: 12 }),
    Maximum: Object.freeze({ min: 12, max: 16 }),
  }),
  protection: Object.freeze({
    Casual: Object.freeze({ min: 2, max: 4 }),
    Focused: Object.freeze({ min: 3, max: 5 }),
    "High-Power": Object.freeze({ min: 3, max: 6 }),
    Maximum: Object.freeze({ min: 4, max: 8 }),
  }),
  recursion: Object.freeze({
    Casual: Object.freeze({ min: 1, max: 3 }),
    Focused: Object.freeze({ min: 2, max: 4 }),
    "High-Power": Object.freeze({ min: 2, max: 5 }),
    Maximum: Object.freeze({ min: 2, max: 5 }),
  }),
  sweeper: Object.freeze({
    Casual: Object.freeze({ min: 1, max: 2 }),
    Focused: Object.freeze({ min: 1, max: 3 }),
    "High-Power": Object.freeze({ min: 2, max: 3 }),
    // cEDH builds often skip symmetric board wipes entirely when leaning on
    // a fast/combo plan, so the floor drops to zero rather than climbing
    // with the other rows.
    Maximum: Object.freeze({ min: 0, max: 2 }),
  }),
});

// Self-check at import time: a future rename of TRACKED_ROLES or POWER_TIERS
// must not silently leave this table stale.
for (const role of TRACKED_ROLES) {
  if (!RAW_TARGETS[role]) {
    throw new Error(`fundamentals-target-table.mjs is missing targets for tracked role "${role}"`);
  }
  for (const tier of POWER_TIERS) {
    if (!RAW_TARGETS[role][tier]) {
      throw new Error(`fundamentals-target-table.mjs is missing a "${tier}" target for role "${role}"`);
    }
  }
}
for (const role of Object.keys(RAW_TARGETS)) {
  if (!TRACKED_ROLES.includes(role)) {
    throw new Error(`fundamentals-target-table.mjs has targets for unknown role "${role}" (not in TRACKED_ROLES)`);
  }
}

export const FUNDAMENTAL_ROLE_TARGETS = RAW_TARGETS;

/**
 * {min, max} target range for a fundamentals role at a power tier, or null
 * for an untracked role / unrecognized tier — callers should treat null as
 * "no fundamentals target applies here" (e.g. archetype/package roles,
 * which keep sourcing targets from PACKAGE_CATALOG instead).
 */
export function fundamentalTargetFor(role, tier) {
  return RAW_TARGETS[role]?.[tier] || null;
}

// Win conditions are their own fixed category in the build loop (see the
// spec's "Resolved design decisions" #1) but deliberately aren't a new
// persistent role tag in card-role-classification.mjs — composed instead
// from two signals that already exist: card-role-classification.mjs's broad
// "threat" role (any Creature/Planeswalker, or explicit win-condition text)
// and commander-power-signal.mjs's isExplicitWinCondition (the narrow "you
// win the game" / "an opponent loses the game" pattern). OR, not AND: a
// build's win conditions are both its real finishers (threats) and any true
// alternate-win-condition cards, and almost no card is both at once (alt-win
// cards are overwhelmingly noncreature), so requiring both would leave the
// category empty.
export function isWinConditionCard(card, roles = []) {
  const roleList = Array.isArray(roles) ? roles : [];
  return roleList.includes("threat") || isExplicitWinCondition(card);
}
