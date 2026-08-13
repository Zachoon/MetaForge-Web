// =============================================================================
// Opinion v0.4 — exact-revision eligibility
// =============================================================================
// Resolves one server-owned product question against an authenticated player's
// saved Deck Bench. It never accepts claims or borrows Founder fixture context.
// writesToBrain: false
// =============================================================================

import { compileOpinionContext, createOpinionClaim, presentOpinionForMentor, synthesizeStrategicOpinion } from "./opinion-engine.mjs";
import { getContextualCardIdentity } from "./opinion-claim-registry.mjs";

const freeze = (value) => Object.freeze(value);
const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const normalize = (value = "") => clean(value).toLocaleLowerCase("en").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const REVISION_OPINION_VERSION = "revision-opinion-eligibility-v0";
export const PRODUCT_OPINION_KEY = "product-atraxa-theme-doubling-season-v0";

function deckNames(deckText = "") {
  return String(deckText || "").split(/\r?\n/).map((line) => line.trim())
    .filter(Boolean).map((line) => line.replace(/^\s*\d+\s+(?:x\s+)?/i, "").trim()).filter(Boolean);
}

function commanderFor(family, revision) {
  return clean(family?.commander?.name || revision?.recommendationRecord?.commanderName || "");
}

function commissionFor(family, revision) {
  return clean(revision?.commissionNote || family?.commissionNote || family?.playerGoal || "");
}

function inRevision(revision, cardName) {
  const target = normalize(cardName);
  return deckNames(revision?.deckText).some((name) => normalize(name) === target)
    || (revision?.recommendationRecord?.deck || []).some((row) => normalize(row?.name) === target);
}

export function resolveExactRevision(bench, { familyId = "", revisionId = "", fingerprint = "" } = {}) {
  const families = Array.isArray(bench?.families) ? bench.families : [];
  const family = families.find((row) => String(row?.id || "") === String(familyId || ""));
  if (!family) return freeze({ ok: false, reason: "family_not_found" });
  const ref = clean(revisionId || fingerprint);
  if (!ref) return freeze({ ok: false, reason: "revision_required" });
  const revision = (family.revisions || []).find((row) => String(row?.id || "") === ref || String(row?.fingerprint || "") === ref);
  if (!revision) return freeze({ ok: false, reason: "stale_or_missing_revision" });
  return freeze({ ok: true, family, revision, revisionId: revision.id || revision.fingerprint, fingerprint: revision.fingerprint || null });
}

export function evaluateRevisionOpinionEligibility({ bench, familyId, revisionId, fingerprint } = {}) {
  const exact = resolveExactRevision(bench, { familyId, revisionId, fingerprint });
  if (!exact.ok) return freeze({ version: REVISION_OPINION_VERSION, writesToBrain: false, eligible: false, reason: exact.reason, presentation: null });
  const { family, revision } = exact;
  const commanderName = commanderFor(family, revision);
  const commissionNote = commissionFor(family, revision);
  const subject = "Doubling Season";
  const isAtraxa = normalize(commanderName) === normalize("Atraxa, Praetors' Voice");
  const cardPresent = inRevision(revision, subject);
  const explicitAnchor = /doubling\s+season/i.test(commissionNote);
  const themeContext = /superfriends?|planeswalker|theme|star(?:s|\s+of\s+the\s+show)?/i.test(commissionNote);
  let reason = null;
  if ((family.game || "mtg") !== "mtg" || !/commander/i.test(family.format || "")) reason = "unsupported_game_or_format";
  else if (!isAtraxa) reason = "no_registered_question";
  else if (!cardPresent) reason = "subject_not_in_revision";
  else if (!explicitAnchor || !themeContext) reason = "commission_not_eligible";
  if (reason) return freeze({
    version: REVISION_OPINION_VERSION, writesToBrain: false, eligible: false, reason, presentation: null,
    revision: freeze({ familyId: family.id, revisionId: exact.revisionId, fingerprint: exact.fingerprint, commanderName, subject }),
  });
  return freeze({
    version: REVISION_OPINION_VERSION,
    writesToBrain: false,
    eligible: true,
    opinionKey: PRODUCT_OPINION_KEY,
    revision: freeze({ familyId: family.id, revisionId: exact.revisionId, fingerprint: exact.fingerprint, commanderName, subject }),
    question: freeze({ opinionKey: PRODUCT_OPINION_KEY, prompt: "Why is Doubling Season here, and should I keep it?" }),
    context: freeze({ commissionNote, familyName: clean(family.name), format: clean(family.format) || "Commander" }),
    cardIdentity: getContextualCardIdentity(subject),
  });
}

export function buildExactRevisionOpinion(eligibility, { now = new Date().toISOString() } = {}) {
  if (!eligibility?.eligible) return null;
  const { revision, context } = eligibility;
  const questionContext = compileOpinionContext({
    question: eligibility.question.prompt,
    format: context.format,
    commanderName: revision.commanderName,
    subject: revision.subject,
    decision: "keep_or_cut",
    deckRevision: revision.fingerprint || revision.revisionId,
    commission: { fantasyLabel: "Superfriends", priorities: [context.commissionNote], playerFantasy: { label: "Superfriends", anchors: [revision.subject] } },
    constraints: ["Use only this saved revision and its commission"],
  });
  const scope = { formats: [context.format], commanders: [revision.commanderName], subjects: [revision.subject], requiresCommissionAnchor: true };
  const claims = [
    createOpinionClaim({ id: `${revision.fingerprint}:commission-anchor`, statement: `Keep ${revision.subject}: this saved commission explicitly names it as part of the requested experience.`, direction: "support", strength: 1, source: { kind: "commission_contract", label: `${context.familyName} saved commission`, independenceKey: `${revision.fingerprint}:commission` }, scope, reasoning: "The product opinion is bound to the player's saved commission, not a Founder fixture.", falsifier: "The player changes this revision's commission or removes the named centerpiece." }),
    createOpinionClaim({ id: `${revision.fingerprint}:mechanics`, statement: `${revision.subject} raises the ceiling of counter and planeswalker payoffs in this exact deck concept.`, direction: "support", strength: 0.9, source: { kind: "oracle_mechanics", label: "Card mechanics", independenceKey: "doubling-season-oracle" }, scope: { ...scope, requiresCommissionAnchor: false }, reasoning: "Mechanical fit supports the commission but does not establish universal correctness.", falsifier: "The exact revision loses the relevant counter and planeswalker payoffs." }),
    createOpinionClaim({ id: `${revision.fingerprint}:commitment-window`, statement: "Its five-mana setup window can be punished before the deck converts the investment.", direction: "oppose", strength: 0.75, source: { kind: "structural_evaluation", label: "Commitment timing", independenceKey: `${revision.fingerprint}:commitment` }, scope: { ...scope, requiresCommissionAnchor: false }, reasoning: "The card should be sequenced with a follow-up or protection window, not treated as an automatic turn-five play.", falsifier: "Exact-revision games consistently convert it before opponents receive a meaningful punish window." }),
  ];
  const opinion = synthesizeStrategicOpinion({ context: questionContext, claims, now, proposedTest: { id: `${revision.fingerprint}:conversion-test`, instruction: "Across five comparable games, record whether Doubling Season is followed by a relevant payoff before opponents untap.", minimumComparableObservations: 5 } });
  return freeze({ opinion, presentation: presentOpinionForMentor(opinion) });
}

