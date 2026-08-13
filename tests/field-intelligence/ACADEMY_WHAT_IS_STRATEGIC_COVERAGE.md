# Academy Paper — What Is Strategic Coverage?

**Status:** Academy Coverage Observation 001 · Age of Vocabulary  
**Corpus:** live Academy cohort · Synthetic fixtures **NOT USED**  
**Brain changes:** 0 · **Laboratory:** not authorized · **Mentor production:** off  
**Primary verdict:** `PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION`

---

## Research question

> Which strategic capabilities remain predictive of elite resilience after controlling for commander, archetype, and interaction count?

We are **not** trying to prove Strategic Coverage correct. We are testing whether capability / seat / coverage language survives controlled live evidence.

## Provenance

- Decks: **283**
- Events: **35**
- Corpus mode: **live**
- Synthetic fixtures: **NOT_USED**
- Level-A residual contrast variables computed: **11**

## Institutional constraints (honored)

- `brainV1Frozen`: **true**
- `brainV2Implementation`: **false**
- `simLab002`: **false**
- `constructionPolicyChanges`: **false**
- `coverageScore`: **false**
- `mentorProductionExplanations`: **false**
- `writesToBrain`: **false**
- `namingIsNotPromotion`: **true**
- `eleganceIsNotEvidence`: **true**

## Candidate capability vocabulary tested

| ID | Label | Family | Ambiguity |
|---|---|---|---|
| cap:commander_protection | Commander Protection | protection | open |
| cap:engine_protection | Engine Protection | protection | open |
| cap:close_protection | Closing Sequence Protection | protection | open |
| cap:plan_recovery | Plan Recovery | recovery | open |
| cap:resource_recovery | Resource Recovery | recovery | high |
| cap:path_clearing | Path Clearing | disruption | open |
| cap:plan_disruption | Plan-Preserving Disruption | disruption | open |
| cap:selection_access | Selection / Access | information | open |
| cap:strategic_flexibility | Strategic Flexibility | flexibility | high — must survive quality/ix controls |

## Candidate seats tested

- **Protect Commander** (`seat:protect_commander`) → cap:commander_protection
- **Protect Engine** (`seat:protect_engine`) → cap:engine_protection
- **Protect Closing Sequence** (`seat:protect_close`) → cap:close_protection
- **Recover Plan** (`seat:recover_plan`) → cap:plan_recovery
- **Recover Resources** (`seat:recover_resources`) → cap:resource_recovery
- **Clear Blocking Hate** (`seat:clear_path`) → cap:path_clearing
- **Access Win Piece** (`seat:access_win`) → cap:selection_access
- **Preserve Plan Timing** (`seat:preserve_timing`) → cap:plan_disruption

## Critical finding — Level-A reversals

Several residuals that correlate with *structural recovery probability* globally are **higher among low performers** inside same-commander / same-event Level-A cohorts (11 cohorts).

Examples: `multifunctionCount`, `uniqueRoleCount`, `independentlyCoveredCount`, `roleEntropy` show `low_greater` at Level-A.

Under Atlas admission rules, that is a **contradiction**, not a promotion signal. Global recovery association without commander-controlled direction is not enough to earn capability words.

> Naming is not promotion. Elegance is not evidence.

## Interaction-count-controlled results (partial r recovery | ix)

| Variable | r(rec) | r(ix) | partial(rec\|ix) |
|---|---:|---:|---:|
| roleEntropy | 0.5765 | 0.0411 | 0.5912 |
| independentlyCoveredCount | 0.5101 | 0.306 | 0.4614 |
| uniqueRoleCount | 0.5176 | 0.3653 | 0.4606 |
| recoverySeatCount | 0.5161 | 0.3898 | 0.4557 |
| multifunctionCount | 0.5148 | 0.4552 | 0.4471 |
| multifunctionRatio | 0.3983 | 0.0041 | 0.4157 |
| winSequenceProtectionCoverage | 0.2771 | -0.0218 | 0.2969 |
| singlePointOfFailureCount | -0.2585 | -0.1774 | -0.2192 |
| protectionSeatCount | 0.0571 | -0.0409 | 0.0725 |
| meaningfulEdgeDensity | -0.2541 | -0.8402 | -0.0112 |

## Level-A controlled results (same commander · same event · high−low)

| Variable | cohorts | mean Δ (high−low) | direction |
|---|---:|---:|---|
| multifunctionCount | 11 | -0.7727 | low_greater |
| uniqueRoleCount | 11 | -0.3182 | low_greater |
| independentlyCoveredCount | 11 | -0.3182 | low_greater |
| meaningfulEdgeDensity | 11 | 0.2717 | high_greater |
| interactionCount | 11 | -0.1818 | low_greater |
| singlePointOfFailureCount | 11 | 0.1818 | high_greater |
| protectionSeatCount | 11 | 0.0909 | high_greater |
| winSequenceProtectionCoverage | 11 | -0.081 | low_greater |
| roleEntropy | 11 | -0.0688 | low_greater |
| multifunctionRatio | 11 | -0.0598 | low_greater |
| recoverySeatCount | 11 | 0 | flat |

## Capability candidate evidence (verdicts)

