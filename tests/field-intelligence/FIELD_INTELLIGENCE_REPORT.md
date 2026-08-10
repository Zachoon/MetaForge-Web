# MetaForge Field Intelligence v1.2 — Level-A Converter Forensics

Brain v1 remains frozen. No construction policy changes in this batch.
Do not implement Brain v2 from this report.

## North star
When equally situated players bring the same commander into the same tournament, what structural decisions consistently distinguish converters from non-converters?

## Evidence hierarchy
Repeated converter > single-event converter > tournament participant > curated expert > broad community > public/user.
Level-A (same commander + same event) is the primary controlled comparison.

## Corpus coverage
- Records ingested: **201**
- Decks analyzed: **201**
- Events represented: **20**
- Unique commanders: **95**
- Top-cut decks: **107**
- Winning decks (placement 1): **20**
- Lower-performing comparison decks: **83**
- Repeated converters: **77**
- Single-event converters: **34**
- Tournament participants: **90**
- EDHREC aggregates (secondary): **6**
- Evidence tier distribution: `{"tournament_performance":201}`
- Performance class distribution: `{"repeated_converter":77,"tournament_participant":90,"single_event_converter":34}`
- Placement distribution: `{"top1":20,"topCut":91,"mid":16,"lower":74,"unknown":0}`
- Event-size distribution: `{"n":201,"min":16,"p50":37,"max":78,"mean":40.96}`
- Source distribution: `{"topdeck_tournament":201}`
- Dedupe: `{"input":201,"output":201,"fingerprintDuplicates":0,"eventPlayerDuplicates":0,"duplicateRate":0}`

## Corpus quality / semantic bridge
```json
{
  "version": "corpus-quality-v1",
  "decks": 201,
  "semanticCoverageRate": 0.999,
  "commanderResolutionRate": 1,
  "familyResolutionRate": 0.861,
  "packageDetectionRate": 0.333,
  "interactionCoverageRate": 1,
  "roleCoverageRate": 1,
  "commanderAlignmentRate": 0.826,
  "meanConfidenceDiscount": 1,
  "decksDiscounted": 0,
  "excludedDecks": 0,
  "exclusionReasons": {},
  "enrichment": {
    "requestedCards": 19658,
    "resolvedCards": 19638,
    "unresolvedCards": [],
    "unresolvedCount": 0,
    "aliasFailures": [],
    "dfcFailures": [],
    "splitFailures": [],
    "semanticCoverageRate": 0.999,
    "decks": 201,
    "decksFullyResolved": 201,
    "decksDiscounted": 0,
    "sharedResolutionRequested": 2555,
    "sharedResolutionResolved": 2555,
    "source": "complete"
  },
  "family": {
    "structurallyTyped": 173,
    "unresolved": 0,
    "unresolvedDetails": [],
    "familyDistributionTop": [
      {
        "key": "produce:evasion",
        "count": 92
      },
      {
        "key": "concept:ramp",
        "count": 73
      },
      {
        "key": "reward:combat",
        "count": 63
      },
      {
        "key": "concept:combat",
        "count": 62
      },
      {
        "key": "concept:draw",
        "count": 59
      },
      {
        "key": "concept:artifacts",
        "count": 53
      },
      {
        "key": "produce:draw",
        "count": 51
      },
      {
        "key": "produce:etb",
        "count": 47
      },
      {
        "key": "produce:sacrifice",
        "count": 41
      },
      {
        "key": "produce:life",
        "count": 38
      },
      {
        "key": "concept:lifegain",
        "count": 36
      },
      {
        "key": "package:tokens",
        "count": 34
      },
      {
        "key": "produce:tokens",
        "count": 34
      },
      {
        "key": "concept:graveyard",
        "count": 33
      },
      {
        "key": "produce:counters",
        "count": 33
      },
      {
        "key": "concept:tokens",
        "count": 31
      },
      {
        "key": "produce:combat",
        "count": 31
      },
      {
        "key": "concept:counters",
        "count": 30
      },
      {
        "key": "concept:spells",
        "count": 29
      },
      {
        "key": "concept:selection",
        "count": 28
      }
    ]
  },
  "interpretabilityNote": [
    "packages_detected",
    "semantic_enrichment_ok"
  ]
}
```

## Commander / family resolution
```json
{
  "commanderResolutionRate": 1,
  "familyResolutionRate": 0.861,
  "structurallyTyped": 173,
  "unresolved": 0,
  "unresolvedDetails": [],
  "familyDistributionTop": [
    [
      "produce:evasion",
      92
    ],
    [
      "concept:ramp",
      73
    ],
    [
      "reward:combat",
      63
    ],
    [
      "concept:combat",
      62
    ],
    [
      "concept:draw",
      59
    ],
    [
      "concept:artifacts",
      53
    ],
    [
      "produce:draw",
      51
    ],
    [
      "produce:etb",
      47
    ],
    [
      "produce:sacrifice",
      41
    ],
    [
      "produce:life",
      38
    ],
    [
      "concept:lifegain",
      36
    ],
    [
      "package:tokens",
      34
    ]
  ]
}
```

