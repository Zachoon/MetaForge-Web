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
import { opponentDependentAddClause, opponentDependentManaText } from "../opponent-mana.mjs";

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
  artifacts: Object.freeze({ label: "Artifacts", resources: ["artifact", "treasure", "clue", "food", "artifact-enters", "artifact-cast", "artifact-leaves"] }),
  enchantress: Object.freeze({ label: "Enchantments", resources: ["enchantment", "enchantment-cast"] }),
  graveyard: Object.freeze({ label: "Graveyard value", resources: ["graveyard", "recursion", "discard"] }),
  lifegain: Object.freeze({ label: "Life gain", resources: ["lifegain"] }),
  landfall: Object.freeze({ label: "Landfall and big mana", resources: ["land-enters"] }),
  combat: Object.freeze({ label: "Combat and voltron", resources: ["attack", "combat-damage"] }),
  blink: Object.freeze({ label: "Blink and enter-the-battlefield value", resources: ["blink", "etb-value"] }),
  typal: Object.freeze({ label: "Typal", resources: [] }),
  "big-creatures": Object.freeze({ label: "Big creatures (power 4 or greater)", resources: ["power-matters"] }),
  historic: Object.freeze({ label: "Historic spells", resources: ["historic"] }),
  creatures: Object.freeze({ label: "Creature spells", resources: ["creature-cast"] }),
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
 * "Any color an opponent could produce" counts as none: it is not reliable
 * fixing for a color this deck needs.
 */
