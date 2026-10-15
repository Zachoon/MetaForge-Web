import assert from "node:assert/strict";
import test from "node:test";
import { parseOracleMechanics } from "../app/reasoning-engine/oracle-mechanics.mjs";
import { buildInteractionGraph, candidateSynergy, linksBetween } from "../app/reasoning-engine/mechanic-graph.mjs";
import { buildDeckProfile, commanderReasoningEntry, inferPlan, scaledTargets, producedColorsOf, rolesOf } from "../app/reasoning-engine/deck-profile.mjs";
import { reasonAboutCandidate, REASONING_LIMITS } from "../app/reasoning-engine/reasoner.mjs";
import { analyzePartialList } from "../app/reasoning-engine/partial-list-analysis.mjs";
import { unreliableManaNote } from "../app/reasoning-engine/deck-profile.mjs";
import { analyzeListWithProvider, buildReasoningContext, profileStepUrgencies, reasonWithProvider } from "../app/reasoning-engine/index.mjs";
import { orderRemainingCategories } from "../app/guided-preference-learning.mjs";
import "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";

const c = (name, typeLine, manaCost, oracleText, extra = {}) => ({ name, typeLine, manaCost, oracleText, ...extra });

// Real cards (oracle text as printed on Scryfall).
const CARDS = {
  teysa: c("Teysa Karlov", "Legendary Creature — Human Advisor", "{2}{W}{B}", "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nCreature tokens you control have vigilance and lifelink.", { colorIdentity: ["W", "B"] }),
  bloodArtist: c("Blood Artist", "Creature — Vampire", "{1}{B}", "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life."),
  zulaport: c("Zulaport Cutthroat", "Creature — Human Rogue Ally", "{1}{B}", "Whenever Zulaport Cutthroat or another creature you control dies, each opponent loses 1 life and you gain 1 life."),
  visceraSeer: c("Viscera Seer", "Creature — Vampire Wizard", "{B}", "Sacrifice a creature: Scry 1."),
  bitterblossom: c("Bitterblossom", "Kindred Enchantment — Faerie", "{1}{B}", "At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying."),
  raiseAlarm: c("Raise the Alarm", "Instant", "{1}{W}", "Create two 1/1 white Soldier creature tokens."),
  solRing: c("Sol Ring", "Artifact", "{1}", "{T}: Add {C}{C}."),
  arcaneSignet: c("Arcane Signet", "Artifact", "{2}", "{T}: Add one mana of any color in your commander's color identity."),
  wrath: c("Wrath of God", "Sorcery", "{2}{W}{W}", "Destroy all creatures. They can't be regenerated."),
  swords: c("Swords to Plowshares", "Instant", "{W}", "Exile target creature. Its controller gains life equal to its power."),
  greaves: c("Lightning Greaves", "Artifact — Equipment", "{2}", "Equipped creature has haste and shroud.\nEquip {0}"),
  divination: c("Divination", "Sorcery", "{2}{U}", "Draw two cards."),
  talrand: c("Talrand, Sky Summoner", "Legendary Creature — Merfolk Wizard", "{2}{U}{U}", "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.", { colorIdentity: ["U"] }),
  opt: c("Opt", "Instant", "{U}", "Scry 1.\nDraw a card."),
  ponder: c("Ponder", "Sorcery", "{U}", "Look at the top three cards of your library, then put them back in any order. You may shuffle.\nDraw a card."),
  colossalDreadmaw: c("Colossal Dreadmaw", "Creature — Dinosaur", "{4}{G}{G}", "Trample"),
  craterhoof: c("Craterhoof Behemoth", "Creature — Beast", "{5}{G}{G}{G}", "Haste\nWhen Craterhoof Behemoth enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control."),
  hardenedScales: c("Hardened Scales", "Enchantment", "{G}", "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead."),
  atraxa: c("Atraxa, Praetors' Voice", "Legendary Creature — Phyrexian Angel Horror", "{G}{W}{U}{B}", "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.", { colorIdentity: ["G", "W", "U", "B"] }),
  ezuri: c("Ezuri, Claw of Progress", "Legendary Creature — Phyrexian Elf Warrior", "{2}{G}{U}", "Whenever a creature with power 2 or less you control enters, you get an experience counter.\nAt the beginning of combat on your turn, put X +1/+1 counters on another target creature you control, where X is the number of experience counters you have."),
  fertileGround: c("Evolution Sage", "Creature — Elf Druid", "{2}{G}", "Landfall — Whenever a land you control enters, proliferate."),
  swamp: c("Swamp", "Basic Land — Swamp", "", "({T}: Add {B}.)"),
  plains: c("Plains", "Basic Land — Plains", "", "({T}: Add {W}.)"),
  commandTower: c("Command Tower", "Land", "", "{T}: Add one mana of any color in your commander's color identity."),
  cityOfBrass: c("City of Brass", "Land", "", "{T}: Add one mana of any color. This land deals 1 damage to you."),
  exoticOrchard: c("Exotic Orchard", "Land", "", "{T}: Add one mana of any color that a land an opponent controls could produce."),
  fellwarStone: c("Fellwar Stone", "Artifact", "{2}", "{T}: Add one mana of any color that a land an opponent controls could produce."),
  forbiddenOrchard: c("Forbidden Orchard", "Land", "", "{T}: Add one mana of any color.\nWhenever you tap this land for mana, target opponent creates a 1/1 colorless Spirit creature token."),
  cultivate: c("Cultivate", "Sorcery", "{2}{G}", "Search your library for up to two basic land cards, put one onto the battlefield tapped and the other into your hand, then shuffle."),
  strikeItRich: c("Strike It Rich", "Sorcery", "{R}", "Create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")"),
  raisedByGiants: c("Raised by Giants", "Legendary Enchantment — Background", "{3}{G}", "Commander creatures you own have \"This creature gets +10/+10 and has trample.\"", { colorIdentity: ["G"] }),
  orzhovCharm: c("Debtors' Knell", "Enchantment", "{W}{W}{B}{B}", "At the beginning of your upkeep, put target creature card from a graveyard onto the battlefield under your control."),
  austere: c("Austere Command", "Sorcery", "{4}{W}{W}{W}", "Choose two — Destroy all artifacts; destroy all enchantments; destroy all creatures with mana value 3 or less; destroy all creatures with mana value 4 or greater."),
  lightningBolt: c("Lightning Bolt", "Instant", "{R}", "Lightning Bolt deals 3 damage to any target."),
  reanimate: c("Reanimate", "Sorcery", "{B}", "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to its mana value."),
  restoration: c("Restoration Angel", "Creature — Angel", "{3}{W}", "Flash\nFlying\nWhen Restoration Angel enters, exile target non-Angel creature you control, then return that card to the battlefield under your control."),
  mulldrifter: c("Mulldrifter", "Creature — Elemental", "{4}{U}", "Flying\nWhen Mulldrifter enters, draw two cards.\nEvoke {2}{U}"),
};

