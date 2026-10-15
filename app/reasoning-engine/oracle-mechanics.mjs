// =============================================================================
// Oracle Mechanics Parser
// =============================================================================
// Turns a card's rules text (Scryfall oracle_text) into a small mechanical
// fingerprint the reasoning engine can link across cards:
//
//   produces  - resources or game events this card creates
//               (a token, a creature dying, mana, a card drawn, a counter...)
//   consumes  - resources this card spends as a cost or needs as fuel
//               (sacrificing a creature, discarding, exiling from graveyard)
//   listens   - events this card's triggered or scaling abilities care about
//               ("whenever a creature you control dies", "for each artifact")
//   effects   - what the card does to the game (removal, wipe, ramp, draw...)
//   keywords  - keyword abilities printed on the card
//
// The vocabulary is a fixed list of general game resources (RESOURCES), never
// card names, so any card - including ones printed after this was written -
// is read by its rules, not looked up in a list. Pure and deterministic.
// =============================================================================

export const RESOURCES = Object.freeze({
  "creature-token": "creature tokens",
  "token": "tokens",
  "treasure": "Treasure",
  "creature-enters": "creatures entering",
  "creature-dies": "creatures dying",
  "sacrifice": "sacrificing permanents",
  "creature-body": "bodies to sacrifice",
  "artifact": "artifacts",
  "enchantment": "enchantments",
  "counter": "+1/+1 counters",
  "lifegain": "life gain",
  "life-drain": "opponents losing life",
  "card-draw": "drawing cards",
  "discard": "discarding",
  "graveyard": "cards in the graveyard",
  "recursion": "returning cards from the graveyard",
  "mana": "extra mana",
  "land-enters": "lands entering (landfall)",
  "spell-cast": "casting instants and sorceries",
  "noncreature-cast": "casting noncreature spells",
  "attack": "attacking",
  "combat-damage": "combat damage to players",
  "blink": "flickering (exile and return)",
  "etb-value": "enter-the-battlefield abilities",
  "untap": "untapping permanents",
  "copy": "copying spells or permanents",
  "tap-creatures": "tapping creatures",
  "death-trigger": "death-triggered abilities",
  "creature-token-buff": "anthem effects on tokens",
});

const KEYWORDS = [
  "flying", "trample", "haste", "deathtouch", "lifelink", "vigilance", "menace", "reach",
  "first strike", "double strike", "hexproof", "indestructible", "ward", "flash", "defender",
  "cascade", "convoke", "storm", "affinity", "delve", "flashback", "undying", "persist",
  "prowess", "infect", "toxic", "annihilator", "cycling", "kicker", "equip", "shroud",
  "protection", "landfall", "evoke", "partner", "myriad", "afterlife", "training", "ninjutsu",
];

