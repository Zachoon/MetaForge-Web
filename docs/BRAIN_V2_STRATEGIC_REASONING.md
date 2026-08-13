# MetaForge Brain v2 — Strategic Reasoning Initiative

**Status:** charter · **0% promoted** · construction untouched  
**Date:** 2026-08-11  
**Companion:** [Constitution](INTELLIGENCE_CONSTITUTION.md) · [Atlas](ATLAS.md) · [Strategic Coverage](STRATEGIC_COVERAGE.md) · [Institutional Status](INSTITUTIONAL_STATUS.md) · [Brain v1 Release](BRAIN_V1_ENGINEERING_RELEASE.md)

---

## Mission

Do **not** improve Brain v1.  
Do **not** tune weights.  
Do **not** add heuristics.  
Do **not** add another coefficient.

Instead:

> Discover the smallest strategic representation capable of explaining why elite Commander decks succeed.

**Brain v2 is not something we write. It is something we earn.**

Brain v2 should emerge from that representation — not precede it.

---

## Forbidden instructions

These undo the architecture:

| Instruction | Why it is wrong |
|---|---|
| “Complete Brain v2 reasoning” | Treats v2 as a coding backlog |
| “Make the Brain smarter” | Usually means more heuristics |
| “Add a coverageScore” | Collapses multidimensional coverage |
| “Promote Strategic Coverage into fill” | Skips Academy → Lab → Harness |
| “Another topology composite” | Wrong abstraction (Sim-Lab-001) |
| “Tune interaction coefficients” | Exp001 already rejected that level |

Right now MetaForge does **not** have a reasoning-engine problem.  
It has a **knowledge representation** problem.

---

## Mandatory order

```
Brain v1 (frozen, ships to users)
    ↓
Academy
    ↓
Atlas
    ↓
Laboratory
    ↓
Harness
    ↓
Promotion Gate
    ↓
Brain v2
```

Nothing may bypass this order.

---

## What we learned

The Academy falsified several assumptions:

| Assumption | Result |
|---|---|
| More interaction → better decks | False |
| Better interaction topology → better recovery | False (Sim-Lab-001) |
| Raw coefficients / Exp001-style weights | Rejected for promotion |
| Interaction count is the primitive | **Not supported** — it is a proxy |

Residual analysis (Proxy Decomposition) consistently points toward:

- capability diversity  
- multifunction cards  
- interchangeable seats  
- role entropy  
- recovery flexibility  

These survive after conditioning on interaction count.

Therefore the latent under investigation is **Strategic Coverage**, not interaction quantity.

