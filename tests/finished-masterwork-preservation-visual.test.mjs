import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("a tested revision retains a deliberate preservation action", () => {
  assert.doesNotMatch(page, /className="forge-path"/);
  assert.match(page, /This Is The One — Preserve as Finished Masterwork/);
  assert.match(css, /Finished Masterwork preservation/);
  assert.match(css, /READY TO SEAL/);
  assert.match(css, /MASTERWORK PRESERVED/);
  assert.match(css, /REVISION FORGED/);
});

test("the preservation ritual distinguishes active and complete states accessibly", () => {
  assert.match(css, /:has\(li:last-child\.active\)/);
  assert.match(css, /:has\(li:last-child\.complete\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
