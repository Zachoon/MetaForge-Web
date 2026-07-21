import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/masterwork-summary.css", import.meta.url),
  "utf8",
);

test("keeps the Masterworks reveal centered on a shrink-safe shared frame", () => {
  assert.match(
    css,
    /\.masterwork-reveal\s*>\s*header,[\s\S]*?\.masterwork-grid,[\s\S]*?width:\s*min\(1480px,\s*100%\);[\s\S]*?margin-inline:\s*auto;/,
  );
  assert.match(
    css,
    /\.masterwork-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(
    css,
    /\.masterwork-card,[\s\S]*?min-width:\s*0;/,
  );
  assert.match(css, /\.masterwork-card\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
});
