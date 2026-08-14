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

test("post-ceremony result pages do not keep a fire atmosphere that shoves the decklist down", async () => {
  const page = await read("app/page.tsx");
  const css = await read("app/forge-descent.css");
  const frame = await read("app/site-frame.css");
  assert.doesNotMatch(page, /forge-descent-atmosphere/);
  assert.match(page, /chamber === "forging" && \(/);
  assert.match(css, /pointer-events:none/);
  assert.doesNotMatch(css, /molten-metal-cc0\.jpg/);
  assert.match(frame, /\.forge-descent-atmosphere,/);
});
