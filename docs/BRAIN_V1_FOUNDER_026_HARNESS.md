# Founder #026 — Restricted-effect overcredit (harness report)

**Date:** 2026-08-14 (ship) · **Follow-up:** 2026-08-15 (live trial failed)  
**Policy:** default Brain v1 construction (not an opt-in experiment)  
**Class:** Conditional / mutually exclusive effects were scored as unconditional full-job cards  
**Evidence:** T'Challa Selesnya list + prior Eldrazi watch  
**Corpus:** 13 fixtures × 8 seeds = **104 forges** vs `tests/validation-harness/brain-v1-frozen-benchmark.json`

This is a representation fix, not a new planning layer and not a card deny-list.

## What changed

1. **Restricted rainbow lands** — type-restricted mana (Cavern / Unclaimed Territory class) is not full color-fit unless the list is typal (commander oracle tribe, explicit typal note, or ≥12 tribe members). Path of Ancestry keeps full credit because it also taps for unrestricted commander-identity colors.
2. **Modal toolbox roles** — classification still unions modes. Role *score* counts only as many modes as the card can fire (choose one → 1, choose two → 2). Role *floors* and prospective deficit-closure count modal cards at 0.4, and do not mark a live role deficit closed.
3. **Restricted colorless casting** — `{C}` pips in a colored list without unrestricted `{C}` are not full selection credit. Artifact-only `{C}` (Vibranium / Powerstone class) pays artifact spells, not Kozilek's Command / Ugin. Colorless commanders keep full credit.
4. **Scoped spell payoffs** — "whenever you cast an artifact spell" is not spellslinger. Colorless instants do not claim that commander edge.
5. **Payable construction** — cards the list cannot pay for are not engine anchors and do not compete in live fill while payable cards remain.
6. **Conditional rainbow lands** — devotion-scaled any-color (Nykthos class) is full fixing only in mono-color. Type-count scaled any-color (Three Tree City class) is full fixing only when the list is typal.

## Gate answers

| # | Question | Result |
|---|----------|--------|
| 1 | Pass rate improve or stay 100% on golden / field? | **100%** (104/104). Unchanged. |
| 2 | Hard failures stay zero? | **0**. Unchanged. |
| 3 | Avoidable weak slots per forge ≤ frozen? | **0.154**. Identical to frozen. |
| 4 | Beneficial emergence collapse? | **11.24 / forge**. Identical to frozen. Floor is 10.5. |
| 5 | Runtime regress materially? | Quality-identical to frozen. Host runtime vs 2026-08-10 benchmark machine still fails the golden `mean_runtime_ms` 1.75× gate. No new search layer. |
| 6 | Any golden archetype regress? | **No.** Per-archetype weak ceilings identical across all 8 seeds (Pearl-Ear 0, typal 0, tokens 8, combo 7, …). |

### Field vs frozen (per-forge)

Follow-up field artifact: `tests/validation-harness/out/report-field-2026-08-15T055052Z.json`

| Metric | Frozen | #026 follow-up field |
|---|---:|---:|
| Pass rate | 1.000 | 1.000 |
| Hard failures | 0 | 0 |
| Ledger weak | 2.385 | 2.385 |
| Avoidable weak | 0.154 | 0.154 |
| Constraint-forced weak | 1.923 | 1.923 |
| Beneficial emergence | 11.24 | 11.24 |
| Later package oversupply | 2.481 | 2.481 |
| Genuine bad belief | 0.538 | 0.538 |

No hard regressions flagged by the harness comparison.

## Class tests (the screenshot, not the torture pool)

Torture fixtures do not contain Cavern / Warping Wail / Kozilek's Command, so field identity is expected. The failure class is locked by `npm run validate:founder-026`:

- Non-typal GW list: Cavern loses to in-color duals
- Typal commander (Ayula): Cavern stays
- Path of Ancestry identity tap: full fixing credit
- Modal modes still classify; choose-one / choose-two score only the modes you can fire
- `{C}` demand is visible; Forests do not satisfy it
- Artifact-only `{C}` does not pay colorless nonartifact spells; artifacts still pay
- "Cast an artifact spell" is not a spellslinger connection for Kozilek's Command
- Screenshot-class GW pool: Kozilek's Command, Warping Wail, Ugin, and Glaring Fleshraker lose to in-color cards; Sol Ring may stay
- Multicolor list: Nykthos loses to in-color duals; mono-color keeps it
- Non-typal list: Three Tree City loses to in-color duals; typal commander keeps it

## Live trial (2026-08-14)

Failed. First ship only showed `{C}` to mana consistency and left a 0.2 modal remainder. Selection still:

- treated "whenever you cast an artifact spell" as generic spellslinger (every instant got a commander connection)
- reserved token-package anchors for unpayable `{C}` cards
- let Kozilek's Command win live fill as a fake 1-drop (`{X}{C}`) against oversupplied in-color removal

Follow-up puts restricted casting into **selection**, scopes the artifact-spell payoff, and withholds unpayable cards from anchors / live fill while payable cards remain.

## Commands

```bash
npm run validate:founder-026
npm run validate:harness:field
```

## Promotion

**Promoted to default construction.** Not Exp001-style coefficients. Not commander-specific.

Do not retry as an Eldrazi / Ugin / Cavern deny-list.
