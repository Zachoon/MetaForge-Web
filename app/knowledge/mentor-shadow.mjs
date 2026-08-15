// =============================================================================
// Mentor Shadow v0 — understanding without construction
// =============================================================================
// First Mentor embodiment: explain a card/package in Atlas seat language.
// Does not change the 99. Does not invent scores. writesToBrain: false.
// =============================================================================

import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
  seatNamedResourceImplementation,
} from "./atlas-vocabulary.mjs";
import { getStrategicConcept, buildStrategicConceptLibrary } from "./strategic-concept.mjs";

const freeze = (value) => Object.freeze(value);

/**
 * Draft a Mentor explanation for one card in a finished (or candidate) list.
 * Parallel commentary only — never a construction input.
 */
export function explainCardAsMentor({
  cardName = "",
  oracleText = "",
  typeLine = "",
  mechanics,
  activeResources = [],
  commanderName = "",
  fantasyLabel = "",
  commissionMismatch = false,
} = {}) {
  const card = String(cardName || "").trim();
  if (!card) {
    return freeze({
      ok: false,
      writesToBrain: false,
      reason: "missing_card",
      note: "Mentor needs a card to explain — not a scoreboard.",
    });
  }

  const seats = seatsImplementedBy(card);
  const resourceSeating = seatNamedResourceImplementation({ name: card, oracleText, typeLine, mechanics }, { activeResources });
  const atlas = buildAtlasVocabularyRegistry();
  const alternatives = seats.length
    ? freeze([...new Set(seats.flatMap((seat) => cardsImplementingSeat(seat).filter((name) => name !== card)))])
    : freeze([]);

  const conceptHints = [];
  if (/protection|teferi|greaves|flawless|skrelv/i.test(card)) {
    const plan = getStrategicConcept("plan-integrity");
    if (plan) conceptHints.push(plan.name);
  }
  if (/doubling season|walker|planeswalker/i.test(card) || /superfriend/i.test(fantasyLabel)) {
    const commit = getStrategicConcept("commitment-timing");
    if (commit) conceptHints.push(commit.name);
  }

  const resourceSeatLine = resourceSeating.length
    ? resourceSeating.map((row) => {
      const roles = row.implementation.roles.join(" + ");
      return `It is seated as a ${row.seat.label} (${roles}).`;
    }).join(" ")
    : "";

  const seatLine = seats.length
    ? `It fills ${seats.join(" · ")}.`
    : resourceSeatLine || "Atlas has no illustrative seat binding for this card yet — unknown is not absent.";

  const vacancy = seats.length
    ? `If ${seats[0]} vacates, ask whether ${alternatives.slice(0, 3).join(" / ") || "another holder"} can assume that seat.`
    : resourceSeating.length
      ? `This is ${resourceSeating.map((row) => `a ${row.resource[0].toUpperCase()}${row.resource.slice(1)} engine implementation`).join(" and ")}, not evidence of a generic go-wide tokens plan.`
    : "Seat language is still open for this card — do not invent a score.";

  const timing = /teferi'?s protection|flawless maneuver/i.test(card)
    ? "Insurance posture — not an early cast."
    : /lightning greaves|skrelv/i.test(card)
      ? "Usually early protection so the commander can stay online."
      : /doubling season/i.test(card)
        ? "Star piece when the commission names it — protect the window after it resolves."
        : "Timing depends on which seat it is actually filling in this list.";

  const fantasyNote = fantasyLabel
    ? (commissionMismatch
      ? ` Commission fantasy (${fantasyLabel}) is only partly kept — explain honesty before optimizing secondary engines.`
      : ` Read against the ${fantasyLabel} commission.`)
    : "";

  const paragraph = [
    `${card}${commanderName ? ` in a ${commanderName} list` : ""}.`,
    seatLine,
    timing,
    vacancy,
    fantasyNote,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  return freeze({
    ok: true,
    kind: "MentorExplanation",
    version: "mentor-shadow-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    card,
    seats: freeze([...seats]),
    resourceSeating,
    planContext: fantasyLabel
      ? `${fantasyLabel} commission context`
      : commanderName
        ? `Support ${commanderName}'s primary line`
        : "Finished-list explanation",
    timingPosture: timing,
    vacancyRisk: vacancy,
    openQuestion: seats.length || resourceSeating.length
      ? "Still contested whether these seat labels survive Academy controls beyond illustrative Atlas bindings."
      : "No Atlas seat yet — wait for observation rather than inventing one.",
    conceptHints: freeze(conceptHints),
    alternativeHolders: alternatives,
    paragraph,
    atlasVersion: atlas.version,
    mustNotSay: freeze([
      "Protection score",
      "This card has a score of",
      "Brain selected this because",
    ]),
  });
}

/**
 * Session Mentor shadow — small set of explanations for a finished list.
 */
export function buildMentorShadowReport({
  cardNames = [],
  commanderName = "",
  fantasyLabel = "",
  commissionMismatch = false,
  limit = 3,
} = {}) {
  const library = buildStrategicConceptLibrary();
  const atlas = buildAtlasVocabularyRegistry();
  const names = [...new Set((cardNames || []).filter(Boolean))].slice(0, Math.max(1, limit));
  const explanations = names.map((cardName) =>
    explainCardAsMentor({
      cardName,
      commanderName,
      fantasyLabel,
      commissionMismatch,
    }),
  );

  return freeze({
    kind: "MentorShadowReport",
    version: "mentor-shadow-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    status: "first_embodiment",
    note: "Mentor explains in Atlas language. It does not change card selection.",
    atlas: freeze({
      version: atlas.version,
      capabilityAdmittedCount: atlas.summary.capabilityAdmittedCount,
      coverageScoreExists: false,
    }),
    conceptsAvailable: freeze(library.concepts.map((c) => c.name)),
    explanations: freeze(explanations.filter((e) => e.ok)),
    deferred: freeze([
      "Mentor product voice in Honest Coach (separate wiring)",
      "Authoritative Atlas admissions beyond illustrative bindings",
      "Brain inheritance of Mentor explanations",
    ]),
  });
}
