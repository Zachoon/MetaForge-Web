// When a scheduled run finds no new items, write one essay from the
// topic queue. Topics cool down. Card facts still have to come from the
// pool. Opinions are marked. At most the caller asks for one topic.

import { curveCoachingRules } from "../curve-role-coach.mjs";
import { COMMANDER_GUIDES } from "../commanders/data.mjs";
import { buildSpotlight } from "./spotlight.mjs";
import { cardFactSentence, countRoles, guidesMatching, knownNamesFrom, listNames, presentCard } from "./grounding.mjs";
import { decidePublication, slugify, wordCount } from "./policy.mjs";

const DAY = 24 * 60 * 60 * 1000;

export const EVERGREEN_TOPICS = Object.freeze([
  { id: "theory-threat-assessment", kind: "threat", cooldownDays: 75, order: 1 },
  { id: "theory-politics", kind: "politics", cooldownDays: 75, order: 2 },
  { id: "theory-archetypes", kind: "archetypes", cooldownDays: 90, order: 3 },
  { id: "cards-overperform", kind: "overperform", cooldownDays: 60, order: 4 },
  { id: "cards-underperform", kind: "underperform", cooldownDays: 60, order: 5 },
  { id: "older-set", kind: "older-set", cooldownDays: 120, order: 6 },
  { id: "retrospective-answers", kind: "retrospective", cooldownDays: 90, order: 7 },
  { id: "budget-mana-swaps", kind: "budget", cooldownDays: 60, order: 8 },
  { id: "upgrade-guide", kind: "upgrade", cooldownDays: 45, order: 9 },
  { id: "event-analysis", kind: "event", cooldownDays: 30, order: 10, requiresPrior: true },
  { id: "commander-spotlight", kind: "spotlight", cooldownDays: 45, order: 11 },
]);

function coveredAt(coverage, id) {
  const row = (coverage || []).find((item) => item.topicId === id);
  return row ? Number(row.coveredAt) || 0 : 0;
}

export function selectEvergreenTopic({ coverage = [], now, priorItems = [], cardPool = [], topics = EVERGREEN_TOPICS }) {
  const ready = topics.filter((topic) => {
    const last = coveredAt(coverage, topic.id);
    if (last && Number(now) - last < topic.cooldownDays * DAY) return false;
    if (topic.requiresPrior && !priorItems.length) return false;
    if ((topic.kind === "overperform" || topic.kind === "underperform" || topic.kind === "budget" || topic.kind === "older-set" || topic.kind === "retrospective") && cardPool.length < 2) return false;
    return true;
  });
  ready.sort((a, b) => coveredAt(coverage, a.id) - coveredAt(coverage, b.id) || a.order - b.order);
  return ready[0] || null;
}

function finish(draft, existing) {
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}

function baseDraft({ id, title, description, category, tags, now, topicKey, hook, thesis, engineTake, sections, takeaways, cards, commander, known, sourceText, reachable, quote, sources, decklist }) {
  return {
    slug: slugify(title),
    title,
    description,
    category,
    tags,
    provenance: "evergreen-prose",
    topicKey,
    dedupeKey: `evergreen:${id}:${topicKey}`,
    publishedAt: now.slice(0, 10),
    updatedAt: now.slice(0, 10),
    byline: "MetaForge Coach",
    hook,
    thesis,
    engineTake,
    sections,
    takeaways,
    decklist: decklist || null,
    commanderLinks: commander ? [{ slug: commander.guide.slug, name: commander.card.name, reason: "The guide uses this commander's oracle text." }] : [],
    forgeCta: commander
      ? { href: `/?commander=${commander.guide.slug}`, label: "Build this", commanderName: commander.card.name }
      : { href: "/?intent=build", label: "Build this", commanderName: null },
    sources: sources || [{ label: "MetaForge coaching rules", url: "https://metaforge.gg/methodology" }],
    externalQuote: quote || null,
    mentionedNames: cards.map((card) => card.name).concat(commander ? [commander.card.name] : []),
    setReleasedAt: null,
    grounding: {
      present: true,
      knownNames: known,
      setReleasedAt: null,
      sourceText: sourceText || cards.map((card) => card.oracleText).join("\n"),
      sourceReachable: reachable !== false,
    },
  };
}

