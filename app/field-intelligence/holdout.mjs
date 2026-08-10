// =============================================================================
// Field Intelligence — Hold-out validation (statistical evidence transfer)
// =============================================================================
// Not ML training unless an actual model is introduced later.
// =============================================================================

import { isHoldoutRecord } from "./corpus-schema.mjs";
import { buildStructuralEvidence } from "./structural-evidence.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function packageHealthScore(analysis) {
  const packages = analysis.packages || [];
  if (!packages.length) return 0.5;
  return packages.reduce((sum, pkg) => sum + (pkg.healthScore || 0), 0) / packages.length / 100;
}

/**
 * Learn structural ranges on train set; score whether hold-out decks fall in
 * healthy ranges predicted without observing them.
 */
export function runHoldoutValidation(records = [], analyses = [], options = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const trainRecords = [];
  const holdoutRecords = [];
  for (const record of records) {
    if (isHoldoutRecord(record, options)) holdoutRecords.push(record);
    else trainRecords.push(record);
  }

  const trainAnalyses = trainRecords.map((r) => analysisById.get(r.id)).filter(Boolean);
  const holdoutAnalyses = holdoutRecords.map((r) => analysisById.get(r.id)).filter(Boolean);
  const trainEvidence = buildStructuralEvidence(trainAnalyses, trainRecords);

  let inRange = 0;
  let scored = 0;
  const details = [];
  for (const analysis of holdoutAnalyses) {
    for (const pkg of analysis.packages || []) {
      const range = trainEvidence.packageCoreRanges?.[pkg.id];
      if (!range || range.n < 2) continue;
      scored += 1;
      const value = pkg.density?.core ?? 0;
      const ok = value >= range.p25 - 1 && value <= range.p75 + 1;
      if (ok) inRange += 1;
      details.push(freeze({
        deckId: analysis.deckId,
        packageId: pkg.id,
        value,
        trainP25: range.p25,
        trainP75: range.p75,
        inPredictedHealthyBand: ok,
      }));
    }
  }

  // Transfer check: commander-family evidence from train predicts hold-out cohesion.
  const familyHealth = trainEvidence.commanderFamilies || {};
  let familyHits = 0;
  let familyTried = 0;
  const familyMissReasons = [];
  for (const analysis of holdoutAnalyses) {
    const keys = analysis.commanderFamily?.familyKeys?.length
      ? analysis.commanderFamily.familyKeys
      : (analysis.inferredIntent?.commanderMechanics?.rewards || []).map((signal) => `reward:${signal}`);
    if (!keys.length) {
      familyMissReasons.push("holdout_family_unresolved");
      continue;
    }
    for (const key of keys) {
      const family = familyHealth[key];
      if (!family) {
        familyMissReasons.push(`train_missing:${key}`);
        continue;
      }
      familyTried += 1;
      const healthy = packageHealthScore(analysis) >= 0.55 || analysis.cohesion?.passed;
      if (family.meanWeightedHealth >= 40 && healthy) familyHits += 1;
      if (family.meanWeightedHealth < 40 && !healthy) familyHits += 1;
    }
  }

  const nullReason = !scored
    ? (trainAnalyses.every((a) => !(a.packages || []).length)
      ? "no_packages_in_train_or_holdout_usually_semantic_gap"
      : "insufficient_package_band_overlap")
    : null;

  return freeze({
    version: "holdout-validation-v1",
    trainDecks: trainRecords.length,
    holdoutDecks: holdoutRecords.length,
    holdoutIds: freeze(holdoutRecords.map((r) => r.id).sort()),
    packageBandHitRate: scored ? round(inRange / scored) : null,
    packageBandsScored: scored,
    packageBandNullReason: nullReason,
    familyTransferHitRate: familyTried ? round(familyHits / familyTried) : null,
    familyTransferTried: familyTried,
    familyTransferNullReason: familyTried
      ? null
      : (familyMissReasons[0] || "no_family_keys_to_transfer"),
    details: freeze(details.slice(0, 80)),
    notes: freeze([
      "statistical_evidence_learning_not_ml_training",
      "holdout_decks_excluded_from_their_own_evidence",
      "measures_structure_transfer_not_decklist_memorization",
      "null_means_unmeasurable_not_zero_transfer",
    ]),
  });
}
