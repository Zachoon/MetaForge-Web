// Theory primers. Every number is read from the coaching modules at
// generation time. Card sentences are built from stored oracle text and
// classifyNativeCard. Opinions are labeled and do not add counts.

import { curveCoachingRules } from "../curve-role-coach.mjs";
import { commanderSourceTarget, publishedManaBaseline } from "../mana-base-coach.mjs";
import { COMMANDER_GUIDES } from "../commanders/data.mjs";
import { cardFactSentence, guidesMatching, knownNamesFrom, listNames, manaValueFromCost, presentCard } from "./grounding.mjs";
import { decidePublication, wordCount } from "./policy.mjs";

function range([low, high]) {
  return low === high ? String(low) : `${low}–${high}`;
}

function shifted(base, shift = [0, 0]) {
  return [base[0] + shift[0], base[1] + shift[1]];
}

function pct(share) {
  return `${Math.round(Number(share) * 100)}%`;
}

function shares(plan) {
  const rules = curveCoachingRules();
  return rules.labels.map((label, index) => `${label} ${pct(rules.shareByPlan[plan][index])}`).join(", ");
}

function finish(draft, existing) {
  const withWords = { ...draft, wordCount: wordCount(draft) };
  const decision = decidePublication(withWords, existing);
  return { ...withWords, ...decision, confidence: decision.confidence };
}

function forgeCta(slug, name) {
  return slug
    ? { href: `/?commander=${slug}`, label: "Build this", commanderName: name }
    : { href: "/?intent=build", label: "Build this", commanderName: null };
}

function packageFrom(cards, commander) {
  const lines = [];
  if (commander) lines.push({ name: commander.card.name, slug: commander.guide.slug, quantity: 1, role: "commander" });
  for (const card of cards) {
    if (lines.some((line) => line.name === card.name)) continue;
    lines.push({ name: card.name, slug: card.slug, quantity: 1, role: (card.roles || []).join(", ") || "example" });
  }
  return {
    title: commander ? `A package around ${commander.card.name}` : "A package from the cards named above",
    note: "This is a package of cards whose printed text was scored above. It is not a 100-card deck, and it is not a claim about win rate.",
    commanderSlug: commander?.guide.slug || null,
    commanderName: commander?.card.name || null,
    lines,
  };
}

function guideCard(guide) {
  return presentCard({
    name: guide.card.name,
    mana_cost: guide.card.mana_cost,
    cmc: manaValueFromCost(guide.card.mana_cost),
    type_line: guide.card.type_line,
    oracle_text: guide.card.oracle_text,
    color_identity: guide.card.color_identity,
  });
}