function threatArticle(now, pool, existing) {
  const rules = curveCoachingRules();
  const band = rules.baseRoles.interaction;
  const cards = pool.map(presentCard).filter((card) => card.roles.includes("interaction")).slice(0, 3);
  const guides = guidesMatching(COMMANDER_GUIDES, (card) => card.roles.includes("interaction"));
  const commander = guides[0] || null;
  const known = knownNamesFrom(cards, commander ? [commander.card] : []);
  return finish(baseDraft({
    id: "theory-threat-assessment",
    title: "Threat assessment is an interaction decision",
    description: "The coach treats threat assessment as choosing which permanent the interaction band is for, using printed text rather than a threat ranking.",
    category: "theory",
    tags: ["theory", "interaction", "threat-assessment"],
    now,
    topicKey: "theory:threat-assessment",
    hook: "Someone asks what the threat is, and three players point at three permanents. The coach does not keep a secret ranking of those permanents. It keeps an interaction band, and it keeps the text of the answer you actually hold.",
    thesis: `Threat assessment, in this engine, is not a scoreboard. It is the decision of which problem your interaction cards, band ${band[0]}–${band[1]} in the base rules, are being asked to solve. A card you cannot quote is not yet a threat you can act on.`,
    engineTake: cards.length
      ? `Answers in the pool: ${cards.map((card) => `${card.name} (${card.roles.join(", ")})`).join("; ")}.`
      : "The pool had no interaction card to illustrate the point.",
    sections: [
      {
        id: "what-it-is",
        heading: "A threat is a permanent your answer can see",
        paragraphs: [
          `The base interaction band is ${band[0]}–${band[1]}. That is how many answer cards the coach wants available across a deck, not how many threats exist at a table. Assessment happens after you know which of those answers you drew.`,
          cards.length
            ? `From the card pool: ${cards.map(cardFactSentence).join(" ")} The opinion: point these at the permanent whose text will end the game if it resolves again, not at the permanent that merely looks large. The quoted sentence is the test. If your answer does not touch that sentence, it is the wrong answer, however scary the creature is.`
            : "No interaction card was in the pool, so this essay will not invent an example removal spell.",
          "The coach's opinion: the scariest permanent is the one your table cannot afford to let untap. That is a judgment. It is not a statistic. Players who outsource it to a list of 'kill on sight' commanders skip the part where their own deck needed the mana more than it needed the answer.",
        ],
        cards,
      },
      {
        id: "order",
        heading: "Order the problems, then spend the card",
        paragraphs: [
          "A creature that dies to a wrath you were already casting is not the threat. The enchantment that survives the wrath is. The coach separates interaction and board wipes for this reason. Spending a spot answer on a body your wipe was going to hit is how the real problem resolves.",
          commander
            ? `If your commander is ${commander.card.name}, start from that card's text. ${cardFactSentence(commander.card)} The opinion: a commander that is itself an answer changes what you are allowed to ignore. A commander that is the engine changes what you are required to protect. Do not copy another table's kill list.`
            : "No guide commander classified as interaction, so the example stays with the pool cards.",
          "Nothing here says a particular commander wins more games. The next time the table asks what the threat is, quote the permanent and quote your answer. If you cannot, you are guessing, and the essay's only advice is to stop spending the card.",
        ],
        cards: commander ? [commander.card] : [],
      },
      {
        id: "take",
        heading: "Leave the unanswerable ones alone",
        paragraphs: [
          "Some problems are not yours. A player who is behind does not need your removal spent to make a leader's board polite. The opinion: threat assessment includes the decision not to act. The interaction band is a budget. Emptying it on turn five to impress the table is how you die to the next spell.",
          "This essay does not name a card that was not in the pool or the guide library. If you wanted a specific answer and it is missing, that is because its oracle text was not in the input.",
          "Build the deck with the commander whose text you are willing to defend. The button below does that. It does not rank the rest of the pod.",
        ],
      },
    ],
    takeaways: [
      `Keep the interaction band (${band[0]}–${band[1]}) as a budget, not a quota to fire immediately.`,
      "Quote the permanent and quote your answer before you call something the threat.",
      "A wipe and a spot answer are different spends. Do not use one to feel like you used the other.",
    ],
    cards: [...cards, ...(commander ? [commander.card] : [])],
    commander,
    known,
  }), existing);
}