## Level-A forensics (usable cohorts)
- Usable Level-A cohorts: **9**
- **Kinnan, Bonder Prodigy** @ `tq1-sweater-series-nr2` high=2 low=2 eventSize=41 cov=1
  - strongest: interactionDensity:131.5 (n=4, conf=0.655); curveLow:4 (n=4, conf=0.455); spells:4 (n=4, conf=0.455); spell_interaction:3 (n=4, conf=0.405)
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `august` high=2 low=2 eventSize=49 cov=1
  - strongest: interactionDensity:-87.5 (n=4, conf=0.655); spells:-2.5 (n=4, conf=0.38); interactionCount:-1.5 (n=4, conf=0.33); spell_other:-1.5 (n=4, conf=0.33)
- **Dargo, the Shipwrecker / Tymna the Weaver** @ `win-a-dual-commander-tournament-2` high=1 low=1 eventSize=19 cov=1
  - strongest: interactionDensity:-21 (n=2, conf=0.574); spell_other:-4 (n=2, conf=0.374); commanderConnectedCount:3 (n=2, conf=0.324); interactionCount:3 (n=2, conf=0.324)
- **Kraum, Ludevic's Opus / Tymna the Weaver** @ `4-onslaught-invasion-2026-event-series` high=1 low=1 eventSize=35 cov=0.995
  - strongest: interactionDensity:47 (n=2, conf=0.574); curveLow:-3 (n=2, conf=0.324); interactionCount:-2 (n=2, conf=0.274); ix_flexible:1 (n=2, conf=0.224)
- **Kraum, Ludevic's Opus / Tymna the Weaver** @ `tq1-sweater-series-nr2` high=1 low=1 eventSize=41 cov=0.995
  - strongest: interactionDensity:185 (n=2, conf=0.574); curveHigh:1 (n=2, conf=0.224); interactionCount:1 (n=2, conf=0.224); ix_flexible:1 (n=2, conf=0.224)
- **Rograkh, Son of Rohgahh / Thrasios, Triton Hero** @ `cedh-for-badlands-mox-diamond-gameuphoria-1` high=1 low=1 eventSize=29 cov=1
  - strongest: interactionDensity:338 (n=2, conf=0.574); curveLow:25 (n=2, conf=0.574); curveHigh:-18 (n=2, conf=0.574); spells:14 (n=2, conf=0.574)
- **Rograkh, Son of Rohgahh / Thrasios, Triton Hero** @ `commander-invitational-qualifier-the-hollow-archive-791` high=1 low=1 eventSize=31 cov=1
  - strongest: interactionDensity:-17 (n=2, conf=0.574); curveHigh:1 (n=2, conf=0.224); interactionCount:-1 (n=2, conf=0.224); ix_stack:-1 (n=2, conf=0.224)
- **Sisay, Weatherlight Captain** @ `the-stack-council-proving-grounds` high=1 low=1 eventSize=21 cov=1
  - strongest: interactionDensity:126 (n=2, conf=0.574); spells:3 (n=2, conf=0.324); spell_tutor:2 (n=2, conf=0.274); tutor:2 (n=2, conf=0.274)
- **Thrasios, Triton Hero / Tymna the Weaver** @ `time-is-money-cedh-cash-tourney` high=1 low=1 eventSize=37 cov=1
  - strongest: interactionDensity:-193 (n=2, conf=0.574); spells:-10 (n=2, conf=0.574); commanderConnectedCount:6 (n=2, conf=0.474); interactionCount:-4 (n=2, conf=0.374)

## PerformanceStructureHypotheses (replication)
- By status: `{"single_event_lead":43,"replicated":1,"mixed":0,"contradicted":5,"insufficient_sample":0}`
### Replicated
- psh:kraum, ludevic's opus / tymna the weaver:interaction: interactionDensity high_greater effect=26 conf=0.9 support=["4-onslaught-invasion-2026-event-series","tq1-sweater-series-nr2"] brainEligible=true
### Mixed / contradicted
- contradicted psh:rograkh, son of rohgahh / thrasios, triton hero:interaction: interactionDensity effect=56 contradict=["commander-invitational-qualifier-the-hollow-archive-791"]
- contradicted psh:rograkh, son of rohgahh / thrasios, triton hero:curveHigh: curveHigh effect=-8.5 contradict=["commander-invitational-qualifier-the-hollow-archive-791"]
- contradicted psh:rograkh, son of rohgahh / thrasios, triton hero:spells: spells effect=4.6 contradict=["commander-invitational-qualifier-the-hollow-archive-791"]
- contradicted psh:kraum, ludevic's opus / tymna the weaver:spell_other: spell_other effect=0 contradict=["tq1-sweater-series-nr2"]
- contradicted psh:kraum, ludevic's opus / tymna the weaver:spells: spells effect=0 contradict=["tq1-sweater-series-nr2"]
### Single-event leads (not Brain v2 evidence)
- psh:thrasios, triton hero / tymna the weaver:interaction: interactionDensity high_lesser effect=-98.5 conf=0.45 event=time-is-money-cedh-cash-tourney
- psh:kinnan, bonder prodigy:interaction: interactionDensity high_greater effect=45.333 conf=0.45 event=tq1-sweater-series-nr2
- psh:rograkh, son of rohgahh / silas renn, seeker adept:interaction: interactionDensity high_lesser effect=-30 conf=0.45 event=august
- psh:sisay, weatherlight captain:interaction: interactionDensity high_greater effect=25.2 conf=0.45 event=the-stack-council-proving-grounds
- psh:rograkh, son of rohgahh / thrasios, triton hero:curveLow: curveLow high_greater effect=25 conf=0.45 event=cedh-for-badlands-mox-diamond-gameuphoria-1
- psh:dargo, the shipwrecker / tymna the weaver:interaction: interactionDensity high_lesser effect=-6.333 conf=0.45 event=win-a-dual-commander-tournament-2
- psh:thrasios, triton hero / tymna the weaver:commanderConnectedCount: commanderConnectedCount high_greater effect=6 conf=0.45 event=time-is-money-cedh-cash-tourney
- psh:thrasios, triton hero / tymna the weaver:spells: spells high_lesser effect=-5 conf=0.45 event=time-is-money-cedh-cash-tourney
- psh:kinnan, bonder prodigy:curveLow: curveLow high_greater effect=4 conf=0.45 event=tq1-sweater-series-nr2
- psh:kinnan, bonder prodigy:spells: spells high_greater effect=3.5 conf=0.45 event=tq1-sweater-series-nr2
- psh:rograkh, son of rohgahh / silas renn, seeker adept:spells: spells high_lesser effect=-1.75 conf=0.38 event=august
- psh:dargo, the shipwrecker / tymna the weaver:spell_other: spell_other high_lesser effect=-4 conf=0.374 event=win-a-dual-commander-tournament-2
- psh:thrasios, triton hero / tymna the weaver:spell_other: spell_other high_lesser effect=-4 conf=0.374 event=time-is-money-cedh-cash-tourney
- psh:kinnan, bonder prodigy:curveHigh: curveHigh high_lesser effect=-2 conf=0.355 event=tq1-sweater-series-nr2
- psh:kinnan, bonder prodigy:spell_other: spell_other high_greater effect=2 conf=0.355 event=tq1-sweater-series-nr2
- psh:rograkh, son of rohgahh / silas renn, seeker adept:spell_other: spell_other high_lesser effect=-1.5 conf=0.33 event=august

