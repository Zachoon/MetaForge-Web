# Era 2 Founding — Complete

**Status:** founding complete · sandbox · `writesToBrain: false`  
**Date:** 2026-08-11  
**Parent:** [Strategic Cognition](./STRATEGIC_COGNITION.md) · [Knowledge Expansion Program](./KNOWLEDGE_EXPANSION_PROGRAM.md)

---

## What Era 2 founding is

Era 2 is not a combat engine. It is the start of cataloging **strategy itself**.

```text
Era 1 → Strategic Evaluation (was this list decision coherent?)
Era 2 → Strategic Concepts (what principle did this teach?)
Brain inherits principles later — never fixtures.
```

## Founding set (locked)

| Concept | Role |
|---------|------|
| **Commitment Timing** | Spend a limited resource now vs later |
| **Seat Pressure** | Who absorbs pressure *now* |
| **Plan Integrity** | Protect vs dilute the primary line |
| **Information Asymmetry** | Act under hidden / revealed information |

Implementations (e.g. Permission Timing) are **game-facing**, not the concept.

## Shipped machinery

| Layer | Location |
|-------|----------|
| Game-state + situational evaluation | `app/gameplay/*` |
| Concept library | `app/knowledge/strategic-concept.mjs` |
| Expert bridge | `app/knowledge/concept-expert-evidence.mjs` |
| Tournament-structure bridge | `app/knowledge/concept-tournament-evidence.mjs` |
| Era 1 concept citation | `app/strategic-evaluation.mjs` |
| Fixtures (founding + nuance) | `app/gameplay/fixtures/situational-v0.mjs` |

## Hard rules (Era 2)

1. Every fixture must **introduce / strengthen / contradict** a concept — or do not build it.  
2. Confidence jumps prefer **expert / tournament** evidence — not fixture spam.  
3. Unknown ≠ absent. Honest non-evidence is recorded (e.g. Information Asymmetry tournament = none).  
4. Naming ≠ promotion. Brain stays frozen.

## Explicitly deferred (post-founding → completed in Era 2 closeout)

- ~~Play-data path for Information Asymmetry~~ → `concept-play-evidence.mjs`  
- ~~Simulation witness~~ → `simulation-witness.mjs`  
- ~~Gameplay Stance product voice~~ → Era 2.1 `concept-stance-voice.mjs`  

Still later eras: live scrape · live telemetry · Monte Carlo / full rules engine · Brain inheritance.

**Era 2 Complete charter:** [`ERA2_COMPLETE.md`](./ERA2_COMPLETE.md)

Concepts enter product the same way hypotheses did: as a **voice**, not a section.

| Surface | Field |
|---------|--------|
| Philosophy / pre-choice | `principleUnderstanding` |
| Honest Coach | `principleVoice` |
| Deep Forge | `deepForgePrinciples` |
| Request Recognition | **never** includes concepts |

```bash
npm run validate:concept-stance-voice
```

Module: `app/concept-stance-voice.mjs`

## How to report

```bash
npm run report:era2-founding
npm run validate:era2-founding
```

## Success look for Friday

```text
Era 2 Founding Complete
Concepts: 4
Emerging: (earned)
Experts: high where 3 voices
Tournament: medium / low / none (honest)
Brain: 0
```

> Freeze invention. Do not freeze observation.  
> We're no longer only cataloging cards or fixtures — we're cataloging strategy.
