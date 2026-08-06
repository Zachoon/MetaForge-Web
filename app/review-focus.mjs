// Pure helpers for the Review-path "Before we dive in" one-click coaching
// focus (reviewFocus in page.tsx) — kept in their own module, out of the
// big client component, so the selection/toggle logic is directly
// unit-testable, the same way the rest of the coaching-adjacent logic in
// this app/ directory is.
//
// Client-safe by design: this module ships in the browser bundle (page.tsx
// imports it directly), so it holds only the canonical option list, its
// display labels, and pure UI-state helpers — never the evidence-reading
// evaluators that read nativeReport, which live server-side in
// review-focus-reasoning.mjs (see that file's own header for why the split
// exists and what belongs on which side of it).

export const REVIEW_FOCUS_OPTIONS = [
  "Faster starts",
  "More consistency",
  "Closing games",
  "Better interaction",
  "Understanding the deck",
  "Not sure yet",
];

// Plain-language front door onto the same six canonical values above — a
// brand-new player shouldn't need deckbuilding vocabulary to pick one of
// these. Display-only: REVIEW_FOCUS_OPTIONS (the canonical value) still
// drives selection state, the generation request, and engine reasoning.
// Never read this map for anything but rendering the chip's visible text.
export const REVIEW_FOCUS_LABELS = Object.freeze({
  "Faster starts": "I always feel like I’m playing from behind.",
  "More consistency": "Sometimes everything clicks—and sometimes nothing does.",
  "Closing games": "I get set up, but I can’t finish games.",
  "Better interaction": "I never seem to have the right answer.",
  "Understanding the deck": "I don’t know what this deck is trying to do.",
  "Not sure yet": "I’m not sure—that’s why I’m here.",
});

// One click selects a chip. Clicking the already-selected chip clears it.
// Clicking a different chip replaces the selection. Never requires one.
export function toggleReviewFocus(current, option) {
  return current === option ? "" : option;
}

// Environment-neutral membership check — used by worker/forge-generate.ts
// to validate the request field and by review-focus-reasoning.mjs's own
// entry point, so both sides check against the exact same canonical list
// rather than each re-deriving the condition.
export function isValidReviewFocus(value) {
  return typeof value === "string" && REVIEW_FOCUS_OPTIONS.includes(value);
}
