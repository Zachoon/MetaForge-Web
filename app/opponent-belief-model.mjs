const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const normalize = (name) => String(name || "").trim().toLocaleLowerCase();

function cardCount(deck, card) {
  const target = normalize(card);
  return (deck.cards || []).reduce((total, entry) => total + (normalize(entry.name) === target ? Number(entry.quantity || 0) : 0), 0);
}

function observedLikelihood(deck, observation) {
  if (observation.kind === "revealed-card") return cardCount(deck, observation.card) ? 0.96 : 0.015;
  const tags = new Set(deck.tags || []);
  if (observation.kind === "passed-priority-with-open-mana") return tags.has("instant-speed") ? 0.72 : 0.28;
  if (observation.kind === "declined-trade") return tags.has("combat-trick") ? 0.64 : 0.42;
  if (observation.kind === "tapped-out") return tags.has("instant-speed") ? 0.36 : 0.58;
  return 0.5;
}

export function estimateOpponentRange({ candidates = [], observations = [] } = {}) {
  if (!candidates.length) return { archetypes: [], hiddenCards: [], confidence: "unsupported", evidenceCount: observations.length };
  const scored = candidates.map((deck) => {
    const prior = Math.max(0.0001, Number(deck.metaShare || deck.prior || 1));
    const likelihood = observations.reduce((score, observation) => score * observedLikelihood(deck, observation), 1);
    return { deck, weight: prior * likelihood };
  });
  const total = scored.reduce((sum, item) => sum + item.weight, 0) || 1;
  const archetypes = scored.map(({ deck, weight }) => ({ name: deck.name, probability: weight / total })).sort((a, b) => b.probability - a.probability);
  const revealed = new Set(observations.filter((x) => x.kind === "revealed-card").map((x) => normalize(x.card)));
  const cardMap = new Map();
  for (const { deck, weight } of scored) {
    const deckProbability = weight / total;
    for (const entry of deck.cards || []) {
      if (revealed.has(normalize(entry.name))) continue;
      const copies = clamp(Number(entry.quantity || 0) / Math.max(1, Number(deck.deckSize || 60)) * 7, 0, 0.82);
      cardMap.set(entry.name, (cardMap.get(entry.name) || 0) + deckProbability * copies);
    }
  }
  const hiddenCards = [...cardMap].map(([card, probability]) => ({ card, probability: clamp(probability) })).sort((a, b) => b.probability - a.probability).slice(0, 8);
  const top = archetypes[0]?.probability || 0;
  const confidence = observations.length < 2 ? "low" : top >= 0.8 ? "strong" : top >= 0.55 ? "developing" : "range-wide";
  return { archetypes, hiddenCards, confidence, evidenceCount: observations.length };
}

export function adviseAgainstRange(range, line = {}) {
  if (!range?.hiddenCards?.length) return { posture: "insufficient-evidence", explanation: "Forge does not have enough observed information to estimate the opposing range." };
  const danger = new Set((line.losesTo || []).map(normalize));
  const exposure = range.hiddenCards.reduce((sum, item) => sum + (danger.has(normalize(item.card)) ? item.probability : 0), 0);
  if (exposure >= 0.55) return { posture: "play-around", exposure: clamp(exposure), explanation: "This line is exposed to a large share of the estimated range. Preserve a resource or choose the lower-risk sequence." };
  if (exposure >= 0.22) return { posture: "close-decision", exposure: clamp(exposure), explanation: "The punishment is plausible but not dominant. Compare the cost of waiting with the value of making them have it." };
  return { posture: "make-them-have-it", exposure: clamp(exposure), explanation: "Only a small share of the estimated range punishes this line. Advancing the plan is currently justified." };
}
