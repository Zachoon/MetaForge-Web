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

// =============================================================================
// Founder #028 (proof of concept) — Group Hug
// =============================================================================
// False-friend shape: excluded-by-tag. A card that superficially reads "each
// player" / "each opponent may" but is also already tagged stax_piece or
// asymmetric_stax by strategic-intent.mjs's own strategicSemanticsFor is a
// tax dressed as generosity, not real group hug — reuses that existing tag
// vocabulary rather than inventing a new one.
// =============================================================================

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

// Real card, verified via Scryfall (2026-08-18): Kynaios and Tiro of Meletis.
const kynaiosAndTiro = {
  name: "Kynaios and Tiro of Meletis",
  colors: ["G", "R", "U", "W"],
  oracleText: "At the beginning of your end step, draw a card. Each player may put a land card from their hand onto the battlefield, then each opponent who didn't draws a card.",
  typeLine: "Legendary Creature — Human Soldier",
  manaCost: "{R}{G}{W}{U}",
};

// Real card, verified via Scryfall (2026-08-18): Phelddagrif. Its generosity
// is single-target ("target opponent"), not symmetric "each player" — support
// occupancy, not core.
const phelddagrif = {
  name: "Phelddagrif",
  colors: ["G", "U", "W"],
  oracleText: "{G}: Phelddagrif gains trample until end of turn. Target opponent creates a 1/1 green Hippo creature token.\n{W}: Phelddagrif gains flying until end of turn. Target opponent gains 2 life.\n{U}: Return Phelddagrif to its owner's hand. Target opponent may draw a card.",
  typeLine: "Legendary Creature — Phelddagrif",
  manaCost: "{1}{G}{W}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

const bountifulTable = {
  name: "Bountiful Table",
  oracleText: "At the beginning of each player's upkeep, that player draws a card.",
  typeLine: "Enchantment",
  manaCost: "{2}{W}{W}",
};

// A tax dressed as generosity: superficially "each opponent may", but the
// same sentence's "unless their controller pays" clause is exactly the
// stax_piece pattern strategicSemanticsFor already computes.
const feignedLargesse = {
  name: "Feigned Largesse",
  oracleText: "Each opponent may put a land card from their hand onto the battlefield. Lands put onto the battlefield this way enter tapped unless their controller pays {2}.",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
};

test("group_hug opens on a real each-player-benefits commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(kynaiosAndTiro).packageIds.includes("group_hug"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("group_hug"));
});

test("group_hug opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want to build a group hug deck that makes friends" } });
  assert.ok(intent.packageIds.includes("group_hug"));
});

test("group_hug core is real symmetric generosity; a tax dressed as generosity is an excluded-by-tag false friend", () => {
  const intent = intentFor(kynaiosAndTiro);
  assert.equal(cardSatisfiesPackageCore(bountifulTable, "group_hug", intent), true);
  assert.equal(cardSatisfiesPackageCore(feignedLargesse, "group_hug", intent), false);
  assert.equal(cardIsPackageFalseFriend(feignedLargesse, "group_hug", intent), true);
  assert.equal(cardIsPackageFalseFriend(bountifulTable, "group_hug", intent), false);
});

test("group_hug support is single-target generosity (Phelddagrif-class), not each-player core", () => {
  const intent = intentFor(kynaiosAndTiro);
  assert.equal(cardSatisfiesPackageSupport(phelddagrif, "group_hug", intent), true);
  assert.equal(cardSatisfiesPackageCore(phelddagrif, "group_hug", intent), false);
  // The tax trap is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(feignedLargesse, "group_hug", intent), false);
});

test("a real Kynaios-and-Tiro-shaped commander forges the hug payoff over an otherwise-identical tax trap", () => {
  const hugFiller = [
    ...Array.from({ length: 20 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This spell deals 3 damage to any target.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Draw ${i}`, oracleText: "Draw two cards.", typeLine: "Sorcery", manaCost: "{2}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const hugLands = Array.from({ length: 22 }, (_, i) => ({
    name: `Rainbow Vista ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W", "U", "B", "R", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: kynaiosAndTiro,
    cards: [...hugFiller, bountifulTable, feignedLargesse, ...hugLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("group_hug"), "Kynaios and Tiro's deck should carry the group_hug package");
  assert.ok(names.has("Bountiful Table"), "the real each-player payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(bountifulTable, "group_hug", intent), true);
  assert.equal(cardSatisfiesPackageCore(feignedLargesse, "group_hug", intent), false);
});
