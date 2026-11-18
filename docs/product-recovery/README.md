# MF-PRODUCT-RECOVERY-001 — owner demo instructions

All deliverables are in this folder. Screenshots, browser-run results and the headless harness are outside the repo in `C:\Projects\MF-PRODUCT-RECOVERY-001\`.

| Document | What it answers |
|---|---|
| `MF-PRODUCT-TRUTH-AUDIT.md` | What production really does today; capability matrix |
| `MF-ORIGINAL-VISION-RECOVERY.md` | Where the deck-coach identity drifted, and the recovery principle |
| `MF-DECK-COACH-VERTICAL-SLICE.md` | What Deck Check is, how it works, proof it is specific |
| `MF-IMPLEMENTATION-CHANGELOG.md` | Every file added or changed, and what was left alone |
| `MF-UX-BEFORE-AFTER.md` | 10-second test and Analyze path, before vs after |
| `MF-TEST-EVIDENCE.md` | Test and browser results with commands |
| `MF-PRODUCTION-GAP-REPORT.md` | What blocks shipping and charging |
| `MF-NEXT-THREE-RELEASES.md` | Prioritised path |

## Run the local preview (PowerShell)

```powershell
cd D:\Projects\MetaForge-Product-Recovery-001
```

```powershell
npm ci
```

```powershell
npx vinext dev --port 5199
```

Open `http://localhost:5199/deck-check` (first load compiles for ~10 s). The dev server reads `wrangler.jsonc`, which already sets `METAFORGE_BOOTSTRAP_LOCK=unlocked`; no `.dev.vars` or secrets are needed for Deck Check.

## 10-minute click-through

1. `http://localhost:5199/` — read the lede ("For Commander players.") and the "Already play a deck?" link under the guided card. Click it.
2. Deck Check — click **Ezuri elves**. Expect: "Coaching report: Ezuri, Renegade Leader", one format problem (Rhys the Exiled is black-green), three weaknesses quoting Elvish Clancaller / Krosan Tusker / Craterhoof Behemoth, and "Try one change" with Elvish Clancaller → Beast Whisperer (Card advantage 2 → 3, "one swap starts the fix, it does not finish it"). Click the other two change tabs.
3. In "Test your own change": cut **Krosan Tusker**, add **Swords to Plowshares** → refused (white, outside green). Add **Guardian Project** → measured comparison. Click **Copy the updated list**.
4. Click **Talrand spells** — a legal deck; "no color-legal swap I can vouch for" is said plainly.
5. Click **Krenko goblins** — six construction errors with line numbers; "How your list was read" lists the sideboard lines set aside.
6. Click **Modern burn** — format switches to Modern; legality passes; limits explain that plan coaching is Commander-only. Switch the format to Standard and check again: per-card "not legal in Standard (Scryfall legality data)".
7. Paste nonsense (`!!!`) and submit — plain explanation, no retry button. Turn off the network and check a deck — retryable error, list kept.
8. Resize to phone width — no sideways scrolling.
9. Top nav **Analyze** and `/tools/mtg-deck-analyzer` → "Analyze my MTG deck" both land on Deck Check.

## Run the tests

```powershell
node --test tests/deck-check.test.mjs
```

```powershell
npm run build; node --test tests/rendered-html.test.mjs tests/home-entry-clarity.test.mjs
```

Full suite (≈6–7 min; rewrites `tests/commander-torture-bench/*.json`, restore afterwards):

```powershell
npm run build; node --test "tests/**/*.test.mjs"; git checkout -- tests/commander-torture-bench
```

## Not done on purpose

No push, merge, or deploy. Shipping needs the steps in `MF-PRODUCTION-GAP-REPORT.md` §A.
