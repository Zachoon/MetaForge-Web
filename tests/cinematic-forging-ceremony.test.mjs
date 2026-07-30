import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/forge-polish.css", import.meta.url), "utf8");

test("uses a continuous cinematic forge instead of swapping static illustrations", () => {
  assert.match(page, /className={`forge-cinematic-forge/);
  assert.match(page, /entrance-aperture\.mp4/);
  assert.match(page, /entrance-embers\.mp4/);
  assert.doesNotMatch(page, /CEREMONY_MOTION_ASSETS/);
});

test("does not present invented candidate countdown numbers", () => {
  assert.doesNotMatch(page, /CANDIDATE DESIGNS/);
  assert.doesNotMatch(page, /candidate-count/);
  assert.match(page, /CRAFT PHASE/);
});

test("provides quiet and reduced-motion versions of the ceremony", () => {
  assert.match(css, /\.forge-cinematic-forge\.is-quiet video\{display:none\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
