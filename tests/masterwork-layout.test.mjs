import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/masterwork-summary.css", import.meta.url),
  "utf8",
);
const journeyCss = await readFile(
  new URL("../app/forge-journey.css", import.meta.url),
  "utf8",
);
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

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

test("derives Masterwork titles, tone, and plain-language paths from one design lane", () => {
  assert.match(page, /const MASTERWORK_LANES/);
  assert.match(page, /Fast Start · Focused Pressure/);
  assert.match(page, /Theme Engine · Compounding Growth/);
  assert.match(page, /Patient Defense · Reliable Finish/);
  assert.match(page, /name: `The \$\{identity\} \$\{noun\}`/);
  assert.doesNotMatch(page, /const NAME_CORES/);
});

test("keeps Masterwork cards stable instead of replaying reveal animation on updates", () => {
  assert.match(page, /key={`masterwork-\$\{poolIndex\}`}/);
  assert.match(journeyCss, /\.masterwork-card\{animation:none!important;contain:layout\}/);
});
