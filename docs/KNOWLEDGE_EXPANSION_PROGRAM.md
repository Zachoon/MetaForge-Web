# Knowledge Expansion Program

**Status:** active · **intellectual framework locked** (2026-08-11)  
**Date:** 2026-08-11  
**North star:** [Strategic Cognition](./STRATEGIC_COGNITION.md) — strategic research platform flywheel  
**Hard rule:** Brain v1 stays frozen. Every epic produces **inspectable knowledge**, not scoring tweaks.

> Users are not the strategy teacher.  
> Primary teachers: rules truth · elite tournament structure · expert reasoning.  
> Product feedback remains calibration only.

> MetaForge does not get “smarter.” It becomes **better informed.**  
> Brains become smarter. Knowledge bases become better informed. Keep them separate.

---

## Intelligence stack (what Epics 1–6 actually are)

Not six independent features — six layers of one textbook:

```text
Layer 1  What cards ARE.                         (Epic 1)
Layer 2  What elite decks repeatedly DO.         (Epic 2)
Layer 3  What strategic jobs cards solve.        (Epic 3)
Layer 4  What experts SAY.                       (Epic 4)
Layer 5  How to retrieve everything honestly.    (Epic 5)
Layer 6  How Brain compares to reality.          (Epic 6)
```

None of those layers are opinions. They are inspectable evidence.

```text
Card Truth + Tournament Truth + Expert Truth + Strategic Retrieval + Brain Shadow
= MetaForge Knowledge
```

---

## Research culture lock (complete)

No new constitutions after this. The next years feed **reality into this framework**.

### Language

| Prefer | Avoid |
|--------|--------|
| MetaForge becomes **better informed** | MetaForge gets **smarter** |
| Evidence / observation / confidence | Invention / elegance / vibes-as-truth |

### Knowledge states

```text
Known        Observed repeatedly.
Emerging     Interesting but early.
Contradicted Evidence conflicts.
Retired      No longer believed.
```

Not everything graduates. Some things die. Some things remain uncertain forever — and that is okay.

### Friday questions

```text
1. What surprised MetaForge this week?
2. What did MetaForge stop believing this week?
```

Surprises are where discovery starts.  
Retired beliefs are institutional memory of **changing your mind** — the hallmark of a research platform.

```text
SURPRISE
Repeated elite Kinnan lists reduced interaction more than expected.

RETIRED BELIEF
We previously believed:
  "High interaction density consistently predicts structural recovery."
Current evidence: tournament mixed · expert mixed · holdout failed replication
Status: Retired from active belief.
Brain inheritance: None.
```

A great research platform doesn’t just accumulate knowledge.  
**It remembers how its understanding changed.**

### Knowledge Health (weekly)

```text
MetaForge Knowledge Health
Coverage
Freshness
Confidence
Contradictions
Brain changes: 0
```

| Metric | Asks |
|--------|------|
| **Coverage** | How much of the textbook surface is populated? |
| **Freshness** | Where is knowledge getting old? (next observation frontier) |
| **Confidence** | How solidly do we know it? (replication · event diversity · expert agreement · holdout · contradiction rate) |
| **Contradictions** | Where does evidence conflict? |

The goal is not to know everything.  
**The goal is to know exactly how confident we should be in what we think we know.**

### Operating model (next months / years)

1. **Keep shipping product** — founders teach how to communicate.  
2. **Keep expanding the strategic textbook** — MetaForge stays better informed.  
3. **Keep the Brain frozen** — until reality, not optimism, earns a change.  
4. **Feed reality into the framework** — do not invent a better way to think.

**Observation is continuous.** Friday is the heartbeat (surprise / retired belief / health) — not when learning starts.

```bash
# Learn from tournament data NOW (uses live-cache; add --refresh to pull newest TopDeck window)
npm run observe:tournament-live
npm run observe:tournament-live:refresh
```

Epic 7 (simulation scale) stays deferred until the textbook earns it.  
Knowledge Freshness + Confidence are observation disciplines — not new institutions.

---

## Strategic Hypothesis v0 (next milestone — shipped as research object)

