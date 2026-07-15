import CARD_MECHANICS from "./card-mechanics.mjs";
import LAND_TYPES from "./land-types.mjs";

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
  return LAND_TYPES.has(normalized) || KNOWN_NONBASIC_LANDS.has(normalized);
}

export function mechanicProfile(rows) {
  const counts = new Map();
  for (const row of rows) {
    const tags = CARD_MECHANICS[normalizeCardName(row.name).toLocaleLowerCase()] || [];
    for (const tag of tags) counts.set(tag, (counts.get(tag) || 0) + row.quantity);
  }
  return Object.fromEntries(counts);
}

export function evaluateLandEngine(rows) {
  const profile = mechanicProfile(rows);
  const lands = rows.filter((row) => isLand(row.name));
  const basics = lands.filter((row) => /^(plains|island|swamp|mountain|forest|wastes)$/i.test(row.name));
  const fetchNames = new Set(["evolving wilds", "fabled passage", "terramorphic expanse", "escape tunnel"]);
  const slowFetchNames = new Set(["evolving wilds", "terramorphic expanse", "escape tunnel"]);
  const fetches = lands.filter((row) => fetchNames.has(row.name.toLocaleLowerCase()));
  const slowFetches = fetches.filter((row) => slowFetchNames.has(row.name.toLocaleLowerCase()));
  const landCount = lands.reduce((sum, row) => sum + row.quantity, 0);
  const basicCount = basics.reduce((sum, row) => sum + row.quantity, 0);
  const fetchCount = fetches.reduce((sum, row) => sum + row.quantity, 0);
  const slowFetchCount = slowFetches.reduce((sum, row) => sum + row.quantity, 0);
  const payoffCount = profile.landfall_payoff || 0;
  const supportScore = payoffCount * 2 + (profile.land_recursion || 0) * 2 + (profile.land_count_payoff || 0) + (profile.earthbend || 0);
  const excessLands = Math.max(0, landCount - 26);
  const targetExhaustion = Math.max(0, fetchCount - basicCount);
  const tempoPressure = slowFetchCount + excessLands * 2 + targetExhaustion;
  const posture = excessLands >= 2 ? "excess-land-risk" : payoffCount >= 4 && supportScore > tempoPressure ? "preserve" : payoffCount > 0 && slowFetchCount >= 4 ? "trim-test" : payoffCount > 0 ? "balanced" : "no-landfall-engine";
  return { ...profile, landCount, basicCount, fetchCount, slowFetchCount, payoffCount, supportScore, tempoPressure, excessLands, targetExhaustion, posture };
}

