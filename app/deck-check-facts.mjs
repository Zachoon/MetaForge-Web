// Deck Check — printed card facts
// --------------------------------
// The only card-data source is Scryfall's public collection endpoint, the
// same one the free decklist and /api/cards/facts already use. No new paid
// API. Facts are trimmed to what the coaches read: printed text, type,
// cost, colour identity and Scryfall's legality field.

import { deckCheckKey } from "./deck-check-parse.mjs";

export const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const CHUNK = 75; // Scryfall's documented maximum identifiers per request.

/** Scryfall accepts the front face for "Front // Back" names. */
export function lookupName(name = "") {
  return String(name || "").split(/\s*\/\/\s*/)[0].trim();
}

/** Trim a raw Scryfall card to the printed facts Deck Check reads. */
export function factFromScryfall(card = {}) {
  const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
  const oracleText = card.oracle_text || faces.map((face) => face.oracle_text || "").filter(Boolean).join("\n");
  const typeLine = card.type_line || faces.map((face) => face.type_line || "").filter(Boolean).join(" // ");
  const manaCost = card.mana_cost || faces.find((face) => face.mana_cost)?.mana_cost || "";
  return {
    name: String(card.name || ""),
    typeLine,
    oracleText,
    manaCost,
    cmc: Number(card.cmc) || 0,
    colorIdentity: Array.isArray(card.color_identity) ? card.color_identity : [],
    legalities: card.legalities && typeof card.legalities === "object" ? { ...card.legalities } : {},
    // Scryfall's own flag for the Commander Brackets "Game Changers" list.
    // Absent (undefined) means the data did not say, not "no".
    ...(typeof card.game_changer === "boolean" ? { gameChanger: card.game_changer } : {}),
    cardFaces: faces.map((face) => ({
      name: face.name || "",
      typeLine: face.type_line || "",
      oracleText: face.oracle_text || "",
      manaCost: face.mana_cost || "",
    })),
  };
}

/** Index a fact under its full name and each face name. */
export function indexFact(index, fact) {
  index[deckCheckKey(fact.name)] = fact;
  for (const face of fact.cardFaces || []) {
    const key = deckCheckKey(face.name);
    if (key && !index[key]) index[key] = fact;
  }
  return index;
}

/**
 * Look up printed facts for card names.
 * @param {string[]} names
 * @param {{ fetchImpl?: typeof fetch, signal?: AbortSignal, onProgress?: (done: number, total: number) => void, delayMs?: number }} options
 * @returns {Promise<{ facts: Record<string, any>, notFound: string[], failed: boolean }>}
 */
export async function fetchCardFacts(names = [], options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const unique = [...new Map(names.map((name) => [deckCheckKey(name), name])).values()].filter(Boolean);
  const facts = {};
  const notFound = [];
  let failed = false;
  for (let start = 0; start < unique.length; start += CHUNK) {
    const chunk = unique.slice(start, start + CHUNK);
    if (start > 0 && options.delayMs !== 0) {
      // Scryfall asks clients to space requests 50–100ms apart.
      await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 100));
    }
    let payload = null;
    try {
      const response = await fetchImpl(SCRYFALL_COLLECTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((name) => ({ name: lookupName(name) })) }),
        signal: options.signal,
      });
      if (!response.ok) throw new Error(`Scryfall returned ${response.status}`);
      payload = await response.json();
    } catch (error) {
      if (options.signal?.aborted) throw error;
      failed = true;
      continue;
    }
    for (const card of Array.isArray(payload?.data) ? payload.data : []) indexFact(facts, factFromScryfall(card));
    for (const missing of Array.isArray(payload?.not_found) ? payload.not_found : []) {
      const original = chunk.find((name) => deckCheckKey(lookupName(name)) === deckCheckKey(missing?.name || ""));
      notFound.push(original || String(missing?.name || ""));
    }
    options.onProgress?.(Math.min(unique.length, start + chunk.length), unique.length);
  }
  return { facts, notFound, failed };
}

/** Find the fact for a decklist name, accepting a front-face-only spelling. */
export function factFor(facts = {}, name = "") {
  return facts[deckCheckKey(name)] || facts[deckCheckKey(lookupName(name))] || null;
}