**Internal research object:** `Strategic Hypothesis` — falsifiable, can die, has prediction + retirement criteria.  
**Product voice:** `Strategic Stance` — how MetaForge *says* a hypothesis (“current understanding suggests…”).

```text
Knowledge
  ↓
Strategic Hypotheses
  ↓
Strategic Stance (product presentation)
  ↓
Shadow → Laboratory → Harness → Brain
```

Not opinions. Not preferences. Not Brain behavior.

```bash
npm run observe:tournament-live          # feed reality
npm run report:strategic-hypothesis-v0   # five hypotheses + stances
```

Report: `tests/knowledge/out/strategic-hypothesis-v0.md`  

### Product voice (not a section)

Stance is a **voice**, not a panel titled Strategic Stance.

| Surface | Rule |
|---------|------|
| Request Recognition | Never mention hypotheses — just “I heard you.” |
| Philosophy Selection | Soft coach line: “Current understanding suggests…” |
| Honest Coach | “One thing we’re watching…” |
| Deep Forge | Full research object (evidence · prediction · retirement · retired) |

**90/10 rule:** ~90% grounded observation, ~10% forward-looking.  
Coach speaks from current understanding — never certainty.

```bash
npm run validate:stance-voice
```

### Strategic architecture status

**Knowledge + Hypothesis + Stance voice: feature complete.**  
**Knowledge Era 1 (Strategic Evaluation): COMPLETE** — [`KNOWLEDGE_ERA1_COMPLETE.md`](./KNOWLEDGE_ERA1_COMPLETE.md).  
**Era 2 (gameplay intelligence):** **COMPLETE** — see [`ERA2_COMPLETE.md`](./ERA2_COMPLETE.md). Brain still waits.

No new speculative subsystems. Feed reality; evaluate decisions; don't invent Brain.

---

## Strategic Evaluation v0 (Era 1 — judgment)

Not a simulator. Not Brain. An **evaluator**.

