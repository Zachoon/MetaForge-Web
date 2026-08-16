import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectSpellslingerCommander,
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

const spellslingerArchmage = {
  name: "Test Archmage",
  colors: ["U", "R"],
  oracleText: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
  typeLine: "Legendary Creature — Wizard",
  manaCost: "{2}{U}{R}",
};

const landfallTitan = {
  name: "Test Landfall Titan",
  colors: ["G"],
  oracleText: "Landfall — Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{4}{G}{G}",
};

const equipmentSmith = {
  name: "Test Equipment Smith",
  colors: ["W"],
  oracleText: "Whenever an Equipment you control becomes attached to a creature you control, put a +1/+1 counter on that creature.",
  typeLine: "Legendary Creature — Kor Artificer",
  manaCost: "{2}{W}",
};

const opt = {
  name: "Opt",
  oracleText: "Scry 1, then draw a card.",
  typeLine: "Instant",
  manaCost: "{U}",
};

const shock = {
  name: "Shock",
  oracleText: "Shock deals 2 damage to any target.",
  typeLine: "Instant",
  manaCost: "{R}",
};

const magecraftStudy = {
  name: "Archmage's Study",
  oracleText: "Magecraft — Whenever you cast or copy an instant or sorcery spell, scry 1.",
  typeLine: "Creature — Wizard",
  manaCost: "{3}{U}{R}",
  mechanics: { produces: ["spells"], rewards: ["spells"] },
};

const expensiveDraw = {
  name: "Study Break",
  oracleText: "Draw two cards.",
  typeLine: "Sorcery",
  manaCost: "{4}{U}",
  mechanics: { produces: ["spells"] },
};

test("spellslinger occupancy opens on a magecraft commander", () => {
  const intent = intentFor(spellslingerArchmage);
  assert.ok(intent.packageIds.includes("spellslinger"));
  assert.ok(!intentFor(landfallTitan).packageIds.includes("spellslinger"));
  assert.ok(!intentFor(equipmentSmith).packageIds.includes("spellslinger"));
});

test("spellslinger occupancy opens on a-player-casts and copy-target instant/sorcery, not draw-damage or creature-cast", () => {
  const parun = {
    name: "Test Parun",
    colors: ["U", "R"],
    oracleText: "Whenever you draw a card, this deals 1 damage to any target. Whenever a player casts an instant or sorcery spell, you may draw a card.",
    typeLine: "Legendary Creature — Dragon Wizard",
    manaCost: "{U}{U}{U}{R}{R}{R}",
  };
  const stella = {
    name: "Test Stella",
    colors: ["U", "R"],
    oracleText: "Prowess. {T}: Copy target instant or sorcery spell you control. You may choose new targets for the copy.",
    typeLine: "Legendary Creature — Human Rogue",
    manaCost: "{1}{U}{R}",
  };
  const drawDamage = {
    name: "Test Draw Burn",
    colors: ["U", "R"],
    oracleText: "Whenever you draw a card, this deals 1 damage to any target.",
    typeLine: "Legendary Creature — Dragon Wizard",
    manaCost: "{2}{U}{R}",
  };
  const creatureCast = {
    name: "Test Creature Mage",
    colors: ["G"],
    oracleText: "Whenever you cast a creature spell, draw a card.",
    typeLine: "Legendary Creature — Elf",
    manaCost: "{2}{G}",
  };
  const copyCreature = {
    name: "Test Clone Mage",
    colors: ["U"],
    oracleText: "Copy target creature spell.",
    typeLine: "Legendary Creature — Shapeshifter",
    manaCost: "{3}{U}",
  };
  assert.equal(detectSpellslingerCommander(parun.oracleText), true);
  assert.equal(detectSpellslingerCommander(stella.oracleText), true);
  assert.equal(detectSpellslingerCommander(drawDamage.oracleText), false);
  assert.equal(detectSpellslingerCommander(creatureCast.oracleText), false);
  assert.equal(detectSpellslingerCommander(copyCreature.oracleText), false);
  assert.ok(intentFor(parun).packageIds.includes("spellslinger"));
  assert.ok(intentFor(stella).packageIds.includes("spellslinger"));
  assert.ok(!intentFor(drawDamage).packageIds.includes("spellslinger"));
  assert.ok(!intentFor(creatureCast).packageIds.includes("spellslinger"));
});

test("spellslinger core is cheap instants and sorceries — not magecraft payoffs or expensive spells", () => {
  const intent = intentFor(spellslingerArchmage);
  assert.equal(cardSatisfiesPackageCore(opt, "spellslinger", intent), true);
  assert.equal(cardSatisfiesPackageCore(shock, "spellslinger", intent), true);
  assert.equal(cardSatisfiesPackageCore(magecraftStudy, "spellslinger", intent), false);
  assert.equal(cardSatisfiesPackageSupport(magecraftStudy, "spellslinger", intent), true);
  assert.equal(cardSatisfiesPackageCore(expensiveDraw, "spellslinger", intent), false);
  assert.equal(cardSatisfiesPackageSupport(expensiveDraw, "spellslinger", intent), false);
  assert.equal(cardIsPackageFalseFriend(expensiveDraw, "spellslinger", intent), false);
});

test("a spellslinger commander forges cheap spells, not expensive spells as package core", () => {
  const urSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Wizard", manaCost: "{2}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This deals 2 damage to any target.", typeLine: "Instant", manaCost: "{R}", colorIdentity: ["R"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const islands = Array.from({ length: 20 }, (_, i) => ({
    name: `Test Island ${i}`,
    oracleText: "{T}: Add {U}.",
    typeLine: "Land — Island",
    manaCost: "",
    colorIdentity: ["U"],
    producedMana: ["U"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: spellslingerArchmage,
    cards: [...urSpells, opt, shock, magecraftStudy, expensiveDraw, ...islands],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Opt") || names.includes("Shock"), "a cheap spell is an engine piece");
  assert.equal(cardSatisfiesPackageCore(opt, "spellslinger", intent), true);
  assert.equal(cardSatisfiesPackageCore(shock, "spellslinger", intent), true);
  assert.equal(cardSatisfiesPackageCore(magecraftStudy, "spellslinger", intent), false);
  assert.equal(cardSatisfiesPackageSupport(magecraftStudy, "spellslinger", intent), true);
  const studyRow = report.selected.rows.find((row) => row.name === "Study Break");
  if (studyRow) {
    assert.equal(cardSatisfiesPackageCore(studyRow, "spellslinger", intent), false, "expensive spells must not occupy cheap-spell core");
  }
  const magecraftRow = report.selected.rows.find((row) => row.name === "Archmage's Study");
  if (magecraftRow) {
    assert.equal(cardSatisfiesPackageCore(magecraftRow, "spellslinger", intent), false, "magecraft payoffs must not occupy cheap-spell core");
  }
});
