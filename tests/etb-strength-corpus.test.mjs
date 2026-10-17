import assert from "node:assert/strict";
import test from "node:test";
import { readdir } from "node:fs/promises";
import { describeCardJob, parseOracleMechanics } from "../app/reasoning-engine/oracle-mechanics.mjs";
import { planRoleOf, readCommanderPlan } from "../app/reasoning-engine/deck-profile.mjs";
import { linksBetween } from "../app/reasoning-engine/mechanic-graph.mjs";
import { reasonAboutCandidate } from "../app/reasoning-engine/reasoner.mjs";
import { buildReasoningContext } from "../app/reasoning-engine/index.mjs";
import { describeGuidedReason } from "../app/guided-reason-copy.mjs";

// Real printings from app/set-cards. Each snippet is a piece of that card's
// printed Oracle text, so a renamed or rewritten card fails here instead of
// being graded from a paraphrase.
const SPECS = [
  { name: "Charming Prince", tier: "premium", modal: true, phrase: /blinks another permanent/, snippet: "Exile another target creature you own" },
  { name: "Cloudblazer", tier: "premium", phrase: /draws two cards/, snippet: "you gain 2 life and draw two cards" },
  { name: "Hulldrifter", tier: "premium", phrase: /draws two cards/, snippet: "When this Vehicle enters, draw two cards" },
  { name: "Fierce Empath", tier: "premium", phrase: /tutors a creature/, snippet: "creature card with mana value 6 or greater" },
  { name: "Rune-Scarred Demon", tier: "premium", phrase: /tutors a card/, snippet: "search your library for a card" },
  { name: "Micromancer", tier: "premium", phrase: /tutors an instant or sorcery/, snippet: "instant or sorcery card with mana value 1" },
  { name: "Transit Mage", tier: "premium", phrase: /tutors an artifact/, snippet: "artifact card with mana value 4 or 5" },
  { name: "Fang-Druid Summoner", tier: "premium", phrase: /tutors a creature/, snippet: "creature card with no abilities" },
  { name: "Reclamation Sage", tier: "premium", phrase: /destroys an artifact or enchantment/, snippet: "destroy target artifact or enchantment" },
  { name: "Meteor Golem", tier: "premium", phrase: /destroys a permanent/, snippet: "destroy target nonland permanent" },
  { name: "Magmatic Hellkite", tier: "premium", phrase: /destroys a land/, snippet: "destroy target nonbasic land" },
  { name: "Driftgloom Coyote", tier: "premium", phrase: /exiles a creature/, snippet: "exile target creature an opponent controls until this creature leaves" },
  { name: "Possession Engine", tier: "premium", phrase: /steals a permanent/, snippet: "gain control of target creature" },
  { name: "Shipwreck Dowser", tier: "premium", phrase: /returns an instant or sorcery/, snippet: "return target instant or sorcery card from your graveyard" },
  { name: "Daring Waverider", tier: "premium", phrase: /casts a spell from the graveyard/, snippet: "cast target instant or sorcery card with mana value 4 or less from your graveyard" },
  { name: "Hivespine Wolverine", tier: "premium", modal: true, phrase: /destroys an artifact or enchantment/, snippet: "Destroy target artifact or enchantment" },
  { name: "Rapacious Dragon", tier: "premium", phrase: /creates Treasure/, snippet: "create two Treasure tokens" },
  { name: "Noggle Robber", tier: "premium", phrase: /creates a Treasure/, snippet: "When this creature enters or dies, create a Treasure token" },
  { name: "Prime Speaker Zegana", tier: "premium", scales: true, phrase: /draws cards equal to its power/, snippet: "draw cards equal to its power" },
  { name: "Kithkeeper", tier: "premium", scales: true, phrase: /creates X creature tokens/, snippet: "create X 1/1 green and white Kithkin creature tokens" },
  { name: "Threefold Thunderhulk", tier: "premium", scales: true, phrase: /creates X creature tokens/, snippet: "Whenever this creature enters or attacks, create a number of" },
  { name: "Chupacabra Echo", tier: "premium", scales: true, phrase: /-X\/-X/, snippet: "gets -X/-X until end of turn, where X is" },
  { name: "Trumpeting Carnosaur", tier: "premium", phrase: /discovers 5/, snippet: "When this creature enters, discover 5" },
  { name: "Ghalta, Stampede Tyrant", tier: "premium", phrase: /from your hand onto the battlefield/, snippet: "put any number of creature cards from your hand onto the battlefield" },
  { name: "Beza, the Bounding Spring", tier: "premium", phrase: /creates a Treasure/, snippet: "create a Treasure token if an opponent controls more lands" },
  { name: "Greed's Gambit", tier: "premium", phrase: /draws three cards/, snippet: "you draw three cards, gain 6 life, and create three" },
  { name: "Lumra, Bellow of the Woods", tier: "premium", phrase: /graveyard/, snippet: "return all land cards from your graveyard to the battlefield" },
  { name: "Angel of Finality", tier: "premium", phrase: /exiles a graveyard/, snippet: "exile target player's graveyard" },
  { name: "Curious Forager", tier: "premium", phrase: /graveyard/, snippet: "return target permanent card from your graveyard to your hand" },
  { name: "Carrion Cruiser", tier: "premium", phrase: /graveyard/, snippet: "return a creature or Vehicle card from your graveyard to your hand" },
  { name: "Solemn Simulacrum", tier: "solid", phrase: /puts a land onto the battlefield/, notPhrase: /draw/, snippet: "search your library for a basic land card, put that card onto the battlefield" },
  { name: "Springbloom Druid", tier: "solid", phrase: /land/, snippet: "search your library for up to two basic land cards" },
  { name: "Heaped Harvest", tier: "solid", phrase: /puts a land onto the battlefield/, snippet: "When this artifact enters and when you sacrifice it" },
  { name: "Lumbering Worldwagon", tier: "solid", phrase: /puts a land onto the battlefield/, snippet: "Whenever this Vehicle enters or attacks" },
  { name: "Pond Prophet", tier: "solid", phrase: /draws a card/, snippet: "When this creature enters, draw a card" },
  { name: "Prophetic Prism", tier: "solid", phrase: /draws a card/, snippet: "When this artifact enters, draw a card" },
  { name: "Inspiring Overseer", tier: "solid", phrase: /draws a card/, snippet: "you gain 1 life and draw a card" },
  { name: "Bellowing Crier", tier: "solid", phrase: /draws a card/, snippet: "draw a card, then discard a card" },
  { name: "Feather of Flight", tier: "solid", phrase: /draws a card/, snippet: "When this Aura enters, draw a card" },
  { name: "Blighted Blackthorn", tier: "solid", phrase: /draws a card/, snippet: "Whenever this creature enters or attacks, you may blight 2" },
  { name: "Uthros Scanship", tier: "solid", phrase: /draws two cards, then discards/, snippet: "When this Spacecraft enters, draw two cards, then discard a card" },
  { name: "Spikeshell Harrier", tier: "solid", phrase: /bounces a permanent/, snippet: "return target creature or Vehicle an opponent controls to its owner's hand" },
  { name: "Glass Casket", tier: "solid", phrase: /removes a smaller permanent/, snippet: "with mana value 3 or less until this artifact leaves" },
  { name: "Ice Flan", tier: "solid", phrase: /taps a permanent/, snippet: "tap target artifact or creature an opponent controls" },
  { name: "Constrictor Sage", tier: "solid", phrase: /taps a permanent/, snippet: "tap target creature an opponent controls and put a stun counter" },
  { name: "Fear of Immobility", tier: "solid", phrase: /taps a permanent/, snippet: "tap up to one target creature" },
  { name: "Glamermite", tier: "solid", modal: true, phrase: /taps a permanent/, snippet: "Tap target creature" },
  { name: "Giant-Sized Flying Ant", tier: "solid", modal: true, phrase: /taps a permanent/, snippet: "Tap target nonland permanent" },
  { name: "Regal Caracal", tier: "solid", phrase: /creates two creature tokens/, snippet: "create two 1/1 white Cat creature tokens" },
  { name: "Vinereap Mentor", tier: "solid", phrase: /creates a Food token/, snippet: "When this creature enters or dies, create a Food token" },
  { name: "Gleaming Geardrake", tier: "solid", phrase: /investigates/, snippet: "When this creature enters, investigate" },
  { name: "Pelakka Wurm", tier: "solid", phrase: /gains 7 life/, notPhrase: /draw/, snippet: "When this creature enters, you gain 7 life" },
  { name: "Thundering Broodwagon", tier: "solid", phrase: /removes a smaller permanent/, snippet: "with mana value 4 or less" },
  { name: "Viashino Pyromancer", tier: "minor", phrase: /deals 2 damage/, snippet: "deals 2 damage to target player or planeswalker" },
  { name: "Sunshower Druid", tier: "minor", phrase: /life|counter/, snippet: "put a +1/+1 counter on target creature and you gain 1 life" },
  { name: "Voyager Glidecar", tier: "minor", phrase: /scries/, snippet: "When this Vehicle enters, scry 1" },
  { name: "Spotcycle Scouter", tier: "minor", phrase: /scries/, snippet: "When this Vehicle enters, scry 2" },
  { name: "Simulacrum Synthesizer", tier: "minor", phrase: /scries/, notPhrase: /token|Construct/, snippet: "When this artifact enters, scry 2" },
  { name: "Cloudspire Coordinator", tier: "minor", phrase: /scries/, notPhrase: /token|Pilot/, snippet: "When this creature enters, scry 2" },
  { name: "Twilight Diviner", tier: "minor", phrase: /surveils/, snippet: "When this creature enters, surveil 2" },
  { name: "Wary Watchdog", tier: "minor", phrase: /surveils/, snippet: "When this creature enters or dies, surveil 1" },
  { name: "Lys Alana Informant", tier: "minor", phrase: /surveils/, snippet: "When this creature enters or dies, surveil 1" },
  { name: "Aftermath Analyst", tier: "minor", phrase: /mills three cards/, notPhrase: /land/, snippet: "When this creature enters, mill three cards" },
  { name: "Soul-Guide Lantern", tier: "minor", phrase: /exiles a graveyard card/, snippet: "exile target card from a graveyard" },
];

