export function evaluateDraftPick(pack, pool = [], context = {}) {
  const colors = new Map(); for (const card of pool) for (const color of card.colors || []) colors.set(color, (colors.get(color) || 0) + 1);
  return pack.map((card) => { const colorFit = (card.colors || []).reduce((sum, color) => sum + (colors.get(color) || 0), 0); const curveNeed = card.cmc >= 2 && card.cmc <= 4 ? 1 : 0; const score = (card.rating || 0) * 10 + colorFit * .35 + curveNeed - (card.colors?.length > 1 && pool.length < 8 ? 1.5 : 0); return { ...card, score, reasons: [`base ${card.rating || 0}`, `color fit ${colorFit}`, context.pick ? `pick ${context.pick}` : "pick unknown"] }; }).sort((a, b) => b.score - a.score);
}

export function limitedDeckHealth(pool) {
  const creatures = pool.filter((card) => card.type?.includes("Creature")).length; const lands = pool.filter((card) => card.type?.includes("Land")).length; const early = pool.filter((card) => card.cmc >= 1 && card.cmc <= 3).length;
  return { creatures, lands, early, warnings: [...(creatures < 14 ? ["Creature count is below the Limited baseline."] : []), ...(early < 8 ? ["Early plays may be too sparse."] : [])] };
}
