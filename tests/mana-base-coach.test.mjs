import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { manaPaysSpell } from "../app/plan-weakness-coach.mjs";
import {
  buildManaBaseCoaching,
  formatManaBaseCoaching,
  questionWantsManaBaseCoaching,
  readPrintedMana,
} from "../app/mana-base-coach.mjs";
import { nativeCoachAnswer } from "../worker/native-coach.ts";

const KRENKO = {
  name: "Krenko, Mob Boss",
  typeLine: "Legendary Creature — Goblin Warrior",
  manaCost: "{2}{R}{R}",
  cmc: 4,
  colorIdentity: ["R"],
  oracleText: "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
};

const MARCHEA = {
  name: "Marchesa, the Black Rose",
  typeLine: "Legendary Creature — Human Wizard",
  manaCost: "{1}{U}{B}{R}",
  cmc: 4,
  colorIdentity: ["U", "B", "R"],
  oracleText: "Dethrone\nWhenever a creature you control with a +1/+1 counter on it dies, return that card to the battlefield under your control at the beginning of the next end step.",
};

const EDRIC = {
  name: "Edric, Spymaster of Trest",
  typeLine: "Legendary Creature — Elf Rogue",
  manaCost: "{1}{G}{U}",
  cmc: 3,
  colorIdentity: ["G", "U"],
  oracleText: "Whenever a creature deals combat damage to one of your opponents, its controller may draw a card.",
};

const OMNATH = {
  name: "Omnath, Locus of Creation",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{R}{G}{W}{U}",
  cmc: 4,
  colorIdentity: ["R", "G", "W", "U"],
  oracleText: "When Omnath enters, draw a card.\nWhenever a land enters under your control, you gain 1 life if this is the first time this ability has resolved this turn. If it's the second time, add {R}{G}{W}{U}. If it's the third time, draw cards until you have seven cards in hand, then you may play a land.",
};

const AZUSA = {
  name: "Azusa, Lost but Seeking",
  typeLine: "Legendary Creature — Human Monk",
  manaCost: "{2}{G}",
  cmc: 3,
  colorIdentity: ["G"],
  oracleText: "You may play two additional lands on each of your turns.",
};

const GORECLAW = {
  name: "Goreclaw, Terror of Qal Sisma",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{3}{G}",
  cmc: 4,
  colorIdentity: ["G"],
  oracleText: "Goreclaw, Terror of Qal Sisma costs {1} less to cast for each other creature you control with power 4 or greater.\nCreatures you control with power 4 or greater have trample and haste.",
};

function library(core, filler, size = 99) {
  const cards = core.map((card) => ({ quantity: 1, ...card }));
  let count = cards.reduce((sum, card) => sum + card.quantity, 0);
  let index = 0;
  while (count < size) {
    const spell = filler(index);
    cards.push({ quantity: 1, ...spell });
    count += 1;
    index += 1;
  }
  return cards;
}

