import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Two-part hotfix, source-verified (no component-render harness exists in
// this repo — same convention as tests/guest-forge-boundary.test.mjs and
// tests/tcgplayer-purchase-surfaces.test.mjs).
//
// HOTFIX A: "Reforge failed constraints" always called /api/forge/chat's
// deck_generation task, which worker/forge-chat.ts has hardcoded to a 503
// since the native-engine migration — the button could never succeed. Its
// catch block wrote the failure into forgeGenerationError, the SAME state
// that represents whether the original deck Forge succeeded — so clicking
// this on an already-complete, valid deck made it disappear behind "No
// deck was completed." The control (and its now-fully-dead helper
// functions) are removed outright; no replacement automatic-repair
// feature is introduced in this batch.
//
// HOTFIX B: recommendReplacements() had the identical contract mismatch —
// it asked /api/forge/chat for a parseable decklist reply and got
// nativeCoachAnswer()'s free-text narrative back, which parseDeckRows()
// can never parse, so it silently, permanently returned zero candidates
// and told the player "The Forge did not force a weak suggestion" — a
// strategic-sounding claim for what was actually a contract failure. It
// now reuses the real, already-proven-in-production /api/forge/multi-refill
// engine (the same one the working multi-select bulk-replace feature
// uses) with a single-item cuts array, and distinguishes a genuine
// engine verdict (422, "no legal replacement") from a transport/parse
// failure (network/5xx) instead of collapsing both into one lie.

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

// --- Hotfix A: dead repair control removed ---

test("'Reforge failed constraints' no longer renders anywhere", () => {
  assert.doesNotMatch(page, /Reforge failed constraints/);
  assert.doesNotMatch(page, /Reforging failed slots…/);
});

test("repairDeckIntegrity no longer exists in any form", () => {
  assert.doesNotMatch(page, /repairDeckIntegrity/);
});

test("the deck-integrity issue list is preserved, with an honest pointer to manual editing instead of the dead button", () => {
  const block = page.match(/\{!deckIntegrity\.checking && deckIntegrity\.issues\.length > 0 && \([\s\S]*?deck-integrity-manual-note[\s\S]*?<\/p>/)?.[0];
  assert.ok(block, "expected the deckIntegrity issues footer block");
  assert.match(block, /<ul>\{deckIntegrity\.issues\.map/, "the real, honest diagnostic list must remain");
  assert.match(block, /Automatic repair isn&rsquo;t available/, "must say plainly that no automatic repair exists");
  assert.match(block, /Editing Anvil/, "must point at the real, working manual-edit path");
  assert.doesNotMatch(block, /<button/, "no button — nothing left to click that could fail");
});

test("removing the dead control also removed its now-fully-unused helper functions (formatEdhrecEvidence, normalizeCommanderDeck, verifiedDeckFacts) — no orphaned dead code left behind", () => {
  assert.doesNotMatch(page, /formatEdhrecEvidence/);
  assert.doesNotMatch(page, /normalizeCommanderDeck/);
  assert.doesNotMatch(page, /verifiedDeckFacts/);
});

// --- Error-state architecture: the actual invariant ---

test("exactly the two legitimate setForgeGenerationError call sites remain — the claim-restoration effect and commitDirectForge's own catch — nothing else", () => {
  const callSites = page.match(/setForgeGenerationError\(/g) || [];
  // 1: claim-restoration effect catch. 2: commitDirectForge's catch
  // (normalizeForgeFailure-driven). The bare `setForgeGenerationError("")`
  // resets (start of a fresh forge/restore) also match this pattern.
  const resets = page.match(/setForgeGenerationError\(""\);/g) || [];
  const realSetters = callSites.length - resets.length;
  assert.equal(realSetters, 2, `expected exactly 2 real (non-reset) setForgeGenerationError calls, found ${realSetters}`);
});

test("no secondary/optional workbench action writes forgeGenerationError: recommendReplacements never touches it", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  assert.ok(start > 0, "expected to find recommendReplacements");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.doesNotMatch(body, /setForgeGenerationError/, "a failed replacement lookup must never write into the primary generation-failure state");
});

test("hasValidatedDeck's own definition has no dependency on replacement state — a replacement failure structurally cannot affect it", () => {
  const block = page.match(/const hasValidatedDeck =[\s\S]*?targetDeckSize\(format\);/)?.[0];
  assert.ok(block, "expected the hasValidatedDeck definition");
  assert.doesNotMatch(block, /replacement/i, "hasValidatedDeck must not reference any replacement-lookup state");
});

test("replacement failures stay scoped to their own local state (replacementError), never forgeGenerationError, never a deck-clearing setter", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.match(body, /setReplacementError\("no-legal-replacement"\)/);
  assert.match(body, /setReplacementError\("operational"\)/);
  assert.doesNotMatch(body, /setForgedDeck|setDeckRows|setRevisions\(/, "a replacement lookup must never mutate the deck itself — only addCardToDeck (an explicit player click) may do that");
});

// --- Hotfix B: real engine, structured contract ---

test("recommendReplacements calls /api/forge/multi-refill, never /api/forge/chat", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.match(body, /fetch\("\/api\/forge\/multi-refill"/);
  assert.doesNotMatch(body, /\/api\/forge\/chat/, "the retired chat-based replacement path must be fully gone");
});

test("the request sends a single-item cuts array (this card's name/quantity) plus the real generationId", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.match(body, /generationId: nativeMasterworkContext\?\.generationId/);
  assert.match(body, /cuts: \[\{ name: cut\.name, quantity: cut\.quantity \}\]/);
});

test("parseDeckRows is never called on the replacement engine's response — no free-text prose parsing anywhere in this flow", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.doesNotMatch(body, /parseDeckRows\(/, "the structured multi-refill response must be read directly, never text-parsed (a comment may still name the old pattern for context)");
  assert.doesNotMatch(body, /data\.answer/, "there is no free-text 'answer' field in the multi-refill contract");
});

test("candidates are built only from structured package fields (additions[].name/roles, context.summary) — never invented client-side", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.match(body, /pkg\?\.additions\?\.\[0\]/);
  assert.match(body, /pkg\.context\?\.summary/);
  assert.match(body, /addition\.roles/);
});

test("three distinct outcomes are handled explicitly: 422 (honest empty), non-ok/malformed (operational), and real packages", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  assert.match(body, /response\.status === 422/);
  assert.match(body, /!response\.ok \|\| !data \|\| !Array\.isArray\(data\.packages\)/);
  assert.match(body, /catch \{\s*setReplacementError\("operational"\);/);
});

test("Scryfall image/type-line enrichment runs only after real candidates are already decided, and a failed lookup cannot drop a legal candidate", () => {
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const body = page.slice(start, end);
  const enrichmentStart = body.indexOf("await Promise.all(resolved.map(");
  const decisionPoint = body.indexOf("if (!resolved.length)");
  assert.ok(decisionPoint > 0 && enrichmentStart > decisionPoint, "candidates must be finalized (resolved.length check) before any display-only Scryfall enrichment runs");
});

// --- Rendered states ---

test("the panel renders three visually distinct outcomes: real candidates, honest 'no legal replacement', and a separate operational error", () => {
  const block = page.match(/<section className="forge-replacements">[\s\S]*?\n {8}\)\}/)?.[0];
  assert.ok(block, "expected the forge-replacements panel");
  assert.match(block, /replacementRecommendations\.length > 0 \? \(/);
  assert.match(block, /No legal replacement was found for this slot\./);
  assert.match(block, /We couldn&rsquo;t reach the replacement engine\. Try again/);
  assert.doesNotMatch(block, /The Forge did not force a weak suggestion/, "the old message that lied about a transport failure being a strategic verdict must be gone");
});

test("each rendered candidate shows the real engine reason and role fit when present, not just a bare name", () => {
  const block = page.match(/replacementRecommendations\.map\(\(card, index\) => \{[\s\S]*?\n {16}\}\)\}/)?.[0];
  assert.ok(block, "expected the replacementRecommendations.map block");
  assert.match(block, /card\.reason && <p className="replacement-reason">\{card\.reason\}<\/p>/);
  assert.match(block, /card\.roles\.length > 0/);
});

