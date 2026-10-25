import assert from "node:assert/strict";
import test from "node:test";
import { classifyPrintedCard, buildCurveRoleCoaching, formatCurveRoleCoaching } from "../app/curve-role-coach.mjs";
import { manaPaysSpell } from "../app/plan-weakness-coach.mjs";

const TALRAND = {
  name: "Talrand, Sky Summoner",
  typeLine: "Legendary Creature — Merfolk Wizard",
  manaCost: "{2}{U}{U}",
  cmc: 4,
  colorIdentity: ["U"],
  oracleText: "Flying\nWhenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.",
};

const GORECLAW = {
  name: "Goreclaw, Terror of Qal Sisma",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{3}{G}",
  cmc: 4,
  colorIdentity: ["G"],
  oracleText: "Goreclaw, Terror of Qal Sisma costs {1} less to cast for each other creature you control with power 4 or greater.\nCreatures you control with power 4 or greater have trample and haste.\nWhenever Goreclaw attacks, other creatures you control with power 4 or greater get +1/+1 and gain haste until end of turn.",
};

const TROSTANI = {
  name: "Trostani, Selesnya's Voice",
  typeLine: "Legendary Creature — Dryad",
  manaCost: "{G}{G}{W}{W}",
  cmc: 4,
  colorIdentity: ["G", "W"],
  oracleText: "Whenever another creature you control enters, you gain life equal to that creature's toughness.\n{1}{G}{W}, {T}: Populate. (Create a token that's a copy of a creature token you control.)",
};

const BEASTCALLER = {
  name: "Beastcaller Savant",
  typeLine: "Creature — Elf Shaman Ally",
  manaCost: "{1}{G}",
  oracleText: "Haste\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell.",
};

const SOMBERWALD = {
  name: "Somberwald Sage",
  typeLine: "Creature — Human Druid",
  manaCost: "{2}{G}",
  oracleText: "{T}: Add three mana of any one color. Spend this mana only to cast creature spells.",
};

const PILLAR = {
  name: "Pillar of Origins",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "As this artifact enters, choose a creature type.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.",
};

const HAVEN = {
  name: "Haven of the Spirit Dragon",
  typeLine: "Land",
  oracleText: "{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Dragon creature spell.\n{2}, {T}, Sacrifice this land: Return target Dragon creature card or Ugin planeswalker card from your graveyard to your hand.",
};

const CARNELIAN = {
  name: "Carnelian Orb of Dragonkind",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "{T}: Add {R}. If that mana is spent on a Dragon creature spell, it gains haste until end of turn.",
};

const JADE = {
  name: "Jade Orb of Dragonkind",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "{T}: Add {G}. When you spend this mana to cast a Dragon creature spell, it enters with an additional +1/+1 counter on it and gains hexproof until your next turn.",
};

const DRAGONS_HOARD = {
  name: "Dragon's Hoard",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "Whenever a Dragon you control enters, put a gold counter on this artifact.\n{T}, Remove a gold counter from this artifact: Draw a card.\n{T}: Add one mana of any color.",
};

const EXOTIC = {
  name: "Exotic Orchard",
  typeLine: "Land",
  oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce.",
};

const FELLWAR = {
  name: "Fellwar Stone",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "{T}: Add one mana of any color that a land an opponent controls could produce.",
};

const FORBIDDEN = {
  name: "Forbidden Orchard",
  typeLine: "Land",
  oracleText: "{T}: Add one mana of any color.\nWhenever you tap this land for mana, target opponent creates a 1/1 colorless Spirit creature token.",
};

const RELIC = {
  name: "Relic of Legends",
  typeLine: "Artifact",
  manaCost: "{2}",
  oracleText: "{T}: Add one mana of any color.\nTap an untapped legendary creature you control: Add one mana of any color.",
};

const PATRIARS = {
  name: "Patriar's Seal",
  typeLine: "Artifact",
  manaCost: "{3}",
  oracleText: "{T}: Add one mana of any color.\n{1}, {T}: Untap target legendary creature you control.",
};

const POOL = {
  name: "Reflecting Pool",
  typeLine: "Land",
  oracleText: "{T}: Add one mana of any type that a land you control could produce.",
};

const TARN = {
  name: "Scalding Tarn",
  typeLine: "Land",
  oracleText: "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle.",
};

const ISLAND = { name: "Island", typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}." };
const MOUNTAIN = { name: "Mountain", typeLine: "Basic Land — Mountain", oracleText: "{T}: Add {R}." };
const FOREST = { name: "Forest", typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}." };
const PLAINS = { name: "Plains", typeLine: "Basic Land — Plains", oracleText: "{T}: Add {W}." };

