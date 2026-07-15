import { classifyRevealedOpponent } from "./opponent-classifier.mjs";

const PLANS = {
  Aggro: { add: ["sideboard-stabilizer", "sideboard-sweeper", "sideboard-removal"], cut: ["counter", "finisher"], purpose: "survive the opening turns and trade at a mana advantage" },
  Control: { add: ["sideboard-counter", "sideboard-finisher"], cut: ["sweeper", "removal"], purpose: "reduce dead interaction and protect a durable threat" },
  Ramp: { add: ["sideboard-counter", "sideboard-finisher"], cut: ["sweeper", "removal"], purpose: "interact with expensive payoffs before they resolve" },
  Midrange: { add: ["sideboard-finisher", "sideboard-removal"], cut: ["counter", "draw"], purpose: "match its threat quality without surrendering card economy" },
};

export function evaluateLastMatchSignal(match, candidate) {
  if (!match) return { status: "waiting", narrative: "Complete an Arena match with this test version and Forge will update its coaching signal here." };
  const opponent = classifyRevealedOpponent(match.revealedOpponentCards);
  if (opponent.strategy === "Unknown") return {
    status: "low-information",
    result: match.result,
    narrative: `Latest match recorded as a ${match.result}, but too few opposing cards were revealed to make a strategy claim. Forge will keep watching without inventing a matchup.`,
  };
  const plan = PLANS[opponent.strategy];
  const candidateOption = plan && candidate
    ? plan.add.map((role) => candidate.sideboard.find((card) => card.role === role)).find(Boolean)
    : undefined;
  return {
    status: "watch",
    result: match.result,
    strategy: opponent.strategy,
    confidence: opponent.confidence,
    candidateOption,
    purpose: plan?.purpose,
    narrative: match.result === "loss"
      ? `Latest result: loss against a ${opponent.strategy} signal (${opponent.confidence} classification). ${candidateOption ? `${candidateOption.card} is the first validated sideboard option Forge will monitor` : "Forge has identified the strategic pressure but not a validated card swap"}. One match updates the watchlist, not the deck.`
      : `Latest result: win against a ${opponent.strategy} signal (${opponent.confidence} classification). Forge will watch whether the cards that supported this plan continue to perform before recommending more of them.`,
  };
}

export function evaluateMatchupEvidence(matches = [], candidate) {
  const groups = new Map();
  for (const match of matches) {
    const opponent = classifyRevealedOpponent(match.revealedOpponentCards);
    if (opponent.strategy === "Unknown") continue;
    const group = groups.get(opponent.strategy) || { strategy: opponent.strategy, matches: 0, wins: 0, losses: 0, revealedCards: 0 };
    group.matches += 1;
    group.wins += Number(match.result === "win");
    group.losses += Number(match.result !== "win");
    group.revealedCards += opponent.revealedCount;
    groups.set(opponent.strategy, group);
  }
  const matchups = [...groups.values()].map((group) => ({
    ...group,
    winRate: group.wins / group.matches,
    confidence: group.matches >= 8 ? "meaningful" : group.matches >= 4 ? "developing" : "early",
  })).sort((a, b) => a.winRate - b.winRate || b.matches - a.matches);
  const weakness = matchups.find((group) => group.matches >= 3 && group.losses >= 2 && group.winRate <= 0.4);
  if (!weakness || !candidate) return {
    status: matchups.length ? "observe" : "unclassified",
    matchups,
    narrative: matchups.length
      ? "Matchup evidence is updating, but no repeated weakness has crossed the controlled-change gate."
      : "Arena has not revealed enough opposing cards to identify a matchup pattern yet.",
  };

  const plan = PLANS[weakness.strategy];
  if (!plan) return { status: "observe", matchups, narrative: `The ${weakness.strategy} signal needs more evidence before Forge can map a safe repair.` };
  const addition = plan.add.map((role) => candidate.sideboard.find((card) => card.role === role)).find(Boolean);
  const removal = plan.cut.map((role) => candidate.deck.find((card) => card.role === role && card.quantity >= Math.min(2, addition?.quantity || 0))).find(Boolean);
  if (!addition || !removal) return { status: "observe", matchups, narrative: `Forge detected a ${weakness.strategy} weakness, but this build has no validated one-for-one repair package.` };

  const quantity = Math.min(2, addition.quantity, removal.quantity);
  const proposed = candidate.deck.map((card) => ({ ...card }));
  proposed.find((card) => card.card === removal.card).quantity -= quantity;
  const existing = proposed.find((card) => card.card === addition.card);
  if (existing) existing.quantity += quantity;
  else proposed.push({ quantity, card: addition.card, role: addition.role });
  const proposedDeck = proposed.filter((card) => card.quantity > 0).map((card) => `${card.quantity} ${card.card}`).join("\n");
  return {
    status: "repair-ready",
    matchups,
    weakness,
    purpose: plan.purpose,
    changes: [{ quantity: -quantity, card: removal.card }, { quantity, card: addition.card }],
    proposedDeck,
    narrative: `${weakness.losses} of ${weakness.matches} classified matches against ${weakness.strategy} were losses. Test a narrow ${quantity}-card repair; do not treat it as a permanent verdict yet.`,
  };
}
