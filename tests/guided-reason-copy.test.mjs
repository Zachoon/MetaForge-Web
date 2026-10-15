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

test("describeGuidedReason names one or two reasons and compares only a same-role card", () => {
  const fromText = describeGuidedReason({
    summary: "makes Treasure whenever you cast an instant or sorcery, and scales with artifacts you control, without spending them",
    deficitsFilled: ["package_core:artifacts", "package_core:tokens", "commander_connection:artifacts"],
    topPositive: { kind: "package_core", key: "artifacts" },
    nearestAlternative: { name: "An Offer You Can't Refuse", margin: 4.2, sameRole: false, role: "interaction" },
  }, "Storm-Kiln Artist");
  assert.match(fromText, /makes Treasure whenever you cast an instant or sorcery/);
  assert.match(fromText, /scales with artifacts you control, without spending them/);
  assert.doesNotMatch(fromText, /shell/);
  assert.doesNotMatch(fromText, /An Offer You Can't Refuse/);

  const sameRole = describeGuidedReason({
    deficitsFilled: ["role:ramp", "curve:2", "package_core:auras", "package_core:tokens"],
    topPositive: { kind: "package_core", key: "auras" },
    nearestAlternative: { name: "Arcane Signet", margin: 4.2, sameRole: true, role: "ramp" },
  }, "Sol Ring");
  assert.match(sameRole, /^Sol Ring fills a real ramp gap and fills an open spot at 2 mana\./);
  assert.doesNotMatch(sameRole, /shell/);
  assert.match(sameRole, /edged out Arcane Signet/);
});

test("describeGuidedReason falls back honestly when no deficit was filled", () => {
  const text = describeGuidedReason({ deficitsFilled: [], topPositive: null, nearestAlternative: null }, "Opt");
  assert.equal(text, "Opt is the best fit for this slot given what you've picked so far.");
  assert.equal(describeGuidedReason(null), "");
});

test("a tie, a zero margin, or a different role never claims the card beat its alternative", () => {
  const tied = describeGuidedReason({ deficitsFilled: ["role:draw"], topPositive: null, nearestAlternative: { name: "Other", margin: 0, sameRole: true } }, "Card");
  assert.doesNotMatch(tied, /edged out/);
  const otherRole = describeGuidedReason({ deficitsFilled: ["role:ramp"], topPositive: null, nearestAlternative: { name: "Swords to Plowshares", margin: 3, sameRole: false } }, "Sol Ring");
  assert.doesNotMatch(otherRole, /edged out/);
  assert.doesNotMatch(otherRole, /Swords to Plowshares/);
});

test("describeLedgerRow is informational for every status, never blocking language", () => {
  assert.match(describeLedgerRow({ actual: 3, status: "under", target: { min: 8, max: 12 } }), /room for 5 more/);
  assert.match(describeLedgerRow({ actual: 9, status: "in-range", target: { min: 8, max: 12 } }), /right in range/);
  assert.match(describeLedgerRow({ actual: 14, status: "over", target: { min: 8, max: 12 } }), /less room for other things/);
  assert.equal(describeLedgerRow({ actual: 4, status: "no-target", target: null }), "4 picked");
  assert.equal(describeLedgerRow({ category: "winConditions", actual: 11, status: "no-target", target: null }), "11 threats among your picks");
  assert.equal(describeLedgerRow({ category: "winConditions", actual: 1, status: "no-target", target: null }), "1 threat among your picks");
  for (const status of ["under", "in-range", "over", "no-target"]) {
    assert.doesNotMatch(describeLedgerRow({ actual: 1, status, target: status === "no-target" ? null : { min: 2, max: 3 } }), /must|can't|cannot|not allowed/i);
  }
});
