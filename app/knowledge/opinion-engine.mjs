// =============================================================================
// Opinion Engine v0 — contextual judgment with memory, not construction
// =============================================================================
// Joins question context, claims, contradictions, and evidence into one
// falsifiable stance. It may explain and propose a test. It may not select cards,
// alter weights, or promote itself into Brain behavior.
// writesToBrain: false
// =============================================================================

const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const slug = (value = "") => clean(value).toLocaleLowerCase("en")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "unknown";

export const OPINION_ENGINE_VERSION = "opinion-engine-v0";
export const OPINION_RECORD_VERSION = "strategic-opinion-record-v0";

const SOURCE_AUTHORITY = freeze({
  oracle_mechanics: 1,
  commission_contract: 0.95,
  exact_revision_play: 0.88,
  independent_expert: 0.82,
  live_tournament: 0.78,
  structural_evaluation: 0.7,
  simulation_witness: 0.58,
  community_observation: 0.5,
  competitive_fixture_corpus: 0.3,
  illustrative_fixture: 0.2,
  unknown: 0.15,
});

export function compileOpinionContext({
  question = "",
  format = "Commander",
  commanderName = "",
  subject = "",
  decision = "",
  deckRevision = null,
  commission = null,
  constraints = [],
  tableContext = null,
  timeHorizon = null,
} = {}) {
  const normalizedQuestion = clean(question);
  if (!normalizedQuestion) throw new Error("Opinion context requires a question");
  const priorities = [
    ...(commission?.playerFantasy?.priorities || []),
    ...(commission?.priorities || []),
    ...(commission?.requestRecognition?.priorities || []),
  ].map(clean).filter(Boolean);
  const anchors = [
    ...(commission?.playerFantasy?.anchors || []),
    ...(commission?.youAskedFor || []).filter((entry) => entry?.role === "anchor").map((entry) => entry.label),
  ].map(clean).filter(Boolean);
  const context = {
    kind: "StrategicQuestionContext",
    version: "strategic-question-context-v0",
    question: normalizedQuestion,
    format: clean(format) || "Commander",
    commanderName: clean(commanderName) || null,
    subject: clean(subject) || null,
    decision: clean(decision) || "evaluate",
    deckRevision: deckRevision ? clean(deckRevision) : null,
    commission: freeze({
      fantasy: clean(commission?.playerFantasy?.label || commission?.fantasyLabel) || null,
      priorities: freeze([...new Set(priorities)]),
      anchors: freeze([...new Set(anchors)]),
    }),
    constraints: freeze([...new Set((constraints || []).map(clean).filter(Boolean))]),
    tableContext: tableContext ? freeze({ ...tableContext }) : null,
    timeHorizon: timeHorizon ? freeze({ ...timeHorizon }) : null,
  };
  return freeze({
    ...context,
    contextId: [context.format, context.commanderName, context.subject, context.decision, context.question]
      .filter(Boolean).map(slug).join("::"),
  });
}

export function createOpinionClaim({
  id,
  statement,
  direction = "support",
  strength = 0.5,
  source = {},
  scope = {},
  reasoning = "",
  falsifier = "",
} = {}) {
  if (!id || !clean(statement)) throw new Error("Opinion claim requires id and statement");
  if (!["support", "oppose", "uncertain"].includes(direction)) {
    throw new Error(`Unsupported opinion claim direction: ${direction}`);
  }
  const sourceKind = clean(source.kind) || "unknown";
  const authority = SOURCE_AUTHORITY[sourceKind] ?? SOURCE_AUTHORITY.unknown;
  const independenceKey = clean(source.independenceKey || source.eventId || source.author || source.label || id);
  return freeze({
    kind: "OpinionClaim",
    version: "opinion-claim-v0",
    id: clean(id),
    statement: clean(statement),
    direction,
    strength: round(clamp(strength)),
    source: freeze({
      kind: sourceKind,
      label: clean(source.label) || sourceKind,
      provenance: clean(source.provenance) || null,
      independenceKey,
      live: source.live === true,
      fixture: source.fixture === true || /fixture/.test(sourceKind),
    }),
    authority,
    scope: freeze({
      formats: freeze((scope.formats || []).map(clean).filter(Boolean)),
      commanders: freeze((scope.commanders || []).map(clean).filter(Boolean)),
      subjects: freeze((scope.subjects || []).map(clean).filter(Boolean)),
      requiresCommissionAnchor: scope.requiresCommissionAnchor === true,
    }),
    reasoning: clean(reasoning) || null,
    falsifier: clean(falsifier) || null,
    writesToBrain: false,
  });
}

