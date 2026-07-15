export const EVIDENCE_KINDS = Object.freeze({ RESULT: "tournament-result", EXPERT: "expert-prior", CARD: "card-fact", HYPOTHESIS: "forge-hypothesis" });

export function evidenceWeight(item, now = new Date()) {
  const base = { "card-fact": 1, "tournament-result": .9, "expert-prior": .55, "forge-hypothesis": .25 }[item.kind] || 0;
  const ageDays = Math.max(0, (now - new Date(item.observedAt)) / 86400000);
  const freshness = item.format === "Limited" ? Math.exp(-ageDays / 120) : Math.exp(-ageDays / 365);
  return Math.max(0, Math.min(1, base * freshness * (item.provenance?.verified ? 1 : .6)));
}

export function buildNewCardPrior(card, evidence = []) {
  const relevant = evidence.filter((item) => item.tags?.some((tag) => card.tags?.includes(tag))).map((item) => ({ ...item, weight: evidenceWeight(item) })).sort((a, b) => b.weight - a.weight);
  return { card: card.name, status: "untested-prior", confidence: relevant.length >= 3 ? "developing" : "speculative", principles: relevant.slice(0, 5), warning: "Expert principles can generate a test hypothesis; they cannot substitute for legal, matchup, and observed-play evidence." };
}
