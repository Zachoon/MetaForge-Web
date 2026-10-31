// Card facts for Learn. Roles come from the engine. Quotes are slices of
// stored oracle text, never a paraphrase presented as printed text.

import { classifyNativeCard } from "../card-role-classification.mjs";
import { slugify } from "./policy.mjs";

export function asCard(raw = {}) {
  const released = raw.released_at || raw.releasedAt || null;
  return {
    id: raw.id || raw.oracle_id || null,
    name: String(raw.name || "").trim(),
    manaCost: raw.mana_cost || raw.manaCost || "",
    cmc: Number.isFinite(raw.cmc) ? raw.cmc : null,
    typeLine: raw.type_line || raw.typeLine || "",
    oracleText: raw.oracle_text || raw.oracleText || "",
    colorIdentity: raw.color_identity || raw.colorIdentity || [],
    keywords: raw.keywords || [],
    set: raw.set || null,
    setName: raw.set_name || raw.setName || null,
    releasedAt: typeof released === "string" && /^\d{4}-\d{2}-\d{2}$/.test(released) ? released : null,
    rarity: raw.rarity || null,
    reprint: raw.reprint === true,
    commanderLegal: raw.commanderLegal || raw.legalities?.commander || null,
  };
}

export function cardSlug(card) {
  return slugify(card.name);
}

export function classifyCard(card) {
  const normalized = asCard(card);
  const roles = classifyNativeCard({
    name: normalized.name,
    typeLine: normalized.typeLine,
    type_line: normalized.typeLine,
    oracleText: normalized.oracleText,
    oracle_text: normalized.oracleText,
    keywords: normalized.keywords,
  });
  return { ...normalized, slug: cardSlug(normalized), roles };
}

export function oneSentence(text, max = 180) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const match = flat.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (!match) return null;
  const sentence = match[0].trim();
  if (sentence.length > max) return null;
  if ((sentence.match(/[.!?]+/g) || []).length !== 1) return null;
  return sentence;
}

export function presentCard(card) {
  const classified = classifyCard(card);
  return {
    ...classified,
    quote: oneSentence(classified.oracleText),
  };
}

export function listNames(cards, limit = 4) {
  const names = cards.slice(0, limit).map((card) => card.name);
  const extra = cards.length - names.length;
  if (!names.length) return "none";
  if (extra > 0) return `${names.join(", ")}, and ${extra} more`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function roleSentence(card) {
  if (!card.roles?.length) {
    return `The classifiers assign ${card.name} no Commander role from that printed text.`;
  }
  return `The classifiers assign ${card.name} ${card.roles.length === 1 ? "the role" : "the roles"} ${card.roles.join(", ")}.`;
}

export function cardFactSentence(card) {
  const cost = card.manaCost
    ? `Printed cost ${card.manaCost}${card.cmc == null ? "" : `, mana value ${card.cmc}`}.`
    : "This Scryfall record did not include a printed mana cost.";
  const quote = card.quote
    ? `Its rules text begins “${card.quote}”`
    : "The full rules text is stored with the card; no single sentence was short enough to quote.";
  return `${card.name} is ${card.typeLine ? `a ${card.typeLine}` : "listed without a type line"}. ${cost} ${quote} ${roleSentence(card)}`;
}

export function countRoles(cards) {
  const counts = {};
  for (const card of cards) {
    for (const role of card.roles || []) counts[role] = (counts[role] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function guidesMatching(guides, predicate) {
  return guides
    .map((guide) => {
      const card = presentCard({
        name: guide.card.name,
        mana_cost: guide.card.mana_cost,
        cmc: manaValueFromCost(guide.card.mana_cost),
        type_line: guide.card.type_line,
        oracle_text: guide.card.oracle_text,
        color_identity: guide.card.color_identity,
      });
      return { guide, card };
    })
    .filter(({ card, guide }) => predicate(card, guide));
}

export function manaValueFromCost(cost = "") {
  const symbols = [...String(cost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!symbols.length) return null;
  let total = 0;
  for (const symbol of symbols) {
    if (/^\d+$/.test(symbol)) total += Number(symbol);
    else if (symbol === "X") total += 0;
    else total += 1;
  }
  return total;
}

export function knownNamesFrom(...groups) {
  const names = new Set();
  for (const group of groups) {
    for (const card of group || []) if (card?.name) names.add(card.name);
  }
  return [...names];
}
