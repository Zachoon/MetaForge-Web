import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// activeImage/inspectedImage/activeStructuralReport moved to
// forge-session-context.tsx during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
// The card-inspector/action-menu JSX moved to the workbench chamber's own
// component during the page.tsx decomposition (Phase 4 Stage 4).
const workbenchChamber = fs.readFileSync(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");

test("selected printing drives both the deck preview and contextual inspector image", () => {
  assert.match(forgeSessionContext, /const activeImage\s*=\s*activePrinting\?\.image\s*\|\|/);
  assert.match(forgeSessionContext, /const inspectedImage\s*=\s*inspectedPrinting\?\.image\s*\|\|/);
});

test("the dossier renders server-computed contextual card intelligence", () => {
  assert.match(forgeSessionContext, /activeStructuralReport\.cardEvaluations\.cards\.find/);
  assert.match(workbenchChamber, /Contextual deck scores/);
  assert.match(workbenchChamber, /\["Synergy", inspectedEvaluation\.scores\.synergy\]/);
  assert.match(workbenchChamber, /\["Plan fit", inspectedEvaluation\.scores\.planFit\]/);
  assert.match(workbenchChamber, /IF YOU CUT IT/);
  assert.match(workbenchChamber, /Detected role alternatives/);
  assert.match(workbenchChamber, /activeStructuralReport\.cardEvaluations\.methodology/);
});

test("deck rows open a keyboard-accessible action menu before the contextual inspector", () => {
  assert.match(workbenchChamber, /aria-haspopup="menu"/);
  assert.match(workbenchChamber, /setCardActionMenu\(\{/);
  assert.match(workbenchChamber, /role="menu"/);
  assert.match(workbenchChamber, /View card dossier/);
  assert.match(workbenchChamber, /Choose printing/);
  assert.match(workbenchChamber, /Mark one for replacement/);
  assert.match(workbenchChamber, /setInspectedCard\(cardActionMenu\.name\)/);
  assert.match(workbenchChamber, /role="dialog"/);
  assert.match(workbenchChamber, /ORACLE TEXT/);
  assert.match(workbenchChamber, /cardEvaluations\.methodology/);
});

test("a searched guided card still adds when the name is the click target", () => {
  const guided = fs.readFileSync(new URL("../app/components/forge/guided-build-chamber.tsx", import.meta.url), "utf8");
  const option = guided.slice(guided.indexOf('role="option"'), guided.indexOf("</button>", guided.indexOf('role="option"')));
  assert.match(option, /data-card-inspect="defer"/);
  assert.match(option, /data-card-name=\{card\.name\}/);
  assert.match(option, /addGuidedManualCard\(card\.raw\)/);
});

test("the free-build decklist names each card so hover and tap open the shared inspector", () => {
  const freeDecklist = fs.readFileSync(new URL("../app/components/forge/free-decklist.tsx", import.meta.url), "utf8");
  assert.match(freeDecklist, /<img data-card-name=\{entry\.name\} src=\{entry\.image \|\| cardImage\(entry\.name\)\}/);
  assert.match(freeDecklist, /<strong data-card-name=\{entry\.name\}>/);
  assert.match(freeDecklist, /<img data-card-name=\{selectedCommander\.name\}/);
  assert.match(freeDecklist, /<strong data-card-name=\{selectedCommander\.name\}>/);
  assert.match(freeDecklist, /<img data-card-name=\{ghost\.face\.name\}/);
  assert.match(freeDecklist, /<strong data-card-name=\{ghost\.face\.name\}>/);
  assert.doesNotMatch(freeDecklist, /data-card-inspect="defer"/);
  assert.doesNotMatch(freeDecklist, /className="free-remove"[^>]*data-card-name/);
});

test("deck rows preview naturally while click remains an intentional inspection action", () => {
  const rowBlock = workbenchChamber.match(/role="button"[\s\S]*?className=\{\[[\s\S]*?\.join\(" "\)\}/)?.[0];
  assert.ok(rowBlock, "expected to find the interactive deck-row block");
  assert.match(rowBlock, /onMouseEnter=\{\(\) => scheduleDeckHover\(row\.name\)\}/);
  assert.match(rowBlock, /onFocus=\{\(\) => setHoveredCard\(row\.name\)\}/);
  assert.match(rowBlock, /onClick=\{\(\) => \{\s*setHoveredCard\(row\.name\);[\s\S]*?setInspectedCard\(row\.name\)/);
  assert.match(rowBlock, /if \(canSelectForRefill\)/, "multi-select mode may deliberately select a row without opening its action menu");
});
