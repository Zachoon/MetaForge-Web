// Guided finish (feat/guided-finish): the last part of a guided build is
// walked through with the player like every other step. Nothing here picks
// cards on its own. It reasons about the mana base and the open slots and
// returns proposals; the player adjusts and confirms each one, and the deck
// only counts as complete once every slot has been confirmed.
//
// Pure functions shared by the Worker (worker/forge-guided-build.ts's finish
// endpoint, worker/guided-draft.ts's completion gate) and the client.
// Deliberately free of engine imports: the client bundles this module, and
// pulling native-masterwork-engine.mjs in would ship the whole engine.
import { opponentDependentAddClause } from "./opponent-mana.mjs";

// Largest-remainder split of `slots` across colors by pip demand; an even
// split when there is no pip signal at all.
function proportionalBasicCounts(colors, pipTotals, slots) {
  const relevant = colors.filter((color) => (pipTotals[color] || 0) > 0);
  const counts = {};
  if (!relevant.length) {
    for (let index = 0; index < slots; index += 1) counts[colors[index % colors.length]] = (counts[colors[index % colors.length]] || 0) + 1;
    return counts;
  }
  const total = relevant.reduce((sum, color) => sum + pipTotals[color], 0);
  const shares = relevant.map((color) => ({ color, exact: (pipTotals[color] / total) * slots }));
  let assigned = 0;
  for (const { color, exact } of shares) { counts[color] = Math.floor(exact); assigned += counts[color]; }
  shares.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let index = 0; assigned < slots; index += 1, assigned += 1) counts[shares[index % shares.length].color] += 1;
  return counts;
}

