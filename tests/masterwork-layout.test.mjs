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
// MASTERWORK_LANES/createMasterworks moved to deck-row-helpers.ts during
// the page.tsx decomposition (Phase 4).
const deckRowHelpers = await readFile(new URL("../app/deck-row-helpers.ts", import.meta.url), "utf8");

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
  assert.match(deckRowHelpers, /const MASTERWORK_LANES/);
  assert.match(deckRowHelpers, /Fast Start · Focused Pressure/);
  assert.match(deckRowHelpers, /Theme Engine · Compounding Growth/);
  assert.match(deckRowHelpers, /Patient Defense · Reliable Finish/);
  assert.match(deckRowHelpers, /name: `The \$\{identity\} \$\{noun\}`/);
  assert.doesNotMatch(deckRowHelpers, /const NAME_CORES/);
});

test("keeps Masterwork cards stable instead of replaying reveal animation on updates", () => {
  // Philosophy cards key off the comparison build id (same as candidate.id).
  assert.match(page, /key=\{build\.id\}/);
  assert.match(journeyCss, /\.masterwork-card\{animation:none!important;contain:layout\}/);
});
