import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, css] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
]);

test("the revealed Masterwork uses a living five-chapter progression track", () => {
  assert.match(page, /Masterwork journey chapters/);
  // The build-step navigation pass deliberately renamed the five chapter
  // buttons to plain language (Your deck / Improve / How it works /
  // Analysis / Playtest) — that's an intentional rebrand, not a
  // regression, so this no longer pins the old capitalized chapter
  // labels. It does still require the Forge identity to stay visibly
  // represented via a dedicated "The Masterwork" eyebrow above the rail,
  // and the old wording survives as in-context guide copy even though
  // it's no longer a chapter button label.
  assert.match(page, /The Masterwork/);
  assert.match(page, /Testing Anvil/);
  assert.match(page, /How it works/);
  assert.match(page, /Evidence Vault/);
  assert.match(css, /Living Masterwork progression/);
  assert.match(css, /counter-reset:forge-chapter/);
  assert.match(css, /masterwork-deck-unveil/);
});

test("completed chapters and the current handoff remain accessible and motion-safe", () => {
  assert.match(css, /:has\(>button:nth-child\(4\)\.active\)/);
  assert.match(css, /content:"✓"/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