## Rograkh/Thrasios threat decomposition
```json
{
  "cohorts": [
    {
      "eventId": "cedh-for-badlands-mox-diamond-gameuphoria-1",
      "threatDelta": {
        "feature": "threatDensity",
        "highMean": 0,
        "lowMean": 0,
        "delta": 0,
        "magnitude": 0,
        "sampleHigh": 1,
        "sampleLow": 1,
        "sampleSize": 2,
        "confidence": 0.174
      },
      "highDecomposition": {},
      "lowDecomposition": {},
      "interpretation": "Threat role present but subtypes unresolved."
    },
    {
      "eventId": "commander-invitational-qualifier-the-hollow-archive-791",
      "threatDelta": {
        "feature": "threatDensity",
        "highMean": 0,
        "lowMean": 0,
        "delta": 0,
        "magnitude": 0,
        "sampleHigh": 1,
        "sampleLow": 1,
        "sampleSize": 2,
        "confidence": 0.174
      },
      "highDecomposition": {},
      "lowDecomposition": {},
      "interpretation": "Threat role present but subtypes unresolved."
    }
  ],
  "summary": "Threat role present but subtypes unresolved."
}
```

## Kinnan spell decomposition
```json
{
  "cohorts": [
    {
      "eventId": "tq1-sweater-series-nr2",
      "spellDelta": {
        "feature": "spells",
        "highMean": 27.5,
        "lowMean": 23.5,
        "delta": 4,
        "magnitude": 4,
        "sampleHigh": 2,
        "sampleLow": 2,
        "sampleSize": 4,
        "confidence": 0.455
      },
      "highDecomposition": {
        "interaction": 13.5,
        "other_spell": 7,
        "tutor": 5.5,
        "card_advantage": 1,
        "combo_assembly": 1
      },
      "lowDecomposition": {
        "interaction": 10.5,
        "tutor": 6,
        "other_spell": 5,
        "card_advantage": 1,
        "combo_assembly": 1,
        "protection": 0.5
      },
      "interpretation": "Extra spells in converters concentrate in: interaction (Δ 3), other_spell (Δ 2), tutor (Δ -0.5) — not raw spell count alone."
    }
  ],
  "summary": "Extra spells in converters concentrate in: interaction (Δ 3), other_spell (Δ 2), tutor (Δ -0.5) — not raw spell count alone."
}
```

## Interaction density vs shape
```json
{
  "distribution": {
    "more_but_not_better_shaped": 4,
    "unclear": 3,
    "better_shaped_not_more": 1,
    "more_and_better_shaped": 1
  },
  "dominant": "more_but_not_better_shaped"
}
```
- Kinnan, Bonder Prodigy @ tq1-sweater-series-nr2: densityΔ=131.5 countΔ=2.5 shape=more_but_not_better_shaped
- Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept @ august: densityΔ=-87.5 countΔ=-1.5 shape=unclear
- Dargo, the Shipwrecker / Tymna the Weaver @ win-a-dual-commander-tournament-2: densityΔ=-21 countΔ=3 shape=more_but_not_better_shaped
- Kraum, Ludevic's Opus / Tymna the Weaver @ 4-onslaught-invasion-2026-event-series: densityΔ=47 countΔ=-2 shape=better_shaped_not_more
- Kraum, Ludevic's Opus / Tymna the Weaver @ tq1-sweater-series-nr2: densityΔ=185 countΔ=1 shape=more_and_better_shaped
- Rograkh, Son of Rohgahh / Thrasios, Triton Hero @ cedh-for-badlands-mox-diamond-gameuphoria-1: densityΔ=338 countΔ=9 shape=more_but_not_better_shaped
- Rograkh, Son of Rohgahh / Thrasios, Triton Hero @ commander-invitational-qualifier-the-hollow-archive-791: densityΔ=-17 countΔ=-1 shape=unclear
- Sisay, Weatherlight Captain @ the-stack-council-proving-grounds: densityΔ=126 countΔ=1 shape=more_but_not_better_shaped
- Thrasios, Triton Hero / Tymna the Weaver @ time-is-money-cedh-cash-tourney: densityΔ=-193 countΔ=-4 shape=unclear

