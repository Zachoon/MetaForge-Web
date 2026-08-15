import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [page, component, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/components/forge/imported-deck-comparison.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/components/forge/imported-deck-comparison.css", import.meta.url), "utf8"),
]);

test("submitted-deck flow asks for the list before its format and then enters the ceremony", () => {
  const deckPrompt = page.indexOf("1 · YOUR CURRENT DECKLIST");
  const basicsPrompt = page.indexOf("2 · CONFIRM THE BASICS");
  assert.ok(deckPrompt >= 0 && basicsPrompt > deckPrompt);
  assert.match(page, /commitDirectForge\("decklist"\)/);
  assert.match(page, /setChamber\("forging"\)/);
});

test("imported results land on a truthful before-and-after comparison", () => {
  assert.match(page, /hasValidatedDeck && isImportedDeckReview && siteRail === "decklist"/);
  assert.match(page, /nativeMasterworkContext\?\.laboratory\?\.verdict === "advance"/);
  assert.match(page, /laboratory: nativeReport\.laboratory \|\| null/);
  assert.match(component, /Your submitted list/);
  assert.match(component, /Forge proposed revision/);
  assert.match(component, /Swap station/);
  assert.match(component, /Core to retain/);
  assert.match(component, /List completion adjustments/);
  assert.match(page, /changes\?\.added/);
  assert.match(page, /changes\?\.trimmed/);
  assert.match(component, /Your original list remains preserved/);
});

test("comparison visually distinguishes cuts and additions without hiding unchanged cards", () => {
  assert.match(css, /\.is-cut \.revision-deck-row\.is-changed/);
  assert.match(css, /\.is-add \.revision-deck-row\.is-changed/);
  assert.match(css, /#431b1b/);
  assert.match(css, /#123828/);
  assert.match(component, /Everything unmarked is retained/);
});
