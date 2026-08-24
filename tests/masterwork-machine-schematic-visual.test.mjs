import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [css, masterworksChamber, workbenchChamber] = await Promise.all([
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  // The masterworks chamber's own commission-contract summary ("1 · I
  // HEARD YOU") moved to its own component during the page.tsx
  // decomposition (Phase 4 Stage 3).
  readFile(new URL("../app/components/forge/masterworks-chamber.tsx", import.meta.url), "utf8"),
  // The coach-brief JSX moved to the workbench chamber's own component
  // during the page.tsx decomposition (Phase 4 Stage 4).
  readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8"),
]);

test("the player-facing coach brief retains Honest Coach interpreted deck truths", () => {
  // Player Surface Law: default brief is Verdict → Why → Change (not the
  // older "WHY THIS DECK WINS / WATCH THIS FIRST" grid labels).
  assert.match(workbenchChamber, /honest-coach-v0/);
  assert.match(workbenchChamber, /YOUR COACH/);
  assert.match(workbenchChamber, /honest-coach-brief-stream/);
  assert.match(workbenchChamber, />\s*VERDICT\s*</);
  assert.match(workbenchChamber, /WHY · OPENING PRIORITIES|CHANGE/);
  assert.match(masterworksChamber, /commissionContract|1 · I HEARD YOU/);
  assert.match(css, /Player-facing coaching is a brief/);
  assert.match(css, /coach-brief/);
  assert.match(css, /honest-coach-brief-stream|coach-deck-sequence/);
});

test("the coach brief separates the watchpoint and stays responsive", () => {
  assert.match(css, /coach-brief-watch/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
