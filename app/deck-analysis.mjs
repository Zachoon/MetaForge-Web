import CARD_MECHANICS from "./card-mechanics.mjs";

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

export function mechanicProfile(rows) {
  const counts = new Map();
  for (const row of rows) {
    const tags = CARD_MECHANICS[normalizeCardName(row.name).toLocaleLowerCase()] || [];
    for (const tag of tags) counts.set(tag, (counts.get(tag) || 0) + row.quantity);
  }
  return Object.fromEntries(counts);
}

export function createRecommendation(rows, format = "Standard") {
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const lands = rows.filter((row) => isLand(row.name));
  const nonlands = rows.filter((row) => !isLand(row.name));
  const landCount = lands.reduce((sum, row) => sum + row.quantity, 0);
  const basicNames = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];
  const basics = lands.filter((row) => basicNames.some((name) => name.toLocaleLowerCase() === row.name.toLocaleLowerCase()));
  const dominantBasic = [...basics].sort((left, right) => right.quantity - left.quantity)[0];
  const proposed = rows.map((row) => ({ ...row }));
  const changes = [];
  const mechanics = mechanicProfile(rows);

  if (total > 60 && nonlands.length) {
    let remaining = total - 60;
    for (const card of [...nonlands].sort((left, right) => left.quantity - right.quantity)) {
      if (!remaining) break;
      const cut = Math.min(card.quantity, remaining);
      adjustQuantity(proposed, card.name, -cut);
      changes.push({ card: card.name, quantity: -cut });
      remaining -= cut;
    }
    return recommendation(
      "Tighten the deck to its minimum size",
      `This ${format} list contains ${total} cards. Trimming ${total - 60} low-count slot(s) increases access to every card you chose to keep.`,
      "Deck size is a direct consistency lever. The proposed cuts are a starting hypothesis and remain editable before testing.",
      proposed,
      changes,
    );
  }

  if (landCount < 24 && dominantBasic && nonlands.length) {
    let needed = Math.min(24 - landCount, 3);
    const added = needed;
    for (const card of [...nonlands].sort((left, right) => left.quantity - right.quantity)) {
      if (!needed) break;
      const cut = Math.min(card.quantity, needed);
      adjustQuantity(proposed, card.name, -cut);
      changes.push({ card: card.name, quantity: -cut });
      needed -= cut;
    }
    adjustQuantity(proposed, dominantBasic.name, added - needed);
    changes.push({ card: dominantBasic.name, quantity: added - needed });
    return recommendation(
      "Test a steadier mana baseline",
      `Only ${landCount} lands were detected. Forge proposes exchanging ${added - needed} low-count nonland slot(s) for ${dominantBasic.name}.`,
      "This is a controlled consistency experiment, not a claim that the removed cards are weak. Compare opening hands before deciding.",
      proposed,
      changes,
    );
  }

  const fetchNames = new Set(["evolving wilds", "fabled passage", "terramorphic expanse", "escape tunnel"]);
  const fetches = lands.filter((row) => fetchNames.has(row.name.toLocaleLowerCase()));
  const fetchCount = fetches.reduce((sum, row) => sum + row.quantity, 0);
  if (fetchCount && mechanics.landfall_payoff) {
    return {
      title: "Preserve the landfall engine",
      summary: `Forge found ${mechanics.landfall_payoff} landfall payoff card(s) supported by ${fetchCount} fetch-style lands. It will not recommend replacing those fetches with basics from composition alone.`,
      reasoning: "A fetch land can create two separate land-entering events from one land play: the fetch itself, then the land it finds. That interaction can outweigh tapped-land tempo and makes the fetch package a synergy component, not merely mana fixing.",
      proposedDeck: formatDeck(rows),
      changes: [],
      mechanics,
    };
  }
  if (dominantBasic && basics.length === 1 && fetchCount >= 4) {
    const slowFetch = fetches.find((row) => ["evolving wilds", "terramorphic expanse"].includes(row.name.toLocaleLowerCase())) ?? fetches[0];
    const swap = Math.min(2, slowFetch.quantity);
    adjustQuantity(proposed, slowFetch.name, -swap);
    adjustQuantity(proposed, dominantBasic.name, swap);
    changes.push({ card: slowFetch.name, quantity: -swap }, { card: dominantBasic.name, quantity: swap });
    return recommendation(
      "Test fewer delayed land activations",
      `This mana base uses ${fetchCount} fetch-style lands but only one basic land type. Forge proposes replacing ${swap} ${slowFetch.name} with ${dominantBasic.name}.`,
      "The experiment trades a small amount of library thinning and search utility for more immediate mana. The Test Bench measures both versions before you keep anything.",
      proposed,
      changes,
    );
  }

  const flex = [...nonlands].sort((left, right) => left.quantity - right.quantity)[0];
  const core = [...nonlands].filter((row) => row.quantity < 4 && row.name !== flex?.name).sort((left, right) => right.quantity - left.quantity)[0];
  if (flex && core) {
    adjustQuantity(proposed, flex.name, -1);
    adjustQuantity(proposed, core.name, 1);
    changes.push({ card: flex.name, quantity: -1 }, { card: core.name, quantity: 1 });
    return recommendation(
      "Test a more concentrated core",
      `Forge proposes one controlled flex-slot change: one fewer ${flex.name} and one additional ${core.name}.`,
      "Concentrating repeated effects can improve draw-to-draw consistency. This hypothesis should be tested, not accepted on authority.",
      proposed,
      changes,
    );
  }

  return {
    title: "Choose a flex slot to challenge",
    summary: "The composition checks do not justify an automatic card substitution yet.",
    reasoning: "Forge will not invent a confident cut without card-role evidence. Start with an editable copy and define the change you want measured.",
    proposedDeck: formatDeck(rows),
    changes: [],
  };
}

export function formatDeck(rows) {
  return rows.filter((row) => row.quantity > 0).map((row) => `${row.quantity} ${row.name}`).join("\n");
}

function adjustQuantity(rows, name, delta) {
  const row = rows.find((candidate) => candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (row) row.quantity += delta;
  else if (delta > 0) rows.push({ name, quantity: delta });
}

function recommendation(title, summary, reasoning, proposed, changes) {
  return { title, summary, reasoning, proposedDeck: formatDeck(proposed), changes };
}