export function producedColorsOf(entry, { colorIdentity = null } = {}) {
  const text = String(cardOf(entry).oracleText ?? cardOf(entry).oracle_text ?? entry?.oracleText ?? "");
  const typeLine = typeLineOf(entry);
  const colors = new Set();
  const basics = { Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" };
  for (const [type, color] of Object.entries(basics)) if (new RegExp(`\\b${type}\\b`).test(typeLine)) colors.add(color);
  const identity = Array.isArray(colorIdentity) ? colorIdentity.filter((color) => COLOR_ORDER.includes(color)) : null;
  for (const match of text.matchAll(/\badd\b([^.]*)/gi)) {
    const clause = match[1];
    for (const symbol of clause.match(/\{([WUBRG])\}/g) || []) colors.add(symbol[1]);
    if (opponentDependentAddClause(clause)) continue;
    if (/commander'?s color identity/i.test(clause)) {
      if (identity) addProducedColors(colors, identity);
    } else if (/one mana of any color|mana of any (?:one )?color|\bany color\b/i.test(clause)) {
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

/** Copy for sources whose color depends on an opponent. Null when there are none. */
export function unreliableManaNote(count) {
  const sources = Number(count) || 0;
  if (sources <= 0) return null;
  const verb = sources === 1 ? "source makes" : "sources make";
  return `${sources} mana ${verb} a color an opponent's land could produce. That is not counted as color fixing.`;
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
  // Spend-restricted mana is not general ramp. Treasure tokens still are:
  // their own ability adds mana of any color with no spend restriction.
  if (mechanics.rampMode === "conditional") roles.delete("ramp");
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

const SKIP_PRODUCE = new Set(["creature-enters", "noncreature-cast", "mana", "combat-damage", "etb-value", "token"]);

function emptyScores() {
  return Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, 0]));
}

/** Votes from one card. A self-ETB does not vote for blink. Paying life is not a lifegain plan. */
function voteMechanics(mechanics, weight, scores) {
  const add = (resource, factor) => {
    for (const id of RESOURCE_ARCHETYPES.get(resource) || []) scores[id] += weight * factor;
  };
  for (const resource of mechanics.listens || []) {
    if (resource === "etb-value" && !mechanics.doublesEtb) continue;
    add(resource, 5);
  }
  for (const resource of mechanics.scales || []) add(resource, 4);
  for (const resource of mechanics.taps || []) add(resource, 5);
  for (const resource of mechanics.consumes || []) {
    if (resource === "lifegain" && mechanics.spendVerbs?.lifegain === "pays") continue;
    if (resource === "etb-value") add(resource, 5);
    else add(resource, 4);
  }
  const produced = (mechanics.produces || []).filter((resource) => !SKIP_PRODUCE.has(resource));
  const rewardCount = (mechanics.listens || []).length + (mechanics.scales || []).length + (mechanics.taps || []).length;
  const produceWeight = rewardCount === 0 && produced.length ? 5 : 2;
  for (const resource of produced) {
    if (resource === "blink") add(resource, 8);
    else add(resource, produceWeight);
  }
  if (mechanics.doublesEtb) scores.blink += weight * 8;
  if (mechanics.produces?.includes("blink")) scores.blink += weight * 4;
  if (mechanics.typal) scores.typal += weight * 8;
  if (mechanics.powerMatters) scores["big-creatures"] += weight * 8;
  if ((mechanics.listens || []).includes("historic")) scores.historic += weight * 8;
}

function restrictionNote(restrictions = [], rampMode = "none") {
  const spend = restrictions.find((entry) => entry.kind === "spend-only");
  const bits = [];
  if (spend?.scope === "instant-or-sorcery") {
    bits.push(rampMode === "both"
      ? "Mana from tapping artifacts can only cast instants and sorceries. Treasure tokens are still general ramp."
      : "Artifact mana can only cast instants and sorceries, so it is not general ramp.");
  } else if (spend?.scope === "commander") bits.push("This mana can only cast your commander, so it is not general ramp.");
  else if (spend?.scope === "creature-spell") bits.push("This mana can only cast creature spells, so it is not general ramp.");
  else if (spend?.scope === "artifact-spell") bits.push("This mana can only cast artifact spells, so it is not general ramp.");
  else if (spend?.type) bits.push(`This mana can only cast ${spend.type} spells, so it is not general ramp.`);
  else if (rampMode === "conditional") bits.push("This mana is restricted, so it is not general ramp.");
  if (restrictions.some((entry) => entry.kind === "once-each-turn")) bits.push("A triggered payoff here happens only once each turn.");
  if (restrictions.some((entry) => entry.kind === "only-during-your-turn")) bits.push("The spell trigger works during your turn.");
  if (restrictions.some((entry) => entry.kind === "while-tapped")) bits.push("The trigger works only while it is tapped.");
  if (restrictions.some((entry) => entry.kind === "nontoken")) bits.push("Token copies of the rewarded permanent do not count.");
  if (restrictions.some((entry) => entry.kind === "color-identity") && !spend) bits.push("Mana is limited to your commander's colors and can pay for any spell in those colors.");
  return bits.join(" ") || null;
}

function certaintyNoteFor(confidence) {
  if (confidence >= 0.7) return null;
  if (confidence >= 0.45) return "The plan is still forming. Another card that shares the same mechanic would make it clearer.";
  if (confidence > 0) return "Only a thin read so far. More cards that share one mechanic would make this clearer.";
  return null;
}

function freezePlan({ id, label, confidence, secondary, resources, evidence, model, restrictionNote: note }) {
  const certaintyNote = certaintyNoteFor(confidence);
  return Object.freeze({
    id,
    label,
    confidence: round(confidence),
    resources: Object.freeze(resources || ARCHETYPES[id]?.resources || []),
    secondary: secondary ? Object.freeze(secondary) : null,
    evidence: Object.freeze(evidence || []),
    model: model ? Object.freeze(model) : null,
    restrictionNote: note || null,
    certaintyNote,
    creatureType: model?.typal || null,
  });
}

const TYPE_LINE_PRODUCES = new Set(["enchantment", "artifact", "artifact-cast", "artifact-enters", "noncreature-cast", "creature-enters", "etb-value"]);

/** True when the rules text, not only the printed type line, names a plan. */
function textCarriesPlan(mechanics) {
  if ((mechanics.listens || []).length || (mechanics.scales || []).length || (mechanics.taps || []).length || (mechanics.consumes || []).length) return true;
  if (mechanics.doublesEtb || mechanics.typal || mechanics.powerMatters || (mechanics.produces || []).includes("blink")) return true;
  return (mechanics.produces || []).some((resource) => !TYPE_LINE_PRODUCES.has(resource));
}

const MIDRANGE = () => freezePlan({
  id: "midrange",
  label: "Midrange value (no clear plan yet)",
  confidence: 0,
  resources: [],
  secondary: null,
  evidence: [],
  model: null,
});

/**
 * Structured read of a commander: what it produces, what it rewards, what it
 * needs, and which restrictions the text actually states. A single
 * enter-the-battlefield clause does not make the plan blink.
 */
export function readCommanderPlan(commanders = []) {
  const present = commanders.filter((entry) => entryNameOf(entry));
  if (!present.length) return MIDRANGE();
  const scores = emptyScores();
  const evidence = Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, new Set()]));
  const models = present.map((entry) => {
    const mechanics = mechanicsOf(entry);
    voteMechanics(mechanics, 1, scores);
    return { name: entryNameOf(entry), mechanics };
  });
  // A noncreature commander's printed type is a plan only when the text
  // itself never names one. A creature type line is not.
  const leadSoFar = Math.max(...Object.values(scores));
  if (leadSoFar < 3) {
    for (const entry of present) {
      const line = typeLineOf(entry);
      if (/\benchantment\b/i.test(line) && !/\bcreature\b/i.test(line)) scores.enchantress += 3;
      else if (/\bartifact\b/i.test(line) && !/\bcreature\b/i.test(line)) scores.artifacts += 3;
    }
  }
  const ranked = Object.entries(scores).filter(([, score]) => score > 0).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const [top, second] = ranked;
  if (!top) return MIDRANGE();
  for (const model of models) if (scores[top[0]]) evidence[top[0]].add(model.name);

  const mechanics = models[0].mechanics;
  const spellAndArtifactRamp = (mechanics.listens || []).includes("spell-cast")
    && ((mechanics.taps || []).includes("artifact") || (mechanics.produces || []).includes("treasure"))
    && (mechanics.restrictions || []).some((entry) => entry.kind === "spend-only" && entry.scope === "instant-or-sorcery");
  let id = top[0];
  let label = ARCHETYPES[id].label;
  let secondary = second && second[1] >= top[1] * 0.6 ? { id: second[0], label: ARCHETYPES[second[0]].label } : null;
  if (spellAndArtifactRamp) {
    id = "spellslinger";
    label = "Spells and artifact ramp";
    secondary = { id: "artifacts", label: ARCHETYPES.artifacts.label };
  } else if (id === "typal" && mechanics.typal) {
    label = `${mechanics.typal}s`;
    secondary = null;
  } else if (id === "creatures" && (mechanics.produces || []).includes("land-enters")) {
    label = "Creature spells and land drops";
  } else if (id === "artifacts" && (mechanics.produces || []).includes("treasure") && !(mechanics.listens || []).includes("spell-cast")) {
    label = "Treasure and artifacts";
  }

  const typeLineOnly = !textCarriesPlan(mechanics);
  let confidence = 0.5;
  if (typeLineOnly) confidence = 0.46;
  else if (spellAndArtifactRamp || mechanics.doublesEtb || (mechanics.produces || []).includes("blink") || mechanics.typal || mechanics.powerMatters || (mechanics.listens || []).includes("historic")) confidence = 0.86;
  else if (top[1] >= 8) confidence = 0.84;
  else if (top[1] >= 5) confidence = 0.74;

  const resources = [...new Set([...(ARCHETYPES[id]?.resources || []), ...(secondary ? ARCHETYPES[secondary.id]?.resources || [] : [])])];
  return freezePlan({
    id,
    label,
    confidence,
    secondary,
    resources,
    evidence: [...new Set(present.map((entry) => entryNameOf(entry)))].slice(0, 6),
    restrictionNote: restrictionNote(mechanics.restrictions, mechanics.rampMode),
    model: {
      produces: mechanics.produces,
      rewards: [...mechanics.listens, ...mechanics.scales, ...mechanics.taps],
      needs: mechanics.consumes,
      restrictions: mechanics.restrictions,
      selfEtb: mechanics.selfEtb,
      doublesEtb: mechanics.doublesEtb,
      typal: mechanics.typal,
      rampMode: mechanics.rampMode,
    },
  });
}

