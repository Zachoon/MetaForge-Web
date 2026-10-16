// =============================================================================
// Oracle Mechanics Parser
// =============================================================================
// Turns a card's rules text (Scryfall oracle_text) into a small mechanical
// fingerprint the reasoning engine can link across cards:
//
//   produces  - resources or game events this card creates
//               (a token, a creature dying, mana, a card drawn, a counter...)
//   consumes  - resources this card spends as a cost
//               (sacrifice, discard, exile from a graveyard, pay life, remove counters)
//   taps      - resources it taps for mana without sacrificing them
//   listens   - triggered abilities ("whenever you cast", "whenever an artifact enters")
//   scales    - static count payoffs ("gets +1/+0 for each artifact"). Counting is
//               not spending.
//   effects   - what the card does to the game (removal, wipe, ramp, draw...)
//   restrictions - spend-only mana, once each turn, nontoken, your turn only, ...
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
  "clue": "Clue",
  "food": "Food",
  "creature-enters": "creatures entering",
  "creature-dies": "creatures dying",
  "sacrifice": "sacrificing permanents",
  "creature-body": "bodies to sacrifice",
  "artifact": "artifacts",
  "artifact-enters": "an artifact entering",
  "artifact-cast": "casting an artifact spell",
  "artifact-leaves": "artifacts leaving the battlefield",
  "enchantment": "enchantments",
  "enchantment-cast": "casting an enchantment spell",
  "creature-cast": "casting a creature spell",
  "historic": "historic spells",
  "power-matters": "creatures with power 4 or greater",
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
  [/\bcreate[s]?\b[^.]*\btreasure|\bwould create [^.]*\btreasure/i, "treasure"],
  [/\bcreate[s]?\b[^.]*\bclue\b|\bwould create [^.]*\bclue\b|\binvestigate\b/i, "clue"],
  [/\bcreate[s]?\b[^.]*\bfood\b|\bwould create [^.]*\bfood\b/i, "food"],
  [/\bcreate[s]?\b[^.]*\b(?:clue|food|blood|map|treasure)\b|\bcreate[s]?\b[^.]*\bartifact\b[^.]*token/i, "artifact"],
  [/\bsacrifice (?:a|another|an|two|x)\b[^:.]*creature[^:]*:/i, "creature-dies"],
  [/\bsacrifice (?:a|another|an)\b[^:.]*(?:creature|artifact|permanent)[^:]*:/i, "sacrifice"],
  [/\beach (?:player|opponent) sacrifices\b/i, "creature-dies"],
  [/\b(?:put|puts|with) (?:a|an|one|two|three|x|that many|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\bproliferate\b/i, "counter"],
  [/\byou gain (?:\d+|x|that much|life)|\bgain \d+ life\b/i, "lifegain"],
  [/\blifelink\b/i, "lifegain"],
  [/\b(?:each opponent|target opponent|target player|each player|that player|defending player) loses (?:\w+ )?life\b/i, "life-drain"],
  [/\b(?:you draw|draw) (?:a|an|one|two|three|four|x|that many|\d+) cards?\b|\bdraw cards\b|\bdraws (?:a|an|one|two|three|four|x|that many|\d+) cards?\b/i, "card-draw"],
  [/\bmill(?:s)? (?:a|one|two|three|four|five|x|\d+) cards?\b|\bmills? (?:\w+ )?cards\b|put the top [^.]* into (?:your|their) graveyard/i, "graveyard"],
  [/\bdiscard (?:a|one|two|x|\d+|your hand)/i, "graveyard"],
  [/\breturn[^.]*\bfrom (?:your|a|their) graveyard\b/i, "recursion"],
  [/\bput target [^.]*card from (?:a|your) graveyard onto the battlefield/i, "recursion"],
  [/\badd (?:\{[^}]+\}|one mana|two mana|three mana|x mana|mana)/i, "mana"],
  [/\bsearch your library for [^.]*\bland card[^.]*onto the battlefield/i, "land-enters"],
  [/\byou may (?:put|play) (?:an )?(?:additional )?land/i, "land-enters"],
  [/\bplay an additional land\b/i, "land-enters"],
  [/\bexile (?:another )?target (?:creature|permanent|artifact)[^.]*(?:you control|you own)[^.]*\. (?:return|then return)/i, "blink"],
  [/\bexile [^.]*, then return (?:it|them|that card|those cards) to the battlefield/i, "blink"],
  [/\bput [^.]*\bland card\b[^.]*onto the battlefield/i, "land-enters"],
  [/\buntap (?:target|all|each|up to|another)/i, "untap"],
  [/\bcopy (?:target|that|it)\b|\bcreate a token that's a copy\b/i, "copy"],
  [/\bextra combat\b|\badditional combat phase\b/i, "attack"],
  [/\btwice that many of those tokens\b|\bcreates? twice that many\b/i, "token"],
  [/\btwice that many of those counters\b|\bplus one \+1\/\+1 counters?\b/i, "counter"],
];

