import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, polish] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8"),
]);

test("Masterwork reveal presents one recommendation and two deliberate alternatives", () => {
  assert.match(page, /One path stands out/);
  assert.match(page, /Here’s why/);
  assert.doesNotMatch(page, /The Forge has chosen/);
  assert.match(page, /THE FORGE'S RECOMMENDATION/);
  assert.match(page, /BEST BLUEPRINT MATCH/);
  assert.match(page, /Reveal this Masterwork/);
  assert.match(polish, /Masterwork decision altar/);
  assert.match(polish, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(polish, /content:"FORGE'S READ"/);
  assert.match(polish, /content:"ALTERNATE PATH"/);
});

test("Masterwork altar remains usable on small screens and with reduced motion", () => {
  assert.match(polish, /@media\(max-width:900px\)/);
  assert.match(polish, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(polish, /\.masterwork-card\.is-featured>button:before\{display:none\}/);
});
