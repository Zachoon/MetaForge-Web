# Brain v2 Experiment 001 — Interaction Structure

**Status:** **REJECTED for promotion** (opt-in research code retained)  
**Control:** `brain_v1_control` (frozen Brain v1)  
**Experiment:** `brain_v2_exp001_interaction`

Canonical rejection record: [`REJECTED_EXPERIMENTS.md`](./REJECTED_EXPERIMENTS.md)  
Next research agenda (no construction): [`INTERACTION_TOPOLOGY_RESEARCH.md`](./INTERACTION_TOPOLOGY_RESEARCH.md)

> Exp001 failed honestly at the **wrong abstraction level** (coefficients).  
> Do not promote. Do not retry as `interactionScore += X`.

## Evidence that earned this experiment

Live Field Intelligence v1.2 produced one replicated Level-A hypothesis:

| Field | Value |
|---|---|
| Hypothesis | `psh:kraum, ludevic's opus / tymna the weaver:interaction` |
| Feature | `interactionDensity` (producer↔payoff graph edges) |
| Direction | high_greater |
| Events | `4-onslaught-invasion-2026-event-series`, `tq1-sweater-series-nr2` |
| Weighted effect | 26 |
| Confidence | 0.9 |
| Brain class | `brain_underweights` |

Decomposition: converters were **not** simply higher on `interactionCount`. Density rose while raw interaction count stayed flat or fell in the supporting events → **wiring / structure**, not removal spam.

Cross-commander transfer: **mixed**. Do not assume universal cEDH transfer.

## Underweight location (Brain v1)

Prefer fixing wiring reward, not `interactionScore += X`:

- `prospective-slot-delta.mjs` — `interaction_present` partners ×4 (cap 16) is soft vs package cores (26/22)
- `chooseSpells` live fill — `inDeckSynergy * 1.5` under-rewards denser live graphs
- Role floors / `interactionQualityFor` left unchanged (evidence was not “more spot removal”)

## Experimental change

Opt-in via `input.brainPolicy = "brain_v2_exp001_interaction"`:

- Higher live partner-present weight/cap
- Multifunction + mana-efficient connected bonuses
- Higher live synergy multiplier in fill
- **Power-tier gate:** Casual / Focused inherit Brain v1 wiring (no cEDH density bleed)
- Role interaction floor unchanged

## Commands

```powershell
npm run validate:brain-v2-exp001
npm run report:brain-v2-exp001
npm run report:brain-v2-exp001:field
```

## Promotion

Never automatic. Classify `promote_candidate` / `needs_more_evidence` / `reject` from the A/B report and bring results back for human decision.

## Field A/B result (104-forge, 2026-08-10)

| Gate | Control (Brain v1) | Exp001 |
|---|---|---|
| Pass rate | 100% | 100% |
| Hard failures | 0 | 0 |
| Avoidable weak / forge | 0.154 | 0.154 |
| Beneficial emergence / forge | **11.24** | **10.923** (regressed) |
| Later package oversupply / forge | **2.481** | **2.731** (regressed) |
| Runtime mean | 2155 ms | 2209 ms (~+2.5%) |
| Casual list identity under Exp001 | — | identical (gate held) |

**Verdict: `reject`** for promotion of these coefficients.

Control matched the frozen Brain v1 benchmark with **zero** baseline regressions. Exp001 remains opt-in research code only — do not merge into default construction.
