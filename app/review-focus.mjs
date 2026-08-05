// Pure helpers for the Review-path "Before we dive in" one-click coaching
// focus (reviewFocus in page.tsx) — kept in their own module, out of the
// big client component, so the selection/toggle logic and the generation-
// request note prefix are directly unit-testable, the same way the rest of
// the coaching-adjacent logic in this app/ directory is.

export const REVIEW_FOCUS_OPTIONS = [
  "Faster starts",
  "More consistency",
  "Closing games",
  "Better interaction",
  "Understanding the deck",
  "Not sure yet",
];

// One click selects a chip. Clicking the already-selected chip clears it.
// Clicking a different chip replaces the selection. Never requires one.
export function toggleReviewFocus(current, option) {
  return current === option ? "" : option;
}

// Structured prefix for the note sent to callForgeGenerate. Deliberately
// explains what the line represents rather than concatenating a bare
// label — the engine already scans this same note field for other signals
// (see colorsFromNote in page.tsx), so an unexplained label risks being
// misread as a deck characteristic instead of a player-stated coaching
// focus for this review session.
export function buildReviewFocusContext(reviewFocus) {
  if (!reviewFocus) return "";
  return `Player review focus: ${reviewFocus}. This is the coaching focus the player selected for this review session, not a deck characteristic or constraint.\n`;
}
