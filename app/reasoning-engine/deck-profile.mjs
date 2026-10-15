// =============================================================================
// Running Deck Profile
// =============================================================================
// A live model of the deck being built, recomputed after every pick (the
// guided client resends the full pick list each request, so this stays pure
// and stateless). It answers: what is this deck trying to do, what does its
// curve and color base look like, how do its role counts compare with
// Commander norms, and which gaps matter most right now. Suggestion ranking
// and step order both read from it.
// =============================================================================

import { mechanicsOf, entryNameOf } from "./mechanic-graph.mjs";

// Commander norms for a 100-card deck (community-standard "8x8"/template
// ranges). Scaled linearly for other deck sizes (e.g. 60-card Brawl).
export const ROLE_TARGETS_100 = Object.freeze({
  lands: Object.freeze({ min: 35, max: 38 }),
  ramp: Object.freeze({ min: 10, max: 13 }),
  draw: Object.freeze({ min: 10, max: 13 }),
  removal: Object.freeze({ min: 8, max: 11 }),
  wipes: Object.freeze({ min: 2, max: 4 }),
  protection: Object.freeze({ min: 3, max: 6 }),
  recursion: Object.freeze({ min: 2, max: 5 }),
  winConditions: Object.freeze({ min: 3, max: 7 }),
});

export const ROLE_LABELS = Object.freeze({
  lands: "lands", ramp: "ramp", draw: "card draw", removal: "removal", wipes: "board wipes",
  protection: "protection", recursion: "recursion", winConditions: "win conditions", plan: "plan pieces",
});

// Guided step id <-> profile role.
export const CATEGORY_ROLE = Object.freeze({
  ramp: "ramp", interaction: "removal", protection: "protection", sweeper: "wipes",
  recursion: "recursion", draw: "draw", winConditions: "winConditions", synergyPieces: "plan",
});

// Archetypes are defined by the resources their payoffs care about. A card
// listening for or consuming a resource is strong evidence of a plan; a card
// merely producing it is weak evidence (most creatures "produce" bodies).
export const ARCHETYPES = Object.freeze({
  aristocrats: Object.freeze({ label: "Aristocrats (sacrifice and death triggers)", resources: ["creature-dies", "sacrifice", "creature-body", "life-drain", "death-trigger"] }),
  tokens: Object.freeze({ label: "Go-wide tokens", resources: ["creature-token", "token", "creature-enters"] }),
  counters: Object.freeze({ label: "+1/+1 counters", resources: ["counter"] }),
  spellslinger: Object.freeze({ label: "Spellslinger", resources: ["spell-cast", "noncreature-cast", "copy"] }),
  artifacts: Object.freeze({ label: "Artifacts", resources: ["artifact", "treasure"] }),
  enchantress: Object.freeze({ label: "Enchantments", resources: ["enchantment"] }),
  graveyard: Object.freeze({ label: "Graveyard value", resources: ["graveyard", "recursion", "discard"] }),
  lifegain: Object.freeze({ label: "Life gain", resources: ["lifegain"] }),
  landfall: Object.freeze({ label: "Landfall and big mana", resources: ["land-enters"] }),
  combat: Object.freeze({ label: "Combat and voltron", resources: ["attack", "combat-damage"] }),
  blink: Object.freeze({ label: "Blink and enter-the-battlefield value", resources: ["blink", "etb-value"] }),
});

const RESOURCE_ARCHETYPES = (() => {
  const map = new Map();
  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    for (const resource of archetype.resources) map.set(resource, [...(map.get(resource) || []), id]);
  }
  return map;
})();

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const cardOf = (entry) => entry?.card || entry || {};
const typeLineOf = (entry) => String(cardOf(entry).typeLine ?? cardOf(entry).type_line ?? entry?.typeLine ?? "");
const manaCostOf = (entry) => String(cardOf(entry).manaCost ?? cardOf(entry).mana_cost ?? entry?.manaCost ?? "");
export const isLand = (entry) => /\bland\b/i.test(typeLineOf(entry)) && !/\/\//.test(typeLineOf(entry)) || (entry?.roles || []).includes("land");

export function cmcOf(entry) {
  const direct = Number(entry?.cmc ?? cardOf(entry).cmc);
  if (Number.isFinite(direct)) return direct;
  let total = 0;
  for (const symbol of manaCostOf(entry).match(/\{[^}]+\}/g) || []) {
    const inner = symbol.slice(1, -1);
    if (/^\d+$/.test(inner)) total += Number(inner);
    else if (inner !== "X") total += 1;
  }
  return total;
}

