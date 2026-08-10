import {
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  expensiveThreatSupport,
  strategicSemanticsFor,
} from "./strategic-intent.mjs";

// =============================================================================
// Slot Justification Ledger
// =============================================================================
// Construction-state record of why each nonland occupies its slot. Not prose.
// Future selection, repair, critique, and UI all consume the same footprint.
// =============================================================================

export const SLOT_JUSTIFICATION_VERSION = "slot-justification-v1";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

const TRACKED_ROLES = Object.freeze(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);

const FOOTPRINT_WEIGHTS = Object.freeze({
  packageCore: 4,
  packageSupport: 2,
  commanderSignal: 3,
  semantic: 2,
  trackedRole: 2,
  sequenceStage: 1.5,
  curveBand: 1,
  mechanicProduce: 2,
  mechanicReward: 2,
  budgetConstraint: 1,
  powerConstraint: 1,
});

function entryCard(entry) {
  return entry?.card || entry || {};
}

function entryName(entry) {
  return entry?.card?.name || entry?.name || "";
}

function entrySemantics(entry) {
  if (entry?.strategicSemantics instanceof Set) return entry.strategicSemantics;
  if (Array.isArray(entry?.strategicSemantics)) return new Set(entry.strategicSemantics);
  return strategicSemanticsFor(entryCard(entry));
}