const EXTRA = [
  "Territory Forge",
  "Splash Portal",
  "Lilysplash Mentor",
  "Y'shtola Rhul",
  "Starfield Vocalist",
  "Virtue of Knowledge // Vantress Visions",
];

const printed = await loadPrinted([...SPECS.map((spec) => spec.name), ...EXTRA]);

function loadPrinted(names) {
  const want = new Set(names);
  const found = new Map();
  const source = new URL("../app/set-cards/", import.meta.url);
  return readdir(source).then(async (files) => {
    for (const file of files.filter((entry) => entry.endsWith(".mjs"))) {
      const module = await import(new URL(file, source));
      for (const card of module.default?.cards || []) {
        if (want.has(card.name) && !found.has(card.name)) found.set(card.name, card);
      }
      if (found.size === want.size) break;
    }
    return found;
  });
}

function printedCard(name) {
  const card = printed.get(name);
  assert.ok(card?.oracleText, `${name} must come from app/set-cards`);
  return card;
}

function graded(name) {
  return parseOracleMechanics(printedCard(name));
}

const BLINK = Object.freeze({ id: "blink", label: "Blink and enter-the-battlefield value", confidence: 0.86 });

test("self-ETB strength is graded from the printed enter ability", () => {
  assert.ok(SPECS.length >= 25);
  const scores = { premium: [], solid: [], minor: [] };
  for (const spec of SPECS) {
    const card = printedCard(spec.name);
    assert.ok(card.oracleText.includes(spec.snippet), `${spec.name} oracle should include ${spec.snippet}`);
    const etb = graded(spec.name).etb;
    assert.equal(etb.tier, spec.tier, spec.name);
    assert.equal(etb.repeatsOnBlink, true, spec.name);
    assert.match(etb.phrase, spec.phrase, `${spec.name} phrase ${etb.phrase}`);
    if (spec.notPhrase) assert.doesNotMatch(etb.phrase, spec.notPhrase, spec.name);
    if (spec.modal) assert.equal(etb.modal, true, spec.name);
    if (spec.scales) assert.equal(etb.scales, true, spec.name);
    assert.ok(etb.score > 0, spec.name);
    scores[spec.tier].push(etb.score);
  }
  const lowest = (tier) => Math.min(...scores[tier]);
  const highest = (tier) => Math.max(...scores[tier]);
  assert.ok(lowest("premium") > highest("solid"), "a trivial enter never outranks a game-changing one");
  assert.ok(lowest("solid") > highest("minor"));
});

