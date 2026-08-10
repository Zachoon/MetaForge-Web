# MetaForge Field Intelligence — Strategic Principles + Relationship Mining

Brain v1 remains frozen. Principles never activate construction. Exp001 remains rejected.
Success criterion: discover strategic principles no human explicitly taught MetaForge.

## North star
Learn how elite players connect cards into functioning strategic systems — not merely which cards, roles, or quantities appear in winning decks.

## Corpus coverage
- Records ingested: **128**
- Decks analyzed: **128**
- Events represented: **16**
- Unique commanders: **7**
- Artifact version: **corpus-intelligence-v1.3**
- Live sample: `{"lastDays":60,"participantMin":16,"maxEvents":40,"maxDecksPerEvent":20,"preferTopCut":true,"includeLowerComparison":true,"lowerComparisonSlots":6,"topCutSlots":8,"formats":["EDH"],"spicerackFormats":["COMMANDER2"]}`
- Performance class distribution: `{"repeated_converter":48,"tournament_participant":80}`

## Forge Academy — Principle lessons
- Principle count: **71**
- By status: `{"candidate":25,"replicated_candidate":6,"promotable":40,"mixed":0,"contradicted":0,"rejected":0}`
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
- Status: **candidate** (candidate only)
- Confidence: **0.92**
- Independent events: **0**
- Families: n/a
- Transfer: commander_specific
- Finding: Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces.
- Lesson: Academy lesson: Graveyard plans need fill, reanimation, and protection together. Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

### Observation #9 — Mana acceleration should unlock commander-linked payoffs
- Status: **candidate** (candidate only)
- Confidence: **0.92**
- Independent events: **0**
- Families: n/a
- Transfer: cross_family
- Finding: Acceleration without a convert/close path is a weaker structural signal than sequenced mana → commander → payoff.
- Lesson: Academy lesson: Mana acceleration should unlock commander-linked payoffs. Acceleration without a convert/close path is a weaker structural signal than sequenced mana → commander → payoff. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

### Observation #10 — Setup must reach an engine before a payoff
- Status: **candidate** (candidate only)
- Confidence: **0.92**
- Independent events: **0**
- Families: n/a
- Transfer: cross_family
- Finding: Structural chains of setup → engine → payoff recur in successful lists; decklist order is not play order.
- Lesson: Academy lesson: Setup must reach an engine before a payoff. Structural chains of setup → engine → payoff recur in successful lists; decklist order is not play order. Structural sequence dependencies are not reconstructed game orders. Candidate only — Brain unchanged.

## Promotable principles (NOT activated)
- sp:structure::commanderconnectedcount::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on commanderConnectedCount
- sp:structure::curvelow::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on curveLow
- sp:structure::interaction::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Connected interaction beats raw interaction count
- sp:structure::ix_commander_connected::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on ix_commander_connected
- sp:structure::package::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on packageCore
- sp:structure::protection::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on ix_protection
- sp:structure::redundancy::high_greater::pearl-ear, imperial advisor: conf=0.96 events=4 — Structural signal on redundancy
- sp:structure::commanderconnectedcount::high_greater::test grave tutor: conf=0.81 events=2 — Structural signal on commanderConnectedCount

## Corpus growth / marginal evidence
```json
{
  "version": "corpus-growth-v1",
  "liveSample": null,
  "current": {
    "events": 16,
    "decks": 128,
    "commanders": 7,
    "levelACohorts": 16,
    "levelATopologyCohorts": 16,
    "replicatedHypotheses": 46,
    "discoveryCandidates": 78,
    "principles": 71,
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
    "events": 16,
    "decks": 128,
    "commanders": 7,
    "levelACohorts": 16,
    "levelATopologyCohorts": 16,
    "replicatedHypotheses": 46,
    "discoveryCandidates": 78,
    "principles": 71,
    "promotablePrinciples": 12
  },
  "marginalEvidencePerNewEvent": {
    "levelACohorts": 1,
    "levelATopologyCohorts": 1,
    "replicatedHypotheses": 2.875,
    "discoveryCandidates": 4.875,
    "principles": 4.438,
    "decks": 8
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
  "decks": 128,
  "meanMeaningfulEdgeDensity": 16.6,
  "meanPlanConnectedRatio": 0.745,
  "meanIsolatedRatio": 0.48,
  "meanMultifunctionRatio": 0
}
```