- **cap:commander_protection** — `contradicted` · confidence 0.3212
- **cap:engine_protection** — `contradicted` · confidence 0.3212
- **cap:close_protection** — `contradicted` · confidence 0.3212
- **cap:plan_recovery** — `contradicted` · confidence 0.5568599999999999
- **cap:resource_recovery** — `contradicted` · confidence 0.5568599999999999
- **cap:path_clearing** — `unresolved` · confidence 0
- **cap:plan_disruption** — `unresolved` · confidence 0
- **cap:selection_access** — `contradicted` · confidence 0.6118399999999999
- **cap:strategic_flexibility** — `contradicted` · confidence 0.67891

## Atlas admission

Admitted capability labels (writesToBrain still false): **0**
- *(none — elegance is not evidence)*

Admitted residual *measures* (not capability words): **0**

Rejected capability labels: **7**
- cap:commander_protection — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:engine_protection — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:close_protection — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:plan_recovery — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:resource_recovery — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:selection_access — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).
- cap:strategic_flexibility — contradicted · Level-A same-commander contrast reverses the global recovery association (or SPOF sign fails).

Ambiguous / unearned: **2**
- cap:path_clearing — unresolved
- cap:plan_disruption — unresolved

## Counterexamples

- `high_performer_with_many_single_points_of_failure` · deck topdeck:2do-clasificatorio-nacional-cedh-2026-iquique:d6E7MglDAqTSj8QNhyH64ox5tol1:4 · SPOF=3 · indep=2
- `high_performer_with_many_single_points_of_failure` · deck topdeck:4-onslaught-invasion-2026-event-series:362DEo1Jr6Xqwhv0mTNi2z2P4wH3:2 · SPOF=6 · indep=1
- `high_performer_with_many_single_points_of_failure` · deck topdeck:4-onslaught-invasion-2026-event-series:3tVf144vfkZ2uXne2Xs6QtJkMXZ2:8 · SPOF=3 · indep=2
- `high_performer_with_many_single_points_of_failure` · deck topdeck:4-onslaught-invasion-2026-event-series:Xy0qdXdYhhcBFb2ACGCriwYsLEn1:6 · SPOF=4 · indep=4
- `high_performer_with_many_single_points_of_failure` · deck topdeck:4-onslaught-invasion-2026-event-series:ZzyvmToyDkbhBLwtVEStb9OQuvj1:7 · SPOF=3 · indep=3
- `low_performer_with_high_independent_coverage` · deck topdeck:2do-clasificatorio-nacional-cedh-2026-iquique:k1iBN3gul4a5otzKSEK8iR7PBT43:32 · SPOF=0 · indep=3
- `low_performer_with_high_independent_coverage` · deck topdeck:2do-clasificatorio-nacional-cedh-2026-iquique:O81M9FWjX5hf5UKAyOV8jaMuIPg2:36 · SPOF=1 · indep=6
- `low_performer_with_high_independent_coverage` · deck topdeck:2do-clasificatorio-nacional-cedh-2026-iquique:qSBtJ7iHTsgZgf6sMVllJOTgsia2:33 · SPOF=3 · indep=3
- `low_performer_with_high_independent_coverage` · deck topdeck:4-onslaught-invasion-2026-event-series:6ZXBjJcbOuUXt8Hw246LXdvtVZ33:31 · SPOF=1 · indep=5
- `low_performer_with_high_independent_coverage` · deck topdeck:4-onslaught-invasion-2026-event-series:pbGmxpFJSgWedcCYH6ZM32LA32w1:34 · SPOF=0 · indep=7

## Research answers

1. Beyond interaction count: **PARTIAL_YES — roleEntropy, independentlyCoveredCount, uniqueRoleCount, recoverySeatCount, multifunctionCount, multifunctionRatio, winSequenceProtectionCoverage, singlePointOfFailureCount retain |partial r|≥0.15**
2. Survives commander controls (correct Level-A direction): protectionSeatCount
2b. Commander-control **reversals**: multifunctionCount, uniqueRoleCount, independentlyCoveredCount, meaningfulEdgeDensity, singlePointOfFailureCount, winSequenceProtectionCoverage, roleEntropy, multifunctionRatio
3. Archetype controls: **INSUFFICIENT_EVIDENCE — Level-B/C family resolution not fully wired in this pass**
5. Multifunction: see JSON · Tag-inflation control incomplete; treat flexibility as high-ambiguity until quality proxies exist.
9. Counterexample count: **10**
10. Coverage umbrella: **SEVERAL_RELATED_SIGNALS — not yet proven as one coherent Strategic Coverage primitive**

## Strongest unexplained residual

**roleEntropy** — partial(rec|ix)=0.5912, r(rec)=0.5765, r(ix)=0.0411

## Concepts rejected / still ambiguous / admitted

See Atlas admission section. **Atlas admission ≠ Brain promotion.**

## Does Strategic Coverage survive as a coherent concept?

Verdict: **PARTIAL_SIGNAL_NO_UMBRELLA_ADMISSION**

SEVERAL_RELATED_SIGNALS — not yet proven as one coherent Strategic Coverage primitive

## Recommended next Academy question

> Why do several coverage residuals correlate with structural recovery globally but reverse under Level-A same-commander contrasts?

## Explicit non-recommendations

- Brain implementation: **false**
- Laboratory authorized: **false**
- Mentor production coaching: **false**
- `coverageScore`: **does not exist**

## North star

> Before MetaForge thinks in capabilities, prove that capabilities are a better language for strategy than the proxies that led us to them.

Brain waits.
