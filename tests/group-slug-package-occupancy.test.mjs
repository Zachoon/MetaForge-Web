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
// Founder #030 (batch 3) — Group Slug
// =============================================================================
// Core is a symmetric multiplayer punisher keyed to an OPPONENT's own
// action — casting, tapping for mana, attacking — not your own spellcasting
// (that is #029's burn) and not an opponent's draw/discard specifically
// (that is #029's wheels / this batch's discard).
//
// False-friend shape: wrong-target-scope (reused). Guttersnipe is burn's own
// established core card: it mentions the same "deals damage to each
// opponent" punisher shape, but the trigger's SUBJECT is "you" (your own
// casting), not an opponent's/player's own action — a trigger-subject scope
// mismatch. Using burn's own core fixture as group_slug's false friend
// directly proves the two archetypes' promises don't overlap.
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

// Real card, verified via Scryfall (2026-08-19): Kaervek the Merciless —
// punishes an opponent's own casting, not the caster's.
const kaervek = {
  name: "Kaervek the Merciless",
  colors: ["B", "R"],
  oracleText: "Whenever an opponent casts a spell, Kaervek deals damage equal to that spell's mana value to any target.",
  typeLine: "Legendary Creature — Human Shaman",
  manaCost: "{5}{B}{R}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Manabarbs.
const manabarbs = {
  name: "Manabarbs",
  oracleText: "Whenever a player taps a land for mana, this enchantment deals 1 damage to that player.",
  typeLine: "Enchantment",
  manaCost: "{3}{R}",
};

// Real card, verified via Scryfall (2026-08-19): Guttersnipe — burn's own
// established core card. Its trigger is "whenever you cast", not an
// opponent's own action, so it does not belong to group_slug's promise.
const guttersnipe = {
  name: "Guttersnipe",
  oracleText: "Whenever you cast an instant or sorcery spell, this creature deals 2 damage to each opponent.",
  typeLine: "Creature — Goblin Shaman",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Ghostly Prison —
// pillow-fort support that makes the punisher plan viable without itself
// being a damage/life-loss trigger.
const ghostlyPrison = {
  name: "Ghostly Prison",
  oracleText: "Creatures can't attack you unless their controller pays {2} for each creature they control that's attacking you.",
  typeLine: "Enchantment",
  manaCost: "{2}{W}",
  colorIdentity: ["W"],
};

test("group_slug opens on a real opponent-triggered punisher commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(kaervek).packageIds.includes("group_slug"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("group_slug"));
});

test("group_slug opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a group slug punisher deck with symmetric damage" } });
  assert.ok(intent.packageIds.includes("group_slug"));
});

test("Guttersnipe opens burn but not group_slug, and Kaervek opens group_slug but not burn — disjoint triggers", () => {
  assert.ok(intentFor(guttersnipe).packageIds.includes("burn"));
  assert.ok(!intentFor(guttersnipe).packageIds.includes("group_slug"));
  assert.ok(intentFor(kaervek).packageIds.includes("group_slug"));
  assert.ok(!intentFor(kaervek).packageIds.includes("burn"));
});

test("group_slug core is a trigger keyed to an opponent's own action, not your own casting (wrong-target-scope)", () => {
  const intent = intentFor(kaervek);
  assert.equal(cardSatisfiesPackageCore(manabarbs, "group_slug", intent), true);
  assert.equal(cardSatisfiesPackageCore(guttersnipe, "group_slug", intent), false);
  assert.equal(cardIsPackageFalseFriend(guttersnipe, "group_slug", intent), true);
  assert.equal(cardIsPackageFalseFriend(manabarbs, "group_slug", intent), false);
});

test("group_slug support is pillow-fort enabling, not the punisher trigger itself", () => {
  const intent = intentFor(kaervek);
  assert.equal(cardSatisfiesPackageSupport(ghostlyPrison, "group_slug", intent), true);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "group_slug", intent), false);
  // The self-triggered burn trap is excluded from support too — it is a
  // false friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(guttersnipe, "group_slug", intent), false);
});

test("a real Kaervek-shaped commander forges the opponent-triggered punisher over an otherwise-identical self-triggered pinger", () => {
  const brFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const brLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Rakdos Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R"],
    producedMana: ["B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: kaervek,
    cards: [...brFiller, manabarbs, guttersnipe, ...brLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("group_slug"), "Kaervek's deck should carry the group_slug package");
  assert.ok(names.has("Manabarbs"), "the real opponent-triggered punisher should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(manabarbs, "group_slug", intent), true);
  assert.equal(cardSatisfiesPackageCore(guttersnipe, "group_slug", intent), false);
});
