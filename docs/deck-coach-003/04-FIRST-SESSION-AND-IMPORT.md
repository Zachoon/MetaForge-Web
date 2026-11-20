# MF-DECK-COACH-003 · 4. First session and import

## First useful insight: target 60 seconds

**Test environment (reproducible):**
* Windows 11 laptop
* Headless Microsoft Edge (Chromium) at 1280 × 900, driven over the DevTools protocol by `C:\Projects\MF-DECK-COACH-003\harness\cdp-harness.mjs` with `scenario-003.json` (built by `make-scenario.mjs`)
* Local `npx vinext dev --port 5199`, with the route compiled once by a readiness request
* Live Scryfall API
* The real 100-card Baru list (64 unique names)

"First useful insight" means the **At a glance** card is on screen: legality, plan, and the top fixes.

| Run | Press Check → At a glance | Navigation → At a glance |
|---|---|---|
| Cold browser profile (two runs) | **2.1 s** both times | 14.8 s and 16.8 s (12–15 s of it is dev-mode page compile and load) |
| Warm (same browser, reloaded) | **1.5 s** both times | 6.0 s |

Both are well inside 60 s. Not measured:
* Production hosting on Cloudflare: the built worker needs its bindings, so `vinext start` returns 500 locally, and `wrangler dev` was not set up.
* Slow networks.

The 1.5–2.1 s is dominated by the Scryfall lookup (one request per 75 names, 100 ms apart).

No account is needed: Deck Check calls no MetaForge API.

## Import workflows

| Input | Status | Evidence |
|---|---|---|
| Moxfield / Archidekt **text export** pasted | Works (002) | parser tests |
| Moxfield / Archidekt **CSV** pasted | Works (002); Board column → commander / sideboard / maybeboard | parser tests |
| **Open a file** (.txt, .csv, .dck, .dec) | **New.** Read in the browser with `File.text()`, never uploaded; 512 KB limit with a clear message | Browser: a Krenko CSV opened → "33 cards read · commander: Krenko, Mob Boss" |
| A **Moxfield or Archidekt link** pasted | **New.** The page explains how to export (Moxfield: More → Export; Archidekt: Export) and disables Check, instead of reporting every line as unreadable | Browser: "That is a Moxfield link…", Check disabled |
| Fetching a list from a link | **Not built**, as instructed: it means pulling from another site. Pending owner decision | — |

## Errors, progress, recovery (from 002, re-verified)

* A progress bar counts cards read, with **Cancel**.
* A partial Scryfall read offers **Read the cards again**; a full failure keeps the list and offers **Try again**.
* Every unread line is listed with its line number and the reason.

## The plan and transparency controls a first-time user meets

* The **plan card** says where its read comes from ("Read from the commander's text and confirmed by the cards in the list. High confidence read."). The evidence is one click away, and a picker confirms or corrects the plan.
* **How the land band is worked out:** the inputs, rules and outside reference for the land band, one click away.
* **Table pressure:** fast mana, tutors, Game Changers and similar cards, listed by name, with no score.