export function buildCurveArticle(staples, now, existing = []) {
  const rules = curveCoachingRules();
  const spellslinger = rules.idealAverage.spellslinger;
  const big = rules.idealAverage["big-creatures"];
  const base = rules.baseRoles;
  const controlInteraction = shifted(base.interaction, rules.roleShift.control.interaction);
  const examples = staples.map(presentCard);
  const cheap = [...examples].sort((a, b) => (a.cmc ?? 99) - (b.cmc ?? 99)).slice(0, 2);
  const expensive = [...examples].sort((a, b) => (b.cmc ?? 0) - (a.cmc ?? 0)).slice(0, 2);
  const rankedGuides = guidesMatching(COMMANDER_GUIDES, (card) => card.cmc != null).sort((a, b) => (b.card.cmc ?? 0) - (a.card.cmc ?? 0) || a.guide.card.name.localeCompare(b.guide.card.name));
  const featured = rankedGuides[0];
  const known = knownNamesFrom(examples, rankedGuides.map((row) => row.card));
  const draft = {
    slug: "how-the-coach-reads-a-commander-curve",
    title: "How the coach reads a Commander curve",
    description: "The coach does not use one Commander curve. Spellslinger and big-creature plans are scored against different mana-value shares.",
    category: "theory",
    tags: ["curve", "ramp", "theory"],
    provenance: "engine-template",
    topicKey: "theory:curve",
    dedupeKey: null,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: "You kept a hand that looked fine, and then turn four arrived with nothing you could cast. That feeling gets blamed on luck, on the shuffle, or on 'needing more ramp.' The coach starts somewhere narrower: where the nonland spells sit on the mana-value buckets it actually scores.",
    thesis: `There is no single Commander curve in this engine. A spellslinger plan is scored toward an average mana value of ${spellslinger}. A big-creatures plan is scored toward ${big}. The same six buckets are used for both, and the share of the nonland deck that should sit in each bucket changes with the plan.`,
    engineTake: `For a 100-card deck the base role bands, before a plan shifts them, are ramp ${range(base.ramp)}, card advantage ${range(base.draw)}, interaction ${range(base.interaction)}, board wipes ${range(base.wipes)}, and win conditions ${range(base.wincon)}. A control shift moves interaction to ${range(controlInteraction)}.`,
    sections: [
      {
        id: "buckets",
        heading: "Six buckets, not a vibe",
        paragraphs: [
          `The curve coach labels nonland spells as ${rules.labels.join(", ")}. Those labels are the whole histogram. A card is not 'early' because it feels early. It lands in the bucket for its mana value.`,
          `Read a spellslinger share as ${shares("spellslinger")}. Read a big-creatures share as ${shares("big-creatures")}. The spellslinger line puts more of the deck on 2 and 3. The big-creatures line is allowed a taller 6+ pile. Treating those as the same mistake is how a dragon deck gets 'fixed' into a deck that no longer casts dragons.`,
          "The coach's opinion: if your plan is the big spell, a top-heavy curve is not automatically a defect. It is a defect when the early buckets that pay for that plan are empty, or when you are playing a low curve plan and still stacking six-drops. The table above is the distinction. It is not a moral ranking of archetypes.",
        ],
      },
      {
        id: "roles",
        heading: "The curve is not the whole job list",
        paragraphs: [
          `Beside the buckets, the same coach asks for role bands. Ramp ${range(base.ramp)}. Card advantage, which the role label calls card advantage and the key calls draw, ${range(base.draw)}. Interaction ${range(base.interaction)}. Board wipes ${range(base.wipes)}. Win conditions ${range(base.wincon)}.`,
          `Plans move those bands. Control adds ${rules.roleShift.control.interaction.join(" and ")} to the interaction band, which is how the band becomes ${range(controlInteraction)}. Landfall adds ${rules.roleShift.landfall.ramp.join(" and ")} to ramp. A big-creatures plan adds ${rules.roleShift["big-creatures"].ramp.join(" and ")} to ramp and ${rules.roleShift["big-creatures"].wincon.join(" and ")} to win conditions. The opinion here is small: copy a role count from a different plan and you are no longer using this coach.`,
          "Nothing in these bands is a tournament win rate. They are the construction targets the coach already uses when it looks at a list. If a future change moves a constant, this page should move with it, because the sentences are filled from those constants.",
        ],
      },
      {
        id: "examples",
        heading: "Cheap and expensive are printed, then classified",
        paragraphs: [
          `Two of the lower mana values in the example pool: ${listNames(cheap)}. ${cheap.map(cardFactSentence).join(" ")}`,
          `Two of the higher mana values in the same pool: ${listNames(expensive)}. ${expensive.map(cardFactSentence).join(" ")}`,
          "The coach's opinion: a mana rock that adds mana and a six-mana sweeper are not interchangeable 'spells.' One changes when you can act. The other spends the turn you already built toward. Cutting the expensive card because a curve chart looked lumpy, without asking which plan that chart belonged to, is the move this page is arguing against.",
        ],
        cards: [...cheap, ...expensive].filter((card, index, list) => list.findIndex((other) => other.name === card.name) === index),
      },
    ],
    takeaways: [
      `Score spellslinger near average mana value ${spellslinger} and big creatures near ${big}. Do not average those into one target.`,
      `Keep ramp, card advantage, interaction, wipes, and win conditions as separate bands. Control's interaction band is ${range(controlInteraction)}, not the base ${range(base.interaction)}.`,
      "Name the plan before you call a curve greedy. The 6+ share is a feature of some plans and a problem for others.",
    ],
    decklist: packageFrom([...cheap, ...expensive].slice(0, 4), featured ? { guide: featured.guide, card: featured.card } : null),
    commanderLinks: rankedGuides.slice(0, 3).map(({ guide, card }) => ({
      slug: guide.slug,
      name: guide.card.name,
      reason: card.cmc == null ? "A commander guide on this site." : `Printed mana value ${card.cmc}, from the mana cost on its guide.`,
    })),
    forgeCta: forgeCta(featured?.guide.slug, featured?.guide.card.name),
    sources: [{ label: "MetaForge curve and role coach", url: "https://metaforge.gg/methodology" }],
    externalQuote: null,
    mentionedNames: [...cheap, ...expensive].map((card) => card.name).concat(featured ? [featured.guide.card.name] : []),
    setReleasedAt: null,
    grounding: { present: true, knownNames: known, setReleasedAt: null, sourceText: "", sourceReachable: true },
  };
  return finish(draft, existing);
}