function politicsArticle(now, pool, existing) {
  const rules = curveCoachingRules();
  const cards = pool.map(presentCard).filter((card) => card.roles.includes("interaction") || card.roles.includes("draw")).slice(0, 3);
  const known = knownNamesFrom(cards);
  return finish(baseDraft({
    id: "theory-politics",
    title: "Politics is what you do when the answer is still in your hand",
    description: "A Commander politics note that stays inside the coach's interaction and card-advantage bands and the cards on record.",
    category: "theory",
    tags: ["theory", "politics", "interaction"],
    now,
    topicKey: "theory:politics",
    hook: "Politics is the word players use when they want a result and do not want to spend a card. Sometimes that is wise. Sometimes it is how you describe not having the answer.",
    thesis: `The coach does not have a politics band. It has interaction (${rules.baseRoles.interaction[0]}–${rules.baseRoles.interaction[1]}) and card advantage (${rules.baseRoles.draw[0]}–${rules.baseRoles.draw[1]}). Politics is the table talk around those cards. It does not replace them.`,
    engineTake: "A deal that draws you a card is card advantage only if a card's text or the game rules made that happen. Conversation is not a draw trigger.",
    sections: [
      {
        id: "talk",
        heading: "Talk is not a role",
        paragraphs: [
          "You can convince a player to point their removal elsewhere. That can be the right play. The opinion: it is a play because you looked at the text of their answer and the text of the permanent, not because you were charming. Charm is not in the classifier.",
          cards.length
            ? `Cards in the pool that can actually change a board or a hand: ${listNames(cards)}. ${cards.map(cardFactSentence).join(" ")}`
            : "The pool did not include an interaction or draw card, so this note will not pretend a specific spell is political.",
          "The coach's opinion: if your politics require an opponent to misread a card, they are not a plan. Quote the card. Players who know the text make better deals, and they also know when you are offering nothing.",
        ],
        cards,
      },
      {
        id: "deals",
        heading: "A deal needs a cost",
        paragraphs: [
          "The deals that hold up are the ones with a card behind them. 'I will not attack you' is free and expires. 'I will counter the next spell that kills your commander, and here is the counter' is a deal with a printed cost. The opinion: prefer the second. It spends the interaction band on purpose.",
          `Card advantage sits at ${rules.baseRoles.draw[0]}–${rules.baseRoles.draw[1]} before a plan shifts it. A political deck that gives everyone cards is often donating the band it was supposed to keep. If the text says each player draws, the classifier may still mark draw. That does not mean you gained the cards alone. Read the sentence.`,
          "No win rate is attached to being the friendly player. Tables remember the person who broke a deal. They also remember the person who never had a spell.",
        ],
      },
      {
        id: "build",
        heading: "Build the cards, then talk",
        paragraphs: [
          "Sleeve the answers first. The conversation is what you do on the turn you choose not to cast one. A deck with nothing to cast has no politics. It has a request.",
          "The coach's opinion: politics is a way to spend the interaction band more slowly. It is not a substitute band. If you cut removal because you 'play political,' you have changed the deck's math and kept the adjective.",
          "The build button starts a deck. It will not negotiate for you.",
        ],
      },
    ],
    takeaways: [
      "The engine has no politics role. It has interaction and card advantage.",
      "A deal with a printed spell behind it is different from a promise.",
      "Do not cut the interaction band and call the cut politics.",
    ],
    cards,
    commander: null,
    known,
  }), existing);
}

