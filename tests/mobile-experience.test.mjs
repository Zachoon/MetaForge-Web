import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/mobile-experience.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("mobile overrides load after the chamber styles", () => {
  const guided = globals.indexOf("./guided-build.css");
  const mobile = globals.indexOf("./mobile-experience.css");
  assert.ok(guided > -1 && mobile > guided, "mobile-experience.css must be the last imported sheet");
});

test("the closed Forgemaster menu does not stay painted", () => {
  assert.match(css, /\.forge-menu:not\(\[open\]\) > div \{ display: none; \}/);
});

test("phone rail labels stay inside their buttons and clear the home indicator", () => {
  const phone = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.match(phone, /--mf-frame-top: calc\(98px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(phone, /--mf-frame-rail: calc\(58px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(phone, /\.forge-global-rail button span \{[^}]*width: 100% !important/s);
  assert.match(phone, /\.forge-global-rail button span \{[^}]*overflow: hidden !important/s);
  assert.match(phone, /body:has\(\.great-forge\) \.privacy-choice \{ bottom: calc\(var\(--mf-frame-rail\) \+ 8px\); \}/);
});

test("tablet portrait can scroll the stacked entrance", () => {
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 900px\)/);
  assert.match(css, /\.chamber-entrance > \.forge-entrance \{[^}]*overflow-y: auto !important/s);
  assert.match(css, /\.great-forge > \.forge-card-rail \{ display: none !important; \}/);
});

test("typed fields stay at 16px so a phone keyboard does not zoom the page", () => {
  assert.match(css, /font-size: 16px !important/);
});

test("the viewport covers the safe area and resizes around the keyboard", () => {
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /interactiveWidget: "resizes-content"/);
  // vinext's ViewportHead omits viewport-fit and interactive-widget, so the
  // document tag is corrected before first paint.
  assert.match(layout, /viewport-fit=cover, interactive-widget=resizes-content/);
});

test("saved-deck deletes are not hover-only", () => {
  assert.match(css, /@media \(hover: none\), \(max-width: 900px\)/);
  assert.match(css, /\.decks-card \.decks-delete,\s*\.decks-row \.decks-delete \{ opacity: 1; \}/);
});
