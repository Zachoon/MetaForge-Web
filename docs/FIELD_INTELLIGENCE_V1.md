# MetaForge Field Intelligence v1.2 — Level-A Converter Forensics

Live semantic bridge accepted. Brain v1 remains frozen. Do **not** implement Brain v2 from this batch.

## North star

When equally situated players bring the **same commander** into the **same tournament**, what structural decisions consistently distinguish converters from non-converters?

## Pipeline order

```
ingest → enrich → analyze (Brain v1 observation)
→ family resolve → cohorts A–D
→ Level-A forensics → PerformanceStructureHypothesis replication
→ Brain classification / blind spots / transfer validation
→ evidence gate (report only)
```

## Level-A forensics

For every usable same-commander + same-event cohort:

- normalized feature deltas (absolute, share, high/low mean, magnitude, n, confidence)
- role-balance fingerprints
- threat / spell / interaction diagnostic decompositions (observation only)
- single-event results stay `single_event_lead` until replicated

## Replication statuses

| Status | Meaning |
|--------|---------|
| `single_event_lead` | Interesting; not Brain v2 evidence |
| `replicated` | Same direction across ≥2 Level-A events |
| `mixed` / `contradicted` | Direction disagrees across events |
| `insufficient_sample` | Too thin to interpret |

## Brain v2 evidence gate

Prefer:

- controlled Level-A evidence
- replication across events **or** strong cross-family confirmation
- adequate semantic coverage
- meaningful effect magnitude
- anti-netdeck compatibility

Single-event correlations remain research leads only.

## Commands

```powershell
npm run validate:field-intelligence
npm run report:field-intelligence

$env:TOPDECK_API_KEY="YOUR_KEY_HERE"
npm run report:field-intelligence:live
```

Live mode enriches via Scryfall automatically. Do not commit API keys.
