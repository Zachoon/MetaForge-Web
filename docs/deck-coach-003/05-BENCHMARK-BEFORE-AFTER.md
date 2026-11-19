# MF-DECK-COACH-003 · 5. Expanded benchmark, before and after

`node scripts/deck-check/run-bench.mjs [--root <checkout>]`. 24 cases from MF-DECK-COACH-002 and 8 new ones, all offline, from Scryfall snapshots. The benchmark floor is a test, `tests/deck-coach-002-regressions.test.mjs`: 32 cases; every legality, role, swap, before/after, mana and player-intent check holds; zero false-positive advice.

## New cases

| Case | What it pins |
|---|---|
| `baru-land-count` | The real public Baru list: 38 lands counted, status "ok", band includes 38, land-band inputs and labelled outside reference shown. Traverse the Outlands is ramp, not a tutor. In the browser classifier, Sol Ring and Llanowar Elves are ramp and Forest is not |
| `urza-browser-ramp` | Browser classifier: Sol Ring, Mind Stone, Thran Dynamo, Coldsteel Heart, Prismatic Lens, Sky Diamond are ramp |
| `ezuri-protected` | Thragtusk protected: never cut, protected list echoed, still something to test |
| `meren-protected` | Acidic Slime and Shriekmaw (the coach's own cuts) protected |
| `sram-confirmed-auras` | Detected Equipment, player confirms Auras: bands follow, labelled the player's |
| `sram-mixed-strategy` | Equipment primary with Auras named second, both with evidence; source "commander-and-deck" |
| `wilson-confirmed-equipment` | Background pair with no single plan; player confirms Equipment |
| `thrasios-cedh-pressure` | Partner combo shell: "no single plan", combo finish named, table pressure listed by card (Game Changers ≥ 15, fast mana ≥ 5, tutors ≥ 6, printed wins 1), no score or bracket number |

New dimensions: **mana** (count, band, assumptions) and **player-intent** (protection, confirmed plans). Existing dimensions gained checks: roles (browser classifier), strategy (second plan), uncertainty (plan source), trust (table pressure).

## Results

| Engine | Checks passed | Score | False-positive advice |
|---|---|---|---|
| Shipped branch, MF-PRODUCT-RECOVERY-001 (`b97369e`) | 143 / 200 | 71.5% | 13; 20 of 32 cases crash |
| MF-DECK-COACH-002 (`68b8ef4`) | 408 / 442 | 92.3% | 0 |
| **MF-DECK-COACH-003 (this branch)** | **427 / 427** | **100%** | **0** |

Where 002 fails the new cases:
* the Baru band (34–36, which excludes 38), and Traverse read as a tutor
* browser ramp (Sol Ring, Mind Stone, Thran Dynamo)
* protected cards (cut anyway, not echoed)
* confirmed plans (ignored)
* the Sram, Ghalta and Thrasios plan reads
* table pressure (absent)

Raw outputs: `C:\Projects\MF-DECK-COACH-003\bench-*.json` / `.md`.

Check totals differ between engines because a crash runs one check, and fewer swaps run fewer swap checks. Compare the per-dimension totals and the false-positive counts.

## What 100% does not mean

The benchmark checks for specific, documented failure modes against expectations written from printed card text. It does not prove that every recommendation is the best one for a given player or pod. The release checklist asks for a human read-through of real reports for that reason.
