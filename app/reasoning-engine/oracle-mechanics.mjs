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
//   etb       - how strong a self enter trigger is (tier, score, phrase), read
//               from that ability only. Producing etb-value does not vote blink.
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
  "equipment": "Equipment",
  "aura": "Auras",
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
  [/\b(?:put|puts) (?:a|an|one|two|three|x|that many|\d+|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\bdistribute (?:a|an|one|two|three|x|that many|\d+|\w+) \+1\/\+1 counters?\b/i, "counter"],
  [/\benters with (?:an additional )?(?:[A-Za-z]+ )?\+1\/\+1 counters?\b/i, "counter"],
  [/\bdouble the number of \+1\/\+1 counters\b/i, "counter"],
  [/\bproliferate\b/i, "counter"],
  [/\byou gain (?:\d+|x|that much|life)|\bgain \d+ life\b/i, "lifegain"],
  [/\blifelink\b/i, "lifegain"],
  [/\b(?:each opponent|target opponent|target player|each player|that player|defending player) loses (?:\w+ )?life\b/i, "life-drain"],
  [/\b(?:you draw|draw) (?:a|an|one|two|three|four|x|that many|\d+) cards?\b|\bdraw cards\b|\bdraws (?:a|an|one|two|three|four|x|that many|\d+) cards?\b/i, "card-draw"],
  [/\bmill(?:s)? (?:a|one|two|three|four|five|x|\d+) cards?\b|\bmills? (?:\w+ )?cards\b|put the top [^.]* into (?:your|their) graveyard/i, "graveyard"],
  [/\bdiscard (?:a|one|two|x|\d+|your hand)/i, "graveyard"],
  [/\breturn[^.]*\bfrom (?:your|a|their) graveyard\b/i, "recursion"],
  [/\bput target [^.]*card from (?:a|your) graveyard onto the battlefield/i, "recursion"],
  [/\b(?:cast|play)[^.]*\bfrom (?:your |a )?graveyard\b/i, "recursion"],
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
  [/\byou may sacrifice (?:a|an|another|one|two|x) (?:nonland )?artifact\b/i, "artifact"],
  [/\byou may sacrifice (?:a|an|another|one|two|x) (?:another |other )?creature\b/i, "creature-body"],
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
  [/\bfor each (?:creature|token) you control\b(?![^.]*\+1\/\+1 counter)|\bnumber of creatures you control\b(?![^.]*\+1\/\+1 counter)|\bfor each token\b/i, "creature-token"],
  [/\bfor each card in your graveyard\b|\bnumber of cards in your graveyard\b/i, "graveyard"],
  [/\bfor each \+1\/\+1 counter\b/i, "counter"],
  [/\bdouble the number of \+1\/\+1 counters\b/i, "counter"],
  [/\bfor each equipment you control\b/i, "equipment"],
  [/\bfor each aura you control\b|\bfor each aura attached\b/i, "aura"],
  [/\bpower 4 or greater\b/i, "power-matters"],
];

// Triggered/static listeners: "Whenever <event>", "At <step>", "for each".
const LISTEN_RULES = [
  // "die" must not match "deal". "would die" replaces the death instead of paying off it.
  [/\bwhenever\b(?![^.]*\bwould die\b)[^.]*\bdie(?:s|d)?\b/i, "creature-dies"],
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
  [/\bdeal(?:s)? combat damage to (?:a |one of your )?players?\b/i, "combat-damage"],
  [/\bwhenever an aura you control\b/i, "aura"],
  [/\bequipment attached\b[^.]{0,80}\btriggers\b/i, "equipment"],
  [/\bwhenever an artifact (?:you control )?enters\b/i, "artifact-enters"],
  [/\bwhenever equipped creature dies\b/i, "creature-dies"],
  [/\bartifact you control is put into a graveyard\b/i, "artifact-leaves"],
  [/\bwhenever\b[^.]*\b(?:food|clue|treasure|artifact)s?\b[^.]*\bput into a graveyard from the battlefield\b/i, "artifact-leaves"],
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
  [/\bdestroy all\b|\bexile all (?!graveyards?\b)|\beach (?:creature|nonland permanent)[^.]* (?:gets -\d+\/-\d+|is destroyed)|\ball creatures get -/i, "wipe"],
  [/\b(?:destroy|exile) (?:target|up to one target|another target) (?!player's graveyard\b|graveyard\b|cards? from (?:a |your |their )?graveyard\b)|\bdeals? \w+ damage to (?:target|any target)|\breturn target (?:nonland )?(?:creature|permanent)[^.]* to its owner's hand|\bfights?\b/i, "removal"],
  [/\bcounter target (?:spell|activated|noncreature)/i, "removal"],
  [/\bsearch your library for [^.]*\b(?:land|forest|plains|island|swamp|mountain)\b/i, "ramp"],
  [/\badd (?:\{[^}]+\}|one mana|two mana|mana)/i, "ramp"],
  [/\btreasure token/i, "ramp"],
  [/\b(?:you draw|draw) (?:a|an|one|two|three|x|that many|\d+) cards?\b|\bdraws (?:a|an|one|two|three|x|that many|\d+) cards?\b/i, "draw"],
  [/\b(?:gains?|have|has) (?:[a-z ,]*\band )?(?:hexproof|indestructible|shroud|protection)\b|\bcounter target spell that targets\b|\bphase out\b/i, "protection"],
  [/\breturn[^.]*\bfrom (?:your|a) graveyard to (?:the battlefield|your hand)/i, "recursion"],
  [/\bput target [^.]*card from (?:a|your) graveyard onto the battlefield/i, "recursion"],
  [/\byou win the game\b|\bloses the game\b|\bextra turn\b|\badditional combat phase\b|\binfect\b|\bdouble (?:the )?damage\b/i, "finisher"],
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

// A self-enter trigger names the card ("when this card enters" after the
// printed name is folded in) or the printed subject ("when this creature
// enters", "when this Vehicle enters"). "When this creature or another
// creature enters" is someone else's trigger and does not match.
const ENTER_SUBJECT = "card|creature|permanent|artifact|enchantment|aura|vehicle|spacecraft|equipment|land|class";
const SELF_ENTER = new RegExp(`\\b(?:when|whenever) this (?:${ENTER_SUBJECT}) enters\\b`, "i");
const ENTER_ABILITY = new RegExp(
  `\\b(?:when|whenever) this (?:${ENTER_SUBJECT}) enters\\b(?:\\s+or\\s+(?:attacks?|dies))?(?:\\s+and\\s+when you sacrifice (?:it|this (?:card|artifact|creature|permanent)))?`,
  "gi",
);

const NUMBER_WORD = Object.freeze({
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
});

function amountOf(word) {
  if (!word) return null;
  const lower = String(word).toLowerCase();
  if (lower === "x") return Infinity;
  if (NUMBER_WORD[lower]) return NUMBER_WORD[lower];
  const numeric = Number(lower);
  return Number.isFinite(numeric) ? numeric : null;
}

function printedManaValue(card = {}) {
  const cost = String(card.manaCost ?? card.mana_cost ?? "");
  if (cost) {
    let total = 0;
    for (const symbol of cost.match(/\{[^}]+\}/g) || []) {
      const inner = symbol.slice(1, -1);
      if (/^\d+$/.test(inner)) total += Number(inner);
      else if (!/^[XYZ]$/i.test(inner)) total += 1;
    }
    return total;
  }
  const direct = Number(card.cmc);
  return Number.isFinite(direct) ? direct : null;
}