/**
 * Scores each archetype from the commander(s) and picks. The commander's
 * rules text anchors the plan. A handful of unrelated picks cannot rename it.
 * Payoff evidence counts more than merely producing a resource. A one-time
 * enter ability is not a blink plan.
 */
export function inferPlan(commanders = [], picks = [], { hints = "" } = {}) {
  const anchored = commanders.filter((entry) => entryNameOf(entry)).length ? readCommanderPlan(commanders) : null;
  const scores = emptyScores();
  const evidence = Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, new Set()]));
  const credit = (entry, multiplier) => {
    const mechanics = mechanicsOf(entry);
    const before = { ...scores };
    voteMechanics(mechanics, multiplier, scores);
    for (const id of Object.keys(scores)) if (scores[id] > before[id]) evidence[id].add(entryNameOf(entry));
  };
  for (const pick of picks) credit(pick, 1);
  const hintText = String(hints || "").toLowerCase();
  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    if (hintText && (hintText.includes(id) || hintText.includes(archetype.label.split(" ")[0].toLowerCase()))) scores[id] += 4;
  }
  if (anchored && anchored.id !== "midrange" && anchored.confidence >= 0.7) {
    const supporters = picks.filter((pick) => !isLand(pick) && planRoleOf(pick, anchored)).length;
    return freezePlan({
      ...anchored,
      confidence: Math.min(0.93, anchored.confidence + supporters * 0.01),
      evidence: [...new Set([...(anchored.evidence || []), ...[...evidence[anchored.id] || []].slice(0, 4)])],
    });
  }
  const ranked = Object.entries(scores).filter(([, score]) => score > 0).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const total = ranked.reduce((sum, [, score]) => sum + score, 0);
  const [top, second] = ranked;
  if (anchored && anchored.id !== "midrange" && (!top || top[0] === anchored.id || picks.length < 8)) {
    return anchored;
  }
  if (!top) return anchored || MIDRANGE();
  const confidence = round(Math.min(1, (top[1] / total) * Math.min(1, top[1] / 12) * 1.4));
  return freezePlan({
    id: top[0],
    label: top[0] === "typal" ? anchored?.label || ARCHETYPES.typal.label : ARCHETYPES[top[0]].label,
    confidence,
    resources: [...ARCHETYPES[top[0]].resources],
    secondary: second && second[1] >= top[1] * 0.6 ? { id: second[0], label: ARCHETYPES[second[0]].label } : null,
    evidence: [...evidence[top[0]]].slice(0, 6),
    model: anchored?.model || null,
    restrictionNote: anchored?.restrictionNote || null,
  });
}

