# MetaForge Strategic Cognition Initiative

**Status:** declared vision · binding north star for the next era  
**Date:** 2026-08-11  
**Not:** Brain v2 backlog · Coverage sprint · Atlas feature dump · Mentor product launch  

---

## The vision changed

Three weeks ago the instruction was:

> Make the Brain smarter.

The instruction now is:

> **Help MetaForge discover how expert players think.**

Those are not the same mission.

Stop asking:

> How do we improve the Brain?

Start asking:

> **How do we observe strategic thought?**

And speak carefully:

> MetaForge does not get “smarter.” It becomes **better informed.**

---

## Research culture lock

Full lock lives in [`KNOWLEDGE_EXPANSION_PROGRAM.md`](./KNOWLEDGE_EXPANSION_PROGRAM.md). Summary:

| Pillar | Meaning |
|--------|---------|
| **Better informed** | Knowledge bases accumulate evidence; Brains earn changes separately |
| **Surprise** | Friday: what surprised MetaForge? |
| **Retired belief** | Friday: what did MetaForge stop believing — and why? |
| **Freshness** | Know when knowledge is getting old |
| **Confidence** | Know how solidly we know it (replication, diversity, agreement, holdout, contradiction) |
| **States** | Known · Emerging · Contradicted · Retired |
| **Hypothesis** | Falsifiable research object (prediction + retirement) — not an “opinion” |
| **Stance** | Product voice for a hypothesis (“current understanding suggests…”) |

```text
A great research platform doesn't just accumulate knowledge.
It remembers how its understanding changed.

The goal is not to know everything.
The goal is to know exactly how confident we should be
in what we think we know.
```

**Intellectual framework: complete for knowledge.**  
**Era 1 active:** Strategic Evaluation (construction judgment without construction mutation).  
**Era 2 complete:** Strategic Concepts + play captures + simulation witness + Concept Stance Voice.  
**Knowledge Era 1 complete:** Strategic Evaluation judgment layer.  
**Age of Vocabulary engineering complete:** Atlas Vocabulary Registry v0 · Capability admissions 0.  
**Era 4 Insight founded (not complete):** Mentor Shadow v0.  
Sprint charter: [`OBSERVATION_SPRINT.md`](./OBSERVATION_SPRINT.md). Brain still frozen.
Feed reality → evaluate decisions → don’t invent constitutions.

---

## Mission

**Reverse-engineer the cognitive process of elite Commander players.**

Stop discovering cards.  
Stop discovering packages.  
Stop discovering metrics as ends in themselves.

Discover **strategic concepts** — the decision patterns experts recognize when they look at a list or a match.

Academy evidence comes in **streams**, not new institutions:

1. **Tournament structure** — what elites prepare (decklists / results)  
2. **Elite strategic reasoning** — why they prepare that way (articles, interviews, commentary) — [Stream 002](ACADEMY_EVIDENCE_STREAM_002.md)

Observe structure **and** reasoning. Decklists are final exams; expert explanations are the student's work.

Deck construction becomes a **consequence of understanding**, not the objective.

---

## Success criterion

Not: a stronger deck builder.

This:

> **A Hall of Fame Commander player should be able to read MetaForge’s reasoning and recognize it as the way an expert actually thinks about the game.**

Until that is true, Brain inheritance stays closed.

---

## Strategic research platform (refined north star)

Deep Blue scale alone is not the ambition. AlphaGo’s lesson is richer: **human knowledge + massive evaluation + rigorous validation**. MetaForge’s equivalent is richer still because TCGs have **deck construction and gameplay**.

### The flywheel (order matters)

```text
Official Rules
        +
Complete Card Knowledge
        +
Elite Tournament Decks
        +
Expert Strategy & Commentary
        +
Observed Gameplay
        ↓
Strategic Knowledge Base
        ↓
Simulation Engine
        ↓
Millions of Controlled Games
        ↓
Strategic Evaluation
        ↓
Laboratory Validation
        ↓
Harness Verification
        ↓
Brain Evolution
```

