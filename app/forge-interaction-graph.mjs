import { normalizeCardLookupKey } from "./deck-understanding.mjs";

const normalizeCardName = (name = "") => String(name).normalize("NFKC").trim().toLocaleLowerCase("en");

// tagSignalsFor's real per-card lookup, injected rather than a static
// import of the ~1.9MB card-mechanics.mjs — extractMechanicalSignals here
// is reachable from the client both directly (page.tsx's meta-breaker-
// experiment.mjs) and via knowledge/atlas-vocabulary.mjs (page.tsx's
// knowledge/mentor-shadow.mjs), and per the comment on tagSignalsFor below,
// tags only ever confirm/refine a regex-derived signal — never the sole
// source of one — so gracefully returning no tags client-side just means
// those signals fall back to regex-only, not a broken feature.
// native-masterwork-engine.mjs configures the real lookup for its own
// internal (server-only) calls.
let cardTagLookup = () => [];
export function configureInteractionGraphTagLookup(lookup) {
  cardTagLookup = lookup || (() => []);
}

/** Evidence classes for relationship edges (Founder #018 grows this set). */
export const RELATIONSHIP_EVIDENCE = Object.freeze({
  ORACLE_EXPLICIT: "oracle_explicit",
  ORACLE_MECHANICAL_VERIFIED: "verified card-database mechanic",
  ORACLE_MECHANICAL_INFERRED: "inferred mechanical edge",
  ORACLE_SHARED_SIGNAL: "shared oracle signal",
  ORACLE_CONFLICT: "verified oracle-derived conflict",
  ORACLE_AMPLIFIER: "verified rules-text trigger amplifier",
  ORACLE_MUTUAL_LOOP: "inferred mutual mechanical loop",
  ORACLE_RESET_SHAPE: "inferred oracle reset shape",
});

export const LOOP_KINDS = Object.freeze({
  ENGINE: "engine",
  CLOSED_LOOP: "closed_loop",
  CONDITIONAL_WIN: "conditional_win",
});

export const RESET_SHAPES = Object.freeze({
  ARTIFACT_UNTAP: "artifact_untap",
  COPY_ACTIVATED: "copy_activated",
  COPY_ETB_UNTAP: "copy_etb_untap",
  IMPRINT_UNTAP_ALL: "imprint_untap_all",
});

const RESET_SHAPE_REASON = Object.freeze({
  [RESET_SHAPES.ARTIFACT_UNTAP]: "One card untaps itself for mana; the other untaps an artifact. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.COPY_ACTIVATED]: "One card untaps itself; the other copies an activated ability. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.COPY_ETB_UNTAP]: "One card copies a creature; the other untaps a permanent on enter. Reset shape — investigate, not a verified infinite.",
  [RESET_SHAPES.IMPRINT_UNTAP_ALL]: "One card can recast an imprinted instant; the other untaps nonlands. Reset shape — investigate, not a verified infinite.",
});

const SELF_UNTAP = /\{[^}]+\}: Untap this(?: artifact| creature| permanent)?/i;
const TAP_ADD = /\{T\}: Add \{/;
const UNTAP_TARGET_ARTIFACT = /untap target artifact/i;
const COPY_ACTIVATED = /copy target activated/i;
const COPIES_CREATURE = /create a token that's a copy of[^.]*creature/i;
const ETB_UNTAP_TARGET = /enters(?: the battlefield)?[^.]*untap target (?:creature|permanent|artifact)/i;
const IMPRINTS_INSTANT = /imprint|you may copy the exiled card/i;
const UNTAP_ALL_NONLANDS = /untap all nonland permanents you control/i;

/**
 * Two-card oracle shapes that can reset a tap or restage a spell.
 * Observation only. Not a combo solver and not a claim the loop goes infinite.
 */
export function resetPayShape(leftOracle = "", rightOracle = "") {
  const left = String(leftOracle || "");
  const right = String(rightOracle || "");
  const pair = (leftTest, rightTest) =>
    (leftTest.test(left) && rightTest.test(right)) || (leftTest.test(right) && rightTest.test(left));

  if (pair(SELF_UNTAP, UNTAP_TARGET_ARTIFACT)) return RESET_SHAPES.ARTIFACT_UNTAP;
  if (pair(SELF_UNTAP, COPY_ACTIVATED) && (TAP_ADD.test(left) || TAP_ADD.test(right))) {
    return RESET_SHAPES.COPY_ACTIVATED;
  }
  if (pair(COPIES_CREATURE, ETB_UNTAP_TARGET)) return RESET_SHAPES.COPY_ETB_UNTAP;
  if (pair(IMPRINTS_INSTANT, UNTAP_ALL_NONLANDS)) return RESET_SHAPES.IMPRINT_UNTAP_ALL;
  return null;
}

/**
 * Vocabulary on a pair of oracles. Engine is the default for ordinary
 * producer/payoff loops. Closed_loop is a reset shape. Conditional_win is
 * a board-state win, not a loop.
 */
export function classifyLoopKind(leftOracle = "", rightOracle = "") {
  const left = String(leftOracle || "");
  const right = String(rightOracle || "");
  const combined = `${left}\n${right}`;
  if (/you win the game/i.test(combined) && /if you (?:control|have|own)|, if you /i.test(combined)) {
    return LOOP_KINDS.CONDITIONAL_WIN;
  }
  if (resetPayShape(left, right)) return LOOP_KINDS.CLOSED_LOOP;
  return LOOP_KINDS.ENGINE;
}

export const SELECTION_KINDS = Object.freeze({
  SCRY: "scry",
  SURVEIL: "surveil",
  RUMMAGE: "rummage",
  CONNIVE: "connive",
  IMPULSE: "impulse",
  DRAW: "draw",
});

const RUMMAGE = /draw (?:a card|one card|two cards|\d+ cards), then discard|(?:you )?discard (?:a card|one card|two cards|\d+ cards), then draw/i;
const IMPULSE = /look at the top .{0,80}exile/i;
const IMPULSE_PLAY = /(?:play|cast) [^.]* (?:this turn|until end of turn|from exile)/i;
const JUNK_TOKEN = /create[^.]*junk token/i;
const REMINDER_TEXT = /\([^)]*\)/g;

