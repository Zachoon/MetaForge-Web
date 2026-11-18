# MF-SECURITY-002 — Final report

> **Correction (2026-11-18):** merging to GitHub `main` does **not** deploy production. See
> [MF-SECURITY-002-CORRECTION-DEPLOY-MODEL](MF-SECURITY-002-CORRECTION-DEPLOY-MODEL.md).

2026-11-17. **Nothing was pushed, merged into a shared branch, deployed or written to any
production system.**

## Verdict: **HOTFIX READY FOR APPROVAL**

The patch:
- is minimal (three exact version pins)
- is built on the commit production actually runs
- passes the full suite with no regression: 2,796/2,802, where the 6 failures are the
  same pre-existing UI-copy failures as unpatched production (2,786/2,792)
- provably removes the vulnerable code from the built Worker

The remaining open items are owner decisions:
- push / merge, then deploy (separate approvals; merging does not deploy)
- the separate reconciliation of local `main`

None of them is a defect in the hotfix.

## 1. What was found

1. **The advisory is real and applies.**
   - GHSA-xqc2-xf4c-x3h3 / CVE-2026-126187: critical, unauthenticated RCE in
     `react-server-dom-webpack` 19.2.0–19.2.8, fixed in 19.2.9.
   - MetaForge bundles 19.2.6 from `node_modules` into the production Worker.
   - The live site's client chunk reports React 19.2.6.
2. **The vulnerable decoder is reachable without auth.**
   - A multipart form POST with no action header goes to `decodeAction`, which deserializes the
     body before any action lookup.
   - Requests without an `Origin` header pass the CSRF check.
   - This corrects MF-ENGINEERING-001: the `x-rsc-action` path stops at the action lookup before
     `decodeReply`.
3. **Exploitability is not established.**
   - The advisory limits RCE to responses that "transport multiple typed arrays and an
     attacker-controlled value".
   - MetaForge has no server functions, and typed arrays appear only in client code.
   - No exploit was attempted.
4. **Production is not local `main`.**
   - The live bundle is stamped `01f03a3`, GitHub `main` (PR #56).
   - Every merge to GitHub `main` since 11/6 was deployed automatically within about 2 minutes.
   - Local `main`'s 11 commits have not been live since 11/6 07:03 UTC.
   - The hotfix was therefore rebuilt on `01f03a3`. Deploying a branch based on `a8b8305` would
     have rolled back 34 production commits.

## 2. The hotfix

| | |
|---|---|
| Deploy branch | `security/mf-security-002-rsc-prod` @ `D:\Projects\MetaForge-Security-002-Prod` |
| Hotfix commit | **`580ae49`**: `react`, `react-dom`, `react-server-dom-webpack` 19.2.6 → **19.2.9**, in `package.json`, `package-lock.json` and `pnpm-lock.yaml` |
| Guard test | `f695e0b`: `tests/rsc-advisory-regression.test.mjs` (10 tests; negative-controlled) |
| Docs | The commit after `f695e0b`: `docs/security/MF-SECURITY-002-*` |
| Local-main twin | `security/mf-security-002-rsc` (`52c4cb5`, `bbcd4a5`) @ `D:\Projects\MetaForge-Security-002`, same lockfile blobs |
| Not changed | `next`, `vinext`, `@vitejs/plugin-rsc`, Cloudflare toolchain, any source file, config, D1 |

## 3. Evidence summary

Details in MF-SECURITY-002-TEST-RESULTS.

| Check | Result |
|---|---|
| Full suite, production hotfix | 2,796/2,802 pass; the 6 failures are identical to the unpatched baseline (pre-existing UI-copy tests) |
| Full suite, production baseline (`01f03a3`) | 2,786/2,792 pass (same 6 pre-existing failures) |
| Full suite, local-main hotfix | 2,811/2,811 pass (one earlier run hit a stale-build commit-stamp failure; rebuilt and reran; documented) |
| Type check | 0 errors (both lines) |
| Build | exit 0 (both lines) |
| Bundle | Server Flight runtime from the installed package; all four 19.2.9 fix markers present (0 in baseline); client chunk 19.2.9 only |
| Lockfile integrity | `npm ls` clean; npm registry signatures verified; pnpm lock edit identical to pnpm's own result |
| `npm audit` | critical 2 → 1 (`next`, not bundled into the Worker) |
| Secrets | 0 hits |

## 4. Remaining risks

1. **Until deployed, production still runs 19.2.6.**
2. `next` 16.2.6 is still flagged critical (21 advisories). No `next` code ships in the Worker,
   so this is hygiene, not runtime exposure. Upgrade separately.
3. `vinext` 0.0.50 and the Cloudflare toolchain have high advisories through their own
   dependencies. These are build-time, or not bundled. The vinext 1.x upgrade is a separate
   project.
4. Unknown-action requests return 500 rather than 404. This is pre-existing vinext behaviour,
   and noisy in logs.
5. Local `main` and GitHub `main` have diverged: 18 conflicting files, 11 commits not live. This
   is a separate owner decision (MF-SECURITY-002-INTEGRATION-PLAN).
6. CI is not a gate: merges deploy whether or not anything has been tested. Consider requiring a
   check on `main`.
7. Production's own `main` already fails 6 source-text UI tests. They fail identically with and
   without the hotfix, and come from GitHub's recent redesign PRs. They need separate triage
   (TEST-RESULTS §1).
8. Patching the package is not proof that the application is secure.

## 5. Owner approval checklist

- [ ] Accept the assessment (ADVISORY-MATRIX §2) and the 19.2.9-only scope.
- [ ] Confirm the hosted build setup in the Cloudflare dashboard (DEPLOYMENT-PLAN, prerequisite 2).
- [ ] **Approve the push** of `security/mf-security-002-rsc-prod` and the PR into GitHub `main`.
- [ ] **Approve the merge, then the production deploy** (Option A; merging alone does not deploy), with no other merges until it is
      verified.
- [ ] Run the POST-DEPLOY-CHECKLIST: live `framework-*.js` shows 19.2.9, stamp shows the merge
      commit, smoke test, 15 min of `wrangler tail`.
- [ ] Keep the ROLLBACK-PLAN to hand: rollback target `8ad379ff-…`, plus a revert PR on `main`.
- [ ] Separately: decide how to reconcile local `main` (11 commits) with GitHub `main`, then the
      sprint (INTEGRATION-PLAN §3–4).
- [ ] Separately: schedule the `next` / toolchain / vinext upgrades.

## 6. Documents

All in `docs/security/`:
- `MF-SECURITY-002-BASELINE.md`
- `MF-SECURITY-002-ADVISORY-MATRIX.md`
- `MF-SECURITY-002-TEST-RESULTS.md`
- `MF-SECURITY-002-DEPLOYMENT-PLAN.md`
- `MF-SECURITY-002-ROLLBACK-PLAN.md`
- `MF-SECURITY-002-POST-DEPLOY-CHECKLIST.md`
- `MF-SECURITY-002-INTEGRATION-PLAN.md`
- `MF-SECURITY-002-FINAL-REPORT.md`