function relevanceFor(claim, context) {
  let relevance = 1;
  const { scope } = claim;
  if (scope.formats.length && !scope.formats.some((value) => slug(value) === slug(context.format))) return 0;
  if (scope.commanders.length && !scope.commanders.some((value) => slug(value) === slug(context.commanderName))) return 0;
  if (scope.subjects.length && !scope.subjects.some((value) => slug(value) === slug(context.subject))) return 0;
  if (scope.requiresCommissionAnchor) {
    const anchored = context.commission.anchors.some((value) => slug(value) === slug(context.subject));
    if (!anchored) return 0;
  }
  if (!scope.commanders.length && context.commanderName) relevance *= 0.92;
  if (!scope.subjects.length && context.subject) relevance *= 0.9;
  return relevance;
}

function scoreClaims(claims, context) {
  const seen = new Map();
  return claims.map((claim) => {
    const relevance = relevanceFor(claim, context);
    const repeats = seen.get(claim.source.independenceKey) || 0;
    seen.set(claim.source.independenceKey, repeats + 1);
    const independenceDiscount = repeats === 0 ? 1 : 1 / (repeats + 1);
    const weight = claim.direction === "uncertain"
      ? 0
      : claim.strength * claim.authority * relevance * independenceDiscount;
    return freeze({ ...claim, relevance: round(relevance), independenceDiscount: round(independenceDiscount), weight: round(weight) });
  }).filter((claim) => claim.relevance > 0);
}

function confidenceBand(score) {
  if (score >= 0.78) return "high";
  if (score >= 0.58) return "moderate";
  if (score >= 0.38) return "limited";
  return "insufficient";
}

