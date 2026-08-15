import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
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

const orzhovScion = {
  name: "Test Orzhov Scion",
  colors: ["W", "B"],
  oracleText: "Whenever another white creature you control dies, create a 1/1 white Spirit creature token with flying. Sacrifice three white creatures: Exile target creature.",
  typeLine: "Legendary Creature — Human Cleric",
  manaCost: "{W}{B}",
};

const landfallTitan = {
  name: "Test Landfall Titan",
  colors: ["G"],
  oracleText: "Landfall — Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{4}{G}{G}",
};

const tokenFoundry = {
  name: "Test Token Foundry",
  colors: ["W"],
  oracleText: "At the beginning of combat on your turn, create a 1/1 white Citizen creature token.",
  typeLine: "Legendary Creature — Human Citizen",
  manaCost: "{2}{W}",
};

const equipmentSmith = {
  name: "Test Equipment Smith",
  colors: ["W"],
  oracleText: "Whenever an Equipment you control becomes attached to a creature you control, put a +1/+1 counter on that creature.",
  typeLine: "Legendary Creature — Kor Artificer",
  manaCost: "{2}{W}",
};

const visceraSeer = {
  name: "Viscera Seer",
  oracleText: "Sacrifice a creature: Scry 1.",
  typeLine: "Creature — Vampire Wizard",
  manaCost: "{B}",
};

const bloodArtist = {
  name: "Blood Artist",
  oracleText: "Whenever another creature dies, target player loses 1 life and you gain 1 life.",
  typeLine: "Creature — Vampire",
  manaCost: "{1}{B}",
};

const citizenMuster = {
  name: "Citizen Muster",
  oracleText: "Create a 1/1 white Citizen creature token.",
  typeLine: "Creature — Human",
  manaCost: "{1}{W}",
};

const angelHost = {
  name: "Angel Host",
  oracleText: "At the beginning of combat on your turn, create a 4/4 white Angel creature token with flying.",
  typeLine: "Creature — Angel",
  manaCost: "{3}{W}",
};

const investigateScout = {
  name: "Investigate Scout",
  oracleText: "When this enters, investigate.",
  typeLine: "Creature — Human Advisor",
  manaCost: "{2}{W}",
};

const treasureDigger = {
  name: "Treasure Digger",
  oracleText: "When this enters, create a Treasure token.",
  typeLine: "Creature — Pirate",
  manaCost: "{1}{R}",
};

const tomeScour = {
  name: "Tome Scour",
  oracleText: "Target player mills two cards.",
  typeLine: "Sorcery",
  manaCost: "{U}",
};

const plantNursery = {
  name: "Plant Nursery",
  oracleText: "Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Creature — Elf Druid",
  manaCost: "{2}{G}",
};

test("aristocrats occupancy opens on a dies-plus-sacrifice commander", () => {
  const intent = intentFor(orzhovScion);
  assert.ok(intent.packageIds.includes("aristocrats"));
  assert.ok(!intentFor(landfallTitan).packageIds.includes("aristocrats"));
  assert.ok(!intentFor(equipmentSmith).packageIds.includes("aristocrats"));
  assert.ok(!intentFor(tokenFoundry).packageIds.includes("aristocrats"));
});

test("aristocrats core is outlets, death payoffs, and creature-token fodder — not mill or named artifact tokens", () => {
  const intent = intentFor(orzhovScion);
  assert.equal(cardSatisfiesPackageCore(visceraSeer, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(bloodArtist, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(citizenMuster, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(investigateScout, "aristocrats", intent), false);
  assert.equal(cardSatisfiesPackageCore(treasureDigger, "aristocrats", intent), false);
  assert.equal(cardSatisfiesPackageCore(tomeScour, "aristocrats", intent), false);
  assert.equal(cardSatisfiesPackageSupport(treasureDigger, "aristocrats", intent), false);
  assert.equal(cardSatisfiesPackageSupport(tomeScour, "aristocrats", intent), false);
  assert.equal(cardIsPackageFalseFriend(treasureDigger, "aristocrats", intent), false);
  assert.equal(cardIsPackageFalseFriend(tomeScour, "aristocrats", intent), false);
});

test("creature-token commanders keep generic tokens occupancy when aristocrats is closed", () => {
  const landfallIntent = intentFor(landfallTitan);
  assert.equal(cardSatisfiesPackageCore(plantNursery, "tokens", landfallIntent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", landfallIntent), true);
  assert.equal(cardIsPackageFalseFriend(angelHost, "tokens", landfallIntent), false);

  const goWideIntent = intentFor(tokenFoundry);
  assert.equal(cardSatisfiesPackageCore(citizenMuster, "tokens", goWideIntent), true);
  assert.equal(cardSatisfiesPackageCore(angelHost, "tokens", goWideIntent), true);
});

test("an aristocrats commander forges outlets and fodder, not mill or Treasure as package core", () => {
  const wbSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{B}", colorIdentity: ["W", "B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const wbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Orzhov Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: orzhovScion,
    cards: [...wbSpells, visceraSeer, bloodArtist, citizenMuster, treasureDigger, tomeScour, investigateScout, ...wbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Viscera Seer"), "a sacrifice outlet is an engine piece");
  assert.ok(names.includes("Blood Artist"), "a death payoff is an engine piece");
  assert.equal(cardSatisfiesPackageCore(visceraSeer, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(citizenMuster, "aristocrats", intent), true);
  assert.equal(cardSatisfiesPackageCore(treasureDigger, "aristocrats", intent), false);
  assert.equal(cardSatisfiesPackageCore(tomeScour, "aristocrats", intent), false);
  const millRow = report.selected.rows.find((row) => row.name === "Tome Scour");
  if (millRow) {
    assert.equal(cardSatisfiesPackageCore(millRow, "aristocrats", intent), false, "mill must not occupy aristocrats core");
  }
  const treasureRow = report.selected.rows.find((row) => row.name === "Treasure Digger");
  if (treasureRow) {
    assert.equal(cardSatisfiesPackageCore(treasureRow, "aristocrats", intent), false, "Treasure makers must not occupy aristocrats core");
  }
});
