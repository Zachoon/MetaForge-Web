import { prospectiveSlotDelta, buildLiveDeficitState } from "./prospective-slot-delta.mjs";
import { cardSatisfiesPackageCore, cardSatisfiesPackageSupport } from "./strategic-intent.mjs";
import { isWinConditionCard } from "./fundamentals-target-table.mjs";
import { TRACKED_ROLES } from "./slot-justification-ledger.mjs";
import { preferenceAdjustment } from "./guided-preference-learning.mjs";
import { reasonWithProvider } from "./reasoning-engine/index.mjs";

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

// The shared "sweeper" role is a broad regex ("destroy all ..."), so it also
// tags artifact/enchantment wipes and "destroy all Saprolings". A player on
// the board-wipe step means a creature wipe, so this step requires the card
// to actually affect creatures. Guided-only: the role itself is untouched, so
// one-shot construction behaves exactly as before.
const CREATURE_WIPE = /\b(?:destroy|exile|sacrifice) all\b[^.]{0,60}\bcreatures?\b|\ball creatures get -|\bdeals? [^.]{0,40}damage to each (?:other )?creature\b|\beach creature\b[^.]{0,30}\b(?:is destroyed|gets -)/i;

function eligibleForCategory(candidate, category, intent) {
  if (category === "winConditions") return isWinConditionCard(entryCard(candidate), candidate.roles || []);
  if (category === "synergyPieces") {
    return (intent.packages || []).some((packageSpec) =>
      cardSatisfiesPackageCore(candidate, packageSpec.id, intent)
      || cardSatisfiesPackageSupport(candidate, packageSpec.id, intent));
  }
  // Fundamentals: ramp, draw, interaction, protection, recursion, sweeper —
  // category name matches the role name directly (see TRACKED_ROLES).
  if (!(candidate.roles || []).includes(category)) return false;
  if (category === "sweeper") return CREATURE_WIPE.test(entryCard(candidate).oracleText || candidate.oracleText || "");
  return true;
}

// How cleanly a card belongs to a fundamentals step: 1 = its only tracked
// role is this one, 2 = one other, 3 = three or more tracked tags. The role
// tags are regexes over rules text, so a card tagged ramp AND draw AND
// interaction is usually matching incidental wording, not doing all three;
// the plain, single-purpose card the player expects for the step goes first.
// Shell-fit steps have no such notion and always tier 1.
function roleTier(candidate, category) {
  if (category === "winConditions" || category === "synergyPieces") return 1;
  const tracked = TRACKED_ROLES.filter((role) => (candidate.roles || []).includes(role)).length;
  return Math.min(3, Math.max(1, tracked));
}

// Real-data measurement (Ayula/Atraxa/Meren pools, 2026-09-20) showed that
// ranking a step by prospectiveSlotDelta.total alone fails a player who
// asked for "ramp": that total is built to pick a whole deck, so it hands a
// card the fill credit for EVERY open role it is loosely tagged with (a
// tri-tagged artifact scored 123 in the ramp step against 22 for a plain
// ramp spell), ignores the standalone card quality one-shot construction
// adds (popularity, budget, power tier), and let a $65 nine-drop outrank
// Cultivate. So within a step, the category's own fill credit counts in
// full, shell fit (package / commander) counts most of the way, other roles
// barely count, structural penalties always count, and the engine's own raw
// card-quality score is blended in. Every input is an existing engine
// signal; only the blend is new, and it is exposed so tests pin it.
export const GUIDED_RANK_WEIGHTS = Object.freeze({
  quality: 0.45,
  primary: 1,
  shell: 0.6,
  otherRole: 0.1,
  other: 0.25,
});
const SHELL_KINDS = new Set([
  "package_core", "package_support", "package_leg", "commander_connection",
  "interaction_present", "supported_threat", "footprint_novelty",
]);
const positiveKey = (entry) => entry.detail ?? entry.key;
const isPrimary = (category, entry) => (category === "winConditions" || category === "synergyPieces"
  ? SHELL_KINDS.has(entry.kind)
  : entry.kind === "tracked_role" && positiveKey(entry) === category);

