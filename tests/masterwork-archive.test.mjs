import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("finishing a Masterwork is a distinct, reversible action from delete", () => {
  assert.match(page, /import \{ updateFamily, [^}]*\} from "\.\/deck-bench\.mjs";/);
  assert.match(page, /async function setFamilyArchived/);
  assert.match(page, /updateFamily\(\s*\{ schemaVersion: 1, families: data\.bench\?\.families \|\| \[\] \},\s*id,\s*archived \? "archive" : "restore"/);
  // deleteSavedMasterwork must remain a real, separate hard delete.
  assert.match(page, /async function deleteSavedMasterwork[\s\S]{0,900}filter\(\s*\(family: SavedFamily\) => family\.id !== id/);
  assert.doesNotMatch(page, /deleteSavedMasterwork[\s\S]{0,200}updateFamily/);
});

test("a permanent delete asks for confirmation once it's a single click from the bench dock", () => {
  assert.match(page, /window\.confirm\(`Delete "\$\{family\.name\}" permanently\? This can't be undone\.`\)/);
});

test("a save never silently un-finishes an already-archived Masterwork", () => {
  assert.match(page, /existingFamily = \(bench\.families \|\| \[\]\)\.find/);
  assert.match(page, /archived: existingFamily\?\.archived \?\? false/);
  assert.doesNotMatch(page, /archived: false,\s*\n\s*promotedFingerprint: `story-/);
});

test("the workbench offers a keep-or-refine decision on the open deck", () => {
  assert.match(page, /Preserve as Finished Masterwork/);
  assert.match(page, /Return to the Forge/);
  assert.match(page, /currentFamilyArchived = Boolean/);
});

test("saved decks are typed for their archived status instead of left implicit", () => {
  assert.match(page, /type SavedFamily = \{[\s\S]{0,700}archived\?: boolean/);
});

test("wires the pending Story Bench recommendation ledger into save and restore", () => {
  assert.match(
    page,
    /import \{ prepareStoryBenchRevisions, serializeStoryBenchRevision, restoreStoryBenchRevisions \} from "\.\/story-bench-recommendation-ledger\.mjs";/,
  );
  assert.match(page, /prepareStoryBenchRevisions\(nextRevisions\)/);
  assert.match(page, /serializeStoryBenchRevision\(revision/);
  assert.match(page, /restoreStoryBenchRevisions\(family\.revisions\)/);
  // The recommendationRecord the native engine already computes must reach
  // the revision instead of being discarded, as it was before this batch.
  assert.match(page, /recommendationRecord: nativeReport\.recommendationRecord \|\| null/);
});
