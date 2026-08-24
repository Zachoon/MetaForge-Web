export const TOOL_PAGES = [
  {
    slug: "mtg-deck-analyzer",
    eyebrow: "MTG DECK ANALYZER",
    title: "MTG Deck Analyzer",
    description: "Analyze a Magic: The Gathering decklist for mana, card flow, interaction, speed, and the game plan connecting its cards.",
    promise: "Find the pressure points in your deck—not just its average mana value.",
    intro: "Paste a decklist and MetaForge explains what the deck is trying to do, where that plan is supported, and what may keep it from working consistently.",
    sections: [
      ["Understand the whole deck", "See the commander, strategy, supporting engines, mana needs, interaction, and closing plan as one connected system."],
      ["Get reasons, not a score", "MetaForge shows the evidence behind its conclusions so you can decide whether a suggested change fits how you want to play."],
      ["Test one useful improvement", "Explore a focused card swap and compare what the change adds, removes, and leaves unresolved before editing your list."],
    ],
    cta: "Analyze my MTG deck",
    href: "/?intent=analyze",
  },
  {
    slug: "commander-deck-builder",
    eyebrow: "COMMANDER DECK BUILDER",
    title: "Commander Deck Builder",
    description: "Build a legal 100-card Commander deck around a real game plan, with clear reasons for every major package and supporting card.",
    promise: "Start with a commander and a plan. Finish with an explainable 100-card deck.",
    intro: "Choose a commander, strategy, and preferences. MetaForge builds the deck as a connected system instead of filling slots from a popularity list.",
    sections: [
      ["Commander-aware construction", "Color identity, singleton rules, lands, interaction, and the commander’s printed incentives shape the list from the beginning."],
      ["Strategy before staples", "Cards earn their place by advancing the selected game plan, enabling another card, protecting the plan, or keeping the deck functional."],
      ["Built to be reviewed", "Every finished list includes deck analysis, card explanations, pricing, export tools, and an opening-hand playtest."],
    ],
    cta: "Build a Commander deck",
    href: "/?intent=build",
  },
  {
    slug: "commander-deck-checker",
    eyebrow: "COMMANDER DECK CHECKER",
    title: "Commander Deck Checker",
    description: "Check a Commander decklist for legality, structural gaps, conflicting plans, and cards that are not earning their place.",
    promise: "Check whether your 100 cards work together—not merely whether they are legal.",
    intro: "MetaForge reviews the submitted list as a deck: its commander, mana, engines, interaction, card flow, early plays, and ability to finish games.",
    sections: [
      ["Legality and identity", "Confirm deck size, singleton construction, commander color identity, and the role of the command zone."],
      ["Structural checks", "Look for missing mana, card flow, interaction, early development, protection, or ways to convert an advantage into a win."],
      ["Context-sensitive card review", "A card is evaluated against this commander and this plan, reducing generic recommendations that fit the format but not the deck."],
    ],
    cta: "Check my Commander deck",
    href: "/?intent=analyze",
  },
  {
    slug: "commander-mana-base-analyzer",
    eyebrow: "COMMANDER MANA BASE ANALYZER",
    title: "Commander Mana Base Analyzer",
    description: "Diagnose Commander land count, color access, mana curve, ramp, and the opening-hand problems that keep spells stuck in hand.",
    promise: "Learn why the deck misses its plays instead of relying on one universal land count.",
    intro: "A usable mana base depends on when the deck needs each color, how many real sources it has, what its ramp costs, and which cards must be cast on curve.",
    sections: [
      ["Land count in context", "Evaluate lands alongside ramp, card selection, average cost, commander cost, and the deck’s intended pace."],
      ["Color access", "Separate total mana from usable colored sources so early double-pip spells and multicolor commanders receive the support they need."],
      ["Opening-hand evidence", "Goldfish sample hands and connect weak starts to land count, color access, curve, or sequencing rather than guessing."],
    ],
    cta: "Analyze my mana base",
    href: "/?intent=analyze",
  },
  {
    slug: "commander-land-calculator",
    eyebrow: "COMMANDER LAND CALCULATOR",
    title: "Commander Land Calculator",
    description: "Estimate a starting land count for a Commander deck from its curve, ramp, draw, commander cost, and intended pace.",
    promise: "Get a practical starting range—and see which deck choices moved it.",
    intro: "There is no universal correct land count. This calculator turns the parts of your deck that change its mana needs into an explainable starting range you can test.",
    sections: [
      ["Curve-aware estimate", "Expensive decks need more natural land drops; low-curve decks can usually operate with fewer."],
      ["Ramp and card flow", "Cheap ramp and early card selection can reduce pressure on raw land count, but neither makes zero-land hands keepable."],
      ["A range, not a verdict", "Use the result as a starting point, then test opening hands and revise from real play evidence."],
    ],
    cta: "Analyze my complete mana base",
    href: "/?intent=analyze",
    calculator: "lands",
  },
  {
    slug: "commander-color-source-calculator",
    eyebrow: "COMMANDER COLOR SOURCE CALCULATOR",
    title: "Commander Color Source Calculator",
    description: "Estimate how many untapped colored mana sources a Commander deck needs to cast an important spell on curve.",
    promise: "Translate colored pips and target turn into a practical source target.",
    intro: "A deck can have enough lands and still miss the color it needs. This calculator estimates a source target for an important spell, then helps you compare it with your actual mana base.",
    sections: [
      ["Count sources, not cards", "A source is a land or reliable early effect that can produce the needed color by the target turn."],
      ["Respect colored pips", "A spell needing two or three of the same color asks much more of a mana base than a single-pip spell."],
      ["Check the hardest spells", "Run the calculation for the early or color-intensive cards that matter most—not every splash card."],
    ],
    cta: "Analyze every spell in my deck",
    href: "/?intent=analyze",
    calculator: "colors",
  },
] as const;

export type ToolPage = (typeof TOOL_PAGES)[number];

export function toolPageBySlug(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((entry) => entry.slug === slug);
}
