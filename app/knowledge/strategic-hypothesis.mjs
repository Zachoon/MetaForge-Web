// =============================================================================
// Knowledge — Strategic Hypothesis v0
// =============================================================================
// Research object: falsifiable Strategic Hypothesis (can die).
// Product voice: Strategic Stance ("current understanding suggests…").
// Not an opinion. Not Brain behavior. writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export const HYPOTHESIS_STATES = freeze([
  "strongly_supported",
  "emerging",
  "contradicted",
  "retired",
]);

export const EVIDENCE_BANDS = freeze(["none", "low", "medium", "high"]);

/**
 * Create one Strategic Hypothesis (research object).
 */
export function createStrategicHypothesis({
  id,
  claim,
  subject = null,
  state = "emerging",
  evidence = {},
  prediction = null,
  retirementCriteria = [],
  uniquenessAngle = null,
  sources = [],
  confidence = null,
} = {}) {
  if (!id || !claim) {
    throw new Error("Strategic Hypothesis requires id and claim");
  }
  const conf = confidence || confidenceFromEvidence(evidence, state);
  return freeze({
    writesToBrain: false,
    activated: false,
    promoted: false,
    namingIsNotPromotion: true,
    version: "strategic-hypothesis-v0",
    kind: "StrategicHypothesis",
    id,
    claim,
    subject,
    state: HYPOTHESIS_STATES.includes(state) ? state : "emerging",
    evidence: freeze({
      tournament: evidence.tournament || "none",
      experts: evidence.experts || "none",
      shadow: evidence.shadow || "none",
      simulation: evidence.simulation || "none",
      notes: freeze(evidence.notes || []),
    }),
    prediction: prediction
      ? freeze({
          windowDays: prediction.windowDays ?? 90,
          expectToObserve: freeze(prediction.expectToObserve || []),
          note: prediction.note || null,
        })
      : null,
    retirementCriteria: freeze(retirementCriteria.length
      ? retirementCriteria
      : defaultRetirementCriteria()),
    uniquenessAngle: uniquenessAngle || null,
    confidence: freeze(conf),
    sources: freeze(sources),
    brainInheritance: "none",
  });
}

function defaultRetirementCriteria() {
  return freeze([
    "Fails holdout / replication over the next 60 days",
    "OR contradicted by ≥3 independent events after this observation window",
  ]);
}

function confidenceFromEvidence(evidence = {}, state = "emerging") {
  if (state === "retired") return freeze({ level: "retired", score: 0 });
  if (state === "contradicted") return freeze({ level: "contested", score: 0.35 });
  const tournament = evidence.tournament || "none";
  const experts = evidence.experts || "none";
  const shadow = evidence.shadow || "none";
  let score = 0.2;
  if (tournament === "high") score += 0.35;
  else if (tournament === "medium") score += 0.2;
  else if (tournament === "low") score += 0.1;
  if (experts === "high") score += 0.2;
  else if (experts === "medium") score += 0.1;
  if (shadow === "high") score += 0.15;
  else if (shadow === "medium" || shadow === "mixed") score += 0.08;
  if (state === "strongly_supported") score = Math.max(score, 0.75);
  const level = score >= 0.75 ? "high" : score >= 0.5 ? "moderate" : score >= 0.3 ? "limited" : "insufficient";
  return freeze({ level, score: round(Math.min(0.95, score)) });
}

/**
 * Product presentation of a hypothesis — never as immutable fact.
 */
export function presentAsStrategicStance(hypothesis = null) {
  if (!hypothesis) return null;
  const hedge = hypothesis.state === "strongly_supported"
    ? "MetaForge currently believes"
    : hypothesis.state === "contradicted"
      ? "Current understanding is contested"
      : hypothesis.state === "retired"
        ? "MetaForge previously believed (now retired)"
        : "Current understanding suggests";

  return freeze({
    writesToBrain: false,
    kind: "StrategicStance",
    hypothesisId: hypothesis.id,
    voice: hedge,
    statement: `${hedge}: ${hypothesis.claim}`,
    confidence: hypothesis.confidence,
    state: hypothesis.state,
    whatWouldChangeMyMind: freeze(hypothesis.retirementCriteria),
    prediction: hypothesis.prediction,
    coachMustNotSay: freeze([
      "This is definitely correct",
      "The meta has decided",
      "Brain should do this",
    ]),
    coachMaySay: freeze([
      "Current understanding suggests…",
      "Based on observed tournament structures…",
      "MetaForge currently believes…",
      "Here's what would change my mind…",
    ]),
  });
}

