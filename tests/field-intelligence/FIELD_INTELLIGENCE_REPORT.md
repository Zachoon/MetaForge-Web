# MetaForge Academy Report

## Provenance
```
Generated:              2026-08-11T00:58:35.360Z
Observation Window:     90 days
Events:                 44
Decks:                  359
Commanders:             118
TopDeck:                SUCCESS
Spicerack:              MISSING KEY
EDHTop16:               SCHEMA MISMATCH
Synthetic Fixtures:     NOT_USED
Corpus Mode:            live
Chunk Progress:         Days 1–30 ✓ / Days 31–60 ✓ / Days 61–90 ✓
```

## Source health
- **topdeck**: SUCCESS — latency=60915ms events=75 decks=359
  - ok
- **spicerack**: MISSING KEY — latency=0ms events=0 decks=0
  - missing_SPICERACK_API_KEY
- **edhtop16**: SCHEMA MISMATCH — latency=247ms events=0 decks=0
  - graphql_errors

## What changed since last run
- Question: What changed since last run?
- Prior run: 2026-08-10T21:54:13.778Z
- Store append: written=289 skipped=75
- Deltas: events=44 decks=359 commanders=118 principles=62

Brain v1 remains frozen. Principles never activate construction. Exp001 remains rejected.
Success criterion: discover strategic principles no human explicitly taught MetaForge.
Observation only — no Brain mutations, experiments, or promotions.

## Observation window
```
Last Days:                90
Maximum Events:           75
Maximum Decks/Event:      24
Minimum Participants:     16
Formats:                  Commander / cEDH
Prefer Top Cut:           true
Include Lower Comparison: true
Persistence:              append-only research store
Deduplicate:              true
```

## North star
Learn how elite players connect cards into functioning strategic systems — not merely which cards, roles, or quantities appear in winning decks.

## Corpus coverage
- Records ingested: **359**
- Decks analyzed: **359**
- Events represented: **44**
- Unique commanders: **118**
- Artifact version: **corpus-intelligence-v1.3**
- Live sample: `{"lastDays":90,"participantMin":16,"maxEvents":75,"maxDecksPerEvent":24,"preferTopCut":true,"includeLowerComparison":true,"lowerComparisonSlots":6,"topCutSlots":8,"formats":["EDH"],"spicerackFormats":["COMMANDER2"]}`
- Performance class distribution: `{"tournament_participant":175,"repeated_converter":146,"single_event_converter":38}`

## Forge Academy — Principle lessons
- Principle count: **133**
- By status: `{"candidate":71,"replicated_candidate":2,"promotable":49,"mixed":5,"contradicted":6,"rejected":0}`
- writesToBrain: **false**
- activateBrain: **false**

### Observation #1 — Structural signal on commanderConnectedCount
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: cross_family
- Finding: Converters show more/better commanderConnectedCount than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on commanderConnectedCount. Converters show more/better commanderConnectedCount than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #2 — Structural signal on curveLow
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: mixed
- Finding: Converters show more/better curveLow than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on curveLow. Converters show more/better curveLow than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #3 — Connected interaction beats raw interaction count
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: mixed
- Finding: Successful lists distinguish themselves by how interaction wires into the plan, not by packing more counters and removal. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Connected interaction beats raw interaction count. Successful lists distinguish themselves by how interaction wires into the plan, not by packing more counters and removal. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #4 — Structural signal on ix_commander_connected
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: cross_family
- Finding: Converters show more/better ix_commander_connected than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on ix_commander_connected. Converters show more/better ix_commander_connected than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #5 — Structural signal on packageCore
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: mixed
- Finding: Converters show more/better packageCore than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on packageCore. Converters show more/better packageCore than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #6 — Structural signal on ix_protection
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: cross_family
- Finding: Converters show more/better ix_protection than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on ix_protection. Converters show more/better ix_protection than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #7 — Structural signal on redundancy
- Status: **promotable** (candidate only)
- Confidence: **0.96**
- Independent events: **4**
- Families: Pearl-Ear, Imperial Advisor
- Transfer: mixed
- Finding: Converters show more/better redundancy than lower placers in controlled same-commander comparisons. within Pearl-Ear, Imperial Advisor
- Lesson: Academy lesson within Pearl-Ear, Imperial Advisor: Structural signal on redundancy. Converters show more/better redundancy than lower placers in controlled same-commander comparisons. Do not learn a staple list — learn the structural rule that produced the density advantage. This remains a candidate principle until a Validation Harness experiment earns promotion.