function createBaseRecommendation(rows, format = "Standard") {
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const lands = rows.filter((row) => isLand(row.name));
  const nonlands = rows.filter((row) => !isLand(row.name));
  const landCount = lands.reduce((sum, row) => sum + row.quantity, 0);
  const basicNames = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];
  const basics = lands.filter((row) => basicNames.some((name) => name.toLocaleLowerCase() === row.name.toLocaleLowerCase()));
  const dominantBasic = [...basics].sort((left, right) => right.quantity - left.quantity)[0];
  const proposed = rows.map((row) => ({ ...row }));
  const changes = [];
  const mechanics = evaluateLandEngine(rows);

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
  if (fetchCount && mechanics.posture === "excess-land-risk") {
    return {
      title: "Landfall value does not erase flood risk",
      summary: `Forge found ${landCount} lands and ${mechanics.payoffCount} Landfall payoff card(s). The trigger engine matters, but this list is carrying ${mechanics.excessLands} land(s) above the conservative 26-land ceiling used by this early model.`,
      reasoning: "Do not replace fetches blindly: first identify which land slots create the least trigger, color, recursion, and curve value. Arena evidence should confirm flooding before a cut is committed.",
      proposedDeck: formatDeck(rows),
      changes: [],
      mechanics,
    };
  }
  if (fetchCount && mechanics.posture === "trim-test" && dominantBasic) {
    const slowFetch = fetches.find((row) => ["evolving wilds", "terramorphic expanse", "escape tunnel"].includes(row.name.toLocaleLowerCase())) ?? fetches[0];
    const swap = Math.min(2, slowFetch.quantity);
    adjustQuantity(proposed, slowFetch.name, -swap);
    adjustQuantity(proposed, dominantBasic.name, swap);
    changes.push({ card: slowFetch.name, quantity: -swap }, { card: dominantBasic.name, quantity: swap });
    return recommendation(
      "Test a smaller Landfall tempo tax",
      `Landfall is present, but ${mechanics.slowFetchCount} always-tapped fetch land(s) currently support only ${mechanics.payoffCount} payoff card(s). Test trimming ${swap}, not deleting the engine.`,
      "This preserves most double-trigger access while measuring whether more untapped early mana improves real games. Keep the original if trigger loss matters more than sequencing speed.",
      proposed,
      changes,
      mechanics,
    );
  }
  if (fetchCount && mechanics.landfall_payoff) {
    const flex = [...nonlands].sort((left, right) => left.quantity - right.quantity)[0];
    const core = [...nonlands]
      .filter((row) => row.quantity < 4 && row.name !== flex?.name)
      .sort((left, right) => right.quantity - left.quantity)[0];
    if (flex && core) {
      adjustQuantity(proposed, flex.name, -1);
      adjustQuantity(proposed, core.name, 1);
      changes.push({ card: flex.name, quantity: -1 }, { card: core.name, quantity: 1 });
    }
    return {
      title: "Preserve the landfall engine",
      summary: `Forge found ${mechanics.landfall_payoff} landfall payoff card(s) supported by ${fetchCount} fetch-style lands. It will preserve those fetches${changes.length ? ` while testing one fewer ${flex.name} and one additional ${core.name}` : " rather than replacing them from composition alone"}.`,
      reasoning: changes.length
        ? `A fetch land can create two land-entering events, so the test protects that engine. ${flex.name} is the lowest-count flex slot and ${core.name} is a three-copy core slot; the proposed swap tests draw consistency without weakening Landfall. This is a hypothesis to compare, not a declaration that ${flex.name} is a bad card.`
        : "A fetch land can create two separate land-entering events from one land play: the fetch itself, then the land it finds. That interaction can outweigh tapped-land tempo and makes the fetch package a synergy component, not merely mana fixing.",
      proposedDeck: formatDeck(proposed),
      changes,
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

export function createRecommendation(rows, format = "Standard") {
  return enrichRecommendation(createBaseRecommendation(rows, format), rows);
}

function enrichRecommendation(result, rows) {
  const nonlands = rows.filter((row) => !isLand(row.name));
  const removals = result.changes.filter((change) => change.quantity < 0);
  const additions = result.changes.filter((change) => change.quantity > 0);
  const manualChallenges = [...nonlands]
    .sort((left, right) => left.quantity - right.quantity || left.name.localeCompare(right.name))
    .slice(0, 3)
    .map((row) => {
      const reinforce = [...nonlands].filter((candidate) => candidate.name !== row.name && candidate.quantity < 4).sort((left, right) => right.quantity - left.quantity)[0];
      if (!reinforce) return { card: row.name, quantity: row.quantity, reason: "Challenge this slot manually only if you can name the missing role; Forge has no safe one-for-one reinforcement." };
      const alternative = rows.map((candidate) => ({ ...candidate }));
      adjustQuantity(alternative, row.name, -1);
      adjustQuantity(alternative, reinforce.name, 1);
      return { card: row.name, quantity: row.quantity, add: reinforce.name, proposedDeck: formatDeck(alternative), reason: `Test one fewer ${row.name} and one additional ${reinforce.name} to measure concentration without changing deck size.` };
    });
  const manaChange = additions.some((change) => /^(plains|island|swamp|mountain|forest|wastes)$/i.test(change.card));
  const expectedGain = manaChange
    ? "More keepable opening hands and fewer games constrained by early mana access."
    : result.mechanics?.landfall_payoff
      ? "Preserve landfall trigger density while testing whether the surrounding flex slots can become more consistent."
      : additions.length
        ? `Draw the reinforced ${additions.map((change) => change.card).join(" / ")} role more consistently.`
        : "Establish which flexible slot can change without weakening the deck’s core plan.";
  const risk = manaChange
    ? "A higher land count can increase late-game flood; the opening-hand gain must outweigh that cost."
    : removals.length
      ? `The deck may miss the unique role supplied by ${removals.map((change) => change.card).join(" / ")}.`
      : "No automatic substitution passed the current evidence gate; a manual test may expose an interaction the composition model cannot see.";
  return {
    ...result,
    expectedGain,
    risk,
    manualChallenges,
    testPlan: {
      openingHands: 2500,
      earlyMatches: 5,
      reviewMatches: 12,
      instruction: "Compare the exact original and proposed fingerprints. Review after 5 matched games; treat 12 as the first developing decision point, not proof.",
    },
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

function recommendation(title, summary, reasoning, proposed, changes, mechanics) {
  return { title, summary, reasoning, proposedDeck: formatDeck(proposed), changes, ...(mechanics ? { mechanics } : {}) };
}
