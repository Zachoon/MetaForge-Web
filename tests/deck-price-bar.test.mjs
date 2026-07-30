import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
const motionCss = fs.readFileSync(new URL("../app/forge-motion.css", import.meta.url), "utf8");

test("surfaces a persistent, real market-price total and per-card prices", () => {
  assert.match(page, /cardPriceUsd/);
  assert.match(page, /deckPriceTotal/);
  assert.match(page, /card-row-price/);
  assert.match(page, /deck-price-bar/);
  // Cards with no known price are counted separately, never silently
  // treated as free.
  assert.match(page, /unpricedCards/);
});

test("the price bar is excluded from the generic child-layering rule so position:fixed actually applies", () => {
  // .great-forge > :not(...) forces position:relative on every direct
  // child except an explicit exclusion list — without .deck-price-bar in
  // that list, the bar silently stops being a fixed, always-visible bar
  // and just sits at the bottom of the scrollable content instead.
  assert.match(motionCss, /\.deck-price-bar/);
  const genericLayeringRule = motionCss.match(/\.great-forge > :not\(([^)]*)\)/);
  assert.ok(genericLayeringRule, "expected to find the generic child-layering rule");
  assert.match(genericLayeringRule[1], /\.deck-price-bar/);
});

test("the price bar sits below the bench dock in stacking order, not covering it", () => {
  const barRule = css.match(/\.deck-price-bar\{[^}]*z-index:(\d+)/);
  assert.ok(barRule, "expected to find .deck-price-bar's z-index");
  // The bench dock (deck-bench-dock.css) is a pre-existing z-index:90
  // fixed widget in the same bottom-right corner; the price bar must stay
  // beneath it so the dock remains fully visible and clickable.
  assert.ok(Number(barRule[1]) < 90, `expected the price bar's z-index to stay below the bench dock's, got ${barRule[1]}`);
});

test("each deck row can be priced as foil or nonfoil independently", () => {
  assert.match(page, /foilCards/);
  assert.match(page, /card-row-foil-toggle/);
  // cardPriceUsd must accept a foil flag and prefer that printing's price,
  // falling back to the other printing rather than reading as unpriced.
  assert.match(page, /cardPriceUsd\s*=\s*\(fact\?:\s*CardFact,\s*foil\s*=\s*false\)/);
  assert.match(page, /foil\s*\?\s*fact\?\.prices\?\.usd_foil\s*:\s*fact\?\.prices\?\.usd/);
  // The deck-wide total must recompute when foil selections change.
  const memoDeps = page.match(/\[deckRows, cardFacts, foilCards\]/);
  assert.ok(memoDeps, "expected deckPriceTotal to depend on foilCards");
});

test("the foil toggle nests inside the deck row without invalid button-in-button HTML", () => {
  // The row can no longer be a native <button> once it hosts a nested
  // foil-toggle button, since <button> cannot contain another <button>.
  assert.match(page, /"type-column-row"/);
  assert.match(page, /role="button"/);
  assert.doesNotMatch(css, /\.type-column>button/);
});

test("the imperative drag-reorder wiring targets the new row element, not a stale button selector", () => {
  assert.match(page, /querySelectorAll<HTMLElement>\(".type-column>.type-column-row"\)/);
  assert.doesNotMatch(page, /querySelectorAll<HTMLButtonElement>\(".type-column>button"\)/);
});