### Observation #8 — Graveyard plans need fill, reanimation, and protection together
- Status: **promotable** (candidate only)
- Confidence: **0.92**
- Independent events: **2**
- Families: n/a
- Transfer: commander_specific
- Finding: Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces.
- Lesson: Academy lesson: Graveyard plans need fill, reanimation, and protection together. Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

### Observation #9 — Graveyard plans need fill, reanimation, and protection together
- Status: **replicated_candidate** (candidate only)
- Confidence: **0.92**
- Independent events: **44**
- Families: n/a
- Transfer: cross_family
- Finding: Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces.
- Lesson: Academy lesson: Graveyard plans need fill, reanimation, and protection together. Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

### Observation #10 — Mana acceleration should unlock commander-linked payoffs
- Status: **candidate** (candidate only)
- Confidence: **0.92**
- Independent events: **0**
- Families: n/a
- Transfer: cross_family
- Finding: Acceleration without a convert/close path is a weaker structural signal than sequenced mana → commander → payoff.
- Lesson: Academy lesson: Mana acceleration should unlock commander-linked payoffs. Acceleration without a convert/close path is a weaker structural signal than sequenced mana → commander → payoff. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

## Promotable principles (NOT activated)
- sp:structure::commanderconnectedcount::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on commanderConnectedCount
- sp:structure::curvelow::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on curveLow
- sp:structure::interaction::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Connected interaction beats raw interaction count
- sp:structure::ix_commander_connected::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on ix_commander_connected
- sp:structure::package::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on packageCore
- sp:structure::protection::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on ix_protection
- sp:structure::redundancy::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on redundancy
- sp:sequence::gy_fill_reanimate_protect::signal::commander_specific: conf=0.92 events=2 — Graveyard plans need fill, reanimation, and protection together

## Corpus growth / marginal evidence
```json
{
  "version": "corpus-growth-v1",
  "liveSample": null,
  "current": {
    "events": 44,
    "decks": 359,
    "commanders": 118,
    "levelACohorts": 12,
    "levelATopologyCohorts": 12,
    "replicatedHypotheses": 2,
    "discoveryCandidates": 80,
    "principles": 133,
    "promotablePrinciples": 12
  },
  "prior": {
    "events": 0,
    "decks": 0,
    "commanders": 0,
    "levelACohorts": 0,
    "levelATopologyCohorts": 0,
    "replicatedHypotheses": 0,
    "discoveryCandidates": 0,
    "principles": 0,
    "promotablePrinciples": 0
  },
  "deltas": {
    "events": 44,
    "decks": 359,
    "commanders": 118,
    "levelACohorts": 12,
    "levelATopologyCohorts": 12,
    "replicatedHypotheses": 2,
    "discoveryCandidates": 80,
    "principles": 133,
    "promotablePrinciples": 12
  },
  "marginalEvidencePerNewEvent": {
    "levelACohorts": 0.273,
    "levelATopologyCohorts": 0.273,
    "replicatedHypotheses": 0.045,
    "discoveryCandidates": 1.818,
    "principles": 3.023,
    "decks": 8.159
  },
  "preferControlledComparisonsOverVolume": true
}
```

## Strategic relationship mining
```json
{
  "version": "strategic-topology-v1",
  "layer": "static",
  "dynamicPressureDeferred": true,
  "writesToBrain": false,
  "edgeOntology": [
    "supports",
    "protects_commander",
    "protects_engine",
    "protects_combo_or_close",
    "enables",
    "payoff_for",
    "feeds",
    "recovers",
    "tutors_for",
    "clears_path_for",
    "disrupts_for",
    "sequence_precedes",
    "multifunction_with",
    "commonly_cooccurs",
    "redundant_with",
    "substitutes_for"
  ],
  "recommendedExp002": "Prefer interaction that closes an uncovered strategic dependency (protects unprotected engine/combo/commander, or bridges a missing sequence stage) over interaction that merely increases interaction count/density."
}
```

## Topology metrics summary
```json
{
  "decks": 359,
  "meanMeaningfulEdgeDensity": 26.858,
  "meanPlanConnectedRatio": 0.618,
  "meanIsolatedRatio": 0.449,
  "meanMultifunctionRatio": 0.206
}
```