**Critical insight:** simulation without understanding can reinforce bad assumptions. A simulator that misunderstands why a strategy works can play a million games and learn the wrong lesson. That is why the **knowledge foundation comes first** — card semantics, elite structure, controlled high-vs-low contrasts, expert reasoning with provenance — before scale.

### Construction ↔ piloting

Where MetaForge can become unique is not “another recommender.” It is the loop where construction and gameplay inform each other:

```text
Build Deck
     ↓
Play many controlled games
     ↓
Analyze losses
     ↓
Identify structural weakness
     ↓
Generate alternative build
     ↓
Play again
     ↓
Repeat
```

Humans cannot iterate at that scale. Coaching questions that become possible only after knowledge + honest simulation:

- This deck won X% of simulated games. **Why?**
- The bottleneck wasn’t card quality — it was **sequencing turns 3–5**.
- This package looks weaker in isolation, but across thousands of games it **stabilized the primary plan**.

That is coaching, not recommendation.

### Simulation is evidence — not an oracle

Tournament results, expert reasoning, and simulation each have different strengths and blind spots.

| When | Confidence |
|------|------------|
| They **agree** | Confidence rises |
| They **disagree** | Often the most interesting discovery |

Extraordinary capability to earn:

> Tournament evidence suggests Strategy A. Simulation suggests Strategy B. Here’s why they differ, and here’s the evidence behind both.

Not copying the metagame. Not blindly trusting simulation. **Synthesizing multiple evidence streams into strategic insight.**

### Ambition label

More defensible than “the Deep Blue of Commander”:

> **A strategic research platform for trading card games** — one that can observe, simulate, explain, and eventually discover ideas that are both novel and rigorously supported.

Near-term engineering implication (no new institutions):

1. Expand the **strategic textbook** (card knowledge, elite fingerprints, Level-A contrasts, substitutions, curated expert claims).  
2. Keep Brain v1 frozen; shadow-compare builds against that textbook.  
3. Only then grow Sim-Lab evaluation scale — still `writesToBrain: false` until Laboratory + Harness earn otherwise.

> Freeze invention. Do not freeze observation.

---

## What experts do *not* think

```
Interaction Count = 13
Coverage = 82
Protection score too low
```

## What experts *do* think

> “This deck folds to a resolved Drannith Magistrate.”  
> “You have no backup engine.”  
> “This tutor is actually functioning as redundancy.”  
> “You can survive losing the commander.”  
> “Your opening seven is deceptive.”  
> “This hand is powerful but strategically trapped.”  
> “He can’t afford to lose this.”  
> “Now he has inevitability.”  
> “He’s representing interaction.”  
> “This forces removal.”

Those are **cognitive observations**. MetaForge does not know them yet.

---

## From mining decks → mining decisions

| Old question | New question |
|---|---|
| What cards do elite players use? | What strategic decisions repeatedly separate winners from losers? |
| Study finished 99s | Study **decisions** (and eventually matches / commentary) |
| Metric residuals | Decision patterns |

### Decision classes (Academy targets — not yet earned)

1. Why did the winner tutor **this** instead of **that**?  
2. Why did the winner protect **this** piece?  
3. Why did they intentionally **not** cast a card?  
4. Why did they keep that opening hand?  
5. Why did they pivot away from Plan A?

Those are building blocks of intelligence — harder to observe than card frequency, and worth more.

---

## Strategic Concept Graph (Atlas evolution)

Atlas today: vocabulary + equivalence (Capability / Seat / Coverage).

Atlas destination under this initiative: a **Concept Graph** closer to strategic thought:

```
Decision
    ↓
Purpose
    ↓
Tradeoff
    ↓
Risk
    ↓
Outcome
```

Candidate **Decision Pattern** labels (illustrative — unearned until observation survives):

