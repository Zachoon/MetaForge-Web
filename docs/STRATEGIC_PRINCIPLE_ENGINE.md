# Strategic Principle Engine

**Status:** observation / knowledge accumulation  
**Brain v1:** frozen  
**Exp001:** rejected  
**Exp002:** not implemented — registry may mark principles `promotable` but never activates them

## Success criterion

Old: make the Brain smarter.  
New: **discover strategic principles no human explicitly taught MetaForge.**

## Invariants

- Principles originate only from Field Intelligence evidence
- Supporting and contradicting evidence are both recorded
- Confidence history grows across research-store merges
- Transfer class is observational (`commander_specific` | `family_specific` | `cross_family` | `mixed`) — never auto-transfer
- `writesToBrain: false`, `activated: false`, `promoted: false` always in this engine
- Brain promotion still requires a Validation Harness experiment

## Modules

| Module | Role |
|---|---|
| `strategic-principle-schema.mjs` | `StrategicPrinciple` shape + status machine |
| `principle-lift.mjs` | Lift PSH + topology discovery → principles / Academy lessons |
| `principle-registry.mjs` | Merge with prior store, confidence evolution, registry artifact |
| `research-store.mjs` | Persist `strategic_principle` + `principle_evidence_delta` |

## Artifacts

After each FI run:

- `tests/field-intelligence/strategic-principles-registry.json`
- Academy lesson section in `FIELD_INTELLIGENCE_REPORT.md`
- Append-only rows in `research-store/observations.jsonl` when `--live` or `--persist-research`

## What is deferred

- Full negative learning (loser-enriched patterns)
- Alternate-theory contradiction mining (“two successful Kinnan theories”)
- Fancy aging dashboards beyond stored `confidenceHistory`

## Related

- `docs/FIELD_INTELLIGENCE_V1_3.md`
- `docs/INTERACTION_TOPOLOGY_RESEARCH.md`
- `docs/REJECTED_EXPERIMENTS.md`
- `docs/VALIDATION_HARNESS.md`