/**
 * How a card filters or replaces cards. Observation only.
 * Scry is not mill. Surveil is not mill. Rummage is not net draw.
 * Impulse is look-at-top exile-play, not a Junk token.
 * Connive is a mixed selector, not a draw engine.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifySelectionKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (/\bconniv(?:e|es|ed|ing)\b/i.test(text)) kinds.push(SELECTION_KINDS.CONNIVE);
  if (IMPULSE.test(text) && IMPULSE_PLAY.test(text) && !JUNK_TOKEN.test(text)) {
    kinds.push(SELECTION_KINDS.IMPULSE);
  }
  if (/\bsurveil\b/i.test(text)) kinds.push(SELECTION_KINDS.SURVEIL);
  if (/\bscry\b/i.test(text)) kinds.push(SELECTION_KINDS.SCRY);
  if (RUMMAGE.test(text) && !kinds.includes(SELECTION_KINDS.CONNIVE)) {
    kinds.push(SELECTION_KINDS.RUMMAGE);
  }
  const rummageOrConnive = kinds.includes(SELECTION_KINDS.RUMMAGE) || kinds.includes(SELECTION_KINDS.CONNIVE);
  // Dredge reminder prints "If you would draw a card" — that is a replacement,
  // not net draw. Only rules text can name draw.
  const rulesText = text.replace(REMINDER_TEXT, " ");
  if (/draw (?:a|one|two|three|\d+)/i.test(rulesText) && !rummageOrConnive) {
    kinds.push(SELECTION_KINDS.DRAW);
  }
  return kinds;
}

export const GRAVEYARD_KINDS = Object.freeze({
  MILL: "mill",
  DREDGE: "dredge",
  FLASHBACK: "flashback",
  UNEARTH: "unearth",
  ESCAPE: "escape",
  PERSIST: "persist",
  UNDYING: "undying",
  JUMP_START: "jump_start",
  AFTERMATH: "aftermath",
  MADNESS: "madness",
  RETRACE: "retrace",
  DISTURB: "disturb",
  EMBALM: "embalm",
  ETERNALIZE: "eternalize",
});

const MILL_KEYWORD = /\bmills?\b/i;
const MILL_PUT = /puts? the top .{0,60}(?:card|cards) of .{0,80} library into .{0,40} graveyard/i;
const DREDGE_KEYWORD = /\bdredge\b/i;
const FLASHBACK_KEYWORD = /\bflashback\b/i;
const UNEARTH_KEYWORD = /\bunearth\b/i;
const ESCAPE_KEYWORD = /\bescape\b/i;

/**
 * How a card fills or feeds off a graveyard. Observation only.
 * Mill is not surveil. Dredge is not mill. Flashback and Escape are casts
 * from the yard — a different shape than dredge's return to hand. Unearth
 * is a temporary battlefield return, not permanent reanimation. Persist is
 * not undying. Jump-start is not flashback. Disturb is not flashback. Embalm
 * is not unearth. Eternalize is not embalm. Surveil stays a selection kind.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyGraveyardKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  // Flashback / unearth / escape are distinct keywords that never collide
  // with surveil's reminder text, so they are read before the surveil guard
  // below — that guard exists only to protect mill from a false positive on
  // surveil's own "into your graveyard" phrasing.
  if (FLASHBACK_KEYWORD.test(text)) kinds.push(GRAVEYARD_KINDS.FLASHBACK);
  if (UNEARTH_KEYWORD.test(text)) kinds.push(GRAVEYARD_KINDS.UNEARTH);
  if (ESCAPE_KEYWORD.test(text)) kinds.push(GRAVEYARD_KINDS.ESCAPE);
  if (/\bpersist\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.PERSIST);
  if (/\bundying\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.UNDYING);
  if (/\bjump-start\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.JUMP_START);
  if (/\baftermath\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.AFTERMATH);
  if (/\bmadness\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.MADNESS);
  if (/\bretrace\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.RETRACE);
  if (/\bdisturb\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.DISTURB);
  if (/\bembalm\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.EMBALM);
  if (/\beternalize\b/i.test(text)) kinds.push(GRAVEYARD_KINDS.ETERNALIZE);
  if (/\bsurveil\b/i.test(text)) return kinds;
  if (DREDGE_KEYWORD.test(text)) kinds.push(GRAVEYARD_KINDS.DREDGE);
  // Dredge prints "mill N" inside its own reminder text — that clause is the
  // replacement draw, not a mill dump. Only rules text can name mill, so a
  // card that dredges and separately mills still earns both labels.
  const rulesText = text.replace(REMINDER_TEXT, " ");
  if (MILL_KEYWORD.test(rulesText) || MILL_PUT.test(rulesText)) kinds.push(GRAVEYARD_KINDS.MILL);
  return kinds;
}

export const SACRIFICE_KINDS = Object.freeze({
  OUTLET: "outlet",
  DEATH_PAYOFF: "death_payoff",
  INCIDENTAL_YARD: "incidental_yard",
});

// A cost-shaped "sacrifice a/an X:" that can pay for a creature or any
// permanent — the aristocrats-relevant fuel shape, not a reaction.
const SACRIFICE_OUTLET = /sacrifice (?:a|an|another|one|any number of)[^.:]{0,30}(?:creatures?|permanents?)\b[^:]{0,20}:/i;
// A reaction to a creature leaving, whether by dying or by your own sacrifice.
const DEATH_PAYOFF = /whenever [^.]* dies|whenever you sacrifice (?:a|another) creature/i;
// A named resource (Clue/Treasure/Food/...) or a card leaving hand as a cost
// or effect — the card lands in the graveyard as a side effect, not as a
// dedicated Mill Dump and not as aristocrats fuel.
const INCIDENTAL_YARD = /sacrifice (?:a|an|another|one)[^.:]{0,40}(?:artifact|enchantment|clue|treasure|food|blood|gold|map|junk|powerstone|land)\b[^:]{0,20}:|discard (?:a card|one card|two cards|\d+ cards)/i;

/**
 * How a card touches sacrifice/death — split from the single blended
 * `sacrifice` produces/rewards signal above. Observation only.
 * Outlet is a cost that can sacrifice a creature or permanent, not a
 * reaction. Death payoff reacts to a creature dying or being sacrificed.
 * Incidental yard is a named resource or a discarded card leaving for the
 * graveyard as a side effect — distinct from a Mill Dump.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifySacrificeKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (SACRIFICE_OUTLET.test(text)) kinds.push(SACRIFICE_KINDS.OUTLET);
  if (DEATH_PAYOFF.test(text)) kinds.push(SACRIFICE_KINDS.DEATH_PAYOFF);
  if (INCIDENTAL_YARD.test(text)) kinds.push(SACRIFICE_KINDS.INCIDENTAL_YARD);
  return kinds;
}

export const TRIGGER_KINDS = Object.freeze({
  ENTER: "enter",
  CAST: "cast",
  ATTACK: "attack",
  COMBAT_DAMAGE: "combat_damage",
  NONCOMBAT_DAMAGE: "noncombat_damage",
});

// Same shape as the existing "etb" signal — a card's own "enters the
// battlefield" trigger clause, on itself or on another permanent.
const ENTER_TRIGGER = /enters the battlefield|when(?:ever)? [^.]* enters/i;
// "Whenever you cast" covers prowess/magecraft-shaped triggers without
// minting a separate name for either keyword this phase.
const CAST_TRIGGER = /whenever you cast|whenever [^.]* casts\b/i;
// Same shape as the existing "combat" signal's first alternative — a card's
// own "whenever ~ attacks" trigger clause, not combat damage or a reward for
// attacking creatures in general.
const ATTACK_TRIGGER = /whenever [^.]* attacks/i;
const COMBAT_DAMAGE_TRIGGER = /whenever [^.]* deals combat damage/i;
const DAMAGE_TRIGGER = /whenever [^.]* deals damage/i;

/**
 * What condition fires a card's own trigger — entering the battlefield,
 * casting a spell, attacking, dealing combat damage, or dealing damage.
 * Observation only, and deliberately narrow: this names the trigger
 * condition, not a blink/flicker recursion pattern, not a spellslinger
 * construction package, not the extra-combat-phase amplifier mechanism,
 * not the damage-doubling replacement amplifier, and not stax construction
 * occupancy. Attack is not combat damage. Combat damage is not a generic
 * damage trigger.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyTriggerKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (ENTER_TRIGGER.test(text)) kinds.push(TRIGGER_KINDS.ENTER);
  if (CAST_TRIGGER.test(text)) kinds.push(TRIGGER_KINDS.CAST);
  if (ATTACK_TRIGGER.test(text)) kinds.push(TRIGGER_KINDS.ATTACK);
  if (COMBAT_DAMAGE_TRIGGER.test(text)) kinds.push(TRIGGER_KINDS.COMBAT_DAMAGE);
  else if (DAMAGE_TRIGGER.test(text)) kinds.push(TRIGGER_KINDS.NONCOMBAT_DAMAGE);
  return kinds;
}

export const COUNTER_KINDS = Object.freeze({
  PUT: "put",
  PROLIFERATE: "proliferate",
  REMOVE: "remove",
});

// "Put a counter on" is placement — the shape the blended `counters` signal
// already treats as a producer. Covers both active ("put a counter on
// target creature") and passive ("counters would be put on it") phrasing.
const COUNTER_PUT = /\bput [^.]* counters? on\b|\bcounters? [^.]* put on\b/i;
// Proliferate is a named keyword, not a synonym for placing a counter — its
// own reminder text says "give each another counter", never "put".
const COUNTER_PROLIFERATE = /\bproliferate\b/i;
// Removing a counter, whether as a cost, an effect, or a cleanse.
const COUNTER_REMOVE = /\bremove [^.]* counters? from\b/i;

/**
 * How a card touches counters — split from the single blended `counters`
 * produces/rewards signal. Observation only.
 * Put is placement, not proliferate. Proliferate is its own keyword, not a
 * single counter placement. Remove is neither placement nor proliferate.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyCounterKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (COUNTER_PUT.test(text)) kinds.push(COUNTER_KINDS.PUT);
  if (COUNTER_PROLIFERATE.test(text)) kinds.push(COUNTER_KINDS.PROLIFERATE);
  if (COUNTER_REMOVE.test(text)) kinds.push(COUNTER_KINDS.REMOVE);
  return kinds;
}

export const LIFE_KINDS = Object.freeze({
  GAIN: "gain",
  LIFELINK: "lifelink",
  PAY: "pay",
});

// Actual life gained in rules text — not the "whenever you gain life" payoff
// watch, and not lifelink reminder "causes you to gain that much life".
const LIFE_GAIN = /gain(?:s)? (?:\d+|that much) life|\byou gain\b[^.]*\blife\b|\bgains? \d+ life\b/i;
const LIFE_GAIN_WATCH = /whenever you gain life/gi;
const LIFE_PAY = /\bpay [^.]*\blife\b|\byou lose (?:\d+|that much) life\b/i;

/**
 * How a card touches life totals — split from the single blended `life`
 * produces/rewards signal. Observation only.
 * Gain is an actual life-gain effect, not a "whenever you gain life" payoff
 * and not lifelink's reminder. Lifelink is the keyword, not a lifegain spell.
 * Pay is spending your own life, not opponents losing life.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyLifeKinds(oracle = "") {
  const text = String(oracle || "");
  const rulesText = text.replace(REMINDER_TEXT, " ");
  const kinds = [];
  if (/\blifelink\b/i.test(text)) kinds.push(LIFE_KINDS.LIFELINK);
  const withoutWatch = rulesText.replace(LIFE_GAIN_WATCH, " ");
  if (LIFE_GAIN.test(withoutWatch)) kinds.push(LIFE_KINDS.GAIN);
  if (LIFE_PAY.test(rulesText)) kinds.push(LIFE_KINDS.PAY);
  return kinds;
}

export const PROTECTION_KINDS = Object.freeze({
  HEXPROOF: "hexproof",
  INDESTRUCTIBLE: "indestructible",
  WARD: "ward",
  SHROUD: "shroud",
  PROTECTION_FROM: "protection_from",
  PHASE_OUT: "phase_out",
});

/**
 * How a card stays online — split from the single blended `protection`
 * produces/rewards signal. Observation only.
 * Hexproof is the keyword, not indestructible or ward. Indestructible is
 * the keyword, not hexproof or ward. Ward is a tax on targeting, not
 * hexproof. Shroud is the keyword, not hexproof. Protection-from is the
 * protection-from ability, not hexproof or ward. Phase-out is phasing, not
 * blink/flicker occupancy.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyProtectionKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (/\bhexproof\b/i.test(text)) kinds.push(PROTECTION_KINDS.HEXPROOF);
  if (/\bindestructible\b/i.test(text)) kinds.push(PROTECTION_KINDS.INDESTRUCTIBLE);
  if (/\bward\b/i.test(text)) kinds.push(PROTECTION_KINDS.WARD);
  if (/\bshroud\b/i.test(text)) kinds.push(PROTECTION_KINDS.SHROUD);
  if (/protection from/i.test(text)) kinds.push(PROTECTION_KINDS.PROTECTION_FROM);
  if (/\bphase(?:s|d)? out\b|\bphasing\b/i.test(text)) kinds.push(PROTECTION_KINDS.PHASE_OUT);
  return kinds;
}

export const EVASION_KINDS = Object.freeze({
  FLYING: "flying",
  MENACE: "menace",
  TRAMPLE: "trample",
  UNBLOCKABLE: "unblockable",
  SKULK: "skulk",
  REACH: "reach",
  FEAR: "fear",
  SHADOW: "shadow",
  INTIMIDATE: "intimidate",
});

/**
 * How a card is blocked — split from the single blended `evasion`
 * produces/rewards signal. Observation only.
 * Flying is the keyword, not menace or trample. Menace is the keyword, not
 * flying or trample. Trample is the keyword, not flying or menace.
 * Unblockable is "can't be blocked" without a by/except clause, not skulk
 * and not fear/shadow. Skulk is the keyword, not unblockable. Reach is the
 * keyword, not flying. Fear is the keyword or its artifact-or-black except
 * clause, not unblockable and not intimidate. Shadow is the keyword, not
 * fear. Intimidate is the keyword or its share-a-color except clause, not
 * fear. Horsemanship stays unnamed.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyEvasionKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (/\bflying\b/i.test(text)) kinds.push(EVASION_KINDS.FLYING);
  if (/\bmenace\b/i.test(text)) kinds.push(EVASION_KINDS.MENACE);
  if (/\btrample\b/i.test(text)) kinds.push(EVASION_KINDS.TRAMPLE);
  if (/can't be blocked(?! by| except)|\bunblockable\b/i.test(text)) kinds.push(EVASION_KINDS.UNBLOCKABLE);
  if (/\bskulk\b/i.test(text)) kinds.push(EVASION_KINDS.SKULK);
  if (/\breach\b/i.test(text)) kinds.push(EVASION_KINDS.REACH);
  if (/\bfear\b|can't be blocked except by artifact creatures and\/or black/i.test(text)) kinds.push(EVASION_KINDS.FEAR);
  if (/\bshadow\b/i.test(text)) kinds.push(EVASION_KINDS.SHADOW);
  if (/\bintimidate\b|can't be blocked except by artifact creatures and\/or creatures that share a color/i.test(text)) kinds.push(EVASION_KINDS.INTIMIDATE);
  return kinds;
}

export const LAND_KINDS = Object.freeze({
  LANDFALL: "landfall",
  EXTRA_DROP: "extra_drop",
  SEARCH: "search",
});

const LANDFALL = /\blandfall\b|whenever a land (?:you control )?enters/i;
const EXTRA_LAND_DROP = /play (?:an |\d+ )?additional lands?\b|additional lands? (?:on each of your turns|this turn|each turn)/i;
const LAND_SEARCH = /search your library for [^.]*\blands?\b/i;

/**
 * How a card touches lands — split from the single blended `lands`
 * produces/rewards signal. Observation only.
 * Landfall is a land-enters trigger or the landfall keyword, not an extra
 * land drop and not a land search. Extra land drop is permission to play
 * more lands, not landfall. Search is tutoring a land from the library,
 * not putting a fetched land onto the battlefield as landfall.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyLandKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (LANDFALL.test(text)) kinds.push(LAND_KINDS.LANDFALL);
  if (EXTRA_LAND_DROP.test(text)) kinds.push(LAND_KINDS.EXTRA_DROP);
  if (LAND_SEARCH.test(text)) kinds.push(LAND_KINDS.SEARCH);
  return kinds;
}

export const ARTIFACT_KINDS = Object.freeze({
  SPELL: "spell",
  MATTERS: "matters",
  OUTLET: "outlet",
});

const ARTIFACT_SPELL = /\bartifact spell\b|cast (?:an |a |target )?artifact\b/i;
const ARTIFACT_MATTERS = /artifacts? (?:creatures? )?you control|whenever (?:an? )?artifact enters/i;
const ARTIFACT_OUTLET = /sacrifice an artifact/i;

/**
 * How a card touches artifacts — split from the single blended `artifacts`
 * produces/rewards signal. Observation only.
 * Spell is casting an artifact, not a generic artifacts-you-control payoff
 * and not an artifact outlet. Matters is artifacts you control or an
 * artifact-enters watch, not an artifact-spell trigger. Outlet is
 * sacrificing an artifact, not named-resource occupancy.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyArtifactKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (ARTIFACT_SPELL.test(text)) kinds.push(ARTIFACT_KINDS.SPELL);
  if (ARTIFACT_MATTERS.test(text)) kinds.push(ARTIFACT_KINDS.MATTERS);
  if (ARTIFACT_OUTLET.test(text)) kinds.push(ARTIFACT_KINDS.OUTLET);
  return kinds;
}

export const TOKEN_KINDS = Object.freeze({
  CREATE: "create",
  GO_WIDE: "go_wide",
  SAC: "sac",
});

const TOKEN_CREATE = /create(?:s)? [^.]* token/i;
const TOKEN_GO_WIDE = /token(?:s)? you control|for each token/i;
const TOKEN_SAC = /sacrifice (?:a|one) token/i;

/**
 * How a card touches tokens — split from the single blended `tokens`
 * produces/rewards signal. Observation only.
 * Create is making a token, not a go-wide anthem and not sacrificing a
 * token. Go-wide is tokens you control or for-each-token, not creation.
 * Sac is sacrificing a token, not a creature outlet and not named-resource
 * occupancy.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyTokenKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (TOKEN_CREATE.test(text)) kinds.push(TOKEN_KINDS.CREATE);
  if (TOKEN_GO_WIDE.test(text)) kinds.push(TOKEN_KINDS.GO_WIDE);
  if (TOKEN_SAC.test(text)) kinds.push(TOKEN_KINDS.SAC);
  return kinds;
}

export const AURA_KINDS = Object.freeze({
  ENCHANT: "enchant",
  MATTERS: "matters",
  AFFINITY: "affinity",
});

const AURA_ENCHANT = /\benchant (?:creature|permanent|artifact|land|planeswalker|equipment)\b/i;
const AURA_MATTERS = /auras? you control|whenever (?:an? )?aura\b/i;
const AURA_AFFINITY = /affinity for auras/i;

/**
 * How a card touches Auras — split from the single blended `auras`
 * produces/rewards signal. Observation only.
 * Enchant is the Aura enchant-clause, not an auras-you-control payoff and
 * not affinity. Matters is auras you control or an Aura-enters watch, not
 * the enchant clause. Affinity is affinity for Auras, not enchanting.
 * Equipment is a separate axis, not an Aura kind.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyAuraKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (AURA_ENCHANT.test(text)) kinds.push(AURA_KINDS.ENCHANT);
  if (AURA_MATTERS.test(text)) kinds.push(AURA_KINDS.MATTERS);
  if (AURA_AFFINITY.test(text)) kinds.push(AURA_KINDS.AFFINITY);
  return kinds;
}

export const SPELL_KINDS = Object.freeze({
  COPY: "copy",
  FREE: "free",
  NONCREATURE: "noncreature",
  STORM: "storm",
  CASCADE: "cascade",
  REBOUND: "rebound",
});

const SPELL_COPY = /copy [^.]* spell/i;
const SPELL_FREE = /without paying (?:its |the |their )?(?:mana )?cost/i;
const SPELL_NONCREATURE = /instant (?:or|and) sorcery|noncreature spell/i;

/**
 * How a card touches spells — split from the single blended `spells`
 * produces/rewards signal. Observation only.
 * Copy is copying a spell, not casting without paying and not an
 * instant-or-sorcery watch. Free is casting without paying mana, not
 * flashback and not copy. Noncreature is instant-or-sorcery / noncreature
 * spell text, not a whenever-you-cast trigger kind and not magecraft.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifySpellKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (SPELL_COPY.test(text)) kinds.push(SPELL_KINDS.COPY);
  if (SPELL_FREE.test(text)) kinds.push(SPELL_KINDS.FREE);
  if (SPELL_NONCREATURE.test(text)) kinds.push(SPELL_KINDS.NONCREATURE);
  if (/\bstorm\b/i.test(text)) kinds.push(SPELL_KINDS.STORM);
  if (/\bcascade\b/i.test(text)) kinds.push(SPELL_KINDS.CASCADE);
  if (/\brebound\b/i.test(text)) kinds.push(SPELL_KINDS.REBOUND);
  return kinds;
}

export const DRAW_KINDS = Object.freeze({
  WATCH: "watch",
  WHEEL: "wheel",
  HAND: "hand",
});

const DRAW_WATCH = /whenever you draw|second card/i;
const DRAW_WHEEL = /each player discards? [^.]* hand|each player draws \d+|discard your hand, then draw/i;
const DRAW_HAND = /cards? in your hand|maximum hand size/i;

/**
 * How a card touches drawing — split from the single blended `draw`
 * produces/rewards signal. Observation only.
 * Watch is a whenever-you-draw or second-card payoff, not net draw and not
 * a wheel. Wheel is each-player discard/draw or discard-your-hand-then-draw,
 * not rummage. Hand is cards-in-hand or maximum hand size, not a draw spell.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyDrawKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (DRAW_WATCH.test(text)) kinds.push(DRAW_KINDS.WATCH);
  if (DRAW_WHEEL.test(text)) kinds.push(DRAW_KINDS.WHEEL);
  if (DRAW_HAND.test(text)) kinds.push(DRAW_KINDS.HAND);
  return kinds;
}

export const DAMAGE_KINDS = Object.freeze({
  DEAL: "deal",
  DRAIN: "drain",
  PREVENT: "prevent",
});

const DAMAGE_DEAL = /deals? (?:\d+|that much) damage/i;
const DAMAGE_DRAIN = /each opponent loses [^.]*\blife\b|target opponent loses [^.]*\blife\b|(?:an? )?opponents? lose[s]? (?:\d+|that much) life/i;
const DAMAGE_PREVENT = /prevent (?:the next )?(?:\d+|all)(?: combat)? damage/i;

/**
 * How a card deals, drains, or prevents damage — observation only.
 * Deal is numeric/that-much damage, not a combat-damage trigger.
 * Drain is opponents losing life, not paying your own life.
 * Prevent is preventing damage, not dealing it.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyDamageKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (DAMAGE_DEAL.test(text)) kinds.push(DAMAGE_KINDS.DEAL);
  if (DAMAGE_DRAIN.test(text)) kinds.push(DAMAGE_KINDS.DRAIN);
  if (DAMAGE_PREVENT.test(text)) kinds.push(DAMAGE_KINDS.PREVENT);
  return kinds;
}

export const EQUIPMENT_KINDS = Object.freeze({
  EQUIP: "equip",
  ATTACH: "attach",
  BONUS: "bonus",
});

const EQUIPMENT_EQUIP = /\bequip\b/i;
const EQUIPMENT_ATTACH = /becomes attached|whenever [^.]* equipped/i;
const EQUIPMENT_BONUS = /equipped creature/i;

/**
 * How a card touches Equipment — observation only.
 * Equip is the equip keyword, not an attach trigger and not an equipped-creature
 * bonus. Attach is becoming attached or whenever equipped, not the equip cost.
 * Bonus is "equipped creature", not the equip keyword. Auras stay unnamed here.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyEquipmentKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (EQUIPMENT_EQUIP.test(text)) kinds.push(EQUIPMENT_KINDS.EQUIP);
  if (EQUIPMENT_ATTACH.test(text)) kinds.push(EQUIPMENT_KINDS.ATTACH);
  if (EQUIPMENT_BONUS.test(text)) kinds.push(EQUIPMENT_KINDS.BONUS);
  return kinds;
}

export const COMBAT_KINDS = Object.freeze({
  HASTE: "haste",
  EXTRA: "extra",
  VIGILANCE: "vigilance",
  FIRST_STRIKE: "first_strike",
  DOUBLE_STRIKE: "double_strike",
  DEATHTOUCH: "deathtouch",
});

/**
 * How a card postures in combat — observation only.
 * Haste is the keyword, not extra combat and not vigilance.
 * Extra is an additional combat phase, not an attack trigger.
 * Vigilance is the keyword, not haste. First strike is the keyword, not
 * double strike. Double strike is the keyword, not first strike.
 * Deathtouch is the keyword, not first strike. Reach is an evasion kind, not a combat kind.
 * These labels must not become produces/rewards until a harness earns that.
 */
