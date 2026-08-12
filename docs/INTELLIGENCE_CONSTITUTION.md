# MetaForge Intelligence Constitution

**Status:** binding culture  
**Date:** 2026-08-10 (Phase 1 live Academy)  
**Companion:** [Engineering Principles](ENGINEERING_PRINCIPLES.md) · [Validation Harness](VALIDATION_HARNESS.md) · [Strategic Cognition Initiative](STRATEGIC_COGNITION.md) · [Atlas](ATLAS.md) · [Mentor](MENTOR.md) · [Age of Vocabulary](AGE_OF_VOCABULARY.md) · [Institutional Status](INSTITUTIONAL_STATUS.md)

This is not an implementation checklist. It names the institutions that already emerged and assigns each a **single job** so nobody — including future MetaForge — can accidentally skip a rung.

---

## Preamble

MetaForge does not improve by memorizing what winning decks play most often.

It improves by discovering **how elite players think** — strategic concepts and decision patterns — testing **one** idea at a time, and promoting only what survives evidence gates into production instinct.

Observation and action are separate.

The binding vision for this era: [Strategic Cognition Initiative](STRATEGIC_COGNITION.md).

> Help MetaForge discover how expert players think.  
> Do not ask Cursor to “make the Brain smarter” as the primary mission.

---

## Article I — The Academy

**Purpose:** Discover truth.

The Academy watches elite play, mines principles, rejects false beliefs, and asks new questions.

It **never** attempts to improve the Brain.

### Success metric

> We understand reality better than yesterday.

### Outputs

- Strategic principles
- Failed principles
- Contradictions
- Replication status
- Open research questions
- Monthly Academy Papers

### Rights

The Academy is allowed to say:

> We don't know.

### Hard rule

No Academy artifact may write construction weights, thresholds, package semantics, or Brain branches.

Invariant for every principle it mints:

- `writesToBrain: false`
- `activated: false`
- `promoted: false`

until a later institution explicitly promotes it.

---

## Article II — The Laboratory

**Purpose:** Test exactly one idea.

Every experiment starts from one Academy observation.

- One hypothesis
- One variable
- One success criterion

Example:

> Does protecting uncovered strategic dependencies outperform increasing interaction density?

Nothing else changes.

### Outputs

- A/B reports
- Counterfactuals
- Validation Harness results (as evidence package)
- Promote / Reject recommendation

### Rights

The Laboratory is allowed to say:

> The idea failed.

### Hard rule

Laboratory experiments are opt-in, named, versioned, and never silent production merges. Rejected experiments remain research memory ([Rejected Experiments](REJECTED_EXPERIMENTS.md)).

---

## Article III — The Validation Harness

**Purpose:** Protect the production Brain.

The Harness has one responsibility:

> Prevent regression.

Every experiment must answer the same questions:

1. Does pass rate stay intact?
2. Do hard failures remain zero?
3. Does emergence improve (or hold)?
4. Does oversupply worsen?
5. Does runtime stay acceptable?
6. Does archetype health regress?
7. Does this replicate beyond one commander?

### Hard rule

The Harness never asks whether something is “interesting.”

Only whether it is **safe** and **demonstrably better**.

See [Validation Harness](VALIDATION_HARNESS.md) and the Brain v1 freeze rule in [Engineering Principles](ENGINEERING_PRINCIPLES.md).

---

## Article IV — The Brain

**Purpose:** Build the best deck it knows how to build.

The Brain does not speculate.  
The Brain does not experiment.  
The Brain does not research.

It embodies every principle that has survived the entire pipeline.

### Guiding philosophy

> Only believe what has earned the right to become instinct.

### Hard rule

No construction-behavior change without a Validation Harness report. No commander-specific production branches. No popularity/card-frequency learning as construction policy.

Brain v1 remains frozen until a Laboratory experiment clears the Harness and Engineering Review.

---

## Article V — The Archive

**Purpose:** Never forget why.

The Archive does not discover, test, or build. It preserves **lineage**.

Every promoted principle keeps its provenance forever. For every Brain behavior, MetaForge must be able to answer:

1. Which Academy paper discovered it?
2. Which Laboratory experiment validated it?
3. Which Harness report approved it?
4. Which version introduced it?
5. Has newer evidence strengthened or weakened it?