export function synthesizeStrategicOpinion({
  context,
  claims = [],
  proposedTest = null,
  previous = null,
  now = new Date().toISOString(),
} = {}) {
  if (!context?.contextId) throw new Error("Opinion synthesis requires a compiled context");
  const scored = scoreClaims(claims, context);
  const support = scored.filter((claim) => claim.direction === "support").sort((a, b) => b.weight - a.weight);
  const oppose = scored.filter((claim) => claim.direction === "oppose").sort((a, b) => b.weight - a.weight);
  const uncertainty = scored.filter((claim) => claim.direction === "uncertain");
  const supportWeight = support.reduce((sum, claim) => sum + claim.weight, 0);
  const opposeWeight = oppose.reduce((sum, claim) => sum + claim.weight, 0);
  const total = supportWeight + opposeWeight;
  const margin = total ? (supportWeight - opposeWeight) / total : 0;
  const independentSources = new Set(scored.map((claim) => claim.source.independenceKey)).size;
  const contradiction = supportWeight > 0 && opposeWeight > 0;
  const evidenceDepth = clamp(independentSources / 5);
  const decisiveness = Math.abs(margin);
  const fixtureShare = total
    ? scored.filter((claim) => claim.source.fixture).reduce((sum, claim) => sum + Math.abs(claim.weight), 0) / total
    : 0;
  let confidenceScore = clamp((decisiveness * 0.58) + (evidenceDepth * 0.32) + (total ? 0.1 : 0));
  if (contradiction) confidenceScore *= 0.88;
  if (fixtureShare > 0.5) confidenceScore = Math.min(confidenceScore, 0.44);
  const verdict = total === 0 || Math.abs(margin) < 0.12
    ? "unresolved"
    : margin > 0 ? "recommend" : "do_not_recommend";
  const confidence = freeze({ score: round(confidenceScore), level: confidenceBand(confidenceScore) });
  const leading = verdict === "recommend" ? support[0] : verdict === "do_not_recommend" ? oppose[0] : scored[0];
  const counter = verdict === "recommend" ? oppose[0] : verdict === "do_not_recommend" ? support[0] : scored[1];
  const opinionId = `opinion::${context.contextId}`;
  const revision = previous?.opinionId === opinionId ? Number(previous.revision || 0) + 1 : 1;
  const changed = previous?.verdict && previous.verdict !== verdict;

  return freeze({
    kind: "StrategicOpinionRecord",
    version: OPINION_RECORD_VERSION,
    engineVersion: OPINION_ENGINE_VERSION,
    opinionId,
    revision,
    supersedesRevision: revision > 1 ? revision - 1 : null,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    writesToBrain: false,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    context,
    verdict,
    confidence,
    answer: leading?.statement || "MetaForge does not have enough applicable evidence to take a position yet.",
    why: leading?.reasoning || leading?.statement || "Applicable evidence is insufficient.",
    strongestCounterargument: counter?.statement || "No independent counterargument is recorded yet.",
    uncertainty: freeze(uncertainty.map((claim) => claim.statement)),
    applicableWhen: freeze([
      context.commanderName ? `Commander is ${context.commanderName}` : null,
      context.commission.fantasy ? `Commission is ${context.commission.fantasy}` : null,
      context.commission.anchors.length ? `Named anchors include ${context.commission.anchors.join(", ")}` : null,
      context.deckRevision ? `Deck revision is ${context.deckRevision}` : null,
    ].filter(Boolean)),
    whatWouldChangeMyMind: freeze([...new Set(scored.map((claim) => claim.falsifier).filter(Boolean))]),
    proposedTest: proposedTest ? freeze({ ...proposedTest }) : null,
    evidence: freeze({
      claims: freeze(scored),
      supportingClaimIds: freeze(support.map((claim) => claim.id)),
      opposingClaimIds: freeze(oppose.map((claim) => claim.id)),
      supportWeight: round(supportWeight),
      opposeWeight: round(opposeWeight),
      independentSources,
      contradictionPresent: contradiction,
      fixtureEvidenceShare: round(fixtureShare),
    }),
    revisionNote: revision === 1
      ? "Initial shadow opinion. Explanation only."
      : changed
        ? `Verdict changed from ${previous.verdict} to ${verdict} after new evidence.`
        : `Verdict retained after evidence update from revision ${revision - 1}.`,
  });
}

export function reviseStrategicOpinion(previous, { claims = [], proposedTest, now } = {}) {
  if (!previous?.context || !previous?.evidence?.claims) {
    throw new Error("Opinion revision requires a prior StrategicOpinionRecord");
  }
  const byId = new Map(previous.evidence.claims.map((claim) => [claim.id, claim]));
  for (const claim of claims) byId.set(claim.id, claim);
  return synthesizeStrategicOpinion({
    context: previous.context,
    claims: [...byId.values()],
    proposedTest: proposedTest === undefined ? previous.proposedTest : proposedTest,
    previous,
    now,
  });
}

export function presentOpinionForMentor(opinion) {
  if (!opinion?.opinionId) return null;
  return freeze({
    kind: "MentorOpinionPresentation",
    version: "mentor-opinion-presentation-v0",
    writesToBrain: false,
    opinionId: opinion.opinionId,
    revision: opinion.revision,
    headline: opinion.verdict === "recommend"
      ? "MetaForge currently recommends this in the stated context."
      : opinion.verdict === "do_not_recommend"
        ? "MetaForge currently recommends against this in the stated context."
        : "MetaForge does not have enough separation to recommend either way yet.",
    answer: opinion.answer,
    why: opinion.why,
    strongestCounterargument: opinion.strongestCounterargument,
    confidence: opinion.confidence,
    applicableWhen: opinion.applicableWhen,
    whatWouldChangeMyMind: opinion.whatWouldChangeMyMind,
    proposedTest: opinion.proposedTest,
  });
}

