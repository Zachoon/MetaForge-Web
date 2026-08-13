import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css, workbench] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  readFile(new URL("../app/living-workbench.tsx", import.meta.url), "utf8"),
]);

test("the revealed Masterwork uses three clear workspace destinations", () => {
  // Living Workbench owns the chapter rail (Deck / Tune / Test).
  assert.match(page, /<LivingWorkbench/);
  assert.match(workbench, /aria-label="Living Workbench"/);
  assert.match(workbench, /id="forge-chapter-rail"/);
  assert.match(workbench, /label: "Deck"/);
  assert.match(workbench, /label: "Tune"/);
  assert.match(workbench, /label: "Test"/);
  assert.doesNotMatch(page, /Masterwork journey chapters/);
  assert.match(css, /Living Masterwork progression|living-workbench|workspace-mode-tabs/);
  assert.match(css, /masterwork-deck-unveil|living-workbench/);
});

test("completed chapters and the current handoff remain accessible and motion-safe", () => {
  assert.match(css, /\.workspace-mode-tabs\{grid-template-columns:repeat\(3|living-workbench-modes/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
