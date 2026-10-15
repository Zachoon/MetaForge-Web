import { normalizePlayerCompass } from "./player-compass.mjs";

// =============================================================================
// Guided Preference Learning
// =============================================================================
// The guided build should learn from the player one decision at a time
// (Zach's direction, 2026-10-14): every accept, every decline and the reason
// given for it, and every Player Compass answer the moment it is given (not
// only once all four are answered). This module turns those signals into a
// small, explainable preference profile and two pure uses of it:
//
//   - preferenceAdjustment: a capped, additive nudge to guided-suggestion's
//     existing focusedScore rank. Never a filter: a declined *reason* reshapes
//     ranking, only a declined *card* is removed (that stays in
//     suggestCardForCategory's declinedNames handling).
//   - orderRemainingCategories: reorders only the steps the player has not
//     reached yet, so completed and current steps never move under them.
//
// Deliberately stateless and deterministic (the client resends the full
// history on every request, same as acceptedNames/declinedNames already),
// so it is safe in a Worker isolate and easy to pin in tests.
// =============================================================================

export const DECLINE_REASONS = Object.freeze([
  Object.freeze({ id: "wrong-plan", label: "Wrong plan" }),
  Object.freeze({ id: "budget", label: "Too expensive" }),
  Object.freeze({ id: "power-level", label: "Too strong for my table" }),
  Object.freeze({ id: "style", label: "Not my style" }),
  Object.freeze({ id: "have-better", label: "I have a better card" }),
]);
const DECLINE_REASON_IDS = new Set(DECLINE_REASONS.map((reason) => reason.id));

// Hard caps keep learning a nudge: an existing focusedScore spread between a
// step's first and fifth candidate is typically 10–40 points.
export const PREFERENCE_LIMITS = Object.freeze({ maxBoost: 12, maxPenalty: -24 });

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const entryCard = (entry) => entry?.card || entry || {};
const entryName = (entry) => entry?.card?.name || entry?.name || "";
const priceOf = (entry) => {
  const value = Number(entryCard(entry).priceUsd ?? entry?.priceUsd);
  return Number.isFinite(value) ? value : null;
};
const cmcOf = (entry) => {
  const value = Number(entry?.cmc ?? entryCard(entry).cmc);
  return Number.isFinite(value) ? value : null;
};
const qualityOf = (entry) => (Number.isFinite(entry?.score) ? entry.score : null);
const signalsOf = (entry) => {
  const mechanics = entry?.mechanics || {};
  return [...new Set([...(mechanics.produces || []), ...(mechanics.rewards || [])].map(String))];
};

/** Shapes untrusted request data into [{ name, reason }]; unknown reasons become null. */
export function sanitizeDeclineFeedback(raw, { max = 100, maxName = 400 } = {}) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, max)
    .filter((entry) => entry && typeof entry === "object" && typeof entry.name === "string" && entry.name.trim())
    .map((entry) => Object.freeze({
      name: entry.name.slice(0, maxName),
      reason: DECLINE_REASON_IDS.has(entry.reason) ? entry.reason : null,
    }));
}

/**
 * Builds the profile from analyzed rows (analyzeForgePool's shape, or the
 * flat fixture shape tests use). declined is [{ row, reason }] where row may
 * be null when the declined card is not in the analyzed pool.
 */
/**
 * @param {{ acceptedRows?: any[], declined?: Array<{ row: any, reason: string | null }>, compass?: any }} [input]
 */
