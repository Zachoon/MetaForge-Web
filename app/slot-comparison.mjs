// Side-by-side and three-way reads of a guided slot.
// Every number is taken from the guided ranker (focusedScore + the slot
// delta + the reasoning nudge). Nothing here invents a score.

import { TRACKED_ROLES } from "./slot-justification-ledger.mjs";
import { guidedCategoryLabel } from "./guided-reason-copy.mjs";
import { powerSignalCategoryFor } from "./commander-power-signal.mjs";

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

const SHELL_KINDS = new Set([
  "package_core", "package_support", "package_leg", "commander_connection",
  "interaction_present", "supported_threat", "footprint_novelty",
]);
const CURVE_KINDS = new Set(["curve_deficit", "curve_band", "curve_congestion", "unsupported_high_cmc"]);
const SYNERGY_KINDS = new Set([
  "package_core", "package_support", "package_leg", "commander_connection",
  "interaction_present", "interaction_missing", "supported_threat", "footprint_novelty",
]);

const entryCard = (entry) => entry?.candidate?.card || entry?.candidate || entry?.card || entry || {};
const entryName = (entry) => entry?.delta?.name || entryCard(entry).name || entry?.candidate?.name || "";

// Same key guided-suggestion.mjs uses for "the next card that does this job".
export function guidedJobKey(candidate) {
  const tracked = TRACKED_ROLES.filter((role) => (candidate?.roles || []).includes(role));
  if (!tracked.length) return null;
  return tracked.slice().sort().join("+");
}

function sumWeights(entries, kinds) {
  return (entries || []).reduce((sum, entry) => (kinds.has(entry.kind) ? sum + Number(entry.weight || 0) : sum), 0);
}

function reasoningWeight(reasoning, kind) {
  return (reasoning?.reasons || []).reduce((sum, reason) => (reason.kind === kind ? sum + Number(reason.weight || 0) : sum), 0);
}

/**
 * The five ranking factors, partitioned out of the slot delta.
 * A reasoning-engine weight is used only when the delta is silent on that
 * factor, so the two are not added together.
 */
function isPrimaryEntry(category, entry) {
  const key = entry.detail ?? entry.key;
  return category === "winConditions" || category === "synergyPieces"
    ? SHELL_KINDS.has(entry.kind)
    : entry.kind === "tracked_role" && key === category;
}

export function rankingFactors(category, scored) {
  const delta = scored?.delta || {};
  const all = [...(delta.positives || []), ...(delta.negatives || [])];
  const primary = all.reduce((sum, entry) => (isPrimaryEntry(category, entry) ? sum + Number(entry.weight || 0) : sum), 0);
  const synergyFromDelta = all.reduce((sum, entry) => (
    !isPrimaryEntry(category, entry) && SYNERGY_KINDS.has(entry.kind) ? sum + Number(entry.weight || 0) : sum
  ), 0);
  const gapFromDelta = all.reduce((sum, entry) => {
    if (isPrimaryEntry(category, entry) || CURVE_KINDS.has(entry.kind)) return sum;
    if (entry.kind === "tracked_role" || entry.kind === "sequence_stage") return sum + Number(entry.weight || 0);
    return sum;
  }, 0);
  let synergy = synergyFromDelta;
  let mana = sumWeights(all, CURVE_KINDS);
  let gap = gapFromDelta;
  const bracket = sumWeights(all, new Set(["power_pressure"]));
  const reasoning = scored?.reasoning;
  if (synergy === 0) synergy = Number(reasoning?.synergyScore || 0) || reasoningWeight(reasoning, "synergy");
  if (mana === 0) mana = reasoningWeight(reasoning, "curve");
  if (gap === 0) gap = reasoningWeight(reasoning, "gap");
  const card = entryCard(scored);
  const signal = powerSignalCategoryFor(card);
  return Object.freeze({
    roleFit: round(primary),
    synergy: round(synergy),
    manaEfficiency: round(mana),
    gapFilled: round(gap),
    bracketImpact: round(bracket),
    powerSignal: signal || null,
  });
}

