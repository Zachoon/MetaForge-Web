// Deck Check — decklist parsing
// ------------------------------
// Turns pasted text into card entries and keeps a reason for every line it
// could not use. The older parseDeckRows helper silently drops any line that
// does not start with a number, so "Sol Ring", "1x Sol Ring" or an Archidekt
// "[Ramp]" tag simply vanished from the count. A player who pastes a list
// needs to see which lines were read, which were ignored on purpose
// (sideboard, maybeboard, headings, comments), and which could not be read.
//
// Pure and synchronous: no network, no DOM. Card facts are looked up later.

const SECTION_PATTERNS = [
  ["commander", /^(?:\/\/\s*|#\s*)?\[?\s*commanders?\s*\]?\s*:?\s*(?:\(\d+\))?$/i],
  ["companion", /^(?:\/\/\s*|#\s*)?\[?\s*companion\s*\]?\s*:?\s*(?:\(\d+\))?$/i],
  ["main", /^(?:\/\/\s*|#\s*)?\[?\s*(?:deck|main\s*(?:board|deck)?|library|mainboard|cards)\s*\]?\s*:?\s*(?:\(\d+\))?$/i],
  ["sideboard", /^(?:\/\/\s*|#\s*)?\[?\s*(?:sideboard|side\s*board|side)\s*\]?\s*:?\s*(?:\(\d+\))?$/i],
  ["maybeboard", /^(?:\/\/\s*|#\s*)?\[?\s*(?:maybe\s*board|maybe|considering|wishlist)\s*\]?\s*:?\s*(?:\(\d+\))?$/i],
  ["about", /^about$/i],
];

// Moxfield / Archidekt group headings such as "Creatures (31)" or "Ramp".
const GROUP_HEADING = /^(?:creatures?|instants?|sorcer(?:y|ies)|artifacts?|enchantments?|planeswalkers?|lands?|battles?|spells?|other|ramp|draw|removal|interaction|board wipes?|win conditions?|tokens?)\s*(?:\(\d+\))?:?$/i;

const MAX_QUANTITY = 250;
const MAX_NAME_LENGTH = 141; // the longest printed English card name is ~141 characters

/** Lowercase lookup key shared with the rest of the app (cardFactKey). */
export function deckCheckKey(name = "") {
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sectionOf(line) {
  for (const [section, pattern] of SECTION_PATTERNS) if (pattern.test(line)) return section;
  return null;
}

/**
 * Strip export decorations from a card name and report what they implied.
 * Handles set codes "(CMM) 400", "[CMM]", foil marks "*F*", Archidekt
 * "[Ramp]" / "^Tag^" tags and Moxfield "#tag" tags.
 */
function cleanName(raw) {
  let name = String(raw || "").trim();
  let commanderTag = false;
  // Archidekt categories, e.g. "[Commander{top}]" or "[Ramp,Draw]".
  name = name.replace(/\s*\[([^\]]*)\]\s*$/g, (_, tag) => {
    if (/\bcommander\b/i.test(tag)) commanderTag = true;
    return "";
  });
  name = name.replace(/\s*\^[^^]*\^\s*$/g, "");
  name = name.replace(/\s+#\S.*$/g, "");
  name = name.replace(/\s*\*(?:F|E|CMDR|Foil|Etched)\*\s*/gi, (match) => {
    if (/cmdr/i.test(match)) commanderTag = true;
    return " ";
  }).trim();
  // Trailing set code and collector number: "(CMM) 400", "(cmm) 400a", "(PLST) LRW-256".
  name = name.replace(/\s+\(([A-Za-z0-9]{2,6})\)(?:\s+[A-Za-z0-9★-]+)?\s*$/, "");
  // A trailing bracketed set code "[CMM]".
  name = name.replace(/\s+\[[A-Za-z0-9]{2,6}\]\s*$/, "");
  name = name.replace(/\s+/g, " ").trim();
  return { name, commanderTag };
}

/**
 * Parse pasted decklist text.
 * @param {string} text
 * @returns {{
 *   entries: Array<{ name: string, key: string, quantity: number, section: string, lines: number[], impliedQuantity: boolean }>,
 *   commanderNames: string[],
 *   ignored: Array<{ line: number, text: string, reason: string }>,
 *   problems: Array<{ line: number, text: string, reason: string }>,
 *   notes: Array<{ line: number, text: string, reason: string }>,
 *   totalLines: number,
 * }}
 */
export function parseDecklist(text = "") {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const byKey = new Map();
  const ignored = [];
  const problems = [];
  const notes = [];
  let section = "main";
  let sawExplicitSection = false;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.replace(/ /g, " ").trim();
    if (!line) {
      return;
    }
    const heading = sectionOf(line);
    if (heading) {
      section = heading;
      sawExplicitSection = true;
      return;
    }
    if (section === "about") {
      ignored.push({ line: lineNumber, text: line, reason: "Deck name or description" });
      return;
    }
    if (/^(?:\/\/|#)/.test(line)) {
      ignored.push({ line: lineNumber, text: line, reason: "Comment line" });
      return;
    }
    if (GROUP_HEADING.test(line)) {
      ignored.push({ line: lineNumber, text: line, reason: "Group heading" });
      return;
    }
    let working = line;
    let lineSection = section;
    const sb = working.match(/^SB:\s*(.+)$/i);
    if (sb) {
      working = sb[1].trim();
      lineSection = "sideboard";
    }
    const match = working.match(/^(\d+)\s*[xX]?\s+(.+)$/) || working.match(/^[xX](\d+)\s+(.+)$/);
    let quantity;
    let nameText;
    let impliedQuantity = false;
    if (match) {
      quantity = Number(match[1]);
      nameText = match[2];
    } else if (/^\d+\s*[xX]?$/.test(working)) {
      problems.push({ line: lineNumber, text: line, reason: "A number with no card name after it" });
      return;
    } else {
      quantity = 1;
      nameText = working;
      impliedQuantity = true;
    }
    const { name, commanderTag } = cleanName(nameText);
    if (!/[A-Za-z]/.test(name)) {
      problems.push({ line: lineNumber, text: line, reason: "No card name could be read on this line" });
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      problems.push({ line: lineNumber, text: line.slice(0, 80) + "…", reason: "This line is longer than any card name" });
      return;
    }
    if (quantity < 1) {
      problems.push({ line: lineNumber, text: line, reason: "Quantity is zero, so the card was left out" });
      return;
    }
    if (quantity > MAX_QUANTITY) {
      problems.push({ line: lineNumber, text: line, reason: `Quantity ${quantity} is not a real deck count` });
      return;
    }
    if (commanderTag) lineSection = "commander";
    if (impliedQuantity) notes.push({ line: lineNumber, text: line, reason: "No quantity given, read as 1 copy" });
    if (lineSection === "sideboard" || lineSection === "maybeboard") {
      ignored.push({ line: lineNumber, text: line, reason: lineSection === "sideboard" ? "Sideboard card (not part of the main deck)" : "Maybeboard card (not part of the deck)" });
      // Sideboard cards still count toward 60-card copy limits, so keep them.
      if (lineSection === "maybeboard") return;
    }
    const key = `${lineSection}::${deckCheckKey(name)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.lines.push(lineNumber);
      existing.impliedQuantity = existing.impliedQuantity && impliedQuantity;
    } else {
      byKey.set(key, { name, key: deckCheckKey(name), quantity, section: lineSection, lines: [lineNumber], impliedQuantity });
    }
  });

  const entries = [...byKey.values()];
  let commanderNames = entries.filter((entry) => entry.section === "commander").map((entry) => entry.name);
  if (!commanderNames.length && !sawExplicitSection) {
    // Common export shape: the main list, a blank line, then the commander alone.
    const commander = trailingSingleCard(lines);
    if (commander) {
      const hit = entries.find((entry) => entry.key === deckCheckKey(commander) && entry.quantity === 1);
      if (hit) {
        hit.section = "commander";
        commanderNames = [hit.name];
      }
    }
  }
  return { entries, commanderNames, ignored, problems, notes, totalLines: lines.length };
}

function trailingSingleCard(lines) {
  const blocks = lines.join("\n").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length < 2) return null;
  const last = blocks[blocks.length - 1].split("\n").map((line) => line.trim()).filter(Boolean);
  if (last.length !== 1) return null;
  const match = last[0].match(/^(?:1\s*[xX]?\s+)?(.+)$/);
  return match ? cleanName(match[1]).name : null;
}

/** Entries that are part of the deck being played (commander + main). */
export function playedEntries(parsed) {
  return (parsed?.entries || []).filter((entry) => entry.section === "main" || entry.section === "commander");
}

/** Total copies across main deck and command zone. */
export function playedCount(parsed) {
  return playedEntries(parsed).reduce((sum, entry) => sum + entry.quantity, 0);
}

/** Text for a list after one cut and one add, in a plain "1 Name" export. */
export function decklistText(entries = [], commanderNames = []) {
  const commanderKeys = new Set(commanderNames.map(deckCheckKey));
  const commanders = entries.filter((entry) => commanderKeys.has(deckCheckKey(entry.name)));
  const rest = entries.filter((entry) => !commanderKeys.has(deckCheckKey(entry.name)) && entry.quantity > 0);
  const lines = [];
  if (commanders.length) {
    lines.push("Commander");
    for (const entry of commanders) lines.push(`1 ${entry.name}`);
    lines.push("", "Deck");
  }
  for (const entry of rest) lines.push(`${entry.quantity} ${entry.name}`);
  return lines.join("\n");
}