// --- 1. Rules-text parsing -----------------------------------------------------

test("parser reads death triggers, sacrifice outlets and tokens from oracle text", () => {
  const artist = parseOracleMechanics(CARDS.bloodArtist);
  assert.ok(artist.listens.includes("creature-dies"));
  assert.ok(artist.produces.includes("life-drain"));
  assert.ok(artist.produces.includes("lifegain"));

  const seer = parseOracleMechanics(CARDS.visceraSeer);
  assert.ok(seer.consumes.includes("creature-body"), "sacrifice as a cost consumes bodies");
  assert.ok(seer.produces.includes("creature-dies"), "a sac outlet makes creatures die");

  const blossom = parseOracleMechanics(CARDS.bitterblossom);
  assert.ok(blossom.produces.includes("creature-token"));
  assert.ok(blossom.produces.includes("creature-body"));
  assert.ok(blossom.triggered);
});

test("parser infers game effects (roles) and keywords without card lists", () => {
  assert.ok(parseOracleMechanics(CARDS.wrath).effects.includes("wipe"));
  assert.ok(!parseOracleMechanics(CARDS.wrath).effects.includes("removal"), "a wipe is not counted twice as spot removal");
  assert.ok(parseOracleMechanics(CARDS.swords).effects.includes("removal"));
  assert.ok(parseOracleMechanics(CARDS.lightningBolt).effects.includes("removal"));
  assert.ok(parseOracleMechanics(CARDS.solRing).effects.includes("ramp"));
  assert.ok(parseOracleMechanics(CARDS.divination).effects.includes("draw"));
  assert.ok(parseOracleMechanics(CARDS.greaves).effects.includes("protection"));
  assert.ok(parseOracleMechanics(CARDS.reanimate).effects.includes("recursion"));
  assert.ok(parseOracleMechanics(CARDS.craterhoof).keywords.includes("haste"));
  assert.ok(parseOracleMechanics(CARDS.atraxa).keywords.includes("flying"));
});