function bandFromProfileConfidence(level) {
  if (level === "high") return "high";
  if (level === "moderate") return "medium";
  if (level === "limited") return "low";
  return "none";
}

/**
 * Derive up to five falsifiable hypotheses from live elite intelligence (+ optional shadow).
 * v0: concrete, capped — not an ontology project.
 */
export function deriveStrategicHypothesesV0({
  liveIntelligence = null,
  shadowLive = null,
  expertCorpus = null,
  limit = 5,
} = {}) {
  const hypotheses = [];
  const profiles = liveIntelligence?.commanderProfiles || [];
  const contradictions = liveIntelligence?.contradictions || [];
  const replicated = liveIntelligence?.strongestReplicatedObservations || [];
  const corpus = liveIntelligence?.corpus || {};

  // 1) Strongest single-plan replication → strongly_supported
  const cleanReplicated = replicated.find((row) => {
    const contested = contradictions.some((c) => c.commanderIdentity === row.commanderIdentity);
    return !contested && row.confidence === "high";
  });
  if (cleanReplicated) {
    hypotheses.push(createStrategicHypothesis({
      id: `hyp-replicated-${slug(cleanReplicated.commanderIdentity)}`,
      subject: cleanReplicated.commanderIdentity,
      claim: `${cleanReplicated.commanderIdentity}: ${cleanReplicated.observation.replace(/^Primary plan /, "elite converters repeatedly center on ")}`,
      state: "strongly_supported",
      evidence: {
        tournament: "high",
        experts: "none",
        shadow: "none",
        simulation: "none",
        notes: [
          `Live window decks=${corpus.decks ?? "?"} events=${corpus.events ?? "?"}`,
          cleanReplicated.observation,
        ],
      },
      prediction: {
        windowDays: 90,
        expectToObserve: [
          `Continued high share of the same primary plan for ${cleanReplicated.commanderIdentity}`,
          "New converter lists in this family should not flip to an unrelated primary plan without event-level contradiction",
        ],
      },
      retirementCriteria: [
        "Primary plan share falls below 50% across ≥3 independent events in the next 60 days",
        "OR a competing primary plan reaches ≥40% share with converters in ≥2 events",
      ],
      sources: freeze([{ kind: "elite_tournament_intelligence", label: liveIntelligence?.label || "live" }]),
    }));
  }

  // 2–3) Contradictions → contradicted / contested hypotheses
  for (const row of contradictions.slice(0, 2)) {
    const profile = profiles.find((p) => p.commanderIdentity === row.commanderIdentity);
    hypotheses.push(createStrategicHypothesis({
      id: `hyp-contested-${slug(row.commanderIdentity)}`,
      subject: row.commanderIdentity,
      claim: `${row.commanderIdentity} does not have a single settled primary plan — ${row.text.replace(/^Competing primary plans observed: /, "")} remain competitive in elite lists.`,
      state: "contradicted",
      evidence: {
        tournament: bandFromProfileConfidence(profile?.confidence?.level),
        experts: "none",
        shadow: "none",
        simulation: "none",
        notes: [
          `sampleSize=${profile?.sampleSize ?? "?"}`,
          `independentEvents=${profile?.independentEvents ?? "?"}`,
          row.text,
        ],
      },
      prediction: {
        windowDays: 90,
        expectToObserve: [
          "Both named plans continue to appear among converters",
          "OR one plan pulls ahead (≥70% share) and the contradiction retires into a strongly_supported successor",
        ],
      },
      retirementCriteria: [
        "One primary plan exceeds 70% share across the next 60 days with ≥3 independent events",
        "OR sample collapses below usable confidence (insufficient_sample)",
      ],
      uniquenessAngle: `A unique angle may exist by committing harder to the under-represented competing plan while the field splits attention.`,
      sources: freeze([{ kind: "elite_contradiction", label: row.commanderIdentity }]),
    }));
  }

  // 4) Shadow finding → emerging (Brain vs reality)
  const shadowRow = (shadowLive?.sample || []).find((row) =>
    row.classification === "brain_underweights" || row.classification === "brain_missing_concept");
  if (shadowRow) {
    hypotheses.push(createStrategicHypothesis({
      id: `hyp-shadow-${slug(shadowRow.feature)}`,
      subject: shadowRow.feature,
      claim: shadowRow.classification === "brain_missing_concept"
        ? `Elite converter structure surfaces "${shadowRow.feature}" as strategically meaningful, but Brain v1 does not encode it as a construction concept.`
        : `Elite converters emphasize "${shadowRow.feature}" more than Brain v1 density-first priors currently reflect.`,
      state: "emerging",
      evidence: {
        tournament: "medium",
        experts: "none",
        shadow: shadowRow.confidence >= 0.7 ? "high" : "mixed",
        simulation: "none",
        notes: [shadowRow.note, `shadowConfidence=${shadowRow.confidence}`],
      },
      prediction: {
        windowDays: 90,
        expectToObserve: [
          `Level-A / converter cohorts continue to show measurable ${shadowRow.feature} effects`,
          "If the effect fails replication, this hypothesis retires without Brain inheritance",
        ],
      },
      retirementCriteria: [
        "Fails replication in Level-A cohorts over the next 60 days",
        "OR shadow classification flips to brain_agrees on holdout",
      ],
      uniquenessAngle: "Not a modal 99 copy — a structural seat Brain may be under-preparing for.",
      sources: freeze([{ kind: "brain_shadow", label: shadowLive?.source || "live-shadow" }]),
    }));
  }

  // 5) Expert concept candidate (if present) — emerging, unpromoted
  const expertHit = (expertCorpus?.candidates || [])[0];
  if (expertHit && hypotheses.length < limit) {
    hypotheses.push(createStrategicHypothesis({
      id: `hyp-expert-${expertHit.conceptId}`,
      subject: expertHit.conceptId,
      claim: `Expert reasoning independently recurs on "${expertHit.label}" as a decision concept — still observation-only, not Brain behavior.`,
      state: "emerging",
      evidence: {
        tournament: "none",
        experts: expertHit.independentExperts >= 3 ? "high" : "medium",
        shadow: "none",
        simulation: "none",
        notes: [
          `independentExperts=${expertHit.independentExperts}`,
          `authors=${(expertHit.authors || []).join(", ")}`,
        ],
      },
      prediction: {
        windowDays: 90,
        expectToObserve: [
          "Additional independent expert sources continue to invoke this concept",
          "AND/OR tournament structure language maps onto the same seat (not automatic)",
        ],
      },
      retirementCriteria: [
        "No further independent expert replication in the next Stream 002 slice",
        "OR concept remains vocabulary-only with zero structural mapping after review",
      ],
      sources: freeze([{ kind: "expert_strategy_corpus", label: "stream-002" }]),
    }));
  }

  // Fill to 5 with additional high-confidence replicated profiles if needed
  for (const row of replicated) {
    if (hypotheses.length >= limit) break;
    if (hypotheses.some((h) => h.subject === row.commanderIdentity)) continue;
    if (contradictions.some((c) => c.commanderIdentity === row.commanderIdentity)) continue;
    hypotheses.push(createStrategicHypothesis({
      id: `hyp-replicated-${slug(row.commanderIdentity)}`,
      subject: row.commanderIdentity,
      claim: `${row.commanderIdentity}: elite lists repeatedly converge — ${row.observation}.`,
      state: row.confidence === "high" ? "strongly_supported" : "emerging",
      evidence: {
        tournament: row.confidence === "high" ? "high" : "medium",
        experts: "none",
        shadow: "none",
        simulation: "none",
        notes: [row.observation],
      },
      prediction: {
        windowDays: 90,
        expectToObserve: [
          `Stable primary-plan replication for ${row.commanderIdentity}`,
        ],
      },
      sources: freeze([{ kind: "elite_tournament_intelligence", label: liveIntelligence?.label || "live" }]),
    }));
  }

  const capped = hypotheses.slice(0, limit);
  return freeze({
    writesToBrain: false,
    activated: false,
    promoted: false,
    version: "strategic-hypothesis-bundle-v0",
    brainChanges: 0,
    brainInheritance: "none",
    pipeline: freeze([
      "Knowledge",
      "Strategic Hypotheses",
      "Strategic Stance (product presentation)",
      "Shadow",
      "Laboratory",
      "Harness",
      "Brain",
    ]),
    counts: freeze({
      total: capped.length,
      strongly_supported: capped.filter((h) => h.state === "strongly_supported").length,
      emerging: capped.filter((h) => h.state === "emerging").length,
      contradicted: capped.filter((h) => h.state === "contradicted").length,
      retired: capped.filter((h) => h.state === "retired").length,
    }),
    hypotheses: freeze(capped),
    stances: freeze(capped.map(presentAsStrategicStance)),
  });
}

function slug(value = "") {
  return String(value)
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "unknown";
}

export { slug as hypothesisSubjectSlug };