function supportsTypal(entry, plan) {
  const type = plan?.creatureType || plan?.model?.typal;
  if (!type) return null;
  const line = typeLineOf(entry);
  const text = String(cardOf(entry).oracleText ?? cardOf(entry).oracle_text ?? entry?.oracleText ?? "");
  const mentioned = new RegExp(`\\b${type}s?\\b`, "i").test(`${line} ${text}`);
  if (!mentioned) return null;
  const mechanics = mechanicsOf(entry);
  const rewards = (mechanics.listens || []).some((resource) => resource === "creature-enters") || mechanics.typal === type;
  return rewards && !new RegExp(`^Legendary Creature[^.]*${type}`, "i").test(line) ? "payoff" : "enabler";
}

function supportsHistoric(entry) {
  const line = typeLineOf(entry);
  if (/\bartifact\b|\bsaga\b|\blegendary\b/i.test(line)) return "enabler";
  const mechanics = mechanicsOf(entry);
  if ((mechanics.listens || []).includes("historic")) return "payoff";
  return null;
}

function resourceRole(entry, resources, planId) {
  if (!resources?.length && planId !== "typal" && planId !== "historic") return null;
  const mechanics = mechanicsOf(entry);
  const planSet = new Set(resources || []);
  const payoffResources = [...(mechanics.listens || []), ...(mechanics.scales || []), ...(mechanics.taps || []), ...(mechanics.consumes || [])];
  const payoff = payoffResources.some((resource) => {
    if (!planSet.has(resource)) return false;
    if (resource === "etb-value" && !mechanics.doublesEtb && !(mechanics.produces || []).includes("blink")) return false;
    return true;
  }) || (planId === "blink" && (mechanics.produces || []).includes("blink"));
  const enabler = (mechanics.produces || []).some((resource) => {
    if (!planSet.has(resource) || resource === "creature-enters" || resource === "mana" || resource === "noncreature-cast") return false;
    if (resource === "etb-value") return planId === "blink" && mechanics.selfEtb;
    return true;
  });
  if (payoff && enabler) return "engine";
  if (payoff) return "payoff";
  if (enabler) return "enabler";
  return null;
}

