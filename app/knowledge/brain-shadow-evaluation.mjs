// =============================================================================
// Knowledge — Brain Shadow Evaluation (Epic 6)
// =============================================================================
// Read-only compare: Brain v1 theory vs elite/field knowledge observations.
// Does NOT mutate construction. Does NOT promote candidates.
// writesToBrain: false · brainV1RemainsFrozen: true
// =============================================================================

import { analyzeCorpus } from "../field-intelligence/corpus-analyze.mjs";
import { buildStructuralEvidence } from "../field-intelligence/structural-evidence.mjs";
import { compareCorpusEvidenceToBrainTheory } from "../field-intelligence/brain-human-compare.mjs";
import { materializeCompetitiveFixtureCorpus } from "../field-intelligence/fixtures/competitive-corpus.mjs";
import { buildEliteTournamentIntelligenceFromFixtures } from "./elite-tournament-intelligence.mjs";
import { buildExpertStrategyCorpusFromFixtures } from "./expert-strategy-corpus.mjs";

const freeze = (value) => Object.freeze(value);

function countBy(rows = [], keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return freeze(counts);
}

/**
 * Project live artifact Brain-v1 classification block (read-only).
 */
export function summarizeLiveBrainShadow(artifact = null) {
  if (!artifact) return null;
  const block = artifact.brainV1Classifications || {};
  const classifications = block.classifications || [];
  return freeze({
    writesToBrain: false,
    brainV1RemainsFrozen: true,
    source: "corpus-intelligence-artifact",
    generatedAt: artifact.generatedAt || null,
    brainPolicyTouched: artifact.brainPolicyTouched === true,
    constructionMutated: artifact.constructionMutated === true,
    version: block.version || null,
    counts: freeze(block.counts || countBy(classifications, (row) => row.classification)),
    sample: freeze(classifications.slice(0, 12).map((row) => freeze({
      feature: row.feature,
      classification: row.classification,
      confidence: row.confidence,
      note: row.note,
      brainV2Eligible: row.brainV2Eligible === true,
    }))),
  });
}

/**
 * Fixture shadow evaluation: Brain package theory vs competitive fixture structure.
 */
export function buildBrainShadowEvaluation({
  records = null,
  label = "brain-shadow-evaluation",
} = {}) {
  const corpusRecords = records || materializeCompetitiveFixtureCorpus().records || [];
  const analyses = analyzeCorpus(corpusRecords, { includeHoldout: false });
  const structuralEvidence = buildStructuralEvidence(analyses, corpusRecords);
  const compare = compareCorpusEvidenceToBrainTheory(structuralEvidence, analyses);
  const elite = buildEliteTournamentIntelligenceFromFixtures();
  const expert = buildExpertStrategyCorpusFromFixtures();

  const shadowFindings = [];

  for (const row of compare.humanSupportedBlindSpots || []) {
    shadowFindings.push(freeze({
      kind: "human_supported_blind_spot",
      subject: row.packageId || row.deckId || row.kind,
      detail: row.note,
      candidateFor: row.candidateFor || "review_only",
      promotesToBrain: false,
    }));
  }
  for (const row of compare.metaforgeDisagreements || []) {
    shadowFindings.push(freeze({
      kind: "brain_theory_divergence",
      subject: row.packageId || row.kind,
      detail: row.note,
      brainTheory: row.brainTheory,
      corpusWeightedMean: row.corpusWeightedMean,
      promotesToBrain: false,
    }));
  }
  for (const row of elite.contradictions || []) {
    shadowFindings.push(freeze({
      kind: "elite_structure_contradiction",
      subject: row.commanderIdentity,
      detail: row.text,
      promotesToBrain: false,
    }));
  }
  for (const candidate of (expert.candidates || []).slice(0, 8)) {
    shadowFindings.push(freeze({
      kind: "expert_concept_not_in_brain_construction",
      subject: candidate.conceptId,
      detail: `Stream 002 candidate "${candidate.label}" replicated across ${candidate.independentExperts} voices — observation only`,
      promotesToBrain: false,
      activated: false,
      promoted: false,
    }));
  }

  return freeze({
    writesToBrain: false,
    brainV1RemainsFrozen: true,
    activated: false,
    promoted: false,
    version: "brain-shadow-evaluation-v1",
    label,
    brainChanges: 0,
    corpus: freeze({
      decks: corpusRecords.length,
      analyses: analyses.length,
      packageCoreRanges: Object.keys(structuralEvidence.packageCoreRanges || {}).length,
    }),
    brainHumanCompare: freeze({
      version: compare.version,
      agreements: (compare.agreements || []).length,
      humanSupportedBlindSpots: (compare.humanSupportedBlindSpots || []).length,
      metaforgeDisagreements: (compare.metaforgeDisagreements || []).length,
      humanNoise: (compare.humanNoise || []).length,
      sampleAgreements: freeze((compare.agreements || []).slice(0, 8)),
      sampleBlindSpots: freeze((compare.humanSupportedBlindSpots || []).slice(0, 8)),
      sampleDisagreements: freeze((compare.metaforgeDisagreements || []).slice(0, 8)),
    }),
    knowledgeCrossCheck: freeze({
      eliteCommanderProfiles: elite.commanderProfiles.length,
      eliteContradictions: elite.contradictions.length,
      levelAUsableCohorts: elite.levelA.usableCohorts,
      expertCandidates: expert.candidates.length,
      expertRejects: expert.rejects.length,
    }),
    shadowFindings: freeze(shadowFindings.slice(0, 40)),
    promotionGate: freeze({
      note: "Shadow findings are review signals only. No Brain weights, packages, or branches change here.",
      requiredNext: "Validation Harness report before any construction change",
    }),
  });
}

export function buildBrainShadowEvaluationFromFixtures() {
  return buildBrainShadowEvaluation({ label: "competitive-fixtures" });
}