export const BASIC_BY_COLOR = Object.freeze({ W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest", C: "Wastes" });
export const COLOR_BY_BASIC = Object.freeze(Object.fromEntries(Object.entries(BASIC_BY_COLOR).map(([color, name]) => [name, color])));
export const FINISH_STAGES = Object.freeze(["mana", "slots", "review"]);
const COLOR_NAMES = Object.freeze({ W: "white", U: "blue", B: "black", R: "red", G: "green", C: "colorless" });
const MAX_BASIC_COPIES = 99;

const nameKey = (name) => String(name || "").normalize("NFKC").trim().toLocaleLowerCase("en");
const cardOf = (entry) => entry?.card || entry || {};
const typeLineOf = (entry) => String(cardOf(entry).typeLine || cardOf(entry).type_line || entry?.typeLine || "");
const oracleOf = (entry) => String(cardOf(entry).oracleText || cardOf(entry).oracle_text || entry?.oracleText || "");
export const isLandEntry = (entry) => /\bLand\b/.test(typeLineOf(entry));
export const isBasicLandName = (name) => Object.prototype.hasOwnProperty.call(COLOR_BY_BASIC, String(name || "").replace(/^Snow-Covered\s+/i, ""));

/** Sum of every basic land copy in a basics map ({Plains: 9, Island: 8}). */
export function basicsTotal(basics) {
  if (!basics || typeof basics !== "object") return 0;
  return Object.values(basics).reduce((sum, value) => sum + (Number.isInteger(value) && value > 0 ? value : 0), 0);
}

export function validBasics(basics) {
  if (basics == null) return true;
  if (typeof basics !== "object" || Array.isArray(basics)) return false;
  return Object.entries(basics).every(([name, count]) => isBasicLandName(name) && Number.isInteger(count) && count >= 0 && count <= MAX_BASIC_COPIES);
}

/** Shape check for the optional finish block a guided draft carries. */
export function validFinishState(finish) {
  if (finish == null) return true;
  return Boolean(typeof finish === "object" && !Array.isArray(finish)
    && FINISH_STAGES.includes(finish.stage)
    && validBasics(finish.basics)
    && (finish.manaConfirmed === undefined || typeof finish.manaConfirmed === "boolean")
    && (finish.landTarget == null || (Number.isInteger(finish.landTarget) && finish.landTarget >= 0 && finish.landTarget <= 99)));
}

/**
 * How many land slots this deck should run, and why. Starts from the usual
 * Commander baseline scaled to the deck size, then reasons from what the
 * player actually picked: the curve, how much ramp there is, and whether
 * the deck rewards extra land drops.
 */
/** @param {{ deckTarget?: number, nonlandRows?: any[] }} [options] */
export function recommendLandCount({ deckTarget = 100, nonlandRows = [] } = {}) {
  const base = deckTarget >= 90 ? 37 : Math.round(deckTarget * 0.4);
  const reasons = [`A ${deckTarget}-card deck usually starts around ${base} lands.`];
  let count = base;
  const spells = nonlandRows.filter((row) => !isLandEntry(row));
  if (spells.length >= 8) {
    const average = spells.reduce((sum, row) => sum + (Number(row.cmc ?? cardOf(row).cmc) || 0), 0) / spells.length;
    const shown = average.toFixed(1);
    if (average >= 4.2) { count += 2; reasons.push(`Your picks average ${shown} mana, which is heavy, so +2.`); }
    else if (average >= 3.6) { count += 1; reasons.push(`Your picks average ${shown} mana, a little top-heavy, so +1.`); }
    else if (average <= 2.2) { count -= 2; reasons.push(`Your picks average only ${shown} mana, so -2.`); }
    else if (average <= 2.6) { count -= 1; reasons.push(`Your picks average a low ${shown} mana, so -1.`); }
    else reasons.push(`Your picks average ${shown} mana, a normal curve, so no change.`);
  } else {
    reasons.push("You haven't picked enough spells to read your curve yet, so this stays at the baseline.");
  }
  const ramp = spells.filter((row) => (row.roles || []).includes("ramp")).length;
  if (ramp >= 10) { count -= 2; reasons.push(`${ramp} ramp pieces cover for missing land drops, so -2.`); }
  else if (ramp >= 7) { count -= 1; reasons.push(`${ramp} ramp pieces cover for a missing land drop, so -1.`); }
  else if (ramp <= 3 && spells.length >= 20) { count += 1; reasons.push(`Only ${ramp} ramp ${ramp === 1 ? "piece" : "pieces"}, so +1 to hit your land drops.`); }
  const landPayoffs = spells.filter((row) => /landfall|whenever a land (?:you control )?enters|play an additional land/i.test(oracleOf(row))).length;
  if (landPayoffs >= 3) { count += 1; reasons.push(`${landPayoffs} cards reward land drops, so +1.`); }
  const min = Math.round(deckTarget * 0.3);
  const max = Math.round(deckTarget * 0.44);
  const clamped = Math.min(max, Math.max(min, count));
  if (clamped !== count) reasons.push(`Kept within the safe range of ${min}-${max}.`);
  return { count: clamped, baseline: base, reasons };
}

function pipTotalsOf(rows) {
  const totals = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const row of rows) {
    const pips = row?.colorPips || {};
    for (const color of Object.keys(totals)) totals[color] += Number(pips[color]) || 0;
  }
  return totals;
}

export function producedColors(entry) {
  const card = cardOf(entry);
  const text = oracleOf(entry);
  // Opponent-dependent mana is not five-color fixing, even when a card fact
  // lists every color the ability could theoretically add.
  if ([...text.matchAll(/\badd\b([^.]*)/gi)].some((match) => opponentDependentAddClause(match[1]))) {
    const produced = new Set();
    for (const match of text.matchAll(/\badd\b([^.]*)/gi)) {
      if (opponentDependentAddClause(match[1])) continue;
      for (const symbol of match[1].match(/\{([WUBRGC])\}/g) || []) produced.add(symbol[1]);
    }
    const basicTypes = typeLineOf(entry).match(/Plains|Island|Swamp|Mountain|Forest/g) || [];
    for (const type of basicTypes) produced.add(COLOR_BY_BASIC[type]);
    return [...produced];
  }
  const produced = new Set(Array.isArray(card.producedMana || card.produced_mana) ? (card.producedMana || card.produced_mana) : []);
  if (!produced.size) {
    for (const match of text.matchAll(/\{([WUBRGC])\}/g)) if (/add\b/i.test(text)) produced.add(match[1]);
    if (/any color|mana of any type/i.test(text)) for (const color of ["W", "U", "B", "R", "G"]) produced.add(color);
    const basicTypes = typeLineOf(entry).match(/Plains|Island|Swamp|Mountain|Forest/g) || [];
    for (const type of basicTypes) produced.add(COLOR_BY_BASIC[type]);
  }
  return [...produced];
}

/** How many sources of each color the land base should aim for. */
/** @param {{ colors?: string[], spellRows?: any[], landCount?: number }} [options] */
export function colorSourceTargets({ colors = [], spellRows = [], landCount = 37 } = {}) {
  const pips = pipTotalsOf(spellRows);
  const relevant = colors.filter((color) => color !== "C");
  const total = relevant.reduce((sum, color) => sum + pips[color], 0);
  const floor = relevant.length <= 1 ? landCount : Math.max(5, Math.round(landCount * 0.22));
  return relevant.map((color) => {
    const share = total ? pips[color] / total : 1 / relevant.length;
    const target = relevant.length <= 1 ? landCount : Math.min(landCount, Math.max(floor, Math.round(landCount * share * 1.25)));
    return { color, pips: pips[color], share: Math.round(share * 100), target };
  });
}

/** Sources each color currently has from confirmed land picks plus basics. */
/** @param {any[]} [landRows] @param {Record<string, number>} [basics] */
export function countColorSources(landRows = [], basics = {}) {
  const counts = {};
  for (const row of landRows) for (const color of producedColors(row)) counts[color] = (counts[color] || 0) + 1;
  for (const [name, count] of Object.entries(basics || {})) {
    const color = COLOR_BY_BASIC[String(name).replace(/^Snow-Covered\s+/i, "")];
    if (color && count > 0) counts[color] = (counts[color] || 0) + count;
  }
  return counts;
}

function utilityLandReason(entry, colors, pips) {
  const produced = producedColors(entry).filter((color) => colors.includes(color));
  const text = oracleOf(entry);
  if ([...text.matchAll(/\badd\b([^.]*)/gi)].some((match) => opponentDependentAddClause(match[1]))) {
    return "Makes a color an opponent's land could produce, so it is not counted as color fixing.";
  }
  const tapped = /enters (?:the battlefield )?tapped/i.test(text) && !/unless/i.test(text);
  const parts = [];
  if (produced.length >= 2) {
    const ranked = [...produced].sort((a, b) => (pips[b] || 0) - (pips[a] || 0));
    parts.push(`Fixes ${ranked.map((color) => COLOR_NAMES[color]).join(" and ")}`);
  }
  const utility = text.split(/\n/).find((line) => !/^\(?\{T\}: Add/i.test(line) && /\{T\}|sacrifice|:/i.test(line) && !/enters (?:the battlefield )?tapped/i.test(line));
  if (utility) parts.push(`does something extra: ${utility.replace(/[()]/g, "").slice(0, 120)}`);
  if (tapped) parts.push("enters tapped");
  return parts.length ? `${parts.join("; ")}.` : "A land that fits your colors.";
}

/**
 * Ranks nonbasic lands from the pool the Forge already read for this
 * commander. These are suggestions the player accepts one at a time, not
 * an auto-filled mana base.
 */
/** @param {{ lands?: any[], colors?: string[], spellRows?: any[], exclude?: string[], limit?: number }} [options] */
export function rankUtilityLands({ lands = [], colors = [], spellRows = [], exclude = [], limit = 6 } = {}) {
  const pips = pipTotalsOf(spellRows);
  const totalPips = Object.values(pips).reduce((sum, value) => sum + value, 0) || 1;
  const skip = new Set(exclude.map(nameKey));
  const identity = colors.length ? colors : ["C"];
  return lands
    .filter((entry) => {
      const card = cardOf(entry);
      const id = card.colorIdentity || card.color_identity || [];
      return card.name && !isBasicLandName(card.name) && !skip.has(nameKey(card.name)) && id.every((color) => identity.includes(color));
    })
    .map((entry) => {
      const produced = producedColors(entry).filter((color) => identity.includes(color));
      const text = oracleOf(entry);
      const fit = produced.reduce((sum, color) => sum + (pips[color] || 0), 0) / totalPips;
      const tapped = /enters (?:the battlefield )?tapped/i.test(text) && !/unless/i.test(text) ? 0.6 : 0;
      const utility = text.split(/\n/).some((line) => !/^\(?\{T\}: Add/i.test(line) && /\{T\}|sacrifice/i.test(line)) ? 0.5 : 0;
      const fixing = identity.length > 1 ? Math.max(0, produced.length - 1) * 0.8 : 0;
      return { entry, score: fit * 2 + fixing + utility - tapped + (Number(entry.score) || 0) * 0.001 };
    })
    .sort((a, b) => b.score - a.score || cardOf(a.entry).name.localeCompare(cardOf(b.entry).name))
    .slice(0, limit)
    .map(({ entry }) => {
      const card = cardOf(entry);
      return {
        name: card.name,
        typeLine: typeLineOf(entry),
        oracleText: oracleOf(entry),
        produces: producedColors(entry),
        reason: utilityLandReason(entry, identity, pips),
      };
    });
}

/** Proposed basics split for the land slots the player's own lands leave. */
/** @param {{ colors?: string[], spellRows?: any[], basicSlots?: number }} [options] */
export function proposeBasics({ colors = [], spellRows = [], basicSlots = 0 } = {}) {
  const slots = Math.max(0, basicSlots);
  if (!slots) return {};
  const relevant = colors.filter((color) => color !== "C");
  if (!relevant.length) return { Wastes: slots };
  const counts = proportionalBasicCounts(relevant, pipTotalsOf(spellRows), slots);
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0).map(([color, count]) => [BASIC_BY_COLOR[color], count]));
}

/**
 * The full mana-base proposal for the finish step: land count with its
 * reasoning, per-color source targets, ranked utility lands, and a basics
 * split the player edits before confirming.
 */
/** @param {{ deckTarget?: number, colors?: string[], pickedRows?: any[], poolLands?: any[], landTarget?: number | null }} [options] */
export function proposeManaBase({ deckTarget = 100, colors = [], pickedRows = [], poolLands = [], landTarget = null } = {}) {
  const spellRows = pickedRows.filter((row) => !isLandEntry(row));
  const landRows = pickedRows.filter(isLandEntry);
  const recommendation = recommendLandCount({ deckTarget, nonlandRows: spellRows });
  const target = Number.isInteger(landTarget) ? landTarget : recommendation.count;
  const basicSlots = Math.max(0, target - landRows.length);
  const basics = proposeBasics({ colors, spellRows, basicSlots });
  return {
    landCount: recommendation,
    landTarget: target,
    landsPicked: landRows.map((row) => cardOf(row).name),
    basicSlots,
    basics,
    colorSources: colorSourceTargets({ colors, spellRows, landCount: target }).map((row) => ({
      ...row,
      current: countColorSources(landRows, basics)[row.color] || 0,
    })),
    utilityLands: rankUtilityLands({ lands: poolLands, colors, spellRows, exclude: landRows.map((row) => cardOf(row).name) }),
  };
}

/**
 * Where a guided deck stands: confirmed cards, the size it needs to reach,
 * and how many slots are still open. Commanders count toward the size.
 */
/** @param {{ deckTarget?: number, commanderCount?: number, picks?: string[], basics?: Record<string, number> }} [options] */
export function finishStatus({ deckTarget = 100, commanderCount = 1, picks = [], basics = {} } = {}) {
  const confirmed = commanderCount + picks.length + basicsTotal(basics);
  return { deckTarget, confirmed, open: Math.max(0, deckTarget - confirmed), over: Math.max(0, confirmed - deckTarget) };
}

/** Main-deck text built only from the player's confirmed picks and basics. */
/** @param {string[]} [picks] @param {Record<string, number>} [basics] */
export function finishedDeckText(picks = [], basics = {}) {
  const lines = picks.map((name) => `1 ${name}`);
  for (const [name, count] of Object.entries(basics || {})) if (Number.isInteger(count) && count > 0) lines.push(`${count} ${name}`);
  return lines.join("\n");
}

/**
 * Server-side completion gate: a deck may only be finished once the mana
 * base was confirmed and every slot holds a card the player chose.
 */
/** @param {{ deckTarget: number, commanderCount: number, picks: string[], finish: any }} options */
export function finishGate({ deckTarget, commanderCount, picks, finish }) {
  if (!finish || finish.stage !== "review" || finish.manaConfirmed !== true) {
    return { ok: false, error: "Confirm your mana base and fill every open slot before finishing." };
  }
  const status = finishStatus({ deckTarget, commanderCount, picks, basics: finish.basics });
  if (status.open) return { ok: false, error: `${status.open} ${status.open === 1 ? "slot is" : "slots are"} still open. Choose ${status.open === 1 ? "a card" : "cards"} for ${status.open === 1 ? "it" : "them"} first.`, status };
  if (status.over) return { ok: false, error: `The deck has ${status.over} too many ${status.over === 1 ? "card" : "cards"}. Remove some before finishing.`, status };
  return { ok: true, status };
}
