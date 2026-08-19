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
// Founder #029 (batch 2) — Wheels
// =============================================================================
// False-friend shape: wrong-target-scope, the same new shape mill needs (see
// app/archetype-catalog.mjs for the full justification). A personal loot/
// rummage spell mentions both discard and draw, exactly like a real wheel,
// but only ever touches the caster's own hand — card filtering, not the
// symmetric/opponent-punishing archetype.
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

// Real card, verified via Scryfall (2026-08-19): Nekusar, the Mindrazer.
const nekusar = {
  name: "Nekusar, the Mindrazer",
  colors: ["U", "B", "R"],
  oracleText: "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar deals 1 damage to that player.",
  typeLine: "Legendary Creature — Zombie Wizard",
  manaCost: "{2}{U}{B}{R}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Wheel of Fortune.
const wheelOfFortune = {
  name: "Wheel of Fortune",
  oracleText: "Each player discards their hand, then draws seven cards.",
  typeLine: "Sorcery",
  manaCost: "{2}{R}",
};

// Real card, verified via Scryfall (2026-08-19): Cathartic Reunion. Only
// ever touches the caster's own hand — not a symmetric wheel or an
// opponent-facing punisher.
const catharticReunion = {
  name: "Cathartic Reunion",
  oracleText: "As an additional cost to cast this spell, discard two cards.\nDraw three cards.",
  typeLine: "Sorcery",
  manaCost: "{1}{R}",
};

// Real card, verified via Scryfall (2026-08-19): Glint-Horn Buccaneer — a
// genuine payoff for discarding, but not itself a wheel.
const glintHornBuccaneer = {
  name: "Glint-Horn Buccaneer",
  oracleText: "Haste\nWhenever you discard a card, this creature deals 1 damage to each opponent.\n{1}{R}, Discard a card: Draw a card. Activate only if this creature is attacking.",
  typeLine: "Creature — Minotaur Pirate",
  manaCost: "{1}{R}{R}",
};

test("wheels opens on a real symmetric-wheel/punisher commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(nekusar).packageIds.includes("wheels"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("wheels"));
});

test("wheels opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a wheels deck full of punisher effects" } });
  assert.ok(intent.packageIds.includes("wheels"));
});

test("wheels core is a symmetric or opponent-facing hand-refill effect, not a personal loot spell (wrong-target-scope)", () => {
  const intent = intentFor(nekusar);
  assert.equal(cardSatisfiesPackageCore(wheelOfFortune, "wheels", intent), true);
  assert.equal(cardSatisfiesPackageCore(catharticReunion, "wheels", intent), false);
  assert.equal(cardIsPackageFalseFriend(catharticReunion, "wheels", intent), true);
  assert.equal(cardIsPackageFalseFriend(wheelOfFortune, "wheels", intent), false);
});

test("wheels support is a discard-matters payoff, not the wheel effect itself", () => {
  const intent = intentFor(nekusar);
  assert.equal(cardSatisfiesPackageSupport(glintHornBuccaneer, "wheels", intent), true);
  assert.equal(cardSatisfiesPackageCore(glintHornBuccaneer, "wheels", intent), false);
  // The personal-loot trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(catharticReunion, "wheels", intent), false);
});

test("a real Nekusar-shaped commander forges the symmetric wheel payoff over an otherwise-identical personal loot trap", () => {
  const grixisFiller = [
    ...Array.from({ length: 26 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{U}{B}", colorIdentity: ["U", "B"] })),
    ...Array.from({ length: 22 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This spell deals 3 damage to any target.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 16 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const grixisLands = Array.from({ length: 20 }, (_, i) => ({
    name: `Rainbow Vista ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add one mana of any color.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["U", "B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: nekusar,
    cards: [...grixisFiller, wheelOfFortune, catharticReunion, ...grixisLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("wheels"), "Nekusar's deck should carry the wheels package");
  assert.ok(names.has("Wheel of Fortune"), "the real symmetric wheel payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wheelOfFortune, "wheels", intent), true);
  assert.equal(cardSatisfiesPackageCore(catharticReunion, "wheels", intent), false);
});