const PHRASES = {
  tracked_role: (detail, weight) => `Fills ${detail.replaceAll("_", " ")} (${weight})`,
  curve_deficit: (detail, weight) => `Open curve slot at ${detail} mana (${weight})`,
  curve_band: (detail, weight) => `Fits the ${detail} mana band (${weight})`,
  curve_congestion: (detail, weight) => `Curve is already full at ${detail} mana (${weight})`,
  unsupported_high_cmc: (_detail, weight) => `High mana value without enough support (${weight})`,
  power_pressure: (_detail, weight) => `Power signal under a lower-bracket target (${weight})`,
  budget_pressure: (_detail, weight) => `Costs more than the budget line (${weight})`,
  interaction_present: (detail, weight) => `Connects to ${detail} card${detail === "1" ? "" : "s"} already in the deck (${weight})`,
  interaction_missing: (detail, weight) => `Missing ${detail} connection${detail === "1" ? "" : "s"} (${weight})`,
  commander_connection: (_detail, weight) => `Connects to the commander (${weight})`,
  package_core: (detail, weight) => `Core piece of the ${detail.replaceAll("_", " ")} shell (${weight})`,
  package_support: (detail, weight) => `Supports the ${detail.replaceAll("_", " ")} shell (${weight})`,
  package_leg: (detail, weight) => `Covers a side of the ${detail.replaceAll("_", " ")} shell (${weight})`,
  opportunity_cost: (_detail, weight) => `Does not fill an open gap (${weight})`,
  orphan_payoff: (_detail, weight) => `Payoff without the cards that feed it (${weight})`,
  unsupported_anchor: (_detail, weight) => `Expensive piece without partners (${weight})`,
  oversupply_guardrail: (_detail, weight) => `Repeats a need the deck already covered (${weight})`,
  justification_overlap: (_detail, weight) => `Overlaps a card already picked (${weight})`,
  false_friend: (_detail, weight) => `Looks like a fit and works against the shell (${weight})`,
  supported_threat: (_detail, weight) => `Threat the deck can support (${weight})`,
  footprint_novelty: (_detail, weight) => `Adds something the shell does not already have (${weight})`,
  sequence_stage: (detail, weight) => `Helps the ${detail.replaceAll("_", " ")} stage (${weight})`,
};

function phrases(entries, sign) {
  return (entries || [])
    .filter((entry) => (sign === "pro" ? entry.weight > 0 : entry.weight < 0) && PHRASES[entry.kind])
    .slice()
    .sort((left, right) => Math.abs(right.weight) - Math.abs(left.weight))
    .map((entry) => PHRASES[entry.kind](String(entry.detail ?? entry.key ?? ""), round(entry.weight)))
    .filter((line, index, all) => all.indexOf(line) === index);
}

function priceOf(card) {
  const value = Number(card?.priceUsd);
  return Number.isFinite(value) ? round(value, 2) : null;
}

export function presentScoredCard(category, scored, options = {}) {
  const candidate = scored?.candidate || {};
  const card = entryCard(scored);
  const roles = candidate.roles || [];
  const sameSlot = options.competes ? Boolean(options.competes(candidate)) : roles.includes(category);
  const tracked = TRACKED_ROLES.filter((role) => roles.includes(role));
  const role = sameSlot
    ? guidedCategoryLabel(category)
    : (tracked.map((id) => guidedCategoryLabel(id)).join(", ") || "Other");
  const quality = Number.isFinite(candidate.score) ? round(candidate.score) : null;
  const pros = phrases(scored?.delta?.positives, "pro").slice(0, 3);
  const cons = phrases(scored?.delta?.negatives, "con").slice(0, 2);
  for (const reason of scored?.reasoning?.reasons || []) {
    if (!reason?.text) continue;
    if (reason.weight > 0 && pros.length < 3 && !pros.includes(reason.text)) pros.push(reason.text);
    if (reason.weight < 0 && cons.length < 2 && !cons.includes(reason.text)) cons.push(reason.text);
  }
  return Object.freeze({
    name: entryName(scored),
    typeLine: card.typeLine || "",
    manaCost: card.manaCost || "",
    cmc: Number.isFinite(Number(candidate.cmc ?? card.cmc)) ? Number(candidate.cmc ?? card.cmc) : null,
    priceUsd: priceOf(card),
    colorIdentity: Object.freeze([...(card.colorIdentity || card.colors || [])].filter((color) => typeof color === "string")),
    role,
    sameSlot,
    rank: round(scored?.rank || 0),
    quality,
    factors: rankingFactors(category, scored),
    pros: Object.freeze(pros),
    cons: Object.freeze(cons),
    job: guidedJobKey(candidate),
  });
}

