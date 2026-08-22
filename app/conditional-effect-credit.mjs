// =============================================================================
// Conditional effect credit — Founder #026, extended by #027, #028, #029
// =============================================================================
// Restricted / mutually exclusive effects must not receive the same construction
// credit as unconditional ones. Shared by land ranking, role floors, and
// prospective deficit math. Not a new planning layer.
//
// #027 adds a second shape of the same class: a commander that only rewards
// a spell/permanent of a given type once it clears a numeric bar ("whenever
// you cast an artifact spell with mana value 4 or greater") is not the same
// promise as "artifacts matter" — a candidate that shares the type but
// misses the bar can never trigger it.
//
// #028 adds a third shape: a card whose token production is gated behind
// sacrificing a creature (Warren Soultrader: "Pay 1 life, Sacrifice another
// creature: Create a Treasure token.") needs fodder the list may not
// reliably have, so it is not the same promise as an unconditional or
// death-triggered producer (Smaug the Impenetrable, Dockside Extortionist,
// Pitiless Plunderer) that makes the token without spending a creature to
// do it.
//
// #029 applies the same #028 shape to a second resource: mana production.
// Ashnod's Altar / Phyrexian Altar ("Sacrifice a creature: Add...") need
// the exact same fodder an unconditional rock (Sol Ring) or a
// self-sacrificing one-shot (Lotus Petal) never do — classifyNativeCard's
// "ramp" role is exactly as cost-blind as the old token_generator semantic
// was, for the identical reason (a bare regex/tag with no cost check).
// =============================================================================

