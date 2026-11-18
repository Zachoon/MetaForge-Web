# MF-SECURITY-002 — Test results

Machine: Windows 11, Node 24.18.0, npm 11.16.0. Every run used its own worktree, with
`node_modules` installed by `npm ci`; none used the owner's checkout. Commands that build or
install were run from PowerShell.

## 1. Full suite

Command: `node --test --test-reporter=tap "tests/**/*.test.mjs"`, run after `npm run build` at
the same HEAD.

| Line | Commit | React | Tests | Pass | Fail | Duration |
|---|---|---|---|---|---|---|
| Production baseline | `01f03a3` | 19.2.6 | 2,792 | 2,786 | 6 (pre-existing) | 5 min 53 s |
| **Production hotfix (deploy candidate)** | `f695e0b` | 19.2.9 | 2,802 | 2,796 | 6 (same 6) | 6 min 10 s |
| Local-main baseline (MF-ENGINEERING-001) | `a8b8305` | 19.2.6 | 2,801 | 2,801 | 0 | 7 min 17 s |
| Local-main hotfix, run 1 | `bbcd4a5` | 19.2.9 | 2,811 | 2,810 | **1** | 7 min 28 s |
| Local-main hotfix, run 2 | `bbcd4a5` | 19.2.9 | 2,811 | **2,811** | 0 | 6 min 20 s |

