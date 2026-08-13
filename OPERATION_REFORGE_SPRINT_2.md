# Operation Reforge — Sprint 2 UX record

## Goal

Protect anticipation by turning new-deck setup into three small, understandable decisions without changing the generation contract.

## New-deck journey

1. **Commander.** Commander is the default format. The player chooses a legal commander or asks MetaForge to suggest one. Format remains available here for players building another supported format.
2. **Strategy.** The player chooses how the deck should play, with the existing plain-language explanation visible beside the choice.
3. **Optional preferences.** Complexity, budget, price cap, rarity, power target, partner/background, and personal notes appear only after the two essential choices. Defaults remain valid, so this step requires no homework.

## Interaction decisions

- A persistent three-step indicator shows current and completed setup stages.
- Next is disabled only when a Commander-format deck still needs a commander.
- Completed stages can be revisited without losing selections.
- Back and Next use destination labels, not generic continuation language.
- Deck import remains a direct review workflow and does not inherit the new-deck wizard.

## Engine boundary

All prior state fields and generation parameters remain unchanged. This sprint changes progressive disclosure and navigation only.
