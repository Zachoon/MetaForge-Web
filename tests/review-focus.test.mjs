import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  REVIEW_FOCUS_OPTIONS,
  REVIEW_FOCUS_LABELS,
  toggleReviewFocus,
  isValidReviewFocus,
} from "../app/review-focus.mjs";

// The evidence-reading evaluators (evaluateReviewFocus and friends) are
// deliberately NOT imported here — this file covers the client-safe half
// of the split (options, labels, toggle state, the page.tsx UI contract).
// See tests/review-focus-reasoning.test.mjs for the server-only coaching
// logic, and this file's own "client bundle" test below for the proof
// that split actually holds in the built output.

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
// commitDirectForge's request composition and the reviewFocusResult
// reply-splicing moved to forge-session-context.tsx during the page.tsx
// decomposition (Phase 4 Stage 2).
const forgeSessionContext = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
// The review-focus chip picker and commission-note field are part of the
// commission/refine chamber's JSX, which moved to its own component during
// the page.tsx decomposition (Phase 4 Stage 3).
const commissionChamber = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

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

// --- Generation-request field composition ---

test("reviewFocus travels to the server as its own dedicated field, not folded into the free-text note", () => {
  // The imported/refine call site must pass reviewFocus as a top-level
  // callForgeGenerate property. The note field composes only commissionNote
  // and interventionLearning — reviewFocus is deliberately absent from it
  // (worker/forge-generate.ts validates and evaluates it separately), so an
  // unexplained label can no longer be misread by the engine's own
  // note-scanning signals (colorsFromNote, blueprint intent parsing).
  assert.match(
    forgeSessionContext,
    /note: `\$\{commissionNote\}\\n\$\{interventionLearning\.reusableGuidance\}`\.trim\(\)/,
  );
  assert.match(forgeSessionContext, /reviewFocus: reviewFocus \|\| undefined,/);
});

test("no reference to the retired note-prefix helper remains", () => {
  assert.doesNotMatch(page, /buildReviewFocusContext/);
});

test("the coaching result is rendered inside the existing reply/results experience, not a new UI element", () => {
  assert.match(
    forgeSessionContext,
    /replyText: `\$\{nativeReport\.methodology\}[\s\S]*?\$\{reviewFocusResult \? `\\n\\nCoaching focus/,
  );
});

// --- UI presence / absence by chamber ---

