// =============================================================================
// Construction Phase Policy
// =============================================================================
// State-driven build phases. Raw standalone quality must not weigh the same
// from the first structural pick through the last refinement slot.
//
// Phases are derived from deficitState + partial deck, not pick ordinals.
// Weights are centralized here — do not sprinkle magic coefficients in fill.
// =============================================================================

export const CONSTRUCTION_PHASE_VERSION = "construction-phase-v1";

/**
 * Centralized phase weight policy.
 *
 * rawQuality: multiplier on standalone card score
 * prospectiveDelta: multiplier on prospectiveSlotDelta.total
 * synergy / orphanTax / disconnectTax: light existing fill terms
 *
 * Foundation maximizes structural fit. Completion restores room for card
 * quality once mandatory floors are already satisfied.
 */
export const PHASE_WEIGHT_POLICY = Object.freeze({
  foundation: Object.freeze({
    rawQuality: 0.18,
    prospectiveDelta: 1.18,
    synergy: 0.85,
    orphanTax: 1.25,
    disconnectTax: 1.35,
    redundancyPenalty: 1.2,
    description: "Mandatory floors, commander support, and critical roles dominate.",
  }),
  development: Object.freeze({
    rawQuality: 0.30,
    prospectiveDelta: 1.05,
    synergy: 1.05,
    orphanTax: 1.1,
    disconnectTax: 1.15,
    redundancyPenalty: 1.05,
    description: "Balance package legs, engines, curve, and interaction density.",
  }),
  refinement: Object.freeze({
    rawQuality: 0.48,
    prospectiveDelta: 0.92,
    synergy: 1.0,
    orphanTax: 0.95,
    disconnectTax: 1.0,
    redundancyPenalty: 0.95,
    description: "Improve multifunction quality and resilience without reopening floors.",
  }),
  completion: Object.freeze({
    rawQuality: 0.62,
    prospectiveDelta: 0.78,
    synergy: 0.9,
    orphanTax: 0.85,
    disconnectTax: 0.9,
    redundancyPenalty: 0.9,
    description: "Close residual gaps; prefer efficient high-quality occupants.",
  }),
});

const PHASE_ORDER = Object.freeze(["foundation", "development", "refinement", "completion"]);

const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function packageCoreDeficits(deficitState = {}) {
  return Object.values(deficitState.packages || {}).reduce((sum, pkg) => sum + (pkg.core?.deficit || 0), 0);
}

function packageLegDeficits(deficitState = {}) {
  return Object.values(deficitState.packages || {}).reduce((sum, pkg) =>
    sum + Object.values(pkg.legs || {}).reduce((inner, leg) => inner + (leg.deficit || 0), 0), 0);
}

function criticalRoleDeficits(deficitState = {}) {
  const roles = deficitState.roles || {};
  return ["ramp", "draw", "interaction"].reduce((sum, role) => sum + (roles[role]?.deficit || 0), 0);
}

function openRoleDeficits(deficitState = {}) {
  return Object.values(deficitState.roles || {}).filter((role) => (role.deficit || 0) > 0).length;
}

function curvePressure(deficitState = {}) {
  const underfilled = deficitState.underfilledCurveBands?.length || 0;
  const congested = deficitState.congestedCurveBands?.length || 0;
  return underfilled + congested;
}

function commanderNeed(deficitState = {}, intent = {}) {
  const hasCommanderSignals = (intent.commanderMechanics?.produces?.length || 0) + (intent.commanderMechanics?.rewards?.length || 0) > 0;
  if (!hasCommanderSignals) return 0;
  return Math.max(0, 6 - (deficitState.commanderConnections || 0));
}

/**
 * Derive the active construction phase from live deck state.
 */
export function constructionPhase(deficitState = {}, partialDeck = [], intent = {}, options = {}) {
  const coreDeficit = packageCoreDeficits(deficitState);
  const legDeficit = packageLegDeficits(deficitState);
  const criticalRoles = criticalRoleDeficits(deficitState);
  const commanderGap = commanderNeed(deficitState, intent);
  const curve = curvePressure(deficitState);
  const roleGaps = openRoleDeficits(deficitState);
  const nonlandCount = partialDeck.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .reduce((sum, row) => sum + Number(row.quantity || 1), 0);

  const reasons = [];
  let phase = "completion";

  // Foundation: unfinished mandatory structure.
  if (coreDeficit > 0 || criticalRoles >= 6 || commanderGap >= 4) {
    phase = "foundation";
    if (coreDeficit > 0) reasons.push(`package core deficit ${coreDeficit}`);
    if (criticalRoles >= 6) reasons.push(`critical role deficit ${criticalRoles}`);
    if (commanderGap >= 4) reasons.push(`commander support gap ${commanderGap}`);
  } else if (legDeficit > 0 || curve >= 2 || (criticalRoles > 0 && nonlandCount < 40)) {
    phase = "development";
    if (legDeficit > 0) reasons.push(`package leg deficit ${legDeficit}`);
    if (curve >= 2) reasons.push(`curve pressure ${curve}`);
    if (criticalRoles > 0) reasons.push(`lingering critical roles ${criticalRoles}`);
  } else if (roleGaps > 1 || coreDeficit === 0 && legDeficit === 0 && nonlandCount < (options.spellTarget || 60) - 8) {
    phase = "refinement";
    if (roleGaps > 1) reasons.push(`open role gaps ${roleGaps}`);
    reasons.push("mandatory floors satisfied; improving card quality");
  } else {
    phase = "completion";
    reasons.push("floors satisfied; optimizing marginal slots");
  }

  // Explicit regression: callers can force an earlier phase after destructive repair.
  if (options.forcePhase && PHASE_ORDER.includes(options.forcePhase)) {
    const forcedIndex = PHASE_ORDER.indexOf(options.forcePhase);
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (forcedIndex < currentIndex) {
      phase = options.forcePhase;
      reasons.unshift(`regressed to ${phase} after structural damage`);
    }
  }

  return Object.freeze({
    version: CONSTRUCTION_PHASE_VERSION,
    phase,
    reasons: Object.freeze(reasons),
    metrics: Object.freeze({
      packageCoreDeficit: coreDeficit,
      packageLegDeficit: legDeficit,
      criticalRoleDeficit: criticalRoles,
      openRoleGaps: roleGaps,
      commanderGap,
      curvePressure: curve,
      nonlandCount,
    }),
  });
}

