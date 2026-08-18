import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, researchPage, css, dossier] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/research/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  readFile(new URL("../app/components/forge/deep-forge-dossier.tsx", import.meta.url), "utf8"),
]);

// The Deep Forge vault itself (per-system evidence, structural
// intelligence, the interaction graph) moved to /research so it stops
// being mounted — even hidden — on the deck page. page.tsx keeps a small
// teaser linking there; the vault markup and DeepForgeDossier now live in
// app/research/page.tsx, which reuses the same CSS this file already
// asserts on.
test("Deep Forge remains an optional intelligence vault, now on /research", () => {
  assert.match(researchPage, /<small>DEEP FORGE · HOW DO YOU KNOW\?<\/small>/);
  assert.match(researchPage, /What MetaForge noticed — and how sure it is/);
  assert.match(researchPage, /<DeepForgeDossier/);
  assert.match(dossier, /What that could mean for this deck/);
  assert.match(dossier, /See the research evidence/);
  assert.match(page, /How do you know\? → Deep Forge evidence/);
  assert.match(page, /\/research\?deckId=/);
  assert.match(css, /Chapter IV intelligence vault/);
  assert.match(css, /SEALED INSTRUMENT CHAMBER/);
  assert.match(css, /INSTRUMENT CHAMBER OPEN/);
  assert.match(css, /deep-forge-dossier-arrive/);
});

test("the vault distinguishes integrity states and respects access needs", () => {
  assert.match(css, /integrity-dossier\.passed/);
  assert.match(css, /integrity-dossier\.held/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