## Level-A topology (same commander + same event)
- Usable Level-A topology cohorts: **16**
- **Test Grave Tutor** @ `fixture-cedh-reanimator-0` high=3 low=5
  - strongest topology: strongEdgeCount:178 (high_greater); meaningfulEdgeDensity:14.833 (high_greater); meanStrategicDegree:-7.25 (high_lesser); interactionDiversity:-1 (high_lesser)
- **Test Grave Tutor** @ `fixture-cedh-reanimator-1` high=3 low=5
  - strongest topology: strongEdgeCount:178 (high_greater); meaningfulEdgeDensity:14.833 (high_greater); meanStrategicDegree:-7.25 (high_lesser); interactionDiversity:-1 (high_lesser)
- **Test Equipment Marshal** @ `fixture-cedh-equipment-voltron-0` high=3 low=5
  - strongest topology: strongEdgeCount:111 (high_greater); meaningfulEdgeDensity:5.059 (high_greater); interactionRedundancy:4 (high_greater); meanStrategicDegree:-3.103 (high_lesser)
- **Test Equipment Marshal** @ `fixture-cedh-equipment-voltron-1` high=3 low=5
  - strongest topology: strongEdgeCount:111 (high_greater); meaningfulEdgeDensity:5.059 (high_greater); interactionRedundancy:4 (high_greater); meanStrategicDegree:-3.103 (high_lesser)
- **Test Flicker Guide** @ `fixture-cedh-blink-etb-0` high=3 low=5
  - strongest topology: strongEdgeCount:100 (high_greater); meaningfulEdgeDensity:3.333 (high_greater); interactionDiversity:1 (high_greater); isolatedInteractiveRatio:0 (similar)
- **Test Flicker Guide** @ `fixture-cedh-blink-etb-1` high=3 low=5
  - strongest topology: strongEdgeCount:100 (high_greater); meaningfulEdgeDensity:3.333 (high_greater); interactionDiversity:1 (high_greater); isolatedInteractiveRatio:0 (similar)
- **Pearl-Ear, Imperial Advisor** @ `sp-fixture-cedh-pearl-ear-auras-0` high=3 low=5
  - strongest topology: interactionRedundancy:18 (high_greater); meaningfulEdgeDensity:-3.737 (high_lesser); interactionDiversity:-1 (high_lesser); winSequenceProtectionCoverage:-0.76 (high_lesser)
- **Pearl-Ear, Imperial Advisor** @ `sp-fixture-cedh-pearl-ear-auras-1` high=3 low=5
  - strongest topology: interactionRedundancy:18 (high_greater); meaningfulEdgeDensity:-3.737 (high_lesser); interactionDiversity:-1 (high_lesser); winSequenceProtectionCoverage:-0.76 (high_lesser)
- **Pearl-Ear, Imperial Advisor** @ `fixture-cedh-pearl-ear-auras-0` high=3 low=5
  - strongest topology: interactionRedundancy:18 (high_greater); meaningfulEdgeDensity:-3.737 (high_lesser); interactionDiversity:-1 (high_lesser); winSequenceProtectionCoverage:-0.76 (high_lesser)
- **Pearl-Ear, Imperial Advisor** @ `fixture-cedh-pearl-ear-auras-1` high=3 low=5
  - strongest topology: interactionRedundancy:18 (high_greater); meaningfulEdgeDensity:-3.737 (high_lesser); interactionDiversity:-1 (high_lesser); winSequenceProtectionCoverage:-0.76 (high_lesser)
- **Test Spell Echo** @ `fixture-cedh-spellslinger-0` high=3 low=5
  - strongest topology: meaningfulEdgeDensity:-17.778 (high_lesser); interactionRedundancy:8 (high_greater); interactionDiversity:3 (high_greater); meanStrategicDegree:-1.311 (high_lesser)
