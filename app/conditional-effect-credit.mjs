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
const TYPE_COUNT_SCALED_MANA = /add an amount of mana[\s\S]{0,80}creatures? you control of the chosen type/i;
const DEVOTION_SCALED_MANA = /add an amount of mana[\s\S]{0,80}devotion to (?:that |a )?color/i;
const MODAL_TOOLBOX = /\bchoose (?:one|two|three|one or both|one or more)\b/i;
const ARTIFACT_ONLY_COLORLESS_MANA = /can'?t be spent to cast a nonartifact spell|spend this mana only to cast artifact/i;
const UNRESTRICTED_ADD_C = /add \{C\}/i;
const ADDITIONAL_MODAL_ROLE_WEIGHT = 0.2;
const MODAL_FLOOR_CREDIT = 0.4;
const NON_TYPAL_TYPE_RESTRICTED_PENALTY = -6;
const RESTRICTED_CASTING_FACTOR = 0.12;
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
 * Type-count scaled rainbow (Three Tree City class) needs a real tribe on
 * the board, not a chosen type with two creatures. Devotion-scaled rainbow
 * (Nykthos class) needs mono-color devotion; split identity makes the
 * chosen-color amount inconsistent.
 */
export function landColoredManaFixingFactor(oracle = "", { typal = false, colorCount = 1 } = {}) {
  const text = String(oracle || "");
  const typeRestricted = TYPE_RESTRICTED_MANA.test(text) && TYPE_RESTRICTED_SPEND.test(text);
  if (typeRestricted && UNRESTRICTED_IDENTITY_ADD.test(text)) return 1;
  if (typeRestricted) return typal ? 1 : 0.12;
  if (TYPE_RESTRICTED_MANA.test(text) && TYPE_COUNT_SCALED_MANA.test(text)) return typal ? 1 : 0.12;
  if (DEVOTION_SCALED_MANA.test(text)) return Number(colorCount) <= 1 ? 1 : 0.12;
  if (CREATURE_SPELLS_ONLY.test(text)) return 0.4;
  return 1;
}

export function landRestrictedFixingPenalty(oracle = "", options = {}) {
  const factor = landColoredManaFixingFactor(oracle, options);
  if (factor >= 0.99) return 0;
  if (factor <= 0.2) return NON_TYPAL_TYPE_RESTRICTED_PENALTY;
  return 0;
}

export function colorlessPipsFromCost(cost = "") {
  return [...String(cost).matchAll(/\{C\}/gi)].length;
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

export function commanderProducesUnrestrictedColorless(oracle = "") {
  const text = String(oracle || "");
  if (!UNRESTRICTED_ADD_C.test(text)) return false;
  return !ARTIFACT_ONLY_COLORLESS_MANA.test(text);
}

export function commanderProducesArtifactOnlyColorless(oracle = "") {
  return ARTIFACT_ONLY_COLORLESS_MANA.test(String(oracle || ""));
}

/**
 * How much of a card's role/popularity credit is real in this list.
 * {C} pips cannot be paid by Forests. Artifact-only {C} (Vibranium /
 * Powerstone class) can pay artifact spells, not Kozilek's Command / Ugin.
 */
export function restrictedEffectCastingFactor({
  manaCost = "",
  colorIdentity = [],
  typeLine = "",
  commanderOracle = "",
  commanderColors = [],
} = {}) {
  if (/\bLand\b/i.test(String(typeLine || ""))) return 1;
  const coloredCommander = (commanderColors || []).some((color) => "WUBRG".includes(String(color)));
  if (!coloredCommander) return 1;

  const identity = Array.isArray(colorIdentity) ? colorIdentity : [];
  const colorlessCard = identity.length === 0 || (identity.length === 1 && identity.includes("C"));
  const isArtifact = /\bArtifact\b/i.test(String(typeLine || ""));
  const cPips = colorlessPipsFromCost(manaCost);
  const unrestrictedC = commanderProducesUnrestrictedColorless(commanderOracle);
  const artifactOnlyC = commanderProducesArtifactOnlyColorless(commanderOracle);

  if (cPips > 0) {
    if (unrestrictedC) return 1;
    if (artifactOnlyC && isArtifact) return 1;
    return RESTRICTED_CASTING_FACTOR;
  }
  if (colorlessCard && !isArtifact && artifactOnlyC) return RESTRICTED_CASTING_FACTOR;
  return 1;
}

/**
 * Modal cards provide optionality, not simultaneous jobs. Score only as many
 * roles as the card can actually fire at once (choose one → 1, choose two → 2).
 */
export function modalModesYouMayChoose(oracle = "") {
  const text = String(oracle || "");
  if (/\bchoose one or more\b/i.test(text)) return Number.POSITIVE_INFINITY;
  if (/\bchoose two\b/i.test(text) || /\bchoose one or both\b/i.test(text)) return 2;
  if (/\bchoose three\b/i.test(text)) return 3;
  if (/\bchoose one\b/i.test(text)) return 1;
  if (MODAL_TOOLBOX.test(text)) return 1;
  return null;
}

export function modalAwareRoleScore(roleContributions = [], oracle = "") {
  const parts = [...roleContributions].filter((value) => Number.isFinite(value) && value > 0).sort((left, right) => right - left);
  if (!parts.length) return 0;
  const modes = modalModesYouMayChoose(oracle);
  if (!modes) return parts.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(modes)) {
    return parts[0] + parts.slice(1).reduce((sum, value) => sum + value, 0) * ADDITIONAL_MODAL_ROLE_WEIGHT;
  }
  return parts.slice(0, modes).reduce((sum, value) => sum + value, 0);
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
