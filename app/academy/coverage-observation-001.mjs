// =============================================================================
// Academy Coverage Observation 001
// Which capabilities remain predictive after commander / archetype / ix controls?
// =============================================================================
// Age of Vocabulary. No Brain. No Lab. No coverageScore. No Mentor production.
// =============================================================================

import { buildComparableCohorts, isHighPerformerRecord } from "../field-intelligence/comparable-cohorts.mjs";
import { normalizeCommanderIdentity } from "../field-intelligence/level-a-forensics.mjs";
import { extractProxyCandidates } from "../sim-lab/proxy-decomposition.mjs";
import {
  CANDIDATE_CAPABILITIES,
  CANDIDATE_SEATS,
  createCapabilityCandidateEvidence,
  roleAloneCannotMintCapability,
} from "./capability-vocabulary.mjs";
import { analyzeSeatVacancies, mentorLanguageCheck } from "./seat-vacancy.mjs";

const freeze = (value) => Object.freeze(value);

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let used = 0;
  for (let i = 0; i < n; i += 1) {
    const x = Number(xs[i]);
    const y = Number(ys[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    used += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  if (used < 3) return null;
  const num = used * sxy - sx * sy;
  const den = Math.sqrt((used * sxx - sx * sx) * (used * syy - sy * sy));
  if (!den) return 0;
  return Number((num / den).toFixed(4));
}

function partialPearson(xs, ys, zs) {
  const rxy = pearson(xs, ys);
  const rxz = pearson(xs, zs);
  const ryz = pearson(ys, zs);
  if (rxy == null || rxz == null || ryz == null) return null;
  const den = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  if (!den) return null;
  return Number(((rxy - rxz * ryz) / den).toFixed(4));
}

function mean(values = []) {
  const xs = values.filter((v) => Number.isFinite(Number(v))).map(Number);
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const COMPETING_RESIDUALS = freeze([
  "roleEntropy",
  "uniqueRoleCount",
  "recoverySeatCount",
  "multifunctionCount",
  "multifunctionRatio",
  "protectionSeatCount",
  "winSequenceProtectionCoverage",
  "meaningfulEdgeDensity",
  "interactionCount",
]);

function deckFeatures(record, analysis) {
  const proxy = extractProxyCandidates(record, analysis);
  const vacancy = analyzeSeatVacancies(record, analysis);
  return freeze({
    deckId: record.id,
    eventId: record.eventId || null,
    commanders: freeze((record.commanders || []).map((c) => (typeof c === "string" ? c : c.name))),
    commanderIdentity: normalizeCommanderIdentity(record.commanders || []),
    highPerformer: isHighPerformerRecord(record),
    interactionCount: proxy.interactionCount,
    meanRecoveryProbability: proxy.meanRecoveryProbability,
    residuals: proxy.candidates,
    independentlyCoveredCount: vacancy.independentlyCoveredCount,
    singlePointOfFailureCount: vacancy.singlePointOfFailureCount,
    coverageProfile: vacancy.coverageProfile,
    vacancy,
    writesToBrain: false,
  });
}

function buildLevelACohortsWithRecords(records = []) {
  const byEventCommander = new Map();
  for (const record of records) {
    if (!record.eventId) continue;
    const identity = normalizeCommanderIdentity(record.commanders || []);
    if (!byEventCommander.has(record.eventId)) byEventCommander.set(record.eventId, new Map());
    const byIdentity = byEventCommander.get(record.eventId);
    byIdentity.set(identity, (byIdentity.get(identity) || []).concat([record]));
  }
  const cohorts = [];
  for (const [eventId, byIdentity] of byEventCommander) {
    for (const [commanderIdentity, cohort] of byIdentity) {
      const high = cohort.filter(isHighPerformerRecord).length;
      const low = cohort.length - high;
      if (cohort.length < 2 || high < 1 || low < 1) continue;
      cohorts.push({
        level: "A",
        eventId,
        commanderIdentity,
        records: cohort,
        highCount: high,
        lowCount: low,
        cohortSize: cohort.length,
      });
    }
  }
  return cohorts;
}

function levelAResidualDeltas(featuresById, levelACohorts) {
  const byVar = new Map();

  for (const cohort of levelACohorts) {
    const records = cohort.records || [];
    if (records.length < 2) continue;
    const highs = records.filter(isHighPerformerRecord).map((r) => featuresById.get(r.id)).filter(Boolean);
    const lows = records.filter((r) => !isHighPerformerRecord(r)).map((r) => featuresById.get(r.id)).filter(Boolean);
    if (!highs.length || !lows.length) continue;

    for (const name of COMPETING_RESIDUALS) {
      const h = mean(highs.map((f) => f.residuals[name]));
      const l = mean(lows.map((f) => f.residuals[name]));
      const entry = byVar.get(name) || { name, deltas: [], highMeans: [], lowMeans: [], cohorts: 0 };
      entry.deltas.push(h - l);
      entry.highMeans.push(h);
      entry.lowMeans.push(l);
      entry.cohorts += 1;
      byVar.set(name, entry);
    }

    for (const [name, picker] of [
      ["independentlyCoveredCount", (f) => f.independentlyCoveredCount],
      ["singlePointOfFailureCount", (f) => f.singlePointOfFailureCount],
    ]) {
      const h = mean(highs.map(picker));
      const l = mean(lows.map(picker));
      const entry = byVar.get(name) || { name, deltas: [], highMeans: [], lowMeans: [], cohorts: 0 };
      entry.deltas.push(h - l);
      entry.highMeans.push(h);
      entry.lowMeans.push(l);
      entry.cohorts += 1;
      byVar.set(name, entry);
    }
  }

  return [...byVar.values()].map((entry) => freeze({
    variable: entry.name,
    levelACohorts: entry.cohorts,
    meanDeltaHighMinusLow: Number(mean(entry.deltas).toFixed(4)),
    meanHigh: Number(mean(entry.highMeans).toFixed(4)),
    meanLow: Number(mean(entry.lowMeans).toFixed(4)),
    direction: mean(entry.deltas) > 0.02 ? "high_greater" : mean(entry.deltas) < -0.02 ? "low_greater" : "flat",
  })).sort((a, b) => Math.abs(b.meanDeltaHighMinusLow) - Math.abs(a.meanDeltaHighMinusLow));
}

function globalPartialTable(features) {
  const y = features.map((f) => f.meanRecoveryProbability);
  const ix = features.map((f) => f.interactionCount);
  const names = [
    ...COMPETING_RESIDUALS.filter((n) => n !== "interactionCount"),
    "independentlyCoveredCount",
    "singlePointOfFailureCount",
  ];
  return names.map((name) => {
    const xs = features.map((f) => (f.residuals?.[name] ?? f[name]));
    return freeze({
      variable: name,
      corrWithRecovery: pearson(xs, y),
      corrWithInteractionCount: pearson(xs, ix),
      partialCorrRecoveryGivenIx: partialPearson(xs, y, ix),
    });
  }).sort((a, b) => Math.abs(b.partialCorrRecoveryGivenIx || 0) - Math.abs(a.partialCorrRecoveryGivenIx || 0));
}

function verdictForResidual(row, levelARow) {
  const partial = row.partialCorrRecoveryGivenIx;
  const withIx = Math.abs(row.corrWithInteractionCount || 0);
  const levelA = levelARow?.meanDeltaHighMinusLow;
  const levelADir = levelARow?.direction;
  if (partial == null) return "unresolved";

  // Level-A reversal: metric higher among low performers while global corr with recovery is positive
  // (or SPOF higher among high performers while global corr is negative) → contradicted for Atlas.
  if (levelARow && Math.abs(levelA) >= 0.05) {
    const expectsHighGreater = (row.corrWithRecovery || 0) >= 0;
    if (expectsHighGreater && levelADir === "low_greater") return "contradicted";
    if (!expectsHighGreater && levelADir === "high_greater") return "contradicted";
  }

  if (Math.abs(partial) < 0.08 && Math.abs(levelA || 0) < 0.05) return "proxy_only";
  if (withIx > 0.85 && Math.abs(partial) < 0.12) return "proxy_only";
  if (Math.abs(partial) >= 0.15 && levelARow && levelADir === "high_greater" && Math.abs(levelA) >= 0.05) {
    return "atlas_candidate";
  }
  if (Math.abs(partial) >= 0.15 && levelARow && levelADir === "low_greater") return "contradicted";
  if (Math.abs(partial) >= 0.15) return "needs_more_evidence";
  if (levelARow && Math.abs(levelA) >= 0.08) return "needs_more_evidence";
  return "unresolved";
}

function buildCandidateEvidence(partialTable, levelATable) {
  const levelAByName = new Map(levelATable.map((r) => [r.variable, r]));
  const residualEvidence = partialTable.map((row) => {
    const levelA = levelAByName.get(row.variable);
    const verdict = verdictForResidual(row, levelA);
    return createCapabilityCandidateEvidence({
      candidate: row.variable,
      operationalDefinition: `Residual / structural measure from Coverage Observation 001: ${row.variable}`,
      levelASupport: levelA || null,
      interactionCountControlled: freeze({
        partialCorrRecoveryGivenIx: row.partialCorrRecoveryGivenIx,
        corrWithRecovery: row.corrWithRecovery,
        corrWithInteractionCount: row.corrWithInteractionCount,
      }),
      commanderControlled: levelA ? freeze({ meanDeltaHighMinusLow: levelA.meanDeltaHighMinusLow, cohorts: levelA.levelACohorts }) : null,
      confidence: Math.min(0.95, Math.abs(row.partialCorrRecoveryGivenIx || 0) + Math.abs(levelA?.meanDeltaHighMinusLow || 0) * 0.3),
      verdict,
    });
  });

  // Capability-family summaries from vocabulary (not auto-admitted)
  const capabilityEvidence = CANDIDATE_CAPABILITIES.map((cap) => {
    const linked = residualEvidence.filter((e) => {
      if (cap.family === "flexibility") return e.candidate.includes("multifunction") || e.candidate === "roleEntropy";
      if (cap.family === "recovery") return e.candidate.includes("recovery") || e.candidate === "independentlyCoveredCount";
      if (cap.family === "protection") {
        return e.candidate.includes("protection") || e.candidate === "winSequenceProtectionCoverage" || e.candidate === "singlePointOfFailureCount";
      }
      if (cap.family === "information") return e.candidate === "uniqueRoleCount" || e.candidate === "roleEntropy";
      if (cap.family === "disruption") return e.candidate === "interactionCount" || e.candidate.includes("disruption");
      return false;
    });
    const best = linked.sort((a, b) => b.confidence - a.confidence)[0];
    let verdict = "needs_more_evidence";
    if (!linked.length) verdict = "unresolved";
    else if (linked.some((e) => e.verdict === "contradicted")) verdict = "contradicted";
    else if (linked.every((e) => e.verdict === "proxy_only" || e.verdict === "contradicted")) verdict = "proxy_only";
    else if (linked.some((e) => e.verdict === "atlas_candidate")) verdict = "atlas_candidate";
    else if (cap.ambiguity === "high") verdict = "needs_more_evidence";
    const contradictions = [];
    if (verdict === "contradicted") {
      contradictions.push("Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).");
    }
    if (cap.family === "flexibility") {
      contradictions.push("Multifunction quality/tag-inflation controls incomplete.");
    }
    return createCapabilityCandidateEvidence({
      candidate: cap.id,
      operationalDefinition: cap.definition,
      levelASupport: best?.levelASupport || null,
      interactionCountControlled: best?.interactionCountControlled || null,
      commanderControlled: best?.commanderControlled || null,
      contradictions,
      confidence: best?.confidence || 0,
      verdict,
    });
  });

  return freeze({ residualEvidence, capabilityEvidence });
}

function findCounterexamples(features) {
  const counterexamples = [];
  // High SPOF among high performers vs low
  const highSpof = features.filter((f) => f.highPerformer && f.singlePointOfFailureCount >= 3);
  const lowCovered = features.filter((f) => !f.highPerformer && f.independentlyCoveredCount >= 3);
  for (const f of highSpof.slice(0, 5)) {
    counterexamples.push(freeze({
      type: "coverage_counterexample",
      reason: "high_performer_with_many_single_points_of_failure",
      deckId: f.deckId,
      eventId: f.eventId,
      singlePointOfFailureCount: f.singlePointOfFailureCount,
      independentlyCoveredCount: f.independentlyCoveredCount,
    }));
  }
  for (const f of lowCovered.slice(0, 5)) {
    counterexamples.push(freeze({
      type: "coverage_counterexample",
      reason: "low_performer_with_high_independent_coverage",
      deckId: f.deckId,
      eventId: f.eventId,
      singlePointOfFailureCount: f.singlePointOfFailureCount,
      independentlyCoveredCount: f.independentlyCoveredCount,
    }));
  }
  return freeze(counterexamples);
}

function atlasAdmissionGate(capabilityEvidence, residualEvidence, counterexamples) {
  const admitted = [];
  const rejected = [];
  const ambiguous = [];

  // Residual-level admissions (measurable language), not capability labels by family piggyback.
  const residualAdmitted = [];
  for (const ev of residualEvidence || []) {
    if (ev.verdict === "atlas_candidate") {
      residualAdmitted.push(freeze({
        id: `residual:${ev.candidate}`,
        label: ev.candidate,
        admission: "admitted_vocabulary",
        kind: "residual_measure",
        evidenceVerdict: ev.verdict,
        confidence: ev.confidence,
        writesToBrain: false,
        activated: false,
        promoted: false,
        note: "Measurable residual admitted to candidate Atlas measures — NOT a capability label, NOT Brain.",
      }));
    }
  }

  for (const ev of capabilityEvidence) {
    const cap = CANDIDATE_CAPABILITIES.find((c) => c.id === ev.candidate);
    if (!cap) continue;
    // Capability labels require atlas_candidate AND no counterexample storm AND Level-A high_greater on linked residual
    const levelAOk = ev.levelASupport
      && ev.levelASupport.direction === "high_greater"
      && Math.abs(ev.levelASupport.meanDeltaHighMinusLow || 0) >= 0.05;
    if (ev.verdict === "atlas_candidate" && levelAOk && (counterexamples?.length || 0) < 3) {
      admitted.push(freeze({
        ...cap,
        admission: "admitted_vocabulary",
        evidenceVerdict: ev.verdict,
        confidence: ev.confidence,
        writesToBrain: false,
        activated: false,
        promoted: false,
        note: "Atlas admission is NOT Brain promotion.",
      }));
    } else if (ev.verdict === "proxy_only" || ev.verdict === "contradicted") {
      rejected.push(freeze({ id: cap.id, verdict: ev.verdict, contradictions: ev.contradictions, writesToBrain: false }));
    } else {
      ambiguous.push(freeze({
        id: cap.id,
        reason: ev.verdict === "atlas_candidate" && !levelAOk
          ? "atlas_candidate_but_level_a_direction_or_counterexamples_block_admission"
          : ev.verdict,
        writesToBrain: false,
      }));
    }
  }

  return freeze({
    candidateVocabulary: freeze(CANDIDATE_CAPABILITIES.map((c) => c.id)),
    candidateSeats: freeze(CANDIDATE_SEATS.map((s) => s.id)),
    admittedVocabulary: freeze(admitted),
    admittedResidualMeasures: freeze(residualAdmitted),
    rejectedVocabulary: freeze(rejected),
    ambiguousVocabulary: freeze(ambiguous),
    writesToBrain: false,
  });
}

function answerResearchQuestions(partialTable, levelATable, admission, counterexamples) {
  const byName = Object.fromEntries(partialTable.map((r) => [r.variable, r]));
  const levelABy = Object.fromEntries(levelATable.map((r) => [r.variable, r]));
  const beyondIx = partialTable.filter((r) => Math.abs(r.partialCorrRecoveryGivenIx || 0) >= 0.15);
  const coverageUmbrella = beyondIx.filter((r) =>
    ["roleEntropy", "uniqueRoleCount", "recoverySeatCount", "multifunctionCount", "multifunctionRatio", "independentlyCoveredCount"].includes(r.variable));

  return freeze({
    q1_explainsBeyondInteractionCount: beyondIx.length
      ? `PARTIAL_YES — ${beyondIx.map((r) => r.variable).join(", ")} retain |partial r|≥0.15`
      : "INSUFFICIENT_EVIDENCE",
    q2_survivesCommanderControls: levelATable
      .filter((r) => {
        const partial = partialTable.find((p) => p.variable === r.variable);
        if (!partial || Math.abs(r.meanDeltaHighMinusLow) < 0.05) return false;
        const expectsHigh = (partial.corrWithRecovery || 0) >= 0;
        return expectsHigh ? r.direction === "high_greater" : r.direction === "low_greater";
      })
      .map((r) => r.variable),
    q2_commanderControlReversals: levelATable
      .filter((r) => {
        const partial = partialTable.find((p) => p.variable === r.variable);
        if (!partial || Math.abs(r.meanDeltaHighMinusLow) < 0.05) return false;
        const expectsHigh = (partial.corrWithRecovery || 0) >= 0;
        return expectsHigh ? r.direction === "low_greater" : r.direction === "high_greater";
      })
      .map((r) => r.variable),
    q3_survivesArchetypeControls: "INSUFFICIENT_EVIDENCE — Level-B/C family resolution not fully wired in this pass",
    q4_levelAComparisons: levelATable.slice(0, 8),
    q5_multifunctionSurvives: freeze({
      multifunctionCount: byName.multifunctionCount || null,
      multifunctionRatio: byName.multifunctionRatio || null,
      note: "Tag-inflation control incomplete; treat flexibility as high-ambiguity until quality proxies exist.",
    }),
    q6_independentSeatsAssociate: byName.independentlyCoveredCount || null,
    q7_spofEnrichedInLow: levelABy.singlePointOfFailureCount || null,
    q8_equivalenceStability: "INSUFFICIENT_EVIDENCE — equivalence candidates observational only this pass",
    q9_collapsesUnderCounterexamples: counterexamples.length,
    q10_coverageUmbrella: coverageUmbrella.length >= 2
      ? "SEVERAL_RELATED_SIGNALS — not yet proven as one coherent Strategic Coverage primitive"
      : coverageUmbrella.length === 1
        ? "SINGLE_SIGNAL — do not rename as Coverage umbrella"
        : "CURRENT_CAPABILITY_LANGUAGE_REJECTED_OR_INSUFFICIENT",
  });
}

/**
 * Main Coverage Observation 001 runner (observation only).
 */
export function runCoverageObservation001(records = [], options = {}) {
  const analyses = options.analyses || [];
  const byId = new Map(analyses.map((a) => [a.deckId, a]));
  const features = records.map((r) => deckFeatures(r, byId.get(r.id) || null));
  const featuresById = new Map(features.map((f) => [f.deckId, f]));

  const levelACohorts = buildLevelACohortsWithRecords(records);
  const levelATable = levelAResidualDeltas(featuresById, levelACohorts);
  const partialTable = globalPartialTable(features);
  const evidence = buildCandidateEvidence(partialTable, levelATable);
  const counterexamples = findCounterexamples(features);
  const admission = atlasAdmissionGate(evidence.capabilityEvidence, evidence.residualEvidence, counterexamples);

  // Optional: still call comparable cohorts for provenance count (Level B needs family res)
  const cohortBundle = buildComparableCohorts(records, analyses, options.familyResolution || null);
  const levelAFromBundle = (cohortBundle.cohorts || []).filter((c) => c.level === "A").length;

  // Mentor language check on a small sample (validation only)
  const mentorSamples = features.slice(0, 5).map((f) => freeze({
    deckId: f.deckId,
    check: mentorLanguageCheck(f.vacancy),
  }));

  const roleInvariant = ["interaction", "removal", "draw", "ramp", "protection"].every(roleAloneCannotMintCapability);

  const questions = answerResearchQuestions(partialTable, levelATable, admission, counterexamples);

  let primaryVerdict = "INSUFFICIENT_EVIDENCE";
  if (admission.admittedVocabulary.length) primaryVerdict = "PARTIAL_ATLAS_ADMISSION";
  else if (admission.admittedResidualMeasures.length && admission.rejectedVocabulary.length) {
    primaryVerdict = "RESIDUAL_SIGNALS_WITHOUT_EARNED_CAPABILITY_LABELS";
  } else if (questions.q10_coverageUmbrella.startsWith("CURRENT_CAPABILITY")) {
    primaryVerdict = "CURRENT_CAPABILITY_LANGUAGE_REJECTED";
  } else if (questions.q1_explainsBeyondInteractionCount.startsWith("PARTIAL")) {
    primaryVerdict = "PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION";
  }

  return freeze({
    version: "academy-coverage-observation-001-v0.1",
    paper: "What Is Strategic Coverage?",
    era: "Age of Vocabulary",
    question: "Which strategic capabilities remain predictive of elite resilience after controlling for commander, archetype, and interaction count?",
    primaryVerdict,
    provenance: freeze({
      corpusMode: options.corpusMode || "unspecified",
      syntheticFixtures: options.syntheticFixtures || null,
      decks: records.length,
      events: new Set(records.map((r) => r.eventId).filter(Boolean)).size,
      levelACohorts: levelACohorts.length,
      levelACohortsFromComparableBundle: levelAFromBundle,
      analyses: analyses.length,
    }),
    institutionalConstraints: freeze({
      brainV1Frozen: true,
      brainV2Implementation: false,
      simLab002: false,
      constructionPolicyChanges: false,
      coverageScore: false,
      mentorProductionExplanations: false,
      writesToBrain: false,
      namingIsNotPromotion: true,
      eleganceIsNotEvidence: true,
    }),
    candidateCapabilities: CANDIDATE_CAPABILITIES,
    candidateSeats: CANDIDATE_SEATS,
    competingResiduals: COMPETING_RESIDUALS,
    interactionCountControlled: freeze(partialTable),
    levelAControlled: freeze(levelATable),
    capabilityCandidateEvidence: evidence.capabilityEvidence,
    residualCandidateEvidence: evidence.residualEvidence,
    counterexamples,
    atlasAdmission: admission,
    mentorLanguageValidation: freeze({
      samples: freeze(mentorSamples),
      recommendsCards: false,
      mutatesDeck: false,
    }),
    invariants: freeze({
      roleAloneCannotMintCapability: roleInvariant,
      hasCoverageScore: false,
      coverageIsMultidimensional: true,
    }),
    researchAnswers: questions,
    strongestUnexplainedResidual: partialTable[0] || null,
    recommendedNextAcademyQuestion: admission.admittedVocabulary.length
      ? "Do admitted Atlas capabilities transfer across commander families under Level-B controls?"
      : "Why do several coverage residuals correlate with structural recovery globally but reverse under Level-A same-commander contrasts?",
    laboratoryAuthorized: false,
    brainImplementationRecommended: false,
    writesToBrain: false,
    constructionMutated: false,
    generatedAt: new Date().toISOString(),
  });
}

export { roleAloneCannotMintCapability, analyzeSeatVacancies, mentorLanguageCheck, CANDIDATE_CAPABILITIES };
