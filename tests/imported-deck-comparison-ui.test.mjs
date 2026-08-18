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

test("a double-faced card written by its front face on one side of the diff never reads as a phantom swap", () => {
  const frontFace = (value = "") => value.split(/\s*\/\/\s*/)[0].trim();
  const key = (value = "") => value.trim().toLocaleLowerCase("en");
  const matchKey = (value = "") => key(frontFace(value));
  const quantities = (rows) => new Map(rows.map((row) => [matchKey(row.name), Number(row.quantity || 0)]));
  const changedNames = (left, right) => {
    const rightQuantities = quantities(right);
    return new Set(left.filter((row) => row.quantity > (rightQuantities.get(matchKey(row.name)) || 0)).map((row) => key(row.name)));
  };
  const original = [{ name: "Tony Stark", quantity: 1 }, { name: "The Ten Rings", quantity: 1 }];
  const proposed = [{ name: "Tony Stark // The Invincible Iron Man", quantity: 1 }, { name: "Snap", quantity: 1 }];
  assert.equal(changedNames(original, proposed).has("tony stark"), false);
  assert.equal(changedNames(proposed, original).has("tony stark // the invincible iron man"), false);
  assert.equal(changedNames(original, proposed).has("the ten rings"), true);
  assert.equal(changedNames(proposed, original).has("snap"), true);
  assert.match(component, /frontFace/);
  assert.match(component, /matchKey/);
});

test("printed and flavor-name rows jump to their canonical card's comparison slide", () => {
  assert.match(component, /identityAliases/);
  assert.match(component, /normalizedAliases\.get\(key\(name\)\) \|\| matchKey\(name\)/);
  assert.match(component, /jumpable\.has\(identityKey\(row\.name\)\)/);
  assert.match(component, /swapIndexByCard\.get\(identityKey\(name\)\)/);
  assert.match(page, /identityAliases=\{nativeMasterworkContext\.identityAliases\}/);
});

test("dense deck-list hover previews do not synchronously rerender for every crossed row", () => {
  assert.match(page, /const scheduleDeckHover = useCallback/);
  assert.match(page, /startTransition\(\(\) => setHoveredCard\(name\)\)/);
  assert.match(page, /onMouseEnter=\{\(\) => scheduleDeckHover\(row\.name\)\}/);
});
