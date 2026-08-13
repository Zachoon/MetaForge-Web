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
The open research agenda after Exp001 / Sim-Lab-001 is **Strategic Coverage** (capabilities / seats under controls) — not interaction weights and not another topology composite. See `docs/STRATEGIC_COVERAGE.md` and `docs/ATLAS.md`. Topology research remains historical context in `docs/INTERACTION_TOPOLOGY_RESEARCH.md`.

**Language-phase freeze:** prefer Atlas + Academy observation over new Brain/Lab subsystems until Capability / Seat / Coverage are stable under the Coverage charter’s controls. Active era: [Age of Vocabulary](AGE_OF_VOCABULARY.md). Mentor explains; it does not build. **Elegance is not evidence.**

---

## 8. Unknown is not absent

Product and research both fail the same way when incompleteness is rendered as emptiness.

> **Unknown is not absent.**  
> **Alternate identity is not unknown.**

If MetaForge cannot verify a card, package, or engine, say that the claim is **unverified** or **incomplete** — never imply the strategy or machinery does not exist.

Printed / flavor / reskin names that authoritatively map to an Oracle card are **resolved identities**, not holes.

Earned by Product Sprint Alpha Track A4 (Tony Stark founder run): unresolved Universes Beyond / flavor-name cards produced a false “no engine” reading.

---

## Companion documents

| Document | Role |
|---|---|
| `docs/CONVERSATION_CONTRACT.md` | **Product conversation** — I heard you → philosophies → deck → pilot; collaborative deck coach |
| `docs/FOUNDER_ISSUES.md` | Living founder scoreboard (evidence → issue → fix → verify) |
| `docs/STRATEGIC_COGNITION.md` | **North star** — observe strategic thought; research-platform flywheel (knowledge → sim → Lab → Harness → Brain); construction as consequence |
| `docs/INTELLIGENCE_CONSTITUTION.md` | Academy / Laboratory / Harness / Brain / Archive / Atlas / Mentor — single jobs + ladder |
| `docs/AGE_OF_VOCABULARY.md` | Discipline layer — Atlas admits only earned words |
| `docs/ATLAS.md` | Vocabulary **and** equivalence → Concept Graph destination |
| `docs/MENTOR.md` | Understanding / explanations — not discovery, not construction |
| `docs/BRAIN_V2_STRATEGIC_REASONING.md` | Brain v2 initiative — earned under Cognition; never “complete v2” by coding heuristics |
| `docs/INSTITUTIONAL_STATUS.md` | What is live vs promoted |
| `docs/STRATEGIC_COVERAGE.md` | Academy observation: capabilities under commander / archetype / ix-count controls |
| `docs/STRATEGIC_SIMULATION_ENGINE.md` | Sim-Lab — isolated “what if?” sandbox (not Brain) |
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
