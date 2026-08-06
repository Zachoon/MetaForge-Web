import assert from "node:assert/strict";
import test from "node:test";
import { resolveAcademyGuideEntry } from "../app/academy-guide-entry.mjs";
import { REVIEW_FOCUS_OPTIONS } from "../app/review-focus.mjs";

test("the public guide key 'cast-spells' resolves to the refine chamber with the canonical More consistency focus", () => {
  const entry = resolveAcademyGuideEntry("cast-spells");
  assert.deepEqual(entry, { chamber: "refine", reviewFocus: "More consistency" });
});

test("the resolved reviewFocus is always one of the six canonical values — never an ad hoc duplicate string", () => {
  const entry = resolveAcademyGuideEntry("cast-spells");
  assert.ok(REVIEW_FOCUS_OPTIONS.includes(entry.reviewFocus));
});

test("unknown, empty, and malformed keys are all ignored safely, never thrown", () => {
  assert.equal(resolveAcademyGuideEntry("does-not-exist"), null);
  assert.equal(resolveAcademyGuideEntry(""), null);
  assert.equal(resolveAcademyGuideEntry(undefined), null);
  assert.equal(resolveAcademyGuideEntry(null), null);
  assert.equal(resolveAcademyGuideEntry(123), null);
  assert.equal(resolveAcademyGuideEntry({}), null);
});

test("canonical reviewFocus strings themselves are never accepted as a public guide key — the whole point is that they're not the same namespace", () => {
  // A guide key must never accidentally be the same string as a canonical
  // reviewFocus value — the public URL vocabulary and the internal engine
  // vocabulary are deliberately disjoint.
  assert.equal(resolveAcademyGuideEntry("More consistency"), null);
});

test("the module never exports the raw entry map directly — resolveAcademyGuideEntry is the only way in", async () => {
  const module = await import("../app/academy-guide-entry.mjs");
  assert.deepEqual(Object.keys(module).sort(), ["resolveAcademyGuideEntry"]);
});
