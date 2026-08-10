// =============================================================================
// Field Intelligence v1 — Structural Evidence Aggregation
// =============================================================================
// Learn structure (ratios, affinities, healthy ranges) — not modal 99s.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};

function pushStat(bucket, key, value, weight = 1) {
  if (!Number.isFinite(value)) return;
  bucket[key] = bucket[key] || { values: [], weights: [], sources: new Set(), commanders: new Set() };
  bucket[key].values.push(value);
  bucket[key].weights.push(weight);
}

function summarizeStat(entry) {
  const values = entry.values || [];
  const weights = entry.weights || values.map(() => 1);
  const weightedSum = values.reduce((sum, value, i) => sum + value * (weights[i] || 1), 0);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0) || 1;
  return freeze({
    n: values.length,
    mean: round(mean(values)),
    weightedMean: round(weightedSum / weightTotal),
    p25: round(percentile(values, 0.25)),
    p50: round(percentile(values, 0.5)),
    p75: round(percentile(values, 0.75)),
    independentSources: entry.sources?.size || 0,
    commanders: entry.commanders?.size || 0,
  });
}

/**
 * Aggregate structural evidence from CorpusDeckAnalysis records.
 * Card-frequency tables are deliberately omitted as primary outputs.
 */
export function buildStructuralEvidence(analyses = [], records = []) {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const packageCore = {};
  const packageLegs = {};
  const roleRatios = {};
  const curveBuckets = {};
  const commanderPackageAffinity = {};
  const mechanicSupport = {};
  const familyByReward = {};

  for (const analysis of analyses) {
    const record = recordById.get(analysis.deckId) || {};
    const weight = analysis.evidenceQuality?.weight ?? 0.5;
    const commanderKey = (analysis.commanders || []).join("+") || "unknown";
    const sourceKey = record.sourceKey || record.authorKey || analysis.deckId;
    const familyKeys = uniqueFamilyKeys(analysis);

    for (const pkg of analysis.packages || []) {
      pushStat(packageCore, pkg.id, pkg.density?.core ?? 0, weight);
      packageCore[pkg.id].sources.add(sourceKey);
      packageCore[pkg.id].commanders.add(commanderKey);

      for (const [leg, state] of Object.entries(pkg.legs || {})) {
        const legKey = `${pkg.id}::${leg}`;
        pushStat(packageLegs, legKey, state.current ?? 0, weight);
        packageLegs[legKey].sources.add(sourceKey);
        packageLegs[legKey].commanders.add(commanderKey);
      }

      const affinityKey = `${commanderKey}=>${pkg.id}`;
      pushStat(commanderPackageAffinity, affinityKey, pkg.healthScore ?? 0, weight);
      commanderPackageAffinity[affinityKey].sources.add(sourceKey);
      commanderPackageAffinity[affinityKey].commanders.add(commanderKey);
    }

    const roles = analysis.roleDistribution || {};
    const roleTotal = Object.values(roles).reduce((sum, n) => sum + n, 0) || 1;
    for (const [role, count] of Object.entries(roles)) {
      pushStat(roleRatios, role, count / roleTotal, weight);
      roleRatios[role].sources.add(sourceKey);
      roleRatios[role].commanders.add(commanderKey);
    }

    for (const [bucket, count] of Object.entries(analysis.curve || {})) {
      pushStat(curveBuckets, bucket, count, weight);
      curveBuckets[bucket].sources.add(sourceKey);
      curveBuckets[bucket].commanders.add(commanderKey);
    }

    const produces = analysis.signals?.produces || {};
    const rewards = analysis.signals?.rewards || {};
    for (const [signal, rewardCount] of Object.entries(rewards)) {
      const produceCount = produces[signal] || 0;
      const ratio = rewardCount > 0 ? produceCount / rewardCount : produceCount;
      pushStat(mechanicSupport, signal, ratio, weight);
      mechanicSupport[signal].sources.add(sourceKey);
      mechanicSupport[signal].commanders.add(commanderKey);
    }

    for (const family of familyKeys) {
      familyByReward[family] = familyByReward[family] || {
        decks: 0,
        commanders: new Set(),
        packageIds: new Set(),
        weightedHealth: [],
      };
      familyByReward[family].decks += 1;
      familyByReward[family].commanders.add(commanderKey);
      for (const pkg of analysis.packages || []) {
        familyByReward[family].packageIds.add(pkg.id);
        familyByReward[family].weightedHealth.push((pkg.healthScore || 0) * weight);
      }
    }
  }

  return freeze({
    decks: analyses.length,
    packageCoreRanges: freeze(Object.fromEntries(
      Object.entries(packageCore).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    packageLegRanges: freeze(Object.fromEntries(
      Object.entries(packageLegs).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    roleRatioRanges: freeze(Object.fromEntries(
      Object.entries(roleRatios).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    curveRanges: freeze(Object.fromEntries(
      Object.entries(curveBuckets).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    commanderPackageAffinity: freeze(Object.fromEntries(
      Object.entries(commanderPackageAffinity).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    mechanicSupportRatios: freeze(Object.fromEntries(
      Object.entries(mechanicSupport).map(([key, entry]) => [key, summarizeStat(entry)]),
    )),
    commanderFamilies: freeze(Object.fromEntries(
      Object.entries(familyByReward).map(([key, entry]) => [key, freeze({
        decks: entry.decks,
        commanders: entry.commanders.size,
        packageIds: freeze([...entry.packageIds].sort()),
        meanWeightedHealth: round(mean(entry.weightedHealth)),
      })]),
    )),
  });
}

function uniqueFamilyKeys(analysis) {
  const fromResolution = analysis.commanderFamily?.familyKeys || [];
  if (fromResolution.length) return [...fromResolution];
  const rewards = analysis.inferredIntent?.commanderMechanics?.rewards || [];
  const packages = analysis.inferredIntent?.packageIds || [];
  const keys = [
    ...rewards.map((signal) => `reward:${signal}`),
    ...packages.map((id) => `package:${id}`),
  ];
  return keys.length ? keys : ["family:unclassified"];
}
