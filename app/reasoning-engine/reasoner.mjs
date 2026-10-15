// =============================================================================
// Explainable Card Reasoner
// =============================================================================
// Scores one candidate against the running deck profile and the interaction
// graph, and says why in structured form. Every suggestion carries:
//   reasons[]  - { kind, text, weight } where kind is one of
//                gap | synergy | plan | curve | color | trade-off
//   worksWith  - [{ name, mechanism }] real mechanical links to picks/commander
//   confidence - 0..1 plus a low/medium/high label, from how much independent
//                evidence supports the pick
//   delta      - a capped rank adjustment the guided ranker adds on top of
//                its existing score (never a filter)
// =============================================================================

import { candidateSynergy, entryNameOf, mechanicsOf } from "./mechanic-graph.mjs";
import { CATEGORY_ROLE, ROLE_LABELS, cmcOf, curveBucket, isLand, pipsOf, planRoleOf, rolesOf } from "./deck-profile.mjs";

export const REASONING_LIMITS = Object.freeze({ maxBoost: 16, maxPenalty: -14 });

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const cardOf = (entry) => entry?.card || entry || {};
const priceOf = (entry) => {
  const value = Number(cardOf(entry).priceUsd ?? entry?.priceUsd);
  return Number.isFinite(value) ? value : null;
};
const PLAN_ROLE_COPY = Object.freeze({ payoff: "pays off", enabler: "feeds", engine: "both feeds and pays off" });

export function confidenceLabel(value) {
  return value >= 0.7 ? "high" : value >= 0.45 ? "medium" : "low";
}

/**
 * @param {any} candidate analyzed row or card
 * @param {{ profile: any, deckEntries?: any[], commanders?: any[], category?: string }} context
 */
