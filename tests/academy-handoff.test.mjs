import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// No component-render harness exists in this repo, so the ?guide= mount
// effect's lifecycle is verified against the literal source that produces
// it — the same convention tests/guest-forge-boundary.test.mjs and
// tests/review-focus.test.mjs already use for page.tsx.
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const effectBlock = page.match(/\/\/ Academy guide handoff[\s\S]*?\}, \[\]\);/)?.[0];

test("the Academy handoff effect exists and imports the resolver from the one allowlist module", () => {
  assert.ok(effectBlock, "expected to find the Academy guide handoff effect");
  assert.match(page, /import \{ resolveAcademyGuideEntry \} from "\.\/academy-guide-entry\.mjs";/);
});

test("reads the public ?guide= param, never a canonical reviewFocus value directly off the URL", () => {
  assert.match(effectBlock, /URLSearchParams\(window\.location\.search\)\.get\("guide"\)/);
  assert.doesNotMatch(effectBlock, /\.get\("focus"\)/);
});

test("scrubs the query string via replaceState — even for an unknown key — so a later reload can never reapply it", () => {
  assert.match(effectBlock, /window\.history\.replaceState\(\{\}, "", window\.location\.pathname\)/);
  // The replaceState call happens before the null-entry early return, so it
  // runs unconditionally whenever a ?guide= param was present at all —
  // confirmed by its position relative to resolveAcademyGuideEntry below.
  const replaceIndex = effectBlock.indexOf("window.history.replaceState");
  const resolveIndex = effectBlock.indexOf("resolveAcademyGuideEntry(guideKey)");
  assert.ok(replaceIndex > 0 && resolveIndex > replaceIndex, "replaceState must run before the resolved entry is even checked");
});

test("an unresolved (unknown) guide key is ignored safely — no chamber or reviewFocus change", () => {
  assert.match(effectBlock, /if \(!entry\) return;/);
});

test("never overwrites an in-progress session: guards on the entrance chamber, an empty deck, and no focus already chosen", () => {
  assert.match(effectBlock, /if \(chamber !== "entrance" \|\| deck\.trim\(\) \|\| reviewFocus\) return;/);
});

test("applies the resolved entry through the exact same state setters the entrance UI itself uses — never a special-cased path", () => {
  assert.match(effectBlock, /setChamber\(entry\.chamber\);/);
  assert.match(effectBlock, /setReviewFocus\(entry\.reviewFocus\);/);
});

test("the effect never calls a generation/submit function — applying a guide entry must not auto-submit", () => {
  const forbidden = [/commitDirectForge/, /callForgeGenerate/, /inspectMasterwork/, /awaken\(/];
  for (const pattern of forbidden) {
    assert.doesNotMatch(effectBlock, pattern, `the handoff effect must never call ${pattern}`);
  }
});

test("reviewFocus remains ordinary, editable UI state after being preselected — the chip toggle and awaken-button gating are unaware of the Academy entry point", () => {
  // Re-confirms two invariants tests/review-focus.test.mjs already pins for
  // reviewFocus in general — restated here because the Academy handoff is
  // exactly the scenario that would motivate someone to special-case them:
  // a chip set by the handoff effect must still be a plain, clickable,
  // optional selection, not a locked-in choice.
  assert.match(page, /onClick=\{\(\) => setReviewFocus\(\(current\) => toggleReviewFocus\(current, option\)\)\}/);
  const block = page.match(/className="awaken-button"[\s\S]*?onClick=\{awaken\}/);
  assert.ok(block, "expected to find the awaken-button disabled condition");
  assert.doesNotMatch(block[0], /reviewFocus/);
});
