# MetaForge Engineering Principles

These are not implementation details. They are the rules that carried MetaForge from incoherent Pearl-Ear piles to **Brain v1: Engineering Release**.

Future contributors — human or agent — should treat them as binding culture, not optional taste.

---

## 1. Fix classes of failures, not individual commanders

When a deck fails, ask:

> What **class** of reasoning failure caused this?

Never ship production logic of the form:

```js
if (commander === "Pearl-Ear") { … }
```

Commander-specific **fixtures and expectations** are fine.  
Commander-specific **construction branches** are not.

A fix that only rescues one famous commander while leaving the same failure class intact is not a fix — it is a special case waiting to multiply.

---

## 2. Every reasoning change must improve harness evidence

The project’s cultural sentence:

> **No construction-behavior merge without a Validation Harness report.**

“I made the Forge smarter” is not an argument.  
“Show me the harness” is.

A Brain Sprint must answer, at minimum:

1. Did pass rate improve or stay healthy?
2. Did hard failures stay zero?
3. Did avoidable weak slots per forge decrease (or stay within frozen tolerance)?
4. Did beneficial emergence collapse?
5. Did runtime regress materially?
6. Did any golden archetype regress?

If those answers are missing, the brain does not change.

Compare **per-forge rates**, not absolute totals across differently sized corpora.

---

## 3. Prospective belief and retrospective truth remain independent

Pick-time reasoning (`prospectiveSlotDelta`, construction phase, plan competition) is **belief**.  
Finished-deck evaluation (slot justification ledger, cohesion, tournament gates) is **truth**.

They must stay separately measurable.

Do not:

- lower retrospective standards to make prospective scores look wise
- inflate prospective scores to match a ledger that has not earned them
- collapse Self-Evaluation into a vanity metric

Self-Evaluation exists to expose disagreement — including disagreements that are honest constraint-forced outcomes rather than bugs.

---

## 4. Architectural boundaries are more valuable than clever heuristics

MetaForge’s strength is not a single scoring function. It is a pipeline with owned responsibilities:

```
Strategic Intent
  → Plan Competition
  → Phase-Aware Construction
  → Prospective Slot Reasoning
  → Package Optimization
  → Weak Slot Cleanup
  → Slot Justification Ledger
  → Cohesion / Tournament / Practical Ranking
  → Self-Evaluation
  → Validation Harness
```

Protect boundaries.

Prefer a clear authority (prospective vs ledger vs cohesion vs harness) over another blended magic coefficient.  
Prefer a general package/role/semantic fix over a one-off card exception.  
Prefer restraint after a win — validate before inventing the next layer.

---

## 5. Evidence decides Brain Sprint priorities — not intuition

The loop that earned Brain v1:

```
observe → classify → intervene → rerun → compare
```

Not:

```
invent → hope → tweak
```

Brain Sprint 2 (and beyond) opens only when repeated field evidence names a highest-impact **general** defect class. Synthetic fixtures proved the architecture. Real corpora will stress it. Failures there should sound like:

> “Real card-pool scarcity exposed a missing interaction semantic in blink decks.”

not:

> “The deck is bad.”

Until then: **Brain v1 stays frozen.** Harness, golden canaries, corpus ingestion, and reports may grow freely.

Rejected construction experiments are institutional knowledge — see `docs/REJECTED_EXPERIMENTS.md`.  
The open research agenda after Exp001 is interaction **topology**, not interaction **weights** — see `docs/INTERACTION_TOPOLOGY_RESEARCH.md`.

---

## Companion documents

| Document | Role |
|---|---|
| `docs/BRAIN_V1_ENGINEERING_RELEASE.md` | Engineering release record |
| `docs/REASONING_PIPELINE.md` | Authoritative pipeline map |
| `docs/VALIDATION_HARNESS.md` | Field-test / freeze charter |
| `docs/FIELD_INTELLIGENCE_V1.md` | Tournament evidence / Level-A forensics |
| `docs/REJECTED_EXPERIMENTS.md` | Failed promotions — do not re-open blindly |
| `docs/INTERACTION_TOPOLOGY_RESEARCH.md` | Post-Exp001 research agenda (observation only) |
| `docs/BRAIN_V2_EXP001_INTERACTION.md` | Exp001 detail (rejected for promotion) |
| `.cursor/rules/metaforge-brain-v1.mdc` | Agent/merge gate for construction changes |
| `tests/validation-harness/brain-v1-frozen-benchmark.json` | Frozen field benchmark |

---

*Write these principles down so future us cannot quietly forget them when the next Pearl-Ear deck shows up.*
