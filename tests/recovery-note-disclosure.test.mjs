import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Phase 1D: the native engine has produced recoveryNote/recoveryStage since
// the construction recovery ladder shipped, and it already survives into
// the browser payload — but until now no component ever rendered it, so a
// player whose Budget conscious preference got relaxed to complete their
// deck was never told. Source-verified (no component-render harness exists
// in this repo — same convention as tests/workbench-error-state.test.mjs).

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
