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
// Founder #029 (batch 2) — Burn
// =============================================================================
// False-friend shape: incidental-rider, reused from Founder #028's counters_
// matter with burn-specific config. A removal spell whose dominant effect is
// destroying/exiling a creature and which deals a minor, gated amount of
// damage to a player as a rider is not core, even though the oracle text
// technically contains "deals N damage".
//
// A creature-only damage spell (Flame Slash: "deals 4 damage to target
// creature") is neither core nor a false friend here — corePatterns already
// require the damage to reach a player/opponent, so a creature-only removal
// spell simply never matches core in the first place; no shape is needed to
// exclude what never qualified.
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

// Real card, verified via Scryfall (2026-08-19): Torbran, Thane of Red Fell.
const torbran = {
  name: "Torbran, Thane of Red Fell",
  colors: ["R"],
  oracleText: "If a red source you control would deal damage to an opponent or a permanent an opponent controls, it deals that much damage plus 2 instead.",
  typeLine: "Legendary Creature — Dwarf Noble",
  manaCost: "{1}{R}{R}{R}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Lightning Bolt — a direct
// burn spell that hits a player is core, not merely support, the same way a
// real burn deck's power comes as much from its burn spells as its payoffs.
const lightningBolt = {
  name: "Lightning Bolt",
  oracleText: "Lightning Bolt deals 3 damage to any target.",
  typeLine: "Instant",
  manaCost: "{R}",
};

// Real card, verified via Scryfall (2026-08-19): Flame Slash — deals damage
// only to a creature, never to a player. Not core, and not a false friend
// either (see file header): corePatterns simply never match it.
const flameSlash = {
  name: "Flame Slash",
  oracleText: "Flame Slash deals 4 damage to target creature.",
  typeLine: "Sorcery",
  manaCost: "{R}",
};

// Real card, verified via Scryfall (2026-08-19): Unlicensed Disintegration.
// Recolored to mono-red ({2}{R}) to fit the construction pool below —
// oracle text is unchanged. Its dominant effect is creature removal; the
// damage-to-player clause is a minor rider gated behind an artifact-count
// condition unrelated to burn.
const unlicensedDisintegration = {
  name: "Unlicensed Disintegration",
  oracleText: "Destroy target creature. If you control an artifact, Unlicensed Disintegration deals 3 damage to that creature's controller.",
  typeLine: "Instant",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

test("burn opens on a real damage-amplifier commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(torbran).packageIds.includes("burn"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("burn"));
});

test("burn opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a burn deck full of pingers and damage doublers" } });
  assert.ok(intent.packageIds.includes("burn"));
});

test("burn core is direct damage aimed at a player, not an incidentally-gated removal-spell rider", () => {
  const intent = intentFor(torbran);
  assert.equal(cardSatisfiesPackageCore(lightningBolt, "burn", intent), true);
  assert.equal(cardSatisfiesPackageCore(unlicensedDisintegration, "burn", intent), false);
  assert.equal(cardIsPackageFalseFriend(unlicensedDisintegration, "burn", intent), true);
  assert.equal(cardIsPackageFalseFriend(lightningBolt, "burn", intent), false);
  // Creature-only damage is simply out of scope — not core, not a flagged
  // false friend either.
  assert.equal(cardSatisfiesPackageCore(flameSlash, "burn", intent), false);
  assert.equal(cardIsPackageFalseFriend(flameSlash, "burn", intent), false);
});

test("burn support is spell-cost enablers, not the damage payoff itself", () => {
  const intent = intentFor(torbran);
  const costReducer = { name: "Test Firebrand Archivist", oracleText: "Instant or sorcery spells you cast cost {1} less to cast.", typeLine: "Creature — Human Shaman", manaCost: "{2}{R}" };
  assert.equal(cardSatisfiesPackageSupport(costReducer, "burn", intent), true);
  assert.equal(cardSatisfiesPackageCore(costReducer, "burn", intent), false);
  // The rider trap is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(unlicensedDisintegration, "burn", intent), false);
});

test("a real Torbran-shaped commander forges the direct-damage payoff over an otherwise-identical rider trap", () => {
  const rFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Mountain Test ${i}`,
    oracleText: "({T}: Add {R}.)",
    typeLine: "Basic Land — Mountain",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: torbran,
    cards: [...rFiller, lightningBolt, unlicensedDisintegration, ...rLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("burn"), "Torbran's deck should carry the burn package");
  assert.ok(names.has("Lightning Bolt"), "the real direct-damage payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(lightningBolt, "burn", intent), true);
  assert.equal(cardSatisfiesPackageCore(unlicensedDisintegration, "burn", intent), false);
});
