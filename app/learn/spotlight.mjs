// Commander spotlight from a guide record or a scored legendary card.
// The build link uses a guide slug only when that slug exists. Otherwise
// the forge opens a new build without pretending the legend was preselected.

import { cardFactSentence, knownNamesFrom, listNames, presentCard } from "./grounding.mjs";
import { decidePublication, slugify, wordCount } from "./policy.mjs";

function supportFor(commander, pool) {
  const roles = new Set(commander.roles);
  return pool
    .map(presentCard)
    .filter((card) => card.name !== commander.name && card.roles.some((role) => roles.has(role)))
    .sort((a, b) => (a.cmc ?? 99) - (b.cmc ?? 99) || a.name.localeCompare(b.name))
    .slice(0, 4);
}

export function buildSpotlight({ commander, guide = null, pool = [], now, existing = [] }) {
  const card = presentCard(commander);
  if (!card.name || !card.oracleText) return null;
  const support = supportFor(card, pool);
  const known = knownNamesFrom([card], support);
  const slug = guide?.slug || slugify(card.name);
  const forge = guide
    ? { href: `/?commander=${guide.slug}`, label: "Build this", commanderName: card.name }
    : { href: "/?intent=build", label: "Build this", commanderName: null };
  const draft = {
    slug: guide ? slugify(`${card.name} commander spotlight`) : slugify(`${card.name} spotlight`),
    title: `${card.name}, read from the card`,
    description: `${card.name}: ${card.roles.length ? card.roles.join(", ") : "no classifier role"} from its printed text, plus the cards in the pool that share a job.`,
    category: "commander-spotlights",
    tags: ["commander", "spotlight", ...(card.roles.slice(0, 3))],
    provenance: "card-data",
    topicKey: `spotlight:${guide?.slug || card.id || slug}`,
    dedupeKey: `spotlight:${guide?.slug || card.id || slug}`,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: `${card.name} gets described by the deck people already built around it. That description is a rumor until you read the text. This note starts with the text and stops where the text stops.`,
    thesis: card.quote
      ? `${card.name} opens with “${card.quote}” The classifiers read that card as ${card.roles.length ? card.roles.join(", ") : "having no role"}. The rest of the deck is there to repeat, protect, or pay for that sentence.`
      : `${card.name} has rules text on file, and the classifiers read it as ${card.roles.length ? card.roles.join(", ") : "having no role"}. No single sentence was short enough to quote, so the card page carries the full text.`,
    engineTake: `${cardFactSentence(card)} A role is not a strategy essay. It is the pattern the printed words matched.`,
    setReleasedAt: card.releasedAt,
    sections: [
      {
        id: "text",
        heading: "What the card actually says",
        paragraphs: [
          cardFactSentence(card),
          card.colorIdentity?.length
            ? `Color identity on the record: ${card.colorIdentity.join(", ")}. Every card in the deck has to live inside that identity. That is a constraint, not a suggestion, and it is the reason a splash you remember from another format is not available here.`
            : "The record did not list a color identity, so this note does not assign one.",
          "The coach's opinion: build the mana that casts the quoted sentence on the turn you claim you will cast it. If the sentence needs a sacrifice, a combat hit, or a spell cast, those are the cards to add. A good card that does not touch the sentence is a different deck.",
        ],
        cards: [card],
      },
      {
        id: "support",
        heading: "Cards in the pool that share a job",
        paragraphs: [
          support.length
            ? `From the scored pool, these share at least one role with ${card.name}: ${listNames(support)}. ${support.map(cardFactSentence).join(" ")}`
            : `None of the other cards in the pool shared a classifier role with ${card.name}. The package below is the commander alone rather than a borrowed list.`,
          "The coach's opinion: shared role is the minimum reason to try a card, not a reason to run four copies of the same job and nothing that protects it. If every support card is draw and the commander already draws, you still need the mana and the answer that keeps the sentence on the battlefield.",
          "This is not a popularity list and it is not a price list. A card appears because its stored oracle text classified into a role the commander also received.",
        ],
        cards: support,
      },
      {
        id: "limits",
        heading: "What this spotlight will not tell you",
        paragraphs: [
          "It will not tell you a win rate, a salt score, or how many decks run the card. Those numbers are not in the input. Inventing them would make the page sound like a column and fail the only test that matters here, which is that a sentence can be traced.",
          guide
            ? `There is already a full guide for ${card.name}. This spotlight is the short read. The guide is the longer one, and the build button opens the forge with that commander selected.`
            : `${card.name} is not in the current guide library. The build button opens the forge so you can start a deck. It does not preselect this legend, because the forge only accepts guide slugs it already knows.`,
          "If a later printing changes the text, this page is wrong until the stored oracle text is replaced. The classifiers do not remember an older version.",
        ],
      },
    ],
    takeaways: [
      card.roles.length ? `Treat ${card.name} as ${card.roles.join(", ")} until the text says otherwise.` : `Do not assign ${card.name} a job the classifiers did not find.`,
      support.length ? `The support package is ${listNames(support)}, chosen by shared role.` : "No support card in the pool shared a role.",
      guide ? "Use the guide, then build the deck from the forge link." : "Start a build in the forge. The legend is not preselected.",
    ],
    decklist: {
      title: `A package for ${card.name}`,
      note: "Commander plus cards that shared a classifier role. Not a complete deck.",
      commanderSlug: guide?.slug || null,
      commanderName: card.name,
      lines: [
        { name: card.name, slug: guide?.slug || card.slug, quantity: 1, role: "commander" },
        ...support.map((item) => ({ name: item.name, slug: item.slug, quantity: 1, role: item.roles.join(", ") })),
      ],
    },
    commanderLinks: guide ? [{ slug: guide.slug, name: card.name, reason: "Full commander guide, from the same oracle text." }] : [],
    forgeCta: forge,
    sources: [{ label: card.setName ? `Card record — ${card.setName}` : "Stored card record", url: "https://scryfall.com" }],
    externalQuote: null,
    mentionedNames: [card.name, ...support.map((item) => item.name)],
    grounding: {
      present: true,
      knownNames: known,
      setReleasedAt: card.releasedAt,
      sourceText: [card.oracleText, ...support.map((item) => item.oracleText)].join("\n"),
      sourceReachable: true,
    },
  };
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}
