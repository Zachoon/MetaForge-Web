// Server-side interpretation layer for a card inside one specific deck.
// Scores summarize the structural model; they are not universal ratings.

const VERSION = "metaforge-contextual-card-evaluation-v1";
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const list = (value) => Array.isArray(value) ? value : [];
const key = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en");

function sameName(left, right) {
  return key(left) === key(right);
}

function causalityProfiles(causality) {
  const profiles = new Map();
  for (const system of list(causality?.systems)) {
    for (const card of list(system.cards)) {
      const current = profiles.get(key(card.name));
      if (!current || Number(card.collapseRisk || 0) > Number(current.collapseRisk || 0)) {
        profiles.set(key(card.name), card);
      }
    }
  }
  return profiles;
}

function classification({ card, systems, profile, edges }) {
  if (card.isCommander) return "commander anchor";
  if (/\bland\b/i.test(card.typeLine || "")) return "mana infrastructure";
  if (profile?.primaryRole) return profile.primaryRole;
  if (systems.length) return "system contributor";
  if (edges.length) return "connected support";
  return "isolated slot";
}

function redundancyScore(system) {
  const redundancy = system?.redundancy;
  if (Number.isFinite(Number(redundancy))) return Number(redundancy);
  return clamp(
    list(redundancy?.repeatedCards).length * 7 +
    Number(redundancy?.producerVariety || 0) * 10 +
    Number(redundancy?.payoffVariety || 0) * 10 +
    Number(redundancy?.producerDepth || 0) * 4 +
    Number(redundancy?.payoffDepth || 0) * 4 +
    (redundancy?.balanced ? 12 : 0),
  );
}

export function buildContextualCardEvaluations(cards, graph, systemsReport, causality) {
  const normalizedCards = list(cards).filter((card) => card?.name);
  const edges = list(graph?.edges);
  const systems = list(systemsReport?.systems);
  const profiles = causalityProfiles(causality);
  const graphCoverage = Math.max(0, Math.min(1, Number(graph?.coverage || 0)));

  const evaluations = normalizedCards.map((card) => {
    const cardEdges = edges.filter((edge) => sameName(edge.from, card.name) || sameName(edge.to, card.name));
    const cardSystems = systems.filter((system) => list(system.members).some((name) => sameName(name, card.name)));
    const profile = profiles.get(key(card.name)) || null;
    const partners = [...new Set(cardEdges.map((edge) => sameName(edge.from, card.name) ? edge.to : edge.from))];
    const strongestEdge = Math.max(0, ...cardEdges.map((edge) => Number(edge.strength || 0)));
    const systemNames = cardSystems.map((system) => String(system.name || system.signal || "Detected system"));
    const redundancy = cardSystems.length
      ? cardSystems.reduce((sum, system) => sum + redundancyScore(system), 0) / cardSystems.length
      : 0;
    const commanderLinked = list(graph?.commanderLinks).some((edge) => sameName(edge.from, card.name) || sameName(edge.to, card.name));
    const replacementDifficulty = Number(profile?.replacementDifficulty || 0);
    const structuralImpact = clamp(
      Number(profile?.collapseRisk || 0) * .48 +
      Number(profile?.amplifierScore || 0) * .32 +
      Math.min(3, cardSystems.length) * 7 +
      (commanderLinked ? 8 : 0),
    );
    const synergy = clamp(strongestEdge * .58 + Math.min(5, cardEdges.length) * 7 + Math.min(3, cardSystems.length) * 9);
    const planFit = clamp(synergy * .38 + structuralImpact * .34 + (commanderLinked ? 18 : 0) + (cardSystems.length ? 10 : 0));
    const reliability = clamp(graphCoverage * 42 + Math.min(4, cardEdges.length) * 9 + Math.min(2, cardSystems.length) * 10 + redundancy * .12);
    const replaceability = clamp(100 - replacementDifficulty - (card.isCommander ? 45 : 0));
    const role = classification({ card, systems: cardSystems, profile, edges: cardEdges });

    const whyHere = systemNames.length
      ? `${card.name} serves as ${role} in ${systemNames.slice(0, 2).join(" and ")}${partners.length ? `, connecting with ${partners.slice(0, 2).join(" and ")}` : ""}.`
      : partners.length
        ? `${card.name} has verified mechanical connections with ${partners.slice(0, 2).join(" and ")}, but no repeatable multi-card system is established yet.`
        : `${card.name} currently has no verified mechanical connection in this list; treat the slot as a testing question, not automatically as a cut.`;

    const cutImpact = profile?.hypothesis?.[0]
      || (replacementDifficulty >= 65
        ? `Removing ${card.name} risks a difficult-to-replace structural role.`
        : partners.length
          ? `Removing ${card.name} would directly remove ${partners.length} modeled connection${partners.length === 1 ? "" : "s"}.`
          : `The current structural model does not predict a system collapse from removing ${card.name}.`);

    return {
      name: card.name,
      quantity: Math.max(1, Number(card.quantity || 1)),
      role,
      systems: systemNames,
      partners,
      alternatives: list(profile?.alternatives).slice(0, 5),
      scores: { synergy, planFit, reliability, structuralImpact, replaceability },
      whyHere,
      cutImpact,
      evidence: cardEdges.length || cardSystems.length
        ? "oracle-derived deck context"
        : "insufficient connected evidence",
    };
  });

  return Object.freeze({
    engine: VERSION,
    cards: evaluations.map((evaluation) => Object.freeze(evaluation)),
    methodology: "Scores compare each card only with this deck's verified Oracle-text graph, detected systems, and bounded structural hypotheses. They are not universal card ratings, price judgments, or predicted win rates.",
  });
}
