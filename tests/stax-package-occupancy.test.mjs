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

const grandArbiter = {
  name: "Test Grand Arbiter",
  colors: ["W", "U"],
  oracleText: "Noncreature spells cost {1} more to cast. Spells you cast cost {1} less to cast.",
  typeLine: "Legendary Creature — Human Advisor",
  manaCost: "{1}{W}{U}",
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

const winterOrb = {
  name: "Winter Orb",
  oracleText: "Players can't untap more than one land during their untap steps.",
  typeLine: "Artifact",
  manaCost: "{2}",
};

const ghostlyPrison = {
  name: "Ghostly Prison",
  oracleText: "Creatures can't attack you unless their controller pays {2} for each creature they control that's attacking you.",
  typeLine: "Enchantment",
  manaCost: "{2}{W}",
};

const smokestack = {
  name: "Smokestack",
  oracleText: "At the beginning of your upkeep, you may put a soot counter on this artifact. At the beginning of each player's upkeep, that player sacrifices a permanent for each soot counter on this artifact.",
  typeLine: "Artifact",
  manaCost: "{4}",
};

const bottomlessPit = {
  name: "Bottomless Pit",
  oracleText: "At the beginning of each player's upkeep, that player discards a card at random.",
  typeLine: "Enchantment",
  manaCost: "{1}{B}",
};

const howlingMine = {
  name: "Howling Mine",
  oracleText: "At the beginning of each player's draw step, if this artifact is untapped, that player draws an additional card.",
  typeLine: "Artifact",
  manaCost: "{2}",
};

const drannith = {
  name: "Drannith Magistrate",
  oracleText: "Your opponents can't cast spells from anywhere other than their hands.",
  typeLine: "Creature — Human Wizard",
  manaCost: "{1}{W}",
};

test("stax occupancy opens on a tax commander", () => {
  const intent = intentFor(grandArbiter);
  assert.ok(intent.packageIds.includes("stax"));
  assert.ok(!intentFor(landfallTitan).packageIds.includes("stax"));
  assert.ok(!intentFor(equipmentSmith).packageIds.includes("stax"));
});

test("stax core is tax, restriction, and each-player sacrifice or discard — not group hug", () => {
  const intent = intentFor(grandArbiter);
  assert.equal(cardSatisfiesPackageCore(winterOrb, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(smokestack, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(bottomlessPit, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(howlingMine, "stax", intent), false);
  assert.equal(cardSatisfiesPackageSupport(howlingMine, "stax", intent), false);
  assert.equal(cardIsPackageFalseFriend(howlingMine, "stax", intent), false);
  assert.equal(cardSatisfiesPackageCore(drannith, "stax", intent), false);
  assert.equal(cardSatisfiesPackageSupport(drannith, "stax", intent), true);
});

test("a stax commander forges taxes, not Howling Mine as package core", () => {
  const wuSpells = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{U}", colorIdentity: ["W", "U"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const plains = Array.from({ length: 20 }, (_, i) => ({
    name: `Test Plains ${i}`,
    oracleText: "{T}: Add {W}.",
    typeLine: "Land — Plains",
    manaCost: "",
    colorIdentity: ["W"],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: grandArbiter,
    cards: [...wuSpells, winterOrb, ghostlyPrison, smokestack, howlingMine, drannith, ...plains],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(names.includes("Winter Orb") || names.includes("Ghostly Prison") || names.includes("Smokestack"), "a tax piece is an engine piece");
  assert.equal(cardSatisfiesPackageCore(winterOrb, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "stax", intent), true);
  assert.equal(cardSatisfiesPackageCore(howlingMine, "stax", intent), false);
  const mineRow = report.selected.rows.find((row) => row.name === "Howling Mine");
  if (mineRow) {
    assert.equal(cardSatisfiesPackageCore(mineRow, "stax", intent), false, "group hug must not occupy stax core");
  }
});
