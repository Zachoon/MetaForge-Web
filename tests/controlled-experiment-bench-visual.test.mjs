import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [css, workbenchChamber] = await Promise.all([
  readFile(new URL("../app/testing-anvil.css", import.meta.url), "utf8"),
  // This bench's JSX moved to the workbench chamber's own component during
  // the page.tsx decomposition (Phase 4 Stage 4).
  readFile(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8"),
]);

test("Chapter II presents one pressure point and three controlled revisions", () => {
  assert.match(workbenchChamber, /DECK STRESS LAB · CONTROLLED TEST/);
  assert.match(workbenchChamber, /Show three one-card tests/);
  assert.match(workbenchChamber, /Create revision/);
  assert.match(css, /Chapter II experiment bench/);
  assert.match(css, /counter-reset:controlled-revision/);
  assert.match(css, /content:"CONTROLLED TEST"/);
});

test("the controlled experiment bench supports focus, small screens, and quiet motion", () => {
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /meta-breaker-workflow>button:after\{display:none\}/);
});

test("the one-card test explanation text is legible on its own, not only via the reading-size toggle", () => {
  // A reported real-world complaint: this text was a flat 11px with
  // line-height:1.4 and completely outside the --forge-reading-scale
  // system used elsewhere in the Blueprint chamber, so the font-size
  // toggle did nothing for it. It needs its own reasonable baseline
  // AND to respond to the toggle for players who bump it up further.
  const paragraphRule = css.match(/\.meta-breaker-workflow article p\{([^}]*)\}/);
  assert.ok(paragraphRule, "expected to find the one-card test paragraph rule");
  assert.match(paragraphRule[1], /line-height:1\.6/);
  assert.match(paragraphRule[1], /var\(--forge-reading-scale\)/);

  const headlineRule = css.match(/\.meta-breaker-workflow article b\{([^}]*)\}/);
  assert.ok(headlineRule);
  assert.match(headlineRule[1], /var\(--forge-reading-scale\)/);
});
