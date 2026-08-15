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

const landfallTitan = {
  name: "Test Landfall Titan",
  colors: ["G"],
  oracleText: "Landfall — Whenever a land you control enters, create a 0/1 green Plant creature token.",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{4}{G}{G}",
};

const meren = {
  name: "Test Meren",
  colors: ["B", "G"],
  oracleText: "Whenever another creature you control dies, you may return target creature card from your graveyard to the battlefield.",
  typeLine: "Legendary Creature — Elf Shaman",
  manaCost: "{2}{B}{G}",
};

const equipmentSmith = {
  name: "Test Equipment Smith",
  colors: ["W"],
  oracleText: "Whenever an Equipment you control becomes attached to a creature you control, put a +1/+1 counter on that creature.",
  typeLine: "Legendary Creature — Kor Artificer",
  manaCost: "{2}{W}",
};

const lotusCobra = {
  name: "Lotus Cobra",
  oracleText: "Landfall — Whenever a land you control enters, add one mana of any color.",
  typeLine: "Creature — Snake",
  manaCost: "{1}{G}",
};

const landEntersPayoff = {
  name: "Field Scout",
  oracleText: "Whenever a land you control enters, draw a card.",
  typeLine: "Creature — Human Scout",
  manaCost: "{2}{G}",
};

const exploration = {
  name: "Exploration",
  oracleText: "You may play an additional land on each of your turns.",
  typeLine: "Enchantment",
  manaCost: "{G}",
};

const cultivate = {
  name: "Cultivate",
  oracleText: "Search your library for up to two basic land cards, put one onto the battlefield tapped and the other into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};

const discardLand = {
  name: "Land Grief",
  oracleText: "Whenever you discard a land card, draw a card.",
  typeLine: "Enchantment",
  manaCost: "{1}{B}",
};

test("landfall occupancy opens on a landfall commander", () => {
  const intent = intentFor(landfallTitan);
  assert.ok(intent.packageIds.includes("landfall"));
  assert.ok(!intentFor(meren).packageIds.includes("landfall"));
  assert.ok(!intentFor(equipmentSmith).packageIds.includes("landfall"));
});

test("landfall core is landfall, land-enters, and extra land drops — not a land-card mention", () => {
  const intent = intentFor(landfallTitan);
  assert.equal(cardSatisfiesPackageCore(lotusCobra, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(landEntersPayoff, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(exploration, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(cultivate, "landfall", intent), false);
  assert.equal(cardSatisfiesPackageSupport(cultivate, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(discardLand, "landfall", intent), false);
  assert.equal(cardSatisfiesPackageSupport(discardLand, "landfall", intent), false);
  assert.equal(cardIsPackageFalseFriend(discardLand, "landfall", intent), false);
});

test("a landfall commander forges landfall payoffs and fetch-ramp, not discard-a-land as package core", () => {
  const gSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Elf", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target artifact.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const forests = Array.from({ length: 20 }, (_, i) => ({
    name: `Test Forest ${i}`,
    oracleText: "{T}: Add {G}.",
    typeLine: "Land — Forest",
    manaCost: "",
    colorIdentity: ["G"],
    producedMana: ["G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: landfallTitan,
    cards: [...gSpells, lotusCobra, exploration, cultivate, discardLand, ...forests],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Lotus Cobra"), "a landfall payoff is an engine piece");
  assert.equal(cardSatisfiesPackageCore(lotusCobra, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(exploration, "landfall", intent), true);
  assert.equal(cardSatisfiesPackageCore(cultivate, "landfall", intent), false);
  assert.equal(cardSatisfiesPackageSupport(cultivate, "landfall", intent), true);
  const griefRow = report.selected.rows.find((row) => row.name === "Land Grief");
  if (griefRow) {
    assert.equal(cardSatisfiesPackageCore(griefRow, "landfall", intent), false, "discard-a-land must not occupy landfall core");
  }
});
