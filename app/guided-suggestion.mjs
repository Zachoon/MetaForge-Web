import { prospectiveSlotDelta, buildLiveDeficitState } from "./prospective-slot-delta.mjs";
import { cardSatisfiesPackageCore, cardSatisfiesPackageSupport } from "./strategic-intent.mjs";
import { isWinConditionCard } from "./fundamentals-target-table.mjs";

// =============================================================================
// Guided Suggestion
// =============================================================================
// "The Forge offers one card with a stated reason" — architecture/GUIDED_CONSTRUCTION_FLOW.md's
// flow step 3, category-by-category build loop. Deliberately no new scoring:
// reuses prospectiveSlotDelta as-is (the same live construction-reasoning
// primitive chooseSpells' own shortlist already runs against every
// candidate), and builds its "why this card" reason the same shape
// construction-trace.mjs's reasonOverNearest already uses (nearest
// alternative + margin), just computed directly from two prospectiveSlotDelta
// calls instead of a recorded pick-time session — this function has no
// memory of its own by design.
//
// Deliberately stateless: per resolved design decision #4 (no separate
// reroll mechanic — decline already does it), a decline is just the caller
// adding that card's name to declinedNames and calling again. Likewise
// eligibleForCategory does no new detection — it dispatches to the same
// classifiers Phase 1/2 already established: role membership for
// fundamentals, isWinConditionCard for win conditions, package core/support
// membership for synergy pieces.
// =============================================================================

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

// Same bridge slot-justification-ledger.mjs/prospective-slot-delta.mjs
// already define locally: a "row" here can be either the flat shape test
// fixtures use ({name, oracleText, roles, ...}) or the real engine's
// nested shape (analyzeForgePool/analyzeCard's {card: {name, oracleText},
// roles, ...}). roles/mechanics/etc. already sit at the top level in both,
// but name/oracleText only exist under .card in the real shape — reading
// them directly off a real candidate silently breaks (name undefined) or
// crashes (.localeCompare on undefined) once real engine data reaches
// this function instead of a test fixture.
function entryCard(entry) {
  return entry?.card || entry || {};
}
function entryName(entry) {
  return entry?.card?.name || entry?.name || "";
}

function eligibleForCategory(candidate, category, intent) {
  if (category === "winConditions") return isWinConditionCard(entryCard(candidate), candidate.roles || []);
  if (category === "synergyPieces") {
    return (intent.packages || []).some((packageSpec) =>
      cardSatisfiesPackageCore(candidate, packageSpec.id, intent)
      || cardSatisfiesPackageSupport(candidate, packageSpec.id, intent));
  }
  // Fundamentals: ramp, draw, interaction, protection, recursion, sweeper —
  // category name matches the role name directly (see TRACKED_ROLES).
  return (candidate.roles || []).includes(category);
}

function topPositiveOf(delta) {
  const sorted = [...(delta.positives || [])].sort((left, right) => right.weight - left.weight);
  return sorted[0] ? Object.freeze({ kind: sorted[0].kind, key: sorted[0].key }) : null;
}

/**
 * One suggestion for the given category, or exhausted:true when the pool
 * has nothing left to offer (every eligible card already selected or
 * declined for this slot). Never mutates partialRows/pool/declinedNames.
 */
export function suggestCardForCategory({
  category,
  partialRows = [],
  pool = [],
  intent = {},
  declinedNames = [],
  options = {},
} = {}) {
  const declined = new Set(declinedNames.map(normalized));
  const alreadySelected = new Set(partialRows.map((row) => normalized(entryName(row))));
  const deficitState = options.deficitState || buildLiveDeficitState(partialRows, intent, options);
  const scoringOptions = { ...options, deficitState };

  const eligible = pool.filter((candidate) => {
    const key = normalized(entryName(candidate));
    if (declined.has(key) || alreadySelected.has(key)) return false;
    return eligibleForCategory(candidate, category, intent);
  });

  if (!eligible.length) {
    return Object.freeze({ category, offer: null, delta: null, reason: null, exhausted: true, remainingCandidates: 0 });
  }

  const scored = eligible
    .map((candidate) => Object.freeze({
      candidate,
      delta: prospectiveSlotDelta(partialRows, candidate, intent, scoringOptions),
    }))
    // delta.name is prospectiveSlotDelta's own already-unwrapped entryName,
    // reused here rather than re-deriving it a third way.
    .sort((left, right) => right.delta.total - left.delta.total || left.delta.name.localeCompare(right.delta.name));

  const [best, runnerUp] = scored;
  return Object.freeze({
    category,
    offer: best.candidate,
    delta: best.delta,
    reason: Object.freeze({
      deficitsFilled: best.delta.deficitsFilled,
      topPositive: topPositiveOf(best.delta),
      nearestAlternative: runnerUp
        ? Object.freeze({ name: runnerUp.delta.name, margin: round(best.delta.total - runnerUp.delta.total) })
        : null,
    }),
    exhausted: false,
    remainingCandidates: scored.length,
  });
}