test("a card's own name is read as 'this card', so self-ETB is value, not a creature-enters payoff", () => {
  const drifter = parseOracleMechanics(CARDS.mulldrifter);
  assert.ok(drifter.produces.includes("etb-value"));
  assert.ok(!drifter.listens.includes("creature-enters"));
  const resto = parseOracleMechanics(CARDS.restoration);
  assert.ok(resto.produces.includes("blink"));
  assert.ok(resto.consumes.includes("etb-value"));
});

test("lands produce mana colors from rules text and basic types, and are not ramp", () => {
  assert.deepEqual(producedColorsOf(CARDS.swamp), ["B"]);
  assert.ok(!parseOracleMechanics(CARDS.swamp).effects.includes("ramp"));
  assert.deepEqual([...rolesOf(CARDS.swamp)], ["lands"]);
});

test("identity mana is the commander's colors, not all five", () => {
  assert.deepEqual(producedColorsOf(CARDS.commandTower), [], "unknown identity must not invent off-color sources");
  assert.deepEqual(producedColorsOf(CARDS.commandTower, { colorIdentity: ["W", "B"] }), ["W", "B"]);
  assert.deepEqual(producedColorsOf(CARDS.arcaneSignet, { colorIdentity: ["U"] }), ["U"]);
  assert.deepEqual(producedColorsOf(CARDS.cityOfBrass, { colorIdentity: ["R"] }), ["W", "U", "B", "R", "G"]);
  assert.deepEqual(producedColorsOf(CARDS.cultivate, { colorIdentity: ["G"] }), ["G"]);
  assert.deepEqual(producedColorsOf(CARDS.strikeItRich, { colorIdentity: ["R"] }), ["W", "U", "B", "R", "G"]);
});

test("opponent-produced mana is not five-color fixing", () => {
  assert.deepEqual(producedColorsOf(CARDS.exoticOrchard, { colorIdentity: ["W", "B"] }), []);
  assert.deepEqual(producedColorsOf(CARDS.fellwarStone, { colorIdentity: ["G"] }), []);
  assert.deepEqual(producedColorsOf(CARDS.forbiddenOrchard, { colorIdentity: ["G", "U"] }), ["W", "U", "B", "R", "G"], "a chosen any-color land stays five colors when the opponent clause is a different ability");
  const picks = [
    CARDS.plains, { ...CARDS.plains, name: "Plains 2" },
    CARDS.swamp, { ...CARDS.swamp, name: "Swamp 2" },
    CARDS.exoticOrchard, { ...CARDS.exoticOrchard, name: "Exotic Orchard 2" }, { ...CARDS.exoticOrchard, name: "Exotic Orchard 3" },
    CARDS.fellwarStone,
    CARDS.swords, CARDS.bloodArtist,
  ];
  const profile = buildDeckProfile({ commanders: [CARDS.teysa], picks });
  assert.equal(profile.colors.unreliableSources, 4);
  assert.equal(profile.colors.unreliableNote, unreliableManaNote(4));
  for (const color of ["W", "B"]) {
    const row = profile.colors.requirements.find((entry) => entry.color === color);
    assert.equal(row.sources, 2, `${color} comes only from the basics`);
    assert.equal(row.underSupported, false);
  }
  const review = analyzePartialList({ commanders: [CARDS.teysa], entries: picks });
  assert.ok(review.notes.includes(profile.colors.unreliableNote));
});

