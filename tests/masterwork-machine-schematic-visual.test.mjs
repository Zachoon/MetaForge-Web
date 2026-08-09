import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the player-facing coach brief retains four interpreted deck truths", () => {
  assert.match(page, /Your deck in plain language/);
  assert.match(page, /YOUR PLAN/);
  assert.match(page, /GET ESTABLISHED/);
  assert.match(page, /BUILD MOMENTUM/);
  assert.match(page, /WATCH THIS FIRST/);
  assert.match(css, /Player-facing coaching is a brief/);
  assert.match(css, /coach-brief-grid/);
  assert.match(css, /coach-deck-sequence/);
});

test("the coach brief separates the watchpoint and stays responsive", () => {
  assert.match(css, /coach-brief-watch/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
