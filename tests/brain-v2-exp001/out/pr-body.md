## Summary

**This is an engineering infrastructure merge, not a brain behavior promotion.**

Brain v1 remains the production engine.

This PR merges the research and validation infrastructure that will govern future brain evolution. No default construction behavior changes from Experiment 001 are included. Experiment 001 remains available behind an explicit opt-in flag and is documented as **rejected** based on Validation Harness results.

### Merge (infrastructure)

- Field Intelligence pipeline (live tournament ingestion, semantic bridge, Level-A forensics)
- Validation Harness, golden canaries, commander torture bench, Self-Evaluation
- Experiment framework + policy flags (`brain_v1_control` default)
- `docs/REJECTED_EXPERIMENTS.md` (starts with Exp001)
- `docs/INTERACTION_TOPOLOGY_RESEARCH.md` (next research agenda: relationships, not scores)
- Supporting documentation and reporting

### Explicitly not merged as default behavior

- `brain_v2_exp001_interaction` is **opt-in only**
- No coefficient promotion into default construction
- No Exp001 construction-policy activation
- Default `forgeNativeMasterwork(...)` resolves to `brain_v1_control`

Exp001 failed honestly at the wrong abstraction level (weights vs interaction topology). Keeping it in-repo as rejected institutional memory prevents re-opening the same dead end.

## Test plan

- [x] Brain v1 frozen benchmark present and used as control baseline
- [x] Golden canaries pass (`npm run validate:golden`)
- [x] Exp001 unit gates pass (`npm run validate:brain-v2-exp001`) — control unchanged; Casual isolation holds; Exp001 opt-in only
- [x] Field Intelligence tests pass (`npm run validate:field-intelligence`)
- [x] Default policy is `brain_v1_control` (implicit forge ≡ explicit control)
- [ ] Reviewers confirm PR description: infrastructure release, not Exp001 promotion
- [ ] Optional: `npm run validate:harness:field` against frozen benchmark on CI/local

## Checklist

- [x] Brain v1 frozen benchmark unchanged as the control contract
- [x] Golden canaries pass
- [x] Validation Harness available
- [x] Field Intelligence operational
- [x] Experiment framework available
- [x] No production default switch to Exp001
- [x] Exp001 remains opt-in and rejected
