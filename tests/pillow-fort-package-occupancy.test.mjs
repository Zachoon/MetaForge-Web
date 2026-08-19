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
// Founder #032 (batch 5, final) — Pillow Fort
// =============================================================================
// Core is the defensive taxation/deterrence shape itself — "creatures can't
// attack you (or planeswalkers you control) unless their controller pays".
// This is the exact real-card shape #030's group_slug documents as its own
// SUPPORT (Ghostly Prison) and correctly rejects as group_slug CORE (Baird,
// Steward of Argive) — this entry captures that shape as its own real core
// identity. False-friend shape: wrong-target-scope, a hard-prevention-vs-
// taxation scope mismatch. Sandwurm Convergence mentions "can't attack you
// or planeswalkers you control" as broadly as any real pillow-fort card, but
// has no "unless ... pays" taxation clause at all.
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

// Real card, verified via Scryfall (2026-08-19): Baird, Steward of Argive —
// group_slug's own documented false friend / support-only fixture, and this
// entry's real commander.
const baird = {
  name: "Baird, Steward of Argive",
  oracleText: "Vigilance\nCreatures can't attack you or planeswalkers you control unless their controller pays {1} for each of those creatures.",
  typeLine: "Legendary Creature — Human Soldier",
  manaCost: "{2}{W}{W}",
  colorIdentity: ["W"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Ghostly Prison — the
// archetype's own namesake staple, and #030's group_slug's own documented
// SUPPORT fixture (a different real card legitimately occupying different
// roles in two different archetypes).
const ghostlyPrison = {
  name: "Ghostly Prison",
  oracleText: "Creatures can't attack you unless their controller pays {2} for each creature they control that's attacking you.",
  typeLine: "Enchantment",
  manaCost: "{2}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Sandwurm Convergence —
// mentions "can't attack you or planeswalkers you control" broadly, but is
// an absolute ban with no taxation clause; its real payoff is a 5/5 Wurm
// token engine, not the propaganda-tax promise.
const sandwurmConvergence = {
  name: "Sandwurm Convergence",
  oracleText: "Creatures with flying can't attack you or planeswalkers you control.\nAt the beginning of your end step, create a 5/5 green Wurm creature token.",
  typeLine: "Enchantment",
  manaCost: "{6}{G}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): group_slug's own commander
// fixture (see tests/group-slug-package-occupancy.test.mjs) — Kaervek the
// Merciless has no "attack"/"can't attack" text at all.
const kaervek = {
  name: "Kaervek the Merciless",
  oracleText: "Whenever an opponent casts a spell, Kaervek deals damage equal to that spell's mana value to any target.",
  typeLine: "Legendary Creature — Human Shaman",
  manaCost: "{5}{B}{R}",
  colorIdentity: ["B", "R"],
};

test("pillow_fort opens on a real taxation-defense commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(baird).packageIds.includes("pillow_fort"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("pillow_fort"));
});

test("pillow_fort opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a pillow fort propaganda deck" } });
  assert.ok(intent.packageIds.includes("pillow_fort"));
});

test("pillow_fort core is the taxation clause itself, not a hard prevention wall (wrong-target-scope)", () => {
  const intent = intentFor(baird);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "pillow_fort", intent), true);
  assert.equal(cardSatisfiesPackageCore(sandwurmConvergence, "pillow_fort", intent), false);
  assert.equal(cardIsPackageFalseFriend(sandwurmConvergence, "pillow_fort", intent), true);
  assert.equal(cardIsPackageFalseFriend(ghostlyPrison, "pillow_fort", intent), false);
});

test("pillow_fort support is a one-shot Fog effect, not the repeatable taxation payoff itself", () => {
  const intent = intentFor(baird);
  const fogCard = { name: "Test Fog Spell", oracleText: "Prevent all combat damage that would be dealt to you this turn.", typeLine: "Instant", manaCost: "{1}{W}" };
  assert.equal(cardSatisfiesPackageSupport(fogCard, "pillow_fort", intent), true);
  assert.equal(cardSatisfiesPackageCore(fogCard, "pillow_fort", intent), false);
  // The hard-prevention trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(sandwurmConvergence, "pillow_fort", intent), false);
});

test("pillow_fort and group_slug are disjoint: Baird (pillow_fort's real core) doesn't open group_slug, and Kaervek (group_slug's commander) doesn't open pillow_fort", () => {
  const bairdIntent = intentFor(baird);
  assert.ok(bairdIntent.packageIds.includes("pillow_fort"));
  assert.ok(!bairdIntent.packageIds.includes("group_slug"));

  const kaervekIntent = intentFor(kaervek);
  assert.ok(kaervekIntent.packageIds.includes("group_slug"));
  assert.ok(!kaervekIntent.packageIds.includes("pillow_fort"));
});

test("Ghostly Prison legitimately occupies two roles: SUPPORT for group_slug's punisher plan, CORE for pillow_fort's own promise", () => {
  const bairdIntent = intentFor(baird);
  const kaervekIntent = intentFor(kaervek);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "pillow_fort", bairdIntent), true);
  assert.equal(cardSatisfiesPackageSupport(ghostlyPrison, "group_slug", kaervekIntent), true);
  assert.equal(cardSatisfiesPackageCore(ghostlyPrison, "group_slug", kaervekIntent), false);
});

test("a real Baird-shaped commander forges the taxation payoff over an otherwise-identical hard-prevention trap", () => {
  const wFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Plains ${i}`,
    oracleText: "{T}: Add {W}.",
    typeLine: "Basic Land — Plains",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const wGhostlyPrison = { ...ghostlyPrison, colorIdentity: ["W"] };
  const wSandwurm = { ...sandwurmConvergence, colorIdentity: ["W"], oracleText: sandwurmConvergence.oracleText, manaCost: "{5}{W}{W}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: baird,
    cards: [...wFiller, wGhostlyPrison, wSandwurm, ...wDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("pillow_fort"), "Baird's deck should carry the pillow_fort package");
  assert.ok(names.has("Ghostly Prison"), "the real taxation payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wGhostlyPrison, "pillow_fort", intent), true);
  assert.equal(cardSatisfiesPackageCore(wSandwurm, "pillow_fort", intent), false);
});
