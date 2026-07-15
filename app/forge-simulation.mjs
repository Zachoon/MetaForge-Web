import { isLand } from "./deck-analysis.mjs";

const FETCH_LANDS = new Set([
  "evolving wilds", "fabled passage", "terramorphic expanse", "escape tunnel",
  "prismatic vista", "windswept heath", "wooded foothills", "bloodstained mire",
  "flooded strand", "marsh flats", "misty rainforest", "polluted delta",
  "scalding tarn", "verdant catacombs", "arid mesa",
]);
const BASIC_LANDS = new Set(["plains", "island", "swamp", "mountain", "forest", "wastes"]);

export function applyLibraryOperation(library, operation, rng = Math.random) {
  const count = Math.max(0, Math.min(operation.count ?? 1, library.length));
  let indices = [];
  if (operation.selection === "top") {
    indices = Array.from({ length: count }, (_, offset) => library.length - 1 - offset);
  } else if (operation.selection === "random") {
    const candidates = library.map((_, index) => index);
    while (indices.length < count && candidates.length) {
      indices.push(candidates.splice(Math.floor(rng() * candidates.length), 1)[0]);
    }
  } else {
    const eligible = new Set((operation.eligibleNames ?? []).map((name) => name.toLocaleLowerCase()));
    const specific = operation.specificName?.toLocaleLowerCase();
    indices = library
      .map((name, index) => ({ name: name.toLocaleLowerCase(), index }))
      .filter(({ name }) => operation.selection === "specific" ? name === specific : eligible.has(name))
      .slice(0, count)
      .map(({ index }) => index);
  }
  const selected = indices.map((index) => library[index]);
  for (const index of [...indices].sort((a, b) => b - a)) library.splice(index, 1);
  if (operation.shuffleAfter) shuffle(library, rng);
  return selected;
}

export function simulateDeck(rows, samples = 2500, seed = 9173) {
  const expanded = rows.flatMap((row) => Array(row.quantity).fill(row.name));
  const rng = mulberry32(seed);
  let keepable = 0;
  let totalOpeningLands = 0;
  let nextSpellHits = 0;
  let fetchActivations = 0;

  for (let sample = 0; sample < samples; sample += 1) {
    const library = [...expanded];
    shuffle(library, rng);
    const opening = library.splice(-7);
    const openingLands = opening.filter(isLand).length;
    totalOpeningLands += openingLands;
    if (openingLands >= 2 && openingLands <= 4) keepable += 1;

    if (opening.some((name) => FETCH_LANDS.has(name.toLocaleLowerCase()))) {
      const fetched = applyLibraryOperation(library, {
        selection: "search", count: 1, eligibleNames: [...BASIC_LANDS], shuffleAfter: true,
      }, rng);
      fetchActivations += Number(fetched.length > 0);
    }
    const next = library[library.length - 1];
    if (next && !isLand(next)) nextSpellHits += 1;
  }

  return {
    samples,
    keepableRate: keepable / samples,
    averageOpeningLands: totalOpeningLands / samples,
    nextSpellRate: nextSpellHits / samples,
    fetchActivationRate: fetchActivations / samples,
  };
}

export function evaluateOpeningHandComparison(original, proposed) {
  const deltas = {
    keepableRate: proposed.keepableRate - original.keepableRate,
    averageOpeningLands: proposed.averageOpeningLands - original.averageOpeningLands,
    nextSpellRate: proposed.nextSpellRate - original.nextSpellRate,
    fetchActivationRate: proposed.fetchActivationRate - original.fetchActivationRate,
  };
  const regressions = [];
  if (deltas.keepableRate < -.015) regressions.push(`keepable opening hands fell by ${Math.abs(deltas.keepableRate * 100).toFixed(1)} points`);
  if (deltas.nextSpellRate < -.02) regressions.push(`next-spell access fell by ${Math.abs(deltas.nextSpellRate * 100).toFixed(1)} points`);
  if (original.fetchActivationRate > .1 && deltas.fetchActivationRate < -.04) regressions.push(`fetch activation fell by ${Math.abs(deltas.fetchActivationRate * 100).toFixed(1)} points`);
  const improvements = [];
  if (deltas.keepableRate > .01) improvements.push(`keepable opening hands improved by ${(deltas.keepableRate * 100).toFixed(1)} points`);
  if (deltas.nextSpellRate > .015) improvements.push(`next-spell access improved by ${(deltas.nextSpellRate * 100).toFixed(1)} points`);
  const verdict = regressions.length ? "reject" : improvements.length ? "advance" : "inconclusive";
  return {
    verdict, deltas, regressions, improvements,
    headline: verdict === "reject" ? "This version failed the opening-hand gate." : verdict === "advance" ? "This version earned an Arena trial." : "The opening-hand result is effectively tied.",
    guidance: verdict === "reject" ? "Do not start this Forge experiment. Edit the proposal or try another candidate, then rerun the same paired simulation." : verdict === "advance" ? "The proposal improved at least one primary consistency measure without a material modeled regression. It may advance to real-game testing." : "The simulation found no meaningful consistency advantage. Only test this version if its strategic role change is worth measuring in real games.",
  };
}

function shuffle(cards, rng) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
