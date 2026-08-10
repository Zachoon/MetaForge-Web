// =============================================================================
// Construction Trace (Self-Evaluation v1)
// =============================================================================
// Observational pick-time records. Does NOT change construction weights.
// Prospective fields are belief at decision time; retrospective is attached later.
// =============================================================================

export const CONSTRUCTION_TRACE_VERSION = "construction-trace-v1";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const freeze = (value) => Object.freeze(value);

const DEFAULT_REJECTED_K = 3;

/**
 * Compact live deficit snapshot — only open deficits + notable surplus.
 * Avoids storing the full partial deck on every pick.
 */
export function compactDeficitSnapshot(deficitState = {}) {
  const roles = {};
  for (const [role, state] of Object.entries(deficitState.roles || {})) {
    if ((state.deficit || 0) > 0 || (state.surplus || 0) >= 3) {
      roles[role] = freeze({ deficit: state.deficit || 0, surplus: state.surplus || 0, status: state.status });
    }
  }
  const packages = {};
  for (const [id, pkg] of Object.entries(deficitState.packages || {})) {
    const legs = {};
    for (const [leg, state] of Object.entries(pkg.legs || {})) {
      if ((state.deficit || 0) > 0 || (state.surplus || 0) >= 2) {
        legs[leg] = freeze({ deficit: state.deficit || 0, surplus: state.surplus || 0 });
      }
    }
    const coreDef = pkg.core?.deficit || 0;
    const coreSur = pkg.core?.surplus || 0;
    const supportDef = pkg.support?.deficit || 0;
    if (coreDef > 0 || coreSur >= 3 || supportDef > 0 || Object.keys(legs).length) {
      packages[id] = freeze({
        coreDeficit: coreDef,
        coreSurplus: coreSur,
        supportDeficit: supportDef,
        legs: freeze(legs),
      });
    }
  }
  return freeze({
    commanderConnections: deficitState.commanderConnections || 0,
    roles: freeze(roles),
    packages: freeze(packages),
    underfilledCurveBands: freeze([...(deficitState.underfilledCurveBands || [])].slice(0, 6)),
    congestedCurveBands: freeze([...(deficitState.congestedCurveBands || [])].slice(0, 6)),
  });
}

function compactDelta(delta) {
  if (!delta) return null;
  return freeze({
    total: round(Number(delta.total) || 0),
    deficitsFilled: freeze([...(delta.deficitsFilled || [])]),
    surplusIntroduced: freeze([...(delta.surplusIntroduced || [])]),
    positives: freeze((delta.positives || []).slice(0, 8).map((entry) => freeze({
      kind: entry.kind,
      key: entry.detail ?? entry.key,
      weight: round(entry.weight),
    }))),
    negatives: freeze((delta.negatives || []).slice(0, 8).map((entry) => freeze({
      kind: entry.kind,
      key: entry.detail ?? entry.key,
      weight: round(entry.weight),
    }))),
    falseFriendRisk: Boolean(delta.falseFriendRisk),
    unsupportedAnchorRisk: Boolean(delta.unsupportedAnchorRisk),
    unsupportedHighCmcRisk: Boolean(delta.unsupportedHighCmcRisk),
  });
}

/**
 * Create a mutable session used during chooseSpells.
 */
export function createConstructionTraceSession(meta = {}) {
  return {
    version: CONSTRUCTION_TRACE_VERSION,
    pickIndex: 0,
    picks: [],
    meta: {
      planId: meta.planId || null,
      planLabel: meta.planLabel || null,
      packageIds: freeze([...(meta.packageIds || [])]),
      variantId: meta.variantId || null,
    },
    timing: { recordMs: 0 },
  };
}

/**
 * Record one construction decision. Keep rejected alternatives to top-K.
 */
