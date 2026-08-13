import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("Deep Forge remains an optional intelligence vault", () => {
  assert.match(page, /<small>DEEP FORGE · HOW DO YOU KNOW\?<\/small>/);
  assert.match(page, /Exact numbers, detected relationships, and methodology/);
  assert.match(page, /How do you know\? → Deep Forge evidence/);
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
