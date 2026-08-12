// =============================================================================
// Era 2 — Simplified EDH game-state schema (v0.1)
// =============================================================================
// Represent enough table context to critique ONE play decision.
// Unknown zones stay unknown. Incomplete ≠ absent.
// Not a rules engine. Not combat math. writesToBrain: false
// =============================================================================

const freeze = (value) => Object.freeze(value);

export const ZONE_KNOWLEDGE = freeze(["known", "partial", "unknown"]);
export const PLAYER_SEATS = freeze(["you", "left", "across", "right"]);
export const STACK_KINDS = freeze(["spell", "ability", "trigger"]);

/**
 * One object on the stack (authored / captured — not a full rules model).
 */
export function createStackObject(input = {}) {
  return freeze({
    id: input.id || "stack-object",
    controller: input.controller || "left",
    spell: input.spell || input.name || "Unknown object",
    kind: STACK_KINDS.includes(input.kind) ? input.kind : "spell",
    terminalThreat: input.terminalThreat === true,
    /** Dangerous now without ending the game — tutors, engines, setup. */
    enablesFutureTerminal: input.enablesFutureTerminal === true,
    threatClass: input.threatClass || (input.terminalThreat ? "terminal" : null),
    targetsYou: input.targetsYou === true,
    manaValue: Number.isFinite(input.manaValue) ? input.manaValue : null,
    notes: input.notes || null,
  });
}

/**
 * Build a frozen simplified EDH situational state.
 * Missing fields are recorded as incomplete — never invented as empty-board truth.
 */
export function createGameState(input = {}) {
  const players = (input.players || []).map((player, index) => freeze({
    seat: player.seat || PLAYER_SEATS[index] || `seat-${index}`,
    name: player.name || player.seat || `Player ${index + 1}`,
    life: Number.isFinite(player.life) ? player.life : null,
    commander: player.commander
      ? freeze({
        name: player.commander.name || player.commander,
        onBattlefield: player.commander.onBattlefield ?? null,
        damage: Number.isFinite(player.commander.damage) ? player.commander.damage : null,
      })
      : null,
    handSize: Number.isFinite(player.handSize) ? player.handSize : null,
    boardSummary: freeze(player.boardSummary || []),
    openMana: Number.isFinite(player.openMana) ? player.openMana : null,
    hasInteractionOpen: player.hasInteractionOpen ?? null,
  }));

  const stackProvided = Object.prototype.hasOwnProperty.call(input, "stack");
  const stack = freeze(
    (Array.isArray(input.stack) ? input.stack : []).map((item, index) =>
      createStackObject({ id: item.id || `stack-${index + 1}`, ...item })),
  );
  // MTG: last pushed is top of stack
  const stackTop = stack.length ? stack[stack.length - 1] : null;

  const incomplete = [];
  if (!players.length) incomplete.push("players");
  for (const player of players) {
    if (player.life == null) incomplete.push(`${player.seat}.life`);
    if (player.handSize == null) incomplete.push(`${player.seat}.handSize`);
    if (player.hasInteractionOpen == null) incomplete.push(`${player.seat}.interaction`);
  }
  if (!stackProvided) incomplete.push("stack");
  if (input.knownHands == null) incomplete.push("opponent_hands");

  return freeze({
    writesToBrain: false,
    version: "edh-game-state-v0.1",
    kind: "GameState",
    turn: Number.isFinite(input.turn) ? input.turn : null,
    activeSeat: input.activeSeat || "you",
    phase: input.phase || "main",
    prioritySeat: input.prioritySeat || input.activeSeat || "you",
    players: freeze(players),
    stack,
    stackTop,
    politicsNote: input.politicsNote || null,
    yourHand: freeze(input.yourHand || []),
    knownVsUnknown: freeze({
      yourHand: "known",
      opponentHands: input.knownHands === true ? "partial" : "unknown",
      libraries: "unknown",
      faceDown: "unknown",
      stack: stackProvided ? "known" : "unknown",
    }),
    modelCompleteness: freeze({
      band: incomplete.length === 0 ? "adequate_for_v0" : incomplete.length <= 3 ? "partial" : "thin",
      incomplete: freeze(incomplete),
      note: "Unknown is not absent — incomplete zones must not be treated as empty.",
    }),
  });
}

export function createCandidateLine(input = {}) {
  return freeze({
    id: input.id || "line",
    label: input.label || "Line",
    legal: input.legal !== false,
    summary: input.summary || input.label || "",
    assumptions: freeze(input.assumptions || []),
    risks: freeze(input.risks || []),
    preserves: freeze(input.preserves || []),
    spends: freeze(input.spends || []),
  });
}
