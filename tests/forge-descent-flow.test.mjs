import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the deck review is ordered immediately after the Living Workbench", async () => {
  const css = await read("app/forge-descent.css");
  assert.match(css, />\.living-workbench\{order:2\}/);
  assert.match(css, />\.testing-layout\{order:3\}/);
  assert.match(css, /display:flex;flex-direction:column/);
});

test("scroll depth drives a decorative, noninteractive forge atmosphere", async () => {
  const page = await read("app/page.tsx");
  const css = await read("app/forge-descent.css");
  assert.match(page, /--forge-depth/);
  assert.match(page, /requestAnimationFrame\(updateForgeDepth\)/);
  assert.match(page, /forge-descent-atmosphere/);
  assert.match(css, /pointer-events:none/);
  assert.doesNotMatch(css, /molten-metal-cc0\.jpg/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
