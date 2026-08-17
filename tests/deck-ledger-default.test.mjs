import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("finished decks default and reset to the condensed text ledger", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /useState<"workbench" \| "ledger">\("ledger"\)/);
  assert.match(page, /setDeckViewMode\("ledger"\)/);
});

test("ledger rows preview on hover, open readable details on click, and retain explicit options", async () => {
  const page = await read("app/page.tsx");
  const css = await read("app/testing-anvil.css");
  assert.match(page, /onMouseEnter=\{\(\) => setHoveredCard\(row\.name\)\}/);
  assert.match(page, /else setInspectedCard\(row\.name\)/);
  assert.match(page, /className="card-row-more"/);
  assert.match(page, /More options for \$\{row\.name\}/);
  // Multi-column (not CSS grid) is deliberate here: card-type groups have
  // very different heights (1-card Commander vs. 30-card Creatures), and
  // grid forces every column in the same row to match its tallest sibling,
  // leaving huge blank space under short groups once scrolled past them.
  assert.match(css, /ledger-deck-view \.type-columns\{display:block;columns:4/);
  assert.match(css, /card-row-more:hover/);
});

test("the ledger preview remains visible while the player scrolls its card columns", async () => {
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.progressive-results \.testing-layout\.chapter-1-active\{overflow:visible\}/);
  assert.match(css, /\.ledger-deck-view \.card-preview-stage\{top:82px;z-index:6\}/);
});

test("the preview pane is a flex sidebar with its own scroll fallback, not a shrink-wrapped grid item", async () => {
  // .deck-gallery used to be display:grid with the preview shrink-wrapped
  // via align-self:start next to a much taller multicol sibling - CSS Grid
  // can compute row/track height from a multicol child inconsistently,
  // which is exactly why the preview stopped following once scrolled past
  // its own short content height. Flexbox's align-items:flex-start on the
  // parent is the well-tested pattern for a sticky sidebar and doesn't have
  // that grid+multicol edge case. The overflow-y:auto pairing is a second,
  // independent fix: a stale max-height rule with no overflow property was
  // found still in the file, silently inert since browsers grow past
  // max-height without one.
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.deck-gallery\{display:flex;align-items:flex-start/);
  assert.match(css, /\.card-preview-stage\{position:sticky;top:18px;flex:0 0 230px/);
  // max-height alone does nothing without a paired overflow - a stale
  // max-height rule with no overflow property was found still in the file,
  // silently inert since browsers grow past max-height without one.
  assert.match(css, /\.card-preview-stage\{position:sticky;top:18px;flex:0 0 230px;width:230px;max-height:calc\(100vh - 36px\);overflow-y:auto;overflow-x:hidden\}/);
  assert.match(css, /\.deck-gallery\{align-items:flex-start\}\.card-preview-stage\{position:sticky!important;z-index:5;top:82px;max-height:calc\(100vh - 104px\);overflow-y:auto;overflow-x:hidden\}/);
});

test("ledger column padding is generous and wins the cascade over every older narrow variant", async () => {
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.ledger-deck-view \.deck-gallery\{display:flex!important;align-items:flex-start!important;gap:32px!important;padding:32px!important\}/);
  assert.match(css, /\.ledger-deck-view \.type-columns\{display:block!important;columns:3 240px!important;column-gap:32px!important;gap:32px!important\}/);
});
