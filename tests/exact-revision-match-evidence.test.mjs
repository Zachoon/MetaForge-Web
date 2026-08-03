import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const ledger = fs.readFileSync(new URL("../app/story-bench-recommendation-ledger.mjs", import.meta.url), "utf8");

test("web match recording fingerprints the exact deck list before persistence", () => {
  assert.match(page, /await deckFingerprint\(parseDeckRows\(forgedDeck\)\)/);
  assert.match(page, /deckFingerprint: activeFingerprint/);
  assert.match(page, /persistStoryBench\(fingerprintedRevisions, next, "", undefined, nextMatches\)/);
});

test("Story Bench preserves exact identities and rejects cross-revision evidence", () => {
  assert.match(ledger, /normalized\.fingerprint \|\|/);
  assert.match(ledger, /match\.deckFingerprint === serializedFingerprint/);
  assert.match(ledger, /fingerprint:\s*revision\?\.fingerprint/s);
});
