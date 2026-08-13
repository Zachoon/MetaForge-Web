# Academy Paper — Interaction Count Doesn't Win

**Subtitle:** It Merely Reveals Strategic Coverage  
**Status:** observation / Proxy Decomposition · causal discovery  
**Corpus:** live Academy cohort · Synthetic fixtures **NOT USED**  
**Brain changes:** 0 · **Sim-Lab-002:** not run · **Harness:** not requested  
**Next Academy sprint:** [Strategic Coverage Project](../../docs/STRATEGIC_COVERAGE.md)

---

## Abstract

Sim-Lab-001 rejected the hypothesis that our *current* topology abstraction explains structural recovery better than interaction count. Fixtures were negative; live elite evidence did not flip that result.

Proxy Decomposition then asked why interaction count still predicts recovery. The residual table does not say “quantity wins.” It says interaction count is a **cheap observable proxy** for something deeper:

> **Strategic Coverage** — breadth of distinct strategic jobs, interchangeable seats, and multifunction flexibility.

So the honest title is not “why interaction count still wins.”  
It is: **interaction count doesn't win — it merely reveals coverage.**

## Provenance

- Decks analyzed: **283**
- Events: **35**
- Corpus mode: **live**
- Interaction count ↔ recovery: **0.2955**
- Primary hypothesis label: **latent_lead:multifunctionCount**
- Named discovery: **Strategic Coverage** (Academy concept — not a Brain feature)

## Causal discovery

```
Old hope:     Topology            → Recovery
Observed:     InteractionCount    → Recovery
Suspect:      InteractionCount    → (latent) → Recovery
Academy name: InteractionCount    → Strategic Coverage → Recovery
```

## What Sim-Lab-001 actually taught

| Claim | Status |
|---|---|
| Topology is useless | **Not proven** |
| Current topology model is not predictive enough | **Supported** |
| Interaction count is the true strategic primitive | **Not supported** — it is likely a proxy |
| Residuals cluster on optionality / coverage / multifunction | **Supported** |
| Therefore promote anything into Brain | **Forbidden / not requested** |

Archive: `docs/archive/SIM_LAB_001_REJECTION.md`

## Method — Proxy Decomposition

For each live deck, measure structural recovery (Sim-Lab seat deletions) and a bank of candidate explanatory variables. Rank by:

1. Correlation with recovery
2. Correlation with interaction count (is it entangled?)
3. Partial correlation with recovery **given** interaction count (does signal survive?)

## Ranked candidates (top 15)

| Variable | r(recovery) | r(ix count) | partial r(rec\|ix) | partial r(ix\|var) | proxyScore |
|---|---:|---:|---:|---:|---:|
| multifunctionCount | 0.5148 | 0.4552 | 0.4471 | 0.0801 | 0.4796 |
| recoverySeatCount | 0.5161 | 0.3898 | 0.4557 | 0.1196 | 0.4664 |
| disruptionSeatCount | -0.1732 | 0.7676 | -0.6533 | 0.6787 | 0.4658 |
| uniqueRoleCount | 0.5176 | 0.3653 | 0.4606 | 0.1336 | 0.4624 |
| nodeCount | 0.255 | 0.9925 | -0.3278 | 0.3588 | 0.4612 |
| interactionRedundancy | -0.1688 | 0.7603 | -0.6341 | 0.662 | 0.4563 |
| roleEntropy | 0.5765 | 0.0411 | 0.5912 | 0.3329 | 0.4471 |
| lowCmcInteractionCoverage | -0.4741 | 0.1078 | -0.5327 | 0.396 | 0.4001 |
| interactionCount | 0.2955 | 1 | null | null | 0.383 |
| interactiveDenom | 0.2955 | 1 | null | null | 0.383 |
| meaningfulEdgeDensity | -0.2541 | -0.8402 | -0.0112 | 0.1564 | 0.3278 |
| multifunctionRatio | 0.3983 | 0.0041 | 0.4157 | 0.3204 | 0.305 |
| planConnectedCount | 0.2149 | 0.7407 | -0.0062 | 0.2078 | 0.2837 |
| meanStrategicDegree | 0.2319 | 0.2876 | 0.1606 | 0.2456 | 0.2244 |
| winSequenceProtectionCoverage | 0.2771 | -0.0218 | 0.2969 | 0.3139 | 0.2192 |

## The residual cluster screams one concept

Top residuals that survive conditioning on interaction count:

| Variable | Read |
|---|---|
| **roleEntropy** | How many different strategic jobs the deck can accomplish |
| **uniqueRoleCount** | Capability breadth |
| **recoverySeatCount** | Interchangeable answer seats |
| **multifunctionCount** / **multifunctionRatio** | Cards that solve multiple problems — flexibility |

These measure **strategic optionality / coverage**, not interaction quantity and not the current topology composite.

## Latent leads (raw)

- **multifunctionCount** — r(rec)=0.5148, partial(rec|ix)=0.4471, r(ix)=0.4552
- **recoverySeatCount** — r(rec)=0.5161, partial(rec|ix)=0.4557, r(ix)=0.3898
- **uniqueRoleCount** — r(rec)=0.5176, partial(rec|ix)=0.4606, r(ix)=0.3653
- **roleEntropy** — r(rec)=0.5765, partial(rec|ix)=0.5912, r(ix)=0.0411
- **multifunctionRatio** — r(rec)=0.3983, partial(rec|ix)=0.4157, r(ix)=0.0041
- **meanStrategicDegree** — r(rec)=0.2319, partial(rec|ix)=0.1606, r(ix)=0.2876
- **winSequenceProtectionCoverage** — r(rec)=0.2771, partial(rec|ix)=0.2969, r(ix)=-0.0218

## Pure proxies of interaction count

- **interactiveDenom** — r(rec)=0.2955, r(ix)=1, partial(rec|ix)=null
- **planConnectedCount** — r(rec)=0.2149, r(ix)=0.7407, partial(rec|ix)=-0.0062
- **planConnectedRatio** — r(rec)=0.1541, r(ix)=0.3845, partial(rec|ix)=0.0459

## Current topology slice

- **meaningfulEdgeDensity**: r(rec)=-0.2541, r(ix)=-0.8402, partial(rec|ix)=-0.0112
- **meanStrategicDegree**: r(rec)=0.2319, r(ix)=0.2876, partial(rec|ix)=0.1606
- **planConnectedRatio**: r(rec)=0.1541, r(ix)=0.3845, partial(rec|ix)=0.0459
- **isolatedRatio**: r(rec)=-0.0771, r(ix)=-0.3588, partial(rec|ix)=0.0324

Topology is not wrong — it is **incomplete**. Stop adding edges until the graph can represent strategic seats.

## Open questions

- Is interaction count encoding answer optionality / redundancy rather than 'more interaction'?
- Which latent lead survives Level-A same-commander deltas?
- Can a new representation beat interaction count without collapsing back into quantity?
- What is the smallest set of strategic capabilities that predicts elite resilience? (Strategic Coverage Project)

## Recommendation

- promoteToBrain: **false**
- runSimLab002: **false**
- next: **Strategic Coverage Project** (Academy observation) — coverage candidates compete; then a Laboratory trial with a **new representation**, not another topology composite.

## North star

Don't ask whether topology is “better” until we know **what interaction count is actually counting.**

Proxy Decomposition’s answer, for now:

> It is counting (poorly) **Strategic Coverage**.

Brain changes: **0**.

Former title retained as alias: `ACADEMY_WHY_INTERACTION_COUNT_STILL_WINS.md`