# MF-SECURITY-002 — Baseline

> **Correction (2026-11-18):** merging to GitHub `main` does **not** deploy production. See
> [MF-SECURITY-002-CORRECTION-DEPLOY-MODEL](MF-SECURITY-002-CORRECTION-DEPLOY-MODEL.md).

Recorded 2026-11-17. All commands were run locally, apart from read-only checks of the public
site and the Cloudflare deployment list, as noted.

## 1. Where production actually comes from

The previous sprint assumed production was built from the local `main` checkout (`a8b8305`).
**That is no longer true.**

| Evidence | Finding |
|---|---|
| Live `client-error-reporter-*.js` (public GET of `https://metaforge.gg/` assets) | Build stamped with commit `01f03a334ee389804d22dce539d99b6239297d9e` |
| `gh api repos/Zachoon/MetaForge-Web/commits/01f03a3…` | "Merge pull request #56 from Zachoon/cursor/home-cta-anvil-b09b", 2026-11-09 19:16:14 UTC; the current GitHub `main` |
| `npx wrangler deployments list --json` (read-only) | Latest deploy `8ad379ff-4449-46d6-b6ef-fd92a0e953c1` at 2026-11-09 19:17:16 UTC, 62 s after that merge |
| Deploy times compared with GitHub `main` merges, 11/6–11/9 | Every merge (#45–#56) was followed by a `wrangler` deployment 30–120 s later. No GitHub Actions workflow exists at `01f03a3`. |
| Live `framework-*.js` | React **19.2.6** (`version:"19.2.6"`) |

Conclusions:

- **Production = GitHub `main` @ `01f03a3`.**
- Merges to GitHub `main` are deployed automatically. Every deploy is tagged `source: wrangler`,
  `triggered_by: deployment`, and the repo has no workflow file. That matches Cloudflare Workers
  Builds connected to the repository; the dashboard setting was not inspected.
- ~~Pushing or merging to GitHub `main` should be treated as a production deploy.~~
  **Corrected 2026-11-18: merging does not deploy; production changes only on `wrangler deploy`.**
- The memory note saying "git push alone does not deploy" dates from August–September and is out
  of date.

## 2. Repository state

| Ref | Commit | Notes |
|---|---|---|
| GitHub `main` (production) | `01f03a3` | 34 commits since the merge base `e03fcdd`. Fetched this session; the local `origin/main` ref had been stale since 10/31. |
| Local `main` (`D:\Projects\MetaForge\web`) | `a8b8305` | 11 commits not on GitHub. Was briefly live 11/5 22:46 → 11/6 07:03 UTC (manual deploy), then replaced by GitHub builds. Unrelated uncommitted bench files and 4 stashes left untouched. |
| `sprint/mf-engineering-001` | `788f98e` | 10 commits on top of local `main`; not modified by this mission |
| Deploy worktree `D:\Projects\MetaForge-Web-Deploy` | `be8d221` | Stale (9/22). Not the production source. |

Hotfix branches created by this mission:

| Branch | Worktree | Base | Purpose |
|---|---|---|---|
| `security/mf-security-002-rsc-prod` | `D:\Projects\MetaForge-Security-002-Prod` | `01f03a3` (production) | **Deploy candidate** |
| `security/mf-security-002-rsc` | `D:\Projects\MetaForge-Security-002` | `a8b8305` (local `main`) | The same two commits for the local line of work |

Both worktrees have their own `node_modules` from `npm ci`, so the owner's checkout was not
touched. `package-lock.json` and `pnpm-lock.yaml` are byte-identical at `a8b8305` and `01f03a3`.

## 3. React / RSC dependency graph (identical on both bases)

| Package | Version | Declared as | Notes |
|---|---|---|---|
| `react` | 19.2.6 | dependency (exact) | |
| `react-dom` | 19.2.6 | dependency (exact) | |
| `react-server-dom-webpack` | 19.2.6 | **devDependency** (exact) | Bundled into the Worker anyway, so `npm audit --omit=dev` hides it |
| `@vitejs/plugin-rsc` | 0.5.26 | devDependency | Peer `react-server-dom-webpack: *`. Also **vendors its own copy (19.2.6)**, used only if the installed package is not detected. |
| `vinext` | 0.0.50 | devDependency | Peers `react`, `react-dom`, `react-server-dom-webpack` `^19.2.6` |
| `next` | 16.2.6 | dependency | Used for types and import specifiers; no `next` code is bundled into the Worker (§5) |
| `@cloudflare/vite-plugin` / `wrangler` | 1.37.1 / 4.92.0 | devDependencies | |

`react-server-dom-webpack@19.2.9` declares peers `react ^19.2.9` and `react-dom ^19.2.9`, so all
three packages have to move together.

Lockfiles:
- `package-lock.json` is the one in use. `node_modules` has npm's layout.
- `pnpm-lock.yaml` is described in history as the "hosted build lockfile", but it is already out
  of sync with `package.json` (missing `@types/three`, added 10/07), so a frozen pnpm install
  would fail. Builds succeed, so the hosted build most likely uses npm.

## 4. Server-action routing in the built Worker (`dist/server/index.js`)

The app defines **no** `"use server"` functions. vinext still wires both action entry points:

1. **RSC action** (`POST` with an `x-rsc-action` or `next-action` header)
   - Checks: CSRF origin, 1 MiB size limit, payload graph check.
   - Then `loadServerAction(id)` runs, and only then `decodeReply`.
   - With no server functions, unknown IDs fail at the lookup, before `decodeReply`.
   - Locally the request gets a 500 (`server reference not found`).
2. **Progressive (form) action** (`POST multipart/form-data` without an action header)
   - Checks: CSRF origin, size limit, payload graph check.
   - Then **`decodeAction(body)` runs before any action lookup.**
   - For `$ACTION_REF_*` fields, React deserializes the bound arguments with its Flight reply
     decoder (`decodeBoundActionMetaData`), then fails at the lookup (500, `TinyAssertionError`).
   - **This is how unauthenticated input reaches the vulnerable package.**

CSRF origin check:
- Requests with **no** `Origin` header pass it, so non-browser clients are not blocked.
- A mismatched `Origin` returns 403.

These behaviours were observed by calling the built Worker in-process with an in-memory
environment, on both the 19.2.6 and 19.2.9 builds. Nothing was sent to production.

## 5. What is bundled into the Worker

Source-region counts in `dist/server/index.js`:
- vinext: 102
- jose: 29
- @vitejs/plugin-rsc: 4
- react: 3
- react-server-dom-webpack: 2
- react-dom: 2

Notes:
- The server Flight runtime region is
  `node_modules/react-server-dom-webpack/cjs/react-server-dom-webpack-server.edge.production.js`.
  This is the installed package, not plugin-rsc's vendored copy.
- No `node_modules/next/`, `sharp`, `postcss`, `image-size` or `@vercel/og` code is bundled.
- `/decks/<slug>/og.svg` is a custom SVG handler (`publicDeckSocialImageResponse`), not
  `next/og`.

## 6. Baseline verification (19.2.6)

| Check | Result |
|---|---|
| `npm ci` + `npm run build` at `a8b8305` | exit 0 |
| Full suite at `a8b8305` | 2,801/2,801 pass (MF-ENGINEERING-001 baseline, same commit and dependency versions) |
| Full suite at `01f03a3` | See MF-SECURITY-002-TEST-RESULTS |
| `npm audit` | 44 advisories: 2 critical (`react-server-dom-webpack`, `next`), 28 high, 14 moderate |
| Build reproducibility | Two fresh builds of the same commit differ only in random build-ID UUIDs. Those change client asset hashes, so asset filenames alone cannot identify the deployed commit; the stamped commit SHA can. |

## 7. Relevant test files

- `error-report` (build commit stamp, Access-protected founder route)
- `access-identity`
- `account-api`
- `api-hardening`
- `rendered-html`
- `guest-*`
- `public-*`
- the new `rsc-advisory-regression`