/** Colored pips by color letter, hybrid split evenly. */
export function pipsOf(entry) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const symbol of manaCostOf(entry).match(/\{[^}]+\}/g) || []) {
    const colors = symbol.slice(1, -1).split("/").filter((part) => part in pips);
    for (const color of colors) pips[color] += 1 / colors.length;
  }
  return pips;
}

const COLOR_ORDER = Object.freeze(["W", "U", "B", "R", "G"]);

function addProducedColors(colors, letters) {
  const allowed = new Set(letters);
  for (const color of COLOR_ORDER) if (allowed.has(color)) colors.add(color);
}

/**
 * Colors of mana a land or mana source can produce, from its rules text and
 * basic land types. `colorIdentity` is the commander's identity when known:
 * "any color in your commander's color identity" and basic-land tutors only
 * count those colors. Unrestricted "any color" (City of Brass, Treasure)
 * still counts as all five, because those sources really make any color.
 */
export function producedColorsOf(entry, { colorIdentity = null } = {}) {
  const text = String(cardOf(entry).oracleText ?? cardOf(entry).oracle_text ?? entry?.oracleText ?? "");
  const typeLine = typeLineOf(entry);
  const colors = new Set();
  const basics = { Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" };
  for (const [type, color] of Object.entries(basics)) if (new RegExp(`\\b${type}\\b`).test(typeLine)) colors.add(color);
  const identity = Array.isArray(colorIdentity) ? colorIdentity.filter((color) => COLOR_ORDER.includes(color)) : null;
  for (const match of text.matchAll(/\badd\b([^.]*)/gi)) {
    for (const symbol of match[1].match(/\{([WUBRG])\}/g) || []) colors.add(symbol[1]);
    if (/commander'?s color identity/i.test(match[1])) {
      if (identity) addProducedColors(colors, identity);
    } else if (/one mana of any color|mana of any (?:one )?color|\bany color\b/i.test(match[1])) {
      addProducedColors(colors, COLOR_ORDER);
    }
  }
  // Treasures add one mana of any color, including colors outside the
  // commander's identity. A basic-land tutor can only find basics the deck
  // is allowed to play.
  if (/treasure token/i.test(text)) addProducedColors(colors, COLOR_ORDER);
  if (/search your library for [^.]*\bbasic land/i.test(text)) addProducedColors(colors, identity || COLOR_ORDER);
  return [...colors];
}

/**
 * Commander row the profile and parser read. Keeps the printed type line.
 * A missing type line stays blank — inventing "Legendary Creature" makes
 * artifact, enchantment, vehicle, planeswalker, and Background commanders
 * look like creatures.
 */
export function commanderReasoningEntry(commander) {
  if (!commander?.name) return null;
  const typeLine = String(commander.typeLine ?? commander.type_line ?? "").slice(0, 400);
  const colors = commander.colorIdentity || commander.colors || [];
  return {
    name: String(commander.name),
    oracleText: String(commander.oracleText ?? commander.oracle_text ?? ""),
    typeLine,
    colorIdentity: Array.isArray(colors) ? [...colors] : [],
  };
}

/** Profile roles a card fills, from its existing role tags plus its parsed rules text. */
export function rolesOf(entry) {
  const tags = new Set(entry?.roles || []);
  const mechanics = mechanicsOf(entry);
  const effects = new Set(mechanics.effects);
  const roles = new Set();
  if (isLand(entry)) { roles.add("lands"); return roles; }
  if (tags.has("ramp") || effects.has("ramp")) roles.add("ramp");
  if (tags.has("draw") || effects.has("draw")) roles.add("draw");
  if (tags.has("interaction") || effects.has("removal")) roles.add("removal");
  if (tags.has("sweeper") || effects.has("wipe")) roles.add("wipes");
  if (tags.has("protection") || effects.has("protection")) roles.add("protection");
  if (tags.has("recursion") || effects.has("recursion")) roles.add("recursion");
  if (tags.has("finisher") || tags.has("wincon") || effects.has("finisher")) roles.add("winConditions");
  return roles;
}

export function scaledTargets(deckSize = 100) {
  if (deckSize === 100) return ROLE_TARGETS_100;
  const scale = deckSize / 100;
  return Object.freeze(Object.fromEntries(Object.entries(ROLE_TARGETS_100).map(([role, target]) => {
    const min = Math.max(1, Math.round(target.min * scale));
    return [role, Object.freeze({ min, max: Math.max(min, Math.round(target.max * scale)) })];
  })));
}

/**
 * Scores each archetype from the commander(s) and picks. Payoff evidence
 * (listens/consumes) counts 3x producing; the commander counts 3x a pick.
 * Optional free-text hints (strategy, note) nudge toward a named plan.
 */
export function inferPlan(commanders = [], picks = [], { hints = "" } = {}) {
  const scores = Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, 0]));
  const evidence = Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, new Set()]));
  const credit = (entry, multiplier) => {
    const mechanics = mechanicsOf(entry);
    const seen = new Set();
    const add = (resource, weight) => {
      for (const id of RESOURCE_ARCHETYPES.get(resource) || []) {
        const key = `${id}:${resource}`;
        if (seen.has(key)) continue;
        seen.add(key);
        scores[id] += weight * multiplier;
        evidence[id].add(entryNameOf(entry));
      }
    };
    for (const resource of [...mechanics.listens, ...mechanics.consumes]) add(resource, 3);
    for (const resource of mechanics.produces) {
      // Every creature "produces" creature-enters; only count it as plan
      // evidence when the card actually makes tokens.
      if (resource === "creature-enters" || resource === "noncreature-cast" || resource === "mana") continue;
      add(resource, 1);
    }
  };
  for (const commander of commanders) credit(commander, 3);
  for (const pick of picks) credit(pick, 1);
  const hintText = String(hints || "").toLowerCase();
  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    if (hintText && (hintText.includes(id) || hintText.includes(archetype.label.split(" ")[0].toLowerCase()))) scores[id] += 4;
  }
  const ranked = Object.entries(scores).filter(([, score]) => score > 0).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const total = ranked.reduce((sum, [, score]) => sum + score, 0);
  const [top, second] = ranked;
  if (!top) return Object.freeze({ id: "midrange", label: "Midrange value (no clear plan yet)", confidence: 0, resources: Object.freeze([]), secondary: null, evidence: Object.freeze([]) });
  return Object.freeze({
    id: top[0],
    label: ARCHETYPES[top[0]].label,
    confidence: round(Math.min(1, (top[1] / total) * Math.min(1, top[1] / 12) * 1.4)),
    resources: Object.freeze([...ARCHETYPES[top[0]].resources, ...(second && second[1] >= top[1] * 0.6 ? ARCHETYPES[second[0]].resources : [])]),
    secondary: second && second[1] >= top[1] * 0.6 ? Object.freeze({ id: second[0], label: ARCHETYPES[second[0]].label }) : null,
    evidence: Object.freeze([...evidence[top[0]]].slice(0, 6)),
  });
}