export function buildManaArticle(staples, now, existing = []) {
  const baseline = publishedManaBaseline();
  const lands = baseline.landRange;
  const turn1 = commanderSourceTarget(1, 1, 99);
  const turn3 = commanderSourceTarget(3, 2, 99);
  const turn4 = commanderSourceTarget(4, 1, 99);
  const wanted = ["Command Tower", "Arcane Signet", "Cultivate", "Nature's Lore", "Sol Ring"];
  const examples = wanted.map((name) => staples.find((card) => card.name === name)).filter(Boolean).map(presentCard);
  const colorGuides = guidesMatching(COMMANDER_GUIDES, () => true).sort((a, b) => b.card.colorIdentity.length - a.card.colorIdentity.length || a.guide.card.name.localeCompare(b.guide.card.name));
  const featured = colorGuides[0];
  const known = knownNamesFrom(examples, colorGuides.map((row) => row.card));
  const inputs = baseline.inputs;
  const draft = {
    slug: "how-the-coach-counts-a-commander-mana-base",
    title: "How the coach counts a Commander mana base",
    description: `At a ${inputs.averageCmc} average and a ${inputs.commanderCmc}-mana commander, the mana coach's baseline land band is ${lands.low}–${lands.high}. Colored sources are a separate count.`,
    category: "theory",
    tags: ["mana", "lands", "ramp", "theory"],
    provenance: "engine-template",
    topicKey: "theory:mana-base",
    dedupeKey: null,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: "Missing a color and missing a land feel the same when the spell stays in your hand. They are not the same repair. One is a count of lands. The other is a count of sources that can pay the pips on the turn the spell asks for them.",
    thesis: `For the coach's published baseline — average mana value ${inputs.averageCmc}, commander mana value ${inputs.commanderCmc}, cheap-rock credit ${inputs.rockCredit}, a 99-card deck, no extra land drops and no landfall shift — the land band is ${lands.low}–${lands.high}. That call already assumes the credit baked into the formula. It is not a universal land count, and it is not a price.`,
    engineTake: `A one-pip spell on turn 1 wants ${turn1} sources of that color under the source table. A two-pip spell on turn 3 wants ${turn3}. A one-pip spell on turn 4 wants ${turn4}. The array index is the pip count, clamped, and the row is the turn.`,
    sections: [
      {
        id: "lands",
        heading: "The land band is an output, not a proverb",
        paragraphs: [
          `The inputs that produced ${lands.low}–${lands.high} are specific. Average mana value ${inputs.averageCmc}. Commander mana value ${inputs.commanderCmc}. Rock credit ${inputs.rockCredit}. Deck size ${inputs.deckSize}. Land-ramp credit ${inputs.landRampCredit}. Extra land drops ${inputs.extraDrops}. Landfall ${inputs.landfall ? "yes" : "no"}. Change an input and the band is allowed to move. Quoting the band without the inputs is how '36 lands' escaped into advice that no longer matches the deck in front of you.`,
          `The same function also reports the band before ramp credit. Printed low ${lands.printedLow}, printed high ${lands.printedHigh}. Baseline before the rock and land-ramp relief, low ${lands.baselineLow}, high ${lands.baselineHigh}. Rock relief on this particular input is ${lands.rockRelief}. Ramp relief is ${lands.rampRelief}. If those numbers are zero, the credited band and the plain band match, which is what this input set does.`,
          "The coach's opinion: add lands when you are short of the band your curve actually produced. Do not add lands because a different deck, with a different commander mana value, was short. And do not cut lands down to the bottom of the band and then also cut the rocks that the credit assumed were there.",
        ],
      },
      {
        id: "colors",
        heading: "Sources are timed, not just colored",
        paragraphs: [
          `Color is counted by turn and by pips. Turn 1, one pip: ${turn1} sources. Turn 3, two pips: ${turn3}. Turn 4, one pip: ${turn4}. A source that enters tapped, or that adds mana only for a spell type you are not casting, is not a full source for the turn the pip comes due. That judgment lives in the mana coach. This page is not restating a card's text as a source unless the card is one of the examples below.`,
          `The example cards, scored from their stored oracle text: ${examples.map(cardFactSentence).join(" ")}`,
          "The coach's opinion: Command Tower and a signet solve different problems. One is a land that adds a color in the commander's identity. The other is a rock, and it is acceleration only if you are ahead of your land drop, not a land you forgot to count. A spell that searches for a land and puts it onto the battlefield is ramp. A spell that puts a land into your hand still costs you the land play. The classifiers are the check. If a card's roles do not include ramp, this page will not call it ramp to make the paragraph tidier.",
        ],
        cards: examples,
      },
      {
        id: "colors-identity",
        heading: "More colors make the source table louder",
        paragraphs: [
          featured
            ? `${featured.guide.card.name} is the guide commander with the widest color identity in the current guide set: ${featured.card.colorIdentity.join(", ") || "colorless"}. ${cardFactSentence(featured.card)} A wider identity does not raise the land band by itself. It raises the number of separate source counts you have to satisfy on time.`
            : "No commander guide was available to attach a color-identity example.",
          "You can hold the right number of lands and still strand a double-pip spell. The source table is how the coach separates those losses. The opinion: when a two-color deck feels smooth and a four-color deck does not, count sources for the expensive pip before you add another rock that adds 'any color' only once you already have the colors.",
          "This page does not quote a store price, a reprint schedule, or a popularity percentage. If a card's release date is not on the record used here, it is not in the sentence.",
        ],
        cards: featured ? [featured.card] : [],
      },
    ],
    takeaways: [
      `The baseline land band for the stated inputs is ${lands.low}–${lands.high}. Say the inputs when you repeat it.`,
      `One pip on turn 1 wants ${turn1} sources. Two pips on turn 3 want ${turn3}.`,
      "A tapped land, a type-locked rock, and a land tutor that does not put the land onto the battlefield are not generic early mana.",
    ],
    decklist: packageFrom(examples, featured ? { guide: featured.guide, card: featured.card } : null),
    commanderLinks: colorGuides.slice(0, 3).map(({ guide, card }) => ({
      slug: guide.slug,
      name: guide.card.name,
      reason: `${card.colorIdentity.length} color${card.colorIdentity.length === 1 ? "" : "s"} in the guide's color identity${card.colorIdentity.length ? `: ${card.colorIdentity.join(", ")}` : ""}.`,
    })),
    forgeCta: forgeCta(featured?.guide.slug, featured?.guide.card.name),
    sources: [{ label: "MetaForge mana base coach", url: "https://metaforge.gg/methodology" }],
    externalQuote: null,
    mentionedNames: examples.map((card) => card.name).concat(featured ? [featured.guide.card.name] : []),
    setReleasedAt: null,
    grounding: { present: true, knownNames: known, setReleasedAt: null, sourceText: "", sourceReachable: true },
  };
  return finish(draft, existing);
}

