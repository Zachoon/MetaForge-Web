# MF-PRODUCTION-GAP-REPORT

What stands between this branch and (a) production, and (b) a paid product. Nothing here was deployed, pushed or merged.

## A. To ship Deck Check to metaforge.gg

| # | Gap | Severity | Owner action |
|---|---|---|---|
| A1 | Branch is local only, based on `e7e38e6`. Needs review, push, PR, merge **and** a manual `npx wrangler deploy` (merges do not deploy). | Blocker | Owner approval at each step |
| A2 | Not exercised in a headed browser by a human; verification was unit tests, server-render tests and a headless-Edge scripted run. | High | 10-minute owner click-through (see `README.md`) |
| A3 | Scryfall is called from the visitor's browser (same pattern the free decklist already uses). No server cache; a busy day multiplies Scryfall calls. Scryfall asks ≤10 req/s per client; Deck Check sends ≤2 requests per check, 100 ms apart. | Medium | Acceptable for launch; consider routing through `/api/cards/facts` with edge caching in Release 2 |
| A4 | No telemetry on Deck Check (deliberately: decklists stay in the browser). There is no way to know usage after launch. | Medium | Decide whether to add a consent-gated `deck_check_completed` event with no card data |
| A5 | Fixture facts are a 2026-11-18 Scryfall snapshot; legality in the tests reflects that day's ban list. | Low | Re-run `scripts/deck-check/snapshot-fixture-facts.mjs` when bans change and update assertions |
| A6 | The 6 pre-existing failing UI source-text tests on main still fail (unchanged by this branch). | Low (pre-existing) | Separate cleanup |

Security review of the change: no new endpoint, no auth/rate-limit/secrets change, no new dependency, no server-side storage, no `dangerouslySetInnerHTML` (all report text is rendered as React text), the only network destination is `api.scryfall.com`. `tests/rsc-advisory-regression.test.mjs` passes; React remains 19.2.9.

## B. Product gaps that remain (honest)

| # | Gap | Why it matters | Notes |
|---|---|---|---|
| B1 | Plan/weakness/swap coaching is Commander-only | 60-card players get a legality/curve check, not coaching | Engines are calibrated for 100 cards; extending needs format-specific ranges (measure first) |
| B2 | Swap catalog is ~40 vetted cards | Solid decks often get "no swap I can vouch for" | Next: rank real candidates from Scryfall search filtered by identity + role classification, still requiring printed-text evidence |
| B3 | No saved Deck Check reports, no history | Players can't return or see progress; required for a paid tier | Guest → account claim already exists for guided drafts; reuse it |
| B4 | No interaction/synergy graph for guests | "Reveal relationships" is only half delivered (plan + roles, not card-to-card) | `forge-interaction-graph` is auth-only server-side by design (it was moved off the client to protect reasoning tables) |
| B5 | Power level / bracket pages promise measurement no guest page performs | Promise-keeping | Either build, or soften copy |
| B6 | Budget awareness absent from Deck Check | Brief asks for budget-aware recommendations | Scryfall `prices.usd` is already in facts responses; show cost delta of a swap without "price precision" claims |
| B7 | Engine quirks (Prismatic Lens not ramp; Elves asked for wipes; vanilla creatures "unread" inside the coach) | Trust | Logged; tune only after measuring across a corpus |
| B8 | Guided build for guests not verified live | Primary path; Turnstile-gated | Owner click-through; never automate Turnstile |

## C. Paid-product readiness checklist

| Area | Today | Needed before charging |
|---|---|---|
| Core value for a new visitor | **Now present** (Deck Check) + guided build | Usage evidence that players return |
| Accounts | Cloudflare Access (private-alpha style) | Public sign-up/sign-in suitable for customers |
| Persistence | D1 benches for Access users; guest 24h sessions | Saved reports, history, progress |
| Payments | None | Stripe (or similar), entitlements, receipts, refunds policy |
| Legal | Terms/Privacy exist | Paid terms, refund policy, Wizards fan-content policy review for paid features |
| Reliability | 2,818/2,824 tests, manual deploy, no CI | CI on PRs, deploy pipeline with smoke test, error budget |
| Observability | Consent-gated telemetry, error reports | Funnel metrics for check → build → save → pay |
| Data | Scryfall live; bundled card tables can't be regenerated (MF-001) | Fix card-data generators (B-3 in the ENG-001 backlog) |
