/** Lands needed by the offline preview before the hosted card catalog is connected. */
const KNOWN_NONBASIC_LANDS = new Set([
  "evolving wilds",
  "fabled passage",
  "terramorphic expanse",
  "escape tunnel",
  "prismatic vista",
  "windswept heath",
  "wooded foothills",
  "bloodstained mire",
  "flooded strand",
  "marsh flats",
  "misty rainforest",
  "polluted delta",
  "scalding tarn",
  "verdant catacombs",
  "arid mesa",
]);

export function normalizeCardName(value) {
  return value
    .trim()
    .replace(/\s+\([A-Z0-9]+\)\s+\S+(?:\s+\*F\*)?$/i, "")
    .trim();
}

export function parseDeck(value) {
  const cards = [];
  let mainDeck = true;

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^deck$/i.test(line)) {
      mainDeck = true;
      continue;
    }
    if (/^(sideboard|commander|companion)$/i.test(line)) {
      mainDeck = false;
      continue;
    }
    if (!mainDeck) continue;

    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const name = normalizeCardName(match[2]);
    if (name) cards.push({ quantity: Number(match[1]), name });
  }

  return cards;
}

export function isLand(name) {
  const normalized = normalizeCardName(name).toLocaleLowerCase();
  return (
    KNOWN_NONBASIC_LANDS.has(normalized) ||
    /(^|\s)(mountain|island|swamp|forest|plains|wastes)(\s|$)/i.test(normalized) ||
    /(land|sanctum|tower|garden|pool|coast|falls|pathway|courtyard|cavern|foundry|vents|tomb)$/i.test(normalized)
  );
}