function archetypeArticle(now, existing) {
  const rules = curveCoachingRules();
  const plans = Object.keys(rules.shareByPlan);
  const examples = ["spellslinger", "big-creatures", "tokens", "control"].filter((plan) => rules.shareByPlan[plan]);
  const lines = examples.map((plan) => `${plan} aims at average mana value ${rules.idealAverage[plan]}`).join("; ");
  return finish(baseDraft({
    id: "theory-archetypes",
    title: "An archetype is a curve and a set of bands",
    description: "The coach's archetype differences are the curve shares and role shifts already in the rules, not a list of brand-name decks.",
    category: "theory",
    tags: ["theory", "archetypes", "curve"],
    now,
    topicKey: "theory:archetypes",
    hook: "Ask four players what their deck is and you will hear a creature type, a commander, a vibe, and a combo. The coach hears a plan id, because that is the only thing it knows how to score.",
    thesis: `The curve table knows these plans: ${plans.join(", ")}. ${lines}. An archetype, here, is one of those plans plus the role shifts attached to it. A name on a forum is not an archetype until it maps to one of those rows.`,
    engineTake: `Control's interaction shift is ${rules.roleShift.control.interaction.join(", ")}. Landfall's ramp shift is ${rules.roleShift.landfall.ramp.join(", ")}. Those are the mechanical differences the coach will defend.`,
    sections: [
      {
        id: "plans",
        heading: "Pick the row before you pick the cards",
        paragraphs: [
          `Spellslinger average ${rules.idealAverage.spellslinger}. Big creatures ${rules.idealAverage["big-creatures"]}. Tokens ${rules.idealAverage.tokens}. Control ${rules.idealAverage.control}. Those are not suggestions from a metagame report. They are the averages the curve coach already stores.`,
          "The coach's opinion: players lose games they describe as 'my archetype is fine' when the list is two plans at once. A token deck with a big-creatures curve is not a hybrid. It is a deck that is late to the token turn and early to a board it cannot cast. Choose the row.",
          "This page will not name a stock list. Stock lists smuggle cards in that were never scored. The plans above are the whole claim.",
        ],
      },
      {
        id: "shifts",
        heading: "The shift is the archetype's tell",
        paragraphs: [
          `A control list that does not move interaction up, toward the shifted band, is using the word control for a midrange pile. The base interaction band is ${rules.baseRoles.interaction[0]}–${rules.baseRoles.interaction[1]}. Control adds ${rules.roleShift.control.interaction[0]}. Landfall adds ${rules.roleShift.landfall.ramp[0]} to ramp because the plan spends lands as spells.`,
          "The coach's opinion: if you cannot say which shift you are playing for, you do not have the archetype yet. You have a commander and a stack of cards you like. That can still be a good deck. It is not yet this table.",
          "Creature types are not plans unless the typal row is the one you meant. The typal average is " + `${rules.idealAverage.typal}. It is closer to tokens than to big creatures. Elves that cost six are not the typal row.`,
        ],
      },
      {
        id: "use",
        heading: "Use the row when you cut",
        paragraphs: [
          "When a card feels off, ask which row it serves. A six-drop in a spellslinger row has to justify the share it stole from the two-drops. A one-drop in a big-creatures row has to be mana or a draw, not a threat you will never attack with.",
          "The coach's opinion: archetypes are useful because they make cuts obvious. They are useless as identity. Nobody wins because they announced the word.",
          "Build against a commander whose text you can quote. Then hold the list up to one row, not three.",
        ],
      },
    ],
    takeaways: [
      `The coach's plans include ${examples.join(", ")}, each with its own average mana value.`,
      "A shift in ramp or interaction is the tell that you are actually on that plan.",
      "Do not call a pile an archetype until it matches one row.",
    ],
    cards: [],
    commander: null,
    known: [],
    sourceText: "engine curve table",
    reachable: true,
  }), existing);
}

function performanceArticles(kind, now, pool, existing) {
  const cards = pool.map(presentCard).filter((card) => card.cmc != null);
  const picked = kind === "overperform"
    ? cards.filter((card) => card.roles.length >= 2 && card.cmc <= 3).slice(0, 4)
    : cards.filter((card) => card.cmc >= 4 && card.roles.length <= 1).slice(0, 4);
  if (picked.length < 2) return null;
  const known = knownNamesFrom(picked);
  const title = kind === "overperform"
    ? "Cards that do more jobs than their mana value admits"
    : "Cards whose mana value buys a single job";
  const topicKey = kind === "overperform" ? "cards:overperform" : "cards:underperform";
  return finish(baseDraft({
    id: kind === "overperform" ? "cards-overperform" : "cards-underperform",
    title,
    description: kind === "overperform"
      ? "A coach's note on cards in the pool with two or more roles at mana value 3 or less. No play-rate claim."
      : "A coach's note on higher mana-value cards in the pool that classified into at most one role.",
    category: "theory",
    tags: ["theory", kind === "overperform" ? "overperform" : "underperform"],
    now,
    topicKey,
    hook: kind === "overperform"
      ? "Some cards feel stronger than their cost. The coach will only say that when the printed text matched more than one job and the mana value was low."
      : "Some cards feel like they should do more. The coach's version of that complaint is a high mana value and a single role, or none.",
    thesis: kind === "overperform"
      ? `In the current pool, ${listNames(picked)} classified into at least two roles at mana value 3 or less. That is the whole definition of "overperform" on this page. It is not a statement about tournaments.`
      : `In the current pool, ${listNames(picked)} sit at mana value 4 or more and classified into one role or none. "Underperform" here means the cost is high for the number of jobs, not that the card loses games.`,
    engineTake: picked.map((card) => `${card.name}: mana value ${card.cmc}, roles ${card.roles.join(", ") || "none"}`).join(". ") + ".",
    sections: [
      {
        id: "cards",
        heading: "The cards that met the rule",
        paragraphs: [
          picked.map(cardFactSentence).join(" "),
          kind === "overperform"
            ? "The coach's opinion: a card with two jobs at a low mana value is easier to keep in a hand because it is not dead when the first job is unavailable. That is an argument about flexibility. It is not a promise that the card is underplayed."
            : "The coach's opinion: a single job can still be the right job. A wrath should not also draw cards to justify its cost. Call it a narrow card, then decide if the job is worth the mana. Do not call it bad because a metric on a website frowned.",
          "No popularity percentage and no price enters this comparison. Two cards with the same number of roles are not being ranked against each other beyond mana value.",
        ],
        cards: picked,
      },
      {
        id: "use",
        heading: "How to use the label",
        paragraphs: [
          kind === "overperform"
            ? "Cut a narrow expensive card before you cut one of these, when both jobs are jobs your list uses. If you do not use one of the roles, the extra role is not value. It is text you are not on."
            : "Keep the narrow card when the job is the one you are short. Cut it when you already have the job at a lower mana value in the same pool. The budget note elsewhere on this site makes that swap in mana, not in dollars.",
          "The coach's opinion: labels like overperform are dangerous because they sound like results. This page defined the word before it used it. If you repeat the word, repeat the definition.",
          "Sleeve from the package if the jobs match your commander. Otherwise leave the cards in the binder. The definition will still be here next week.",
        ],
      },
      {
        id: "limits",
        heading: "What the label does not mean",
        paragraphs: [
          "It does not mean the card wins more. It does not mean the card is mispriced by a store. It does not mean a card outside this pool failed the test. The pool is the input.",
          "A card with no role is not an underperformer by drama. It is unclassified. Some unclassified cards are weird enough to be the deck. The classifier's silence is a reason to read the text, not a reason to cut.",
          "Bring a commander whose text wants these jobs, then build. The button does not know which of these cards you own.",
        ],
      },
    ],
    takeaways: [
      kind === "overperform"
        ? "Overperform, here, means two roles at mana value 3 or less."
        : "Underperform, here, means mana value 4 or more and at most one role.",
      `The cards that qualified: ${listNames(picked)}.`,
      "Do not repeat the label without the definition, and do not attach a win rate.",
    ],
    cards: picked,
    commander: null,
    known,
  }), existing);
}

