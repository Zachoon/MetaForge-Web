import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/site-frame.css", import.meta.url), "utf8");
const mobile = css.slice(css.indexOf("@media(max-width:760px)"));

test("mobile Explore keeps the framed shell but scrolls the entrance pane", () => {
  assert.match(mobile, /\.chamber-entrance>\.forge-entrance\{[^}]*overflow-y:\s*auto\s*!important/s);
  assert.match(mobile, /\.chamber-entrance>\.forge-entrance\{[^}]*inset:var\(--mf-frame-top\) 0 var\(--mf-frame-rail\)\s*!important/s);
  assert.match(mobile, /\.great-forge\.chamber-entrance,\.great-forge\.chamber-archive\{[^}]*overflow:\s*hidden\s*!important/s);
  assert.doesNotMatch(
    mobile,
    /\.chamber-entrance>\.forge-entrance\{[^}]*overflow(?:-y)?:\s*hidden\s*!important/s,
  );
});

test("mobile workspace docks sit above the bottom rail instead of covering it", () => {
  assert.match(mobile, /\.deck-price-bar\{bottom:var\(--mf-frame-rail\)\s*!important/);
  assert.match(mobile, /\.living-workbench-modes\{bottom:calc\(var\(--mf-frame-rail\) \+ 8px\)\s*!important/);
});