/**
 * Which named plan this card's own text supports. Secondary resources do not
 * get to wear the primary plan's name. Returns null when the text supports
 * neither the primary nor the secondary plan.
 */
export function planSupportOf(entry, plan) {
  if (!plan || plan.id === "midrange" || !(plan.confidence > 0)) return null;
  const checks = [{ id: plan.id, label: plan.label, resources: plan.id === "typal" || plan.id === "historic" ? [] : (ARCHETYPES[plan.id]?.resources || plan.resources || []) }];
  if (plan.secondary?.id && plan.secondary.id !== plan.id) {
    checks.push({ id: plan.secondary.id, label: plan.secondary.label, resources: ARCHETYPES[plan.secondary.id]?.resources || [] });
  }
  const matches = [];
  for (const check of checks) {
    let role = null;
    if (check.id === "typal") role = supportsTypal(entry, plan);
    else if (check.id === "historic") role = supportsHistoric(entry);
    else role = resourceRole(entry, check.resources, check.id);
    if (role) matches.push(Object.freeze({ ...check, role }));
  }
  return matches[0] || null;
}

/** Whether a card advances the given plan, from its own rules text only. */
export function planRoleOf(entry, plan) {
  return planSupportOf(entry, plan)?.role || null;
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
  let unreliableSources = 0;
  for (const pick of picks) {
    const roles = rolesOf(pick);
    for (const role of roles) counts[role] += 1;
    const producesMana = isLand(pick) || roles.has("ramp");
    if (producesMana && opponentDependentManaText(cardOf(pick).oracleText ?? cardOf(pick).oracle_text ?? pick?.oracleText ?? "")) unreliableSources += 1;
    for (const color of producedColorsOf(pick, { colorIdentity: identity })) if (producesMana) sources[color] += isLand(pick) ? 1 : 0.5;
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
    colors: Object.freeze({
      identity: Object.freeze(identity),
      requirements: colorRequirements,
      unreliableSources,
      unreliableNote: unreliableManaNote(unreliableSources),
    }),
  });
}

/** Urgency for a guided step from the profile (0..1), for step ordering. */
export function categoryUrgency(profile, category) {
  const role = CATEGORY_ROLE[category];
  const row = profile?.roles?.find((entry) => entry.role === role);
  return row ? row.urgency : 0;
}
