import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
// SavedFamily moved to forge-types.ts during the page.tsx decomposition
// setFamilyArchived/deleteSavedMasterwork/currentFamilyArchived/story-bench
// wiring moved to forge-session-context.tsx during the page.tsx
// decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
// (Phase 4).
const forgeTypes = fs.readFileSync(new URL("../app/forge-types.ts", import.meta.url), "utf8");

test("finishing a Masterwork is a distinct, reversible action from delete", () => {
  assert.match(page, /import \{ updateFamily, [^}]*\} from "\.\/deck-bench\.mjs";/);
  assert.match(forgeSessionContext, /async function setFamilyArchived/);
  assert.match(forgeSessionContext, /updateFamily\(\s*\{ schemaVersion: 1, families: data\.bench\?\.families \|\| \[\] \},\s*id,\s*archived \? "archive" : "restore"/);
  // deleteSavedMasterwork must remain a real, separate hard delete.
  assert.match(forgeSessionContext, /async function deleteSavedMasterwork[\s\S]{0,900}filter\(\s*\(family: SavedFamily\) => family\.id !== id/);
  assert.doesNotMatch(page, /deleteSavedMasterwork[\s\S]{0,200}updateFamily/);
});

test("a permanent delete asks for confirmation once it's a single click from the bench dock", () => {
  assert.match(forgeSessionContext, /window\.confirm\(`Delete "\$\{family\.name\}" permanently\? This can't be undone\.`\)/);
});

test("a save never silently un-finishes an already-archived Masterwork", () => {
  assert.match(forgeSessionContext, /existingFamily = \(bench\.families \|\| \[\]\)\.find/);
  assert.match(forgeSessionContext, /archived: existingFamily\?\.archived \?\? false/);
  assert.doesNotMatch(page, /archived: false,\s*\n\s*promotedFingerprint: `story-/);
});

test("the workbench offers a keep-or-refine decision on the open deck", () => {
  assert.match(page, /Save as Finished Deck/);
  assert.match(page, /Return to the Forge/);
  assert.match(forgeSessionContext, /currentFamilyArchived = Boolean/);
});

test("saved decks are typed for their archived status instead of left implicit", () => {
  assert.match(forgeTypes, /type SavedFamily = \{[\s\S]{0,700}archived\?: boolean/);
});

test("wires the pending Story Bench recommendation ledger into save and restore", () => {
  assert.match(
    page,
    /import \{ prepareStoryBenchRevisions, serializeStoryBenchRevision, restoreStoryBenchRevisions \} from "\.\/story-bench-recommendation-ledger\.mjs";/,
  );
  assert.match(forgeSessionContext, /prepareStoryBenchRevisions\(nextRevisions\)/);
  assert.match(forgeSessionContext, /serializeStoryBenchRevision\(revision/);
  assert.match(forgeSessionContext, /restoreStoryBenchRevisions\(family\.revisions\)/);
  // The recommendationRecord the native engine already computes must reach
  // the revision instead of being discarded, as it was before this batch.
  assert.match(forgeSessionContext, /recommendationRecord: nativeReport\.recommendationRecord \|\| null/);
});
