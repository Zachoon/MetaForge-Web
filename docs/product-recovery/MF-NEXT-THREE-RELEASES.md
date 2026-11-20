# MF-NEXT-THREE-RELEASES

Ordered for player value and trust, toward paid-product readiness. Each release ends with a manual, owner-approved deploy and a live check of `/api/forge/status`.

## Release 1 — "Check any deck" (this branch, ~1 day to ship)

Goal: every visitor can understand and improve a deck they already play, with no account.

1. Owner click-through of `/deck-check` and the homepage on desktop and phone (README).
2. Decide A4 (consent-gated, card-free usage event) and B5 (power/bracket copy).
3. PR from `product/mf-product-recovery-001`, merge, `npx wrangler deploy`, verify `/deck-check` 200 and `build` SHA.
4. Watch the Scryfall error rate on the client error reporter for a week.

Success signal: share of visitors who reach a report; share who open a suggested change.

## Release 2 — "Coach every list" (~1–2 weeks)

Goal: make the coaching useful for solid decks and 60-card players, and connect it to building.

1. **Real swap candidates (B2).** Search Scryfall by identity + needed role, classify with `classifyPrintedCard`, require quoted evidence, replay through `compareSwap`; keep the vetted catalog as the trusted first choice. Measure across the existing commander corpus before shipping (no magic numbers).
2. **Budget-aware swaps (B6).** Show the add's current Scryfall USD price and the cut's, as "about $X at Scryfall's listed price today"; optional max-price filter. No price precision claims.
3. **Open in the coach.** "Keep improving this deck" hands the checked list to the free decklist / guided flow (same sessionStorage pattern now used in reverse), so check → build is one journey.
4. **Adopt the parser** in the free decklist (fixes silent line drops for builders too).
5. **60-card coaching, first slice (B1):** curve and land ratio guidance for 60-card formats, sourced and labelled, after measuring a corpus of real lists.
6. Engine quirks (B7) handled through the construction-quality audit process.

## Release 3 — "Keep and grow" (~3–4 weeks, paid-ready foundations)

Goal: give players a reason to come back, and the foundations to charge.

1. **Saved reports and history (B3):** save a Deck Check report to an account; show before/after across versions (reuse `deck-bench`, `revision-learning`, guest-claim flow).
2. **Public accounts:** customer-grade sign-in alongside or instead of Cloudflare Access.
3. **Relationships for everyone (B4):** a rate-limited, unauthenticated, cached version of the interaction/systems report for checked decks, or a deliberate decision to make it a paid feature.
4. **CI + deploy pipeline:** run the suite on PRs, block on new failures, scripted deploy with smoke test.
5. **Entitlements & payments design** (no implementation until the funnel from Releases 1–2 shows retention). Candidate paid tier: saved history, unlimited guided builds, relationship maps, budget-constrained rebuild plans; the free tier keeps Deck Check.
