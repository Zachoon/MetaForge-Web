# PR: Deck Check: a free, evidence-first deck coach (MF-PRODUCT-RECOVERY-001 → MF-DECK-COACH-004)

**Head:** `rc/mf-deck-coach-003` (local; not pushed). **Base:** `main` at `e7e38e6`, which is production. The commits form one linear stack: MF-PRODUCT-RECOVERY-001 (4), MF-DECK-COACH-002 (3), MF-DECK-COACH-003 (6), MF-DECK-COACH-004 (repair and docs).

---

## Summary

**Adds `/deck-check`:** paste a decklist and get a coaching report, with no account needed.
* The report reads every card's printed text from Scryfall.
* It checks the format (Commander, Partner and Background pairs, singleton, color identity, bans, companion, plus 60-card formats). It reads the deck's plan, with evidence that the player can confirm or correct.
* Each finding states what was counted, the cards behind it, why it matters, the change, its cost, and whether it is a strong finding or a heuristic.
* Suggested changes are replayed on a copy, so the before/after is measured. Cards the player protects are never suggested as cuts.
* No AI model is called, no prices, win rates or bracket numbers are given, and nothing is stored server-side.

**Fixes three public-site defects:**
* The public Baru report showed 0 lands beside 38: stored rows had no type line.
* Sol Ring and other symbol-mana rocks were not ramp in the browser classifier.
* The mana coach called a 4.1-curve deck with 38 lands "over": the ramp credit was too generous. The band now spans no-credit, and the inputs and an outside reference are shown.

**Fixes coaching accuracy** (MF-DECK-COACH-002):
* the mana coach crashed on any list naming a fetch land before its targets
* blink counted as removal
* Elves, Goblins and Vampires were told to add board wipes
* tutors and plan payoffs were offered as cuts
* and 12 more, each with a regression test

**Links:** "Analyze" and the analyzer, checker, mana, curve, optimizer, power-level and bracket tool pages lead to Deck Check. The homepage says who MetaForge is for.

## Benchmark (offline, 32 decks)

`node scripts/deck-check/run-bench.mjs`

| Engine | Score | False-positive advice |
|---|---|---|
| `main` before this PR (Deck Check did not exist; first version `b97369e`) | 71.5%; 20 of 32 cases crash | 13 |
| After MF-DECK-COACH-002 | 92.3% | 0 |
| **This PR** | **427 / 427 (100%)** | **0** |

The benchmark checks documented failure modes against expectations written from printed card text. It does not prove every recommendation is the best one.

## Test results

* **Full suite (`npm run build; node --test`, 54 suites): 2,876 / 2,882 pass, 6 fail.** It is not fully green. The six are listed below and fail identically on `main`.
* Typecheck (`tsc --noEmit`): 0 errors.
* Lint on every changed code file: no new errors. Three files carry pre-existing errors with unchanged counts: `app/page.tsx` 1, `worker/card-facts.ts` 8, `worker/public-deck-report.ts` 1.
* `npm run build`: passes.
* Browser smoke test, scripted headless Edge:
  * first insight in about 2 s
  * plan confirmation, protected cards, CSV open and link help all work
  * 375 px: no overflow, no control under 44 px
  * 0 console errors

  The owner also completed a local walkthrough.

## Known failures (pre-existing, unrelated)

All six are source-text regex assertions over the Forge rail and homepage markup and copy, written before the site-rail redesign. Same tests, same assertion messages on `e7e38e6`:

| Test | Assertion that fails |
|---|---|
| `masterwork-progression-track-visual.test.mjs:10` | `<aside className="forge-global-rail" aria-label="Site navigation">` (the rail is now `aria-label="Section"`) |
| `masterwork-visual-system.test.mjs:80` | same rail regex |
| `progressive-forge-results.test.mjs:116` | same rail regex |
| `masterwork-routing-and-suggested-commander.test.mjs:176` | "Decklist must be unreachable without a validated deck" (it shows in free-build mode) |
| `multi-format-entry-copy.test.mjs:8` | homepage copy "Tell us how you like to play below…" (absent on `main` too) |
| `progressive-forge-results.test.mjs:231` | `setBuildPath("scratch")` (the old entry-path structure) |

## Database considerations

* **No schema change. No write on a page view.** Public report pages repair their display in memory only: land count and average mana value come from the stored role tags and a bundled type index.
* **New reports** are stored with card type lines at publish time (a Scryfall lookup on publish).
* **Existing reports** (the Baru report on production) are repaired only by an owner-run, audited script, `scripts/public-reports/repair-type-lines.mjs`:
  * it reads a read-only export and writes a backup, an audit, `repair.sql` and `rollback.sql`
  * each `UPDATE` touches only `deck_rows_json` and is guarded by the exact exported JSON
* Runbook: `docs/deck-coach-004/DATABASE-REPAIR-RUNBOOK.md`.

## Security considerations

* No new endpoint.
* No dependency change: `package.json` and `package-lock.json` are identical to `main`, and React stays at 19.2.9.
* No auth, rate-limit or secret change.
* The only outbound destination is `api.scryfall.com`, which the app already uses.
* Uploaded files are read in the browser; nothing is uploaded.
* All report text is rendered as text.
* `npm audit` is unchanged from `main`. There is a pre-existing advisory on `next` 16.2.6; vinext swaps in its own `next/*` modules, so it does not reach the deployed worker. A separate task is recommended.

## Size

About 70k added lines. About 66k of them (1.7 MB) are Scryfall card snapshots under `tests/fixtures/`, which let the tests and benchmark run offline. Docs: `docs/product-recovery`, `docs/deck-coach-002`, `docs/deck-coach-003`, `docs/deck-coach-004`.

## Rollback

* **Code:** `npx wrangler rollback` to the previous version. Production before this release is `a5339934-c918-4a3b-8bb5-6d63a0109490` unless something else deploys first; record the live version just before deploying. Deck Check is additive.
* **Data:** nothing changes unless the repair script is applied. If it was, apply its `rollback.sql`; each statement restores only a report that still holds the repaired JSON. A full D1 export taken before the repair is the second line.

## Post-deployment verification

- [ ] `GET https://metaforge.gg/api/forge/status` reports the deployed commit
- [ ] `/deck-check` loads for a signed-out visitor; the Ezuri sample gives a report with no console errors
- [ ] Paste the Baru list: "38 lands. This curve wants about 34–40", with **How the land band is worked out** showing inputs and the outside reference
- [ ] `/decks/baru-wurmspeaker-b35d119648` shows **38 Lands** and a Lands group of 38. Full card grouping appears after the data repair
- [ ] Sol Ring counted as ramp: Deck Check "Mana sources costing 0 or 1" lists it; the public report tags it "artifacts · ramp"
- [ ] Confirm a different plan (Sram list → Auras) and protect a card (Ezuri → Thragtusk): the plan sentence changes; no swap names Thragtusk
- [ ] Tool pages (power level, bracket, analyzer) link to `/deck-check`
- [ ] No D1 writes from page views: `view_count` still increments as before, and `deck_rows_json` is unchanged until the repair is applied

🤖 Generated with [Claude Code](https://claude.com/claude-code)
