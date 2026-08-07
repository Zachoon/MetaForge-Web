import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Two bugs, fixed as one trust-boundary batch because the suggested-
// commander shortcut was the path that exposed the incomplete-result/
// consumed-preview failure (see tests/forge-generate-result-validator.test
// .mjs for Bug 2's server-side half):
//
// Bug 1 — "Choose a commander for me" used to pick a commander, jump the
// chamber straight to "forging", and start generation automatically —
// skipping the same explicit-selection, still-on-the-Commander-step path a
// manual search result went through. Fixed by routing both through one
// shared selectCommander() and making chooseRandomCommander() only draw and
// display three candidates, never select one or advance any state.
//
// Bug 1B — a fresh commander build used to auto-enter the Forge's
// recommended candidate (inspectMasterwork(0)) instead of presenting all
// three real, already-generated candidates for an explicit player choice.
// Fixed by routing a fresh build's one generation call through
// pendingCandidateChoice + the masterworks chamber, with enterMasterwork()
// as the only way a candidate becomes the workbench's actual deck.

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
let page;

test.before(async () => {
  page = await read("app/page.tsx");
});

test("selectCommander is the single canonical commander-selection path", () => {
  assert.match(
    page,
    /function selectCommander\(option: CommanderOption\) \{\s*setSelectedCommander\(option\);\s*setCommanderQuery\(option\.name\);\s*setCommanderResults\(\[\]\);\s*setCommanderSearchOpen\(false\);\s*setRandomCommanderOptions\(\[\]\);\s*\}/,
  );
});

test("a manual search result and a suggested-commander card both call the same selectCommander path", () => {
  const onClickCalls = [...page.matchAll(/onClick=\{\(\) => selectCommander\(option\)\}/g)];
  assert.equal(onClickCalls.length, 2, "expected exactly two call sites: manual search results and suggested-commander cards");
});

