import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ledger = fs.readFileSync(new URL("../app/story-bench-recommendation-ledger.mjs", import.meta.url), "utf8");
// recordMatch (the match-recording handler) moved to forge-session-context.tsx
// during the page.tsx decomposition (Phase 4 Stage 2).
const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("web match recording fingerprints the exact deck list before persistence", () => {
  assert.match(forgeSessionContext, /await deckFingerprint\(parseDeckRows\(forgedDeck\)\)/);
  assert.match(forgeSessionContext, /deckFingerprint: activeFingerprint/);
  assert.match(forgeSessionContext, /persistStoryBench\(fingerprintedRevisions, next, "", undefined, nextMatches\)/);
});

test("Story Bench preserves exact identities and rejects cross-revision evidence", () => {
  assert.match(ledger, /normalized\.fingerprint \|\|/);
  assert.match(ledger, /match\.deckFingerprint === serializedFingerprint/);
  assert.match(ledger, /fingerprint:\s*revision\?\.fingerprint/s);
});