const CREATURE = { name: "Dragonlord Ojutai", typeLine: "Legendary Creature — Elder Dragon", manaCost: "{3}{W}{U}" };
const HARMONIZE = { name: "Harmonize", typeLine: "Sorcery", manaCost: "{2}{G}{G}" };
const COUNTERSPELL = { name: "Counterspell", typeLine: "Instant", manaCost: "{U}{U}", oracleText: "Counter target spell." };
const RED_INSTANT = { name: "Abrade", typeLine: "Instant", manaCost: "{1}{R}", oracleText: "Choose one —\n• Abrade deals 3 damage to target creature.\n• Destroy target artifact." };

const CRATERHOOF = {
  name: "Craterhoof Behemoth",
  typeLine: "Creature — Beast",
  manaCost: "{5}{G}{G}{G}",
  cmc: 8,
  oracleText: "Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.",
};

const TRIUMPH = {
  name: "Triumph of the Hordes",
  typeLine: "Sorcery",
  manaCost: "{2}{G}{G}",
  cmc: 4,
  oracleText: "Until end of turn, creatures you control get +1/+1 and gain trample and infect.",
};

const THORACLE = {
  name: "Thassa's Oracle",
  typeLine: "Creature — Merfolk Wizard",
  manaCost: "{U}{U}",
  cmc: 2,
  oracleText: "When this creature enters, look at the top X cards of your library, where X is your devotion to blue. Put up to one of them on top of your library and the rest on the bottom of your library in a random order. If X is greater than or equal to the number of cards in your library, you win the game.",
};

const AETHERFLUX = {
  name: "Aetherflux Reservoir",
  typeLine: "Artifact",
  manaCost: "{4}",
  cmc: 4,
  oracleText: "Whenever you cast a spell, you gain 1 life for each spell you've cast this turn.\nPay 50 life: This artifact deals 50 damage to any target.",
};

const LOOTING = {
  name: "Faithless Looting",
  typeLine: "Sorcery",
  manaCost: "{R}",
  oracleText: "Draw two cards, then discard two cards.",
};

function pay(card, spell, color, cards = [], identity = ["W", "U", "B", "R", "G"]) {
  return manaPaysSpell(card, spell, color, cards, identity);
}

function weakness(report, id) {
  return report.weaknesses.find((entry) => entry.id === id);
}

test("restricted mana, opponent mana, and copy effects pay only what the printed text allows", () => {
  assert.equal(pay(BEASTCALLER, CREATURE, "G"), true);
  assert.equal(pay(BEASTCALLER, HARMONIZE, "G"), false);
  assert.equal(pay(BEASTCALLER, COUNTERSPELL, "U"), false);
  assert.equal(pay(SOMBERWALD, CREATURE, "U"), true);
  assert.equal(pay(SOMBERWALD, HARMONIZE, "G"), false);

  assert.equal(pay(PILLAR, CREATURE, "G"), false);
  assert.equal(pay(PILLAR, HARMONIZE, "G"), false);

  assert.equal(pay(HAVEN, CREATURE, "U"), true);
  assert.equal(pay(HAVEN, CREATURE, "R"), true);
  assert.equal(pay(HAVEN, HARMONIZE, "G"), false);
  assert.equal(pay(HAVEN, COUNTERSPELL, "U"), false);

  assert.equal(pay(JADE, HARMONIZE, "G", [], ["G"]), true);
  assert.equal(pay(JADE, COUNTERSPELL, "U", [], ["G"]), false);
  assert.equal(pay(CARNELIAN, RED_INSTANT, "R", [], ["R"]), true);
  assert.equal(pay(CARNELIAN, COUNTERSPELL, "U", [], ["R"]), false);
  assert.equal(pay(DRAGONS_HOARD, HARMONIZE, "G"), true);
  assert.equal(pay(DRAGONS_HOARD, COUNTERSPELL, "U"), true);

  assert.equal(pay(EXOTIC, COUNTERSPELL, "U"), false);
  assert.equal(pay(EXOTIC, CREATURE, "G"), false);
  assert.equal(pay(FELLWAR, HARMONIZE, "G"), false);
  assert.equal(pay(FORBIDDEN, COUNTERSPELL, "U", [], ["U", "G"]), true);
  assert.equal(pay(FORBIDDEN, HARMONIZE, "G", [], ["U", "G"]), true);
  assert.equal(pay(FORBIDDEN, RED_INSTANT, "R", [], ["U", "G"]), false);

  assert.equal(pay(RELIC, COUNTERSPELL, "U"), true);
  assert.equal(pay(PATRIARS, RED_INSTANT, "R"), true);

  const mountains = [MOUNTAIN, POOL];
  const islands = [ISLAND, POOL];
  assert.equal(pay(POOL, COUNTERSPELL, "U", mountains, ["U", "R"]), false);
  assert.equal(pay(POOL, COUNTERSPELL, "U", islands, ["U"]), true);
  assert.equal(pay(POOL, CREATURE, "U", [HAVEN, POOL], ["U", "R", "G"]), true);
  assert.equal(pay(POOL, HARMONIZE, "G", [HAVEN, POOL], ["G"]), false);

  assert.equal(pay(TARN, COUNTERSPELL, "U", [TARN], ["U", "R"]), false);
  assert.equal(pay(TARN, COUNTERSPELL, "U", [TARN, ISLAND], ["U", "R"]), true);
  assert.equal(pay(TARN, RED_INSTANT, "R", [TARN, ISLAND], ["U", "R"]), false);
  assert.equal(pay(TARN, RED_INSTANT, "R", [TARN, MOUNTAIN], ["U", "R"]), true);
});

