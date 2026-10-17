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

import { candidateSynergy, entryNameOf, mechanicsOf, spendOnlyPhrase } from "./mechanic-graph.mjs";
import { CATEGORY_ROLE, ROLE_LABELS, cmcOf, curveBucket, isLand, pipsOf, planSupportOf, rolesOf } from "./deck-profile.mjs";
import { describeCardJob } from "./oracle-mechanics.mjs";

export const REASONING_LIMITS = Object.freeze({ maxBoost: 16, maxPenalty: -14 });

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const cardOf = (entry) => entry?.card || entry || {};
const priceOf = (entry) => {
  const value = Number(cardOf(entry).priceUsd ?? entry?.priceUsd);
  return Number.isFinite(value) ? value : null;
};
const PLAN_ROLE_COPY = Object.freeze({ payoff: "pays off", enabler: "feeds", engine: "both feeds and pays off" });

function typeMatchesSpendOnly(candidate, restriction) {
  const line = String((candidate?.card || candidate)?.typeLine || candidate?.typeLine || "");
  if (!restriction) return false;
  if (restriction.scope === "instant-or-sorcery") return /\binstant\b|\bsorcery\b/i.test(line);
  if (restriction.scope === "creature-spell") return /\bcreature\b/i.test(line);
  if (restriction.scope === "artifact-spell") return /\bartifact\b/i.test(line);
  if (restriction.scope === "commander") return false;
  if (restriction.type) return new RegExp(`\\b${restriction.type}\\b`, "i").test(line);
  return false;
}

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

  // 3. Plan fit. Only a plan this card's own text supports may be named.
  const support = planSupportOf(candidate, profile?.plan);
  const planRole = support?.role || null;
  const job = describeCardJob(candidate);
  const etb = mechanicsOf(candidate).etb || {};
  const selfEtb = Boolean(mechanicsOf(candidate).selfEtb);
  let blinkFuel = false;
  let castOnly = false;
  // A hybrid label such as "Spells and artifact ramp" already includes the
  // secondary. Supporting that secondary advances the plan the player sees.
  const coveredSecondary = Boolean(support && profile?.plan?.coversSecondary && support.id === profile.plan.secondary?.id);
  if (support && profile.plan.confidence > 0) {
    let weight = 1.5 + profile.plan.confidence * 2.5;
    if ((profile.planBalance === "needs-enablers" && planRole !== "payoff") || (profile.planBalance === "needs-payoffs" && planRole !== "enabler")) weight += 1.5;
    const onBlink = profile.plan.id === "blink" && support.id === "blink";
    blinkFuel = Boolean(onBlink && selfEtb && etb.phrase && etb.repeatsOnBlink && etb.tier);
    castOnly = Boolean(onBlink && selfEtb && etb.phrase && !etb.repeatsOnBlink);
    if (blinkFuel) weight += etb.score;
    weight = round(weight);
    delta += weight;
    evidence += support.id === profile.plan.id || coveredSecondary ? 0.75 : 0.35;
    const offPrimary = support.id !== profile.plan.id && !coveredSecondary;
    const named = (offPrimary ? support.label : profile.plan.label).toLowerCase();
    const lead = etb.phrase ? `${etb.phrase.charAt(0).toUpperCase()}${etb.phrase.slice(1)}` : "";
    let text = offPrimary
      ? `It ${PLAN_ROLE_COPY[planRole]} your ${named} plan. It does not advance the ${profile.plan.label.toLowerCase()} plan.`
      : `It ${PLAN_ROLE_COPY[planRole]} your ${named} plan.`;
    if (!offPrimary && blinkFuel) text = `${lead} each time it re-enters.`;
    else if (!offPrimary && castOnly) text = `${lead} only if you cast it.`;
    reasons.push(Object.freeze({ kind: "plan", weight, text }));
  } else if (!support && profile?.plan?.confidence >= 0.5 && !isLand(candidate)) {
    if (!synergy.score && !gapRows.length) delta -= 3;
    const does = job ? `${job.charAt(0).toUpperCase()}${job.slice(1)}. ` : "";
    reasons.push(Object.freeze({ kind: "plan", weight: synergy.score || gapRows.length ? 0 : -3, text: `${does}It doesn't advance your ${profile.plan.label.toLowerCase()} plan.` }));
  }

  const spendCommander = commanders.find((entry) => (mechanicsOf(entry).restrictions || []).some((item) => item.kind === "spend-only"));
  const spendOnly = (spendCommander ? mechanicsOf(spendCommander).restrictions : []).find((entry) => entry.kind === "spend-only");
  const spendName = entryNameOf(spendCommander);
  if (spendOnly && spendName && typeMatchesSpendOnly(candidate, spendOnly)) {
    reasons.push(Object.freeze({ kind: "synergy", weight: 1, text: `${spendName}'s mana can pay for this, ${spendOnlyPhrase(spendOnly)}.` }));
  }
  if (mechanicsOf(candidate).rampMode === "conditional") {
    reasons.push(Object.freeze({ kind: "trade-off", weight: 0, text: `This mana ${spendOnlyPhrase(mechanicsOf(candidate).restrictions?.find((entry) => entry.kind === "spend-only") || spendOnly) || "is restricted"}, so it does not fill the general ramp gap.` }));
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
  // Confidence follows the claims we are willing to make. A direct rules-text
  // link does not become "low" just because the deck is young, and a thin
  // fit does not get an unqualified sentence.
  const typeLine = String((candidate?.card || candidate)?.typeLine || candidate?.typeLine || "");
  const tribe = profile?.plan?.creatureType;
  const printedTribe = Boolean(tribe && support?.id === "typal" && support.id === profile?.plan?.id && new RegExp(`\\b${tribe}s?\\b`, "i").test(typeLine));
  const printedHistoric = Boolean(support?.id === "historic" && support.id === profile?.plan?.id && /\bartifact\b|\bsaga\b|\blegendary\b/i.test(typeLine));
  const commanderLink = synergy.partners.some((partner) => partner.isCommander) || printedTribe || printedHistoric;
  const onPlan = Boolean(support && (support.id === profile?.plan?.id || coveredSecondary));
  let confidence = 0.34;
  if (commanderLink && (onPlan || gapRows.length)) confidence = 0.82;
  else if (commanderLink || (gapRows.length && job) || (onPlan && (profile?.plan?.confidence || 0) >= 0.7)) confidence = 0.62;
  else if (support) confidence = 0.5;
  // A blink target's confidence follows how strong the enter ability is.
  // Minor stays medium so the effect sentence is not rewritten away.
  if (blinkFuel) confidence = etb.tier === "premium" ? 0.84 : etb.tier === "solid" ? 0.6 : 0.48;
  const label = confidenceLabel(confidence);
  const confidenceNote = label === "high"
    ? null
    : label === "medium"
      ? "The card's text supports this. The rest of the deck is still settling."
      : "Low confidence: this fit is thin. A card whose text shares the commander's mechanic would raise it.";
  if (label === "low") {
    for (let index = 0; index < reasons.length; index += 1) {
      const reason = reasons[index];
      if (reason.kind === "plan" && !/doesn't advance|does not advance|thin read/i.test(reason.text)) {
        reasons[index] = Object.freeze({ ...reason, text: `This may relate to the plan, but that read is still thin. ${job ? `The card ${job}.` : ""} More cards that share one mechanic would raise confidence.`.replace(/\s+/g, " ").trim() });
      }
    }
  }

  reasons.sort((left, right) => Math.abs(right.weight) - Math.abs(left.weight));
  let summary = label === "low"
    ? (job ? `might fit because it ${job}, but that is still a thin read` : "is only a thin fit so far")
    : (job || null);
  if (blinkFuel && label !== "low") summary = `${etb.phrase} each time it re-enters`;
  else if (castOnly && label !== "low") summary = `${etb.phrase} only if you cast it`;
  return Object.freeze({
    name,
    delta: round(capped),
    synergyScore: synergy.score,
    resources: synergy.resources,
    reasons: Object.freeze(reasons),
    worksWith: Object.freeze(worksWith),
    summary,
    confidence,
    confidenceLabel: label,
    confidenceNote,
    mechanics: mechanicsOf(candidate),
  });
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