test("a noncreature commander's printed type line drives the plan", () => {
  const mechanics = parseOracleMechanics(CARDS.raisedByGiants);
  assert.ok(mechanics.produces.includes("enchantment"));
  assert.ok(!mechanics.produces.includes("creature-enters"));
  assert.equal(inferPlan([CARDS.raisedByGiants], []).id, "enchantress");
  assert.notEqual(inferPlan([{ ...CARDS.raisedByGiants, typeLine: "Legendary Creature" }], []).id, "enchantress");
  assert.ok(parseOracleMechanics(CARDS.teysa).produces.includes("creature-enters"));
  const entry = commanderReasoningEntry({ name: CARDS.raisedByGiants.name, colors: ["G"], oracleText: CARDS.raisedByGiants.oracleText, typeLine: CARDS.raisedByGiants.typeLine });
  assert.equal(entry.typeLine, "Legendary Enchantment — Background");
  assert.deepEqual(entry.colorIdentity, ["G"]);
  assert.equal(commanderReasoningEntry({ name: "Teysa Karlov", colors: ["W", "B"], oracleText: "" }).typeLine, "");
  assert.equal(commanderReasoningEntry(null), null);
});

test("the parser is deterministic and tolerates empty or odd input", () => {
  assert.deepEqual(parseOracleMechanics({}), parseOracleMechanics({}));
  const empty = parseOracleMechanics({ name: "Blank" });
  assert.deepEqual(empty.produces, []);
  assert.deepEqual(parseOracleMechanics(CARDS.bloodArtist), parseOracleMechanics({ ...CARDS.bloodArtist }));
});

// --- 2. Interaction graph -------------------------------------------------------

test("links come from real mechanics: a sac outlet triggers a death payoff, tokens feed the outlet", () => {
  const seerToArtist = linksBetween(CARDS.visceraSeer, CARDS.bloodArtist);
  assert.ok(seerToArtist.some((link) => link.resource === "creature-dies" && link.kind === "listens"));
  assert.match(seerToArtist[0].mechanism, /Viscera Seer triggers Blood Artist/);

  const tokensToSeer = linksBetween(CARDS.raiseAlarm, CARDS.visceraSeer);
  assert.ok(tokensToSeer.some((link) => link.resource === "creature-body" && link.kind === "consumes"));

  assert.deepEqual(linksBetween(CARDS.divination, CARDS.bloodArtist), [], "no link without a mechanical connection");
});

test("the graph has edges in both directions and a degree per card", () => {
  const graph = buildInteractionGraph([CARDS.visceraSeer, CARDS.bloodArtist, CARDS.bitterblossom, CARDS.divination]);
  assert.ok(graph.edges.some((edge) => edge.from === "Viscera Seer" && edge.to === "Blood Artist"));
  assert.ok(graph.edges.some((edge) => edge.from === "Bitterblossom" && edge.to === "Viscera Seer"));
  assert.equal(graph.degree.Divination, 0);
  assert.ok(graph.degree["Viscera Seer"] > graph.degree["Blood Artist"] - 1);
});

test("synergy counts links to the commander double and names the mechanism", () => {
  const withCommander = candidateSynergy(CARDS.opt, [CARDS.talrand], { commanderNames: ["Talrand, Sky Summoner"] });
  const asPick = candidateSynergy(CARDS.opt, [CARDS.talrand], { commanderNames: [] });
  assert.ok(withCommander.score > asPick.score);
  assert.equal(withCommander.partners[0].isCommander, true);
  assert.match(withCommander.partners[0].mechanism, /Opt triggers Talrand/);
  assert.equal(candidateSynergy(CARDS.colossalDreadmaw, [CARDS.talrand], { commanderNames: ["Talrand, Sky Summoner"] }).score, 0);
});

// --- 3. Deck profile ------------------------------------------------------------

test("plan inference: Teysa reads as aristocrats, Talrand as spellslinger, Atraxa as counters", () => {
  assert.equal(inferPlan([CARDS.teysa], [CARDS.bloodArtist, CARDS.visceraSeer]).id, "aristocrats");
  assert.equal(inferPlan([CARDS.talrand], [CARDS.opt]).id, "spellslinger");
  assert.equal(inferPlan([CARDS.atraxa], [CARDS.hardenedScales, CARDS.fertileGround]).id, "counters");
  const empty = inferPlan([], []);
  assert.equal(empty.id, "midrange");
  assert.equal(empty.confidence, 0);
});

