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
// Founder #033 (batch 6) — Devotion
// =============================================================================
// Core is a real devotion-COUNT payoff — a stat or scaling effect that reads
// your devotion to a color as its own X. False-friend shape:
// wrong-target-scope, a gating-clause-vs-scaling-reward mismatch. Every
// Theros god shares the identical "As long as your devotion to [color] is
// less than five, ~ isn't a creature." templating — Purphoros, God of the
// Forge mentions "devotion to red" as broadly as any real payoff card, but
// that clause is purely a creature/noncreature status toggle, and his own
// actual value engine has nothing to do with devotion count at all.
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

// Real card, verified via Scryfall (2026-08-19): Anax, Hardened in the
// Forge — a real legendary-creature commander whose own power is a direct
// devotion-count payoff.
const anax = {
  name: "Anax, Hardened in the Forge",
  oracleText: "Anax's power is equal to your devotion to red. (Each {R} in the mana costs of permanents you control counts toward your devotion to red.)\nWhenever Anax or another nontoken creature you control dies, create a 1/1 red Satyr creature token with \"This token can't block.\" If the creature had power 4 or greater, create two of those tokens instead.",
  typeLine: "Legendary Enchantment Creature — Demigod",
  manaCost: "{1}{R}{R}",
  colorIdentity: ["R"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Gray Merchant of
// Asphodel — a second independent real devotion-payoff fixture.
const grayMerchant = {
  name: "Gray Merchant of Asphodel",
  oracleText: "When this creature enters, each opponent loses X life, where X is your devotion to black. You gain life equal to the life lost this way.",
  typeLine: "Creature — Zombie",
  manaCost: "{3}{B}{B}",
  colorIdentity: ["B"],
};

// Real card, verified via Scryfall (2026-08-19): Purphoros, God of the
// Forge — the entire Theros god cycle shares this exact "isn't a creature"
// gating clause, a real false friend for a devotion-COUNT payoff archetype.
const purphoros = {
  name: "Purphoros, God of the Forge",
  oracleText: "Indestructible\nAs long as your devotion to red is less than five, Purphoros isn't a creature.\nWhenever another creature you control enters, Purphoros deals 2 damage to each opponent.\n{2}{R}: Creatures you control get +1/+0 until end of turn.",
  typeLine: "Legendary Enchantment Creature — God",
  manaCost: "{3}{R}",
  colorIdentity: ["R"],
};

test("devotion opens on a real Devotion commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(anax).packageIds.includes("devotion"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("devotion"));
});

test("devotion opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a devotion theros gods deck" } });
  assert.ok(intent.packageIds.includes("devotion"));
});

test("devotion core is the scaling-reward construction, not the bare gating clause every Theros god shares (wrong-target-scope)", () => {
  const intent = intentFor(anax);
  assert.equal(cardSatisfiesPackageCore(grayMerchant, "devotion", intent), true);
  assert.equal(cardSatisfiesPackageCore(purphoros, "devotion", intent), false);
  assert.equal(cardIsPackageFalseFriend(purphoros, "devotion", intent), true);
  assert.equal(cardIsPackageFalseFriend(grayMerchant, "devotion", intent), false);
});

test("devotion support is a devotion-count amplifier, not the scaling payoff itself", () => {
  const intent = intentFor(anax);
  const altarOfPantheon = { name: "Test Devotion Amplifier Fragment", oracleText: "Your devotion to each color and each combination of colors is increased by one.", typeLine: "Artifact", manaCost: "{3}" };
  assert.equal(cardSatisfiesPackageSupport(altarOfPantheon, "devotion", intent), true);
  assert.equal(cardSatisfiesPackageCore(altarOfPantheon, "devotion", intent), false);
  // The devotion amplifier is real support, not a false friend — a genuine
  // enabler occupies the archetype at the support density level, not zero.
  assert.equal(cardIsPackageFalseFriend(altarOfPantheon, "devotion", intent), false);
  // The isCreature-gating trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(purphoros, "devotion", intent), false);
});

test("a real Anax-shaped commander forges the real devotion-count payoff over an otherwise-identical gating-clause trap", () => {
  const rFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Deals 3 damage to target creature.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Mountain ${i}`,
    oracleText: "{T}: Add {R}.",
    typeLine: "Basic Land — Mountain",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["R"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const rGrayMerchant = { ...grayMerchant, colorIdentity: ["R"], manaCost: "{3}{R}{R}" };
  const rPurphoros = { ...purphoros, colorIdentity: ["R"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: anax,
    cards: [...rFiller, rGrayMerchant, rPurphoros, ...rDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("devotion"), "Anax's deck should carry the devotion package");
  assert.ok(names.has("Gray Merchant of Asphodel"), "the real devotion-count payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(rGrayMerchant, "devotion", intent), true);
  assert.equal(cardSatisfiesPackageCore(rPurphoros, "devotion", intent), false);
});