test("the chip picker renders only when chamber is \"refine\"", () => {
  assert.match(commissionChamber, /\{chamber === "refine" \? \(\s*<details className="review-context-disclosure">/);
  assert.match(commissionChamber, /className="review-focus-picker"/);
});

test("chips do not appear in commission/build mode — no second render site outside the refine guard", () => {
  const occurrences = commissionChamber.match(/className="review-focus-picker"/g) || [];
  assert.equal(occurrences.length, 1);
});

test("exact UI copy is present", () => {
  assert.match(commissionChamber, /Tell us what feels wrong/);
  assert.match(commissionChamber, /WHAT’S HAPPENING WHEN YOU PLAY THIS DECK\?/);
});

// --- Accessibility ---

test("each chip button is explicitly type=\"button\" (never submits/gates a form)", () => {
  const block = commissionChamber.match(
    /<div className="review-focus-picker">[\s\S]*?<label className="commission-note">/,
  );
  assert.ok(block, "expected to find the review-focus-picker block");
  assert.match(block[0], /<button\s+type="button"\s+key=\{option\}/);
});

test("aria-pressed is driven directly off the current selection, not a static value", () => {
  assert.match(commissionChamber, /aria-pressed=\{reviewFocus === option\}/);
});

test("the chip group has an explicit accessible label tied to the question text", () => {
  assert.match(commissionChamber, /<p id="review-focus-question">WHAT’S HAPPENING WHEN YOU PLAY THIS DECK\?<\/p>/);
  assert.match(
    commissionChamber,
    /className="review-focus-chips"\s+role="group"\s+aria-labelledby="review-focus-question"/,
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
  const block = commissionChamber.match(
    /<div className="review-focus-picker">[\s\S]*?<label className="commission-note">/,
  );
  assert.ok(block, "expected to find the review-focus-picker block");
  assert.match(block[0], /\{REVIEW_FOCUS_LABELS\[option\]\}/);
  assert.doesNotMatch(block[0], />\s*\{option\}\s*<\/button>/);
});

test("selection state, aria-pressed, and the toggle call still key off the canonical value, not the label", () => {
  assert.match(commissionChamber, /reviewFocus === option \? "review-focus-chip is-selected"/);
  assert.match(commissionChamber, /aria-pressed=\{reviewFocus === option\}/);
  assert.match(commissionChamber, /toggleReviewFocus\(current, option\)/);
});

test("no separate Continue/Confirm button was added — one button per chip, nothing else", () => {
  const block = commissionChamber.match(
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
  const block = commissionChamber.match(/className="awaken-button"[\s\S]*?onClick=\{awaken\}/);
  assert.ok(block, "expected to find the awaken-button disabled condition");
  assert.doesNotMatch(block[0], /reviewFocus/);
});

test("commissionNote's own field is untouched — still its own state, own textarea", () => {
  assert.match(commissionChamber, /<label className="commission-note">/);
  assert.match(commissionChamber, /value=\{commissionNote\}/);
  assert.match(commissionChamber, /onChange=\{\(event\) => setCommissionNote\(event\.target\.value\)\}/);
});

// --- Reset discipline: only on explicit fresh-journey/commission-reset points ---

test("reviewFocus is reset at exactly the two intended points, and nowhere else (including failure paths)", async () => {
  // startNewForge()'s reset moved to forge-session-context.tsx; the
  // fresh-Build entrance card's reset moved to entrance-chamber.tsx.
  const entranceChamber = await readFile(new URL("../app/components/forge/entrance-chamber.tsx", import.meta.url), "utf8");
  const occurrences = [
    ...(page.match(/setReviewFocus\(""\)/g) || []),
    ...(forgeSessionContext.match(/setReviewFocus\(""\)/g) || []),
    ...(entranceChamber.match(/setReviewFocus\(""\)/g) || []),
  ];
  assert.equal(
    occurrences.length,
    2,
    "expected exactly two resets: startNewForge() and the fresh-Build entrance card",
  );
});

test("failed generation does not reset the decklist or commissionNote either", () => {
  // Both catch blocks that follow a commitDirectForge-style attempt only
  // clear generation output/error state, never the player's inputs.
  const catchBlocks = forgeSessionContext.match(/\} catch \(error\) \{[\s\S]*?setForgeGenerationError\([\s\S]*?\);/g) || [];
  assert.ok(catchBlocks.length > 0, "expected at least one matching catch block");
  for (const block of catchBlocks) {
    assert.doesNotMatch(block, /setDeck\(""\)/);
    assert.doesNotMatch(block, /setCommissionNote\(""\)/);
    assert.doesNotMatch(block, /setReviewFocus\(""\)/);
  }
});

// --- isValidReviewFocus: the environment-neutral validation helper ---

test("isValidReviewFocus accepts exactly the six canonical values", () => {
  for (const focus of REVIEW_FOCUS_OPTIONS) assert.equal(isValidReviewFocus(focus), true);
});

test("isValidReviewFocus rejects empty string, undefined, and unrecognized values", () => {
  assert.equal(isValidReviewFocus(""), false);
  assert.equal(isValidReviewFocus(undefined), false);
  assert.equal(isValidReviewFocus("Something made up"), false);
});

// --- Module boundary: the evaluators must never reach the client ---

test("review-focus.mjs (the client-imported half) never imports the server-only reasoning module", async () => {
  const source = await readFile(new URL("../app/review-focus.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import.*review-focus-reasoning/m, "review-focus.mjs must not import its own server-only sibling — mentioning it in a comment is fine, importing it is not");
  assert.doesNotMatch(source, /export function evaluateReviewFocus/);
});

test("the production client bundle never contains the server-side coaching templates, thresholds, or evaluator branch strings", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const clientDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
  assert.ok(fs.existsSync(clientDir), "dist/client must exist — run `npm run build` first");
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  walk(clientDir);
  const clientSource = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  // Sentence fragments unique to the server-only coaching copy — if any of
  // these show up in the client bundle, review-focus-reasoning.mjs (or a
  // module that imports it) leaked into a "use client" import chain.
  for (const serverOnlyFragment of [
    "You wanted to know why this deck sometimes feels like it's playing catch-up",
    "I don't have a reliable way to measure how this deck closes games",
    "The Forge did not detect a dedicated finisher",
    "contribute directly to how this deck can finish a game",
    "work together to create this deck's clearest, most repeatable plan",
    "covers about",
  ]) {
    assert.doesNotMatch(clientSource, new RegExp(serverOnlyFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