test("blink fuel ranks the best targets first, including cheap creatures", () => {
  const score = (name) => graded(name).etb.score;
  assert.ok(score("Charming Prince") > score("Cloudblazer"));
  assert.ok(score("Cloudblazer") > score("Meteor Golem"));
  assert.ok(score("Fierce Empath") > score("Rune-Scarred Demon"));
  assert.ok(score("Cloudblazer") > score("Hulldrifter"));
  assert.ok(score("Pond Prophet") > score("Prophetic Prism"));
  assert.ok(score("Kithkeeper") > score("Meteor Golem"));
  const forge = graded("Territory Forge");
  assert.ok(printedCard("Territory Forge").oracleText.includes("if you cast it, exile target artifact or land"));
  assert.equal(forge.etb.tier, "premium");
  assert.equal(forge.etb.repeatsOnBlink, false);
  assert.equal(forge.etb.score, 0);
  assert.ok(score("Voyager Glidecar") > forge.etb.score);
});

test("later abilities and the other half of enters-or-attacks do not inflate the enter", () => {
  assert.match(printedCard("Pelakka Wurm").oracleText, /When this creature dies, draw a card/);
  assert.match(graded("Pelakka Wurm").etb.phrase, /gains 7 life/);
  assert.match(printedCard("Solemn Simulacrum").oracleText, /When this creature dies, you may draw a card/);
  assert.doesNotMatch(graded("Solemn Simulacrum").etb.phrase, /draw/);
  assert.match(printedCard("Simulacrum Synthesizer").oracleText, /Whenever another artifact you control/);
  assert.match(graded("Simulacrum Synthesizer").etb.phrase, /scries/);
  assert.match(printedCard("Aftermath Analyst").oracleText, /Return all land cards from your graveyard/);
  assert.match(graded("Aftermath Analyst").etb.phrase, /mills three cards/);
  assert.match(printedCard("Cloudspire Coordinator").oracleText, /\{T\}: Create X/);
  assert.match(graded("Cloudspire Coordinator").etb.phrase, /scries/);
  assert.match(printedCard("Lumbering Worldwagon").oracleText, /enters or attacks/);
  assert.match(graded("Lumbering Worldwagon").etb.phrase, /land/);
  assert.match(printedCard("Blighted Blackthorn").oracleText, /enters or attacks/);
  assert.match(graded("Blighted Blackthorn").etb.phrase, /draws a card/);
  assert.match(printedCard("Noggle Robber").oracleText, /enters or dies/);
  assert.match(graded("Noggle Robber").etb.phrase, /Treasure/);
  assert.match(printedCard("Prime Speaker Zegana").oracleText, /enters with X \+1\/\+1 counters/);
  assert.equal(graded("Prime Speaker Zegana").etb.scales, true);
  assert.match(graded("Trumpeting Carnosaur").etb.phrase, /discovers 5/);
  assert.doesNotMatch(graded("Trumpeting Carnosaur").etb.phrase, /damage/);
});