test("a blue spell deck on mountains is told the mana cannot cast its spells", () => {
  const cards = [
    { ...MOUNTAIN, quantity: 30 },
    { ...ISLAND, quantity: 1 },
    EXOTIC,
    FELLWAR,
    BEASTCALLER,
    HAVEN,
    PILLAR,
    COUNTERSPELL,
    LOOTING,
  ];
  for (let index = 1; index <= 61; index += 1) {
    cards.push({
      name: `Cantrip ${index}`,
      quantity: 1,
      typeLine: "Instant",
      manaCost: "{1}{U}",
      oracleText: "Draw a card.",
    });
  }
  const report = buildCurveRoleCoaching({ commander: TALRAND, cards });
  const mana = weakness(report, "mana-base");
  assert.ok(mana);
  assert.match(mana.plain, /Counterspell/);
  assert.match(mana.plain, /opponent/i);
  const quoted = mana.citations.map((cite) => cite.quote).join("\n");
  assert.match(quoted, /land an opponent controls could produce/);
  assert.match(quoted, /Spend this mana only/);
  assert.equal(mana.swaps[0].add, "Island");
  assert.equal(mana.swaps[0].cut, "Exotic Orchard");
  assert.match(mana.swaps[0].reason, /\{T\}: Add \{U\}\./);
  assert.match(mana.swaps[0].reason, /opponent controls could produce/);
  assert.doesNotMatch(mana.swaps[0].reason, /Add Exotic Orchard|add Fellwar Stone/i);
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /What to fix first/);
  assert.match(text, /From the deck: Exotic Orchard/);
  assert.match(text, /Why:/);
  assert.equal(report.plan.id, "spellslinger");
});

test("enough islands means the mana base is not the hole", () => {
  const cards = [{ ...ISLAND, quantity: 20 }];
  for (let index = 1; index <= 8; index += 1) {
    cards.push({
      name: `Cantrip ${index}`,
      quantity: 1,
      typeLine: "Instant",
      manaCost: "{1}{U}",
      oracleText: "Draw a card.",
    });
  }
  const report = buildCurveRoleCoaching({ commander: TALRAND, cards });
  assert.equal(weakness(report, "mana-base"), undefined);
});

