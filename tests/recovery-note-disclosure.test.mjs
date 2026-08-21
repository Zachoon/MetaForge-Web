import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Phase 1D: the native engine has produced recoveryNote/recoveryStage since
// the construction recovery ladder shipped, and page.tsx has rendered it
// since Phase 1D — but worker/forge-generation-store.ts's client-payload
// whitelist never actually forwarded the field (fixed in Founder #034), so
// the disclosure was dead in production the whole time despite this file's
// own source-text checks passing. Source-verified here (no component-render
// harness exists in this repo — same convention as
// tests/workbench-error-state.test.mjs); the real end-to-end proof that the
// field survives the trip from the engine to the browser lives in
// tests/forge-generation-store.test.mjs instead — source-text matching
// alone can never catch a silent server-side field drop like that one.

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("the recovery disclosure renders whenever the delivered candidate carries a recoveryNote", () => {
  assert.match(page, /nativeMasterworkContext\?\.selected\?\.recoveryNote && \(/);
});

test("the disclosure renders the engine's own recoveryNote verbatim — no invented wording", () => {
  const block = page.match(/\{nativeMasterworkContext\?\.selected\?\.recoveryNote && \([\s\S]*?<\/span>\s*\)\}/)?.[0];
  assert.ok(block, "expected the recoveryNote disclosure block");
  assert.match(block, /<em>\{nativeMasterworkContext\.selected\.recoveryNote\}<\/em>/);
});

test("the disclosure sits with the other honest secondary notices (slot-justification), not inline with primary coaching content", () => {
  const block = page.match(/\{nativeMasterworkContext\?\.selected\?\.recoveryNote && \([\s\S]*?<\/span>\s*\)\}/)?.[0];
  assert.ok(block, "expected the recoveryNote disclosure block");
  assert.match(block, /className="slot-justification"/, "must reuse the existing honest-disclosure style, not a new one-off");
});

test("the budget-repair and power-repair disclosures render the engine's own notes verbatim, in the same honest-disclosure style", () => {
  const budgetBlock = page.match(/\{nativeMasterworkContext\?\.selected\?\.budgetRepairNote && \([\s\S]*?<\/span>\s*\)\}/)?.[0];
  assert.ok(budgetBlock, "expected the budgetRepairNote disclosure block");
  assert.match(budgetBlock, /<em>\{nativeMasterworkContext\.selected\.budgetRepairNote\}<\/em>/);
  assert.match(budgetBlock, /className="slot-justification"/);

  const powerBlock = page.match(/\{nativeMasterworkContext\?\.selected\?\.powerRepairNote && \([\s\S]*?<\/span>\s*\)\}/)?.[0];
  assert.ok(powerBlock, "expected the powerRepairNote disclosure block");
  assert.match(powerBlock, /<em>\{nativeMasterworkContext\.selected\.powerRepairNote\}<\/em>/);
  assert.match(powerBlock, /className="slot-justification"/);
});
