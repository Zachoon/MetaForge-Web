import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
// activeImage/inspectedImage/activeStructuralReport moved to
// forge-session-context.tsx during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("selected printing drives both the deck preview and contextual inspector image", () => {
  assert.match(forgeSessionContext, /const activeImage\s*=\s*activePrinting\?\.image\s*\|\|/);
  assert.match(forgeSessionContext, /const inspectedImage\s*=\s*inspectedPrinting\?\.image\s*\|\|/);
});

test("the dossier renders server-computed contextual card intelligence", () => {
  assert.match(forgeSessionContext, /activeStructuralReport\.cardEvaluations\.cards\.find/);
  assert.match(page, /Contextual deck scores/);
  assert.match(page, /\["Synergy", inspectedEvaluation\.scores\.synergy\]/);
  assert.match(page, /\["Plan fit", inspectedEvaluation\.scores\.planFit\]/);
  assert.match(page, /IF YOU CUT IT/);
  assert.match(page, /Detected role alternatives/);
  assert.match(page, /activeStructuralReport\.cardEvaluations\.methodology/);
});

test("deck rows open a keyboard-accessible action menu before the contextual inspector", () => {
  assert.match(page, /aria-haspopup="menu"/);
  assert.match(page, /setCardActionMenu\(\{/);
  assert.match(page, /role="menu"/);
  assert.match(page, /View card dossier/);
  assert.match(page, /Choose printing/);
  assert.match(page, /Mark one for replacement/);
  assert.match(page, /setInspectedCard\(cardActionMenu\.name\)/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /ORACLE TEXT/);
  assert.match(page, /cardEvaluations\.methodology/);
});

test("deck rows preview naturally while click remains an intentional inspection action", () => {
  const rowBlock = page.match(/role="button"[\s\S]*?className=\{\[[\s\S]*?\.join\(" "\)\}/)?.[0];
  assert.ok(rowBlock, "expected to find the interactive deck-row block");
  assert.match(rowBlock, /onMouseEnter=\{\(\) => setHoveredCard\(row\.name\)\}/);
  assert.match(rowBlock, /onFocus=\{\(\) => setHoveredCard\(row\.name\)\}/);
  assert.match(rowBlock, /onClick=\{\(\) => \{\s*setHoveredCard\(row\.name\);[\s\S]*?setInspectedCard\(row\.name\)/);
  assert.match(rowBlock, /if \(canSelectForRefill\)/, "multi-select mode may deliberately select a row without opening its action menu");
});
