import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
// The causality panels (critical-nodes / bottleneck labels) moved to
// /research with the rest of the Deep Forge vault.
const researchSource = await readFile(new URL("../app/research/page.tsx", import.meta.url), "utf8");
// forgeMultiRefill's request-building moved to forge-session-context.tsx
// during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("multi-slot experiments expose a real card-selection mode directly in the deck", () => {
  assert.match(source, /multiRefillSelecting/);
  assert.match(source, /Choose cards to replace/);
  assert.match(source, /card-row-refill-toggle/);
  assert.match(source, /aria-pressed=\{refillSelected\}/);
  assert.match(source, /else next\[row\.name\] = row\.quantity/);
});

test("selected cards become one explicit multi-refill request and remain excluded", () => {
  assert.match(forgeSessionContext, /cuts: Object\.entries\(refillCuts\)/);
  assert.match(source, /Compare replacement groups/);
  assert.match(source, /Selected cards will stay out of every suggested replacement group/);
  assert.match(source, /applyMultiRefillPackage/);
});

test("player-facing intelligence labels avoid the engine's node and bottleneck jargon", () => {
  assert.match(researchSource, /CARDS THIS PLAN LEANS ON/);
  assert.match(researchSource, /JOBS WITH TOO FEW BACKUPS/);
  assert.doesNotMatch(researchSource, /<small>CRITICAL NODES<\/small>/);
  assert.doesNotMatch(researchSource, /<small>BOTTLENECKS<\/small>/);
  assert.doesNotMatch(source, /footprint kept/);
});