- **Test Spell Echo** @ `fixture-cedh-spellslinger-1` high=3 low=5
  - strongest topology: meaningfulEdgeDensity:-17.778 (high_lesser); interactionRedundancy:8 (high_greater); interactionDiversity:3 (high_greater); meanStrategicDegree:-1.311 (high_lesser)

### Kraum/Tymna topology focus
- (no usable Kraum/Tymna Level-A topology cohorts in this sample)

## Strategic sequences (structural, not play order)
- setup_engine_payoff: decks=32 events=4 conf=0.92 elite=common_tournament impliesGameOrder=false
- mana_commander_payoff: decks=32 events=4 conf=0.92 elite=common_tournament impliesGameOrder=false
- tutor_win_protection: decks=26 events=6 conf=0.92 elite=common_tournament impliesGameOrder=false
- gy_fill_reanimate_protect: decks=16 events=2 conf=0.92 elite=common_tournament impliesGameOrder=false

## Substitution evidence
- (none)

## Contextual card functions (context-dependent)
- Context-dependent cards: **19**
- Aura Piece 21: functions={"combo_protection":20,"engine_protection":12}
- Aura Piece 3: functions={"combo_protection":40,"commander_protection":24}
- Aura Piece 4: functions={"combo_protection":40,"commander_protection":24}
- Aura Piece 5: functions={"combo_protection":40,"commander_protection":24}
- Aura Piece 6: functions={"commander_protection":24,"combo_protection":20}
- Aura Piece 7: functions={"commander_protection":24,"combo_protection":20}
- Aura Piece 8: functions={"commander_protection":24,"combo_protection":20}
- Aura Piece 9: functions={"commander_protection":24,"combo_protection":20}
- Ward 0: functions={"commander_protection":12,"engine_protection":6}
- Ward 1: functions={"commander_protection":12,"engine_protection":6}

## Topology discovery queue (no Brain writes)
- By kind: `{"topology_blind_spot_candidate":46,"sequence_blind_spot_candidate":4,"semantic_blind_spot_candidate":28,"substitution_candidate":0,"package_candidate":0}`
- writesToBrain: **false**
- sequence_blind_spot_candidate seq_blind_setup_engine_payoff: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_mana_commander_payoff: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_tutor_win_protection: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- sequence_blind_spot_candidate seq_blind_gy_fill_reanimate_protect: conf=0.92 missing=construction_preference_for_covered_strategic_sequences
- topology_blind_spot_candidate topo_blind_test grave tutor_strongEdgeCount_fixture-cedh-reanimator-0: conf=0.9 missing=strategic_topology_metric:strongEdgeCount
- topology_blind_spot_candidate topo_blind_test grave tutor_meaningfulEdgeDensity_fixture-cedh-reanimator-0: conf=0.9 missing=strategic_topology_metric:meaningfulEdgeDensity
- topology_blind_spot_candidate topo_blind_test grave tutor_meanStrategicDegree_fixture-cedh-reanimator-0: conf=0.9 missing=strategic_topology_metric:meanStrategicDegree
- topology_blind_spot_candidate topo_blind_test grave tutor_interactionDiversity_fixture-cedh-reanimator-0: conf=0.9 missing=strategic_topology_metric:interactionDiversity
- topology_blind_spot_candidate topo_blind_test grave tutor_strongEdgeCount_fixture-cedh-reanimator-1: conf=0.9 missing=strategic_topology_metric:strongEdgeCount
- topology_blind_spot_candidate topo_blind_test grave tutor_meaningfulEdgeDensity_fixture-cedh-reanimator-1: conf=0.9 missing=strategic_topology_metric:meaningfulEdgeDensity
- topology_blind_spot_candidate topo_blind_test grave tutor_meanStrategicDegree_fixture-cedh-reanimator-1: conf=0.9 missing=strategic_topology_metric:meanStrategicDegree
- topology_blind_spot_candidate topo_blind_test grave tutor_interactionDiversity_fixture-cedh-reanimator-1: conf=0.9 missing=strategic_topology_metric:interactionDiversity
- topology_blind_spot_candidate topo_blind_test equipment marshal_strongEdgeCount_fixture-cedh-equipment-voltron-0: conf=0.9 missing=strategic_topology_metric:strongEdgeCount
- topology_blind_spot_candidate topo_blind_test equipment marshal_meaningfulEdgeDensity_fixture-cedh-equipment-voltron-0: conf=0.9 missing=strategic_topology_metric:meaningfulEdgeDensity
- topology_blind_spot_candidate topo_blind_test equipment marshal_interactionRedundancy_fixture-cedh-equipment-voltron-0: conf=0.9 missing=strategic_topology_metric:interactionRedundancy
- topology_blind_spot_candidate topo_blind_test equipment marshal_meanStrategicDegree_fixture-cedh-equipment-voltron-0: conf=0.9 missing=strategic_topology_metric:meanStrategicDegree