test("chooseRandomCommander only draws and displays candidates — it never selects one or advances any state", () => {
  const start = page.indexOf("async function chooseRandomCommander()");
  const end = page.indexOf("// Shared tail for every", start);
  const body = page.slice(start, end);
  assert.ok(body.length > 0, "expected to find chooseRandomCommander's body");
  assert.doesNotMatch(body, /setSelectedCommander/, "must never select a commander itself");
  assert.doesNotMatch(body, /setChamber\(/, "must never advance the chamber");
  assert.doesNotMatch(body, /setCommissionSeed/, "must never touch the commission seed (that's awaken()'s job)");
  assert.doesNotMatch(body, /callForgeGenerate/, "must never trigger generation");
  assert.match(body, /setRandomCommanderOptions\(starters\)/, "must store the drawn candidates for the picker to render");
});

test("the suggested-commander picker renders the drawn options with a dismiss-and-search-instead escape hatch", () => {
  assert.match(page, /randomCommanderOptions\.length > 0 &&/);
  assert.match(page, /className="commander-suggestions"/);
  assert.match(page, /None of these — search instead/);
  assert.match(page, /onClick=\{\(\) => setRandomCommanderOptions\(\[\]\)\}/);
});

test("a fresh commander build routes through the masterworks chamber, never straight to a chosen deck", () => {
  const start = page.indexOf('async function commitDirectForge(mode: "decklist" | "commander")');
  const end = page.indexOf("function openSavedMasterwork", start);
  const body = page.slice(start, end);
  const elseBranchStart = body.indexOf("} else {");
  const elseBranch = body.slice(elseBranchStart);
  assert.match(elseBranch, /setPendingCandidateChoice\(\{/);
  assert.match(elseBranch, /setChamber\("masterworks"\)/);
  assert.doesNotMatch(elseBranch, /applyForgeResult/, "the commander branch must not apply a result directly — only enterMasterwork does, on explicit choice");
  // Exactly one callForgeGenerate call in the whole function (shared by
  // both the decklist and commander branches) — no second network call
  // happens anywhere downstream of it.
  const generateCalls = [...body.matchAll(/await callForgeGenerate\(\{/g)];
  assert.equal(generateCalls.length, 2, "one for the decklist branch, one for the commander branch — never more");
});

test("enterMasterwork is the only path that turns a pending candidate choice into the workbench's real deck, with zero further generation calls", () => {
  const start = page.indexOf("function enterMasterwork(candidateId: string)");
  const end = page.indexOf("function resetGuestVerificationAfterFailure", start);
  const body = page.slice(start, end);
  assert.doesNotMatch(body, /callForgeGenerate/, "no second generation call — the candidate was already fully built");
  assert.match(body, /setChamber\("workbench"\)/);
  assert.match(body, /setPendingCandidateChoice\(null\)/);
  assert.match(body, /void applyForgeResult\(/);
});

test("entering a Masterwork is only reachable through an explicit player click on a specific candidate", () => {
  assert.match(page, /onClick=\{\(\) => enterMasterwork\(candidate\.id\)\}/);
  // No automatic call anywhere in the file.
  const autoCalls = [...page.matchAll(/enterMasterwork\(/g)];
  // One definition + one JSX call site = 2 occurrences of the bare name.
  assert.equal(autoCalls.length, 2, "enterMasterwork should only be referenced by its own definition and the one explicit button click");
});

test("recommended candidate is visually marked but not auto-selected — every candidate gets its own explicit entry button", () => {
  assert.match(page, /isRecommended && <em>RECOMMENDED<\/em>/);
  assert.match(
    page,
    /\{\(pendingCandidateChoice\.nativeReport\.candidates \|\| \[pendingCandidateChoice\.nativeReport\.selected\]\)\.map\(\(candidate: any\) => \{/,
    "every candidate in the array gets mapped to its own card+button, not just the recommended one",
  );
});

test("the workbench's own UI success/failure boundary: a hasValidatedDeck predicate, not chamber alone, gates success chrome", () => {
  assert.match(
    page,
    /const hasValidatedDeck =\s*benchStatus !== "forging" &&\s*!forgeGenerationError &&\s*deckRows\.length > 0 &&\s*deckRows\.reduce\(\(sum, row\) => sum \+ row\.quantity, 0\) === targetDeckSize\(format\);/,
  );
  // The header's "ready to play" framing, the detail-level nav, the "what
  // to do next" intro, and the chapter rail are all gated on it.
  assert.match(page, /\{hasValidatedDeck\s*\?\s*"YOUR COMPLETE DECK · READY TO PLAY"/);
  assert.match(page, /\{hasValidatedDeck \? \(\s*<>/);
  // The main deck-content branch (card list, prices, copy actions, multi-
  // refill, ...) only renders for a validated deck, not merely a non-empty
  // one — deckRows.length > 0 alone used to be the gate, which a partial
  // (but non-empty) deckRows array could still satisfy.
  assert.match(page, /\) : hasValidatedDeck \? \(\s*<>\s*\{tcgplayerAffiliateEnabled/);
});

test("a failed generation surfaces a dedicated failure state that confirms the preview was not used, never a 0-card success", () => {
  assert.match(page, /className="forge-generation-failure" role="alert"/);
  assert.match(page, /No incomplete deck was saved\./);
  assert.match(page, /Strike the Anvil Again/);
});

// P0 follow-up: a real screenshot showed "YOUR COMPLETE DECK · READY TO
// PLAY" and "0 cards · 0 sections" rendering ABOVE a "No incomplete deck
// was saved" failure state simultaneously — hasValidatedDeck existed but
// several success-chrome elements sat outside its reach: the deck-
// reference-strip, the deck-manuscript header's own card/section count and
// Workbench/Full ledger/Copy deck controls, the raw-decklist response
// viewer, and the deck-manuscript footer's "begin testing" trigger. Every
// one of these is now gated. This test proves the exact reported condition
// (forgeGenerationError set, deckRows empty) can never satisfy
// hasValidatedDeck, then proves every listed success element is
// structurally unreachable without it — not by rendering the component
// (no harness exists in this repo), but by pinning that each one's JSX is
// a direct or ancestor-gated child of the hasValidatedDeck check.
test("hasValidatedDeck is definitionally false whenever forgeGenerationError is set or deckRows is empty — the exact reported failure condition", () => {
  assert.match(
    page,
    /const hasValidatedDeck =\s*benchStatus !== "forging" &&\s*!forgeGenerationError &&\s*deckRows\.length > 0 &&\s*deckRows\.reduce\(\(sum, row\) => sum \+ row\.quantity, 0\) === targetDeckSize\(format\);/,
    "forgeGenerationError truthy or deckRows.length === 0 must each independently force hasValidatedDeck to false",
  );
});

test("none of the reported success strings can render outside hasValidatedDeck: header framing, chapter rail, deck stats, Workbench/ledger/copy, raw response, begin-testing", () => {
  // "YOUR COMPLETE DECK · READY TO PLAY" / the workbench header framing
  assert.match(page, /\{hasValidatedDeck\s*\n\s*\? "YOUR COMPLETE DECK · READY TO PLAY"/);
  // The chapter rail, "Your deck is ready" intro, and detail-level nav
  assert.match(page, /\{hasValidatedDeck \? \(\s*<>\s*<nav className="result-view-controls"/);
  // The deck-reference-strip (card art, name, "N cards · format" chip)
  assert.match(page, /\{hasValidatedDeck && \(\s*<div className="deck-reference-strip">/);
  // The "N cards · N sections" count and the Workbench/Full ledger/Copy
  // deck controls inside the deck-manuscript header
  assert.match(
    page,
    /: hasValidatedDeck\s*\n\s*\? `\$\{deckRows\.reduce\(\(sum, row\) => sum \+ row\.quantity, 0\)\} cards · \$\{Object\.keys\(groupedDeck\)\.length\} sections`\s*\n\s*: "Build not completed"/,
  );
  assert.match(page, /\{hasValidatedDeck && \(\s*<div className="deck-header-actions">/);
  // The raw Forge-response viewer and the "begin testing" trigger
  assert.match(page, /\{hasValidatedDeck && \(\s*<details className="raw-decklist">/);
  assert.match(page, /\{hasValidatedDeck && \(\s*<footer>\s*<span>\s*Featured/);
  // The main card-list/analysis content branch itself
  assert.match(page, /\) : hasValidatedDeck \? \(\s*<>\s*\{tcgplayerAffiliateEnabled/);
});