### Target lineage card (institutional memory)

```
Strategic Principle
  Protect uncovered strategic dependencies.

Status:     Promoted
Origin:     Academy Paper 2026-08
Validated:  Exp007
Harness:    1040 forges · 0 regressions
Evidence:   612 tournament decks · 147 replicated cohorts
Confidence: 0.96
```

### Hard rule

A principle without lineage cannot be promoted. A Brain behavior without lineage is a defect.

**Note:** The Archive is named here as a first-class institution. Pieces already exist (research store, rejected-experiments log, harness reports, principle confidence history). Completing a unified lineage surface is future work — not a Brain change.

---

## Article VI — The Atlas

**Purpose:** Stabilize vocabulary **and** equivalence.

The Atlas does not discover, test, build, score, or gate. It defines the shared language and records which cards **implement** which capabilities / seats so papers do not reinvent meanings:

Capability · Seat · Coverage · Principle · Plan · Dependency · Recovery · Pressure · Conversion · …

### Two jobs

1. **Vocabulary** — what words mean  
2. **Equivalence** — card → implements → capability / seat (never a quality rank)

### Success metric

> Two papers a year apart still mean the same thing by the same word — or the Atlas records why the word changed.  
> Two decks can be compared by occupied seats even when they share no cards.

### Hard rules

Naming is not promotion. Equivalence is not ranking. Coverage is not a single scalar. The Atlas never writes construction behavior. See [Atlas](ATLAS.md).

### Architecture freeze (language phase)

While Capability / Seat / Coverage are still being earned under Academy controls, do not rush Brain or Laboratory expansions that would hard-code an unfinished ontology. Discover the language before the engine is forced to speak it.

**Brain v2 is not something we write. It is something we earn.**  
Initiative charter: [Brain v2 — Strategic Reasoning](BRAIN_V2_STRATEGIC_REASONING.md).  
Active era: [Age of Vocabulary](AGE_OF_VOCABULARY.md) — Atlas first; do not chase Brain v2 embodiment.

---

## Article VII — The Mentor

**Purpose:** Represent **understanding**.

The Mentor does not discover, test, build, score, or remember lineage. It explains decks in Atlas language the way an expert coach would — seats, plans, timing, insurance, backup engines — not card scores.

### Success metric

> “Why is this card here?” gets a strategic explanation, not a number.

### Hard rules

Explanations are not promotions. The Mentor never changes card selection until a separate ladder-cleared slice says otherwise. **Elegance is not evidence.** See [Mentor](MENTOR.md).

---

## Article VIII — Promotion Ladder

Every rung is required. **No exceptions.**

```
Observation
    ↓
Academy Principle
    ↓
Replication
    ↓
Laboratory Experiment
    ↓
Validation Harness
    ↓
Engineering Review
    ↓
Brain Promotion
    ↓
Production
```

Shortcuts are unconstitutional:

| Shortcut | Forbidden because |
|---|---|
| Popularity → Brain | Counts cards, not purpose |
| Fixture hypothesis → Brain | Synthetic evidence is not elite play |
| Academy principle → Brain | Discovery is not validation |
| Single-commander win → Brain | Does not clear replication |
| “Interesting” idea → Brain | Harness does not grade interestingness |
| Silent threshold tweak → Production | Bypasses Engineering Review |
| Atlas term → Brain | Vocabulary is not evidence |
| Mentor explanation → Brain | Understanding is not instinct until promoted |
| Elegant abstraction → Brain | **Elegance is not evidence** |

---

## Article IX — Separation of powers

| Institution | May discover | May test | May change Brain | May forget | Defines words | Explains |
|---|---|---|---|---|---|---|
| Academy | Yes | No | No | No (records contradictions) | Proposes | No |
| Laboratory | No (consumes Academy) | Yes (one idea) | No (only recommends) | No (keeps rejects) | Uses | No |
| Validation Harness | No | Measures only | No (gates only) | No (reports persist) | Uses | No |
| Brain | No | No | Yes (only after ladder) | N/A | Inherits | Embodies |
| Archive | No | No | No | **Never** | Preserves lineage | No |
| Atlas | No | No | No | No (may revise with note) | **Yes** | No |
| Mentor | No | No | No | No | Uses | **Yes** |

