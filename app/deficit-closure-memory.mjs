// =============================================================================
// Deficit Closure Memory (Self-Evaluation-driven)
// =============================================================================
// Compact temporal awareness of recently solved needs during live fill.
// Does not invent new plans — only remembers what deficits were already closed.
// =============================================================================

export const DEFICIT_CLOSURE_MEMORY_VERSION = "deficit-closure-memory-v1";

const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const freeze = (value) => Object.freeze(value);
const RECENT_WINDOW = 8;
const MAX_FOOTPRINT_SAMPLES = 6;

/**
 * Mutable session memory attached to a chooseSpells run.
 */
export function createDeficitClosureMemory() {
  return {
    version: DEFICIT_CLOSURE_MEMORY_VERSION,
    pickIndex: 0,
    needs: new Map(),
    recentFills: [], // { pickIndex, needKey, name }
  };
}

function ensureNeed(memory, needKey) {
  if (!memory.needs.has(needKey)) {
    memory.needs.set(needKey, {
      key: needKey,
      lastFillPickIndex: null,
      lastFillName: null,
      fillsSinceSatisfied: 0,
      totalFills: 0,
      firstSatisfiedAtPick: null,
      footprintSamples: [],
    });
  }
  return memory.needs.get(needKey);
}

/**
 * Compact footprint signature used for same-need novelty checks.
 */
export function footprintSignature(entry = {}, footprint = null) {
  const roles = [...(entry.roles || [])].filter((role) => role !== "land" && role !== "commander").sort();
  const produces = [...(entry.mechanics?.produces || [])].sort();
  const rewards = [...(entry.mechanics?.rewards || [])].sort();
  const stages = [...(entry.sequenceStages || [])].sort();
  const packages = [
    ...(footprint?.packageCore || []),
    ...(footprint?.packageSupport || []),
  ].sort();
  const commander = [...(entry.commanderConnectionSignals || footprint?.commanderSignals || [])].sort();
  return [
    `r:${roles.join(",")}`,
    `p:${produces.join(",")}`,
    `w:${rewards.join(",")}`,
    `s:${stages.join(",")}`,
    `pkg:${packages.join(",")}`,
    `c:${commander.join(",")}`,
  ].join("|");
}

/**
 * Record that a selected card filled (or surplus-filled) these need tags.
 */
export function observeDeficitClosure(memory, {
  pickIndex,
  name,
  deficitsFilled = [],
  surplusIntroduced = [],
  deficitState = null,
  footprintSig = null,
} = {}) {
  if (!memory) return memory;
  memory.pickIndex = Math.max(memory.pickIndex, Number(pickIndex) || 0);
  const tags = [...new Set([...(deficitsFilled || []), ...(surplusIntroduced || [])])];
  for (const needKey of tags) {
    const need = ensureNeed(memory, needKey);
    need.totalFills += 1;
    need.lastFillPickIndex = memory.pickIndex;
    need.lastFillName = name || null;
    const live = liveNeedSnapshot(deficitState, needKey);
    if (live) {
      need.current = live.current;
      need.target = live.target;
      need.deficit = live.deficit;
      need.surplus = live.surplus;
      need.status = live.status;
      if (live.deficit <= 0 && need.firstSatisfiedAtPick == null) {
        need.firstSatisfiedAtPick = memory.pickIndex;
      }
      if (live.deficit <= 0) need.fillsSinceSatisfied += 1;
      else need.fillsSinceSatisfied = 0;
    } else if (surplusIntroduced.includes(needKey) || (deficitsFilled.includes(needKey) === false && surplusIntroduced.length)) {
      need.fillsSinceSatisfied += 1;
      need.status = need.status || "satisfied";
    } else if (deficitsFilled.includes(needKey)) {
      // Filled an open deficit; satisfaction may happen on this pick.
      need.status = "closing";
    }
    if (footprintSig) {
      need.footprintSamples = [...need.footprintSamples.filter((sig) => sig !== footprintSig), footprintSig]
        .slice(-MAX_FOOTPRINT_SAMPLES);
    }
    memory.recentFills.push({ pickIndex: memory.pickIndex, needKey, name: name || null });
  }
  // Bound recent fill log.
  if (memory.recentFills.length > 240) {
    memory.recentFills = memory.recentFills.slice(-180);
  }
  return memory;
}

function liveNeedSnapshot(deficitState, needKey) {
  if (!deficitState || !needKey) return null;
  const packageCore = needKey.match(/^package_core:(.+)$/);
  if (packageCore) {
    const pkg = deficitState.packages?.[packageCore[1]]?.core;
    return pkg || null;
  }
  const packageSupport = needKey.match(/^package_support:(.+)$/);
  if (packageSupport) {
    const pkg = deficitState.packages?.[packageSupport[1]]?.support;
    return pkg || null;
  }
  const packageLeg = needKey.match(/^package_leg:([^:]+):(.+)$/);
  if (packageLeg) {
    const leg = deficitState.packages?.[packageLeg[1]]?.legs?.[packageLeg[2]];
    return leg || null;
  }
  const role = needKey.match(/^role:(.+)$/);
  if (role) return deficitState.roles?.[role[1]] || null;
  const curve = needKey.match(/^curve:(.+)$/);
  if (curve) return deficitState.curve?.[curve[1]] || null;
  const sequence = needKey.match(/^sequence:(.+)$/);
  if (sequence) return deficitState.sequence?.[sequence[1]] || null;
  if (needKey === "commander_connection") {
    const current = deficitState.commanderConnections || 0;
    const target = 6;
    return {
      current,
      target,
      deficit: Math.max(0, target - current),
      surplus: Math.max(0, current - target),
      status: current < target ? "deficient" : current > target + 2 ? "oversupplied" : "satisfied",
    };
  }
  return null;
}

