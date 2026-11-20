# MF-DECK-COACH-002 — Quality report

**Branch:** `rc/mf-deck-coach-002`.
* Worktree: `D:\Projects\MetaForge-Deck-Coach-002`.
* Built on MF-PRODUCT-RECOVERY-001 (`b97369e`), which sits on production `e7e38e6`.
* Local commits only: nothing is pushed, merged or deployed, and the branch has no upstream.

## Summary

Deck Check was not ready for a real player, for three reasons:
1. **It crashed on most real decks.** A fetch land listed before the basics it finds (any alphabetical export) threw inside the mana coach; 15 of the 24 benchmark cases crashed on the shipped branch.
2. **It misread common cards.** Blink spells counted as removal, land auras and Prismatic Lens did not count as ramp, static lords counted as win conditions, and Ezuri's Predation did not count as anything.
3. **Its advice argued with the deck.** It told Elves, Goblins and Vampires to add Blasphemous Act, suggested cutting Force of Will, Demonic Tutor, Avenger of Zendikar or a deck's only board wipe, and offered Akroma's Will to combo and control decks.

All three are fixed, each with a regression test. Every finding now states what was detected, the cards behind it, why it matters, the change, what that change costs, and whether it is a strong finding or a heuristic.

## Measured improvement (24-case benchmark, offline)

| | Fair baseline (shipped + crash fix only) | Release candidate |
|---|---|---|
| Benchmark score | 78.1% (356/456) | **98.8% (322/326)** |
| False-positive advice | **45** | **0** |
| Golden card roles correct | 53 / 76 | **76 / 76** |
| Uncertainty handled honestly | 3 / 27 | 26 / 27 |
| Legality expectations | 23 / 25 | 25 / 25 |
| Measured swaps offered | 37 | 11 (+3 adds where the player picks the cut) |

Fewer swaps is the honest trade: most of the 37 were unsafe or off-plan. The four remaining benchmark failures are plan-reading gaps (Ghalta, Sram, Thrasios/Tymna) that need the shared mechanic graph. They are listed rather than tuned away. Details: `MF-DECK-COACH-002-20-DECK-BENCHMARK.md`.

**What the benchmark does not prove:** that every recommendation is the best one. It checks for specific, documented failure modes. A strong player should still read a sample of reports (see the release checklist).

## Coaching quality: what each recommendation now carries

| Required by the brief | Where |
|---|---|
| What was detected | `detected`: "Interaction: 3 counted. MetaForge's band for Vampires is 8–11." |
| Which cards support it | `citations`: card name + quoted printed text from *this* list |
| Why it matters | `why` (plan-specific text from the coach) |
| What to change | `change`: a measured swap, or an add with "the cut is your call", or "no vetted card fits" |
| The trade-off | `tradeOff`: roles that drop, lands that drop, or "whatever you cut loses its job" |
| Strong vs heuristic | `strength` + `strengthReason`; strong only when the count is under half the band on a high-confidence plan read. Win-condition counts are always heuristic. |

Plus context notes where the count misleads:
* a combo finish ("This list runs Thassa's Oracle and 7 tutors…")
* a commander that draws ("Sram, Senior Edificer draws cards itself…")
* an honest plan sentence when MetaForge could not read the plan, or used general bands

## Parsing and validation

| Check | Status |
|---|---|
| Moxfield / Archidekt / Arena / plain / CSV exports, trailing quantities, curly apostrophes, set codes, foil marks, tags | Tested (`tests/deck-check.test.mjs`, regressions file) |
| Commander, Partner, Partner with, Friends forever, Choose a Background, Doctor's companion | Pair rules in `validPair`; Partner and Background pairs verified on real lists; an unpaired pair is an error |
| Singleton, basics and "any number" exceptions, Vintage restricted | Tested |
| Color identity (cards and companion) | Tested |
| Banned / not legal | From Scryfall legality data only, never from a name |
| Deck size, sideboard ≤ 15 | Tested |
| Missing / misspelled names | Listed with line numbers, left out of every count |
| Duplicate lines | Merged, then judged by the copy limit |
| Companion | **New:** must have a Companion ability, sit inside the commander's identity and be legal; the deck-building condition is quoted and explicitly *not* checked |
| Non-Commander formats | Legality, copies, size, curve and colors only; the page says coaching is Commander-only |

## Trust and transparency

* Each section is labelled **Verified**, **Rules-based count**, **Strong finding / Heuristic** or **Measured**, with a legend.
* The limits section states that no AI model is called, and that prices, win rates, matchups and your playgroup are not checked.
* The benchmark fails a report that mentions "AI-powered", a win rate, a matchup or a price.

## Go / no-go

**GO for a controlled deployment of Deck Check**, once the owner does the items marked *owner* in `MF-DECK-COACH-002-RELEASE-CHECKLIST.md`:
1. A human click-through in a real browser.
2. A deploy decision for this branch.
3. Accept or decline the pre-existing `next` advisory follow-up.

The pre-existing advisory does not reach the worker bundle as far as I can tell; see the Security Check doc. The six long-standing test failures are stale UI-source assertions, not Deck Check defects and not release blockers. See Test Evidence.

**NO-GO** for any claim beyond what is built: no power level or bracket, no prices, no win rates, and full coaching for Commander only.
