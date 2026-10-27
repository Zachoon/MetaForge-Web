// =============================================================================
// Mana base coaching
// =============================================================================
// Lands, rocks, and dorks are read from printed Oracle text. A source counts
// only when that text can pay the spell on the turn the spell asks for it.
// Mana locked to one spell type, mana that adds one color, a fetch that
// cannot find the land, and a land that enters tapped are not generic mana.
// A short color flag uses the pips the deck actually commits to. One early
// two-pip spell does not fail a color the rest of the list can cast. A
// land-ramp spell lowers the land target and is still not an extra land.
// =============================================================================

import { hypergeometricAtLeast } from "./blueprint-note-and-mana.mjs";
import { curveManaValue } from "./conditional-effect-credit.mjs";
import { opponentDependentAddClause } from "./opponent-mana.mjs";
import { printedQuote } from "./plan-weakness-coach.mjs";

const COLOR_ORDER = Object.freeze(["W", "U", "B", "R", "G"]);
const COLOR_WORD = Object.freeze({ W: "white", U: "blue", B: "black", R: "red", G: "green" });
const BASIC_TYPE = Object.freeze({ Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" });
const BASIC_NAME = Object.freeze({ W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" });

// Practical Commander targets for casting a spell on curve, matching the
// color-source calculator: one free mulligan is assumed, so these are lower
// than a raw 99-card hypergeometric at 90%. Index is pips - 1.
const SOURCE_TARGETS = Object.freeze({
  1: Object.freeze([16, 26, 34]),
  2: Object.freeze([14, 22, 29]),
  3: Object.freeze([13, 20, 27]),
  4: Object.freeze([12, 19, 25]),
  5: Object.freeze([11, 18, 24]),
  6: Object.freeze([10, 17, 23]),
});

const SHOCKS = Object.freeze([
  ["Hallowed Fountain", ["W", "U"], "{W} or {U}"],
  ["Watery Grave", ["U", "B"], "{U} or {B}"],
  ["Blood Crypt", ["B", "R"], "{B} or {R}"],
  ["Stomping Ground", ["R", "G"], "{R} or {G}"],
  ["Temple Garden", ["G", "W"], "{G} or {W}"],
  ["Godless Shrine", ["W", "B"], "{W} or {B}"],
  ["Steam Vents", ["U", "R"], "{U} or {R}"],
  ["Overgrown Tomb", ["B", "G"], "{B} or {G}"],
  ["Sacred Foundry", ["R", "W"], "{R} or {W}"],
  ["Breeding Pool", ["G", "U"], "{G} or {U}"],
].map(([name, colors, symbols]) => Object.freeze({
  name,
  colors,
  oracleText: `As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add ${symbols}.`,
})));

const COMMAND_TOWER = Object.freeze({
  name: "Command Tower",
  oracleText: "{T}: Add one mana of any color in your commander's color identity.",
});

const ARCANE_SIGNET = Object.freeze({
  name: "Arcane Signet",
  oracleText: "{T}: Add one mana of any color in your commander's color identity.",
});

export function questionWantsManaBaseCoaching(question = "") {
  const text = String(question || "");
  if (/\bmana curves?\b/i.test(text) && !/\bmana bases?\b/i.test(text)) return false;
  return /\bmana[\s-]?bases?\b|\bland counts?\b|\bhow many lands\b|\benough lands\b|\btoo many lands\b|\btoo few lands\b|\bcolor(?:ed)? sources?\b|\b(?:color )?fixing\b|\btap ?lands?\b|\benters tapped\b|\bpips?\b|\bcan(?:not|'t| not) (?:i |we )?cast\b|\bcast (?:my |the |this )?(?:spells|colors|commander)\b/i.test(text);
}

function clean(text) {
  return String(text || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function typeLineOf(card) {
  return String(card?.typeLine || card?.type_line || "");
}

function textOf(card) {
  return String(card?.oracleText || card?.oracle_text || "");
}

function costOf(card) {
  return String(card?.manaCost || card?.mana_cost || "");
}

function faceRecord(face, fallbackName) {
  return {
    name: String(face?.name || fallbackName || ""),
    typeLine: String(face?.typeLine || face?.type_line || ""),
    oracleText: String(face?.oracleText || face?.oracle_text || ""),
    manaCost: String(face?.manaCost || face?.mana_cost || ""),
  };
}

// A modal card with a land face can be played as that land. Read the land
// face only, so the spell face is not a second card, a fetch, or a pip the
// mana base must satisfy. Pathways keep every land face.
function presentManaCard(card) {
  const raw = Array.isArray(card?.cardFaces) ? card.cardFaces : Array.isArray(card?.card_faces) ? card.card_faces : [];
  const faces = raw.map((face) => faceRecord(face, card?.name)).filter((face) => face.typeLine || face.oracleText || face.manaCost);
  const landFaces = faces.filter((face) => /\bland\b/i.test(face.typeLine));
  const otherFaces = faces.filter((face) => face.typeLine && !/\bland\b/i.test(face.typeLine));
  if (!landFaces.length) return { card, text: textOf(card), modalLand: false, pathway: false };
  const modalLand = otherFaces.length > 0;
  const pathway = landFaces.length >= 2 && otherFaces.length === 0;
  const text = landFaces.map((face) => face.oracleText).filter(Boolean).join("\n");
  const typeLine = landFaces.map((face) => face.typeLine).filter(Boolean).join(" // ");
  return {
    card: {
      ...card,
      oracleText: text,
      typeLine: typeLine || typeLineOf(card),
      manaCost: "",
      modalLand,
      pathway,
    },
    text,
    modalLand,
    pathway,
  };
}

function isLandCard(card) {
  return /\bland\b/i.test(typeLineOf(card));
}

function isBasicLand(card) {
  return /\bbasic\b/i.test(typeLineOf(card)) && isLandCard(card);
}

function basicTypes(card) {
  const line = typeLineOf(card);
  const found = [];
  for (const [type, color] of Object.entries(BASIC_TYPE)) {
    if (new RegExp(`\\b${type}\\b`).test(line)) found.push({ type, color });
  }
  return found;
}

function printedCmc(card) {
  const cost = costOf(card);
  if (cost) return curveManaValue(cost, Number(card?.cmc) || 0);
  const direct = Number(card?.cmc);
  return Number.isFinite(direct) ? direct : 0;
}

function hardPips(cost) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const flex = [];
  for (const symbol of String(cost || "").match(/\{[^}]+\}/g) || []) {
    const parts = symbol.slice(1, -1).split("/");
    if (parts.some((part) => part === "P" || part === "C" || part === "X" || /^\d+$/.test(part))) continue;
    const colors = parts.filter((part) => COLOR_ORDER.includes(part));
    if (!colors.length || colors.length !== parts.length) continue;
    if (colors.length === 1) pips[colors[0]] += 1;
    else flex.push(colors);
  }
  return { pips, flex };
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

function spellFits(spell, scope) {
  if (!scope) return true;
  const line = typeLineOf(spell);
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
  const stripped = String(text || "").replace(/"[^"]*"/g, " ");
  const grantedOnly = /\badd\b/i.test(text) && !/\badd\b/i.test(stripped);
  const source = clean(stripped);
  const lines = source.split(/\n+/);
  const windows = [];
  for (const line of lines.length ? lines : [source]) {
    const parts = line.split(/(?<=\.)\s+/).map((part) => part.trim()).filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      if (!/\badd\b/i.test(parts[index])) continue;
      let window = parts[index];
      const next = parts[index + 1] || "";
      if (/^spend this mana only\b/i.test(next)) window = `${window} ${next}`;
      windows.push(window.replace(/\s+/g, " ").trim());
    }
  }
  return { windows, grantedOnly };
}

function manaAmount(window) {
  const produced = String(window || "").match(/\badd\b([^.:]*)/i)?.[1] || "";
  if (/three mana|\bthree\b/i.test(produced)) return 3;
  if (/two mana|\btwo\b/i.test(produced)) return 2;
  const symbols = produced.match(/\{[WUBRGC]\}/gi);
  if (symbols?.length) return symbols.length;
  return 1;
}

function activationCost(window) {
  const cost = String(window || "").split(":")[0] || "";
  const generic = [...cost.matchAll(/\{(\d+)\}/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  const colored = (cost.match(/\{[WUBRG]\}/gi) || []).length;
  const tapsOther = /tap an untapped|sacrifice a creature|sacrifice another/i.test(cost);
  return { generic, colored, tapsOther, text: cost };
}

function timingOf(text) {
  const rules = clean(text);
  if (/pay \d+ life[\s\S]{0,120}enters tapped|enters tapped unless you pay \d+ life/i.test(rules)) return "shock";
  if (/enters tapped unless you control two or fewer other lands/i.test(rules)) return "fast";
  if (/enters tapped unless you control two or more basic lands/i.test(rules)) return "battle";
  if (/may reveal[\s\S]{0,160}if you don't, (?:this land |it )?enters tapped/i.test(rules)) return "reveal";
  if (/enters tapped unless you control (?:a|an)\b/i.test(rules)) return "check";
  if (/onto the battlefield tapped[\s\S]{0,180}untap that land/i.test(rules)) return "fetch-late";
  if (/onto the battlefield tapped/i.test(rules)) return "fetch-tapped";
  if (/enters tapped unless/i.test(rules)) return "conditional";
  if (/\benters tapped\b/i.test(rules)) return "tapped";
  return "untapped";
}

function fetchSpec(text) {
  const rules = clean(text);
  const match = rules.match(/search your library for ([^.]*)/i);
  if (!match) return null;
  const sentence = rules.slice(match.index, match.index + 280);
  if (!/battlefield/i.test(sentence)) return null;
  const clause = match[1];
  const types = [];
  for (const [type, color] of Object.entries(BASIC_TYPE)) {
    if (new RegExp(`\\b${type}\\b`, "i").test(clause)) types.push({ type, color });
  }
  const basic = /\bbasic land\b/i.test(clause);
  if (!basic && !types.length) return null;
  const cost = sentence.split(":")[0] || "";
  const generic = [...cost.matchAll(/\{(\d+)\}/g)].reduce((sum, item) => sum + Number(item[1]), 0);
  return { basic, types, paid: generic > 0 };
}

function recolorClause(text) {
  const match = clean(text).match(/each land is a (Plains|Island|Swamp|Mountain|Forest) in addition/i);
  if (!match) return null;
  return { type: match[1], color: BASIC_TYPE[match[1]] };
}

function extraLandDrops(text) {
  const match = clean(text).match(/you may play (an|a|one|two|three|four|\d+) additional lands?/i);
  if (!match) return 0;
  const word = match[1].toLowerCase();
  if (word === "a" || word === "an" || word === "one") return 1;
  if (word === "two") return 2;
  if (word === "three") return 3;
  if (word === "four") return 4;
  return Number(word) || 0;
}

function landfallPlan(text) {
  return /whenever a land (?:you control )?enters|whenever a land enters under your control/i.test(clean(text));
}

function colorsInWindow(window, identity) {
  const colors = new Set();
  for (const symbol of window.matchAll(/\{([WUBRG])\}/g)) colors.add(symbol[1]);
  if (/commander'?s color identity/i.test(window) || (/\bany (?:one )?color\b/i.test(window) && !opponentDependentAddClause(window))) {
    for (const color of (identity.length ? identity : COLOR_ORDER)) colors.add(color);
  }
  return [...colors];
}

function draftCard(card, identity) {
  const prepared = presentManaCard(card);
  card = prepared.card;
  const text = prepared.text;
  const { windows, grantedOnly } = abilityWindows(text);
  const parsed = windows.map((window) => {
    const cost = activationCost(window);
    return {
      window,
      colors: colorsInWindow(window, identity),
      restriction: restrictionScope(window),
      opponent: opponentDependentAddClause(window),
      copies: /land you control could produce|lands? you control (?:could )?produce/i.test(window),
      colorless: /\{C\}/i.test(window.match(/\badd\b([^.:]*)/i)?.[1] || "") || /\badd \{C\}/i.test(window),
      amount: manaAmount(window),
      cost,
      anyColor: /\bany (?:one )?color\b|commander'?s color identity/i.test(window),
    };
  });
  const spec = fetchSpec(text);
  const timing = timingOf(text);
  const recolor = recolorClause(text);
  const types = basicTypes(card);
  return {
    card,
    name: String(card.name || "A card"),
    quantity: Math.max(1, Number(card.quantity) || 1),
    land: isLandCard(card),
    basic: isBasicLand(card),
    cmc: printedCmc(card),
    text,
    typeLine: typeLineOf(card),
    windows: parsed,
    grantedOnly,
    fetch: spec,
    timing,
    recolor,
    basicColors: types.map((entry) => entry.color),
    extraLands: extraLandDrops(text),
    grantsAnyColor: /lands you control have [^.]*add one mana of any color/i.test(clean(text)),
    modalLand: prepared.modalLand,
    pathway: prepared.pathway,
  };
}

function timingWeight(timing, turn) {
  if (timing === "untapped" || timing === "shock") return 1;
  if (timing === "fast") return turn <= 3 ? 1 : 0.5;
  if (timing === "check" || timing === "reveal" || timing === "conditional") {
    if (turn <= 2) return 0;
    if (turn === 3) return 0.5;
    return turn >= 5 ? 1 : 0.75;
  }
  if (timing === "battle") {
    if (turn <= 3) return 0;
    if (turn === 4) return 0.5;
    return 1;
  }
  if (timing === "tapped" || timing === "fetch-tapped") {
    if (turn <= 2) return 0;
    if (turn === 3) return 0.5;
    return 1;
  }
  if (timing === "fetch-late") {
    if (turn <= 2) return 0;
    if (turn === 3) return 0.5;
    if (turn === 4) return 0.75;
    return 1;
  }
  return 1;
}

function landMatchesFetch(other, spec) {
  if (!other.land || other.fetch) return false;
  if (spec.basic) return other.basic;
  const types = new Set(spec.types.map((entry) => entry.type));
  return basicTypes(other.card).some((entry) => types.has(entry.type));
}

function ownColors(draft) {
  const colors = new Set();
  for (const window of draft.windows) {
    if (window.opponent || window.copies || window.restriction) continue;
    if (window.cost.colored > 0 || window.cost.tapsOther) continue;
    if (window.cost.generic > 0 && window.cost.generic >= window.amount) continue;
    for (const color of window.colors) colors.add(color);
  }
  if (!colors.size && !draft.windows.some((window) => !window.opponent && !window.copies)) {
    for (const color of draft.basicColors) colors.add(color);
  }
  if (draft.recolor && draft.land) colors.add(draft.recolor.color);
  return colors;
}

function resolveFetches(drafts) {
  for (const draft of drafts) {
    draft.colorTiming = {};
    draft.reliableColors = new Set(ownColors(draft));
    if (!draft.fetch || draft.fetch.paid || !draft.land) continue;
    const targets = drafts.filter((other) => other !== draft && landMatchesFetch(other, draft.fetch));
    const forced = draft.timing === "fetch-tapped" || draft.timing === "fetch-late" ? draft.timing : null;
    for (const target of targets) {
      for (const color of target.reliableColors) {
        const timing = forced || target.timing || "untapped";
        const previous = draft.colorTiming[color];
        if (!previous || timingWeight(timing, 2) > timingWeight(previous, 2)) draft.colorTiming[color] = timing;
        draft.reliableColors.add(color);
      }
    }
    draft.fetch.found = [...draft.reliableColors];
    draft.fetch.empty = targets.length === 0;
  }
  for (const draft of drafts) {
    if (!draft.windows.some((window) => window.copies)) continue;
    const colors = new Set();
    for (const other of drafts) {
      if (other === draft || !other.land) continue;
      if (other.windows.some((window) => window.copies)) continue;
      for (const color of other.reliableColors) {
        if (other.fetch && !other.colorTiming[color] && !other.basicColors.includes(color) && !ownColors(other).has(color)) continue;
        colors.add(color);
      }
    }
    draft.reliableColors = colors;
    draft.copiesLands = true;
  }
}

function windowPays(window, spell, color, identity) {
  if (window.opponent || window.copies) return false;
  if (window.cost.tapsOther) return false;
  if (window.cost.colored > 0) return false;
  if (window.cost.generic > 0 && window.cost.generic >= window.amount) return false;
  if (!window.colors.includes(color)) return false;
  if (window.restriction && !spellFits(spell, window.restriction)) return false;
  if (window.anyColor && identity.length && !identity.includes(color)) return false;
  return true;
}

function paysColor(draft, spell, color, identity) {
  if (draft.reliableColors.has(color) && !draft.windows.some((window) => window.restriction || window.opponent)) {
    if (draft.fetch && !draft.colorTiming[color] && !ownColors(draft).has(color)) return false;
    return true;
  }
  if (draft.windows.some((window) => windowPays(window, spell, color, identity))) return true;
  if (draft.fetch && draft.colorTiming[color] && !draft.fetch.paid) {
    const restricted = draft.windows.find((window) => window.restriction && window.colors.includes(color));
    if (restricted && !spellFits(spell, restricted.restriction)) return false;
    return true;
  }
  return false;
}

function sourceTiming(draft, color) {
  if (draft.colorTiming?.[color]) return draft.colorTiming[color];
  if (draft.fetch && (draft.timing === "fetch-tapped" || draft.timing === "fetch-late")) return draft.timing;
  return draft.timing || "untapped";
}

function isGenericColored(draft, identity) {
  if (!identity.length) return false;
  const open = draft.windows.find((window) => (
    window.anyColor
    && !window.opponent
    && !window.copies
    && !window.restriction
    && !window.cost.tapsOther
    && window.cost.colored === 0
    && window.cost.generic < window.amount
  ));
  return Boolean(open);
}

function singleColor(draft) {
  const colors = [...draft.reliableColors];
  if (colors.length !== 1) return null;
  if (isGenericColored(draft, colors)) return null;
  if (draft.windows.some((window) => window.restriction || window.opponent)) return null;
  return colors[0];
}

function earlyRockCredit(draft) {
  if (draft.land || draft.grantedOnly) return 0;
  const open = draft.windows.find((window) => (
    !window.opponent
    && !window.copies
    && !window.restriction
    && !window.cost.tapsOther
    && window.cost.colored === 0
    && window.cost.generic < window.amount
    && (window.colors.length || window.colorless)
  ));
  if (!open) return 0;
  if (draft.cmc > 2) return 0;
  if (open.amount >= 2 && draft.cmc <= 1) return 2;
  return 1;
}

function isLandRamp(draft) {
  if (draft.land || !draft.fetch || draft.fetch.paid) return false;
  return true;
}

// A cheap land-ramp spell stands in for part of a land slot because it
// turns a land that is already in the deck into an earlier drop. It is not
// counted as that land. A 3-mana spell such as Cultivate is slower.
function landRampRelief(draft, producers) {
  if (!isLandRamp(draft)) return 0;
  const finds = producers.some((other) => other !== draft && other.land && landMatchesFetch(other, draft.fetch || { basic: false, types: [] }));
  if (!finds) return 0;
  const cmc = draft.cmc || 2;
  const each = cmc <= 2 ? 0.6 : cmc <= 3 ? 0.5 : 0.25;
  return each * draft.quantity;
}

function weightFor(draft, spell, color, turn, identity) {
  if (!paysColor(draft, spell, color, identity)) return 0;
  if (!draft.land) {
    return turn >= Math.max(1, Math.round(draft.cmc) + 1) ? draft.quantity : 0;
  }
  return timingWeight(sourceTiming(draft, color), turn) * draft.quantity;
}

function sourcesNeeded(turn, pips, deckSize) {
  const row = SOURCE_TARGETS[Math.max(1, Math.min(6, Math.round(turn) || 1))];
  const clamped = Math.max(1, Math.min(3, Math.round(pips) || 1));
  const base = row[clamped - 1] + (pips > 3 ? (Math.round(pips) - 3) * 6 : 0);
  if (deckSize >= 90) return base;
  const scale = Math.max(0.45, Math.min(1, deckSize / 99));
  return Math.max(clamped, Math.round(base * scale));
}

function cardsSeen(turn) {
  return 6 + Math.max(1, Math.round(turn) || 1);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function lower(level) {
  const rank = { low: 0, medium: 1, high: 2 };
  return ["low", "medium", "high"][Math.max(0, (rank[level] ?? 1) - 1)];
}

function listNames(items, limit = 4) {
  const names = items.slice(0, limit).map((item) => (item.quantity > 1 ? `${item.quantity} ${item.name}` : item.name));
  const extra = items.length - names.length;
  return extra > 0 ? `${names.join(", ")}, and ${extra} more` : names.join(", ");
}

function colorList(colors) {
  const words = colors.map((color) => COLOR_WORD[color]).filter(Boolean);
  if (words.length <= 1) return words[0] || "those colors";
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
}

const PIP_COUNT = Object.freeze(["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]);

function pipPhrase(pips, color) {
  const count = Math.max(1, Math.round(pips));
  const word = COLOR_WORD[color];
  const number = PIP_COUNT[count] || String(count);
  return `${number} ${word} mana`;
}

function spellTurn(card) {
  return Math.max(1, Math.min(6, Math.round(printedCmc(card)) || 1));
}

function normalizeIdentity(commanders) {
  const found = [];
  for (const commander of commanders) {
    const colors = commander.colorIdentity || commander.colors || commander.color_identity || [];
    for (const color of colors) {
      const letter = String(color || "").toUpperCase();
      if (COLOR_ORDER.includes(letter) && !found.includes(letter)) found.push(letter);
    }
  }
  return COLOR_ORDER.filter((color) => found.includes(color));
}

function clampLandCenter(center, deckSize) {
  let next = center;
  if (deckSize < 90) next *= Math.max(0.45, deckSize / 99);
  next = Math.max(deckSize < 90 ? 8 : 30, Math.min(deckSize < 90 ? 40 : 45, next));
  const rounded = Math.round(next);
  return { low: rounded - 1, high: rounded + 1, center: rounded };
}

function landRange({ averageCmc, commanderCmc, rockCredit, landRampCredit = 0, reductionCut = 0, extraDrops, landfall, deckSize }) {
  const pace = averageCmc <= 2.5 ? -1.5 : averageCmc >= 3.8 ? 1 : 0;
  const curve = (averageCmc - 3.2) * 2 + (commanderCmc - 4) * 0.4 + pace;
  // 36 lands at a 3.2 curve already includes a Sol Ring and a signet.
  // Rocks past that, and land ramp that finds a land in the deck, cover
  // some of the extra lands a higher curve wants. A flat cost reduction
  // is a smaller credit on top. It does not rewrite the printed curve,
  // because the commander is not on the battlefield on turn one. Caps
  // keep the formula from recommending a very low land count.
  const rockRelief = Math.min(2, Math.max(0, rockCredit - 3) * 0.45);
  const rampRelief = Math.min(3, Math.max(0, landRampCredit));
  const reductionRelief = Math.min(2, Math.max(0, reductionCut) * 1.4);
  const base = 36 + curve + Math.min(4, extraDrops * 2) + (landfall && extraDrops === 0 ? 1 : 0);
  const credited = clampLandCenter(base - rockRelief - rampRelief - reductionRelief, deckSize);
  const plain = clampLandCenter(base - reductionRelief, deckSize);
  const printed = clampLandCenter(base, deckSize);
  return {
    ...credited,
    rockRelief,
    rampRelief,
    baselineLow: plain.low,
    baselineHigh: plain.high,
    printedLow: printed.low,
    printedHigh: printed.high,
  };
}

const BROAD_REDUCTION = new Set(["any", "instant and sorcery", "instant", "sorcery", "creature", "artifact", "enchantment", "permanent", "noncreature", "historic"]);

function broadCostReduction(text) {
  const rules = clean(text);
  const match = rules.match(/\b([a-z]+(?: and [a-z]+)? )?spells you cast cost \{(\d+)\} less\b/i);
  if (!match) return null;
  const tail = rules.slice(match.index, match.index + match[0].length + 70);
  if (/for each|where x\b|equal to|number of|\bpower\b/i.test(tail)) return null;
  const kind = (match[1] || "any").trim().toLowerCase();
  if (!BROAD_REDUCTION.has(kind)) return null;
  return { kind, amount: Math.min(2, Number(match[2]) || 0) };
}

function reductionShare(kind, spells) {
  const list = spells.filter((card) => costOf(card));
  const total = list.reduce((sum, card) => sum + card.quantity, 0);
  if (!total || kind === "any" || kind === "permanent") return total ? 1 : 0;
  const matches = (card) => {
    const line = typeLineOf(card);
    if (kind === "creature") return /\bcreature\b/i.test(line);
    if (kind === "noncreature") return !/\bcreature\b/i.test(line);
    if (kind === "instant and sorcery" || kind === "instant" || kind === "sorcery") return /\b(?:instant|sorcery)\b/i.test(line);
    if (kind === "historic") return /\b(?:artifact|legendary|saga)\b/i.test(line);
    return new RegExp(`\\b${kind}\\b`, "i").test(line);
  };
  return list.reduce((sum, card) => sum + (matches(card) ? card.quantity : 0), 0) / total;
}

function pickDemand(rows) {
  return rows.reduce((worst, row) => {
    if (!worst || row.gap > worst.gap + 0.2) return row;
    if (Math.abs(row.gap - worst.gap) <= 0.2 && row.spell.isCommander && !worst.spell.isCommander) return row;
    return worst;
  }, null);
}

function classifyColorDemand(rows) {
  const floorRows = rows.filter((row) => row.pips < 1.5);
  const steepRows = rows.filter((row) => row.pips >= 1.5);
  const floor = pickDemand(floorRows);
  const stretch = pickDemand(steepRows);
  const steepCards = steepRows.reduce((sum, row) => sum + (row.spell.quantity || 1), 0);
  const colorCards = rows.reduce((sum, row) => sum + (row.spell.quantity || 1), 0);
  const commanderPips = rows.reduce((max, row) => (row.spell.isCommander ? Math.max(max, row.pips) : max), 0);
  const committed = commanderPips >= 2 || steepCards >= 3;
  const governing = committed ? (stretch || floor) : (floor || stretch);
  const governingGap = governing ? governing.gap : 0;
  let status = "ok";
  let stretchOnly = false;
  if (governingGap >= 4) status = "short";
  else if (!committed && stretch && stretch.gap >= 4 && steepCards < 3 && commanderPips < 2 && stretch.gap >= governingGap + 4) {
    status = "tight";
    stretchOnly = true;
  } else if (governingGap > 0) status = "tight";
  const shown = (status === "short" || stretchOnly) && stretch && stretch.gap > (governing?.gap || 0) + 0.2
    ? stretch
    : (governing || stretch);
  return { status, stretchOnly, committed, steepCards, colorCards, commanderPips, floor, stretch, shown };
}

function measureDemand(color, spell, pips, producers, identity, deckSize) {
  const turn = spellTurn(spell);
  const needed = sourcesNeeded(turn, pips, deckSize || 99);
  let effective = 0;
  let untapped = 0;
  let late = 0;
  for (const draft of producers) {
    const weight = weightFor(draft, spell, color, turn, identity);
    effective += weight;
    const full = draft.quantity ? weight / draft.quantity : 0;
    if (full >= 0.99) untapped += draft.quantity;
    else if (weight <= 0 && weightFor(draft, spell, color, 6, identity) > 0) late += draft.quantity;
  }
  const have = round1(effective);
  return { color, spell, pips, turn, needed, have, untapped, late, gap: needed - have };
}

function colorReadSummary(row, identityCount) {
  const word = row.word;
  if (!row.spell) return `No ${word} pips in the printed costs.`;
  if (row.stretchOnly) {
    const count = row.steepCards || 1;
    const who = count === 1 ? "One card asks" : `${count} cards ask`;
    const practical = identityCount >= 3
      ? `A three-color mana base that casts its one-${word} spells is on the practical side of the color table. About ${row.needed} sources is the strict count for a deck built on two-${word} spells. For ${count === 1 ? "one card" : "a few cards"}, that is a closer call.`
      : `The other ${word} spells ask for one ${word} mana. That is the practical count, and this spell is a closer call.`;
    return `${row.spell.name} wants ${pipPhrase(row.pipsOnSpell, row.color)} on turn ${row.turn}. About ${row.needed} ${word} sources would cast that spell on time. ${row.untapped} are untapped by then. ${who} for that many ${word} pips. ${practical} Confidence on this read: low.`;
  }
  if (row.downgraded) {
    return `${row.spell.name} wants ${pipPhrase(row.pipsOnSpell, row.color)} on turn ${row.turn}. About ${row.needed} ${word} sources cast that, and ${row.untapped} are untapped by then. The gap is about ${Math.max(1, Math.round(row.gap))} sources, smaller than the main hole, so ${word} is close. Confidence on this read: medium.`;
  }
  return `${row.spell.name} wants ${pipPhrase(row.pipsOnSpell, row.color)} on turn ${row.turn}. About ${row.needed} ${word} sources cast that. ${row.untapped} are untapped by then${row.late ? `, and ${row.late} arrive tapped or too late to count in full` : ""}.`;
}

function finishColorReport(row, identityCount) {
  const summary = colorReadSummary(row, identityCount);
  const detail = row.stretchOnly
    ? `${row.pips} pips. ${row.untapped} untapped by turn ${row.turn}. ${row.steepCards === 1 ? "One spell wants" : `${row.steepCards} spells want`} about ${row.needed}. Close. Confidence: low.`
    : row.downgraded
      ? `${row.pips} pips. ${row.untapped} untapped by turn ${row.turn}. About ${row.needed} wanted. Close. Confidence: medium.`
      : "";
  return { ...row, summary, detail };
}

function whyNot(draft, spell, color, identity) {
  const quoteOf = (pattern) => printedQuote(draft.text, pattern) || clean(draft.text).slice(0, 180);
  if (draft.grantedOnly) {
    return {
      kind: "granted",
      quote: quoteOf(/add|have "/i),
      says: "The mana ability is granted to other permanents, and it is spend-restricted. This card is not itself a source.",
    };
  }
  if (draft.windows.some((window) => window.opponent)) {
    return {
      kind: "opponent",
      quote: quoteOf(/opponent/i),
      says: `This takes its color from a land an opponent controls. That is not ${COLOR_WORD[color]} you can plan on, and it is not fixing.`,
    };
  }
  const restricted = draft.windows.find((window) => window.restriction && (window.colors.includes(color) || window.anyColor) && !spellFits(spell, window.restriction));
  if (restricted) {
    return {
      kind: "restricted",
      quote: quoteOf(/spend this mana only|add/i),
      says: `The printed text only lets you spend this mana on ${restricted.restriction.label}. ${spell.name || "This spell"} is not one of those, so this is not a generic source.`,
    };
  }
  if (draft.copiesLands) {
    const made = [...draft.reliableColors].map((entry) => COLOR_WORD[entry]).filter(Boolean);
    return {
      kind: "pool",
      quote: quoteOf(/land you control/i),
      says: made.length
        ? `This copies a color your other lands already make. Right now that is ${colorList([...draft.reliableColors])}, so it does not make ${COLOR_WORD[color]}.`
        : "This only makes a color your other lands already make. None of those lands make this color, so this is not fixing.",
    };
  }
  if (draft.fetch && !draft.fetch.paid && !draft.reliableColors.has(color)) {
    const named = draft.fetch.basic ? "a basic land" : draft.fetch.types.map((entry) => entry.type).join(" or ");
    return {
      kind: "fetch",
      quote: quoteOf(/search your library/i),
      says: draft.fetch.empty
        ? `This searches for ${named}. The list has no land it can find, so it is not a source.`
        : `This searches for ${named}. Nothing it can find taps for ${COLOR_WORD[color]}, so it is not a ${COLOR_WORD[color]} source.`,
    };
  }
  if (draft.recolor && draft.recolor.color !== color) {
    return {
      kind: "recolor",
      quote: quoteOf(/each land is/i),
      says: `This makes every land a ${draft.recolor.type} while it is in play. That is one card, not a ${COLOR_WORD[color]} source, and it does not recolor the mana base before it resolves.`,
    };
  }
  const only = singleColor(draft);
  if (only && only !== color) {
    const basicQuote = draft.basicColors.includes(only) ? `{T}: Add {${only}}.` : "";
    return {
      kind: "single",
      quote: quoteOf(/add/i) || basicQuote || `${costOf(draft.card)} ${draft.typeLine}`.trim(),
      says: draft.land
        ? `This adds ${COLOR_WORD[only]} only. It is a ${COLOR_WORD[only]} land, not a ${COLOR_WORD[color]} source.`
        : `This adds ${COLOR_WORD[only]} only. That is ${COLOR_WORD[only]} ramp, not a generic source, and it does not cast ${COLOR_WORD[color]} spells.`,
    };
  }
  const colorless = draft.windows.some((window) => window.colorless && !window.colors.length && !window.restriction);
  if (colorless && !draft.reliableColors.has(color)) {
    return {
      kind: "colorless",
      quote: quoteOf(/add \{C\}|add/i),
      says: `This adds colorless mana. It accelerates, and it is not a ${COLOR_WORD[color]} source.`,
    };
  }
  return null;
}

function untappedWord(timing) {
  if (timing === "shock") return "You may pay life so it enters untapped, so it counts as mana the turn it arrives.";
  if (timing === "fast") return "It enters tapped only once you already have three lands, so the early turns can still use it.";
  if (timing === "check" || timing === "reveal" || timing === "conditional") return "It enters tapped unless you already have the right land, so it is not mana on turn two.";
  if (timing === "battle") return "It enters tapped until you control two basics, so it misses the early turns.";
  if (timing === "fetch-tapped") return "The land it finds enters tapped, so the mana waits a turn.";
  if (timing === "fetch-late") return "The land it finds enters tapped until you control four lands.";
  if (timing === "tapped") return "It enters tapped, so it is not mana on the turn it arrives.";
  return "";
}

function recommendLand(identity, shortColors, used) {
  const unused = (name) => !used.has(String(name).toLowerCase());
  if ((identity.length >= 3 || shortColors.length >= 2) && unused(COMMAND_TOWER.name)) return COMMAND_TOWER;
  const primary = shortColors[0];
  const partner = shortColors[1] || identity.find((color) => color !== primary);
  if (primary && partner) {
    const shock = SHOCKS.find((entry) => unused(entry.name) && entry.colors.includes(primary) && entry.colors.includes(partner));
    if (shock) return shock;
  }
  if (primary) {
    return {
      name: BASIC_NAME[primary],
      oracleText: `{T}: Add {${primary}}.`,
    };
  }
  if (unused(COMMAND_TOWER.name) && identity.length >= 2) return COMMAND_TOWER;
  return {
    name: BASIC_NAME[identity[0]] || "Wastes",
    oracleText: identity[0] ? `{T}: Add {${identity[0]}}.` : "{T}: Add {C}.",
  };
}

/**
 * Read one card the way the mana-base coach counts it.
 * `cards` is the rest of the list, so a fetch or a reflecting pool can see
 * what the deck can actually produce.
 */
export function readPrintedMana(card, { identity = [], cards = [] } = {}) {
  const library = (cards.length ? cards : [card]).map((entry) => draftCard(entry, identity));
  const self = library.find((entry) => entry.card === card) || draftCard(card, identity);
  if (!library.includes(self)) library.push(self);
  resolveFetches(library);
  return {
    name: self.name,
    land: self.land,
    timing: self.timing,
    colors: [...self.reliableColors],
    generic: isGenericColored(self, identity),
    singleColor: singleColor(self),
    restricted: self.windows.find((window) => window.restriction)?.restriction || null,
    opponent: self.windows.some((window) => window.opponent),
    copiesLands: Boolean(self.copiesLands),
    fetch: self.fetch ? { ...self.fetch, found: [...(self.fetch.found || self.reliableColors)] } : null,
    recolorsAll: self.recolor?.type || null,
    earlyRock: earlyRockCredit(self) > 0,
    landRamp: isLandRamp(self),
    modalLand: Boolean(self.modalLand),
    pathway: Boolean(self.pathway),
    granted: self.grantedOnly,
    colorTiming: { ...self.colorTiming },
    pays(spell, color) {
      return paysColor(self, spell, color, identity);
    },
    untappedOn(turn, color) {
      return timingWeight(sourceTiming(self, color), turn) >= 1;
    },
  };
}

function buildProducers(cards, identity) {
  const drafts = cards.map((card) => draftCard(card, identity));
  resolveFetches(drafts);
  return drafts;
}

function averageOf(spells) {
  let total = 0;
  let count = 0;
  for (const spell of spells) {
    if (!costOf(spell) && !spell.cmc) continue;
    total += printedCmc(spell) * spell.quantity;
    count += spell.quantity;
  }
  return count ? round1(total / count) : null;
}

function confidenceFor({ opaqueShare, partial, conditionalShare, gap }) {
  let level = "high";
  const reasons = [];
  if (opaqueShare > 0.25) {
    level = "low";
    reasons.push("Printed mana text is missing for many cards, so the source counts are incomplete.");
  } else if (opaqueShare > 0.08) {
    level = lower(level);
    reasons.push("A few cards have no mana text, so they are left out of the source counts.");
  } else {
    reasons.push("The counts come from the printed mana costs and the mana abilities.");
  }
  if (partial) {
    level = lower(level);
    reasons.push("This is not a full Commander list, so the land range is scaled and the read is provisional.");
  }
  if (conditionalShare > 0.34) {
    level = lower(level);
    reasons.push("A lot of the mana enters tapped only sometimes, or fetches a land. Those sources are counted cautiously.");
  }
  if (gap === "close") {
    level = lower(level);
    reasons.push("The gap is small enough that a mulligan can cover it.");
  }
  return { level, reason: reasons.join(" ") };
}

function landStatus(count, range) {
  if (count < range.low) return range.low - count >= 2 ? "short" : "tight";
  if (count > range.high) return count - range.high >= 2 ? "over" : "tight";
  return "ok";
}

/**
 * @param {{ commander?: any, commanders?: any[], cards?: any[], strategy?: string }} input
 */
export function buildManaBaseCoaching(input = {}) {
  const commanderSources = [
    ...(Array.isArray(input.commanders) ? input.commanders : []),
    input.commander,
  ].filter((entry) => entry && (entry.name || entry.oracleText || entry.oracle_text));
  const seen = new Set();
  const commanders = [];
  for (const entry of commanderSources) {
    const name = String(entry.name || "").trim();
    const key = name.toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    commanders.push({
      name,
      oracleText: textOf(entry),
      typeLine: typeLineOf(entry),
      manaCost: costOf(entry),
      cmc: entry.cmc,
      colorIdentity: entry.colorIdentity || entry.colors || entry.color_identity || [],
    });
  }
  const primary = commanders[0] || null;
  const identity = normalizeIdentity(commanders);
  const commanderNames = new Set(commanders.map((commander) => commander.name.toLowerCase()).filter(Boolean));
  const library = (Array.isArray(input.cards) ? input.cards : []).map((card) => presentManaCard({
    ...card,
    name: String(card?.name || "").trim(),
    quantity: Math.max(1, Number(card?.quantity) || 1),
    oracleText: textOf(card),
    typeLine: typeLineOf(card),
    manaCost: costOf(card),
    isCommander: commanderNames.has(String(card?.name || "").trim().toLowerCase()) || card?.isCommander === true,
  }).card).filter((card) => card.name && !card.isCommander);

  const deckSize = library.reduce((sum, card) => sum + card.quantity, 0);
  const spelled = library.filter((card) => card.oracleText.trim() || card.manaCost || basicTypes(card).length || isLandCard(card));
  if (!spelled.length || deckSize < 8) {
    return {
      readable: false,
      message: "Paste the decklist with printed mana costs and Oracle text. Names alone are not a mana base. Mana that can only be spent on certain spells is not a generic source, a land that enters tapped is not mana that turn, and a fetch only fixes a color the list can actually find.",
    };
  }

  const producers = buildProducers(library, identity);
  const spells = library.filter((card) => !isLandCard(card));
  const manaNames = new Set(producers.filter((draft) => earlyRockCredit(draft) > 0 || isLandRamp(draft)).map((draft) => draft.name));
  const demandSpells = [
    ...commanders.filter((commander) => commander.manaCost).map((commander) => ({ ...commander, quantity: 1, isCommander: true })),
    ...spells.filter((card) => card.manaCost && !manaNames.has(card.name)),
  ];
  const averageCmc = averageOf(spells);
  const rockCredit = producers.reduce((sum, draft) => sum + earlyRockCredit(draft) * draft.quantity, 0);
  const landRamp = producers.filter(isLandRamp);
  const landRampCount = landRamp.reduce((sum, draft) => sum + draft.quantity, 0);
  const landRampCredit = producers.reduce((sum, draft) => sum + landRampRelief(draft, producers), 0);
  const extraDrops = [...commanders, ...library].reduce((sum, card) => sum + extraLandDrops(textOf(card)) * (card.quantity || 1), 0);
  const landfall = commanders.some((commander) => landfallPlan(commander.oracleText));
  const reduction = commanders
    .map((commander) => ({ commander, found: broadCostReduction(commander.oracleText) }))
    .find((entry) => entry.found);
  let reductionCut = 0;
  let reductionQuote = "";
  let reductionName = "";
  if (reduction && averageCmc != null) {
    const cut = Math.min(1.5, reduction.found.amount * reductionShare(reduction.found.kind, spells));
    if (cut >= 0.35) {
      reductionCut = cut;
      reductionName = reduction.commander.name;
      reductionQuote = printedQuote(reduction.commander.oracleText, /spells you cast cost/i) || clean(reduction.commander.oracleText).slice(0, 180);
    }
  }
  const range = averageCmc == null
    ? { low: 0, high: 0, center: 0, baselineLow: 0, baselineHigh: 0, rockRelief: 0, rampRelief: 0 }
    : landRange({
      averageCmc,
      commanderCmc: primary ? printedCmc(primary) : 4,
      rockCredit,
      landRampCredit,
      reductionCut,
      extraDrops,
      landfall,
      deckSize,
    });
  const reductionNote = reductionCut
    ? `${reductionName} says “${reductionQuote}” That discount covers part of a land drop once the commander is out${range.printedLow > range.low ? `, which moves the land target from about ${range.printedLow}–${range.printedHigh} to ${range.low}–${range.high}` : ""}. The printed curve still sets the pace. Each color check still uses the printed mana cost, because the reduction is not on the battlefield on turn one.`
    : "";

  const lands = producers.filter((draft) => draft.land);
  const landCount = lands.reduce((sum, draft) => sum + draft.quantity, 0);
  const tappedLands = lands.filter((draft) => ["tapped", "fetch-tapped"].includes(draft.timing));
  const conditionalLands = lands.filter((draft) => ["check", "reveal", "battle", "conditional", "fetch-late"].includes(draft.timing));
  const untappedLands = lands.filter((draft) => ["untapped", "shock", "fast"].includes(draft.timing) || (draft.fetch && !["fetch-tapped", "fetch-late", "tapped"].includes(draft.timing) && draft.reliableColors.size));
  const tappedCount = tappedLands.reduce((sum, draft) => sum + draft.quantity, 0);
  const conditionalCount = conditionalLands.reduce((sum, draft) => sum + draft.quantity, 0);
  const untappedLandCount = untappedLands.reduce((sum, draft) => sum + draft.quantity, 0);

  const opaque = library.filter((card) => !card.manaCost && !card.oracleText.trim() && !basicTypes(card).length).reduce((sum, card) => sum + card.quantity, 0);
  const opaqueShare = deckSize ? opaque / deckSize : 1;
  const conditionalShare = landCount ? (tappedCount + conditionalCount) / landCount : 0;
  const partial = deckSize > 0 && deckSize < 90;
  const landsState = averageCmc == null ? "tight" : landStatus(landCount, range);
  const rampFindsLand = (draft) => producers.some((other) => other !== draft && other.land && landMatchesFetch(other, draft.fetch || { basic: false, types: [] }));
  const colorReports = [];

  for (const color of identity) {
    const demands = demandSpells
      .map((spell) => ({ spell, pips: hardPips(spell.manaCost).pips[color] }))
      .filter((entry) => entry.pips >= 0.75)
      .map((entry) => measureDemand(color, entry.spell, entry.pips, producers, identity, deckSize || 99));
    if (!demands.length) {
      colorReports.push({
        color,
        word: COLOR_WORD[color],
        pips: 0,
        untapped: 0,
        late: 0,
        have: 0,
        needed: 0,
        turn: null,
        spell: null,
        status: "ok",
        gap: 0,
        summary: `No ${COLOR_WORD[color]} pips in the printed costs.`,
        detail: "",
      });
      continue;
    }
    const read = classifyColorDemand(demands);
    const shown = read.shown;
    const pipTotal = demandSpells.reduce((sum, spell) => sum + hardPips(spell.manaCost).pips[color] * (spell.quantity || 1), 0);
    colorReports.push({
      color,
      word: COLOR_WORD[color],
      pips: round1(pipTotal),
      untapped: shown.untapped,
      late: shown.late,
      have: shown.have,
      needed: shown.needed,
      turn: shown.turn,
      pipsOnSpell: Math.round(shown.pips),
      spell: shown.spell,
      status: read.status,
      gap: round1(shown.gap),
      stretchOnly: read.stretchOnly,
      downgraded: false,
      steepCards: read.steepCards,
      summary: "",
      detail: "",
    });
  }

  const rankedShort = colorReports.filter((row) => row.status === "short").sort((left, right) => right.gap - left.gap);
  if (rankedShort.length >= 2) {
    const leadGap = rankedShort[0].gap;
    for (const row of rankedShort.slice(1)) {
      if (row.gap <= 5 || row.gap < leadGap * 0.6) {
        row.status = "tight";
        row.downgraded = true;
      }
    }
  }
  for (let index = 0; index < colorReports.length; index += 1) {
    colorReports[index] = finishColorReport(colorReports[index], identity.length);
  }

  const farGap = landsState === "short" || landsState === "over" || colorReports.some((row) => row.status === "short");
  const closeGap = !farGap && (landsState === "tight" || colorReports.some((row) => row.status === "tight"));
  const confidence = confidenceFor({
    opaqueShare,
    partial,
    conditionalShare,
    gap: closeGap ? "close" : "none",
  });

  const used = new Set(library.map((card) => card.name.toLowerCase()));
  const lessons = [];
  const shortColors = colorReports.filter((row) => row.status === "short").sort((left, right) => right.gap - left.gap);
  const closeColors = colorReports.filter((row) => row.status === "tight" && (row.stretchOnly || row.downgraded)).sort((left, right) => right.gap - left.gap);
  const lead = shortColors[0] || null;
  const focus = lead || closeColors[0] || null;
  const focusTone = lead ? "short" : "close";

  if (landsState === "short" || landsState === "over") {
    const direction = landsState === "short";
    const cutPool = direction
      ? spells.filter((card) => !producers.some((draft) => draft.name === card.name && (earlyRockCredit(draft) || isLandRamp(draft)))).sort((left, right) => printedCmc(right) - printedCmc(left))
      : [...tappedLands, ...conditionalLands, ...lands.filter((draft) => draft.windows.some((window) => window.opponent) || draft.reliableColors.size === 0)];
    const cut = cutPool[0] || null;
    const add = direction ? recommendLand(identity, shortColors.map((row) => row.color), used) : null;
    const because = [];
    because.push(`The spells you draw average ${averageCmc} mana.`);
    if (reductionNote) because.push(reductionNote);
    if (range.rockRelief >= 0.5) because.push(`Cheap rocks and dorks add about ${rockCredit} mana. That is more than a Sol Ring and a signet, so it covers part of a land drop. A rock still has to be cast, and it is not the opening land.`);
    else if (rockCredit > 0) because.push(`Cheap rocks and dorks add about ${rockCredit} mana. That is not enough to replace land drops.`);
    if (landRampCount) {
      const packageNote = range.rampRelief >= 0.5 ? " The package covers some of the extra lands this curve would want." : "";
      because.push(`${landRampCount} ${landRampCount === 1 ? "spell searches" : "spells search"} for a land and put it onto the battlefield.${packageNote} That is ramp, and it is not an extra land or a color source. The land it finds still has to be in the deck.`);
    }
    if ((range.rockRelief || 0) + (range.rampRelief || 0) >= 0.5 && range.baselineLow > range.low) because.push(`Without that ramp, this curve would want about ${range.baselineLow}–${range.baselineHigh} lands. With it, the target is ${range.low}–${range.high}.`);
    if (extraDrops) because.push(`Printed text lets you play ${extraDrops === 1 ? "an additional land" : `${extraDrops} additional lands`} each turn. Those drops need lands in hand.`);
    if (landfall) {
      because.push(range.rampRelief >= 0.5 || range.rockRelief >= 0.5
        ? `${primary?.name || "The commander"} pays you when a land enters, so the target stays higher than a ramp deck with no land payoff.`
        : `${primary?.name || "The commander"} pays you when a land enters, so missing land drops also miss the plan.`);
    }
    if (tappedCount && averageCmc != null && averageCmc <= 2.6) because.push(`${tappedCount} lands enter tapped. A low curve cannot spend that mana on the turn the land arrives.`);
    const theory = direction
      ? `Lands are the cards you play for free, one a turn. ${because.join(" ")} This curve wants about ${range.low}–${range.high} lands. The list has ${landCount}.`
      : `Every land past the range is a spell you do not draw. ${because.join(" ")} This curve wants about ${range.low}–${range.high} lands. The list has ${landCount}.`;
    const swap = direction && add
      ? {
        cut: cut?.name || null,
        add: add.name,
        reason: `${add.name} says “${printedQuote(add.oracleText, /add/i) || add.oracleText}” ${cut ? `Cut ${cut.name}: it costs ${printedCmc(cut)} and it is not mana, so it is the spell the land replaces.` : "Add it for a spell that is not mana."}`,
      }
      : cut
        ? {
          cut: cut.name,
          add: null,
          reason: `${cut.name} says “${printedQuote(cut.text || textOf(cut.card), /enters tapped|add|search your library/i) || "no mana the deck can spend on time"}” ${untappedWord(cut.timing) || "It is one of the extra lands."} The list is ${landCount - range.high} ${landCount - range.high === 1 ? "land" : "lands"} over the range.`,
        }
        : null;
    lessons.push({
      id: direction ? "lands-short" : "lands-heavy",
      title: direction ? "Not enough lands for this curve" : "More lands than this curve can use",
      theory,
      cards: [{ name: primary?.name || "The curve", quantity: 1, note: `average ${averageCmc} mana, ${landCount} lands` }],
      excluded: landRamp.slice(0, 3).map((draft) => ({
        name: draft.name,
        quantity: draft.quantity,
        note: rampFindsLand(draft)
          ? "searches for a land already in the deck, so it is not an extra land"
          : "searches for a land type this list does not have, so it finds nothing and it is not an extra land",
      })),
      quotes: [],
      swaps: swap ? [swap] : [],
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  }

  if (focus) {
    const spell = focus.spell;
    const refused = [];
    const seenCards = new Set();
    for (const draft of producers) {
      if (seenCards.has(draft.name)) continue;
      if (!draft.land && draft.fetch) continue;
      if (paysColor(draft, spell, focus.color, identity) && timingWeight(sourceTiming(draft, focus.color), focus.turn) >= 1) continue;
      const reason = whyNot(draft, spell, focus.color, identity);
      if (!reason) {
        const timing = sourceTiming(draft, focus.color);
        if (paysColor(draft, spell, focus.color, identity) && timingWeight(timing, focus.turn) < 1) {
          refused.push({
            draft,
            reason: {
              kind: "tapped",
              quote: printedQuote(draft.text, /enters tapped|battlefield tapped|search your library/i) || clean(draft.text).slice(0, 180),
              says: untappedWord(timing) || "This mana is not available on the turn the spell asks for it.",
            },
          });
          seenCards.add(draft.name);
        }
        continue;
      }
      seenCards.add(draft.name);
      refused.push({ draft, reason });
    }
    const rank = { opponent: 0, restricted: 1, fetch: 2, pool: 3, single: 4, colorless: 5, granted: 6, recolor: 7, tapped: 8 };
    refused.sort((left, right) => (rank[left.reason.kind] ?? 9) - (rank[right.reason.kind] ?? 9) || Number(left.draft.basic) - Number(right.draft.basic) || right.draft.quantity - left.draft.quantity);
    const shown = refused.slice(0, 3);
    const add = recommendLand(identity, (shortColors.length ? shortColors : [focus]).map((row) => row.color), used);
    const cut = shown[0]?.draft || null;
    const spellPips = Math.max(1, Math.round(focus.pipsOnSpell || 1));
    const also = shortColors.slice(1);
    const odds = hypergeometricAtLeast(Math.max(deckSize, focus.needed), Math.max(0, Math.round(focus.have)), cardsSeen(focus.turn), spellPips);
    const percent = Math.round(odds * 100);
    const closeNote = focusTone === "short" && closeColors.length
      ? ` ${closeColors.map((row) => `${row.word[0].toUpperCase()}${row.word.slice(1)} is a closer call${row.spell ? ` (${row.spell.name})` : ""}`).join(". ")}. ${closeColors.length > 1 ? "Those reads sit" : "That read sits"} at lower confidence than the short color.`
      : "";
    const theory = focusTone === "close"
      ? `${spell.name} costs ${pipPhrase(spellPips, focus.color)}${spell.manaCost ? ` (${spell.manaCost})` : ""}. The strict count for that spell on turn ${focus.turn} is about ${focus.needed} ${focus.word} sources, and ${focus.untapped} are untapped by then. ${focus.stretchOnly ? `${focus.steepCards === 1 ? "One card asks" : `${focus.steepCards} cards ask`} for that many pips. The practical count is the one-pip line for the rest of the ${focus.word} spells.` : `The gap is about ${Math.max(1, Math.round(focus.gap))} sources.`} Confidence on this read: ${focus.stretchOnly ? "low" : "medium"}. A land that enters tapped is not mana that turn. A rock counts on the turn after you cast it. Mana locked to one spell type, and ramp that adds only one other color, is not a ${focus.word} source.`
      : `${spell.name} costs ${pipPhrase(spellPips, focus.color)}${spell.manaCost ? ` (${spell.manaCost})` : ""}. On turn ${focus.turn} you have seen ${cardsSeen(focus.turn)} cards. About ${focus.needed} ${focus.word} sources cast that on time. This list has ${focus.untapped} that are actually untapped by then${focus.late ? ` and ${focus.late} that arrive tapped or after that turn` : ""}. ${Math.round(focus.have)} sources put ${pipPhrase(spellPips, focus.color)} in those cards about ${percent}% of the time before mulligans. A land that enters tapped is not mana that turn. A rock counts on the turn after you cast it. Mana locked to one spell type, and ramp that adds only one other color, is not a ${focus.word} source.${closeNote}`;
    const word = focus.word;
    const titled = `${word[0].toUpperCase()}${word.slice(1)}`;
    const alsoWords = colorList(also.map((row) => row.color));
    const alsoTitle = also.length
      ? (also.every((row) => focus.gap - row.gap >= 3)
        ? `${titled} is the short color. ${alsoWords[0].toUpperCase()}${alsoWords.slice(1)} ${also.length > 1 ? "are" : "is"} also short, by less`
        : `${titled} is short. ${alsoWords[0].toUpperCase()}${alsoWords.slice(1)} ${also.length > 1 ? "are" : "is"} short as well`)
      : `Not enough untapped ${word} for this curve`;
    lessons.push({
      id: `color-${focus.color}`,
      title: focusTone === "close" ? `${titled} is a closer call` : alsoTitle,
      theory,
      cards: [{ name: spell.name, quantity: spell.quantity || 1, note: spell.manaCost || "" }],
      excluded: [
        ...shown.map(({ draft, reason }) => ({
          name: draft.name,
          quantity: draft.quantity,
          note: reason.says,
        })),
        ...producers.filter((draft) => draft.recolor && !shown.some((entry) => entry.draft === draft)).map((draft) => ({
          name: draft.name,
          quantity: draft.quantity,
          note: `makes every land a ${draft.recolor.type} only while it is in play, so the other lands are not counted as ${COLOR_WORD[draft.recolor.color]} sources`,
        })),
      ],
      quotes: [
        {
          name: spell.name,
          quantity: spell.quantity || 1,
          quote: spell.manaCost || printedQuote(spell.oracleText, /./) || "No mana cost was printed.",
          says: `${spell.name} needs ${pipPhrase(spellPips, focus.color)} on turn ${focus.turn}.`,
        },
        ...shown.map(({ draft, reason }) => ({
          name: draft.name,
          quantity: draft.quantity,
          quote: reason.quote || printedQuote(draft.text, /add|search your library|enters tapped/i),
          says: reason.says,
        })),
      ],
      swaps: [{
        cut: cut?.name || null,
        add: add.name,
        reason: `${add.name} says “${printedQuote(add.oracleText, /add/i) || add.oracleText}” That mana can pay ${spell.name}, with no spend restriction. ${cut ? `${cut.name} does not: “${shown[0].reason.quote || cut.name}”` : `The list only has ${focus.untapped} untapped ${focus.word} ${focus.untapped === 1 ? "source" : "sources"}.`}`,
      }],
      confidence: focusTone === "close"
        ? (focus.stretchOnly ? "low" : "medium")
        : (focus.gap >= 8 && confidence.level === "high" ? "high" : confidence.level === "low" ? "low" : "medium"),
      confidenceReason: focusTone === "close"
        ? "The strict pip count is real for that spell. Fewer cards ask for it than the color's ordinary spells, so this is a closer call."
        : (focus.gap >= 8 && confidence.level === "high"
          ? "The pip, the turn, and the printed mana abilities are all in the list, and the gap is large."
          : confidence.reason),
    });
  }

  const lowCurve = averageCmc != null && averageCmc <= 2.6;
  if (lowCurve && tappedCount + conditionalCount >= 6 && !lessons.some((lesson) => lesson.id === "taplands")) {
    const sample = [...tappedLands, ...conditionalLands].slice(0, 2);
    const early = colorReports.find((row) => row.turn && row.turn <= 3 && row.status !== "ok") || colorReports.find((row) => row.spell);
    const add = recommendLand(identity, early ? [early.color] : identity.slice(0, 1), used);
    lessons.push({
      id: "taplands",
      title: "The early curve cannot use lands that enter tapped",
      theory: `This curve averages ${averageCmc} mana, so it is trying to cast spells on turn two. A land that enters tapped cannot tap that turn. ${tappedCount} lands always wait, and ${conditionalCount} more enter tapped unless a condition is already true. The land count can look fine while those early spells are still a turn late. A fetch that puts the land on the battlefield tapped is the same kind of wait.`,
      cards: sample.map((draft) => ({ name: draft.name, quantity: draft.quantity, note: untappedWord(draft.timing) })),
      excluded: [],
      quotes: sample.map((draft) => ({
        name: draft.name,
        quantity: draft.quantity,
        quote: printedQuote(draft.text, /enters tapped|battlefield tapped/i) || clean(draft.text).slice(0, 180),
        says: untappedWord(draft.timing),
      })),
      swaps: sample[0] ? [{
        cut: sample[0].name,
        add: add.name,
        reason: `${add.name} says “${printedQuote(add.oracleText, /add/i) || add.oracleText}” It is mana the turn you play it. ${sample[0].name} is not.`,
      }] : [],
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  }

  const notable = [];
  for (const draft of producers) {
    const restricted = draft.windows.find((window) => window.restriction);
    const opponent = draft.windows.some((window) => window.opponent);
    const only = singleColor(draft);
    if (restricted) notable.push({ draft, note: `adds mana that can be spent only on ${restricted.restriction.label}, so it is not a generic source` });
    else if (opponent) notable.push({ draft, note: "takes its color from an opponent's land, so it is not fixing" });
    else if (only && identity.length >= 2 && !identity.every((color) => color === only)) notable.push({ draft, note: `adds ${COLOR_WORD[only]} only, so it is not a generic source` });
    else if (!draft.land && draft.windows.some((window) => window.colorless && !window.colors.length && !window.restriction && !window.opponent)) notable.push({ draft, note: `adds colorless mana, so it is acceleration and not a ${colorList(identity)} source` });
    else if (draft.recolor) notable.push({ draft, note: `makes every land a ${draft.recolor.type} only while it is in play, so the other lands are not counted as ${COLOR_WORD[draft.recolor.color]} sources` });
    else if (draft.grantsAnyColor && isGenericColored(draft, identity)) notable.push({ draft, note: "adds any color itself. The line that recolors your lands works only while this permanent is in play, so the lands were not all counted as every color" });
  }
  if (!lessons.length) {
    lessons.push({
      id: "balanced",
      title: "The mana can cast this curve",
      theory: `${primary?.name || "This deck"} averages ${averageCmc} mana and runs ${landCount} lands, inside ${range.low}–${range.high}. ${(range.rockRelief || 0) + (range.rampRelief || 0) >= 0.5 && range.baselineLow > range.low ? `Without the ramp package the target would be ${range.baselineLow}–${range.baselineHigh}. ` : ""}${reductionNote ? `${reductionNote} ` : ""}${untappedLandCount} of those lands can tap the turn they arrive. ${rockCredit ? `Cheap rocks and dorks add about ${rockCredit} mana, which is acceleration` : "There is little cheap ramp"}, and ${landRampCount ? `${landRampCount} land-ramp ${landRampCount === 1 ? "spell searches" : "spells search"} for a land that is already in the deck` : "no spell is being counted as an extra land"}. Color sources are counted only when the printed text can pay that color on the turn the pip comes due.`,
      cards: untappedLands.slice(0, 4).map((draft) => ({ name: draft.name, quantity: draft.quantity, note: "untapped source" })),
      excluded: notable.slice(0, 4).map(({ draft, note }) => ({ name: draft.name, quantity: draft.quantity, note })),
      quotes: notable.slice(0, 2).map(({ draft }) => ({
        name: draft.name,
        quantity: draft.quantity,
        quote: printedQuote(draft.text, /add|spend this mana only|opponent/i) || clean(draft.text).slice(0, 180),
        says: notable.find((entry) => entry.draft === draft)?.note || "",
      })),
      swaps: [],
      confidence: confidence.level,
      confidenceReason: confidence.reason,
    });
  } else if (notable.length && !lessons.some((lesson) => lesson.excluded?.length)) {
    lessons[0].excluded = notable.slice(0, 3).map(({ draft, note }) => ({ name: draft.name, quantity: draft.quantity, note }));
  }

  const modalLandCount = lands.filter((draft) => draft.modalLand).reduce((sum, draft) => sum + draft.quantity, 0);
  const landSummary = averageCmc == null
    ? "There is not enough printed mana cost to judge the land count."
    : `${landCount} lands. This curve wants about ${range.low}–${range.high}.${(range.rockRelief || 0) + (range.rampRelief || 0) >= 0.5 && range.baselineLow > range.low ? ` Without the ramp package it would want about ${range.baselineLow}–${range.baselineHigh}.` : ""} ${untappedLandCount} can tap the turn they arrive, ${tappedCount} ${tappedCount === 1 ? "enters" : "enter"} tapped, and ${conditionalCount} ${conditionalCount === 1 ? "enters" : "enter"} tapped unless a condition is already true. Cheap rocks and dorks add about ${rockCredit} mana. ${landRampCount} ${landRampCount === 1 ? "spell puts" : "spells put"} a land from the deck onto the battlefield.${modalLandCount ? ` ${modalLandCount} of the lands can also be cast as a spell. The land face is the one counted.` : ""}${reductionNote ? ` ${reductionNote}` : ""}`;

  const problem = shortColors[0];
  const watch = closeColors[0];
  const watchSentence = closeColors.length
    ? `${closeColors.map((row) => `${row.word[0].toUpperCase()}${row.word.slice(1)} is a closer call${row.spell ? `, on ${row.spell.name}` : ""}`).join(". ")}. Confidence on ${closeColors.length > 1 ? "those reads" : "that read"} is ${closeColors.some((row) => row.downgraded && !row.stretchOnly) ? "medium" : "low"}.`
    : "";
  const summary = !problem && landsState === "ok"
    ? `${primary?.name || "This list"} can cast ${watch ? "the ordinary curve" : "its curve"} from the mana that is actually printed. ${landCount} lands sit inside ${range.low}–${range.high}, and the color pips have untapped sources on the turn they come due.${watchSentence ? ` ${watchSentence}` : ""}`
    : [
      landsState === "short" ? `${landCount} lands is short of the ${range.low}–${range.high} this ${averageCmc}-mana curve wants.` : "",
      landsState === "over" ? `${landCount} lands is more than the ${range.low}–${range.high} this curve wants.` : "",
      problem ? `${problem.spell.name} needs ${pipPhrase(problem.pipsOnSpell, problem.color)} on turn ${problem.turn}, and ${problem.untapped} untapped ${problem.word} ${problem.untapped === 1 ? "source" : "sources"} will not do it.` : "",
      shortColors.length > 1 ? `${shortColors[0].word[0].toUpperCase()}${shortColors[0].word.slice(1)} is the short color. ${colorList(shortColors.slice(1).map((row) => row.color))} ${shortColors.length > 2 ? "are" : "is"} also short${shortColors.slice(1).every((row) => shortColors[0].gap - row.gap >= 3) ? ", by less" : ""}.` : "",
      watchSentence,
    ].filter(Boolean).join(" ");

  return {
    readable: true,
    commanderName: primary?.name || "",
    identity,
    summary,
    partial,
    confidence,
    lands: {
      count: landCount,
      untapped: untappedLandCount,
      tapped: tappedCount,
      conditional: conditionalCount,
      earlyRocks: rockCredit,
      landRamp: landRampCount,
      extraLandDrops: extraDrops,
      landfall,
      averageCmc,
      modalLands: modalLandCount,
      targetLow: range.low,
      targetHigh: range.high,
      baselineLow: range.baselineLow,
      baselineHigh: range.baselineHigh,
      status: landsState,
      summary: landSummary,
    },
    colors: colorReports,
    lessons: lessons.slice(0, 4),
    notGeneric: notable.slice(0, 6).map(({ draft, note }) => ({ name: draft.name, quantity: draft.quantity, note })),
  };
}

export function formatManaBaseCoaching(report) {
  if (!report?.readable) return report?.message || "Paste the decklist with printed mana costs and Oracle text before I judge the mana base.";
  const lines = [];
  lines.push(`Mana base — ${report.commanderName || "this Commander list"}`);
  lines.push("");
  lines.push(report.summary);
  lines.push(`Confidence: ${report.confidence.level}. ${report.confidence.reason}`);
  lines.push("");
  lines.push(`Lands: ${report.lands.summary}`);
  if (report.colors.length) {
    lines.push("");
    lines.push("Colors, from printed pips and the turn those pips come due:");
    for (const color of report.colors) {
      if (!color.spell) {
        lines.push(`${color.word}: no pips.`);
        continue;
      }
      const statusLabel = { ok: "in range", short: "short", tight: "close", over: "heavy" };
      lines.push(`${color.word}: ${color.pips} pips. ${color.untapped} untapped sources by turn ${color.turn}, about ${color.needed} wanted (${statusLabel[color.status] || color.status}). ${color.summary}`);
    }
  }
  for (const lesson of report.lessons) {
    lines.push("");
    lines.push(lesson.title);
    lines.push(`Theory: ${lesson.theory}`);
    if (lesson.cards?.length) lines.push(`Cards: ${lesson.cards.map((card) => (card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name)).join(", ")}.`);
    if (lesson.excluded?.length) lines.push(`Not counted: ${lesson.excluded.map((card) => `${card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name} (${card.note})`).join("; ")}.`);
    for (const quote of lesson.quotes || []) {
      const label = quote.quantity > 1 ? `${quote.quantity} ${quote.name}` : quote.name;
      lines.push(`From the deck: ${label} — “${quote.quote}” ${quote.says}`);
    }
    lines.push(`Confidence: ${lesson.confidence}. ${lesson.confidenceReason}`);
    for (const swap of lesson.swaps || []) {
      const move = swap.cut && swap.add
        ? `Swap: cut ${swap.cut} for ${swap.add}.`
        : swap.add
          ? `Swap: add ${swap.add}.`
          : `Swap: cut ${swap.cut}.`;
      lines.push(move);
      if (swap.reason) lines.push(`Why: ${swap.reason}`);
    }
  }
  return lines.join("\n");
}