## Role-balance fingerprints
- Kinnan, Bonder Prodigy @ tq1-sweater-series-nr2: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":131.5}
  - high: `{"threat":0.258,"artifacts":0.237,"ramp":0.237,"interaction":0.172,"spells":0.121,"draw":0.091,"graveyard":0.091,"recursion":0.051,"combat":0.03,"sacrifice":0.03,"lifegain":0.02,"tokens":0.02,"protection":0.015,"counters":0.01,"selection":0.01}`
  - low: `{"threat":0.278,"artifacts":0.258,"ramp":0.232,"interaction":0.137,"draw":0.101,"graveyard":0.091,"spells":0.081,"recursion":0.045,"combat":0.025,"sacrifice":0.025,"counters":0.015,"lifegain":0.015,"protection":0.015,"tokens":0.015,"selection":0.01}`
- Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept @ august: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":-87.5}
  - high: `{"ramp":0.266,"artifacts":0.24,"graveyard":0.148,"interaction":0.138,"spells":0.092,"sacrifice":0.066,"threat":0.066,"draw":0.061,"recursion":0.061,"tokens":0.026,"sweeper":0.02,"discard":0.015,"combat":0.01,"selection":0.01}`
  - low: `{"ramp":0.255,"artifacts":0.224,"graveyard":0.148,"interaction":0.148,"spells":0.092,"sacrifice":0.071,"draw":0.066,"threat":0.061,"recursion":0.056,"sweeper":0.02,"discard":0.015,"combat":0.01,"tokens":0.01}`
- Dargo, the Shipwrecker / Tymna the Weaver @ win-a-dual-commander-tournament-2: signal={"kind":"raw_quantity","feature":"interactionDensity","delta":-21}
  - high: `{"artifacts":0.388,"threat":0.306,"ramp":0.296,"graveyard":0.184,"tokens":0.163,"sacrifice":0.133,"recursion":0.092,"interaction":0.082,"combat":0.061,"draw":0.031,"spells":0.031,"counters":0.02,"selection":0.02,"lifegain":0.01,"protection":0.01}`
  - low: `{"artifacts":0.327,"ramp":0.286,"threat":0.245,"graveyard":0.173,"sacrifice":0.133,"tokens":0.122,"recursion":0.082,"interaction":0.071,"spells":0.051,"combat":0.041,"draw":0.041,"selection":0.02,"discard":0.01,"lifegain":0.01,"protection":0.01}`
- Kraum, Ludevic's Opus / Tymna the Weaver @ 4-onslaught-invasion-2026-event-series: signal={"kind":"raw_quantity","feature":"interactionDensity","delta":47}
  - high: `{"ramp":0.235,"artifacts":0.214,"threat":0.184,"spells":0.133,"interaction":0.122,"graveyard":0.112,"draw":0.082,"tokens":0.082,"recursion":0.051,"sacrifice":0.041,"combat":0.02,"sweeper":0.02,"selection":0.01}`
  - low: `{"artifacts":0.235,"ramp":0.235,"threat":0.163,"interaction":0.122,"spells":0.112,"graveyard":0.102,"tokens":0.071,"draw":0.061,"recursion":0.061,"sacrifice":0.041,"combat":0.02,"sweeper":0.01}`
- Kraum, Ludevic's Opus / Tymna the Weaver @ tq1-sweater-series-nr2: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":185}
  - high: `{"ramp":0.255,"artifacts":0.245,"threat":0.163,"interaction":0.143,"spells":0.133,"graveyard":0.112,"tokens":0.092,"draw":0.071,"recursion":0.051,"sacrifice":0.051,"combat":0.031,"sweeper":0.02}`
  - low: `{"ramp":0.224,"artifacts":0.214,"threat":0.163,"interaction":0.143,"graveyard":0.102,"spells":0.092,"tokens":0.092,"draw":0.071,"sacrifice":0.051,"recursion":0.041,"combat":0.031,"sweeper":0.02}`
- Rograkh, Son of Rohgahh / Thrasios, Triton Hero @ cedh-for-badlands-mox-diamond-gameuphoria-1: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":338}
  - high: `{"threat":0.296,"ramp":0.173,"interaction":0.133,"artifacts":0.102,"graveyard":0.102,"spells":0.082,"draw":0.071,"sacrifice":0.051,"recursion":0.041,"tokens":0.041,"counters":0.031,"combat":0.02,"protection":0.02,"lifegain":0.01,"selection":0.01}`
  - low: `{"threat":0.459,"ramp":0.265,"artifacts":0.153,"interaction":0.071,"counters":0.041,"draw":0.041,"recursion":0.031,"sacrifice":0.031,"spells":0.031,"combat":0.02,"graveyard":0.02,"protection":0.02,"tokens":0.02,"lifegain":0.01,"selection":0.01}`
