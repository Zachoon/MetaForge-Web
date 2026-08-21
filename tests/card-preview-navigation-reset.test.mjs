import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("card preview and inspection UI are cleared when workspace navigation changes", () => {
  assert.match(page, /setHoveredCard\(""\)/);
  assert.match(page, /setInspectedCard\(""\)/);
  assert.match(page, /setCardActionMenu\(null\)/);
  assert.match(page, /setPrintingMenu\(null\)/);
  assert.match(page, /\}, \[chamber, siteRail\]\);/);
});

test("an empty preview does not fall back to the previous deck's commander", () => {
  assert.match(page, /const activeCard = hoveredCard;/);
  assert.doesNotMatch(page, /hoveredCard \|\| activeCommanderName \|\| deckRows\[0\]/);
});
