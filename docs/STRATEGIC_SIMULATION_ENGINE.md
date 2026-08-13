# Strategic Simulation Laboratory (Sim-Lab)

**Status:** isolated research sandbox (not Brain · not construction)  
**Date:** 2026-08-10  
**Constitution:** [Intelligence Constitution](INTELLIGENCE_CONSTITUTION.md)  
**Code:** `app/sim-lab/` · `tests/sim-lab/`  
**Supersedes naming:** “Strategic Simulation Engine” → **Sim-Lab** (sandbox first)

---

## The subtle difference

Do **not** build another Brain subsystem.

Build the sandbox where the Brain will *eventually* learn to think — still years (and a full promotion ladder) away from production.

```
Academy
    │
    ▼
Strategic Principle
    │
    ▼
Simulation Laboratory   ← you are here
    │
    ▼
Can this principle actually improve planning?
    │
    ▼
Validation Harness
    │
    ▼
Maybe someday…
    ▼
Brain
```

The Brain never sees Sim-Lab until evidence earns promotion.

---

## Simulation honesty (binding)

Sim-Lab is **another evidence stream**, not an oracle.

- Tournament structure, expert reasoning, and simulation each have blind spots.  
- Agreement raises confidence. Disagreement is often the discovery.  
- **Simulation without understanding can reinforce bad assumptions** — scale does not repair a wrong model of why a strategy works.  
- Knowledge foundation (card semantics, elite fingerprints, Level-A, expert provenance) precedes million-game ambition. See [Strategic Cognition](STRATEGIC_COGNITION.md) — Strategic research platform.

Hard invariant for every Sim-Lab artifact:

```
writesToBrain: false
constructionMutated: false
```

---

## What Sim-Lab is

An isolated **“What if?”** reasoning sandbox.

- Not Monte Carlo playtesting  
- Not card ranking  
- Not construction scoring  
- Not package optimization  

It plays:

```
Current deck
  → remove / add one node
  → which pathways appear / disappear?
  → which plans become fragile / inevitable?
  → Simulation Report (reasoning only)
```

Notice: **no construction score. no card ranking. just reasoning.**

---

## What Sim-Lab is not

| Forbidden | Why |
|---|---|
| Import into `native-masterwork-engine` / construction paths | Brain freeze |
| Silent weight / threshold changes | Constitution |
| Popularity learning | Counts cards, not plans |
| Multi-variable Brain sprints | Laboratory = one idea |
| Shipping “Sim-Lab scores” as Forge UX ranking | Sandbox only |
| Treating simulation as ground truth over tournament/expert evidence | Simulation honesty |

---

## Everything becomes a graph

Not cards. Not packages. **Plans.**

Long-term plan-graph surfaces (research objects):

- Plan A / Plan B  
- Emergency plan  
- Recovery tree  
- Failure tree  
- Pressure graph  
- Dependency graph  
- Protection map  
- Inevitability curve  

Cards merely instantiate those graphs.

### What-if example

```
Protection removed
  → combo now fragile
  → recovery branch required
  → pressure delayed
  → inevitability worsens
```

That is reasoning — not a recommendation score.

### Product shape (future coaching, not yet Brain)

Instead of “Add Teferi's Protection”:

> Without this, recovery is weak.  
> With this, Plan A survives two additional disruption classes.  
> Three cards could fill that seat — here’s why.

---

## Experiment queue (one at a time)

| ID | Question | Status |
|---|---|---|
| **Sim-Lab-001** | Does **topology** explain recovery better than **interaction count**? | Active sandbox experiment |
| Sim-Lab-002 | Opponent counters X — now what? | Deferred |
| Sim-Lab-003 | Opponent removes commander — now what? | Deferred |
| Sim-Lab-004 | You're behind — what's the comeback line? | Deferred |
| Sim-Lab-005 | What is the shortest path to inevitability? | Deferred |

### Sim-Lab-001 protocol

Take elite / fixture decks. For each, structurally delete:

- commander  
- engine  
- payoff / close  
- tutor  
- protection  

Measure (reasoning metrics, not Brain scores):

- Recovery Distance  
- Recovery Cost  
- Recovery Probability  
- Recovery Branch Count  

Compare predictors:

1. Topology-shaped features (plan-connected ratio, meaningful edge density, isolation, protection coverage)  
2. Raw interaction count / density  

**No Brain changes. Only learning.**

---

## Module map

| Module | Job |
|---|---|
| `app/sim-lab/schema.mjs` | Plan graph + simulation report shapes; `writesToBrain: false` |
| `app/sim-lab/plan-graph.mjs` | Build plan graph from FI strategic topology (read-only) |
| `app/sim-lab/what-if.mjs` | Node removal / pathway collapse reasoning |
| `app/sim-lab/recovery.mjs` | Recovery distance / cost / probability / branches |
| `app/sim-lab/experiments/sim-lab-001.mjs` | Topology vs interaction-count recovery experiment |
| `tests/sim-lab/` | Isolated regressions + runner |

Sim-Lab may **read** Field Intelligence topology. It must not write Brain policy.

---

## Success metric

Not “the Forge recommends better cards.”

>

> Sim-Lab can explain which plan dies when a node is removed — and whether topology predicts recovery better than counting interaction.

When that explanation is boringly reliable across live cohorts, *then* a Laboratory → Harness promotion discussion becomes thinkable.

Until then: **Brain changes: 0.**

---

## North star

Winning decks aren't collections of good cards.

They're collections of interacting plans.

Sim-Lab is where that Academy insight becomes **executable “what if?” reasoning** — safely isolated, Constitution-bound, Brain frozen.