- Rograkh, Son of Rohgahh / Thrasios, Triton Hero @ commander-invitational-qualifier-the-hollow-archive-791: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":-17}
  - high: `{"threat":0.286,"ramp":0.184,"graveyard":0.122,"artifacts":0.112,"interaction":0.112,"spells":0.092,"draw":0.071,"recursion":0.051,"sacrifice":0.041,"tokens":0.031,"counters":0.02,"combat":0.01,"lifegain":0.01,"protection":0.01,"selection":0.01}`
  - low: `{"threat":0.255,"ramp":0.194,"artifacts":0.133,"interaction":0.133,"graveyard":0.122,"spells":0.092,"draw":0.061,"recursion":0.051,"sacrifice":0.051,"tokens":0.031,"counters":0.02,"protection":0.02,"combat":0.01,"lifegain":0.01,"selection":0.01}`
- Sisay, Weatherlight Captain @ the-stack-council-proving-grounds: signal={"kind":"quantity_and_share","feature":"interactionDensity","delta":126}
  - high: `{"threat":0.343,"ramp":0.303,"artifacts":0.232,"interaction":0.141,"spells":0.111,"draw":0.091,"graveyard":0.081,"combat":0.061,"tokens":0.051,"counters":0.04,"recursion":0.03,"lifegain":0.02,"protection":0.02,"sacrifice":0.02,"selection":0.01}`
  - low: `{"threat":0.364,"ramp":0.293,"artifacts":0.242,"interaction":0.141,"draw":0.091,"graveyard":0.081,"spells":0.071,"tokens":0.051,"combat":0.04,"counters":0.04,"recursion":0.04,"lifegain":0.02,"protection":0.02,"selection":0.01}`
- Thrasios, Triton Hero / Tymna the Weaver @ time-is-money-cedh-cash-tourney: signal={"kind":"raw_quantity","feature":"interactionDensity","delta":-193}
  - high: `{"threat":0.327,"ramp":0.214,"artifacts":0.163,"interaction":0.112,"spells":0.102,"draw":0.071,"graveyard":0.071,"tokens":0.071,"combat":0.051,"counters":0.031,"sacrifice":0.031,"lifegain":0.02,"recursion":0.02,"selection":0.01}`
  - low: `{"threat":0.255,"ramp":0.204,"artifacts":0.194,"interaction":0.133,"spells":0.102,"draw":0.082,"graveyard":0.082,"tokens":0.061,"sacrifice":0.041,"combat":0.031,"lifegain":0.031,"counters":0.02,"protection":0.02,"recursion":0.01}`

## Package blind-spot candidates (catalog NOT expanded)
- threat+ramp+artifacts+interaction+spells decks=5 events=3 conf=0.75
- ramp+artifacts+interaction+graveyard+spells decks=3 events=1 conf=0.65
- ramp+artifacts+threat+interaction+spells decks=2 events=2 conf=0.65

## Role-taxonomy blind-spot candidates (semantics NOT expanded)
- spell_count_vs_spell_composition @ Kinnan, Bonder Prodigy / tq1-sweater-series-nr2: Raw spell count hides interaction vs cantrip vs tutor composition.
- spell_count_vs_spell_composition @ Dargo, the Shipwrecker / Tymna the Weaver / win-a-dual-commander-tournament-2: Raw spell count hides interaction vs cantrip vs tutor composition.
- interaction_quantity_vs_shape @ Dargo, the Shipwrecker / Tymna the Weaver / win-a-dual-commander-tournament-2: More interaction ≠ better-shaped interaction.
- interaction_quantity_vs_shape @ Kraum, Ludevic's Opus / Tymna the Weaver / 4-onslaught-invasion-2026-event-series: More interaction ≠ better-shaped interaction.
- spell_count_vs_spell_composition @ Rograkh, Son of Rohgahh / Thrasios, Triton Hero / cedh-for-badlands-mox-diamond-gameuphoria-1: Raw spell count hides interaction vs cantrip vs tutor composition.
- interaction_quantity_vs_shape @ Rograkh, Son of Rohgahh / Thrasios, Triton Hero / cedh-for-badlands-mox-diamond-gameuphoria-1: More interaction ≠ better-shaped interaction.
- spell_count_vs_spell_composition @ Sisay, Weatherlight Captain / the-stack-council-proving-grounds: Raw spell count hides interaction vs cantrip vs tutor composition.
- spell_count_vs_spell_composition @ Thrasios, Triton Hero / Tymna the Weaver / time-is-money-cedh-cash-tourney: Raw spell count hides interaction vs cantrip vs tutor composition.
- interaction_quantity_vs_shape @ Thrasios, Triton Hero / Tymna the Weaver / time-is-money-cedh-cash-tourney: More interaction ≠ better-shaped interaction.

## Cross-commander transfer (validation only)
- transfer_mixed psh:kraum, ludevic's opus / tymna the weaver:interaction: support=["Kinnan, Bonder Prodigy","Dargo, the Shipwrecker / Tymna the Weaver","Rograkh, Son of Rohgahh / Thrasios, Triton Hero","Sisay, Weatherlight Captain","Thrasios, Triton Hero / Tymna the Weaver"] contradict=["Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept","Dargo, the Shipwrecker / Tymna the Weaver","Rograkh, Son of Rohgahh / Thrasios, Triton Hero","Thrasios, Triton Hero / Tymna the Weaver"]

