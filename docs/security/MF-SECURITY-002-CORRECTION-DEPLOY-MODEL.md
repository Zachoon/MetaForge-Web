# MF-SECURITY-002 — Correction: merging does not deploy production

2026-11-18. This corrects a claim in the MF-SECURITY-002 documents.

## What was wrong

MF-SECURITY-002 stated that merges to GitHub `main` deploy metaforge.gg automatically (most
likely through Cloudflare Workers Builds). That was inferred from timing alone: each PR #45–#56
merge was followed 30–120 s later by a `wrangler` deployment. **It is not true.**

## Evidence (MF-SECURITY-003)

- PR #59 was merged at 2026-11-18 02:00:16 UTC (`e7e38e6`). No Worker version was uploaded and
  no deployment happened for the next 13 hours. Production stayed on `01f03a3`
  (version `8ad379ff`).
- No merge commit on `main` has ever had a GitHub check run or commit status. Workers Builds
  reports a check run for each build.
- The repository has no webhooks and no GitHub Deployments.
- PR #50 (merged 2026-11-06 16:36) got no deploy of its own.
- No preview versions exist for pushed non-`main` branches.
- Every deployment is a `wrangler` upload under the owner's Cloudflare account. The earlier
  merge-then-deploy pattern fits whoever merged those `cursor/*` PRs also running
  `wrangler deploy`.

## Current deploy model

- **Production changes only when someone runs `npx wrangler deploy`.**
- Merging to GitHub `main` records what *should* be live; it deploys nothing.
- Deploy only from a clean checkout of current GitHub `main` (detached HEAD at the merge commit),
  never from local `main` or a feature branch.
- Check what is live with `GET https://metaforge.gg/api/forge/status`. Its `build` field is the
  commit SHA compiled into the running Worker. The `client-error-reporter-*.js` asset carries
  the same stamp.
- The React hotfix itself was deployed manually under MF-SECURITY-004 on 2026-11-18 at
  15:07:37 UTC (deployment `c14839cd-e045-47a6-8240-1079e69840df`, version
  `a5339934-c918-4a3b-8bb5-6d63a0109490`).

If Workers Builds or a deploy workflow is connected later, update this document and the deploy
memory together, and confirm it with a real merge rather than by timing.

## Statements this supersedes

| Document | Statement | Corrected |
|---|---|---|
| BASELINE §1 | Merges to GitHub `main` are deployed automatically; treat merging as a deploy | Merging does not deploy |
| DEPLOYMENT-PLAN prerequisite 2, Option A | Merge = deploy | Merge, then run `wrangler deploy` from a clean checkout of the merge commit |
| DEPLOYMENT-PLAN Option B step 3 | The next merge redeploys 19.2.6 | It does only if someone deploys that `main`; keep `main` and production in step anyway |
| ROLLBACK-PLAN step 2 | Production redeploys on every merge | A revert PR keeps `main` honest; it does not deploy by itself |
| INTEGRATION-PLAN | `main` is "auto-deployed on merge"; merging the reconciled `main` deploys it | Merging the reconciliation is not a deploy; deploying it is a separate, approved step |
| FINAL-REPORT §§0, 4, 5 | push / merge (= deploy) | Merge and deploy are separate approvals |
