import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// No component-render harness exists in this repo, so this batch is
// verified against the literal source that produces it — the same
// convention every other page.tsx-adjacent test file here already uses.
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

// --- 0. Entrance hero strings (added after initial review: these two are
// more prominent than the card copy itself, so leaving them Commander-only
// would have left the same first-impression problem mostly intact) ---

test("the entrance sub-headline no longer opens with a Commander-only imperative", () => {
  assert.match(page, /Choose your format and game plan\. MetaForge/);
  assert.doesNotMatch(page, /Choose a commander and how you want to play/);
});

test("the entrance sub-headline describes what MetaForge helps the player do, not a 'builds the deck for you' generator claim", () => {
  assert.match(
    page,
    /Choose your format and game plan\. MetaForge explains how your\s*\n\s*deck works, shows what to improve, and helps you make\s*\n\s*confident changes\./,
  );
  assert.doesNotMatch(page, /MetaForge builds the\s*\n\s*full, legal deck first/);
});

test("the entrance visual badge reflects a multi-format deck coach, not a Commander-only claim", () => {
  assert.match(page, /A DECK COACH FOR EVERY FORMAT/);
  assert.doesNotMatch(page, /BUILT FOR COMMANDER PLAYERS/);
  // The subtext was already format-neutral and stays as-is.
  assert.match(page, /<small>Complete deck first\. Clear reasons second\.<\/small>/);
});

// --- 1. Entrance card ---

test("the entrance Build card no longer claims MetaForge only builds Commander decks", () => {
  assert.match(page, /title="Build a deck"/);
  assert.doesNotMatch(page, /title="Build a Commander deck"/);
});

test("the entrance Build card's supporting copy is format-neutral", () => {
  assert.match(page, /description="Choose a format and strategy\. Shape a deck around a real game plan\."/);
  assert.doesNotMatch(page, /description="Pick your commander and strategy\. Get a complete deck\."/);
  // "Build around" was itself a subtle generator-first implication —
  // "Shape a deck around" keeps MetaForge as the thing helping the player
  // shape it, not the thing producing it for them.
  assert.doesNotMatch(page, /description="Choose a format and strategy\. Build around a real game plan\."/);
  // The CTA itself was explicitly out of scope for this batch.
  assert.match(page, /cta="Build my deck →"/);
});

// --- 2. Commission chamber heading ---

test("the commission heading is driven by a small pure helper, not an inline ternary", () => {
  assert.match(page, /const commissionHeadingFor = \(format: string\) =>\s*\n\s*isCommanderFormat\(format\)\s*\n\s*\? "Choose your commander and game plan\."\s*\n\s*: "Choose your format and game plan\."/);
  assert.match(page, /chamber === "commission"\s*\n\s*\? commissionHeadingFor\(format\)/);
});

test("the Commander-format heading remains commander-specific", () => {
  assert.match(page, /"Choose your commander and game plan\."/);
});

test("the non-Commander heading is format-neutral, not an invented per-format archetype label", () => {
  assert.match(page, /"Choose your format and game plan\."/);
  // The task explicitly said not to invent "archetype" language unless the
  // screen actually asks for one — it doesn't, so no such string should exist.
  assert.doesNotMatch(page, /Choose your archetype/i);
});

// --- 3. Stepper label ---

test("step 1 of the build stepper is 'Commander' for Commander/Brawl/Standard Brawl and 'Format' otherwise, via one small lookup", () => {
  assert.match(page, /const buildStepLabelsFor = \(format: string\) =>\s*\n\s*isCommanderFormat\(format\)\s*\n\s*\? \["Commander", "Strategy", "Preferences"\]\s*\n\s*: \["Format", "Strategy", "Preferences"\];/);
  assert.match(page, /buildStepLabelsFor\(format\)\.map\(\(label, index\) =>/);
});

// --- 4. Left explainer (commission-heading supporting paragraph) ---

test("the commission chamber's supporting paragraph was already format-neutral and remains untouched", () => {
  assert.match(page, /"Start with the two choices that matter\. Preferences are optional, and you can change them later\."/);
  assert.doesNotMatch(page, /Commander, strategy, then optional preferences/i);
});

// --- 5. Disabled-state / validation microcopy ---

test("commander-only disabled copy ('Choose a legal commander to continue') appears only behind an isCommanderFormat check, never as the only branch", () => {
  const block = page.match(/\{isCommanderFormat\(format\) && !selectedCommander\s*\n\s*\? "Choose a legal commander to continue"\s*\n\s*: "Your choices are ready"\}/);
  assert.ok(block, "expected the commander-disabled microcopy to remain conditioned on isCommanderFormat, with a format-neutral fallback");
});

test("the non-Commander build flow is never told to choose a commander", () => {
  // Both gates that can disable step progression are already conditioned on
  // isCommanderFormat — for a non-Commander format neither one references
  // selectedCommander at all, so there is no path where a non-Commander
  // player sees commander-specific validation copy or is blocked by it.
  assert.match(page, /disabled=\{buildStep === 0 && isCommanderFormat\(format\) && !selectedCommander\}/);
  assert.match(page, /\(chamber === "refine" && !deck\.trim\(\)\) \|\|\s*\n\s*\(isCommanderFormat\(format\) && !selectedCommander\)/);
});

// --- 6. Commander-specific controls remain Commander/Brawl-only ---

test("commander search, suggestion, and selection UI remain gated behind isCommanderFormat — not relabeled for other formats", () => {
  assert.match(page, /\{isCommanderFormat\(format\) && \(\s*\n\s*<section className="commander-blueprint build-choice-commander">/);
  assert.match(page, /Suggest a commander for me/);
  assert.match(page, /className="commander-search"/);
});

test("the Target Power Tier preference also stays Commander-format-only — confirms the existing gate wasn't loosened while touching this region", () => {
  assert.match(page, /\{isCommanderFormat\(format\) && \(\s*\n\s*<label className="build-choice-preference">\s*\n\s*<span>\s*\n\s*TARGET POWER TIER/);
});

// --- No changes to the Review flow ---

test("the Review chamber's own heading, supporting copy, and Academy link are untouched", () => {
  assert.match(page, /"Paste the deck you want to improve\."/);
  assert.match(page, /"MetaForge keeps what works, checks the list, and suggests one clear change at a time\."/);
  assert.match(page, /Not sure where to start\? Learn the most common Commander deckbuilding problems in the/);
});