export function buildPreferenceProfile({ acceptedRows = [], declined = [], compass = null } = {}) {
  const signalWeights = new Map();
  const bump = (signal, amount) => signalWeights.set(signal, (signalWeights.get(signal) || 0) + amount);
  for (const row of acceptedRows) for (const signal of signalsOf(row)) bump(signal, 1);

  let priceCeiling = null;
  let qualityCeiling = null;
  const reasonCounts = {};
  const avoidedRoles = new Map();
  for (const { row, reason } of declined) {
    if (!reason) continue;
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    if (!row) continue;
    if (reason === "wrong-plan") for (const signal of signalsOf(row)) bump(signal, -1.5);
    if (reason === "style") {
      for (const signal of signalsOf(row)) bump(signal, -1);
      for (const role of row.roles || []) avoidedRoles.set(role, (avoidedRoles.get(role) || 0) + 1);
    }
    if (reason === "budget") {
      const price = priceOf(row);
      // Anything at or above ~80% of a price the player already said no to is
      // probably also too much; the lowest such price wins.
      if (price !== null && price > 0) priceCeiling = Math.min(priceCeiling ?? Infinity, round(price * 0.8));
    }
    if (reason === "power-level") {
      const quality = qualityOf(row);
      if (quality !== null) qualityCeiling = Math.min(qualityCeiling ?? Infinity, quality);
    }
  }

  const acceptedCmcs = acceptedRows.map(cmcOf).filter((value) => value !== null);
  const compassValue = normalizePlayerCompass(compass);
  return Object.freeze({
    signalWeights: Object.freeze(Object.fromEntries(signalWeights)),
    priceCeiling,
    qualityCeiling,
    avoidedRoles: Object.freeze(Object.fromEntries(avoidedRoles)),
    reasonCounts: Object.freeze(reasonCounts),
    acceptedAverageCmc: acceptedCmcs.length ? round(acceptedCmcs.reduce((sum, value) => sum + value, 0) / acceptedCmcs.length) : null,
    compass: compassValue.answers,
  });
}

/**
 * Additive rank nudge plus the human-readable notes that explain it. Every
 * answered compass axis applies immediately; unanswered axes do nothing.
 */
/** @param {any} candidate @param {any} profile */
export function preferenceAdjustment(candidate, profile) {
  if (!profile) return Object.freeze({ delta: 0, notes: Object.freeze([]) });
  let delta = 0;
  const notes = [];

  const signals = signalsOf(candidate);
  const affinity = signals.reduce((sum, signal) => sum + (profile.signalWeights[signal] || 0), 0);
  if (affinity) {
    delta += Math.max(-12, Math.min(8, affinity * 2));
    notes.push(affinity > 0 ? "builds on cards you've already picked" : "leans toward a plan you passed on");
  }

  const price = priceOf(candidate);
  if (profile.priceCeiling !== null && price !== null && price > profile.priceCeiling) {
    delta -= Math.min(14, 4 + (price - profile.priceCeiling) / 2);
    notes.push("above the price you've been turning down");
  }

  const quality = qualityOf(candidate);
  if (profile.qualityCeiling !== null && quality !== null && quality >= profile.qualityCeiling) {
    delta -= Math.min(10, 3 + (quality - profile.qualityCeiling) / 4);
    notes.push("as strong as a card you said was too much for your table");
  }

  const avoided = (candidate?.roles || []).reduce((sum, role) => sum + (profile.avoidedRoles[role] || 0), 0);
  if (avoided) delta -= Math.min(6, avoided * 1.5);

  const cmc = cmcOf(candidate);
  const { pace, complexity } = profile.compass || {};
  if (cmc !== null && pace === "early") delta += cmc <= 2 ? 3 : cmc >= 5 ? -4 : 0;
  if (cmc !== null && pace === "long-game") delta += cmc >= 5 ? 2 : 0;
  const textLength = String(entryCard(candidate).oracleText || candidate?.oracleText || "").length;
  if (complexity === "straightforward" && textLength > 260) delta -= 3;
  if (complexity === "technical" && textLength > 260) delta += 1.5;

  const capped = Math.max(PREFERENCE_LIMITS.maxPenalty, Math.min(PREFERENCE_LIMITS.maxBoost, delta));
  return Object.freeze({ delta: round(capped), notes: Object.freeze(notes) });
}

// How much each answered compass axis pulls a step earlier (positive) or
// later (negative). Small next to the ledger gap so an empty fundamentals
// row is still filled first.
const COMPASS_CATEGORY_PULL = Object.freeze({
  interaction: Object.freeze({ reactive: { interaction: 2, sweeper: 1 }, "own-plan": { interaction: -1, sweeper: -1, synergyPieces: 1.5 } }),
  risk: Object.freeze({ recoverable: { recursion: 1.5, protection: 1 }, explosive: { winConditions: 1.5, synergyPieces: 1 } }),
  pace: Object.freeze({ early: { ramp: 1, winConditions: 1 }, "long-game": { draw: 1.5, recursion: 1 } }),
});