// Costs and fuel. Only matched before a colon (an activation cost) or as an
// explicit "as an additional cost" / "you may sacrifice" clause.
const CONSUME_RULES = [
  [/\bsacrifice (?:a|another|an|one|two|x)\b[^:.]*creature[^:.]*[:,]/i, "creature-body"],
  [/\bas an additional cost[^.]*sacrifice (?:a|an|another) creature/i, "creature-body"],
  [/\bsacrifice (?:a|an|another|one|two|x)\b[^:.]*\bartifact[^:.]*[:,]/i, "artifact"],
  [/\bsacrifice (?:a|an|another) treasure\b/i, "treasure"],
  [/\bsacrifice (?:a|an|another) food\b/i, "food"],
  [/\bsacrifice (?:a|an|another) clue\b/i, "clue"],
  [/\bdiscard (?:a|one|two|x) cards?\s*(?::|,)/i, "card-draw"],
  [/\bexile [^.:]*from your graveyard[^.]*:/i, "graveyard"],
  [/\b(?:delve|escape|flashback)\b/i, "graveyard"],
  [/\bremove (?:a|one|two|x|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\bpay \w+ life\b/i, "lifegain"],
  [/\bconvoke\b/i, "tap-creatures"],
];

// Counting a resource is a payoff. It does not spend that resource.
// "Your opponents control" is not a payoff for your own permanents.
const SCALE_RULES = [
  [/\bfor each artifact (?:and\/or enchantment )?you control\b|\bnumber of artifacts you control\b|\baffinity for artifacts\b|\bgets? \+\d+\/\+\d+ for each artifact you control\b/i, "artifact"],
  [/\bfor each (?:creature|token) you control\b|\bnumber of creatures you control\b|\bfor each token\b/i, "creature-token"],
  [/\bfor each card in your graveyard\b|\bnumber of cards in your graveyard\b/i, "graveyard"],
  [/\bfor each \+1\/\+1 counter\b/i, "counter"],
  [/\bpower 4 or greater\b/i, "power-matters"],
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
  [/\bwhenever you cast (?:or copy )?(?:an? |your first )?(?:instant or sorcery|instant|sorcery)\b|\bmagecraft\b|\bprowess\b/i, "spell-cast"],
  [/\bwhenever you cast a noncreature spell\b/i, "noncreature-cast"],
  [/\bwhenever (?:a|one or more) (?:creatures? you control|[a-z]+s? you control)? ?attacks?\b|\bwhenever [^.]* attacks\b/i, "attack"],
  [/\bdeals combat damage to a player\b/i, "combat-damage"],
  [/\bwhenever an artifact (?:you control )?enters\b/i, "artifact-enters"],
  [/\bwhenever equipped creature dies\b/i, "creature-dies"],
  [/\bartifact you control is put into a graveyard\b/i, "artifact-leaves"],
  [/\bwhenever you cast an artifact spell\b/i, "artifact-cast"],
  [/\bwhenever you cast an enchantment spell\b|\bconstellation\b|\bwhenever an enchantment (?:you control )?enters\b/i, "enchantment"],
  [/\bwhenever you cast an enchantment spell\b/i, "enchantment-cast"],
  [/\bwhenever you cast a creature spell\b/i, "creature-cast"],
  [/\bwhenever you cast a historic spell\b/i, "historic"],
  [/\bartifact or creature entering\b|\bpermanent entering the battlefield causes a triggered ability\b|\bentering(?: the battlefield)? causes a triggered ability\b/i, "etb-value"],
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
  [/\b(?:you draw|draw) (?:a|an|one|two|three|x|that many|\d+) cards?\b|\bdraws (?:a|an|one|two|three|x|that many|\d+) cards?\b/i, "draw"],
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
  const scales = new Set(matchAll(SCALE_RULES, text));
  const taps = new Set();
  const effects = new Set(matchAll(EFFECT_RULES, text));
  // "Artifacts you control have '{T}: Add'" grants those permanents a new
  // ability. "Tap an untapped artifact you control: Add" is an outlet that
  // taps something else. Treasure tokens already have their own mana ability.
  let tapMode = null;
  if (/artifacts? you control have\b[^.]*\{t\}[^.]*\badd\b/i.test(text)) {
    taps.add("artifact");
    tapMode = "grant";
  }
  if (/tokens? you control have\b[^.]*\{t\}[^.]*\badd\b/i.test(text)) {
    taps.add("token");
    tapMode = tapMode || "grant";
  }
  if (/\btap an untapped artifact\b/i.test(text) || /\bimprovise\b/i.test(text)) {
    taps.add("artifact");
    tapMode = tapMode || "outlet";
  }
  if (/\btap (?:an|one|two|x) untapped creatures?\b/i.test(text)) taps.add("creature-token");
  if (/treasures? you control have\b/i.test(text) && /\bsacrifice\b/i.test(text)) {
    consumes.add("treasure");
    consumes.add("artifact");
  }
  if (/\bsacrifice another permanent\b/i.test(text)) produces.add("sacrifice");

  // A one-shot "when this card enters" is fuel a blink deck can reuse. It is
  // not itself a blink or ETB-doubling payoff. Doublers (Yarok, Panharmonicon)
  // keep the etb-value listen.
  const selfEtb = /\bwhen this card enters\b|\bwhenever this card enters\b/i.test(text);
  const doublesEtb = listens.has("etb-value") && !selfEtb;
  if (selfEtb) {
    listens.delete("creature-enters");
    listens.delete("etb-value");
    produces.add("etb-value");
  }

  if (/\bartifact\b/i.test(typeLine) && !/\bland\b/i.test(typeLine)) {
    produces.add("artifact");
    produces.add("artifact-cast");
    produces.add("artifact-enters");
  }
  if (/\benchantment\b/i.test(typeLine)) produces.add("enchantment");
  if (/\bcreature\b/i.test(typeLine)) produces.add("creature-enters");
  if (produces.has("creature-token")) { produces.add("creature-enters"); produces.add("creature-body"); produces.add("token"); }
  if (produces.has("clue")) { produces.add("artifact"); produces.add("artifact-enters"); produces.add("token"); }
  if (produces.has("food")) { produces.add("artifact"); produces.add("artifact-enters"); produces.add("token"); }
  if (produces.has("treasure")) { produces.add("artifact"); produces.add("artifact-enters"); produces.add("mana"); produces.add("token"); }
  if (produces.has("creature-dies") || produces.has("sacrifice")) produces.add("sacrifice");
  if (consumes.has("artifact") || consumes.has("treasure")) produces.add("artifact-leaves");
  if (listens.has("creature-dies")) produces.add("death-trigger");
  if (produces.has("blink")) { consumes.add("etb-value"); produces.add("creature-enters"); }
  if (/\binstant\b|\bsorcery\b/i.test(typeLine)) { produces.add("spell-cast"); produces.add("noncreature-cast"); }
  else if (!/\bcreature\b|\bland\b/i.test(typeLine) && typeLine) produces.add("noncreature-cast");
  if (/\bland\b/i.test(typeLine)) {
    produces.add("land-enters");
    if (/\badd\b/i.test(rawText) || BASIC_LAND_TYPE.test(typeLine)) produces.add("mana");
    effects.delete("ramp");
  }
  if (keywordSet.has("lifelink")) produces.add("lifegain");
  if (effects.has("wipe")) effects.delete("removal");
  if (lower.includes("draw") && produces.has("card-draw")) effects.add("draw");
  // "An opponent draws a card" is their draw, not this card drawing.
  const youDraw = /\byou (?:may )?draw\b|\bdraw (?:a|an|one|two|three|four|x|that many|\d+) cards?\b|\bdraw cards\b/i.test(text);
  if (!youDraw && /\b(?:opponent|player|they|that player) draws?\b/i.test(text)) {
    produces.delete("card-draw");
    effects.delete("draw");
  }

  const restrictions = parseRestrictions(text);
  const rampMode = rampModeOf(text, produces);
  if (rampMode === "conditional") effects.delete("ramp");
  if (rampMode === "conditional" || rampMode === "both") effects.add("conditional-ramp");
  if (/\bland\b/i.test(typeLine)) effects.delete("ramp");

  const spendVerbs = {};
  if (/\bsacrifice\b/i.test(text)) {
    for (const resource of ["artifact", "treasure", "food", "clue", "creature-body"]) {
      if (consumes.has(resource)) spendVerbs[resource] = "sacrifices";
    }
  }
  if (consumes.has("card-draw")) spendVerbs["card-draw"] = "discards";
  if (consumes.has("graveyard")) spendVerbs.graveyard = "exiles";
  if (consumes.has("counter")) spendVerbs.counter = "removes";
  if (consumes.has("lifegain")) spendVerbs.lifegain = "pays";

  return Object.freeze({
    name,
    keywords: Object.freeze([...keywordSet].sort()),
    produces: Object.freeze([...produces].sort()),
    consumes: Object.freeze([...consumes].sort()),
    listens: Object.freeze([...listens].sort()),
    scales: Object.freeze([...scales].sort()),
    taps: Object.freeze([...taps].sort()),
    tapMode,
    effects: Object.freeze([...effects].sort()),
    restrictions: Object.freeze(restrictions.map((entry) => Object.freeze(entry))),
    spendVerbs: Object.freeze(spendVerbs),
    rampMode,
    selfEtb,
    doublesEtb,
    typal: typalOf(text),
    powerMatters: scales.has("power-matters"),
    triggered: /\b(?:when|whenever|at the beginning of)\b/i.test(text),
  });
}

const TYPAL_TYPES = ["Angel", "Dragon", "Dinosaur", "Vampire", "Goblin", "Elf", "Zombie", "Wizard", "Sliver", "Merfolk", "Pirate", "Ninja", "Hydra", "Cat"];

function typalOf(text) {
  let best = null;
  let bestCount = 0;
  for (const type of TYPAL_TYPES) {
    const count = (text.match(new RegExp(`\\b${type}s?\\b`, "gi")) || []).length;
    const grouped = new RegExp(`(?:other|another|every|each) ${type}|${type}s? you control|${type} spell`, "i").test(text);
    if (grouped && count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

function parseRestrictions(text) {
  const restrictions = [];
  const spend = text.match(/spend this mana only to cast ([^.]*)/i);
  if (spend) {
    const raw = spend[1].trim();
    const clause = raw.replace(/^(?:an? |your )/i, "").trim();
    let scope = "typed-spell";
    let type = null;
    if (/instant (?:or|and) sorcery/i.test(raw)) scope = "instant-or-sorcery";
    else if (/creature spell/i.test(raw)) scope = "creature-spell";
    else if (/artifact spell/i.test(raw)) scope = "artifact-spell";
    else if (/\bcommander\b/i.test(raw)) scope = "commander";
    else {
      const named = clause.match(/^([A-Za-z]+) spell/i);
      type = named ? named[1] : clause;
    }
    restrictions.push({ kind: "spend-only", scope, type });
  }
  if (/\bonly during your turn\b|\bduring your turn,/i.test(text)) restrictions.push({ kind: "only-during-your-turn" });
  if (/\bif this card is tapped\b/i.test(text)) restrictions.push({ kind: "while-tapped" });
  if (/\bonce each turn\b/i.test(text)) restrictions.push({ kind: "once-each-turn" });
  if (/\bnontoken\b/i.test(text)) restrictions.push({ kind: "nontoken" });
  if (/commander'?s color identity/i.test(text)) restrictions.push({ kind: "color-identity" });
  return restrictions;
}

function rampModeOf(text, produces) {
  const sentences = String(text || "").split(/(?<=\.)\s+/);
  let unrestricted = false;
  let conditional = false;
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index];
    const next = sentences[index + 1] || "";
    const treasure = /treasure token/i.test(sentence);
    const adds = /\badd\b/i.test(sentence) && (/mana|\{[WUBRGC\d]/i.test(sentence));
    const restrictHere = /spend this mana only to cast/i.test(sentence);
    const restrictNext = /spend this mana only to cast/i.test(next);
    if (treasure) unrestricted = true;
    if (adds && (restrictHere || restrictNext) && !treasure) conditional = true;
    else if (adds && !restrictHere) unrestricted = true;
  }
  if (!unrestricted && !conditional && produces.has("treasure")) unrestricted = true;
  if (unrestricted && conditional) return "both";
  if (unrestricted) return "unrestricted";
  if (conditional) return "conditional";
  return "none";
}

/** Pool rows keep the printed card under `.card`. Parsed mechanics stay flat. */
function jobSource(card) {
  const nested = card?.card;
  if (nested && typeof nested === "object" && (nested.oracleText || nested.oracle_text || nested.typeLine || nested.type_line || nested.name)) {
    return nested;
  }
  return card || {};
}

/** One or two clauses, drawn only from this card's rules text. */
export function describeCardJob(card = {}) {
  const source = jobSource(card);
  const mechanics = source?.oracleText || source?.oracle_text || source?.typeLine || source?.type_line || !source?.produces
    ? parseOracleMechanics({
      name: source.name || card?.name || "",
      oracleText: source.oracleText ?? source.oracle_text ?? "",
      typeLine: source.typeLine ?? source.type_line ?? "",
      keywords: source.keywords || card?.keywords || [],
    })
    : source;
  const text = String(source.oracleText || source.oracle_text || "");
  const parts = [];
  const produces = new Set(mechanics.produces || []);
  const listens = new Set(mechanics.listens || []);
  const scales = new Set(mechanics.scales || []);
  const consumes = new Set(mechanics.consumes || []);
  const taps = new Set(mechanics.taps || []);
  if (produces.has("clue") && produces.has("food") && produces.has("treasure")) parts.push("replaces a Clue, Food, or Treasure with one of each");
  if (produces.has("treasure") && listens.has("creature-dies")) parts.push("makes Treasure whenever a creature dies");
  else if (produces.has("treasure") && listens.has("spell-cast")) parts.push("makes Treasure whenever you cast an instant or sorcery");
  else if (produces.has("treasure") && mechanics.selfEtb) parts.push("makes Treasure when it enters");
  else if (produces.has("treasure")) parts.push("makes Treasure");
  else if (listens.has("artifact-cast") && produces.has("creature-token")) parts.push("makes a creature token whenever you cast an artifact spell");
  else if (produces.has("creature-token") && listens.has("spell-cast")) parts.push("makes creature tokens whenever you cast an instant or sorcery");
  else if (listens.has("spell-cast") && /\bdeals?\b[^.]*\bdamage\b/i.test(text)) parts.push("deals damage whenever you cast an instant or sorcery");
  else if (listens.has("spell-cast") && (produces.has("life-drain") || (mechanics.effects || []).includes("removal"))) parts.push("pays off instants and sorceries");
  else if (listens.has("spell-cast")) parts.push("triggers off instants and sorceries");
  if (/twice that many/i.test(text)) parts.push("doubles tokens or counters");
  if (scales.has("artifact")) parts.push("scales with artifacts you control, without spending them");
  if (consumes.has("artifact") && mechanics.spendVerbs?.artifact === "sacrifices") parts.push("sacrifices artifacts");
  else if (taps.has("artifact") && mechanics.tapMode === "grant") {
    const spellOnly = (mechanics.restrictions || []).some((entry) => entry.kind === "spend-only" && entry.scope === "instant-or-sorcery");
    parts.push(spellOnly
      ? "gives artifacts an extra tap ability that can only be spent on instants and sorceries"
      : "gives artifacts an extra tap ability");
  }
  else if (taps.has("artifact")) parts.push("taps artifacts for mana");
  if (consumes.has("creature-body")) parts.push("sacrifices creatures");
  if (consumes.has("treasure") && mechanics.spendVerbs?.treasure === "sacrifices") parts.push("can sacrifice Treasure");
  if (listens.has("artifact-leaves")) parts.push("pays off an artifact you control leaving the battlefield");
  if (listens.has("creature-dies") && produces.has("lifegain")) parts.push("pays off creatures dying");
  if (listens.has("creature-enters") && produces.has("lifegain")) parts.push("gains life when another creature enters");
  if (listens.has("creature-enters") && !parts.length) parts.push("pays off creatures entering");
  if (listens.has("artifact-enters") && !parts.length) parts.push("pays off an artifact entering");
  if (mechanics.doublesEtb) parts.push("doubles enter-the-battlefield triggers");
  if (produces.has("blink")) parts.push("exiles your permanents and returns them");
  if (listens.has("enchantment") || listens.has("enchantment-cast")) parts.push("pays off enchantments");
  if (listens.has("historic")) parts.push("pays off historic spells");
  if (mechanics.typal && !parts.length) parts.push(`cares about ${mechanics.typal}s`);
  if (!parts.length && (mechanics.effects || []).includes("ramp")) parts.push("ramps");
  if (!parts.length && (mechanics.effects || []).includes("draw")) parts.push("draws cards");
  if (!parts.length && (mechanics.effects || []).includes("removal")) parts.push("answers a permanent or spell");
  if (!parts.length && (mechanics.effects || []).includes("conditional-ramp")) parts.push("adds mana only for a restricted kind of spell");
  return parts.slice(0, 2).join(", and ");
}

/** Human copy for a resource id. */
export function describeResource(resource) {
  return RESOURCES[resource] || resource;
}