const TYPE_RESTRICTED_MANA = /chosen type/i;
const TYPE_RESTRICTED_SPEND = /spend this mana only|spent only to cast|creature spell of the chosen type/i;
const CREATURE_SPELLS_ONLY = /spend this mana only to cast creature spells/i;
const UNRESTRICTED_IDENTITY_ADD = /commander'?s color identity/i;
const TYPE_COUNT_SCALED_MANA = /add an amount of mana[\s\S]{0,80}creatures? you control of the chosen type/i;
const DEVOTION_SCALED_MANA = /add an amount of mana[\s\S]{0,80}devotion to (?:that |a )?color/i;
const LAND_TYPE_SCALED_MANA = /add \{[WUBRG]\} for each (?:basic )?(?:plains|island|swamp|mountain|forest)/i;
const UNRESTRICTED_COLORED_TAP = /\{T\}: Add \{[WUBRG]\}(?! for each)/i;
const ANY_COLOR_ADD = /add (?:one mana |an amount of mana )?of any color/i;
const OPPONENT_OR_CONTROLLED_COLOR = /any color that a land/i;
const CONDITIONAL_ANY_COLOR_INSTEAD = /any color instead/i;
const RAINBOW_IDENTITY_FLOOR = 4;
const MODAL_TOOLBOX = /\bchoose (?:one|two|three|one or both|one or more)\b/i;
const ARTIFACT_ONLY_COLORLESS_MANA = /can'?t be spent to cast a nonartifact spell|spend this mana only to cast artifact/i;
const UNRESTRICTED_ADD_C = /add \{C\}/i;
const ADDITIONAL_MODAL_ROLE_WEIGHT = 0.2;
const MODAL_FLOOR_CREDIT = 0.4;
const NON_TYPAL_TYPE_RESTRICTED_PENALTY = -6;
const RESTRICTED_CASTING_FACTOR = 0.12;
const TYPAL_DENSITY_FLOOR = 12;
// Warren Soultrader class: "Pay 1 life, Sacrifice another creature: Create
// a Treasure token." reads the cost clause (before the colon) for both
// "sacrifice" and "creature", then requires "create"/"token" in the effect
// clause of the SAME sentence — [^.] bounds stop the match at the next
// period so an unrelated later ability can never bleed in. This does not
// match Pitiless Plunderer ("whenever ... dies, create a Treasure token" —
// no cost, no colon), Dockside Extortionist (ETB, no sacrifice at all), or
// Mahadi (end-step trigger off deaths, not a paid activation) — verified
// against all three's real oracle text. Scoped to sacrificing a *creature*
// specifically, not an artifact/token, so converting one token into
// another (a much less restrictive pattern) is never penalized here.
const TOKEN_PRODUCTION_GATED_BY_CREATURE_SACRIFICE = /\bsacrifice\b[^.:]{0,60}?\bcreatures?\b[^.:]{0,20}:[^.]{0,140}?\bcreate\b[^.]*\btokens?\b/i;
const CONDITIONAL_TOKEN_PRODUCTION_FACTOR = 0.35;
// Ashnod's Altar class: "Sacrifice a creature: Add {C}{C}." / "Sacrifice a
// creature: Add one mana of any color." — same cost-clause/effect-clause
// bounding as the token check above. Does not match Krark-Clan Ironworks
// ("Sacrifice an artifact") or a Treasure's own reminder text ("Sacrifice
// this token") — scoped to sacrificing a *creature* specifically, same
// reasoning as the token check: a Treasure paying for its own mana is not
// fodder-dependent, and artifact-sac ramp is a distinct, not-yet-covered
// class this does not claim to handle.
const RAMP_PRODUCTION_GATED_BY_CREATURE_SACRIFICE = /\bsacrifice\b[^.:]{0,60}?\bcreatures?\b[^.:]{0,20}:[^.]{0,140}?\badd\b[^.]*(?:\{[WUBRGCXYZ0-9]|\bmana\b)/i;
const CONDITIONAL_RAMP_PRODUCTION_FACTOR = 0.35;

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

const GENERIC_SPELL_TYPES = new Set([
  "creature", "artifact", "enchantment", "instant", "sorcery", "planeswalker",
  "legendary", "historic", "multicolored", "colorless", "permanent", "spell", "token",
]);

/**
 * Printed-type mana (Haven of the Spirit Dragon class) is not "chosen type".
 * Full credit only when that type is actually in the tribe lens.
 */
export function namedManaSpendTypes(oracle = "") {
  const text = String(oracle || "");
  const types = [];
  for (const match of text.matchAll(/spend this mana only to cast (?:a |an )?([A-Za-z][A-Za-z'-]+)(?: creature| planeswalker)? spells?/gi)) {
    const term = String(match[1] || "").toLowerCase();
    if (term && !GENERIC_SPELL_TYPES.has(term)) types.push(term);
  }
  for (const match of text.matchAll(/\b(?:a|an) ([A-Z][a-z]+(?:'[a-z]+)?) spells?\b/g)) {
    const term = String(match[1] || "").toLowerCase();
    if (term && !GENERIC_SPELL_TYPES.has(term)) types.push(term);
  }
  return [...new Set(types)];
}

/**
 * "You win the game if [board condition]" is not an unconditional threat.
 * Credit the win only when the commander or commission actually produces
 * the stated resource. This is not a combo solver and does not claim loops
 * go infinite.
 */
export function restrictedWinconFactor({
  oracle = "",
  commanderOracle = "",
  blueprintText = "",
} = {}) {
  const text = String(oracle || "");
  if (!/you win the game/i.test(text)) return 1;
  if (!/if you (?:control|have|own)|, if you /i.test(text)) return 1;
  const support = `${commanderOracle} ${blueprintText}`;
  if (/\btreasures?\b/i.test(text)) return /\btreasure/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  if (/\bclues?\b/i.test(text)) return /\b(?:clue|investigate)/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  if (/\bfood\b/i.test(text)) return /\bfood\b/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  if (/\bpoison/i.test(text)) return /\bpoison/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  if (/\d+\s*(?:or more )?life|\blife total\b/i.test(text)) {
    return /you gain .{0,48}life|lifelink|life total/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  }
  if (/(?:creatures?|permanents?) you control/i.test(text) && /\d+|twenty|ten|fifteen/i.test(text)) {
    return /create .{0,80}token|creature tokens/i.test(support) ? 1 : RESTRICTED_CASTING_FACTOR;
  }
  return RESTRICTED_CASTING_FACTOR;
}

/**
 * How much of a card's token-producer credit is real when that production
 * is gated behind sacrificing a creature (Warren Soultrader class) rather
 * than unconditional or death-triggered (Smaug / Dockside Extortionist /
 * Pitiless Plunderer class). A sac-for-token activated ability needs
 * creature fodder the list may not reliably have on board, so it should
 * not anchor a "tokens" package core slot ahead of a producer that just
 * makes the token — but it is still a real, if narrow, source (including a
 * niche use protecting fodder from an exile-based board wipe), so it is
 * discounted, not excluded outright.
 */
export function conditionalTokenProductionFactor(oracle = "") {
  return TOKEN_PRODUCTION_GATED_BY_CREATURE_SACRIFICE.test(String(oracle || "")) ? CONDITIONAL_TOKEN_PRODUCTION_FACTOR : 1;
}

/**
 * How much of a card's ramp credit is real when that mana production is
 * gated behind sacrificing a creature (Ashnod's Altar / Phyrexian Altar
 * class) rather than unconditional (Sol Ring) or a one-shot that sacrifices
 * itself (Lotus Petal). Same reasoning as conditionalTokenProductionFactor:
 * discounted, not excluded — a list with real fodder support can still run it.
 */
export function conditionalRampProductionFactor(oracle = "") {
  return RAMP_PRODUCTION_GATED_BY_CREATURE_SACRIFICE.test(String(oracle || "")) ? CONDITIONAL_RAMP_PRODUCTION_FACTOR : 1;
}

/**
 * City of Brass class: any-color tap with no identity, type, or opponent gate.
 */
export function isUnconditionalRainbowMana(oracle = "") {
  const text = String(oracle || "");
  if (!ANY_COLOR_ADD.test(text)) return false;
  if (UNRESTRICTED_IDENTITY_ADD.test(text)) return false;
  if (TYPE_RESTRICTED_SPEND.test(text) || TYPE_RESTRICTED_MANA.test(text)) return false;
  if (OPPONENT_OR_CONTROLLED_COLOR.test(text)) return false;
  if (CONDITIONAL_ANY_COLOR_INSTEAD.test(text)) return false;
  if (DEVOTION_SCALED_MANA.test(text) || TYPE_COUNT_SCALED_MANA.test(text)) return false;
  return true;
}

/**
 * How much of a land's produced colors should count as real fixing.
 * Type-restricted rainbow (Cavern / Unclaimed Territory) is not a dual unless
 * the list is actually typal. Path of Ancestry keeps full credit because it
 * also taps for unrestricted commander-identity colors.
 * Type-count scaled rainbow (Three Tree City class) needs a real tribe on
 * the board, not a chosen type with two creatures. Devotion-scaled rainbow
 * (Nykthos class) needs mono-color devotion; split identity makes the
 * chosen-color amount inconsistent. Land-type scaled mana (Coffers class)
 * needs a mono identity so the basic-land count can actually stack.
 * A land that produces none of the commander's colors is a utility slot,
 * not a dual. Unconditional rainbow (City of Brass / Mana Confluence class)
 * is 4–5 color reach; two- and three-color lists cover pips with duals.
 * Named-type mana (Haven of the Spirit Dragon class) is not a dual unless
 * that printed type is in the tribe lens. A Bear list does not make Dragon
 * lands into duals.
 */
export function landColoredManaFixingFactor(oracle = "", {
  typal = false,
  colorCount = 1,
  producedMana = null,
  commanderColors = [],
  tribes = [],
} = {}) {
  const text = String(oracle || "");
  const typeRestricted = TYPE_RESTRICTED_MANA.test(text) && TYPE_RESTRICTED_SPEND.test(text);
  if (typeRestricted && UNRESTRICTED_IDENTITY_ADD.test(text)) return 1;
  if (typeRestricted) return typal ? 1 : 0.12;
  if (TYPE_RESTRICTED_MANA.test(text) && TYPE_COUNT_SCALED_MANA.test(text)) return typal ? 1 : 0.12;
  const namedTypes = namedManaSpendTypes(text);
  if (namedTypes.length) {
    const tribeSet = new Set((tribes || []).map((tribe) => String(tribe).toLowerCase()));
    return namedTypes.some((type) => tribeSet.has(type)) ? 1 : 0.12;
  }
  if (DEVOTION_SCALED_MANA.test(text)) return Number(colorCount) <= 1 ? 1 : 0.12;
  if (LAND_TYPE_SCALED_MANA.test(text) && !UNRESTRICTED_COLORED_TAP.test(text)) {
    return Number(colorCount) <= 1 ? 1 : 0.12;
  }
  if (CREATURE_SPELLS_ONLY.test(text)) return 0.4;
  const identity = (commanderColors || []).filter((color) => "WUBRG".includes(String(color)));
  if (identity.length && Array.isArray(producedMana) && !producedMana.some((color) => identity.includes(color))) {
    return 0.12;
  }
  if (isUnconditionalRainbowMana(text) && Number(colorCount) < RAINBOW_IDENTITY_FLOOR) return 0.12;
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

export function hasVariableGenericCost(cost = "") {
  return /\{[XYZ]\}/i.test(String(cost || ""));
}

/**
 * Printed mana value treats X as zero. Construction curve must not treat an
 * X spell as a 1-drop. Same window the mana-consistency report already uses:
 * two turns after the fixed portion, never before turn four.
 */
export function curveManaValue(cost = "", fallback = 0) {
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const printed = symbols.length
    ? symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^(X|Y|Z)$/.test(symbol) ? 0 : 1), 0)
    : Number(fallback) || 0;
  if (!hasVariableGenericCost(cost)) return printed;
  return Math.max(4, printed + 2);
}

export function isColorlessOnlyManaSource(oracle = "", { colorIdentity = [] } = {}) {
  const identity = Array.isArray(colorIdentity) ? colorIdentity : [];
  if (identity.some((color) => "WUBRG".includes(String(color)))) return false;
  const text = String(oracle || "");
  if (UNRESTRICTED_IDENTITY_ADD.test(text) || ANY_COLOR_ADD.test(text)) return false;
  if (/add \{[WUBRG]\}/i.test(text)) return false;
  return /add \{C\}/i.test(text);
}

/**
 * In a colored list, 2+ mana colorless rocks do not pay WUBRG pips.
 * 0–1 mana rocks (Sol Ring class) are still real acceleration.
 */
export function colorlessFixingCredit({
  oracle = "",
  colorIdentity = [],
  manaCost = "",
  commanderColors = [],
} = {}) {
  if (!(commanderColors || []).some((color) => "WUBRG".includes(String(color)))) return 1;
  if (!isColorlessOnlyManaSource(oracle, { colorIdentity })) return 1;
  const symbols = [...String(manaCost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const cmc = symbols.length
    ? symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^(X|Y|Z)$/.test(symbol) ? 0 : 1), 0)
    : 0;
  return cmc <= 1 ? 1 : RESTRICTED_CASTING_FACTOR;
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
 * Colorless-only rocks in a colored list are still ramp; they just do not
 * close the colored-pip ramp quota by themselves.
 */
export function roleFloorCredit(oracle = "", extras = {}) {
  const wincon = restrictedWinconFactor({
    oracle,
    commanderOracle: extras.commanderOracle || "",
    blueprintText: extras.blueprintText || "",
  });
  if (wincon < 1) return Math.min(MODAL_FLOOR_CREDIT, wincon);
  if (isModalToolbox(oracle)) return MODAL_FLOOR_CREDIT;
  const commanderColors = extras.commanderColors || [];
  // A Powerstone is genuine acceleration, but its mana cannot cast a
  // nonartifact spell. In a colored deck it therefore closes only the same
  // partial ramp floor as an ordinary colorless-only rock.
  if (
    commanderColors.some((color) => "WUBRG".includes(String(color)))
    && /create [^.]*powerstone token/i.test(String(oracle || ""))
  ) {
    return MODAL_FLOOR_CREDIT;
  }
  if (
    commanderColors.some((color) => "WUBRG".includes(String(color)))
    && isColorlessOnlyManaSource(oracle, extras)
  ) {
    return MODAL_FLOOR_CREDIT;
  }
  return 1;
}

export function roleCountContribution(row, role) {
  if (!((row?.roles || []).includes(role))) return 0;
  const cached = Number(row.roleFloorCredit);
  const credit = Number.isFinite(cached) ? cached : roleFloorCredit(oracleOf(row));
  return Number(row.quantity || 1) * credit;
}

// "Whenever you cast an artifact spell with mana value 4 or greater" (or a
// power/toughness N or greater/less permanent trigger) is a real rules-text
// pattern, not a name-specific template — this parses any commander that
// phrases its payoff the same way. GENERIC_PAYOFF_TYPE_WORDS excludes
// captures that name no real card type at all ("a permanent", "another
// creature" with no more specific noun already handled by the required
// capture group).
const PAYOFF_MAGNITUDE_CONDITION = /whenever you (?:cast|play) (?:an?|another|one or more) ([a-z][a-z'-]*) (?:spell|permanent)s?[^.]{0,60}?\b(mana value|power|toughness) (\d+) or (less|lower|greater|more|higher)\b/gi;
const GENERIC_PAYOFF_TYPE_WORDS = new Set(["target", "creature", "permanent", "player", "opponent", "spell", "token", "card", "another", "other"]);
const MAGNITUDE_METRIC = Object.freeze({ "mana value": "manaValue", power: "power", toughness: "toughness" });

/**
 * Structured {typeWord, metric, threshold, direction} gates parsed off a
 * commander's own oracle text. "Creature" is kept out of
 * GENERIC_PAYOFF_TYPE_WORDS on purpose — power/toughness thresholds are
 * overwhelmingly a creature-cast condition, so treating "creature" as too
 * generic to be a real type filter would silence the exact case the metric
 * exists for.
 */
export function commanderPayoffMagnitudeGates(oracle = "") {
  const gates = [];
  for (const match of String(oracle || "").matchAll(PAYOFF_MAGNITUDE_CONDITION)) {
    const typeWord = String(match[1] || "").toLowerCase();
    if (!typeWord || (GENERIC_PAYOFF_TYPE_WORDS.has(typeWord) && typeWord !== "creature")) continue;
    const metric = MAGNITUDE_METRIC[match[2].toLowerCase()];
    if (!metric) continue;
    const direction = /less|lower/i.test(match[4]) ? "atMost" : "atLeast";
    gates.push({ typeWord, metric, threshold: Number(match[3]), direction });
  }
  return gates;
}

function numericStat(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

// Founder #037: "noncreature"/"nonland"/"nonartifact" are real, common
// commander trigger conditions ("Whenever you cast a noncreature spell
// with mana value 3 or greater" — Y'shtola, Night's Blessed's actual
// payoff, the whole point of the commander per its own primer) — but no
// real card's typeLine ever literally contains the substring "noncreature"
// itself, so the plain \btypeWord\b check below silently failed to match
// EVERY card in the game for a negated typeWord: not "misses some", not
// "false", but null (this gate doesn't even apply) for every single
// candidate, forever. Verified: before this fix, cardClearsPayoffMagnitudeGate
// returned null for Demonic Tutor AND Cyclonic Rift against Y'shtola's own
// real gate. A negated typeWord instead checks the OPPOSITE: does the
// typeLine lack that word. Lands are explicitly excluded from ever
// clearing a negated gate — a land is never cast as a spell at all, so it
// can never satisfy "cast a noncreature spell" regardless of what its own
// type line does or doesn't say.
const NEGATED_TYPE_WORD = /^non(.+)$/i;

/**
 * null = the candidate isn't even the gated type (the gate doesn't apply to
 * it at all, positive or negative). true/false = it is that type, and does
 * or doesn't clear the stated bar. Mana value goes through curveManaValue so
 * an X spell isn't credited as a 1-drop payoff trigger it can't reliably be.
 */
export function cardClearsPayoffMagnitudeGate(card = {}, gate) {
  const typeLine = String(card.typeLine || card.type_line || "");
  const negated = gate.typeWord.match(NEGATED_TYPE_WORD);
  const matchesType = negated
    ? !/\bLand\b/i.test(typeLine) && !new RegExp(`\\b${negated[1]}\\b`, "i").test(typeLine)
    : new RegExp(`\\b${gate.typeWord}\\b`, "i").test(typeLine);
  if (!matchesType) return null;
  const value = gate.metric === "manaValue"
    ? curveManaValue(card.manaCost || card.mana_cost || "", Number(card.cmc) || 0)
    : numericStat(gate.metric === "power" ? card.power : card.toughness);
  if (value === null) return false;
  return gate.direction === "atMost" ? value <= gate.threshold : value >= gate.threshold;
}

/**
 * How many of the commander's own magnitude-qualified payoff conditions this
 * candidate actually clears. Additive only — a type match that misses the
 * bar scores the same as before, never worse; a match that clears it earns
 * real extra credit, so it can outrank same-type filler on score alone.
 */
export function payoffMagnitudeHitsFor(card, gates = []) {
  return gates.reduce((count, gate) => count + (cardClearsPayoffMagnitudeGate(card, gate) === true ? 1 : 0), 0);
}

// Founder #036: a commander that is functionally immune to a symmetric
// damage sweep AND explicitly rewards being dealt damage turns a normally-
// bad effect into pure profit. Smaug the Impenetrable ("Flying,
// indestructible, haste / Whenever Smaug is dealt noncombat damage, create
// that many Treasure tokens.") survives real, commonly-played symmetric
// damage effects (Pestilence, Chain Reaction, Star of Extinction,
// Self-Destruct, Pain for All) that kill every other creature on the board,
// and profits from every one of them — a real, non-obvious combo a real
// player built around, invisible to the generic produce/reward signal
// system because the commander's own trigger condition isn't a keyword any
// card "produces" the way tokens/treasure/artifacts are; it only becomes
// visible by reading the commander's own printed trigger the same way
// commanderPayoffMagnitudeGates already does for magnitude-qualified ones.
//
// Deliberately scoped to real rules precision, not just "damage": a plain
// -X/-X effect (Toxic Deluge) reduces toughness to 0 and kills even an
// indestructible creature via state-based action, bypassing the protection
// entirely — the opposite of a combo. A non-damage "destroy all" effect
// (Wrath of God) is survived by indestructible too, but never deals damage
// at all, so it never fires this specific trigger — safe, but not a real
// connection to this specific ability, and not claimed as one here.
const COMMANDER_PROFITS_FROM_DAMAGE = /\bindestructible\b/i;
const COMMANDER_DEALT_DAMAGE_TRIGGER = /whenever [^.]* (?:is dealt|takes) (?:noncombat )?damage\b/i;

export function commanderProfitsFromBeingDamaged(oracle = "") {
  const text = String(oracle || "");
  return COMMANDER_PROFITS_FROM_DAMAGE.test(text) && COMMANDER_DEALT_DAMAGE_TRIGGER.test(text);
}

// Real damage, not toughness reduction: reuses the exact battlefield-wide
// mass-damage pattern ROLE_PATTERNS.sweeper/displayRoleFor already use for
// a real damage-based board wipe (Founder #032) — the shape Pestilence/
// Chain Reaction/Star of Extinction/Pain for All/Blasphemous Act/Anger of
// the Gods all match, verified against their real oracle text. Not just a
// literal digit after "deals" — Chain Reaction ("deals damage equal to
// the number of creatures on the battlefield to each creature") is a
// real, well-known scaling-damage sweeper with no fixed number at all.
// Bounded to the same sentence and still requires "to each ... creature"
// as the actual target, so this stays as safe as the fixed-number
// version: verified it still correctly excludes Impact Tremors/Kessig
// Flamebreather ("to each opponent") and Smaug's own "noncombat damage"
// (no "to each creature" at all). Self-Destruct is NOT one of these — its
// real text never says "to each creature" at all; see
// cardCanDealDamageToOwnCreature below for that shape.
const MASS_DAMAGE_TO_CREATURES = /deals? [^.]*?\bdamage\b[^.]*? to each (?:other |nontoken |non-Human )?creature/i;

export function cardDealsMassDamageToCreatures(oracle = "") {
  return MASS_DAMAGE_TO_CREATURES.test(String(oracle || ""));
}

// Founder #041: found by cross-checking the Smaug primer's own named
// "Damage Engines"/"Big Explosions" against the shipped #036 detector —
// Fire Covenant, Self-Destruct, and The Last Agni Kai are all explicit
// primer MVPs that scored zero self-damage-synergy hits, because none of
// them deal damage to EACH creature (cardDealsMassDamageToCreatures'
// shape) — they're single/divided-target effects instead. Three real,
// distinct, verified shapes, none of them board wipes so none of them
// belong in the sweeper role pattern:
//  - FIGHT: "target creature you control fights target creature" always
//    deals damage back to the fighter (The Last Agni Kai) — unconditional,
//    not a choice.
//  - Self-inflicted: an ability/spell whose own damage source also deals
//    that much damage to itself (Self-Destruct) — unconditional.
//  - Divided-among-targets: "damage divided as you choose among any
//    number of target creatures" (Fire Covenant) lets a pilot include
//    their own indestructible commander as one of the targets for a free
//    Treasure alongside real removal — a real, common EDH burn template,
//    not exclusive to Smaug.
// Verified against all three real cards' oracle text, plus negative
// controls (plain "Destroy target creature." and the already-covered
// Blasphemous Act mass sweeper both correctly stay unmatched).
const FIGHT_EFFECT = /creature you control fights target creature/i;
const SELF_INFLICTED_DAMAGE = /deals? [^.]*? damage to (?:any other target|target [^.]*?) and [^.]*? damage to itself\b/i;
const DIVIDED_DAMAGE_AMONG_TARGETS = /damage divided as you choose among any number of target creatures/i;

export function cardCanDealDamageToOwnCreature(oracle = "") {
  const text = String(oracle || "");
  return FIGHT_EFFECT.test(text) || SELF_INFLICTED_DAMAGE.test(text) || DIVIDED_DAMAGE_AMONG_TARGETS.test(text);
}

// Founder #046: Zimone, Infinite Analyst's entire identity is "the first
// spell you cast with {X} in its mana cost each turn costs {1} less...
// and grows Zimone" — a real trigger shape commanderPayoffMagnitudeGates
// (#027) doesn't cover, since it's not a numeric threshold ("mana value 3
// or greater") but a boolean cost-shape check ("does this spell's own
// printed cost contain an X at all"). Verified on a real construction:
// with no way to recognize this, Torment of Hailfire, Exsanguinate,
// Finale of Devastation, and Diabolic Revelation — real X-spell payoffs a
// deck built around this commander needs — were ALL absent from a real
// Zimone build (0/4 selected). hasVariableGenericCost already exists for
// exactly this "does this cost contain {X}/{Y}/{Z}" check (used to keep
// curve evaluation from treating an X spell as a cheap 1-drop) — reused
// here rather than duplicated.
const COMMANDER_CARES_ABOUT_X_SPELLS = /spells? (?:you cast )?with \{[XYZ]\} in (?:its|their) mana cost/i;

export function commanderCaresAboutXSpells(oracle = "") {
  return COMMANDER_CARES_ABOUT_X_SPELLS.test(String(oracle || ""));
}

// Founder #049: Esika, God of the Tree // The Prismatic Bridge ("reveal
// cards from the top of your library until you reveal a creature or
// planeswalker card. Put that card onto the battlefield") cheats
// Planeswalkers into play for free — a real "superfriends" enabler, per
// the deck's own player note ("Ultimate your super friends"). Verified on
// a real construction: the engine's own self-generated build ran only 6
// planeswalkers against the real player's 20, because nothing in the
// engine specifically values a Planeswalker card higher when the
// commander both mentions the type AND has a real cost-cheat mechanism —
// commanderTribesFromOracle's typal system doesn't apply here (Planeswalker
// isn't a creature type; it's already correctly excluded via
// ARTIFACT_OR_TOKEN_TYPES from that system, same as Equipment/Vehicle in
// #047). Reuses the exact cost_cheat regex strategicSemanticsFor already
// uses and trusts, ANDed with a bare "planeswalker" mention — deliberately
// requires BOTH so an unrelated removal spell ("destroy target creature
// or planeswalker", real and common, no cost-cheat text at all) stays
// closed rather than falsely opening on a bare type mention.
const MENTIONS_PLANESWALKER_TYPE = /\bplaneswalkers?\b/i;
const COMMANDER_COST_CHEATS = /cast [^.]* without paying|put [^.]* onto the battlefield|mana value .{0,20} less to cast|costs? \{[^}]+\} less/i;

export function commanderValuesPlaneswalkerCheats(oracle = "") {
  const text = String(oracle || "");
  return MENTIONS_PLANESWALKER_TYPE.test(text) && COMMANDER_COST_CHEATS.test(text);
}

// Founder #050: Marina Vendrell's activated ability ("{T}: Lock or unlock
// a door of target Room you control") directly interacts with the real
// Room permanent subtype (Duskmourn — always "Enchantment — Room", 28
// real cards legal in Commander per Scryfall). Room isn't a creature
// type, so commanderTribesFromOracle's typal system correctly doesn't
// apply — Room is already in ARTIFACT_OR_TOKEN_TYPES alongside Class/
// Case/Background, the same recent non-creature permanent-subtype
// category. There's also no dedicated Rooms package the way Equipment
// and Auras get one. Verified on a real construction: a real 5-color
// pool for Marina surfaced zero Room cards at all (same wide-identity
// pool-thinness #039/#040/#047/#049 already found), so this needs both a
// construction-side synergy hit and a pool-fetch targeted query, same
// shape as #049's Planeswalker fix.
const MENTIONS_ROOM_TYPE = /\brooms? you control\b/i;

export function commanderInteractsWithRooms(oracle = "") {
  return MENTIONS_ROOM_TYPE.test(String(oracle || ""));
}