## Level-A topology (same commander + same event)
- Usable Level-A topology cohorts: **12**
- **Kinnan, Bonder Prodigy** @ `asgard-monthly-cedh-tournament-june-2026` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:13.333 (high_greater); interactionRedundancy:-5 (high_lesser); meanStrategicDegree:-1.45 (high_lesser); interactionDiversity:1 (high_greater)
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `asgard-monthly-cedh-tournament-june-2026` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:6.818 (high_greater); interactionRedundancy:-4 (high_lesser); isolatedInteractiveRatio:0.245 (high_greater); deadNarrowInteractionRisk:0.245 (high_greater)
- **Rograkh, Son of Rohgahh / Thrasios, Triton Hero** @ `cedh-singularity-series-4` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:6.349 (high_greater); interactionRedundancy:-4 (high_lesser); meanStrategicDegree:-0.921 (high_lesser); winSequenceProtectionCoverage:-0.077 (high_lesser)
- **Kediss, Emberclaw Familiar / Malcolm, Keen-Eyed Navigator** @ `mulligan-championship-series-june-w-guaranteed-volcanic` high=1 low=1
  - strongest topology: interactionDiversity:-5 (high_lesser); meaningfulEdgeDensity:-1.282 (high_lesser); commanderProtectionCoverage:-1 (high_lesser); engineProtectionCoverage:-0.9 (high_lesser)
- **Kinnan, Bonder Prodigy** @ `huddersfield-june-cedh-1` high=1 low=2
  - strongest topology: meaningfulEdgeDensity:4.474 (high_greater); interactionDiversity:3 (high_greater); commanderProtectionCoverage:0.5 (high_greater); interactionRedundancy:-0.5 (high_lesser)
- **Dargo, the Shipwrecker / Tymna the Weaver** @ `ddm-monthly-league-2` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:4.444 (high_greater); interactionRedundancy:-2 (high_lesser); meanStrategicDegree:0.922 (high_greater); winSequenceProtectionCoverage:0.27 (high_greater)
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `rockys-birthday-and-vtg-charity-tournament` high=1 low=2
  - strongest topology: meaningfulEdgeDensity:-2.778 (high_lesser); interactionRedundancy:1.5 (high_greater); meanStrategicDegree:-0.489 (high_lesser); isolatedInteractiveRatio:0.163 (high_greater)
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `goblin-con-euros-qualifier-win-a-dual` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:-2.476 (high_lesser); interactionRedundancy:2 (high_greater); isolatedInteractiveRatio:-0.318 (high_lesser); planConnectedInteractionRatio:0.318 (high_greater)
- **Kinnan, Bonder Prodigy** @ `goblin-con-euros-qualifier-win-a-dual` high=2 low=1
  - strongest topology: interactionDiversity:-2 (high_lesser); meaningfulEdgeDensity:-1.765 (high_lesser); meanStrategicDegree:-1.42 (high_lesser); engineProtectionCoverage:-0.395 (high_lesser)
- **Thrasios, Triton Hero / Tymna the Weaver** @ `1er-clasificatorio-nacional-cedh-2026-lista-reservada` high=1 low=1
  - strongest topology: meanStrategicDegree:1.729 (high_greater); meaningfulEdgeDensity:1.307 (high_greater); lowCmcInteractionCoverage:0.16 (high_greater); multifunctionInteractionRatio:0.072 (high_greater)
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `take-the-crown-03-bff` high=1 low=1
  - strongest topology: interactionRedundancy:-1 (high_lesser); meanStrategicDegree:0.313 (high_greater); isolatedInteractiveRatio:-0.125 (high_lesser); planConnectedInteractionRatio:0.125 (high_greater)
- **Ral, Monsoon Mage // Ral, Leyline Prodigy** @ `huddersfield-june-cedh-1` high=1 low=1
  - strongest topology: meaningfulEdgeDensity:0 (similar); isolatedInteractiveRatio:0 (similar); multifunctionInteractionRatio:0 (similar); planConnectedInteractionRatio:0 (similar)

### Kraum/Tymna topology focus
- (no usable Kraum/Tymna Level-A topology cohorts in this sample)

## Strategic sequences (structural, not play order)
- setup_engine_payoff: decks=357 events=44 conf=0.92 elite=common_tournament impliesGameOrder=false
- gy_fill_reanimate_protect: decks=346 events=44 conf=0.92 elite=common_tournament impliesGameOrder=false
- tutor_win_protection: decks=294 events=44 conf=0.92 elite=common_tournament impliesGameOrder=false
- silence_combo_sequence: decks=291 events=44 conf=0.92 elite=common_tournament impliesGameOrder=false
- mana_commander_payoff: decks=257 events=41 conf=0.92 elite=common_tournament impliesGameOrder=false

