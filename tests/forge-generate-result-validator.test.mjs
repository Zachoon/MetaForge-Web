import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { validateGeneratedResult, validateAllCandidatesComplete } from "../worker/forge-result-validator.mjs";

// Bug 2's root cause: handleForgeGenerateForKey used to return HTTP 200 as
// soon as forgeNativeMasterwork/forgeImportedMasterwork returned without
// throwing, with no check that the result was actually a complete, legal
// deck. A scarce card pool can let selection under-fill without throwing
// (the engine's hard gates catch illegal/unmatchable results, not merely
// short ones), and guest-forge.ts trusted forgeResponse.ok alone to decide
// whether to burn the player's one free preview — so an incomplete-but-200
// result permanently consumed it before the client's own completeness
// check ever ran. These tests exercise the shared validator directly with
// constructed fixtures (the real engine's own hard gates make it difficult
// to force a genuinely scarce-but-non-throwing result on demand — see
// forge-generate-response-contract.test.mjs for the real end-to-end
// generation path with a real pool).

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const validSelected = {
  deckText: Array.from({ length: 60 }, (_, i) => `1 Card ${i}`).join("\n"),
  rows: Array.from({ length: 60 }, (_, i) => ({ quantity: 1, name: `Card ${i}`, roles: ["threat"] })),
  evaluation: { cohesion: 80, resilience: 70 },
  tournament: { reason: "This build best matched the requested identity." },
};
const validReport = () => ({
  methodology: "MetaForge analyzed each verified card once...",
  reasoning: { summary: "Summary.", boundary: "Boundary." },
  laboratory: { summary: "Lab summary.", verdict: "hold" },
  selected: JSON.parse(JSON.stringify(validSelected)),
  candidates: [JSON.parse(JSON.stringify(validSelected)), JSON.parse(JSON.stringify(validSelected))],
});

test("validateGeneratedResult accepts a real, complete 60-card Standard build", () => {
  const result = validateGeneratedResult(validReport(), "Standard");
  assert.equal(result.ok, true);
});

test("validateGeneratedResult rejects a deck short of the target size", () => {
  const report = validReport();
  report.selected.deckText = Array.from({ length: 58 }, (_, i) => `1 Card ${i}`).join("\n");
  const result = validateGeneratedResult(report, "Standard");
  assert.equal(result.ok, false);
  assert.equal(result.code, "INCOMPLETE_GENERATION");
  assert.match(result.message, /58 cards/);
  assert.match(result.message, /preview has not been used/i);
});

test("validateGeneratedResult rejects an empty deckText", () => {
  const report = validReport();
  report.selected.deckText = "";
  const result = validateGeneratedResult(report, "Standard");
  assert.equal(result.ok, false);
  assert.equal(result.code, "INCOMPLETE_GENERATION");
});

test("validateGeneratedResult rejects a missing selected candidate entirely", () => {
  const report = validReport();
  delete report.selected;
  const result = validateGeneratedResult(report, "Standard");
  assert.equal(result.ok, false);
});

test("validateGeneratedResult requires a legal commander row for Commander/Brawl/Standard Brawl", () => {
  const report = validReport();
  report.selected.deckText = Array.from({ length: 100 }, (_, i) => `1 Card ${i}`).join("\n");
  report.selected.rows = Array.from({ length: 100 }, (_, i) => ({ quantity: 1, name: `Card ${i}`, roles: ["threat"] }));
  const withoutCommander = validateGeneratedResult(report, "Commander");
  assert.equal(withoutCommander.ok, false);
  assert.match(withoutCommander.message, /legal commander/i);

  report.selected.rows[0].roles = ["commander"];
  const withCommander = validateGeneratedResult(report, "Commander");
  assert.equal(withCommander.ok, true);
});

test("validateGeneratedResult does not require a commander row for non-Commander formats", () => {
  const result = validateGeneratedResult(validReport(), "Modern");
  assert.equal(result.ok, true);
});

