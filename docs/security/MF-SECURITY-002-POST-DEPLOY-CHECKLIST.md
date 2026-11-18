# MF-SECURITY-002 — Post-deploy checklist

> **Correction (2026-11-18):** merging to GitHub `main` does **not** deploy production. See
> [MF-SECURITY-002-CORRECTION-DEPLOY-MODEL](MF-SECURITY-002-CORRECTION-DEPLOY-MODEL.md).

All checks are ordinary reads of the public site or of the owner's own Cloudflare account.
**No crafted server-action, exploit or load-test requests against production.**

## Within 5 minutes

- [ ] `npx wrangler deployments list`: a new version at 100%, created after the merge or deploy.
      Record its ID.
- [ ] Production runs the merged commit:
  - Open `https://metaforge.gg/` and view source.
  - Find the `client-error-reporter-*.js` asset.
  - Its embedded commit must be the hotfix merge commit, not `01f03a3`.
- [ ] Production runs patched React:
  - Find the `framework-*.js` asset linked from the home page.
  - It must contain `19.2.9`, not `19.2.6`.
  - PowerShell:
    ```
    $h = (Invoke-WebRequest https://metaforge.gg/ -UseBasicParsing).Content
    $f = [regex]::Match($h, '/assets/framework-[^"]+\.js').Value
    (Invoke-WebRequest "https://metaforge.gg$f" -UseBasicParsing).Content -match '19\.2\.9'
    ```
- [ ] Note: the **server** bundle can't be inspected from outside. Its version follows from the
      lockfile of the deployed commit, together with the regression test that passed on that
      commit.

## Browser smoke test (10 minutes)

- [ ] Home page loads, with no `Minified React error` and no hydration warnings in DevTools.
- [ ] Learn / Academy article page.
- [ ] A public deck page `/decks/<slug>`, and its `og.svg`.
- [ ] Forge: start a guided build as a signed-in account and reach the decklist.
- [ ] Guest guided build through Turnstile.
- [ ] Deck import → card details load.
- [ ] Save a deck to the account bench, reload, and confirm it's still there.
- [ ] Founder route still requires Access (unchanged behaviour).

## Monitoring (first hour)

- [ ] `npx wrangler tail metaforge-private-alpha --format pretty` for 10–15 minutes. Compare the
      error rate with the pre-deploy sample.
- [ ] Expect no new `[vinext] Server action error` volume. Some background noise from scanners
      is normal.
- [ ] The next hourly cron (`0 * * * *`) completes without new errors.

## Close-out

- [ ] Record in the release notes:
  - version ID
  - deployed commit
  - time
  - the result of each check above
- [ ] If Option B (manual deploy) was used, confirm GitHub `main` now contains `580ae49`.
- [ ] Update MF-ENGINEERING-001's backlog: B-1 resolved in production.
