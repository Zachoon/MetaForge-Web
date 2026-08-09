import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("multi-slot experiments expose a real card-selection mode directly in the deck", () => {
  assert.match(source, /multiRefillSelecting/);
  assert.match(source, /Choose cards to replace/);
  assert.match(source, /card-row-refill-toggle/);
  assert.match(source, /aria-pressed=\{refillSelected\}/);
  assert.match(source, /else next\[row\.name\] = row\.quantity/);
});

test("selected cards become one explicit multi-refill request and remain excluded", () => {
  assert.match(source, /cuts: Object\.entries\(refillCuts\)/);
  assert.match(source, /Compare replacement groups/);
  assert.match(source, /Selected cards will stay out of every suggested replacement group/);
  assert.match(source, /applyMultiRefillPackage/);
});

test("player-facing intelligence labels avoid the engine's node and bottleneck jargon", () => {
  assert.match(source, /CARDS THIS PLAN LEANS ON/);
  assert.match(source, /JOBS WITH TOO FEW BACKUPS/);
  assert.doesNotMatch(source, /<small>CRITICAL NODES<\/small>/);
  assert.doesNotMatch(source, /<small>BOTTLENECKS<\/small>/);
  assert.doesNotMatch(source, /footprint kept/);
});