**The 6 production-line failures already exist on GitHub `main`.**
- The failure sets on `01f03a3` (unpatched) and `f695e0b` (hotfix) are identical by test name.
- The 10 extra tests on the hotfix line are the new guard tests, and all pass.
- All 6 are source-text UI assertions broken by GitHub's recent home and workbench redesign PRs
  (#44–#56). They are not related to React:

| Test | File |
|---|---|
| the revealed Masterwork uses clear workspace destinations | `masterwork-progression-track-visual.test.mjs:10` |
| none of the reported success strings can render outside hasValidatedDeck… | `masterwork-routing-and-suggested-commander.test.mjs:176` |
| the workbench replaces the long Forge Path with task-focused destinations | `masterwork-visual-system.test.mjs:80` |
| entry leads with one guided action and keeps the other two ways to begin as secondary links | `multi-format-entry-copy.test.mjs:8` (expected copy no longer in the redesigned entry) |
| turns the result into one active chapter instead of a continuous instrument wall | `progressive-forge-results.test.mjs:116` |
| turns new-deck setup into three explicit starting paths, led by one primary action | `progressive-forge-results.test.mjs:231` |

They are left as they are: fixing them is product/UI work outside a security hotfix. They should
be triaged separately. Either the tests are stale after an intended redesign, or the redesign
dropped behaviour.

**Run 1 failure, not hidden:**
- Test: `error-report.test.mjs` › "deployed worker status uses the git commit…"
- It expected the build to be stamped with HEAD `bbcd4a5` but found `a8b8305`.
- Cause: `dist/` was built before the two commits were made, so the stamp was stale. This is the
  test working as intended.
- Fix: rebuilt at HEAD; that file plus the guard test passed 28/28, then the whole suite was
  rerun (run 2).
- No code was changed between runs.

## 2. Focused security tests

`tests/rsc-advisory-regression.test.mjs` (new, 10 tests):

| Test | Hotfix | Baseline (negative control) |
|---|---|---|
| `isPatched` matches the advisory ranges | pass | pass |
| React packages pinned exactly to a patched release, all equal | pass | **fail**: "react must be an exact patched pin, got 19.2.6" |
| package-lock / node_modules match the pins | pass | pass (19.2.6 is self-consistent) |
| `pnpm-lock.yaml` resolves no vulnerable React | pass | **fail**: "pnpm-lock resolves react-dom@19.2.6" |
| Worker bundles the installed, patched `react-server-dom-webpack` (no vendored fallback) | pass | **fail**: "patched serializer guard missing from Worker" |
| Client framework chunk reports only patched versions | pass | **fail**: "framework chunk contains React 19.2.6" |
| Pages still render (`GET /` → 200 HTML) | pass | n/a (scratch copy lacked bundle siblings) |
| Unknown `x-rsc-action` / `next-action` ids → ≥400, no internals leaked | pass | n/a |
| Progressive form payload with an unknown bound reference → ≥400 | pass | n/a |
| Cross-origin form post → 403 | pass | n/a |

How the negative control was run:
- Setup: a scratch directory with `a8b8305`'s `package.json` and lockfiles, the 19.2.6 package
  manifests, the 19.2.6 Worker bundle and the 19.2.6 framework chunk.
- Result: every version and bundle guard failed for the expected reason.
- The behaviour tests could not load the bundle there because it lacked its sibling files. The
  same behaviour was observed directly on the 19.2.6 build (below).

Existing security-relevant tests in the full suite all passed on both hotfix lines:
- `access-identity`
- `account-api`
- `api-hardening`
- `error-report`
- `rendered-html`
- guest and public-surface tests

## 3. Behaviour of server-action-shaped requests (local, in-process)

Method:
- Called `worker.fetch()` from the built `dist/server/index.js` with an in-memory environment
  and the `example.test` host.
- Nothing was sent to production.
- Ran identically on the 19.2.6 and 19.2.9 builds.

| Request | Status | Logged error |
|---|---|---|
| `GET /` | 200 HTML | — |
| `POST` + `x-rsc-action: <unknown>` | 500 "Internal Server Error" | server reference not found |
| `POST` + `next-action: <unknown>` | 500 | server reference not found |
| `POST multipart` with `$ACTION_ID_<unknown>` | 500 | TinyAssertionError (manifest lookup) |
| `POST multipart` with `$ACTION_REF_1` + bound `$@1` | 500 | TinyAssertionError, **after** React decoded the bound payload |
| `POST multipart` with a mismatched `Origin` | 403 | CSRF origin mismatch |
| `POST multipart` with no action fields | 200 HTML | — |

## 4. Build, bundle and dependency checks

| Check | Result |
|---|---|
| `npm ci` then `npm run build` (both hotfix lines) | exit 0, about 13 s |
| Worker Flight runtime source | `node_modules/react-server-dom-webpack/cjs/…-server.edge.production.js` (not the plugin-rsc vendored copy) |
| Fix markers in `dist/server/index.js` (baseline → hotfix) | `Cannot transport a detached buffer` 0 → 1; `supportsArrayBufferDetached` 0 → 3; `getBackingBlob` 0 → 3; `referencedEntries` 0 → 4 |
| Client `framework-*.js` | `19.2.9` ×6, no `19.2.6` |
| `npm ls react react-dom react-server-dom-webpack` | exit 0, all deduped to 19.2.9 |
| `npm audit signatures` | 527 packages with verified registry signatures, 127 with verified attestations |
| `pnpm-lock.yaml` hand edit vs `pnpm@10.34.9 install --lockfile-only` | Normalized change sets identical (130 lines) |
| `npm audit` | 44 → 43; critical 2 → 1 (`react-server-dom-webpack` resolved; `next` remains, not bundled) |
| Type check `tsc --noEmit -p tsconfig.json --incremental false` | 0 errors on both hotfix lines |
| ESLint on the only changed source file (the new test) | 0 problems |
| Whole-repo ESLint | Pre-existing debt only: 396 errors at `a8b8305` and 391 at `01f03a3`, identical with and without the hotfix (the hotfix changes no linted source apart from the clean new test) |
| Secret scan of added lines | 0 hits (AWS, OpenAI-style, GitHub, Slack, private-key and generic key/token patterns); no `.env` or `.dev.vars` files; 6 `integrity` lines are npm registry hashes |
| Diff review | `580ae49`: `package.json` 3 lines, `package-lock.json` 15/15, `pnpm-lock.yaml` 65/65 (only React entries; vinext's own `^19.2.6` peer ranges deliberately left). `f695e0b`: one new test file. No CR/LF churn (`--numstat` equals `--ignore-cr-at-eol`). |

## 5. Not tested

- **NOT TESTED:** anything against production. No exploit or crafted-payload requests were sent.
- **NOT TESTED:** a real browser session on the patched build.
- **NOT TESTED:** the hosted (Cloudflare) build of this branch.
- **NOT TESTED:** a Linux CI run.
- **NOT TESTED:** proof that the advisory's RCE condition is unreachable in MetaForge. The
  assessment is based on code inspection only.
