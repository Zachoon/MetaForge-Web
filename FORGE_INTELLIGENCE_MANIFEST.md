# MetaForge Forge Intelligence Manifest

Last updated: 2026-07-18

## Product promise

The Forge does not merely write plausible decklists. It verifies hard rules,
shows the evidence behind its conclusions, stress-tests each revision, records
what actually happened, and preserves uncertainty when the available data does
not justify a confident claim.

## Live intelligence path

1. The model proposes a complete deck candidate.
2. The client normalizes exact deck size and commander inclusion.
3. Scryfall card records resolve every printed card and face.
4. The Structural Integrity Gate checks deck size, commander count, current
   legality, Arena availability, color identity, copy limits, and unresolved
   names.
5. Testing remains locked until every hard constraint passes.
6. A failed list can be reforged against the exact validator issues without
   overwriting the preserved revision.
7. Card roles, mana-source count, interaction density, advantage engines, and
   average mana value are shown in the deck dossier.
8. Deterministic opening-hand, plan-realization, pilot-sensitivity, and
   archetype stress trials run before real-game testing.
9. The Meta Breaker Lab exposes the measured field, evidence boundary,
   structural pressure point, and smallest honest counter-field experiment.
10. Match results are tied to the exact revision, opponent archetype, player
    signal, and timestamp in the private Deck Bench.
11. An Oracle-derived interaction graph connects enablers to payoffs, groups
    mechanical packages, exposes isolated nonland slots, and conservatively
    detects symmetrical rules-text conflicts. Hovered cards show their strongest
    live relationships rather than only a generic role label.

## Core modules

- `app/deck-legality.mjs`: generated legality catalogs, aliases, deck size, and
  copy-limit checks.
- `app/deck-analysis.mjs`: deck parsing, card mechanics, land-engine analysis,
  and controlled composition recommendations.
- `app/card-mechanics.mjs`: offline mechanic tags used by structural reasoning.
- `app/forge-interaction-graph.mjs`: deterministic producer/payoff edges,
  package clustering, commander links, isolation auditing, and conservative
  nonbo detection from current card facts.
- `app/forge-simulation.mjs`: deterministic library and opening-hand trials.
- `app/goldfish-simulation.mjs`: plan-realization and pilot-sensitivity gates.
- `app/matchup-simulation.mjs`: bounded archetype pressure scenarios and
  weakness matrix.
- `app/meta-intelligence.mjs` and `app/meta-snapshot.mjs`: timestamped field
  evidence, classification coverage, plurality/majority boundaries, and
  historical priors.
- `worker/edhrec-evidence.ts`: commander-relative adoption and lift evidence.
- `app/experiment-evidence.mjs`: sample-aware decisions that resist
  overreacting to early results.
- `app/deck-bench.mjs` and `worker/account-bench.ts`: immutable revisions,
  match attachment, account sync, and preserved history.
- `app/adaptive-recommendation.mjs`: matchup-classified controlled repairs.
- `app/page.tsx`: the live storytelling journey, Integrity Gate, stress
  dossier, Meta Breaker Lab, repair loop, and player-facing evidence language.

## Evidence language

- **Verified:** card records, Oracle text, deck structure, legality, and format
  constraints.
- **Observed:** timestamped tournament coverage or player match records.
- **Modeled:** deterministic simulations of mana, role density, and sequencing.
- **Inferred:** mechanical relationships and proposed pressure points.
- **Forge Theory:** a bounded experiment that still needs real-game evidence.

Simulation output is never presented as a predicted match win rate. Adoption
is never treated as proof of quality. Missing field coverage never becomes an
invented metagame claim.

## Active program

The persistent implementation goal tracks broader live metagame ingestion,
sample-aware personalization, and continued Meta Breaker refinement. The first
live interaction graph now ships in the Testing Anvil; future graph work should
add richer mechanic vocabularies and observed pair/package evidence without
relabeling inference as proof. New work should extend these modules rather than
creating disconnected duplicate logic.
