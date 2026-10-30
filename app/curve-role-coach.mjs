// =============================================================================
// Curve and role coaching
// =============================================================================
// Native Coach's construction read. Counts come from printed Oracle text,
// judged against the plan that text (and the stated strategy) actually
// describe. A number without the cards behind it is not a lesson.
// =============================================================================

import { curveManaValue } from "./conditional-effect-credit.mjs";
import { readCommanderPlan } from "./reasoning-engine/deck-profile.mjs";
import { printedQuote, rankPlanWeaknesses } from "./plan-weakness-coach.mjs";

const NUMBER = Object.freeze({
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, x: 3,
});

const BASICS = new Set([
  "plains", "island", "swamp", "mountain", "forest", "wastes",
  "snow-covered plains", "snow-covered island", "snow-covered swamp",
  "snow-covered mountain", "snow-covered forest",
]);

const CURVE_LABELS = Object.freeze(["0–1", "2", "3", "4", "5", "6+"]);

// Share of nonland spells that should sit in each bucket for this plan.
// A big-creature or graveyard plan is allowed a taller top end. A
// spellslinger plan is not.
const CURVE_BY_PLAN = Object.freeze({
  spellslinger: [0.16, 0.30, 0.26, 0.14, 0.08, 0.06],
  tokens: [0.14, 0.28, 0.26, 0.16, 0.10, 0.06],
  typal: [0.14, 0.28, 0.24, 0.16, 0.10, 0.08],
  creatures: [0.14, 0.26, 0.24, 0.16, 0.12, 0.08],
  aristocrats: [0.16, 0.28, 0.24, 0.16, 0.10, 0.06],
  combat: [0.12, 0.26, 0.24, 0.18, 0.12, 0.08],
  equipment: [0.12, 0.26, 0.24, 0.18, 0.12, 0.08],
  auras: [0.14, 0.28, 0.24, 0.16, 0.10, 0.08],
  artifacts: [0.12, 0.30, 0.22, 0.16, 0.12, 0.08],
  historic: [0.12, 0.28, 0.22, 0.16, 0.12, 0.10],
  enchantress: [0.14, 0.28, 0.24, 0.16, 0.10, 0.08],
  blink: [0.08, 0.20, 0.28, 0.22, 0.12, 0.10],
  landfall: [0.08, 0.16, 0.22, 0.20, 0.16, 0.18],
  "big-creatures": [0.06, 0.14, 0.18, 0.20, 0.18, 0.24],
  graveyard: [0.10, 0.20, 0.22, 0.16, 0.12, 0.20],
  control: [0.10, 0.22, 0.26, 0.20, 0.12, 0.10],
  midrange: [0.12, 0.24, 0.24, 0.18, 0.12, 0.10],
});

const IDEAL_AVERAGE = Object.freeze({
  spellslinger: 2.6,
  tokens: 2.8,
  typal: 2.9,
  creatures: 3.0,
  aristocrats: 2.8,
  combat: 3.1,
  equipment: 3.1,
  auras: 2.9,
  artifacts: 2.9,
  historic: 3.0,
  enchantress: 2.9,
  blink: 3.3,
  landfall: 3.7,
  "big-creatures": 4.1,
  graveyard: 3.6,
  control: 3.3,
  midrange: 3.2,
});

// Commander norms for a 100-card deck, then shifted by the plan.
const BASE_ROLES = Object.freeze({
  ramp: [10, 13],
  draw: [10, 13],
  interaction: [8, 11],
  wipes: [2, 4],
  wincon: [3, 6],
});

const ROLE_SHIFT = Object.freeze({
  spellslinger: { ramp: [-1, 0], draw: [2, 2], interaction: [2, 3], wipes: [0, 1], wincon: [-1, 0] },
  tokens: { ramp: [0, 0], draw: [1, 1], interaction: [0, 0], wipes: [-1, -1], wincon: [0, 1] },
  typal: { ramp: [0, 0], draw: [1, 1], interaction: [0, 0], wipes: [0, 0], wincon: [0, 1] },
  creatures: { ramp: [0, 1], draw: [0, 1], interaction: [0, 0], wipes: [0, 0], wincon: [0, 1] },
  aristocrats: { ramp: [-1, 0], draw: [1, 1], interaction: [0, 1], wipes: [0, 0], wincon: [0, 1] },
  combat: { ramp: [0, 1], draw: [0, 0], interaction: [1, 1], wipes: [-1, -1], wincon: [0, 1] },
  equipment: { ramp: [0, 1], draw: [0, 0], interaction: [1, 1], wipes: [-1, -1], wincon: [0, 1] },
  auras: { ramp: [0, 0], draw: [0, 1], interaction: [1, 1], wipes: [-1, 0], wincon: [0, 1] },
  artifacts: { ramp: [2, 2], draw: [0, 1], interaction: [0, 0], wipes: [0, 0], wincon: [0, 0] },
  historic: { ramp: [1, 1], draw: [0, 1], interaction: [0, 0], wipes: [0, 0], wincon: [0, 0] },
  enchantress: { ramp: [0, 0], draw: [1, 2], interaction: [0, 0], wipes: [0, 0], wincon: [0, 0] },
  blink: { ramp: [0, 1], draw: [0, 1], interaction: [0, 0], wipes: [0, 0], wincon: [0, 0] },
  landfall: { ramp: [3, 3], draw: [0, 0], interaction: [-1, -1], wipes: [0, 0], wincon: [0, 0] },
  "big-creatures": { ramp: [2, 2], draw: [0, 0], interaction: [-1, 0], wipes: [0, 0], wincon: [1, 2] },
  graveyard: { ramp: [0, 1], draw: [1, 2], interaction: [0, 0], wipes: [-1, 0], wincon: [1, 1] },
  control: { ramp: [-1, 0], draw: [1, 2], interaction: [3, 3], wipes: [1, 1], wincon: [-1, 0] },
});

const ROLE_LABELS = Object.freeze({
  ramp: "Ramp",
  draw: "Card advantage",
  interaction: "Interaction",
  wipes: "Board wipes",
  wincon: "Win conditions",
});

const INTERACTION = /\b(?:destroy|exile) (?:target|up to (?:one|two|three|\d+) targets?|another target)\b|\bcounter target (?:spell|activated|triggered|noncreature|ability)\b|\bdeals? (?:\d+|x) damage to (?:any target|target)\b|\bdeals? (?:\d+|x) damage divided\b|\bdeals? damage equal to [^.]*\bto target\b|\breturn target [^.]*\bowner(?:'s|s'|s)? hands?\b|\bfights? target\b|\bdeals damage equal to its power to target\b|\btarget permanent\b[^.]{0,80}\bshuffles? (?:it|that permanent) into\b|\b(?:each opponent|target opponent|each other player) sacrifices (?:a|an|one|two|three) (?:creature|nonland permanent|permanent|artifact|enchantment)\b/i;

const WIPE = /\bdestroy all\b|\bexile all (?!graveyards?\b)|\ball creatures get -(?:\d+|x)\/-(?:\d+|x)\b|\beach creature (?:gets? -(?:\d+|x)|is destroyed)\b|\bdeals? [^.]*\bdamage\b[^.]* to each (?:other |nontoken |attacking |blocking )?creatures?\b|\breturn all (?:nonland permanents|creatures) to their owners' hands\b/i;