function uniqueSorted(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

export function curveBandFor(cmc = 0) {
  const value = Number(cmc) || 0;
  if (value <= 1) return "1";
  if (value === 2) return "2";
  if (value === 3) return "3";
  if (value === 4) return "4";
  if (value === 5) return "5";
  return "6+";
}

function packageMembership(entry, intent = {}) {
  const core = [];
  const support = [];
  const falseFriend = [];
  for (const packageSpec of intent.packages || []) {
    const semantics = entrySemantics(entry);
    const isCore = cardSatisfiesPackageCore(entry, packageSpec.id);
    const isSupport = !isCore && cardSatisfiesPackageSupport(entry, packageSpec.id);
    if (isCore) core.push(packageSpec.id);
    else if (isSupport) support.push(packageSpec.id);
    if ((packageSpec.falseFriendSemantics || []).some((semantic) => semantics.has(semantic))
      && !(packageSpec.coreSemantics || []).some((semantic) => semantics.has(semantic))) {
      falseFriend.push(packageSpec.id);
    }
  }
  return {
    core: uniqueSorted(core),
    support: uniqueSorted(support),
    falseFriend: uniqueSorted(falseFriend),
  };
}

/**
 * Compact, comparable strategic footprint for a card in a given intent.
 * Used both to justify selection and to score replacement preservation.
 */
export function buildJustificationFootprint(entry, intent = {}, options = {}) {
  const card = entryCard(entry);
  const semantics = entrySemantics(entry);
  const membership = packageMembership(entry, intent);
  const roles = uniqueSorted((entry.roles || []).filter((role) => role !== "land" && role !== "commander"));
  const trackedRoles = roles.filter((role) => TRACKED_ROLES.includes(role));
  const commanderSignals = uniqueSorted(entry.commanderConnectionSignals || []);
  const produces = uniqueSorted(entry.mechanics?.produces || []);
  const rewards = uniqueSorted(entry.mechanics?.rewards || []);
  const sequenceStages = uniqueSorted(entry.sequenceStages || []);
  const strategicSemantics = uniqueSorted([...semantics].filter((tag) =>
    !tag.startsWith("non_")
    && tag !== "enchantment"
    && tag !== "artifact"
    && tag !== "creature"
    && tag !== "bomb_cmc"
    && tag !== "high_cmc_threat"
    && tag !== "reanimation_target"));
  const cmc = Number(entry.cmc ?? card.cmc) || 0;

  return Object.freeze({
    name: entryName(entry),
    packageCore: Object.freeze(membership.core),
    packageSupport: Object.freeze(membership.support),
    falseFriend: Object.freeze(membership.falseFriend),
    commanderSignals: Object.freeze(commanderSignals),
    semantics: Object.freeze(strategicSemantics),
    trackedRoles: Object.freeze(trackedRoles),
    roles: Object.freeze(roles),
    sequenceStages: Object.freeze(sequenceStages),
    curveBand: curveBandFor(cmc),
    cmc,
    mechanicProduce: Object.freeze(produces),
    mechanicReward: Object.freeze(rewards),
    budgetConstraint: Boolean(options.budgetConstraint),
    powerConstraint: Boolean(options.powerConstraint),
    rawPowerSignal: Boolean(options.rawPowerSignal),
  });
}

function footprintTokens(footprint) {
  const tokens = [];
  for (const id of footprint.packageCore || []) tokens.push({ dim: "packageCore", key: id, weight: FOOTPRINT_WEIGHTS.packageCore });
  for (const id of footprint.packageSupport || []) tokens.push({ dim: "packageSupport", key: id, weight: FOOTPRINT_WEIGHTS.packageSupport });
  for (const signal of footprint.commanderSignals || []) tokens.push({ dim: "commanderSignal", key: signal, weight: FOOTPRINT_WEIGHTS.commanderSignal });
  for (const semantic of footprint.semantics || []) tokens.push({ dim: "semantic", key: semantic, weight: FOOTPRINT_WEIGHTS.semantic });
  for (const role of footprint.trackedRoles || []) tokens.push({ dim: "trackedRole", key: role, weight: FOOTPRINT_WEIGHTS.trackedRole });
  for (const stage of footprint.sequenceStages || []) tokens.push({ dim: "sequenceStage", key: stage, weight: FOOTPRINT_WEIGHTS.sequenceStage });
  if (footprint.curveBand) tokens.push({ dim: "curveBand", key: footprint.curveBand, weight: FOOTPRINT_WEIGHTS.curveBand });
  for (const signal of footprint.mechanicProduce || []) tokens.push({ dim: "mechanicProduce", key: signal, weight: FOOTPRINT_WEIGHTS.mechanicProduce });
  for (const signal of footprint.mechanicReward || []) tokens.push({ dim: "mechanicReward", key: signal, weight: FOOTPRINT_WEIGHTS.mechanicReward });
  if (footprint.budgetConstraint) tokens.push({ dim: "budgetConstraint", key: "budget", weight: FOOTPRINT_WEIGHTS.budgetConstraint });
  if (footprint.powerConstraint) tokens.push({ dim: "powerConstraint", key: "power", weight: FOOTPRINT_WEIGHTS.powerConstraint });
  return tokens;
}

/**
 * Generic justification-preservation score in [0, 1].
 * Preserving only one of several obligations scores poorly.
 */
export function justificationPreservationScore(beforeFootprint, afterFootprint) {
  const before = footprintTokens(beforeFootprint || {});
  if (!before.length) return afterFootprint ? 0.35 : 0;
  const afterKeys = new Set(footprintTokens(afterFootprint || {}).map((token) => `${token.dim}:${token.key}`));
  let total = 0;
  let preserved = 0;
  for (const token of before) {
    total += token.weight;
    if (afterKeys.has(`${token.dim}:${token.key}`)) preserved += token.weight;
  }
  return Number((preserved / total).toFixed(4));
}

export function compareReplacementJustification(offenderEntry, replacementEntry, intent = {}, options = {}) {
  const before = buildJustificationFootprint(offenderEntry, intent, options);
  const after = buildJustificationFootprint(replacementEntry, intent, options);
  const score = justificationPreservationScore(before, after);
  const lost = footprintTokens(before)
    .filter((token) => !footprintTokens(after).some((other) => other.dim === token.dim && other.key === token.key))
    .map((token) => `${token.dim}:${token.key}`);
  const gained = footprintTokens(after)
    .filter((token) => !footprintTokens(before).some((other) => other.dim === token.dim && other.key === token.key))
    .map((token) => `${token.dim}:${token.key}`);
  return Object.freeze({
    score,
    before,
    after,
    lost: Object.freeze(uniqueSorted(lost)),
    gained: Object.freeze(uniqueSorted(gained)),
  });
}

function reasonEntriesFromFootprint(footprint) {
  const reasons = [];
  for (const id of footprint.packageCore || []) {
    reasons.push(Object.freeze({ kind: "package_core", packageId: id, weight: FOOTPRINT_WEIGHTS.packageCore }));
  }
  for (const id of footprint.packageSupport || []) {
    reasons.push(Object.freeze({ kind: "package_support", packageId: id, weight: FOOTPRINT_WEIGHTS.packageSupport }));
  }
  for (const id of footprint.falseFriend || []) {
    reasons.push(Object.freeze({ kind: "false_friend", packageId: id, weight: -3 }));
  }
  for (const signal of footprint.commanderSignals || []) {
    reasons.push(Object.freeze({ kind: "commander_connection", signal, weight: FOOTPRINT_WEIGHTS.commanderSignal }));
  }
  for (const semantic of footprint.semantics || []) {
    reasons.push(Object.freeze({ kind: "semantic", semantic, weight: FOOTPRINT_WEIGHTS.semantic }));
  }
  for (const role of footprint.trackedRoles || []) {
    reasons.push(Object.freeze({ kind: "tracked_role", role, weight: FOOTPRINT_WEIGHTS.trackedRole }));
  }
  for (const stage of footprint.sequenceStages || []) {
    reasons.push(Object.freeze({ kind: "sequence_stage", stage, weight: FOOTPRINT_WEIGHTS.sequenceStage }));
  }
  if (footprint.curveBand) {
    reasons.push(Object.freeze({ kind: "curve_band", band: footprint.curveBand, weight: FOOTPRINT_WEIGHTS.curveBand }));
  }
  for (const signal of footprint.mechanicProduce || []) {
    reasons.push(Object.freeze({ kind: "produces", signal, weight: FOOTPRINT_WEIGHTS.mechanicProduce }));
  }
  for (const signal of footprint.mechanicReward || []) {
    reasons.push(Object.freeze({ kind: "rewards", signal, weight: FOOTPRINT_WEIGHTS.mechanicReward }));
  }
  if (footprint.rawPowerSignal) {
    reasons.push(Object.freeze({ kind: "raw_power_signal", weight: 0.5 }));
  }
  return Object.freeze(reasons);
}

function countPackageCores(rows, packageId) {
  return rows.reduce((sum, row) => sum + (cardSatisfiesPackageCore(row, packageId) ? Number(row.quantity || 1) : 0), 0);
}

function densityContributionFor(entry, intent, quantity = 1) {
  const contribution = {};
  for (const packageSpec of intent.packages || []) {
    const core = cardSatisfiesPackageCore(entry, packageSpec.id) ? quantity : 0;
    const support = !core && cardSatisfiesPackageSupport(entry, packageSpec.id) ? quantity : 0;
    const semantics = entrySemantics(entry);
    const falseFriend = (packageSpec.falseFriendSemantics || []).some((semantic) => semantics.has(semantic))
      && !(packageSpec.coreSemantics || []).some((semantic) => semantics.has(semantic))
      ? quantity
      : 0;
    if (core || support || falseFriend) {
      contribution[packageSpec.id] = Object.freeze({ core, support, falseFriend });
    }
  }
  return Object.freeze(contribution);
}

function interactionSupports(entry, rows = []) {
  const produces = new Set(entry.mechanics?.produces || []);
  const rewards = new Set(entry.mechanics?.rewards || []);
  const supports = [];
  const supportedBy = [];
  for (const row of rows) {
    if (normalized(row.name) === normalized(entryName(entry))) continue;
    const otherProduces = row.mechanics?.produces || [];
    const otherRewards = row.mechanics?.rewards || [];
    if (otherRewards.some((signal) => produces.has(signal))) supports.push(row.name);
    if (otherProduces.some((signal) => rewards.has(signal))) supportedBy.push(row.name);
  }
  return {
    supports: Object.freeze(uniqueSorted(supports).slice(0, 12)),
    supportedBy: Object.freeze(uniqueSorted(supportedBy).slice(0, 12)),
  };
}

function removalConsequenceFor(entry, intent, rows, footprint, quantity = 1) {
  const lostReasons = reasonEntriesFromFootprint(footprint)
    .filter((reason) => reason.weight > 0)
    .map((reason) => reason.kind + (reason.packageId ? `:${reason.packageId}` : reason.signal ? `:${reason.signal}` : reason.role ? `:${reason.role}` : reason.semantic ? `:${reason.semantic}` : ""));
  const packageCollapses = [];
  for (const packageSpec of intent.packages || []) {
    if (!cardSatisfiesPackageCore(entry, packageSpec.id)) continue;
    const before = countPackageCores(rows, packageSpec.id);
    const after = before - quantity;
    if (before >= packageSpec.coreMin && after < packageSpec.coreMin) {
      packageCollapses.push(packageSpec.id);
    }
  }
  const weightLost = reasonEntriesFromFootprint(footprint).reduce((sum, reason) => sum + Math.max(0, reason.weight), 0);
  const severity = Math.min(100, Math.round(weightLost * 6 + packageCollapses.length * 35));
  return Object.freeze({
    packageCollapses: Object.freeze(packageCollapses),
    lostReasons: Object.freeze(uniqueSorted(lostReasons)),
    severity,
  });
}

function strengthFromReasons(reasons) {
  const total = reasons.reduce((sum, reason) => sum + Number(reason.weight || 0), 0);
  return Math.max(0, Math.min(100, Number((total * 5).toFixed(1))));
}

/**
 * Build one slot justification for a selected nonland row.
 */
export function buildSlotJustification(row, intent = {}, allRows = [], options = {}) {
  const quantity = Number(row.quantity || 1);
  const footprint = buildJustificationFootprint(row, intent, options);
  const reasons = reasonEntriesFromFootprint(footprint);
  const strength = strengthFromReasons(reasons);
  const bombSupport = expensiveThreatSupport(row, allRows, intent);
  const interactions = interactionSupports(row, allRows.filter((entry) => !(entry.roles || []).includes("land")));
  const removalConsequence = removalConsequenceFor(row, intent, allRows, footprint, quantity);
  const positiveKinds = new Set(reasons.filter((reason) => reason.weight > 0).map((reason) => reason.kind));
  const strategicKinds = [...positiveKinds].filter((kind) =>
    kind === "package_core" || kind === "package_support" || kind === "commander_connection" || kind === "semantic");
  const weaklyJustified = strength < 18 && strategicKinds.length === 0;
  const rawPowerDominant = Boolean(
    (bombSupport.needsSupport && !bombSupport.supported)
    || (footprint.rawPowerSignal && strategicKinds.length === 0)
    || (strength < 22 && footprint.cmc >= 8 && !footprint.packageCore.length && !footprint.commanderSignals.length),
  );
  const packageCritical = removalConsequence.packageCollapses.length > 0;
  const underSupportedAnchor = Boolean(
    footprint.packageCore.length
    && (interactions.supportedBy.length === 0)
    && footprint.cmc >= 5,
  );

  return Object.freeze({
    name: row.name,
    quantity,
    roles: Object.freeze([...(row.roles || [])]),
    footprint,
    reasons,
    densityContribution: densityContributionFor(row, intent, quantity),
    supports: interactions.supports,
    supportedBy: interactions.supportedBy,
    removalConsequence,
    strength,
    confidence: Object.freeze({
      commanderLinked: footprint.commanderSignals.length > 0,
      packageLinked: footprint.packageCore.length + footprint.packageSupport.length > 0,
      interactionLinked: interactions.supports.length + interactions.supportedBy.length > 0,
      evidence: Number((
        (footprint.commanderSignals.length ? 0.35 : 0)
        + (footprint.packageCore.length ? 0.35 : footprint.packageSupport.length ? 0.2 : 0)
        + (interactions.supports.length || interactions.supportedBy.length ? 0.2 : 0)
        + (footprint.trackedRoles.length ? 0.1 : 0)
      ).toFixed(3)),
    }),
    flags: Object.freeze({
      weaklyJustified,
      redundant: false,
      overSupported: false,
      underSupportedAnchor,
      rawPowerDominant,
      packageCritical,
      falseFriend: footprint.falseFriend.length > 0,
    }),
  });
}

function markRedundancyAndOverSupport(slots, intent) {
  const byPackage = new Map();
  for (const slot of slots) {
    for (const id of slot.footprint.packageCore || []) {
      if (!byPackage.has(id)) byPackage.set(id, []);
      byPackage.get(id).push(slot);
    }
  }
  const redundant = new Set();
  const overSupported = new Set();
  for (const packageSpec of intent.packages || []) {
    const members = byPackage.get(packageSpec.id) || [];
    if (members.length <= packageSpec.coreMin) continue;
    const surplus = members.length - packageSpec.coreMin;
    if (surplus >= 4) {
      const weakest = [...members].sort((a, b) => a.strength - b.strength || a.name.localeCompare(b.name));
      for (const slot of weakest.slice(0, Math.min(surplus, 3))) overSupported.add(slot.name);
    }
    // Near-duplicate footprints inside the same package core are redundant.
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const score = justificationPreservationScore(members[i].footprint, members[j].footprint);
        if (score >= 0.92 && members[i].strength <= members[j].strength) redundant.add(members[i].name);
        if (score >= 0.92 && members[j].strength < members[i].strength) redundant.add(members[j].name);
      }
    }
  }
  return slots.map((slot) => Object.freeze({
    ...slot,
    flags: Object.freeze({
      ...slot.flags,
      redundant: redundant.has(slot.name),
      overSupported: overSupported.has(slot.name),
    }),
  }));
}