test("a self-ETB does not make the plan blink; blinkers enable and doublers pay off", () => {
  for (const name of ["Cloudblazer", "Solemn Simulacrum", "Pond Prophet", "Viashino Pyromancer", "Pelakka Wurm", "Beza, the Bounding Spring"]) {
    assert.notEqual(readCommanderPlan([printedCard(name)]).id, "blink", name);
    assert.equal(graded(name).selfEtb, true, name);
    assert.equal(planRoleOf(printedCard(name), BLINK), "enabler", name);
  }
  const pile = ["Cloudblazer", "Solemn Simulacrum", "Pond Prophet", "Viashino Pyromancer", "Pelakka Wurm"].map(printedCard);
  assert.notEqual(readCommanderPlan(pile).id, "blink");

  for (const name of ["Charming Prince", "Lilysplash Mentor", "Y'shtola Rhul", "Starfield Vocalist", "Virtue of Knowledge // Vantress Visions"]) {
    assert.equal(readCommanderPlan([printedCard(name)]).id, "blink", name);
  }
  assert.equal(graded("Splash Portal").selfEtb, false);
  assert.ok(graded("Splash Portal").produces.includes("blink"));
  assert.equal(planRoleOf(printedCard("Splash Portal"), BLINK), "enabler");
  assert.equal(planRoleOf(printedCard("Lilysplash Mentor"), BLINK), "enabler");
  assert.equal(planRoleOf(printedCard("Charming Prince"), BLINK), "enabler");
  assert.equal(graded("Starfield Vocalist").doublesEtb, true);
  assert.equal(graded("Starfield Vocalist").selfEtb, false);
  assert.ok(!graded("Starfield Vocalist").produces.includes("blink"));
  assert.equal(planRoleOf(printedCard("Starfield Vocalist"), BLINK), "payoff");
  assert.equal(planRoleOf(printedCard("Virtue of Knowledge // Vantress Visions"), BLINK), "payoff");
  assert.match(describeCardJob(printedCard("Beza, the Bounding Spring")), /makes Treasure when it enters/);
});

