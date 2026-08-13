// =============================================================================
// Opinion Engine v0 — evidence producer adapters
// =============================================================================
// Translation only. These adapters preserve provenance and uncertainty; they
// do not reinterpret observations as construction instructions.
// writesToBrain: false
// =============================================================================

import { createOpinionClaim } from "./opinion-engine.mjs";

const freeze = (value) => Object.freeze(value);
const strengthForBand = (band = "none") => ({ high: 0.9, medium: 0.7, moderate: 0.7, low: 0.48, limited: 0.42, none: 0.2 }[band] || 0.35);

export function claimsFromStrategicHypothesis(hypothesis = null, scope = {}) {
  if (!hypothesis?.id || !hypothesis?.claim || hypothesis.state === "retired") return freeze([]);
  const direction = hypothesis.state === "contradicted" ? "uncertain" : "support";
  const strongestKind = hypothesis.evidence?.tournament !== "none"
    ? "live_tournament"
    : hypothesis.evidence?.experts !== "none"
      ? "independent_expert"
      : hypothesis.evidence?.simulation !== "none"
        ? "simulation_witness"
        : "structural_evaluation";
  return freeze([createOpinionClaim({
    id: `hypothesis:${hypothesis.id}`,
    statement: hypothesis.claim,
    direction,
    strength: hypothesis.confidence?.score ?? 0.4,
    source: {
      kind: strongestKind,
      label: `Strategic Hypothesis ${hypothesis.id}`,
      provenance: (hypothesis.sources || []).map((source) => source.label || source.kind).join("; "),
      independenceKey: `hypothesis:${hypothesis.id}`,
      live: strongestKind === "live_tournament",
    },
    scope,
    reasoning: (hypothesis.evidence?.notes || []).join(" "),
    falsifier: (hypothesis.retirementCriteria || []).join(" OR "),
  })]);
}

export function claimsFromStrategicEvaluation(evaluation = null, scope = {}) {
  if (!evaluation?.ok) return freeze([]);
  const strength = Math.max(0.3, Math.min(0.8, Number(evaluation.confidence?.score) || 0.4));
  const claims = [];
  for (const [index, statement] of (evaluation.pros || []).entries()) {
    claims.push(createOpinionClaim({
      id: `evaluation:${evaluation.decision?.kind || "decision"}:pro:${index}`,
      statement,
      direction: "support",
      strength,
      source: { kind: "structural_evaluation", label: evaluation.decision?.summary || "Strategic Evaluation", independenceKey: `evaluation:${evaluation.decision?.summary || "decision"}` },
      scope,
      reasoning: evaluation.coachVoice?.paragraph || "",
    }));
  }
  for (const [index, statement] of (evaluation.cons || []).entries()) {
    claims.push(createOpinionClaim({
      id: `evaluation:${evaluation.decision?.kind || "decision"}:con:${index}`,
      statement,
      direction: "oppose",
      strength,
      source: { kind: "structural_evaluation", label: evaluation.decision?.summary || "Strategic Evaluation", independenceKey: `evaluation:${evaluation.decision?.summary || "decision"}` },
      scope,
      reasoning: (evaluation.strategicTradeoff || [])[0] || "",
    }));
  }
  for (const [index, statement] of (evaluation.strategicTradeoff || []).entries()) {
    claims.push(createOpinionClaim({
      id: `evaluation:${evaluation.decision?.kind || "decision"}:tradeoff:${index}`,
      statement,
      direction: "uncertain",
      strength,
      source: { kind: "structural_evaluation", label: "Strategic tradeoff", independenceKey: `evaluation:${evaluation.decision?.summary || "decision"}` },
      scope,
    }));
  }
  return freeze(claims);
}

