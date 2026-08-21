import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  extractTypalTribes,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

const emptyBlueprint = {
  source: "",
  requestedMechanics: [],
  desiredRoles: [],
  packageSignals: [],
  promises: [],
};

function intentFor(commander, extraContext = {}) {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander },
    {
      blueprint: emptyBlueprint,
      commanderScopes: commanderMechanicalScopes(commander),
      ...extraContext,
    },
  );
}

const goblinBoss = {
  name: "Test Goblin Boss",
  colors: ["R"],
  oracleText: "Goblin creatures you control get +1/+1.",
  typeLine: "Legendary Creature — Goblin Warrior",
  manaCost: "{2}{R}",
};

const bearQueen = {
  name: "Test Bear Queen",
  colors: ["G"],
  oracleText: "Other Bears you control get +1/+1.",
  typeLine: "Legendary Creature — Bear",
  manaCost: "{1}{G}{G}",
};

const humanScholar = {
  name: "Test Human Scholar",
  colors: ["G", "U"],
  oracleText: "Whenever a Human you control enters, create a Treasure token.",
  typeLine: "Legendary Creature — Human Advisor",
  manaCost: "{1}{G}{U}",
};

const tayamShape = {
  name: "Test Counter Sage",
  colors: ["W", "B", "G"],
  oracleText: "Remove one or more counters from among creatures you control: Mill that many cards.",
  typeLine: "Legendary Creature — Elf Beast",
  manaCost: "{1}{W}{B}{G}",
};

const esikaShape = {
  name: "Test God of Legends",
  colors: ["W", "U", "B", "R", "G"],
  oracleText: "Legendary creatures you control have vigilance.",
  typeLine: "Legendary Creature — God",
  manaCost: "{2}{G}",
};

const aangShape = {
  name: "Test Landbender",
  colors: ["G", "W", "U"],
  oracleText: "When another creature you control leaves the battlefield, transform this. Land creatures you control have vigilance.",
  typeLine: "Legendary Creature — Human Avatar Ally",
  manaCost: "{2}{G}{W}{U}",
};

const merenShape = {
  name: "Test Grave Recruiter",
  colors: ["B", "G"],
  oracleText: "Whenever another creature you control dies, you may return target creature card from your graveyard to the battlefield.",
  typeLine: "Legendary Creature — Elf Shaman",
  manaCost: "{2}{B}{G}",
};

const goblinWarchief = {
  name: "Goblin Warchief",
  oracleText: "Goblin creatures you control have haste.",
  typeLine: "Creature — Goblin Warrior",
  manaCost: "{1}{R}{R}",
};

const goblinGrenade = {
  name: "Goblin Grenade",
  oracleText: "As an additional cost to cast this spell, sacrifice a Goblin. Goblin Grenade deals 5 damage to any target.",
  typeLine: "Sorcery",
  manaCost: "{R}",
};

const angelHost = {
  name: "Angel Host",
  oracleText: "Create two 4/4 white Angel creature tokens with flying.",
  typeLine: "Creature — Angel",
  manaCost: "{5}{W}",
};

const mistform = {
  name: "Mistform Shapeshifter",
  oracleText: "Changeling (This card is every creature type.)",
  typeLine: "Creature — Shapeshifter",
  manaCost: "{2}{U}",
};