const LAND_RAMP = /search your library for [^.]*\b(?:basic land|land card|forest card|plains|island|swamp|mountain|forest)\b[^.]*\bbattlefield\b/i;
const EXTRA_LAND = /\b(?:you may )?play an additional land\b/i;
const TAXED_TREASURE = /may pay \{[^}]+\}[^.]{0,120}create (?:a|that many|x )? ?treasure|if (?:the player|they) (?:doesn't|does not|don't), you create a treasure/i;
const COMBAT_TREASURE = /deals? combat damage[^.]*\btreasure\b|(?:creature|creatures) you control deals? combat damage[^.]*create[^.]*treasure/i;
const OPPONENT_TREASURE = /create[^.]*treasure[^.]*(?:opponents? control|your opponents)|where x is the number of [^.]*opponents/i;
const CAST_TREASURE = /whenever you cast[^.]*create[^.]*treasure/i;
const DEATH_TREASURE = /whenever [^.]*dies[^.]*create[^.]*treasure/i;
const FODDER_MANA = /sacrifice (?:a|another) creature\s*:[^.]{0,80}\badd\b/i;
const FILTER = /\{\d+\}[^:\n]{0,40}\{T\}\s*:\s*Add (?:one mana|\{[WUBRGC0-9]\})(?!\{)/i;
const REPEATABLE_ADD = /\{T\}\s*:\s*Add\b/i;

export function questionWantsCurveRoleCoaching(question = "") {
  return /\b(?:mana curve|curve|ramp|card advantage|loots?|draw|interaction|removal|board wipes?|wipes?|win ?cons?|roles?|counterspells?|protection|tutors?|impulse)\b|what(?:'s| is) (?:wrong|missing)|coach (?:this|the) (?:deck|list)|how (?:does|is) (?:this|the|my) (?:deck|list|curve)/i.test(String(question || ""));
}

function cleanText(value) {
  return String(value || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function sentencesOf(text) {
  return cleanText(text).split(/(?<=\.)\s+/).map((part) => part.trim()).filter(Boolean);
}

function modesOf(text) {
  const raw = String(text || "").replace(/\([^)]*\)/g, " ");
  if (!/\bchoose (?:one|two|three|one or both|one or more)\b/i.test(raw)) return null;
  const modes = raw.split(/\s*•\s*/).slice(1).map((part) => part.trim()).filter(Boolean);
  return modes.length >= 2 ? modes : null;
}

function stripOtherPlayers(text) {
  return String(text || "")
    .replace(/\bwhenever an opponent draws a card\b/gi, "")
    .replace(/\beach player (?:discards their hand, then )?draws?\b[^.]*/gi, "")
    .replace(/\beach player discards\b[^.]*/gi, "")
    .replace(/\b(?:an opponent|target opponent|each opponent|target player|that player) (?:discards?|draws?)\b[^.]*/gi, "");
}

function countVerb(text, verb) {
  const re = new RegExp(`\\b(?:you\\s+(?:may\\s+)?)?${verb}s?\\s+(a|an|one|two|three|four|five|six|seven|eight|\\d+|x)\\s+cards?\\b`, "gi");
  let total = 0;
  for (const match of String(text || "").matchAll(re)) {
    const word = match[1].toLowerCase();
    total += NUMBER[word] || Number(word) || 0;
  }
  if (verb === "draw" && /\bdraw cards equal to\b|\bdraws cards equal to\b/i.test(text)) total += 2;
  if (verb === "discard" && /\bdiscard your hand\b/i.test(text)) total += 7;
  return total;
}

function handEconomy(text) {
  const personal = stripOtherPlayers(cleanText(text).replace(/\bwhenever you draw\b/gi, ""));
  const draw = countVerb(personal, "draw");
  const discard = countVerb(personal, "discard");
  return { draw, discard };
}

function spendRestriction(window) {
  if (/can'?t be spent to cast a nonartifact spell/i.test(window)) return "only artifact spells";
  const match = String(window || "").match(/spend this mana only to cast ([^.]*)/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (/^(?:an? )?spell\b/i.test(raw)) return null;
  if (/instant (?:or|and) sorcery/i.test(raw)) return "only instants and sorceries";
  if (/creature spells?/i.test(raw)) return "only creature spells";
  if (/artifact spells?/i.test(raw)) return "only artifact spells";
  if (/chosen type/i.test(raw)) return "only a chosen type";
  const named = raw.match(/([A-Za-z][A-Za-z'-]*) spells?/i);
  if (named && !/^(?:a|an|the|instant|sorcery|creature|artifact|enchantment|permanent)$/i.test(named[1])) {
    return `only ${named[1]} spells`;
  }
  return `only ${raw}`;
}

function restrictedAdd(text) {
  const sentences = sentencesOf(text);
  const adds = [];
  for (let index = 0; index < sentences.length; index += 1) {
    if (!/\badd\b/i.test(sentences[index])) continue;
    adds.push(spendRestriction(sentences.slice(index, index + 3).join(" ")));
  }
  if (!adds.length) return null;
  if (adds.every((reason) => reason)) return adds.find(Boolean) || null;
  // One unrestricted add is generic mana, even if another ability is limited.
  if (adds.some((reason) => reason)) return null;
  // The Powerstone restriction is sometimes the whole rules sentence, and
  // sometimes sits where a reminder would. It still is not generic mana.
  if (/can'?t be spent to cast a nonartifact spell/i.test(String(text))) return "only artifact spells";
  return null;
}

function opponentMana(text) {
  return [...String(text || "").matchAll(/\badd\b[^.]*/gi)].some((match) => /\bopponent\b/i.test(match[0]) && /could produce|\bany color\b/i.test(match[0]));
}

function reliableColoredMana(text) {
  if (opponentMana(text) && !/\{T\}\s*:\s*Add \{[WUBRG]\}/i.test(text) && !/commander'?s color identity/i.test(text) && !LAND_RAMP.test(text)) {
    return false;
  }
  if (LAND_RAMP.test(text) || EXTRA_LAND.test(text)) return true;
  if (/commander'?s color identity/i.test(text)) return true;
  if (/add (?:one mana of )?any color/i.test(text) && !opponentMana(text) && !spendRestriction(text)) return true;
  if (/\{T\}\s*:\s*Add \{[WUBRG]\}/i.test(text) && !spendRestriction(text)) return true;
  return false;
}

function repeatableTreasure(text) {
  return /at the beginning of (?:your|each) (?:upkeep|end step)\b[^.]*\btreasure\b/i.test(text)
    || /\bwhenever\b[^.]*\btreasure\b/i.test(text);
}

function treasureKind(text) {
  const rules = cleanText(text);
  if (!/treasure/i.test(rules)) return null;
  if (TAXED_TREASURE.test(rules)) return "Treasure only if an opponent declines a tax";
  if (COMBAT_TREASURE.test(rules)) return "Treasure only after combat damage";
  if (OPPONENT_TREASURE.test(rules)) return "Treasure only from the permanents opponents already control";
  if (/whenever an opponent\b[^.]*\btreasure\b/i.test(rules)) return "Treasure only when an opponent acts";
  if (CAST_TREASURE.test(rules)) return "Treasure only when you cast a spell, so it is not mana that starts the turn";
  if (DEATH_TREASURE.test(rules)) return "Treasure only when a creature dies";
  if (FODDER_MANA.test(rules)) return "mana only if you sacrifice a creature";
  // Upkeep, end step, and other repeating Treasure is mana the deck can plan
  // around. A one-shot "create a Treasure" is a ritual, not a rock.
  if (repeatableTreasure(rules)) return null;
  if (/create (?:a|one|x) (?:tapped )?treasure tokens?\b/i.test(rules) && !/\bfor each\b/i.test(rules)) {
    return "one Treasure once, which is a ritual rather than a mana rock";
  }
  return null;
}

function isFilterOnly(text) {
  if (!FILTER.test(text)) return false;
  if (LAND_RAMP.test(text) || EXTRA_LAND.test(text)) return false;
  if (/\{T\}\s*:\s*Add \{C\}\{C\}/i.test(text)) return false;
  if (/\{T\}\s*:\s*Add \{[WUBRG]\}/i.test(text) && !/\{\d+\}[^:\n]{0,40}\{T\}/.test(text)) return false;
  return true;
}

function modeIsWipe(text) {
  return WIPE.test(text)
    || (/\boverload\b/i.test(text) && /\b(?:return|destroy|exile) target\b/i.test(text))
    || /\b(?:each opponent|your opponents) sacrifices? all\b/i.test(text);
}

function modeIsInteraction(text) {
  if (modeIsWipe(text) && !/\breturn target\b|\bdestroy target\b|\bexile target\b|\btarget permanent\b[^.]{0,80}\bshuffles?/i.test(text)) return false;
  return INTERACTION.test(text);
}

function phraseAfterTarget(text) {
  const match = String(text || "").match(/\b(?:destroy|exile|return) target ([^.]{0,80})/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function removalProfile(text) {
  if (!modeIsInteraction(text)) return null;
  const raw = cleanText(text);
  const countersOnly = /\bcounter target\b/i.test(raw)
    && !/\b(?:destroy|exile|return) target\b/i.test(raw)
    && !/\bdeals?\b/i.test(raw)
    && !/\bfights?\b/i.test(raw)
    && !/\bshuffles? (?:it|that permanent) into\b/i.test(raw);
  if (countersOnly) return null;
  const limits = [];
  let flexible = true;
  const power = raw.match(/\b(?:with )?(power|toughness) (\d+) or (less|greater)\b/i);
  if (power) {
    flexible = false;
    limits.push(`only a creature with ${power[1].toLowerCase()} ${power[2]} or ${power[3].toLowerCase()}`);
  }
  const manaValues = [...raw.matchAll(/\bmana value (\d+) or less\b/gi)].map((match) => match[1]);
  if (manaValues.length) {
    flexible = false;
    const unique = [...new Set(manaValues)];
    if (/\brevolt\b/i.test(raw) && unique.length > 1) {
      limits.push(`only a creature with mana value ${unique[0]} or less, or ${unique[unique.length - 1]} or less if a permanent you controlled left the battlefield`);
    } else {
      limits.push(`only a permanent with mana value ${unique[unique.length - 1]} or less`);
    }
  }
  const damage = raw.match(/\bdeals? (\d+) damage to (?:target creature|any target|target permanent|target planeswalker)\b/i);
  if (damage && Number(damage[1]) <= 3 && !/\bdamage equal to\b/i.test(raw)) {
    flexible = false;
    limits.push(`only ${damage[1]} damage, so a creature with toughness ${Number(damage[1]) + 1} or more survives`);
  }
  if (/\bfights? target\b/i.test(raw)) {
    flexible = false;
    limits.push("only if a creature you control is big enough to fight");
  }
  const positional = raw.match(/\btarget (tapped|untapped|attacking|blocking) (?:creature|permanent)\b/i);
  if (positional) {
    flexible = false;
    limits.push(`only ${positional[1].toLowerCase()} permanents`);
  }
  if (/\b(?:each opponent|target opponent|each other player) sacrifices\b/i.test(raw)) {
    flexible = false;
    limits.push("an opponent chooses which permanent to sacrifice");
  }
  const exceptType = raw.match(/\btarget non-([A-Za-z][A-Za-z'-]+) creature\b/);
  if (exceptType) {
    flexible = false;
    limits.push(`only a creature that is not a ${exceptType[1]}`);
  }
  const phrase = phraseAfterTarget(raw);
  if (phrase && !power && !manaValues.length) {
    const hitsBroad = /\b(?:creature|permanent|any target)\b/i.test(phrase);
    const typed = /\b(?:artifact|enchantment|planeswalker|land)\b/i.test(phrase);
    if (typed && !hitsBroad) {
      flexible = false;
      const cleaned = phrase.replace(/\s+its controller.*$/i, "").trim();
      const article = /^(?:a|an)\b/i.test(cleaned) ? "" : "an ";
      limits.push(`only ${article}${cleaned}`);
    }
  }
  if (/\b(?:flying|defender|islandwalk|trample)\b/i.test(phrase) && /\bcreature with\b/i.test(phrase)) {
    flexible = false;
    const word = phrase.match(/\bcreature with (\w+)/i);
    if (word && !limits.some((limit) => limit.includes(word[1].toLowerCase()))) limits.push(`only a creature with ${word[1].toLowerCase()}`);
  }
  let mild = null;
  if (flexible && /\bnonartifact creature\b/i.test(raw)) mild = "misses artifact creatures";
  return {
    flexible,
    note: flexible ? mild : (limits.join("; ") || "only some permanents"),
  };
}

function counterProfile(text) {
  if (!/\bcounter target\b/i.test(text)) return null;
  const raw = cleanText(text);
  const open = /\bcounter target spell\b/i.test(raw)
    && !/\bcounter target spell (?:that|unless|with)\b/i.test(raw)
    && !/\bcounter target (?:noncreature|creature|instant|sorcery|enchantment|artifact|activated|triggered|blue|black|red|green|white)\b/i.test(raw);
  let note = null;
  if (!open) {
    if (/\bthat targets?\b/i.test(raw)) note = "only a spell that targets you or a permanent you control";
    else if (/\bnoncreature spell\b/i.test(raw)) note = "only a noncreature spell";
    else if (/\bcreature spell\b/i.test(raw)) note = "only a creature spell";
    else if (/\bactivated ability\b/i.test(raw)) note = "only an activated ability";
    else if (/\btriggered ability\b/i.test(raw)) note = "only a triggered ability";
    else {
      const match = raw.match(/\bcounter target ([^.]+)/i);
      note = match ? `only ${match[1].trim()}` : "only some spells";
    }
  }
  return { flexible: open, note };
}

function protectionProfile(text, typeLine) {
  const raw = cleanText(text);
  const grants = /\b(?:gains?|have|has)\b[^.]{0,60}\b(?:hexproof|shroud|indestructible|protection from)\b/i.test(raw)
    || /\bprotection from everything\b/i.test(raw)
    || (/\bphase out\b/i.test(raw) && /\bpermanents you control\b/i.test(raw))
    || /\bchange the target of target spell\b/i.test(raw)
    || /\bcounter target [^.]*\bthat targets\b/i.test(raw);
  if (!grants) return null;
  const line = String(typeLine || "");
  const selfOnly = /\bcreature\b/i.test(line)
    && /\b(?:hexproof|shroud|indestructible)\b/i.test(raw)
    && !/\b(?:target|equipped|enchanted|you control|permanents you control|equip\b)\b/i.test(raw);
  if (selfOnly) return null;
  if (/^(?:hexproof|shroud|indestructible)\.?$/i.test(raw)) return null;
  let note = "blank a removal spell aimed at your permanents";
  if (/\bequip\b/i.test(raw)) note = "stays on the creature you equip";
  else if (/\bphase out\b/i.test(raw)) note = "phases your permanents out until your next turn";
  else if (/\bchange the target\b/i.test(raw)) note = "changes the target of a spell or ability";
  else if (/\bcounter target\b/i.test(raw)) note = "counters a spell that is aimed at you";
  return { note };
}

function collectHits(text) {
  const hits = new Set();
  if (/\bcreatures?\b/i.test(text)) hits.add("creatures");
  if (/\bartifacts?\b/i.test(text)) hits.add("artifacts");
  if (/\benchantments?\b/i.test(text)) hits.add("enchantments");
  if (/\bplaneswalkers?\b/i.test(text)) hits.add("planeswalkers");
  if (/\bnonland permanents?\b/i.test(text)) hits.add("nonland permanents");
  if (/\ball permanents\b/i.test(text)) hits.add("permanents");
  if (hits.has("nonland permanents") || hits.has("permanents")) {
    hits.add("creatures");
    hits.add("artifacts");
    hits.add("enchantments");
  }
  return hits;
}

function pieceIsOneSided(text) {
  return /\byou don't control\b|\byour opponents control\b|\bopponents control\b|\beach opponent sacrifices\b|\btarget opponent sacrifices\b/i.test(text);
}

function wipeGateOf(text) {
  const less = String(text || "").match(/\b(power|toughness|mana value) (\d+) or less\b/i);
  if (less) return { dir: "less", stat: `${less[1].toLowerCase()} ${less[2]} or less` };
  const greater = String(text || "").match(/\b(power|toughness|mana value) (\d+) or greater\b/i);
  if (greater) return { dir: "greater", stat: `${greater[1].toLowerCase()} ${greater[2]} or greater` };
  return null;
}

function wipeProfile(text) {
  const modes = modesOf(text);
  const wipePieces = (modes || [text]).filter((piece) => modeIsWipe(piece));
  if (!wipePieces.length && !modeIsWipe(text)) return null;
  const source = wipePieces.length ? wipePieces : [text];
  const hits = new Set();
  let oneSided = source.length > 0;
  let scalable = false;
  for (const piece of source) {
    for (const hit of collectHits(piece)) hits.add(hit);
    if (!pieceIsOneSided(piece)) oneSided = false;
    if (/\b-x\/-x\b/i.test(piece) || /\bpay x life\b/i.test(piece)) scalable = true;
  }
  if (/\boverload\b/i.test(text) && /\byou don't control\b/i.test(text)) oneSided = true;
  const gate = wipeGateOf(cleanText(text));
  const choice = Boolean(modes) && hits.size > 1 && !oneSided;
  let note = null;
  if (choice) note = "You choose the modes, so it can miss the permanents this plan needs.";
  else if (oneSided) note = "It removes their permanents and leaves yours.";
  else if (scalable) note = "You choose how much toughness to erase.";
  else if (gate) note = `It only hits ${gate.stat}.`;
  else note = "It hits every permanent of that kind, including yours.";
  return {
    scope: choice ? "choice" : oneSided ? "one-sided" : "symmetric",
    hits: [...hits],
    scalable,
    gate,
    note,
  };
}

function isImpulseText(text) {
  const raw = cleanText(text);
  return /\bexile the top\b/i.test(raw) && /\byou may (?:play|cast)\b/i.test(raw);
}

function impulseNote(text) {
  const raw = cleanText(text);
  if (/\buntil the end of your next turn\b/i.test(raw)) return "exiles cards and lets you play them until the end of your next turn, then they are gone";
  if (/\bthis turn\b|\buntil end of turn\b/i.test(raw)) return "exiles cards and lets you play them this turn, then they are gone";
  return "exiles cards for you to play, and they are not drawn";
}

function libraryCardsToHand(text) {
  const raw = cleanText(text);
  if (/\bsearch your library\b/i.test(raw)) return 0;
  if (isImpulseText(raw)) return 0;
  if (/\bput one pile into your hand\b/i.test(raw)) return 2;
  if (!/\b(?:look at|reveal) the top\b/i.test(raw)) return 0;
  const match = raw.match(/\bput (?:up to )?(a|an|one|two|three|four|five|\d+) (?:of them |of those cards |cards )?into your hand\b/i);
  if (match) {
    const word = match[1].toLowerCase();
    const count = NUMBER[word] || Number(word) || 0;
    if (/up to/i.test(match[0]) && count <= 1) return 1;
    return count;
  }
  if (/\bput (?:it|that card) into your hand\b/i.test(raw)) return 1;
  return 0;
}

function tutorProfile(text) {
  const raw = cleanText(text);
  const searched = /\bsearch your library for\b/i.test(raw);
  const named = /\bname a card\b/i.test(raw) && /\bput (?:it|that card) into your hand\b/i.test(raw);
  if (!searched && !named) return null;
  if (searched && LAND_RAMP.test(raw)) return null;
  const found = raw.match(/\bsearch your library for ([^.]{0,80})/i);
  const target = (found ? found[1] : "a card").split(/,| then | and put /i)[0].replace(/\s+/g, " ").trim();
  const open = named || (/^(?:up to )?(?:a|an|one|two|three) cards?$/i.test(target) && !(/\bwith\b|\bnamed\b/i.test(target)));
  let destination = "into your hand";
  if (/\bonto the battlefield\b/i.test(raw)) destination = "onto the battlefield";
  else if (/\bon top\b/i.test(raw)) destination = "on top of your library";
  const where = destination === "into your hand"
    ? "The tutor takes the place of the card it finds, so the hand does not get larger."
    : destination === "on top of your library"
      ? "It puts the card on top of the library. That is not a draw."
      : "It puts the card onto the battlefield. That is not a draw.";
  const what = open ? "any card" : target;
  return { open, note: `finds ${what}. ${where}` };
}

function isEngineDraw(text) {
  const raw = cleanText(text);
  if (/\bwhenever\b[^.]{0,220}\bdraw\b/i.test(raw) && !/\bwhenever an opponent draws\b/i.test(raw)) return true;
  if (/\bat the beginning of\b[^.]{0,180}\bdraw\b/i.test(raw)) return true;
  if (/\{T\}[^:\n]{0,80}:\s*draw\b/i.test(raw) && !/\bsacrifice\b/i.test(raw)) return true;
  return false;
}

function selectionProfile(text, draw, loot, impulse, tutor) {
  if (draw || loot || impulse || tutor) return null;
  const kept = libraryCardsToHand(text);
  if (kept === 1) return { note: "looks at the top of the library and keeps one card, so the hand does not get an extra card" };
  return null;
}

function modeIsWincon(text) {
  return /\byou win the game\b|\b(?:an opponent|each opponent|target player|that player) loses the game\b|\bloses the game\b|\bextra turns?\b|\badditional combat phases?\b|\binfect\b|\bcreatures you control (?:get \+[^.]{0,40}and )?gain (?:flying, vigilance, and )?double strike\b|\bcreatures you control get \+(?:x|[1-9]\d*)\/\+(?:x|[1-9]\d*) and gain trample\b|\bcreatures you control gain trample and get \+(?:x|[1-9]\d*)\/\+(?:x|[1-9]\d*)\b|\bcreatures you control get \+(?:x|[1-9]\d*)\/\+(?:x|[1-9]\d*)\b|\beach opponent loses x life\b|\bgain control of (?:all creatures|them) until end of turn\b|\bdeals? (?:[1-9]\d|50) damage to (?:any target|target player|each opponent)\b/i.test(text);
}

/**
 * Roles a card actually fills, from its printed Oracle text.
 * Restricted mana, taxed or conditional Treasure, and a loot are recorded
 * so the coach can name them — they do not inflate ramp or card advantage.
 */
export function classifyPrintedCard(card = {}) {
  const text = String(card.oracleText || card.oracle_text || "");
  const typeLine = String(card.typeLine || card.type_line || "");
  const name = String(card.name || "");
  const land = /\bland\b/i.test(typeLine) || BASICS.has(name.trim().toLowerCase());
  const modes = modesOf(text);
  const pieces = modes || [text];
  const economies = pieces.map((piece) => {
    const economy = handEconomy(piece);
    const filters = /\bconnives?\b/i.test(piece) || (economy.draw > 0 && economy.discard >= economy.draw);
    return { draw: economy.draw > economy.discard, loot: filters && economy.draw <= economy.discard && (economy.draw > 0 || /\bconnives?\b/i.test(piece)) };
  });
  const libraryPut = Math.max(0, ...pieces.map((piece) => libraryCardsToHand(piece)));
  const impulse = pieces.some((piece) => isImpulseText(piece));
  const draw = economies.some((economy) => economy.draw) || libraryPut >= 2;
  const loot = economies.some((economy) => economy.loot) && !draw;
  const interaction = pieces.some((piece) => modeIsInteraction(piece));
  const wipes = pieces.some((piece) => modeIsWipe(piece));
  const wincon = pieces.some((piece) => modeIsWincon(piece));
  const removalProfiles = pieces.map((piece) => removalProfile(piece)).filter(Boolean);
  const finisherDamage = wincon && /\bdeals? (?:[5-9]\d|\d{3,}) damage to any target\b/i.test(cleanText(text)) && !/\b(?:destroy|exile|return) target\b/i.test(text);
  const removal = removalProfiles.length > 0 && !finisherDamage;
  const removalFlexible = removal && removalProfiles.some((profile) => profile.flexible);
  const removalNote = removalFlexible
    ? null
    : removalProfiles.map((profile) => profile.note).filter(Boolean).join("; ") || null;
  const counterProfiles = pieces.map((piece) => counterProfile(piece)).filter(Boolean);
  const counter = counterProfiles.length > 0;
  const counterFlexible = counterProfiles.some((profile) => profile.flexible);
  const counterNote = counterFlexible ? null : counterProfiles.map((profile) => profile.note).filter(Boolean)[0] || null;
  const protection = protectionProfile(text, typeLine);
  const wipe = wipes ? wipeProfile(text) : null;
  const tutor = tutorProfile(text);
  const drawKind = !draw ? null : isEngineDraw(text) ? "engine" : (handEconomy(text).draw <= 1 && handEconomy(text).discard === 0 && libraryPut < 2) ? "cantrip" : "burst";
  const selection = selectionProfile(text, draw, loot, impulse, tutor);

  const rules = cleanText(text);
  let ramp = false;
  let conditionalRamp = false;
  let conditionalRampReason = null;
  if (!land) {
    const restricted = restrictedAdd(text);
    const treasure = treasureKind(text);
    const fodder = FODDER_MANA.test(rules);
    if (restricted) {
      conditionalRamp = true;
      conditionalRampReason = `adds mana that can be spent on ${restricted.replace(/^only /, "")}`;
    } else if (fodder && !LAND_RAMP.test(rules)) {
      conditionalRamp = true;
      conditionalRampReason = "adds mana only if you sacrifice a creature";
    } else if (treasure) {
      conditionalRamp = true;
      conditionalRampReason = treasure.charAt(0).toLowerCase() + treasure.slice(1);
    } else if (isFilterOnly(rules)) {
      conditionalRamp = false;
    } else if (REPEATABLE_ADD.test(rules) || LAND_RAMP.test(rules) || EXTRA_LAND.test(rules) || (/treasure/i.test(rules) && repeatableTreasure(rules))) {
      ramp = true;
    }
  }

  const producesMana = ramp || conditionalRamp || (!land && REPEATABLE_ADD.test(rules)) || opponentMana(rules);
  const fixesColors = producesMana || land ? reliableColoredMana(rules) && !opponentMana(rules) : null;
  const notes = [];
  if (conditionalRampReason) notes.push(conditionalRampReason);
  if (loot && !draw) notes.push("draws and then discards, so the hand size does not go up");
  if (impulse && !draw) notes.push(impulseNote(text));
  if (tutor && !draw && !ramp) notes.push(tutor.note);
  if (selection) notes.push(selection.note);
  if (removal && !removalFlexible && removalNote) notes.push(removalNote);
  if (counter && !counterFlexible && counterNote) notes.push(counterNote);
  if (opponentMana(rules)) notes.push("the color is whatever mana an opponent's land could produce");
  if (modes && interaction) notes.push("one mode is interaction, and choosing it gives up the other modes");

  return Object.freeze({
    name,
    land,
    ramp,
    conditionalRamp,
    conditionalRampReason,
    draw,
    drawKind,
    loot: loot && !draw,
    impulse: impulse && !draw,
    impulseNote: impulse && !draw ? impulseNote(text) : null,
    selection: Boolean(selection),
    selectionNote: selection?.note || null,
    tutor: Boolean(tutor) && !ramp,
    tutorOpen: Boolean(tutor?.open) && !ramp,
    tutorNote: tutor && !ramp ? tutor.note : null,
    interaction,
    removal,
    removalFlexible: removal && removalFlexible,
    removalNote: removal && !removalFlexible ? removalNote : null,
    counter,
    counterFlexible: counter && counterFlexible,
    counterNote: counter && !counterFlexible ? counterNote : null,
    protection: Boolean(protection),
    protectionNote: protection?.note || null,
    wipes,
    wipeScope: wipe?.scope || null,
    wipeHits: Object.freeze(wipe?.hits || []),
    wipeScalable: Boolean(wipe?.scalable),
    wipeGate: wipe?.gate || null,
    wipeNote: wipe?.note || null,
    wincon,
    fixesColors: producesMana || (land && /add\b/i.test(text)) ? Boolean(fixesColors) : null,
    opponentMana: opponentMana(rules),
    modal: Boolean(modes),
    notes: Object.freeze(notes),
  });
}

function printedCmc(card) {
  const cost = card.manaCost || card.mana_cost || "";
  if (cost) return curveManaValue(cost, Number(card.cmc) || 0);
  const direct = Number(card.cmc);
  return Number.isFinite(direct) ? direct : 0;
}

function bucketOf(cmc) {
  if (cmc <= 1) return 0;
  if (cmc >= 6) return 5;
  return cmc - 1;
}

function strategyHint(strategy) {
  const text = String(strategy || "").toLowerCase();
  if (!text.trim()) return null;
  if (/spellsling|spell sling|storm|instants? and sorceries/.test(text)) return "spellslinger";
  if (/landfall|lands? matter/.test(text)) return "landfall";
  if (/reanimat|graveyard/.test(text)) return "graveyard";
  if (/token/.test(text)) return "tokens";
  if (/tribal|typal|kindred|goblin|elves|elf|dragon|zombie|wizard/.test(text)) return "typal";
  if (/artifact/.test(text)) return "artifacts";
  if (/enchant/.test(text)) return "enchantress";
  if (/voltron|equipment|aura|combat/.test(text)) return "combat";
  if (/aristocrat|sacrifice/.test(text)) return "aristocrats";
  if (/big creatur|stompy|high mana/.test(text)) return "big-creatures";
  if (/blink|flicker/.test(text)) return "blink";
  if (/control/.test(text)) return "control";
  if (/aggro|aggressive|pressure/.test(text)) return "combat";
  return null;
}

function excerpt(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function lower(level, steps = 1) {
  const rank = { low: 0, medium: 1, high: 2 };
  return ["low", "medium", "high"][Math.max(0, rank[level] - steps)];
}

function scaleRange(range, scale) {
  const min = Math.max(0, Math.round(range[0] * scale));
  const max = Math.max(min, Math.round(range[1] * scale));
  return [min, max];
}

function roleRanges(planId, scale) {
  const shift = ROLE_SHIFT[planId] || {};
  return Object.fromEntries(Object.entries(BASE_ROLES).map(([role, range]) => {
    const delta = shift[role] || [0, 0];
    return [role, scaleRange([range[0] + delta[0], range[1] + delta[1]], scale)];
  }));
}

function fitsIdentity(colors, identity) {
  const allowed = new Set((identity || []).map((color) => String(color).toUpperCase()));
  if (!allowed.size) return colors.length === 0;
  return colors.every((color) => allowed.has(String(color).toUpperCase()));
}

const SWAP_CATALOG = Object.freeze([
  { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", colors: [], plans: ["*"], because: "Two mana on turn one is generic ramp: it taps for colorless with no spend restriction, so it casts whatever the commander is waiting on.", oracleText: "{T}: Add {C}{C}." },
  { name: "Arcane Signet", typeLine: "Artifact", manaCost: "{2}", colors: [], plans: ["*"], because: "It adds one mana of the commander's colors every turn, and that mana can pay for any spell in those colors.", oracleText: "{T}: Add one mana of any color in your commander's color identity." },
  { name: "Mind Stone", typeLine: "Artifact", manaCost: "{2}", colors: [], plans: ["*"], because: "It is a two-mana rock that later draws a card, so the slot still ramps and does not dead-end once the commander is online.", oracleText: "{T}: Add {C}.\n{2}, {T}, Sacrifice Mind Stone: Draw a card." },
  { name: "Cultivate", typeLine: "Sorcery", manaCost: "{2}{G}", colors: ["G"], plans: ["landfall", "big-creatures", "graveyard", "typal", "tokens", "midrange"], because: "It puts a land onto the battlefield. That is a permanent mana source, and a landfall plan actually triggers from it.", oracleText: "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle." },
  { name: "Rampant Growth", typeLine: "Sorcery", manaCost: "{1}{G}", colors: ["G"], plans: ["landfall", "typal", "tokens", "midrange", "big-creatures"], because: "Two mana finds a basic and puts it onto the battlefield tapped, which is the cheapest reliable land ramp in green.", oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle." },
  { name: "Farseek", typeLine: "Sorcery", manaCost: "{1}{G}", colors: ["G"], plans: ["landfall", "midrange"], because: "It puts a typed land onto the battlefield, so a multicolor deck fixes a color and ramps in the same card.", oracleText: "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle." },
  { name: "Birds of Paradise", typeLine: "Creature — Bird", manaCost: "{G}", colors: ["G"], plans: ["typal", "tokens", "combat", "midrange", "enchantress"], because: "One mana, any color, every turn. A one-drop dork is how a green commander casts its real spells on time.", oracleText: "Flying\n{T}: Add one mana of any color." },
  { name: "Night's Whisper", typeLine: "Instant", manaCost: "{1}{B}", colors: ["B"], plans: ["spellslinger", "graveyard", "control", "aristocrats"], because: "You draw two cards. The life is the cost, not a discard, so the hand actually gets larger.", oracleText: "You draw two cards and you lose 2 life." },
  { name: "Read the Bones", typeLine: "Sorcery", manaCost: "{2}{B}", colors: ["B"], plans: ["graveyard", "control", "midrange"], because: "Scry then draw two is card advantage that also fills the graveyard a reanimator plan wants.", oracleText: "Scry 2, then draw two cards. You lose 2 life." },
  { name: "Harmonize", typeLine: "Sorcery", manaCost: "{2}{G}{G}", colors: ["G"], plans: ["typal", "tokens", "landfall", "big-creatures", "midrange"], because: "Draw three cards is unconditional card advantage, which a creature plan needs once the board is answered.", oracleText: "Draw three cards." },
  { name: "Beast Whisperer", typeLine: "Creature — Elf Druid", manaCost: "{2}{G}{G}", colors: ["G"], plans: ["typal", "tokens", "creatures", "aristocrats"], because: "Every creature spell replaces itself. That is the draw engine a deck of creatures is missing when its loot effects only filter.", oracleText: "Whenever you cast a creature spell, draw a card." },
  { name: "Rhystic Study", typeLine: "Enchantment", manaCost: "{2}{U}", colors: ["U"], plans: ["spellslinger", "control", "blink"], because: "Opponents cast spells, and you draw unless they pay. A spellslinger commander is already living on that same turn.", oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}." },
  { name: "Skullclamp", typeLine: "Artifact — Equipment", manaCost: "{1}", colors: [], plans: ["tokens", "aristocrats"], because: "A one-power creature dying draws two cards. Token and sacrifice decks already make those creatures.", oracleText: "Equipped creature gets +1/-1.\nWhenever equipped creature dies, draw two cards.\nEquip {1}." },
  { name: "Phyrexian Arena", typeLine: "Enchantment", manaCost: "{1}{B}{B}", colors: ["B"], plans: ["control", "graveyard", "midrange", "aristocrats"], because: "One extra card every upkeep is steady card advantage, not a one-time loot.", oracleText: "At the beginning of your upkeep, you draw a card and you lose 1 life." },
  { name: "Swords to Plowshares", typeLine: "Instant", manaCost: "{W}", colors: ["W"], plans: ["*"], because: "One mana exiles a creature at instant speed. That is an answer you can hold while the commander's plan develops.", oracleText: "Exile target creature. Its controller gains life equal to its power." },
  { name: "Generous Gift", typeLine: "Instant", manaCost: "{2}{W}", colors: ["W"], plans: ["*"], because: "It destroys any permanent, so the interaction is not blank against an artifact or enchantment.", oracleText: "Destroy target permanent. Its controller creates a 3/3 green Elephant creature token." },
  { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", colors: ["U"], plans: ["spellslinger", "control"], because: "It counters any spell. A commander that triggers on instants wants the answer itself to be one of those spells.", oracleText: "Counter target spell." },
  { name: "Pongify", typeLine: "Instant", manaCost: "{U}", colors: ["U"], plans: ["spellslinger", "control"], because: "One blue mana destroys a creature. The token is a real cost, and the card is still a cheap instant the commander can trigger on.", oracleText: "Destroy target creature. It can't be regenerated. Its controller creates a 3/3 green Ape creature token." },
  { name: "Chaos Warp", typeLine: "Instant", manaCost: "{2}{R}", colors: ["R"], plans: ["*"], because: "Red rarely answers an enchantment. This shuffles any permanent away, which is the flexible interaction a red deck otherwise lacks.", oracleText: "The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it's a permanent card, they put it onto the battlefield." },
  { name: "Abrade", typeLine: "Instant", manaCost: "{1}{R}", colors: ["R"], plans: ["spellslinger", "artifacts"], because: "One mode deals 3 damage to a creature and the other destroys an artifact. A modal answer still counts as interaction, because you can choose the mode the table requires.", oracleText: "Choose one —\n• Abrade deals 3 damage to target creature.\n• Destroy target artifact." },
  { name: "Beast Within", typeLine: "Instant", manaCost: "{2}{G}", colors: ["G"], plans: ["*"], because: "Green gets to destroy any permanent. The Beast token is the downside, and the card still answers the permanent that is stopping the plan.", oracleText: "Destroy target permanent. Its controller creates a 3/3 green Beast creature token." },
  { name: "Nature's Claim", typeLine: "Instant", manaCost: "{G}", colors: ["G"], plans: ["landfall", "tokens", "typal"], because: "One green mana destroys an artifact or enchantment. Creature decks often have no other way to answer those.", oracleText: "Destroy target artifact or enchantment. Its controller gains 4 life." },
  { name: "Go for the Throat", typeLine: "Instant", manaCost: "{1}{B}", colors: ["B"], plans: ["control", "aristocrats", "graveyard"], because: "It destroys a nonartifact creature at instant speed, which is the cheap removal a black deck uses while it sets up.", oracleText: "Destroy target nonartifact creature." },
  { name: "Assassin's Trophy", typeLine: "Instant", manaCost: "{B}{G}", colors: ["B", "G"], plans: ["midrange", "graveyard", "landfall"], because: "It destroys any opposing permanent. Giving them a land is the cost of an answer that is never the wrong type.", oracleText: "Destroy target permanent an opponent controls. Its controller may search their library for a basic land card, put it onto the battlefield, then shuffle." },
  { name: "Anguished Unmaking", typeLine: "Instant", manaCost: "{1}{W}{B}", colors: ["W", "B"], plans: ["control", "midrange"], because: "It exiles any nonland permanent. Three life is the cost of an answer that does not care what the permanent is.", oracleText: "Exile target nonland permanent. You lose 3 life." },
  { name: "Wrath of God", typeLine: "Sorcery", manaCost: "{2}{W}{W}", colors: ["W"], plans: ["control", "spellslinger", "big-creatures"], because: "Destroy all creatures is a real wipe: it does not care about size, and a deck that is not trying to go wide can afford to cast it.", oracleText: "Destroy all creatures. They can't be regenerated." },
  { name: "Blasphemous Act", typeLine: "Sorcery", manaCost: "{8}{R}", colors: ["R"], plans: ["*"], because: "Thirteen damage to each creature gets cheaper as the board fills. That is the wipe a red deck can actually cast.", oracleText: "This spell costs {1} less to cast for each creature on the battlefield.\nBlasphemous Act deals 13 damage to each creature." },
  { name: "Toxic Deluge", typeLine: "Sorcery", manaCost: "{2}{B}", colors: ["B"], plans: ["control", "aristocrats", "graveyard"], because: "You choose how much toughness to erase. It kills indestructible creatures that a damage wipe cannot.", oracleText: "As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn." },
  { name: "Cyclonic Rift", typeLine: "Instant", manaCost: "{1}{U}", colors: ["U"], plans: ["spellslinger", "control"], because: "The single-target mode is interaction. Overload returns every opposing nonland permanent, which is the wipe. Either mode is an instant, so a spellslinger commander still triggers.", oracleText: "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")" },
  { name: "Farewell", typeLine: "Sorcery", manaCost: "{W}{W}{W}{W}", colors: ["W"], plans: ["control"], because: "Each mode exiles a whole card type. Choosing creatures, artifacts, or enchantments is a board wipe, not a single-target spell.", oracleText: "Choose one or more —\n• Exile all artifacts.\n• Exile all creatures.\n• Exile all enchantments.\n• Exile all graveyards." },
  { name: "Damnation", typeLine: "Sorcery", manaCost: "{2}{B}{B}", colors: ["B"], plans: ["control", "graveyard"], because: "Destroy all creatures, with no damage number for a large creature to survive.", oracleText: "Destroy all creatures. They can't be regenerated." },
  { name: "Craterhoof Behemoth", typeLine: "Creature — Beast", manaCost: "{5}{G}{G}{G}", colors: ["G"], plans: ["tokens", "typal", "creatures", "landfall"], because: "The enter trigger gives your creatures +X/+X and trample. That is a win condition for a board the commander has been building, not another value creature.", oracleText: "Haste\nWhen Craterhoof Behemoth enters, creatures you control get +X/+X and gain trample until end of turn, where X is the number of creatures you control." },
  { name: "Triumph of the Hordes", typeLine: "Sorcery", manaCost: "{2}{G}{G}", colors: ["G"], plans: ["tokens", "typal", "combat", "creatures"], because: "Your creatures gain trample and infect until end of turn. Ten poison ends the game, which a wide board otherwise struggles to do through blockers.", oracleText: "Until end of turn, creatures you control get +1/+1 and gain trample and infect." },
  { name: "Overrun", typeLine: "Sorcery", manaCost: "{2}{G}{G}{G}", colors: ["G"], plans: ["tokens", "typal", "creatures"], because: "Creatures you control get +3/+3 and trample. It is a single card that turns a developed board into a lethal attack.", oracleText: "Creatures you control get +3/+3 and gain trample until end of turn." },
  { name: "Insurrection", typeLine: "Sorcery", manaCost: "{5}{R}{R}{R}", colors: ["R"], plans: ["combat", "tokens", "big-creatures"], because: "You take every creature until end of turn and they gain haste. That is a way to end the game, not another threat that waits a turn.", oracleText: "Untap all creatures and gain control of them until end of turn. They gain haste until end of turn." },
  { name: "Exsanguinate", typeLine: "Sorcery", manaCost: "{X}{B}{B}", colors: ["B"], plans: ["control", "aristocrats", "big-creatures"], because: "Each opponent loses X life. With the ramp this kind of deck is supposed to have, X is large enough to end the table.", oracleText: "Each opponent loses X life. You gain life equal to the life lost this way." },
  { name: "Akroma's Will", typeLine: "Instant", manaCost: "{3}{W}", colors: ["W"], plans: ["tokens", "combat", "typal", "creatures"], because: "Your creatures gain double strike, or they gain indestructible. With a commander on the battlefield you can take both, which is how a white creature deck actually kills.", oracleText: "Choose one. If you control a commander as you cast this spell, you may choose both instead.\n• Creatures you control gain flying, vigilance, and double strike until end of turn.\n• Creatures you control gain lifelink, indestructible, and protection from all colors until end of turn." },
  { name: "Heroic Intervention", typeLine: "Instant", manaCost: "{1}{W}", colors: ["W"], plans: ["tokens", "typal", "creatures", "combat", "equipment", "auras", "big-creatures", "blink"], because: "Your permanents gain hexproof and indestructible until end of turn. That keeps the board a removal spell was about to take.", oracleText: "Permanents you control gain hexproof and indestructible until end of turn. Untap them." },
  { name: "Lightning Greaves", typeLine: "Artifact — Equipment", manaCost: "{2}", colors: [], plans: ["*"], because: "The equipped creature has shroud, so it cannot be the target of the removal aimed at it. The equipment stays in play.", oracleText: "Equipped creature has haste and shroud.\nEquip {0}." },
  { name: "Swiftfoot Boots", typeLine: "Artifact — Equipment", manaCost: "{2}", colors: [], plans: ["*"], because: "The equipped creature has hexproof and haste. Hexproof stops an opponent from targeting it, and you can still target it yourself.", oracleText: "Equipped creature has hexproof and haste.\nEquip {1}." },
]);

function catalogRole(entry) {
  return classifyPrintedCard(entry);
}

function rankAdds(role, identity, planId, usedNames) {
  return SWAP_CATALOG
    .map((entry) => ({ entry, roles: catalogRole(entry) }))
    .filter(({ entry, roles }) => !usedNames.has(entry.name.toLowerCase()) && fitsIdentity(entry.colors, identity) && roles[role])
    .map(({ entry }) => {
      let score = 0;
      if (entry.plans.includes("*") || entry.plans.includes(planId)) score += 3;
      if (role === "draw" && (entry.plans.includes("*") || entry.plans.includes(planId)) && /\bdraw\b/i.test(entry.oracleText) && !/\{T\}\s*:\s*Add\b/i.test(entry.oracleText)) {
        score += 2;
        if (/\bwhenever\b/i.test(entry.oracleText)) score += 1;
      }
      if (planId === "landfall" && LAND_RAMP.test(entry.oracleText)) score += 3;
      if (planId === "spellslinger" && /\bInstant\b/i.test(entry.typeLine)) score += 2;
      if ((planId === "tokens" || planId === "aristocrats") && entry.name === "Skullclamp") score += 3;
      const cmc = printedCmc(entry);
      if (cmc <= 3) score += 1;
      if (cmc >= 6 && role !== "wincon") score -= 1;
      return { entry, score };
    })
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name))
    .map(({ entry }) => entry);
}

function nameList(cards, limit = 6) {
  const names = [];
  for (const card of cards) {
    if (names.length >= limit) break;
    names.push(card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name);
  }
  const extra = cards.length - names.length;
  return extra > 0 ? `${names.join(", ")}, and ${extra} more` : names.join(", ");
}

const BOARD_PLANS = new Set(["tokens", "typal", "creatures", "combat", "equipment", "auras", "big-creatures", "blink", "aristocrats"]);
const ENGINE_PLANS = new Set(["tokens", "typal", "creatures", "aristocrats", "enchantress", "spellslinger", "control", "artifacts", "blink"]);

function shareBand(range, minFactor, maxFactor) {
  const min = Math.max(0, Math.round((range?.[0] || 0) * minFactor));
  const max = Math.max(min, Math.round((range?.[1] || 0) * maxFactor));
  return [min, max];
}

function rangePhrase(band) {
  if (!band) return "the usual band";
  if (band[0] === band[1]) return `about ${band[0]}`;
  return `about ${band[0]}–${band[1]}`;
}

/**
 * Sub-bands inside the plan's existing interaction, draw, and wipe ranges.
 * Protection follows the same 100-card norm the rest of the coach scales,
 * narrowed for plans that do not live on one board. These are not a
 * power-level table: the printed text does not say how fast the table is.
 */
export function answerAims(planId, ranges = {}) {
  const countersMatter = planId === "spellslinger" || planId === "control";
  return {
    removal: countersMatter ? shareBand(ranges.interaction, 0.3, 0.43) : shareBand(ranges.interaction, 0.625, 0.73),
    counters: countersMatter ? shareBand(ranges.interaction, 0.4, 0.57) : shareBand(ranges.interaction, 0, 0.27),
    protection: BOARD_PLANS.has(planId) ? (ranges.protection || [2, 4]) : (ranges.protectionSoft || [1, 2]),
    engines: shareBand(ranges.draw, ENGINE_PLANS.has(planId) ? 0.27 : 0.15, ENGINE_PLANS.has(planId) ? 0.43 : 0.3),
    oneSidedWipes: BOARD_PLANS.has(planId) || planId === "spellslinger"
      ? [Math.min(1, Math.max(ranges.wipes?.[0] || 0, 1)), Math.max(1, Math.min(2, ranges.wipes?.[1] || 2))]
      : [0, ranges.wipes?.[1] || 2],
  };
}

function commanderBoards(planId, commanderText) {
  if (BOARD_PLANS.has(planId)) return planId === "big-creatures" ? "big-creatures" : "creatures";
  if ((planId === "spellslinger" || planId === "control") && /\bcreate[^.]*\bcreature token\b/i.test(commanderText || "")) return "tokens";
  if (planId === "artifacts" || planId === "historic") return "artifacts";
  if (planId === "enchantress") return "enchantments";
  if (planId === "aristocrats" || planId === "graveyard") return "sacrifice";
  return "other";
}

function wipeVerdict(planId, commanderText, card) {
  if (!card?.wipes) return { fights: false, uses: false, reason: "" };
  if (card.wipeScope === "one-sided") return { fights: false, uses: false, reason: card.wipeNote || "It removes their permanents and leaves yours." };
  if (card.wipeScope === "choice") return { fights: false, uses: false, reason: card.wipeNote || "You choose the modes, so it can miss the permanents this plan needs." };
  const kind = commanderBoards(planId, commanderText);
  const hits = new Set(card.wipeHits || []);
  const hitsCreatures = hits.has("creatures") || hits.has("permanents") || hits.has("nonland permanents");
  const gate = card.wipeGate;
  if (kind === "sacrifice" && hitsCreatures) {
    return { fights: false, uses: true, reason: "It also kills your creatures, and a sacrifice or graveyard plan can use that." };
  }
  if (kind === "big-creatures" && card.wipeScalable) {
    return { fights: false, uses: false, reason: "You choose how much toughness to erase, so a big creature can be left standing." };
  }
  if (kind === "big-creatures" && gate?.dir === "less") {
    return { fights: false, uses: false, reason: `It only hits ${gate.stat}, so a big creature can survive it.` };
  }
  if ((kind === "creatures" || kind === "tokens") && gate?.dir === "greater" && planId !== "big-creatures") {
    return { fights: false, uses: false, reason: `It only hits ${gate.stat}, so a small board mostly survives.` };
  }
  if ((kind === "creatures" || kind === "tokens" || kind === "big-creatures") && hitsCreatures) {
    const why = gate ? `It destroys creatures with ${gate.stat}, including the ones this plan is making.` : "It destroys your creatures too, including the board this commander is building.";
    return { fights: true, uses: false, reason: why };
  }
  if (kind === "artifacts" && (hits.has("artifacts") || hits.has("permanents") || hits.has("nonland permanents"))) {
    return { fights: true, uses: false, reason: "It destroys artifacts, which is what this plan is made of." };
  }
  if (kind === "enchantments" && (hits.has("enchantments") || hits.has("permanents")) && !hitsCreatures) {
    return { fights: true, uses: false, reason: "It destroys enchantments, which is what this plan is made of." };
  }
  return { fights: false, uses: false, reason: card.wipeNote || "It clears a permanent type this plan is not built on." };
}

function countCopies(list) {
  return list.reduce((sum, card) => sum + (card.quantity || 1), 0);
}

function namesOnly(cards, limit = 4) {
  const names = [];
  for (const card of cards) {
    if (names.length >= limit) break;
    names.push(card.name);
  }
  const extra = cards.length - names.length;
  return extra > 0 ? `${names.join(", ")}, and ${extra} more` : names.join(", ");
}

function quoteCard(card, pattern) {
  return printedQuote(card.oracleText || "", pattern, 180);
}

function aimStatus(actual, band) {
  if (!band || band[0] <= 0 && actual === 0) return "ok";
  if (actual < band[0]) return "short";
  if (band[1] > 0 && actual > band[1] + 2) return "over";
  return "ok";
}

function buildAnswerRead({ cards, plan, ranges, confidence, commanderText, identity }) {
  const nonlands = cards.filter((card) => !card.land && !card.isCommander && card.oracleText?.trim());
  const hasBlue = (identity || []).map((color) => String(color).toUpperCase()).includes("U");
  const aims = answerAims(plan?.id, ranges);
    const counterBand = hasBlue ? aims.counters : [0, 0];
  const removal = nonlands.filter((card) => card.removalFlexible);
  const narrow = nonlands.filter((card) => card.removal && !card.removalFlexible);
  const counters = nonlands.filter((card) => card.counter);
  const narrowCounters = counters.filter((card) => !card.counterFlexible);
  const protection = nonlands.filter((card) => card.protection);
  const wipes = nonlands.filter((card) => card.wipes);
  const verdicts = wipes.map((card) => ({ card, ...wipeVerdict(plan?.id, commanderText, card) }));
  const oneSided = wipes.filter((card) => card.wipeScope === "one-sided");
  const fighting = verdicts.filter((entry) => entry.fights);
  const engines = nonlands.filter((card) => card.drawKind === "engine");
  const bursts = nonlands.filter((card) => card.drawKind === "burst");
  const cantrips = nonlands.filter((card) => card.drawKind === "cantrip");
  const impulse = nonlands.filter((card) => card.impulse);
  const tutors = nonlands.filter((card) => card.tutor);
  const selection = nonlands.filter((card) => card.selection);
  const loots = nonlands.filter((card) => card.loot);
  const boardPlan = BOARD_PLANS.has(plan?.id);
  const protectionStatus = boardPlan ? aimStatus(countCopies(protection), aims.protection) : "ok";
  const rows = [
    {
      id: "removal",
      label: "Targeted removal",
      actual: countCopies(removal),
      min: aims.removal[0],
      max: aims.removal[1],
      status: aimStatus(countCopies(removal), aims.removal),
      detail: `${namesOnly(removal) || "None"}. ${rangePhrase(aims.removal)} should remove a creature or permanent without a size or type gate. A counterspell is a different job.`,
      cards: removal.slice(0, 3).map((card) => ({ name: card.name, note: "removes a creature or permanent, with no size or type gate" })),
    },
    {
      id: "conditional",
      label: "Conditional removal",
      actual: countCopies(narrow),
      min: null,
      max: null,
      status: "ok",
      detail: narrow.length
        ? `${namesOnly(narrow)} ${narrow.length === 1 ? "is" : "are"} conditional: ${narrow[0].removalNote || "the printed text only hits some permanents"}. Counted as interaction, and not as the flexible removal above.`
        : "None. A size gate or a single permanent type would be listed here instead of as flexible removal.",
      cards: narrow.slice(0, 3).map((card) => ({ name: card.name, note: card.removalNote || "conditional" })),
    },
    {
      id: "counters",
      label: "Counters",
      actual: countCopies(counters),
      min: counterBand[0],
      max: counterBand[1],
      status: aimStatus(countCopies(counters), counterBand),
      detail: !hasBlue
        ? "This color identity has no blue, so a counterspell is not the missing piece. Removal has to do the job."
        : `${namesOnly(counters) || "None"}. ${plan?.id === "spellslinger" || plan?.id === "control" ? `This plan wants ${rangePhrase(counterBand)} counterspells, because the commander is trying to live on instants and sorceries.` : `A counterspell is optional here, ${rangePhrase(counterBand)}.`} ${narrowCounters.length ? `${narrowCounters[0].name} ${narrowCounters[0].counterNote || "does not counter every spell"}.` : ""}`.trim(),
      cards: counters.slice(0, 3).map((card) => ({ name: card.name, note: card.counterNote || "counters a spell" })),
    },
    {
      id: "protection",
      label: "Protection",
      actual: countCopies(protection),
      min: aims.protection[0],
      max: aims.protection[1],
      status: protectionStatus,
      detail: boardPlan
        ? `${namesOnly(protection) || "None"}. ${rangePhrase(aims.protection)} should keep this plan's own permanents alive. Protection does not remove an opponent's permanent.`
        : `${namesOnly(protection) || "None"}. ${rangePhrase(aims.protection)} is a comfort for this plan, not the hole that changes it. Protection keeps your permanents; it does not answer theirs.`,
      cards: protection.slice(0, 3).map((card) => ({ name: card.name, note: card.protectionNote || "protects your permanents" })),
    },
    {
      id: "wipes",
      label: "Board wipes",
      actual: countCopies(wipes),
      min: ranges.wipes?.[0] ?? null,
      max: ranges.wipes?.[1] ?? null,
      status: fighting.length && !oneSided.length && ["creatures", "tokens", "big-creatures", "artifacts", "enchantments"].includes(commanderBoards(plan?.id, commanderText)) ? "short" : "ok",
      detail: wipes.length
        ? `${wipes.map((card) => `${card.name}: ${wipeVerdict(plan?.id, commanderText, card).reason}`).slice(0, 3).join(" ")} One-sided wipes: ${countCopies(oneSided)} (${rangePhrase(aims.oneSidedWipes)} for a plan that keeps its own board).`
        : `None. One answer deals with one permanent. ${rangePhrase(ranges.wipes || [0, 0])} board wipes is the band already used above, and a creature plan wants ${rangePhrase(aims.oneSidedWipes)} of those to leave its own creatures alone.`,
      cards: wipes.slice(0, 3).map((card) => ({ name: card.name, note: wipeVerdict(plan?.id, commanderText, card).reason })),
    },
    {
      id: "engines",
      label: "Repeatable card draw",
      actual: countCopies(engines),
      min: aims.engines[0],
      max: aims.engines[1],
      status: aimStatus(countCopies(engines), aims.engines),
      detail: `${namesOnly(engines) || "None"}. ${rangePhrase(aims.engines)} should keep drawing because the permanent stays. One-shot draws: ${countCopies(bursts)}. Cantrips that draw a single card: ${countCopies(cantrips)}. A cantrip replaces itself. It does not keep the hand full.`,
      cards: engines.slice(0, 3).map((card) => ({ name: card.name, note: "draws again later" })),
    },
  ];
  const excluded = [
    ...loots.map((card) => ({ name: card.name, quantity: card.quantity || 1, note: "draws and then discards the same number, so the hand does not get larger" })),
    ...impulse.map((card) => ({ name: card.name, quantity: card.quantity || 1, note: card.impulseNote || "exiles cards to play now, which is not a draw" })),
    ...tutors.map((card) => ({ name: card.name, quantity: card.quantity || 1, note: card.tutorNote || "finds a card, and the hand does not get larger" })),
    ...selection.map((card) => ({ name: card.name, quantity: card.quantity || 1, note: card.selectionNote || "selects a card, which is not card advantage" })),
  ];
  const summary = `${plan?.label || "This plan"} needs answers and cards that are not the same job. Targeted removal deals with one permanent. A counterspell stops a spell. Protection keeps yours. A board wipe resets a whole type, and a symmetric one hits this deck too. Card advantage means the hand gets larger and, for this plan, keeps doing it. A loot, an impulse, and a tutor do not.`;
  return {
    summary,
    rows,
    excluded: excluded.slice(0, 6),
    aims,
    counts: {
      removal: countCopies(removal),
      narrow: countCopies(narrow),
      counters: countCopies(counters),
      protection: countCopies(protection),
      oneSided: countCopies(oneSided),
      fighting: fighting.length,
      engines: countCopies(engines),
      bursts: countCopies(bursts),
      cantrips: countCopies(cantrips),
    },
    samples: {
      narrow: narrow[0] || null,
      fighting: fighting[0]?.card || null,
      fightingReason: fighting[0]?.reason || "",
      impulse: impulse[0] || null,
      tutor: tutors[0] || null,
      engine: engines[0] || null,
      burst: bursts[0] || null,
    },
    confidence,
  };
}

function hiddenAnswerWeaknesses({ answer, plan, roles, confidence, identity, usedNames }) {
  const roleStatus = Object.fromEntries((roles || []).map((role) => [role.id, role.status]));
  if (roleStatus.interaction !== "ok" && roleStatus.draw !== "ok" && roleStatus.wipes !== "ok") return [];
  const holes = [];
  const removalRow = answer.rows.find((row) => row.id === "removal");
  const counterRow = answer.rows.find((row) => row.id === "counters");
  const protectionRow = answer.rows.find((row) => row.id === "protection");
  const wipeRow = answer.rows.find((row) => row.id === "wipes");
  const engineRow = answer.rows.find((row) => row.id === "engines");
  const hasBlue = (identity || []).includes("U");
  if (roleStatus.interaction !== "short" && removalRow?.status === "short" && plan.id !== "spellslinger" && plan.id !== "control" && (answer.counts.narrow > 0 || answer.counts.counters > answer.counts.removal)) {
    const sample = answer.samples.narrow;
    const counterShaped = !sample && answer.counts.counters > 0;
    holes.push(hiddenHole({
      id: "answers-conditional",
      title: counterShaped ? "The answers are counterspells, not removal" : "The answers only hit what their text names",
      plain: counterShaped
        ? `${plan.label} has ${answer.counts.counters} counterspells and ${answer.counts.removal} answers that remove a creature or permanent. A counterspell stops a spell on the stack. It does not remove the permanent that is already on the battlefield. ${rangePhrase([removalRow.min, removalRow.max])} is the band for that removal.`
        : `${plan.label} can look like it has enough interaction while the printed text is a gate. ${sample?.name || "A conditional answer"} is conditional: ${sample?.removalNote || "it only hits some permanents"}. That card is still an answer, and it misses the permanent outside that sentence. Flexible removal is ${answer.counts.removal}. ${rangePhrase([removalRow.min, removalRow.max])} is the band for answers that hit a creature or permanent of any size.`,
      cite: sample,
      says: sample?.removalNote ? `${sample.removalNote.charAt(0).toUpperCase()}${sample.removalNote.slice(1)}. That is not an answer to the permanent outside that text.` : "The printed text only hits some permanents.",
      pattern: /destroy|exile|damage|fight|counter/i,
      swapRole: "interaction",
      prefer: (card) => card.removalFlexible,
      cutWhy: counterShaped ? "it does not remove a permanent that is already there" : "the printed text only hits some permanents",
      confidence,
      identity,
      planId: plan.id,
      usedNames,
    }));
  }
  if (roleStatus.interaction !== "short" && (plan.id === "spellslinger" || plan.id === "control") && hasBlue && counterRow?.status === "short") {
    holes.push(hiddenHole({
      id: "answers-counters",
      title: "Not enough counterspells for this spell plan",
      plain: `${plan.label} lives on instants and sorceries. A counterspell is one of those spells, and it stops the spell that would take the commander away. Targeted removal answers a permanent that is already there. This list has ${answer.counts.counters} counterspells. ${rangePhrase([counterRow.min, counterRow.max])} is the band.`,
      cite: null,
      says: "",
      pattern: /counter/i,
      swapRole: "interaction",
      prefer: (card) => card.counterFlexible,
      cutWhy: "it does not counter a spell",
      confidence,
      identity,
      planId: plan.id,
      usedNames,
    }));
  }
  if (roleStatus.interaction === "ok" && roleStatus.draw === "ok" && BOARD_PLANS.has(plan.id) && protectionRow?.status === "short" && answer.counts.protection === 0) {
    holes.push(hiddenHole({
      id: "answers-protection",
      title: "Nothing keeps this plan's permanents alive",
      plain: `Removal takes one permanent off the table. Protection stops that removal from hitting yours. ${plan.label} presents a board, and one removal spell aimed at it undoes the plan. This list has ${answer.counts.protection} protection. ${rangePhrase([protectionRow.min, protectionRow.max])} is the usual band, and the printed text does not say how fast the table is, so the number stays a band rather than a quota.`,
      cite: null,
      says: "",
      pattern: /hexproof|indestructible|shroud|protection/i,
      swapRole: "protection",
      prefer: (card) => card.protection,
      cutWhy: "it does not keep your permanents alive",
      confidence: { ...confidence, level: confidence.level === "high" ? "medium" : confidence.level, reason: `${confidence.reason} The protection band is the usual one for a board plan, not a power-level measurement.` },
      identity,
      planId: plan.id,
      usedNames,
    }));
  }
  if (roleStatus.wipes === "ok" && wipeRow?.status === "short" && answer.samples.fighting) {
    const sample = answer.samples.fighting;
    holes.push(hiddenHole({
      id: "wipes-own-board",
      title: "The wipes also destroy this deck's own board",
      plain: `${sample.name}. ${answer.samples.fightingReason} A one-sided wipe leaves your permanents and takes theirs. This list has ${answer.counts.oneSided}. ${rangePhrase(answer.aims.oneSidedWipes)} is the band for a plan that wins with its own creatures. A symmetric wipe is the one you cast when you are already behind.`,
      cite: sample,
      says: answer.samples.fightingReason,
      pattern: /destroy all|exile all|each creature|all creatures/i,
      swapRole: "wipes",
      prefer: (card) => card.wipes && card.wipeScope === "one-sided",
      cutWhy: "it destroys this deck's own creatures too",
      confidence,
      identity,
      planId: plan.id,
      usedNames,
    }));
  }
  if (roleStatus.draw === "ok" && engineRow?.status === "short" && ENGINE_PLANS.has(plan.id)) {
    const burst = answer.samples.burst;
    holes.push(hiddenHole({
      id: "draw-engines",
      title: "The card draw happens once",
      plain: `${burst ? `${burst.name} draws cards once. The hand gets larger, and then that spell is gone.` : "The draw in this list resolves once."} ${plan.label} keeps doing the thing the commander is printed to do, and the draw that matches that stays on the battlefield and draws again. Repeatable draws: ${answer.counts.engines}. ${rangePhrase([engineRow.min, engineRow.max])} is the band. A loot, an impulse, and a tutor are not that band.`,
      cite: burst,
      says: "This draws its cards once. It does not keep drawing.",
      pattern: /draw/i,
      swapRole: "draw",
      prefer: (card) => card.drawKind === "engine",
      cutWhy: "it draws once and then it is gone",
      confidence,
      identity,
      planId: plan.id,
      usedNames,
    }));
  }
  return holes.filter((hole) => hole.plain).slice(0, 3);
}

function hiddenHole({ id, title, plain, cite, says, pattern, swapRole, prefer, cutWhy, confidence, identity, planId, usedNames }) {
  const swaps = rankKindAdds({ role: swapRole, prefer, identity, planId, usedNames }).slice(0, 1).map((add) => ({
    cut: cite?.name || null,
    add: add.name,
    reason: `${add.because} ${cite ? `Cut ${cite.name}: ${cutWhy}.` : ""}`.trim(),
  }));
  return {
    id,
    score: 1,
    title,
    plain,
    citations: cite?.oracleText ? [{
      name: cite.name,
      quantity: cite.quantity || 1,
      quote: quoteCard(cite, pattern),
      says,
    }] : [],
    swaps,
    confidence: confidence?.level || "medium",
    confidenceReason: confidence?.reason || "Read from the printed text of the cards in the list.",
  };
}

function rankKindAdds({ role, prefer, identity, planId, usedNames }) {
  return SWAP_CATALOG
    .map((entry) => ({ entry, roles: classifyPrintedCard(entry) }))
    .filter(({ entry, roles }) => !usedNames.has(entry.name.toLowerCase()) && fitsIdentity(entry.colors, identity) && (prefer ? prefer(roles) : roles[role]))
    .map(({ entry, roles }) => {
      let score = 0;
      if (entry.plans.includes("*") || entry.plans.includes(planId)) score += 3;
      if (prefer?.(roles)) score += 2;
      if (printedCmc(entry) <= 3) score += 1;
      return { entry, score };
    })
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name))
    .map(({ entry }) => entry);
}

function mixSentence(role, cards, plan, answer) {
  if (!answer) return "";
  if (role === "interaction") {
    const narrow = cards.filter((card) => card.removal && !card.removalFlexible);
    const lead = narrow[0];
    const removal = answer.rows.find((row) => row.id === "removal");
    const counters = answer.rows.find((row) => row.id === "counters");
    const narrowSentence = lead ? `${lead.name} ${lead.removalNote}. That is still an answer, and it is not an answer to everything else.` : "";
    return `${narrowSentence} Flexible removal is ${answer.counts.removal} (${rangePhrase([removal.min, removal.max])}). Counters are ${answer.counts.counters} (${rangePhrase([counters.min, counters.max])}).`.replace(/^\s+/, "");
  }
  if (role === "draw") {
    const engines = answer.rows.find((row) => row.id === "engines");
    const extra = answer.excluded?.[0];
    return `Repeatable draws, the ones that keep going, are ${answer.counts.engines} (${rangePhrase([engines.min, engines.max])}). One-shot draws are ${answer.counts.bursts}. ${extra ? `${extra.name} is not in that count: ${extra.note}.` : ""}`.trim();
  }
  if (role === "wipes") {
    const sample = answer.samples.fighting;
    if (!sample) return answer.counts.oneSided ? `${answer.counts.oneSided} of the wipes leave your permanents alone.` : "";
    return `${sample.name}. ${answer.samples.fightingReason} One-sided wipes: ${answer.counts.oneSided} (${rangePhrase(answer.aims.oneSidedWipes)}).`;
  }
  return "";
}

function planTheory(plan, commanderName, kind, subject) {
  const name = commanderName || "This commander";
  const label = plan.label || "this plan";
  if (subject === "ramp" && kind === "short") {
    return `${name} is a ${label} commander. Generic ramp is a rock, a dork, or a land put onto the battlefield: mana you can spend on the spells the plan actually casts. Restricted mana and Treasure that shows up only after a tax, a combat hit, or an opponent's board are real cards, and they are not that. Without the generic kind, the plan arrives a turn late and the rest of the curve does not matter.`;
  }
  if (subject === "ramp" && kind === "over") {
    return `Ramp past the top of the range means fewer spells that use ${label}. Extra mana does not draw the card ${name} is waiting to cast. Trade the least relevant accelerator for the job the list is short on.`;
  }
  if (subject === "draw" && kind === "short") {
    return `Card advantage means the hand gets larger. A loot — draw, then discard the same number — filters, and filtering does not replace a removed commander or a spent answer. ${name} still needs spells after the first wave, which is what the draw range is for.`;
  }
  if (subject === "draw" && kind === "over") {
    return `Drawing more cards than this plan can cast just fills a hand that the curve cannot empty. Keep the draw that finds ${label}, and spend the extra slots on the job that is short.`;
  }
  if (subject === "interaction" && kind === "short") {
    return `Commander is three opponents. ${label} does not get to goldfish if a single permanent turns the commander off. Interaction is a targeted answer or a counter, including a modal spell whose mode can be that answer. A wipe is a different job and is counted separately.`;
  }
  if (subject === "interaction" && kind === "over") {
    return `A hand full of answers never becomes ${label}. Keep enough interaction to protect the plan, and turn the extras into the piece that actually wins.`;
  }
  if (subject === "wipes" && kind === "short") {
    return `One creature deck can ignore a single removal spell. A wipe is how ${name} resets a board that has already gone wider than the plan. Two to four is the usual band; a combo deck can sit lower, and a deck that dies to a token army cannot.`;
  }
  if (subject === "wipes" && kind === "over") {
    if (plan.id === "tokens" || plan.id === "typal" || plan.id === "creatures" || plan.id === "combat") {
      return `${label} wins with its own creatures. Extra wipes remove the board ${name} just built. One or two is insurance. More than that is the deck fighting itself.`;
    }
    return `Wipes above the range spend turns clearing the board instead of advancing ${label}. Keep the ones that this commander can survive, and replace the rest.`;
  }
  if (subject === "wincon" && kind === "short") {
    return `Value is not a way to end the game. ${name} needs a few cards whose printed text actually closes: a team-wide overrun, poison, an extra turn, or an opponent losing the game. A pile of creatures with no such text is a board, not a win condition.`;
  }
  if (subject === "wincon" && kind === "over") {
    return `Too many closers and not enough setup means the win condition is in hand while the plan is not on the battlefield. Keep the closers that use ${label}, and cut the ones that need a different deck.`;
  }
  if (subject === "curve-top" && kind === "over") {
    if (plan.id === "big-creatures" || plan.id === "graveyard" || plan.id === "landfall") {
      return `A high top end belongs in ${label}. ${name} is trying to cast, cheat, or ramp into expensive spells. This many of them still fails if the early turns cannot produce the mana, because a six-drop on turn six requires the turns before it. The fix is early mana and setup, not pretending the expensive cards are off-plan.`;
    }
    return `${name} reads as ${label}. Spells at six or more do not multiply that plan: they sit in hand while the table plays two and three mana cards. The curve should spend mana on the turn the commander's text actually triggers.`;
  }
  if (subject === "curve-early" && kind === "short") {
    return `${name} still has to be cast, and the spells around it have to exist on turns two and three. A curve with almost nothing at one or two mana makes every later card late, including the cards that are the right plan.`;
  }
  if (subject === "curve-low" && kind === "over") {
    return `The cheap spells are doing their job only if the deck still has a payoff. Too many one- and two-drops, for ${label}, means the late game is whatever is left in the deck rather than a card ${name} turns into a win.`;
  }
  return `${name} is being judged as ${label}, from the printed text, not from a default curve.`;
}

function confidenceFor({ plan, unreadShare, partial, modalShare, strategyConflict }) {
  let level = "high";
  const reasons = [];
  if (!plan?.oracleSeen) {
    level = "low";
    reasons.push("The commander's printed text is missing, so the plan is a guess.");
  } else if ((plan.confidence || 0) < 0.45) {
    level = "low";
    reasons.push("The commander's text does not commit to one plan.");
  } else if (plan.confidence < 0.7) {
    level = lower(level);
    reasons.push("The plan is a reasonable read of the printed text, not a locked one.");
  } else {
    reasons.push("The commander's printed text names this plan clearly.");
  }
  if (unreadShare > 0.25) {
    level = "low";
    reasons.push("Oracle text is missing for many nonland cards, so the counts are incomplete.");
  } else if (unreadShare > 0.08) {
    level = lower(level);
    reasons.push("A few cards have no Oracle text, so they are left out of the counts.");
  }
  if (partial) {
    level = lower(level);
    reasons.push("This is not a full Commander list, so the ranges are scaled and the read is provisional.");
  }
  if (modalShare > 0.45) {
    level = lower(level);
    reasons.push("Several counted cards are modal, so they do that job only when that mode is chosen.");
  }
  if (strategyConflict) {
    level = lower(level);
    reasons.push("The stated strategy and the printed text point at different plans. The curve follows the printed text.");
  }
  return { level, reason: reasons.join(" ") };
}

function buildSwaps({ role, cuts, identity, planId, usedNames }) {
  const adds = rankAdds(role, identity, planId, usedNames).slice(0, 2);
  if (!adds.length) return [];
  return adds.slice(0, Math.min(2, Math.max(1, cuts.length || 1))).map((add, index) => {
    const cut = cuts[index] || cuts[0];
    const cutName = cut?.name || "a card that is not doing this job";
    const why = cut?.why || "it is not pulling its weight for this plan";
    return {
      cut: cut?.name || null,
      add: add.name,
      reason: `${add.because} Cut ${cutName}: ${why}.`,
      addQuote: excerpt(add.oracleText, 180),
    };
  });
}

function causingCards(pool, limit = 6) {
  return pool.slice(0, limit).map((card) => ({
    name: card.name,
    quantity: card.quantity,
    note: card.note || card.conditionalRampReason || "",
  }));
}

/**
 * @param {{ commander?: any, commanders?: any[], cards?: any[], strategy?: string, deckText?: string }} input
 */
export function buildCurveRoleCoaching(input = {}) {
  const commanderSources = [
    ...(Array.isArray(input.commanders) ? input.commanders : []),
    input.commander,
  ].filter((entry) => entry?.name || entry?.oracleText || entry?.oracle_text);
  const seen = new Set();
  const commanders = [];
  for (const entry of commanderSources) {
    const name = String(entry.name || "").trim();
    const key = name.toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    commanders.push({
      name,
      oracleText: String(entry.oracleText || entry.oracle_text || ""),
      typeLine: String(entry.typeLine || entry.type_line || ""),
      manaCost: String(entry.manaCost || entry.mana_cost || ""),
      cmc: entry.cmc,
      colorIdentity: entry.colorIdentity || entry.colors || entry.color_identity || [],
    });
  }
  const primary = commanders[0] || null;
  const identity = [...new Set(commanders.flatMap((commander) => commander.colorIdentity || []))];
  const commanderNames = new Set(commanders.map((commander) => commander.name.toLowerCase()).filter(Boolean));

  const rawCards = Array.isArray(input.cards) ? input.cards : [];
  const cards = rawCards.map((card) => {
    const name = String(card.name || "").trim();
    const quantity = Math.max(1, Number(card.quantity) || 1);
    const classified = classifyPrintedCard(card);
    const isCommander = commanderNames.has(name.toLowerCase()) || card.isCommander === true;
    const cmc = printedCmc(card);
    return {
      ...classified,
      quantity,
      cmc,
      isCommander,
      oracleText: String(card.oracleText || card.oracle_text || ""),
      typeLine: String(card.typeLine || card.type_line || ""),
      manaCost: String(card.manaCost || card.mana_cost || ""),
    };
  });

  const readableCards = cards.filter((card) => !card.isCommander && (card.oracleText.trim() || card.land));
  const nonlands = cards.filter((card) => !card.isCommander && !card.land);
  const unread = nonlands.filter((card) => !card.oracleText.trim());
  const totalQuantity = cards.reduce((sum, card) => sum + (card.isCommander ? 0 : card.quantity), 0);
  const oracleSeen = commanders.some((commander) => commander.oracleText.trim());
  if (!oracleSeen && readableCards.length === 0) {
    return {
      readable: false,
      message: "Paste the decklist with the commander's printed Oracle text. Ramp, draw, interaction, wipes, and win conditions are read from that text. A loot is not card advantage, an impulse is not a draw, a tutor finds one card, and mana that can only cast one kind of spell is not generic ramp — names alone cannot show the difference.",
    };
  }

  const planRead = readCommanderPlan(commanders.map((commander) => ({
    name: commander.name,
    oracleText: commander.oracleText,
    typeLine: commander.typeLine,
    colorIdentity: commander.colorIdentity,
  })));
  const hint = strategyHint(input.strategy);
  let planId = planRead.id === "midrange" && hint ? hint : planRead.id;
  if (!CURVE_BY_PLAN[planId]) planId = "midrange";
  const strategyConflict = Boolean(hint && planRead.id !== "midrange" && hint !== planRead.id && planRead.confidence >= 0.7);
  const plan = {
    id: planId,
    label: planRead.id === "midrange" && hint ? String(input.strategy).trim() : planRead.label,
    confidence: planRead.confidence || 0,
    excerpt: excerpt(primary?.oracleText || ""),
    restrictionNote: planRead.restrictionNote || null,
    creatureType: planRead.creatureType || planRead.model?.typal || null,
    oracleSeen,
  };
  if (planRead.id === "midrange" && hint) {
    plan.confidence = Math.max(plan.confidence, 0.5);
  }

  const partial = totalQuantity > 0 && totalQuantity < 90;
  const scale = partial ? Math.max(0.35, totalQuantity / 100) : 1;
  const ranges = roleRanges(plan.id, scale);
  const spellQuantity = nonlands.reduce((sum, card) => sum + card.quantity, 0);
  const curve = [0, 0, 0, 0, 0, 0];
  let cmcTotal = 0;
  for (const card of nonlands) {
    if (!card.oracleText.trim() && !card.typeLine.trim() && !card.cmc) continue;
    const bucket = bucketOf(card.cmc);
    curve[bucket] += card.quantity;
    cmcTotal += card.cmc * card.quantity;
  }
  const countedSpells = curve.reduce((sum, value) => sum + value, 0);
  const average = countedSpells ? Number((cmcTotal / countedSpells).toFixed(1)) : null;
  const shares = CURVE_BY_PLAN[plan.id] || CURVE_BY_PLAN.midrange;
  const curveTargets = shares.map((share) => Math.max(0, Math.round(share * Math.max(countedSpells, 1))));
  const ideal = IDEAL_AVERAGE[plan.id] || IDEAL_AVERAGE.midrange;

  const buckets = CURVE_LABELS.map((label, index) => {
    const actual = curve[index];
    const target = curveTargets[index];
    let status = "ok";
    if (countedSpells >= 12) {
      if (actual + 2 < target && actual < Math.ceil(target * 0.7)) status = "short";
      else if (actual > target + 2 && actual > Math.floor(target * 1.35)) status = "over";
    }
    return { label, index, actual, target, status };
  });

  const commanderCmc = primary ? printedCmc(primary) : 0;
  const early = curve[0] + curve[1];
  if (countedSpells >= 12 && commanderCmc >= 4 && early < countedSpells * 0.16 && buckets[1].status === "ok" && buckets[0].status === "ok") {
    buckets[1] = { ...buckets[1], status: "short" };
  }

  function cardsWith(predicate) {
    return nonlands.filter((card) => card.oracleText.trim() && predicate(card));
  }

  const roleCards = {
    ramp: cardsWith((card) => card.ramp),
    draw: cardsWith((card) => card.draw),
    interaction: cardsWith((card) => card.interaction),
    wipes: cardsWith((card) => card.wipes),
    wincon: cardsWith((card) => card.wincon),
  };
  const countOf = (list) => list.reduce((sum, card) => sum + card.quantity, 0);
  const roles = Object.keys(BASE_ROLES).map((id) => {
    const [min, max] = ranges[id];
    const actual = countOf(roleCards[id]);
    const status = actual < min ? "short" : actual > max ? "over" : "ok";
    return { id, label: ROLE_LABELS[id], actual, min, max, status, cards: roleCards[id] };
  });

  const excludedRamp = cardsWith((card) => card.conditionalRamp && !card.ramp);
  const lootCards = cardsWith((card) => card.loot);
  const opponentSources = cards.filter((card) => card.opponentMana);
  const modalInteraction = roleCards.interaction.filter((card) => card.modal);
  const unreadShare = nonlands.length ? unread.length / nonlands.length : (oracleSeen ? 0 : 1);
  const modalShare = countOf(roleCards.interaction)
    ? countOf(modalInteraction) / countOf(roleCards.interaction)
    : 0;
  const confidence = confidenceFor({ plan, unreadShare, partial, modalShare, strategyConflict });
  const answerRead = buildAnswerRead({
    cards,
    plan,
    ranges: {
      ...ranges,
      protection: scaleRange(BOARD_PLANS.has(plan.id) ? [2, 4] : [1, 2], scale),
      protectionSoft: scaleRange([1, 2], scale),
    },
    confidence,
    commanderText: primary?.oracleText || "",
    identity,
  });

  const usedNames = new Set(cards.map((card) => card.name.toLowerCase()));
  const lessons = [];

  function pushRoleLesson(role) {
    const row = roles.find((entry) => entry.id === role);
    if (!row || row.status === "ok") return;
    const kind = row.status === "short" ? "short" : "over";
    const pool = kind === "short" ? row.cards : [...row.cards].sort((left, right) => right.cmc - left.cmc);
    const notDraw = cardsWith((card) => card.loot || card.impulse || (card.tutor && !card.draw) || card.selection);
    const excluded = role === "ramp" && kind === "short" ? excludedRamp : role === "draw" && kind === "short" ? notDraw : [];
    const occupying = highCurveCuts(nonlands, roleCards.wincon);
    const causing = kind === "short"
      ? [...pool, ...excluded, ...(pool.length || excluded.length ? [] : occupying)]
      : pool;
    const cuts = (kind === "over" ? pool : excluded.length ? excluded : highCurveCuts(nonlands, roleCards.wincon))
      .slice(0, 2)
      .map((card) => ({
        name: card.name,
        why: card.conditionalRampReason
          ? `${card.conditionalRampReason}, so it is not generic ramp`
          : card.loot
            ? "it draws and then discards, which does not add a card"
            : card.impulse
              ? "it exiles cards to play now, which does not draw them"
              : card.tutor
                ? "it finds one card, so the hand does not get larger"
                : card.selection
                  ? "it selects a card, which is not card advantage"
                  : `it costs ${card.cmc} and is not the missing ${ROLE_LABELS[role].toLowerCase()}`,
      }));
    const needed = kind === "short" ? role : shortestRole(roles);
    const swaps = buildSwaps({
      role: needed,
      cuts,
      identity,
      planId: plan.id,
      usedNames,
    });
    const lessonConfidence = confidenceFor({
      plan,
      unreadShare,
      partial,
      modalShare: role === "interaction" ? modalShare : 0,
      strategyConflict,
    });
    lessons.push({
      id: `${role}-${kind}`,
      kind: kind === "short" ? "shortfall" : "surplus",
      subject: role,
      title: kind === "short"
        ? `${row.label} is short for ${plan.label}`
        : `${row.label} is past what ${plan.label} wants`,
      theory: [planTheory(plan, primary?.name, kind, role), mixSentence(role, nonlands, plan, answerRead)].filter(Boolean).join(" "),
      cards: causingCards(causing),
      excluded: excluded.map((card) => ({
        name: card.name,
        quantity: card.quantity,
        note: card.conditionalRampReason
          || (card.loot ? "draw then discard, which is a loot, not card advantage" : "")
          || card.impulseNote
          || card.tutorNote
          || card.selectionNote
          || card.notes[0]
          || "not counted",
      })),
      swaps,
      swapNote: swaps.length ? "" : "No color-legal swap from the cards I can vouch for. The gap is still the gap.",
      confidence: lessonConfidence.level,
      confidenceReason: lessonConfidence.reason,
      actual: row.actual,
      min: row.min,
      max: row.max,
    });
  }

  for (const role of ["ramp", "draw", "interaction", "wipes", "wincon"]) pushRoleLesson(role);

  const top = buckets[5];
  const earlyBucket = buckets[0].status === "short" || buckets[1].status === "short";
  if (top.status === "over") {
    const pile = nonlands.filter((card) => card.cmc >= 6 && !card.wincon).sort((left, right) => right.cmc - left.cmc);
    const cuts = pile.slice(0, 2).map((card) => ({
      name: card.name,
      why: plan.id === "big-creatures" || plan.id === "graveyard" || plan.id === "landfall"
        ? `it is one of too many ${card.cmc}-mana spells, and the early turns still have to cast this plan`
        : `a ${card.cmc}-mana spell does not feed ${plan.label} the way a cheaper spell does`,
    }));
    const needed = shortestRole(roles) || "draw";
    lessons.push({
      id: "curve-top",
      kind: "surplus",
      subject: "curve",
      title: plan.id === "big-creatures" || plan.id === "graveyard" || plan.id === "landfall"
        ? "The top end is the plan, and it is still too tall"
        : `Too many 6+ mana spells for ${plan.label}`,
      theory: planTheory(plan, primary?.name, "over", "curve-top"),
      cards: causingCards(pile.length ? pile : nonlands.filter((card) => card.cmc >= 6)),
      excluded: [],
      swaps: buildSwaps({ role: needed, cuts, identity, planId: plan.id, usedNames }),
      swapNote: "",
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  }
  if (earlyBucket) {
    const earlyCards = nonlands.filter((card) => card.cmc <= 2);
    const expensive = nonlands.filter((card) => card.cmc >= 5 && !card.wincon).sort((left, right) => right.cmc - left.cmc);
    const cuts = expensive.slice(0, 2).map((card) => ({
      name: card.name,
      why: `${primary?.name || "The commander"} costs ${commanderCmc || "more than a two-drop"}, and this ${card.cmc}-mana card does not help cast it`,
    }));
    lessons.push({
      id: "curve-early",
      kind: "shortfall",
      subject: "curve",
      title: "The early curve cannot cast the plan",
      theory: `${planTheory(plan, primary?.name, "short", "curve-early")} ${primary?.name || "The commander"} costs ${commanderCmc || "several"} mana.`,
      cards: causingCards(earlyCards),
      excluded: [],
      swaps: buildSwaps({ role: roles.find((row) => row.id === "ramp")?.status === "short" ? "ramp" : "interaction", cuts, identity, planId: plan.id, usedNames }),
      swapNote: "",
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  }

  if (!lessons.length && countedSpells >= 8) {
    const sample = [...roleCards.ramp, ...roleCards.draw, ...roleCards.interaction, ...nonlands.filter((card) => card.cmc <= 3)].slice(0, 6);
    lessons.push({
      id: "balanced",
      kind: "balanced",
      subject: "curve",
      title: `The curve fits ${plan.label}`,
      theory: `${primary?.name || "This commander"} wants ${plan.label}. The spells average ${average ?? "about the right"} mana, against about ${ideal} for this plan. Ramp, draw, interaction, wipes, and win conditions all sit inside the range that plan can use. The cards below are the ones carrying that, read from their printed text.`,
      cards: causingCards(sample),
      excluded: excludedRamp.concat(lootCards).slice(0, 4).map((card) => ({
        name: card.name,
        quantity: card.quantity,
        note: card.conditionalRampReason || "loot, not card advantage",
      })),
      swaps: [],
      swapNote: "",
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  }

  const fixingNote = opponentSources.length
    ? `${nameList(opponentSources)} ${opponentSources.length === 1 ? "adds" : "add"} mana of a color an opponent's land could produce. That mana can be ramp. It is not fixing.`
    : null;
  const strategyNote = strategyConflict
    ? `The stated strategy is ${String(input.strategy).trim()}. The printed text reads as ${planRead.label}, so the curve is judged against the printed text.`
    : hint && planRead.id === "midrange"
      ? `The printed text does not name a sharper plan. The curve is judged against the strategy you gave: ${String(input.strategy).trim()}.`
      : "";

  const curveSummary = average == null
    ? "There is not enough printed mana cost to judge the curve."
    : `Most spells cost about ${average} mana. ${plan.label} wants them nearer ${ideal}. ${buckets.filter((bucket) => bucket.status !== "ok").map((bucket) => `${bucket.label} is ${bucket.status === "short" ? "light" : "heavy"} (${bucket.actual}, about ${bucket.target} for this plan)`).join(". ") || "Every mana-value band is inside the band this plan wants."}`;

  const weaknessReport = rankPlanWeaknesses({
    plan,
    commander: primary,
    identity,
    cards: cards.filter((card) => !card.isCommander),
    roles,
    lessons,
    deckSize: totalQuantity,
    confidence,
  });
  const hidden = hiddenAnswerWeaknesses({
    answer: answerRead,
    plan,
    roles,
    confidence,
    identity,
    usedNames,
  });
  const soundOnly = weaknessReport.weaknesses.length === 1 && weaknessReport.weaknesses[0].id === "sound";
  const weaknesses = soundOnly && hidden.length ? hidden : weaknessReport.weaknesses;
  const weaknessHeading = soundOnly && hidden.length ? "What to fix first" : weaknessReport.heading;
  const weaknessIntro = soundOnly && hidden.length
    ? "The usual counts can look fine while the printed text is the wrong kind of answer, the wrong kind of wipe, or a draw that only happens once."
    : weaknessReport.intro;

  return {
    readable: true,
    commanderName: primary?.name || "",
    plan,
    strategyNote,
    fixingNote,
    partial,
    confidence,
    weaknessHeading,
    weaknessIntro,
    weaknesses,
    answerRead,
    curve: {
      average,
      ideal,
      summary: curveSummary,
      buckets,
      commanderCmc,
    },
    roles: roles.map((role) => ({
      id: role.id,
      label: role.label,
      actual: role.actual,
      min: role.min,
      max: role.max,
      status: role.status,
      cards: causingCards(role.cards, 8),
    })),
    lessons: lessons.slice(0, 6),
    excludedRamp: excludedRamp.map((card) => ({ name: card.name, note: card.conditionalRampReason })),
    lootCards: lootCards.map((card) => card.name),
    unread: unread.map((card) => card.name),
  };
}

function shortestRole(roles) {
  const short = roles.filter((role) => role.status === "short").sort((left, right) => (left.min - left.actual) - (right.min - right.actual));
  return short[0]?.id || "draw";
}

function highCurveCuts(nonlands, wincons) {
  const winconNames = new Set(wincons.map((card) => card.name));
  return nonlands
    .filter((card) => card.cmc >= 5 && !winconNames.has(card.name))
    .sort((left, right) => right.cmc - left.cmc || left.name.localeCompare(right.name));
}

export function formatCurveRoleCoaching(report) {
  if (!report?.readable) return report?.message || "Paste the decklist with printed Oracle text before I judge the curve.";
  const lines = [];
  lines.push(`Curve and roles — ${report.commanderName || "this Commander list"}`);
  lines.push("");
  const quoted = report.plan.excerpt
    ? (/[.!?…]$/.test(report.plan.excerpt) ? report.plan.excerpt : `${report.plan.excerpt}.`)
    : "";
  lines.push(quoted
    ? `Plan: ${report.plan.label}. Printed text: “${quoted}”`
    : `Plan: ${report.plan.label}.`);
  lines.push(`Confidence: ${report.confidence.level}. ${report.confidence.reason}`);
  if (report.strategyNote) lines.push(report.strategyNote);
  if (report.plan.restrictionNote) lines.push(report.plan.restrictionNote);
  if (report.fixingNote) lines.push(report.fixingNote);
  if (report.weaknesses?.length) {
    lines.push("");
    lines.push(report.weaknessHeading || "What to fix first");
    if (report.weaknessIntro) lines.push(report.weaknessIntro);
    report.weaknesses.forEach((weakness, index) => {
      lines.push("");
      lines.push(`${index + 1}. ${weakness.title}`);
      lines.push(weakness.plain);
      for (const cite of weakness.citations || []) {
        const label = cite.quantity > 1 ? `${cite.quantity} ${cite.name}` : cite.name;
        lines.push(`From the deck: ${label} — “${cite.quote}” ${cite.says}`);
      }
      for (const swap of weakness.swaps || []) {
        const move = swap.cut && swap.add
          ? `Swap: cut ${swap.cut} for ${swap.add}.`
          : swap.add
            ? `Swap: add ${swap.add}.`
            : `Swap: cut ${swap.cut}.`;
        lines.push(move);
        if (swap.reason) lines.push(`Why: ${swap.reason}`);
      }
      if (weakness.confidence) lines.push(`Confidence: ${weakness.confidence}. ${weakness.confidenceReason || ""}`.trim());
    });
  }
  lines.push("");
  lines.push(`Mana curve: ${report.curve.summary}`);
  lines.push(report.curve.buckets.map((bucket) => `${bucket.label} mana: ${bucket.actual}`).join(" · "));
  lines.push("");
  if (report.answerRead) {
    lines.push("");
    lines.push("Interaction and card advantage:");
    lines.push(report.answerRead.summary);
    for (const row of report.answerRead.rows) {
      const band = row.min == null ? "" : ` (${rangePhrase([row.min, row.max])}, ${row.status}).`;
      lines.push(`${row.label}: ${row.actual}${band} ${row.detail}`);
    }
    if (report.answerRead.excluded?.length) {
      lines.push(`Not card advantage: ${report.answerRead.excluded.map((card) => `${card.quantity > 1 ? `${card.quantity} ` : ""}${card.name} (${card.note})`).join("; ")}.`);
    }
    lines.push(`Confidence: ${report.answerRead.confidence.level}. ${report.answerRead.confidence.reason}`);
  }
  lines.push("");
  lines.push("Roles, from printed Oracle text:");
  for (const role of report.roles) {
    const names = role.cards.length ? ` ${role.cards.map((card) => card.name).join(", ")}.` : "";
    lines.push(`${role.label}: ${role.actual} (range ${role.min}–${role.max}, ${role.status}).${names}`);
  }
  for (const lesson of report.lessons) {
    lines.push("");
    lines.push(lesson.title);
    lines.push(`Theory: ${lesson.theory}`);
    if (lesson.cards.length) lines.push(`Cards: ${lesson.cards.map((card) => card.name).join(", ")}.`);
    if (lesson.excluded?.length) {
      lines.push(`Not counted: ${lesson.excluded.map((card) => `${card.name} (${card.note})`).join("; ")}.`);
    }
    lines.push(`Confidence: ${lesson.confidence}. ${lesson.confidenceReason}`);
    if (lesson.swaps?.length) {
      for (const swap of lesson.swaps) {
        lines.push(swap.cut
          ? `Swap: cut ${swap.cut} for ${swap.add}. ${swap.reason}`
          : `Swap: add ${swap.add}. ${swap.reason}`);
      }
    } else if (lesson.swapNote) lines.push(lesson.swapNote);
  }
  return lines.join("\n");
}

export function coachCardsFromContext(context = {}, rows = []) {
  const provided = Array.isArray(context.cards) ? context.cards
    : Array.isArray(context.deckCards) ? context.deckCards
      : [];
  const byName = new Map();
  for (const card of provided) {
    const name = String(card?.name || "").trim();
    if (!name) continue;
    byName.set(name.toLowerCase(), card);
  }
  const source = provided.length && !rows.length
    ? provided.map((card) => ({ quantity: card.quantity || 1, name: card.name }))
    : rows;
  return source.map((row) => {
    const extra = byName.get(String(row.name || "").toLowerCase()) || {};
    return {
      name: row.name,
      quantity: row.quantity || extra.quantity || 1,
      oracleText: extra.oracleText || extra.oracle_text || "",
      typeLine: extra.typeLine || extra.type_line || "",
      manaCost: extra.manaCost || extra.mana_cost || "",
      cmc: extra.cmc,
      colorIdentity: extra.colorIdentity || extra.color_identity || extra.colors || [],
      cardFaces: extra.cardFaces || extra.card_faces || [],
      isCommander: extra.isCommander === true,
    };
  });
}
