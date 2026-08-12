import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the player-facing coach brief retains Honest Coach interpreted deck truths", () => {
  assert.match(page, /honest-coach-v0/);
  assert.match(page, /WHY THIS DECK WINS/);
  assert.match(page, /HOW IT GETS STARTED|EARLY GAME/);
  assert.match(page, /WHEN IT BECOMES DANGEROUS/);
  assert.match(page, /WATCH THIS FIRST|WHAT CAN DERAIL IT/);
  assert.match(css, /Player-facing coaching is a brief/);
  assert.match(css, /coach-brief/);
  assert.match(css, /coach-deck-sequence/);
});

test("the coach brief separates the watchpoint and stays responsive", () => {
  assert.match(css, /coach-brief-watch/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