/**
 * Returns a new category list: entries up to and including currentIndex
 * stay where they are; the rest are sorted by how far below target their
 * ledger row is, plus compass pull, minus a penalty when the player keeps
 * rejecting this step's suggestions as the wrong plan. Ties keep the
 * original order, so with no signal the sequence is unchanged.
 */
/**
 * @param {string[]} categories
 * @param {number} currentIndex
 * @param {{ ledger?: any[], profile?: any, deckUrgency?: Record<string, number> | null }} [context]
 */
export function orderRemainingCategories(categories = [], currentIndex = 0, { ledger = [], profile = null, deckUrgency = null } = {}) {
  const fixed = categories.slice(0, currentIndex + 1);
  const rest = categories.slice(currentIndex + 1);
  const ledgerBy = new Map(ledger.map((row) => [row.category, row]));
  const compass = profile?.compass || {};
  const priority = (category) => {
    const row = ledgerBy.get(category);
    let score = 0;
    if (row?.target && row.status === "under") {
      const min = Number(row.target.min) || 0;
      score += min > 0 ? (3 * (min - Number(row.actual || 0))) / min : 0;
    }
    if (row?.status === "over") score -= 2;
    for (const [axis, pulls] of Object.entries(COMPASS_CATEGORY_PULL)) {
      const answer = compass[axis];
      if (answer && pulls[answer]?.[category]) score += pulls[answer][category];
    }
    // The reasoning engine's running deck profile: how much of this role's
    // Commander minimum is still missing (0..1), from rules-text roles.
    if (deckUrgency && Number.isFinite(deckUrgency[category])) score += 2 * deckUrgency[category];
    if (category === "synergyPieces" && (profile?.reasonCounts?.["wrong-plan"] || 0) >= 2) score -= 1;
    return score;
  };
  const ranked = rest
    .map((category, index) => ({ category, index, score: priority(category) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.category);
  return [...fixed, ...ranked];
}

const ROLE_COPY = Object.freeze({
  ramp: "Ramp",
  draw: "Card draw",
  interaction: "Removal",
  protection: "Protection",
  recursion: "Recursion",
  sweeper: "Board wipe",
  winConditions: "Way to win",
  synergyPieces: "Plays to your commander's plan",
});

/**
 * The short "why this card" line the guided UI shows under every offer:
 * its role on this step, what among the player's picks it works with, and
 * the main thing it costs them.
 */
/**
 * @param {{ offer?: any, category?: string, acceptedRows?: any[], nearestAlternative?: any, adjustment?: any }} [input]
 */
export function explainOffer({ offer, category, acceptedRows = [], nearestAlternative = null, adjustment = null } = {}) {
  if (!offer) return null;
  const offerSignals = new Set(signalsOf(offer));
  const offerKey = normalized(entryName(offer));
  const worksWith = acceptedRows
    .filter((row) => normalized(entryName(row)) !== offerKey)
    .map((row) => ({ name: entryName(row), shared: signalsOf(row).filter((signal) => offerSignals.has(signal)).length }))
    .filter((entry) => entry.shared > 0 && entry.name)
    .sort((left, right) => right.shared - left.shared || left.name.localeCompare(right.name))
    .slice(0, 2)
    .map((entry) => entry.name);

  const price = priceOf(offer);
  const cmc = cmcOf(offer);
  const otherRoles = (offer.roles || []).filter((role) => role !== category && ROLE_COPY[role]);
  let tradeOff = "";
  if (price !== null && price > 8) tradeOff = `Costs about $${price.toFixed(2)}.`;
  else if (cmc !== null && cmc >= 5) tradeOff = `Slow at ${cmc} mana.`;
  else if (nearestAlternative?.name && Number(nearestAlternative.margin) < 2) tradeOff = `A close call with ${nearestAlternative.name}.`;
  else if (!otherRoles.length && category !== "winConditions" && category !== "synergyPieces") tradeOff = "Does this one job and little else.";

  return Object.freeze({
    role: ROLE_COPY[category] || category,
    worksWith: Object.freeze(worksWith),
    tradeOff,
    learned: Object.freeze([...(adjustment?.notes || [])].slice(0, 2)),
  });
}