## Cross-commander topology transfer (never automatic)
- automaticTransfer: **false**
- disrupts_for: decks=128 events=16 class=cross_family
- sequence_precedes: decks=54 events=8 class=cross_family
- protects_commander: decks=38 events=6 class=cross_family
- protects_engine: decks=38 events=6 class=cross_family
- enables: decks=38 events=6 class=cross_family
- feeds: decks=38 events=6 class=cross_family
- payoff_for: decks=38 events=6 class=cross_family
- protects_combo_or_close: decks=26 events=6 class=cross_family
- recovers: decks=16 events=2 class=commander_specific
- supports: decks=10 events=2 class=commander_specific

## Level-A forensics (v1.2 quantity/shape)
- Usable Level-A cohorts: **16**
- **Pearl-Ear, Imperial Advisor** @ `fixture-cedh-pearl-ear-auras-0`: interactionDensity:123; commanderConnectedCount:18; ix_commander_connected:18
- **Pearl-Ear, Imperial Advisor** @ `fixture-cedh-pearl-ear-auras-1`: interactionDensity:123; commanderConnectedCount:18; ix_commander_connected:18
- **Pearl-Ear, Imperial Advisor** @ `sp-fixture-cedh-pearl-ear-auras-0`: interactionDensity:123; commanderConnectedCount:18; ix_commander_connected:18
- **Pearl-Ear, Imperial Advisor** @ `sp-fixture-cedh-pearl-ear-auras-1`: interactionDensity:123; commanderConnectedCount:18; ix_commander_connected:18
- **Test Aristocrat** @ `fixture-cedh-aristocrats-0`: interactionDensity:30; packageHealth:10; threat_value_engine:8
- **Test Aristocrat** @ `fixture-cedh-aristocrats-1`: interactionDensity:30; packageHealth:10; threat_value_engine:8
- **Test Equipment Marshal** @ `fixture-cedh-equipment-voltron-0`: interactionDensity:130; packageHealth:18; ramp:-10
- **Test Equipment Marshal** @ `fixture-cedh-equipment-voltron-1`: interactionDensity:130; packageHealth:18; ramp:-10

## Repeated converter topology signatures
```json
{
  "repeated_converter": {
    "n": 48,
    "meanPlanConnectedRatio": 0.75,
    "meanIsolatedRatio": 0.519,
    "meanMultifunctionRatio": 0,
    "meanMeaningfulEdgeDensity": 16.441,
    "meanCommanderProtection": 0.375,
    "meanEngineProtection": 0.372
  },
  "single_event_converter": {
    "n": 0
  },
  "tournament_participant": {
    "n": 80,
    "meanPlanConnectedRatio": 0.743,
    "meanIsolatedRatio": 0.457,
    "meanMultifunctionRatio": 0,
    "meanMeaningfulEdgeDensity": 16.695,
    "meanCommanderProtection": 0.25,
    "meanEngineProtection": 0.249
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
  "strongestAgreement": null,
  "firstCandidate": {
    "kind": "replicated_level_a_structure",
    "hypothesisId": "psh:test spell echo:interaction",
    "feature": "interactionDensity",
    "classification": "brain_underweights",
    "confidence": 0.9,
    "weightedEffect": 680.5,
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
  "levelAUsableCohorts": 16,
  "replicatedHypotheses": 46,
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