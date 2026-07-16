const STRATEGIES = new Set(["Unknown", "Aggro", "Midrange", "Control", "Tempo", "Ramp", "Combo"]);

export function createMobileMatchReport(input, options = {}) {
  if (!input?.deckFingerprint || !/^[0-9a-f]{24}$/.test(input.deckFingerprint)) throw new Error("An exact active deck revision is required");
  if (!['win', 'loss'].includes(input.result)) throw new Error("Choose win or loss");
  const strategy = STRATEGIES.has(input.opponentStrategy) ? input.opponentStrategy : "Unknown";
  const gamesWon = Math.max(0, Math.min(9, Number(input.gamesWon) || (input.result === "win" ? 1 : 0)));
  const gamesLost = Math.max(0, Math.min(9, Number(input.gamesLost) || (input.result === "loss" ? 1 : 0)));
  return {
    id: options.id || crypto.randomUUID(),
    game: "mtg",
    completedAt: options.now || new Date().toISOString(),
    gamesWon,
    gamesLost,
    result: input.result,
    mulligans: Math.max(0, Math.min(9, Number(input.mulligans) || 0)),
    playDraw: input.playDraw === "play" || input.playDraw === "draw" ? [input.playDraw] : [],
    deckFingerprint: input.deckFingerprint,
    experimentVariant: "proposed",
    experimentId: input.experimentId,
    opponentStrategy: strategy,
    revealedOpponentCards: [],
    source: "self-reported-mobile",
    evidenceConfidence: "self-reported",
  };
}
