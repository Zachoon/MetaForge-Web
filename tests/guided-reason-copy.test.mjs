import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORY_SEQUENCE } from "../app/category-budget-ledger.mjs";
import { GUIDED_CATEGORY_COPY, describeGuidedReason, describeLedgerRow, guidedCategoryLabel } from "../app/guided-reason-copy.mjs";

test("every category in the fixed sequence has player-facing copy", () => {
  for (const category of CATEGORY_SEQUENCE) {
    assert.ok(GUIDED_CATEGORY_COPY[category]?.label, `missing label for ${category}`);
    assert.ok(GUIDED_CATEGORY_COPY[category]?.blurb, `missing blurb for ${category}`);
  }
  assert.equal(guidedCategoryLabel("draw"), "Card draw");
  assert.equal(guidedCategoryLabel("unknown"), "unknown");
});

test("describeGuidedReason turns real deficit tags into plain sentences", () => {
  const text = describeGuidedReason({
    deficitsFilled: ["role:ramp", "curve:2", "package_core:auras"],
    topPositive: { kind: "package_core", key: "auras" },
    nearestAlternative: { name: "Arcane Signet", margin: 4.2 },
  }, "Sol Ring");
  assert.match(text, /^Sol Ring fills a real ramp gap, fills an open spot at 2 mana, and is a core piece of your auras shell\./);
  assert.match(text, /edged out Arcane Signet/);
});

test("describeGuidedReason falls back honestly when no deficit was filled", () => {
  const text = describeGuidedReason({ deficitsFilled: [], topPositive: null, nearestAlternative: null }, "Opt");
  assert.equal(text, "Opt is the best fit for this slot given what you've picked so far.");
  assert.equal(describeGuidedReason(null), "");
});

test("a tie or zero margin never claims the card beat its alternative", () => {
  const text = describeGuidedReason({ deficitsFilled: ["role:draw"], topPositive: null, nearestAlternative: { name: "Other", margin: 0 } }, "Card");
  assert.doesNotMatch(text, /edged out/);
});

test("describeLedgerRow is informational for every status, never blocking language", () => {
  assert.match(describeLedgerRow({ actual: 3, status: "under", target: { min: 8, max: 12 } }), /room for 5 more/);
  assert.match(describeLedgerRow({ actual: 9, status: "in-range", target: { min: 8, max: 12 } }), /right in range/);
  assert.match(describeLedgerRow({ actual: 14, status: "over", target: { min: 8, max: 12 } }), /less room for other things/);
  assert.equal(describeLedgerRow({ actual: 4, status: "no-target", target: null }), "4 picked");
  for (const status of ["under", "in-range", "over", "no-target"]) {
    assert.doesNotMatch(describeLedgerRow({ actual: 1, status, target: status === "no-target" ? null : { min: 2, max: 3 } }), /must|can't|cannot|not allowed/i);
  }
});
