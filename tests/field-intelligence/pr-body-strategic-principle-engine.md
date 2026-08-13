## Summary
Adds the Strategic Principle Engine on top of Field Intelligence v1.3.
This is a research/knowledge layer only. Brain v1 remains frozen and production behavior is unchanged.

## What this PR adds
- versioned strategic-principle schema and status lifecycle
- principle lifting from Field Intelligence hypotheses/discovery
- evidence/history-aware principle registry
- research-store persistence for principles and evidence deltas
- Academy/registry reporting
- documentation for the Strategic Principle Engine

## Hard safety invariant
Every principle is inert:
- `writesToBrain: false`
- `activated: false`
- `promoted: false`

Card frequency alone cannot mint a principle.

## Validation
- Principle tests: 10/10
- Field Intelligence + topology: 55/55
- Golden canaries: 13/13 PASS
- Validation Harness: 100%, 0 hard failures
- Brain v1 control: identical

## Fixture Academy
- 71 discovered principles
- candidate / replicated-candidate / promotable research states
- zero activated principles

## Non-goals
- no Brain v2 implementation
- no construction-weight changes
- no automatic promotion
- no popularity/card-frequency learning

Brain changes still require a separate controlled experiment and Validation Harness promotion gate.
