// Set review. Counts and names come from the Scryfall payload passed in.
// The release date is copied from that payload or omitted.

import { COMMANDER_GUIDES } from "../commanders/data.mjs";
import { cardFactSentence, countRoles, guidesMatching, knownNamesFrom, listNames, presentCard } from "./grounding.mjs";
import { decidePublication, slugify, wordCount } from "./policy.mjs";

function top(cards, role, limit = 3) {
  return cards
    .filter((card) => card.roles.includes(role))
    .sort((a, b) => (a.cmc ?? 99) - (b.cmc ?? 99) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function scoreSet(payload) {
  const set = payload.set || {};
  const cards = (payload.cards || []).map(presentCard).filter((card) => card.name && card.oracleText);
  const legends = cards.filter((card) => /legendary/i.test(card.typeLine) && /creature|planeswalker/i.test(card.typeLine));
  return {
    code: set.code || set.set || null,
    name: set.name || null,
    releasedAt: typeof (set.released_at || set.releasedAt) === "string" ? (set.released_at || set.releasedAt) : null,
    setType: set.set_type || set.setType || null,
    listedCardCount: Number.isFinite(set.card_count || set.cardCount) ? (set.card_count || set.cardCount) : null,
    scored: cards,
    legends,
    roles: countRoles(cards),
  };
}

export function buildSetReview(payload, now, existing = []) {
  const scored = scoreSet(payload);
  if (!scored.name || scored.scored.length < 8) return null;
  const interaction = top(scored.scored, "interaction");
  const draw = top(scored.scored, "draw");
  const ramp = top(scored.scored, "ramp");
  const sweeper = top(scored.scored, "sweeper");
  const roleLine = scored.roles.slice(0, 6).map(([role, count]) => `${role} ${count}`).join(", ");
  const interactionCount = scored.roles.find(([role]) => role === "interaction")?.[1] || 0;
  const drawCount = scored.roles.find(([role]) => role === "draw")?.[1] || 0;
  const rampCount = scored.roles.find(([role]) => role === "ramp")?.[1] || 0;
  const guides = guidesMatching(COMMANDER_GUIDES, (card) => {
    const topRole = scored.roles[0]?.[0];
    return topRole ? card.roles.includes(topRole) : false;
  });
  const featured = guides[0];
  const examples = [...interaction, ...draw, ...ramp, ...sweeper].filter((card, index, list) => list.findIndex((other) => other.name === card.name) === index).slice(0, 6);
  const known = knownNamesFrom(scored.scored, guides.map((row) => row.card));
  const dateSentence = scored.releasedAt
    ? `Scryfall dates ${scored.name} at ${scored.releasedAt}.`
    : `Scryfall's set record for ${scored.name} did not include a release date, so this note does not invent one.`;
  const countSentence = scored.listedCardCount
    ? `The set record lists ${scored.listedCardCount} cards. This note scored ${scored.scored.length} Commander-legal cards that had rules text in the fetch.`
    : `This note scored ${scored.scored.length} cards that had rules text in the fetch.`;
  const draft = {
    slug: slugify(`${scored.name} commander set review`),
    title: `${scored.name}: what the new cards are for`,
    description: `${scored.name} scored ${scored.scored.length} cards with rules text. Interaction ${interactionCount}, draw ${drawCount}, ramp ${rampCount}, by the coach's classifiers.`,
    category: "set-reviews",
    tags: ["set-review", scored.code || "set", "new-cards"].filter(Boolean),
    provenance: "card-data",
    topicKey: `set-review:${scored.code || slugify(scored.name)}`,
    dedupeKey: `set-review:${scored.code || slugify(scored.name)}`,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: `A new set does not arrive as "Commander cards" and "other cards." It arrives as rules text. ${scored.name} is worth your time only where that text matches a job your deck is short.`,
    thesis: `${countSentence} ${dateSentence} Among the scored cards, the classifiers found ${roleLine || "no repeated roles"}. Legendary creatures and planeswalkers in that pool: ${scored.legends.length}.`,
    engineTake: `The jobs that showed up most often are the ones a Commander deck can actually use. Interaction hits: ${interactionCount}. Draw hits: ${drawCount}. Ramp hits: ${rampCount}. A legend with none of those roles can still be a commander. It is not, on this evidence, a new answer or a new engine.`,
    setReleasedAt: scored.releasedAt,
    sections: [
      {
        id: "count",
        heading: "Start with the count, not the gallery",
        paragraphs: [
          `${scored.name}${scored.setType ? ` is recorded as a ${scored.setType}` : ""}. ${countSentence} ${dateSentence} Reprints were not part of this fetch. A card that is missing here was either absent from the payload or had no rules text to score.`,
          `Role totals, highest first: ${roleLine || "none"}. The coach's opinion: a set that adds interaction and draw changes more decks than a set that only adds legends with a new creature type. Types are easy to see on the card face. Jobs are what the oracle text actually does. This review follows the jobs.`,
          "Nothing below is a price, a preorder rank, or a statement about how often a card will be played. If a card is not named, this page is not hinting at it.",
        ],
      },
      {
        id: "answers",
        heading: "Answers and card flow",
        paragraphs: [
          interaction.length
            ? `Lowest mana value among cards classified as interaction: ${listNames(interaction)}. ${interaction.map(cardFactSentence).join(" ")}`
            : "No scored card received the interaction role. That is a result about this payload, not a claim that the set has no removal under some other wording.",
          draw.length
            ? `Lowest mana value among cards classified as draw: ${listNames(draw)}. ${draw.map(cardFactSentence).join(" ")}`
            : "No scored card received the draw role.",
          "The coach's opinion: when you update a deck for a set, swap an answer for an answer and a draw spell for a draw spell. A legend that is merely new does not fill either seat. If the quoted sentence is a restricted or expensive effect, leave the old card in until you want that restriction.",
        ],
        cards: [...interaction, ...draw],
      },
      {
        id: "mana-and-legends",
        heading: "Mana, wipes, and the legends",
        paragraphs: [
          ramp.length
            ? `Ramp hits, cheapest first: ${listNames(ramp)}. ${ramp.map(cardFactSentence).join(" ")}`
            : "No scored card received the ramp role.",
          sweeper.length
            ? `Sweeper hits: ${listNames(sweeper)}. ${sweeper.map(cardFactSentence).join(" ")} A sweeper is not a spot answer. The interaction section did not borrow these.`
            : "No scored card received the sweeper role. Do not promote a spot answer into a board wipe because the set is new.",
          scored.legends.length
            ? `There are ${scored.legends.length} legendary creatures or planeswalkers in the scored pool. The first few by name: ${listNames([...scored.legends].sort((a, b) => a.name.localeCompare(b.name)), 5)}. A legend is a candidate commander when you want that text in the command zone. It is a 99-card role-player when the classifiers gave it a job and your deck is short that job.`
            : "The scored pool did not include a legendary creature or planeswalker.",
          featured
            ? `If you already have a deck led by ${featured.guide.card.name}, that commander's text shares the role this set scored most often (${scored.roles[0][0]}). ${cardFactSentence(featured.card)} The coach's opinion: test one new card that shares the role before you rebuild the deck around a legend you have not quoted.`
            : "No guide commander shared the set's most common role. The forge link below still opens a build. It does not pretend a new legend is already in the guide library.",
        ],
        cards: [...ramp, ...sweeper, ...(featured ? [featured.card] : [])],
      },
    ],
    takeaways: [
      `${scored.scored.length} cards were scored${scored.releasedAt ? `, and the set date on the record is ${scored.releasedAt}` : ""}.`,
      `Interaction ${interactionCount}, draw ${drawCount}, ramp ${rampCount}. Use those jobs as the shopping list.`,
      "A new legend is not automatically a replacement for a card whose text already does the job.",
    ],
    decklist: {
      title: featured ? `Cards to try beside ${featured.guide.card.name}` : `A package from ${scored.name}`,
      note: "A package of cards quoted in this review. Not a 100-card list, and not a ranking by popularity or price.",
      commanderSlug: featured?.guide.slug || null,
      commanderName: featured?.guide.card.name || null,
      lines: [
        ...(featured ? [{ name: featured.card.name, slug: featured.guide.slug, quantity: 1, role: "commander" }] : []),
        ...examples.map((card) => ({ name: card.name, slug: card.slug, quantity: 1, role: card.roles.join(", ") || "scored" })),
      ],
    },
    commanderLinks: (featured ? [featured, ...guides.filter((row) => row.guide.slug !== featured.guide.slug)] : guides).slice(0, 3).map(({ guide, card }) => ({
      slug: guide.slug,
      name: guide.card.name,
      reason: `Shares a classified role (${card.roles.filter((role) => scored.roles.some(([id]) => id === role)).slice(0, 3).join(", ") || "see the guide"}).`,
    })),
    forgeCta: featured
      ? { href: `/?commander=${featured.guide.slug}`, label: "Build this", commanderName: featured.guide.card.name }
      : { href: "/?intent=build", label: "Build this", commanderName: null },
    sources: [
      { label: `Scryfall — ${scored.name}`, url: payload.source || `https://scryfall.com/sets/${scored.code || ""}` },
    ],
    externalQuote: null,
    mentionedNames: [...examples.map((card) => card.name), ...(featured ? [featured.card.name] : []), ...scored.legends.slice(0, 5).map((card) => card.name)],
    grounding: {
      present: true,
      knownNames: known,
      setReleasedAt: scored.releasedAt,
      sourceText: "",
      sourceReachable: true,
    },
  };
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}
