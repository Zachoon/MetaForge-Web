const PROFILES = Object.freeze({
  Aggro: { pressure: 9, turns: 5, answers: { removal: 3, sweeper: 5, stabilizer: 4, counter: 1, draw: .5, finisher: .5 } },
  Midrange: { pressure: 7, turns: 7, answers: { removal: 2, sweeper: 2, stabilizer: 3, counter: 1.5, draw: 2, finisher: 2 } },
  Control: { pressure: 5, turns: 9, answers: { removal: .5, sweeper: .5, stabilizer: .5, counter: 3, draw: 3, finisher: 3 } },
  Tempo: { pressure: 7.5, turns: 6, answers: { removal: 2, sweeper: 1, stabilizer: 2, counter: 2.5, draw: 2, finisher: 1 } },
});

const MODELED_ROLES = new Set(["removal", "counter", "draw", "sweeper", "stabilizer", "finisher"]);

export function simulateMatchupScenarios(deck, opponent = "Midrange", trials = 2000, seed = 991, pilot = "expert") {
  const profile = PROFILES[opponent];
  if (!profile) return { opponent, trials: 0, gate: "unsupported-opponent", scenarioPassRate: 0, modelCoverage: 0, unsupportedCards: [] };
  const rng = mulberry32(seed);
  const cards = deck.flatMap((card) => Array(card.quantity).fill(card));
  const unsupportedCards = [...new Set(deck.filter((card) => !isLand(card) && !MODELED_ROLES.has(card.role)).map((card) => card.card))];
  const modeled = cards.filter((card) => isLand(card) || MODELED_ROLES.has(card.role)).length;
  let passes = 0, totalMargin = 0, stabilized = 0;

  for (let trial = 0; trial < trials; trial++) {
    const library = [...cards]; shuffle(library, rng);
    const seen = library.slice(0, Math.min(library.length, 7 + profile.turns));
    const lands = seen.filter(isLand).length;
    const manaFactor = lands >= Math.min(3, profile.turns) ? 1 : .62;
    const responses = seen.filter((card) => !isLand(card) && MODELED_ROLES.has(card.role));
    const responseScore = responses.reduce((score, card) => {
      const timing = (card.cmc || 0) <= profile.turns ? 1 : .35;
      const judgment = pilot === "expert" ? 1 : .78 + rng() * .18;
      return score + (profile.answers[card.role] || 0) * timing * judgment;
    }, 0) * manaFactor;
    const pressure = profile.pressure * (.82 + rng() * .36);
    const margin = responseScore - pressure;
    totalMargin += margin;
    if (responseScore >= pressure * .72) stabilized++;
    if (margin >= 0) passes++;
  }

  const modelCoverage = cards.length ? modeled / cards.length : 0;
  const scenarioPassRate = passes / trials;
  return { opponent, trials, pilot, scenarioPassRate, stabilizationRate: stabilized / trials, averageMargin: totalMargin / trials, modelCoverage, unsupportedCards, gate: modelCoverage < .8 ? "unsupported" : scenarioPassRate >= .58 ? "scenario-pass" : "scenario-hold", warning: "Scenario trials stress role density and sequencing against an archetype pressure model. They are not rules-complete games or a predicted match win rate." };
}

export function evaluateMatchupMatrix(deck, opponents = Object.keys(PROFILES), trials = 2000, seed = 991) {
  const rows = opponents.map((opponent, index) => {
    const expert = simulateMatchupScenarios(deck, opponent, trials, seed + index * 101, "expert");
    const baseline = simulateMatchupScenarios(deck, opponent, trials, seed + index * 101, "baseline");
    return { ...expert, pilotSensitivity: Math.max(0, expert.scenarioPassRate - baseline.scenarioPassRate) };
  });
  return { rows, gate: rows.every((row) => row.gate !== "unsupported") && rows.filter((row) => row.gate === "scenario-pass").length >= Math.ceil(rows.length / 2) ? "matrix-pass" : "matrix-hold", weakest: [...rows].sort((a, b) => a.scenarioPassRate - b.scenarioPassRate)[0], warning: rows[0]?.warning };
}

export const MATCHUP_PROFILES = PROFILES;
function isLand(card) { return card.role?.includes("land") || card.cmc === undefined; }
function shuffle(cards, rng) { for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } }
function mulberry32(seed) { return () => { let value = seed += 0x6D2B79F5; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
