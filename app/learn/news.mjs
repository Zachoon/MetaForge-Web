// News notes. Prose is original. At most one short sentence is quoted,
// and only if that sentence occurs in the fetched text. Card names enter
// the note only from the card payload or from that same text.

import { COMMANDER_GUIDES } from "../commanders/data.mjs";
import { cardFactSentence, knownNamesFrom, oneSentence, presentCard } from "./grounding.mjs";
import { decidePublication, quoteIsVerified, slugify, wordCount } from "./policy.mjs";
import { canonicalizeUrl, dedupeKeyFor } from "./sources.mjs";

function namesInText(text, cards) {
  const haystack = String(text || "").toLowerCase();
  return cards.filter((card) => haystack.includes(card.name.toLowerCase()));
}

export function buildNewsArticle(item, { now, knownCards = [], modelReady = false, summarize = null, existing = [] } = {}) {
  const sourceText = String(item.text || "").replace(/\s+/g, " ").trim();
  const quote = oneSentence(sourceText);
  const quoteOk = quote ? quoteIsVerified(quote, sourceText) : true;
  const pool = knownCards.map(presentCard);
  const named = namesInText(`${item.title || ""} ${sourceText}`, pool);
  const cards = (item.cards || []).map(presentCard);
  const allowedCards = [...cards, ...named].filter((card, index, list) => list.findIndex((other) => other.name === card.name) === index);
  const known = knownNamesFrom(allowedCards, pool);
  let summary = null;
  let provenance = "news-prose";
  if (modelReady && typeof summarize === "function") {
    try {
      const result = summarize({ title: item.title, sourceText, cards: allowedCards });
      if (result && typeof result.summary === "string" && result.summary.trim()) summary = result.summary.trim();
    } catch {
      summary = null;
    }
  }
  const quoted = quoteOk && quote ? quote : null;
  const cardParagraph = allowedCards.length
    ? allowedCards.map(cardFactSentence).join(" ")
    : "No card in the known pool is named by this item, so the coach is not attaching an oracle reading. A card name that appears only in memory does not get a paragraph.";
  const native = [
    `${item.sourceTitle} published “${item.title}.” This note is not that article. It keeps one short quotation, when the feed text contains a single sentence, and it links the source.`,
    quoted
      ? `The feed text includes this sentence: “${quoted}” Anything beyond that sentence is not being claimed.`
      : "The feed text did not include a single sentence short enough to quote. Nothing from the source is being paraphrased into a fact.",
    cardParagraph,
    "The coach's opinion: read the source before you change a deck. If the item names a commander and that commander's printed text does not do the thing the headline suggests, the headline is not a build plan. If the item names no card, there is nothing here to sleeve.",
  ].join(" ");
  const body = summary && quoteOk ? `${native} ${summary}` : native;
  const commanderLinks = allowedCards.flatMap((card) => {
    const guide = COMMANDER_GUIDES.find((entry) => entry.card.name.toLowerCase() === card.name.toLowerCase());
    return guide ? [{ slug: guide.slug, name: guide.card.name, reason: "The source names this commander, and the guide quotes the same oracle text." }] : [];
  });
  const mentioned = allowedCards.map((card) => card.name);
  if (summary) {
    for (const card of pool) {
      if (summary.includes(card.name) && !mentioned.includes(card.name)) mentioned.push(card.name);
    }
  }
  const draft = {
    slug: slugify(item.title || item.url || "news"),
    title: item.title || "Untitled source",
    description: `${item.sourceTitle}: an original note on “${item.title || "a source item"}”, with a link to the source.`,
    category: "news",
    tags: ["news", item.sourceId].filter(Boolean),
    provenance,
    topicKey: `news:${canonicalizeUrl(item.url || item.title || "")}`,
    dedupeKey: item.dedupeKey || dedupeKeyFor(item.sourceId || "source", item.url || item.title || ""),
    publishedAt: item.publishedAt || now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: `${item.sourceTitle} has a new item, “${item.title}.” The useful Commander question is narrower than the headline: what did the source actually say, and does any named card's text support a change?`,
    thesis: body,
    engineTake: allowedCards.length
      ? `The coach can score ${allowedCards.map((card) => card.name).join(", ")} because those cards were in the payload or named in the source text.`
      : "No oracle text was attached, so there is no engine score for a card in this note.",
    sections: [
      {
        id: "source",
        heading: "What the source item supports",
        paragraphs: [
          `${item.sourceTitle} is the source. The link is the article. This page is a note about that item, written so the quotation can be checked against the fetched text.`,
          quoted
            ? `Quoted from the fetched text: “${quoted}” That is the only sentence taken from ${item.sourceTitle}.`
            : `No quotation was kept from ${item.sourceTitle}, because a single short sentence was not available in the fetched text.`,
          item.publishedAt
            ? `The feed dated the item ${item.publishedAt}. That date is the feed's date, not a card release date.`
            : "The feed did not include a date, so this note does not add one.",
        ],
      },
      {
        id: "cards",
        heading: "Cards the text actually names",
        paragraphs: [
          cardParagraph,
          "The coach's opinion: a preview headline is not a deck change. Sleeve a card when its quoted text does a job your list is short, and only then. If this section named no card, stop. There is no second list hiding under the opinion.",
          "Prices are not part of the feed record used here, and they are not estimated.",
        ],
        cards: allowedCards,
      },
      {
        id: "next",
        heading: "What a Commander player can do with this",
        paragraphs: [
          "Open the source. Check the quotation against it. If a commander guide on this site matches a name in the item, read that guide next, because the guide is the oracle text and this note is only the headline.",
          "The coach's opinion: most news items do not deserve a deck edit the day they appear. They deserve a check that you understood the sentence. The build button is there when you already know which commander you are on. It is not a claim that this item contained a decklist.",
          "Low-confidence notes stay off the public index. A note publishes only when the source was reachable, the quotation checks out, and every card name is one the source or the card payload supplied.",
        ],
      },
    ],
    takeaways: [
      quoted ? "One sentence was quoted, and it had to occur in the fetched text." : "No sentence was quoted.",
      allowedCards.length ? `Card text was scored only for ${allowedCards.map((card) => card.name).join(", ")}.` : "No card was scored.",
      "The source link is the article. This page is not a rewrite of it.",
    ],
    decklist: allowedCards.length ? {
      title: "Cards named by this item",
      note: "Only cards the source text or the card payload named. Not a deck.",
      commanderSlug: null,
      commanderName: null,
      lines: allowedCards.map((card) => ({ name: card.name, slug: card.slug, quantity: 1, role: card.roles.join(", ") })),
    } : null,
    commanderLinks,
    forgeCta: commanderLinks[0]
      ? { href: `/?commander=${commanderLinks[0].slug}`, label: "Build this", commanderName: commanderLinks[0].name }
      : { href: "/?intent=build", label: "Build this", commanderName: null },
    sources: [{ label: item.sourceTitle, url: item.url }],
    externalQuote: quoted ? { text: quoted, url: item.url, sourceTitle: item.sourceTitle } : null,
    mentionedNames: mentioned,
    setReleasedAt: null,
    grounding: {
      present: item.reachable !== false,
      knownNames: known,
      setReleasedAt: null,
      sourceText,
      sourceReachable: item.reachable !== false && Boolean(item.url),
    },
  };
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}

