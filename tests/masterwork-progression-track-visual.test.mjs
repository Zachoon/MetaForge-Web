import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the revealed Masterwork uses clear workspace destinations", () => {
  // The Aug 14 Masterwork frame replaced Living Workbench's Deck/Tune/Test
  // rail with the global site rail: Decklist (chapter 1), Analysis
  // (chapter 2), and Playtest (the goldfish tabletop).
  assert.match(page, /<aside className="forge-global-rail" aria-label="Site navigation">/);
  assert.match(page, /setActiveForgeChapter\(1\);[^\n]*<span>Decklist<\/span>/);
  assert.match(page, /setActiveForgeChapter\(2\);[^\n]*<span>Analysis<\/span>/);
  assert.match(page, /setDeckViewMode\("playtest"\);[^\n]*<span>Playtest<\/span>/);
  assert.doesNotMatch(page, /<LivingWorkbench/);
  assert.doesNotMatch(page, /Masterwork journey chapters/);
  assert.match(css, /Living Masterwork progression|living-workbench|workspace-mode-tabs/);
  assert.match(css, /masterwork-deck-unveil|living-workbench/);
});

test("completed chapters and the current handoff remain accessible and motion-safe", () => {
  assert.match(css, /\.workspace-mode-tabs\{grid-template-columns:repeat\(3|living-workbench-modes/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
