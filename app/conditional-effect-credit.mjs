// =============================================================================
// Conditional effect credit — Founder #026
// =============================================================================
// Restricted / mutually exclusive effects must not receive the same construction
// credit as unconditional ones. Shared by land ranking, role floors, and
// prospective deficit math. Not a new planning layer.
// =============================================================================

const TYPE_RESTRICTED_MANA = /chosen type/i;
const TYPE_RESTRICTED_SPEND = /spend this mana only|spent only to cast|creature spell of the chosen type/i;
const CREATURE_SPELLS_ONLY = /spend this mana only to cast creature spells/i;
const UNRESTRICTED_IDENTITY_ADD = /commander'?s color identity/i;
const MODAL_TOOLBOX = /\bchoose (?:one|two|three|one or both|one or more)\b/i;
const ADDITIONAL_MODAL_ROLE_WEIGHT = 0.2;
const MODAL_FLOOR_CREDIT = 0.4;
const NON_TYPAL_TYPE_RESTRICTED_PENALTY = -6;
const TYPAL_DENSITY_FLOOR = 12;

export function isModalToolbox(oracle = "") {
  return MODAL_TOOLBOX.test(String(oracle || ""));
}

export function oracleOf(entryOrCard = {}) {
  return String(
    entryOrCard?.oracleText
    || entryOrCard?.oracle_text
    || entryOrCard?.text
    || entryOrCard?.card?.oracleText
    || entryOrCard?.card?.oracle_text
    || "",
  );
}

/**
 * How much of a land's produced colors should count as real fixing.
 * Type-restricted rainbow (Cavern / Unclaimed Territory) is not a dual unless
 * the list is actually typal. Path of Ancestry keeps full credit because it
 * also taps for unrestricted commander-identity colors.
 */
export function landColoredManaFixingFactor(oracle = "", { typal = false } = {}) {
  const text = String(oracle || "");
  const typeRestricted = TYPE_RESTRICTED_MANA.test(text) && TYPE_RESTRICTED_SPEND.test(text);
  if (typeRestricted && UNRESTRICTED_IDENTITY_ADD.test(text)) return 1;
  if (typeRestricted) return typal ? 1 : 0.12;
  if (CREATURE_SPELLS_ONLY.test(text)) return 0.4;
  return 1;
}

export function landRestrictedFixingPenalty(oracle = "", { typal = false } = {}) {
  const factor = landColoredManaFixingFactor(oracle, { typal });
  if (factor >= 0.99) return 0;
  if (typal) return 0;
  if (factor <= 0.2) return NON_TYPAL_TYPE_RESTRICTED_PENALTY;
  return 0;
}

export function listHasTypalDensity(spellRows = [], blueprint = {}, commanderTribes = []) {
  if ((blueprint?.tribalTypes || []).length > 0) return true;
  if ((commanderTribes || []).length > 0) return true;
  const tribeQuantity = (spellRows || []).reduce((sum, row) => {
    if (!((row.directTribes || []).length)) return sum;
    return sum + Number(row.quantity || 1);
  }, 0);
  return tribeQuantity >= TYPAL_DENSITY_FLOOR;
}

export function colorlessPipsFromCost(cost = "") {
  return [...String(cost).matchAll(/\{C\}/gi)].length;
}

/**
 * Modal cards provide optionality, not simultaneous jobs. Primary role keeps
 * full weight; extra mutually exclusive roles keep a small flexibility remainder.
 */
export function modalAwareRoleScore(roleContributions = [], oracle = "") {
  const parts = [...roleContributions].filter((value) => Number.isFinite(value) && value > 0).sort((left, right) => right - left);
  if (!parts.length) return 0;
  if (!isModalToolbox(oracle) || parts.length === 1) {
    return parts.reduce((sum, value) => sum + value, 0);
  }
  return parts[0] + parts.slice(1).reduce((sum, value) => sum + value, 0) * ADDITIONAL_MODAL_ROLE_WEIGHT;
}

/**
 * How much this card should increment a role floor / live deficit count.
 * Classification is unchanged: a modal wail is still "interaction". It just
 * should not fill the interaction quota as if it were unconditional removal.
 */
export function roleFloorCredit(oracle = "") {
  return isModalToolbox(oracle) ? MODAL_FLOOR_CREDIT : 1;
}

export function roleCountContribution(row, role) {
  if (!((row?.roles || []).includes(role))) return 0;
  const cached = Number(row.roleFloorCredit);
  const credit = Number.isFinite(cached) ? cached : roleFloorCredit(oracleOf(row));
  return Number(row.quantity || 1) * credit;
}
