// Shared deck structural/motif scanning.
//
// Extracted so the main Forge flow (auto-revealing a Masterwork's motif when
// it's finished) and /profile (manual "inspect structure" + reading a cached
// value) run the exact same Scryfall-batching and classification logic
// instead of two copies drifting apart.

import { classifyNativeCard } from "./native-masterwork-engine.mjs";
import { motifForRoles } from "./masterwork-visual-profile.mjs";

export const parseDeckRows = (text) =>
  text.split(/\r?\n/).flatMap((line) => {
    const match = line
      .trim()
      .match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    return match ? [{ quantity: Number(match[1]), name: match[2].trim() }] : [];
  });

export async function resolveDeckStructuralCards({ deckText, commanderName }) {
  const rows = parseDeckRows(deckText);
  const commanderKey = (commanderName || "").trim().toLowerCase();
  const names = [...new Set(rows.map((row) => row.name))];
  const cardsByName = new Map();
  for (let index = 0; index < names.length; index += 75) {
    const chunk = names.slice(index, index + 75);
    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    });
    const data = await response.json();
    for (const card of data.data || []) {
      cardsByName.set(card.name.trim().toLowerCase(), card);
    }
  }
  return rows.map((row) => {
    const card = cardsByName.get(row.name.trim().toLowerCase());
    return {
      name: row.name,
      typeLine:
        card?.type_line ||
        (row.name.trim().toLowerCase() === commanderKey ? "" : "Card"),
      oracleText:
        card?.oracle_text ||
        (card?.card_faces || []).map((face) => face.oracle_text || "").join("\n"),
      quantity: row.quantity,
      isCommander: row.name.trim().toLowerCase() === commanderKey,
    };
  });
}

// Pure and synchronous — every non-commander card's quantity counts toward
// the normalization total, whether or not it resolves to a motif, so a deck
// heavy on lands/unclassified cards correctly reads as "less certain" rather
// than having its weights inflated by ignoring them.
export function motifWeightsFromStructuralCards(structuralCards) {
  const motifWeights = {};
  let totalQuantity = 0;
  for (const card of structuralCards) {
    if (card.isCommander) continue;
    const roles = classifyNativeCard(card);
    const motif = motifForRoles(roles);
    totalQuantity += card.quantity;
    if (motif) motifWeights[motif] = (motifWeights[motif] || 0) + card.quantity;
  }
  for (const motif of Object.keys(motifWeights)) {
    motifWeights[motif] = totalQuantity ? motifWeights[motif] / totalQuantity : 0;
  }
  return motifWeights;
}