## Brain v1 classifications
- Counts: `{"brain_agrees":0,"brain_underweights":6,"brain_overweights":0,"brain_missing_concept":10,"semantic_resolution_insufficient":0}`
- brain_underweights psh:kraum, ludevic's opus / tymna the weaver:interaction: converters show more/better interaction than Brain density-first priors emphasize
- brain_underweights psh:thrasios, triton hero / tymna the weaver:interaction: Brain encodes the surface but Level-A effect suggests reweight review after replication
- brain_underweights psh:kinnan, bonder prodigy:interaction: converters show more/better interaction than Brain density-first priors emphasize
- brain_underweights psh:rograkh, son of rohgahh / silas renn, seeker adept:interaction: Brain encodes the surface but Level-A effect suggests reweight review after replication
- brain_underweights psh:sisay, weatherlight captain:interaction: converters show more/better interaction than Brain density-first priors emphasize
- brain_missing_concept psh:rograkh, son of rohgahh / thrasios, triton hero:curveLow: concept not found in Brain v1 encoded surfaces
- brain_underweights psh:dargo, the shipwrecker / tymna the weaver:interaction: Brain encodes the surface but Level-A effect suggests reweight review after replication
- brain_missing_concept psh:thrasios, triton hero / tymna the weaver:commanderConnectedCount: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:thrasios, triton hero / tymna the weaver:spells: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:kinnan, bonder prodigy:curveLow: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:kinnan, bonder prodigy:spells: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:rograkh, son of rohgahh / silas renn, seeker adept:spells: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:dargo, the shipwrecker / tymna the weaver:spell_other: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:thrasios, triton hero / tymna the weaver:spell_other: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:kinnan, bonder prodigy:curveHigh: concept not found in Brain v1 encoded surfaces
- brain_missing_concept psh:kinnan, bonder prodigy:spell_other: concept not found in Brain v1 encoded surfaces

## Comparable cohorts (A→D summary)
- Counts: `{"A":9,"B":2,"C":12,"D":19}`
- Level A conf=1 family=Kinnan, Bonder Prodigy high=2 low=2 topDelta=spells:4
- Level A conf=1 family=Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept high=2 low=2 topDelta=artifacts:1.5
- Level A conf=1 family=Dargo, the Shipwrecker / Tymna the Weaver high=1 low=1 topDelta=artifacts:6
- Level A conf=1 family=Kraum, Ludevic's Opus / Tymna the Weaver high=1 low=1 topDelta=artifacts:-2
- Level A conf=1 family=Kraum, Ludevic's Opus / Tymna the Weaver high=1 low=1 topDelta=spells:4
- Level A conf=1 family=Rograkh, Son of Rohgahh / Thrasios, Triton Hero high=1 low=1 topDelta=threat:-16
- Level A conf=1 family=Rograkh, Son of Rohgahh / Thrasios, Triton Hero high=1 low=1 topDelta=threat:3
- Level A conf=1 family=Sisay, Weatherlight Captain high=1 low=1 topDelta=spells:4

## Repeated converter analysis
```json
{
  "version": "repeated-converter-analysis-v1",
  "control": null,
  "groups": {
    "repeated_converter": {
      "className": "repeated_converter",
      "n": 77,
      "packageCoreDensity": 2.87,
      "packageHealth": 23.649,
      "packageDetectionRate": 0.299,
      "interactionDensity": 710.714,
      "weakSlotDensity": 0.1,
      "redundancy": 1,
      "commanderAlignment": 0.12,
      "curveHigh": 4.714,
      "legMeans": {
        "reanimator::reanimation": 0.13,
        "reanimator::graveyard_enabler": 0.273,
        "reanimator::reanimation_target": 0.013
      }
    },
    "single_event_converter": {
      "className": "single_event_converter",
      "n": 34,
      "packageCoreDensity": 9.971,
      "packageHealth": 24.647,
      "packageDetectionRate": 0.324,
      "interactionDensity": 775.676,
      "weakSlotDensity": 0.073,
      "redundancy": 6.059,
      "commanderAlignment": 0.257,
      "curveHigh": 4.912,
      "legMeans": {
        "reanimator::reanimation": 0.235,
        "reanimator::graveyard_enabler": 0.265,
        "reanimator::reanimation_target": 0.029
      }
    },
    "tournament_participant": {
      "className": "tournament_participant",
      "n": 90,
      "packageCoreDensity": 5.756,
      "packageHealth": 30.133,
      "packageDetectionRate": 0.367,
      "interactionDensity": 697.133,
      "weakSlotDensity": 0.092,
      "redundancy": 2.2,
      "commanderAlignment": 0.186,
      "curveHigh": 5.144,
      "legMeans": {
        "reanimator::reanimation": 0.144,
        "reanimator::graveyard_enabler": 0.333,
        "reanimator::reanimation_target": 0.078
      }
    }
  },
  "deltas": {
    "coreDensity_repeated_minus_participant": -2.886,
    "interaction_repeated_minus_participant": 13.581,
    "weakSlot_repeated_minus_participant": 0.008,
    "coreDensity_repeated_minus_single": -7.101
  },
  "note": "associative_not_causal"
}
```

