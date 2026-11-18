# MF-ORIGINAL-VISION-RECOVERY

## The identity, restated

MetaForge helps Magic players understand, improve and learn from their decks. It is a **deck coach**: analysis exists to support a coaching conversation, never to impress with numbers. Sources: the owner's direction notes (2026-08-06 "deck coach, not analysis tool"; 2026-08-07 "trust is the foundation"; 2026-09-10 "the player builds with help, not handed a finished deck"), `docs/MENTOR.md`, `docs/INTELLIGENCE_CONSTITUTION.md`, and the six Academy guides.

The journey the product exists for:

1. import / paste / construct a deck
2. understand its strategy, consistency, mana and card relationships
3. get evidence-backed coaching with explanations
4. explore improvements inside the player's constraints
5. compare a change and learn why it helps

## Where the product drifted

| Principle | What the code had | What a visitor experienced |
|---|---|---|
| Teach, don't dictate | Excellent teaching engines (curve-role, mana-base, plan-weakness) that quote card text | Locked behind a Forge generation and, for depth, an account |
| Evidence before opinion | Citations with quoted Oracle text, confidence levels, "names alone cannot show the difference" messages | A guest saw counts in a hidden drawer |
| Reveal relationships | Interaction graph, systems intelligence | Auth-only |
| Reward curiosity | One-slot experiments, revision opinions | Auth-only |
| Player outcomes over dashboards | — | The first screen for "Analyze" was an empty, unconfigured editor |

Two shifts explain most of it:

* **Construction took the front door.** After the September Reddit feedback, the homepage correctly re-centred on the guided build. "Analyze" was folded into the same editor, so the *understand my existing deck* step (journey 1→2→3) lost its entrance.
* **The coaching engines were wired to the Forge result, not to a list.** `CurveRoleCoach` and `ManaBaseCoach` render in `workbench-chamber.tsx` only, and the workbench is reached after `commitDirectForge`, which for a guest consumes the single Turnstile preview and *fills gaps* in the list instead of reading it as written.

Nothing was removed; the deck-coach core was simply not reachable by the person most likely to try it first: a player with a deck they already play.

## What was *not* drift (kept as is)

* Guided construction as the primary start: still the owner's top thread; untouched.
* Vendor/inventory/marketplace: correctly absent from the web product. MF Lens and Inventory/Pricing lived in the retired Python repo; this mission does not revive them.
* Native, rules-based reasoning with no model call: kept and now stated plainly to the player.

## Recovery principle applied in this branch

> Put the existing, tested coaching engines in front of any player who pastes a deck, without an account, and make every claim on that screen traceable to a card's printed text or a stated MetaForge range.

Concretely (details in `MF-DECK-COACH-VERTICAL-SLICE.md`):

* **Understand:** the commander's printed text is quoted and the plan read is stated with its confidence.
* **Evidence:** every weakness cites a card from the list and quotes it; every legality claim names Scryfall as its source.
* **Teach, don't dictate:** each suggested change shows what it fixes *and* what it costs, and says when one swap does not close the gap ("one swap starts the fix, it does not finish it").
* **Reward curiosity:** the player can test their own cut/add and get the same measured comparison, or a plain rule-based refusal.
* **Honest limits:** a fixed "What this check can and can't tell you" section (no AI model, ranges are starting points not rules, no prices, unread cards, partial lists).

## Copy principles for the entry points

* Say who it is for (Commander players first) and what they can do right now.
* Promise only what the destination does. The mana-base tool page no longer promises goldfished hands; power-level and bracket CTAs were left alone and flagged rather than pointed at a page that does not measure power.
* No "AI", no win rates, no price precision, no "coming soon".
