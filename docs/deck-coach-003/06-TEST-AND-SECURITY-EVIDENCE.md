# MF-DECK-COACH-003 · 6. Test and security evidence

> **Superseded in part by MF-DECK-COACH-004 (`928aa31`):** public report pages no longer repair stored rows on view (no Scryfall lookup, no D1 write). Stored reports are repaired only by the owner-run script; see `docs/deck-coach-004/DATABASE-REPAIR-RUNBOOK.md`.

All runs are from `D:\Projects\MetaForge-Deck-Coach-003`, using PowerShell for builds and tests, on 2026-11-19. Logs are in `C:\Projects\MF-DECK-COACH-003\`.

## Automated tests

| Run | Result |
|---|---|
| Full suite, run 1 (`npm run build; node --test`, 54 suites) | 2,866 / 2,872 pass, 6 fail (`full-suite-run-1.txt`) |
| **Full suite, run 2 (final)** | **2,868 / 2,874 pass, 6 fail** (`full-suite-run-2-final.txt`) |
| Targeted, on the final code after the last plan-read edit: Deck Check, 002 and 003 regressions, public report, curve/mana/plan-weakness/interaction coaches, rendered HTML | **132 / 132** |
| Benchmark, 32 cases | **427 / 427**, 0 false-positive advice |
| `npx tsc --noEmit -p .` | 0 errors |
| `npx eslint` on every file changed this mission | 0 errors. The two worker files carry the same `any` errors they had before this mission; none are new |
| `npm run build` | succeeds |

**New failures: none.** Both full runs fail on exactly the six known tests, and all six are source-text regexes. They match the classification in `docs/deck-coach-002/MF-DECK-COACH-002-TEST-EVIDENCE.md` §3: they pin Forge rail and homepage markup and copy from before the site-rail redesign.

They were investigated again and **not changed**: what they *should* assert depends on Forge product decisions (for example, whether Decklist may show in free-build before validation), and that intended behaviour is not established. Rewriting the regexes to match whatever ships would hide real regressions.

Tests changed this mission, each for a stated behaviour change:
* `mana-base-coach.test.mjs`: the band's top is now the uncredited end (`targetHigh` 42, `creditedHigh` 38). The deck is still "short".
* `deck-coach-002-regressions.test.mjs`:
  * Sram's plan sentence now reads its plan; the "did not match" case moved to Wilson.
  * The benchmark floor is 32 cases, with mana, player-intent and zero false positives required.

No assertion was weakened to get a pass.

New test files:
* `public-report-land-count.test.mjs` (4)
* `deck-coach-003-public-concerns.test.mjs` (6)
* `deck-coach-003-plan-and-protection.test.mjs` (14)

## Browser (scripted headless Microsoft Edge)

Claude in Chrome was not connected, and the built-in browser pane is excluded by owner rule. So the harness `C:\Projects\MF-DECK-COACH-003\harness\cdp-harness.mjs` drives headless Edge over the DevTools protocol, against `npx vinext dev --port 5199`, with live Scryfall.

The earlier "broken harness" had one cause: the harness file was never copied into the 003 folder, because the copy shared a shell command with a heredoc that failed to parse. Nothing was wrong with the harness itself.

Final run (`screenshots\results.json`, screenshots `003-01…04`):

| Check | Result |
|---|---|
| First insight (press Check → At a glance), Baru 100 cards | 2.1 s cold, 1.5 s warm |
| Plan card (Sram) | "reads as Equipment", source and evidence shown, 17 plan choices |
| Confirm Auras / back | Sentence, label (Player-confirmed) and glance switch; "Back to the detected plan" restores the read |
| Protect Thragtusk (Ezuri) | No measured swap names it; Beast Whisperer and Beast Within offered to test |
| Moxfield link pasted | Export help shown, Check disabled |
| CSV file opened | Read locally: "33 cards read · commander: Krenko, Mob Boss" |
| 375 × 812 | No horizontal overflow (scrollWidth 375), no control under 44 px (checkbox rows measured by their label) |
| Console | 0 errors, warnings or exceptions |

**Not verified:**
* a person clicking in a headed browser
* Safari and Firefox
* screen-reader announcement order
* the built worker under `wrangler dev`: `vinext start` cannot provide the Cloudflare bindings; the public-report fix is covered by the bundled-handler test instead

## Security review (diff `68b8ef4..HEAD`)

| Item | Result |
|---|---|
| Dependencies | `package.json` and `package-lock.json` byte-identical to production `e7e38e6`; React / React DOM 19.2.9 |
| New endpoints | None |
| Pattern scan (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.cookie`, `localStorage`, new `fetch`, `prepare`) | One hit: the public-report `UPDATE … SET deck_rows_json=? WHERE slug=?` (bound parameters) |
| Public report repair on view | GET now may call Scryfall once and store filled-in type lines. Stored strings pass `safeText` (control characters and `<>` removed) and render through `escapeHtml`. **Found and fixed:** a name Scryfall did not know would have been looked up on every view; it is now stored as `Unknown type` once Scryfall has answered. If Scryfall is unreachable nothing is stored, and the page renders from tags. **Needs owner approval** (it writes on first view), see Release Readiness |
| File open | Read in the browser (`File.text()`), 512 KB cap, rendered as textarea text; nothing uploaded |
| Deck links | Detected by pattern only; never fetched |
| Card facts | Adds Scryfall's `game_changer` boolean only |
| Classifier changes | Browser-side ramp rule active only when no tag database is configured: server construction unchanged (`native-masterwork-engine` tests pass) |
| `npm audit` | Unchanged from MF-DECK-COACH-002 (pre-existing `next` 16.2.6 advisory; vinext shims `next/*`; separate security task recommended) |

No security regression found.
