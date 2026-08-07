import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, polish] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8"),
]);

// Bug 1B replaced the old sealed/revealed reveal ceremony (three templated
// designs, one manually "revealed" at a time, entering any of them
// triggering its own separate generation call) with a real-candidate picker:
// all three already-generated, fully legal builds shown at once, one marked
// recommended, entering any of them an explicit click with zero further
// network calls. This test now pins that shape instead of the old one.
test("Masterwork picker presents one recommendation and two real alternatives, already built", () => {
  assert.match(page, /Three real builds\. You choose\./);
  assert.match(page, /THE GREAT FORGE ANSWERS/);
  assert.doesNotMatch(page, /The Forge has chosen/);
  assert.match(page, /\{isRecommended && <em>RECOMMENDED<\/em>\}/);
  assert.doesNotMatch(page, /Reveal this Masterwork/, "the sealed/revealed ceremony is retired — every candidate is shown immediately");
  assert.match(polish, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(polish, /content:"FORGE'S READ"/);
});

test("Masterwork altar remains usable on small screens and with reduced motion", () => {
  assert.match(polish, /@media\(max-width:900px\)/);
  assert.match(polish, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(polish, /\.masterwork-card\.is-featured>button:before\{display:none\}/);
});