test("profile counts roles against Commander targets and orders gaps by urgency", () => {
  const profile = buildDeckProfile({ commanders: [CARDS.teysa], picks: [CARDS.solRing, CARDS.arcaneSignet, CARDS.swords, CARDS.bloodArtist] });
  const ramp = profile.roles.find((row) => row.role === "ramp");
  assert.equal(ramp.actual, 2);
  assert.equal(ramp.status, "under");
  const draw = profile.roles.find((row) => row.role === "draw");
  assert.equal(draw.urgency, 1, "nothing drawn yet is the most urgent kind of gap");
  assert.ok(profile.gaps[0].urgency >= profile.gaps[profile.gaps.length - 1].urgency);
  assert.deepEqual(profile.colors.identity, ["W", "B"]);
});

test("profile tracks the curve and flags a top-heavy deck", () => {
  const fatties = Array.from({ length: 10 }, (_, index) => ({ ...CARDS.colossalDreadmaw, name: `Dreadmaw ${index}` }));
  const profile = buildDeckProfile({ commanders: [], picks: fatties, colorIdentity: ["G"] });
  assert.equal(profile.curve.buckets[5], 10);
  assert.ok(profile.curve.issues.includes("top-heavy"));
  assert.ok(profile.curve.issues.includes("few early plays"));
});

test("profile flags a color whose pips outrun its mana sources", () => {
  const picks = [CARDS.wrath, CARDS.swords, { ...CARDS.wrath, name: "Wrath 2" }, CARDS.swamp, { ...CARDS.swamp, name: "Swamp 2" }, CARDS.bloodArtist];
  const profile = buildDeckProfile({ commanders: [CARDS.teysa], picks });
  const white = profile.colors.requirements.find((row) => row.color === "W");
  assert.equal(white.underSupported, true);
});

test("Command Tower and Arcane Signet do not dilute a two-color mana base", () => {
  const picks = [
    CARDS.plains, { ...CARDS.plains, name: "Plains 2" },
    CARDS.swamp, { ...CARDS.swamp, name: "Swamp 2" },
    CARDS.commandTower, CARDS.arcaneSignet,
    CARDS.swords, CARDS.bloodArtist,
  ];
  const profile = buildDeckProfile({ commanders: [CARDS.teysa], picks });
  for (const color of ["W", "B"]) {
    const row = profile.colors.requirements.find((entry) => entry.color === color);
    assert.equal(row.underSupported, false, `${color} should not look short when identity rocks only make W and B`);
  }
  assert.ok(!profile.colors.requirements.some((row) => ["U", "R", "G"].includes(row.color)));
});

test("targets scale for 60-card Brawl", () => {
  const brawl = scaledTargets(60);
  assert.equal(brawl.lands.min, 21);
  assert.ok(brawl.ramp.min < 10);
});

// --- 4. Explainable reasoning ---------------------------------------------------

test("Teysa aristocrats: Zulaport outranks a vanilla fatty, with gap, synergy and plan reasons", () => {
  const ctx = buildReasoningContext({ commanders: [CARDS.teysa], picks: [CARDS.visceraSeer, CARDS.bitterblossom, CARDS.solRing] });
  const zulaport = reasonAboutCandidate(CARDS.zulaport, { ...ctx, category: "synergyPieces" });
  const dreadmaw = reasonAboutCandidate(CARDS.colossalDreadmaw, { ...ctx, category: "synergyPieces" });
  assert.ok(zulaport.delta > dreadmaw.delta);
  assert.ok(zulaport.reasons.some((reason) => reason.kind === "synergy"));
  assert.ok(zulaport.reasons.some((reason) => reason.kind === "plan"));
  const partners = zulaport.worksWith.map((partner) => partner.name);
  assert.ok(partners.includes("Viscera Seer"));
  assert.ok(partners.includes("Teysa Karlov") || partners.includes("Bitterblossom"));
  assert.ok(zulaport.confidence > dreadmaw.confidence);
  assert.ok(["low", "medium", "high"].includes(zulaport.confidenceLabel));
});

test("on the draw step, a draw spell is credited for the current gap", () => {
  const ctx = buildReasoningContext({ commanders: [CARDS.talrand], picks: [CARDS.solRing] });
  const result = reasonAboutCandidate(CARDS.divination, { ...ctx, category: "draw" });
  const gap = result.reasons.find((reason) => reason.kind === "gap" && reason.role === "draw");
  assert.ok(gap);
  assert.match(gap.text, /card draw 0\/10/);
});

