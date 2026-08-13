# Academy Project — Strategic Coverage

**Institution:** Academy only  
**Vocabulary:** [Atlas](ATLAS.md)  
**Status:** open observation · **not** Laboratory · **not** Brain  
**Origin:** Proxy Decomposition → [Interaction Count Doesn't Win](../tests/field-intelligence/ACADEMY_INTERACTION_COUNT_DOESNT_WIN.md)  
**Date:** 2026-08-11  

---

## One question (strict)

> **Which strategic capabilities remain predictive after controlling for commander, archetype, and interaction count?**

Secondary (parsimony only after the controls):

> Among those survivors, what is the **smallest** set that still predicts elite resilience?

No Brain. No Sim-Lab-002. No coefficient trial. No harness request.

Just observation: let candidate coverage measures compete on live elite evidence **under those controls**.

### Why the controls exist

Without them, “coverage” can become another proxy for “good decks have lots of good cards.”

If a capability still predicts outcomes after commander, archetype, and interaction count are held fixed, it is much closer to something fundamental.

---

## Causal discovery (handed by Proxy Decomposition)

```
Old hope:     Topology            → Recovery
Observed:     InteractionCount    → Recovery
Suspect:      InteractionCount    → (latent) → Recovery
Academy name: InteractionCount    → Strategic Coverage → Recovery
```

Interaction count still correlates with structural recovery. Residual analysis says the signal that **survives** conditioning on interaction count is not quantity and not the current topology composite — it is breadth / optionality / multifunction / interchangeable seats.

We name that cluster (Atlas term):

> **Strategic Coverage** — whether distinct strategic capabilities / seats remain present and substitutable when pieces are removed.

Coverage is MetaForge-native: it emerged from residual competition, not from importing a Magic or graph-theory slogan.

---

## What Coverage is not

| Not this | Because |
|---|---|
| Interaction count | Cheap observable proxy; collapses into coverage under partialling |
| Current topology density / edge composites | Incomplete; throws away seat optionality and role breadth |
| “More removal / more counters” | Quantity of one job ≠ coverage across jobs |
| A single scalar “coverage score” | Coverage is multidimensional (see below) |
| A Brain promotion candidate | Discovery is not validation |

---

## Coverage is multidimensional

Do **not** collapse coverage into one number in the next Academy pass.

Draft dimensions (Atlas):

| Dimension | Rough question |
|---|---|
| Defensive | Survive disruption |
| Offensive | Convert toward a win |
| Recovery | Rebuild after interruption |
| Flexibility | Pivot when the original plan fails |
| Information | Tutors, selection, digging, reconnaissance |
| Resource | Mana, cards, recursion, efficiency |

Profiles beat scalars: strong in three dimensions and weak in one is a finding, not a bug.

---

## Working ontology — Capability → Seat → Coverage

Hierarchy (Atlas; still no Brain arrow):

```
Capability
    ↓
Seat
    ↓
Coverage          (multidimensional — never one scalar)
    ↓
Plan
    ↓
Principle
```

Cards **implement** capabilities (Atlas equivalence). Seats are occupied by those implementations.

```
Seat: Commander Protection
Filled by: Greaves | Flawless Maneuver | Skrelv | Dauntless Escort | …
```

A card is a **bundle of capabilities**, not a single label:

```
Force of Will → Stack Protection · Emergency Interaction · Multifunction Seat
Silence       → Path Protection · Combo Protection · Initiative Conversion
```

(Illustrative bindings — not definitive. See Atlas equivalence.)

The research question becomes:

> Am I missing Stack Protection, or is that seat already covered?

The sentence to protect:

> Seat vacated. Can another holder assume that role?

---

## Candidate measures (already in the residual table)

Let these compete as **coverage hypotheses**, not as Brain features:

| Candidate | Intuition |
|---|---|
| `roleEntropy` | Diversity of strategic jobs present |
| `uniqueRoleCount` | Breadth of capability types |
| `recoverySeatCount` | Interchangeable answer seats |
| `multifunctionCount` / `multifunctionRatio` | Cards that occupy multiple seats |
| Strategic redundancy | Same seat filled more than once |
| Optionality / pivot depth | Alternate paths when a seat fails |
| Win-sequence protection coverage | Close-plan integrity under disruption |
| Per-dimension coverage vectors | Defensive / offensive / recovery / … |

### Competition rules (Academy)

1. Predict structural recovery (or Level-A outcome deltas) on live elite corpus  
2. **Control for commander** (Level-A same-commander cohorts preferred)  
3. **Control for archetype / family** (transfer, not pocket wins alone)  
4. **Control for interaction count** — residual must survive partialling  
5. Prefer multidimensional profiles over a single coverage scalar  
6. Prefer the **smallest** surviving set (parsimony after controls)

Winner is a **named principle draft**, still `writesToBrain: false`.

---

## Capabilities above plans

Research stack (still no Brain arrow):

```
Cards → Packages → Plans → Principles → Capabilities
```

Plans are local sequences:

```
Protect → Tutor → Win
```

Capabilities are transferable:

```
Recover · Protect · Pivot · Pressure · Convert · Delay · Close
```

Coverage asks whether those capabilities are **present and substitutable** — the level where genuine strategic transfer becomes thinkable.

---

## Explicit non-goals (this sprint)

- Running Mentor production explanations  
- Immediately operationalizing coverage into construction  
- Sim-Lab-002 / another topology composite  
- Brain coefficient or floor changes  
- Validation Harness runs for construction  
- Commander-specific production branches  
- A single “coverageScore” feature  

### Observation 001 status

Paper: `tests/field-intelligence/ACADEMY_WHAT_IS_STRATEGIC_COVERAGE.md`  
Runner: `npm run report:academy:coverage-001`  
Tests: `npm run validate:academy:coverage-001`

**Result (live, 283 decks / 35 events):** capability *labels* **not admitted** to Atlas — Level-A same-commander contrasts reverse several global residual associations. Residual signals still exist after interaction-count controls (`roleEntropy`, seat redundancy measures, multifunction*), but they have **not** earned Capability vocabulary yet.

Verdict: `PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION`  
Next Academy question: why global recovery correlations reverse under Level-A.  
Laboratory: not authorized. Brain waits.
## Retry into Laboratory only if

A **new representation** of coverage / seats is specified, survives Academy competition under the controls above, and is then tested as **one** Laboratory idea — not a bundle of residuals promoted by enthusiasm.

---

## Institutional posture

| Knob | Value |
|---|---|
| `writesToBrain` | `false` |
| `promoteToBrain` | `false` |
| `runSimLab002` | `false` |
| Harness | not requested |
| Archive | lineage from Sim-Lab-001 rejection + this project |
| Atlas | vocabulary for Coverage / Seat / Capability |

Cultural sentence:

> Sit with the mystery. Representation before experiment. Experiment before Brain.

---

## Artifacts

- Paper: `tests/field-intelligence/ACADEMY_INTERACTION_COUNT_DOESNT_WIN.md`  
- Decomposition JSON: `tests/sim-lab/proxy-decomposition-live.json`  
- Prior rejection: `docs/archive/SIM_LAB_001_REJECTION.md`  
- Vocabulary: [Atlas](ATLAS.md)  
- Constitution: [Intelligence Constitution](INTELLIGENCE_CONSTITUTION.md)  