## Agreement diagnosis
```json
{
  "agreementCount": 0,
  "packageDetectionRate": 0.333,
  "causes": [
    "genuine_disagreement_or_sparse_overlap"
  ],
  "thresholdLowered": false
}
```

## Live sample bounds
```json
{
  "lastDays": 30,
  "participantMin": 16,
  "maxEvents": 25,
  "maxDecksPerEvent": 16,
  "preferTopCut": true,
  "includeLowerComparison": true,
  "lowerComparisonSlots": 6,
  "topCutSlots": 8,
  "formats": [
    "EDH"
  ],
  "spicerackFormats": [
    "COMMANDER2"
  ]
}
```

## Fixture sample (offline proof)
- TopDeck-shaped events: 14
- TopDeck-shaped decks: 112
- Spicerack-shaped decks: 16
- Curated expert decks: 8

## Live adapter coverage / source failures
```json
{
  "topdeck": {
    "attempted": true,
    "ok": true,
    "status": "ok",
    "reason": null,
    "actionable": null,
    "elapsedMs": 19001,
    "tournaments": 25,
    "decks": 201,
    "skippedExternal": 0,
    "errors": null,
    "commanders": null,
    "docBlocker": null,
    "consumption": null
  },
  "spicerack": {
    "attempted": true,
    "ok": false,
    "status": "needs_credentials",
    "reason": "missing_SPICERACK_API_KEY",
    "actionable": {
      "summary": "Spicerack Public Decklist Database docs show X-API-Key in the official example. Set SPICERACK_API_KEY locally (do not commit), or pass allowUnauthenticated:true to probe.",
      "docs": "https://docs.spicerack.gg/api-reference/public-decklist-database",
      "blocker": {
        "endpoint": "https://api.spicerack.gg/api/export-decklists/",
        "claimedPublic": true,
        "officialExampleRequiresApiKey": true,
        "exampleHeader": "X-API-Key: sk_*",
        "preferredRoute": "public_decklist_database_export",
        "notPreferred": "authenticated_magic_events_decklist_endpoints",
        "formats": [
          "COMMANDER2"
        ],
        "note": "Docs describe public access to completed tournament decklists/results, but the documented curl example sends an API key. Treat SPICERACK_API_KEY as required until Spicerack confirms unauthenticated access."
      }
    },
    "elapsedMs": 1,
    "tournaments": 0,
    "decks": 0,
    "skippedExternal": 0,
    "errors": null,
    "commanders": null,
    "docBlocker": {
      "endpoint": "https://api.spicerack.gg/api/export-decklists/",
      "claimedPublic": true,
      "officialExampleRequiresApiKey": true,
      "exampleHeader": "X-API-Key: sk_*",
      "preferredRoute": "public_decklist_database_export",
      "notPreferred": "authenticated_magic_events_decklist_endpoints",
      "formats": [
        "COMMANDER2"
      ],
      "note": "Docs describe public access to completed tournament decklists/results, but the documented curl example sends an API key. Treat SPICERACK_API_KEY as required until Spicerack confirms unauthenticated access."
    },
    "consumption": null
  },
  "edhtop16": {
    "attempted": true,
    "ok": false,
    "status": "schema_or_query_mismatch",
    "reason": "graphql_errors",
    "actionable": {
      "summary": "EDHTop16 GraphQL rejected the probe query. Inspect https://edhtop16.com/api/graphql schema before expanding fields. Do not scrape HTML.",
      "graphql": "https://edhtop16.com/api/graphql",
      "consumption": {
        "canSafelyConsume": [
          "GraphQL API when queries validate against the live schema",
          "Commander-level tournament conversion / entry aggregates",
          "Corroboration of which commanders appear in competitive events"
        ],
        "cannotSafelyConsume": [
          "Fragile presentation HTML scraping",
          "Undocumented private endpoints",
          "Assuming a stable REST /req contract without schema confirmation"
        ],
        "role": "corroborating_competitive_evidence",
        "notPrimaryDecklistSource": true,
        "note": "EDHTop16 aggregates competitive EDH data and exposes GraphQL. Schema fields evolve; soft-fail on GraphQL errors and never scrape HTML as a fallback."
      }
    },
    "elapsedMs": 346,
    "tournaments": 0,
    "decks": 0,
    "skippedExternal": 0,
    "errors": [
      null
    ],
    "commanders": null,
    "docBlocker": null,
    "consumption": {
      "canSafelyConsume": [
        "GraphQL API when queries validate against the live schema",
        "Commander-level tournament conversion / entry aggregates",
        "Corroboration of which commanders appear in competitive events"
      ],
      "cannotSafelyConsume": [
        "Fragile presentation HTML scraping",
        "Undocumented private endpoints",
        "Assuming a stable REST /req contract without schema confirmation"
      ],
      "role": "corroborating_competitive_evidence",
      "notPrimaryDecklistSource": true,
      "note": "EDHTop16 aggregates competitive EDH data and exposes GraphQL. Schema fields evolve; soft-fail on GraphQL errors and never scrape HTML as a fallback."
    }
  }
}
```

### Spicerack Public Decklist Database blocker
```json
{
  "endpoint": "https://api.spicerack.gg/api/export-decklists/",
  "claimedPublic": true,
  "officialExampleRequiresApiKey": true,
  "exampleHeader": "X-API-Key: sk_*",
  "preferredRoute": "public_decklist_database_export",
  "notPreferred": "authenticated_magic_events_decklist_endpoints",
  "formats": [
    "COMMANDER2"
  ],
  "note": "Docs describe public access to completed tournament decklists/results, but the documented curl example sends an API key. Treat SPICERACK_API_KEY as required until Spicerack confirms unauthenticated access."
}
```

