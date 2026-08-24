import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
// The review-focus picker, commission-note field, and awaken-button all
// moved to the commission/refine chamber's own component during the
// page.tsx decomposition (Phase 4 Stage 3).
const commissionChamber = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

// Exactly one Review-path Academy escape hatch in the review-focus picker,
// plus the site footer legal/nav Academy link. The product decision was
// "not a permanent Forge-chamber nav item" — footer does not violate that.
test("the review-focus picker still carries the Academy escape hatch, and no Forge-chamber deep-links a specific guide", () => {
  const pickerBlock = commissionChamber.match(/<div className="review-focus-picker">[\s\S]*?<\/div>\s*<label className="commission-note">/)?.[0];
  assert.ok(pickerBlock, "expected to find the review-focus-picker block");
  assert.match(pickerBlock, /href="\/academy"/, "the escape hatch must live inside the review-focus picker");
  assert.match(pickerBlock, /browse the guides/i);
  assert.doesNotMatch(page, /href="\/academy\/[a-z-]+"/, "must never deep-link to a specific guide from in-app — that's the index's job");
  assert.doesNotMatch(commissionChamber, /href="\/academy\/[a-z-]+"/, "must never deep-link to a specific guide from in-app — that's the index's job");
});

test("the link reads as an escape hatch, not a navigation label", () => {
  assert.match(commissionChamber, /Not sure what the problem is\?|browse the guides/i);
});

test("the Build\\/commission path never shows the Academy link — it's Review-only by design", () => {
  const commissionBlock = commissionChamber.match(/\) : \(\s*<label className="commission-note">[\s\S]*?<\/label>\s*\)\}/)?.[0];
  assert.ok(commissionBlock, "expected to find the commission-only (non-refine) branch of the chamber JSX to check — this test's own regex may need updating if the surrounding markup changed");
  assert.doesNotMatch(commissionBlock, /academy/i);
});

test("reviewFocus remains ordinary, editable UI state after being preselected — the chip toggle and awaken-button gating are unaware of the Academy entry point", () => {
  assert.match(commissionChamber, /onClick=\{\(\) => setReviewFocus\(\(current\) => toggleReviewFocus\(current, option\)\)\}/);
  const block = commissionChamber.match(/className="awaken-button"[\s\S]*?onClick=\{awaken\}/);
  assert.ok(block, "expected to find the awaken-button disabled condition");
  assert.doesNotMatch(block[0], /reviewFocus/);
});
