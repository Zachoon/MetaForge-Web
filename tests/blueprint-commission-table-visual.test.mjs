import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/blueprint-commission-table.css", import.meta.url), "utf8");
const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("Blueprint uses a wide commission-table composition on desktop", () => {
  assert.match(globals, /blueprint-commission-table\.css/);
  assert.match(css, /grid-template-columns:minmax\(300px,.48fr\) minmax\(760px,1.52fr\)/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /YOUR BLUEPRINT/);
});

test("native Blueprint choices remain readable and layout collapses responsibly", () => {
  assert.match(css, /\.mark-grid select option\{background:#f2efe7;color:#101815/);
  assert.match(css, /\.mark-grid select option:checked\{background:#296b9e;color:#fff/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
});