## Compared to fixture sample
```json
{
  "liveMode": true,
  "liveTournamentsRetrieved": 25,
  "liveDecklistsRetrieved": 201,
  "fixtureDecks": 136,
  "note": "Compare live structural contrasts against the offline fixture-shaped baseline before proposing Brain v2."
}
```

## Strongest Brain ↔ human agreements
- (none above threshold in this sample)

## Strongest disagreements / blind spots
- DISAGREEMENT: brain_expects_more_than_corpus_median_investigate (tokens)
- DISAGREEMENT: brain_expects_more_than_corpus_median_investigate (equipment)
- DISAGREEMENT: brain_expects_more_than_corpus_median_investigate (typal)

## Competitive contrast (controlled preferred)
- level=A conf=1 event=tq1-sweater-series-nr2 family=Kinnan, Bonder Prodigy high=2 low=2 topDelta=spells:4
- level=A conf=1 event=august family=Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept high=2 low=2 topDelta=artifacts:1.5
- level=A conf=1 event=win-a-dual-commander-tournament-2 family=Dargo, the Shipwrecker / Tymna the Weaver high=1 low=1 topDelta=artifacts:6
- level=A conf=1 event=4-onslaught-invasion-2026-event-series family=Kraum, Ludevic's Opus / Tymna the Weaver high=1 low=1 topDelta=artifacts:-2
- level=A conf=1 event=tq1-sweater-series-nr2 family=Kraum, Ludevic's Opus / Tymna the Weaver high=1 low=1 topDelta=spells:4
- level=A conf=1 event=cedh-for-badlands-mox-diamond-gameuphoria-1 family=Rograkh, Son of Rohgahh / Thrasios, Triton Hero high=1 low=1 topDelta=threat:-16
- level=A conf=1 event=commander-invitational-qualifier-the-hollow-archive-791 family=Rograkh, Son of Rohgahh / Thrasios, Triton Hero high=1 low=1 topDelta=threat:3
- level=A conf=1 event=the-stack-council-proving-grounds family=Sisay, Weatherlight Captain high=1 low=1 topDelta=spells:4

## Hold-out generalization
- train=162 holdout=39
- package band hit rate: 0.706
- package band null reason: null
- family transfer hit rate: 0.748
- family transfer null reason: null

## Anti-netdeck safeguards
- novel coherent candidate beats popular card: **true**

## Highest-confidence Brain v2 candidate (NOT implemented)
```json
{
  "implementBrainV2": false,
  "brainV1RemainsFrozen": true,
  "candidateChangedBecauseOfBridge": false,
  "strongestAgreement": null,
  "firstCandidate": {
    "kind": "replicated_level_a_structure",
    "hypothesisId": "psh:kraum, ludevic's opus / tymna the weaver:interaction",
    "feature": "interactionDensity",
    "classification": "brain_underweights",
    "confidence": 0.9,
    "weightedEffect": 26,
    "summary": "Replicated Level-A signal on interaction: Brain classification brain_underweights",
    "priority": "high"
  },
  "evidenceGate": {
    "requiresLevelA": true,
    "requiresReplicationOrStrongTransfer": true,
    "requiresSemanticCoverage": true,
    "requiresEffectMagnitude": true,
    "requiresAntiNetdeck": true,
    "singleEventIsLeadOnly": true
  },
  "levelAUsableCohorts": 9,
  "replicatedHypotheses": 1,
  "rationale": [
    "Evidence system first; construction policy unchanged.",
    "Level-A same-commander + same-event is the primary controlled comparison.",
    "Single-event structural deltas remain research leads, not Brain v2 evidence.",
    "Replicated Level-A (or strong cross-family confirmation) required for Brain v2 eligibility.",
    "Any Brain v2 change requires Validation Harness report.",
    "This batch does not implement Brain v2."
  ]
}
```

## Evidence gate snapshot
```json
{
  "implementBrainV2": false,
  "brainV1RemainsFrozen": true,
  "evidenceGate": {
    "requiresLevelA": true,
    "requiresReplicationOrStrongTransfer": true,
    "requiresSemanticCoverage": true,
    "requiresEffectMagnitude": true,
    "requiresAntiNetdeck": true,
    "singleEventIsLeadOnly": true
  },
  "candidate": {
    "kind": "replicated_level_a_structure",
    "hypothesisId": "psh:kraum, ludevic's opus / tymna the weaver:interaction",
    "feature": "interactionDensity",
    "classification": "brain_underweights",
    "confidence": 0.9,
    "weightedEffect": 26,
    "summary": "Replicated Level-A signal on interaction: Brain classification brain_underweights",
    "priority": "high"
  },
  "note": "Highest-confidence replicated evidence. Still observation-only — Validation Harness required before any Brain change."
}
```

## Attribution
- TopDeck.gg — https://topdeck.gg
- Spicerack — https://spicerack.gg
- cEDH Decklist Database — https://cedh-decklist-database.com/
- EDHREC — https://edhrec.com
- EDHTop16 — https://edhtop16.com

North star: learn structural principles from controlled comparisons — not memorize winning 99s.