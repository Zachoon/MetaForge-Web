# Operation Reforge — Sprint 1 UX record

## Goal

Make MetaForge immediately understandable to a first-time Commander player, deliver the completed deck before asking for analysis or experimentation, and preserve the existing generation and coaching engines.

## Changes and rationale

1. **Commander-first homepage.** The hero now says exactly what the product does: choose a commander and strategy, then receive a complete deck. “Build a Commander deck” is the primary action; importing a list is clearly secondary.
2. **Plain-language labels.** Player-facing terms such as “commission,” “Blueprint,” “Testing Anvil,” “Evidence Vault,” and “Proving Grounds” were replaced in primary navigation with “build choices,” “improve,” “analysis,” and “playtest.” Forge vocabulary remains as atmosphere and supporting copy.
3. **Reward before optimization.** Every successful forge path now proceeds from the animation directly to the completed deck. The former mandatory first-experiment veil is disabled. Experiments remain available afterward under Improve.
4. **Deck-first result hierarchy.** The finished list is Chapter 1 and the strongest visual surface. Improve, How it works, Analysis, and Playtest are secondary chapters. Detail controls now say “Deck first” and “All analysis.”
5. **Consistent journey language.** The persistent four-step header now reads Start → Build choices → Building → Your deck. Back actions use direct destination language, and the five post-build chapters provide one unified progress model.
6. **Preserved engine behavior.** Generation, legality checks, Commander search, saved decks, recommendations, evidence, simulations, revisions, and account boundaries are unchanged. This sprint changes sequencing, defaults, copy, and presentation hierarchy only.

## First-time journey after Sprint 1

Start → Build a Commander deck → Choose commander → Choose strategy → Optional preferences → Build animation → Complete deck → Improve / understand / analyze / playtest.

## Follow-up candidates

- Split build choices into true one-decision screens once product analytics validate the preferred amount of friction.
- Add usability tests for commander search, mobile progress navigation, and comprehension of “Deck first” versus “All analysis.”
- Offer alternate generated directions from the completed-deck page instead of before it.