const FACTOR_LABEL = Object.freeze({
  roleFit: "Role fit",
  synergy: "Synergy",
  manaEfficiency: "Mana efficiency",
  gapFilled: "Gap filled",
  bracketImpact: "Bracket impact",
});

function formatScore(value) {
  const number = round(value);
  return Number.isInteger(number) ? String(number) : String(number);
}

/** Two or three concrete gaps, only where the winner's numbers are actually higher. */
export function reasonsWinnerRanksHigher(winner, runner) {
  const reasons = Object.keys(FACTOR_LABEL)
    .map((key) => ({ key, delta: winner.factors[key] - runner.factors[key] }))
    .filter((row) => row.delta > 0.05)
    .sort((left, right) => right.delta - left.delta)
    .slice(0, 3)
    .map((row) => `${FACTOR_LABEL[row.key]} ${formatScore(winner.factors[row.key])} against ${formatScore(runner.factors[row.key])}.`);
  for (const con of runner.cons || []) {
    if (reasons.length >= 3) break;
    if (!(winner.cons || []).includes(con)) reasons.push(`${runner.name} is docked: ${con}.`);
  }
  if (reasons.length < 2 && winner.quality != null && runner.quality != null && winner.quality - runner.quality > 0.05) {
    reasons.push(`Card quality ${formatScore(winner.quality)} against ${formatScore(runner.quality)}.`);
  }
  if (reasons.length < 2 && winner.rank - runner.rank > 0.05) {
    reasons.push(`Engine score ${formatScore(winner.rank)} against ${formatScore(runner.rank)}.`);
  }
  return Object.freeze(reasons.slice(0, 3));
}

function competesForSlot(entry, options) {
  if (options.competes) return Boolean(options.competes(entry.candidate));
  const job = guidedJobKey(entry.candidate);
  return Boolean(job);
}

/** The next card that is actually eligible for this slot, not merely the same tag set. */
function nearestContender(scored, options) {
  const best = scored?.[0];
  if (!best || !competesForSlot(best, options)) return null;
  return scored.slice(1).find((entry) => competesForSlot(entry, options)) || null;
}

/**
 * Winner versus the next card that does the same job.
 * Null when no same-job runner-up exists — the panel stays hidden.
 */
export function comparisonFromScored(category, scored, options = {}) {
  const runner = nearestContender(scored, options);
  if (!runner) return null;
  const winner = presentScoredCard(category, scored[0], options);
  const runnerUp = presentScoredCard(category, runner, options);
  if (!winner.name || winner.name === runnerUp.name) return null;
  const label = guidedCategoryLabel(category).toLowerCase();
  const sharedSlot = winner.sameSlot && runnerUp.sameSlot
    ? `Both fill the ${label} slot.`
    : `Both do the same job (${winner.role}), so they compete for this slot.`;
  return Object.freeze({
    sharedSlot,
    winnerReasons: reasonsWinnerRanksHigher(winner, runnerUp),
    winner: Object.freeze({ ...winner, place: 1 }),
    runnerUp: Object.freeze({ ...runnerUp, place: 2 }),
  });
}

function differentRoleNote(card, category) {
  if (!card || card.sameSlot) return null;
  const label = guidedCategoryLabel(category).toLowerCase();
  const doing = card.role && card.role !== "Other" ? ` It reads as ${card.role.toLowerCase()}.` : "";
  return `${card.name} does not fill the ${label} role.${doing} It is in the deck anyway.`;
}

/**
 * The player's card ranked against the slot's top two scored entries.
 * The card is included even when it loses, and even when it fills another role.
 */
export function threeWayComparison(category, userScored, contenders, options = {}) {
  const rows = [];
  const seen = new Set();
  for (const entry of [userScored, ...(contenders || [])]) {
    const name = entryName(entry);
    const key = name.toLocaleLowerCase("en");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    rows.push(entry);
  }
  rows.sort((left, right) => right.rank - left.rank || entryName(left).localeCompare(entryName(right)));
  const userKey = entryName(userScored).toLocaleLowerCase("en");
  const ranked = rows.map((entry, index) => Object.freeze({
    ...presentScoredCard(category, entry, options),
    place: index + 1,
    picked: entryName(entry).toLocaleLowerCase("en") === userKey,
  }));
  const picked = ranked.find((card) => card.picked) || null;
  return Object.freeze({
    addedName: picked?.name || entryName(userScored),
    ranked: Object.freeze(ranked),
    differentRole: differentRoleNote(picked, category),
  });
}
