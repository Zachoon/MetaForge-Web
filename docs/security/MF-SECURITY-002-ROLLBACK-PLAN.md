# MF-SECURITY-002 — Rollback plan

Rolling back **restores the vulnerable React 19.2.6 runtime**. Do it only if the hotfix itself
causes a production failure that outweighs that risk, and prefer fixing forward where possible.

## Roll back if, within the first hour after deploy

- `/`, `/decks/<slug>` or the Forge start page returns 5xx, or renders blank
  (hydration failure, `Minified React error` in the console) on more than an occasional request.
- The `wrangler tail` error rate is clearly above pre-deploy levels. Take a 10-minute sample
  before deploying for comparison.
- Guided build, deck save or account sign-in stops working, and the cause traces to the React
  upgrade.

## Do not roll back for

- A 500 on a hand-crafted server-action request. These were already 500 before the hotfix
  (see the baseline).
- Unrelated issues already present in `01f03a3`.

## How to roll back

1. Roll the Worker back to the pre-hotfix version:
   ```
   npx wrangler deployments list
   npx wrangler rollback 8ad379ff-4449-46d6-b6ef-fd92a0e953c1 --message "Roll back MF-SECURITY-002"
   ```
   Use the version ID you recorded before deploying if it differs.
2. **Also revert the hotfix on GitHub `main`** with a revert PR of `580ae49`. Production
   redeploys on every merge to `main`, so otherwise the next merge puts the hotfix straight back.
   This is preferable to leaving `main` and production out of step.
3. Nothing else needs rolling back:
   - no D1 migration
   - no data change
   - no configuration change
   - no secrets
4. Open an incident note recording:
   - what failed
   - the Worker version IDs
   - the time window during which the vulnerable version was live again

## Fix forward instead (preferred)

Possible fixes:
- If a React 19.2.9 behaviour change breaks a specific component, patch that component on top of
  the hotfix.
- Alternatively, move to `19.3.1`, the other patched line. That is a minor-version jump and needs
  its own test cycle.

Do not drop below 19.2.9.
