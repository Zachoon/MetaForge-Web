const LOADERS = {
  standard: () => import("./legalities/standard.mjs"), pioneer: () => import("./legalities/pioneer.mjs"), modern: () => import("./legalities/modern.mjs"),
  legacy: () => import("./legalities/legacy.mjs"), pauper: () => import("./legalities/pauper.mjs"), vintage: () => import("./legalities/vintage.mjs"),
  commander: () => import("./legalities/commander.mjs"), historic: () => import("./legalities/historic.mjs"), timeless: () => import("./legalities/timeless.mjs"), alchemy: () => import("./legalities/alchemy.mjs"),
};

// Arena can receive newly released cards before the generated bulk snapshot is
// refreshed. Keep small, sourced release supplements here so "not in snapshot"
// never becomes a false claim about a known card.
const LEGALITY_SUPPLEMENTS = {
  standard: new Map([["studious first-year", [0, 0]]]),
};

export async function validateDeckLegality(rows, format = "Standard") {
  const key = format.toLocaleLowerCase();
  const loader = LOADERS[key];
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const issues = [];
  if (!loader) return { legal: false, format, total, checkedAt: "2026-07-14", issues: [{ type: "unsupported-format", message: `${format} legality is not available yet.` }] };
  const catalog = (await loader()).default;
  const supplement = LEGALITY_SUPPLEMENTS[key];
  if (key === "commander" ? total !== 100 : total < 60) issues.push({ type: "deck-size", message: key === "commander" ? "Commander requires exactly 100 cards in this preview validator." : `${format} requires at least 60 main-deck cards.` });
  for (const row of rows) {
    const normalizedName = row.name.trim().toLocaleLowerCase();
    const card = catalog[normalizedName] ?? supplement?.get(normalizedName);
    if (!card) { issues.push({ type: "illegal-card", card: row.name, message: `${row.name} is not legal in ${format}.` }); continue; }
    const limit = card[1] ? 1 : card[0] ? Infinity : 4;
    if (row.quantity > limit) issues.push({ type: "copy-limit", card: row.name, message: `${row.name} exceeds the ${limit}-copy limit in ${format}.` });
  }
  return { legal: issues.length === 0, format, total, checkedAt: "2026-07-14", issues };
}
