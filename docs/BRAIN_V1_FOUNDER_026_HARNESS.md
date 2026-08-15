# Founder #026 — Restricted-effect overcredit (harness report)

**Date:** 2026-08-14  
**Policy:** default Brain v1 construction (not an opt-in experiment)  
**Class:** Conditional / mutually exclusive effects were scored as unconditional full-job cards  
**Evidence:** T'Challa Selesnya list + prior Eldrazi watch  
**Corpus:** 13 fixtures × 8 seeds = **104 forges** vs `tests/validation-harness/brain-v1-frozen-benchmark.json`

This is a representation fix, not a new planning layer and not a card deny-list.

## What changed

1. **Restricted rainbow lands** — type-restricted mana (Cavern / Unclaimed Territory class) is not full color-fit unless the list is typal (commander oracle tribe, explicit typal note, or ≥12 tribe members). Path of Ancestry keeps full credit because it also taps for unrestricted commander-identity colors.
2. **Modal toolbox roles** — classification still unions modes. Role *score* keeps the primary mode and a 0.2 remainder for extras. Role *floors* and prospective deficit-closure count modal cards at 0.4, and do not mark a live role deficit closed.
3. **`{C}` pips** — colorless pip demand is visible to mana consistency. Forests cannot pay `{C}`.

## Gate answers

| # | Question | Result |
|---|----------|--------|
| 1 | Pass rate improve or stay 100% on golden / field? | **100%** (104/104). Unchanged. |
| 2 | Hard failures stay zero? | **0**. Unchanged. |
| 3 | Avoidable weak slots per forge ≤ frozen? | **0.154**. Identical to frozen. |
| 4 | Beneficial emergence collapse? | **11.24 / forge**. Identical to frozen. Floor is 10.5. |
| 5 | Runtime regress materially? | Field mean **3965 ms** on this Windows host vs frozen **2196 ms** (1.80×). No new search layer; torture *picks* are quality-identical, so this is host vs 2026-08-10 benchmark machine plus cheap per-card oracle reads. Golden `mean_runtime_ms` multiplier 1.75× **fails on this host**. Quality gates pass. |
| 6 | Any golden archetype regress? | **No.** Per-archetype weak ceilings identical across all 8 seeds (Pearl-Ear 0, typal 0, tokens 8, combo 7, …). |

### Field vs frozen (per-forge)

| Metric | Frozen | #026 field |
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

Torture fixtures do not contain Cavern / Warping Wail, so field identity is expected. The failure class is locked by `npm run validate:founder-026`:

- Non-typal GW list: Cavern loses to in-color duals
- Typal commander (Ayula): Cavern stays
- Path of Ancestry identity tap: full fixing credit
- Modal modes still classify; they no longer sum as simultaneous jobs
- `{C}` demand is visible; Forests do not satisfy it

## Commands

```bash
npm run validate:founder-026
npm run validate:harness:field
```

Field artifact: `tests/validation-harness/out/report-field-2026-08-14T073342Z.json`

## Promotion

**Promoted to default construction.** Not Exp001-style coefficients. Not commander-specific.

Do not retry as an Eldrazi / Ugin / Cavern deny-list.