function olderSetArticle(now, older, existing) {
  const set = older?.set || {};
  const cards = (older?.cards || []).map(presentCard).slice(0, 6);
  if (!set.name || cards.length < 2) return null;
  const known = knownNamesFrom(cards);
  const released = set.releasedAt || set.released_at || null;
  return finish(baseDraft({
    id: "older-set",
    title: `${set.name} still has jobs, not just a release date`,
    description: `${set.name}${released ? `, dated ${released} on the set record,` : ""} scored from the cards stored for that set.`,
    category: "set-reviews",
    tags: ["set-review", "older-sets", set.code].filter(Boolean),
    now,
    topicKey: `older-set:${set.code || slugify(set.name)}`,
    hook: `Old sets get treated as bulk. ${set.name} is old only if you care about the date. The coach cares about whether the text still does a job.`,
    thesis: `${cards.length} cards from ${set.name} were scored.${released ? ` The set record says ${released}.` : ""} ${countRoles(cards).slice(0, 4).map(([role, count]) => `${role} ${count}`).join(", ") || "No roles repeated."} Those counts are the retrospective.`,
    engineTake: cards.map((card) => `${card.name}: ${card.roles.join(", ") || "no role"}`).join(". ") + ".",
    sections: [
      {
        id: "cards",
        heading: "The stored cards",
        paragraphs: [
          cards.map(cardFactSentence).join(" "),
          "The coach's opinion: a staple is a card whose text still matches a job you are short. The date on the set is context. It is not an argument to cut the card, and it is not an argument to keep it.",
          released
            ? `The date ${released} is the set record's date. It is not being applied to any other printing.`
            : "No release date was on the set record.",
        ],
        cards,
      },
      {
        id: "jobs",
        heading: "Which jobs survived",
        paragraphs: [
          `Roles across this slice: ${countRoles(cards).map(([role, count]) => `${role} ${count}`).join(", ") || "none"}. A Commander deck in the current year still pays for ramp, draw, and interaction. If those words are in the count, the set is not bulk. If they are absent, the slice you stored did not prove the set is useless either. It proved this slice.`,
          "The coach's opinion: revisit an old set by jobs. Do not revisit it by nostalgia, and do not skip it because a newer set has shinier legends. The newer legend still needs the ramp spell from 2016 if that spell's text is the one that puts a land onto the battlefield.",
          "This is not a complete gallery of the set. Cards that were not in the stored slice are not judged.",
        ],
      },
      {
        id: "today",
        heading: "What to do with them now",
        paragraphs: [
          "If your list is short a role that appears above, the named card is a candidate. Read the quote. Check the mana value. Then decide. The opinion: most 'updates' should be this boring.",
          "Do not pay a premium because a card is old, and do not assume it is cheap because it is old. This page has no prices on purpose.",
          "Build around a commander that wants the job. The set can supply the card. It should not supply the plan.",
        ],
      },
    ],
    takeaways: [
      `${set.name} contributed ${cards.length} scored cards${released ? `, dated ${released}` : ""}.`,
      "Keep a card because the role is missing, not because the set is old or new.",
      "Unstored cards were not reviewed.",
    ],
    cards,
    commander: null,
    known,
    sourceText: cards.map((card) => card.oracleText).join("\n"),
  }), existing);
}

