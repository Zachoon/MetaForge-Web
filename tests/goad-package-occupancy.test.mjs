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
// Founder #031 (batch 4) — Forced Combat / Goad
// =============================================================================
// Core is the Goad keyword/mechanic itself. False-friend shape:
// wrong-target-scope, the same mention-vs-count-reward mismatch
// superfriends needs. Serene Sleuth mentions "goaded" as broadly as any
// real goad card, but never itself applies goad — it only counts and then
// removes existing goaded status as a rider on an unrelated card-advantage
// engine.
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

// Real card, verified via Scryfall (2026-08-19): Marisi, Breaker of the
// Coil — the textbook, most-recognized real EDH goad commander.
const marisi = {
  name: "Marisi, Breaker of the Coil",
  colors: ["G", "R", "W"],
  oracleText: "Your opponents can't cast spells during combat.\nWhenever a creature you control deals combat damage to a player, goad each creature that player controls.",
  typeLine: "Legendary Creature — Cat Warrior",
  manaCost: "{1}{R}{G}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Alela, Cunning Conqueror —
// a second real fixture using a different real corePattern phrasing.
const alela = {
  name: "Alela, Cunning Conqueror",
  oracleText: "Flying\nWhenever one or more Faeries you control deal combat damage to a player, goad target creature that player controls.",
  typeLine: "Legendary Creature — Faerie Warlock",
  manaCost: "{1}{W}{U}{B}",
  colorIdentity: ["W", "U", "B"],
};

// Real card, verified via Scryfall (2026-08-19): Serene Sleuth — mentions
// "goaded" broadly but never applies goad; it only counts and removes it
// as a rider on an unrelated investigate engine.
const sereneSleuth = {
  name: "Serene Sleuth",
  oracleText: "When this creature enters, investigate.\nAt the beginning of combat on your turn, investigate for each goaded creature you control. Then each creature you control is no longer goaded.",
  typeLine: "Creature — Human Detective",
  manaCost: "{1}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Kardur, Doomscourge's own
// second ability — a byproduct-of-goad reward, real support without
// applying goad itself. (Kardur's first ability is goad's own effect,
// predating the Ixalan keyword — used here only for its second clause.)
const kardurSupport = {
  name: "Test Kardur Payoff Fragment",
  oracleText: "Whenever an attacking creature dies, each opponent loses 1 life and you gain 1 life.",
  typeLine: "Legendary Creature — Demon Berserker",
  manaCost: "{2}{B}{R}",
  colorIdentity: ["B", "R"],
};

test("goad opens on a real goad commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(marisi).packageIds.includes("goad"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("goad"));
});

test("goad opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a goad deck that forces opponents to attack each other" } });
  assert.ok(intent.packageIds.includes("goad"));
});

test("goad core is applying goad, not merely mentioning goaded status (wrong-target-scope)", () => {
  const intent = intentFor(marisi);
  assert.equal(cardSatisfiesPackageCore(alela, "goad", intent), true);
  assert.equal(cardSatisfiesPackageCore(sereneSleuth, "goad", intent), false);
  assert.equal(cardIsPackageFalseFriend(sereneSleuth, "goad", intent), true);
  assert.equal(cardIsPackageFalseFriend(alela, "goad", intent), false);
});

test("goad support is a byproduct-of-goad payoff, not the goad application itself", () => {
  const intent = intentFor(marisi);
  assert.equal(cardSatisfiesPackageSupport(kardurSupport, "goad", intent), true);
  assert.equal(cardSatisfiesPackageCore(kardurSupport, "goad", intent), false);
  // The count-and-remove trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(sereneSleuth, "goad", intent), false);
});

test("a real Marisi-shaped commander forges the goad payoff over an otherwise-identical count-and-remove trap", () => {
  const grwFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const grwLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Naya Triome ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {R}, {G}, or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["R", "G", "W"],
    producedMana: ["R", "G", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const grwAlela = { ...alela, colorIdentity: ["G", "R", "W"], manaCost: "{1}{G}{R}{W}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: marisi,
    cards: [...grwFiller, grwAlela, sereneSleuth, ...grwLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("goad"), "Marisi's deck should carry the goad package");
  assert.ok(names.has("Alela, Cunning Conqueror"), "the real goad payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(grwAlela, "goad", intent), true);
  assert.equal(cardSatisfiesPackageCore(sereneSleuth, "goad", intent), false);
});
