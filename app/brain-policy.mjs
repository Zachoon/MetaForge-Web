// =============================================================================
// Brain policy registry — Brain v1 control vs experimental branches
// =============================================================================
// Default construction is always brain_v1_control (frozen).
// Experimental policies are opt-in via input.brainPolicy and must remain
// A/B-runnable against the same inputs. Never promote automatically.
// =============================================================================

export const BRAIN_POLICY_V1_CONTROL = "brain_v1_control";
export const BRAIN_POLICY_V2_EXP001_INTERACTION = "brain_v2_exp001_interaction";

const freeze = (value) => Object.freeze(value);

/**
 * Brain v1 frozen wiring coefficients (prospective + live fill).
 * Byte-stable defaults — do not edit without Validation Harness.
 */
export const BRAIN_V1_INTERACTION_WIRING = freeze({
  id: BRAIN_POLICY_V1_CONTROL,
  partnerPresentWeight: 4,
  partnerPresentCap: 16,
  partnerMissingWeight: 5,
  partnerMissingCap: 18,
  liveSynergyMultiplier: 1.5,
  multifunctionConnectedBonus: 0,
  efficientConnectedCmcBonus: 0,
  efficientCmcThreshold: 2,
  // Power-tier gate unused for control (no-op).
  applyPowerTiers: freeze(["Casual", "Focused", "High-Power", "Maximum", null]),
  raiseRoleInteractionFloor: 0,
  trackedRoleInteractionBaseWeight: 10,
});

/**
 * Exp001 — Interaction Structure
 * Evidence: replicated Level-A interactionDensity (producer↔payoff wiring),
 * not raw role:interaction count. Prefer denser live wiring + quality bonuses
 * over raising removal floors.
 *
 * STATUS: REJECTED for promotion (2026-08-10). See docs/REJECTED_EXPERIMENTS.md.
 * Retained as opt-in research so the failed A/B remains reproducible.
 * Do not make this the default. Do not retry as interactionScore += X.
 * Next agenda: docs/INTERACTION_TOPOLOGY_RESEARCH.md
 *
 * Power-tier gate: skip Casual/Focused so cEDH-derived priors do not force
 * mid-power decks into denser competitive shells.
 */
export const BRAIN_V2_EXP001_INTERACTION_WIRING = freeze({
  id: BRAIN_POLICY_V2_EXP001_INTERACTION,
  partnerPresentWeight: 6.5,
  partnerPresentCap: 24,
  partnerMissingWeight: 5,
  partnerMissingCap: 18,
  liveSynergyMultiplier: 2.35,
  multifunctionConnectedBonus: 3.5,
  efficientConnectedCmcBonus: 2,
  efficientCmcThreshold: 2,
  applyPowerTiers: freeze(["High-Power", "Maximum", null]),
  raiseRoleInteractionFloor: 0,
  trackedRoleInteractionBaseWeight: 10,
  evidenceHypothesisId: "psh:kraum, ludevic's opus / tymna the weaver:interaction",
  evidenceFeature: "interactionDensity",
  underweightLocation: "prospective.interaction_present + live_fill.inDeckSynergy (G/F denser wiring under-rewarded vs package weights)",
});

const POLICIES = freeze({
  [BRAIN_POLICY_V1_CONTROL]: BRAIN_V1_INTERACTION_WIRING,
  [BRAIN_POLICY_V2_EXP001_INTERACTION]: BRAIN_V2_EXP001_INTERACTION_WIRING,
});

export function resolveBrainPolicy(policyId = null) {
  if (!policyId || policyId === BRAIN_POLICY_V1_CONTROL) {
    return BRAIN_V1_INTERACTION_WIRING;
  }
  return POLICIES[policyId] || BRAIN_V1_INTERACTION_WIRING;
}

/**
 * Whether Exp001 (or any gated policy) should apply for this power tier.
 * Casual / Focused never inherit High-Power/cEDH wiring density.
 */
export function brainPolicyAppliesToPowerTier(policy, targetPowerTier = null) {
  if (!policy || policy.id === BRAIN_POLICY_V1_CONTROL) return true;
  const allowed = policy.applyPowerTiers || [];
  const tier = targetPowerTier == null ? null : targetPowerTier;
  return allowed.includes(tier);
}

export function activeInteractionWiring(policyId, targetPowerTier = null) {
  const policy = resolveBrainPolicy(policyId);
  if (!brainPolicyAppliesToPowerTier(policy, targetPowerTier)) {
    return BRAIN_V1_INTERACTION_WIRING;
  }
  return policy;
}

export function isExperimentalBrainPolicy(policyId) {
  return Boolean(policyId) && policyId !== BRAIN_POLICY_V1_CONTROL;
}