Cultural sentences:

> **Brain changes: 0** is a valid Academy outcome. Learning without self-harm is success.  
> **Naming is not promotion.**  
> **Elegance is not evidence.**  
> **Brain waits.**  
> **Users define the questions. The Academy seeks the answers.**  
> **Freeze invention. Do not freeze observation.**  
> **Nothing gets smarter because we want it to. It gets smarter because reality earned it.**

Alpha product evidence (Honest Coach feedback, Trust Calibration) does **not** train the Brain and does not vote on strategy. When enough independent players report the same misunderstanding, that becomes an Academy research question — not a construction patch.

---

## Article IX‑A — Three learning loops

MetaForge is a **research organization with a product**, not a model wrapped in UI.

| Loop | Question | Teacher | May change Brain? |
|---|---|---|---|
| **Product** (weeks) | Are we helping players? | Alpha users | Never (UX / trust / diagnostics only) |
| **Strategic** (months) | How do elite players win — and why? | Tournament structure + expert reasoning | Never directly |
| **Brain evolution** (rare) | Has evidence earned instinct? | Evidence · Harness · review | Only after the promotion ladder |

The product is **not** responsible for discovering strategy. The Academy is.  
The product delivers value and reveals misunderstandings.

---

## Article IX‑B — Evidence streams (not new institutions)

Do not add an eighth institution for each new research idea.

Ask first:

> **Is this a new institution, or simply another evidence stream for the Academy?**

~95% of future ideas should be evidence streams.

```
Academy
├── Evidence Stream 001 — Tournament Structure
├── Evidence Stream 002 — Elite Strategic Reasoning
├── Evidence Stream 003 — Feature Match Decisions (future)
├── Evidence Stream 004 — Longitudinal Meta Evolution (future)
└── Evidence Stream 005 — Cross-TCG Strategy (future)
```

Stream 002 charter: [ACADEMY_EVIDENCE_STREAM_002.md](ACADEMY_EVIDENCE_STREAM_002.md).

Academy observes **structure and reasoning**. Decklists show preparation; expert explanations show *why*.
---

## Article X — Evolution

The constitution may grow new Academy methods, Laboratory protocols, Harness metrics, Archive surfaces, Atlas entries, and Mentor explanation forms.

It may not collapse institutions into each other.

When in doubt:

1. If it discovers → Academy  
2. If it tests one variable → Laboratory  
3. If it asks “is production safer/better?” → Harness  
4. If it builds decks → Brain  
5. If it remembers why → Archive  
6. If it defines what a word means (or equivalence) → Atlas  
7. If it explains why a card/seat is there → Mentor  

---

## North star

Winning structure is not “more interaction” or “more cheap cards.”

It is not a stronger scoring engine.

It is whether MetaForge can **observe and eventually explain strategic thought** the way elite Commander players do — decisions, tradeoffs, risks, outcomes — with cards as implementations.

The research question worth protecting:

> How do we observe strategic thought?

The product question of this era:

> Can a Hall of Fame player recognize MetaForge’s reasoning as expert cognition — before any of it is promoted into Brain construction?

MetaForge becomes strategic over years by accumulating **earned instinct** — not heuristics without provenance.

## Next multi-month programs

1. **Strategic Cognition Initiative** (north star): [STRATEGIC_COGNITION.md](STRATEGIC_COGNITION.md) — reverse-engineer elite strategic thought  
2. **Age of Vocabulary** (discipline layer): [AGE_OF_VOCABULARY.md](AGE_OF_VOCABULARY.md) — Atlas admits only earned words  
3. Academy observation: decisions / concepts — Coverage 001 complete; Decision Pattern observation not yet authorized as a Lab  
4. Understanding (charter): [Mentor](MENTOR.md) — explanations without construction  
5. Brain v2 (earned, not written): [Strategic Reasoning Initiative](BRAIN_V2_STRATEGIC_REASONING.md) — subsumed under Cognition  
6. Sim-Lab sandbox: [Strategic Simulation Laboratory](STRATEGIC_SIMULATION_ENGINE.md) — no enthusiasm trials  

None write to Brain construction until the promotion ladder clears. **Construction is a consequence of understanding.**