export function reasonAboutCandidate(candidate, { profile, deckEntries = [], commanders = [], category = "" } = /** @type {any} */ ({})) {
  const reasons = [];
  let delta = 0;
  let evidence = 0;
  const name = entryNameOf(candidate);
  const roles = rolesOf(candidate);
  const stepRole = CATEGORY_ROLE[category] || null;

  // 1. Gaps it fills, most urgent first. The current step's role counts most.
  const gapRows = (profile?.gaps || []).filter((row) => roles.has(row.role));
  for (const row of gapRows) {
    const weight = round(row.urgency * (row.role === stepRole ? 6 : 3));
    delta += weight;
    evidence += row.role === stepRole ? 1 : 0.5;
    reasons.push(Object.freeze({ kind: "gap", role: row.role, weight,
      text: `Fills a gap: ${row.label} ${row.actual}/${row.target.min} so far.` }));
  }
  const overRows = (profile?.roles || []).filter((row) => row.status === "over" && roles.has(row.role) && row.role !== stepRole);
  for (const row of overRows) {
    delta -= 1.5;
    reasons.push(Object.freeze({ kind: "trade-off", role: row.role, weight: -1.5, text: `You already have plenty of ${row.label} (${row.actual}).` }));
  }

  // 2. Mechanical synergy with picks and commander, from the interaction graph.
  const commanderNames = commanders.map(entryNameOf);
  const synergy = candidateSynergy(candidate, [...commanders, ...deckEntries], { commanderNames });
  const worksWith = synergy.partners.slice(0, 3).map((partner) => Object.freeze({ name: partner.name, mechanism: partner.mechanism, isCommander: partner.isCommander }));
  if (synergy.score > 0) {
    const weight = round(Math.min(7, synergy.score * 2.2));
    delta += weight;
    evidence += Math.min(1.5, synergy.partners.length * 0.5);
    const lead = synergy.partners[0];
    reasons.push(Object.freeze({ kind: "synergy", weight, partners: Object.freeze(synergy.partners.slice(0, 3).map((partner) => partner.name)),
      text: `${lead.mechanism}${synergy.partners.length > 1 ? ` (+${synergy.partners.length - 1} more link${synergy.partners.length > 2 ? "s" : ""})` : ""}.` }));
  }

  // 3. Plan fit.
  const planRole = planRoleOf(candidate, profile?.plan);
  if (planRole && profile.plan.confidence > 0) {
    let weight = 1.5 + profile.plan.confidence * 2.5;
    if ((profile.planBalance === "needs-enablers" && planRole !== "payoff") || (profile.planBalance === "needs-payoffs" && planRole !== "enabler")) weight += 1.5;
    weight = round(weight);
    delta += weight;
    evidence += 0.75;
    reasons.push(Object.freeze({ kind: "plan", weight, text: `It ${PLAN_ROLE_COPY[planRole]} your ${profile.plan.label.toLowerCase()} plan.` }));
  } else if (!planRole && !synergy.score && profile?.plan?.confidence >= 0.5 && !gapRows.length && !isLand(candidate)) {
    delta -= 3;
    reasons.push(Object.freeze({ kind: "trade-off", weight: -3, text: `Doesn't advance your ${profile.plan.label.toLowerCase()} plan.` }));
  }

  // 4. Curve fit.
  const cmc = cmcOf(candidate);
  if (!isLand(candidate) && profile?.curve) {
    const bucket = curveBucket(cmc);
    const have = profile.curve.buckets[bucket];
    const want = profile.curve.targets[bucket];
    const label = profile.curve.labels[bucket];
    if (have < want * 0.6 && profile.nonland >= 5) {
      delta += 1.5;
      evidence += 0.25;
      reasons.push(Object.freeze({ kind: "curve", weight: 1.5, text: `Your curve is light at ${label} mana (${have} of about ${want}).` }));
    } else if (have >= want && cmc >= 5) {
      delta -= 2.5;
      reasons.push(Object.freeze({ kind: "curve", weight: -2.5, text: `Your curve already has ${have} cards at ${label} mana.` }));
    }
    if (profile.curve.issues.includes("top-heavy") && cmc <= 2) {
      delta += 1.5;
      reasons.push(Object.freeze({ kind: "curve", weight: 1.5, text: "Cheap, and your deck is running top-heavy." }));
    }
  }

  // 5. Color fit: heavy pips in a color the mana base can't yet support.
  const pips = pipsOf(candidate);
  const strained = (profile?.colors?.requirements || []).filter((row) => row.underSupported && pips[row.color] >= 2);
  if (strained.length) {
    delta -= 2;
    const pipRun = strained.map((row) => row.color.repeat(Math.max(1, Math.round(pips[row.color])))).join("");
    reasons.push(Object.freeze({ kind: "color", weight: -2, text: `Needs ${pipRun} early, and your mana sources for ${strained.length > 1 ? "those colors are" : "that color is"} thin.` }));
  } else if (!isLand(candidate) && Object.values(pips).filter((value) => value > 0).length === 0 && cmc > 0) {
    reasons.push(Object.freeze({ kind: "color", weight: 0, text: "Colorless, so it is easy to cast off any mana." }));
  }

  // 6. Other trade-offs worth saying out loud.
  const price = priceOf(candidate);
  if (price !== null && price > 15) reasons.push(Object.freeze({ kind: "trade-off", weight: 0, text: `Costs about $${price.toFixed(2)}.` }));
  if (cmc >= 6 && !roles.has("winConditions")) reasons.push(Object.freeze({ kind: "trade-off", weight: 0, text: `Slow at ${cmc} mana.` }));
  if (roles.size <= 1 && !synergy.score && !planRole && stepRole !== "plan") reasons.push(Object.freeze({ kind: "trade-off", weight: 0, text: "Does one job and nothing else for this deck." }));

  const capped = Math.max(REASONING_LIMITS.maxPenalty, Math.min(REASONING_LIMITS.maxBoost, delta));
  // Confidence: independent evidence saturates toward ~0.9; a forming plan
  // or a thin pick list lowers it because the profile itself is uncertain.
  const profileCertainty = 0.6 + 0.4 * Math.min(1, (profile?.picks || 0) / 15);
  const confidence = round(Math.max(0.15, Math.min(0.95, (0.3 + 0.6 * (1 - Math.exp(-evidence / 1.6))) * profileCertainty)));

  reasons.sort((left, right) => Math.abs(right.weight) - Math.abs(left.weight));
  return Object.freeze({
    name,
    delta: round(capped),
    synergyScore: synergy.score,
    resources: synergy.resources,
    reasons: Object.freeze(reasons),
    worksWith: Object.freeze(worksWith),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    mechanics: mechanicsOf(candidate),
  });
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
