import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css, workbenchChamber] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  // The post-accept-choice preservation JSX moved to the workbench
  // chamber's own component during the page.tsx decomposition (Phase 4
  // Stage 4).
  readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8"),
]);

test("a tested revision retains a deliberate preservation action", () => {
  assert.doesNotMatch(page, /className="forge-path"/);
  assert.match(workbenchChamber, /This Is The One — Save as Finished Deck/);
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
