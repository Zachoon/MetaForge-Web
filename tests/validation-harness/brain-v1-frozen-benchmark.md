# MetaForge Validation Report

Generated: 2026-08-10T15:35:56.700Z
Mode: field
Architecture frozen: yes

## Summary
- Brain v1 frozen field benchmark: 104 forges (13 fixtures × 8 seeds), pass rate 100%.
- Hard-failure runs: 0.
- Ledger weak: 248 total / 2.385 per forge (avoidable 0.154, constraint-forced 1.923).
- SE per forge: weak-final 1.385, oversupply 2.481, genuine_bad 0.538, emergence 11.24.
- Seed variance: archetype weak counts identical across all 8 seeds — deterministic quality profile.
- Next focus: pool_scarcity_and_real_corpora — Remaining weakness is mostly constraint-forced — synthetic pools may be the ceiling; field-test real lists next.

## Control metrics
- final_weak_justification: 144 (1.385/forge)
- later_package_oversupply: 258 (2.481/forge)
- invalidated_by_later_decisions: 705 (6.779/forge)
- genuine_bad_belief: 56 (0.538/forge)
- beneficial_emergence: 1169 (11.24/forge)
- early_scaffolding_matured: 2701 (25.971/forge)
- unclassified: 1968 (18.923/forge)
- ledger_weak_slots: 248 (2.385/forge)
- avoidable_weak_slots: 16 (0.154/forge)
- constraint_forced_weak_slots: 200 (1.923/forge)
- hard_failure_runs: 0 (0/forge)

## Top drift classes
- early_scaffolding_matured: 2701
- unclassified: 1968
- retrospective_gain_not_seen_prospectively: 1169
- downstream_repair_invalidated_pick: 416
- later_package_oversupply: 258
- final_weak_justification: 144
- stable_good_prediction: 72
- curve_need_disappeared: 48
- unsupported_anchor_emerged: 16

## Weak-slot causal / source
- causal became_weak_downstream: 144
- causal weak_at_selection: 104
- source live_fill: 248

## Baseline comparison (per-forge normalized)
- No hard regressions flagged.

## Suggested next focus
- **pool_scarcity_and_real_corpora**: Remaining weakness is mostly constraint-forced — synthetic pools may be the ceiling; field-test real lists next.
- alternate taxonomy_expansion_for_unclassified: Only after concrete quality defects are quiet — expand drift taxonomy carefully.

## Archetype snapshot
- aristocrats: runs=8 pass=8 weak=16 avoidable=16 forced=0
- artifacts: runs=8 pass=8 weak=0 avoidable=0 forced=0
- aura_voltron: runs=8 pass=8 weak=0 avoidable=0 forced=0
- blink: runs=8 pass=8 weak=48 avoidable=0 forced=48
- combo: runs=8 pass=8 weak=56 avoidable=0 forced=56
- equipment_voltron: runs=8 pass=8 weak=32 avoidable=0 forced=0
- landfall: runs=8 pass=8 weak=16 avoidable=0 forced=16
- multi_direction: runs=8 pass=8 weak=0 avoidable=0 forced=0
- reanimator: runs=8 pass=8 weak=16 avoidable=0 forced=16
- spellslinger: runs=8 pass=8 weak=0 avoidable=0 forced=0
- stax: runs=8 pass=8 weak=0 avoidable=0 forced=0
- tokens: runs=8 pass=8 weak=64 avoidable=0 forced=64
- typal: runs=8 pass=8 weak=0 avoidable=0 forced=0

_This report does not authorize new planning layers. Evidence first._
