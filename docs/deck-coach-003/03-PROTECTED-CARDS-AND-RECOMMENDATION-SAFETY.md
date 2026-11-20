# MF-DECK-COACH-003 · 3. Protected cards and recommendation safety

## Guarantees, and where each is enforced

| Guarantee | Enforced in | Test |
|---|---|---|
| A card the player protects is never suggested as a cut | Coach: `isProtectedCard` makes `fillsNeededRole` true, excludes it from loot/tutor cuts and from hidden-hole cites. Report: a final filter on swaps before they reach the page | `…plan-and-protection.test.mjs` "a protected card is never suggested…"; benchmark `ezuri-protected`, `meren-protected` |
| Engine pieces are preserved without being protected by hand | 002 rules, unchanged: no cut of a tutor, protection, a card filling a counted role not over its band, a plan payoff (on-type creatures, landfall/sacrifice/enchantment/artifact/blink text, board anthems), or a card that would open a new hole | Benchmark false-positive dimension (33/33) |
| Declines when no safe cut exists | No cut is named; the add is offered as "Worth testing, with a cut you choose" | "when every card is protected, Deck Check declines…" |
| Suggestions use real card rules and legality | Adds come from the vetted catalog, checked against the deck's color identity. Their Commander legality is checked against a Scryfall snapshot (`swap-catalog.facts.json`). Player adds are fetched from Scryfall and refused if off-identity, banned, or already in the list | "suggested adds come from real card data…"; benchmark swap-validity 11/11 |
| Every recommendation explains its benefit, trade-off and confidence | 002 finding fields: detected, why, change, trade-off, strength; measured swap table | 002 tests |
| Exploring never changes the player's deck | Every swap and player test runs on a copy; the parsed list is not mutated; the page says "Nothing here edits your list" | "testing a change never edits the player's list…" |
| A player's own test of a protected card is labelled | `comparePlayerSwap` adds "You marked X as protected… this is your own test" | same test |

Only names that are actually in the list count as protected; others are ignored.

## Browser verification (headless Edge, scripted)

* **Before protecting:** Ezuri offers Thragtusk → Beast Whisperer and Thragtusk → Beast Within.
* **After protecting Thragtusk** with the filter and checkbox: the chip "Thragtusk ×" appears and no measured swap remains. Beast Whisperer and Beast Within are offered to test with your own cut. Thragtusk was the only expensive card that does no other job.
* At 375 px the protected list has no control under 44 px.

## What it does not do

* Protected cards are kept in the page state for this check only. They are not saved to an account or between visits.
* "Engine piece" is decided by printed-text rules, not by understanding a combo. The protected list is how a player covers what the rules miss.
