import assert from "node:assert/strict";
import test from "node:test";
import { STRATEGIC_PACKAGE_IDS } from "../app/strategic-intent.mjs";
import { SHELL_COPY, shellDisplay } from "../app/shell-copy.mjs";

test("every shell the picker can ever offer has a player-facing name and description", () => {
  for (const id of STRATEGIC_PACKAGE_IDS) {
    assert.ok(SHELL_COPY[id]?.name, `missing shell name for ${id}`);
    assert.ok(SHELL_COPY[id]?.blurb?.length > 15, `missing shell blurb for ${id}`);
  }
});

test("no copy exists for a shell that isn't in the catalog (stale entries)", () => {
  for (const id of Object.keys(SHELL_COPY)) assert.ok(STRATEGIC_PACKAGE_IDS.includes(id), `${id} is not a real shell`);
});

test("copy never leaks internal jargon", () => {
  for (const [id, copy] of Object.entries(SHELL_COPY)) {
    assert.doesNotMatch(`${copy.name} ${copy.blurb}`, /\bpackage\b|\bcoreMin\b|\bsemantic|\bfalse.friend/i, `${id} uses internal wording`);
  }
});

test("shellDisplay falls back to a de-jargoned catalog label for an unknown id", () => {
  assert.deepEqual(shellDisplay({ id: "typal" }), { name: "Tribal", blurb: SHELL_COPY.typal.blurb });
  assert.deepEqual(shellDisplay({ id: "brand_new", label: "Brand-new package" }), { name: "Brand-new", blurb: "" });
});
