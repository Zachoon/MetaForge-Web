import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  strategicSemanticsFor,
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

const meren = {
  name: "Test Meren",
  colors: ["B", "G"],
  oracleText: "Whenever another creature you control dies, you may return target creature card from your graveyard to the battlefield.",
  typeLine: "Legendary Creature — Elf Shaman",
  manaCost: "{2}{B}{G}",
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

const animateDead = {
  name: "Reanimate",
  oracleText: "Return target creature card from your graveyard to the battlefield.",
  typeLine: "Sorcery",
  manaCost: "{B}",
};

const tomeScour = {
  name: "Tome Scour",
  oracleText: "Target player mills two cards.",
  typeLine: "Sorcery",
  manaCost: "{U}",
};

const faithless = {
  name: "Faithless Looting",
  oracleText: "Draw two cards, then discard two cards.",
  typeLine: "Sorcery",
  manaCost: "{R}",
};

const graveTroll = {
  name: "Test Grave Troll",
  oracleText: "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)",
  typeLine: "Creature — Troll",
  manaCost: "{4}{B}",
};

const bigBeater = {
  name: "Test Grave Titan",
  oracleText: "Deathtouch.",
  typeLine: "Creature — Zombie Giant",
  manaCost: "{4}{B}{B}",
  cmc: 6,
};

const streetSeer = {
  name: "Street Seer",
  oracleText: "When this enters, surveil 1.",
  typeLine: "Creature — Human Advisor",
  manaCost: "{1}{U}",
};

test("reanimator occupancy opens on a return-from-yard commander", () => {
  const intent = intentFor(meren);
  assert.ok(intent.packageIds.includes("reanimator"));
  assert.ok(!intentFor(landfallTitan).packageIds.includes("reanimator"));
  assert.ok(!intentFor(equipmentSmith).packageIds.includes("reanimator"));
});

test("dredge reminder mill is not graveyard setup", () => {
  const semantics = strategicSemanticsFor(graveTroll);
  assert.equal(semantics.has("graveyard_enabler"), false);
  assert.equal(semantics.has("reanimation"), false);
  assert.equal(strategicSemanticsFor(tomeScour).has("graveyard_enabler"), true);
});

test("reanimator core is reanimation, mill/discard setup, and big targets — not dredge-to-hand", () => {
  const intent = intentFor(meren);
  assert.equal(cardSatisfiesPackageCore(animateDead, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(tomeScour, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(faithless, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(streetSeer, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(bigBeater, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(graveTroll, "reanimator", intent), false);
  assert.equal(cardSatisfiesPackageSupport(graveTroll, "reanimator", intent), false);
  assert.equal(cardIsPackageFalseFriend(graveTroll, "reanimator", intent), false);
});

test("a reanimator commander forges reanimation and mill setup, not dredge as package core", () => {
  const bgSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Elf", manaCost: "{2}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}{G}", colorIdentity: ["B", "G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const bgDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Golgari Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "G"],
    producedMana: ["B", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: meren,
    cards: [...bgSpells, animateDead, tomeScour, graveTroll, bigBeater, ...bgDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Reanimate"), "a reanimation spell is an engine piece");
  assert.equal(cardSatisfiesPackageCore(animateDead, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(tomeScour, "reanimator", intent), true);
  assert.equal(cardSatisfiesPackageCore(graveTroll, "reanimator", intent), false);
  const trollRow = report.selected.rows.find((row) => row.name === "Test Grave Troll");
  if (trollRow) {
    assert.equal(cardSatisfiesPackageCore(trollRow, "reanimator", intent), false, "dredge must not occupy reanimator core");
  }
});
