// =============================================================================
// Deck text export/copy formatting — playtest bug: MTG Arena's plain-text
// importer is unreliable with the full "Front // Back" name Scryfall returns
// for double-faced/split/modal-DFC cards. Front-face-only is the compatible
// format every major deckbuilding tool uses for Arena-format export.
//
// This is deliberately export-only: the deck text used for parsing
// (parseDeckRows) and on-page display keeps full "Front // Back" names, so
// this transform must never be applied at the forgedDeck state source —
// only at the point where deck text is copied to the clipboard or downloaded.
// =============================================================================

const DECK_LINE = /^(\d+)\s+(.+?)((?:\s+\([A-Z0-9]{2,6}\)\s+\d+\w*)?)$/;

/**
 * Front-face-only card name — strips " // Back" from a DFC/split/MDFC name.
 * Names with no " // " pass through unchanged.
 */
export const arenaSafeCardName = (name) => String(name || "").split(/\s*\/\/\s*/)[0].trim();

/**
 * Reformats "Nx Card Name" deck text for MTG Arena import: each card name is
 * reduced to its front face, everything else about the line (quantity,
 * whitespace, an optional trailing set/collector-number suffix) is preserved.
 * Lines that don't match the "N Name" shape pass through untouched.
 */
export const formatDeckForArenaExport = (deckText) =>
  String(deckText || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.trim().match(DECK_LINE);
      if (!match) return line;
      const [, quantity, name, suffix] = match;
      return `${quantity} ${arenaSafeCardName(name)}${suffix}`;
    })
    .join("\n");