test("Talrand spellslinger: Opt links to the commander through casting instants", () => {
  const ctx = buildReasoningContext({ commanders: [CARDS.talrand], picks: [CARDS.ponder] });
  const result = reasonAboutCandidate(CARDS.opt, { ...ctx, category: "draw" });
  assert.equal(result.worksWith[0].name, "Talrand, Sky Summoner");
  assert.match(result.worksWith[0].mechanism, /casting instants and sorceries/);
});

test("a color warning names the real pips, once", () => {
  const profile = {
    gaps: [],
    roles: [],
    picks: 12,
    plan: { id: "midrange", label: "Midrange value (no clear plan yet)", confidence: 0, resources: [] },
    colors: { requirements: [{ color: "W", underSupported: true }, { color: "B", underSupported: true }] },
  };
  const both = reasonAboutCandidate(CARDS.orzhovCharm, { profile, category: "interaction" });
  const color = both.reasons.find((reason) => reason.kind === "color");
  assert.match(color.text, /Needs WWBB early/);
  assert.match(color.text, /those colors are thin/);
  assert.doesNotMatch(color.text, /WBWB/);
  const white = reasonAboutCandidate(CARDS.austere, { profile, category: "interaction" });
  const whiteReason = white.reasons.find((reason) => reason.kind === "color");
  assert.match(whiteReason.text, /Needs WWW early/);
  assert.match(whiteReason.text, /that color is thin/);
  assert.equal(white.delta <= 0, true);
});

test("reasoning delta is always capped", () => {
  const picks = Array.from({ length: 30 }, (_, index) => ({ ...CARDS.visceraSeer, name: `Outlet ${index}` }));
  const ctx = buildReasoningContext({ commanders: [CARDS.teysa], picks });
  const result = reasonAboutCandidate(CARDS.zulaport, { ...ctx, category: "synergyPieces" });
  assert.ok(result.delta <= REASONING_LIMITS.maxBoost);
  const heavy = reasonAboutCandidate({ ...CARDS.colossalDreadmaw, priceUsd: 99 }, { ...ctx, category: "ramp" });
  assert.ok(heavy.delta >= REASONING_LIMITS.maxPenalty);
  assert.ok(heavy.reasons.some((reason) => reason.kind === "trade-off"));
});

test("a model provider can refine but never break the result", () => {
  const ctx = { ...buildReasoningContext({ commanders: [CARDS.teysa], picks: [] }), category: "ramp" };
  const base = reasonWithProvider(CARDS.solRing, ctx, null);
  assert.deepEqual(reasonWithProvider(CARDS.solRing, ctx, { id: "bad", refineCandidate: () => ({ nope: true }) }), base);
  assert.deepEqual(reasonWithProvider(CARDS.solRing, ctx, { id: "throws", refineCandidate: () => { throw new Error("x"); } }), base);
  const refined = reasonWithProvider(CARDS.solRing, ctx, { id: "ok", refineCandidate: (result) => ({ ...result, confidence: 0.9 }) });
  assert.equal(refined.confidence, 0.9);
  const capped = reasonWithProvider(CARDS.solRing, ctx, { id: "huge", refineCandidate: (result) => ({ ...result, delta: 100 }) });
  assert.equal(capped.delta, REASONING_LIMITS.maxBoost);
  const floored = reasonWithProvider(CARDS.solRing, ctx, { id: "deep", refineCandidate: (result) => ({ ...result, delta: -100 }) });
  assert.equal(floored.delta, REASONING_LIMITS.maxPenalty);
  const list = analyzeListWithProvider({ commanders: [CARDS.teysa], entries: [] }, { id: "autofill", refineListAnalysis: (result) => ({ ...result, autoFilled: true }) });
  assert.equal(list.autoFilled, false, "a provider can never turn analysis into auto-fill");
  const filled = analyzeListWithProvider({ commanders: [CARDS.teysa], entries: [] }, { id: "adds", refineListAnalysis: (result) => ({ ...result, additions: ["Sol Ring"] }) });
  assert.equal(filled.autoFilled, false);
  assert.ok(!("additions" in filled));
});