/** Whether a card advances the given plan (produces, consumes or listens for one of its resources). */
export function planRoleOf(entry, plan) {
  if (!plan?.resources?.length) return null;
  const mechanics = mechanicsOf(entry);
  const planSet = new Set(plan.resources);
  const payoff = [...mechanics.listens, ...mechanics.consumes].some((resource) => planSet.has(resource));
  const enabler = mechanics.produces.some((resource) => planSet.has(resource) && resource !== "creature-enters");
  if (payoff && enabler) return "engine";
  if (payoff) return "payoff";
  if (enabler) return "enabler";
  return null;
}

// Ideal nonland curve share for a 100-card deck, by mana value bucket
// (0-1, 2, 3, 4, 5, 6+). Shifted lower for fast tables via `pace`.
const IDEAL_CURVE = Object.freeze([0.12, 0.24, 0.24, 0.18, 0.11, 0.11]);
export const curveBucket = (cmc) => Math.max(0, Math.min(5, cmc <= 1 ? 0 : cmc - 1));

/**
 * @param {{ commanders?: any[], picks?: any[], deckSize?: number, hints?: string, colorIdentity?: string[] | null }} [input]
 */
export function buildDeckProfile({ commanders = [], picks = [], deckSize = 100, hints = "", colorIdentity = null } = {}) {
  const targets = scaledTargets(deckSize);
  const nonlandSlots = deckSize - commanders.length - targets.lands.min;
  const counts = Object.fromEntries(Object.keys(targets).map((role) => [role, 0]));
  const curve = [0, 0, 0, 0, 0, 0];
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const identity = colorIdentity || [...new Set(commanders.flatMap((commander) => cardOf(commander).colorIdentity || cardOf(commander).color_identity || cardOf(commander).colors || []))];
  let cmcTotal = 0;
  let nonland = 0;
  for (const pick of picks) {
    const roles = rolesOf(pick);
    for (const role of roles) counts[role] += 1;
    for (const color of producedColorsOf(pick, { colorIdentity: identity })) if (isLand(pick) || roles.has("ramp")) sources[color] += isLand(pick) ? 1 : 0.5;
    if (isLand(pick)) continue;
    nonland += 1;
    const cmc = cmcOf(pick);
    cmcTotal += cmc;
    curve[curveBucket(cmc)] += 1;
    const cardPips = pipsOf(pick);
    for (const color of Object.keys(pips)) pips[color] += cardPips[color];
  }

  const plan = inferPlan(commanders, picks, { hints });
  const planPieces = picks.filter((pick) => !isLand(pick) && planRoleOf(pick, plan));
  const payoffs = planPieces.filter((pick) => planRoleOf(pick, plan) !== "enabler").length;
  const enablers = planPieces.filter((pick) => planRoleOf(pick, plan) !== "payoff").length;
  const planTarget = Object.freeze({ min: Math.round(nonlandSlots * 0.3), max: Math.round(nonlandSlots * 0.5) });

  const roleRows = [...Object.entries(targets), ["plan", planTarget]].map(([role, target]) => {
    const actual = role === "plan" ? planPieces.length : counts[role];
    const missing = Math.max(0, target.min - actual);
    return Object.freeze({
      role,
      label: ROLE_LABELS[role],
      actual,
      target,
      missing,
      status: actual < target.min ? "under" : actual > target.max ? "over" : "ok",
      // How urgent the gap is, 0..1: share of the minimum still missing.
      urgency: target.min ? round(missing / target.min) : 0,
    });
  });

  const pipTotal = Object.values(pips).reduce((sum, value) => sum + value, 0);
  const sourceTotal = Object.values(sources).reduce((sum, value) => sum + value, 0);
  const colorRequirements = Object.freeze(identity.filter((color) => color in pips).map((color) => {
    const share = pipTotal ? round(pips[color] / pipTotal) : 0;
    const sourceShare = sourceTotal ? round(sources[color] / sourceTotal) : null;
    return Object.freeze({ color, pips: round(pips[color], 1), share, sources: round(sources[color], 1), sourceShare,
      underSupported: sourceShare !== null && share - sourceShare > 0.15 });
  }));

  const averageCmc = nonland ? round(cmcTotal / nonland) : null;
  const curveTargets = IDEAL_CURVE.map((share) => Math.round(share * nonlandSlots));
  const curveIssues = [];
  if (averageCmc !== null && nonland >= 8 && averageCmc > 3.6) curveIssues.push("top-heavy");
  if (nonland >= 8 && curve[0] + curve[1] < nonland * 0.2) curveIssues.push("few early plays");
  if (curve[5] > curveTargets[5] + 2) curveIssues.push("too many 6+ drops");

  const gaps = roleRows.filter((row) => row.status === "under").sort((left, right) => right.urgency - left.urgency || right.missing - left.missing);
  const planBalance = planPieces.length >= 4
    ? (payoffs > enablers * 1.5 ? "needs-enablers" : enablers > payoffs * 2.5 ? "needs-payoffs" : "balanced")
    : "forming";

  return Object.freeze({
    deckSize,
    picks: picks.length,
    nonland,
    plan,
    planBalance,
    roles: Object.freeze(roleRows),
    gaps: Object.freeze(gaps),
    curve: Object.freeze({ buckets: Object.freeze(curve), targets: Object.freeze(curveTargets), averageCmc, issues: Object.freeze(curveIssues), labels: Object.freeze(["0-1", "2", "3", "4", "5", "6+"]) }),
    colors: Object.freeze({ identity: Object.freeze(identity), requirements: colorRequirements }),
  });
}

/** Urgency for a guided step from the profile (0..1), for step ordering. */
export function categoryUrgency(profile, category) {
  const role = CATEGORY_ROLE[category];
  const row = profile?.roles?.find((entry) => entry.role === role);
  return row ? row.urgency : 0;
}