export function buildInteractionArticle(staples, now, existing = []) {
  const rules = curveCoachingRules();
  const base = rules.baseRoles;
  const control = shifted(base.interaction, rules.roleShift.control.interaction);
  const tokens = shifted(base.wipes, rules.roleShift.tokens.wipes);
  const names = ["Swords to Plowshares", "Counterspell", "Beast Within", "Chaos Warp", "Blasphemous Act", "Infernal Grasp"];
  const examples = names.map((name) => staples.find((card) => card.name === name)).filter(Boolean).map(presentCard);
  const sweeps = examples.filter((card) => card.roles.includes("sweeper"));
  const spots = examples.filter((card) => card.roles.includes("interaction") && !card.roles.includes("sweeper"));
  const guides = guidesMatching(COMMANDER_GUIDES, (card) => card.roles.includes("interaction") || card.roles.includes("sweeper"));
  const featured = guides[0] || guidesMatching(COMMANDER_GUIDES, () => true)[0];
  const known = knownNamesFrom(examples, [featured?.card].filter(Boolean));
  const draft = {
    slug: "interaction-and-the-wipe-that-is-not-the-same-job",
    title: "Interaction, and the wipe that is not the same job",
    description: `The coach's base interaction band is ${range(base.interaction)}. Board wipes are a separate band, ${range(base.wipes)}. A control plan moves only the first one.`,
    category: "theory",
    tags: ["interaction", "removal", "theory"],
    provenance: "engine-template",
    topicKey: "theory:interaction",
    dedupeKey: null,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: "The game ends and someone says you needed more interaction. They might mean a Swords. They might mean a wrath. They might mean a counter on the stack that saved the table's only answer. Those are different cards, and the coach refuses to add them into one number.",
    thesis: `Base interaction is ${range(base.interaction)} cards. Base board wipes are ${range(base.wipes)}. Control pushes interaction to ${range(control)} and does not silently spend that increase on wipes. A token plan shifts the wipe band to ${range(tokens)}, because a wipe is how that plan deletes itself.`,
    engineTake: "Classifier roles and coaching bands are different tools. A card can be interaction, sweeper, or both, depending on the printed text. The band says how many of each job a plan is built to hold.",
    sections: [
      {
        id: "bands",
        heading: "Two bands, because the failure is different",
        paragraphs: [
          `Interaction ${range(base.interaction)}. Wipes ${range(base.wipes)}. The labels in the coach are "${rules.roleLabels.interaction}" and "${rules.roleLabels.wipes}." A deck can hit the interaction band and still fold to a wide board if the wipe band is empty. It can also be full of wraths and still lose to one creature that should have been answered alone.`,
          `The control shift on interaction is ${rules.roleShift.control.interaction[0]}, on both ends of the band, so ${range(base.interaction)} becomes ${range(control)}. The token shift on wipes is ${rules.roleShift.tokens.wipes[0]}. ${range(base.wipes)} becomes ${range(tokens)}. The opinion: if you play a deck that wins with its own creatures, a wipe is not free interaction. It is a card you have to recover from. The negative shift is the coach saying so.`,
          "No percentage of games is attached to these bands. They are not 'run ten removal or lose.' They are the range the coach uses when it tells you a list is light or heavy.",
        ],
      },
      {
        id: "spot",
        heading: "Spot answers, from the printed text",
        paragraphs: [
          spots.length
            ? `These example cards classified as interaction and not as a sweeper: ${listNames(spots)}. ${spots.map(cardFactSentence).join(" ")}`
            : "None of the example cards classified as spot interaction. That absence is the result, not a hole to fill with a card that was not scored.",
          "The coach's opinion: exile, destroy, counter, and fight are not the same answer at the table, even when they share the interaction role. The role means the text matches an answer pattern. It does not mean the answer lines up against indestructible, against a graveyard deck, or against a spell on the stack. Read the quoted sentence before you count the card as the answer you were missing.",
          "A card that only gains the role because its name contains a word is a bug this classifier has been corrected for before. If a quote and a role disagree with your memory of the card, trust the quote on this page and the full oracle on the card page.",
        ],
        cards: spots,
      },
      {
        id: "wipes",
        heading: "A wipe is a different seat",
        paragraphs: [
          sweeps.length
            ? `Classified as a sweeper in this pool: ${listNames(sweeps)}. ${sweeps.map(cardFactSentence).join(" ")}`
            : "None of the example cards classified as a sweeper. The wipe band still exists in the coaching rules even when this particular pool does not illustrate it.",
          "The coach's opinion: put the wipe in the wipe band. Do not let it also fill the spot-removal band in your head, or you will walk into a single creature that your wraths were never going to answer in time. The reverse mistake is a stack of one-for-one answers in a pod that goes wide on turn five.",
          featured
            ? `If you want a commander whose own text already touches interaction or a sweeper pattern, start with ${featured.guide.card.name}. ${cardFactSentence(featured.card)}`
            : "No guide commander classified into interaction or sweeper.",
        ],
        cards: [...sweeps, ...(featured ? [featured.card] : [])],
      },
    ],
    takeaways: [
      `Count interaction (${range(base.interaction)}) and wipes (${range(base.wipes)}) apart.`,
      `A control plan's interaction band is ${range(control)}. A token plan's wipe band is ${range(tokens)}.`,
      "Use the quoted rules text, not the card's reputation, when you decide which band it fills.",
    ],
    decklist: packageFrom(examples.slice(0, 5), featured ? { guide: featured.guide, card: featured.card } : null),
    commanderLinks: (guides.length ? guides : [featured].filter(Boolean)).slice(0, 3).map(({ guide, card }) => ({
      slug: guide.slug,
      name: guide.card.name,
      reason: card.roles.length ? `Classified roles: ${card.roles.join(", ")}.` : "Guide commander on this site.",
    })),
    forgeCta: forgeCta(featured?.guide.slug, featured?.guide.card.name),
    sources: [{ label: "MetaForge curve and role coach", url: "https://metaforge.gg/methodology" }],
    externalQuote: null,
    mentionedNames: [...examples.map((card) => card.name), ...(featured ? [featured.card.name] : [])],
    setReleasedAt: null,
    grounding: { present: true, knownNames: known, setReleasedAt: null, sourceText: "", sourceReachable: true },
  };
  return finish(draft, existing);
}