const TIER_SCORE = Object.freeze({ premium: 6, solid: 3, minor: 1 });
const TIER_RANK = Object.freeze({ premium: 3, solid: 2, minor: 1 });

function clauseScales(clause) {
  return /\bwhere X is\b|\bequal to (?:its|that|the|your|this)\b|\bequal to the number\b|\bfor each\b|\bthat many\b/i.test(clause)
    || /\b(?:draw|create|add|untap|destroy|exile|deal|deals|lose|loses|gain|search) X\b/i.test(clause)
    || /\bcreate X\b|\b-X\/-X\b|\bX \/ X\b/i.test(clause);
}

function applyScale(grade) {
  if (!grade?.tier) return grade;
  const scales = Boolean(grade.scales || grade._scales);
  if (!scales || grade.tier === "premium") return { ...grade, scales };
  return { ...grade, scales: true, tier: grade.tier === "minor" ? "solid" : "premium" };
}

function betterGrade(left, right) {
  if (!left?.tier) return right;
  if (!right?.tier) return left;
  const delta = (TIER_RANK[right.tier] || 0) - (TIER_RANK[left.tier] || 0);
  if (delta !== 0) return delta > 0 ? right : left;
  if (right.scales && !left.scales) return right;
  return left;
}

function readEnterAbility(text, start) {
  let rest = text.slice(start).replace(/^[\s,—–-]+/, "");
  if (/\bchoose (?:one|two|three|up to \w+)\b/i.test(rest.slice(0, 80)) && rest.includes("•")) {
    const stop = rest.search(/\.\s+(?:When |Whenever |At the beginning |\{)/);
    return stop === -1 ? rest.trim() : rest.slice(0, stop + 1).trim();
  }
  const ender = /\.\s+/g;
  let match;
  while ((match = ender.exec(rest))) {
    const next = rest.slice(match.index + match[0].length);
    const reflexive = /^When you (?:do|don't)\b/.test(next);
    const boundary = !reflexive && /^(?:When |Whenever |At the beginning |\{)/.test(next);
    const continuation = /^(?:If |Then |You |That |Those |It |Its |Put |Shuffle|Return |The |Create |Draw |When you (?:do|don't)\b)/.test(next);
    if (boundary || !continuation) return rest.slice(0, match.index + 1).trim();
  }
  return rest.trim();
}

function enterAbilities(text) {
  const abilities = [];
  const pattern = new RegExp(ENTER_ABILITY.source, "gi");
  let match;
  while ((match = pattern.exec(text))) {
    abilities.push(readEnterAbility(text, match.index + match[0].length));
    if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
  }
  return abilities;
}

function repeatsWhenBlinked(clause) {
  if (/\bif you cast (?:it|this card)\b/i.test(clause)) return false;
  if (/\bif (?:it|this card) was cast\b/i.test(clause)) return false;
  if (/\bif \{[^}]+\}\s+was spent to cast (?:it|this card)\b/i.test(clause)) return false;
  return true;
}

function gradeBlink(clause) {
  // A period may sit between "exile" and "return" (modal modes do this).
  // Exile-until-leaves has no return, so it stays removal.
  const returns = /\breturn (?:it|that card|them|those cards) to the battlefield\b/i.test(clause);
  if (!returns || !/\bexile\b/i.test(clause)) return null;
  return { tier: "premium", phrase: "blinks another permanent", scales: false };
}

function gradeSteal(clause) {
  if (!/\bgain control of\b/i.test(clause)) return null;
  if (/\buntil end of turn\b/i.test(clause)) return { tier: "solid", phrase: "steals a permanent until end of turn", scales: false };
  return { tier: "premium", phrase: "steals a permanent", scales: false };
}

function gradeRemoval(clause) {
  if (/\breturn (?:it|that card|them|those cards) to the battlefield\b/i.test(clause)) return null;
  const removes = /\b(?:destroy|exile) (?:up to (?:one|two|three|four|\d+) )?(?:another )?(?:target )?(?:nonland |nonbasic |tapped |attacking )?(?:artifact or enchantment|artifact or land|creature or planeswalker|creature|permanent|artifact|enchantment|land|planeswalker)\b/i.test(clause);
  if (!removes) return null;
  const restricted = /\bwith mana value \d+ or less\b|\bwith power \d+ or less\b|\bwith toughness \d+ or less\b/i.test(clause);
  if (restricted) return { tier: "solid", phrase: "removes a smaller permanent", scales: false };
  let phrase = "removes a permanent";
  if (/\bdestroy target (?:nonbasic )?land\b/i.test(clause)) phrase = "destroys a land";
  else if (/\bartifact or land\b/i.test(clause)) phrase = "exiles an artifact or land";
  else if (/\b(?:destroy|exile) target (?:artifact or enchantment|artifact|enchantment)\b/i.test(clause)) phrase = "destroys an artifact or enchantment";
  else if (/\bdestroy target creature\b/i.test(clause)) phrase = "destroys a creature";
  else if (/\bexile target creature\b/i.test(clause)) phrase = "exiles a creature";
  else if (/\bdestroy target nonland\b/i.test(clause)) phrase = "destroys a permanent";
  else if (/\bexile target nonland\b/i.test(clause)) phrase = "exiles a permanent";
  return { tier: "premium", phrase, scales: false };
}

function gradeGraveyardExile(clause) {
  if (/\bexile (?:all graveyards|each opponent's graveyard|target player's graveyard)\b/i.test(clause)) {
    return { tier: "premium", phrase: "exiles a graveyard", scales: false };
  }
  if (/\bexile (?:up to \w+ )?target cards? from (?:a |your |their |an opponent's )?graveyards?\b/i.test(clause)) {
    return { tier: "minor", phrase: "exiles a graveyard card", scales: false };
  }
  return null;
}

function gradeDraw(clause) {
  const opponentOnly = /\b(?:an opponent|each opponent|target opponent|that player|they) draws?\b/i.test(clause)
    && !/\byou draw\b/i.test(clause);
  if (opponentOnly) return null;
  if (/\bdraw cards equal to\b/i.test(clause)) {
    const detail = clause.match(/\bdraw cards equal to ([^.,]+)/i);
    const phrase = detail ? `draws cards equal to ${detail[1].trim()}` : "draws cards";
    return { tier: "premium", phrase, scales: true };
  }
  if (/\bdraw (?:X|that many) cards\b/i.test(clause)) return { tier: "premium", phrase: "draws X cards", scales: true };
  const match = clause.match(/\bdraw (a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+) cards?\b/i);
  if (!match) return null;
  const amount = amountOf(match[1]);
  const word = match[1].toLowerCase();
  if (amount >= 2) {
    const discards = /\bthen discard\b/i.test(clause);
    return {
      tier: discards ? "solid" : "premium",
      phrase: discards ? `draws ${word} cards, then discards` : `draws ${word} cards`,
      scales: false,
    };
  }
  return { tier: "solid", phrase: "draws a card", scales: false };
}

function gradeTutor(clause) {
  if (!/\bsearch your library\b/i.test(clause)) return null;
  const nonland = /\b(?:creature|instant|sorcery|artifact|enchantment|planeswalker) cards?\b/i.test(clause)
    || /\bfor (?:a|an) cards?\b/i.test(clause);
  const land = /\bland cards?\b/i.test(clause);
  if (nonland && !(land && !/\b(?:creature|instant|sorcery|artifact|enchantment|planeswalker) cards?\b/i.test(clause))) {
    if (/\bcreature card\b/i.test(clause) && !/\binstant or sorcery\b/i.test(clause)) return { tier: "premium", phrase: "tutors a creature", scales: false };
    if (/\binstant or sorcery\b/i.test(clause)) return { tier: "premium", phrase: "tutors an instant or sorcery", scales: false };
    if (/\bartifact card\b/i.test(clause)) return { tier: "premium", phrase: "tutors an artifact", scales: false };
    return { tier: "premium", phrase: "tutors a card", scales: false };
  }
  if (!land) return { tier: "premium", phrase: "tutors a card", scales: false };
  const countWord = clause.match(/\bup to (one|two|three|four|five|six|seven|eight|nine|ten|\d+|X)\b/i);
  const count = countWord ? amountOf(countWord[1]) : 1;
  const battlefield = /\bonto the battlefield\b/i.test(clause);
  const scales = count === Infinity || /\bwhere X is\b/i.test(clause);
  const many = scales || (count !== null && count >= 3);
  const phrase = battlefield
    ? (many ? "puts lands onto the battlefield" : "puts a land onto the battlefield")
    : (many ? "tutors lands" : "tutors a land");
  return { tier: many ? "premium" : "solid", phrase, scales };
}

function gradeRecursion(clause) {
  if (/\b(?:you may )?cast target (?:instant or sorcery|instant|sorcery) card\b[^.]{0,80}\bgraveyard\b/i.test(clause)) {
    return { tier: "premium", phrase: "casts a spell from the graveyard", scales: clauseScales(clause) };
  }
  if (/\breturn target instant or sorcery card\b[^.]{0,60}\bgraveyard\b/i.test(clause)) {
    return { tier: "premium", phrase: "returns an instant or sorcery from the graveyard", scales: false };
  }
  if (/\breturn all [^.]{0,60}\bfrom (?:your |a )?graveyard\b[^.]{0,40}\bbattlefield\b/i.test(clause)) {
    return { tier: "premium", phrase: "returns permanents from the graveyard", scales: false };
  }
  if (/\b(?:return|put) (?:target |a |up to \w+ )?(?:[^.]+?\s)?from (?:your |a )?graveyard\b[^.]{0,40}\b(?:hand|battlefield)\b/i.test(clause)
    || /\b(?:return|put) target [^.]{0,80}\bgraveyard\b[^.]{0,40}\b(?:hand|battlefield)\b/i.test(clause)) {
    if (/\bland card\b/i.test(clause) && !/\bcreature card\b|\bpermanent card\b/i.test(clause) && !/\bbattlefield\b/i.test(clause)) {
      return { tier: "solid", phrase: "returns a land from the graveyard", scales: false };
    }
    const battlefield = /\bbattlefield\b/i.test(clause);
    return {
      tier: "premium",
      phrase: battlefield ? "reanimates a permanent" : "returns a card from the graveyard",
      scales: clauseScales(clause),
    };
  }
  return null;
}

function gradeUntap(clause) {
  if (!/\buntap\b/i.test(clause)) return null;
  if (/\buntap (?:up to )?(?:two|three|four|five|six|seven|eight|nine|ten|\d+|all|each|x|that many)\b[^.]{0,40}\blands?\b/i.test(clause)
    || /\buntap all lands\b/i.test(clause)) {
    return { tier: "premium", phrase: "untaps lands", scales: /\b(?:X|all|each)\b/i.test(clause) };
  }
  return { tier: "solid", phrase: /\bland\b/i.test(clause) ? "untaps a land" : "untaps a permanent", scales: false };
}

function gradeTap(clause) {
  if (!/\btap\b/i.test(clause)) return null;
  return { tier: "solid", phrase: "taps a permanent", scales: false };
}

function gradeBounce(clause) {
  if (/\bgraveyard\b/i.test(clause)) return null;
  if (!/\breturn (?:up to \w+ )?(?:another )?(?:target )[^.]{0,80}\bto (?:its |their )?owner'?s hand\b/i.test(clause)) return null;
  return { tier: "solid", phrase: "bounces a permanent", scales: false };
}

function gradeTokens(clause) {
  if (/\bcreate\b/i.test(clause) && /\btreasure\b/i.test(clause)) {
    const many = /\bcreate (?:X|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+Treasures?\b/i.test(clause);
    const scales = /\bcreate X\s+Treasures?\b/i.test(clause) || (/\bwhere X is\b/i.test(clause) && /\bTreasures?\b/i.test(clause));
    return { tier: "premium", phrase: scales ? "creates X Treasure tokens" : many ? "creates Treasure" : "creates a Treasure", scales };
  }
  if (/\bcreate (?:X|a number of)\b[^.]{0,80}\btokens?\b/i.test(clause) || /\btokens? equal to\b/i.test(clause)) {
    return { tier: "premium", phrase: "creates X creature tokens", scales: true };
  }
  const counted = clause.match(/\bcreate (two|three|four|five|six|seven|eight|nine|ten|\d+)\b[^.]{0,80}\btokens?\b/i);
  if (counted) {
    const amount = amountOf(counted[1]);
    const word = counted[1].toLowerCase();
    if (/\bfood\b/i.test(clause)) return { tier: amount >= 3 ? "premium" : "solid", phrase: `creates ${word} Food tokens`, scales: false };
    if (/\bclue\b/i.test(clause)) return { tier: "solid", phrase: `creates ${word} Clue tokens`, scales: false };
    if (/\btreasure\b/i.test(clause)) return { tier: "premium", phrase: "creates Treasure", scales: false };
    if (amount >= 3) return { tier: "premium", phrase: `creates ${word} creature tokens`, scales: false };
    return { tier: "solid", phrase: amount === 2 ? "creates two creature tokens" : "creates creature tokens", scales: false };
  }
  if (/\bcreate (?:a|an|one)\b[^.]{0,80}\btoken\b/i.test(clause) || /\binvestigate\b/i.test(clause)) {
    if (/\bfood\b/i.test(clause)) return { tier: "solid", phrase: "creates a Food token", scales: false };
    if (/\bclue\b/i.test(clause) || /\binvestigate\b/i.test(clause)) return { tier: "solid", phrase: "investigates", scales: false };
    return { tier: "solid", phrase: "creates a creature token", scales: false };
  }
  return null;
}

function gradeMana(clause) {
  const symbols = clause.match(/\{[^}]+\}/g) || [];
  const adds = /\badd\b/i.test(clause) && symbols.length;
  if (!adds) return null;
  return { tier: symbols.length >= 2 || /\badd X\b/i.test(clause) ? "premium" : "solid", phrase: "adds mana", scales: /\badd X\b|\bwhere X is\b/i.test(clause) };
}

function gradeDiscover(clause) {
  const match = clause.match(/\bdiscover (X|\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (!match) return null;
  const amount = amountOf(match[1]);
  const scales = match[1].toLowerCase() === "x";
  return { tier: scales || amount >= 4 ? "premium" : "solid", phrase: scales ? "discovers X" : `discovers ${match[1].toLowerCase()}`, scales };
}

function gradeCheat(clause) {
  if (/\bput (?:any number of|all|X) [^.]{0,60}\bfrom your hand onto the battlefield\b/i.test(clause)) {
    return { tier: "premium", phrase: "puts creatures from your hand onto the battlefield", scales: /\bX\b/.test(clause) };
  }
  return null;
}

function gradeLife(clause) {
  const drain = clause.match(/\b(?:each opponent|target opponent|each player|target player) loses (X|\d+) life\b/i);
  if (drain) {
    const amount = amountOf(drain[1]);
    const scales = drain[1].toLowerCase() === "x";
    if (scales || amount >= 5) return { tier: "solid", phrase: scales ? "drains X life" : `drains ${amount} life`, scales };
    return { tier: "minor", phrase: `drains ${amount} life`, scales: false };
  }
  const gain = clause.match(/\byou gain (X|\d+) life\b/i);
  if (!gain) return null;
  const amount = amountOf(gain[1]);
  const scales = gain[1].toLowerCase() === "x" || /\bequal to\b/i.test(clause);
  if (scales) return { tier: "solid", phrase: "gains X life", scales: true };
  if (amount <= 2) return { tier: "minor", phrase: amount === 1 ? "gains 1 life" : "gains 2 life", scales: false };
  return { tier: "solid", phrase: `gains ${amount} life`, scales: false };
}

function gradeDamage(clause) {
  const match = clause.match(/\bdeals? (X|\d+) damage to (?:any target|target creature|target planeswalker|target player|each opponent|target opponent|each player)\b/i);
  if (!match) return null;
  const amount = amountOf(match[1]);
  const scales = match[1].toLowerCase() === "x" || /\bequal to\b/i.test(clause);
  const face = /\b(?:each opponent|target opponent|target player|each player|planeswalker)\b/i.test(match[0]);
  if (scales) return { tier: "solid", phrase: "deals X damage", scales: true };
  if (face && amount <= 2) return { tier: "minor", phrase: `deals ${amount} damage`, scales: false };
  return { tier: "solid", phrase: `deals ${amount} damage`, scales: false };
}

function gradeShrink(clause) {
  if (!/gets? -X\/-X\b/i.test(clause) && !/gets? -\d+\/-\d+/i.test(clause)) return null;
  if (/gets? -X\/-X\b/i.test(clause)) return { tier: "solid", phrase: "gives a creature -X/-X", scales: true };
  return { tier: "solid", phrase: "shrinks a creature", scales: false };
}

function gradeFight(clause) {
  if (!/\bfights?\b/i.test(clause)) return null;
  return { tier: "solid", phrase: "fights a creature", scales: false };
}

function gradeScry(clause) {
  if (/\bscry\b/i.test(clause)) return { tier: "minor", phrase: "scries", scales: false };
  if (/\bsurveil\b/i.test(clause)) return { tier: "minor", phrase: "surveils", scales: false };
  return null;
}

function gradeMill(clause) {
  const match = clause.match(/\bmill (X|one|two|three|four|five|six|seven|eight|nine|ten|\d+) cards?\b/i);
  if (!match) return null;
  const amount = amountOf(match[1]);
  const scales = match[1].toLowerCase() === "x";
  return { tier: scales || amount >= 4 ? "solid" : "minor", phrase: scales ? "mills X cards" : `mills ${match[1].toLowerCase()} cards`, scales };
}

function gradeCounters(clause) {
  const match = clause.match(/\bput (a|an|one|two|three|four|five|X|\d+) \+1\/\+1 counters?\b/i);
  if (!match) return null;
  const amount = amountOf(match[1]);
  const scales = match[1].toLowerCase() === "x";
  if (scales || amount >= 3) return { tier: "solid", phrase: scales ? "puts X +1/+1 counters on a creature" : "puts +1/+1 counters on a creature", scales };
  if (amount >= 2) return { tier: "solid", phrase: "puts +1/+1 counters on a creature", scales: false };
  return { tier: "minor", phrase: "puts a +1/+1 counter on a creature", scales: false };
}

const EFFECT_GRADERS = [
  gradeBlink, gradeSteal, gradeRemoval, gradeGraveyardExile, gradeDraw, gradeTutor, gradeRecursion,
  gradeUntap, gradeTap, gradeBounce, gradeTokens, gradeMana, gradeDiscover, gradeCheat, gradeLife,
  gradeDamage, gradeShrink, gradeFight, gradeScry, gradeMill, gradeCounters,
];

function gradePiece(clause) {
  let best = null;
  for (const grade of EFFECT_GRADERS) {
    best = betterGrade(best, applyScale(grade(clause)));
  }
  return best;
}

function splitModes(clause) {
  const choice = clause.match(/\bchoose (one|two|three)\b/i);
  if (!choice || !clause.includes("•")) return null;
  const modes = clause.split("•").slice(1).map((mode) => mode.trim()).filter(Boolean);
  if (modes.length < 2) return null;
  const count = { one: 1, two: 2, three: 3 }[choice[1].toLowerCase()] || 1;
  return { count, modes };
}

function gradeEnterClause(clause) {
  const modal = splitModes(clause);
  const pieces = modal ? modal.modes : [clause];
  let best = null;
  const graded = [];
  for (const piece of pieces) {
    const grade = gradePiece(piece);
    if (grade?.tier) graded.push(grade);
    best = betterGrade(best, grade);
  }
  if (modal && modal.count >= 2 && graded.length >= 2) {
    const ordered = [...graded].sort((left, right) => (TIER_RANK[right.tier] || 0) - (TIER_RANK[left.tier] || 0));
    if (best?.tier && best.tier !== "premium" && (TIER_RANK[ordered[1].tier] || 0) >= TIER_RANK.solid) {
      best = { ...best, tier: best.tier === "minor" ? "solid" : "premium" };
    }
  }
  return {
    tier: best?.tier || null,
    phrase: best?.phrase || null,
    scales: Boolean(best?.scales),
    modal: Boolean(modal),
    repeatsOnBlink: repeatsWhenBlinked(clause),
  };
}

/**
 * Blink fuel from the enter ability only. Attack, dies, and activated
 * text stay out. Modal enters take the strongest mode, because the blink
 * player chooses it. A scaling effect steps up one tier. "If you cast it"
 * is printed strength that does not happen again when the card is blinked.
 */
function gradeSelfEnter(text, { typeLine = "", manaValue = null } = {}) {
  if (!SELF_ENTER.test(text)) return null;
  const grades = enterAbilities(text).map(gradeEnterClause);
  const repeatable = grades.filter((grade) => grade.repeatsOnBlink && grade.tier);
  const pool = repeatable.length ? repeatable : grades.filter((grade) => grade.tier);
  let best = null;
  for (const grade of pool) best = betterGrade(best, grade);
  const repeatsOnBlink = repeatable.length > 0 || !grades.some((grade) => grade.tier && !grade.repeatsOnBlink);
  const tier = best?.tier || null;
  const creature = /\bcreature\b/i.test(typeLine);
  const land = /\bland\b/i.test(typeLine);
  let score = 0;
  // Tier gaps (premium 6 / solid 3 / minor 1) stay larger than cheapness,
  // the creature bump, and the scaling bump added together. Cheapness runs
  // through mana value 6 so a 5-mana draw still outranks a 7-mana one.
  if (tier && repeatsOnBlink) {
    const cheap = !land && Number.isFinite(manaValue) ? Math.max(0, 6 - manaValue) * 0.22 : 0;
    score = Number((TIER_SCORE[tier] + cheap + (creature ? 0.2 : 0) + (best.scales ? 0.4 : 0)).toFixed(2));
  }
  return Object.freeze({
    tier,
    score,
    phrase: best?.phrase || null,
    scales: Boolean(best?.scales),
    modal: grades.some((grade) => grade.modal),
    repeatsOnBlink: tier ? Boolean(repeatsOnBlink) : true,
  });
}

const EMPTY_ETB = Object.freeze({
  tier: null, score: 0, phrase: null, scales: false, modal: false, repeatsOnBlink: true,
});

const NOT_CREATURE_SACRIFICE = new Set([
  "food", "clue", "treasure", "blood", "map", "junk", "gold", "artifact", "enchantment",
  "land", "permanent", "equipment", "aura", "token", "vehicle", "spell", "card",
]);

const NOT_A_TRIBE = new Set([
  "Treasure", "Food", "Clue", "Blood", "Map", "Junk", "Gold", "Powerstone", "Vehicle", "Aura",
  "Equipment", "Artifact", "Enchantment", "Creature", "Land", "Forest", "Island", "Plains",
  "Swamp", "Mountain", "Token", "Permanent", "Spell", "Card", "Target", "Whenever", "Other",
  "Each", "All", "This", "That", "You", "Your", "Opponent", "Player", "Control", "Graveyard",
  "Library", "Battlefield", "Turn", "Commander", "Legendary", "Power", "Toughness", "Flying",
  "Haste", "Trample", "Menace", "Vigilance", "Deathtouch", "Lifelink", "Ward", "Flash",
  "Defender", "Reach", "First", "Double", "Hexproof", "Indestructible", "Equip", "Enchant",
  "Until", "During", "After", "Choose", "Then", "Draw", "Add", "Put", "Create", "Sacrifice",
  "Return", "Exile", "Destroy", "Search", "Cast", "Play", "Gain", "Lose", "Deal", "Deals",
  "Damage", "Life", "Mana", "Color", "White", "Blue", "Black", "Red", "Green", "Colorless",
  "Counter", "Counters", "Instant", "Sorcery", "Planeswalker", "Humanoid",
  "Those", "These", "Attacking", "Blocking", "Tapped", "Untapped", "Equipped",
  "Enchanted", "Chosen", "Sacrificed", "Nonland", "Modified", "Suspected",
]);

const IRREGULAR_PLURAL = Object.freeze({
  Elf: "Elves", Dwarf: "Dwarves", Wolf: "Wolves", Mouse: "Mice", Fish: "Fish",
});
const IRREGULAR_SINGULAR = Object.freeze({
  Elves: "Elf", Dwarves: "Dwarf", Wolves: "Wolf", Mice: "Mouse", Fish: "Fish",
});

/** Printed creature-type plural. Elf becomes Elves, and Mice stays Mice. */
export function pluralCreatureType(type) {
  if (IRREGULAR_PLURAL[type]) return IRREGULAR_PLURAL[type];
  if (IRREGULAR_SINGULAR[type]) return type;
  if (/(?:s|x|ch|sh)$/i.test(type)) return `${type}es`;
  if (/[^aeiou]y$/i.test(type)) return `${type.slice(0, -1)}ies`;
  return `${type}s`;
}

function singularCreatureType(word) {
  if (IRREGULAR_SINGULAR[word]) return IRREGULAR_SINGULAR[word];
  if (IRREGULAR_PLURAL[word]) return word;
  if (/(?:s|x|ch|sh)es$/i.test(word) && word.length > 4) return word.slice(0, -2);
  if (/[^aeiou]ies$/i.test(word)) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * The creature type the rules text actually talks about. Read from patterns
 * like "other Elves you control", not from a fixed list of tribes.
 */
function typalOf(text) {
  const counts = new Map();
  const strong = new Set();
  const note = (word, kind) => {
    const type = singularCreatureType(word);
    if (!type || type.length < 3 || NOT_A_TRIBE.has(type) || NOT_A_TRIBE.has(word)) return;
    counts.set(type, (counts.get(type) || 0) + 1);
    if (kind === "strong") strong.add(type);
  };
  // A single "create a Soldier creature token" is not a tribe. "Other Elves
  // you control" and "Elf spell" are.
  const patterns = [
    [/\b([A-Z][a-z]+) creature tokens?\b/g, "weak"],
    [/\b([A-Z][a-z]+) tokens?\b/g, "weak"],
    [/\b(?:other|another|each|every|all|target) ([A-Z][a-z]+)\b/g, "strong"],
    [/\b([A-Z][a-z]+) you control\b/g, "strong"],
    [/\b([A-Z][a-z]+) spells?\b/g, "strong"],
    [/\b([A-Z][a-z]+) creatures\b/g, "strong"],
  ];
  for (const [pattern, kind] of patterns) {
    for (const match of text.matchAll(pattern)) note(match[1], kind);
  }
  const pick = (wantStrong) => {
    let best = null;
    let bestCount = 0;
    for (const [type, count] of counts) {
      if (strong.has(type) !== wantStrong) continue;
      if (count > bestCount) {
        best = type;
        bestCount = count;
      }
    }
    return { type: best, count: bestCount };
  };
  const strongPick = pick(true);
  if (strongPick.type) return strongPick;
  const weakPick = pick(false);
  if (weakPick.type && weakPick.count >= 2) return weakPick;
  return { type: null, count: 0 };
}

function sentencesOf(text) {
  return String(text || "").split(/(?<=\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

/** A token an opponent creates is not this card's resource. */
function sentenceIsYours(sentence) {
  if (/\b(?:that player|each opponent|target opponent|an opponent) creates?\b/i.test(sentence) && !/\byou create\b/i.test(sentence)) return false;
  return true;
}

/** "If an opponent has more" is catch-up, not a strategy to build around. */
function sentenceIsCatchUp(sentence) {
  return /\bif an opponent (?:controls|has) more\b/i.test(sentence);
}

/**
 * Counters placed only on this card, or only as "an additional counter for
 * each [type]", are not a counters deck. Proliferate and counters on other
 * creatures are.
 */
function counterScopeOf(text) {
  const sentences = sentencesOf(text);
  const places = (sentence) => /\b(?:put|distribute)\b[^.]*\+1\/\+1 counter/i.test(sentence);
  const onOthers = (sentence) => /\b(?:target|another|each other|each of|each creature|creatures? you control|each [A-Z][a-z]+)\b/i.test(sentence);
  const onSelf = (sentence) => /\bon (?:it|this card|this creature|this permanent)\b/i.test(sentence);
  const rider = sentences.some((sentence) => /enters with an additional \+1\/\+1 counter[^.]*\bfor each\b/i.test(sentence));
  const placesOnOthers = sentences.some((sentence) => places(sentence) && onOthers(sentence));
  const placesOnSelf = sentences.some((sentence) => (
    /(?:this card|this creature) enters with [^.]*\+1\/\+1 counters? on (?:it|this)/i.test(sentence)
    || (places(sentence) && onSelf(sentence) && !onOthers(sentence))
  ));
  if (/\bproliferate\b/i.test(text) && !placesOnOthers && !rider) return "proliferate";
  if (rider && !placesOnOthers) return "rider";
  if (placesOnSelf && !placesOnOthers && !rider) return "self";
  if (/\+1\/\+1 counter/i.test(text) || /\bproliferate\b/i.test(text)) return "place";
  return "none";
}

/** A mass pump is a finisher when it is large or scales. A +1/+1 lord is not. */
function marksFinisher(text) {
  if (/\byou win the game\b|\bloses the game\b|\bextra turn\b|\badditional combat phase\b|\binfect\b|\bdouble (?:the )?damage\b/i.test(text)) return true;
  if (/\bget \+X\/\+X\b/i.test(text)) return true;
  for (const match of text.matchAll(/\bcreatures you control get \+(\d+)\/\+(\d+)/gi)) {
    if (Number(match[1]) >= 3 || Number(match[2]) >= 3) return true;
  }
  return false;
}

/**
 * Exile-all-graveyards and "exile instead of the graveyard" fight a graveyard
 * deck. Opponent-only exile does not. "any-player" can hit you or them.
 */
function graveyardHateOf(text) {
  if (/\bwould be put into a graveyard from anywhere, exile it instead\b/i.test(text)) return "replacement";
  if (/\bexile all graveyards\b|\bexile each graveyard\b/i.test(text)) return "all";
  if (/\bexile (?:all cards from )?your graveyard\b/i.test(text)) return "yours";
  if (/\bshuffle your graveyard into (?:your|their) library\b/i.test(text)) return "shuffle";
  if (/\bexile target player's graveyard\b/i.test(text)) return "any-player";
  return null;
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

  const yours = sentencesOf(text).filter(sentenceIsYours).join(" ");
  const steady = sentencesOf(text).filter((sentence) => sentenceIsYours(sentence) && !sentenceIsCatchUp(sentence)).join(" ");
  const produces = new Set(matchAll(PRODUCE_RULES, yours));
  const catchUp = matchAll(PRODUCE_RULES, yours).filter((resource) => !matchAll(PRODUCE_RULES, steady).includes(resource));
  const consumes = new Set(matchAll(CONSUME_RULES, text));
  const listens = new Set(matchAll(LISTEN_RULES, text));
  const scales = new Set(matchAll(SCALE_RULES, text));
  const withoutEnterRider = text.replace(/\benters?\s+or\s+attacks?\b/gi, "enters");
  if (!/\battacks?\b/i.test(withoutEnterRider)) listens.delete("attack");
  const taps = new Set();
  const effects = new Set(matchAll(EFFECT_RULES, steady));
  if (marksFinisher(text)) effects.add("finisher");
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
  for (const match of text.matchAll(/\bsacrifice (?:another |a |an |one |two |three |\d+ )([A-Za-z]+)\b[^:.]{0,40}[:,]/gi)) {
    const word = match[1];
    if (word.toLowerCase() === "creature" || (!NOT_CREATURE_SACRIFICE.has(word.toLowerCase()) && /^[A-Z]/.test(word))) {
      consumes.add("creature-body");
      produces.add("creature-dies");
      produces.add("sacrifice");
    }
  }
  if (/\bsearch your library for\b[^.]{0,80}\bequipment\b/i.test(text) || /\bcreate\b[^.]{0,80}\bequipment\b/i.test(text)) produces.add("equipment");
  if (/\bsearch your library for\b[^.]{0,80}\baura\b/i.test(text)) produces.add("aura");
  if (/\bequipment\b/i.test(typeLine)) produces.add("equipment");
  if (/\baura\b/i.test(typeLine)) produces.add("aura");

  // A one-shot "when this card/creature/artifact enters" is fuel a blink deck
  // can reuse. It is not itself a blink or ETB-doubling payoff. Doublers
  // (Yarok, Panharmonicon) keep the etb-value listen. Printed strength lives
  // on `etb`; producing etb-value still does not vote the plan to blink.
  const etb = gradeSelfEnter(text, { typeLine, manaValue: printedManaValue(card) }) || EMPTY_ETB;
  const selfEtb = etb !== EMPTY_ETB;
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
    // The printed type is not the catch-up sentence that made a Treasure.
    for (const resource of ["artifact", "artifact-cast", "artifact-enters"]) {
      for (let index = catchUp.indexOf(resource); index !== -1; index = catchUp.indexOf(resource)) catchUp.splice(index, 1);
    }
  }
  if (/\benchantment\b/i.test(typeLine)) produces.add("enchantment");
  if (/\bcreature\b/i.test(typeLine)) produces.add("creature-enters");
  if (produces.has("creature-token")) {
    produces.add("creature-enters");
    produces.add("creature-body");
    produces.add("token");
    // A catch-up token is not a sacrifice plan. The body tag is derived.
    if (catchUp.includes("creature-token")) catchUp.push("creature-body", "creature-enters", "token");
  }
  if (produces.has("clue")) {
    produces.add("artifact");
    produces.add("artifact-enters");
    produces.add("token");
    if (catchUp.includes("clue")) catchUp.push("artifact", "artifact-enters", "token");
  }
  if (produces.has("food")) {
    produces.add("artifact");
    produces.add("artifact-enters");
    produces.add("token");
    if (catchUp.includes("food")) catchUp.push("artifact", "artifact-enters", "token");
  }
  if (produces.has("treasure")) {
    produces.add("artifact");
    produces.add("artifact-enters");
    produces.add("mana");
    produces.add("token");
    if (catchUp.includes("treasure")) catchUp.push("artifact", "artifact-enters", "mana", "token");
  }
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
  if (/enchanted (?:permanent|creature)[^.]*loses all other/i.test(text)) {
    effects.delete("ramp");
    produces.delete("mana");
  }
  if (effects.has("wipe")) effects.delete("removal");
  if (produces.has("card-draw") && !catchUp.includes("card-draw") && /\bdraw\b/i.test(steady)) effects.add("draw");
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

  if (/\b(?:card|permanent|artifact|creature) in your graveyard\b/i.test(text)
    && /\breturn (?:the chosen|that|it|them)\b[^.]*\b(?:to the battlefield|to your hand)\b/i.test(text)) {
    produces.add("recursion");
  }
  const tribe = typalOf(steady);
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
    etb,
    typal: tribe.type,
    typalCount: tribe.count,
    counterScope: counterScopeOf(text),
    catchUp: Object.freeze([...new Set(catchUp)]),
    graveyardHate: graveyardHateOf(text),
    symmetricDraw: /\beach player draws?\b/i.test(text),
    powerMatters: scales.has("power-matters"),
    triggered: /\b(?:when|whenever|at the beginning of)\b/i.test(text),
  });
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
      manaCost: source.manaCost ?? source.mana_cost ?? card?.manaCost ?? card?.mana_cost ?? "",
      cmc: source.cmc ?? card?.cmc,
    })
    : source;
  const text = String(source.oracleText || source.oracle_text || "");
  const parts = [];
  const produces = new Set(mechanics.produces || []);
  const listens = new Set(mechanics.listens || []);
  const scales = new Set(mechanics.scales || []);
  const consumes = new Set(mechanics.consumes || []);
  const taps = new Set(mechanics.taps || []);
  if (/\b(?:cast|play)[^.]*\bfrom (?:your |a )?graveyard\b/i.test(text)) parts.push("casts or plays cards from the graveyard");
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
  if (consumes.has("creature-body") && !listens.has("creature-dies")) parts.push("is a sacrifice outlet");
  else if (consumes.has("creature-body")) parts.push("sacrifices creatures");
  if (consumes.has("treasure") && mechanics.spendVerbs?.treasure === "sacrifices") parts.push("can sacrifice Treasure");
  if (listens.has("artifact-leaves")) parts.push("pays off an artifact you control leaving the battlefield");
  if (listens.has("creature-dies") && produces.has("lifegain")) parts.push("pays off creatures dying");
  if (listens.has("creature-enters") && produces.has("lifegain")) parts.push("gains life when another creature enters");
  if (listens.has("creature-enters") && !parts.length) parts.push("pays off creatures entering");
  if (listens.has("artifact-enters") && !parts.length) parts.push("pays off an artifact entering");
  if (mechanics.doublesEtb) parts.push("doubles enter-the-battlefield triggers");
  if (produces.has("blink")) parts.push("exiles your permanents and returns them");
  if (!parts.length && mechanics.selfEtb && mechanics.etb?.phrase) {
    parts.push(mechanics.etb.repeatsOnBlink
      ? `${mechanics.etb.phrase} when it enters`
      : `${mechanics.etb.phrase} only if you cast it`);
  }
  if (listens.has("enchantment") || listens.has("enchantment-cast")) parts.push("pays off enchantments");
  if (listens.has("historic")) parts.push("pays off historic spells");
  if (mechanics.typal && !parts.length) parts.push(`cares about ${pluralCreatureType(mechanics.typal)}`);
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
