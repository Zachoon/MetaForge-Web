// Free-build coaching
// --------------------
// A partial Commander list, scored with the same deck profile and the same
// suggestion ranker the guided build already uses. This module only reads.
// It never inserts a card. Ghost proposals are a separate list so they cannot
// change role, type, or curve counts until the player accepts one.

import { classifyNativeCard } from "./card-role-classification.mjs";
import { deckDisplaySection } from "./deck-display-classification.mjs";
import { describeGuidedReason } from "./guided-reason-copy.mjs";
import { suggestCardForCategory } from "./guided-suggestion.mjs";
import { buildDeckProfile } from "./reasoning-engine/deck-profile.mjs";
import { buildReasoningContext } from "./reasoning-engine/index.mjs";
import { fundamentalTargetFor } from "./fundamentals-target-table.mjs";

const STEP_ORDER = Object.freeze([
  ["lands", "lands", "lands"],
  ["ramp", "ramp", "ramp"],
  ["draw", "draw", "draw"],
  ["interaction", "interaction", "removal"],
  ["wipes", "wipes", "wipes"],
  ["wincons", "wincons", "winConditions"],
  ["protection", "protection", "protection"],
  ["recursion", "recursion", "recursion"],
  ["synergy", "synergy", "plan"],
]);

// Suggestion-engine category for a step that can propose a card.
// Curve is a count, not a card category. Lands are filled from basics in
// the commander's colors because the ranker has no land category.
const SUGGEST_CATEGORY = Object.freeze({
  ramp: "ramp",
  draw: "draw",
  interaction: "interaction",
  wipes: "sweeper",
  wincons: "winConditions",
  protection: "protection",
  recursion: "recursion",
  synergy: "synergyPieces",
});

const FUNDAMENTAL_TIER_ROLE = Object.freeze({
  ramp: "ramp",
  draw: "draw",
  interaction: "interaction",
  wipes: "sweeper",
  protection: "protection",
  recursion: "recursion",
});

const BASIC_NAMES = Object.freeze({
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
});
const BASIC_TYPE_COLOR = Object.freeze({
  Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G",
});

/** Color identity from the printed field plus basic land types and mana symbols in the text. */
export function rulesIdentity(card = {}) {
  const colors = new Set(card.colorIdentity || card.color_identity || card.card?.colorIdentity || []);
  const text = `${card.typeLine || card.type_line || ""} ${card.oracleText || card.oracle_text || ""}`;
  for (const [type, color] of Object.entries(BASIC_TYPE_COLOR)) {
    if (new RegExp(`\\b${type}\\b`).test(text)) colors.add(color);
  }
  for (const symbol of text.matchAll(/\{([WUBRG])(?:\/[WUBRGP])?\}/g)) colors.add(symbol[1]);
  for (const symbol of text.matchAll(/\{[WUBRG]\/([WUBRG])\}/g)) colors.add(symbol[1]);
  return [...colors];
}

const BASIC_KEYS = new Set([
  "plains", "island", "swamp", "mountain", "forest", "wastes",
  "snow-covered plains", "snow-covered island", "snow-covered swamp",
  "snow-covered mountain", "snow-covered forest",
]);

