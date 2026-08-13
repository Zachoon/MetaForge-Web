# Sim-Lab-001 LIVE Report

**Sandbox only. writesToBrain: false. promoteToBrain: false. constructionMutated: false.**
**Synthetic fixtures: NOT USED.**

## Question
Does plan topology explain strategic resilience better than simply counting interaction?

## 1. Live decks / events evaluated
- Decks: **283**
- Events: **35**
- Source: `topdeck_live_cache`
- Sample: `{"lastDays":90,"participantMin":16,"maxEvents":75,"maxDecksPerEvent":24,"preferTopCut":true,"includeLowerComparison":true,"lowerComparisonSlots":6,"topCutSlots":8}`

## 2. Usable Level-A recovery cohorts
- Usable cohorts: **10**
- Topology agreement rate: **0.1**
- Interaction agreement rate: **0.6**
- Delta corr topology↔recovery: **-0.377**
- Delta corr interaction↔recovery: **0.3544**
- Level-A explains better: **interaction_count**

## 3. Topology vs interaction-count (global)
- interactionCount: **0.2955**
- topologyComposite: **-0.2528**
- planConnectedRatio: **0.1541**
- meaningfulEdgeDensity: **-0.2541**
- isolatedRatio: **-0.0771**
- Overall explains better: **interaction_count**

## 4. Node-removal classes topology explains best
- **commander**: explainsBetter=**interaction_count** topo=-0.2698 ix=0.3285 meanRecoveryP=0.302
- **engine**: explainsBetter=**interaction_count** topo=-0.1829 ix=0.1907 meanRecoveryP=0.261
- **payoff**: explainsBetter=**interaction_count** topo=-0.323 ix=0.4014 meanRecoveryP=0.246
- **tutor**: explainsBetter=**interaction_count** topo=-0.2422 ix=0.2714 meanRecoveryP=0.388
- **protection**: explainsBetter=**interaction_count** topo=-0.2376 ix=0.2706 meanRecoveryP=0.29
- **recovery**: explainsBetter=**interaction_count** topo=-0.0755 ix=0.0959 meanRecoveryP=0.202

## 5. Repeated-converter recovery signatures
- **repeated_converter** n=100 meanRecoveryP=0.257 explainsBetter=**interaction_count** topo=-0.3235 ix=0.3787
- **single_event_converter** n=37 meanRecoveryP=0.27 explainsBetter=**interaction_count** topo=-0.4305 ix=0.461
- **tournament_participant** n=146 meanRecoveryP=0.301 explainsBetter=**interaction_count** topo=-0.1883 ix=0.2088

## 6. Commander / family-specific effects
- Families with n≥4: **17**
- Kinnan, Bonder Prodigy: n=20 explainsBetter=**interaction_count** topo=-0.7359 ix=0.7595
- Rograkh, Son of Rohgahh / Thrasios, Triton Hero: n=18 explainsBetter=**topology** topo=0.32 ix=-0.2778
- Kraum, Ludevic's Opus / Tymna the Weaver: n=16 explainsBetter=**tie** topo=0.022 ix=0.0426
- Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept: n=13 explainsBetter=**topology** topo=0.675 ix=-0.5857
- Sisay, Weatherlight Captain: n=11 explainsBetter=**interaction_count** topo=-0.8342 ix=0.8452
- Thrasios, Triton Hero / Tymna the Weaver: n=9 explainsBetter=**interaction_count** topo=-0.5298 ix=0.4885
- Ishai, Ojutai Dragonspeaker / Rograkh, Son of Rohgahh: n=9 explainsBetter=**interaction_count** topo=-0.5165 ix=0.511
- Nick Fury, Agent of S.H.I.E.L.D.: n=7 explainsBetter=**interaction_count** topo=-0.7107 ix=0.7342

## 7. Cross-family transfer
- Transfer class: **mixed**
- Topology-preferred families: **4**
- Interaction-preferred families: **11**

## 8. Contradictions
- (none flagged)

## 9. Fixture-negative survival
- Fixture topology won previously: **false**
- Fixture-negative survived: **true**
- Fixture-negative flipped: **false**

## 10. Verdict
**rejects_topology**

```json
{
  "label": "rejects_topology",
  "overallWinner": "interaction_count",
  "levelAWinner": "interaction_count",
  "repeatedConverterWinner": "interaction_count",
  "fixtureNegativeSurvived": true,
  "fixtureNegativeFlipped": false
}
```

## Recommendation
- promoteToBrain: **false**
- runValidationHarness: **false**
- next: Do not promote. Optionally refine plan-graph seat labeling or expand Level-A sample — still no Brain write.

No card rankings. No construction scores. No Harness promotion request.