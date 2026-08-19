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
// Founder #030 (batch 3) — Legends
// =============================================================================
// False-friend shape: broad-type-superset, reused from Founder #028's
// artifacts_matter/lands_matter (and #029's enchantress) with typePattern
// /\bLegendary\b/i. Rograkh, Son of Rohgahh is Legendary by type line but has
// zero legendary-matters text, the same mismatch as a vanilla Artifact.
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

// Real card, verified via Scryfall (2026-08-19): Sisay, Weatherlight
// Captain — a genuine "other legendary permanents you control" payoff plus
// her own legendary-tutor ability.
const sisay = {
  name: "Sisay, Weatherlight Captain",
  colors: ["W"],
  oracleText: "Sisay gets +1/+1 for each color among other legendary permanents you control.\n{W}{U}{B}{R}{G}: Search your library for a legendary permanent card with mana value less than Sisay's power, put that card onto the battlefield, then shuffle.",
  typeLine: "Legendary Creature — Human Soldier",
  manaCost: "{2}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Gimli of the Glittering
// Caves.
const gimli = {
  name: "Gimli of the Glittering Caves",
  oracleText: "Double strike\nWhenever another legendary creature you control enters, put a +1/+1 counter on Gimli.\nWhenever Gimli deals combat damage to a player, create a Treasure token.",
  typeLine: "Legendary Creature — Dwarf",
  manaCost: "{2}{R}{R}",
};

// Real card, verified via Scryfall (2026-08-19): Rograkh, Son of Rohgahh —
// Legendary by type line, zero legendary-matters payoff text.
const rograkh = {
  name: "Rograkh, Son of Rohgahh",
  oracleText: "First strike, menace, trample",
  typeLine: "Legendary Creature — Kobold Warrior",
  manaCost: "{0}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Loyal Retainers — real
// legendary-recursion support, not the payoff itself.
const loyalRetainers = {
  name: "Loyal Retainers",
  oracleText: "Sacrifice this creature: Return target legendary creature card from your graveyard to the battlefield. Activate only during your turn, before attackers are declared.",
  typeLine: "Creature — Human Cleric",
  manaCost: "{3}{W}",
  colorIdentity: ["W"],
};

test("legends opens on a real legendary-matters commander and stays closed on an unrelated legendary", () => {
  assert.ok(intentFor(sisay).packageIds.includes("legends"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("legends"));
});

test("legends opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a legendary tribal deck, legends matter" } });
  assert.ok(intent.packageIds.includes("legends"));
});

test("legends core is a real legendary-matters payoff, not merely being Legendary (broad-type-superset)", () => {
  const intent = intentFor(sisay);
  assert.equal(cardSatisfiesPackageCore(gimli, "legends", intent), true);
  assert.equal(cardSatisfiesPackageCore(rograkh, "legends", intent), false);
  assert.equal(cardIsPackageFalseFriend(rograkh, "legends", intent), true);
  assert.equal(cardIsPackageFalseFriend(gimli, "legends", intent), false);
});

test("legends support is recursion/anti-legend-rule enabling, not the payoff itself", () => {
  const intent = intentFor(sisay);
  assert.equal(cardSatisfiesPackageSupport(loyalRetainers, "legends", intent), true);
  assert.equal(cardSatisfiesPackageCore(loyalRetainers, "legends", intent), false);
  // The vanilla-legendary trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(rograkh, "legends", intent), false);
});

test("a real Sisay-shaped commander forges the legendary-matters payoff over an otherwise-identical vanilla legendary", () => {
  const wFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Plains Test ${i}`,
    oracleText: "({T}: Add {W}.)",
    typeLine: "Basic Land — Plains",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: sisay,
    cards: [...wFiller, gimli, rograkh, ...wLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("legends"), "Sisay's deck should carry the legends package");
  assert.ok(names.has("Gimli of the Glittering Caves"), "the real legendary-matters payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(gimli, "legends", intent), true);
  assert.equal(cardSatisfiesPackageCore(rograkh, "legends", intent), false);
});
