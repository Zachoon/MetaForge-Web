export default Object.freeze({
  "writesToBrain": false,
  "version": "strategic-hypothesis-snapshot-v0",
  "brainInheritance": "none",
  "generatedAt": "2026-08-12T02:10:59.694Z",
  "counts": {
    "total": 5,
    "strongly_supported": 1,
    "emerging": 2,
    "contradicted": 2,
    "retired": 0
  },
  "hypotheses": [
    {
      "writesToBrain": false,
      "activated": false,
      "promoted": false,
      "namingIsNotPromotion": true,
      "version": "strategic-hypothesis-v0",
      "kind": "StrategicHypothesis",
      "id": "hyp-replicated-rograkh-son-of-rohgahh-thrasios-triton-hero",
      "claim": "Rograkh, Son of Rohgahh / Thrasios, Triton Hero: elite converters repeatedly center on role:threat replicated in 22/22 decks",
      "subject": "Rograkh, Son of Rohgahh / Thrasios, Triton Hero",
      "state": "strongly_supported",
      "evidence": {
        "tournament": "high",
        "experts": "none",
        "shadow": "none",
        "simulation": "none",
        "notes": [
          "Live window decks=359 events=44",
          "Primary plan role:threat replicated in 22/22 decks"
        ]
      },
      "prediction": {
        "windowDays": 90,
        "expectToObserve": [
          "Continued high share of the same primary plan for Rograkh, Son of Rohgahh / Thrasios, Triton Hero",
          "New converter lists in this family should not flip to an unrelated primary plan without event-level contradiction"
        ],
        "note": null
      },
      "retirementCriteria": [
        "Primary plan share falls below 50% across ≥3 independent events in the next 60 days",
        "OR a competing primary plan reaches ≥40% share with converters in ≥2 events"
      ],
      "uniquenessAngle": null,
      "confidence": {
        "level": "high",
        "score": 0.75
      },
      "sources": [
        {
          "kind": "elite_tournament_intelligence",
          "label": "live-topdeck-cache"
        }
      ],
      "brainInheritance": "none"
    },
    {
      "writesToBrain": false,
      "activated": false,
      "promoted": false,
      "namingIsNotPromotion": true,
      "version": "strategic-hypothesis-v0",
      "kind": "StrategicHypothesis",
      "id": "hyp-contested-kinnan-bonder-prodigy",
      "claim": "Kinnan, Bonder Prodigy does not have a single settled primary plan — role:threat vs role:artifacts remain competitive in elite lists.",
      "subject": "Kinnan, Bonder Prodigy",
      "state": "contradicted",
      "evidence": {
        "tournament": "high",
        "experts": "none",
        "shadow": "none",
        "simulation": "none",
        "notes": [
          "sampleSize=25",
          "independentEvents=19",
          "Competing primary plans observed: role:threat vs role:artifacts"
        ]
      },
      "prediction": {
        "windowDays": 90,
        "expectToObserve": [
          "Both named plans continue to appear among converters",
          "OR one plan pulls ahead (≥70% share) and the contradiction retires into a strongly_supported successor"
        ],
        "note": null
      },
      "retirementCriteria": [
        "One primary plan exceeds 70% share across the next 60 days with ≥3 independent events",
        "OR sample collapses below usable confidence (insufficient_sample)"
      ],
      "uniquenessAngle": "A unique angle may exist by committing harder to the under-represented competing plan while the field splits attention.",
      "confidence": {
        "level": "contested",
        "score": 0.35
      },
      "sources": [
        {
          "kind": "elite_contradiction",
          "label": "Kinnan, Bonder Prodigy"
        }
      ],
      "brainInheritance": "none"
    },
    {
      "writesToBrain": false,
      "activated": false,
      "promoted": false,
      "namingIsNotPromotion": true,
      "version": "strategic-hypothesis-v0",
      "kind": "StrategicHypothesis",
      "id": "hyp-contested-kraum-ludevic-s-opus-tymna-the-weaver",
      "claim": "Kraum, Ludevic's Opus / Tymna the Weaver does not have a single settled primary plan — role:ramp vs role:artifacts remain competitive in elite lists.",
      "subject": "Kraum, Ludevic's Opus / Tymna the Weaver",
      "state": "contradicted",
      "evidence": {
        "tournament": "high",
        "experts": "none",
        "shadow": "none",
        "simulation": "none",
        "notes": [
          "sampleSize=22",
          "independentEvents=18",
          "Competing primary plans observed: role:ramp vs role:artifacts"
        ]
      },
      "prediction": {
        "windowDays": 90,
        "expectToObserve": [
          "Both named plans continue to appear among converters",
          "OR one plan pulls ahead (≥70% share) and the contradiction retires into a strongly_supported successor"
        ],
        "note": null
      },
      "retirementCriteria": [
        "One primary plan exceeds 70% share across the next 60 days with ≥3 independent events",
        "OR sample collapses below usable confidence (insufficient_sample)"
      ],
      "uniquenessAngle": "A unique angle may exist by committing harder to the under-represented competing plan while the field splits attention.",
      "confidence": {
        "level": "contested",
        "score": 0.35
      },
      "sources": [
        {
          "kind": "elite_contradiction",
          "label": "Kraum, Ludevic's Opus / Tymna the Weaver"
        }
      ],
      "brainInheritance": "none"
    },
    {
      "writesToBrain": false,
      "activated": false,
      "promoted": false,
      "namingIsNotPromotion": true,
      "version": "strategic-hypothesis-v0",
      "kind": "StrategicHypothesis",
      "id": "hyp-shadow-curvelow",
      "claim": "Elite converter structure surfaces \"curveLow\" as strategically meaningful, but Brain v1 does not encode it as a construction concept.",
      "subject": "curveLow",
      "state": "emerging",
      "evidence": {
        "tournament": "medium",
        "experts": "none",
        "shadow": "high",
        "simulation": "none",
        "notes": [
          "concept not found in Brain v1 encoded surfaces",
          "shadowConfidence=0.9"
        ]
      },
      "prediction": {
        "windowDays": 90,
        "expectToObserve": [
          "Level-A / converter cohorts continue to show measurable curveLow effects",
          "If the effect fails replication, this hypothesis retires without Brain inheritance"
        ],
        "note": null
      },
      "retirementCriteria": [
        "Fails replication in Level-A cohorts over the next 60 days",
        "OR shadow classification flips to brain_agrees on holdout"
      ],
      "uniquenessAngle": "Not a modal 99 copy — a structural seat Brain may be under-preparing for.",
      "confidence": {
        "level": "moderate",
        "score": 0.55
      },
      "sources": [
        {
          "kind": "brain_shadow",
          "label": "corpus-intelligence-artifact"
        }
      ],
      "brainInheritance": "none"
    },
    {
      "writesToBrain": false,
      "activated": false,
      "promoted": false,
      "namingIsNotPromotion": true,
      "version": "strategic-hypothesis-v0",
      "kind": "StrategicHypothesis",
      "id": "hyp-expert-sequencing",
      "claim": "Expert reasoning independently recurs on \"sequencing\" as a decision concept — still observation-only, not Brain behavior.",
      "subject": "sequencing",
      "state": "emerging",
      "evidence": {
        "tournament": "none",
        "experts": "high",
        "shadow": "none",
        "simulation": "none",
        "notes": [
          "independentExperts=3",
          "authors=expert_a_hof, expert_c_coach, expert_d_analyst"
        ]
      },
      "prediction": {
        "windowDays": 90,
        "expectToObserve": [
          "Additional independent expert sources continue to invoke this concept",
          "AND/OR tournament structure language maps onto the same seat (not automatic)"
        ],
        "note": null
      },
      "retirementCriteria": [
        "No further independent expert replication in the next Stream 002 slice",
        "OR concept remains vocabulary-only with zero structural mapping after review"
      ],
      "uniquenessAngle": null,
      "confidence": {
        "level": "limited",
        "score": 0.4
      },
      "sources": [
        {
          "kind": "expert_strategy_corpus",
          "label": "stream-002"
        }
      ],
      "brainInheritance": "none"
    }
  ]
});
