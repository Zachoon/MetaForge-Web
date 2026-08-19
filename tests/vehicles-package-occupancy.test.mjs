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
// Founder #031 (batch 4) — Vehicles
// =============================================================================
// Core is a real Vehicle-specific payoff, deliberately distinct from
// #028's artifacts_matter (generic artifact-payoff). False-friend shape:
// broad-type-superset, reused DIRECTLY from artifacts_matter with
// typePattern /\bVehicle\b/i — one level deeper, since every Vehicle is
// already an Artifact. Cultivator's Caravan proves the trap recurs: its
// type line carries BOTH "Artifact" and "Vehicle", but it is a vanilla
// mana rock with zero payoff text for either archetype.
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

// Real card, verified via Scryfall (2026-08-19): Depala, Pilot Exemplar —
// the archetype's own canonical EDH Vehicles commander.
const depala = {
  name: "Depala, Pilot Exemplar",
  colors: ["R", "W"],
  oracleText: "Other Dwarves you control get +1/+1.\nEach Vehicle you control gets +1/+1 as long as it's a creature.\nWhenever Depala becomes tapped, you may pay {X}. If you do, reveal the top X cards of your library, put all Dwarf and Vehicle cards from among them into your hand, then put the rest on the bottom of your library in a random order.",
  typeLine: "Legendary Creature — Dwarf Pilot",
  manaCost: "{1}{R}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Edward Kenway — a real
// combat-damage payoff keyed to the Vehicle type specifically.
const edwardKenway = {
  name: "Edward Kenway",
  oracleText: "Whenever a Vehicle you control deals combat damage to a player, look at the top card of that player's library, then exile it face down. You may play that card for as long as it remains exiled.",
  typeLine: "Legendary Creature — Human Assassin Pirate",
  manaCost: "{2}{U}{B}",
  colorIdentity: ["U", "B"],
};

// Real card, verified via Scryfall (2026-08-19): Cultivator's Caravan — a
// vanilla mana-rock Vehicle. Type line carries BOTH "Artifact" and
// "Vehicle"; zero payoff text for either archetype.
const cultivatorsCaravan = {
  name: "Cultivator's Caravan",
  oracleText: "{T}: Add one mana of any color.\nCrew 3 (Tap any number of creatures you control with total power 3 or more: This Vehicle becomes an artifact creature until end of turn.)",
  typeLine: "Artifact — Vehicle",
  manaCost: "{3}",
  colorIdentity: [],
};

// Real card, verified via Scryfall (2026-08-19): Cid, Freeflier Pilot's own
// recursion clause — Vehicle-specific support.
const cidRecursion = {
  name: "Test Cid Recursion Fragment",
  oracleText: "{2}, {T}: Return target Equipment or Vehicle card from your graveyard to your hand.",
  typeLine: "Legendary Creature — Human Warrior Pilot",
  manaCost: "{1}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-18): artifacts_matter's own
// commander fixture (see tests/artifacts-matter-package-occupancy.test.mjs)
// — T'Challa, the Black Panther. No "Vehicle" text anywhere.
const tchalla = {
  name: "T'Challa, the Black Panther",
  colors: ["G", "W"],
  oracleText: "Whenever T'Challa enters or attacks, create a tapped Vibranium token. (It's an artifact with indestructible and \"{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.\")\nWhenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on T'Challa.",
  typeLine: "Legendary Creature — Human Noble Hero",
  manaCost: "{1}{G}{W}",
};

test("vehicles opens on a real Vehicle-payoff commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(depala).packageIds.includes("vehicles"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("vehicles"));
});

test("vehicles opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a vehicles deck built around crewing pilots" } });
  assert.ok(intent.packageIds.includes("vehicles"));
});

test("vehicles core is the Vehicle-specific payoff, not the type; a vanilla Vehicle is a broad-type-superset false friend", () => {
  const intent = intentFor(depala);
  assert.equal(cardSatisfiesPackageCore(edwardKenway, "vehicles", intent), true);
  assert.equal(cardSatisfiesPackageCore(cultivatorsCaravan, "vehicles", intent), false);
  assert.equal(cardIsPackageFalseFriend(cultivatorsCaravan, "vehicles", intent), true);
  assert.equal(cardIsPackageFalseFriend(edwardKenway, "vehicles", intent), false);
});

test("vehicles support is Vehicle-specific recursion, not raw type density", () => {
  const intent = intentFor(depala);
  assert.equal(cardSatisfiesPackageSupport(cidRecursion, "vehicles", intent), true);
  // A vanilla Vehicle is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(cultivatorsCaravan, "vehicles", intent), false);
});

test("vehicles and artifacts_matter are disjoint: a Vehicle-payoff commander and an artifact-payoff commander don't cross-open", () => {
  const depalaIntent = intentFor(depala);
  const tchallaIntent = intentFor(tchalla);
  assert.ok(depalaIntent.packageIds.includes("vehicles"));
  assert.ok(!depalaIntent.packageIds.includes("artifacts_matter"));
  assert.ok(tchallaIntent.packageIds.includes("artifacts_matter"));
  assert.ok(!tchallaIntent.packageIds.includes("vehicles"));
});

test("a real Depala-shaped commander forges the Vehicle payoff over an otherwise-identical vanilla Vehicle", () => {
  const rwFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rwDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Battlefield Forge ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {R} or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["R", "W"],
    producedMana: ["R", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const rwEdwardKenway = { ...edwardKenway, colorIdentity: ["R", "W"], manaCost: "{2}{R}{W}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: depala,
    cards: [...rwFiller, rwEdwardKenway, cultivatorsCaravan, ...rwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("vehicles"), "Depala's deck should carry the vehicles package");
  assert.ok(names.has("Edward Kenway"), "the real Vehicle payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(rwEdwardKenway, "vehicles", intent), true);
  assert.equal(cardSatisfiesPackageCore(cultivatorsCaravan, "vehicles", intent), false);
});
