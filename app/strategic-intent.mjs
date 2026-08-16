import CARD_MECHANICS from "./card-mechanics.mjs";

// =============================================================================
// Strategic Intent
// =============================================================================
// Persistent construction contract shared by selection, repair, refill, and
// final cohesion validation. Broad card types are never enough: Aura ≠
// enchantment, Equipment ≠ artifact, sacrifice outlet ≠ death payoff, etc.
// =============================================================================

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const unique = (values) => [...new Set(values.filter(Boolean))];
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

function typeLineOf(card = {}) {
  return String(card.typeLine || card.type_line || "");
}

function oracleOf(card = {}) {
  return String(card.oracleText || card.oracle_text || "");
}

function manaValueOf(card = {}) {
  const cost = String(card.manaCost || card.mana_cost || "");
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (symbols.length) {
    return symbols.reduce((sum, symbol) => sum + (/^\d+$/.test(symbol) ? Number(symbol) : /^(X|Y|Z)$/.test(symbol) ? 0 : 1), 0);
  }
  return Number(card.cmc) || 0;
}

function tagsOf(card = {}) {
  return CARD_MECHANICS[normalized(card.name)] || [];
}

/**
 * Precise strategic semantics. False friends are explicit so density checks
 * cannot treat a broad supertype as the required subtype.
 */