for (const [field, mutate] of [
  ["methodology", (report) => { report.methodology = ""; }],
  ["reasoning.summary", (report) => { report.reasoning.summary = 123; }],
  ["laboratory.summary", (report) => { delete report.laboratory; }],
  ["selected.evaluation", (report) => { report.selected.evaluation = { cohesion: "n/a" }; }],
  ["selected.tournament.reason", (report) => { delete report.selected.tournament; }],
  ["candidates", (report) => { report.candidates = []; }],
]) {
  test(`validateGeneratedResult rejects a result missing ${field} (a field the client dereferences without optional chaining)`, () => {
    const report = validReport();
    mutate(report);
    const result = validateGeneratedResult(report, "Standard");
    assert.equal(result.ok, false, `expected ${field} to be required`);
    assert.equal(result.code, "INCOMPLETE_GENERATION");
  });
}

test("validateAllCandidatesComplete accepts three complete candidates", () => {
  const report = validReport();
  report.candidates = [JSON.parse(JSON.stringify(validSelected)), JSON.parse(JSON.stringify(validSelected)), JSON.parse(JSON.stringify(validSelected))];
  const result = validateAllCandidatesComplete(report, "Standard");
  assert.equal(result.ok, true);
});

// The masterworks picker lets the player enter ANY of the three candidates,
// not just nativeReport.selected — so a non-recommended candidate being
// short a card must be caught too, even when the tournament winner itself
// is perfectly fine.
test("validateAllCandidatesComplete rejects a non-recommended candidate that is short a card, even when selected is complete", () => {
  const report = validReport();
  const shortCandidate = JSON.parse(JSON.stringify(validSelected));
  shortCandidate.deckText = Array.from({ length: 59 }, (_, i) => `1 Card ${i}`).join("\n");
  report.candidates = [JSON.parse(JSON.stringify(validSelected)), shortCandidate];
  const result = validateAllCandidatesComplete(report, "Standard");
  assert.equal(result.ok, false);
  assert.equal(result.code, "INCOMPLETE_GENERATION");
  assert.match(result.message, /59 cards/);
});

test("forge-generate.ts runs both validators before returning success, for every generation branch", async () => {
  const source = await read("worker/forge-generate.ts");
  const importedBranch = source.slice(source.indexOf('if (body.mode === "imported")'), source.indexOf('// "native" (three-masterwork reveal)'));
  assert.match(importedBranch, /validateGeneratedResult\(nativeReport, body\.format\)/);
  assert.match(importedBranch, /return json\(\{ error: resultCheck\.message, code: resultCheck\.code \}, 422\)/);

  const nativeBranch = source.slice(source.indexOf('// "native" (three-masterwork reveal)'));
  assert.match(nativeBranch, /validateGeneratedResult\(nativeReport, body\.format\)/);
  assert.match(nativeBranch, /validateAllCandidatesComplete\(nativeReport, body\.format\)/);
  assert.match(nativeBranch, /422/);
});

// guest-forge.ts needed no logic change for this fix: it already only
// marks a guest session "used" and creates a claimable result when
// forgeResponse.ok is true, and forge-generate.ts's validator now makes
// that status code honest. This test pins that guest-forge.ts still
// branches the same way, so a future edit can't silently reintroduce
// "mark used regardless of what forge-generate.ts actually returned."
test("guest-forge.ts only marks a session used and persists a claimable result on a successful (2xx) forge response", async () => {
  const source = await read("worker/guest-forge.ts");
  assert.match(
    source,
    /if \(!forgeResponse\.ok\) \{\s*await env\.DB\.prepare\(`DELETE FROM guest_forge_sessions WHERE session_key = \? AND status = 'pending'`\)/,
    "a non-ok forge response must release the pending reservation, not consume it",
  );
  assert.match(
    source,
    /UPDATE guest_forge_sessions SET status = 'used'/,
    "the used-marking UPDATE exists",
  );
  // Both the "mark used" UPDATE and the claimable-result INSERT run inside
  // one env.DB.batch([...]) call (D1's atomic-transaction primitive), so a
  // persistence failure can't half-consume the preview.
  const batchStart = source.indexOf("await env.DB.batch([");
  const batchEnd = source.indexOf("]);", batchStart);
  const batchBlock = source.slice(batchStart, batchEnd);
  assert.match(batchBlock, /UPDATE guest_forge_sessions SET status = 'used'/);
  assert.match(batchBlock, /INSERT INTO guest_forges/);
});
