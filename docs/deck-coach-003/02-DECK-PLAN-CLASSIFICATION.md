# MF-DECK-COACH-003 · 2. Deck-plan classification

New module: `app/deck-plan-read.mjs`. The curve coach accepts a `planOverride` (`app/curve-role-coach.mjs`); Deck Check passes either its read or the player's confirmed plan (`app/deck-check-report.mjs` `planContext`).

## How a plan is read now

1. **Commander text.** The existing `readCommanderPlan` is kept, with three corrections:
   * **Lifelink alone is not a life-gain plan.** Thrasios + Tymna read "Life gain" from Tymna's lifelink.
   * **Text that names Auras or Equipment is that plan.** Sram: "Whenever you cast an Aura, Equipment, or Vehicle spell".
   * **Text that rewards creature power is big creatures.** Ghalta: "the total power of creatures you control".
   * A Background beside a creature commander does not vote by its enchantment type line (from 002).
2. **The 99.** Each plan has a plain, countable signal, and the evidence line states exactly what was counted. Examples:
   * "12 Equipment in the list, e.g. …"
   * "creatures costing 6 or more"
   * "cards that trigger on or add land drops"
   * Typal: the most common creature type.
   * A plan needs a minimum count before it can lead or be named second; instants need 24, plus at least 3 cast payoffs before they count as spellslinger.
3. **Combo finish.** A printed "you win the game" card plus 4 or more tutors is named as a second plan. It gets no bands, because MetaForge has none for combo.
4. **Primary plan:**
   * commander text confirmed by the deck → **high**
   * commander text only → **medium/low**
   * deck cards only → **medium**
   * neither → "no single plan" (**low**)
5. **Plans without bands of their own** (+1/+1 counters, life gain) are named, then coached with the general bands, and the report says so.

Every plan carries **source**, **confidence** and **evidence**, and the page labels it *Heuristic* until the player confirms it (then *Player-confirmed*). Nothing about a plan is labelled verified.

## Player confirmation

The plan card has a picker of the 17 plans the coach has bands for; the detected plan is marked. **Confirm plan** re-runs the report against it. The plan becomes "You confirmed the plan: …", source `player`, with confidence treated as 0.9. **Back to the detected plan** undoes it. Nothing is stored server-side.

A confirmed plan reaches every coaching path:
* role bands
* the curve ideal
* finding text
* weakness ranking
* cuts (plan payoffs)
* adds (vetted per plan)
* swap replays
* the player's own swap test

This is pinned by "a confirmed plan reaches every coaching path…" in `tests/deck-coach-003-plan-and-protection.test.mjs`. The mana coach and table pressure do not depend on the plan; land need comes from the cards themselves.

## Results on the benchmark decks

| Deck | Before (002) | Now |
|---|---|---|
| Ghalta, Primal Hunger | midrange, low ("did not match") | **Big creatures**, high (text + 15 creatures costing 6+); ten mana Elves no longer make "Elf typal" a second plan (typal needs 15 of one type) |
| Sram, Senior Edificer | midrange, low | **Equipment**, high; second plan **Auras** |
| Thrasios + Tymna | "Life gain" (from lifelink) | **No single plan**, low; second plan **Combo finish**: "1 card that says “you win the game” (Thassa's Oracle) and 8 tutors to find it" |
| Wilson + Raised by Giants | midrange | No single plan, low (honest); the player can confirm Equipment |
| Atraxa | +1/+1 counters, general bands | unchanged, says so |
| Ezuri, Edgar, Krenko, Baru | typal | typal, high; Baru reads as "Wurms" |
| Talrand, Meren, Brago, Urza, Sythis, Tatyova | as read | unchanged, now high with deck evidence |

Benchmark: the four plan-read failures left by MF-DECK-COACH-002 now pass.

## Limits

* Signals are printed-text and type-line counts, not synergy analysis.
* "Creatures costing 6 or more" stands in for power, which the card data in Deck Check does not carry.
* Mixed decks get a primary and one secondary plan; bands come only from the primary (or the confirmed) plan.