// --- Untouched surfaces (explicit non-regression) ---

test("manual legal-card search in the Editing Anvil remains fully intact and untouched", () => {
  assert.match(page, /const \[cardSearchResults, setCardSearchResults\] = useState/);
  assert.match(page, /setCardSearchResults\(/);
});

test("multi-select/bulk replacement (forgeMultiRefill, applyMultiRefillPackage, refillCuts) is untouched and structurally isolated from the single-cut flow", () => {
  assert.match(page, /async function forgeMultiRefill\(\) \{/);
  assert.match(page, /function applyMultiRefillPackage\(refill: MultiRefillPackage\) \{/);
  assert.match(page, /generationId: nativeMasterworkContext\.generationId,\s*\n\s*currentRows: deckRows,\s*\n\s*cuts: Object\.entries\(refillCuts\)/);
  const start = page.indexOf("async function recommendReplacements(cut: DeckRow, nextDeck: string) {");
  const end = page.indexOf("\n  }\n", start);
  const singleCutBody = page.slice(start, end);
  assert.doesNotMatch(singleCutBody, /refillCuts|multiRefillResult|multiRefillStatus/, "the single-cut flow must never read or write the bulk-replace feature's own state");
});

test("drag/add/remove Editing Anvil behavior around the cut/replace flow is unchanged: stageDeckCard still stages, undo still restores", () => {
  assert.match(page, /function stageDeckCard\(name: string, destination: "consider" \| "remove"\) \{/);
  assert.match(page, /void recommendReplacements\(row, nextDeck\);/);
  assert.match(page, />\s*Undo\s*<\/button>/);
});