// [regex, resource] pairs. Order does not matter; every match counts.
const PRODUCE_RULES = [
  [/\bcreate[s]?\b[^.]*\b(?:creature token|\d+\/\d+\b[^.]*token)/i, "creature-token"],
  [/\bcreate[s]?\b[^.]*\btoken/i, "token"],
  [/\btreasure token/i, "treasure"],
  [/\bcreate[s]?\b[^.]*\btreasure|\bcreate[s]?\b[^.]*\b(?:clue|food|blood|map) token/i, "artifact"],
  [/\bcreate[s]?\b[^.]*\bartifact\b[^.]*token/i, "artifact"],
  [/\bsacrifice (?:a|another|an|two|x)\b[^:.]*creature[^:]*:/i, "creature-dies"],
  [/\bsacrifice (?:a|another|an)\b[^:.]*(?:creature|artifact|permanent)[^:]*:/i, "sacrifice"],
  [/\beach (?:player|opponent) sacrifices\b/i, "creature-dies"],
  [/\b(?:put|puts|with) (?:a|an|one|two|three|x|that many|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\bproliferate\b/i, "counter"],
  [/\byou gain (?:\d+|x|that much|life)|\bgain \d+ life\b/i, "lifegain"],
  [/\blifelink\b/i, "lifegain"],
  [/\b(?:each opponent|target opponent|target player|each player|that player|defending player) loses \w+ life\b/i, "life-drain"],
  [/\bdraws? (?:a|an|one|two|three|four|x|that many|\d+) cards?\b|\bdraw cards\b/i, "card-draw"],
  [/\bmill(?:s)? (?:a|one|two|three|four|five|x|\d+) cards?\b|\bmills? (?:\w+ )?cards\b|put the top [^.]* into (?:your|their) graveyard/i, "graveyard"],
  [/\bdiscard (?:a|one|two|x|\d+|your hand)/i, "graveyard"],
  [/\breturn[^.]*\bfrom (?:your|a|their) graveyard\b/i, "recursion"],
  [/\bput target [^.]*card from (?:a|your) graveyard onto the battlefield/i, "recursion"],
  [/\badd (?:\{[^}]+\}|one mana|two mana|three mana|x mana|mana)/i, "mana"],
  [/\bsearch your library for [^.]*\bland card[^.]*onto the battlefield/i, "land-enters"],
  [/\byou may (?:put|play) (?:an )?(?:additional )?land/i, "land-enters"],
  [/\bplay an additional land\b/i, "land-enters"],
  [/\bexile (?:another )?target (?:creature|permanent|artifact)[^.]*(?:you control|you own)[^.]*\. (?:return|then return)/i, "blink"],
  [/\bexile [^.]*, then return (?:it|them|that card) to the battlefield/i, "blink"],
  [/\buntap (?:target|all|each|up to|another)/i, "untap"],
  [/\bcopy (?:target|that|it)\b|\bcreate a token that's a copy\b/i, "copy"],
  [/\bextra combat\b|\badditional combat phase\b/i, "attack"],
];

// Costs and fuel. Only matched before a colon (an activation cost) or as an
// explicit "as an additional cost" / "you may sacrifice" clause.
const CONSUME_RULES = [
  [/\bsacrifice (?:a|another|an|one|two|x)\b[^:.]*creature[^:.]*[:,]/i, "creature-body"],
  [/\bas an additional cost[^.]*sacrifice (?:a|an|another) creature/i, "creature-body"],
  [/\bsacrifice (?:a|an|another)\b[^:.]*artifact[^:.]*[:,]/i, "artifact"],
  [/\bsacrifice (?:a|an|another) (?:treasure|food|clue)/i, "artifact"],
  [/\bdiscard (?:a|one|two|x) cards?\s*(?::|,)/i, "card-draw"],
  [/\bexile [^.:]*from your graveyard[^.]*:/i, "graveyard"],
  [/\b(?:delve|escape|flashback)\b/i, "graveyard"],
  [/\bremove (?:a|one|two|x|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\btap (?:an|two|three|x|\w+) untapped (?:creatures?|artifacts?)/i, "tap-creatures"],
  [/\bconvoke\b/i, "tap-creatures"],
  [/\bpay \w+ life\b/i, "lifegain"],
  [/\bfor each (?:creature|token)\b|\bnumber of creatures you control\b/i, "creature-token"],
  [/\bfor each artifact\b|\bnumber of artifacts you control\b|\baffinity for artifacts\b/i, "artifact"],
  [/\bfor each card in your graveyard\b|\bcards? in your graveyard\b/i, "graveyard"],
  [/\bfor each \+1\/\+1 counter\b/i, "counter"],
];

// Triggered/static listeners: "Whenever <event>", "At <step>", "for each".
const LISTEN_RULES = [
  [/\bwhenever (?:a|another|one or more) (?:nontoken )?(?:creatures? |artifact creatures? )?(?:you control )?(?:dies|die|is put into a graveyard)/i, "creature-dies"],
  [/\bwhenever [^.]*\b(?:another|a|one or more) (?:nontoken )?creatures?\b[^.]*\b(?:dies|die)\b/i, "creature-dies"],
  [/\bwhenever (?:a|another|one or more) [^.]*\b(?:you control )?(?:is sacrificed|sacrifices?)\b/i, "sacrifice"],
  [/\bwhenever you sacrifice\b/i, "sacrifice"],
  // Trigger doublers/amplifiers care about other cards' triggered abilities.
  [/\bcreature dying causes a triggered ability\b/i, "death-trigger"],
  [/\b(?:artifact or creature|creature) entering the battlefield causes a triggered ability\b|\bentering causes a triggered ability\b/i, "etb-value"],
  [/\bcreature tokens you control (?:get|have)\b/i, "creature-token"],
  [/\bwhenever (?:a|another|one or more)\b[^.]*\bcreatures?\b[^.]*\benters?\b/i, "creature-enters"],
  [/\bwhenever (?:a|another|one or more)\b[^.]*\btokens?\b[^.]*\benters?\b|\bwhenever you create (?:a|one or more) tokens?\b/i, "token"],
  [/\bwhenever (?:a|one or more) \+1\/\+1 counters? (?:is|are) put\b|\bwhenever you put one or more \+1\/\+1 counters?\b|\bwith a \+1\/\+1 counter on it\b/i, "counter"],
  [/\bwhenever you gain life\b|\bif you gained (?:\d+ or more )?life this turn\b/i, "lifegain"],
  [/\bwhenever an opponent loses life\b|\bwhenever a player loses life\b/i, "life-drain"],
  [/\bwhenever you draw\b|\bsecond card each turn\b/i, "card-draw"],
  [/\bwhenever you discard\b|\bwhenever a player discards\b/i, "discard"],
  [/\bwhenever (?:one or more )?(?:creature )?cards? (?:are|is) put into your graveyard\b|\bwhenever one or more cards leave your graveyard\b/i, "graveyard"],
  [/\bthreshold\b|\bdelirium\b|\bseven or more cards in your graveyard\b/i, "graveyard"],
  [/\blandfall\b|\bwhenever a land (?:you control )?enters\b/i, "land-enters"],
  [/\bwhenever you cast (?:an? )?(?:instant or sorcery|instant|sorcery)\b|\bmagecraft\b|\bprowess\b/i, "spell-cast"],
  [/\bwhenever you cast a noncreature spell\b/i, "noncreature-cast"],
  [/\bwhenever (?:a|one or more) (?:creatures? you control|[a-z]+s? you control)? ?attacks?\b|\bwhenever [^.]* attacks\b/i, "attack"],
  [/\bdeals combat damage to a player\b/i, "combat-damage"],
  [/\bwhen [^.]*\benters\b/i, "etb-value"],
  [/\bwhenever an artifact (?:you control )?enters\b|\bwhenever you cast an artifact spell\b/i, "artifact"],
  [/\bwhenever an enchantment (?:you control )?enters\b|\bwhenever you cast an enchantment spell\b|\bconstellation\b/i, "enchantment"],
  [/\bwhenever (?:a|another) creature (?:you control )?becomes tapped\b|\bbecomes untapped\b/i, "untap"],
];

// Game-level effects, used for role inference when no role tags exist.
const EFFECT_RULES = [
  [/\b(?:destroy|exile) all\b|\beach (?:creature|nonland permanent)[^.]* (?:gets -\d+\/-\d+|is destroyed)|\ball creatures get -/i, "wipe"],
  [/\b(?:destroy|exile) (?:target|up to one target|another target)\b|\bdeals? \w+ damage to (?:target|any target)|\breturn target (?:nonland )?(?:creature|permanent)[^.]* to its owner's hand|\bfights?\b/i, "removal"],
  [/\bcounter target (?:spell|activated|noncreature)/i, "removal"],
  [/\bsearch your library for [^.]*\b(?:land|forest|plains|island|swamp|mountain)\b/i, "ramp"],
  [/\badd (?:\{[^}]+\}|one mana|two mana|mana)/i, "ramp"],
  [/\btreasure token/i, "ramp"],
  [/\bdraws? (?:a|one|two|three|x|\d+|that many) cards?\b/i, "draw"],
  [/\b(?:gains?|have|has) (?:[a-z ,]*\band )?(?:hexproof|indestructible|shroud|protection)\b|\bcounter target spell that targets\b|\bphase out\b/i, "protection"],
  [/\breturn[^.]*\bfrom (?:your|a) graveyard to (?:the battlefield|your hand)/i, "recursion"],
  [/\bput target [^.]*card from (?:a|your) graveyard onto the battlefield/i, "recursion"],
  [/\byou win the game\b|\bloses the game\b|\bextra turn\b|\binfect\b|\bdouble (?:the )?damage\b|\bcreatures you control get \+\d+\/\+\d+\b/i, "finisher"],
  [/\bsearch your library for (?:a|an|up to one) (?:card|creature card|instant|sorcery|artifact|enchantment)\b(?![^.]*\bland)/i, "tutor"],
];

const BASIC_LAND_TYPE = /\b(?:plains|island|swamp|mountain|forest)\b/i;

/**
 * Replaces the card's own name with "this card" so "When Foo enters" reads
 * as a self-trigger and never as "whenever a creature enters".
 */
function selfNormalized(text, name) {
  let out = String(text || "");
  if (name) {
    for (const part of [name, ...String(name).split(" // "), String(name).split(",")[0]]) {
      if (part && part.length > 2) out = out.split(part).join("this card");
    }
  }
  return out.replace(/\(([^)]*)\)/g, " ").replace(/\s+/g, " ");
}

const matchAll = (rules, text) => [...new Set(rules.filter(([pattern]) => pattern.test(text)).map(([, tag]) => tag))];

/**
 * @param {{ name?: string, oracleText?: string, oracle_text?: string, typeLine?: string, type_line?: string, keywords?: string[] }} card
 */
export function parseOracleMechanics(card = {}) {
  const name = card.name || "";
  const rawText = card.oracleText ?? card.oracle_text ?? "";
  const typeLine = String(card.typeLine ?? card.type_line ?? "");
  const text = selfNormalized(rawText, name);
  const lower = text.toLowerCase();

  const keywordSet = new Set((card.keywords || []).map((keyword) => String(keyword).toLowerCase()));
  for (const keyword of KEYWORDS) {
    if (new RegExp(`(?:^|[\\n.,;] ?)${keyword}\\b`, "i").test(rawText) || new RegExp(`^${keyword}\\b`, "im").test(rawText)) keywordSet.add(keyword);
  }

  const produces = new Set(matchAll(PRODUCE_RULES, text));
  const consumes = new Set(matchAll(CONSUME_RULES, text));
  const listens = new Set(matchAll(LISTEN_RULES, text));
  const effects = new Set(matchAll(EFFECT_RULES, text));

  // Self-referential triggers are the card's own value, not a listener for
  // other cards: "When this card enters" makes it a blink/flicker target.
  if (/\bwhen this card enters\b|\bwhenever this card enters\b/i.test(text)) {
    listens.delete("creature-enters");
    produces.add("etb-value");
  }
  if (listens.has("etb-value") && !/\bwhen this card enters\b|\bwhenever this card enters\b/i.test(text)) listens.delete("etb-value");

  // Type-line facts produce resources too: an artifact on the battlefield
  // is an artifact for "for each artifact"; a creature is a sacrifice body.
  if (/\bartifact\b/i.test(typeLine)) produces.add("artifact");
  if (/\benchantment\b/i.test(typeLine)) produces.add("enchantment");
  if (/\bcreature\b/i.test(typeLine)) produces.add("creature-enters");
  if (produces.has("creature-token")) { produces.add("creature-enters"); produces.add("creature-body"); produces.add("token"); }
  if (produces.has("treasure")) { produces.add("artifact"); produces.add("mana"); produces.add("token"); }
  if (produces.has("creature-dies")) produces.add("sacrifice");
  // A card with its own death trigger is fuel for anything that cares about
  // death-triggered abilities (trigger doublers like this one's commander).
  if (listens.has("creature-dies")) produces.add("death-trigger");
  if (produces.has("blink")) { consumes.add("etb-value"); produces.add("creature-enters"); }
  if (/\binstant\b|\bsorcery\b/i.test(typeLine)) { produces.add("spell-cast"); produces.add("noncreature-cast"); }
  else if (!/\bcreature\b|\bland\b/i.test(typeLine) && typeLine) produces.add("noncreature-cast");
  if (/\bland\b/i.test(typeLine)) {
    produces.add("land-enters");
    if (/\badd\b/i.test(rawText) || BASIC_LAND_TYPE.test(typeLine)) produces.add("mana");
    effects.delete("ramp");
  }
  if (keywordSet.has("haste") || keywordSet.has("menace") || keywordSet.has("flying") || keywordSet.has("trample")) {
    if (/\bcreature\b/i.test(typeLine)) produces.add("combat-damage");
  }
  if (keywordSet.has("lifelink")) produces.add("lifegain");
  if (effects.has("wipe")) effects.delete("removal");
  // Card draw that requires discarding is looting: it still draws.
  if (lower.includes("draw") && produces.has("card-draw")) effects.add("draw");

  return Object.freeze({
    name,
    keywords: Object.freeze([...keywordSet].sort()),
    produces: Object.freeze([...produces].sort()),
    consumes: Object.freeze([...consumes].sort()),
    listens: Object.freeze([...listens].sort()),
    effects: Object.freeze([...effects].sort()),
    triggered: /\b(?:when|whenever|at the beginning of)\b/i.test(text),
  });
}

/** Human copy for a resource id. */
export function describeResource(resource) {
  return RESOURCES[resource] || resource;
}