## Substitution evidence
- Geistwave ↔ Daze @ Ral, Monsoon Mage // Ral, Leyline Prodigy: xor=1 conf=0.88
- Grapeshot ↔ Volcanic Spite @ Ral, Monsoon Mage // Ral, Leyline Prodigy: xor=1 conf=0.88
- Lightning Bolt ↔ Volcanic Spite @ Ral, Monsoon Mage // Ral, Leyline Prodigy: xor=1 conf=0.88
- Tibalt's Trickery ↔ Volcanic Spite @ Ral, Monsoon Mage // Ral, Leyline Prodigy: xor=1 conf=0.88
- Untimely Malfunction ↔ Swan Song @ Ral, Monsoon Mage // Ral, Leyline Prodigy: xor=1 conf=0.88
- Chain of Vapor ↔ Miscast @ Kinnan, Bonder Prodigy: xor=1 conf=0.88
- Swan Song ↔ Snap @ Kinnan, Bonder Prodigy: xor=1 conf=0.88
- Mana Vault ↔ Sylvan Caryatid @ Kinnan, Bonder Prodigy: xor=0.96 conf=0.88
- Talisman of Curiosity ↔ Sylvan Caryatid @ Kinnan, Bonder Prodigy: xor=0.96 conf=0.88
- Mental Misstep ↔ Snap @ Kinnan, Bonder Prodigy: xor=0.958 conf=0.88
- Flusterstorm ↔ Snap @ Kinnan, Bonder Prodigy: xor=0.957 conf=0.88
- Thassa's Oracle ↔ Flamescroll Celebrant // Revel in Silence @ Kraum, Ludevic's Opus / Tymna the Weaver: xor=0.955 conf=0.88

## Contextual card functions (context-dependent)
- Context-dependent cards: **83**
- Flusterstorm: functions={"path_clear_for_win":161,"payoff_for":55,"sequence_precedes":21,"supports":2}
- The One Ring: functions={"engine_protection":58,"combo_protection":30,"payoff_for":6,"sequence_precedes":1}
- Swan Song: functions={"plan_preserving_disruption":160,"sequence_precedes":33,"payoff_for":1}
- An Offer You Can't Refuse: functions={"plan_preserving_disruption":164,"sequence_precedes":9,"engine_enabler":8}
- Chain of Vapor: functions={"plan_preserving_disruption":143,"recovery_for_plan_piece":9,"sequence_precedes":1}
- Agatha's Soul Cauldron: functions={"plan_preserving_disruption":46,"sequence_precedes":5,"engine_enabler":1}
- Legolas's Quick Reflexes: functions={"path_clear_for_win":22,"engine_protection":14,"combo_protection":2}
- Roaming Throne: functions={"combo_protection":12,"engine_protection":12,"unclassified":1}
- Colossal Skyturtle: functions={"engine_protection":9,"combo_protection":6,"plan_preserving_disruption":6}
- Archdruid's Charm: functions={"plan_preserving_disruption":11,"tutor_for_plan_piece":4,"engine_enabler":3}

## Topology discovery queue (no Brain writes)
- By kind: `{"topology_blind_spot_candidate":44,"sequence_blind_spot_candidate":5,"semantic_blind_spot_candidate":20,"substitution_candidate":59,"package_candidate":5}`
- writesToBrain: **false**
- sequence_blind_spot_candidate seq_blind_setup_engine_payoff: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_gy_fill_reanimate_protect: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_tutor_win_protection: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_silence_combo_sequence: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_mana_commander_payoff: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- substitution_candidate subst_geistwave__daze: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_grapeshot__volcanic spite: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_lightning bolt__volcanic spite: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_tibalt's trickery__volcanic spite: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_untimely malfunction__swan song: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_chain of vapor__miscast: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_swan song__snap: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_mana vault__sylvan caryatid: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_talisman of curiosity__sylvan caryatid: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_mental misstep__snap: conf=0.88 missing=strategic_footprint_substitution_clusters
- substitution_candidate subst_flusterstorm__snap: conf=0.88 missing=strategic_footprint_substitution_clusters

## Cross-commander topology transfer (never automatic)
- automaticTransfer: **false**
- disrupts_for: decks=359 events=44 class=cross_family
- enables: decks=359 events=44 class=cross_family
- feeds: decks=359 events=44 class=cross_family
- payoff_for: decks=359 events=44 class=cross_family
- multifunction_with: decks=353 events=44 class=cross_family
- clears_path_for: decks=347 events=44 class=cross_family
- recovers: decks=312 events=42 class=cross_family
- protects_combo_or_close: decks=303 events=44 class=cross_family
- protects_commander: decks=299 events=44 class=cross_family
- protects_engine: decks=297 events=44 class=cross_family

