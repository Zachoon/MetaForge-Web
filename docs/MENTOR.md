# MetaForge Mentor

**Institution:** Mentor  
**Purpose:** Represent **understanding** — not discovery, not testing, not construction  
**Status:** named · charter only · **0% embodied in Brain**  
**Companion:** [Atlas](ATLAS.md) · [Constitution](INTELLIGENCE_CONSTITUTION.md) · [Strategic Cognition](STRATEGIC_COGNITION.md) · [Brain v2 Initiative](BRAIN_V2_STRATEGIC_REASONING.md) · [Age of Vocabulary](AGE_OF_VOCABULARY.md)

---

## Why Mentor exists

Under [Strategic Cognition](STRATEGIC_COGNITION.md), Mentor is how MetaForge will eventually sound like a coach:

> “Because this commander is replaceable. Your bottleneck is protecting the engine after the commander resolves.”

Not:

> “Protection score too low.”

The other institutions are excellent at **knowledge**:

| Institution | Knowledge job |
|---|---|
| Academy | Discovers |
| Atlas | Defines language + equivalence |
| Laboratory | Tests |
| Harness | Protects |
| Brain | Embodies instinct |
| Archive | Remembers |

What’s still missing is a way to represent **understanding** — how a Hall of Fame Commander player *explains* a deck.

They almost never say:

> “This card has a score of 8.3.”

They say:

> “This card is your insurance policy.”  
> “You don’t cast this early.”  
> “You’re happy to sacrifice this.”  
> “This looks like removal, but it’s really protecting your combo.”  
> “This slot is actually your backup engine.”

That is understanding. Not discovery. Not experimentation. Understanding.

---

## Job

The Mentor turns Atlas language + Academy evidence into **explanations**.

It answers questions like:

> Why is Teferi’s Protection here?

**Not:**

> Protection score 92.

**Instead (target voice):**

> Your primary win line requires surviving one rotation after committing resources. This card exists because your commander is irreplaceable during that window. It fills the Commander Protection seat and serves as emergency plan preservation.

Hard rules:

> The Mentor does not change card selection.  
> The Mentor does not invent scores.  
> Explanations are not promotions.  
> Elegance is not evidence.

Until Brain v2 earns promotion, Mentor output (when it exists) is parallel commentary — the same hard rule as the Strategic Reasoning Report.

---

## Relationship to other institutions

```
Academy     discovers what may be true
Atlas       names seats / capabilities / equivalence
Laboratory  falsifies one claim
Harness     gates construction
Archive     remembers why
Mentor      explains a finished (or candidate) list in that language
Brain       eventually embodies only what survived the ladder
```

The Mentor consumes Atlas vocabulary. It does not replace Atlas.  
The Mentor may draft explanations that Academy later stress-tests. It does not skip Laboratory.

---

## Explanation shape (draft)

Every Mentor answer should eventually bind to:

| Field | Example |
|---|---|
| Card / package | Teferi’s Protection |
| Seat(s) filled | Commander Protection · Plan Preservation |
| Plan context | Primary win line after resource commit |
| Timing / posture | Insurance; not early cast |
| Vacancy risk | If this seat empties, who else holds it? |
| Open question | Still contested? (pointer to Academy / Archive) |

No score field. Ever.

---

## Seats are the Mentor’s native unit

Cards rotate. Sets release. Power creep happens.

Responsibilities do not:

> Someone has to protect the commander.  
> Someone has to bridge setup into payoff.  
> Someone has to recover after disruption.

Those are timeless. The Mentor speaks in seats and capabilities; cards are implementations (Atlas equivalence).

---

## What Mentor is not

| Not | Because |
|---|---|
| Another scoring module | Understanding ≠ optimization |
| A Brain construction path | Explanations must not silently change the 99 |
| A substitute for Academy evidence | Beautiful explanations can be wrong |
| A chat personality layer | Voice follows seats/plans, not vibes |

---

## Cultural sentences

> Naming is not promotion.  
> Elegance is not evidence.  
> Brain waits.  
> Understanding is not instinct — until the ladder says it is.

---

## Status

| Layer | State |
|---|---|
| Mentor charter | **This document** |
| Mentor implementation | **Shadow v0 embodied** (`app/knowledge/mentor-shadow.mjs`) · `writesToBrain: false` |
| Affects Brain v1 construction | **Never** (until a separate promoted slice) |

First embodiment speaks Atlas seat language for illustrative bindings. It does not change the 99.

```bash
npm run validate:mentor-shadow
npm run report:mentor-shadow
```

Era 4 Insight founding (not complete): [ERA4_INSIGHT_FOUNDING.md](ERA4_INSIGHT_FOUNDING.md)  
Age of Vocabulary engineering complete: [AGE_OF_VOCABULARY_COMPLETE.md](AGE_OF_VOCABULARY_COMPLETE.md)
