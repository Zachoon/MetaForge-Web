# MF-SECURITY-002 — Integration plan

> **Correction (2026-11-18):** merging to GitHub `main` does **not** deploy production. See
> [MF-SECURITY-002-CORRECTION-DEPLOY-MODEL](MF-SECURITY-002-CORRECTION-DEPLOY-MODEL.md).

How the React hotfix, local `main` and the MF-ENGINEERING-001 stabilization sprint fit
together. **Nothing was merged, rebased or pushed.** All conflict findings come from
`git merge-tree --write-tree`, which writes no refs and touches no worktree.

## 1. Three lines of history

```
e03fcdd (10/31, last common commit)
├── GitHub main  ── 34 commits (PRs #43–#56) ── 01f03a3  ← PRODUCTION (deployed manually)
│                                                  └── security/mf-security-002-rsc-prod (+3: hotfix, guard test, docs)
└── local main   ── 11 commits (11/3–11/5) ── a8b8305   ← not on GitHub, not in production
                                                  ├── security/mf-security-002-rsc (+2: hotfix, guard test)
                                                  └── sprint/mf-engineering-001 (+10)
```

The 11 local commits were live for about 8 hours: a manual deploy at 2026-11-05 22:46 UTC, until
the first GitHub build replaced it on 2026-11-06 07:03 UTC. **Production has not had them
since.** They are:

| Date | Commit | Subject |
|---|---|---|
| 11/3 | `28b97c5` | Harden first-iteration search, account saves and public reports |
| 11/3 | `a27f208` | Record first-iteration release evidence and remaining gates |
| 11/4 | `61a93d5` | Keep one-shot mana from replacing lands under reviewed exception |
| 11/4 | `2c0ba19` | Make saved deck coaching, practice and status changes trustworthy |
| 11/4 | `71839ad` | Preserve imported facts and cohesion exclusions under reviewed exception |
| 11/4 | `1db03ab` | Keep experiment acceptance aligned with saved-list practice |
| 11/4 | `170ca56` | Surface recovery when a guest verification widget stays blank |
| 11/4 | `28b9a91` | Explain saved-build start guards beside the commission action |
| 11/5 | `9d91945` | Add observational trace audit beside unchanged golden gates |
| 11/5 | `fdc3231` | Clarify beneficial emergence interpretation without changing gates |
| 11/5 | `a8b8305` | Allow floor-safe repair of verified blueprint false friends |

## 2. Conflict map

| Merge | Conflicted files | Caused by the hotfix? |
|---|---|---|
| `01f03a3` + local `main` | 18: 17 `app/**/page.tsx` / forge chamber files, plus `tests/progressive-forge-results.test.mjs` | No |
| prod hotfix + local `main` | Same 18 | **No (identical set)** |
| `01f03a3` + sprint | 20: the 18 above, plus `package.json` and `worker/index.ts` | No |
| prod hotfix + sprint | Same 20 | **No (identical set)** |
| local hotfix (`a8b8305` base) + sprint | 0 (clean) | — |

The hotfix touches only:
- dependency lines in `package.json`
- the two lockfiles
- one new test file

The lockfiles are byte-identical across all three lines, so the hotfix merges or cherry-picks
without conflict into any of them.

The sprint's two extra conflicts:
- **`package.json` `"test"` script.** GitHub changed it to an explicit list of files; the sprint
  changed it to `npm run build && npm run test:all`. Take the sprint's version: `test:all` runs
  every `tests/**/*.test.mjs`, including GitHub's newer files. Check that the files GitHub listed
  before the build step don't need to run before it.
- **`worker/index.ts`.** GitHub added Learn routes (`requestWithLiveLearn`, the RSS route,
  sitemap entries, a robots change). The sprint:
  - renamed the fetch body to `route`
  - wrapped it in `applySecurityHeaders`
  - added per-network limits and `ctx` plumbing
  - added retention to `scheduled`

  Resolve by keeping GitHub's routes inside the sprint's `route()`, and keeping both sets of
  `scheduled` work (`runLearnSchedule` and `runRetention`).

## 3. Recommended order

1. **Ship the hotfix alone** from `security/mf-security-002-rsc-prod` (MF-SECURITY-002-
   DEPLOYMENT-PLAN, Option A).
   - Smallest change.
   - Production's base.
   - No sprint behaviour attached.
2. **Reconcile local `main` with GitHub `main`** (owner decision).
   - Rebase or merge the 11 local commits onto GitHub `main`, resolving the 18 conflicts.
   - Run the full suite.
   - Merging the result into GitHub `main` does not deploy it, but the next `wrangler deploy` from
     `main` will, so treat it as a release in its own right.
   - The hotfix commit `580ae49` is already on GitHub `main` by then. The equivalent local commit
     `52c4cb5` has the same lockfile content, so git treats the dependency change as identical.
     Drop `52c4cb5`/`bbcd4a5` during the rebase, or let them resolve as no-ops.
3. **Rebase the sprint** onto the reconciled `main`.
   - Resolve `package.json` and `worker/index.ts` as described in §2.
   - Rerun `npm run verify`.
   - Update the sprint docs. They say `metaforge.gg` deploys manually and that B-1 is open; both
     are now out of date.
4. **Release the sprint in approved slices** (each merge to `main` is a deploy). The items below
   need separate approval.

## 4. Sprint items and their approvals

| Sprint change | Production effect | Approval needed |
|---|---|---|
| Rate-limit retention fix (`5179376`) | Guest daily limits stop resetting; `api_rate_limits` rows persist up to 25 h | Yes (behaviour change for guests) |
| `.dev.vars` artifact guard (`4782d01`) | Build-time only; GitHub builds have no `.dev.vars` anyway | Low risk; can ship with any slice |
| Card catalog pipeline (`ae980dc`) | Scripts only; no data published | Code: low risk. **Publishing refreshed data is a separate product decision** (about 216 Arena `A-` cards disappear). |
| Public endpoint limits, body caps, edge caches (`c2852fa`) | New 429s on `/api/cards/facts` (120/5 min) and `/api/telemetry` (300/5 min); 24 h card-facts cache; 5 min report cache | Yes |
| Security headers (`b84d399`) | HSTS for 1 year (sticky in browsers), `frame-ancestors 'none'`, XFO DENY | Yes, especially HSTS |
| Data retention (`b84d399`) | Hourly cron deletes `data_goblin_runs` older than 90 days | Yes. Run the count query first. |
| CI workflow + lint ratchet (`2dfa391`) | Activates GitHub Actions on push | Yes. Make CI a required check on `main`; otherwise it can't block an auto-deploy. |
| Scryfall pool edge cache (`2540dc7`) | Fewer Scryfall requests; 24 h cache | Yes (low risk) |
| Line-ending repair / docs | None | No |

The sprint's other open items still stand:
- **B-2.** Sites mirror `.dev.vars` containment.
- **B-3.** Card data.
- Browser verification of the headers.
