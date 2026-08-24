import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// The navigation-reset effect and activeCard derivation moved to
// forge-session-context.tsx during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("card preview and inspection UI are cleared when workspace navigation changes", () => {
  assert.match(forgeSessionContext, /setHoveredCard\(""\)/);
  assert.match(forgeSessionContext, /setInspectedCard\(""\)/);
  assert.match(forgeSessionContext, /setCardActionMenu\(null\)/);
  assert.match(forgeSessionContext, /setPrintingMenu\(null\)/);
  assert.match(forgeSessionContext, /\}, \[chamber, siteRail\]\);/);
});

test("an empty preview does not fall back to the previous deck's commander", () => {
  assert.match(forgeSessionContext, /const activeCard = hoveredCard;/);
  assert.doesNotMatch(forgeSessionContext, /hoveredCard \|\| activeCommanderName \|\| deckRows\[0\]/);
});