test("a blink plan names the enter effect, and confidence follows the tier", () => {
  const mentor = printedCard("Lilysplash Mentor");
  const ctx = buildReasoningContext({ commanders: [mentor], picks: [] });
  assert.equal(ctx.profile.plan.id, "blink");
  const profile = { ...ctx.profile, gaps: [], roles: [], curve: null, colors: { requirements: [] }, nonland: 0, planBalance: "balanced" };
  const reason = (name) => reasonAboutCandidate(printedCard(name), { profile, commanders: [mentor], deckEntries: [], category: "synergyPieces" });
  const cloud = reason("Cloudblazer");
  const solemn = reason("Solemn Simulacrum");
  const viashino = reason("Viashino Pyromancer");
  const forge = reason("Territory Forge");
  const charming = reason("Charming Prince");
  const meteor = reason("Meteor Golem");

  assert.match(cloud.summary, /draws two cards each time it re-enters/);
  assert.match(cloud.reasons.map((entry) => entry.text).join(" "), /draws two cards each time it re-enters/i);
  assert.equal(cloud.confidenceLabel, "high");
  assert.ok(cloud.confidence >= 0.7);
  assert.match(describeGuidedReason({ summary: cloud.summary }, "Cloudblazer"), /Cloudblazer draws two cards each time it re-enters/);

  assert.equal(solemn.confidenceLabel, "medium");
  assert.ok(solemn.confidence < cloud.confidence);
  assert.match(solemn.summary, /land/);
  assert.match(solemn.summary, /each time it re-enters/);
  assert.equal(viashino.confidenceLabel, "medium");
  assert.ok(viashino.confidence < solemn.confidence);
  assert.match(viashino.summary, /damage/);
  assert.match(viashino.summary, /each time it re-enters/);

  assert.match(forge.summary, /only if you cast it/);
  assert.doesNotMatch(forge.summary, /re-enters/);
  assert.match(forge.reasons.map((entry) => entry.text).join(" "), /only if you cast it/);
  assert.doesNotMatch(forge.reasons.map((entry) => entry.text).join(" "), /re-enters/);

  assert.ok(charming.delta > cloud.delta);
  assert.ok(cloud.delta > meteor.delta);
  assert.ok(meteor.delta > solemn.delta);
  assert.ok(solemn.delta > viashino.delta);
  assert.ok(viashino.delta > forge.delta);
  assert.ok(charming.delta < 16);

  const link = linksBetween(printedCard("Cloudblazer"), mentor).find((entry) => entry.resource === "etb-value");
  assert.match(link.mechanism, /Cloudblazer draws two cards each time Lilysplash Mentor blinks it/);
});

test("untap-lands and choose-two enters grade from the printed sentence", () => {
  // No card in app/set-cards untaps lands on enter. This sentence is a pattern, not a printing.
  const untap = parseOracleMechanics({
    name: "Pattern Untap",
    typeLine: "Creature — Druid",
    manaCost: "{3}{G}",
    oracleText: "When this creature enters, untap up to five lands.",
  });
  assert.equal(untap.etb.tier, "premium");
  assert.match(untap.etb.phrase, /untaps lands/);
  const choice = parseOracleMechanics({
    name: "Pattern Choice",
    typeLine: "Creature — Advisor",
    manaCost: "{2}{W}",
    oracleText: "When this creature enters, choose two —\n• Draw a card.\n• You gain 3 life.\n• Scry 1.",
  });
  assert.equal(choice.etb.modal, true);
  assert.equal(choice.etb.tier, "premium");
  assert.match(choice.etb.phrase, /draws a card/);
});