export function focusedScore(category, candidate, delta, weights = GUIDED_RANK_WEIGHTS) {
  let primary = 0;
  let shell = 0;
  let otherRole = 0;
  let other = 0;
  for (const entry of delta.positives || []) {
    if (isPrimary(category, entry)) primary += entry.weight;
    else if (SHELL_KINDS.has(entry.kind)) shell += entry.weight;
    else if (entry.kind === "tracked_role") otherRole += entry.weight;
    else other += entry.weight;
  }
  const penalties = (delta.negatives || []).reduce((sum, entry) => sum + entry.weight, 0);
  const quality = Number.isFinite(candidate?.score) ? candidate.score : 0;
  return round(primary * weights.primary + shell * weights.shell + otherRole * weights.otherRole
    + other * weights.other + penalties + quality * weights.quality - accessibilityPenalty(candidate));
}

// A soft nudge, never a filter: with no budget set, a $24 rare still shows,
// it just doesn't lead a step over an equally fitting $0.50 card. Capped so
// a genuine staple is never buried, and skipped when the price is unknown.
export function accessibilityPenalty(candidate) {
  const price = Number(entryCard(candidate).priceUsd ?? candidate?.priceUsd);
  if (!Number.isFinite(price) || price <= 8) return 0;
  return Math.min(12, (price - 8) / 2);
}

function cardJobKey(candidate) {
  const tracked = TRACKED_ROLES.filter((role) => (candidate.roles || []).includes(role));
  if (!tracked.length) return null;
  return tracked.slice().sort().join("+");
}

function nearestSameRole(scored) {
  const best = scored[0];
  if (!best) return null;
  const job = cardJobKey(best.candidate);
  if (!job) return null;
  const match = scored.slice(1).find((entry) => cardJobKey(entry.candidate) === job);
  if (!match) return null;
  return Object.freeze({
    name: match.delta.name,
    margin: round(best.rank - match.rank),
    sameRole: true,
    role: job,
  });
}

function topPositiveOf(category, delta) {
  const sorted = [...(delta.positives || [])]
    .sort((left, right) => Number(isPrimary(category, right)) - Number(isPrimary(category, left)) || right.weight - left.weight);
  return sorted[0] ? Object.freeze({ kind: sorted[0].kind, key: positiveKey(sorted[0]) }) : null;
}

// A fill-credit tag for some OTHER role ("role:draw" while the player is on
// the ramp step) is true of the card but not why it's on this step, so it
// stays out of the explanation.
function reasonTagsFor(category, delta) {
  return (delta.deficitsFilled || []).filter((tag) => !tag.startsWith("role:") || tag === `role:${category}`);
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
    return Object.freeze({ category, offer: null, delta: null, adjustment: null, reasoning: null, reason: null, exhausted: true, remainingCandidates: 0 });
  }

  const scored = eligible
    .map((candidate) => {
      const delta = prospectiveSlotDelta(partialRows, candidate, intent, scoringOptions);
      // What the player has taught this session (accepts, decline reasons,
      // Player Compass answers): a capped nudge on top of the same rank,
      // never a filter. No profile means exactly the previous ordering.
      const adjustment = preferenceAdjustment(candidate, options.preferenceProfile || null);
      // The reasoning engine (running deck profile + rules-text interaction
      // graph): a capped nudge for gaps, real mechanical synergy, plan, curve
      // and color fit, plus the structured reasons shown to the player.
      // No reasoningContext means exactly the previous ordering.
      const reasoning = options.reasoningContext
        ? reasonWithProvider(candidate, { ...options.reasoningContext, category }, options.reasoningProvider || null)
        : null;
      return Object.freeze({
        candidate,
        delta,
        adjustment,
        reasoning,
        tier: roleTier(candidate, category),
        rank: round(focusedScore(category, candidate, delta) + adjustment.delta + (reasoning?.delta || 0)),
      });
    })
    // delta.name is prospectiveSlotDelta's own already-unwrapped entryName,
    // reused here rather than re-deriving it a third way.
    .sort((left, right) => left.tier - right.tier || right.rank - left.rank || left.delta.name.localeCompare(right.delta.name));

  const best = scored[0];
  return Object.freeze({
    category,
    offer: best.candidate,
    delta: best.delta,
    adjustment: best.adjustment,
    reasoning: best.reasoning,
    reason: Object.freeze({
      deficitsFilled: reasonTagsFor(category, best.delta),
      topPositive: topPositiveOf(category, best.delta),
      summary: best.reasoning?.summary || null,
      nearestAlternative: nearestSameRole(scored),
    }),
    exhausted: false,
    remainingCandidates: scored.length,
  });
}
