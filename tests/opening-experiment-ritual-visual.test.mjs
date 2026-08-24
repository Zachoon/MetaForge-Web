import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [css, workbenchChamber] = await Promise.all([
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  // The opening-experiment gate JSX moved to the workbench chamber's own
  // component during the page.tsx decomposition (Phase 4 Stage 4).
  readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8"),
]);

test("the first experiment reads as a three-path choosing ritual", () => {
  assert.match(workbenchChamber, /YOUR FIRST OFFICIAL EXPERIMENT/);
  assert.match(workbenchChamber, /opening-experiment-options/);
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
