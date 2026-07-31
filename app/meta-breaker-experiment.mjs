import { extractMechanicalSignals } from "./forge-interaction-graph.mjs";

const key = (value = "") => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

function candidateMechanics(card) {
  const typeLine = [card.type_line, ...(card.card_faces || []).map((face) => face.type_line)].filter(Boolean).join(" // ");
  const oracleText = [card.oracle_text, ...(card.card_faces || []).map((face) => face.oracle_text)].filter(Boolean).join(" ");
  return extractMechanicalSignals({ typeLine, oracleText });
}

// How many cards already in the deck this candidate would form a real
// mechanical connection with - a producer feeding one of the deck's payoffs,
// or a payoff for something the deck already produces. Reuses the exact
// signal vocabulary that already powers the post-build interaction graph
// (forge-interaction-graph.mjs), so a high score here is a card likely to
// render as connected - not isolated - once it's actually in the deck.
export function experimentAdditionSynergy(card, graph) {
  const mechanics = candidateMechanics(card);
  let connections = 0;
  for (const node of graph?.nodes || []) {
    const nodeMechanics = node.mechanics || { produces: [], rewards: [] };
    const forward = mechanics.produces.some((signal) => nodeMechanics.rewards.includes(signal));
    const reverse = mechanics.rewards.some((signal) => nodeMechanics.produces.includes(signal));
    if (forward || reverse) connections += 1;
  }
  // A candidate an existing trigger/resource doubler would reach (Panharmonicon,
  // Doubling Season, an extra combat phase, a damage-doubling replacement
  // effect) is a certain rules-verified connection the moment it enters the
  // deck, not an inferred one — credited the same as an ordinary
  // producer/payoff match above, not stacked on top of it, since it's the
  // same "this card plugs into something real already here" claim.
  for (const amplifier of graph?.amplifiers || []) {
    if (mechanics[amplifier.side]?.includes(amplifier.signal)) connections += 1;
  }
  return connections;
}

// Re-ranks legal candidate cards by how well they connect to the deck as it
// actually exists today, instead of raw Scryfall popularity order - a
// popular card that shares nothing mechanically with the list is a weaker
// one-card test than a less-popular card that plugs into an existing
// package. Array.sort is stable, so equally-synergistic cards (including
// zero-synergy ones) keep Scryfall's original relative order.
export function rankExperimentAdditions(candidates, graph) {
  return [...candidates].sort((left, right) => experimentAdditionSynergy(right, graph) - experimentAdditionSynergy(left, graph));
}

export function rankExperimentCuts(rows, graph, options = {}) {
  const connected = new Map();
  for (const edge of graph?.edges || []) {
    connected.set(edge.from, (connected.get(edge.from) || 0) + 1);
    connected.set(edge.to, (connected.get(edge.to) || 0) + 1);
  }
  const isolated = new Set(graph?.isolated || []);
  return rows
    .filter((row) => key(row.name) !== key(options.commanderName) && options.roleOf?.(row.name) !== "Mana source")
    .sort((left, right) => Number(isolated.has(right.name)) - Number(isolated.has(left.name)) || (connected.get(left.name) || 0) - (connected.get(right.name) || 0) || right.quantity - left.quantity || left.name.localeCompare(right.name));
}

export function applyControlledSwap(rows, cutName, addName) {
  const next = rows.map((row) => ({ ...row }));
  const cut = next.find((row) => key(row.name) === key(cutName));
  if (!cut || key(cutName) === key(addName)) return null;
  cut.quantity -= 1;
  const addition = next.find((row) => key(row.name) === key(addName));
  if (addition) addition.quantity += 1;
  else next.push({ quantity: 1, name: addName });
  return next.filter((row) => row.quantity > 0);
}
