# MF-DECK-COACH-004 · Final release verification

Code under test: `rc/mf-deck-coach-003` at `928aa31`, plus docs-only commits after it. Date: 2026-11-19, local, PowerShell. Logs: `C:\Projects\MF-DECK-COACH-004\`.

| Check | Command | Result |
|---|---|---|
| Full suite | `npm run build; node --test` (54 suites) | **2,876 / 2,882 pass, 6 fail. Not green.** The six are the known pre-existing failures below (`full-suite.txt`) |
| Coaching benchmark | `node scripts/deck-check/run-bench.mjs` | **427 / 427**, 0 false-positive advice, 32 cases (`bench.json`) |
| Database-repair regression tests | `node --test tests/public-report-repair.test.mjs tests/public-report-land-count.test.mjs tests/public-report-saved-deck.test.mjs` | **16 / 16** (8 repair, 4 render, 4 publish) |
| Typecheck | `npx tsc --noEmit -p .` | 0 errors |
| Lint | `npx eslint` on all 34 changed code files | 10 errors, **all pre-existing**: `app/page.tsx` 1, `worker/card-facts.ts` 8, `worker/public-deck-report.ts` 1. The same counts on `main`; no changed file gained an error |
| Production build | `npm run build` | passes |
| Browser smoke test | `C:\Projects\MF-DECK-COACH-003\harness\` scenario-003 against `vinext dev` | all steps pass; first insight 2.1 s cold / 1.6 s warm; Baru "38 lands … 34–40"; Sram plan read and confirm; protected Thragtusk never cut; link help; CSV open; 375 px clean; **0 console errors** (`screenshots\results.json`) |
| Security | diff scan, `npm audit`, dependency diff | no new endpoint, no dependency change (lockfile identical to `main`), React 19.2.9; audit unchanged from `main` |
| Merge readiness | `git merge-tree` against open PRs | no conflict with #57, #58 or #60 (#58 also edits `entrance-chamber.tsx` and merges cleanly) |

## The six known failures, individually

Each was run on production `e7e38e6` (worktree `D:\Projects\MetaForge-Deploy-e7e38e6`) and on this branch: same 6 of 57 tests in those files, same assertion messages.

| # | Test | Fails on `main`? | Related to this release? |
|---|---|---|---|
| 1 | `masterwork-progression-track-visual.test.mjs:10`: "the revealed Masterwork uses clear workspace destinations" | yes, same message | No. It asserts `aria-label="Site navigation"` on the Forge rail; this branch does not touch the rail |
| 2 | `masterwork-visual-system.test.mjs:80`: "the workbench replaces the long Forge Path…" | yes | No. Same rail regex |
| 3 | `progressive-forge-results.test.mjs:116`: "turns the result into one active chapter…" | yes | No. Same rail regex |
| 4 | `masterwork-routing-and-suggested-commander.test.mjs:176`: "none of the reported success strings can render outside hasValidatedDeck…" | yes ("Decklist must be unreachable without a validated deck") | No. The rail's Decklist gating predates this branch; this branch's `page.tsx` change is limited to `openAnalyze` |
| 5 | `multi-format-entry-copy.test.mjs:8`: "entry leads with one guided action…" | yes (copy "Tell us how you like to play below…") | No. That sentence is absent on `main`. This branch edits `entrance-chamber.tsx` (lede, a new link), and the failure message is identical |
| 6 | `progressive-forge-results.test.mjs:231`: "turns new-deck setup into three explicit starting paths…" | yes (`setBuildPath("scratch")`) | No. The entry-path structure was retired before this branch |

They are left unchanged: fixing them means deciding what the Forge rail and homepage should assert, which is outside this release.

## Not verified

* The deployed worker at runtime. `vinext start` cannot provide Cloudflare bindings locally, and `wrangler dev` was not set up. The worker paths are covered by tests that bundle the real handlers.
* Safari, Firefox, screen readers.
* Anything against production: no export, deploy or write was run.