// --- 5. Partial list analysis ---------------------------------------------------

test("Teysa partial list: reads the plan, flags off-color and off-plan cards, never adds cards", () => {
  const entries = [CARDS.visceraSeer, CARDS.bloodArtist, CARDS.zulaport, CARDS.bitterblossom, CARDS.raiseAlarm,
    CARDS.solRing, CARDS.swords, CARDS.lightningBolt, CARDS.colossalDreadmaw, CARDS.swamp, CARDS.plains];
  const result = analyzePartialList({ commanders: [CARDS.teysa], entries });
  assert.equal(result.plan.id, "aristocrats");
  assert.equal(result.autoFilled, false);
  assert.ok(!("additions" in result));
  const bolt = result.flagged.find((entry) => entry.name === "Lightning Bolt");
  assert.ok(bolt && bolt.reasons.some((reason) => reason.kind === "illegal"));
  const maw = result.flagged.find((entry) => entry.name === "Colossal Dreadmaw");
  assert.ok(maw, "a 6-mana vanilla in aristocrats gets a second look");
  assert.ok(!result.flagged.some((entry) => entry.name === "Blood Artist"));
  assert.ok(result.strengths.some((entry) => entry.name === "Viscera Seer" || entry.name === "Zulaport Cutthroat"));
  assert.ok(result.nextSteps.length > 0);
  assert.ok(result.nextSteps.every((step) => typeof step.category === "string" && step.why));
});

test("Atraxa counters list recommends walking through the emptiest roles first", () => {
  const result = analyzePartialList({ commanders: [CARDS.atraxa], entries: [CARDS.hardenedScales, CARDS.fertileGround, CARDS.ezuri, CARDS.solRing, CARDS.arcaneSignet] });
  assert.equal(result.plan.id, "counters");
  assert.notEqual(result.nextSteps[0].category, "ramp", "ramp already has two pieces; emptier roles come first");
});

// --- 6. Integration with the guided ranker and step order -----------------------

const row = (name, card, extra = {}) => ({ name, card: { ...card, name }, roles: [], cmc: extra.cmc ?? 2, score: extra.score ?? 20, mechanics: { produces: [], rewards: [] }, ...extra });

test("suggestCardForCategory: the reasoning context reranks toward real synergy and returns reasons", () => {
  const pool = [
    row("Colossal Dreadmaw", CARDS.colossalDreadmaw, { roles: ["threat"], cmc: 6, score: 26 }),
    row("Zulaport Cutthroat", CARDS.zulaport, { roles: ["threat"], cmc: 2, score: 22 }),
  ];
  const base = suggestCardForCategory({ category: "winConditions", pool, intent: {}, partialRows: [] });
  assert.equal(base.reasoning, null, "no context means no reasoning and the old order");
  const reasoningContext = buildReasoningContext({ commanders: [CARDS.teysa], picks: [CARDS.visceraSeer, CARDS.bitterblossom] });
  const reasoned = suggestCardForCategory({ category: "winConditions", pool, intent: {}, partialRows: [], options: { reasoningContext } });
  assert.equal(reasoned.offer.name, "Zulaport Cutthroat");
  assert.ok(reasoned.reasoning.reasons.length > 0);
  assert.ok(reasoned.reasoning.worksWith.length > 0);
});

test("step order: the deck profile pulls the emptiest roles forward, current step stays put", () => {
  const categories = ["ramp", "interaction", "protection", "sweeper", "recursion", "draw", "winConditions", "synergyPieces"];
  const ctx = buildReasoningContext({ commanders: [CARDS.talrand], picks: [CARDS.opt, CARDS.ponder, CARDS.divination, CARDS.solRing, CARDS.arcaneSignet] });
  const urgency = profileStepUrgencies(ctx.profile, categories);
  assert.ok(urgency.interaction > urgency.draw);
  const order = orderRemainingCategories(categories, 0, { deckUrgency: urgency });
  assert.equal(order[0], "ramp");
  assert.ok(order.indexOf("interaction") < order.indexOf("draw"));
  assert.deepEqual(orderRemainingCategories(categories, 0, {}), categories, "no signal keeps the original order");
});
