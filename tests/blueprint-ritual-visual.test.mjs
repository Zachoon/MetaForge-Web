import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/operation-reforge.css", import.meta.url), "utf8");

test("the condensed builder keeps the Forge visual language", () => {
  assert.match(commission, /commission-chamber-sweep/);
  assert.match(commission, /commander-search-portal/);
  assert.match(css, /build-path-scratch/);
  assert.match(css, /scratch-card-search/);
});
