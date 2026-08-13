import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the player-facing coach brief retains Honest Coach interpreted deck truths", () => {
  // Player Surface Law: default brief is Verdict → Why → Change (not the
  // older "WHY THIS DECK WINS / WATCH THIS FIRST" grid labels).
  assert.match(page, /honest-coach-v0/);
  assert.match(page, /YOUR COACH/);
  assert.match(page, /honest-coach-brief-stream/);
  assert.match(page, />\s*VERDICT\s*</);
  assert.match(page, /WHY · OPENING PRIORITIES|CHANGE/);
  assert.match(page, /commissionContract|1 · I HEARD YOU/);
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
