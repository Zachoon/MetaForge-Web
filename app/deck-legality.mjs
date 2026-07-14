import CARD_LEGALITY, { FORMATS } from "./format-legality.mjs";

const FORMAT_KEYS = { standard: "standard", pioneer: "pioneer", modern: "modern", legacy: "legacy", pauper: "pauper", vintage: "vintage", commander: "commander", historic: "historic", timeless: "timeless", alchemy: "alchemy" };

export function validateDeckLegality(rows, format = "Standard") {
  const key = FORMAT_KEYS[format.toLocaleLowerCase()];
  const formatBit = key ? 1 << FORMATS.indexOf(key) : 0;
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const issues = [];
  if (!key) issues.push({ type: "unsupported-format", message: `${format} legality is not available yet.` });
  if (key === "commander" ? total !== 100 : total < 60) issues.push({ type: "deck-size", message: key === "commander" ? "Commander requires exactly 100 cards in this preview validator." : `${format} requires at least 60 main-deck cards.` });
  for (const row of rows) {
    const card = CARD_LEGALITY[row.name.trim().toLocaleLowerCase()];
    if (!card) {
      issues.push({ type: "unknown-card", card: row.name, message: `${row.name} was not found in the current card catalog.` });
      continue;
    }
    const legal = Boolean(card[2] & formatBit);
    const restricted = Boolean(card[3] & formatBit);
    if (!legal) issues.push({ type: "illegal-card", card: row.name, message: `${row.name} is not legal in ${format}.` });
    const limit = restricted ? 1 : card[1] ? Infinity : 4;
    if (row.quantity > limit) issues.push({ type: "copy-limit", card: row.name, message: `${row.name} exceeds the ${limit}-copy limit in ${format}.` });
  }
  return { legal: issues.length === 0, format, total, checkedAt: "2026-07-14", issues };
}