export function strategicSemanticsFor(card = {}) {
  const typeLine = typeLineOf(card);
  const oracle = oracleOf(card);
  const tags = tagsOf(card);
  const cmc = manaValueOf(card);
  const semantics = new Set();

  const isAura = /\bAura\b/i.test(typeLine);
  const isEnchantment = /\bEnchantment\b/i.test(typeLine);
  const isEquipment = /\bEquipment\b/i.test(typeLine);
  const isArtifact = /\bArtifact\b/i.test(typeLine);
  const isCreature = /\bCreature\b/i.test(typeLine);

  if (isAura) semantics.add("aura");
  if (isEnchantment) semantics.add("enchantment");
  if (isEnchantment && !isAura) semantics.add("non_aura_enchantment");
  if (isEquipment) semantics.add("equipment");
  if (isArtifact) semantics.add("artifact");
  if (isArtifact && !isEquipment) semantics.add("non_equipment_artifact");
  if (isCreature) semantics.add("creature");

  if (tags.includes("sacrifice_outlet") || /^(?:[^\n]+:[^\n]*sacrifice|sacrifice (?:a|another|one|target)[^\n]*:)/im.test(oracle) || /\{[^}]+\}, [Tt]ap: Sacrifice/i.test(oracle) || /\{[^}]+\}[^\n]{0,40}[Ss]acrifice (?:a|another|one|target)/.test(oracle)) {
    semantics.add("sacrifice_outlet");
  }
  if (tags.includes("death_payoff") || /whenever (?:a|another|one or more)[^.]* dies/i.test(oracle) || /whenever you sacrifice/i.test(oracle)) {
    semantics.add("death_payoff");
  }
  if (tags.includes("token_producer") || /create(?:s)? [^.]* token/i.test(oracle)) semantics.add("token_generator");
  if (tags.includes("token_payoff") || /tokens? you control/i.test(oracle) || /token creatures? you control/i.test(oracle) || /for each token/i.test(oracle)) {
    semantics.add("token_payoff");
  }
  if (tags.includes("graveyard_recursion") || /return target [^.]* from (?:your |a )?graveyard to the battlefield/i.test(oracle) || /\breanimate\b/i.test(oracle)) {
    semantics.add("reanimation");
  }
  // Dredge reminder prints "mill N" — that is a replacement draw, not
  // graveyard setup. Only rules text can name mill / surveil / discard.
  const rulesText = oracle.replace(/\([^)]*\)/g, " ");
  if (tags.includes("graveyard_setup") || /\bmill\b/i.test(rulesText) || /\bsurveil\b/i.test(rulesText) || /discard [^.]* card/i.test(rulesText)) {
    semantics.add("graveyard_enabler");
  }
  if (isCreature && cmc >= 6) semantics.add("reanimation_target");
  if (tags.includes("mana_acceleration") || /add .{0,18}mana/i.test(oracle) || /treasure token/i.test(oracle) || /search your library for .{0,40}land/i.test(oracle)) {
    semantics.add("ramp");
  }
  if (/cast [^.]* without paying|put [^.]* onto the battlefield|mana value .{0,20} less to cast|costs? \{[^}]+\} less/i.test(oracle)) {
    semantics.add("cost_cheat");
  }
  if (cmc >= 8) semantics.add("high_cmc_threat");
  if (cmc >= 10) semantics.add("bomb_cmc");
  if (/\bhexproof\b|\bindestructible\b|protection from|\bward\b/i.test(oracle)) semantics.add("protection");
  if (/\baura\b/i.test(oracle) && (/whenever [^.]* aura|affinity for auras|auras? you control/i.test(oracle))) {
    semantics.add("aura_payoff");
  }

  // Spellslinger: cheap cast density is distinct from spell payoffs.
  if (/\bInstant\b|\bSorcery\b/i.test(typeLine) && cmc <= 2) semantics.add("cheap_spell");
  if (tags.includes("spell_payoff") || /whenever you cast (?:an? )?(?:instant|sorcery|noncreature)/i.test(oracle) || /\bmagecraft\b/i.test(oracle) || /instant and sorcery spells you cast/i.test(oracle)) {
    semantics.add("spell_payoff");
  }

  // Blink / flicker: effect vs valuable ETB body.
  if (/exile (?:target|another)[^.]*return (?:it|that|them) to the battlefield/i.test(oracle) || /flicker|blink/i.test(oracle)) {
    semantics.add("blink_effect");
  }
  if (isCreature && /when(?:ever)? (?:~|this(?: creature| permanent)?|[A-Z][^\n,]{0,40}) enters/i.test(oracle) && /draw|create|exile target|gain|put |return |search/i.test(oracle)) {
    semantics.add("etb_value");
  }

  // Stax: raw tax vs asymmetric support that lets you play through it.
  // Bare "each player draws" is group hug, not a tax.
  if (/players can(?:'|’)t|can(?:'|’)t cast more than|cost \{[^}]+\} more to (?:cast|activate)|unless (?:its|their) controller pays|skip (?:their|the) (?:untap|draw)/i.test(oracle)
    || /each player[^.]* (?:sacrifices?|discards?)/i.test(oracle)) {
    semantics.add("stax_piece");
  }
  if (/your opponents?|opponents? (?:can(?:'|’)t|get|control|pay)|creatures your opponents control|you may cast[^.]*as though|creatures you control have flash|spells you cast have flash/i.test(oracle)
    && (/opponent|flash|as though/i.test(oracle))) {
    semantics.add("asymmetric_stax");
  }

  return semantics;
}

function entryCard(entry) {
  return entry?.card || entry || {};
}


function entrySemantics(entry) {
  if (entry?.strategicSemantics instanceof Set) return entry.strategicSemantics;
  if (Array.isArray(entry?.strategicSemantics)) return new Set(entry.strategicSemantics);
  return strategicSemanticsFor(entryCard(entry));
}

const TYPAL_STOP = new Set([
  "target", "equipped", "enchanted", "attacking", "blocking", "tapped", "untapped",
  "nontoken", "other", "another", "each", "all", "card", "creature", "permanent",
  "token", "spell", "among", "legendary", "historic", "modified", "artifact",
  "land", "enchantment", "instant", "sorcery", "planeswalker", "battle", "kindred",
  "tribal", "basic", "snow", "world", "white", "blue", "black", "red", "green",
  "colorless", "monocolored", "multicolored", "flying", "face-down", "facedown",
  "chosen", "that", "those", "these", "the", "this", "your", "my", "a", "an",
  "nonlegendary", "noncreature", "counter", "ability", "effect", "clue",
  "treasure", "food", "blood", "gold", "map", "junk", "powerstone", "emblem",
  "copy", "it", "them", "aura", "equipment", "vehicle", "saga", "curse",
  "shrine", "class", "background", "case", "room", "role", "lesson",
  "fortification", "contraption", "attraction",
  "more", "less", "many", "few", "additional",
  "town", "forest", "island", "plains", "swamp", "mountain", "waste", "gate", "desert",
]);

function singularizeTribe(word = "") {
  const w = normalized(word);
  if (!w) return "";
  if (w.endsWith("ves") && w.length > 4) return `${w.slice(0, -3)}f`;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

/**
 * Tribe words a commander actually runs. Occupancy only.
 * "among creatures" / "Legendary creatures" / "Land creatures" are not tribes.
 */
export function extractTypalTribes(oracle = "") {
  const text = String(oracle || "");
  const hits = [
    ...text.matchAll(/\banother ([A-Za-z][A-Za-z'-]+)s? you control\b/gi),
    ...text.matchAll(/\bother ([A-Za-z][A-Za-z'-]+)s? you control\b/gi),
    ...text.matchAll(/\b(?:a|an) ([A-Za-z][A-Za-z'-]+) you control\b/gi),
    ...text.matchAll(/\b([A-Za-z][A-Za-z'-]+) creatures you control\b/gi),
    ...text.matchAll(/\b([A-Za-z][A-Za-z'-]+)s you control\b/gi),
  ].map((match) => singularizeTribe(match[1]));
  return unique(hits.filter((term) => term && !TYPAL_STOP.has(term)));
}

/**
 * Commander runs an aristocrats engine. Occupancy only.
 * Classic death-plus-sacrifice, sacrifice-as-the-trigger (creature /
 * permanent / token — not Food/Treasure), or a creature/token outlet plus
 * a token engine. Artifact-sac commanders are not aristocrats.
 */
export function detectAristocratsCommander(oracle = "") {
  const text = String(oracle || "");
  const deathPayoff = /whenever [^.]*\bdies\b/i.test(text);
  const sacrificeVerb = /\bsacrifice\b/i.test(text);
  if (deathPayoff && sacrificeVerb) return true;
  if (/whenever you sacrifice (?:a |another )?(?:creature|permanent|token)/i.test(text)) return true;
  const creatureOrTokenOutlet = /\bsacrifice (?:x )?(?:a |another )?(?:creature|squirrels?|goblins?|tokens?|permanents?)\b/i.test(text);
  const tokenEngine = /create [^.]* token/i.test(text) || /tokens would be created/i.test(text);
  return creatureOrTokenOutlet && tokenEngine;
}

const PACKAGE_CATALOG = Object.freeze({
  auras: Object.freeze({
    id: "auras",
    label: "Aura package",
    coreSemantics: Object.freeze(["aura"]),
    // Generic enchantments must never satisfy Aura density.
    falseFriendSemantics: Object.freeze(["non_aura_enchantment"]),
    supportSemantics: Object.freeze(["aura_payoff", "protection"]),
    detectCommander: (oracle) => /\bauras?\b/i.test(oracle) && (/\baffinity for auras\b/i.test(oracle) || /whenever [^.]*\baura\b/i.test(oracle) || /auras? you control/i.test(oracle) || /enchanted creature/i.test(oracle)),
    detectBlueprint: (blueprint) => blueprint.requestedMechanics?.includes("voltron") || /\bauras?\b/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 16, constructedCore: 8, singletonSupport: 4, constructedSupport: 2 }),
  }),
  equipment: Object.freeze({
    id: "equipment",
    label: "Equipment package",
    coreSemantics: Object.freeze(["equipment"]),
    falseFriendSemantics: Object.freeze(["non_equipment_artifact"]),
    supportSemantics: Object.freeze(["protection"]),
    detectCommander: (oracle) => /\bequipment\b/i.test(oracle) || /\bequipped creature\b/i.test(oracle),
    detectBlueprint: (blueprint) => blueprint.requestedMechanics?.includes("voltron") || /\bequipment\b/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 12, constructedCore: 6, singletonSupport: 3, constructedSupport: 2 }),
  }),
  aristocrats: Object.freeze({
    id: "aristocrats",
    label: "Aristocrats package",
    coreSemantics: Object.freeze(["sacrifice_outlet", "death_payoff", "token_generator"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["token_generator", "sacrifice_outlet", "death_payoff"]),
    // Occupancy is not a catalog false-friend list. Creature-token fodder
    // may occupy core; mill dumps and named artifact tokens may not.
    detectCommander: detectAristocratsCommander,
    detectBlueprint: (blueprint) => blueprint.requestedMechanics?.includes("aristocrats") || blueprint.desiredRoles?.includes("sacrifice"),
    density: Object.freeze({ singletonCore: 8, constructedCore: 4, singletonSupport: 8, constructedSupport: 4 }),
    // Aristocrats needs all three legs; core count uses outlet+payoff min.
    requireBalancedLegs: Object.freeze(["sacrifice_outlet", "death_payoff", "token_generator"]),
    balancedLegFloor: Object.freeze({ singleton: 3, constructed: 2 }),
  }),
  reanimator: Object.freeze({
    id: "reanimator",
    label: "Reanimator package",
    coreSemantics: Object.freeze(["reanimation", "graveyard_enabler", "reanimation_target"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["graveyard_enabler", "reanimation"]),
    detectCommander: (oracle) => /from (?:your )?graveyard to the battlefield/i.test(oracle) || /\breanimat/i.test(oracle),
    // Occupancy is not a catalog false-friend list. Mill/discard setup and
    // real reanimation occupy core; dredge-to-hand does not.
    detectBlueprint: (blueprint) => blueprint.desiredRoles?.includes("graveyard") || blueprint.desiredRoles?.includes("recursion") || /\breanimat/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 6, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
    requireBalancedLegs: Object.freeze(["reanimation", "graveyard_enabler", "reanimation_target"]),
    balancedLegFloor: Object.freeze({ singleton: 2, constructed: 2 }),
  }),
  tokens: Object.freeze({
    id: "tokens",
    label: "Tokens package",
    coreSemantics: Object.freeze(["token_generator"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["token_payoff"]),
    // Occupancy is not a catalog false-friend list. Named artifact-token
    // commanders specialize core membership via intent.tokenScope.
    detectCommander: (oracle) => /create [^.]* token/i.test(oracle) && /token/i.test(oracle),
    detectBlueprint: (blueprint) => blueprint.desiredRoles?.includes("tokens") || blueprint.packageSignals?.includes("tokens"),
    density: Object.freeze({ singletonCore: 10, constructedCore: 6, singletonSupport: 4, constructedSupport: 2 }),
  }),
  landfall: Object.freeze({
    id: "landfall",
    label: "Landfall package",
    coreSemantics: Object.freeze([]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze([]),
    packageSignals: Object.freeze(["lands"]),
    // Occupancy is not a catalog false-friend list. Landfall / land-enters
    // payoffs and extra land drops occupy core; fetch/ramp that puts a land
    // into play is support; a bare "land card" mention is not occupancy.
    detectCommander: (oracle) => /\blandfall\b/i.test(oracle) || /whenever a land enters/i.test(oracle),
    detectBlueprint: (blueprint) => blueprint.requestedMechanics?.includes("landfall") || blueprint.packageSignals?.includes("lands"),
    density: Object.freeze({ singletonCore: 8, constructedCore: 4, singletonSupport: 6, constructedSupport: 3 }),
  }),
  typal: Object.freeze({
    id: "typal",
    label: "Typal package",
    // Tribe membership is type-line precise; oracle mentions are false friends.
    coreSemantics: Object.freeze(["typal_member"]),
    falseFriendSemantics: Object.freeze(["typal_mention"]),
    supportSemantics: Object.freeze(["typal_member"]),
    // Occupancy is not a catalog false-friend list. Type-line members of
    // the commander's actual tribe occupy core; oracle mentions of that
    // tribe without membership are false friends. "among / Legendary /
    // Land creatures you control" must not open the package.
    detectCommander: (oracle) => extractTypalTribes(oracle).length > 0,
    detectBlueprint: (blueprint) => (blueprint.tribalTypes || []).length > 0,
    density: Object.freeze({ singletonCore: 14, constructedCore: 8, singletonSupport: 2, constructedSupport: 1 }),
  }),
  spellslinger: Object.freeze({
    id: "spellslinger",
    label: "Spellslinger package",
    coreSemantics: Object.freeze(["cheap_spell"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["spell_payoff"]),
    packageSignals: Object.freeze(["spells"]),
    // Occupancy is not a catalog false-friend list. Cheap instants/sorceries
    // occupy core; spell payoffs (whenever you cast / magecraft) are support;
    // a generic "spells" produce/reward must not occupy cheap-spell density.
    detectCommander: (oracle) => /whenever you cast (?:an? )?(?:instant|sorcery|noncreature)/i.test(oracle) || /\bmagecraft\b/i.test(oracle),
    detectBlueprint: (blueprint) => blueprint.requestedMechanics?.includes("spellslinger") || /\bspells?\b/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 14, constructedCore: 8, singletonSupport: 3, constructedSupport: 2 }),
  }),
  blink: Object.freeze({
    id: "blink",
    label: "Blink package",
    coreSemantics: Object.freeze(["blink_effect"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["etb_value"]),
    detectCommander: (oracle) => /exile (?:target|another)[^.]*return (?:it|that|them) to the battlefield/i.test(oracle),
    detectBlueprint: (blueprint) => /\bblink\b|\bflicker\b|\betb\b/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 4, constructedCore: 2, singletonSupport: 8, constructedSupport: 4 }),
  }),
  stax: Object.freeze({
    id: "stax",
    label: "Stax package",
    coreSemantics: Object.freeze(["stax_piece"]),
    falseFriendSemantics: Object.freeze([]),
    supportSemantics: Object.freeze(["asymmetric_stax"]),
    // Occupancy is not a catalog false-friend list. Tax / restriction and
    // each-player sacrifice or discard occupy core; asymmetric hosers are
    // support; a bare "each player draws" group-hug clause is not occupancy.
    detectCommander: (oracle) => /players can(?:'|’)t|can(?:'|’)t cast more than|cost \{[^}]+\} more to (?:cast|activate)|unless (?:its|their) controller pays/i.test(oracle),
    detectBlueprint: (blueprint) => /\bstax\b|resource denial/i.test(blueprint.source || ""),
    density: Object.freeze({ singletonCore: 8, constructedCore: 4, singletonSupport: 4, constructedSupport: 2 }),
  }),
});

/**
 * Composition trigger for packages the commander's own text and any stated
 * blueprint mechanics never announce — an archetype built entirely by the
 * 99. Inert unless a caller explicitly supplies blueprint.rows (a real
 * decklist); parseNativeBlueprintIntent (live fresh-build construction)
 * never sets it, so this changes nothing for a deck with no 99 yet. Uses
 * each package's own constructedCore floor as a "does real evidence exist"
 * bar, not the singleton target used for health scoring later — the same
 * open-low, evaluate-honestly pattern detectCommander already follows.
 */
function detectComposition(definition, blueprint) {
  const rows = blueprint?.rows;
  if (!Array.isArray(rows) || !rows.length) return false;
  const legs = definition.requireBalancedLegs?.length ? definition.requireBalancedLegs : definition.coreSemantics;
  if (!legs?.length) return false;
  const floor = definition.balancedLegFloor?.constructed ?? definition.density.constructedCore;
  const counts = new Map();
  for (const row of rows) {
    const qty = Math.max(1, Number(row.quantity) || 1);
    for (const semantic of strategicSemanticsFor(row)) {
      counts.set(semantic, (counts.get(semantic) || 0) + qty);
    }
  }
  return legs.every((semantic) => (counts.get(semantic) || 0) >= floor);
}

function packageTriggered(definition, commanders, blueprint) {
  if (definition.detectBlueprint?.(blueprint)) return true;
  if (commanders.some((commander) => definition.detectCommander?.(oracleOf(commander) || ""))) return true;
  return detectComposition(definition, blueprint);
}

function densityFor(definition, singleton) {
  return {
    coreMin: singleton ? definition.density.singletonCore : definition.density.constructedCore,
    supportMin: singleton ? definition.density.singletonSupport : definition.density.constructedSupport,
    legFloor: singleton
      ? (definition.balancedLegFloor?.singleton || 0)
      : (definition.balancedLegFloor?.constructed || 0),
  };
}

function countSemantics(rows, semantic) {
  return rows.reduce((sum, row) => {
    const semantics = entrySemantics(row);
    return sum + (semantics.has(semantic) ? Number(row.quantity || 1) : 0);
  }, 0);
}

function countPackageSignal(rows, signal) {
  return rows.reduce((sum, row) => {
    const mechanics = row.mechanics || {};
    const hit = mechanics.produces?.includes(signal) || mechanics.rewards?.includes(signal);
    return sum + (hit ? Number(row.quantity || 1) : 0);
  }, 0);
}

// Named artifact-token types the graph already distinguishes. Occupancy
// consumes this vocabulary; it does not invent new token families.
const NAMED_ARTIFACT_TOKENS = Object.freeze(new Set([
  "clue", "treasure", "food", "blood", "gold", "map", "junk", "powerstone",
]));
const NAMED_ARTIFACT_TOKEN_PRODUCES = Object.freeze({
  clue: "clues",
  treasure: "treasure",
  food: "food",
  blood: "blood",
  gold: "gold",
  map: "maps",
  junk: "junk",
  powerstone: "powerstones",
});

export function namedArtifactTokenScopeFromIntent(intent = {}) {
  const produces = intent.commanderScopes?.produces || {};
  // Creature-token riders (Spirit, Plant, Citizen) never specialize the
  // tokens package. A landfall Plant or go-wide Citizen commander stays
  // on the generic tokens contract.
  return unique([
    ...(produces.artifacts || []),
    ...(produces.clues || []),
    ...(produces.treasure || []),
    ...(produces.food || []),
    ...(produces.blood || []),
    ...(produces.gold || []),
    ...(produces.maps || []),
    ...(produces.junk || []),
    ...(produces.powerstones || []),
  ].map(normalized)).filter((term) => NAMED_ARTIFACT_TOKENS.has(term));
}

function typalTribesFromIntent(intent) {
  const attached = (intent?.packages || []).find((pkg) => pkg.id === "typal")?.tribalTypes;
  return Array.isArray(attached) ? attached.map(normalized).filter(Boolean) : [];
}

function typeLineCreatureTypes(card = {}) {
  const line = typeLineOf(card);
  const subtype = line.includes("—") ? line.split("—")[1] : (line.split(" - ")[1] || "");
  return unique(String(subtype || "").split(/\s+/).map(normalized).filter(Boolean));
}

function cardHasChangeling(card = {}) {
  const oracle = oracleOf(card);
  return /\bchangeling\b/i.test(oracle) || /every creature type/i.test(oracle);
}

function cardIsTypalMember(entry, tribes) {
  if (entrySemantics(entry).has("typal_member")) return true;
  if (!tribes.length) return false;
  const card = entryCard(entry);
  if (cardHasChangeling(card)) return true;
  const types = typeLineCreatureTypes(card);
  return tribes.some((tribe) => types.includes(tribe));
}

function cardMentionsTypalTribe(entry, tribes) {
  if (!tribes.length) return false;
  const oracle = oracleOf(entryCard(entry));
  return tribes.some((tribe) => {
    const escaped = String(tribe).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}s?\\b`, "i").test(oracle);
  });
}

function tokenScopeFor(packageId, intent) {
  if (packageId !== "tokens") return [];
  const attached = (intent?.packages || []).find((pkg) => pkg.id === "tokens")?.tokenScope;
  if (Array.isArray(attached)) return attached.filter((term) => NAMED_ARTIFACT_TOKENS.has(normalized(term)));
  return namedArtifactTokenScopeFromIntent(intent);
}

function cardIsNamedArtifactTokenMaker(entry, scope) {
  if (!scope.length) return false;
  const oracle = oracleOf(entryCard(entry));
  const produces = new Set(entry.mechanics?.produces || []);
  for (const tribe of scope) {
    const produceKey = NAMED_ARTIFACT_TOKEN_PRODUCES[tribe];
    if (produceKey && produces.has(produceKey)) return true;
    if (tribe === "clue" && /\binvestigate\b/i.test(oracle)) return true;
    const escaped = tribe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`create[^.]{0,80}${escaped}[^.]{0,40}token`, "i").test(oracle)) return true;
  }
  return false;
}

function cardIsCreatureTokenFactory(entry) {
  return /create[^.]*creature token/i.test(oracleOf(entryCard(entry)));
}

function cardHasDredge(entry) {
  return /\bdredge\b/i.test(oracleOf(entryCard(entry)));
}

function cardSatisfiesAristocratsCore(entry) {
  const semantics = entrySemantics(entry);
  if (semantics.has("sacrifice_outlet") || semantics.has("death_payoff")) return true;
  // Fodder is creature tokens. Mill dumps and named artifact tokens
  // (Clue / Treasure / Food / …) are not aristocrats occupancy.
  return semantics.has("token_generator") && cardIsCreatureTokenFactory(entry);
}

function cardSatisfiesReanimatorCore(entry) {
  const semantics = entrySemantics(entry);
  if (semantics.has("reanimation") || semantics.has("reanimation_target")) return true;
  // Dredge returns to hand. Reminder mill does not make it a mill enabler.
  if (cardHasDredge(entry)) return false;
  return semantics.has("graveyard_enabler");
}

function cardSatisfiesLandfallCore(entry) {
  const oracle = oracleOf(entryCard(entry));
  if (/\blandfall\b/i.test(oracle)) return true;
  if (/whenever a land (?:you control )?enters/i.test(oracle)) return true;
  if (/play an additional land/i.test(oracle)) return true;
  return false;
}

function cardSatisfiesLandfallSupport(entry) {
  if (cardSatisfiesLandfallCore(entry)) return true;
  const oracle = oracleOf(entryCard(entry));
  return /search your library for [^.]* land/i.test(oracle)
    || /put [^.]* land [^.]* onto the battlefield/i.test(oracle);
}

function cardSatisfiesSpellslingerCore(entry) {
  return entrySemantics(entry).has("cheap_spell");
}

function cardSatisfiesSpellslingerSupport(entry) {
  if (cardSatisfiesSpellslingerCore(entry)) return true;
  return entrySemantics(entry).has("spell_payoff");
}

function cardSatisfiesStaxCore(entry) {
  const oracle = oracleOf(entryCard(entry));
  if (/players can(?:'|’)t/i.test(oracle)) return true;
  if (/can(?:'|’)t cast more than/i.test(oracle)) return true;
  if (/cost \{[^}]+\} more to (?:cast|activate)/i.test(oracle)) return true;
  if (/unless (?:its|their) controller pays/i.test(oracle)) return true;
  if (/skip (?:their|the) (?:untap|draw)/i.test(oracle)) return true;
  if (/each player[^.]* (?:sacrifices?|discards?)/i.test(oracle)) return true;
  return false;
}

function cardSatisfiesStaxSupport(entry) {
  if (cardSatisfiesStaxCore(entry)) return true;
  return entrySemantics(entry).has("asymmetric_stax");
}

export function cardSatisfiesPackageCore(entry, packageId, intent) {
  const definition = PACKAGE_CATALOG[packageId];
  if (!definition) return false;
  const scope = tokenScopeFor(packageId, intent);
  if (packageId === "tokens" && scope.length) {
    return cardIsNamedArtifactTokenMaker(entry, scope);
  }
  if (packageId === "aristocrats") return cardSatisfiesAristocratsCore(entry);
  if (packageId === "reanimator") return cardSatisfiesReanimatorCore(entry);
  if (packageId === "landfall") return cardSatisfiesLandfallCore(entry);
  if (packageId === "spellslinger") return cardSatisfiesSpellslingerCore(entry);
  if (packageId === "stax") return cardSatisfiesStaxCore(entry);
  if (packageId === "typal") return cardIsTypalMember(entry, typalTribesFromIntent(intent));
  const semantics = entrySemantics(entry);
  if (definition.coreSemantics.some((semantic) => semantics.has(semantic))) return true;
  if (definition.packageSignals?.length) {
    const mechanics = entry.mechanics || {};
    return definition.packageSignals.some((signal) =>
      mechanics.produces?.includes(signal) || mechanics.rewards?.includes(signal));
  }
  return false;
}

export function cardSatisfiesPackageSupport(entry, packageId, intent) {
  const definition = PACKAGE_CATALOG[packageId];
  if (!definition) return false;
  if (packageId === "aristocrats") return cardSatisfiesAristocratsCore(entry);
  if (packageId === "reanimator") return cardSatisfiesReanimatorCore(entry);
  if (packageId === "landfall") return cardSatisfiesLandfallSupport(entry);
  if (packageId === "spellslinger") return cardSatisfiesSpellslingerSupport(entry);
  if (packageId === "stax") return cardSatisfiesStaxSupport(entry);
  if (packageId === "typal") return cardIsTypalMember(entry, typalTribesFromIntent(intent));
  const semantics = entrySemantics(entry);
  return definition.supportSemantics.some((semantic) => semantics.has(semantic))
    || cardSatisfiesPackageCore(entry, packageId, intent);
}

export function cardIsPackageFalseFriend(entry, packageId, intent) {
  const definition = PACKAGE_CATALOG[packageId];
  if (!definition) return false;
  if (cardSatisfiesPackageCore(entry, packageId, intent)) return false;
  const semantics = entrySemantics(entry);
  if ((definition.falseFriendSemantics || []).some((tag) => semantics.has(tag))) return true;
  const scope = tokenScopeFor(packageId, intent);
  if (packageId === "tokens" && scope.length && cardIsCreatureTokenFactory(entry)) return true;
  return false;
}

/**
 * Build the persistent strategic intent for a generation. Attached to
 * analysis.context and honored by repairs/refills/final validation.
 */
export function buildStrategicIntent(input = {}, analysisContext = {}) {
  const blueprint = analysisContext.blueprint || { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [] };
  const commanders = [input.commander, input.secondCommander].filter(Boolean);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(input.format);
  const packages = [];

  for (const definition of Object.values(PACKAGE_CATALOG)) {
    if (!packageTriggered(definition, commanders, blueprint)) continue;
    const targets = densityFor(definition, singleton);
    packages.push(Object.freeze({
      id: definition.id,
      label: definition.label,
      coreSemantics: definition.coreSemantics,
      falseFriendSemantics: definition.falseFriendSemantics || [],
      supportSemantics: definition.supportSemantics || [],
      packageSignals: definition.packageSignals || [],
      requireBalancedLegs: definition.requireBalancedLegs || [],
      tokenScope: Object.freeze(definition.id === "tokens" ? namedArtifactTokenScopeFromIntent(analysisContext) : []),
      tribalTypes: Object.freeze(definition.id === "typal"
        ? unique([
            ...commanders.flatMap((commander) => extractTypalTribes(oracleOf(commander))),
            ...(blueprint.tribalTypes || []),
          ])
        : []),
      ...targets,
      source: definition.detectBlueprint?.(blueprint) && definition.detectCommander?.(oracleOf(commanders[0] || {}))
        ? "commander+blueprint"
        : definition.detectBlueprint?.(blueprint) ? "blueprint" : "commander",
    }));
  }

  const excludedNames = new Set((input.excludedNames || []).map(normalized));
  return Object.freeze({
    format: input.format || null,
    strategy: input.strategy || null,
    singleton,
    commanders: Object.freeze(commanders.map((commander) => Object.freeze({
      name: commander.name,
      colors: Object.freeze([...(commander.colors || [])]),
    }))),
    commanderMechanics: analysisContext.commanderMechanics || Object.freeze({ produces: [], rewards: [] }),
    commanderScopes: analysisContext.commanderScopes || Object.freeze({ produces: {}, rewards: {} }),
    blueprint,
    packages: Object.freeze(packages),
    packageIds: Object.freeze(packages.map((entry) => entry.id)),
    roleTargets: Object.freeze({ ...(analysisContext.roleTargets || {}) }),
    curveIdeal: analysisContext.ideal ?? 2.9,
    budget: input.budget || null,
    targetPowerTier: input.targetPowerTier || null,
    // Opt-in construction experiment id. Default/absent = Brain v1 control.
    brainPolicy: input.brainPolicy || "brain_v1_control",
    maxCardPrice: Number.isFinite(input.maxCardPrice) ? input.maxCardPrice : null,
    commonsOnly: Boolean(input.commonsOnly),
    excludedRoles: Object.freeze([...(blueprint.excludedRoles || [])]),
    excludedNames,
    // Expensive threats need concrete support; raw power is never enough.
    bombCmcThreshold: 10,
    highCmcThreshold: 8,
    rampSupportFloor: singleton ? 8 : 4,
  });
}

function trackedRoleOverlap(offenderRoles = [], candidateRoles = [], trackedRoles = []) {
  const tracked = new Set(trackedRoles);
  const offenderTracked = offenderRoles.filter((role) => tracked.has(role));
  if (!offenderTracked.length) return true;
  return offenderTracked.some((role) => candidateRoles.includes(role));
}

function packageOverlap(offenderEntry, candidateEntry, intent) {
  const packageIds = intent?.packageIds || [];
  if (!packageIds.length) return { required: false, ok: true, shared: [] };
  const offenderPackages = packageIds.filter((id) => cardSatisfiesPackageCore(offenderEntry, id, intent) || cardSatisfiesPackageSupport(offenderEntry, id, intent));
  if (!offenderPackages.length) return { required: false, ok: true, shared: [] };
  const shared = offenderPackages.filter((id) => cardSatisfiesPackageCore(candidateEntry, id, intent) || cardSatisfiesPackageSupport(candidateEntry, id, intent));
  // False-friend trap: a non-aura enchantment must not replace an Aura core.
  for (const id of offenderPackages) {
    const definition = PACKAGE_CATALOG[id];
    if (!definition) continue;
    if (cardSatisfiesPackageCore(offenderEntry, id, intent) && cardIsPackageFalseFriend(candidateEntry, id, intent)) {
      return { required: true, ok: false, shared, reason: `${definition.label} core cannot be replaced by false-friend semantics` };
    }
  }
  return { required: true, ok: shared.length > 0, shared, reason: shared.length ? null : "replacement loses required package membership" };
}

/**
 * Explicit replacement compatibility. Broad role match alone is insufficient
 * when the cut card belonged to an active strategic package.
 */
export function replacementCompatible(offenderEntry, candidateEntry, intent = {}, options = {}) {
  const trackedRoles = options.trackedRoles || ["ramp", "draw", "interaction", "protection", "recursion", "sweeper"];
  const offender = offenderEntry?.card ? offenderEntry : { card: offenderEntry, roles: offenderEntry?.roles || [], ...offenderEntry };
  const candidate = candidateEntry?.card ? candidateEntry : { card: candidateEntry, roles: candidateEntry?.roles || [], ...candidateEntry };
  const reasons = [];

  if (options.excludedNames?.has?.(normalized(candidate.card?.name || candidate.name))) {
    return Object.freeze({ compatible: false, reasons: Object.freeze(["excluded by upstream strategic intent"]) });
  }
  if (intent.targetPowerTier === "Casual" && options.forbidPowerSignals && options.powerSignalCategoryFor?.(candidate.card)) {
    return Object.freeze({ compatible: false, reasons: Object.freeze(["Casual power-signal alternatives are forbidden"]) });
  }

  if (!trackedRoleOverlap(offender.roles || [], candidate.roles || [], trackedRoles)) {
    reasons.push("missing shared tracked load-bearing role");
  }

  const packages = packageOverlap(offender, candidate, intent);
  if (packages.required && !packages.ok) reasons.push(packages.reason || "package membership mismatch");

  if ((offender.commanderConnectionSignals || []).length) {
    if (!(candidate.commanderConnectionSignals || []).length) {
      // Soft when package already covers the connection (Aura → Aura).
      if (!packages.shared.length) reasons.push("loses commander connection");
    }
  }

  if ((offender.blueprintMechanicHits || []).length) {
    const sharedMechanic = (candidate.blueprintMechanicHits || []).some((mechanic) => offender.blueprintMechanicHits.includes(mechanic));
    if (!sharedMechanic && packages.required && !packages.ok) reasons.push("loses blueprint mechanic membership");
  }

  if (options.requireCurveBand) {
    const offenderCmc = Number(offender.cmc ?? manaValueOf(offender.card));
    const candidateCmc = Number(candidate.cmc ?? manaValueOf(candidate.card));
    if (Math.abs(offenderCmc - candidateCmc) > 2) reasons.push("curve band drift exceeds ±2");
  }

  return Object.freeze({
    compatible: reasons.length === 0,
    reasons: Object.freeze(reasons),
    sharedPackages: Object.freeze(packages.shared || []),
  });
}

function selectedNonlands(rows = []) {
  return rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
}

export function expensiveThreatSupport(entry, selectedRows = [], intent = {}) {
  const semantics = entrySemantics(entry);
  const cmc = Number(entry.cmc ?? manaValueOf(entryCard(entry)));
  if (cmc < (intent.highCmcThreshold || 8)) {
    return Object.freeze({ needsSupport: false, supported: true, reasons: Object.freeze([]) });
  }
  const rows = selectedNonlands(selectedRows);
  const rampCount = countSemantics(rows, "ramp");
  const reanimation = countSemantics(rows, "reanimation");
  const cheat = countSemantics(rows, "cost_cheat");
  const commanderConnected = (entry.commanderConnectionSignals || []).length > 0;
  const packageCore = (intent.packageIds || []).some((id) => cardSatisfiesPackageCore(entry, id, intent));
  const activePackages = (intent.packageIds || []).length > 0;
  // When the deck has an active precise package (Auras, aristocrats, etc.),
  // generic ramp is not enough to justify an unrelated 10-drop. The bomb
  // must cheat/reanimate in, connect to the commander, or itself be package
  // core — otherwise it is strategic entropy dressed as "powerful."
  const reasons = [];
  if (commanderConnected) reasons.push("commander connection");
  if (packageCore) reasons.push("active package core membership");
  if (reanimation >= 2) reasons.push(`reanimation effects ${reanimation}`);
  if (cheat >= 1) reasons.push(`cost-cheat effects ${cheat}`);
  if (!activePackages || packageCore || commanderConnected) {
    if (rampCount >= (intent.rampSupportFloor || 8)) reasons.push(`ramp density ${rampCount}`);
  }
  const supported = reasons.length > 0;
  return Object.freeze({
    needsSupport: true,
    supported,
    cmc,
    isBomb: semantics.has("bomb_cmc") || cmc >= (intent.bombCmcThreshold || 10),
    reasons: Object.freeze(reasons),
  });
}

function packageReport(rows, packageSpec, intent) {
  if (packageSpec.id === "typal") {
    const qty = (row) => Number(row.quantity || 1);
    return {
      coreCount: rows.reduce((sum, row) => sum + (cardSatisfiesPackageCore(row, "typal", intent) ? qty(row) : 0), 0),
      falseFriendCount: rows.reduce((sum, row) => sum + (cardIsPackageFalseFriend(row, "typal", intent) ? qty(row) : 0), 0),
      supportCount: rows.reduce((sum, row) => sum + (cardSatisfiesPackageSupport(row, "typal", intent) ? qty(row) : 0), 0),
      legs: {},
    };
  }
  const coreCount = packageSpec.coreSemantics.length
    ? packageSpec.coreSemantics.reduce((sum, semantic) => sum + countSemantics(rows, semantic), 0)
    : (packageSpec.packageSignals || []).reduce((sum, signal) => sum + countPackageSignal(rows, signal), 0);
  const falseFriendCount = (packageSpec.falseFriendSemantics || []).reduce((sum, semantic) => sum + countSemantics(rows, semantic), 0);
  const supportCount = (packageSpec.supportSemantics || []).reduce((sum, semantic) => sum + countSemantics(rows, semantic), 0);
  const legs = Object.fromEntries((packageSpec.requireBalancedLegs || []).map((semantic) => [semantic, countSemantics(rows, semantic)]));
  return { coreCount, falseFriendCount, supportCount, legs };
}

/**
 * Final cohesion validator. Runs after every construction/repair pass.
 */
export function validateStrategicCohesion(candidate, intent, options = {}) {
  const rows = selectedNonlands(candidate?.rows || []);
  const reasons = [];
  const packageResults = [];

  for (const packageSpec of intent.packages || []) {
    const availableCore = options.availablePackageCore?.[packageSpec.id];
    if (availableCore === 0) {
      packageResults.push(Object.freeze({
        id: packageSpec.id,
        label: packageSpec.label,
        status: "unsupported-in-verified-pool",
        coreCount: 0,
        falseFriendCount: packageReport(rows, packageSpec, intent).falseFriendCount,
        supportCount: 0,
        legs: {},
        coreTarget: 0,
      }));
      continue;
    }
    const report = packageReport(rows, packageSpec, intent);
    const coreTarget = availableCore == null ? packageSpec.coreMin : Math.min(packageSpec.coreMin, availableCore);
    const failedCore = report.coreCount < coreTarget;
    // False friends can exist, but they must not be the thing that "fills"
    // a missing core requirement.
    const falseFriendMask = failedCore && report.falseFriendCount >= coreTarget;
    const legFailures = (packageSpec.requireBalancedLegs || []).filter((semantic) => (report.legs[semantic] || 0) < packageSpec.legFloor);
    const status = !failedCore && !legFailures.length ? "honored" : "collapsed";
    packageResults.push(Object.freeze({
      id: packageSpec.id,
      label: packageSpec.label,
      status,
      ...report,
      coreTarget,
    }));
    if (failedCore) {
      reasons.push(`${packageSpec.label} core density ${report.coreCount}/${coreTarget} is below the strategic floor.`);
    }
    if (falseFriendMask) {
      reasons.push(`${packageSpec.label} cannot be satisfied by false-friend cards (${report.falseFriendCount} present).`);
    }
    for (const leg of legFailures) {
      reasons.push(`${packageSpec.label} is missing balanced ${leg.replaceAll("_", " ")} support (${report.legs[leg]}/${packageSpec.legFloor}).`);
    }
  }

  const unsupportedBombs = [];
  for (const row of rows) {
    const support = expensiveThreatSupport(row, candidate.rows, intent);
    if (support.needsSupport && support.isBomb && !support.supported) {
      unsupportedBombs.push(row.name);
      reasons.push(`${row.name} is a ${support.cmc}-mana threat without ramp, reanimation, cost-cheat, commander, or package justification.`);
    }
  }

  if ((intent.commanderMechanics?.produces?.length || intent.commanderMechanics?.rewards?.length) && options.requireCommanderFloor) {
    const connected = rows.filter((row) => (row.commanderConnectionSignals || []).length).reduce((sum, row) => sum + Number(row.quantity || 1), 0);
    const available = options.availableCommanderConnections;
    if (available >= 6 && connected < 6) {
      reasons.push(`Commander package support is ${connected}/6 despite ${available} verified connections in pool.`);
    }
  }

  return Object.freeze({
    passed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    packages: Object.freeze(packageResults),
    unsupportedBombs: Object.freeze(unsupportedBombs),
  });
}

export const STRATEGIC_PACKAGE_IDS = Object.freeze(Object.keys(PACKAGE_CATALOG));