function budgetArticle(now, pool, existing) {
  const cards = pool.map(presentCard).filter((card) => card.cmc != null && card.roles.length);
  const pairs = [];
  for (const expensive of cards) {
    const cheaper = cards.find((card) => card.name !== expensive.name && card.cmc < expensive.cmc && card.roles.some((role) => expensive.roles.includes(role)));
    if (cheaper) pairs.push([expensive, cheaper]);
    if (pairs.length === 2) break;
  }
  if (!pairs.length) return null;
  const flat = pairs.flat();
  const known = knownNamesFrom(flat);
  return finish(baseDraft({
    id: "budget-mana-swaps",
    title: "Budget swaps, counted in mana rather than dollars",
    description: "The coach has no price feed. A cheaper swap here means a lower printed mana value that shares a classifier role.",
    category: "theory",
    tags: ["budget", "mana", "swaps"],
    now,
    topicKey: "swaps:mana-cost",
    hook: "Budget advice usually means a dollar amount. This coach does not have a price feed, and it will not invent one to sound like a buyer's guide.",
    thesis: `A budget swap, on this page, is a card with a lower printed mana value that shares a classifier role with a more expensive card in the same pool. The pairs that qualified: ${pairs.map(([high, low]) => `${low.name} (mana value ${low.cmc}) for ${high.name} (mana value ${high.cmc})`).join("; ")}.`,
    engineTake: "Lower mana value is not lower dollars. The opinion is only that the cheaper mana card is easier to cast if the shared role is the job you needed.",
    sections: [
      {
        id: "pairs",
        heading: "The pairs in the pool",
        paragraphs: [
          pairs.map(([high, low]) => `${cardFactSentence(high)} ${cardFactSentence(low)} Shared role: ${low.roles.filter((role) => high.roles.includes(role)).join(", ")}.`).join(" "),
          "The coach's opinion: make the swap when you are missing early casts, not when you want to feel frugal. If the expensive card's extra role is the one your commander needs, keep it and admit you are paying mana for that role.",
          "There is no store link and no converted price. Anyone who adds a dollar figure to this paragraph is no longer quoting the coach.",
        ],
        cards: flat,
      },
      {
        id: "when",
        heading: "When not to swap down",
        paragraphs: [
          "Do not swap down if the cheaper card's quote is a narrower effect. Shared role is a blunt instrument. A counterspell and a fight spell can both be interaction and still answer different problems. Read both quotes before you sleeve the cheaper one.",
          "The coach's opinion: mana value is the budget a Commander deck actually spends every game. Dollars are spent once. If you have to choose which constraint to respect first, respect the mana, then buy what you can. This page can only help with the first constraint.",
          "A swap is one card, not a new deck. The package lists the cards that were compared.",
        ],
      },
      {
        id: "limits",
        heading: "The limit of a priceless budget",
        paragraphs: [
          "Players still need to know what a card costs in money. That number lives at a store, not here. Refusing to invent it is the point.",
          "The coach's opinion: a content site that prints a price it did not fetch is worse than a content site that tells you to look it up. Look it up. Then come back to the mana comparison, which will not have moved.",
          "Build the deck at the mana the plan can cast. The button starts that. It does not check your collection's receipt.",
        ],
      },
    ],
    takeaways: [
      "Budget, here, means printed mana value.",
      `The swaps: ${pairs.map(([high, low]) => `${low.name} instead of ${high.name}`).join("; ")}.`,
      "Confirm the quotes match the job before you cut the expensive card.",
    ],
    cards: flat,
    commander: null,
    known,
  }), existing);
}