## Level-A forensics (v1.2 quantity/shape)
- Usable Level-A cohorts: **12**
- **Kinnan, Bonder Prodigy** @ `goblin-con-euros-qualifier-win-a-dual`: interactionDensity:26.5; curveLow:-1.5; roleDiversity:1.5
- **Kinnan, Bonder Prodigy** @ `huddersfield-june-cedh-1`: interactionDensity:-49.5; curveHigh:-2.5; curveLow:-2
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `rockys-birthday-and-vtg-charity-tournament`: interactionDensity:-11; curveLow:5; commanderConnectedCount:1.5
- **Dargo, the Shipwrecker / Tymna the Weaver** @ `ddm-monthly-league-2`: interactionDensity:-42; curveLow:-3; interactionCount:-3
- **Kediss, Emberclaw Familiar / Malcolm, Keen-Eyed Navigator** @ `mulligan-championship-series-june-w-guaranteed-volcanic`: interactionDensity:23; commanderConnectedCount:4; curveLow:-3
- **Kinnan, Bonder Prodigy** @ `asgard-monthly-cedh-tournament-june-2026`: interactionDensity:-147; curveHigh:20; curveLow:-16
- **Ral, Monsoon Mage // Ral, Leyline Prodigy** @ `huddersfield-june-cedh-1`: commanderAlignment:0; commanderConnectedCount:0; curveHigh:0
- **Rograkh, Son of Rohgahh / Silas Renn, Seeker Adept** @ `asgard-monthly-cedh-tournament-june-2026`: interactionDensity:112; interactionCount:-4; spell_interaction:-3

## Repeated converter topology signatures
```json
{
  "repeated_converter": {
    "n": 146,
    "meanPlanConnectedRatio": 0.618,
    "meanIsolatedRatio": 0.416,
    "meanMultifunctionRatio": 0.221,
    "meanMeaningfulEdgeDensity": 26.223,
    "meanCommanderProtection": 0.863,
    "meanEngineProtection": 0.788
  },
  "single_event_converter": {
    "n": 38,
    "meanPlanConnectedRatio": 0.631,
    "meanIsolatedRatio": 0.474,
    "meanMultifunctionRatio": 0.188,
    "meanMeaningfulEdgeDensity": 30.121,
    "meanCommanderProtection": 0.816,
    "meanEngineProtection": 0.732
  },
  "tournament_participant": {
    "n": 175,
    "meanPlanConnectedRatio": 0.615,
    "meanIsolatedRatio": 0.47,
    "meanMultifunctionRatio": 0.198,
    "meanMeaningfulEdgeDensity": 26.679,
    "meanCommanderProtection": 0.811,
    "meanEngineProtection": 0.748
  }
}
```

## Recommended Brain v2 Exp002 (NOT implemented)
Prefer interaction that closes an uncovered strategic dependency (protects unprotected engine/combo/commander, or bridges a missing sequence stage) over interaction that merely increases interaction count/density.

## Highest-confidence legacy Brain v2 candidate gate (NOT implemented)
```json
{
  "implementBrainV2": false,
  "brainV1RemainsFrozen": true,
  "candidateChangedBecauseOfBridge": false,
  "strongestAgreement": {
    "kind": "package_core_density",
    "packageId": "reanimator",
    "brainTheory": 6,
    "corpusWeightedMean": 6.79,
    "corpusP25": 7,
    "corpusP75": 7,
    "n": 5,
    "note": "human_and_brain_converge"
  },
  "firstCandidate": {
    "kind": "replicated_level_a_structure",
    "hypothesisId": "psh:kinnan, bonder prodigy:curveLow",
    "feature": "curveLow",
    "classification": "brain_missing_concept",
    "confidence": 0.9,
    "weightedEffect": -5.313,
    "summary": "Replicated Level-A signal on curveLow: Brain classification brain_missing_concept",
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
  "levelAUsableCohorts": 12,
  "replicatedHypotheses": 2,
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

## Attribution
- TopDeck.gg — https://topdeck.gg
- Spicerack — https://spicerack.gg
- cEDH Decklist Database — https://cedh-decklist-database.com/
- EDHREC — https://edhrec.com
- EDHTop16 — https://edhtop16.com

North star: accumulate strategic principles over years — not heuristics.