export function recordConstructionPick(session, pick = {}) {
  if (!session) return null;
  const started = Date.now();
  session.pickIndex += 1;
  const rejected = [...(pick.rejectedAlternatives || [])]
    .sort((left, right) => (right.adjusted || 0) - (left.adjusted || 0)
      || String(left.name || "").localeCompare(String(right.name || "")))
    .slice(0, pick.rejectedK ?? DEFAULT_REJECTED_K)
    .map((entry) => freeze({
      name: entry.name,
      rawScore: round(entry.rawScore),
      adjusted: round(entry.adjusted),
      prospectiveTotal: round(entry.prospectiveTotal),
      deficitsFilled: freeze([...(entry.deficitsFilled || [])].slice(0, 6)),
    }));

  const nearest = rejected[0] || null;
  const selectedAdjusted = round(pick.adjustedScore);
  const reasonOverNearest = nearest
    ? freeze({
      nearestName: nearest.name,
      adjustedMargin: round(selectedAdjusted - (nearest.adjusted || 0)),
      sharedDeficitFills: freeze([
        ...new Set((pick.prospectiveDelta?.deficitsFilled || [])
          .filter((tag) => (nearest.deficitsFilled || []).includes(tag))),
      ].slice(0, 6)),
      note: selectedAdjusted === round(nearest.adjusted)
        ? "tie_broken_by_name"
        : selectedAdjusted > round(nearest.adjusted) ? "higher_phased_adjusted" : "selected_despite_lower_adjusted",
    })
    : null;

  const record = freeze({
    pickIndex: session.pickIndex,
    source: pick.source || "live_fill",
    name: pick.name,
    nameKey: normalized(pick.name),
    constructionPhase: pick.constructionPhase || null,
    planId: session.meta.planId,
    packageIds: session.meta.packageIds,
    deficitBefore: pick.deficitBefore || freeze({}),
    rawScore: round(pick.rawScore),
    adjustedScore: selectedAdjusted,
    prospectiveDelta: compactDelta(pick.prospectiveDelta),
    commanderConnectionSignals: freeze([...(pick.commanderConnectionSignals || [])]),
    sequenceStages: freeze([...(pick.sequenceStages || [])]),
    roles: freeze([...(pick.roles || [])]),
    cmc: Number(pick.cmc) || 0,
    shortlistSize: Number(pick.shortlistSize) || 0,
    shortlistRank: Number.isFinite(pick.shortlistRank) ? pick.shortlistRank : null,
    rejectedAlternatives: freeze(rejected),
    reasonOverNearest,
    // Filled during finalizeSelfEvaluation.
    outcome: null,
    drift: null,
  });
  session.picks.push(record);
  session.timing.recordMs += Date.now() - started;
  return record;
}

/**
 * Freeze the session into a durable candidate-attached trace (pre-outcome).
 */
export function sealConstructionTrace(session) {
  if (!session) {
    return freeze({
      version: CONSTRUCTION_TRACE_VERSION,
      pickCount: 0,
      picks: freeze([]),
      meta: freeze({}),
      timing: freeze({ recordMs: 0 }),
    });
  }
  return freeze({
    version: CONSTRUCTION_TRACE_VERSION,
    pickCount: session.picks.length,
    picks: freeze([...session.picks]),
    meta: freeze({ ...session.meta }),
    timing: freeze({ recordMs: session.timing.recordMs }),
  });
}

export function mutationEventsFromCandidate(candidate = {}) {
  const events = [];
  const push = (names, mutation) => {
    for (const name of names || []) {
      if (!name) continue;
      events.push(freeze({ name, nameKey: normalized(name), mutation }));
    }
  };
  push(candidate.budgetRepair?.removedNames, "removed_budget_repair");
  push(candidate.powerRepair?.removedNames, "removed_power_repair");
  push(candidate.packagePlanOptimization?.removed, "removed_package_optimization");
  push(candidate.cohesionBombRepair?.removedNames, "removed_unsupported_bomb_repair");
  // Additions from mutations are tracked so they don't pretend to be pick-time beliefs.
  push(candidate.budgetRepair?.alternativesAddedNames, "added_budget_repair");
  push(candidate.powerRepair?.alternativesAddedNames, "added_power_repair");
  push(candidate.packagePlanOptimization?.added, "added_package_optimization");
  push(candidate.weakSlotRepair?.removedNames, "removed_weak_slot_repair");
  push(candidate.weakSlotRepair?.alternativesAddedNames, "added_weak_slot_repair");
  return freeze(events);
}
