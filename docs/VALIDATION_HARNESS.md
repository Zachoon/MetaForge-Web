# MetaForge Validation Harness

> Status: **field-test instrumentation** — does not change construction policy  
> Architecture freeze: reasoning brain locked pending evidence from this harness  
> Companion: `docs/REASONING_PIPELINE.md`

## Why this exists

Self-Evaluation + weak-slot forensics matured the loop from:

```
invent → hope → tweak
```

to:

```
observe → classify → intervene → rerun → compare
```

The brain has earned a field test. This harness is that field test.

**Do not invent Brain Sprint 2 from intuition.** Let aggregated evidence decide the next fix class.

## Explicit non-goals

- No new strategic planning layer
- No construction weight changes
- No commander-specific production branches
- No lowering torture / hardening standards to force green reports
- No pretending synthetic pools are EDHREC truth (real-list comparison is a later phase)

## What it does

```
Corpus of commanders (fixtures × seeds [× future real lists])
        ↓
forgeNativeMasterwork (frozen brain)
        ↓
Record: torture scorecard + selfEvaluation + weakSlotForensics
        ↓
Aggregate across the run
        ↓
Compare to frozen baseline (optional)
        ↓
Emit machine-readable report + human summary
```

### Report sections

1. **Hard gate health** — hard failures, pass rate  
2. **Self-Evaluation controls** — drift classes, control cases, emergence, oversupply  
3. **Weak-slot field health** — weak count, avoidable vs constraint-forced, source/phase  
4. **Top recurring failure / drift classes** — prioritized evidence buckets  
5. **Archetypes helped / harmed vs baseline** — transfer check  
6. **Suggested next engineering focus** — derived from counts, not invented layers  
7. **Regression flags** — hard fails ↑, avoidable weak ↑, emergence collapse, etc.

## Commands

```bash
# Smoke: locked 13-fixture matrix, seed 11 (same as torture bench)
node tests/validation-harness/run.mjs --mode smoke

# Field sample: fixtures × several seeds
node tests/validation-harness/run.mjs --mode field --seeds 11,13,17,19,23,29,31,37

# Larger run (cap forges)
node tests/validation-harness/run.mjs --mode field --seeds 11,13,17,19,23,29,31,37,41,43 --limit 200

# Compare against frozen post-weak-slot baseline
node tests/validation-harness/run.mjs --mode smoke --baseline tests/commander-torture-bench/weak-slot-forensics-after-cleanup.json
```

Artifacts land in `tests/validation-harness/out/`.

## Architecture freeze rules

**Brain v1 is frozen.**

Until Brain Sprint 2 is explicitly opened by repeated field evidence:

1. Do not add planning abstractions in `web/app/*` construction path  
2. Do not retune prospective / ledger / closure thresholds “to make the report prettier”  
3. Harness and report code may grow freely  
4. Hardening + torture + weak-slot forensics tests must stay green  
5. Compare runs with **per-forge rates**, not absolute totals across different corpus sizes  

### Frozen benchmark

`tests/validation-harness/brain-v1-frozen-benchmark.json`  
First true frozen-engine field benchmark: **13 fixtures × 8 seeds = 104 forges**.

```bash
# Re-check against the frozen benchmark (rate-normalized)
node tests/validation-harness/run.mjs --mode field --limit 104 \
  --baseline tests/validation-harness/brain-v1-frozen-benchmark.json
```

## Next milestone: MetaForge Field Validation

Not another reasoning layer.

1. **Golden commander canaries** with stable expected rates — `npm run validate:golden`  
2. **Real / tournament-shaped corpus into the same report shape** — `npm run validate:harness:real-corpus`
   - Adapter: `app/validation-harness-corpus.mjs`
   - Offline default: competitive fixture corpus (tournament-shaped; provenance disclosed — not live EDHREC truth)
   - Same `validation-report-v1` contract as smoke/field; import path observation only
3. Weekly trend reports once real corpora are representative  
4. Nightly automation last  


### Golden canaries (Brain v1)

13 archetypes from the torture matrix. Expected per-forge rates and per-archetype weak ceilings live in `tests/validation-harness/golden-commanders.mjs`.

```bash
npm run validate:golden
```

A golden failure means: **do not merge construction changes.**

Rule:

> No new reasoning layer until repeated field evidence earns one.

Engineering release record: `docs/BRAIN_V1_ENGINEERING_RELEASE.md`