Answers: *Was this strategic decision coherent?*  
Does **not** answer: *What deck should I build?* (that's Builder)  
Does **not** pick cards or change construction.

```text
Decision
  ↓
Pros / Cons / Tradeoff
  ↓
Evidence (tournament · expert · shadow · hypothesis)
  ↓
Confidence
  ↓
Coach voice (never "low score")
```

```bash
npm run validate:strategic-evaluation-v0
npm run report:strategic-evaluation-v0
```

Simulation (later) is a **witness for the Evaluator**, not the judge:

```text
Build → Evaluate → Simulate → Evaluate again → Compare
  → Hypothesis → Laboratory → Harness → Brain
```

### Two eras (locked)

| Era | Name | Status |
|-----|------|--------|
| **1** | Strategic Construction Intelligence | Active — knowledge → hypotheses → stance voice → **evaluation** |
| **2** | Strategic Gameplay Intelligence | Deferred — board states, lines, sequencing, hidden info |

Design question for every new knowledge piece:

> Could this knowledge eventually help evaluate an in-game decision?

---

## Epic map

| Epic | Name | Status | Brain? |
|------|------|--------|--------|
| **1** | Canonical Card Intelligence | ✅ **Shipped (tests + report)** | No |
| **2** | Elite Tournament Intelligence | ✅ **Shipped (tests + report)** | No |
| **3** | Strategic Substitution Intelligence | ✅ **Shipped (tests + report)** | No |
| **4** | Expert Strategy Corpus (Stream 002) | ✅ **Shipped (fixture pipeline + report)** | No |
| **5** | Strategic Knowledge Retriever | ✅ **Shipped (tests + report)** | No |
| **6** | Brain Shadow Evaluation | ✅ **Shipped (read-only + report)** | Read-only compare |
| **7** | Strategic Simulation (scale) | ⏸ **Deferred** until textbook exists | Sandbox only |

Every epic must produce a human-readable report of **new knowledge** — not “added optimization.”

---

## Epic 1 — Canonical Card Intelligence

**Mission:** Every Magic card MetaForge knows should have a complete strategic identity.

### Delivered

| Deliverable | Location |
|-------------|----------|
| Canonical identity (A4 continued) | `app/card-identity.mjs` + `app/knowledge/canonical-card-intelligence.mjs` |
| Knowledge semantic class detector | `app/knowledge/semantic-class-detector.mjs` |
| Semantic coverage audit | `app/knowledge/semantic-coverage-audit.mjs` |
| Human report | `npm run report:knowledge-epic1` → `tests/knowledge/out/epic1-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic1` |

### Invariants

```text
writesToBrain: false
Brain construction modules untouched
Aliases sharing oracleId share gameplay knowledge
Semantic inference does not invent unsupported mechanics
```

### Success metric

MetaForge understands significantly more cards **as inspectable strategic identities** than before Epic 1 — measured by knowledge-class coverage + rich completeness in the Epic 1 report.

### Explicit non-goals

- No Brain weight / package / construction changes  
- No Superfriends construction package (harness-gated later)  
- No netdeck popularity learning  
- No Epic 7 simulation scale yet  

---

## Epic 2 — Elite Tournament Intelligence

**Mission:** Transform elite tournament decks into strategic observations — fingerprints, commander/archetype profiles, Level-A structural contrasts — without netdecking or touching Brain.

### Delivered

| Deliverable | Location |
|-------------|----------|
| Strategic fingerprints + commander profiles | `app/knowledge/elite-tournament-intelligence.mjs` |
| Level-A structural comparison summary | same module (wraps Field Intelligence Level-A) |
| Human report | `npm run report:knowledge-epic2` → `tests/knowledge/out/epic2-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic2` |

### Invariants

```text
writesToBrain: false
Brain construction modules untouched
popular card ≠ correct card
Fingerprints store structure + provenance, never popularity rank as truth
Level-A deltas are associative observations — not Brain rules
```

### Success metric

MetaForge can inspect elite decks as **structural strategy evidence** (plans, ranges, confidence, contradictions) — measured in the Epic 2 report — without copying modal 99s.

### Explicit non-goals

- No modal-99 imitation / popularity learning into construction  
- No Brain recommendation changes  
- No Superfriends construction package  

---

## Epic 3 — Strategic Substitution Intelligence

**Mission:** Learn which cards share a strategic seat, which are near-equivalents, and when coexistence means **do not substitute** — without changing selection behavior.

### Delivered

| Deliverable | Location |
|-------------|----------|
| Seat families + when-not-to-substitute | `app/knowledge/strategic-substitution-intelligence.mjs` |
| Near-equivalent projection (Field Intelligence XOR mining) | same module |
| Human report | `npm run report:knowledge-epic3` → `tests/knowledge/out/epic3-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic3` |

### Invariants

```text
writesToBrain: false
selectionBehaviorChanged: false
Brain construction modules untouched
popular card ≠ correct card
Same seat + high coexistence → complement, not automatic swap
```

### Success metric

MetaForge can explain substitution as **structural seat evidence** (families / near-equivalents / when-not) — measured in the Epic 3 report — without auto-swapping cards.

### Explicit non-goals

- No production auto-substitution  
- No Brain / selection behavior changes  
- No popularity-rank learning  

---

## Epic 4 — Expert Strategy Corpus (Stream 002)

**Mission:** Extract recurring strategic decision concepts from expert-authored explanations — with replication across independent voices — without promoting anything into Brain.

Charter: [`ACADEMY_EVIDENCE_STREAM_002.md`](./ACADEMY_EVIDENCE_STREAM_002.md)

### Delivered

| Deliverable | Location |
|-------------|----------|
| Fixture expert reasoning corpus + extractors | `app/knowledge/expert-strategy-corpus.mjs` |
| Replication (≥2 independent voices) + Archive rejects | same module |
| Human report | `npm run report:knowledge-epic4` → `tests/knowledge/out/epic4-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic4` |

### Invariants

```text
writesToBrain: false
activated: false
promoted: false
Naming is not promotion
Admission may be zero
Completeness is not a goal
```

### Success metric

The falsifiable Stream 002 question is answered honestly on a tiny corpus — candidates and/or zero admission — in an inspectable report. Live scraping is **not** required for Epic 4.

### Explicit non-goals

- No internet scrape for completeness  
- No Brain / Mentor / new institution  
- No promoting candidates because they sound expert  

---

## Epic 5 — Strategic Knowledge Retriever

**Mission:** Make Epics 1–4 queryable as inspectable knowledge — return evidence or explicit unknown, never fake strategic absence.

### Delivered

| Deliverable | Location |
|-------------|----------|
| Retriever (card / commander / seat / concept) | `app/knowledge/strategic-knowledge-retriever.mjs` |
| Human report | `npm run report:knowledge-epic5` → `tests/knowledge/out/epic5-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic5` |

### Invariants

```text
writesToBrain: false
Unknown is not absent
No Brain recommendation API
No inventing answers when evidence is thin
```

### Success metric

Sample queries in the Epic 5 report retrieve real knowledge from prior epics — or honest unknowns.

### Explicit non-goals

- No construction mutation  
- No chat product launch disguised as retrieval  

---

## Epic 6 — Brain Shadow Evaluation

**Mission:** Compare Brain v1 theory to elite/field knowledge observations — read-only. Surface agreements, blind spots, and divergences without promoting anything.

### Delivered

| Deliverable | Location |
|-------------|----------|
| Shadow evaluation module | `app/knowledge/brain-shadow-evaluation.mjs` |
| Human report | `npm run report:knowledge-epic6` → `tests/knowledge/out/epic6-knowledge-report.md` |
| Tests | `npm run validate:knowledge-epic6` |

### Invariants

```text
writesToBrain: false
brainV1RemainsFrozen: true
promoted: false
Shadow findings never auto-change construction
Validation Harness required before any Brain change
```

### Success metric

An inspectable shadow report exists that answers: where Brain v1 and elite/expert evidence agree, diverge, or leave concepts unencoded — with Brain changes still 0.

### Explicit non-goals

- No weight / package / branch edits  
- No “finish Brain v2” from elegance  
- No Epic 7 simulation scale yet  

---

## Order discipline

```text
Epic 1 Card knowledge
  → Epic 2 Elite structure
  → Epic 3 Substitutions
  → Epic 4 Expert reasoning
  → Epic 5 Retriever
  → Epic 6 Shadow-evaluate Brain v1
  → Epic 7 Simulation scale (only with a textbook)
```

---

## Era 2 — Strategic Gameplay Intelligence (**COMPLETE**)

**Status:** complete · sandbox · `writesToBrain: false`  
**Charter:** [`ERA2_COMPLETE.md`](./ERA2_COMPLETE.md) · founding: [`ERA2_FOUNDING.md`](./ERA2_FOUNDING.md)  
**Mission delivered:** Critique in-game decisions under incomplete information; catalog TCG-agnostic concepts; wire evidence + stance voice. Not Monte Carlo. Not Brain.

### Scoreboard

| Layer | Status |
|-------|--------|
| Situational evaluation (14 fixtures) | shipped |
| Founding concepts (4) · emerging | shipped |
| Expert / tournament bridges | shipped (honest `none` where earned) |
| Play-capture bridge | shipped (Info Asymmetry path) |
| Simulation witness (heuristic v0) | shipped · witness ≠ judge |
| Concept Stance Voice (Era 2.1) | shipped |
| Brain inheritance | **none** |

### Commands

```bash
npm run validate:era2-complete
npm run report:era2-complete
```

```text
Era 1 → Strategic Evaluation  ──cites──┐
Era 2 → Strategic Concepts ←────────────┘  [COMPLETE]
Brain inherits principles — not fixtures. Not yet. Not this era.
```

### Still later eras

Live scrape · live play telemetry · Monte Carlo / full rules engine · Brain inheritance.

> Simulation without understanding can reinforce bad assumptions.  
> Freeze invention. Do not freeze observation.  
> Better informed — not smarter.  
> Remember what we stopped believing. Know how confident we are.  
> **Intellectual framework locked.** Feed reality in.
