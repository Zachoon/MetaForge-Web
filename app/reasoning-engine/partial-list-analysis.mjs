// =============================================================================
// Partial List Analysis
// =============================================================================
// For a pasted list: infer its plan, flag weak or off-plan cards with
// reasons, and recommend which roles to walk through next. It only advises:
// it never returns cards to add, and nothing here fills a slot.
// =============================================================================

import { candidateSynergy, entryNameOf } from "./mechanic-graph.mjs";
import { CATEGORY_ROLE, buildDeckProfile, cmcOf, isLand, pipsOf, planRoleOf, rolesOf } from "./deck-profile.mjs";

const ROLE_CATEGORY = Object.freeze(Object.fromEntries(Object.entries(CATEGORY_ROLE).map(([category, role]) => [role, category])));

/**
 * @param {{ commanders?: any[], entries?: any[], deckSize?: number, hints?: string, colorIdentity?: string[] | null }} [input]
 */
export function analyzePartialList({ commanders = [], entries = [], deckSize = 100, hints = "", colorIdentity = null } = {}) {
  const profile = buildDeckProfile({ commanders, picks: entries, deckSize, hints, colorIdentity });
  const identity = new Set(profile.colors.identity);
  const commanderNames = commanders.map(entryNameOf);
  const flagged = [];
  const strengths = [];

  for (const entry of entries) {
    if (isLand(entry)) continue;
    const name = entryNameOf(entry);
    const reasons = [];
    const roles = rolesOf(entry);
    const planRole = planRoleOf(entry, profile.plan);
    const others = [...commanders, ...entries.filter((other) => other !== entry)];
    const synergy = candidateSynergy(entry, others, { commanderNames });
    const cmc = cmcOf(entry);

    const offColors = Object.entries(pipsOf(entry)).filter(([color, value]) => value > 0 && identity.size && !identity.has(color)).map(([color]) => color);
    if (offColors.length) reasons.push({ kind: "illegal", severity: 3, text: `Outside your commander's colors (${offColors.join("")}).` });
    if (!planRole && !roles.size && synergy.score === 0) {
      reasons.push({ kind: "off-plan", severity: 2, text: `No role in the deck and no mechanical link to your commander or other cards.` });
    } else if (!planRole && synergy.score === 0 && profile.plan.confidence >= 0.4 && ![...roles].some((role) => ["ramp", "draw", "removal", "wipes"].includes(role))) {
      reasons.push({ kind: "off-plan", severity: 1, text: `Doesn't support the ${profile.plan.label.toLowerCase()} plan.` });
    }
    if (cmc >= 6 && !roles.has("winConditions") && !planRole && !roles.has("wipes")) reasons.push({ kind: "weak", severity: 1, text: `${cmc} mana for a card that neither wins nor drives your plan.` });
    const overRole = profile.roles.find((row) => row.status === "over" && roles.has(row.role) && roles.size === 1);
    if (overRole && !planRole) reasons.push({ kind: "redundant", severity: 1, text: `One of ${overRole.actual} ${overRole.label}; the deck wants at most ${overRole.target.max}.` });

    if (reasons.length) {
      flagged.push(Object.freeze({ name, severity: Math.max(...reasons.map((reason) => reason.severity)), reasons: Object.freeze(reasons.map((reason) => Object.freeze(reason))) }));
    } else if (synergy.partners.length >= 2 || planRole === "engine") {
      strengths.push(Object.freeze({ name, text: synergy.partners[0]?.mechanism || `Core ${profile.plan.label.toLowerCase()} piece.`, links: synergy.partners.length }));
    }
  }
  flagged.sort((left, right) => right.severity - left.severity || left.name.localeCompare(right.name));
  strengths.sort((left, right) => right.links - left.links || left.name.localeCompare(right.name));

  const nextSteps = profile.gaps
    .filter((row) => ROLE_CATEGORY[row.role])
    .slice(0, 4)
    .map((row) => Object.freeze({
      category: ROLE_CATEGORY[row.role],
      role: row.role,
      why: `${row.actual} ${row.label} of about ${row.target.min}-${row.target.max}.`,
      urgency: row.urgency,
    }));
  const landRow = profile.roles.find((row) => row.role === "lands");

  return Object.freeze({
    plan: profile.plan,
    planBalance: profile.planBalance,
    profile,
    flagged: Object.freeze(flagged),
    strengths: Object.freeze(strengths.slice(0, 5)),
    nextSteps: Object.freeze(nextSteps),
    notes: Object.freeze([
      ...profile.curve.issues.map((issue) => `Curve: ${issue}.`),
      ...profile.colors.requirements.filter((row) => row.underSupported).map((row) => `Mana: ${row.color} is ${Math.round(row.share * 100)}% of your pips but only ${Math.round((row.sourceShare || 0) * 100)}% of your sources.`),
      ...(landRow && landRow.status === "under" && entries.length >= 40 ? [`Lands: ${landRow.actual} so far; plan for about ${landRow.target.min}.`] : []),
    ]),
    // Explicit contract: analysis never adds cards.
    autoFilled: false,
  });
}