function upgradeArticle(now, pool, coverage, existing) {
  const used = new Set((coverage || []).filter((row) => String(row.topicId || "").startsWith("upgrade:")).map((row) => row.topicId));
  const guides = guidesMatching(COMMANDER_GUIDES, () => true);
  const guide = guides.find((row) => !used.has(`upgrade:${row.guide.slug}`)) || guides[0];
  if (!guide) return null;
  const support = pool.map(presentCard).filter((card) => card.roles.some((role) => guide.card.roles.includes(role))).slice(0, 4);
  if (!support.length) return null;
  const known = knownNamesFrom(support, [guide.card]);
  const article = finish(baseDraft({
    id: `upgrade:${guide.guide.slug}`,
    title: `An upgrade pass for ${guide.card.name}, by shared jobs`,
    description: `Support cards for ${guide.card.name} chosen because they share a classifier role with the commander's oracle text.`,
    category: "commander-spotlights",
    tags: ["upgrade", "commander", guide.guide.slug],
    now,
    topicKey: `upgrade:${guide.guide.slug}`,
    hook: `${guide.card.name} does not need a trend. It needs cards whose text touches the same jobs its own text already named.`,
    thesis: `${cardFactSentence(guide.card)} The pool cards that share a role: ${listNames(support)}. That is the upgrade pass. It is not a list of expensive replacements.`,
    engineTake: `Shared roles are the filter. ${support.map((card) => `${card.name} ${card.roles.filter((role) => guide.card.roles.includes(role)).join("/")}`).join("; ")}.`,
    sections: [
      {
        id: "commander",
        heading: "The sentence you are upgrading toward",
        paragraphs: [
          cardFactSentence(guide.card),
          "The coach's opinion: an upgrade that does not touch this sentence is a different deck that happens to use the same commander. Those decks exist. They should be described honestly.",
          "The full guide is linked. This note is the cut list's logic, not a replacement for the guide.",
        ],
        cards: [guide.card],
      },
      {
        id: "adds",
        heading: "What to try adding",
        paragraphs: [
          support.map(cardFactSentence).join(" "),
          "The coach's opinion: add one of these and take out a card that shares no role with the commander and no role with your mana. Do not add all of them and call it an upgrade. A deck can be too on-theme and still miss land drops.",
          "No card was selected for its price or its reputation. If a famous upgrade is missing, its text was not in the pool.",
        ],
        cards: support,
      },
      {
        id: "cuts",
        heading: "What an upgrade is allowed to cut",
        paragraphs: [
          "Cut a card whose quoted text does not show up in the commander's roles and does not fix mana or answers. Keep the bands from the theory notes: you still need lands, interaction, and card advantage even after the theme is perfect.",
          "The coach's opinion: the most common failed upgrade is adding three versions of the commander's sentence and cutting the removal that lets the sentence resolve. Theme is not a shield.",
          "Then build. The forge link selects this commander because the guide slug is real.",
        ],
      },
    ],
    takeaways: [
      `Start from ${guide.card.name}'s printed text, not from a list of upgrades.`,
      `Try ${listNames(support)} because they share a role.`,
      "Do not spend the interaction band to make room for more theme.",
    ],
    cards: [guide.card, ...support],
    commander: guide,
    known,
  }), existing);
  if (article) article.topicId = `upgrade:${guide.guide.slug}`;
  return article;
}

