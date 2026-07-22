import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const start = page.indexOf("async function inspectMasterwork");
const end = page.indexOf("function openSavedMasterwork", start);
const generation = page.slice(start, end);

test("Masterwork selection uses the native engine instead of a model endpoint", () => {
  assert.match(generation, /forgeNativeMasterwork/);
  assert.doesNotMatch(generation, /api\/forge\/chat/);
  assert.doesNotMatch(generation, /task:\s*["']deck_generation/);
});

test("native forging exposes visible elapsed progress and moving stages", () => {
  assert.match(page, /forgeElapsedSeconds/);
  assert.match(page, /METAFORGE NATIVE ENGINE/);
  assert.match(page, /Forging three competing candidates/);
  assert.match(page, /role="status"/);
});

test("native forging explains the tournament verdict and bounded tradeoff", () => {
  assert.match(generation, /selected\.tournament\.reason/);
  assert.match(generation, /tradeoff frontier/);
  assert.match(generation, /reasoning\.boundary/);
});

test("native forging exposes bounded counterfactual reasoning", () => {
  assert.match(generation, /nativeReport\.reasoning\.summary/);
  assert.match(generation, /nativeReport\.reasoning\.boundary/);
});

test("native forging exposes the exact one-slot laboratory verdict", () => {
  assert.match(generation, /nativeReport\.laboratory\.summary/);
  assert.match(generation, /nativeReport\.laboratory\.contract/);
  assert.match(generation, /nativeReport\.laboratory\.boundary/);
});

test("Blueprint offers a persistent player-controlled reading size", () => {
  assert.match(page, /metaforge\.readingSize/);
  assert.match(page, /reading-\$\{readingSize\}/);
  assert.match(page, /Use \$\{size\} text/);
});

test("initial Blueprint choices explain game terms before submission", () => {
  assert.match(page, /BLUEPRINT_DEFINITIONS/);
  assert.match(page, /blueprint-glossary-tip/);
  assert.match(page, /blueprint-choice-definition/);
  assert.match(page, /aria-describedby="strategy-definition"/);
  assert.match(page, /Trade resources, answer key threats/i);
});
