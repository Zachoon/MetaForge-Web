// Public entry-point mapping for Academy guide CTAs. A guide's "Investigate
// my deck" link sends a stable, public key (?guide=cast-spells) — never the
// canonical reviewFocus string itself — so the URL a player sees and shares
// never exposes an internal engine value. This module is the only place
// that translates a public key into real app state, and it's client-safe:
// page.tsx imports it directly to resolve the key on mount.
//
// Every entry's reviewFocus is validated against REVIEW_FOCUS_OPTIONS (the
// single source of truth in review-focus.mjs) at module load — a typo'd or
// retired focus value here fails loudly at build/test time, never silently
// sends a real player into refine mode with an invalid selection.
import { REVIEW_FOCUS_OPTIONS } from "./review-focus.mjs";

const ACADEMY_GUIDE_ENTRIES = Object.freeze({
  "cast-spells": Object.freeze({ chamber: "refine", reviewFocus: "More consistency" }),
});

for (const [key, entry] of Object.entries(ACADEMY_GUIDE_ENTRIES)) {
  if (!REVIEW_FOCUS_OPTIONS.includes(entry.reviewFocus)) {
    throw new Error(`Academy guide entry "${key}" points to a reviewFocus value that isn't one of the six canonical options: ${entry.reviewFocus}`);
  }
}

// Never throws, never returns anything for an unrecognized key — an
// unknown or malformed ?guide= value must be ignored safely, not treated
// as an error.
export function resolveAcademyGuideEntry(key) {
  if (typeof key !== "string" || !key) return null;
  return ACADEMY_GUIDE_ENTRIES[key] || null;
}
