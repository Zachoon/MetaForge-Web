# MF-IMPLEMENTATION-CHANGELOG

Branch `product/mf-product-recovery-001`, based on `origin/main` `e7e38e6` (= production). Local commits only (`bbbffb0` feature, `3614066` links, `d9a4ff7` homepage copy, then docs); nothing pushed, merged or deployed. Upstream tracking was removed from the branch so a stray `git push` has no default target.

## New files

| File | Lines | Purpose |
|---|---|---|
| `app/deck-check-parse.mjs` | 221 | Forgiving decklist parser with per-line reasons; trailing-commander detection; `decklistText` export |
| `app/deck-check-facts.mjs` | 97 | Scryfall `/cards/collection` batching (75/request, 100 ms spacing, injectable fetch), fact normaliser, face-name indexing |
| `app/deck-check-report.mjs` | 574 | Format/structure checks, report assembly over the existing coaches, swap replay (`compareSwap`), player swap (`comparePlayerSwap`), add-legality (`proposedAddIssue`) |
| `app/deck-check-samples.mjs` | 37 | The four sample decks shown on the page (generated from the fixtures; a test fails if they drift) |
| `app/deck-check/page.tsx` | 35 | Route, metadata, canonical, site chrome |
| `app/deck-check/deck-check-client.tsx` | 607 | The Deck Check UI (input, states, report, comparisons, player swap) |
| `app/deck-check/deck-check-types.ts` | 73 | Types for the report shapes the UI reads (keeps the client free of `any`) |
| `app/deck-check/deck-check.css` | 146 | Styles on the shared `--mf-*` tokens; mobile rules |
| `tests/deck-check.test.mjs` | 335 | 21 tests: parsing, facts, format checks, coaching specificity, limits, before/after, player swaps |
| `tests/fixtures/deck-coach/*.txt` + `*.facts.json` | — | 4 real decklists + Scryfall snapshots (2026-11-18) |
| `scripts/deck-check/snapshot-fixture-facts.mjs` | 26 | Re-snapshot fixture facts when a fixture changes |
| `docs/product-recovery/*.md` | — | The mission deliverables |

## Changed files

| File | Change | Why |
|---|---|---|
| `app/curve-role-coach.mjs` | +`swapCatalogCard(name)` read-only export (18 lines). No scoring, range or catalog change. | Lets a suggested add be replayed for before/after |
| `app/site-nav.ts` | Top-nav **Analyze** → `/deck-check` | The analyze entry now leads to analysis |
| `app/page.tsx` | In-app **Analyze** button: when no forged deck exists, carry any typed list to `/deck-check` (sessionStorage) and open it. With a forged deck it still opens the workbench analysis, unchanged. | Same destination as the site nav; existing workbench path preserved |
| `app/components/forge/entrance-chamber.tsx` | Lede now starts "For Commander players."; new visible link "Already play a deck? Paste it for a free coaching report… No account needed." → `/deck-check`; drawer summary renamed "Finishing a partial list, or want an example?" | 10-second clarity: who it's for, and a real path for an existing deck. Guided build stays the one primary action. |
| `app/forge-polish.css` | Styles for `.entrance-check-link` | — |
| `app/tools/data.ts` | 7 tool CTAs (analyzer, checker, mana-base, land calc, colour calc, optimizer, curve) → `/deck-check`; mana-base "Opening-hand evidence / Goldfish" bullet replaced by "Color timing" (what the destination actually does). Power-level and bracket CTAs **unchanged**. | Stop promising what the destination cannot do |
| `app/learn/render-html.mjs`, `worker/public-deck-report.ts` | "Analyze" links → `/deck-check` ("Check my deck →" on public reports) | Consistency |
| `worker/index.ts` | `/deck-check` in sitemap; WebApplication JSON-LD for `/deck-check`; mana-base tool description no longer claims opening-hand diagnosis | SEO consistency with the change above |
| `tests/rendered-html.test.mjs` | Analyzer CTA expectation → `/deck-check`; sitemap count 102 → 103; new test "serves Deck Check to anonymous visitors…" | Locks the new behaviour |

## Explicitly not changed

* No change to guided build, forge generation, guest gates, Turnstile, auth, rate limits, D1 schema, secrets, deploy config.
* No coaching engine weights, ranges or classifications were tuned (two engine quirks are logged in the audit instead).
* `/?intent=analyze` handling in `forge-session-context.tsx` is unchanged (still opens the free decklist), so power-level/bracket CTAs and any old links behave exactly as before; `tests/home-entry-clarity.test.mjs` still pins it.
* No dependency added or upgraded. React stays 19.2.9.
* Nothing from local `main` or `sprint/mf-engineering-001` was reused; no fix there was needed for this slice.