test("extractTypalTribes names real tribes and rejects among / legendary / land", () => {
  assert.deepEqual(extractTypalTribes("Goblin creatures you control get +1/+1."), ["goblin"]);
  assert.deepEqual(extractTypalTribes("Other Bears you control get +1/+1."), ["bear"]);
  assert.deepEqual(extractTypalTribes("Whenever a Human you control enters, create a Treasure token."), ["human"]);
  assert.deepEqual(extractTypalTribes("Remove counters from among creatures you control."), []);
  assert.deepEqual(extractTypalTribes("Legendary creatures you control have vigilance."), []);
  assert.deepEqual(extractTypalTribes("Land creatures you control have vigilance."), []);
  assert.deepEqual(extractTypalTribes("Whenever another creature you control dies, draw a card."), []);
  assert.deepEqual(extractTypalTribes("Auras you control get +1/+1."), []);
  assert.deepEqual(extractTypalTribes("Equipment you control have haste."), []);
  assert.deepEqual(extractTypalTribes("Whenever one or more creatures you control become the target of an ability, draw a card."), []);
  assert.deepEqual(extractTypalTribes("If you control five or more Towns, create a token. Other creatures you control get +X/+X, where X is the number of Towns you control."), []);
  assert.deepEqual(extractTypalTribes("Whenever you cast another Vampire spell, create a token. Whenever this attacks, put a +1/+1 counter on each Vampire you control."), ["vampire"]);
  assert.deepEqual(extractTypalTribes("Search your library for a Dragon permanent card and reveal it."), ["dragon"]);
  assert.deepEqual(extractTypalTribes("Whenever you cast an instant spell, draw a card."), []);
  assert.deepEqual(extractTypalTribes("Whenever Maralen or another Elf or Faerie you control enters, draw a card. You may cast a spell with mana value less than or equal to the number of Elves and Faeries you control."), ["elf", "faerie"]);
  assert.deepEqual(extractTypalTribes("Whenever a creature or artifact you control dies, draw a card."), []);
});

test("typal occupancy opens only when the commander actually runs a tribe", () => {
  const goblins = intentFor(goblinBoss);
  assert.ok(goblins.packageIds.includes("typal"));
  assert.deepEqual(goblins.packages.find((pkg) => pkg.id === "typal")?.tribalTypes, ["goblin"]);
  assert.ok(intentFor(bearQueen).packageIds.includes("typal"));
  assert.ok(intentFor(humanScholar).packageIds.includes("typal"));
  assert.ok(!intentFor(tayamShape).packageIds.includes("typal"));
  assert.ok(!intentFor(esikaShape).packageIds.includes("typal"));
  assert.ok(!intentFor(aangShape).packageIds.includes("typal"));
  assert.ok(!intentFor(merenShape).packageIds.includes("typal"));
  assert.ok(!intentFor({
    name: "Test Activated Scholar",
    colors: ["G"],
    oracleText: "Whenever one or more creatures you control become the target of an activated ability, draw a card.",
    typeLine: "Legendary Creature — Human Scientist",
    manaCost: "{1}{G}",
  }).packageIds.includes("typal"));
  assert.ok(!intentFor({
    name: "Test Town Singer",
    colors: ["G", "W", "U", "B", "R"],
    oracleText: "At the beginning of combat on your turn, if you control five or more Towns, create a 2/2 Elemental token. Other creatures you control get +X/+X, where X is the number of Towns you control.",
    typeLine: "Legendary Creature — Human Bard",
    manaCost: "{1}{G}",
  }).packageIds.includes("typal"));
  const kediss = intentFor({
    name: "Test Emberclaw",
    colors: ["R"],
    oracleText: "Whenever a commander you control deals combat damage to an opponent, it deals that much damage to each other opponent.",
    typeLine: "Legendary Creature — Elemental Lizard",
    manaCost: "{1}{R}",
  });
  assert.ok(!kediss.packageIds.includes("typal"));
  const dwarfLord = intentFor({
    name: "Test Outlaw",
    colors: ["R"],
    oracleText: "Other Dwarves you control get +1/+0. Whenever a Dwarf you control becomes tapped, create a Treasure token.",
    typeLine: "Legendary Creature — Dwarf Berserker",
    manaCost: "{1}{R}{R}",
  });
  assert.ok(dwarfLord.packageIds.includes("typal"));
  assert.deepEqual(dwarfLord.packages.find((pkg) => pkg.id === "typal")?.tribalTypes, ["dwarf"]);
  const maralen = intentFor({
    name: "Test Fae Ascendant",
    colors: ["B", "G"],
    oracleText: "Whenever Maralen or another Elf or Faerie you control enters, exile the top two cards of target opponent's library. Once each turn, you may cast a spell with mana value less than or equal to the number of Elves and Faeries you control from among cards exiled with Maralen.",
    typeLine: "Legendary Creature — Elf Wizard",
    manaCost: "{2}{B}{G}",
  });
  assert.ok(maralen.packageIds.includes("typal"));
  assert.deepEqual(maralen.packages.find((pkg) => pkg.id === "typal")?.tribalTypes, ["elf", "faerie"]);
});

