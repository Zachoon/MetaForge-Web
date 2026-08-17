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
  seatTypalImplementation,
  seatAristocratsImplementation,
  seatSpellslingerImplementation,
  seatReanimatorImplementation,
  seatLandfallImplementation,
  seatStaxImplementation,
  seatAurasOccupancyImplementation,
  seatEquipmentOccupancyImplementation,
  seatBlinkImplementation,
  seatTokensOccupancyImplementation,
  seatPackageHealthImplementation,
  seatSelectionImplementation,
  seatGraveyardImplementation,
  seatSacrificeImplementation,
  seatTriggerImplementation,
  seatCounterImplementation,
  seatLifeImplementation,
  seatProtectionImplementation,
  seatEvasionImplementation,
  seatLandImplementation,
  seatArtifactImplementation,
  seatTokenImplementation,
  seatAuraImplementation,
  seatSpellImplementation,
  seatDrawImplementation,
  seatDamageImplementation,
  seatEquipmentImplementation,
  seatCombatImplementation,
  seatLoopImplementation,
} from "./atlas-vocabulary.mjs";
import { buildPackageState } from "../package-plan-optimizer.mjs";
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
  tribalTypes = [],
  commanderOracleText = "",
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
  const typalSeating = seatTypalImplementation({ name: card, oracleText, typeLine, mechanics }, { tribalTypes, commanderOracleText });
  const aristocratsSeating = seatAristocratsImplementation({ name: card, oracleText, typeLine, mechanics });
  const spellslingerSeating = seatSpellslingerImplementation({ name: card, oracleText, typeLine, mechanics });
  const reanimatorSeating = seatReanimatorImplementation({ name: card, oracleText, typeLine, mechanics });
  const landfallOccupancySeating = seatLandfallImplementation({ name: card, oracleText, typeLine, mechanics });
  const staxSeating = seatStaxImplementation({ name: card, oracleText, typeLine, mechanics });
  const aurasOccupancySeating = seatAurasOccupancyImplementation({ name: card, oracleText, typeLine, mechanics });
  const equipmentOccupancySeating = seatEquipmentOccupancyImplementation({ name: card, oracleText, typeLine, mechanics });
  const blinkSeating = seatBlinkImplementation({ name: card, oracleText, typeLine, mechanics });
  const tokensOccupancySeating = seatTokensOccupancyImplementation({ name: card, oracleText, typeLine, mechanics });
  const selectionSeating = seatSelectionImplementation({ name: card, oracleText, typeLine, mechanics });
  const graveyardSeating = seatGraveyardImplementation({ name: card, oracleText, typeLine, mechanics });
  const sacrificeSeating = seatSacrificeImplementation({ name: card, oracleText, typeLine, mechanics });
  const triggerSeating = seatTriggerImplementation({ name: card, oracleText, typeLine, mechanics });
  const counterSeating = seatCounterImplementation({ name: card, oracleText, typeLine, mechanics });
  const lifeSeating = seatLifeImplementation({ name: card, oracleText, typeLine, mechanics });
  const protectionSeating = seatProtectionImplementation({ name: card, oracleText, typeLine, mechanics });
  const evasionSeating = seatEvasionImplementation({ name: card, oracleText, typeLine, mechanics });
  const landSeating = seatLandImplementation({ name: card, oracleText, typeLine, mechanics });
  const artifactSeating = seatArtifactImplementation({ name: card, oracleText, typeLine, mechanics });
  const tokenSeating = seatTokenImplementation({ name: card, oracleText, typeLine, mechanics });
  const auraSeating = seatAuraImplementation({ name: card, oracleText, typeLine, mechanics });
  const spellSeating = seatSpellImplementation({ name: card, oracleText, typeLine, mechanics });
  const drawSeating = seatDrawImplementation({ name: card, oracleText, typeLine, mechanics });
  const damageSeating = seatDamageImplementation({ name: card, oracleText, typeLine, mechanics });
  const equipmentSeating = seatEquipmentImplementation({ name: card, oracleText, typeLine, mechanics });
  const combatSeating = seatCombatImplementation({ name: card, oracleText, typeLine, mechanics });
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
  const typalSeatLine = typalSeating.length
    ? typalSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      const tribes = (row.tribes || []).join(" / ");
      const tribeNote = tribes ? ` (${tribes})` : "";
      return `It is seated as a ${row.seat.label}${tribeNote}${contrast}.`;
    }).join(" ")
    : "";
  const aristocratsSeatLine = aristocratsSeating.length
    ? aristocratsSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const spellslingerSeatLine = spellslingerSeating.length
    ? spellslingerSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const reanimatorSeatLine = reanimatorSeating.length
    ? reanimatorSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const landfallOccupancySeatLine = landfallOccupancySeating.length
    ? landfallOccupancySeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const staxSeatLine = staxSeating.length
    ? staxSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const aurasOccupancySeatLine = aurasOccupancySeating.length
    ? aurasOccupancySeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const equipmentOccupancySeatLine = equipmentOccupancySeating.length
    ? equipmentOccupancySeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const blinkSeatLine = blinkSeating.length
    ? blinkSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const tokensOccupancySeatLine = tokensOccupancySeating.length
    ? tokensOccupancySeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
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
  const evasionSeatLine = evasionSeating.length
    ? evasionSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const landSeatLine = landSeating.length
    ? landSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const artifactSeatLine = artifactSeating.length
    ? artifactSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const tokenSeatLine = tokenSeating.length
    ? tokenSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const auraSeatLine = auraSeating.length
    ? auraSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const spellSeatLine = spellSeating.length
    ? spellSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const drawSeatLine = drawSeating.length
    ? drawSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const damageSeatLine = damageSeating.length
    ? damageSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const equipmentSeatLine = equipmentSeating.length
    ? equipmentSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";
  const combatSeatLine = combatSeating.length
    ? combatSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "";

  const seatLine = seats.length
    ? `It fills ${seats.join(" · ")}.`
    : [resourceSeatLine, typalSeatLine, aristocratsSeatLine, spellslingerSeatLine, reanimatorSeatLine, landfallOccupancySeatLine, staxSeatLine, aurasOccupancySeatLine, equipmentOccupancySeatLine, blinkSeatLine, tokensOccupancySeatLine, selectionSeatLine, graveyardSeatLine, sacrificeSeatLine, triggerSeatLine, counterSeatLine, lifeSeatLine, protectionSeatLine, evasionSeatLine, landSeatLine, artifactSeatLine, tokenSeatLine, auraSeatLine, spellSeatLine, drawSeatLine, damageSeatLine, equipmentSeatLine, combatSeatLine].filter(Boolean).join(" ")
      || "Atlas has no illustrative seat binding for this card yet — unknown is not absent.";

  const vacancy = seats.length
    ? `If ${seats[0]} vacates, ask whether ${alternatives.slice(0, 3).join(" / ") || "another holder"} can assume that seat.`
    : resourceSeating.length
      ? `This is ${resourceSeating.map((row) => `a ${row.resource[0].toUpperCase()}${row.resource.slice(1)} engine implementation`).join(" and ")}, not evidence of a generic go-wide tokens plan.`
    : typalSeating.length
      ? `This is ${typalSeating.map((row) => row.seat.label).join(" and ")}${typalSeating.some((row) => row.contrast) ? `, ${typalSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : aristocratsSeating.length
      ? `This is ${aristocratsSeating.map((row) => row.seat.label).join(" and ")}${aristocratsSeating.some((row) => row.contrast) ? `, ${aristocratsSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : spellslingerSeating.length
      ? `This is ${spellslingerSeating.map((row) => row.seat.label).join(" and ")}${spellslingerSeating.some((row) => row.contrast) ? `, ${spellslingerSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : reanimatorSeating.length
      ? `This is ${reanimatorSeating.map((row) => row.seat.label).join(" and ")}${reanimatorSeating.some((row) => row.contrast) ? `, ${reanimatorSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : landfallOccupancySeating.length
      ? `This is ${landfallOccupancySeating.map((row) => row.seat.label).join(" and ")}${landfallOccupancySeating.some((row) => row.contrast) ? `, ${landfallOccupancySeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : staxSeating.length
      ? `This is ${staxSeating.map((row) => row.seat.label).join(" and ")}${staxSeating.some((row) => row.contrast) ? `, ${staxSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : aurasOccupancySeating.length
      ? `This is ${aurasOccupancySeating.map((row) => row.seat.label).join(" and ")}${aurasOccupancySeating.some((row) => row.contrast) ? `, ${aurasOccupancySeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : equipmentOccupancySeating.length
      ? `This is ${equipmentOccupancySeating.map((row) => row.seat.label).join(" and ")}${equipmentOccupancySeating.some((row) => row.contrast) ? `, ${equipmentOccupancySeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : blinkSeating.length
      ? `This is ${blinkSeating.map((row) => row.seat.label).join(" and ")}${blinkSeating.some((row) => row.contrast) ? `, ${blinkSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : tokensOccupancySeating.length
      ? `This is ${tokensOccupancySeating.map((row) => row.seat.label).join(" and ")}${tokensOccupancySeating.some((row) => row.contrast) ? `, ${tokensOccupancySeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
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
    : evasionSeating.length
      ? `This is ${evasionSeating.map((row) => row.seat.label).join(" and ")}${evasionSeating.some((row) => row.contrast) ? `, ${evasionSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : landSeating.length
      ? `This is ${landSeating.map((row) => row.seat.label).join(" and ")}${landSeating.some((row) => row.contrast) ? `, ${landSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : artifactSeating.length
      ? `This is ${artifactSeating.map((row) => row.seat.label).join(" and ")}${artifactSeating.some((row) => row.contrast) ? `, ${artifactSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : tokenSeating.length
      ? `This is ${tokenSeating.map((row) => row.seat.label).join(" and ")}${tokenSeating.some((row) => row.contrast) ? `, ${tokenSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : auraSeating.length
      ? `This is ${auraSeating.map((row) => row.seat.label).join(" and ")}${auraSeating.some((row) => row.contrast) ? `, ${auraSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : spellSeating.length
      ? `This is ${spellSeating.map((row) => row.seat.label).join(" and ")}${spellSeating.some((row) => row.contrast) ? `, ${spellSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : drawSeating.length
      ? `This is ${drawSeating.map((row) => row.seat.label).join(" and ")}${drawSeating.some((row) => row.contrast) ? `, ${drawSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : damageSeating.length
      ? `This is ${damageSeating.map((row) => row.seat.label).join(" and ")}${damageSeating.some((row) => row.contrast) ? `, ${damageSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : equipmentSeating.length
      ? `This is ${equipmentSeating.map((row) => row.seat.label).join(" and ")}${equipmentSeating.some((row) => row.contrast) ? `, ${equipmentSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
    : combatSeating.length
      ? `This is ${combatSeating.map((row) => row.seat.label).join(" and ")}${combatSeating.some((row) => row.contrast) ? `, ${combatSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
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
    typalSeating,
    aristocratsSeating,
    spellslingerSeating,
    reanimatorSeating,
    landfallOccupancySeating,
    staxSeating,
    aurasOccupancySeating,
    equipmentOccupancySeating,
    blinkSeating,
    tokensOccupancySeating,
    selectionSeating,
    graveyardSeating,
    sacrificeSeating,
    triggerSeating,
    counterSeating,
    lifeSeating,
    protectionSeating,
    evasionSeating,
    landSeating,
    artifactSeating,
    tokenSeating,
    auraSeating,
    spellSeating,
    drawSeating,
    damageSeating,
    equipmentSeating,
    combatSeating,
    planContext: fantasyLabel
      ? `${fantasyLabel} commission context`
      : commanderName
        ? `Support ${commanderName}'s primary line`
        : "Finished-list explanation",
    timingPosture: timing,
    vacancyRisk: vacancy,
    openQuestion: seats.length || resourceSeating.length || typalSeating.length || aristocratsSeating.length || spellslingerSeating.length || reanimatorSeating.length || landfallOccupancySeating.length || staxSeating.length || aurasOccupancySeating.length || equipmentOccupancySeating.length || blinkSeating.length || tokensOccupancySeating.length || selectionSeating.length || graveyardSeating.length || sacrificeSeating.length || triggerSeating.length || counterSeating.length || lifeSeating.length || protectionSeating.length || evasionSeating.length || landSeating.length || artifactSeating.length || tokenSeating.length || auraSeating.length || spellSeating.length || drawSeating.length || damageSeating.length || equipmentSeating.length || combatSeating.length
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



const OCCUPANCY_PACKAGE_IDS = freeze([
  "typal", "aristocrats", "spellslinger", "reanimator", "landfall",
  "stax", "auras", "equipment", "blink", "tokens",
]);

export function occupancyEngineLabelsForCommander(card = {}) {
  const labels = [];
  for (const id of OCCUPANCY_PACKAGE_IDS) {
    for (const row of occupancySeatingForPackage(id, card)) {
      if (row.seat?.label) labels.push(row.seat.label);
    }
  }
  return freeze(labels);
}

/**
 * Union occupancy labels across partner / background commanders.
 * Order follows OCCUPANCY_PACKAGE_IDS, then commander order. Deduped.
 */
export function occupancyEngineLabelsForCommanders(cards = []) {
  const seen = new Set();
  const labels = [];
  for (const card of cards || []) {
    for (const label of occupancyEngineLabelsForCommander(card)) {
      if (seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
  }
  return freeze(labels);
}

/**
 * Occupancy seating for one catalog package id. Typal member/mention are
 * not occupancy. A spellslinger commander does not occupy the tokens
 * package just because another engine opened first.
 */
export function occupancySeatingForPackage(packageId = "", card = {}) {
  const id = String(packageId || "");
  if (id === "typal") {
    return freeze(seatTypalImplementation(card).filter((row) => row.kind === "engine"));
  }
  if (id === "aristocrats") return seatAristocratsImplementation(card);
  if (id === "spellslinger") return seatSpellslingerImplementation(card);
  if (id === "reanimator") return seatReanimatorImplementation(card);
  if (id === "landfall") return seatLandfallImplementation(card);
  if (id === "stax") return seatStaxImplementation(card);
  if (id === "auras") return seatAurasOccupancyImplementation(card);
  if (id === "equipment") return seatEquipmentOccupancyImplementation(card);
  if (id === "blink") return seatBlinkImplementation(card);
  if (id === "tokens") return seatTokensOccupancyImplementation(card);
  return freeze([]);
}

/**
 * Package-level Mentor: occupancy engine first, then health kinds.
 * Health strain is commentary, not a reason to close occupancy.
 * Parallel only — never a construction input, never a cohesion score.
 */
export function explainPackageAsMentor({
  packageState = {},
  intent = {},
  commanderOracleText = "",
  commanderName = "",
} = {}) {
  const packageId = String(packageState.id || "");
  if (!packageId) {
    return freeze({
      ok: false,
      writesToBrain: false,
      reason: "missing_package",
      note: "Mentor needs a package to explain — not a scoreboard.",
    });
  }

  const card = { name: commanderName || packageId, oracleText: commanderOracleText };
  const spellslingerSeating = seatSpellslingerImplementation(card);
  const tokensOccupancySeating = seatTokensOccupancyImplementation(card);
  const occupancySeating = occupancySeatingForPackage(packageId, card);
  const packageHealthSeating = seatPackageHealthImplementation(packageState, intent);

  const occupancyLine = occupancySeating.length
    ? occupancySeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `It is seated as a ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "Atlas has no occupancy engine seat for this commander yet — unknown is not absent.";
  const healthLine = packageHealthSeating.length
    ? packageHealthSeating.map((row) => {
      const contrast = row.contrast ? `, ${row.contrast}` : "";
      return `Package health is seated as ${row.seat.label}${contrast}.`;
    }).join(" ")
    : "Package health has no named strain on the occupied engine.";

  const vacancy = occupancySeating.length
    ? `This is ${occupancySeating.map((row) => row.seat.label).join(" and ")} first; health strain is commentary, not a reason to close occupancy.`
    : packageHealthSeating.length
      ? `This is ${packageHealthSeating.map((row) => row.seat.label).join(" and ")}${packageHealthSeating.some((row) => row.contrast) ? `, ${packageHealthSeating.map((row) => row.contrast).filter(Boolean).join(" and ")}` : ""}.`
      : "Seat language is still open for this package — do not invent a score.";

  const paragraph = [
    `${packageState.label || packageId}${commanderName ? ` in a ${commanderName} list` : ""}.`,
    occupancyLine,
    healthLine,
    vacancy,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  return freeze({
    ok: true,
    kind: "MentorPackageExplanation",
    version: "mentor-shadow-v0",
    writesToBrain: false,
    activated: false,
    promoted: false,
    brainInheritance: "none",
    packageId,
    occupancySeating,
    packageHealthSeating,
    spellslingerSeating,
    tokensOccupancySeating,
    paragraph,
    commentary: occupancySeating.length && packageHealthSeating.length
      ? freeze([healthLine, vacancy].join(" "))
      : "",
    vacancyRisk: vacancy,
    mustNotSay: freeze([
      "Protection score",
      "cohesion score",
      "This card has a score of",
      "Brain selected this because",
      "this deck is bad because",
    ]),
  });
}


/**
 * Occupancy-opened packages only, then health from the 99.
 * Composition-opened packages stay unnamed here — unknown is not absent.
 */
export function explainOccupiedPackagesAsMentor({
  rows = [],
  intent = {},
  commanderName = "",
  commanderOracleText = "",
} = {}) {
  const card = { name: commanderName, oracleText: commanderOracleText };
  const explanations = [];
  for (const spec of intent.packages || []) {
    const occupancy = occupancySeatingForPackage(spec.id, card);
    if (!occupancy.length) continue;
    const packageState = buildPackageState(rows, spec, intent, {});
    explanations.push(explainPackageAsMentor({
      packageState,
      intent,
      commanderName,
      commanderOracleText,
    }));
  }
  return freeze(explanations);
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

/**
 * Pair seats that include this card. Reset shapes before generic engine
 * pairs. Never claims a verified infinite. Parallel only.
 */
export function explainPairsForCardAsMentor({
  cardName = "",
  enginePairs = [],
  resetPairs = [],
  oracleFor = () => "",
  limit = 2,
} = {}) {
  const want = String(cardName || "").normalize("NFKC").trim().toLocaleLowerCase("en");
  if (!want) return freeze([]);
  const involved = (pair = {}) => (pair.cards || []).some((name) => String(name || "").normalize("NFKC").trim().toLocaleLowerCase("en") === want);
  const rows = [];
  for (const pair of [...resetPairs, ...enginePairs]) {
    if (!involved(pair)) continue;
    const cards = pair.cards || [];
    const explanation = explainPairAsMentor({
      cards,
      loopKind: pair.loopKind,
      shape: pair.shape,
      leftOracle: oracleFor(cards[0]) || "",
      rightOracle: oracleFor(cards[1]) || "",
    });
    if (!explanation.ok) continue;
    rows.push(explanation);
    if (rows.length >= limit) break;
  }
  return freeze(rows);
}

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