export function buildSpoilerRoundup(cards, { now, sourceUrl, setName = null, existing = [] } = {}) {
  const scored = cards.map(presentCard).filter((card) => card.oracleText);
  if (!scored.length) return null;
  const known = knownNamesFrom(scored);
  const sample = scored.slice(0, 6);
  const released = [...new Set(scored.map((card) => card.releasedAt).filter(Boolean))];
  const dateSentence = released.length === 1
    ? `Scryfall dates these printings ${released[0]}.`
    : "These records do not share one release date, so this note does not invent a single spoiler day.";
  const draft = {
    slug: slugify(setName ? `${setName} new commander cards` : `new commander cards ${now}`),
    title: setName ? `${setName}: new cards the classifiers would actually run` : "New cards, scored from the printed text",
    description: `${scored.length} cards from Scryfall, with roles taken from their oracle text. ${dateSentence}`,
    category: "spoilers",
    tags: ["spoilers", "new-cards"],
    provenance: "card-data",
    topicKey: `spoilers:${scored.map((card) => card.id || card.name).sort().join("|").slice(0, 180)}`,
    dedupeKey: `spoilers:${scored.map((card) => card.id || card.slug).sort().join(",")}`,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: "A spoiler season is a pile of names. The coach can only talk about the ones whose rules text is already on the record.",
    thesis: `${scored.length} cards were scored from Scryfall. ${dateSentence} Each card below is included because the payload had oracle text, not because a headline called it good.`,
    engineTake: `Roles are classifier output. ${sample.map((card) => `${card.name}: ${card.roles.join(", ") || "no role"}`).join(". ")}.`,
    setReleasedAt: released.length === 1 ? released[0] : null,
    sections: [
      {
        id: "pool",
        heading: "The cards in this batch",
        paragraphs: [
          `${scored.length} cards had rules text. The first of them, by the order they were given: ${sample.map((card) => card.name).join(", ")}. ${sample.map(cardFactSentence).join(" ")}`,
          "The coach's opinion: sort a spoiler by the job you are missing. A card with no role is not a hidden staple. It is a card the patterns did not recognize, and it should stay in the binder until you can explain the text without the classifier.",
          "No price is attached. A future printing date is included only when Scryfall put that date on the card, and only when every card in the batch shares it.",
        ],
        cards: sample,
      },
      {
        id: "jobs",
        heading: "Jobs, not hype",
        paragraphs: [
          `Interaction in the sample: ${sample.filter((card) => card.roles.includes("interaction")).map((card) => card.name).join(", ") || "none"}. Draw: ${sample.filter((card) => card.roles.includes("draw")).map((card) => card.name).join(", ") || "none"}. Ramp: ${sample.filter((card) => card.roles.includes("ramp")).map((card) => card.name).join(", ") || "none"}.`,
          "The coach's opinion: if your deck's last loss was an unanswered permanent, read the interaction names and ignore the rest for a week. If the last loss was an empty hand, read the draw names. Updating every category because a set exists is how lists lose their plan.",
          "Card pages linked from here repeat the oracle text and the roles. They are not a second review.",
        ],
        cards: sample.filter((card) => card.roles.length),
      },
      {
        id: "limits",
        heading: "What a data-only spoiler refuses to say",
        paragraphs: [
          "It does not say a card will be a staple. It does not compare the card to a price. It does not claim a legend is legal as your commander beyond the Commander legality flag on the record, and only when that flag was present.",
          "The coach's opinion: sleeve one card, play the deck, and see whether the quoted sentence happened. A spoiler note cannot play the game for you.",
          sourceUrl ? `The fetch came from ${sourceUrl}.` : "The fetch URL was not recorded with this batch.",
        ],
      },
    ],
    takeaways: [
      `${scored.length} cards were scored from oracle text.`,
      dateSentence,
      "Pick by the job you are missing, not by the fact that the card is new.",
    ],
    decklist: {
      title: "Scored cards from this batch",
      note: "Not a deck. A list of cards whose text was classified.",
      commanderSlug: null,
      commanderName: null,
      lines: sample.map((card) => ({ name: card.name, slug: card.slug, quantity: 1, role: card.roles.join(", ") || "unclassified" })),
    },
    commanderLinks: [],
    forgeCta: { href: "/?intent=build", label: "Build this", commanderName: null },
    sources: [{ label: "Scryfall", url: sourceUrl || "https://api.scryfall.com" }],
    externalQuote: null,
    mentionedNames: sample.map((card) => card.name),
    grounding: {
      present: true,
      knownNames: known,
      setReleasedAt: released.length === 1 ? released[0] : null,
      sourceText: "",
      sourceReachable: true,
    },
  };
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}
