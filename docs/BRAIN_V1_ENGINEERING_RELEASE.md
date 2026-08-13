# MetaForge Brain v1 — Engineering Release

**Status:** Released (engineering) — not a public product launch  
**Date:** 2026-08-10  
**Meaning:** frozen · benchmarked · deterministic · measurable · harness-protected

## What “engineering release” means

Brain v1 is locked as the construction baseline MetaForge will field-test against.

It is **not**:

- a claim that every Commander deck is solved
- permission to invent Brain Sprint 2
- a public / marketing release

It **is**:

- a frozen reasoning architecture
- a seed-stable quality profile
- a regression contract enforced by the Validation Harness

## Architecture (Brain v1)

```
Input
  → Strategic Intent
  → Strategic Plan Competition
  → Phase-Aware Construction
  → Prospective Slot Reasoning (+ closure / saturation awareness)
  → Package Optimization
  → Weak Slot Cleanup (bounded, forensic-gated)
  → Slot Justification Ledger
  → Strategic Cohesion Validation
  → Tournament / Practical Ranking
  → Self-Evaluation
  → Validation Harness
```

## Frozen field benchmark

Artifact: `tests/validation-harness/brain-v1-frozen-benchmark.json`

| Dimension | Value |
|---|---|
| Corpus | 13 fixtures × 8 seeds = **104 forges** |
| Pass rate | **100%** |
| Hard failures | **0** |
| Ledger weak / forge | **2.385** |
| Avoidable weak / forge | **0.154** |
| Constraint-forced weak / forge | **1.923** |
| Beneficial emergence / forge | **11.24** |
| Seed variance | Archetype weak counts **identical** across all 8 seeds |

The seed-flat quality profile is the headline: not only decklists are deterministic — **quality metrics are deterministic**.

## Merge gate

**No construction-behavior merge without a Validation Harness report.**

See `.cursor/rules/metaforge-brain-v1.mdc` and `docs/VALIDATION_HARNESS.md`.

Required answers:

1. Pass rate  
2. Hard failures stay zero  
3. Avoidable weak / forge  
4. Beneficial emergence  
5. Runtime  
6. Per-archetype / golden canary health  

## What comes next (not Brain Sprint 2)

**Milestone: MetaForge Field Validation**

1. Golden commander canaries (stable expected rates) — started  
2. Real Commander corpus in the **same harness report shape**  
3. Community corpora (EDHREC / Moxfield / Archidekt / tournament lists) for disagreement analysis  
4. Weekly trend reports — after real corpora are representative  
5. Nightly automation — last, not first  

**Parallel (does not modify Brain v1):** [Brain v2 — Strategic Reasoning Initiative](BRAIN_V2_STRATEGIC_REASONING.md).  
Brain v2 is earned via Academy → Atlas → Laboratory → Harness — not written as a scoring upgrade. **0% promoted.**

## The rule that earned this release

```
observe → classify → intervene → rerun → compare
```

not

```
invent → hope → tweak
```

No new reasoning layer until repeated field evidence earns one.

## Philosophy

The five principles behind this release live in [`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md):

1. Fix classes of failures, not individual commanders.  
2. Every reasoning change must improve harness evidence.  
3. Prospective belief and retrospective truth remain independent.  
4. Architectural boundaries are more valuable than clever heuristics.  
5. Evidence decides Brain Sprint priorities — not intuition.
