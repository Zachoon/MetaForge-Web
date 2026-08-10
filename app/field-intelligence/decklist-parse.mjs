// =============================================================================
// Field Intelligence — Decklist text + TopDeck deckObj helpers
// =============================================================================

import { parseDeckTextToRows } from "./corpus-schema.mjs";

const freeze = (value) => Object.freeze(value);

/**
 * Parse TopDeck / Arena-style deck text into commanders + mainboard rows.
 */
export function parseTournamentDeckText(deckText = "") {
  const text = String(deckText || "").trim();
  if (!text) return freeze({ commanders: freeze([]), rows: freeze([]), deckText: "" });

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return freeze({
      commanders: freeze([]),
      rows: freeze([]),
      deckText: text,
      externalUrl: text,
      needsExternalFetch: true,
      importSource: detectImportSource(text),
    });
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const commanders = [];
  let mode = "main";
  const mainLines = [];

  for (const line of lines) {
    if (!line) continue;
    if (/^~+.*commanders?.*~+/i.test(line) || /^commanders?\s*:?$/i.test(line) || /^\[commanders?\]$/i.test(line)) {
      mode = "commander";
      continue;
    }
    if (/^~+.*deck.*~+/i.test(line) || /^deck\s*:?$/i.test(line) || /^\[deck\]$/i.test(line) || /^main(?:board)?\s*:?$/i.test(line)) {
      mode = "main";
      continue;
    }
    if (/^sideboard/i.test(line) || /^maybeboard/i.test(line)) {
      mode = "skip";
      continue;
    }
    if (mode === "skip") continue;
    if (mode === "commander") {
      const match = line.match(/^(?:\d+\s*x?\s+)?(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/i);
      if (match) commanders.push({ name: match[1].trim() });
      continue;
    }
    mainLines.push(line);
  }

  if (!commanders.length) {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    if (blocks.length >= 2) {
      const trailing = blocks[blocks.length - 1].split("\n").map((l) => l.trim()).filter(Boolean);
      if (trailing.length === 1) {
        const match = trailing[0].match(/^(?:\d+\s*x?\s+)?(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/i);
        if (match) {
          commanders.push({ name: match[1].trim() });
          return freeze({
            commanders: freeze(commanders),
            rows: freeze(parseDeckTextToRows(blocks.slice(0, -1).join("\n"))),
            deckText: text,
            importSource: "plaintext",
          });
        }
      }
    }
  }

  return freeze({
    commanders: freeze(commanders),
    rows: freeze(parseDeckTextToRows(mainLines.join("\n"))),
    deckText: text,
    importSource: "plaintext",
  });
}

export function detectImportSource(value = "") {
  const text = String(value || "");
  if (/moxfield\.com/i.test(text)) return "moxfield_url";
  if (/archidekt\.com/i.test(text)) return "archidekt_url";
  if (/deckstats\.net/i.test(text)) return "deckstats_url";
  if (/^https?:\/\//i.test(text)) return "external_url";
  return "plaintext_or_structured";
}

/**
 * TopDeck V2 deckObj shapes observed in docs:
 *   { Commanders: { "Card Name": { ... } }, Mainboard: { "Card Name": { count / quantity } } }
 * Also accept array-shaped variants for resilience.
 */
export function rowsFromDeckObj(deckObj = {}) {
  if (!deckObj || typeof deckObj !== "object") return freeze([]);

  if (Array.isArray(deckObj.cards) || Array.isArray(deckObj.mainboard) || Array.isArray(deckObj.Mainboard)) {
    const cards = deckObj.cards || deckObj.mainboard || deckObj.Mainboard || [];
    return freeze(cards.map((card) => freeze({
      quantity: Number(card.quantity || card.count || card.qty) || 1,
      name: card.name || card.cardName || String(card),
    })).filter((row) => row.name));
  }

  const main = deckObj.Mainboard || deckObj.mainboard || deckObj.Deck || deckObj.deck || null;
  if (main && typeof main === "object" && !Array.isArray(main)) {
    return freeze(Object.entries(main).map(([name, info]) => freeze({
      quantity: Number(info?.quantity ?? info?.count ?? info?.qty ?? (typeof info === "number" ? info : 1)) || 1,
      name,
    })).filter((row) => row.name).sort((a, b) => a.name.localeCompare(b.name)));
  }

  return freeze([]);
}

export function commandersFromDeckObj(deckObj = {}) {
  if (!deckObj || typeof deckObj !== "object") return freeze([]);

  const list = deckObj.commanders || deckObj.commander || deckObj.leaders;
  if (Array.isArray(list)) {
    return freeze(list.map((entry) => freeze({
      name: entry.name || entry.cardName || String(entry),
    })).filter((c) => c.name));
  }
  if (list && typeof list === "object") {
    return freeze(Object.keys(list).map((name) => freeze({ name })));
  }

  const commandersMap = deckObj.Commanders || deckObj.COMMANDERS || null;
  if (commandersMap && typeof commandersMap === "object") {
    return freeze(Object.keys(commandersMap).map((name) => freeze({ name })));
  }

  return freeze([]);
}

export function deckObjImportSource(deckObj = {}) {
  if (!deckObj || typeof deckObj !== "object") return null;
  return deckObj.importSource || deckObj.source || deckObj.game || "topdeck_deckObj";
}
