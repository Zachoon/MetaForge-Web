import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the deck hero is a full-bleed cover with a readable plate and a fade", async () => {
  const css = await read("app/deck-page-layout.css");
  const globals = await read("app/globals.css");
  assert.match(globals, /deck-page-layout\.css/);
  assert.match(css, /\.deck-page-hero \.deck-hero-art[\s\S]*object-fit:\s*cover/);
  assert.match(css, /\.deck-page-hero \.deck-hero-art[\s\S]*width:\s*100%/);
  assert.match(css, /\.deck-page-hero \.deck-hero-art[\s\S]*height:\s*100%/);
  assert.match(css, /linear-gradient\(180deg/);
  assert.match(css, /rgba\(16,\s*15,\s*13,\s*0\.96\)/);
  assert.match(css, /\.deck-page-hero \.deck-hero-plate[\s\S]*border:\s*0\s*!important/);
  assert.match(css, /\.deck-page-hero \.deck-hero-plate[\s\S]*box-shadow:\s*none\s*!important/);
  assert.match(css, /width:\s*100%\s*!important/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(min-width: 1280px\)/);
  assert.match(css, /@media \(min-width: 1700px\)/);
});

test("deck options open in a focus-trapped drawer that Escape closes", async () => {
  const drawer = await read("app/components/forge/deck-options-drawer.tsx");
  const css = await read("app/deck-page-layout.css");
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /event\.key !== "Tab"/);
  assert.match(drawer, /previouslyFocused\?\.focus\(\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*border-radius:\s*16px 16px 0 0/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("masterwork identity stays a saved preference and starts closed", async () => {
  const context = await read("app/forge-session-context.tsx");
  const workbench = await read("app/components/forge/workbench-chamber.tsx");
  assert.match(context, /const \[masterworkIdentityOpen, setMasterworkIdentityOpen\] = useState\(false\)/);
  assert.match(workbench, /localStorage\.setItem\(masterworkIdentityKey/);
  assert.match(workbench, /Deck options/);
  assert.match(workbench, /className="deck-hero-art"/);
  const drawerAt = workbench.indexOf("<DeckOptionsDrawer");
  const panelAt = workbench.indexOf('className="masterwork-identity-panel"');
  const galleryAt = workbench.indexOf('id="deck-gallery"');
  assert.ok(drawerAt > 0 && panelAt > drawerAt, "identity controls live in the drawer");
  assert.ok(galleryAt > drawerAt, "the decklist follows the banner");
});

test("the free decklist leads with the banner, then the list, with coaching still visible", async () => {
  const ui = await read("app/components/forge/free-decklist.tsx");
  const hero = ui.indexOf('className="deck-page-hero free-deck-hero"');
  const coach = ui.indexOf("Coach this deck");
  const drawer = ui.indexOf("<DeckOptionsDrawer");
  const tools = ui.indexOf('aria-label="Build the list"');
  const drawerEnd = ui.indexOf("</DeckOptionsDrawer>");
  const list = ui.indexOf('aria-label="Decklist"');
  assert.ok(hero >= 0 && coach > hero && coach < drawer);
  assert.ok(drawer < tools && tools < drawerEnd && drawerEnd < list);
  assert.match(ui, /disabled=\{!selectedCommander\}/);
  assert.match(ui, /Pick a commander before coaching\./);
  assert.match(ui, /object-fit|deck-hero-art/);
});

test("decklist columns add as the page gets wider and collapse to one on a phone", async () => {
  const css = await read("app/deck-page-layout.css");
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(220px,\s*1fr\)\)\s*!important/);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*minmax\(200px,\s*1fr\)/);
  assert.match(css, /@media \(min-width: 1700px\)[\s\S]*minmax\(190px,\s*1fr\)/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*grid-template-columns:\s*1fr\s*!important/);
  assert.match(css, /repeat\(auto-fill,\s*minmax\(132px,\s*1fr\)\)/);
});
