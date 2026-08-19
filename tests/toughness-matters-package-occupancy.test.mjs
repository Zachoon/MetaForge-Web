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
// Founder #032 (batch 5, final) — Toughness Matters
// =============================================================================
// Core is a real payoff scaling off a creature's toughness specifically —
// deliberately distinct from #028's generic counters_matter (+1/+1-counter-
// shaped, not stat-shaped). False-friend shape: incidental-rider, reused as
// -is (no type-line concept applies to a stat, and this is not a player-
// scope mismatch). Blood Lust mentions "toughness" as a magnitude-gate
// condition and even contains the literal substring this entry's own
// corePatterns look for, but its dominant effect is an unrelated combat-
// trick/removal pump.
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

// Real card, verified via Scryfall (2026-08-19): Doran, the Siege Tower —
// the archetype's own iconic, namesake EDH Toughness Matters commander.
const doran = {
  name: "Doran, the Siege Tower",
  oracleText: "Each creature assigns combat damage equal to its toughness rather than its power.",
  typeLine: "Legendary Creature — Treefolk Shaman",
  manaCost: "{W}{B}{G}",
  colorIdentity: ["W", "B", "G"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Plagon, Lord of the Beach —
// a toughness-greater-than-power draw payoff using a different real
// corePattern.
const plagon = {
  name: "Plagon, Lord of the Beach",
  oracleText: "When Plagon enters, draw a card for each creature you control with toughness greater than its power.\n{W/U}: Target creature you control assigns combat damage equal to its toughness rather than its power this turn.",
  typeLine: "Legendary Creature — Starfish Wizard",
  manaCost: "{2}{U}",
  colorIdentity: ["U", "W"],
};

// Real card, verified via Scryfall (2026-08-19): Blood Lust — mentions
// "toughness" as a magnitude-gate condition on an unrelated combat-trick
// pump, not a toughness-matters payoff.
const bloodLust = {
  name: "Blood Lust",
  oracleText: "If target creature has toughness 5 or greater, it gets +4/-4 until end of turn. Otherwise, it gets +4/-X until end of turn, where X is its toughness minus 1.",
  typeLine: "Instant",
  manaCost: "{1}{R}",
  colorIdentity: ["R"],
};

test("toughness_matters opens on a real toughness-payoff commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(doran).packageIds.includes("toughness_matters"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("toughness_matters"));
});

test("toughness_matters opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a toughness matters walls deck" } });
  assert.ok(intent.packageIds.includes("toughness_matters"));
});

test("toughness_matters core is the real payoff, not a magnitude-gated combat-trick rider (incidental-rider)", () => {
  const intent = intentFor(doran);
  assert.equal(cardSatisfiesPackageCore(plagon, "toughness_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(bloodLust, "toughness_matters", intent), false);
  assert.equal(cardIsPackageFalseFriend(bloodLust, "toughness_matters", intent), true);
  assert.equal(cardIsPackageFalseFriend(plagon, "toughness_matters", intent), false);
});

test("toughness_matters support is a defender-attack enabler, not the payoff itself", () => {
  const intent = intentFor(doran);
  const defenderEnabler = { name: "Test Defender Enabler", oracleText: "Creatures you control can attack as though they didn't have defender.", typeLine: "Enchantment", manaCost: "{2}{G}" };
  assert.equal(cardSatisfiesPackageSupport(defenderEnabler, "toughness_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(defenderEnabler, "toughness_matters", intent), false);
  // The magnitude-gated combat-trick trap is excluded from support too — it
  // is a false friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(bloodLust, "toughness_matters", intent), false);
});

test("toughness_matters and counters_matter are disjoint: a toughness commander doesn't cross-open the +1/+1-counter package", () => {
  const doranIntent = intentFor(doran);
  assert.ok(doranIntent.packageIds.includes("toughness_matters"));
  assert.ok(!doranIntent.packageIds.includes("counters_matter"));
});

test("a real Doran-shaped commander forges the toughness payoff over an otherwise-identical magnitude-gated combat trick", () => {
  const wbgFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wbgDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Godless Shrine ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const wbgPlagon = { ...plagon, colorIdentity: ["W", "B", "G"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: doran,
    cards: [...wbgFiller, wbgPlagon, bloodLust, ...wbgDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("toughness_matters"), "Doran's deck should carry the toughness_matters package");
  assert.ok(names.has("Plagon, Lord of the Beach"), "the real toughness payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wbgPlagon, "toughness_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(bloodLust, "toughness_matters", intent), false);
});