export function phaseWeights(phaseOrInfo) {
  const phase = typeof phaseOrInfo === "string" ? phaseOrInfo : phaseOrInfo?.phase;
  return PHASE_WEIGHT_POLICY[phase] || PHASE_WEIGHT_POLICY.development;
}

/**
 * Apply centralized phase weights to the live fill objective.
 */
export function applyPhaseWeights({
  rawScore = 0,
  prospectiveDelta = 0,
  synergy = 0,
  orphanPenalty = 0,
  disconnectTax = 0,
  phase,
}) {
  const weights = phaseWeights(phase);
  const adjusted = rawScore * weights.rawQuality
    + prospectiveDelta * weights.prospectiveDelta
    + synergy * weights.synergy
    - orphanPenalty * weights.orphanTax
    - disconnectTax * weights.disconnectTax;
  return Object.freeze({
    adjusted: round(adjusted),
    weights,
    phase: typeof phase === "string" ? phase : phase?.phase,
  });
}

/**
 * Mutable diagnostics collector for a single chooseSpells run.
 */
export function createConstructionPhaseTracker() {
  const picksByPhase = {
    foundation: [],
    development: [],
    refinement: [],
    completion: [],
  };
  const transitions = [];
  let previous = null;
  let deficitsClosed = 0;

  return {
    observe(phaseInfo, entry, delta) {
      const phase = phaseInfo.phase;
      if (previous && previous !== phase) {
        transitions.push(Object.freeze({
          from: previous,
          to: phase,
          reasons: phaseInfo.reasons,
          atCard: entry.card?.name || entry.name,
        }));
      }
      previous = phase;
      picksByPhase[phase].push(Object.freeze({
        name: entry.card?.name || entry.name,
        rawScore: round(Number(entry.score) || 0),
        delta: round(Number(delta?.total) || 0),
        deficitsFilled: Object.freeze([...(delta?.deficitsFilled || [])]),
      }));
      deficitsClosed += (delta?.deficitsFilled || []).length;
    },
    snapshot() {
      const summary = {};
      for (const phase of PHASE_ORDER) {
        const picks = picksByPhase[phase];
        const count = picks.length;
        summary[phase] = Object.freeze({
          picks: count,
          averageRawScore: count ? round(picks.reduce((sum, pick) => sum + pick.rawScore, 0) / count) : 0,
          averageProspectiveDelta: count ? round(picks.reduce((sum, pick) => sum + pick.delta, 0) / count) : 0,
          deficitsClosed: picks.reduce((sum, pick) => sum + pick.deficitsFilled.length, 0),
        });
      }
      return Object.freeze({
        version: CONSTRUCTION_PHASE_VERSION,
        policy: PHASE_WEIGHT_POLICY,
        picksByPhase: Object.freeze({
          foundation: Object.freeze([...picksByPhase.foundation]),
          development: Object.freeze([...picksByPhase.development]),
          refinement: Object.freeze([...picksByPhase.refinement]),
          completion: Object.freeze([...picksByPhase.completion]),
        }),
        summary: Object.freeze(summary),
        transitions: Object.freeze(transitions),
        totalDeficitsClosed: deficitsClosed,
        finalPhase: previous,
      });
    },
  };
}

/**
 * If a simulated/repaired deck loses mandatory coverage, regress phase.
 */
export function phaseAfterStructuralChange(beforeState, afterState, intent = {}) {
  const afterPhase = constructionPhase(afterState, [], intent);
  const beforePhase = constructionPhase(beforeState, [], intent);
  const beforeIndex = PHASE_ORDER.indexOf(beforePhase.phase);
  const afterIndex = PHASE_ORDER.indexOf(afterPhase.phase);
  if (afterIndex < beforeIndex) {
    return Object.freeze({
      ...afterPhase,
      regressed: true,
      from: beforePhase.phase,
      reasons: Object.freeze([`regressed from ${beforePhase.phase}`, ...afterPhase.reasons]),
    });
  }
  return Object.freeze({ ...afterPhase, regressed: false, from: beforePhase.phase });
}

export const CONSTRUCTION_PHASES = PHASE_ORDER;
