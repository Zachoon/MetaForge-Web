# Rejected Experiments

Institutional memory for Brain experiments that were evidence-gated, tested, and **not** promoted into default construction.

A rejection is not a failure of process. It is successful learning: future contributors should not rediscover the same dead end by turning similar knobs.

Rules:

1. Brain v1 remains the default control until a later experiment clears the promotion gate.
2. Rejected experiment code may remain in-repo as **opt-in** research (`input.brainPolicy = …`) so A/B history stays reproducible.
3. Do **not** re-open a rejected coefficient change without new Level-A / held-out evidence that addresses the rejection reason.
4. Prefer new **representations** over retuning weights when the rejection says “wrong level.”

---

## Exp001 — Interaction Structure (coefficients)

| Field | Value |
|---|---|
| ID | `brain_v2_exp001_interaction` |
| Date | 2026-08-10 |
| Status | **rejected** for promotion |
| Control | `brain_v1_control` (frozen Brain v1) |
| Code remains | Yes — opt-in only; default unchanged |

### Why it was tried

Field Intelligence v1.2 produced the first evidence-gated Brain v2 candidate:

- Hypothesis: `psh:kraum, ludevic's opus / tymna the weaver:interaction`
- Feature: **`interactionDensity`** (producer↔payoff graph edges)
- Replication: two Level-A events, same commander
- Brain classification: `brain_underweights`
- Priority: high

North-star question at the time: does Brain v1 undervalue interaction enough to justify a construction experiment?

### What we changed (smallest general coefficient intervention)

Behind `brainPolicy = brain_v2_exp001_interaction` only:

- Stronger live partner-present wiring weights/caps
- Multifunction + mana-efficient connected bonuses
- Higher live synergy multiplier in fill
- Power-tier gate so Casual / Focused did **not** inherit cEDH density

We explicitly did **not** raise role:interaction floors globally (`interactionScore += X` was rejected as a design).

### What the evidence actually said (decomposition)

| Observation | Implication |
|---|---|
| Role / stack / removal deltas were **tiny** | Not “add more removal/counters” |
| Density rose while interaction **count** stayed flat or fell | Wiring / structure, not quantity |
| Cross-commander transfer was **mixed** | Shape of good interaction is strategy-dependent |
| Casual lists under Exp001 were **identical** to control | Power-tier isolation worked |

### A/B result (104-forge field vs frozen Brain v1)

| Metric | Control | Exp001 | Gate |
|---|---|---|---|
| Pass rate | 100% | 100% | pass |
| Hard failures | 0 | 0 | pass |
| Avoidable weak / forge | 0.154 | 0.154 | pass |
| Beneficial emergence / forge | 11.24 | **10.923** | **fail** |
| Later package oversupply / forge | 2.481 | **2.731** | **fail** |
| Runtime | ~2155 ms | ~2209 ms (~+2.5%) | acceptable |
| Casual identity under Exp001 | — | identical | pass |

Control matched the frozen benchmark with **zero** baseline regressions. Exp001 did not.

### Rejection reason

**Wrong level of intervention.**

We tuned coefficients on an existing interaction-count / live-synergy surface. The corpus signal lived one abstraction deeper: **interaction topology** (where interaction sits in the strategic network), not a higher weight on “interaction.”

Promotion gate failed on frozen-benchmark quality (emergence down, later package oversupply up). Held-out torture proxies did not show a clear interaction-density win outside the evidence that inspired the trial.

### Do not retry as

- `interactionScore += X`
- Higher interaction role floors for all decks
- “More counters / more removal” priors from cEDH transferred to Casual
- Another coefficient-only Exp00N without a new representation

### Retry only if

New evidence supports a **representational** change (interaction topology / relationship graph), with:

- controlled Level-A support
- replication or strong transfer
- held-out validation outside the train cohort
- no Casual bleed
- Validation Harness promotion gate green

See: `docs/INTERACTION_TOPOLOGY_RESEARCH.md`  
See: `docs/BRAIN_V2_EXP001_INTERACTION.md`