export function classifyCombatKinds(oracle = "") {
  const text = String(oracle || "");
  const kinds = [];
  if (/\bhaste\b/i.test(text)) kinds.push(COMBAT_KINDS.HASTE);
  if (/additional combat phase/i.test(text)) kinds.push(COMBAT_KINDS.EXTRA);
  if (/\bvigilance\b/i.test(text)) kinds.push(COMBAT_KINDS.VIGILANCE);
  if (/\bfirst strike\b/i.test(text)) kinds.push(COMBAT_KINDS.FIRST_STRIKE);
  if (/\bdouble strike\b/i.test(text)) kinds.push(COMBAT_KINDS.DOUBLE_STRIKE);
  if (/\bdeathtouch\b/i.test(text)) kinds.push(COMBAT_KINDS.DEATHTOUCH);
  return kinds;
}

export function findResetPayPairs(cards = []) {
  const nodes = (cards || []).filter((card) => card?.name && !/\bLand\b/i.test(card.typeLine || card.type_line || ""));
  const pairs = [];
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const shape = resetPayShape(textOf(left), textOf(right));
      if (!shape) continue;
      pairs.push({
        cards: [left.name, right.name],
        loopKind: LOOP_KINDS.CLOSED_LOOP,
        shape,
        reason: RESET_SHAPE_REASON[shape],
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_RESET_SHAPE,
      });
    }
  }
  return pairs;
}

/**
 * Display / face names a card may be referred to by in Oracle text.
 */