test("T'Challa's nonartifact-spell restriction does not invent a nonartifact tribe or admit changeling glue", () => {
  const tchalla = {
    name: "T'Challa, the Black Panther",
    colors: ["G", "W"],
    oracleText: "Whenever T'Challa enters or attacks, create a tapped Vibranium token. (It's an artifact with indestructible and ‘{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.’) Whenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on T'Challa.",
    typeLine: "Legendary Creature — Human Noble Hero",
    manaCost: "{1}{G}{W}",
  };
  const intent = intentFor(tchalla);
  const bloodlinePretender = {
    name: "Bloodline Pretender",
    oracleText: "Changeling (This card is every creature type.) As this creature enters, choose a creature type. Whenever another creature of the chosen type enters under your control, put a +1/+1 counter on this creature.",
    typeLine: "Artifact Creature — Shapeshifter",
    manaCost: "{3}",
    colorIdentity: [],
  };

  assert.deepEqual(extractTypalTribes(tchalla.oracleText), []);
  assert.ok(!intent.packageIds.includes("typal"));
  assert.equal(cardSatisfiesPackageCore(bloodlinePretender, "typal", intent), false);
});

test("typal core is type-line members and changelings, not oracle mentions", () => {
  const intent = intentFor(goblinBoss);
  assert.equal(cardSatisfiesPackageCore(goblinWarchief, "typal", intent), true);
  assert.equal(cardSatisfiesPackageCore(mistform, "typal", intent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "typal", intent), false);
  assert.equal(cardSatisfiesPackageCore(goblinGrenade, "typal", intent), false);
  assert.equal(cardIsPackageFalseFriend(goblinGrenade, "typal", intent), false);
  assert.equal(cardIsPackageFalseFriend(angelHost, "typal", intent), false);
});

test("a goblin commander forges goblin members, not Angel factories as package core", () => {
  const redSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Wizard", manaCost: "{2}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This deals 2 damage to any target.", typeLine: "Instant", manaCost: "{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Goblin Recruits ${i}`, oracleText: "Haste.", typeLine: "Creature — Goblin Warrior", manaCost: "{1}{R}", colorIdentity: ["R"], popularityRank: 40 })),
  ];
  const redLands = Array.from({ length: 20 }, (_, i) => ({
    name: `Test Mountain ${i}`,
    oracleText: "{T}: Add {R}.",
    typeLine: "Land — Mountain",
    manaCost: "",
    colorIdentity: ["R"],
    producedMana: ["R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: goblinBoss,
    cards: [...redSpells, goblinWarchief, mistform, angelHost, goblinGrenade, ...redLands],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Goblin Warchief") || names.some((name) => name.startsWith("Goblin Recruits")), "a type-line Goblin is an engine piece");
  assert.equal(cardSatisfiesPackageCore(goblinWarchief, "typal", intent), true);
  assert.equal(cardSatisfiesPackageCore(mistform, "typal", intent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "typal", intent), false);
  const angelRow = report.selected.rows.find((row) => row.name === "Angel Host");
  if (angelRow) {
    assert.equal(cardSatisfiesPackageCore(angelRow, "typal", intent), false, "an Angel factory must not occupy Goblin typal core");
  }
});
