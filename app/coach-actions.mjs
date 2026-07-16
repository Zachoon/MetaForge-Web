import { parseDeck } from "./deck-analysis.mjs";

export function extractCoachDeck(content = "") {
  const blocks = [...content.matchAll(/```(?:txt|text|deck|arena)?\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  for (const block of blocks) {
    const cards = parseDeck(block);
    if (cards.reduce((sum, card) => sum + card.quantity, 0) >= 40) return block;
  }
  return null;
}
