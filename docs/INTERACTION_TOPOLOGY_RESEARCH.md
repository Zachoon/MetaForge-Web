# Interaction Topology Research

**Status:** research agenda — observation / collection only  
**Implemented surfaces:** Field Intelligence v1.3 (`docs/FIELD_INTELLIGENCE_V1_3.md`)  
**Not:** a Brain v2 construction experiment  
**Not:** coefficient tuning

Brain v1 remains frozen. Exp001 (`brain_v2_exp001_interaction`) was rejected for promotion because it attacked the wrong level (see `REJECTED_EXPERIMENTS.md`).

---

## North star

Stop asking:

> Does this deck have N interaction?

Start asking:

> Which interaction protects which engines?  
> Which interaction bridges which sequences?  
> Which interaction doubles as combo protection?  
> Which interaction advances this plan?

That is a **graph / relationship** problem — interaction architecture — not a scoring problem.

---

## Why this agenda exists

From live Level-A forensics + Exp001:

1. **Replicated signal was `interactionDensity` (wiring), not interaction count.**
2. **Role / stack / removal deltas were tiny** — eliminates “add more removal/counters.”
3. **Cross-commander transfer was mixed** — good interaction shape is strategy-dependent.
4. **Coefficient boosts failed the frozen harness** — wrong abstraction, not “try a bigger multiplier.”
5. **Casual isolation worked** — any future topology work must keep power-tier intent.

---

## FI v1.3 implemented (static topology)

Observation-only modules now emit:

- Per-deck strategic topology edges (`protects_*`, `enables`, `clears_path_for`, …)
- Topology metrics beyond `interactionDensity`
- Level-A topology comparisons (same commander + same event)
- Structural sequence evidence (not play order)
- Contextual card functions and substitution evidence
- Discovery-queue candidates with **no write path into Brain**
- Append-only JSONL research store for longitudinal evidence

**Deferred:** dynamic pressure topology (what becomes critical once X exists). See `FIELD_INTELLIGENCE_V1_3.md`.

---

## Research questions (relationships, not scores)

Collect evidence for labels such as:

| Topology role | Question |
|---|---|
| Combo protection | Which interaction pieces protect a win sequence? |
| Engine protection | Which interaction keeps a value engine online? |
| Tempo | Which interaction creates or steals tempo? |
| Breathing room | Which interaction buys a turn against pressure? |
| Recursive | Which interaction recurs or resets itself? |
| Proactive vs defensive | Does it advance our plan or only answer theirs? |
| Multifunction | Does it also draw, tutor, ramp, or enable a package? |
| Sequence bridge | Does it connect setup → stabilize → convert → close? |
| Dead in common states | When is this interaction inert in real game trees? |

Do **not** collapse these into a single numeric `interactionScore` until evidence forces a construction change.

---

## Collection protocol (no construction mutation)

Every Field Intelligence / live corpus run should accumulate, without teaching Brain:

1. Level-A cohort forensics (same commander + same event)
2. Interaction composition decomps (stack / removal / protection / silence / flexible / …)
3. Interaction graph snapshots (producer↔payoff edges, orphans, unsupported anchors)
4. Strategic topology + Level-A topology metrics (v1.3)
5. Repeated-converter vs participant structural deltas
6. Cross-commander transfer results (support / contradict / mixed) — never automatic
7. Power-tier tags when known
8. Explicit train vs held-out partitions so future experiments do not contaminate validation

Preferred artifact direction: a growing **interaction topology research dataset** keyed by event, commander identity, performance class, and graph features — not card frequency tables.

Anti-netdeck still applies: cards explain structure; popularity is never a construction recommendation.

---

## What this is not

- Brain Sprint 2 from intuition
- Exp002 coefficient retune of Exp001
- Automatic package-catalog expansion from frequency
- Commander-specific `if (commander === …)` construction branches

---

## When construction may resume

Only after repeated topology evidence earns a **new representation** (or a narrowly scoped use of an existing one), then:

1. Opt-in experimental policy (Exp00N)
2. A/B vs frozen Brain v1
3. Held-out validation outside the inspiring cohorts
4. Power-tier isolation check
5. Human promotion decision (`promote_candidate` / `needs_more_evidence` / `reject`)
6. Validation Harness report

Until then: **collect, decompose, refuse to promote vibes.**

---

## Related

- `docs/FIELD_INTELLIGENCE_V1_3.md` — v1.3 charter
- `docs/REJECTED_EXPERIMENTS.md` — Exp001
- `docs/BRAIN_V2_EXP001_INTERACTION.md` — experiment detail
- `docs/FIELD_INTELLIGENCE_V1.md` — Level-A forensics pipeline
- `docs/BRAIN_V1_ENGINEERING_RELEASE.md` — freeze / harness culture
- `docs/ENGINEERING_PRINCIPLES.md` — evidence-first culture