Paper: [Interaction Count Doesn't Win](../tests/field-intelligence/ACADEMY_INTERACTION_COUNT_DOESNT_WIN.md)

---

## Objective

Design the internal representation that can express Strategic Coverage.

| Do | Do not |
|---|---|
| Design the language MetaForge thinks in | Design deck scores |
| Define capabilities, seats, coverage profiles | Design card rankings |
| Earn principles over plans of seats | Design another topology metric |
| Produce parallel Strategic Reasoning Reports | Change Brain v1 card selection |

---

## Representation hierarchy

MetaForge should reason in:

```
Capability
    ↓
Seat
    ↓
Coverage          (profile — never coverageScore)
    ↓
Plan
    ↓
Principle
    ↓
Construction      (only after promotion)
```

**Not:**

```
Card → Weight → Deck Score
```

Cards are **implementations**.  
Capabilities are the **reasoning primitive**.

See [Atlas](ATLAS.md) for vocabulary + equivalence (`card implements capability/seat`).

---

## Capability system

Research the **smallest useful** capability ontology.

Illustrative candidates (not definitive; Atlas owns labels):

```
Resource Acceleration
Card Advantage
Selection
Commander Protection
Combo Protection
Engine Protection
Win Conversion
Disruption
Stack Control
Recursion
Recovery
Graveyard Access
Tutor Access
Mana Fixing
Threat Compression
Velocity
Redundancy
```

Each capability that aspires to survive must eventually have:

| Artifact | Required |
|---|---|
| Definition | Atlas |
| Required evidence | Academy |
| Semantic rules | Atlas / Academy |
| Tests | Laboratory / Harness as appropriate |
| Examples | Atlas |
| Counterexamples | Atlas |
| Scoring | **Forbidden** |

---

## Strategic seats

A seat is **not** a card. A seat is a **responsibility**.

Illustrative seats:

```
Protect Commander
Protect Engine
Protect Combo
Enable Combo
Generate Mana
Refill Resources
Answer Stax
Remove Hate Piece
Create Pressure
Recover Plan
Transition to Win
Bridge Early→Mid
Bridge Mid→Late
```

Seat objects must eventually support:

- multiple holders  
- vacancy  
- replacement  
- shared occupancy  
- temporary occupancy  
- conditional occupancy  

Cards fill seats. Cards are not seats.

Protect this sentence:

> Seat vacated. Can another holder assume that role?

---

## Coverage

Coverage is **not** a number.  
**Never** create `coverageScore`.

Coverage is a **profile** (radar), e.g.:

```
Commander Protection
  filled: yes
  holders: Flawless Maneuver · Greaves · Dauntless Escort
  redundancy: 2

Recovery
  level: high
```

Coverage answers:

> If this seat disappears — who else can perform it?

Dimensions remain multidimensional (defensive / recovery / pressure / flexibility / information / resource). See Atlas.

---

## Plans

Plans become graphs of **seats**, not graphs of cards.

```
Ramp → Selection → Engine → Protection → Conversion → Close
```

Cards instantiate plans. Plans do not depend on specific cards.

---

## Principles

Principles become statements over **plans**, not statements over cards.

```
Winning graveyard plans require fill + recursion + protection
```

Not: “Entomb is good.”

---

## Construction (post-promotion only)

Construction becomes:

> Find uncovered seats.

Not:

> Find strongest cards.

Until promotion: Brain v1 construction remains frozen and unchanged.

---

## Strategic reasoning questions (target)

Brain v2 should eventually answer:

- What strategic responsibilities are missing?  
- Which capabilities are uncovered?  
- Which seats are duplicated?  
- Which seats are fragile?  
- Which plans cannot recover?  
- Which plans have no redundancy?  
- Which card fills the greatest **uncovered** responsibility?  

Instead of:

- Which card has the highest score?

---

## Academy expansion

Expand observation around capabilities. Prefer survivors of:

| Control |
|---|
| Commander |
| Archetype |
| Interaction count |
| Budget |
| Color identity |
| Power level |
| Tournament source |

Only **replicated** capabilities may continue toward Laboratory.  
Active charter: [Strategic Coverage](STRATEGIC_COVERAGE.md).

---

## Laboratory

Future sandbox experiments (one hypothesis each — never combined):

| Experiment family | Idea |
|---|---|
| Capability Prediction | Does capability X predict elite outcome under controls? |
| Seat Recovery | Does seat-vacancy recovery beat card-deletion recovery? |
| Coverage Recovery | Do coverage profiles predict resilience? |
| Coverage vs Interaction | Does coverage beat ix count under controls? |
| Coverage vs Win Rate | Transfer to placement (careful; confounders) |
| Coverage vs Recovery | Structural resilience |
| Capability Transfer | Cross-family / cross-commander |

Each tests **one** idea. Sim-Lab-002 is not automatic.

---

## Harness — promotion requirements

Eligible for promotion only if:

- Independent replication  
- Cross commander  
- Cross archetype  
- Cross event  
- Cross source  
- Statistical significance (as defined by harness protocol)  
- Negative controls  
- Golden canaries  
- No regression  

Only then: `eligible_for_promotion = true`.

---

## Brain promotion rules

A capability (or seat / coverage rule) cannot enter Brain construction unless:

1. Academy observed it  
2. Atlas defines it (and equivalence if card-bound)  
3. Laboratory validated it  
4. Harness approved it  
5. Archive records why  
6. Engineering / promotion review passes  

Otherwise: `writesToBrain = false`.

---

## First Brain v2 prototype (when built)

Do **not** build a deck.

Produce a **Strategic Reasoning Report** alongside Brain v1 for every generated deck:

- Plans detected  
- Capabilities present  
- Capabilities absent  
- Seat map  
- Recovery paths  
- Fragile seats  
- Duplicate seats  
- Plan transitions  
- Principles used  
- Open questions  

**Hard rule:** this report exists beside Brain v1. It **never** affects card selection until a later promoted slice clears the ladder.

Prototype status today: **not started** (charter only). Do not rush it before Atlas equivalence + Coverage Academy pass under controls.

---

## Success condition

Brain v2 is “complete” only when MetaForge can explain a deck as a world-class Commander coach would:

1. Identify the deck’s strategic plans  
2. Describe the capabilities required to execute those plans  
3. Recognize which strategic seats are filled or vulnerable  
4. Explain how the deck recovers when disrupted  
5. Justify every inclusion as strategic responsibility — not isolated card strength  
6. Do all of this **before** a single construction heuristic is promoted into production  

Only after that reasoning consistently survives Academy → Laboratory → Harness should any of it become part of Brain construction.

Until then:

| Layer | Status |
|---|---|
| Brain v1 | Frozen · ships |
| Brain v2 reasoning | **0% promoted** |
| Strategic Reasoning Report | Not started (charter ready) |

---

## Cultural sentence

> Brain waits.  
> Naming is not promotion.  
> Elegance is not evidence.

Teaching MetaForge to reason in responsibilities, plans, and capabilities — with cards as implementations — is slower than adding heuristics. It is also the work that lasts.

**This era:** [Strategic Cognition](STRATEGIC_COGNITION.md) — observe how experts think.  
**Discipline:** [Age of Vocabulary](AGE_OF_VOCABULARY.md) — Atlas first.  
**Understanding layer:** [Mentor](MENTOR.md) — explanations, not scores.  
**Do not chase Brain v2 embodiment** until cognition concepts survive observation.

