import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("selected printing drives both the deck preview and contextual inspector image", () => {
  assert.match(page, /const activeImage\s*=\s*activePrinting\?\.image\s*\|\|/);
  assert.match(page, /const inspectedImage\s*=\s*inspectedPrinting\?\.image\s*\|\|/);
});

test("deck rows open a keyboard-accessible contextual inspector with Oracle and evidence boundaries", () => {
  assert.match(page, /onClick=\{\(\) => setInspectedCard\(row\.name\)\}/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /ORACLE TEXT/);
  assert.match(page, /not a universal card rating or a promise of match performance/i);
});

