import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, comparison, polish] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/components/forge/philosophy-compare.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8"),
]);

// Bug 1B replaced the old sealed/revealed reveal ceremony with a real-
// candidate picker. Stage-2 philosophy cards now lead with experience
// language (built for / feel / tradeoff) while still mapping the engine's
// own already-built candidates — never a second generation call.
test("Masterwork picker presents real already-built philosophies for explicit choice", () => {
  assert.match(page, /id="masterwork-choice-start"/);
  assert.match(comparison, /Choose how you want this deck to play/);
  assert.match(comparison, /CHOOSE YOUR EXPERIENCE/);
  assert.match(page, /strategyBuildComparison|\.builds/);
  assert.match(comparison, /build\.badge \|\| "BEST FIT FOR YOU"/);
  assert.match(comparison, /philosophy-alt-grid/);
  assert.match(comparison, /Choose \$\{build\.label\}/);
  assert.doesNotMatch(page, /Reveal this Masterwork/, "the sealed/revealed ceremony is retired — every candidate is shown immediately");
  assert.match(polish, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("Masterwork altar remains usable on small screens and with reduced motion", () => {
  assert.match(polish, /@media\(max-width:900px\)/);
  assert.match(polish, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(polish, /\.masterwork-card\.is-featured>button:before\{display:none\}/);
});
