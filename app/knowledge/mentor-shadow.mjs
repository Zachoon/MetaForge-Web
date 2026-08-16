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
  seatSelectionImplementation,
  seatGraveyardImplementation,
  seatSacrificeImplementation,
  seatTriggerImplementation,
  seatCounterImplementation,
  seatLifeImplementation,
  seatProtectionImplementation,
  seatLoopImplementation,
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
  const selectionSeating = seatSelectionImplementation({ name: card, oracleText, typeLine, mechanics });
  const graveyardSeating = seatGraveyardImplementation({ name: card, oracleText, typeLine, mechanics });
  const sacrificeSeating = seatSacrificeImplementation({ name: card, oracleText, typeLine, mechanics });
  const triggerSeating = seatTriggerImplementation({ name: card, oracleText, typeLine, mechanics });
  const counterSeating = seatCounterImplementation({ name: card, oracleText, typeLine, mechanics });
  const lifeSeating = seatLifeImplementation({ name: card, oracleText, typeLine, mechanics });
  const protectionSeating = seatProtectionImplementation({ name: card, oracleText, typeLine, mechanics });
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
  const selectionSeatLine = selectionSeating.length
    ? selectionSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const graveyardSeatLine = graveyardSeating.length
    ? graveyardSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const sacrificeSeatLine = sacrificeSeating.length
    ? sacrificeSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const triggerSeatLine = triggerSeating.length
    ? triggerSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const counterSeatLine = counterSeating.length
    ? counterSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const lifeSeatLine = lifeSeating.length
    ? lifeSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const protectionSeatLine = protectionSeating.length
    ? protectionSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";

  const seatLine = seats.length
    ? `It fills ${seats.join(" · ")}.`
    : [resourceSeatLine, selectionSeatLine, graveyardSeatLine, sacrificeSeatLine, triggerSeatLine, counterSeatLine, lifeSeatLine, protectionSeatLine].filter(Boolean).join(" ")
      || "Atlas has no illustrative seat binding for this card yet — unknown is not absent.";

  const vacancy = seats.length
    ? `If ${seats[0]} vacates, ask whether ${alternatives.slice(0, 3).join(" / ") || "another holder"} can assume that seat.`
    : resourceSeating.length
      ? `This is ${resourceSeating.map((row) => `a ${row.resource[0].toUpperCase()}${row.resource.slice(1)} engine implementation`).join(" and ")}, not evidence of a generic go-wide tokens plan.`
    : selectionSeating.length
      ? `This is ${selectionSeating.map((row) => row.seat.label).join(" and ")}${selectionSeating.some((row) => row.contrast) ? `, ${selectionSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : graveyardSeating.length
      ? `This is ${graveyardSeating.map((row) => row.seat.label).join(" and ")}${graveyardSeating.some((row) => row.contrast) ? `, ${graveyardSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : sacrificeSeating.length
      ? `This is ${sacrificeSeating.map((row) => row.seat.label).join(" and ")}${sacrificeSeating.some((row) => row.contrast) ? `, ${sacrificeSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : triggerSeating.length
      ? `This is ${triggerSeating.map((row) => row.seat.label).join(" and ")}${triggerSeating.some((row) => row.contrast) ? `, ${triggerSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : counterSeating.length
      ? `This is ${counterSeating.map((row) => row.seat.label).join(" and ")}${counterSeating.some((row) => row.contrast) ? `, ${counterSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : lifeSeating.length
      ? `This is ${lifeSeating.map((row) => row.seat.label).join(" and ")}${lifeSeating.some((row) => row.contrast) ? `, ${lifeSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : protectionSeating.length
      ? `This is ${protectionSeating.map((row) => row.seat.label).join(" and ")}${protectionSeating.some((row) => row.contrast) ? `, ${protectionSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
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
    selectionSeating,
    graveyardSeating,
    sacrificeSeating,
    triggerSeating,
    counterSeating,
    lifeSeating,
    protectionSeating,
    planContext: fantasyLabel
      ? `${fantasyLabel} commission context`
      : commanderName
        ? `Support ${commanderName}'s primary line`
        : "Finished-list explanation",
    timingPosture: timing,
    vacancyRisk: vacancy,
    openQuestion: seats.length || resourceSeating.length || selectionSeating.length || graveyardSeating.length || sacrificeSeating.length || triggerSeating.length || counterSeating.length || lifeSeating.length || protectionSeating.length
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
 * Pair commentary for a graph-labeled loop or reset shape.
 * Parallel only — never a construction input, never a combo claim.
 */
export function explainPairAsMentor({
  left = {},
  right = {},
  cards = [],
  loopKind,
  shape,
  leftOracle = "",
  rightOracle = "",
} = {}) {
  const seating = seatLoopImplementation({
    left: { name: left.name || cards[0], oracleText: left.oracleText || left.oracle_text || leftOracle },
    right: { name: right.name || cards[1], oracleText: right.oracleText || right.oracle_text || rightOracle },
    cards,
    loopKind,
    shape,
  });
  if (!seating.length) {
    return freeze({
      ok: false,
      writesToBrain: false,
      reason: "no_loop_seat",
      note: "Atlas has no loop seat for this pair yet — unknown is not absent.",
    });
  }
  const row = seating[0];
  const names = row.implementation.cards.join(" / ");
  const resetLine = row.resetSeat ? ` Reset shape: ${row.resetSeat.label}.` : "";
  const paragraph = `${names} is seated as a ${row.seat.label}, ${row.contrast}.${resetLine} Not a verified infinite.`;
  return freeze({
    ok: true,
    kind: "MentorPairExplanation",
    version: "mentor-shadow-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    cards: row.implementation.cards,
    loopSeating: seating,
    paragraph,
    openQuestion: "Still contested whether these loop labels survive Academy controls beyond illustrative Atlas bindings.",
    mustNotSay: freeze([
      "verified infinite",
      "this combo wins",
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
