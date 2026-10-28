// =============================================================================
// Plan weaknesses
// =============================================================================
// When a Commander list is analyzed, name the few holes that most change
// how that plan plays. Quote the printed text of the cards involved.
// Restricted mana is not generic fixing. Mana an opponent produces is not
// fixing either. A win condition has to match the plan, not merely end a
// different deck.
// =============================================================================

import { opponentDependentAddClause } from "./opponent-mana.mjs";

const COLOR_ORDER = Object.freeze(["W", "U", "B", "R", "G"]);
const COLOR_WORD = Object.freeze({ W: "white", U: "blue", B: "black", R: "red", G: "green" });
const BASIC_TYPE = Object.freeze({ Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" });
const BASIC_NAME = Object.freeze({ W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" });

const ROLE_PRIORITY = Object.freeze({
  spellslinger: ["interaction", "draw", "ramp", "wincon", "wipes"],
  control: ["interaction", "draw", "wipes", "wincon", "ramp"],
  tokens: ["wincon", "draw", "ramp", "interaction", "wipes"],
  typal: ["wincon", "draw", "ramp", "interaction", "wipes"],
  creatures: ["wincon", "draw", "ramp", "interaction", "wipes"],
  combat: ["wincon", "interaction", "draw", "ramp", "wipes"],
  equipment: ["wincon", "interaction", "draw", "ramp", "wipes"],
  auras: ["wincon", "interaction", "draw", "ramp", "wipes"],
  "big-creatures": ["ramp", "wincon", "draw", "interaction", "wipes"],
  landfall: ["ramp", "wincon", "draw", "interaction", "wipes"],
  blink: ["draw", "ramp", "interaction", "wincon", "wipes"],
  aristocrats: ["draw", "wincon", "interaction", "ramp", "wipes"],
  graveyard: ["draw", "wincon", "ramp", "interaction", "wipes"],
  artifacts: ["ramp", "draw", "interaction", "wincon", "wipes"],
  enchantress: ["draw", "ramp", "interaction", "wincon", "wipes"],
  default: ["interaction", "draw", "ramp", "wincon", "wipes"],
});

// A printed closer is off-plan when none of its shapes are in this list.
// "generic" is a real "you win" or a large drain with no narrower home,
// which most plans can still use.
const PLAN_SHAPES = Object.freeze({
  spellslinger: ["spells", "extra-turn", "generic"],
  control: ["generic", "extra-turn", "spells"],
  tokens: ["combat", "aristocrats", "generic"],
  typal: ["combat", "aristocrats", "generic"],
  creatures: ["combat", "generic"],
  combat: ["combat", "generic"],
  equipment: ["combat", "generic"],
  auras: ["combat", "generic"],
  aristocrats: ["aristocrats", "combat", "generic"],
  blink: ["combat", "generic", "extra-turn"],
  landfall: ["combat", "lands", "generic"],
  "big-creatures": ["combat", "generic"],
  graveyard: ["generic", "combat", "aristocrats"],
  artifacts: ["generic", "spells", "extra-turn"],
  enchantress: ["generic", "spells"],
  historic: ["generic", "combat", "spells"],
  midrange: ["generic", "combat", "spells", "aristocrats", "extra-turn", "library"],
});

const WINCON_SWAPS = Object.freeze([
  {
    name: "Aetherflux Reservoir",
    colors: [],
    plans: ["spellslinger", "artifacts", "control"],
    oracleText: "Whenever you cast a spell, you gain 1 life for each spell you've cast this turn.\nPay 50 life: This artifact deals 50 damage to any target.",
    because: "It gains life whenever you cast a spell, then spends that life to deal 50 damage. That is the same action a spell plan is already taking.",
  },
  {
    name: "Craterhoof Behemoth",
    colors: ["G"],
    plans: ["tokens", "typal", "creatures", "combat", "landfall", "big-creatures"],
    oracleText: "Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.",
    because: "When it enters, your creatures gain trample and get +X/+X. A board the plan has been building can actually end the game.",
  },
  {
    name: "Triumph of the Hordes",
    colors: ["G"],
    plans: ["tokens", "typal", "creatures", "combat"],
    oracleText: "Until end of turn, creatures you control get +1/+1 and gain trample and infect.",
    because: "Your creatures gain trample and infect until end of turn. Ten poison ends the game even when blockers are in the way.",
  },
  {
    name: "Akroma's Will",
    colors: ["W"],
    plans: ["tokens", "combat", "typal", "creatures"],
    oracleText: "Choose one. If you control a commander as you cast this spell, you may choose both instead.\n• Creatures you control gain flying, vigilance, and double strike until end of turn.\n• Creatures you control gain lifelink, indestructible, and protection from all colors until end of turn.",
    because: "Your creatures gain double strike, and with your commander out they can gain indestructible too. That is how a white creature deck actually kills.",
  },
  {
    name: "Overrun",
    colors: ["G"],
    plans: ["tokens", "typal", "creatures", "big-creatures"],
    oracleText: "Creatures you control get +3/+3 and gain trample until end of turn.",
    because: "Your creatures get +3/+3 and trample for the turn. One card turns a developed board into a lethal attack.",
  },
]);

const COMMAND_TOWER = Object.freeze({
  name: "Command Tower",
  oracleText: "{T}: Add one mana of any color in your commander's color identity.",
});

function clean(text) {
  return String(text || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function sentencesOf(text) {
  return clean(text).split(/(?<=\.)\s+/).map((part) => part.trim()).filter(Boolean);
}

const KEYWORD_LINE = /^(?:flying|haste|trample|vigilance|lifelink|deathtouch|defender|flash|reach|hexproof|indestructible|menace|first strike|double strike|prowess)(?:\s*,\s*(?:flying|haste|trample|vigilance|lifelink|deathtouch|defender|flash|reach|hexproof|indestructible|menace|first strike|double strike|prowess))*\.?$/i;

export function printedQuote(text, pattern, max = 220) {
  const parts = String(text || "")
    .replace(/\([^)]*\)/g, " ")
    .split(/\n|(?<=\.)\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const patterns = (Array.isArray(pattern) ? pattern : [pattern]).filter(Boolean);
  const usable = (part) => !KEYWORD_LINE.test(part);
  let index = patterns.length ? -1 : parts.findIndex(usable);
  for (const candidate of patterns) {
    index = parts.findIndex((part) => usable(part) && candidate.test(part));
    if (index >= 0) break;
  }
  if (index < 0) index = parts.findIndex(usable);
  let sentence = parts[index] || parts[0] || clean(text);
  const next = parts[index + 1] || "";
  if (sentence && /^spend this mana only\b/i.test(next)) sentence = `${sentence} ${next}`;
  if (!sentence) return "";
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function coloredRequirements(cost) {
  const req = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const symbol of String(cost || "").match(/\{[^}]+\}/g) || []) {
    const parts = symbol.slice(1, -1).split("/");
    if (parts.some((part) => part === "P" || part === "C" || /^\d+$/.test(part))) continue;
    const colors = parts.filter((part) => COLOR_ORDER.includes(part));
    if (!colors.length || colors.length !== parts.length) continue;
    for (const color of colors) req[color] += 1 / colors.length;
  }
  return req;
}

function restrictionScope(window) {
  const match = String(window || "").match(/spend this mana only to cast ([^.]*)/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (/instant (?:or|and) sorcery/i.test(raw)) return { kind: "instant-sorcery", label: "instants and sorceries" };
  if (/chosen type/i.test(raw)) return { kind: "chosen", label: "a creature type chosen as it enters" };
  const generic = new Set(["instant", "sorcery", "creature", "artifact", "enchantment", "planeswalker", "legendary", "spell", "spells", "permanent", "a", "an", "the", "of"]);
  const subtype = [...raw.matchAll(/\b([A-Z][A-Za-z'-]+)\b/g)].map((item) => item[1]).find((word) => !generic.has(word.toLowerCase()));
  if (subtype) {
    const creatureToo = /\bcreature\b/i.test(raw);
    return {
      kind: "subtype",
      word: subtype,
      creatureToo,
      label: creatureToo ? `${subtype} creature spells` : `${subtype} spells`,
    };
  }
  if (/\blegendary\b/i.test(raw)) return { kind: "legendary", label: "legendary spells" };
  if (/\bcreature\b/i.test(raw)) return { kind: "creature", label: "creature spells" };
  if (/\bartifact\b/i.test(raw)) return { kind: "artifact", label: "artifact spells" };
  if (/\benchantment\b/i.test(raw)) return { kind: "enchantment", label: "enchantment spells" };
  return { kind: "other", label: raw };
}

function spellFits(card, scope) {
  if (!scope) return true;
  const line = String(card?.typeLine || card?.type_line || "");
  if (scope.kind === "chosen" || scope.kind === "other") return false;
  if (scope.kind === "instant-sorcery") return /\b(?:instant|sorcery)\b/i.test(line);
  if (scope.kind === "creature") return /\bcreature\b/i.test(line);
  if (scope.kind === "artifact") return /\bartifact\b/i.test(line);
  if (scope.kind === "enchantment") return /\benchantment\b/i.test(line);
  if (scope.kind === "legendary") return /\blegendary\b/i.test(line);
  if (scope.kind === "subtype") {
    if (scope.creatureToo && !/\bcreature\b/i.test(line)) return false;
    return new RegExp(`\\b${scope.word}\\b`, "i").test(line);
  }
  return false;
}

function abilityWindows(text) {
  const lines = String(text || "").replace(/\([^)]*\)/g, " ").split(/\n+/);
  const windows = [];
  for (const line of lines) {
    const parts = line.split(/(?<=\.)\s+/).map((part) => part.trim()).filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      if (!/\badd\b/i.test(parts[index])) continue;
      let window = parts[index];
      const next = parts[index + 1] || "";
      if (/^spend this mana only\b/i.test(next)) window = `${window} ${next}`;
      windows.push(window.replace(/\s+/g, " ").trim());
    }
  }
  return windows;
}

function fetchInfo(text) {
  const match = String(text || "").match(/search your library for ([^.]*)/i);
  if (!match) return null;
  const clause = match[1];
  const colors = [];
  for (const [type, color] of Object.entries(BASIC_TYPE)) {
    if (new RegExp(`\\b${type}\\b`, "i").test(clause)) colors.push(color);
  }
  const basic = /\bbasic land\b/i.test(clause);
  if (!basic && !colors.length) return null;
  return { basic, colors };
}

function typeLineColors(typeLine) {
  const colors = [];
  for (const [type, color] of Object.entries(BASIC_TYPE)) {
    if (new RegExp(`\\b${type}\\b`).test(String(typeLine || ""))) colors.push(color);
  }
  return colors;
}

function isLandCard(card) {
  if (card?.land) return true;
  return /\bland\b/i.test(String(card?.typeLine || card?.type_line || ""));
}

function readWindows(card, identity) {
  const text = String(card?.oracleText || card?.oracle_text || "");
  const allowed = (identity || []).filter((color) => COLOR_ORDER.includes(color));
  return abilityWindows(text).map((window) => {
    if (opponentDependentAddClause(window)) return { opponent: true, window, colors: [], restriction: null };
    if (/land you control could produce|lands? you control (?:could )?produce/i.test(window)) {
      return { copiesLands: true, window, colors: [], restriction: restrictionScope(window) };
    }
    const colors = new Set();
    for (const symbol of window.matchAll(/\{([WUBRG])\}/g)) colors.add(symbol[1]);
    if (/commander'?s color identity/i.test(window)) {
      for (const color of allowed) colors.add(color);
    } else if (/\bany (?:one )?color\b/i.test(window)) {
      for (const color of (allowed.length ? allowed : COLOR_ORDER)) colors.add(color);
    }
    return { window, colors: [...colors], restriction: restrictionScope(window), opponent: false, copiesLands: false };
  });
}

function deckHasBasic(cards, color, except) {
  return cards.some((card) => card !== except && isLandCard(card) && typeLineColors(card.typeLine || card.type_line).includes(color));
}

function ownColors(card, spell, cards, identity) {
  const colors = new Set(typeLineColors(card?.typeLine || card?.type_line));
  for (const window of readWindows(card, identity)) {
    if (window.opponent || window.copiesLands) continue;
    if (!spellFits(spell, window.restriction)) continue;
    for (const color of window.colors) colors.add(color);
  }
  const fetched = fetchInfo(card?.oracleText || card?.oracle_text || "");
  if (fetched) {
    const found = fetched.basic
      ? (identity || []).filter((color) => deckHasBasic(cards, color, card))
      : fetched.colors.filter((color) => deckHasBasic(cards, color, card));
    for (const color of found) colors.add(color);
  }
  return colors;
}

function copiedColors(card, spell, cards, identity) {
  const windows = readWindows(card, identity);
  if (!windows.some((window) => window.copiesLands)) return new Set();
  const colors = new Set();
  for (const other of cards) {
    if (other === card || !isLandCard(other)) continue;
    if (readWindows(other, identity).some((window) => window.copiesLands)) continue;
    for (const color of ownColors(other, spell, cards, identity)) colors.add(color);
  }
  return colors;
}

/**
 * True when this card can pay one mana of `color` toward `spell`.
 * Spend restrictions and opponent-produced mana are not generic sources.
 */
export function manaPaysSpell(card, spell, color, cards = [], identity = []) {
  if (!COLOR_ORDER.includes(color)) return false;
  if (ownColors(card, spell, cards, identity).has(color)) return true;
  return copiedColors(card, spell, cards, identity).has(color);
}

function sourceCount(spell, color, cards, identity) {
  let count = 0;
  const payers = [];
  for (const card of cards) {
    if (card === spell) continue;
    if (!manaPaysSpell(card, spell, color, cards, identity)) continue;
    count += Math.max(1, Number(card.quantity) || 1);
    payers.push(card);
  }
  return { count, payers };
}

function missReason(card, spell, color, cards, identity) {
  const windows = readWindows(card, identity);
  const text = String(card.oracleText || card.oracle_text || "");
  if (windows.some((window) => window.opponent)) {
    const window = windows.find((entry) => entry.opponent);
    return {
      kind: "opponent",
      quote: printedQuote(window?.window || text, /add/i),
      says: `This takes its color from a land an opponent controls. That is not ${COLOR_WORD[color]} you can plan on, and it is not fixing.`,
    };
  }
  const restricted = windows.find((window) => window.restriction && window.colors.includes(color) && !spellFits(spell, window.restriction));
  if (restricted) {
    const label = restricted.restriction.label;
    return {
      kind: "restricted",
      quote: printedQuote(restricted.window, /spend this mana only|add/i),
      says: `The printed text only lets you spend this mana on ${label}. ${spell.name || "This spell"} is not one of those, so this does not cast it.`,
    };
  }
  if (windows.some((window) => window.copiesLands)) {
    const made = [...copiedColors(card, spell, cards, identity)];
    const madeWords = made.map((entry) => COLOR_WORD[entry]).filter(Boolean);
    const madeText = madeWords.join(" and ");
    return {
      kind: "pool",
      quote: printedQuote(text, /land you control/i),
      says: madeWords.length
        ? `This copies a color your other lands can already make. Right now that is ${madeText}, so it does not make ${COLOR_WORD[color]}.`
        : "This only makes a color your other lands already make. None of those lands make this color, so this is not fixing.",
    };
  }
  const fetched = fetchInfo(text);
  if (fetched && (fetched.basic || fetched.colors.length)) {
    const named = fetched.basic ? "a basic land" : fetched.colors.map((entry) => BASIC_NAME[entry]).join(" or ");
    return {
      kind: "fetch",
      quote: printedQuote(text, /search your library/i),
      says: `This searches for ${named}. The deck has no ${BASIC_NAME[color]} for it to find, so it is not a ${COLOR_WORD[color]} source.`,
    };
  }
  const produced = [...ownColors(card, { typeLine: "Instant" }, cards, identity)];
  if (produced.length && !produced.includes(color) && (isLandCard(card) || windows.length)) {
    return {
      kind: "wrong-color",
      quote: printedQuote(text, /add/i) || `${card.manaCost || ""} ${card.typeLine || ""}`.trim(),
      says: `This adds ${produced.map((entry) => COLOR_WORD[entry]).join(" and ")}. ${spell.name || "The spell"} asks for ${COLOR_WORD[color]}.`,
    };
  }
  return null;
}

function sourcesNeeded(pips) {
  if (pips >= 3) return 16;
  if (pips >= 2) return 12;
  return 8;
}

function scaleNeed(need, deckSize) {
  const scale = Math.max(0.45, Math.min(1, (Number(deckSize) || 100) / 100));
  return Math.max(2, Math.round(need * scale));
}

function colorWordList(colors) {
  const words = colors.map((color) => COLOR_WORD[color]).filter(Boolean);
  if (words.length <= 1) return words[0] || "those colors";
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
}

function pipPhrase(pips, color) {
  const count = Math.round(pips);
  const word = COLOR_WORD[color];
  if (count <= 1) return `one ${word} mana`;
  return `${count} ${word} mana`;
}

function manaWeakness({ commander, cards, identity, deckSize, confidence }) {
  const spells = [];
  if (commander?.manaCost || commander?.mana_cost) {
    spells.push({
      name: commander.name || "The commander",
      manaCost: commander.manaCost || commander.mana_cost || "",
      typeLine: commander.typeLine || commander.type_line || "",
      oracleText: commander.oracleText || commander.oracle_text || "",
      cmc: Number(commander.cmc) || 0,
      isCommander: true,
      quantity: 1,
    });
  }
  for (const card of cards) {
    if (card.land || isLandCard(card)) continue;
    if (!(card.manaCost || card.oracleText || card.typeLine)) continue;
    spells.push(card);
  }
  const failures = [];
  for (const color of identity) {
    let worst = null;
    for (const spell of spells) {
      const pips = coloredRequirements(spell.manaCost || spell.mana_cost)[color];
      if (pips < 0.75) continue;
      const rounded = Math.max(1, Math.round(pips));
      const needed = scaleNeed(sourcesNeeded(rounded), deckSize);
      const { count } = sourceCount(spell, color, cards, identity);
      const gap = needed - count;
      if (gap < 2) continue;
      const candidate = { color, spell, pips, rounded, needed, count, gap };
      if (!worst || gap > worst.gap || (gap === worst.gap && spell.isCommander && !worst.spell.isCommander)) worst = candidate;
    }
    if (worst) failures.push(worst);
  }
  if (!failures.length) return null;
  failures.sort((left, right) => right.gap - left.gap || left.color.localeCompare(right.color));
  const lead = failures[0];
  const also = failures.slice(1).filter((failure) => failure.gap >= 4 || failure.count <= failure.needed / 2);
  const citedColors = [lead.color, ...also.map((failure) => failure.color)];
  const refused = [];
  const seen = new Set();
  for (const failure of [lead, ...also]) {
    for (const card of cards) {
      if (seen.has(card)) continue;
      if (manaPaysSpell(card, failure.spell, failure.color, cards, identity)) continue;
      const reason = missReason(card, failure.spell, failure.color, cards, identity);
      if (!reason) continue;
      seen.add(card);
      refused.push({ card, reason });
    }
  }
  const rank = { opponent: 0, restricted: 1, pool: 2, fetch: 3, "wrong-color": 4 };
  refused.sort((left, right) => (rank[left.reason.kind] ?? 9) - (rank[right.reason.kind] ?? 9) || (right.card.quantity || 1) - (left.card.quantity || 1) || String(left.card.name).localeCompare(String(right.card.name)));
  const shown = refused.slice(0, 3);
  const spellQuote = printedQuote(lead.spell.oracleText, /./) || `${lead.spell.manaCost} · ${lead.spell.typeLine}`.trim();
  const citations = [{
    name: lead.spell.name,
    quantity: lead.spell.quantity || 1,
    quote: spellQuote || lead.spell.manaCost || lead.spell.typeLine || "No printed text was available.",
    says: `${lead.spell.name} costs ${pipPhrase(lead.rounded, lead.color)}${lead.spell.manaCost ? ` (${lead.spell.manaCost})` : ""}. A deck this size wants about ${lead.needed} ${COLOR_WORD[lead.color]} sources. This list has ${lead.count}.`,
  }, ...shown.map(({ card, reason }) => ({
    name: card.name,
    quantity: card.quantity || 1,
    quote: reason.quote || printedQuote(card.oracleText, /add|search your library/i),
    says: reason.says,
  }))];

  const multicolor = citedColors.length >= 2 && identity.length >= 2;
  const cut = shown[0]?.card || null;
  const add = multicolor ? COMMAND_TOWER : { name: BASIC_NAME[lead.color], oracleText: `{T}: Add {${lead.color}}.` };
  const cutQuote = cut ? (shown[0].reason.quote || printedQuote(cut.oracleText, /add/i)) : "";
  const reason = multicolor
    ? `${add.name} says “${add.oracleText}” That one land casts both ${colorWordList(citedColors)} spells. ${cut ? `${cut.name} does not: “${cutQuote}”` : `The list does not have a source you can count on for ${colorWordList(citedColors)}.`}`
    : `${add.name} says “${add.oracleText}” That is ${COLOR_WORD[lead.color]} with no spend restriction, so it casts ${lead.spell.name}. ${cut ? `${cut.name} does not: “${cutQuote}”` : `The list only has ${lead.count} ${COLOR_WORD[lead.color]} source${lead.count === 1 ? "" : "s"}.`}`;

  const plainColors = colorWordList(citedColors);
  const plain = also.length
    ? `${commander?.name || "This commander"} needs ${plainColors}, and the mana that actually makes those colors comes up short. A source counts only when its printed text can pay the spell. Mana locked to one kind of spell, and mana that waits on an opponent's lands, does not.`
    : `${lead.spell.name} needs ${pipPhrase(lead.rounded, lead.color)}. About ${lead.needed} ${COLOR_WORD[lead.color]} sources would cast that reliably in a deck this size, and ${lead.count === 0 ? "none of the mana here does" : `only ${lead.count} ${lead.count === 1 ? "does" : "do"}`}. Mana that can only cast certain spells is not generic ${COLOR_WORD[lead.color]}, and mana an opponent produces is not fixing.`;

  return {
    id: "mana-base",
    score: lead.count === 0 || lead.gap >= 4 ? 9 : 6,
    title: "The mana cannot cast this deck's colors",
    plain,
    citations,
    swaps: [{
      cut: cut?.name || null,
      add: add.name,
      reason,
    }],
    confidence: confidence?.level || "medium",
    confidenceReason: confidence?.reason || "Read from the printed mana costs and the mana abilities in the list.",
  };
}

export function winconShapes(text) {
  const cleanText = clean(text);
  const shapes = new Set();
  if (/creatures you control gain trample and get \+|creatures you control get \+[^.]{0,80}gain trample|gain trample and infect|additional combat|double strike/i.test(cleanText)) shapes.add("combat");
  if (/whenever you cast (?:an instant or sorcery|a spell)|instant or sorcery spells? you(?:'ve| have) cast|\bstorm\b/i.test(cleanText)) shapes.add("spells");
  if (/you win the game/i.test(cleanText) && /library|devotion/i.test(cleanText)) shapes.add("library");
  if ((/\bmill\b|into (?:their |his or her )?graveyard/i.test(cleanText)) && /you win the game/i.test(cleanText)) shapes.add("mill");
  if (/extra turn/i.test(cleanText)) shapes.add("extra-turn");
  if (/each opponent loses/i.test(cleanText) && /whenever [^.]* dies|creature (?:dies|you control dies)/i.test(cleanText)) shapes.add("aristocrats");
  if (/whenever a land (?:you control )?enters|landfall/i.test(cleanText)) shapes.add("lands");
  if (!shapes.size && /you win the game|each opponent loses x life|deals? (?:[1-9]\d|50) damage to any target/i.test(cleanText)) shapes.add("generic");
  return [...shapes];
}

function cardShapes(card) {
  const shapes = winconShapes(card.oracleText || "");
  if (!shapes.length && card.wincon) shapes.push("generic");
  return shapes;
}

function acceptsPlan(planId, shapes) {
  const allowed = new Set(PLAN_SHAPES[planId] || PLAN_SHAPES.midrange);
  return shapes.some((shape) => allowed.has(shape));
}

function fitsIdentity(colors, identity) {
  const allowed = new Set((identity || []).map((color) => String(color).toUpperCase()));
  if (!allowed.size) return colors.length === 0;
  return colors.every((color) => allowed.has(color));
}

function mismatchWeakness({ plan, commander, cards, identity, confidence }) {
  if ((plan?.confidence || 0) < 0.7 || !plan?.id || plan.id === "midrange") return null;
  const closers = cards.filter((card) => cardShapes(card).length);
  const mismatches = closers.filter((card) => !acceptsPlan(plan.id, cardShapes(card)));
  const matching = closers.filter((card) => acceptsPlan(plan.id, cardShapes(card)));
  if (!mismatches.length || matching.length) return null;
  const used = new Set(cards.map((card) => String(card.name || "").toLowerCase()));
  const add = WINCON_SWAPS
    .filter((entry) => !used.has(entry.name.toLowerCase()) && fitsIdentity(entry.colors, identity))
    .map((entry) => ({ entry, score: entry.plans.includes(plan.id) ? 3 : 0 }))
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name))[0]?.entry || null;
  const shown = mismatches.slice(0, 2);
  const citations = shown.map((card) => ({
    name: card.name,
    quantity: card.quantity || 1,
    quote: printedQuote(card.oracleText, [/50 damage|you win the game|extra turn|each opponent loses/i, /creatures you control/i, /whenever you cast/i]),
    says: shapeSays(cardShapes(card), plan, commander?.name),
  }));
  const sample = shown[0];
  const sampleQuote = citations[0]?.quote || "";
  const addQuote = add ? printedQuote(add.oracleText, [/50 damage|you win the game/i, /creatures you control/i, /whenever you cast/i]) : "";
  const reason = add
    ? `${add.name} says “${addQuote}” ${add.because} ${sample.name} says “${sampleQuote}” That is a different plan.`
    : `${sample.name} says “${sampleQuote}” That text does not do what ${plan.label} is trying to do, and I don't have a color-legal closer I can vouch for in its place.`;
  return {
    id: "wincon-mismatch",
    score: 8,
    title: "The win condition belongs in a different deck",
    plain: `${commander?.name || "This commander"} is ${plan.label}. ${sample.name} can end a game, and its printed text does that through a different plan. A closer has to use what this deck is actually building.`,
    citations,
    swaps: [{
      cut: sample.name,
      add: add?.name || null,
      reason,
    }].filter((swap) => swap.add || swap.cut),
    confidence: confidence?.level || "medium",
    confidenceReason: confidence?.reason || "The commander's text and the closer's text were both printed in the list.",
  };
}

function shapeSays(shapes, plan, commanderName) {
  const name = commanderName || "The commander";
  if (shapes.includes("combat")) return `This pumps or overruns creatures. ${name} is ${plan.label}, and this text never uses that plan.`;
  if (shapes.includes("library") || shapes.includes("mill")) return "This wins by looking at your library, or by emptying it. That is a different ending than the one this plan is built for.";
  if (shapes.includes("spells")) return `This pays you off for casting spells. ${plan.label} is not that plan.`;
  if (shapes.includes("extra-turn")) return "An extra turn can end a game, and it does not advance what this commander is doing.";
  return `This can end a game, and it does not do it through ${plan.label}.`;
}

function rolePlain(plan, commanderName, role, row) {
  const name = commanderName || "This commander";
  const range = `${row.min}–${row.max}`;
  if (role.id === "interaction") {
    return `${name} is ${plan.label}, and three other players will try to stop that. An answer removes a permanent or counters a spell. This list has ${row.actual}, and this plan wants about ${range}.`;
  }
  if (role.id === "draw") {
    return `Drawing extra cards means the hand gets larger. A loot gives a card back. ${name} still needs gas after the first wave. This list has ${row.actual} real draw spells, and ${plan.label} wants about ${range}.`;
  }
  if (role.id === "ramp") {
    return `Ramp here means mana you can spend on the spells ${plan.label} actually casts: a rock, a dork, or a land put onto the battlefield. Mana locked to one spell type is a real card, and it is not that. This list has ${row.actual}, and the plan wants about ${range}.`;
  }
  if (role.id === "wipes") {
    return `One answer deals with one permanent. A wipe resets a board that has already gone wider than ${plan.label}. This list has ${row.actual}, and the usual band is ${range}.`;
  }
  return `${name} can build a board all game and still not win. A win condition's printed text has to end the game. This list has ${row.actual}, and ${plan.label} wants about ${range}.`;
}

function roleTitle(role) {
  if (role.id === "interaction") return "Too few answers for this plan";
  if (role.id === "draw") return "Too few ways to draw extra cards";
  if (role.id === "ramp") return "Not enough mana the plan can actually spend";
  if (role.id === "wipes") return "Not enough ways to reset the board";
  return "No card here actually ends the game";
}

function citeCard(card, says, pattern) {
  const quote = card.oracleText
    ? printedQuote(card.oracleText, pattern)
    : `${card.manaCost || ""} ${card.typeLine || "No printed rules text."}`.trim();
  return {
    name: card.name,
    quantity: card.quantity || 1,
    quote: quote || "No printed rules text.",
    says,
  };
}

function roleCitations(role, cards, commander) {
  if (role.id === "draw") {
    const missed = [
      ...cards.filter((card) => card.loot).map((card) => citeCard(
        card,
        "It draws cards and then discards that many. The hand ends the same size, so this is not card advantage.",
        /draw|discard|connive/i,
      )),
      ...cards.filter((card) => card.impulse && !card.draw).map((card) => citeCard(
        card,
        "It exiles cards and lets you play them before they disappear. They are not drawn, so this is not card advantage.",
        /exile|play/i,
      )),
      ...cards.filter((card) => card.tutor && !card.draw).map((card) => citeCard(
        card,
        "It finds a card from the library. The hand ends the same size, so this is not card advantage.",
        /search your library|name a card/i,
      )),
      ...cards.filter((card) => card.selection && !card.draw).map((card) => citeCard(
        card,
        "It looks and keeps one card. The hand does not get an extra card, so this is not card advantage.",
        /look at|reveal the top|put/i,
      )),
    ];
    if (missed.length) return missed.slice(0, 2);
  }
  if (role.id === "interaction") {
    const narrow = cards.filter((card) => card.removal && !card.removalFlexible);
    if (narrow.length) {
      return narrow.slice(0, 2).map((card) => citeCard(
        card,
        `${card.removalNote ? `${card.removalNote.charAt(0).toUpperCase()}${card.removalNote.slice(1)}. ` : ""}That is a real answer, and it misses anything outside that sentence.`.trim(),
        /destroy|exile|damage|fight|counter|shuffle/i,
      ));
    }
  }
  if (role.id === "wipes") {
    const fighting = cards.filter((card) => card.wipes && card.wipeScope === "symmetric");
    if (fighting.length) {
      return fighting.slice(0, 2).map((card) => citeCard(
        card,
        card.wipeNote || "This hits every permanent of that kind, including yours.",
        /destroy all|exile all|each creature|all creatures|you don't control/i,
      ));
    }
  }
  if (role.id === "ramp") {
    const conditional = cards.filter((card) => card.conditionalRamp && !card.ramp);
    if (conditional.length) {
      return conditional.slice(0, 2).map((card) => citeCard(
        card,
        card.conditionalRampReason
          ? `${card.conditionalRampReason.charAt(0).toUpperCase()}${card.conditionalRampReason.slice(1)}. That is not generic ramp.`
          : "The printed mana is restricted, so it is not generic ramp.",
        /spend this mana only|add|treasure/i,
      ));
    }
  }
  const sample = [...cards]
    .filter((card) => !card.land && !card[role.id === "interaction" ? "interaction" : role.id] && String(card.oracleText || "").trim())
    .sort((left, right) => (right.cmc || 0) - (left.cmc || 0) || String(left.name).localeCompare(String(right.name)))[0];
  const fallback = sample || (commander?.oracleText ? {
    name: commander.name,
    quantity: 1,
    oracleText: commander.oracleText,
    typeLine: commander.typeLine,
    manaCost: commander.manaCost,
    cmc: commander.cmc,
  } : null);
  if (!fallback) return [];
  const says = role.id === "interaction"
    ? "This text does not remove a permanent or counter a spell. It is not one of the answers the plan is missing."
    : role.id === "draw"
      ? "This text does not draw you an extra card. The list still needs a spell that leaves the hand larger."
      : role.id === "wincon"
        ? "This can be a strong card and still not end the game. The list needs a printed closer."
        : "This card is in the list, and it is not doing the job that is short.";
  return [citeCard(fallback, says, /./)];
}

function roleWeaknesses({ plan, commander, cards, roles, lessons, confidence }) {
  const order = ROLE_PRIORITY[plan?.id] || ROLE_PRIORITY.default;
  const weaknesses = [];
  for (const role of roles) {
    if (role.status !== "short") continue;
    const deficit = role.min - role.actual;
    if (deficit < 2 && role.actual > 0 && role.actual >= role.min * 0.75) continue;
    const index = Math.max(0, order.indexOf(role.id));
    const weight = order.length - index;
    const lesson = (lessons || []).find((entry) => entry.subject === role.id && entry.kind === "shortfall");
    const swap = lesson?.swaps?.[0] || null;
    weaknesses.push({
      id: `role-${role.id}`,
      score: (deficit / Math.max(role.min, 1)) * weight,
      title: roleTitle(role),
      plain: rolePlain(plan, commander?.name, role, role),
      citations: roleCitations(role, cards, commander),
      swaps: swap ? [{ cut: swap.cut || null, add: swap.add, reason: swap.reason }] : [],
      confidence: lesson?.confidence || confidence?.level || "medium",
      confidenceReason: lesson?.confidenceReason || confidence?.reason || "",
    });
  }
  return weaknesses;
}

function soundNote({ plan, commander, cards, confidence }) {
  const helpful = cards.filter((card) => (card.ramp || card.draw || card.interaction || acceptsPlan(plan?.id, cardShapes(card))) && card.oracleText);
  const citations = helpful.slice(0, 2).map((card) => citeCard(
    card,
    "This is doing a job the plan can use, and the printed text is why it counts.",
    /draw|add|counter|destroy|exile|creatures you control|you win/i,
  ));
  return {
    id: "sound",
    score: 0,
    title: `${plan?.label || "This plan"} has what it needs to function`,
    plain: `${commander?.name || "This commander"} is ${plan?.label || "this plan"}. The mana can cast the colors, and the usual holes — answers, card draw, and a matching way to win — are not the thing that will sink the deck. The cards below are doing a job their text actually describes.`,
    citations,
    swaps: [],
    confidence: confidence?.level || "medium",
    confidenceReason: confidence?.reason || "",
  };
}

/**
 * The few weaknesses that most change how this deck's own plan plays.
 * @param {{ plan?: any, commander?: any, identity?: string[], cards?: any[], roles?: any[], lessons?: any[], deckSize?: number, confidence?: { level?: string, reason?: string } }} input
 */
export function rankPlanWeaknesses(input = {}) {
  const plan = input.plan || { id: "midrange", label: "this plan", confidence: 0 };
  const cards = Array.isArray(input.cards) ? input.cards : [];
  const identity = [...new Set((input.identity || []).map((color) => String(color).toUpperCase()).filter((color) => COLOR_ORDER.includes(color)))];
  const confidence = input.confidence || { level: "medium", reason: "" };
  const mana = identity.length ? manaWeakness({
    commander: input.commander,
    cards,
    identity,
    deckSize: input.deckSize,
    confidence,
  }) : null;
  const mismatch = mismatchWeakness({
    plan,
    commander: input.commander,
    cards,
    identity,
    confidence,
  });
  let roles = roleWeaknesses({
    plan,
    commander: input.commander,
    cards,
    roles: input.roles || [],
    lessons: input.lessons || [],
    confidence,
  });
  if (mismatch) roles = roles.filter((weakness) => weakness.id !== "role-wincon");
  const ranked = [mana, mismatch, ...roles].filter(Boolean).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const top = ranked.filter((weakness) => weakness.score > 0).slice(0, 3);
  const weaknesses = top.length ? top : [soundNote({ plan, commander: input.commander, cards, confidence })];
  const sound = weaknesses.length === 1 && weaknesses[0].id === "sound";
  return {
    heading: sound ? "How this plan is doing" : "What to fix first",
    intro: sound
      ? "Nothing here is a hole that changes the plan."
      : "These are the holes that most change how this plan plays. Each one quotes a card from the deck.",
    weaknesses,
  };
}
