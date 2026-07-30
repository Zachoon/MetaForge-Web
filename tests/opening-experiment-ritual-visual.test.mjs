import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the first experiment reads as a three-path choosing ritual", () => {
  assert.match(page, /YOUR FIRST OFFICIAL EXPERIMENT/);
  assert.match(page, /opening-experiment-options/);
  assert.match(css, /First experiment choosing ritual/);
  assert.match(css, /counter-reset:experiment-path/);
  assert.match(css, /CHOOSE  →  REVEAL  →  TEST/);
  assert.match(css, /experiment-path-arrive/);
});

test("the choosing ritual keeps keyboard, mobile, and quiet-motion affordances", () => {
  assert.match(css, /focus-within/);
  assert.match(css, /@media\(max-width:540px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\.opening-experiment-options figure:after\{display:none\}/);
});