export function cardKey(name = "") {
  return String(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function entryName(entry) {
  return entry?.card?.name || entry?.name || "";
}

function expandCopies(entries = []) {
  const expanded = [];
  for (const entry of entries) {
    const copies = Math.max(1, Math.min(99, Number(entry?.quantity) || 1));
    for (let index = 0; index < copies; index += 1) expanded.push(entry);
  }
  return expanded;
}

function withoutCommanders(entries, commanders) {
  const names = new Set(commanders.map((commander) => cardKey(entryName(commander))).filter(Boolean));
  return entries.filter((entry) => !names.has(cardKey(entryName(entry))));
}

function round3(value) {
  return Number(Number(value).toFixed(3));
}

function stepFromRow(id, label, row, order, tier, deckSize) {
  let target = row?.target || { min: 0, max: 0 };
  const fundamental = FUNDAMENTAL_TIER_ROLE[id];
  if (fundamental && tier) {
    const adjusted = fundamentalTargetFor(fundamental, tier, deckSize);
    if (adjusted) target = adjusted;
  }
  const actual = Number(row?.actual) || 0;
  const missing = Math.max(0, target.min - actual);
  const status = actual < target.min ? "under" : actual > target.max ? "over" : "ok";
  return {
    id,
    label,
    order,
    actual,
    target: target.min,
    targetMax: target.max,
    missing,
    status,
    urgency: target.min ? round3(missing / target.min) : 0,
    done: actual >= target.min,
    countText: `${actual}/${target.min}`,
  };
}

function curveStep(profile) {
  const early = (profile.curve.buckets[0] || 0) + (profile.curve.buckets[1] || 0);
  const target = (profile.curve.targets[0] || 0) + (profile.curve.targets[1] || 0);
  const judged = profile.nonland >= 8;
  const missing = Math.max(0, target - early);
  const issues = profile.curve.issues || [];
  const done = Boolean(judged && early >= target && !issues.length);
  return {
    id: "curve",
    label: "curve",
    order: 8,
    actual: early,
    target,
    targetMax: target,
    missing: judged ? missing : 0,
    status: !judged ? "waiting" : done ? "ok" : "under",
    urgency: judged && target ? round3(missing / target) : 0,
    done,
    countText: `${early}/${target}`,
    note: judged
      ? (issues.length ? issues.join(", ") : "Early plays are in range.")
      : "Counted now. Judged once the list has 8 nonland cards.",
  };
}

function typeOf(entry) {
  const typeLine = entry?.typeLine || entry?.type_line || entry?.card?.typeLine || "";
  return deckDisplaySection({ type_line: typeLine });
}

/** @param {any[]} [entries] */
export function typeCounts(entries = []) {
  const counts = {
    Creatures: 0, Planeswalkers: 0, Instants: 0, Sorceries: 0,
    Artifacts: 0, Enchantments: 0, Battles: 0, Lands: 0, Other: 0,
  };
  for (const entry of entries) {
    const copies = Math.max(1, Math.min(99, Number(entry?.quantity) || 1));
    const section = typeOf(entry);
    if (counts[section] === undefined) counts.Other += copies;
    else counts[section] += copies;
  }
  return counts;
}

/**
 * Ranked read of a partial list. Counts come from buildDeckProfile.
 * When a stored power tier is set, ramp/draw/interaction/wipes/protection/
 * recursion use that tier's fundamental targets. Synergy stays a waiting
 * count until the plan itself has enough confidence to rank.
 */
/**
 * @param {{ entries?: any[], commanders?: any[], strategy?: string, targetPowerTier?: string, deckSize?: number }} [input]
 */
export function diagnoseFreeDeck(input = {}) {
  const {
    entries = [],
    commanders = [],
    strategy = "",
    targetPowerTier = "",
    deckSize = 100,
  } = input;
  const picks = expandCopies(withoutCommanders(entries, commanders));
  const profile = buildDeckProfile({
    commanders,
    picks,
    deckSize,
    hints: String(strategy || ""),
    colorIdentity: [...new Set(commanders.flatMap((commander) => commander.colorIdentity || commander.colors || []))],
  });
  const byRole = new Map(profile.roles.map((row) => [row.role, row]));
  const tier = fundamentalTargetFor("ramp", targetPowerTier, deckSize) ? targetPowerTier : "";
  const steps = STEP_ORDER.map(([id, label, role], order) => stepFromRow(id, label, byRole.get(role), order, tier, deckSize));
  const synergy = steps.find((step) => step.id === "synergy");
  const planForming = (profile.plan?.confidence || 0) < 0.45 && (synergy?.actual || 0) === 0;
  if (synergy && planForming) {
    synergy.status = "waiting";
    synergy.urgency = 0;
    synergy.done = false;
    synergy.missing = 0;
  }
  steps.push(curveStep(profile));
  steps.sort((left, right) => Number(left.done) - Number(right.done)
    || right.urgency - left.urgency
    || right.missing - left.missing
    || left.order - right.order);
  const current = steps.find((step) => !step.done) || null;
  return {
    strategy: String(strategy || ""),
    targetPowerTier: tier,
    plan: profile.plan,
    curve: profile.curve,
    types: typeCounts(withoutCommanders(entries, commanders)),
    steps,
    currentId: current?.id || null,
    cardCount: picks.length,
  };
}

/**
 * @param {any} card
 * @param {{ commanders?: any[], existing?: any[] }} [context]
 */
export function additionIssue(card, context = {}) {
  const { commanders = [], existing = [] } = context;
  const name = entryName(card);
  if (!name) return "That card has no name.";
  if (commanders.some((commander) => cardKey(entryName(commander)) === cardKey(name))) {
    return `${name} is already the commander.`;
  }
  if (commanders.length) {
    const identity = new Set(commanders.flatMap((commander) => commander.colorIdentity || commander.colors || []));
    const off = rulesIdentity(card).filter((color) => !identity.has(color));
    if (off.length) return `Outside your commander's colors (${off.join("")}).`;
  }
  if (card.legal === false) return `${name} is not legal in Commander.`;
  const copies = existing
    .filter((entry) => cardKey(entryName(entry)) === cardKey(name))
    .reduce((sum, entry) => sum + (Number(entry.quantity) || 1), 0);
  if (copies >= 1 && !BASIC_KEYS.has(cardKey(name))) return "Commander allows one copy of this card.";
  return null;
}

function asCandidate(card) {
  const name = entryName(card);
  const typeLine = card.typeLine || card.type_line || card.card?.typeLine || "";
  const oracleText = card.oracleText || card.oracle_text || card.card?.oracleText || "";
  const manaCost = card.manaCost || card.mana_cost || card.card?.manaCost || "";
  const cmc = Number(card.cmc ?? card.card?.cmc) || 0;
  const colorIdentity = card.colorIdentity || card.color_identity || card.card?.colorIdentity || [];
  const face = { name, typeLine, oracleText, manaCost, cmc, colorIdentity };
  return { ...face, roles: card.roles || classifyNativeCard(face), card: face };
}

function inIdentity(card, commanders) {
  if (!commanders.length) return true;
  const identity = new Set(commanders.flatMap((commander) => commander.colorIdentity || commander.colors || []));
  return rulesIdentity(card).every((color) => identity.has(color));
}

function oneLine(reason, name) {
  const text = describeGuidedReason(reason, name).replace(/\s+/g, " ").trim();
  const sentence = text.split(/(?<=\.)\s+/)[0] || text;
  return sentence;
}

function faceOf(candidate, caption, section) {
  const card = candidate.card || candidate;
  return {
    name: card.name,
    typeLine: card.typeLine || "",
    oracleText: card.oracleText || "",
    manaCost: card.manaCost || "",
    cmc: card.cmc || 0,
    colorIdentity: card.colorIdentity || [],
    image: candidate.image || card.image || "",
    section: section || deckDisplaySection({ type_line: card.typeLine || "" }),
    caption,
  };
}

function landFace(commanders, pool) {
  const colors = [...new Set(commanders.flatMap((commander) => commander.colorIdentity || commander.colors || []))];
  const wanted = new Set((colors.length ? colors : ["W"]).map((color) => BASIC_NAMES[color]).filter(Boolean));
  const fromPool = pool.find((card) => wanted.has(card.name) && (card.roles || []).includes("land"));
  if (fromPool) return fromPool;
  const name = [...wanted][0];
  if (!name) return null;
  const color = Object.entries(BASIC_NAMES).find(([, basic]) => basic === name)?.[0] || "C";
  return asCandidate({
    name,
    typeLine: `Basic Land — ${name}`,
    oracleText: `{T}: Add {${color}}.`,
    manaCost: "",
    cmc: 0,
    colorIdentity: color === "C" ? [] : [color],
    image: "",
  });
}

/**
 * Proposed additions for the open steps, in the same order as the diagnosis.
 * Each ghost keeps a runner-up from a second ranker call. Nothing here is
 * part of the list.
 */
/**
 * @param {{ diagnosis?: any, entries?: any[], pool?: any[], commanders?: any[], skipped?: string[], targetPowerTier?: string }} [input]
 */
export function buildGhostQueue(input = {}) {
  const {
    diagnosis,
    entries = [],
    pool = [],
    commanders = [],
    skipped = [],
    targetPowerTier = "",
  } = input;
  if (!diagnosis?.steps) return [];
  const partial = withoutCommanders(entries, commanders).map(asCandidate);
  const skippedKeys = new Set(skipped.map(cardKey));
  const used = new Set([
    ...partial.map((row) => cardKey(row.name)),
    ...commanders.map((commander) => cardKey(entryName(commander))),
  ]);
  const legalPool = pool
    .map(asCandidate)
    .filter((card) => card.name && inIdentity(card, commanders) && card.legal !== false && !used.has(cardKey(card.name)) && !skippedKeys.has(cardKey(card.name)));
  const intent = { packages: [], targetPowerTier: targetPowerTier || diagnosis.targetPowerTier || null };
  const reasoningContext = buildReasoningContext({
    commanders,
    picks: partial,
    deckSize: 100,
    hints: String(diagnosis.strategy || ""),
    colorIdentity: [...new Set(commanders.flatMap((commander) => commander.colorIdentity || commander.colors || []))],
  });
  const suggest = (category, declinedNames) => suggestCardForCategory({
    category,
    partialRows: partial,
    pool: legalPool,
    intent,
    declinedNames,
    options: { reasoningContext },
  });
  const ghosts = [];
  for (const step of diagnosis.steps) {
    if (step.done || step.status === "waiting") continue;
    if (step.id === "lands") {
      const basic = landFace(commanders, legalPool);
      if (!basic || used.has(cardKey(basic.name))) continue;
      used.add(cardKey(basic.name));
      ghosts.push({
        id: `lands:${cardKey(basic.name)}`,
        stepId: "lands",
        primary: faceOf(basic, `Lands are ${step.countText}. ${basic.name} adds mana in your commander's colors.`, "Lands"),
        runnerUp: null,
      });
      continue;
    }
    if (step.id === "curve") continue;
    const category = SUGGEST_CATEGORY[step.id];
    if (!category) continue;
    if (category === "synergyPieces" && !(intent.packages || []).length) continue;
    const declined = [...skippedKeys].map((key) => legalPool.find((card) => cardKey(card.name) === key)?.name || key);
    const first = suggest(category, [...declined, ...used]);
    const offer = first.offer ? asCandidate(first.offer) : null;
    if (!offer?.name) continue;
    const runnerCall = suggest(category, [...declined, ...used, offer.name]);
    const runner = runnerCall.offer ? asCandidate(runnerCall.offer) : null;
    used.add(cardKey(offer.name));
    if (runner?.name) used.add(cardKey(runner.name));
    ghosts.push({
      id: `${step.id}:${cardKey(offer.name)}`,
      stepId: step.id,
      primary: faceOf(offer, oneLine(first.reason, offer.name)),
      runnerUp: runner?.name && cardKey(runner.name) !== cardKey(offer.name)
        ? faceOf(runner, oneLine(runnerCall.reason, runner.name))
        : null,
    });
  }
  return ghosts;
}
