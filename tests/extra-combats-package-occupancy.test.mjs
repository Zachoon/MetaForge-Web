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
// Founder #031 (batch 4) — Extra Combats
// =============================================================================
// Core is a real granted additional combat phase — WotC's fixed templating
// for this effect is a single phrase across every printing. False-friend
// shape: wrong-target-scope, the same grant-vs-negate POLARITY mismatch
// infect needs. Stonehorn Dignitary mentions "combat phase" as broadly as
// any real extra-combat card, but denies one from an opponent instead of
// granting one to you.
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

// Real card, verified via Scryfall (2026-08-19): Aurelia, the Warleader —
// the archetype's own namesake extra-combats commander.
const aurelia = {
  name: "Aurelia, the Warleader",
  colors: ["R", "W"],
  oracleText: "Flying, vigilance, haste\nWhenever Aurelia attacks for the first time each turn, untap all creatures you control. After this phase, there is an additional combat phase.",
  typeLine: "Legendary Creature — Angel",
  manaCost: "{2}{R}{R}{W}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Relentless Assault — a
// second real fixture using the identical fixed templating.
const relentlessAssault = {
  name: "Relentless Assault",
  oracleText: "Untap all creatures that attacked this turn. After this main phase, there is an additional combat phase followed by an additional main phase.",
  typeLine: "Sorcery",
  manaCost: "{2}{R}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Stonehorn Dignitary — the
// polarity opposite. Mentions "combat phase" but DENIES one from an
// opponent, a real pillow-fort/blink staple.
const stonehornDignitary = {
  name: "Stonehorn Dignitary",
  oracleText: "When this creature enters, target opponent skips their next combat phase.",
  typeLine: "Creature — Rhino Soldier",
  manaCost: "{3}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Fervor — lets creatures
// actually attack in a granted second combat without granting it itself.
const fervor = {
  name: "Fervor",
  oracleText: "Creatures you control have haste.",
  typeLine: "Enchantment",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

test("extra_combats opens on a real extra-combat commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(aurelia).packageIds.includes("extra_combats"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("extra_combats"));
});

test("extra_combats opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an extra combats deck with additional combat phases" } });
  assert.ok(intent.packageIds.includes("extra_combats"));
});

test("extra_combats core is a granted additional combat phase, not merely mentioning one (wrong-target-scope)", () => {
  const intent = intentFor(aurelia);
  assert.equal(cardSatisfiesPackageCore(relentlessAssault, "extra_combats", intent), true);
  assert.equal(cardSatisfiesPackageCore(stonehornDignitary, "extra_combats", intent), false);
  assert.equal(cardIsPackageFalseFriend(stonehornDignitary, "extra_combats", intent), true);
  assert.equal(cardIsPackageFalseFriend(relentlessAssault, "extra_combats", intent), false);
});

test("extra_combats support is haste, not the granted phase itself", () => {
  const intent = intentFor(aurelia);
  assert.equal(cardSatisfiesPackageSupport(fervor, "extra_combats", intent), true);
  assert.equal(cardSatisfiesPackageCore(fervor, "extra_combats", intent), false);
  // The combat-denial trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(stonehornDignitary, "extra_combats", intent), false);
});

test("a real Aurelia-shaped commander forges the extra-combat payoff over an otherwise-identical combat-denial trap", () => {
  const rwFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
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
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: aurelia,
    cards: [...rwFiller, relentlessAssault, stonehornDignitary, ...rwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("extra_combats"), "Aurelia's deck should carry the extra_combats package");
  assert.ok(names.has("Relentless Assault"), "the real extra-combat payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(relentlessAssault, "extra_combats", intent), true);
  assert.equal(cardSatisfiesPackageCore(stonehornDignitary, "extra_combats", intent), false);
});
