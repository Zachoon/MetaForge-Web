# MF-DECK-COACH-002 — Classifier and advice fixes

Every defect below was **confirmed against the card's real printed Oracle text** (Scryfall snapshots in `tests/fixtures/deck-bench/*.facts.json`, 2026-11-18) before it was changed, and each has a regression test in `tests/deck-coach-002-regressions.test.mjs`. Nothing was tuned to make a number look better: role bands were changed in exactly one place (go-wide wipes, D10), and that change is documented as a heuristic.

## Release blocker found first

| # | Defect | Root cause | Fix | Test |
|---|---|---|---|---|
| D0 | **Deck Check threw on most real multicolor decks.** 15 of 24 benchmark cases crashed on the shipped branch (`target.reliableColors is not iterable`). | `mana-base-coach.mjs` `resolveFetches` set each land's colors inside the same loop that read fetch targets, so a fetch land listed **before** the lands it finds (every alphabetical export: "Bloodstained Mire" before "Mountain", "Myriad Landscape" before "Plains") read an undefined set. | Two passes: set every land's own colors, then resolve fetches. Same result for any list that already worked. | "the mana coach does not throw when a fetch land is listed before…" |

This also affects the existing workbench mana coach on production (`e7e38e6`) for any user list in that order; it was invisible there because Forge-generated lists put basics first.

## Card-role classification (`app/curve-role-coach.mjs`)

| # | Card(s) that showed it | Was read as | Printed text says | Now |
|---|---|---|---|---|
| D1 | **Prismatic Lens** | not ramp (filter only) | `{T}: Add {C}.` *and* `{1}, {T}: Add one mana of any color.` | A card with a cost-free `{T}: Add` is a rock even if a second ability filters → ramp |
| D2 | Wild Growth, Utopia Sprawl, Fertile Ground, Overgrowth | not ramp | "Whenever enchanted land is tapped for mana, its controller adds an additional…" | ramp |
| D3 | Cloudshift, Ephemerate, Restoration Angel, Felidar Guardian, Conjurer's Closet, Soulherder, Eldrazi Displacer, Thassa | **removal / interaction** (Brago list showed 26 interaction) | "exile target creature you control, then return it to the battlefield" | a blink is not removal; Reflector Mage / Banisher Priest still are |
| D4 | **Ezuri's Predation** | nothing — then offered as a *cut* ("costs 8 and is not the missing interaction") | "create a 4/4 … Each of those tokens fights a different one of those creatures [your opponents control]" | one-sided wipe |
| D5 | Massacre Wurm, Pernicious Deed | nothing | "creatures your opponents control get -2/-2"; "Destroy each artifact, creature, and enchantment…" | wipe (one-sided / symmetric) |
| D6 | Kindred Dominance | symmetric wipe → offered as a cut for **Blasphemous Act** in Vampires | "Destroy all creatures that aren't of the chosen type." | `spares-type`; one-sided for a typal plan |
| D7 | Elvish Archdruid, Stromkirk Captain, Vampire Nocturnus, Joraga Warcaller | **win condition** | static "Other Elf creatures you control get +1/+1" | not a win condition; a team pump counts only "until end of turn" (Overrun, Craterhoof) |
| D8 | Avenger of Zendikar | not a win condition (Tatyova landfall read **0** finishers) | "create a 0/1 … token for each land you control" + landfall counters | win condition (landfall finisher) |
| D9 | Elvish Clancaller | **tutor** — cited as the draw-gap evidence and offered as a cut | "Search your library for a card named Elvish Clancaller" | not a tutor in a singleton deck |
| D9b | Swan Song | counter but **not interaction** | "Counter target enchantment, instant, or sorcery spell." | interaction |
| D9c | Season of the Burrow | **card draw** | "Its controller draws a card" (the opponent) | not your draw |
| D9d | Greater Good | **loot** (offered as a cut) | "draw cards equal to the sacrificed creature's power, then discard three" | card advantage |

## Advice that conflicted with the deck's strategy

| # | What players were told | Fix |
|---|---|---|
| D10 | Elves (Ezuri), Goblins (Krenko), Vampires (Edgar) were told **"Not enough ways to reset the board"** and offered **Blasphemous Act / Toxic Deluge** | Go-wide plans (tokens, typal, creatures) now want 0–2 wipes (was 1–3 / 2–4). A swap never adds a symmetric creature wipe to a go-wide plan. **Heuristic**, documented in code. |
| D11 | Off-plan adds: **Akroma's Will** for a Thrasios/Tymna combo deck, a 16-creature Atraxa list and Sythis enchantress; **Skullclamp** for a 9-creature Oloro control deck | Adds must be vetted for the plan (plan fit was a bonus, now a requirement). Board-only adds (Craterhoof, Overrun, Triumph, Akroma's Will, Insurrection, Skullclamp, Beast Whisperer) need ≥ 20 creatures in the list. |
| D12 | Cuts that opened new holes: **Force of Will** (Thrasios), **Demonic/Vampiric Tutor** (Meren), **Farewell** (Atraxa's wipe), **Austere Command** (Sythis's only wipe), **Avenger of Zendikar**, **Ancient Greenwarden**, **Butcher of Malakir**, **Agent of Treachery**, **Patron of the Vein**, **Siege-Gang Commander** | A cut never takes a tutor, protection, a card filling a counted role that is not over its range, or a **plan payoff** (on-type creature for typal; landfall/sacrifice/enchantment/artifact/blink text for those plans; board anthems for go-wide). If no cut is safe, the add is offered with "the cut is your call". |
| D13 | "Card advantage goes from 13 to 14 (range 10–13)": draw added to a deck already at the top of its band | A surplus is trimmed, not traded, when nothing is short. |
| D14 | Mind Stone recommended as the fix for "too few ways to draw extra cards" | A cantrip rock is not offered for a draw shortfall. |
| D15 | "No card here actually ends the game" to decks running **Thassa's Oracle**, **Helix Pinnacle** | Reworded as a heuristic ("Few cards whose printed text ends the game … combos and combat are not counted"); names a combo finish when a "you win the game" card plus ≥3 tutors is present. |
| D16 | Wilson + **Raised by Giants** read as an **enchantment** deck | A Background beside a creature commander does not vote by its type line (`reasoning-engine/deck-profile.mjs`). |

## Known gaps left open (visible in the benchmark, not hidden)

* **Plan reading:** Ghalta ("costs {X} less… total power") and Sram ("Whenever you cast an Aura, Equipment, or Vehicle spell") are not matched to a plan; Thrasios + Tymna reads as *Life gain* because Tymna has lifelink. Deck Check now says so honestly ("MetaForge did not match … Treat the plan-specific advice below as rough"), but the mechanic graph itself was not changed — it is shared with the Forge and deserves its own task.
* Cantrips count as card advantage in the role count (Talrand: 26 "draw"). The coach already separates engines, bursts and cantrips in its answer read; the top-level count was left alone.
* Scapeshift is read as a tutor (sacrifice lands → find lands); it is protected from cuts, but not credited as a landfall finisher.
