export function evaluateDraftPick(pack, pool = [], context = {}) {
  const colors = new Map(); for (const card of pool) for (const color of card.colors || []) colors.set(color, (colors.get(color) || 0) + 1);
  return pack.map((card) => { const colorFit = (card.colors || []).reduce((sum, color) => sum + (colors.get(color) || 0), 0); const curveNeed = card.cmc >= 2 && card.cmc <= 4 ? 1 : 0; const score = (card.rating || 0) * 10 + colorFit * .35 + curveNeed - (card.colors?.length > 1 && pool.length < 8 ? 1.5 : 0); return { ...card, score, reasons: [`base ${card.rating || 0}`, `color fit ${colorFit}`, context.pick ? `pick ${context.pick}` : "pick unknown"] }; }).sort((a, b) => b.score - a.score);
}

export function evaluateDraftPairs(pack, pool = [], context = {}) {
  const singles = evaluateDraftPick(pack, pool, context);
  const pairs = [];
  for (let left = 0; left < singles.length; left += 1) for (let right = left + 1; right < singles.length; right += 1) {
    const first = singles[left], second = singles[right];
    const firstColors = new Set(first.colors || []), secondColors = new Set(second.colors || []);
    const sharedColors = [...firstColors].filter((color) => secondColors.has(color)).length;
    const colorSpread = new Set([...(first.colors || []), ...(second.colors || [])]).size;
    const curveComplement = first.cmc && second.cmc && first.cmc !== second.cmc && Math.abs(first.cmc - second.cmc) <= 2 ? 1.25 : 0;
    const sameLane = sharedColors ? 1.5 : 0;
    const earlyRainbowPenalty = pool.length < 10 && colorSpread > 2 ? 2 : 0;
    const score = first.score + second.score + sameLane + curveComplement - earlyRainbowPenalty;
    pairs.push({ cards: [first, second], score, reasons: [sharedColors ? "cards reinforce the same color lane" : "pair stays flexible", curveComplement ? "mana values complement each other" : "watch the curve", earlyRainbowPenalty ? "early color-spread penalty" : "no color-spread penalty"] });
  }
  return pairs.sort((a, b) => b.score - a.score);
}

export function limitedDeckHealth(pool) {
  const creatures = pool.filter((card) => card.type?.includes("Creature")).length; const lands = pool.filter((card) => card.type?.includes("Land")).length; const early = pool.filter((card) => card.cmc >= 1 && card.cmc <= 3).length;
  return { creatures, lands, early, warnings: [...(creatures < 14 ? ["Creature count is below the Limited baseline."] : []), ...(early < 8 ? ["Early plays may be too sparse."] : [])] };
}
