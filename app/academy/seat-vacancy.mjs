// =============================================================================
// Academy — Seat Vacancy Analysis
// "Seat vacated. Can another holder assume that role?"
// =============================================================================
// Structural capability redundancy — NOT game-outcome simulation.
// No scores. writesToBrain: false.
// =============================================================================

import { CANDIDATE_SEATS, capabilitiesFromNode } from "./capability-vocabulary.mjs";
import { buildDeckStrategicTopology } from "../field-intelligence/strategic-topology.mjs";

const freeze = (value) => Object.freeze(value);

export const VACANCY_CLASSES = freeze([
  "independently_covered",
  "conditionally_covered",
  "single_point_of_failure",
  "no_verified_seat",
  "ambiguous",
]);

function holdersForCapability(topology, capabilityId) {
  const holders = [];
  for (const node of topology.nodes || []) {
    const caps = capabilitiesFromNode(node, topology);
    if (!caps.includes(capabilityId)) continue;
    holders.push(freeze({
      name: node.name,
      capabilityIds: freeze(caps),
      multifunction: Boolean(node.multifunction && node.planConnected),
      planConnected: Boolean(node.planConnected),
      commanderConnected: Boolean(node.commanderConnected),
      conditional: !node.planConnected && caps.length > 0,
    }));
  }
  return holders;
}

/**
 * Classify redundancy after conceptually removing one holder.
 */
export function classifyVacancy(holders = [], removedName = null) {
  if (!holders.length) return "no_verified_seat";
  const remaining = removedName
    ? holders.filter((h) => h.name !== removedName)
    : holders.slice(1);
  const independent = remaining.filter((h) => !h.conditional && h.planConnected);
  const conditional = remaining.filter((h) => h.conditional || !h.planConnected);

  if (holders.length === 1) return "single_point_of_failure";
  if (independent.length >= 1) return "independently_covered";
  if (conditional.length >= 1) return "conditionally_covered";
  if (remaining.length >= 1) return "ambiguous";
  return "single_point_of_failure";
}

/**
 * Observational seat map + vacancy analysis for one deck.
 */
export function analyzeSeatVacancies(record = {}, analysis = null) {
  const topology = analysis
    ? buildDeckStrategicTopology(analysis, record)
    : buildDeckStrategicTopology({
      commanders: (record.commanders || []).map((c) => (typeof c === "string" ? c : c.name)),
      annotatedRows: record.rows || [],
      packages: [],
      interactionGraph: {},
      evidenceQuality: { weight: record.performanceWeight || 0.4 },
    }, record);

  const seats = CANDIDATE_SEATS.map((seat) => {
    const holders = holdersForCapability(topology, seat.capabilityId);
    const primary = holders[0]?.name || null;
    const vacancyClass = classifyVacancy(holders, primary);
    const independentHolders = holders.filter((h) => !h.conditional && h.planConnected).length;
    return freeze({
      seatId: seat.id,
      label: seat.label,
      capabilityId: seat.capabilityId,
      holders: freeze(holders),
      holderCount: holders.length,
      independentHolders,
      multifunctionHolders: holders.filter((h) => h.multifunction).length,
      conditionalHolders: holders.filter((h) => h.conditional).length,
      vacancy: holders.length === 0,
      vacancyClass,
      ambiguity: holders.length > 0 && vacancyClass === "ambiguous",
    });
  });

  const profile = freeze({
    protection: freeze({
      commander: seats.find((s) => s.seatId === "seat:protect_commander")?.vacancyClass || "no_verified_seat",
      engine: seats.find((s) => s.seatId === "seat:protect_engine")?.vacancyClass || "no_verified_seat",
      close: seats.find((s) => s.seatId === "seat:protect_close")?.vacancyClass || "no_verified_seat",
    }),
    recovery: freeze({
      plan: seats.find((s) => s.seatId === "seat:recover_plan")?.vacancyClass || "no_verified_seat",
      resources: seats.find((s) => s.seatId === "seat:recover_resources")?.vacancyClass || "no_verified_seat",
    }),
    access: freeze({
      win: seats.find((s) => s.seatId === "seat:access_win")?.vacancyClass || "no_verified_seat",
    }),
    disruption: freeze({
      pathClear: seats.find((s) => s.seatId === "seat:clear_path")?.vacancyClass || "no_verified_seat",
      timing: seats.find((s) => s.seatId === "seat:preserve_timing")?.vacancyClass || "no_verified_seat",
    }),
    flexibility: freeze({
      multifunctionHolders: seats.reduce((n, s) => n + s.multifunctionHolders, 0),
    }),
  });

  // Explicit: never invent coverageScore
  return freeze({
    version: "seat-vacancy-v0.1",
    deckId: record.id || null,
    seats: freeze(seats),
    coverageProfile: profile,
    coverageScore: undefined,
    hasCoverageScore: false,
    singlePointOfFailureCount: seats.filter((s) => s.vacancyClass === "single_point_of_failure").length,
    independentlyCoveredCount: seats.filter((s) => s.vacancyClass === "independently_covered").length,
    writesToBrain: false,
  });
}

export function mentorLanguageCheck(seatAnalysis) {
  const lines = [];
  for (const seat of seatAnalysis.seats || []) {
    if (seat.vacancyClass === "single_point_of_failure") {
      lines.push(`This deck appears to have a single holder for ${seat.label}.`);
    } else if (seat.vacancyClass === "independently_covered") {
      lines.push(`${seat.label} appears independently covered (${seat.independentHolders} holders).`);
    } else if (seat.vacancyClass === "no_verified_seat") {
      lines.push(`No verified holders detected for ${seat.label} under current evidence.`);
    }
  }
  return freeze({
    explanations: freeze(lines.slice(0, 8)),
    recommendsCards: false,
    mutatesDeck: false,
    ranksAlternatives: false,
    productionCoaching: false,
    purpose: "language_validation_only",
    writesToBrain: false,
  });
}
