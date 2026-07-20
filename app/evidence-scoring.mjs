const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));

export function wilsonLowerBound(successes, trials, z = 1.64) {
  if (!trials) return 0;
  const p = clamp(successes / trials);
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));
  return clamp((center - spread) / denominator);
}

export function scoreEdhrecSignal({ decks = 0, eligibleDecks = 0, synergy = 0, category = "" }) {
  const sample = Math.max(0, Number(decks) || 0);
  const eligible = Math.max(sample, Number(eligibleDecks) || 0);
  const inclusion = eligible ? sample / eligible : 0;
  const reliability = sample / (sample + 30);
  const shrunkSynergy = (Number(synergy) || 0) * reliability;
  const adoptionFloor = wilsonLowerBound(sample, eligible);
  const normalizedLift = clamp((shrunkSynergy + 0.15) / 0.55);
  const categoryPrior = category === "High Synergy Cards" ? 0.08 : category === "Game Changers" ? 0.05 : 0;
  const newCardPotential = category === "New Cards" && (synergy >= 0.12 || inclusion >= 0.08);
  const discoveryPrior = newCardPotential ? 0.08 : 0;
  const evidenceScore = clamp(0.52 * normalizedLift + 0.34 * adoptionFloor + categoryPrior + discoveryPrior);
  const confidence = sample >= 250 && eligible >= 500 ? "high" : sample >= 75 ? "moderate" : sample >= 20 ? "developing" : sample >= 5 ? "early" : "sparse";
  const evidenceClass = confidence === "high" || confidence === "moderate"
    ? "commander-relative observed signal"
    : newCardPotential
      ? "new-card discovery hypothesis"
      : "low-sample discovery signal";
  return { inclusion, reliability, shrunkSynergy, adoptionFloor, evidenceScore, confidence, newCardPotential, evidenceClass };
}

export function rankEdhrecSignals(cards = []) {
  return cards
    .map((card) => ({ ...card, ...scoreEdhrecSignal(card) }))
    .sort((left, right) => right.evidenceScore - left.evidenceScore || right.decks - left.decks || left.name.localeCompare(right.name));
}
