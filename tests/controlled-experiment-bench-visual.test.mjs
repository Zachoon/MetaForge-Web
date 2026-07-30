import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("Chapter II presents one pressure point and three controlled revisions", () => {
  assert.match(page, /DECK STRESS LAB · CONTROLLED TEST/);
  assert.match(page, /Show three one-card tests/);
  assert.match(page, /Create revision/);
  assert.match(css, /Chapter II experiment bench/);
  assert.match(css, /counter-reset:controlled-revision/);
  assert.match(css, /content:"CONTROLLED TEST"/);
});

test("the controlled experiment bench supports focus, small screens, and quiet motion", () => {
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /meta-breaker-workflow>button:after\{display:none\}/);
});
