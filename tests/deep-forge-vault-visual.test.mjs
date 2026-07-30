import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("Chapter IV opens as a sealed intelligence vault", () => {
  assert.match(page, /CHAPTER IV · ENTER THE DEEP FORGE/);
  assert.match(page, /Deck health, systems, causality, field pressure, and experiments/);
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
