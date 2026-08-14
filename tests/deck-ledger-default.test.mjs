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
  assert.match(css, /ledger-deck-view \.type-columns\{columns:4 220px/);
  assert.match(css, /card-row-more:hover/);
});

test("the ledger preview remains visible while the player scrolls its card columns", async () => {
  const css = await read("app/testing-anvil.css");
  assert.match(css, /\.progressive-results \.testing-layout\.chapter-1-active\{overflow:visible\}/);
  assert.match(css, /\.ledger-deck-view \.card-preview-stage\{top:82px;z-index:6\}/);
});
