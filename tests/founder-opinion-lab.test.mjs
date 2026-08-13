import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/founder/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/founder/founder.css", import.meta.url), "utf8");

test("Founder Opinion Lab exposes the complete player question contract", () => {
  assert.match(page, /Why is this card here—and should I keep it\?/);
  assert.match(page, /JOB IN CONTEXT/);
  assert.match(page, />Floor</);
  assert.match(page, />Ceiling</);
  assert.match(page, />Opportunity cost</);
  assert.match(page, /Strongest objection/);
  assert.match(page, /What changes the opinion/);
  assert.match(page, /Next test/);
  assert.match(page, /\/api\/coach\/opinion/);
  assert.match(page, /opinionKey:question\.opinionKey/);
});

test("Founder Opinion Lab states authority boundaries and has responsive layout", () => {
  assert.match(page, /CALLERS CANNOT SUBMIT CLAIMS/);
  assert.match(page, /FIXTURES ARE NOT LIVE TRUTH/);
  assert.match(page, /WRITES TO BRAIN: FALSE/);
  assert.match(css, /\.opinion-context-grid/);
  assert.match(css, /@media\(max-width:980px\).*opinion-context-grid\{grid-template-columns:1fr\}/s);
});