export function buildCardAdvantageArticle(staples, now, existing = []) {
  const rules = curveCoachingRules();
  const base = rules.baseRoles.draw;
  const spellslinger = shifted(base, rules.roleShift.spellslinger.draw);
  const control = shifted(base, rules.roleShift.control.draw);
  const names = ["Rhystic Study", "Phyrexian Arena", "Night's Whisper", "Mentor of the Meek"].filter((name) => staples.some((card) => card.name === name));
  const examples = names.map((name) => staples.find((card) => card.name === name)).filter(Boolean).map(presentCard);
  const drawGuides = guidesMatching(COMMANDER_GUIDES, (card) => card.roles.includes("draw"));
  const featured = drawGuides[0];
  const known = knownNamesFrom(examples, drawGuides.map((row) => row.card));
  const draft = {
    slug: "card-advantage-is-a-band-not-a-feeling",
    title: "Card advantage is a band, not a feeling",
    description: `The coach's base card-advantage band is ${range(base)} cards. Spellslinger and control shift that band. The examples are scored from their oracle text.`,
    category: "theory",
    tags: ["card-advantage", "draw", "theory"],
    provenance: "engine-template",
    topicKey: "theory:card-advantage",
    dedupeKey: null,
    publishedAt: now,
    updatedAt: now,
    byline: "MetaForge Coach",
    hook: "You drew cards all game and still ran out of things worth casting. Or you never drew a card past the opening seven and still somehow had a spell. Both games get called a card-advantage problem. The coach will only use that phrase for a count it can point at.",
    thesis: `The role label is "card advantage." The key in the rules table is draw. The base band is ${range(base)}. Spellslinger shifts it to ${range(spellslinger)}. Control shifts it to ${range(control)}. A card joins the count when its printed text matches a draw pattern, not when the table agrees it "generates advantage."`,
    engineTake: "Burst draw, a tax that might draw, and a permanent that draws on your upkeep can all receive the draw role. The band does not rank them. Mana value and the quoted sentence are how you tell them apart.",
    sections: [
      {
        id: "band",
        heading: "The band moves with the plan",
        paragraphs: [
          `Base ${range(base)}. The spellslinger shift is ${rules.roleShift.spellslinger.draw.join(" then ")} added to that band, which lands on ${range(spellslinger)}. Control's shift is ${rules.roleShift.control.draw.join(" then ")}, which lands on ${range(control)}. A deck that casts a lot of spells spends its hand. The higher band is the coach expecting you to replace those spells. It is not a prize for playing blue.`,
          "The coach's opinion: if you are hellbent every game, do not add random cantrips until you know whether you are under the band or whether the cards you draw do not advance the plan. The band answers the first question. The quoted text of each draw spell answers the second, and only partly.",
          "There is no win-rate column next to this band. A deck at the top of the band can still draw the wrong half. A deck under the band can still win a short game. The band is a construction check.",
        ],
      },
      {
        id: "examples",
        heading: "Three different ways the text can say draw",
        paragraphs: [
          examples.length
            ? examples.map(cardFactSentence).join(" ")
            : "The staple pool did not include a card for this section.",
          "Look at the mana values next to those sentences. A one-shot that draws two is not a permanent that draws on upkeep, even if both receive the draw role. The coach's opinion: pay for the timing you are missing. If you flood out with cards and no mana, you did not need another draw spell. If you spend your hand on turns three and four and then topdeck, you might.",
          "A card that says an opponent draws is not automatically your card advantage. The classifier looks at the printed wording. If the role list on this page does not include draw, the card is not being counted, regardless of how the card is usually described.",
        ],
        cards: examples,
      },
      {
        id: "commanders",
        heading: "Some commanders are the draw spell",
        paragraphs: [
          drawGuides.length
            ? `Guide commanders whose own oracle text classified as draw: ${listNames(drawGuides.map((row) => row.card), 4)}. ${drawGuides.slice(0, 2).map(({ card }) => cardFactSentence(card)).join(" ")}`
            : "No current guide commander classified as draw. The band still applies to the 99.",
          featured
            ? `The coach's opinion: if ${featured.guide.card.name} is already the engine, the band in the 99 can lean on what that text actually repeats. Do not add a second philosophy of draw that the commander's sentence never asked for. Build the mana that lets you perform the sentence you quoted.`
            : "Without a draw commander in the guide set, the 99 has to hold the band alone.",
          "Replacement effects, wheels that make everyone draw, and impulse draw that exiles the card instead of putting it in your hand are easy to over-claim. This page only claims the role the classifier returned and the sentence it quoted.",
        ],
        cards: drawGuides.slice(0, 2).map((row) => row.card),
      },
    ],
    takeaways: [
      `Base card advantage is ${range(base)}. Spellslinger is ${range(spellslinger)}. Control is ${range(control)}.`,
      "A shared draw role does not mean a shared timing. Read the mana value and the quoted sentence.",
      "If the commander is the draw engine, quote that text before you add another draw package on top.",
    ],
    decklist: packageFrom(examples, featured ? { guide: featured.guide, card: featured.card } : null),
    commanderLinks: drawGuides.slice(0, 3).map(({ guide, card }) => ({
      slug: guide.slug,
      name: guide.card.name,
      reason: `Classified roles include ${card.roles.join(", ")}.`,
    })),
    forgeCta: forgeCta(featured?.guide.slug, featured?.guide.card.name),
    sources: [{ label: "MetaForge curve and role coach", url: "https://metaforge.gg/methodology" }],
    externalQuote: null,
    mentionedNames: [...examples.map((card) => card.name), ...drawGuides.slice(0, 2).map((row) => row.card.name)],
    setReleasedAt: null,
    grounding: { present: true, knownNames: known, setReleasedAt: null, sourceText: "", sourceReachable: true },
  };
  return finish(draft, existing);
}

export function buildTheoryArticles(staples, now) {
  const curve = buildCurveArticle(staples, now, []);
  const mana = buildManaArticle(staples, now, [curve]);
  const interaction = buildInteractionArticle(staples, now, [curve, mana]);
  const advantage = buildCardAdvantageArticle(staples, now, [curve, mana, interaction]);
  return [curve, mana, interaction, advantage];
}
