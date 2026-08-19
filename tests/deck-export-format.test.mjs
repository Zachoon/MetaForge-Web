import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { arenaSafeCardName, formatDeckForArenaExport } from "../app/deck-export-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("deck export formatting — MTG Arena front-face-only names", () => {
  it("strips the back face from a DFC/split/MDFC card name", () => {
    assert.equal(
      arenaSafeCardName("Branchloft Pathway // Boulderloft Pathway"),
      "Branchloft Pathway",
    );
  });

  it("leaves a normal card name with no ' // ' completely unchanged", () => {
    assert.equal(arenaSafeCardName("Sol Ring"), "Sol Ring");
    assert.equal(arenaSafeCardName("Lightning Bolt"), "Lightning Bolt");
  });

  it("reformats deck text: DFC lines lose the back face, normal lines are untouched", () => {
    const deck = [
      "1 Krenko, Mob Boss",
      "1 Branchloft Pathway // Boulderloft Pathway",
      "1 Fire // Ice",
      "99 Forest",
    ].join("\n");

    assert.equal(
      formatDeckForArenaExport(deck),
      [
        "1 Krenko, Mob Boss",
        "1 Branchloft Pathway",
        "1 Fire",
        "99 Forest",
      ].join("\n"),
    );
  });

  it("preserves a trailing set/collector-number suffix while still trimming the back face", () => {
    assert.equal(
      formatDeckForArenaExport("1 Branchloft Pathway // Boulderloft Pathway (ZNR) 259"),
      "1 Branchloft Pathway (ZNR) 259",
    );
  });

  it("passes non-deck-line text (blank lines, headers) through unchanged", () => {
    const deck = "Commander\n1 Krenko, Mob Boss\n\nDeck\n99 Forest";
    assert.equal(formatDeckForArenaExport(deck), deck);
  });

  it("page.tsx applies this export-only formatting at every clipboard/download call site, never at the forgedDeck state source", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    assert.match(page, /import \{ formatDeckForArenaExport \} from "\.\/deck-export-format\.mjs";/);

    const clipboardWrites = page.match(/navigator\.clipboard\.writeText\([^)]*\)/g) || [];
    const deckClipboardWrites = clipboardWrites.filter((call) => call.includes("forgedDeck"));
    assert.ok(deckClipboardWrites.length >= 3, "expected at least 3 deck clipboard-copy call sites");
    for (const call of deckClipboardWrites) {
      assert.match(call, /formatDeckForArenaExport\(forgedDeck\)/, `expected Arena-safe formatting in: ${call}`);
    }

    assert.match(page, /new Blob\(\[formatDeckForArenaExport\(forgedDeck\)\]/);

    // The internal parse/display paths must still see full "Front // Back" names.
    assert.match(page, /parseDeckRows\(forgedDeck\)/);
    assert.match(page, /<pre>\{forgedDeck\}<\/pre>/);
  });
});