test("a two-color deck that is short on both colors is pointed at Command Tower", () => {
  const report = buildCurveRoleCoaching({
    commander: TROSTANI,
    cards: [
      { ...FOREST, quantity: 2 },
      { ...PLAINS, quantity: 2 },
    ],
  });
  const mana = weakness(report, "mana-base");
  assert.ok(mana);
  assert.equal(mana.swaps[0].add, "Command Tower");
  assert.match(mana.swaps[0].reason, /any color in your commander's color identity/);
  assert.match(mana.plain, /white and green|green and white/);
});

test("Craterhoof's printed pump is a win condition, and it is the wrong one for a spell deck", () => {
  assert.equal(classifyPrintedCard(CRATERHOOF).wincon, true);
  const report = buildCurveRoleCoaching({
    commander: TALRAND,
    cards: [{ ...ISLAND, quantity: 36 }, CRATERHOOF],
  });
  const mismatch = weakness(report, "wincon-mismatch");
  assert.ok(mismatch);
  assert.match(mismatch.citations[0].quote, /gain trample and get \+X\/\+X/);
  assert.equal(mismatch.swaps[0].cut, "Craterhoof Behemoth");
  assert.equal(mismatch.swaps[0].add, "Aetherflux Reservoir");
  assert.match(mismatch.swaps[0].reason, /deals 50 damage/);
  assert.doesNotMatch(mismatch.swaps[0].add, /Overrun|Craterhoof/);
  const text = formatCurveRoleCoaching(report);
  assert.match(text, /The win condition belongs in a different deck/);
  assert.match(text, /Aetherflux Reservoir/);
});

test("the same pump spell is a fitting closer for a token deck, and a library win is not", () => {
  const lands = [{ ...FOREST, quantity: 16 }, { ...PLAINS, quantity: 16 }];
  const fitting = buildCurveRoleCoaching({ commander: TROSTANI, cards: [...lands, CRATERHOOF] });
  assert.equal(fitting.plan.id, "tokens");
  assert.ok(fitting.plan.confidence >= 0.7);
  assert.equal(weakness(fitting, "wincon-mismatch"), undefined);

  const offPlan = buildCurveRoleCoaching({ commander: TROSTANI, cards: [...lands, THORACLE] });
  const mismatch = weakness(offPlan, "wincon-mismatch");
  assert.ok(mismatch);
  assert.match(mismatch.citations[0].quote, /you win the game/);
  assert.equal(mismatch.swaps[0].cut, "Thassa's Oracle");
  assert.ok(["Craterhoof Behemoth", "Triumph of the Hordes", "Akroma's Will", "Overrun"].includes(mismatch.swaps[0].add));
  assert.notEqual(mismatch.swaps[0].add, "Aetherflux Reservoir");
});

test("a green creature deck with real forests is coached on draw and answers, not on Beastcaller failing to cast creatures", () => {
  const report = buildCurveRoleCoaching({
    commander: GORECLAW,
    cards: [
      { ...FOREST, quantity: 20 },
      LOOTING,
      BEASTCALLER,
      { name: "Gigantosaurus", quantity: 1, typeLine: "Creature — Dinosaur", manaCost: "{5}{G}{G}{G}{G}", oracleText: "" },
      { name: "Sol Ring", quantity: 6, typeLine: "Artifact", manaCost: "{1}", oracleText: "{T}: Add {C}{C}." },
      CRATERHOOF,
      TRIUMPH,
    ],
  });
  assert.equal(weakness(report, "mana-base"), undefined);
  const draw = weakness(report, "role-draw");
  const interaction = weakness(report, "role-interaction");
  assert.ok(draw);
  assert.ok(interaction);
  assert.match(draw.citations.map((cite) => cite.quote).join(" "), /Draw two cards, then discard two cards/);
  assert.match(draw.citations.map((cite) => cite.says).join(" "), /not card advantage/);
  assert.equal(draw.swaps[0].add, "Harmonize");
  assert.match(interaction.citations[0].quote, /gain trample and get \+X\/\+X/);
  assert.doesNotMatch(interaction.citations[0].quote, /^Haste$/);
  assert.equal(interaction.swaps[0].add, "Beast Within");
  assert.equal(interaction.citations.some((cite) => cite.name === "Gigantosaurus"), false);
  const joined = formatCurveRoleCoaching(report);
  assert.doesNotMatch(joined, /Beastcaller Savant does not/);
  assert.doesNotMatch(joined, /Beastcaller Savant[\s\S]{0,180}does not cast/);
});

test("a spell deck that already has the jobs is not handed a hole", () => {
  const report = buildCurveRoleCoaching({
    commander: TALRAND,
    cards: [
      { ...ISLAND, quantity: 36 },
      { name: "Arcane Signet", quantity: 10, typeLine: "Artifact", manaCost: "{2}", oracleText: "{T}: Add one mana of any color in your commander's color identity." },
      { name: "Rhystic Study", quantity: 12, typeLine: "Enchantment", manaCost: "{2}{U}", oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}." },
      { ...COUNTERSPELL, quantity: 10 },
      { name: "Cyclonic Rift", quantity: 3, typeLine: "Instant", manaCost: "{1}{U}", oracleText: "Return target nonland permanent you don't control to its owner's hand.\nOverload {6}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")" },
      { ...AETHERFLUX, quantity: 3 },
    ],
  });
  assert.equal(report.weaknessHeading, "How this plan is doing");
  assert.equal(weakness(report, "mana-base"), undefined);
  assert.equal(weakness(report, "wincon-mismatch"), undefined);
  assert.match(formatCurveRoleCoaching(report), /How this plan is doing/);
});
