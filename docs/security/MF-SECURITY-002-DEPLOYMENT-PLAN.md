# MF-SECURITY-002 — Deployment plan

> **Correction (2026-11-18):** merging to GitHub `main` does **not** deploy production. See
> [MF-SECURITY-002-CORRECTION-DEPLOY-MODEL](MF-SECURITY-002-CORRECTION-DEPLOY-MODEL.md).

**Nothing here has been executed.** Each step marked (approval) needs the owner.

## What ships

| Item | Value |
|---|---|
| Branch | `security/mf-security-002-rsc-prod` (worktree `D:\Projects\MetaForge-Security-002-Prod`) |
| Base | `01f03a3`, GitHub `main` = current production |
| Hotfix commit | `580ae49` "Upgrade React to 19.2.9 to patch the RSC remote-code-execution advisory" (`package.json`, `package-lock.json`, `pnpm-lock.yaml`) |
| Guard test commit | `f695e0b`. Test only, no runtime effect. |
| Docs commit | The commit adding `docs/security/MF-SECURITY-002-*`. Docs only, no runtime effect. |
| Dependency changes | `react` 19.2.6 → 19.2.9, `react-dom` 19.2.6 → 19.2.9, `react-server-dom-webpack` 19.2.6 → 19.2.9. Nothing else. |
| Schema / D1 / config changes | None |

## Prerequisites (approval)

1. The owner accepts the advisory assessment in MF-SECURITY-002-ADVISORY-MATRIX.
2. Confirm in the Cloudflare dashboard how production is built: Workers & Pages →
   `metaforge-private-alpha` → Settings → Builds.
   - ~~Evidence says merges to GitHub `main` deploy automatically within 1–2 minutes.~~
     Corrected 2026-11-18: they do not. After merging, deploy with `npx wrangler deploy` from a
     clean checkout of the merge commit.
   - Note the build command and package manager (expected: npm with `package-lock.json`).
3. No other PR should be merged into GitHub `main` between the hotfix merge and its verification.
4. Record the current production version for rollback:
   `8ad379ff-4449-46d6-b6ef-fd92a0e953c1` (deployed 2026-11-09 19:17:16 UTC from `01f03a3`).
   Re-check it right before deploying with `npx wrangler deployments list`.

## Option A — merge through GitHub (recommended)

Keeps GitHub `main`, the production build and the hotfix in one place.

1. (approval: push) Push the branch:
   `git -C D:\Projects\MetaForge-Security-002-Prod push -u origin security/mf-security-002-rsc-prod`
   - If Workers Builds is set to build non-production branches, this creates a **preview
     version**, not a deployment.
   - `preview_urls` is `false` in `wrangler.jsonc`, so there may be no preview URL.
2. (approval: publish) Open a PR into `main`. If GitHub reports the branch is behind `main`
   because something merged since `01f03a3`, rebase or merge `main` in. Then rerun `npm ci`,
   `npm run build` and the full suite before merging.
3. (approval: **deploy**) Merge the PR. Expect the hosted build to deploy in about 1–2 minutes.
4. Run MF-SECURITY-002-POST-DEPLOY-CHECKLIST.

## Option B — manual deploy, then merge

Use only if the hosted build is broken or unavailable.

1. From the hotfix worktree in **PowerShell**:
   ```
   npm ci
   npm run build
   node --test tests/rsc-advisory-regression.test.mjs
   ```
2. (approval: deploy) `npx wrangler deploy`
3. **Immediately** merge the same commits into GitHub `main` (Option A, steps 1–3).
   - Otherwise `main` and production diverge, and the next deploy from `main` would ship React
     19.2.6 again and silently remove the fix.

## Do not

- Deploy from local `main` (`a8b8305`), the sprint branch, `security/mf-security-002-rsc`
  (based on `a8b8305`), or `D:\Projects\MetaForge-Web-Deploy`.
  - None of them contains production's 34 GitHub commits (PRs #45–#56).
  - Deploying any of them would roll those features back.
- Send exploit payloads to production to "confirm" the fix.
- Bundle the stabilization sprint into this deploy (MF-SECURITY-002-INTEGRATION-PLAN).

## Expected impact

- No user-visible change is expected.
- The React patch releases change Flight (RSC) serialization and reply decoding only:
  - a detached-buffer guard
  - stricter handling of form-data fields
- The client framework chunk gets a new hash (version string 19.2.9), so returning visitors
  download a new JS chunk once.