function eventArticle(now, prior, pool, existing) {
  const item = prior[0];
  if (!item?.title || !item?.text) return null;
  const quote = item.externalQuote?.text || null;
  const sourceText = item.grounding?.sourceText || item.text || "";
  const named = pool.map(presentCard).filter((card) => sourceText.toLowerCase().includes(card.name.toLowerCase()) || String(item.title).toLowerCase().includes(card.name.toLowerCase()));
  const guides = guidesMatching(COMMANDER_GUIDES, (card) => sourceText.toLowerCase().includes(card.name.toLowerCase()) || String(item.title).toLowerCase().includes(card.name.toLowerCase()));
  const commander = guides[0] || null;
  const cards = [...named, ...(commander ? [commander.card] : [])].filter((card, index, list) => list.findIndex((other) => other.name === card.name) === index).slice(0, 3);
  const known = knownNamesFrom(cards);
  return finish(baseDraft({
    id: "event-analysis",
    title: `What “${item.title}” changes for a Commander deck`,
    description: `A Commander reading of a previously fetched item from ${item.sources?.[0]?.label || "a source"}. Claims stay inside that item.`,
    category: "news",
    tags: ["news", "analysis"],
    now,
    topicKey: `event:${item.dedupeKey || item.slug}`,
    hook: `The item “${item.title}” is already in the notebook. The question now is what a Commander player is allowed to conclude from it.`,
    thesis: quote
      ? `The sentence on file is “${quote}” That sentence, plus any card it actually names, is the event. The rest is opinion about how to respond, and the opinion does not add facts.`
      : `The stored item did not keep a quotation. The title is “${item.title}.” This note will not invent the body of a piece it cannot quote.`,
    engineTake: cards.length
      ? `Named in the stored item and present in the card pool: ${cards.map((card) => card.name).join(", ")}.`
      : "No card name in the stored item matched the pool.",
    sections: [
      {
        id: "item",
        heading: "The item, and only the item",
        paragraphs: [
          quote
            ? `Quoted from the earlier fetch: “${quote}” The source remains ${item.sources?.[0]?.label || "the original link"}.`
            : "No quotation was stored, so this analysis stays with the title and refuses details.",
          item.sources?.[0]?.url
            ? `The link is ${item.sources[0].url}. Read it. If the page has changed, this note is about the fetch, not about the page as it looks today.`
            : "No URL was stored with the item.",
          "The coach's opinion: an announcement matters when it names a card you can quote or a rule you can apply. A tone, a joke, or a gallery without names does not change your list.",
        ],
      },
      {
        id: "commander",
        heading: "If a card was named",
        paragraphs: [
          cards.length
            ? cards.map(cardFactSentence).join(" ")
            : "No stored card matched a name in the item. There is no engine score to add.",
          commander
            ? `Because ${commander.card.name} is named and has a guide, the next click is that guide, not a new deck built from a headline.`
            : "No guide commander was named in the stored text.",
          "The coach's opinion: change one card if the quoted sentence gives you a job you were missing. Do not rotate the deck because a site published.",
        ],
        cards,
      },
      {
        id: "wait",
        heading: "What to wait for",
        paragraphs: [
          "Wait for oracle text before you believe a spoiler's nickname. The spoiler pipeline scores cards when Scryfall has the text. Until then, the honest action is to leave the deck alone.",
          "The coach's opinion: impatience is how players sleeve a card that does not do the thing the headline promised. The headline is not the rules.",
          "If you already know your commander, build. The event did not pick one for you unless the text named one.",
        ],
      },
    ],
    takeaways: [
      quote ? "The analysis rests on one stored sentence." : "Without a stored sentence, the analysis does not invent one.",
      cards.length ? `Only ${listNames(cards)} were both named and on file.` : "No card was both named and on file.",
      "Do not edit a deck from a headline.",
    ],
    cards,
    commander,
    known,
    sourceText,
    quote: quote ? { text: quote, url: item.sources?.[0]?.url || "", sourceTitle: item.sources?.[0]?.label || "" } : null,
    sources: item.sources || [],
  }), existing);
}

function spotlightTopic(now, pool, coverage, existing) {
  const used = new Set((coverage || []).map((row) => row.topicId));
  const guides = COMMANDER_GUIDES.filter((guide) => !used.has(`spotlight:${guide.slug}`));
  const guide = guides[0] || COMMANDER_GUIDES[0];
  if (!guide) return null;
  const article = buildSpotlight({
    commander: {
      name: guide.card.name,
      mana_cost: guide.card.mana_cost,
      type_line: guide.card.type_line,
      oracle_text: guide.card.oracle_text,
      color_identity: guide.card.color_identity,
    },
    guide,
    pool,
    now: now.slice(0, 10),
    existing,
  });
  if (!article) return null;
  article.provenance = "evergreen-prose";
  article.topicKey = `spotlight:${guide.slug}`;
  article.dedupeKey = `evergreen:spotlight:${guide.slug}`;
  article.topicId = `spotlight:${guide.slug}`;
  const decision = decidePublication({ ...article, wordCount: wordCount(article) }, existing);
  return { ...article, ...decision, confidence: decision.confidence };
}

export function writeEvergreen({ topic, now, cardPool = [], olderSet = null, priorItems = [], coverage = [], existing = [] }) {
  if (!topic) return null;
  const iso = new Date(Number(now)).toISOString();
  let article = null;
  if (topic.kind === "threat") article = threatArticle(iso, cardPool, existing);
  else if (topic.kind === "politics") article = politicsArticle(iso, cardPool, existing);
  else if (topic.kind === "archetypes") article = archetypeArticle(iso, existing);
  else if (topic.kind === "overperform" || topic.kind === "underperform") article = performanceArticles(topic.kind, iso, cardPool, existing);
  else if (topic.kind === "older-set") article = olderSetArticle(iso, olderSet, existing);
  else if (topic.kind === "retrospective") article = olderSetArticle(iso, olderSet, existing) || performanceArticles("underperform", iso, cardPool, existing);
  else if (topic.kind === "budget") article = budgetArticle(iso, cardPool, existing);
  else if (topic.kind === "upgrade") article = upgradeArticle(iso, cardPool, coverage, existing);
  else if (topic.kind === "event") article = eventArticle(iso, priorItems, cardPool, existing);
  else if (topic.kind === "spotlight") article = spotlightTopic(iso, cardPool, coverage, existing);
  if (!article) return null;
  article.topicId = article.topicId || topic.id;
  return article;
}
