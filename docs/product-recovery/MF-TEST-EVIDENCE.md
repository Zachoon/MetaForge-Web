# MF-TEST-EVIDENCE

All commands run from `D:\Projects\MetaForge-Product-Recovery-001` in PowerShell (builds/tests) on 2026-11-18. Raw logs: `C:\Projects\MF-PRODUCT-RECOVERY-001\`.

## 1. New tests: `tests/deck-check.test.mjs` — 21/21 pass, offline

Fixtures: `tests/fixtures/deck-coach/` — four real decklists with Scryfall facts snapshotted on 2026-11-18 (`scripts/deck-check/snapshot-fixture-facts.mjs`). All 168 distinct card names resolved except the two deliberate misspellings.

| Fixture | Purpose | Key assertions |
|---|---|---|
| `ezuri-elves-needs-work` (100 cards, Moxfield style) | Normal input, a deck with real holes | Plan "Elves" high confidence; weaknesses draw → interaction → wipes, each citing a card *in the list* with its quoted text; one genuine identity error (Rhys the Exiled); top swap replayed: Card advantage 2 → 3 and the exact "8 short… one swap starts the fix" verdict; updated list round-trips to 100 cards |
| `talrand-spells-solid` (100 cards, Arena set codes) | Normal input, a sound deck | Legal; single weakness (ramp 6 vs 9–13); no vetted swap → honest note; player swap Accumulated Knowledge → Coldsteel Heart moves ramp 6 → 7 |
| `krenko-invalid-edge` (43 cards) | Invalid/edge input | Exactly: 2 unknown names, size 43≠100, 2× Lightning Bolt, off-identity Swords to Plowshares, banned Dockside Extortionist, implied-quantity note; sideboard set aside; Blasphemous Act swap "inside the 1–2 range" with its interaction trade-off |
| `modern-burn-60` (60 + sideboard) | Other format | Modern legal; Standard → per-card "not legal in Standard (Scryfall legality data)"; Commander → needs-commander with no candidates |

Other covered cases: every export decoration listed in the slice doc; empty / whitespace / `null` / nonsense / 9999-copy input; headerless list with a commander picker; copy-limit printed exceptions (basics, Relentless Rats, Seven Dwarves); Scryfall batching 80 → [75, 5] with `not_found`; network throw and HTTP 503 reported as failure, not an empty deck; refusals for off-identity, banned, duplicate, not-in-deck, unknown adds; "no AI-powered / win rate / guarantee" anywhere in three reports; sample decks on the page byte-identical to fixtures; vanilla creature not reported as unread.

```powershell
node --test tests/deck-check.test.mjs
```

## 2. Server-rendered HTML (built worker)

`tests/rendered-html.test.mjs` new test "serves Deck Check to anonymous visitors and links every analyze entry point to it": `/deck-check` 200 with title, canonical, WebApplication JSON-LD, sample buttons, privacy line, nav Analyze → `/deck-check`; homepage lede and the new link; sitemap contains `/deck-check` (count 102 → 103). Analyzer CTA expectation moved to `/deck-check`.

```powershell
npm run build; node --test tests/rendered-html.test.mjs tests/home-entry-clarity.test.mjs
```

## 3. Targeted regression set on the final code — 132/132 pass

`deck-check`, `rendered-html`, `home-entry-clarity`, `curve-role-coach`, `plan-weakness-coach`, `mana-base-coach`, `rsc-advisory-regression`, `free-decklist-ghost-frame`, `free-build-coach`, `api-hardening`, `guest-forge-boundary` (built first).

## 4. Full suite

| Run | Code state | Result |
|---|---|---|
| 1 | Feature complete, before review fixes | 2,824 tests: **2,818 pass, 6 fail** (`full-suite-run-1.txt`) |
| 2 | + vanilla-creature, retry-button and copy fixes | **2,818 pass, 6 fail** (`full-suite-run-2.txt`) |
| 3 | **Final code** (`d9a4ff7`: + commander hand-off, types/lint) | **2,818 pass, 6 fail** (`full-suite-run-3-final.txt`) |

The 6 failures are exactly the pre-existing ones named in the brief, all UI source-text assertions: `masterwork-progression-track-visual:10`, `masterwork-routing-and-suggested-commander:176`, `masterwork-visual-system:80`, `multi-format-entry-copy:8`, `progressive-forge-results:116` and `:231`. No new failure. Torture-bench JSON rewritten by the suite was restored with `git checkout` after each run.

## 5. Static checks

* `npx tsc --noEmit -p .` → **0 errors, whole project**.
* `npx eslint` on every new file → **0 problems** (one justified `eslint-disable-next-line react-hooks/set-state-in-effect` for the post-hydration sessionStorage restore). The rest of the codebase is not lint-clean (e.g. 96 errors across four existing forge files); untouched.
* `npm run build` → success; `/deck-check` listed in the route table.

## 6. Real-browser behaviour (headless Microsoft Edge, scripted)

Claude in Chrome was not connected (two attempts) and the built-in browser pane is excluded by owner rule, so a local harness drives headless Microsoft Edge (Chromium) over the DevTools protocol: `C:\Projects\MF-PRODUCT-RECOVERY-001\harness\`. **This is a real browser engine running the real page, but scripted and headless, not a person clicking in a headed browser.**

Scenario `scenario-local.json` against `npx vinext dev --port 5199` (results: `screenshots/local-browser-results.json`):

| Step | Result |
|---|---|
| Empty state | h1 "Check your deck"; 4 samples; submit disabled; all inputs labelled |
| Click "Ezuri elves" (live Scryfall fetch) | Report rendered; **focus moved to the report heading**; 1 format problem; 3 weaknesses; 3 change tabs; verdict text as in tests |
| Own swap: Krosan Tusker → Swords to Plowshares | Refused: "Swords to Plowshares is white, outside the commander's green color identity." |
| Own swap: Krosan Tusker → Guardian Project | Measured comparison rendered |
| 375 × 812, "Krenko goblins" | 6 errors with line numbers; "43 cards counted, 2 lines set aside"; **no horizontal scroll (scrollWidth 375)**; **no control under 44 px** |
| 375 × 812, "Modern burn" | "Modern check", legal, limits explain Commander-only coaching; no horizontal scroll |
| Nonsense input | "None of the 2 lines could be read as a card…" and no retry button |
| Homepage | New lede and "Already play a deck?" link present |
| Console | **0 errors / warnings / exceptions** across the run |

Production "before" (`scenario-prod.json`, read-only): Analyze → "Empty decklist", `pasteVisible:false`, `countsVisible:false`, `coachingDisabled:true`; analyzer tool CTA → `/?intent=analyze`.

Not verified in any browser: offline/Scryfall-outage UI (covered by unit tests of `fetchCardFacts` and by code review of the error branch), screen-reader announcement order, Safari/Firefox.

## 7. Security

No new endpoint, no auth/rate-limit/secret change, no dependency change, no server storage; only outbound destination `api.scryfall.com` (already used); all report text rendered as React text. `tests/rsc-advisory-regression.test.mjs` passes; React 19.2.9.
