import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  REVIEW_FOCUS_OPTIONS,
  REVIEW_FOCUS_LABELS,
  toggleReviewFocus,
  buildReviewFocusContext,
} from "../app/review-focus.mjs";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

// --- Pure selection/toggle logic ---

test("selecting a chip updates reviewFocus", () => {
  assert.equal(toggleReviewFocus("", "Faster starts"), "Faster starts");
});

test("selecting another chip replaces it", () => {
  assert.equal(toggleReviewFocus("Faster starts", "Closing games"), "Closing games");
});

test("clicking the selected chip again clears it", () => {
  assert.equal(toggleReviewFocus("Faster starts", "Faster starts"), "");
});

test("no selection is required — empty string is a valid, unforced state", () => {
  assert.equal(buildReviewFocusContext(""), "");
});

// --- Generation-request note composition ---

test("a selected focus is included in the generation request as a structured, explained prefix", () => {
  const context = buildReviewFocusContext("More consistency");
  assert.match(context, /Player review focus: More consistency\./);
  // Requirement: never a bare, unexplained label — the engine must be told
  // this is a coaching focus, not a deck characteristic.
  assert.match(context, /coaching focus the player selected/);
  assert.match(context, /not a deck characteristic or constraint/);
});

test("commissionNote and reviewFocus are composed together, not merged into one field", () => {
  // page.tsx must call buildReviewFocusContext(reviewFocus) and interpolate
  // commissionNote as its own separate template segment in the same note —
  // never collapsed into commissionNote itself.
  assert.match(
    page,
    /note: `\$\{buildReviewFocusContext\(reviewFocus\)\}\$\{commissionNote\}\\n\$\{interventionLearning\.reusableGuidance\}`\.trim\(\)/,
  );
});

// --- UI presence / absence by chamber ---

test("the chip picker renders only when chamber is \"refine\"", () => {
  assert.match(page, /\{chamber === "refine" && \(\s*<div className="review-focus-picker">/);
});

test("chips do not appear in commission/build mode — no second render site outside the refine guard", () => {
  const occurrences = page.match(/className="review-focus-picker"/g) || [];
  assert.equal(occurrences.length, 1);
});

test("exact UI copy is present", () => {
  assert.match(page, /BEFORE WE DIVE IN/);
  assert.match(page, /WHAT’S HAPPENING WHEN YOU PLAY THIS DECK\?/);
});

// --- Accessibility ---

test("each chip button is explicitly type=\"button\" (never submits/gates a form)", () => {
  const block = page.match(
    /<div className="review-focus-picker">[\s\S]*?<label className="commission-note">/,
  );
  assert.ok(block, "expected to find the review-focus-picker block");
  assert.match(block[0], /<button\s+type="button"\s*\n\s*key=\{option\}/);
});

test("aria-pressed is driven directly off the current selection, not a static value", () => {
  assert.match(page, /aria-pressed=\{reviewFocus === option\}/);
});

test("the chip group has an explicit accessible label tied to the question text", () => {
  assert.match(page, /<p id="review-focus-question">WHAT’S HAPPENING WHEN YOU PLAY THIS DECK\?<\/p>/);
  assert.match(
    page,
    /className="review-focus-chips"\s*\n\s*role="group"\s*\n\s*aria-labelledby="review-focus-question"/,
  );
});

test("all six chip labels are present, and only those six", () => {
  assert.deepEqual(REVIEW_FOCUS_OPTIONS, [
    "Faster starts",
    "More consistency",
    "Closing games",
    "Better interaction",
    "Understanding the deck",
    "Not sure yet",
  ]);
});

// --- Plain-language display labels (front door onto the same six values) ---

test("REVIEW_FOCUS_LABELS maps exactly the six canonical values to plain-language sentences", () => {
  assert.deepEqual(Object.keys(REVIEW_FOCUS_LABELS).sort(), [...REVIEW_FOCUS_OPTIONS].sort());
  assert.deepEqual(REVIEW_FOCUS_LABELS, {
    "Faster starts": "I always feel like I’m playing from behind.",
    "More consistency": "Sometimes everything clicks—and sometimes nothing does.",
    "Closing games": "I get set up, but I can’t finish games.",
    "Better interaction": "I never seem to have the right answer.",
    "Understanding the deck": "I don’t know what this deck is trying to do.",
    "Not sure yet": "I’m not sure—that’s why I’m here.",
  });
});

test("the chip renders the plain-language label, not the raw canonical value, as its visible text", () => {
  const block = page.match(
    /<div className="review-focus-picker">[\s\S]*?<label className="commission-note">/,
  );
  assert.ok(block, "expected to find the review-focus-picker block");
  assert.match(block[0], /\{REVIEW_FOCUS_LABELS\[option\]\}/);
  assert.doesNotMatch(block[0], />\s*\{option\}\s*<\/button>/);
});

test("selection state, aria-pressed, and the toggle call still key off the canonical value, not the label", () => {
  assert.match(page, /reviewFocus === option\s*\n\s*\?\s*"review-focus-chip is-selected"/);
  assert.match(page, /aria-pressed=\{reviewFocus === option\}/);
  assert.match(page, /toggleReviewFocus\(current, option\)/);
});

test("no separate Continue/Confirm button was added — one button per chip, nothing else", () => {
  const block = page.match(
    /<div className="review-focus-picker">[\s\S]*?<label className="commission-note">/,
  );
  assert.ok(block, "expected to find the review-focus-picker block");
  // Source-level check: exactly one <button> template (the chip, rendered
  // once per REVIEW_FOCUS_OPTIONS entry at runtime) — not a second,
  // separate Continue/Confirm element alongside it.
  const buttonCount = (block[0].match(/<button/g) || []).length;
  assert.equal(buttonCount, 1);
  assert.doesNotMatch(block[0], /Continue|Confirm/);
});

test("\"Review my deck\" is not gated on answering — awaken-button's disabled condition never mentions reviewFocus", () => {
  const block = page.match(/className="awaken-button"[\s\S]*?onClick=\{awaken\}/);
  assert.ok(block, "expected to find the awaken-button disabled condition");
  assert.doesNotMatch(block[0], /reviewFocus/);
});

test("commissionNote's own field is untouched — still its own state, own textarea", () => {
  assert.match(page, /<label className="commission-note">/);
  assert.match(page, /value=\{commissionNote\}/);
  assert.match(page, /onChange=\{\(event\) => setCommissionNote\(event\.target\.value\)\}/);
});

// --- Reset discipline: only on explicit fresh-journey/commission-reset points ---

test("reviewFocus is reset at exactly the two intended points, and nowhere else (including failure paths)", () => {
  const occurrences = page.match(/setReviewFocus\(""\)/g) || [];
  assert.equal(
    occurrences.length,
    2,
    "expected exactly two resets: startNewForge() and the fresh-Build entrance card",
  );
});

test("failed generation does not reset the decklist or commissionNote either", () => {
  // Both catch blocks that follow a commitDirectForge-style attempt only
  // clear generation output/error state, never the player's inputs.
  const catchBlocks = page.match(/\} catch \(error\) \{[\s\S]*?setForgeGenerationError\([\s\S]*?\);/g) || [];
  assert.ok(catchBlocks.length > 0, "expected at least one matching catch block");
  for (const block of catchBlocks) {
    assert.doesNotMatch(block, /setDeck\(""\)/);
    assert.doesNotMatch(block, /setCommissionNote\(""\)/);
    assert.doesNotMatch(block, /setReviewFocus\(""\)/);
  }
});