export function referenceNamesForCard(card = {}) {
  const raw = [
    card.name,
    ...String(card.name || "").split(/\s*\/\/\s*/),
    ...(card.card_faces || []).map((face) => face?.name),
  ].filter(Boolean).map((name) => String(name).trim());
  const unique = [];
  const seen = new Set();
  for (const name of raw) {
    const key = normalizeCardLookupKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

/**
 * True when Oracle text explicitly references targetName via authoritative
 * phrasing (named / Partner with / Meld with). Not a bare name mention.
 */
export function oracleExplicitlyNames(oracleText = "", targetName = "") {
  const text = String(oracleText || "");
  const target = String(targetName || "").trim();
  if (!text || !target) return false;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow flexible internal whitespace; require the explicit cue words.
  const nameBody = escaped.replace(/\s+/g, "\\s+");
  const patterns = [
    new RegExp(`\\bnamed\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
    new RegExp(`\\bpartner with\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
    new RegExp(`\\bmeld with\\s+${nameBody}(?=$|[\\s.,;:!?)"'\\]])`, "i"),
  ];
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Explicit Oracle name references from source → other cards in the same set.
 * Self-references are ignored. Only matches cards present in `cards`.
 */
export function findExplicitOracleReferences(cards = []) {
  const nodes = cards.filter((card) => card?.name);
  const catalog = [];
  for (const card of nodes) {
    for (const displayName of referenceNamesForCard(card)) {
      catalog.push({
        key: normalizeCardLookupKey(displayName),
        displayName,
        cardName: card.name,
      });
    }
  }
  // Longer names first so "Sword of Fire and Ice" wins over accidental shorts.
  catalog.sort((a, b) => b.displayName.length - a.displayName.length);

  const refs = [];
  const seen = new Set();
  for (const source of nodes) {
    const sourceText = textOf(source);
    const sourceKeys = new Set(referenceNamesForCard(source).map((name) => normalizeCardLookupKey(name)));
    for (const entry of catalog) {
      if (sourceKeys.has(entry.key)) continue;
      if (!oracleExplicitlyNames(sourceText, entry.displayName)) continue;
      const pairKey = `${normalizeCardLookupKey(source.name)}→${entry.key}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      refs.push({
        from: source.name,
        to: entry.cardName,
        namedAs: entry.displayName,
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
        evidenceClass: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
        reason: `${source.name}'s Oracle text explicitly names ${entry.displayName}.`,
      });
    }
  }
  return refs;
}

function tagSignalsFor(card, table) {
  const tags = cardTagLookup(normalizeCardName(card?.name));
  if (!tags || !tags.length) return [];
  return Object.entries(table)
    .filter(([, tagNames]) => tagNames.some((tag) => tags.includes(tag)))
    .map(([signal]) => signal);
}

// Curated tags from the offline card-mechanics database confirm a producer or
// payoff role with certainty an oracle-text regex can't match — no keyword
// drift, no missed synonyms. Only mapped where the database draws a clean
// producer/payoff line; ambiguous tags (e.g. broad "card_advantage") are left
// to the regex heuristics below rather than forced into a pairing they don't
// cleanly support.
const TAG_PRODUCERS = {
  tokens: ["token_producer"],
  counters: ["counter_producer"],
  graveyard: ["graveyard_setup"],
  sacrifice: ["sacrifice_outlet"],
  // "land_search" does not distinguish hand (Many Partings, Sylvan
  // Scrying) from battlefield (Rampant Growth) — the database tag alone
  // can't tell "lands"'s landfall_payoff pairing whether this card
  // actually fires "whenever a land enters". The regex PRODUCERS.lands
  // below carries the battlefield-scoped signal instead; a hand-only
  // fetch correctly gets none.
  life: ["lifegain"],
  treasure: ["treasure"],
};

const TAG_PAYOFFS = {
  tokens: ["token_payoff"],
  counters: ["counter_payoff"],
  graveyard: ["graveyard_recursion"],
  sacrifice: ["death_payoff"],
  lands: ["landfall_payoff"],
  life: ["lifegain_payoff"],
  spells: ["spell_payoff"],
};

const SIGNALS = [
  ["tokens", /create(?:s)? [^.]* token|token(?:s)? you control/i],
  ["treasure", /treasure token|treasures? you control/i],
  ["clues", /clue token|investigate|clues? you control/i],
  ["food", /food token|foods? you control/i],
  ["blood", /blood token|blood tokens? you control/i],
  ["gold", /gold token|gold tokens? you control/i],
  ["maps", /map token|maps? you control/i],
  ["junk", /junk token|junk tokens? you control/i],
  ["powerstones", /powerstone token|powerstones? you control/i],
  ["persistent_token_mana", /tokens? you control have[^.]*\{T\}[^.]*\badd\b|create(?:s)? [^.]* token/i],
  ["persistent_artifact_mana", /artifacts? you control have[^.]*\{T\}[^.]*\badd\b|create(?:s)? [^.]* (?:artifact|clue|treasure|food|blood|gold|map|junk|powerstone) token/i],
  ["spell_velocity", /\bflashback\b|\bretrace\b|\bjump-start\b|\bstorm\b|whenever you cast/i],
  ["explore", /\bexplores?\b/i],
  ["exile_play", /(?:play|cast) [^.]* from exile|play the exiled card/i],
  ["artifacts", /artifact(?:s)? you control|artifact spell|artifact enters|sacrifice an artifact/i],
  // Aura is deliberately narrower than enchantment: Pearl-Ear-class
  // commanders reward Auras specifically, and generic enchantments must
  // not form a false synergy edge merely by sharing the enchantment type.
  ["auras", /\bAura\b|affinity for auras|auras?[^.]* you control|whenever [^.]*\baura\b/i],
  ["counters", /(?:put|remove|double)[^.]* counter|counter(?:s)? on/i],
  ["graveyard", /from your graveyard|in your graveyard|mill [a-z\d]|surveil/i],
  ["sacrifice", /sacrifice (?:a|another|one|any number)|whenever [^.]* dies/i],
  ["draw", /draw (?:a|one|two|three|\d+)|whenever you draw/i],
  ["spells", /whenever you cast|instant or sorcery|noncreature spell/i],
  ["lands", /land enters|landfall|play (?:an?|one|two|three|four|five|\d+) additional lands?|land card/i],
  ["life", /gain(?:s)? [^.]* life|whenever you gain life|life total/i],
  ["etb", /enters the battlefield|when(?:ever)? [^.]* enters/i],
  // \bcombat damage\b — see the identical fix and full reasoning on
  // PAYOFFS.combat below (Smaug the Impenetrable's "noncombat damage"
  // contains "combat damage" as a bare substring).
  ["combat", /whenever [^.]* attacks|\bcombat damage\b|attacking creature/i],
  // Flying/menace/trample/unblockable are printed as literal words in a
  // card's own oracle text whenever it has or grants them — no separate
  // keywords field needed, textOf() already sees them.
  ["evasion", /\bflying\b|\bmenace\b|\btrample\b|can(?:'|’)t be blocked|\bskulk\b/i],
  ["protection", /\bhexproof\b|\bindestructible\b|protection from|\bward\b \d|phase out/i],
];

// Founder #056/#057: a "whenever you cast a[n] TYPE spell" trigger naming
// one of these five types is a different real archetype entirely, not the
// instant/sorcery spellslinger signal PAYOFFS.spells otherwise represents
// — see that entry's comment for the real cards (Smith/T'Challa, Sythis,
// Ugin/Glaring Fleshraker, Chronicle Thief) each type is verified against.
// Composed (not a plain literal) so PAYOFFS.spells' lookahead below and
// OFF_TARGET_SPELL_TYPE_CAST — the guard extractMechanicalSignals applies
// to the curated-database "spell_payoff" tag, which carries the identical
// false positive on 1,424 cards independent of this regex — share the
// exact same type-word list and can't drift apart from each other.
const OFF_TARGET_SPELL_CAST_SUFFIX = /(?:an?|another) \b(?:artifact|creature|enchantment|colorless|legendary)\b spell/i;
const OFF_TARGET_SPELL_TYPE_CAST = new RegExp(`whenever you cast ${OFF_TARGET_SPELL_CAST_SUFFIX.source}`, "i");

const PRODUCERS = {
  tokens: /create(?:s)? [^.]* token/i,
  persistent_token_mana: /create(?:s)? [^.]* token/i,
  treasure: /create(?:s)? [^.]* treasure|treasure token/i,
  clues: /investigate|create(?:s)? [^.]* clue/i,
  food: /create(?:s)? [^.]* food|food token/i,
  blood: /create(?:s)? [^.]* blood token/i,
  gold: /create(?:s)? [^.]* gold token/i,
  maps: /create(?:s)? [^.]* map token/i,
  junk: /create(?:s)? [^.]* junk token/i,
  powerstones: /create(?:s)? [^.]* powerstone token/i,
  explore: /create(?:s)? [^.]* map token|target creature explores?|creatures? you control explore/i,
  exile_play: /create(?:s)? [^.]* junk token|exile [^.]* you may (?:play|cast)|play the exiled card/i,
  artifacts: /create(?:s)? [^.]* (?:artifact|clue|treasure|food|blood|gold|map|junk|powerstone) token|artifact spell|investigate/i,
  persistent_artifact_mana: /create(?:s)? [^.]* (?:artifact|clue|treasure|food|blood|gold|map|junk|powerstone) token|investigate/i,
  spell_velocity: /\bflashback\b|\bretrace\b|\bjump-start\b|\brebound\b|return [^.]* to (?:its owner's|your) hand/i,
  // Only the Aura subtype produces this signal — "Enchantment" alone does not,
  // and oracle phrases like "affinity for Auras" must not mark the commander
  // itself as an Aura producer. Type-line membership is applied in
  // extractMechanicalSignals.
  // Founder #045: Wither and Infect are both real keywords whose entire
  // rules function is "deals damage to creatures in the form of -1/-1
  // counters instead" — a real, common -1/-1-counter producer that never
  // says "put ... counter" in its own reminder text, so a purely
  // -1/-1-counters commander (Auntie Ool, Cursewretch: "Whenever one or
  // more -1/-1 counters are put on a creature, draw a card...") never
  // connected to real Wither creatures (Massacre Girl, Kulrath Knight,
  // Necroskitter — all verified via Scryfall). Verified this doesn't
  // sweep in an unrelated toughness-reduction effect: The Meathook
  // Massacre's "-X/-X until end of turn" is a temporary stat reduction,
  // not real counters, and correctly stays unmatched.
  // Founder #051/#052, corrected same day: Energy and Experience counters
  // were briefly folded into this same "counters" signal via their "get"
  // placement verb. Wrong call, caught by Zach directly: unlike +1/+1,
  // -1/-1, charge, or any other counter this signal is about, Energy and
  // Experience are counters a PLAYER has, not counters on a permanent —
  // structurally closer to poison than to +1/+1. Blending them here meant
  // Guide of Souls (pure Energy, no relation to +1/+1 or -1/-1 at all)
  // started reading as "commander-connected" to Auntie Ool, Cursewretch
  // (a -1/-1-counters-specific payoff commander) purely because both sides
  // now shared the same generic "counters" bucket — confirmed as a real,
  // reproducible false positive before this fix. Moved to their own
  // player_counters signal below instead, the same way this file already
  // keeps Treasure/Clue/Food/Blood/Gold/Map/Junk/Powerstone as their own
  // dedicated signals rather than folding them into the generic
  // artifacts/tokens signal they'd otherwise blend into.
  counters: /put [^.]* counter|proliferate|\bwither\b|\binfect\b/i,
  // Founder #053: Energy and Experience counters, moved out of the
  // generic "counters" signal above — see that entry's comment for why.
  // Both use "get" as their placement verb (Satya, Aetherflux Genius:
  // "You get {E}{E} (two energy counters)"; Kratos, Stoic Father: "you
  // get an experience counter"; Guide of Souls, Whirler Virtuoso — all
  // verified via Scryfall), scoped here to require "energy" or
  // "experience" appear with "counter", not a bare "get ... counter" —
  // deliberately narrower than the reverted #052 version now that it's
  // not sharing a bucket with the permanent-counters signal, so there's
  // no reason to risk a bare "get" false positive when the real template
  // always names the counter type. Also real player-counter producers:
  // Proliferate's own reminder text is explicit ("Choose any number of
  // permanents and/or players, then give each another counter of each
  // kind already there" — Contagion Clasp) — it grows player counters
  // exactly as much as permanent ones, so it belongs in both signals, not
  // just the generic one above. Counter-doubling effects that explicitly
  // cover players (Innkeeper's Talent's level 3: "put ... counters on a
  // permanent or player") are the same case — Doubling Season itself,
  // verified via Scryfall, only ever says "on a permanent," never "or
  // player," so it correctly does NOT match this pattern; it doesn't
  // affect poison/energy/experience in real rules text either.
  // Founder #065: found via a real Fynn, the Fangbearer comparison — the
  // single most iconic "poison counters matter" commander in the format
  // (Zach's own original #053 framing named poison counters as the
  // reference case for this whole signal — "the experience counters...
  // act more like poison counters" — but the shipped #053 regex only ever
  // covered energy/experience literally, never the word "poison" itself).
  // Fynn's real trigger ("that player GETS two poison counters") produced
  // zero player_counters credit before this fix. Also found while fixing
  // it: the old pattern required the exact word "get" with a trailing
  // word boundary, which can never match the "gets" third-person verb
  // form real player-targeted counter grants almost always use (a player
  // getting a counter is nearly always someone ELSE's trigger acting on
  // them, not a first-person "you get") — checked a 12-card real sample
  // (68 total, verified via Scryfall) and "gets" outnumbers "get" heavily
  // (Etali, Vraska's Fall, Infectious Inquiry, Prologue to Phyresis,
  // Infectious Bite, Venerated Rotpriest, Ichor Rats, Bloodroot
  // Apothecary all use "gets"). Made the "s" optional. Also added a bare
  // "poison counters" mention (matching experience's existing bare-mention
  // precedent) for the PAYOFF side ("Corrupted — ...opponent has three or
  // more poison counters" — Skrelv's Hive, Glistening Sphere) — this also
  // retroactively connects real Infect creatures, whose own reminder text
  // ("...and to players in the form of poison counters") already
  // literally contains the phrase; correct, since Infect genuinely
  // produces both permanent -1/-1 counters (already covered above) AND
  // player-scoped poison counters, and #053's whole point was to stop
  // conflating the two, not to prevent a card from legitimately doing
  // both. Toxic (the modern generalization of Infect's player-damage
  // half) is covered the same way via its own reminder text.
  player_counters: /\bgets?\b [^.]*?\b(?:energy|experience|poison) counters?\b|\bproliferate\b|\bcounters? on [^.]*? or player\b/i,
  // Founder #042: the old `/mill [a-z\d]/` only ever matched the rare
  // imperative "you mill three cards" phrasing — the third-person verb
  // form nearly every real mill card actually uses ("target player
  // MILLS three cards", "each opponent MILLS two cards", "each player
  // MILLS a card") never has a space right after "mill" (it's followed
  // by "s"), so it silently missed Mindcrank, Psychic Corrosion, and Syr
  // Konrad's own activated ability entirely — verified against all three
  // real cards' oracle text. `\bmills?\b` catches both forms.
  graveyard: /\bmills?\b|surveil|discard [^.]* card/i,
  // Scoped to creature tokens specifically — the same fix already applied
  // to the treasure/clue/food/blood/gold/map/junk/powerstone signals below,
  // just missed here. A Treasure/Clue/other named-artifact-token producer
  // is not sacrifice-fodder production; matching "create...token" generically
  // let e.g. a pure Treasure-token commander (Smaug the Impenetrable: no
  // sacrifice or death-trigger text at all) falsely "connect" to any
  // aristocrats death-payoff card in the pool via this one shared signal.
  // Founder #073: found via a real Tergrid, God of Fright comparison — her
  // real payoff ("Whenever an opponent sacrifices a nontoken permanent or
  // discards a permanent card, you may put that card...onto the
  // battlefield") already correctly reads as PAYOFFS.sacrifice (#055), but
  // classic forced-sacrifice edicts (Diabolic Edict: "Target player
  // sacrifices a creature of their choice."; Innocent Blood: "Each player
  // sacrifices...") produced nothing at all — neither this producer
  // pattern (they don't create tokens or have a "when X dies" trigger)
  // nor the shared PAYOFFS.sacrifice signal alone is enough, since
  // commanderConnectionSignalsFor requires one side's rewards to match the
  // OTHER side's produces. Tergrid never connected to the exact classic
  // edict effects that are her most obvious real inclusion. Verified 184
  // real cards use a "target player/each opponent/each player sacrifices"
  // shape via Scryfall — a large, real, previously-uncovered template.
  // Deliberately excludes "whenever you sacrifice"/"sacrifice a creature:"
  // (an outlet or self-sacrifice, a different real shape already covered
  // by the curated sacrifice_outlet tag and PAYOFFS.sacrifice) by
  // requiring an explicit third-party subject (target player/each
  // opponent/each player/that player) immediately before "sacrifices".
  sacrifice: /create(?:s)? [^.]* creature token|when [^.]* dies|\b(?:target player|each opponent|each player|that player) sacrifices?\b/i,
  // Founder #043: the old `/draw (?:a|one|two|three|\d+)/` only matched
  // the imperative "draw a card" phrasing — the third-person "draws" verb
  // (no space right after "draw", same class of gap as PRODUCERS.graveyard
  // /#042) silently missed Nekusar's own "that player draws an additional
  // card", plus every real wheel effect (Wheel of Fortune: "draws seven
  // cards", Burning Inquiry: "draws three cards") and variable-count
  // phrasing with no number word at all (Windfall/Jace's Archivist/
  // Whispering Madness: "draws cards equal to...", Teferi's Puzzle Box:
  // "draws that many cards"). `draws? [^.]*?\bcards?\b` catches all of
  // these plus the original imperative form in one pattern, bounded to
  // the same sentence so it can't cross into an unrelated later clause.
  draw: /draws? [^.]*?\bcards?\b/i,
  // Founder #079: found via a real Melek, Izzet Paragon comparison — his
  // real "whenever you cast an instant or sorcery spell" payoff never
  // connected to Baral, Chief of Compliance's real "Instant and sorcery
  // spells you cast cost {1} less to cast" (arguably the single most
  // iconic spellslinger cost-reduction enabler in Commander), because
  // neither "copy a spell" nor "cast without paying" covers cost
  // reduction at all — confirmed via commanderConnectionSignalsFor
  // returning [] before this fix, the same asymmetry class #073 found
  // for sacrifice/edicts. Scoped to "instant and/or sorcery"/"noncreature"
  // spell-type qualifiers specifically (23 and 8 real cards respectively,
  // verified via Scryfall) — deliberately excludes bare "creature spells
  // you cast cost less" (Animar, Soul of Elements) and other off-target
  // types (artifact/enchantment cost reduction), which enable a
  // structurally different archetype, not spellslinger velocity.
  spells: /copy [^.]* spell|cast [^.]* without paying|(?:instant and sorcery|instant or sorcery|noncreature) spells you cast cost [^.]* less/i,
  // Many Partings class: a land search that only reaches the player's
  // HAND (Many Partings, Sylvan Scrying) never fires "whenever a land
  // enters"/landfall — it's a normal land drop like any other, not an
  // extra one. Requires "battlefield" in the same clause, and the
  // land/type alternation so a non-land toolbox tutor is never swept
  // in — see LAND_SEARCH_TO_BATTLEFIELD in blueprint-note-and-mana.mjs
  // for the identical pattern and full reasoning. "play an additional
  // land" is untouched, it's a genuinely extra land drop.
  // Founder #054: Azusa, Lost but Seeking — the format's single most
  // iconic extra-land-drop commander — reads "play TWO additional lands",
  // verified via live Scryfall text. The old pattern only accepted the
  // singular "an additional land" (Exploration/Burgeoning's wording), so
  // Azusa herself produced and rewarded nothing. Now any of an/one/two/
  // three/a bare digit works, singular or plural.
  lands: /search your library for [^.]*\b(?:lands?|plains|island|swamp|mountain|forest)\b[^.]*\bbattlefield\b|play (?:an?|one|two|three|four|five|\d+) additional lands?/i,
  life: /gain(?:s)? [^.]* life|lifelink/i,
  etb: /create(?:s)? [^.]* token|return [^.]* to the battlefield/i,
  // A creature that merely HAS haste (Smaug the Impenetrable: "Flying,
  // indestructible, haste", with zero attack-payoff text of its own) is
  // not an "attacks matter" enabler for the whole deck — it just isn't
  // summoning-sick. A card that GRANTS haste (Fires of Yavimaya:
  // "Creatures you control have haste.") genuinely is: it lets the whole
  // team start attacking a turn early, a real team-wide combat-plan
  // signal. Requires "have haste"/"gains haste" so the effect actually
  // applies beyond the card itself — verified against real granted-haste
  // cards (Fires of Yavimaya, Concordant Crossroads, Reckless Charge, all
  // still match) and real self-only-haste cards (Smaug, Ball Lightning,
  // now correctly excluded). Found auditing why a real Smaug build had
  // 58 of its 63 nonland cards falsely reading as "commander-connected"
  // via this exact signal, worth +14 raw score each — Smaug's own text
  // has no combat payoff at all; its real ability is noncombat-damage-
  // into-Treasures, unrelated to attacking.
  combat: /have haste|gains? haste|create(?:s)? [^.]* creature token/i,
  // Having or granting the keyword itself is what "produces" evasion — a
  // vanilla flier and an aura that says "target creature gains flying"
  // are the same producer shape from a synergy-detection standpoint.
  evasion: /\bflying\b|\bmenace\b|\btrample\b|can(?:'|’)t be blocked|\bskulk\b/i,
  protection: /\bhexproof\b|\bindestructible\b|protection from|\bward\b|phase out|gains? indestructible|gains? hexproof/i,
  // No SIGNALS entry — narrow scope, just enough to support the Fiery
  // Emancipation/Furnace of Rath amplifier below rather than a full
  // producer/payoff pairing built on an unverified guess. A real,
  // verified PAYOFFS.damage entry exists below (Founder #048) for the one
  // specific template found grounded in real cards; a fully generic
  // "damage matters" payoff still doesn't have a clean, confidently-
  // verified phrasing the way tokens/counters/graveyard payoffs do.
  // Founder #085: found via a real Arabella, Abandoned Doll comparison —
  // her real "Whenever Arabella attacks, it deals X damage to each
  // opponent..." never registered as a damage producer at all, since the
  // old pattern required a literal digit — "X" (or "that much", the same
  // real shape Kediss, Emberclaw Familiar's damage-redirect uses) never
  // matched. This meant Arabella could never connect to a real Curiosity-
  // style noncombat-damage-draw aura (#048's PAYOFFS.damage) if one were
  // attached to her — confirmed via commanderConnectionSignalsFor
  // returning [] before this fix. Verified 27 real commanders use "deals
  // X damage" and 27 more use "deals that much damage" via Scryfall
  // (also Balin, Loremaster; Crystal, Inhuman Princess) — variable-amount
  // damage is at least as common as fixed-number damage among real
  // commander pingers, not a rare edge case.
  damage: /deals? (?:\d+|x|that much) damage/i,
};

const PAYOFFS = {
  tokens: /token(?:s)? you control|for each token|sacrifice a token/i,
  persistent_token_mana: /tokens? you control have[^.]*\{T\}[^.]*\badd\b/i,
  treasure: /treasures? you control|sacrifice a treasure/i,
  clues: /clues? you control|sacrifice a clue|clue token|whenever you (?:sacrifice|create) a clue/i,
  food: /foods? you control|sacrifice a food|whenever you (?:sacrifice|create) (?:a|one or more) food/i,
  blood: /blood tokens? you control|sacrifice a blood|whenever you (?:sacrifice|create) (?:a|one or more) blood token/i,
  gold: /gold tokens? you control|sacrifice a gold|whenever you (?:sacrifice|create) (?:a|one or more) gold token/i,
  maps: /maps? you control|sacrifice a map|whenever you (?:sacrifice|create) (?:a|one or more) map token/i,
  junk: /junk tokens? you control|sacrifice a junk|whenever you (?:sacrifice|create) (?:a|one or more) junk token/i,
  powerstones: /powerstones? you control|sacrifice a powerstone|whenever you (?:sacrifice|create) (?:a|one or more) powerstone token/i,
  explore: /whenever [^.]* explores?|if [^.]* explored|creatures? you control that explored/i,
  exile_play: /whenever you (?:play|cast) [^.]* from exile|cards? you (?:play|cast) from exile/i,
  artifacts: /artifact(?:s)? you control|whenever (?:you cast |an? )?artifact|sacrifice an artifact/i,
  persistent_artifact_mana: /artifacts? you control have[^.]*\{T\}[^.]*\badd\b/i,
  spell_velocity: /\bstorm\b|whenever you cast (?:or copy )?(?:an? |your )?(?:instant|sorcery|noncreature|spell)|whenever you cast your (?:second|third)|for each spell (?:cast|you've cast)/i,
  // Founder #054: Ardenn, Intrepid Archaeologist — a real, popular Auras
  // and Equipment commander — reads "attach any number of Auras and
  // Equipment you control", verified via live Scryfall text. The old bare
  // "auras? you control" required "you control" immediately after the
  // word, so the "and Equipment" in between broke the match and Ardenn
  // produced and rewarded nothing. Widened to allow text between "aura(s)"
  // and "you control" within the same clause, same style already used
  // throughout this file (e.g. "gain(?:s)? [^.]* life").
  auras: /affinity for auras|whenever [^.]*\baura\b|auras?[^.]* you control|enchanted creature you control/i,
  // "Put counters on target X" is a producer, not a payoff. The old broad
  // `counters on` branch classified Ayula as both sides of a counter engine,
  // letting any unrelated counter producer masquerade as commander synergy.
  // A payoff must react to, scale from, replace, or spend existing counters.
  // Founder #051, corrected same day as #053: "pay {E}" was briefly
  // folded in here as Energy's own spend verb. Wrong bucket — Energy is a
  // player counter, not a permanent counter, so this created the same
  // false-positive risk described on PRODUCERS.counters above (a pure
  // Energy payoff card reading as connected to a +1/+1 or -1/-1 commander
  // that has nothing to do with Energy). Moved to player_counters below.
  // Founder #100 (found via the same cross-classifier disagreement mining
  // #098/#099 used, checking "counters" this round): the "if"/"whenever"/
  // "for each" alternatives above had no word boundary around "counter",
  // so they matched "counter" as a bare substring of "countered" — the
  // spell-negation verb, unrelated to the counter game object. Any
  // counterspell with a real "If [it/that spell] is countered this way,
  // exile/put it..." redirect clause (a common, iconic template) false-
  // positived a "counters" reward: verified 9 real cards in the mined
  // corpus lost this false credit and gain nothing back (Force of
  // Negation, Memory Lapse, Lapse of Certainty, Transcendent Dragon,
  // Syncopate, Spell Shrivel, Reject, Assert Authority, Devious Cover-Up
  // — every one is a pure counterspell with zero real +1/+1/charge/other
  // counter mechanic anywhere else in its text). Added \b around
  // counter(s) on the three affected alternatives; "remove [^.]* counter"
  // and "modified creature" were already substring-safe (verified zero
  // corpus-wide change) and left untouched.
  counters: /whenever [^,.;]*\bcounters?\b|if [^,.;]*\bcounters?\b|for each [^.]*\bcounters?\b|remove [^.]* counter|modified creature/i,
  // Founder #053: Energy and Experience payoffs, moved out of the generic
  // "counters" signal above — see PRODUCERS.player_counters and that
  // entry's comment for why. Energy's spend verb is "pay {E}"/"pay ...
  // energy" (Satya, Aetherflux Genius: "sacrifice that token unless you
  // pay an amount of {E} equal to its mana value"), never "remove a
  // counter." Experience counters are never spent at all — Kratos, Stoic
  // Father and Atreus, Impulsive Son both just reference the running
  // count ("for each experience counter you have" / "equal to the number
  // of experience counters you have"), so a bare "experience counter(s)"
  // mention is the real payoff shape, not a "for each"/"if" qualifier —
  // real oracle text never uses that exact phrase incidentally.
  // Founder #065: added a bare "poison counters" mention, the same
  // bare-mention precedent "experience counters" already established
  // above — see PRODUCERS.player_counters's comment for the real cards
  // and reasoning (Fynn, the Fangbearer; Skrelv's Hive/Glistening Sphere's
  // "Corrupted" payoff; the retroactive Infect/Toxic reminder-text
  // connection).
  player_counters: /pay [^.]*?\{E\}|pay [^.]*? energy|\bexperience counters?\b|\bpoison counters?\b/i,
  // Founder #042: "is/are milled" (passive) is the reward shape — a card
  // reacting to milling happening, regardless of source (The Wise
  // Mothman: "Whenever one or more nonland cards are milled, put a +1/+1
  // counter..."; Syr Konrad's own first ability; Undead Alchemist) —
  // distinct from "mills" (active), the producer verb PRODUCERS.graveyard
  // above now also matches. Verified this stays one-directional: none of
  // the real mill PRODUCERS (Mindcrank, Psychic Corrosion, Syr Konrad's
  // own activated ability) use "milled"/"put into ... graveyard from", so
  // no card double-counts as both sides of its own trigger.
  // Founder #061: found via a real Teval, the Balanced Scale comparison.
  // "Whenever one or more cards leave your graveyard, create a token" is a
  // real, common template (41 real cards, verified via Scryfall) that
  // never contains "from your graveyard" or any other existing
  // alternative — Tormod, the Desecrator is a real legendary partner
  // commander whose ENTIRE oracle text is exactly this one clause, so he
  // scored zero graveyard-payoff credit before this fix. Teval's own text
  // happened to also contain "from your graveyard" in an earlier clause
  // (her land-recursion attack trigger), which coincidentally already
  // satisfied this signal and masked the gap — verified the "leave your
  // graveyard" clause in isolation matched nothing before this fix.
  graveyard: /from your graveyard|in your graveyard|delirium|threshold|\b(?:is|are) milled\b|put into [^.]*graveyard from (?:anywhere|their library|your library)|leaves? your graveyard/i,
  // Founder #055: "sacrifice another" alone missed the two most common
  // real sacrifice-mechanic shapes in the whole format. (1) The classic
  // sac-outlet activated-ability cost is nearly always "Sacrifice a
  // creature:" / "Sacrifice a Goblin:" (Ashnod's Altar, Viscera Seer,
  // Goblin Bombardment — all verified via Scryfall) — "a", not "another",
  // since the outlet itself is an artifact/permanent, not a creature that
  // could be sacrificing itself. (2) Forced-sacrifice "edict" effects use
  // third-person "sacrifices" (Diabolic Edict: "Target player sacrifices a
  // creature.") — the old pattern's "sacrifice" (no trailing s) can't match
  // that verb form at all. Both are extremely common, defining shapes of
  // real aristocrats/edict decks, and both scored zero commander-connection
  // credit before this fix. Widened to any object article, and made the
  // "s" on the verb optional so both first-person costs and third-person
  // edicts match.
  // Founder #060: Scapeshift ("Sacrifice any number of lands. Search your
  // library for that many land cards...") — a real, iconic staple — scored
  // zero sacrifice credit, because "any number of" is a real, common
  // quantifier shape #055 didn't cover (only "a"/"an"/"another"). Found
  // during a real Hearthhull, the Worldseed comparison (a real land-
  // sacrifice commander) whose own primer names Scapeshift as a core
  // piece.
  // Founder #062: found via a real Edgar Markov comparison. Two more real
  // quantifier/verb-form gaps, same root cause as #055/#060. (1) Vraan,
  // Executioner Thane — a real legendary commander the primer itself
  // highlights — "Whenever one or more other creatures you control DIE"
  // (plural verb, grammatically correct for a plural subject) never
  // matched, since the old pattern only accepted the singular "dies" (28
  // real cards use this plural form, verified via Scryfall — Morbid
  // Opportunist, Vraan himself, others). (2) Bolas's Citadel — "{T},
  // Sacrifice TEN nonland permanents: Each opponent loses 10 life." — a
  // specific number (not "a"/"an"/"another"/"any number of") is a real,
  // common quantifier shape (108 real cards use "sacrifice <number>",
  // verified via Scryfall — Mondrak, Peregrin Took, Magda, Brazen Outlaw).
  sacrifice: /whenever [^.]* (?:dies|die)\b|whenever you sacrifice|sacrifices? (?:a|an|another|any number of|\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  // Founder #043: "whenever you draw" alone missed a whole real archetype
  // — Nekusar's own payoff ("Whenever an opponent draws a card, Nekusar
  // deals 1 damage to that player.") and its namesake staples Fate
  // Unraveler/Underworld Dreams share the identical "whenever an opponent
  // draws" template, never "whenever YOU draw". Verified against all
  // three real cards' oracle text.
  // Founder #099 (found via cross-referencing this file's produces/rewards
  // against blueprint-note-and-mana.mjs's independently-built ROLE_PATTERNS
  // across the full mined corpus — the same technique #098 used, this time
  // pointing the other direction): the bare "cards? in your hand" clause
  // was a false-positive magnet with no documented real-card justification
  // anywhere in this file's history. Checked every real card in the
  // 5,249-card mined corpus that depends on this clause alone for "draw"
  // credit (16 total, zero overlap with any legitimate draw-related
  // wording elsewhere in their own text) — every one of them is a static
  // hand-size-scaling effect with nothing to do with drawing: Maro/
  // Masumaro, First to Live/Sylvan Yeti (power = cards in hand), Empyrial
  // Plate/Sword of War and Peace (equipment bonus scales with hand size),
  // Spontaneous Generation/Baldin, Century Herdmaster (token count/pump
  // scales with hand size), Inner Fire/Metalworker (ritual mana scales
  // with hand size), Ensnaring Bridge (a stax effect gated on hand size),
  // Thoughts of Ruin/Nightmare Unmaking (land destruction/board wipe
  // scaled by hand size), Venser's Journal (lifegain scales with hand
  // size), Master of Predicaments/Satoru Umezawa ("a card in your hand"/
  // "creature card in your hand" as an unrelated object reference, not a
  // hand-size count at all). None of these cards care whether you draw
  // more or fewer cards — they just reference the current count for an
  // unrelated effect. Removed the clause; verified zero real cards in the
  // corpus lose legitimate draw credit as a result (every real
  // draw-payoff card that happens to also mention "cards in your hand" —
  // Sylvan Library, Castle Locthwain, Jin-Gitaxias, Forgotten Creation,
  // Tolarian Winds — already matches independently via "whenever you
  // draw" or the shared PRODUCERS.draw pattern elsewhere in its own text).
  draw: /whenever you draw|second card|whenever (?:an? )?opponent(?:s)? draws?\b/i,
  // Founder #056: bare "whenever you cast" was a false-positive magnet —
  // real cards use the identical "whenever you cast a[n] TYPE spell"
  // template for archetypes that have nothing to do with the instant/
  // sorcery spellslinger signal this bucket otherwise represents (its
  // sibling PRODUCERS side is type-line-gated to Instant/Sorcery, plus
  // copy/free-cast effects). Sythis, Harvest's Hand ("Whenever you cast an
  // enchantment spell...") was the concrete case: it showed up as a
  // spellslinger reward, meaning every random instant/sorcery in an
  // enchantress deck's pool read as "commander-connected" via this signal.
  // Excluded the known off-target types that name a different archetype
  // entirely — artifact (T'Challa), creature, enchantment (Sythis),
  // colorless (Ugin, Eye of the Storms; Glaring Fleshraker — the Eldrazi
  // colorless-matters archetype, already a real fixture in this test
  // suite), and legendary (Chronicle Thief) spell-cast triggers, all real
  // cards. Did NOT require an instant/sorcery/noncreature qualifier
  // instead, because
  // real spellslinger-adjacent commanders often use bare untyped triggers
  // with no type word at all — Jori En, Ruin Diver ("cast your second
  // spell each turn") and Kalamax, the Stormsire ("cast your first
  // instant spell each turn") both still need to match, and a
  // require-a-qualifier design would have broken both.
  spells: new RegExp(`whenever you cast(?! ${OFF_TARGET_SPELL_CAST_SUFFIX.source})|magecraft|instant and sorcery`, "i"),
  lands: /landfall|whenever a land enters|lands you control/i,
  life: /whenever you gain life|if your life total|life you gained/i,
  // Founder #048: found by cross-checking Vivi Ornitier's real primer —
  // "Curiosity effects to draw with every noncreature spell" is the
  // deck's own stated Plan A, and Vivi's second ability ("it deals 1
  // damage to each opponent") is explicitly NONCOMBAT, yet Curiosity,
  // Ophidian Eye, and Tandem Lookout (all real, verified via Scryfall)
  // all say "whenever [enchanted/this] creature deals damage to an
  // opponent" — no "combat" qualifier at all, so Vivi's own noncombat
  // ping genuinely does trigger the draw. Deliberately narrow: this
  // matches exactly the one verified real template found (not a bare
  // "deals damage" scan), so it stays distinct from PRODUCERS.combat's
  // \bcombat damage\b below and doesn't reopen the broader "damage
  // matters" generalization PRODUCERS.damage's own comment (above)
  // explicitly declined to guess at.
  damage: /(?:enchanted creature|this creature) deals damage to (?:an? )?opponent[^.]*?,\s*(?:you may )?draw/i,
  // A permanent's own one-shot "When this enters" ability is not an ETB
  // payoff package. Payoffs must repeatedly watch other or categorized
  // permanents entering; otherwise every ordinary ETB creature appears to
  // reward every token maker in the deck.
  // Also match "Whenever NAME or another TRIBE enters" (Ayula-class), which
  // does not contain the contiguous phrase "whenever another".
  etb: /whenever another [^.]* enters|whenever (?:a|an|one or more|nontoken) [^.]* enters|whenever [^.]+ or another [^.]* enters/i,
  // \bcombat damage\b, not a bare substring match: "noncombat damage"
  // (Smaug the Impenetrable's actual trigger condition, explicitly the
  // opposite of caring about combat damage) contains "combat damage" as a
  // literal substring with no boundary check, so the bare version read
  // Smaug as REWARDING combat damage — the one thing its own ability is
  // specifically NOT about.
  combat: /whenever [^.]* attacks|\bcombat damage\b|attacking creatures/i,
  // Deliberately narrower than PRODUCERS.evasion — this is cards that
  // specifically reward flying/menace/unblocked creatures (an anthem
  // that only boosts fliers), not a token that happens to have flying.
  evasion: /creatures? you control with (?:flying|menace)|with (?:flying|menace) get |unblocked|can(?:'|’)t be blocked except/i,
  // Real "protection matters" payoffs are rare (protection is mostly a
  // standalone defensive tool, not a two-card engine axis) — this stays
  // narrow on purpose rather than over-matching unrelated text.
  protection: /creatures? you control with hexproof|creatures? you control with indestructible|whenever [^.]* with hexproof|whenever [^.]* with indestructible/i,
};

const NEGATIVE_RULES = [
  ["graveyard", /cards? in graveyards? can(?:'|’)t|exile all graveyards|if a card would be put into a graveyard, exile/i, "Graveyard denial conflicts with the deck's recursion or graveyard payoffs."],
  ["etb", /creatures? entering (?:the battlefield )?don(?:'|’)t cause abilities to trigger|abilities don(?:'|’)t trigger when [^.]* enters/i, "ETB suppression conflicts with the deck's own enter-the-battlefield package."],
  ["tokens", /tokens? can(?:'|’)t be created|if a token would be created, no/i, "Token prevention conflicts with the deck's token engine."],
  ["counters", /counters? can(?:'|’)t be put|players can(?:'|’)t get counters/i, "Counter prevention conflicts with the deck's counter package."],
  ["sacrifice", /players can(?:'|’)t sacrifice|permanents can(?:'|’)t be sacrificed/i, "Sacrifice prevention conflicts with the deck's sacrifice outlets or death payoffs."],
  ["spells", /players can(?:'|’)t cast noncreature spells|each player can(?:'|’)t cast more than one spell/i, "Spell restriction conflicts with the deck's own spell-heavy engine."],
  // Sulfuric Vortex-style: a symmetric lifegain lock a deck's own lifegain
  // package can't work around, unlike a one-sided "opponents can't gain
  // life" hoser (already excluded below by the opponent-text filter).
  ["life", /players can(?:'|’)t gain life|if a player would gain life, (?:that player|they) (?:gains? no life|loses? that much life instead)/i, "Life-gain denial conflicts with the deck's own lifegain package."],
  // Stranglehold-style: shuts off the deck's own fetch/tutor-to-battlefield
  // land package along with everyone else's.
  ["lands", /players can(?:'|’)t search (?:their )?libraries|players can(?:'|’)t play lands from (?:their )?libraries/i, "Library-search denial conflicts with the deck's own land-tutoring or fetch package."],
  // Mornsong Aria-style: a symmetric draw lock that also conflicts with
  // the deck's own draw package, same shape as the life/lands rules above.
  ["draw", /players can(?:'|’)t draw cards?/i, "Draw denial conflicts with the deck's own card-draw package."],
];

// Certain rules facts, not inferred patterns — a card with one of these
// texts objectively doubles a real resource or trigger elsewhere in the
// deck. The positive counterpart to NEGATIVE_RULES: same "verified"
// evidence tier, just an amplifier instead of a conflict. Each entry names
// which side of a card's mechanics the doubling actually reaches:
// Panharmonicon-style trigger doublers amplify the "rewards" side (the
// card's own "whenever X enters" ability is what fires twice), while
// Doubling Season-style resource doublers amplify the "produces" side
// (every effect that creates the resource makes twice as many, whether or
// not it's phrased as a trigger).
const DOUBLER_PATTERNS = [
  {
    signal: "etb",
    side: "rewards",
    // Founder #054: current Oracle wording for both Panharmonicon and Yarok,
    // the Desecrated reads "artifact/permanent entering causes ... to
    // trigger" — no "the battlefield" at all, and "entering" (the
    // participle), never bare "enter"/"enters". Verified against live
    // Scryfall text for both. The old alternation required either the bare
    // verb or the exact phrase "entering the battlefield", so it silently
    // never matched either of the format's two most iconic ETB-doubler
    // cards. Now any of enter/enters/entering matches, with "the
    // battlefield" optional regardless of which verb form is used.
    pattern: /(?:enters?|entering)(?: the battlefield)?[^.]{0,80}triggers? an additional time/i,
    verb: "makes every enters-the-battlefield trigger in the deck happen an additional time",
  },
  {
    signal: "tokens",
    side: "produces",
    pattern: /if an effect would create (?:one or more|1 or more) tokens?[^.]*, it creates? twice that many/i,
    verb: "doubles every token this deck creates",
  },
  {
    signal: "counters",
    side: "produces",
    pattern: /if an effect would put (?:one or more|1 or more) counters?[^.]*, it puts twice that many/i,
    verb: "doubles every counter this deck places",
  },
  // Aggravated Assault/Combat Celebrant-style: a literal extra combat
  // phase is a certain rules fact, not an inferred pattern — every "whenever
  // ~ attacks" trigger in the deck gets a second attack step to fire from
  // this turn. Amplifies "rewards," same as the ETB doubler above: the
  // combat trigger itself is what fires twice, not what a card produces.
  {
    signal: "combat",
    side: "rewards",
    pattern: /additional combat phase/i,
    verb: "grants an additional combat phase, giving every attack trigger in the deck a second chance to fire this turn",
  },
  // Fiery Emancipation/Furnace of Rath/Gratuitous Violence-style: a source
  // dealing double (or triple) damage instead is a certain rules
  // replacement effect, not an inferred pattern. Amplifies "produces" —
  // every burn spell or damage-dealing ability in the deck hits harder,
  // whether or not it's phrased as a trigger.
  // Founder #064: found via a real Ojer Axonil, Deepest Might comparison —
  // a popular, modern (MH3) mono-red commander whose entire identity is
  // this exact amplifier shape, verified via Scryfall: "If a red source
  // you control would deal an amount of noncombat damage less than Ojer
  // Axonil's power to an opponent, that source deals damage equal to Ojer
  // Axonil's power instead." A FLOOR/minimum replacement, not a
  // multiplier — the old pattern's "double|triple" never matched. While
  // researching real prevalence, found a third real shape too: Thor,
  // Asgard's Avenger — "it deals that much damage plus 1 instead" (an
  // additive +N replacement, neither a multiplier nor a floor). Both
  // added as their own alternatives alongside the original multiplier
  // shape, verified against all three real cards plus a negative control
  // (an unrelated damage-prevention effect).
  {
    signal: "damage",
    side: "produces",
    pattern: /if a[^.]*source (?:you control )?would deal damage to[^.]*, it deals (?:double|triple) that damage|if a[^.]*source (?:you control )?would deal[^.]*damage[^.]*, that source deals damage equal to[^.]*instead|if a[^.]*source (?:you control )?would deal damage to[^.]*, it deals that much damage plus \d+ instead/i,
    verb: "doubles (or triples) the damage every source in the deck deals",
  },
  // Founder #101: the etb doubler above (Panharmonicon/Yarok's "entering
  // ... causes a triggered ability ... to trigger, that ability triggers
  // an additional time") is one instance of a much broader, real, shared
  // grammatical template — verified via Scryfall: 21 real cards use this
  // exact "[condition] causes a triggered ability of a permanent you
  // control to trigger, that ability triggers an additional time" tail
  // with a different leading trigger-condition clause each time. Only the
  // etb/entering condition had an entry here; several other real,
  // genuinely iconic commanders whose entire identity IS this amplifier
  // shape were completely invisible to it. Each added below is grounded in
  // a real, currently-printed card, verified directly against its exact
  // Oracle text — this is not a speculative widening.
  {
    signal: "spells",
    side: "rewards",
    // Veyran, Voice of Duality — one of the format's most popular
    // spellslinger/magecraft commanders. Her real second ability:
    // "If you casting or copying an instant or sorcery spell causes a
    // triggered ability of a permanent you control to trigger, that
    // ability triggers an additional time."
    pattern: /casting or copying (?:an? )?(?:instant or sorcery|instant|sorcery) spell[^.]{0,80}triggers? an additional time/i,
    verb: "doubles every instant/sorcery-cast trigger in the deck",
  },
  {
    signal: "draw",
    side: "rewards",
    // Krang, the All-Powerful — real text: "If a player drawing a card
    // causes a triggered ability of a permanent you control to trigger,
    // that ability triggers an additional time."
    pattern: /(?:a player|you) drawing (?:a|one or more) cards?[^.]{0,80}triggers? an additional time/i,
    verb: "doubles every card-draw trigger in the deck",
  },
  {
    signal: "life",
    side: "rewards",
    // Dr. Beverly Crusher — real text: "If you gaining life causes a
    // triggered ability of a permanent you control to trigger, that
    // ability triggers an additional time."
    pattern: /you gaining life[^.]{0,80}triggers? an additional time/i,
    verb: "doubles every lifegain trigger in the deck",
  },
  {
    signal: "sacrifice",
    side: "rewards",
    // Drivnod, Carnage Dominus and Teysa Karlov — both real, popular
    // aristocrats commanders: "If a creature dying causes a triggered
    // ability of a permanent you control to trigger, that ability
    // triggers an additional time." "Dies" is this file's own established
    // verb for the sacrifice signal's death-trigger side (see
    // PRODUCERS.sacrifice's "when [^.]* dies" alternative above).
    pattern: /a creature dying[^.]{0,80}triggers? an additional time/i,
    verb: "doubles every creature-death trigger in the deck",
  },
];

function textOf(card) {
  return [
    card.typeLine,
    card.type_line,
    card.oracleText,
    card.oracle_text,
  ].filter(Boolean).join(" ");
}

export function extractMechanicalSignals(card) {
  const text = textOf(card);
  const typeLine = String(card?.typeLine || card?.type_line || "");
  const signals = SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const regexProduces = Object.entries(PRODUCERS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const regexRewards = Object.entries(PAYOFFS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const tagProduces = tagSignalsFor(card, TAG_PRODUCERS);
  const tagRewards = tagSignalsFor(card, TAG_PAYOFFS);
  // Aura production is subtype-precise: only cards printed as Aura.
  const auraProducer = /\bAura\b/i.test(typeLine) ? ["auras"] : [];
  // Instant/Sorcery type line produces the "spells" signal the same way Aura
  // subtype produces "auras": a spellslinger payoff rewards cast events, and
  // the actual castable spells are the producers — not only copy/cheat effects.
  const spellProducer = /\bInstant\b|\bSorcery\b/i.test(typeLine) ? ["spells"] : [];
  const produces = [...new Set([...regexProduces, ...tagProduces, ...auraProducer, ...spellProducer])];
  // "Whenever this attacks, create a token" is production, not a combat-matters
  // payoff. Extra-combat amplifiers still see real attack payoffs (draw, pump,
  // damage) because those do not need a create clause to match.
  const attackToProduceOnly = /whenever [^.]* attacks[^.]*create/i.test(text)
    && !/combat damage|attacking creatures|whenever another [^.]* attacks/i.test(text);
  // Founder #057: the curated database's "spell_payoff" tag (mapped to
  // this same "spells" signal via TAG_PAYOFFS) carries the identical
  // off-target-type false positive #056 fixed in the regex — Sythis and
  // Ugin, Eye of the Storms both carry the tag independently of their own
  // oracle text matching PAYOFFS.spells, and 1,424 cards total carry it.
  // Retagging the database is a different, much larger task; this reuses
  // the same verified real-card exclusion instead, only stripping the
  // tag's contribution when it's the sole source (a genuine instant/
  // sorcery/magecraft/untyped match from the regex itself still stands).
  const offTargetSpellPayoffTag = tagRewards.includes("spells") && !regexRewards.includes("spells")
    && OFF_TARGET_SPELL_TYPE_CAST.test(text);
  // Founder #058: the curated database's "counter_payoff" tag (322 cards,
  // mapped to this same "counters" signal via TAG_PAYOFFS) turned out to
  // be mistagged on a large scale — verified via a 73-card spread sample
  // from the real tagged list (Scryfall-fetched), 62% of which had no
  // occurrence of the word "counter" anywhere in their real oracle text at
  // all. Root cause: the auto-tagger appears to conflate any "tap
  // creatures with total power/toughness N" cost shape with the counters
  // mechanic — Crew N (Vehicles: Bomat Bazaar Barge, Cargo Ship), Saddle N
  // (Mounts), and Teamwork N (conspiracies) all carry it despite having
  // nothing to do with the counter game object. Unlike #057's off-target
  // type check (a real distinction between two legitimate archetypes),
  // there's no nuance to preserve here — a "counters" reward with zero
  // mention of the literal word "counter" anywhere in the card's own text
  // is a data error, not an edge case. counter_producer (2,016 cards) was
  // checked the same way with a 68-card spread sample and came back 0%
  // mistagged, so it's untouched.
  const noCounterWordInOwnText = tagRewards.includes("counters") && !regexRewards.includes("counters")
    && !/\bcounters?\b/i.test(text);
  const rewards = [...new Set([...regexRewards, ...tagRewards])].filter((signal) => !(signal === "combat" && attackToProduceOnly)
    && !(signal === "spells" && offTargetSpellPayoffTag)
    && !(signal === "counters" && noCounterWordInOwnText));
  if (auraProducer.length && !signals.includes("auras")) signals.push("auras");
  if (spellProducer.length && !signals.includes("spells")) signals.push("spells");
  const oracle = card.oracleText || card.oracle_text || text;
  const selectionKinds = classifySelectionKinds(oracle);
  const graveyardKinds = classifyGraveyardKinds(oracle);
  const sacrificeKinds = classifySacrificeKinds(oracle);
  const triggerKinds = classifyTriggerKinds(oracle);
  const counterKinds = classifyCounterKinds(oracle);
  const lifeKinds = classifyLifeKinds(oracle);
  const protectionKinds = classifyProtectionKinds(oracle);
  const evasionKinds = classifyEvasionKinds(oracle);
  const landKinds = classifyLandKinds(oracle);
  const artifactKinds = classifyArtifactKinds(oracle);
  const tokenKinds = classifyTokenKinds(oracle);
  const auraKinds = classifyAuraKinds(oracle);
  const spellKinds = classifySpellKinds(oracle);
  const drawKinds = classifyDrawKinds(oracle);
  const damageKinds = classifyDamageKinds(oracle);
  const equipmentKinds = classifyEquipmentKinds(oracle);
  const combatKinds = classifyCombatKinds(oracle);
  return { signals, produces, rewards, tagProduces, tagRewards, selectionKinds, graveyardKinds, sacrificeKinds, triggerKinds, counterKinds, lifeKinds, protectionKinds, evasionKinds, landKinds, artifactKinds, tokenKinds, auraKinds, spellKinds, drawKinds, damageKinds, equipmentKinds, combatKinds };
}

export function buildInteractionGraph(cards, options = {}) {
  const nodes = cards.filter((card) => card?.name).map((card) => ({
    ...card,
    quantity: Math.max(1, Number(card.quantity || 1)),
    mechanics: extractMechanicalSignals(card),
  }));
  const nonlands = nodes.filter((card) => !/\bLand\b/i.test(card.typeLine || ""));
  const edges = [];
  for (let leftIndex = 0; leftIndex < nonlands.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nonlands.length; rightIndex += 1) {
      const left = nonlands[leftIndex];
      const right = nonlands[rightIndex];
      const forward = left.mechanics.produces.filter((signal) => right.mechanics.rewards.includes(signal));
      const reverse = right.mechanics.produces.filter((signal) => left.mechanics.rewards.includes(signal));
      const shared = left.mechanics.signals.filter((signal) => right.mechanics.signals.includes(signal));
      // evasion/protection are deliberately left out of this shared-theme
      // whitelist: two random fliers, or two creatures that each happen to
      // have hexproof, aren't synergizing just because they share a
      // keyword the way two graveyard cards share a real theme. Those two
      // signals only ever form an edge through genuine producer/payoff
      // wiring below (an aura granting flying feeding an anthem that
      // rewards fliers), never merely by both mentioning the same keyword.
      // Merely making tokens on both cards is too broad to be a relationship:
      // a Clue engine and an unrelated Angel-token spell do not support each
      // other. Token edges require a real producer/payoff direction.
      const reasons = [...new Set([...forward, ...reverse, ...shared.filter((signal) => ["spells", "graveyard", "counters", "artifacts", "clues", "food", "blood", "gold", "maps", "junk", "powerstones", "explore", "exile_play", "combat"].includes(signal))])];
      // A signal counts as database-confirmed only when the producing side's
      // tag AND the rewarding side's tag both come from the curated
      // card-mechanics database rather than a regex guess — e.g. a real
      // sacrifice_outlet feeding a real death_payoff, not two cards that
      // merely mention "sacrifice" and "dies" in unrelated ways.
      const tagForward = forward.filter((signal) => left.mechanics.tagProduces.includes(signal) && right.mechanics.tagRewards.includes(signal));
      const tagReverse = reverse.filter((signal) => right.mechanics.tagProduces.includes(signal) && left.mechanics.tagRewards.includes(signal));
      const tagConfirmed = tagForward.length + tagReverse.length;
      // A one-way edge (A feeds B) is an ordinary synergy pairing. A mutual
      // edge — each card produces a signal the other one rewards — is the
      // shape of a real two-card engine (a token maker plus a sac outlet
      // that pays off tokens and whose own death trigger the maker doesn't
      // care about, say). Still inferred from text patterns, not a verified
      // combo database, so it's surfaced as a structural pattern to
      // investigate, never as a guaranteed interaction — unless the curated
      // mechanics database confirms both ends, in which case it's labeled
      // verified rather than inferred.
      // A reciprocal engine needs different directional resources: A feeds
      // B through one signal and B feeds A through another. Two cards that
      // merely produce and reward the same broad resource are related, but
      // do not form a loop or justify combo language.
      const mutual = forward.some((signal) => !reverse.includes(signal))
        && reverse.some((signal) => !forward.includes(signal));
      if (reasons.length) edges.push({
        from: left.name,
        to: right.name,
        signals: reasons,
        strength: Math.min(100, 52 + reasons.length * 14 + (forward.length + reverse.length) * 9 + tagConfirmed * 6),
        reason: `${left.name} and ${right.name} connect through ${reasons.join(", ")}.`,
        evidence: tagConfirmed
          ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_VERIFIED
          : forward.length || reverse.length
            ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_INFERRED
            : RELATIONSHIP_EVIDENCE.ORACLE_SHARED_SIGNAL,
        evidenceClass: tagConfirmed
          ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_VERIFIED
          : forward.length || reverse.length
            ? RELATIONSHIP_EVIDENCE.ORACLE_MECHANICAL_INFERRED
            : RELATIONSHIP_EVIDENCE.ORACLE_SHARED_SIGNAL,
        mutual,
        forwardSignals: forward,
        reverseSignals: reverse,
      });
    }
  }

  // Founder #018 — Relationship Evidence: Explicit Oracle.
  // Cards whose Oracle literally names another deck card (named X /
  // Partner with X / Meld with X). Authoritative, not inferred synergy.
  const explicitReferences = findExplicitOracleReferences(nodes);
  const edgeKey = (from, to) => {
    const a = normalizeCardLookupKey(from);
    const b = normalizeCardLookupKey(to);
    return a < b ? `${a}||${b}` : `${b}||${a}`;
  };
  const edgesByPair = new Map(edges.map((edge) => [edgeKey(edge.from, edge.to), edge]));
  for (const ref of explicitReferences) {
    const key = edgeKey(ref.from, ref.to);
    const existing = edgesByPair.get(key);
    if (existing) {
      if (!existing.signals.includes("oracle_explicit")) existing.signals = [...existing.signals, "oracle_explicit"];
      existing.evidence = RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT;
      existing.evidenceClass = RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT;
      existing.namedAs = ref.namedAs;
      existing.strength = Math.max(existing.strength, 94);
      existing.reason = `${existing.reason} ${ref.reason}`;
      continue;
    }
    const edge = {
      from: ref.from,
      to: ref.to,
      signals: ["oracle_explicit"],
      strength: 94,
      reason: ref.reason,
      evidence: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
      evidenceClass: RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
      namedAs: ref.namedAs,
      mutual: false,
      forwardSignals: ["oracle_explicit"],
      reverseSignals: [],
    };
    edges.push(edge);
    edgesByPair.set(key, edge);
  }

  edges.sort((a, b) => b.strength - a.strength || a.from.localeCompare(b.from));

  const packageMap = new Map();
  for (const card of nonlands) for (const signal of card.mechanics.signals) {
    if (!packageMap.has(signal)) packageMap.set(signal, []);
    packageMap.get(signal).push(card.name);
  }
  if (explicitReferences.length) {
    const namedMembers = [...new Set(explicitReferences.flatMap((ref) => [ref.from, ref.to]))];
    if (namedMembers.length >= 2) {
      packageMap.set("oracle_explicit", namedMembers);
    }
  }
  const packages = [...packageMap.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([signal, members]) => ({
      signal,
      members,
      count: members.length,
      evidence: signal === "oracle_explicit" ? RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT : "modeled package",
    }))
    .sort((a, b) => b.count - a.count || a.signal.localeCompare(b.signal));

  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const isolated = nonlands
    .filter((card) => !card.isCommander && !connected.has(card.name))
    .map((card) => card.name);
  const nonbos = [];
  for (const source of nonlands) for (const [signal, denial, reason] of NEGATIVE_RULES) {
    if (!denial.test(textOf(source)) || /your opponents?|opponents? can(?:'|’)t/i.test(textOf(source))) continue;
    const conflicts = nonlands.filter((card) => card.name !== source.name && (card.mechanics.produces.includes(signal) || card.mechanics.rewards.includes(signal)));
    if (conflicts.length) nonbos.push({ source: source.name, signal, conflicts: conflicts.map((card) => card.name), reason, evidence: RELATIONSHIP_EVIDENCE.ORACLE_CONFLICT });
  }
  // A trigger doubler amplifies every card with a real "whenever X enters"
  // payoff already in the deck — not just cards it shares a produces/
  // rewards pairing with, since it doesn't need to produce anything itself
  // to double an existing trigger. A separate pass from the edges above,
  // same as nonbos: a fundamentally different (and here, positive) claim
  // than an inferred producer/payoff pairing.
  const amplifiers = [];
  for (const source of nonlands) for (const { signal, side, pattern, verb } of DOUBLER_PATTERNS) {
    if (!pattern.test(textOf(source))) continue;
    const amplified = nonlands.filter((card) => card.name !== source.name && card.mechanics[side].includes(signal));
    if (amplified.length) amplifiers.push({
      source: source.name,
      signal,
      // Which side of a card's mechanics the doubling reaches — exposed so
      // a caller evaluating a candidate not yet in the deck (Meta Breaker
      // Lab) can check card.mechanics[side].includes(signal) directly,
      // without re-deriving DOUBLER_PATTERNS' own side mapping a second
      // time elsewhere.
      side,
      amplifies: amplified.map((card) => card.name),
      reason: `${source.name} ${verb} — a certain rules fact, not an inferred pattern.`,
      evidence: RELATIONSHIP_EVIDENCE.ORACLE_AMPLIFIER,
    });
  }
  const commander = nonlands.find((card) => card.isCommander);
  const commanderLinks = commander ? edges.filter((edge) => edge.from === commander.name || edge.to === commander.name) : [];
  const coverage = nonlands.length ? connected.size / nonlands.length : 0;
  const confidence = nonlands.length < 8 ? "LOW · INCOMPLETE CARD SET" : coverage >= .75 ? "HIGH · ORACLE-DERIVED" : coverage >= .45 ? "MEDIUM · PARTIAL PACKAGE COVERAGE" : "LOW · MANY ISOLATED SLOTS";
  const byName = new Map(nonlands.map((card) => [card.name, card]));
  const enginePairs = edges
    .filter((edge) => edge.mutual)
    .map((edge) => {
      const left = byName.get(edge.from);
      const right = byName.get(edge.to);
      const loopKind = classifyLoopKind(textOf(left || {}), textOf(right || {}));
      return {
        cards: [edge.from, edge.to],
        strength: edge.strength,
        loopKind,
        reason: `${edge.from} feeds ${edge.to}'s ${edge.forwardSignals.join("/")} payoff, while ${edge.to} feeds ${edge.from}'s ${edge.reverseSignals.join("/")} payoff back — a genuine two-way loop, not just a shared theme.`,
        evidence: RELATIONSHIP_EVIDENCE.ORACLE_MUTUAL_LOOP,
      };
    })
    .sort((a, b) => b.strength - a.strength);
  const resetPairs = findResetPayPairs(nonlands);
  return {
    nodes,
    edges,
    packages,
    isolated,
    nonbos,
    amplifiers,
    enginePairs,
    resetPairs,
    commanderLinks,
    explicitReferences,
    coverage,
    confidence,
    methodology: "Relationships come from oracle text and type lines: mechanical producer/payoff inference, plus oracle_explicit edges when Oracle literally names another card in the deck. Mutual pairs are labeled engine / closed_loop / conditional_win as vocabulary. Reset/pay shapes are a separate observation pass — not verified infinites and not construction credit. Selection kinds (scry / surveil / rummage / connive / impulse / draw) are observation labels on a card's own filter — they do not form edges and are not construction credit. Graveyard kinds name mill as a dump, dredge as a graveyard filter/engine, flashback and escape as casts from the yard, unearth as a temporary battlefield return, persist as a dies-return with a -1/-1 counter, undying as a dies-return with a +1/+1 counter, jump-start as a recast that discards, aftermath as a graveyard-only half, madness as a discard-to-exile recast, retrace as a land-discard recast, not flashback, disturb as a graveyard-face recast, not flashback, embalm as an exile-to-token copy, not unearth, and eternalize as a 4/4 black Zombie token copy, not embalm; they also do not form edges or construction credit. Sacrifice kinds split the blended sacrifice signal into outlet (a cost that can sacrifice a creature or permanent), death payoff (reacts to a creature dying or being sacrificed), and incidental yard (a named resource or discarded card leaving for the graveyard as a side effect, distinct from a Mill Dump); they also do not form edges or construction credit. Trigger kinds name a card's own trigger condition as enter (the battlefield), cast, attack, combat damage, or noncombat damage, distinct from a blink/flicker recursion pattern, from spellslinger construction occupancy, from the extra-combat-phase amplifier mechanism, from the damage-doubling replacement amplifier, and from stax construction occupancy; attack is not combat damage; combat damage is not a generic damage trigger; they also do not form edges or construction credit. Counter kinds split the blended counters signal into put (placement), proliferate (its own named keyword, not a synonym for placing a counter), and remove; they also do not form edges or construction credit. Life kinds split the blended life signal into gain (an actual life-gain effect, not a whenever-you-gain-life payoff and not lifelink reminder), lifelink (the keyword, not a lifegain spell), and pay (spending your own life, not opponents losing life); they also do not form edges or construction credit. Protection kinds split the blended protection signal into hexproof (the keyword, not indestructible or ward), indestructible (the keyword, not hexproof or ward), and ward (a tax on targeting, not hexproof); shroud (the keyword, not hexproof), protection-from (the ability, not hexproof or ward), and phase-out (phasing, not blink occupancy); they also do not form edges or construction credit. Evasion kinds split the blended evasion signal into flying, menace, trample, unblockable (can't be blocked, not skulk and not fear/shadow), skulk (the keyword, not unblockable), reach (the keyword, not flying), fear (the keyword or its artifact-or-black except clause, not intimidate), shadow (the keyword, not fear), and intimidate (the keyword or its share-a-color except clause, not fear); horsemanship stays unnamed; they also do not form edges or construction credit. Land kinds split the blended lands signal into landfall (a land-enters trigger or the landfall keyword, not an extra land drop and not a land search), extra land drop (permission to play more lands, not landfall), and search (tutoring a land from the library, not landfall); they also do not form edges or construction credit. Artifact kinds split the blended artifacts signal into spell (casting an artifact, not artifacts-you-control and not an artifact outlet), matters (artifacts you control or an artifact-enters watch, not an artifact-spell trigger), and outlet (sacrificing an artifact, not named-resource occupancy); they also do not form edges or construction credit. Token kinds split the blended tokens signal into create (making a token, not a go-wide anthem and not sacrificing a token), go-wide (tokens you control or for-each-token, not creation), and sac (sacrificing a token, not a creature outlet); they also do not form edges or construction credit. Aura kinds split the blended auras signal into enchant (the Aura enchant-clause, not auras-you-control and not affinity), matters (auras you control or an Aura-enters watch, not the enchant clause), and affinity (affinity for Auras, not enchanting); equipment stays unnamed; they also do not form edges or construction credit. Spell kinds split the blended spells signal into copy (copying a spell, not casting without paying), free (casting without paying mana, not flashback and not copy), noncreature (instant-or-sorcery / noncreature spell text, not a whenever-you-cast trigger kind and not magecraft), storm (the keyword, not copy), cascade (the keyword, not free), and rebound (the keyword, not free); magecraft stays unnamed as a kind; they also do not form edges or construction credit. Draw kinds split the blended draw signal into watch (a whenever-you-draw or second-card payoff, not net draw and not a wheel), wheel (each-player discard/draw or discard-your-hand-then-draw, not rummage), and hand (cards-in-hand or maximum hand size, not a draw spell); they also do not form edges or construction credit. Damage kinds name deal (numeric or that-much damage, not a combat-damage trigger), drain (opponents losing life, not paying your own life), and prevent (preventing damage, not dealing it); they also do not form edges or construction credit. Equipment kinds name equip (the keyword, not an attach trigger), attach (becoming attached or whenever equipped, not the equip cost), and bonus (equipped creature, not the equip keyword); auras stay unnamed here; they also do not form edges or construction credit. Combat kinds name haste, extra combat (an additional combat phase, not an attack trigger), vigilance, first strike (not double strike), double strike (not first strike), and deathtouch; reach is an evasion kind, not a combat kind; they also do not form edges or construction credit.",
    commanderName: options.commanderName || commander?.name || "",
  };
}

// enginePairs above only ever looks inside the built deck — a genuine
// two-way loop sitting in the broader fetched pool, one swap away from a
// card already in the deck, goes unnoticed. For each pool card not already
// in the deck, finds its single best mutual-loop partner already in the
// deck (if any) and ranks the results — the same mutual forward/reverse
// signal test as enginePairs, just run deck-card-against-pool-card instead
// of deck-card-against-deck-card. Same inferred-pattern caveat applies:
// this is a structural read, not a verified combo.
export function findUnusedEnginePartners(deckCards, poolCards, options = {}) {
  const normalizeName = (name = "") => String(name).normalize("NFKC").trim().toLocaleLowerCase("en");
  const isLand = (card) => /\bLand\b/i.test(card?.typeLine || "");
  const deckNames = new Set(deckCards.filter((card) => card?.name).map((card) => normalizeName(card.name)));
  const deckNodes = deckCards
    .filter((card) => card?.name && !isLand(card))
    .map((card) => ({ ...card, mechanics: extractMechanicalSignals(card) }));
  const poolNodes = poolCards
    .filter((card) => card?.name && !isLand(card) && !deckNames.has(normalizeName(card.name)))
    .map((card) => ({ ...card, mechanics: extractMechanicalSignals(card) }));

  const suggestions = [];
  for (const poolCard of poolNodes) {
    let best = null;
    for (const deckCard of deckNodes) {
      const forward = poolCard.mechanics.produces.filter((signal) => deckCard.mechanics.rewards.includes(signal));
      const reverse = deckCard.mechanics.produces.filter((signal) => poolCard.mechanics.rewards.includes(signal));
      if (!forward.length || !reverse.length) continue;
      const strength = Math.min(100, 52 + (forward.length + reverse.length) * 14);
      if (!best || strength > best.strength) best = { partner: deckCard.name, partnerCard: deckCard, strength, forward, reverse };
    }
    if (best) {
      suggestions.push({
        card: poolCard.name,
        partner: best.partner,
        strength: best.strength,
        loopKind: classifyLoopKind(textOf(poolCard), textOf(best.partnerCard || {})),
        reason: `${poolCard.name} feeds ${best.partner}'s ${best.forward.join("/")} payoff, while ${best.partner} feeds ${poolCard.name}'s ${best.reverse.join("/")} payoff back — sitting unused in your pool.`,
        evidence: "inferred mutual mechanical loop",
      });
    }
  }
  suggestions.sort((left, right) => right.strength - left.strength || left.card.localeCompare(right.card));
  return suggestions.slice(0, options.limit ?? 5);
}
