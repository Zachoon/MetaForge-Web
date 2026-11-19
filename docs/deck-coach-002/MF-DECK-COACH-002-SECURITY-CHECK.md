# MF-DECK-COACH-002 — Security check

Scope: everything on `rc/mf-deck-coach-002` since production `e7e38e6` (MF-PRODUCT-RECOVERY-001's four commits plus this mission's). All checks were run locally on 2026-11-18. Nothing was deployed.

## Baseline preserved

| Item | Result |
|---|---|
| React / React DOM | **19.2.9 / 19.2.9** (MF-SECURITY-002 RSC hotfix baseline) |
| `package.json`, `package-lock.json` | **Byte-identical to `e7e38e6`** (`git diff --quiet e7e38e6 -- package.json package-lock.json` → no diff). No dependency added, removed or upgraded. |
| `tests/rsc-advisory-regression.test.mjs` | Passes (in the full suite) |
| Worker, auth, Turnstile, rate limits, D1 schema, secrets, `wrangler` config | Unchanged in this mission. The only worker changes on the branch are MF-PRODUCT-RECOVERY-001's sitemap entry, JSON-LD and one link label (`worker/index.ts`, `worker/public-deck-report.ts`). |
| New endpoints | None. Deck Check runs in the browser. |
| Network destinations | Only `api.scryfall.com/cards/collection` (already used by the app), card **names** only. The fixture snapshot script (`scripts/deck-check/`) also calls Scryfall, from a developer machine only, with a generic User-Agent. |
| Storage | `sessionStorage` draft of the pasted list in the visitor's own tab (unchanged). No server storage, cookies or accounts. |
| Rendering | All report text is rendered as React text nodes. The branch diff adds no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.cookie` or `localStorage` (diff scan of `app/` and `scripts/`). |
| Input limits | Parser keeps its 250-copy and 141-character limits; the new CSV path reuses the same line handling, so a malformed CSV line becomes a "could not be read" line, not an exception. |
| Guest access | `/deck-check` is served to anonymous visitors (rendered-HTML test); it needs no Turnstile because it calls no MetaForge API. |

## Dependency audit (pre-existing, not introduced here)

`npm audit --omit=dev` reports 6 advisories (1 critical, 4 high, 1 moderate) on the **production lockfile as it is on `e7e38e6`**. Saved at `C:\Projects\MF-DECK-COACH-002\npm-audit-prod.json`.

| Package | Severity | Applies to the deployed worker? |
|---|---|---|
| `next` 16.2.6 (middleware/proxy bypass with Turbopack; App Router DoS) | critical | **Not as far as I can tell.** vinext aliases `next/*` imports to its own shims (`node_modules/vinext/dist/index.js:491` maps `next/link` → `shims/link`), and the built `dist/server` contains no `node_modules/next/dist` code. Owner should confirm. |
| `postcss`, `sharp` (via next) | high | Build-time tooling; not in the worker bundle |
| `nanoid`, `source-map-js`, `baseline-browser-mapping` | high / moderate | Transitive build/dev-time paths |

**Recommendation:** a separate MF-SECURITY task to bump `next` to 16.4.6 (non-major per npm) and re-run the RSC regression test. Not done here: changing dependencies was outside this mission's scope and would invalidate the React 19.2.9 baseline check.

## Verdict

No security regression introduced by this branch.
