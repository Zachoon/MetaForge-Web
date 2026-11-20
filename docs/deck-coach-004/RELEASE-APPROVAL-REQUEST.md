# MF-DECK-COACH-004 · Release approval request

**Status: waiting for owner authorization. Nothing has been pushed, merged, deployed or written to production.**

## 1. Branch and target

* **Head:** `rc/mf-deck-coach-003` (local only, no upstream). It holds the whole linear stack: MF-PRODUCT-RECOVERY-001 → 002 → 003 → 004.
* **Target:** `main` on `Zachoon/MetaForge-Web` (public), currently `e7e38e6`, which is also live production.
* **PR text:** `docs/deck-coach-004/PR-DESCRIPTION.md`.

## 2. Final test status

* **Full suite: 2,876 / 2,882.** The six failures are pre-existing, identical on `main`, and unrelated; each is listed in `RELEASE-VERIFICATION.md`. The suite is not fully green.
* Benchmark: 427 / 427, with 0 false-positive advice.
* Database-repair tests: 16 / 16.
* Typecheck: clean. Lint: no new errors. Build: passes.
* Browser smoke: passes with 0 console errors. Owner walkthrough: done.

## 3. Database write behavior

* **No schema change and no migration.**
* **Page views never write.** The public report fixes its display in memory.
* **Publishing** a report (already a write) now also stores card type lines.
* **The one-time repair of existing reports is separate and manual:** an owner-run script produces audited, guarded SQL. Expected scope: 1 report (Baru), 64 type lines filled, `deck_rows_json` only. It can be done any time after deploy, or never; the page shows 38 lands either way.

## 4. Backup and rollback readiness

* **Code:**
  * Before deploying, record the live version with `npx wrangler deployments list` (expected: `a5339934-c918-4a3b-8bb5-6d63a0109490`).
  * To roll back: `npx wrangler rollback <that version>`.
  * Deck Check is additive; rollback removes it cleanly.
* **Data:** nothing to roll back unless the repair is applied. If it is: `rollback.sql` (guarded, byte-exact, tested), a full `wrangler d1 export` taken first, and D1 Time Travel.

## 5. Remaining risks

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| Behaviour changes on existing pages: the land band is wider ("over" is rarer) in the workbench mana coach; the browser classifier now counts symbol rocks as ramp (free-build, Learn); tool links go to `/deck-check` | Expected, intended / low | Covered by tests; listed in the PR |
| Deployed worker not exercised end to end before release | Medium / medium | Post-deploy checklist straight after deploy; rollback is one command |
| Scryfall unavailable | Low / Deck Check cannot read new lists; it says so and offers retry | The existing error and retry states |
| Large public PR (1.7 MB of Scryfall snapshots) | — / review effort | Fixtures are data for offline tests |
| Pre-existing `next` 16.2.6 advisory | — / unchanged by this PR | Separate security task |

## 6. Deployment sequence (each step after your go-ahead)

1. **Push** `rc/mf-deck-coach-003` and **open the PR** to `main` with `PR-DESCRIPTION.md`.
2. **You review and merge.** Merging does not deploy.
3. **Prepare:** in `D:\Projects\MetaForge-Web-Deploy`:
   * check `git status` is clean
   * `git fetch`, then `git checkout --detach <merge commit>`
   * the lockfile is unchanged, so `npm install` is not needed
   * `git checkout -- tests/commander-torture-bench`
   * `npm run build`
4. **Record and deploy:** `npx wrangler deployments list` (record the rollback version), then `npx wrangler deploy`.
5. **Verify:** work through the post-deployment checklist in `PR-DESCRIPTION.md`. On a critical regression, run `npx wrangler rollback <recorded version>` and stop.
6. **Optional, separate approval:** the data repair, following `DATABASE-REPAIR-RUNBOOK.md` steps 1–6.
7. **Record:** the deployed commit, the version ID and the evidence in `docs/deck-coach-004/` (local).

**Please reply with which of these you authorize:** push and open the PR (1); deploy after merge (3–5); the data repair (6). Each can be approved separately.