```
Delay commitment
Trade resources
Protect inevitability
Accept temporary weakness
Compress clock
Preserve redundancy
Threat sequencing
Forced pivot
Resource conversion
Hidden pressure
Bait interaction
Exhaust answers
```

Capability / Seat / Coverage remain useful mid-layer tools when earned. They are **not** the mission. Decision Patterns are the higher target.

Hard rules still bind:

> Naming is not promotion.  
> Elegance is not evidence.  
> Brain waits.

Coverage Observation 001 already showed why: global residuals can reverse under Level-A. Cognition must survive controlled observation even harder.

---

## Institutional roles under this initiative

| Institution | Job in Strategic Cognition |
|---|---|
| **Academy** | Observe decisions, matches, commentary; extract recurring concepts |
| **Atlas** | Hold only concepts that survive observation — Concept Graph, not slogan pile |
| **Mentor** | Explain in expert language (“bottleneck is engine protection after commander resolves”) — never scores; never mutates 99 until promoted |
| **Laboratory** | Falsify one decision-pattern / concept hypothesis at a time |
| **Harness** | Protect Brain v1; gate any future inheritance |
| **Archive** | Remember which beautiful concepts failed |
| **Brain** | Inherit only after repeated survival — construction as consequence of understanding |

The institutions are no longer just a research pipeline. They are scaffolding for studying **strategic cognition itself**.

---

## Six-month mission (Cursor / agents)

1. Prefer observing **strategic concepts** over inventing metrics.  
2. Prefer **decision / match / commentary** evidence over card-frequency mining when available.  
3. Teach Atlas only concepts that survive observation + controls.  
4. Teach Mentor to *speak* those concepts (language check → later coaching).  
5. Allow Laboratory to falsify them one at a time.  
6. Allow Harness to protect production.  
7. Only after repeated survival may Brain inherit them.

**Forbidden shortcuts**

- “Complete Brain v2”  
- `coverageScore` / scalar collapses  
- Promoting Coverage / Capability / Decision Pattern into fill because it sounds like Kibler  
- Treating Coverage Observation 001 residuals as Cognition success  

---

## Relationship to prior eras

| Era | Still true | Subordinated to |
|---|---|---|
| Brain v1 freeze | Ships; frozen | Cognition does not unfreeze it |
| Age of Vocabulary | Atlas discipline required | Vocabulary serves Cognition |
| Strategic Coverage | Tools under test | Not the north star |
| Brain v2 Strategic Reasoning | Earned, not written | Subsumed: reasoner = cognition survivor |

Coverage Observation 001 (`PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION`) stands: we did **not** earn Capability labels. That discipline is exactly how Cognition must behave when Decision Patterns are proposed.

---

## Near-term Academy posture

Do **not** rush a Match Observatory or commentary scraper as a Brain project.

Do:

1. Sit with Coverage 001’s Level-A reversal question (still valid Academy work).  
2. Charter how Decision evidence would be observed (sources, provenance, privacy, non-simulation).  
3. Keep Mentor as language validation until concepts exist.  
4. Keep Laboratory dark unless separately authorized after a Cognition paper.

First Cognition paper (when authorized): not “more residuals” — a **Decision Pattern Observation** design that can fail cleanly.

---

## Cultural sentences

> Help MetaForge discover how expert players think.  
> Observe strategic thought — don’t invent Brain instinct.  
> Naming is not promotion. Elegance is not evidence. Brain waits.  
> Construction is a consequence of understanding.

---

## Companions

- [Intelligence Constitution](INTELLIGENCE_CONSTITUTION.md)  
- [Age of Vocabulary](AGE_OF_VOCABULARY.md)  
- [Atlas](ATLAS.md) · [Mentor](MENTOR.md)  
- [Brain v2 Strategic Reasoning](BRAIN_V2_STRATEGIC_REASONING.md)  
- [Strategic Coverage](STRATEGIC_COVERAGE.md) · Coverage 001 paper  
- [Institutional Status](INSTITUTIONAL_STATUS.md)  
