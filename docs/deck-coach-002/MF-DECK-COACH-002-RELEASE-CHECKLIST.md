# MF-DECK-COACH-002 — Release checklist (controlled deployment)

Status key: ✅ done and verified here · 🟡 done with a stated limit · ⬜ owner action (not authorized for this mission)

## Engineering gates

| # | Gate | Status | Evidence |
|---|---|---|---|
| 1 | Isolated branch from the completed product-recovery work | ✅ | `rc/mf-deck-coach-002` from `b97369e`; no upstream |
| 2 | React 19.2.9 security baseline | ✅ | Lockfile byte-identical to production `e7e38e6`; RSC regression test passes |
| 3 | Confirmed coaching defects fixed, each with a test | ✅ | `MF-DECK-COACH-002-CLASSIFIER-FIXES.md`; `tests/deck-coach-002-regressions.test.mjs` |
| 4 | Repeatable 20+ deck benchmark with explicit scoring | ✅ | 24 cases, 98.8%, 0 false-positive advice; floor enforced by a test |
| 5 | Full regression suite, no new failures | ✅ | See Test Evidence §1 (only the 6 known pre-existing failures) |
| 6 | Typecheck | ✅ | `npx tsc --noEmit -p .` → 0 errors |
| 7 | Lint on changed code | ✅ | 0 errors; 5 warnings, all in lines that predate this mission |
| 8 | Production build | ✅ | `npm run build` succeeds; `/deck-check` in the route table |
| 9 | Browser checks, desktop and 375 px | 🟡 | Scripted headless Microsoft Edge (Claude in Chrome was not connected; the built-in browser pane is excluded by owner rule). No overflow, no tap target under 44 px, 0 console errors |
| 10 | Guest access | ✅ | `/deck-check` renders for anonymous visitors (rendered-HTML test); no Turnstile or account needed because it calls no MetaForge API |
| 11 | Signed-in workflow (non-destructive) | 🟡 | Not exercised: no test account is authorized for this mission. Deck Check has no signed-in path; the in-app **Analyze** hand-off from MF-PRODUCT-RECOVERY-001 is unchanged and covered by its source tests |
| 12 | Security and dependency check | ✅ / 🟡 | No regression. Pre-existing `next` advisory documented, with an argument that it does not reach the worker bundle |
| 13 | Six known test failures classified | ✅ | Test Evidence §3: stale UI-source assertions, not release blockers |

## Before deploying (owner)

| # | Action | Who |
|---|---|---|
| A | Click through the demo in a real, headed browser (`MF-DECK-COACH-002-OWNER-DEMO.md`), ideally with one or two of your own decks | ⬜ owner |
| B | Read two or three full reports as a player, especially a deck you know well. The benchmark checks failure modes, not taste | ⬜ owner |
| C | Decide whether this branch (and MF-PRODUCT-RECOVERY-001 under it) goes to a PR. Pushing is not authorized here | ⬜ owner |
| D | Decide on the `next` 16.2.6 → 16.4.6 advisory follow-up (separate security task) | ⬜ owner |
| E | Decide on a consent-gated usage event for Deck Check (none exists) | ⬜ owner |
| F | Deploy is manual (`wrangler deploy`; merging does not deploy). Afterwards, confirm the live build via `/api/forge/status` and load `/deck-check` | ⬜ owner |

## Rollback

* Production is `e7e38e6` (worker version recorded in MF-SECURITY-002).
* Deck Check is additive: a new route plus link changes.
* The engine fixes also change Forge/workbench coaching text in the cases listed in the Classifier Fixes doc (for example, go-wide decks no longer get a wipe weakness).
* To roll back, redeploy the previous worker version.

## Explicitly out of this release

Power level, brackets, prices, win rates and matchup claims are not included, and neither is non-Commander coaching. The plan reads for Ghalta, Sram and Tymna are known gaps that the report flags as uncertain.
