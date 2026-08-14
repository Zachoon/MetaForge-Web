import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the completed Forge resets to the beginning of the decision screen", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /if \(chamber !== "masterworks" \|\| !pendingCandidateChoice\) return/);
  assert.match(page, /window\.scrollTo\(0, 0\)/);
  assert.match(page, /requestAnimationFrame\(\(\) => window\.scrollTo\(0, 0\)\)/);
  assert.match(page, /id="masterwork-choice-start"/);
});

test("the recommended experience is explicitly first in the philosophy list", async () => {
  const compare = await read("app/components/forge/philosophy-compare.tsx");
  const recommended = compare.indexOf("philosophy-recommended-first");
  const alternatives = compare.indexOf("comparison.alternatives.length");
  assert.ok(recommended >= 0 && alternatives > recommended);
  assert.match(compare, /METAFORGE RECOMMENDS STARTING HERE/);
});
