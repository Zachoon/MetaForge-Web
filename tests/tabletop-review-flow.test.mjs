import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the tabletop opens on a card-type deck review before goldfish hands", async () => {
  const source = await read("app/tabletop.tsx");
  assert.match(source, /useState<Lens>\("deck"\)/);
  assert.match(source, /STEP 1 · REVIEW YOUR DECK/);
  assert.match(source, /Next: goldfish opening hands/);
  assert.match(source, /STEP 2 · GOLDFISH YOUR OPENING SEVEN/);
  assert.match(source, /tabletopCardType/);
  assert.doesNotMatch(source, /type Lens = "packages"/);
});

test("mulligan decisions emit observation-only evidence", async () => {
  const source = await read("app/tabletop.tsx");
  const page = await read("app/page.tsx");
  assert.match(source, /onMulliganDecision\?\./);
  assert.match(page, /mulligan_coach_decision/);
  assert.match(page, /writesToBrain: false/);
});

test("deck review cards are larger on desktop and remain readable on mobile", async () => {
  const css = await read("app/tabletop.css");
  assert.match(css, /minmax\(96px,1fr\)/);
  assert.match(css, /flex:0 0 132px/);
  assert.match(css, /min-height:48px/);
});