export function claimsFromConceptPlayEvidence(play = null, scope = {}) {
  if (!play?.captures?.length) return freeze([]);
  return freeze(play.captures.map((capture) => createOpinionClaim({
    id: `play:${capture.id}`,
    statement: capture.claim || capture.outcome || capture.title,
    direction: capture.relation === "weakens" ? "oppose" : capture.relation === "uncertain" ? "uncertain" : "support",
    strength: strengthForBand(play.band),
    source: { kind: "exact_revision_play", label: capture.title, provenance: "authored play capture; not live telemetry", independenceKey: capture.id },
    scope,
    reasoning: capture.outcome || capture.implementation || "",
  })));
}

export function claimsFromConceptTournamentEvidence(tournament = null, scope = {}) {
  if (!tournament?.observations?.length) return freeze([]);
  return freeze(tournament.observations.map((observation) => createOpinionClaim({
    id: `tournament:${observation.id}`,
    statement: observation.claim || observation.title,
    direction: observation.countsAsSupport === false ? "uncertain" : observation.relation === "weakens" ? "oppose" : "support",
    strength: observation.countsAsSupport === false ? 0.25 : strengthForBand(tournament.band),
    source: {
      kind: observation.sourceKind === "fixture" || /fixture|synthetic/i.test(observation.corpus || "") ? "competitive_fixture_corpus" : "live_tournament",
      label: observation.title,
      provenance: observation.corpus || observation.sourceKind,
      independenceKey: observation.id,
      fixture: observation.sourceKind === "fixture" || /fixture|synthetic/i.test(observation.corpus || ""),
    },
    scope,
    reasoning: observation.note || observation.implementation || "",
  })));
}

export function claimsFromCorpusOpinionEvidence(evidence = null, scope = {}) {
  if (!evidence?.usable) return freeze([]);
  return freeze((evidence.claims || []).map((claim, index) => createOpinionClaim({
    id: `corpus:${evidence.authorityClass}:${index}`,
    statement: claim.statement,
    direction: claim.direction || "uncertain",
    strength: Math.min(Number(evidence.maxConfidenceHint) || 0.25, 0.5),
    source: {
      kind: evidence.authorityClass,
      label: "Validation Harness corpus observation",
      provenance: evidence.honesty,
      independenceKey: `corpus-observation:${evidence.forgePath || "unknown"}`,
      fixture: evidence.authorityClass === "competitive_fixture_corpus",
      live: evidence.liveTruth === true,
    },
    scope,
    reasoning: evidence.honesty || "",
  })));
}

export function claimsFromListDisagreement(disagreement = null, scope = {}) {
  if (!disagreement?.present || !Number.isFinite(disagreement.meanJaccard)) return freeze([]);
  const low = disagreement.meanJaccard < 0.25;
  return freeze([createOpinionClaim({
    id: `list-disagreement:${disagreement.adapterVersion || "v1"}`,
    statement: low
      ? `Brain-built and corpus-imported fixture lists overlap weakly (mean Jaccard ${disagreement.meanJaccard}); the disagreement needs explanation before either list is treated as normative.`
      : `Brain-built and corpus-imported fixture lists show partial structural overlap (mean Jaccard ${disagreement.meanJaccard}), without establishing which list is strategically correct.`,
    direction: "uncertain",
    strength: 0.3,
    source: { kind: "competitive_fixture_corpus", label: "Brain vs corpus list disagreement", provenance: disagreement.honesty, independenceKey: `list-disagreement:${disagreement.adapterVersion || "v1"}`, fixture: true },
    scope,
    reasoning: "List overlap is a research question, not a quality vote.",
    falsifier: "Live, independent, context-matched evidence explains or reverses the observed disagreement.",
  })]);
}

export function assembleOpinionClaims({ hypothesis, evaluation, play, tournament, corpus, disagreement, scope = {} } = {}) {
  return freeze([
    ...claimsFromStrategicHypothesis(hypothesis, scope),
    ...claimsFromStrategicEvaluation(evaluation, scope),
    ...claimsFromConceptPlayEvidence(play, scope),
    ...claimsFromConceptTournamentEvidence(tournament, scope),
    ...claimsFromCorpusOpinionEvidence(corpus, scope),
    ...claimsFromListDisagreement(disagreement, scope),
  ]);
}
