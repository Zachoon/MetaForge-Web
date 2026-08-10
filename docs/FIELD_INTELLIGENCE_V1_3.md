# Field Intelligence v1.3 — Strategic Relationship Mining

**Status:** observation / knowledge representation  
**Brain v1:** frozen  
**Exp001:** remains rejected  
**Exp002:** recommended in docs only — not implemented

## North star

Learn how elite players connect cards into functioning strategic systems — not merely which cards, roles, or quantities appear in winning decks.

## Feedback loop

1. **Observation** — tournament decks → strategic topology
2. **Hypothesis** — discovery queue candidates
3. **Experiment** — opt-in later (not this release)
4. **Production Brain** — frozen until validated

**Invariant:** there is no arrow from the discovery queue / artifact back into Brain construction.

## What shipped

| Surface | Module |
|---|---|
| Edge ontology + confidence | `strategic-edge-ontology.mjs` |
| Per-deck static topology | `strategic-topology.mjs` |
| Topology metrics | `topology-metrics.mjs` |
| Level-A topology comparisons | `level-a-topology.mjs` |
| Structural sequences | `strategic-sequences.mjs` |
| Contextual card function | `contextual-card-function.mjs` |
| Substitution evidence | `substitution-evidence.mjs` |
| Discovery queue | `topology-discovery.mjs` |
| Append-only research store | `research-store.mjs` |
| Corpus growth instrumentation | `corpus-growth.mjs` |

Live sample defaults: **60 days / 40 events / 20 decks per event** (CLI overrides preserved).

## Confidence model

- Co-occurrence alone → weak (`commonly_cooccurs`)
- Semantic support required for strong edges
- Independent branches (metrics / sequences / substitutions / context) may converge; do not invent composite confidence that papers over disagreement

## Deferred: dynamic pressure topology

Static topology (supports / protects / enables) is this release.

**Later:** dynamic pressure topology — what becomes critical once X exists (e.g. Counterspell most often protects *this* engine in *this* deck). Do not build until v1.3 evidence justifies it.

## Recommended Exp002 (not implemented)

> Prefer interaction that closes an uncovered strategic dependency (protects unprotected engine/combo/commander, or bridges a missing sequence stage) over interaction that merely increases interaction count/density.

## Related

- `docs/INTERACTION_TOPOLOGY_RESEARCH.md`
- `docs/REJECTED_EXPERIMENTS.md`
- `docs/FIELD_INTELLIGENCE_V1.md`
- `docs/BRAIN_V1_ENGINEERING_RELEASE.md`