function packageCountsFromSlots(slots, intent) {
  const counts = {};
  for (const packageSpec of intent.packages || []) {
    let core = 0;
    let support = 0;
    let falseFriend = 0;
    for (const slot of slots) {
      const contribution = slot.densityContribution?.[packageSpec.id];
      if (!contribution) continue;
      core += contribution.core || 0;
      support += contribution.support || 0;
      falseFriend += contribution.falseFriend || 0;
    }
    counts[packageSpec.id] = Object.freeze({ core, support, falseFriend, coreMin: packageSpec.coreMin });
  }
  return Object.freeze(counts);
}

function agreesWithCohesion(packageCounts, cohesionGate) {
  if (!cohesionGate?.packages) return true;
  return cohesionGate.packages.every((pkg) => {
    const counted = packageCounts[pkg.id]?.core ?? 0;
    return counted === pkg.coreCount;
  });
}

/**
 * Build the full per-slot justification ledger for a finished candidate.
 */
export function buildSlotJustificationLedger(candidate, intent = {}, options = {}) {
  const rows = (candidate?.rows || []).filter((row) =>
    !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
  let slots = rows
    .map((row) => buildSlotJustification(row, intent, candidate.rows || [], {
      budgetConstraint: options.budgetConstraint,
      powerConstraint: options.powerConstraint,
      rawPowerSignal: options.rawPowerNames?.has?.(normalized(row.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  slots = markRedundancyAndOverSupport(slots, intent);
  const packageCounts = packageCountsFromSlots(slots, intent);
  const critique = Object.freeze({
    weaklyJustified: Object.freeze(slots.filter((slot) => slot.flags.weaklyJustified).map((slot) => slot.name)),
    redundant: Object.freeze(slots.filter((slot) => slot.flags.redundant).map((slot) => slot.name)),
    overSupported: Object.freeze(slots.filter((slot) => slot.flags.overSupported).map((slot) => slot.name)),
    underSupportedAnchors: Object.freeze(slots.filter((slot) => slot.flags.underSupportedAnchor).map((slot) => slot.name)),
    rawPowerDominant: Object.freeze(slots.filter((slot) => slot.flags.rawPowerDominant).map((slot) => slot.name)),
    packageCritical: Object.freeze(slots.filter((slot) => slot.flags.packageCritical).map((slot) => slot.name)),
  });
  return Object.freeze({
    version: SLOT_JUSTIFICATION_VERSION,
    slotCount: slots.length,
    slots: Object.freeze(slots),
    byName: Object.freeze(Object.fromEntries(slots.map((slot) => [normalized(slot.name), slot]))),
    critique,
    packageCounts,
    agreesWithCohesion: agreesWithCohesion(packageCounts, candidate.strategicCohesionGate),
  });
}

export function attachSlotJustificationLedger(candidate, intent, options = {}) {
  const slotJustificationLedger = buildSlotJustificationLedger(candidate, intent, options);
  return {
    ...candidate,
    slotJustificationLedger,
  };
}
