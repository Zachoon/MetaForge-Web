// =============================================================================
// Era 2 — Simulation Witness v0 (honest)
// =============================================================================
// Witness for situational lines — NOT a rules engine, NOT Monte Carlo, NOT Brain.
// Checks assumption consistency under the authored state. Can pressure a line
// without claiming to have played the game.
// writesToBrain: false · role: witness_not_judge
// =============================================================================

const freeze = (value) => Object.freeze(value);

export const WITNESS_STATUSES = freeze([
  "unavailable",
  "stub_v0",
  "heuristic_v0",
]);

export const WITNESS_VERDICTS = freeze([
  "supports",
  "pressures",
  "inconclusive",
]);

/**
 * Honest simulation witness for one situational evaluation.
 * Uses only fields already present on the simplified game state + chosen line.
 */
export function witnessSituationalLine({
  state = null,
  chosenLine = null,
  alternatives = [],
  teaches = null,
} = {}) {
  if (!state || !chosenLine) {
    return freeze({
      writesToBrain: false,
      ok: false,
      status: "unavailable",
      role: "witness_not_judge",
      verdict: "inconclusive",
      note: "Witness needs a game state and chosen line. Unknown is not absent.",
      band: "none",
    });
  }

  const stackTop = state.stackTop || null;
  const text = `${chosenLine.label || ""} ${chosenLine.summary || ""}`;
  const table = (state.players || []).filter((p) => p.seat !== "you");
  const unknownInteraction = table.some((p) => p.hasInteractionOpen == null);
  const openInteraction = table.some((p) => p.hasInteractionOpen === true);
  const you = (state.players || []).find((p) => p.seat === "you") || null;

  const checks = [];
  let support = 0;
  let pressure = 0;

  // Commitment / permission
  if (stackTop?.terminalThreat === true && /\bcounter the\b|respond/i.test(text)) {
    support += 1;
    checks.push(freeze({ id: "terminal-answer", result: "support", detail: "Chosen line answers terminal stack object." }));
  }
  if (stackTop?.terminalThreat === true && /\blet\b.*\bresolve\b|do not counter|don't counter/i.test(text)) {
    pressure += 1;
    checks.push(freeze({ id: "terminal-pass", result: "pressure", detail: "Letting terminal resolve is pressured under stated state." }));
  }
  if (stackTop && stackTop.terminalThreat === false && /no later window/i.test(text) && /\bcounter/i.test(text)) {
    support += 1;
    checks.push(freeze({ id: "forced-setup-spend", result: "support", detail: "Non-terminal spend claimed with no later window — consistent with forced commitment." }));
  }
  if (stackTop && stackTop.terminalThreat === false && /keep (the )?(counterspell|counter)/i.test(text) && !/no later window/i.test(text)) {
    support += 1;
    checks.push(freeze({ id: "preserve-vs-setup", result: "support", detail: "Preserving answer vs non-terminal setup is consistent with Commitment Timing." }));
  }

  // Information asymmetry
  if (/play around|respect the range/i.test(text) && (unknownInteraction || openInteraction)) {
    support += 1;
    checks.push(freeze({ id: "range-respect", result: "support", detail: "Play-around matches unknown/open interaction on the table." }));
  }
  if (/known empty|hand known empty/i.test(text)) {
    const emptySeat = table.find((p) => p.handSize === 0);
    if (emptySeat) {
      support += 1;
      checks.push(freeze({ id: "known-empty", result: "support", detail: `State shows ${emptySeat.seat} handSize=0 — conversion consistent.` }));
    } else {
      pressure += 1;
      checks.push(freeze({ id: "known-empty-missing", result: "pressure", detail: "Line claims known empty but no seat has handSize=0." }));
    }
  }
  if (/race ends now|convert into unknown/i.test(text) && you?.life != null && you.life <= 3) {
    support += 1;
    checks.push(freeze({ id: "race-math", result: "support", detail: "Low life supports forced conversion into unknown." }));
  }

  // Plan integrity
  if (/only defender|chump with the wincon — only/i.test(text) && you?.life != null && you.life <= 6) {
    support += 1;
    checks.push(freeze({ id: "lethal-chump", result: "support", detail: "Low life + only-defender claim is consistent." }));
  }
  if (/chump with the token|protect the wincon/i.test(text) && !/only defender/i.test(text)) {
    support += 1;
    checks.push(freeze({ id: "preserve-wincon", result: "support", detail: "Preserving wincon when not forced is consistent with Plan Integrity." }));
  }

  // Seat pressure
  if (/combo seat|highest threat|only clock/i.test(text)) {
    support += 1;
    checks.push(freeze({ id: "hierarchy-language", result: "support", detail: "Line language targets hierarchy / clock — Seat Pressure consistent." }));
  }
  if (/grudge|revenge|spiteful/i.test(text) && !/also the only clock|hierarchy and grievance coincide/i.test(text)) {
    pressure += 1;
    checks.push(freeze({ id: "grudge-pressure", result: "pressure", detail: "Grudge seating without clock coincidence is pressured." }));
  }

  if (!checks.length) {
    checks.push(freeze({
      id: "thin-model",
      result: "inconclusive",
      detail: "Simplified state lacks enough hooks for a stronger witness read.",
    }));
  }

  const verdict = support > pressure
    ? "supports"
    : pressure > support
      ? "pressures"
      : "inconclusive";

  const band = checks.some((c) => c.result !== "inconclusive") ? "low" : "none";

  return freeze({
    writesToBrain: false,
    ok: true,
    status: "heuristic_v0",
    role: "witness_not_judge",
    version: "simulation-witness-v0",
    verdict,
    band,
    support,
    pressure,
    checks: freeze(checks),
    alternativesConsidered: (alternatives || []).length,
    teachesConceptId: teaches?.conceptId || null,
    note: "Not an EDH rules engine. Not Monte Carlo. Deterministic assumption-consistency witness only.",
    mustNotClaim: freeze([
      "Simulated the full game",
      "Proved the line is correct",
      "Brain requires this line",
    ]),
  });
}

/**
 * Aggregate witness outcomes for a concept (from fixture evaluations).
 */
export function summarizeConceptSimulationEvidence(witnessRows = []) {
  const rows = (witnessRows || []).filter((row) => row?.ok);
  const supports = rows.filter((row) => row.verdict === "supports").length;
  const pressures = rows.filter((row) => row.verdict === "pressures").length;
  const inconclusive = rows.filter((row) => row.verdict === "inconclusive").length;
  let band = "none";
  if (supports + pressures >= 3) band = "medium";
  else if (supports + pressures >= 1) band = "low";
  return freeze({
    writesToBrain: false,
    band,
    supports,
    pressures,
    inconclusive,
    sampleSize: rows.length,
    note: band === "none"
      ? "No heuristic witness samples yet."
      : "Heuristic witness only — not a play engine. Disagreement is interesting.",
  });
}