function krenkoDeck() {
  return library([
    { name: "Mountain", quantity: 36, typeLine: "Basic Land — Mountain", oracleText: "({T}: Add {R}.)" },
    { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
    { name: "Arcane Signet", typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add one mana of any color in your commander's color identity." },
    { name: "Goblin Chieftain", typeLine: "Creature — Goblin", manaCost: "{1}{R}{R}", cmc: 3, oracleText: "Haste\nOther Goblin creatures you control get +1/+1 and have haste." },
  ], (index) => ({
    name: `Goblin ${index}`,
    typeLine: "Creature — Goblin",
    manaCost: "{2}{R}",
    cmc: 3,
    oracleText: "Haste",
  }));
}

function marchesaDeck() {
  return library([
    { name: "Island", quantity: 12, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" },
    { name: "Mountain", quantity: 12, typeLine: "Basic Land — Mountain", oracleText: "({T}: Add {R}.)" },
    { name: "Swamp", quantity: 4, typeLine: "Basic Land — Swamp", oracleText: "({T}: Add {B}.)" },
    { name: "Steam Vents", typeLine: "Land — Island Mountain", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {U} or {R}." },
    { name: "Scalding Tarn", typeLine: "Land", oracleText: "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle." },
    { name: "Evolving Wilds", typeLine: "Land", oracleText: "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle." },
    { name: "Drowned Catacomb", typeLine: "Land", oracleText: "This land enters tapped unless you control an Island or a Swamp.\n{T}: Add {U} or {B}." },
    { name: "Temple of Malice", typeLine: "Land", oracleText: "This land enters tapped.\nWhen this land enters, scry 1.\n{T}: Add {B} or {R}." },
    { name: "Bojuka Bog", typeLine: "Land", oracleText: "This land enters tapped.\nWhen this land enters, exile target player's graveyard.\n{T}: Add {B}." },
    { name: "Exotic Orchard", typeLine: "Land", oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce." },
    { name: "Iron Myr", typeLine: "Artifact Creature — Myr", manaCost: "{2}", oracleText: "{T}: Add {R}." },
    { name: "Izzet Signet", typeLine: "Artifact", manaCost: "{2}", oracleText: "{1}, {T}: Add {U}{R}." },
    { name: "Murder", typeLine: "Instant", manaCost: "{1}{B}{B}", cmc: 3, oracleText: "Destroy target creature." },
    { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", cmc: 2, oracleText: "Counter target spell." },
  ], (index) => ({
    name: `Court Spell ${index}`,
    typeLine: index % 3 === 0 ? "Instant" : "Sorcery",
    manaCost: index % 3 === 0 ? "{2}{U}" : index % 3 === 1 ? "{2}{R}" : "{2}{B}",
    cmc: 3,
    oracleText: "Draw a card.",
  }));
}

function edricDeck() {
  return library([
    { name: "Forest", quantity: 12, typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" },
    { name: "Island", quantity: 10, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" },
    { name: "Breeding Pool", typeLine: "Land — Forest Island", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {G} or {U}." },
    { name: "Temple of Mystery", typeLine: "Land", oracleText: "This land enters tapped.\nWhen this land enters, scry 1.\n{T}: Add {U} or {G}." },
    { name: "Simic Guildgate", quantity: 8, typeLine: "Land — Gate", oracleText: "This land enters tapped.\n{T}: Add {G} or {U}." },
    { name: "Spirebluff Canal", typeLine: "Land", oracleText: "This land enters tapped unless you control two or fewer other lands.\n{T}: Add {U} or {R}." },
    { name: "Beastcaller Savant", typeLine: "Creature — Elf Shaman Ally", manaCost: "{1}{G}", oracleText: "Haste\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell." },
    { name: "Llanowar Elves", typeLine: "Creature — Elf Druid", manaCost: "{G}", oracleText: "{T}: Add {G}." },
    { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", cmc: 2, oracleText: "Counter target spell." },
    { name: "Elvish Visionary", typeLine: "Creature — Elf Shaman", manaCost: "{1}{G}", oracleText: "When this creature enters, draw a card." },
  ], (index) => ({
    name: `Scout ${index}`,
    typeLine: "Creature — Elf",
    manaCost: index % 2 === 0 ? "{1}{G}" : "{1}{U}",
    cmc: 2,
    oracleText: "This creature can't be blocked.",
  }));
}

function omnathDeck() {
  return library([
    { name: "Forest", quantity: 14, typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" },
    { name: "Island", quantity: 4, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" },
    { name: "Mountain", quantity: 4, typeLine: "Basic Land — Mountain", oracleText: "({T}: Add {R}.)" },
    { name: "Plains", quantity: 2, typeLine: "Basic Land — Plains", oracleText: "({T}: Add {W}.)" },
    { name: "Breeding Pool", typeLine: "Land — Forest Island", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {G} or {U}." },
    { name: "Stomping Ground", typeLine: "Land — Mountain Forest", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {R} or {G}." },
    { name: "Steam Vents", typeLine: "Land — Island Mountain", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {U} or {R}." },
    { name: "Temple Garden", typeLine: "Land — Forest Plains", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {G} or {W}." },
    { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
    { name: "Arcane Signet", typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add one mana of any color in your commander's color identity." },
    { name: "Birds of Paradise", typeLine: "Creature — Bird", manaCost: "{G}", oracleText: "Flying\n{T}: Add one mana of any color." },
    { name: "Llanowar Elves", typeLine: "Creature — Elf Druid", manaCost: "{G}", oracleText: "{T}: Add {G}." },
    { name: "Cultivate", typeLine: "Sorcery", manaCost: "{2}{G}", oracleText: "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle." },
    { name: "Rampant Growth", typeLine: "Sorcery", manaCost: "{1}{G}", oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle." },
    { name: "Farseek", typeLine: "Sorcery", manaCost: "{1}{G}", oracleText: "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle." },
    { name: "Nature's Lore", typeLine: "Sorcery", manaCost: "{1}{G}", oracleText: "Search your library for a Forest card, put that card onto the battlefield, then shuffle." },
    { name: "Three Visits", typeLine: "Sorcery", manaCost: "{1}{G}", oracleText: "Search your library for a Forest card, put it onto the battlefield, then shuffle." },
    { name: "Wrath of God", typeLine: "Sorcery", manaCost: "{2}{W}{W}", cmc: 4, oracleText: "Destroy all creatures. They can't be regenerated." },
    { name: "Avenger of Zendikar", typeLine: "Creature — Elemental", manaCost: "{5}{G}{G}", cmc: 7, oracleText: "When this creature enters, create a 0/1 green Plant creature token for each land you control.\nLandfall — Whenever a land you control enters, you may put a +1/+1 counter on target Plant creature." },
  ], (index) => ({
    name: `Elemental ${index}`,
    typeLine: "Creature — Elemental",
    manaCost: "{4}{G}",
    cmc: 5,
    oracleText: "Trample",
  }));
}

function textOf(commander, cards) {
  return formatManaBaseCoaching(buildManaBaseCoaching({ commander, cards }));
}

test("a mono-red goblin deck is inside the land range, and colorless ramp is not a red source", () => {
  const cards = krenkoDeck();
  const report = buildManaBaseCoaching({ commander: KRENKO, cards });
  assert.equal(report.readable, true);
  assert.equal(report.confidence.level, "high");
  assert.equal(report.lands.status, "ok");
  assert.equal(report.lands.count, 36);
  const red = report.colors.find((color) => color.color === "R");
  assert.equal(red.status, "ok");
  assert.ok(red.untapped >= 36);
  const text = formatManaBaseCoaching(report);
  assert.match(text, /Mana base — Krenko, Mob Boss/);
  assert.match(text, /Theory:/);
  assert.match(text, /Sol Ring/);
  assert.match(text, /not a red source/);
  assert.match(text, /Confidence: high/);
  assert.doesNotMatch(text, /name the format|format selector/i);
});

test("a three-color deck with a black drought does not count opponent mana, the wrong fetch, or one-color ramp", () => {
  const cards = marchesaDeck();
  const report = buildManaBaseCoaching({ commander: MARCHEA, cards });
  const black = report.colors.find((color) => color.color === "B");
  assert.equal(black.status, "short");
  assert.ok(black.needed >= 18);
  assert.ok(black.untapped <= 8);
  const text = formatManaBaseCoaching(report);
  assert.match(text, /Murder/);
  assert.match(text, /two black mana/i);
  assert.match(text, /Exotic Orchard/);
  assert.match(text, /opponent/i);
  assert.match(text, /Scalding Tarn/);
  assert.match(text, /Island or Mountain/);
  assert.match(text, /Iron Myr/);
  assert.match(text, /not a generic source/i);
  assert.match(text, /enters tapped/i);
  assert.match(text, /Swap:/);
  assert.match(text, /Swamp|Command Tower/);
  assert.doesNotMatch(text, /Exotic Orchard[\s\S]{0,80}is a black source/i);
  const blue = report.colors.find((color) => color.color === "U");
  assert.equal(black.status, "short");
  assert.equal(blue.status, "tight");
  assert.equal(blue.stretchOnly, true);
  assert.match(text, /Counterspell/);
  assert.match(text, /closer call/i);
  assert.match(text, /Confidence on this read: low/i);
  assert.doesNotMatch(text, /blue is short too/i);
  assert.doesNotMatch(text, /Black and blue are the colors that come up short/i);
  assert.equal(report.lessons.filter((lesson) => String(lesson.id).startsWith("color-")).map((lesson) => lesson.id).join(","), "color-B");
});

test("a low-curve deck cannot spend lands that enter tapped on turn two, and restricted mana is not generic", () => {
  const cards = edricDeck();
  const report = buildManaBaseCoaching({ commander: EDRIC, cards });
  assert.ok(report.lands.averageCmc <= 2.6);
  assert.ok(report.lands.tapped >= 8);
  const text = formatManaBaseCoaching(report);
  assert.match(text, /turn two/i);
  assert.match(text, /enters tapped/i);
  assert.match(text, /Beastcaller Savant/);
  assert.match(text, /Spend this mana only to cast a creature spell/);
  assert.match(text, /not a generic source/i);
  assert.match(text, /Llanowar Elves/);
  assert.match(text, /Counterspell/);
  const untappedCurve = edricDeck().map((card) => (
    card.name === "Simic Guildgate" || card.name === "Temple of Mystery"
      ? { ...card, name: card.name === "Simic Guildgate" ? "Breeding Pool" : "Tropical Island", typeLine: "Land — Forest Island", oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {G} or {U}." }
      : card
  ));
  const open = formatManaBaseCoaching(buildManaBaseCoaching({ commander: EDRIC, cards: untappedCurve }));
  assert.doesNotMatch(open, /The early curve cannot use lands that enter tapped/);
});

test("a four-color ramp deck treats land ramp as a search, not an extra land, and one green dork is not generic", () => {
  const cards = omnathDeck();
  const report = buildManaBaseCoaching({ commander: OMNATH, cards });
  assert.equal(report.lands.status, "short");
  assert.ok(report.lands.landRamp >= 5);
  assert.equal(report.lands.landfall, true);
  const white = report.colors.find((color) => color.color === "W");
  assert.equal(white.status, "short");
  assert.ok(white.untapped < 8);
  const text = formatManaBaseCoaching(report);
  assert.match(text, /not an extra land/);
  assert.match(text, /Cultivate|Rampant Growth|Farseek/);
  assert.match(text, /Llanowar Elves/);
  assert.match(text, /not a generic source/i);
  assert.match(text, /whenever a land enters|land enters/i);
  assert.match(text, /Wrath of God|white/i);
  assert.match(text, /Command Tower|Plains/);
  assert.match(text, /Theory:/);
  assert.match(text, /Swap:/);
  assert.equal(report.lands.count, 28);
  assert.equal(report.lands.targetLow, 36);
  assert.equal(report.lands.targetHigh, 38);
  assert.equal(report.lands.baselineLow, 40);
  assert.equal(report.lands.baselineHigh, 42);
  assert.match(text, /Without the ramp package it would want about 40–42/);
  assert.match(text, /not an extra land or a color source/i);
  const blue = report.colors.find((color) => color.color === "U");
  const red = report.colors.find((color) => color.color === "R");
  assert.equal(blue.downgraded, true);
  assert.equal(red.downgraded, true);
  assert.notEqual(blue.status, "short");
  assert.notEqual(red.status, "short");
  assert.doesNotMatch(text, /blue and red are short too/i);
  const cultivate = readPrintedMana({
    name: "Cultivate",
    typeLine: "Sorcery",
    manaCost: "{2}{G}",
    oracleText: "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.",
  }, { identity: ["G", "W", "U", "R"], cards: [{ name: "Forest", typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" }] });
  assert.equal(cultivate.landRamp, true);
  assert.equal(cultivate.land, false);
  assert.equal(cultivate.pays({ name: "Bear", typeLine: "Creature — Bear", manaCost: "{G}" }, "G"), false);
});

test("extra land drops raise the land target above the same curve without them", () => {
  const cards = library([
    { name: "Forest", quantity: 34, typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" },
    { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
  ], (index) => ({
    name: `Bear ${index}`,
    typeLine: "Creature — Bear",
    manaCost: "{2}{G}",
    cmc: 3,
    oracleText: "Trample",
  }));
  const azusa = buildManaBaseCoaching({ commander: AZUSA, cards });
  const goreclaw = buildManaBaseCoaching({ commander: GORECLAW, cards });
  assert.ok(azusa.lands.targetLow > goreclaw.lands.targetLow);
  assert.match(formatManaBaseCoaching(azusa), /additional lands/i);
  assert.equal(azusa.lands.extraLandDrops, 2);
});

test("Urborg does not turn every Island into a black source", () => {
  const cards = library([
    { name: "Island", quantity: 10, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" },
    { name: "Urborg, Tomb of Yawgmoth", typeLine: "Land", oracleText: "Each land is a Swamp in addition to its other land types." },
    { name: "Murder", typeLine: "Instant", manaCost: "{1}{B}{B}", oracleText: "Destroy target creature." },
  ], (index) => ({
    name: `Thought ${index}`,
    typeLine: "Instant",
    manaCost: "{1}{U}",
    oracleText: "Draw a card.",
  }), 40);
  const report = buildManaBaseCoaching({
    commander: { name: "Sygg, River Cutthroat", manaCost: "{U/B}{U/B}", colorIdentity: ["U", "B"], oracleText: "At the beginning of each end step, if an opponent lost 3 or more life this turn, you may draw a card.", typeLine: "Legendary Creature — Merfolk Rogue" },
    cards,
  });
  const black = report.colors.find((color) => color.color === "B");
  assert.equal(black.untapped, 1);
  assert.match(formatManaBaseCoaching(report), /Urborg, Tomb of Yawgmoth/);
  assert.match(formatManaBaseCoaching(report), /not counted as black sources/i);
});

test("printed timing, fetches, restrictions, and one-color ramp are not generic tags", () => {
  const island = { name: "Island", typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" };
  const swamp = { name: "Swamp", typeLine: "Basic Land — Swamp", oracleText: "({T}: Add {B}.)" };
  const identity = ["W", "U", "B", "R", "G"];
  const shock = readPrintedMana({
    name: "Steam Vents",
    typeLine: "Land — Island Mountain",
    oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {U} or {R}.",
  }, { identity, cards: [island] });
  assert.equal(shock.timing, "shock");
  assert.equal(shock.untappedOn(2, "U"), true);
  assert.deepEqual(shock.colors.sort(), ["R", "U"]);

  const temple = readPrintedMana({
    name: "Temple of Enlightenment",
    typeLine: "Land",
    oracleText: "This land enters tapped.\nWhen this land enters, scry 1.\n{T}: Add {W} or {U}.",
  }, { identity });
  assert.equal(temple.timing, "tapped");
  assert.equal(temple.untappedOn(2, "U"), false);

  const fast = readPrintedMana({
    name: "Spirebluff Canal",
    typeLine: "Land",
    oracleText: "This land enters tapped unless you control two or fewer other lands.\n{T}: Add {U} or {R}.",
  }, { identity });
  assert.equal(fast.timing, "fast");
  assert.equal(fast.untappedOn(2, "U"), true);

  const check = readPrintedMana({
    name: "Glacial Fortress",
    typeLine: "Land",
    oracleText: "This land enters tapped unless you control a Plains or an Island.\n{T}: Add {W} or {U}.",
  }, { identity });
  assert.equal(check.timing, "check");
  assert.equal(check.untappedOn(2, "U"), false);

  const tarn = readPrintedMana({
    name: "Scalding Tarn",
    typeLine: "Land",
    oracleText: "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle.",
  }, { identity, cards: [island, swamp] });
  assert.equal(tarn.pays({ name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}" }, "U"), true);
  assert.equal(tarn.pays({ name: "Murder", typeLine: "Instant", manaCost: "{1}{B}{B}" }, "B"), false);
  assert.equal(tarn.untappedOn(2, "U"), true);

  const wilds = readPrintedMana({
    name: "Evolving Wilds",
    typeLine: "Land",
    oracleText: "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
  }, { identity, cards: [island, swamp] });
  assert.equal(wilds.untappedOn(2, "U"), false);
  assert.equal(wilds.pays({ name: "Murder", typeLine: "Instant" }, "B"), true);

  const passage = readPrintedMana({
    name: "Fabled Passage",
    typeLine: "Land",
    oracleText: "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Then if you control four or more lands, untap that land.",
  }, { identity, cards: [island] });
  assert.equal(passage.timing, "fetch-late");
  assert.equal(passage.untappedOn(2, "U"), false);
  assert.equal(passage.untappedOn(6, "U"), true);

  const elves = readPrintedMana({
    name: "Llanowar Elves",
    typeLine: "Creature — Elf Druid",
    manaCost: "{G}",
    oracleText: "{T}: Add {G}.",
  }, { identity: ["G", "W", "U", "R"] });
  assert.equal(elves.singleColor, "G");
  assert.equal(elves.generic, false);
  assert.equal(elves.earlyRock, true);

  const savant = readPrintedMana({
    name: "Beastcaller Savant",
    typeLine: "Creature — Elf Shaman Ally",
    manaCost: "{1}{G}",
    oracleText: "Haste\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell.",
  }, { identity });
  assert.equal(savant.generic, false);
  assert.equal(savant.restricted.label, "creature spells");
  assert.equal(savant.pays({ name: "Dragonlord Ojutai", typeLine: "Legendary Creature — Elder Dragon" }, "U"), true);
  assert.equal(savant.pays({ name: "Harmonize", typeLine: "Sorcery" }, "G"), false);

  const pillar = readPrintedMana({
    name: "Pillar of Origins",
    typeLine: "Artifact",
    manaCost: "{2}",
    oracleText: "As this artifact enters, choose a creature type.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.",
  }, { identity });
  assert.equal(pillar.pays({ name: "Dragonlord Ojutai", typeLine: "Legendary Creature — Elder Dragon" }, "G"), false);

  const haven = readPrintedMana({
    name: "Haven of the Spirit Dragon",
    typeLine: "Land",
    oracleText: "{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Dragon creature spell.",
  }, { identity });
  assert.equal(haven.generic, false);
  assert.equal(haven.pays({ name: "Dragonlord Ojutai", typeLine: "Legendary Creature — Elder Dragon" }, "U"), true);
  assert.equal(haven.pays({ name: "Harmonize", typeLine: "Sorcery" }, "G"), false);

  const carnelian = readPrintedMana({
    name: "Carnelian Orb of Dragonkind",
    typeLine: "Artifact",
    manaCost: "{2}",
    oracleText: "{T}: Add {R}. If that mana is spent on a Dragon creature spell, it gains haste until end of turn.",
  }, { identity: ["R"] });
  assert.equal(carnelian.pays({ name: "Abrade", typeLine: "Instant", manaCost: "{1}{R}" }, "R"), true);

  const orchard = readPrintedMana({
    name: "Exotic Orchard",
    typeLine: "Land",
    oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce.",
  }, { identity });
  assert.equal(orchard.opponent, true);
  assert.equal(orchard.pays({ name: "Counterspell", typeLine: "Instant" }, "U"), false);

  const path = readPrintedMana({
    name: "Path of Ancestry",
    typeLine: "Land",
    oracleText: "This land enters tapped.\n{T}: Add one mana of any color in your commander's color identity. When you spend this mana to cast a creature spell, you scry 1.",
  }, { identity: ["U", "R"] });
  assert.equal(path.generic, true);
  assert.equal(path.timing, "tapped");
  assert.equal(path.untappedOn(2, "U"), false);
});

test("the reader agrees with the plan coach on restricted mana, opponent mana, and fetches", () => {
  const identity = ["W", "U", "B", "R", "G"];
  const island = { name: "Island", typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}." };
  const creature = { name: "Dragonlord Ojutai", typeLine: "Legendary Creature — Elder Dragon", manaCost: "{3}{W}{U}" };
  const harmonize = { name: "Harmonize", typeLine: "Sorcery", manaCost: "{2}{G}{G}" };
  const cases = [
    [{ name: "Beastcaller Savant", typeLine: "Creature — Elf Shaman Ally", oracleText: "Haste\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell." }, creature, "G", true],
    [{ name: "Beastcaller Savant", typeLine: "Creature — Elf Shaman Ally", oracleText: "Haste\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell." }, harmonize, "G", false],
    [{ name: "Fellwar Stone", typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce." }, creature, "U", false],
    [{ name: "Forbidden Orchard", typeLine: "Land", oracleText: "{T}: Add one mana of any color.\nWhenever you tap this land for mana, target opponent creates a 1/1 colorless Spirit creature token." }, harmonize, "G", true],
    [{ name: "Reflecting Pool", typeLine: "Land", oracleText: "{T}: Add one mana of any type that a land you control could produce." }, creature, "U", true],
  ];
  for (const [card, spell, color, expected] of cases) {
    const cards = card.name === "Reflecting Pool" ? [card, island] : [card, island];
    const read = readPrintedMana(card, { identity, cards });
    assert.equal(read.pays(spell, color), expected, card.name);
    assert.equal(manaPaysSpell(card, spell, color, cards, identity), expected, card.name);
  }
});

test("missing printed text keeps the mana base from being judged, and a partial list is not high confidence", () => {
  const empty = buildManaBaseCoaching({
    commander: { name: "Krenko, Mob Boss" },
    cards: [{ name: "Mountain", quantity: 36 }, { name: "Goblin", quantity: 1 }],
  });
  assert.equal(empty.readable, false);
  assert.match(formatManaBaseCoaching(empty), /Names alone are not a mana base/);
  assert.match(formatManaBaseCoaching(empty), /not a generic source/i);

  const partial = buildManaBaseCoaching({
    commander: KRENKO,
    cards: krenkoDeck().slice(0, 12),
  });
  assert.equal(partial.readable, true);
  assert.notEqual(partial.confidence.level, "high");
  assert.match(partial.confidence.reason, /not a full Commander list/i);
});

test("mana-base questions are not the curve question and do not offer a format", () => {
  assert.equal(questionWantsManaBaseCoaching("How is my mana base?"), true);
  assert.equal(questionWantsManaBaseCoaching("Do I have enough lands?"), true);
  assert.equal(questionWantsManaBaseCoaching("Can I cast my colors?"), true);
  assert.equal(questionWantsManaBaseCoaching("How does this mana curve fit the commander?"), false);
  assert.equal(questionWantsManaBaseCoaching("Why this change?"), false);

  const cards = marchesaDeck();
  const deckText = cards.map((card) => `${card.quantity} ${card.name}`).join("\n");
  const answer = nativeCoachAnswer(
    [{ role: "user", content: "How is my mana base?" }],
    { game: "Magic: The Gathering", format: "Commander", deckText, commander: MARCHEA, cards },
  );
  assert.match(answer, /Mana base — Marchesa, the Black Rose/);
  assert.match(answer, /Theory:/);
  assert.match(answer, /Exotic Orchard/);
  assert.match(answer, /Confidence:/);
  assert.doesNotMatch(answer, /2500 opening hands/);
  assert.doesNotMatch(answer, /name the format/i);

  const curve = nativeCoachAnswer(
    [{ role: "user", content: "How does this mana curve fit the commander?" }],
    { game: "Magic: The Gathering", format: "Commander", deckText, commander: MARCHEA, cards },
  );
  assert.match(curve, /Curve and roles/);
  assert.doesNotMatch(curve, /Mana base —/);
});

test("a commander that costs two blue, or several two-pip spells, can still flag that color short", () => {
  const island = { name: "Island", quantity: 12, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" };
  const swamp = { name: "Swamp", quantity: 12, typeLine: "Basic Land — Swamp", oracleText: "({T}: Add {B}.)" };
  const mountain = { name: "Mountain", quantity: 12, typeLine: "Basic Land — Mountain", oracleText: "({T}: Add {R}.)" };
  const filler = (index) => ({
    name: `Court ${index}`,
    typeLine: "Instant",
    manaCost: "{1}{U}",
    cmc: 2,
    oracleText: "Draw a card.",
  });
  const oneCounter = buildManaBaseCoaching({
    commander: MARCHEA,
    cards: library([island, swamp, mountain, { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", cmc: 2, oracleText: "Counter target spell." }], filler),
  });
  assert.notEqual(oneCounter.colors.find((color) => color.color === "U").status, "short");

  const committed = buildManaBaseCoaching({
    commander: MARCHEA,
    cards: library([
      island,
      swamp,
      mountain,
      ...[0, 1, 2, 3].map((index) => ({ name: `Counter ${index}`, typeLine: "Instant", manaCost: "{U}{U}", cmc: 2, oracleText: "Counter target spell." })),
    ], filler),
  });
  const blue = committed.colors.find((color) => color.color === "U");
  assert.equal(blue.status, "short");
  assert.ok(blue.needed >= 20);

  const talrand = buildManaBaseCoaching({
    commander: { name: "Talrand, Sky Summoner", manaCost: "{2}{U}{U}", cmc: 4, colorIdentity: ["U"], typeLine: "Legendary Creature — Merfolk Wizard", oracleText: "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying." },
    cards: library([
      { name: "Island", quantity: 14, typeLine: "Basic Land — Island", oracleText: "({T}: Add {U}.)" },
    ], (index) => ({ name: `Cantrip ${index}`, typeLine: "Instant", manaCost: "{U}", cmc: 1, oracleText: "Draw a card." })),
  });
  assert.equal(talrand.colors.find((color) => color.color === "U").status, "short");
  assert.match(formatManaBaseCoaching(talrand), /Talrand, Sky Summoner/);
  assert.match(formatManaBaseCoaching(talrand), /two blue mana/i);
});

test("a modal land face counts as that land, and a flat cost reduction trims the land target", () => {
  const mdfc = {
    name: "Bala Ged Recovery // Bala Ged Sanctum",
    typeLine: "Sorcery // Land",
    manaCost: "{2}{U}{U}",
    cmc: 4,
    cardFaces: [
      { name: "Bala Ged Recovery", typeLine: "Sorcery", manaCost: "{2}{U}{U}", oracleText: "Search your library for a basic land card, put it onto the battlefield, then shuffle." },
      { name: "Bala Ged Sanctum", typeLine: "Land", oracleText: "This land enters tapped.\n{T}: Add {G}." },
    ],
  };
  const read = readPrintedMana(mdfc, { identity: ["G", "U"] });
  assert.equal(read.land, true);
  assert.equal(read.modalLand, true);
  assert.equal(read.timing, "tapped");
  assert.equal(read.landRamp, false);
  assert.equal(read.fetch, null);
  assert.deepEqual(read.colors, ["G"]);
  assert.equal(read.untappedOn(2, "G"), false);
  assert.equal(read.pays({ name: "Bear", typeLine: "Creature — Bear" }, "G"), true);

  const withoutFaces = readPrintedMana({
    name: "Bala Ged Recovery",
    typeLine: "Sorcery",
    manaCost: "{2}{G}",
    oracleText: "Return target card from your graveyard to your hand.",
  }, { identity: ["G"] });
  assert.equal(withoutFaces.land, false);
  assert.equal(withoutFaces.modalLand, false);

  const pathway = readPrintedMana({
    name: "Riverglide Pathway // Lavaglide Pathway",
    cardFaces: [
      { name: "Riverglide Pathway", typeLine: "Land", oracleText: "{T}: Add {U}." },
      { name: "Lavaglide Pathway", typeLine: "Land", oracleText: "{T}: Add {R}." },
    ],
  }, { identity: ["U", "R"] });
  assert.equal(pathway.land, true);
  assert.equal(pathway.pathway, true);
  assert.equal(pathway.modalLand, false);
  assert.equal(pathway.untappedOn(2, "U"), true);
  assert.equal(pathway.untappedOn(2, "R"), true);

  const cards = library([
    { name: "Forest", quantity: 33, typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" },
    mdfc,
    { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
  ], (index) => ({ name: `Bear ${index}`, typeLine: "Creature — Bear", manaCost: "{2}{G}", cmc: 3, oracleText: "Trample" }));
  const withMdfc = buildManaBaseCoaching({ commander: GORECLAW, cards });
  assert.equal(withMdfc.lands.modalLands, 1);
  assert.equal(withMdfc.lands.count, 34);
  assert.match(formatManaBaseCoaching(withMdfc), /land face is the one counted/i);
  assert.equal(withMdfc.colors.find((color) => color.color === "G").spell.name === "Bala Ged Recovery // Bala Ged Sanctum", false);

  const bears = library([
    { name: "Forest", quantity: 34, typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" },
    { name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
  ], (index) => ({ name: `Bear ${index}`, typeLine: "Creature — Bear", manaCost: "{2}{G}", cmc: 3, oracleText: "Trample" }));
  const goreclaw = buildManaBaseCoaching({ commander: GORECLAW, cards: bears });
  const vanilla = buildManaBaseCoaching({
    commander: { name: "Bear Boss", manaCost: "{3}{G}", cmc: 4, colorIdentity: ["G"], oracleText: "Trample.", typeLine: "Legendary Creature — Bear" },
    cards: bears,
  });
  const flat = buildManaBaseCoaching({
    commander: { name: "Flat Reducer", manaCost: "{3}{G}", cmc: 4, colorIdentity: ["G"], typeLine: "Legendary Creature — Bear", oracleText: "Creature spells you cast cost {1} less to cast." },
    cards: bears,
  });
  const scaled = buildManaBaseCoaching({
    commander: { name: "Scaled Reducer", manaCost: "{3}{G}", cmc: 4, colorIdentity: ["G"], typeLine: "Legendary Creature — Bear", oracleText: "Creature spells you cast cost {1} less to cast for each +1/+1 counter on Scaled Reducer." },
    cards: bears,
  });
  const dragons = buildManaBaseCoaching({
    commander: { name: "Dragon Reducer", manaCost: "{3}{G}", cmc: 4, colorIdentity: ["G"], typeLine: "Legendary Creature — Bear", oracleText: "Dragon spells you cast cost {1} less to cast." },
    cards: bears,
  });
  assert.equal(goreclaw.lands.targetLow, vanilla.lands.targetLow);
  assert.equal(scaled.lands.targetLow, goreclaw.lands.targetLow);
  assert.equal(dragons.lands.targetLow, goreclaw.lands.targetLow);
  assert.ok(flat.lands.targetLow < goreclaw.lands.targetLow);
  assert.ok(flat.lands.targetLow >= 32);
  const flatText = formatManaBaseCoaching(flat);
  assert.match(flatText, /Creature spells you cast cost \{1\} less to cast/);
  assert.match(flatText, /printed mana cost/i);
  assert.match(flatText, /33–35/);
  assert.doesNotMatch(flatText, /Without the ramp package/);
});

test("the mana coach is in the workbench and stacks on a narrow screen", () => {
  const workbench = readFileSync(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../app/components/forge/mana-base-coach.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/testing-anvil.css", import.meta.url), "utf8");
  assert.match(workbench, /<ManaBaseCoach/);
  assert.match(panel, /mana-base-coach/);
  assert.match(panel, /cardFaces/);
  assert.match(panel, /Reading printed mana text/);
  assert.match(panel, /Colors by turn/);
  assert.match(panel, /mana-base-quote/);
  assert.doesNotMatch(panel, /<select|name the format|format selector/i);
  assert.match(css, /\.mana-base-coach\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.mana-base-quote\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.mana-base-stats\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /@media \(min-width: 420px\)[\s\S]*\.mana-base-stats\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media \(min-width: 720px\)[\s\S]*\.mana-base-stats\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
});
