import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("Chapter III turns four real deck truths into a machine schematic", () => {
  assert.match(page, /CHAPTER III · UNDERSTAND THE MASTERWORK/);
  assert.match(page, /LEGALITY/);
  assert.match(page, /OPENING HANDS/);
  assert.match(page, /STRONGEST MACHINE/);
  assert.match(page, /WATCH FIRST/);
  assert.match(css, /Chapter III machine schematic/);
  assert.match(css, /counter-reset:machine-node/);
  assert.match(css, /content:"LIVE STRUCTURAL READ"/);
});

test("the schematic separates the watchpoint and stays responsive and motion-safe", () => {
  assert.match(css, />span:last-child:before/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /machine-current-pulse/);
});
