# MetaForge Changelog

Player-facing changes to MetaForge are recorded here. Add new releases at the top and describe what changed in plain language.

## 2026-08-09 — Commander Compatibility and Strategic Coherence

### The commander is now part of construction strategy

- MetaForge now evaluates the commander's verified producer/payoff relationships directly.
- Cards gain meaningful priority when they consume a resource the commander creates or create a resource the commander rewards.
- A bounded commander-connected core is reserved before generic card quality fills the remaining slots.
- Finished candidates report the commander's detected resources, rewards, connected cards, and connection types.

### Fewer disconnected mini-packages

- Payoffs are temporarily deprioritized when their required enabler exists in the pool but has not entered the deck.
- That penalty disappears as soon as a compatible producer is selected.
- Finished candidates now report connected strategy signals, connection density, and isolated payoffs.
- Explicit power targets remain authoritative and are not overridden by the orphan-payoff safeguard.

### Honest power reporting

- Fixed an edge case where a Casual measured deck could incorrectly say it reached an unmet Maximum request.

## 2026-08-09 — Connected Package Engine

### Themes now build as relationships

- Requested mechanics now compile into the resources they produce and the payoffs they enable.
- Construction reserves a bounded mix of producers and payoffs instead of merely collecting cards that share a theme word.
- Player requests can combine multiple stages, such as lands → tokens → sacrifice value.
- Cards completing an in-deck requested package receive additional priority over disconnected generic cards.
- Finished builds now report producer counts, payoff counts, connected-card counts, and whether each requested package forms a real connection.

### Initial connected packages

- Landfall connects to additional land access and land-entry payoffs.
- Blink connects repeatable exile-and-return effects to enter-the-battlefield payoffs.
- Aristocrats connects fodder, sacrifice outlets, and death payoffs.
- Spell copying and casting from exile connect to spell-based enablers and payoffs.
- Counter, graveyard, token, artifact, life, combat, protection, and Equipment requests now carry their relevant package signals into construction.

## 2026-08-09 — Blueprint Intent and Smoother Deckbuilding

### Decks follow the player's requested theme

- Blueprint notes now create real deckbuilding requirements instead of acting as weak search words.
- The Forge deliberately searches for legal cards matching requested mechanics before building.
- Requested mechanics receive meaningful deck space before general-purpose cards fill the remaining functional slots.
- Focus language such as “focus on,” “especially,” and “primarily” determines which mechanic is handled first.
- The finished build measures whether its requested package actually survived construction.
- If the legal card pool cannot support a request, MetaForge says so instead of presenting a generic deck as aligned.

### Broader mechanic understanding

- Added automatic recognition for official mechanics already represented in MetaForge's verified card data, including Landfall, Cycling, Mutate, Toxic, Equip, Power-Up, and many more.
- Added player-language support for blink/flicker, aristocrats, Voltron, spell copying, casting from exile, and creature activated abilities.
- Verified targeted catalog retrieval and construction behavior across multiple unrelated mechanic families.

### Faster, clearer deck access

- Replaced the old forge-processing animation with a premium card-assembly sequence and plain progress language.
- Simplified the initial deck view so the deck, coaching direction, price, and primary actions are easier to find.
- Added the deck price and TCGplayer purchase action near the top of the deck experience.
- Kept the commander in its own section, separate from the other 99 cards.
- Ensured displayed commander guidance stays tied to the active deck.

### Card-data reliability

- Fixed double-faced card names containing `//` across imports and Arena exports.
- Improved partial card-data handling so one unresolved card no longer blocks access to the rest of a completed deck.
- Added resilient card-type catalog fallback behavior.

### Coaching flow

- Added a lower-effort coaching loop that prepares the next useful game question for the player.
- Realigned the guided tour with the streamlined Deck → Tune → Test flow.
- Kept deeper evidence available without forcing it into the primary deck experience.

### Verification

- Added construction-level regressions for named mechanics, official keyword mechanics, and conversational mechanic requests.
- Production builds and targeted catalog queries passed before release.
- One pre-existing simulation-rate determinism test remains tracked separately; it is unrelated to these changes.
