// Moxfield/Arena/MTGO decklist exports conventionally set a deck's
// commander apart as its own trailing block, separated from the rest of
// the list by a blank line. Recognizing that shape lets a pasted decklist
// resolve its own commander automatically instead of asking the player to
// pick one a second time after they've already supplied a complete list —
// see app/page.tsx's "refine" (review-a-pasted-deck) chamber. A paste that
// doesn't take this shape returns null; callers fall back to the manual
// commander picker rather than guessing.
export function extractPastedCommanderName(deckText) {
  const lines = String(deckText || "").split("\n").map((line) => line.trim());
  const headerIndex = lines.findIndex((line) => /^(?:\[?commanders?\]?|commanders?\s*:?)$/i.test(line));
  if (headerIndex >= 0) {
    const commanderLine = lines.slice(headerIndex + 1).find((line) => line && !/^[A-Za-z][A-Za-z ]+:$/.test(line));
    const headerMatch = commanderLine?.match(/^(?:\d+\s+)?(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
    if (headerMatch) return headerMatch[1].trim();
  }
  const blocks = String(deckText || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length < 2) return null;
  const trailingLines = blocks[blocks.length - 1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (trailingLines.length !== 1) return null;
  const match = trailingLines[0].match(/^(?:\d+\s+)?(.+?)(?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?$/);
  return match ? match[1].trim() : null;
}

// Maps a raw Scryfall card into the small CommanderOption shape the UI
// renders. card.name is used unmodified (not card_faces[0].name), so a
// double-faced commander like "Tony Stark // The Invincible Iron Man"
// resolves to and is stored under its full, canonical two-faced name.
export function commanderOptionFromCard(card) {
  const faceFacts = (card.card_faces || [])
    .map((face) => `${face.name} ${face.mana_cost || ""}\n${face.type_line || ""}\n${face.oracle_text || ""}`)
    .join("\nTRANSFORMS TO\n");
  return {
    name: card.name,
    colors: card.color_identity || [],
    typeLine: card.type_line || "Legendary card",
    image:
      card.image_uris?.art_crop
      || card.card_faces?.[0]?.image_uris?.art_crop
      || card.image_uris?.small
      || card.card_faces?.[0]?.image_uris?.small
      || "",
    verifiedFacts: `LIVE SCRYFALL RECORD\nName: ${card.name}\nMana cost: ${card.mana_cost || card.card_faces?.[0]?.mana_cost || "None"}\nType: ${card.type_line || ""}\nColor identity: ${(card.color_identity || []).join("") || "Colorless"}\nSet: ${card.set_name || ""} (${card.set || ""})\nAvailable games: ${(card.games || []).join(", ")}\nBrawl legality: ${card.legalities?.brawl || "unknown"}\nCommander legality: ${card.legalities?.commander || "unknown"}\nOracle text:\n${faceFacts || card.oracle_text || ""}`,
  };
}

// Resolves a pasted decklist's trailing-block commander candidate against
// Scryfall's own commander-eligibility filter (is:commander — handles
// Legendary creatures, "can be your commander" planeswalkers/backgrounds,
// etc., rather than reimplementing that eligibility logic here) combined
// with an exact-name match, so an isolated line that happens to sit after a
// blank line but isn't actually a legal commander for the format resolves
// to null rather than a false positive. formatTerms/mapCard/fetchImpl are
// injected so this is testable without a live network call or page.tsx's
// own React state.
export async function resolvePastedCommanderCandidate({ deckText, format = "Commander", mapCard, fetchImpl = fetch }) {
  const candidateName = extractPastedCommanderName(deckText);
  if (!candidateName) return null;
  const lookupName = candidateName.split(/\s*\/\/\s*/)[0].trim();
  const response = await fetchImpl(`/api/cards/commanders?format=${encodeURIComponent(format)}&q=${encodeURIComponent(lookupName)}&exact=true`);
  if (!response.ok) return null;
  const data = await response.json();
  const card = (data.cards || [])[0];
  return card ? mapCard(card) : null;
}