export function recentFillVelocity(memory, needKey, window = RECENT_WINDOW) {
  if (!memory) return 0;
  const floor = Math.max(0, (memory.pickIndex || 0) - window);
  return memory.recentFills.filter((entry) => entry.needKey === needKey && entry.pickIndex > floor).length;
}

export function getNeedClosureView(memory, needKey, deficitState = null) {
  const stored = memory?.needs?.get?.(needKey) || null;
  const live = liveNeedSnapshot(deficitState, needKey);
  const velocity = recentFillVelocity(memory, needKey);
  return freeze({
    key: needKey,
    current: live?.current ?? stored?.current ?? null,
    target: live?.target ?? stored?.target ?? null,
    deficit: live?.deficit ?? stored?.deficit ?? null,
    surplus: live?.surplus ?? stored?.surplus ?? null,
    status: live?.status ?? stored?.status ?? null,
    lastFillPickIndex: stored?.lastFillPickIndex ?? null,
    lastFillName: stored?.lastFillName ?? null,
    fillsSinceSatisfied: stored?.fillsSinceSatisfied ?? 0,
    totalFills: stored?.totalFills ?? 0,
    recentFillVelocity: velocity,
    footprintSamples: freeze([...(stored?.footprintSamples || [])]),
  });
}

/**
 * How hard to discount a same-need fill given closure history.
 * 1 = full value, lower = more saturated / recently over-filled.
 */
export function saturationMultiplier(needView, options = {}) {
  if (!needView) return 1;
  const deficit = Number(needView.deficit) || 0;
  if (deficit > 0) return 1;
  const surplus = Number(needView.surplus) || 0;
  const velocity = Number(needView.recentFillVelocity) || 0;
  const since = Number(needView.fillsSinceSatisfied) || 0;
  const novelty = Math.max(0, Math.min(1, Number(options.novelty) || 0));
  const resilience = Boolean(options.resilienceJustification);

  // Just satisfied, no surplus yet: mild residual value, but recent re-fills decay fast.
  let factor = surplus <= 0 ? 0.55 : 1 / (1 + surplus * 0.85);
  if (velocity >= 2) factor *= 1 / (1 + (velocity - 1) * 0.55);
  if (since >= 2) factor *= 1 / (1 + (since - 1) * 0.35);
  if (velocity >= 3 && since >= 2) factor *= 0.55; // repetitive same-need burst

  // Useful / resilience redundancy can retain more value.
  if (novelty >= 0.55) factor = Math.min(1, factor + 0.28 * novelty);
  if (resilience) factor = Math.min(1, factor + 0.22);

  // Structural surplus with no novelty stays harsh.
  if (surplus >= 3 && novelty < 0.25 && !resilience) factor *= 0.55;

  return round(Math.max(0.08, Math.min(1, factor)));
}

/**
 * Novelty of candidate footprint vs prior same-need fillers.
 * 1 = entirely new secondary shape; 0 = near-identical repeat.
 */
export function incrementalFootprintNovelty(candidateSig, needView) {
  const samples = needView?.footprintSamples || [];
  if (!candidateSig) return 0.5;
  if (!samples.length) return 1;
  if (samples.includes(candidateSig)) return 0;

  // Token-level Jaccard distance against the closest prior sample.
  const tokenize = (sig) => new Set(String(sig).split("|").filter(Boolean));
  const candidateTokens = tokenize(candidateSig);
  let best = 0;
  for (const sample of samples) {
    const other = tokenize(sample);
    let inter = 0;
    for (const token of candidateTokens) if (other.has(token)) inter += 1;
    const union = new Set([...candidateTokens, ...other]).size || 1;
    const similarity = inter / union;
    if (similarity > best) best = similarity;
  }
  return round(Math.max(0, 1 - best));
}

/**
 * Whether this pick is primarily chasing already-satisfied needs.
 */
export function isPrimaryOversupplyChase(deficitsFilled = [], surplusIntroduced = [], memory, deficitState) {
  if ((deficitsFilled || []).length > 0) return false;
  if (!(surplusIntroduced || []).length) return false;
  return surplusIntroduced.some((needKey) => {
    const view = getNeedClosureView(memory, needKey, deficitState);
    const surplus = Number(view.surplus) || 0;
    const velocity = Number(view.recentFillVelocity) || 0;
    const since = Number(view.fillsSinceSatisfied) || 0;
    return surplus >= 1 || since >= 1 || velocity >= 2;
  });
}

/**
 * Compact diagnostics snapshot for traces / tests.
 */
export function snapshotClosureMemory(memory) {
  if (!memory) {
    return freeze({ version: DEFICIT_CLOSURE_MEMORY_VERSION, pickIndex: 0, needs: freeze({}) });
  }
  const needs = {};
  for (const [key, value] of memory.needs.entries()) {
    needs[key] = freeze({
      lastFillPickIndex: value.lastFillPickIndex,
      lastFillName: value.lastFillName,
      fillsSinceSatisfied: value.fillsSinceSatisfied,
      totalFills: value.totalFills,
      recentFillVelocity: recentFillVelocity(memory, key),
      footprintSampleCount: (value.footprintSamples || []).length,
      status: value.status || null,
      surplus: value.surplus ?? null,
      deficit: value.deficit ?? null,
    });
  }
  return freeze({
    version: DEFICIT_CLOSURE_MEMORY_VERSION,
    pickIndex: memory.pickIndex,
    needs: freeze(needs),
  });
}
