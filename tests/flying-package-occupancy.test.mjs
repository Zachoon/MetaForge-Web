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
// Founder #030 (batch 3) — Flying
// =============================================================================
// False-friend shape: wrong-target-scope (reused). Serra Angel mentions
// flying broadly (it has the keyword), but the effect never reaches a
// reward clause tying flying to a payoff — a keyword-vs-payoff scope
// mismatch, distinct from mill/wheels' player-scope mismatch and clones'
// object-type mismatch.
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

// Real card, verified via Scryfall (2026-08-19): Sephara, Sky's Blade — a
// real flying-matters payoff commander (rewards flying, not merely having it).
const sephara = {
  name: "Sephara, Sky's Blade",
  colors: ["W"],
  oracleText: "You may pay {W} and tap four untapped creatures you control with flying rather than pay this spell's mana cost.\nFlying, lifelink\nOther creatures you control with flying have indestructible. (Damage and effects that say \"destroy\" don't destroy them.)",
  typeLine: "Legendary Creature — Angel",
  manaCost: "{4}{W}{W}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Favorable Winds.
const favorableWinds = {
  name: "Favorable Winds",
  oracleText: "Creatures you control with flying get +1/+1.",
  typeLine: "Enchantment",
  manaCost: "{1}{U}",
};

// Real card, verified via Scryfall (2026-08-19): Serra Angel — has the
// Flying keyword itself, no flying-matters payoff.
const serraAngel = {
  name: "Serra Angel",
  oracleText: "Flying\nVigilance",
  typeLine: "Creature — Angel",
  manaCost: "{3}{W}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Starry-Eyed Skyrider —
// grants flying temporarily, an enabler rather than the payoff.
const starryEyedSkyrider = {
  name: "Starry-Eyed Skyrider",
  oracleText: "Flying\nWhenever this creature attacks, another target creature you control gains flying until end of turn.\nAttacking tokens you control have flying.",
  typeLine: "Creature — Bird Warrior",
  manaCost: "{3}{W}",
  colorIdentity: ["W"],
};

test("flying opens on a real flying-matters commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(sephara).packageIds.includes("flying"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("flying"));
});

test("flying opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a flying tribal deck, flying matters" } });
  assert.ok(intent.packageIds.includes("flying"));
});

test("flying core is a real flying-payoff, not merely having the Flying keyword (wrong-target-scope)", () => {
  const intent = intentFor(sephara);
  assert.equal(cardSatisfiesPackageCore(favorableWinds, "flying", intent), true);
  assert.equal(cardSatisfiesPackageCore(serraAngel, "flying", intent), false);
  assert.equal(cardIsPackageFalseFriend(serraAngel, "flying", intent), true);
  assert.equal(cardIsPackageFalseFriend(favorableWinds, "flying", intent), false);
});

test("flying support is granting flying temporarily, not rewarding it", () => {
  const intent = intentFor(sephara);
  assert.equal(cardSatisfiesPackageSupport(starryEyedSkyrider, "flying", intent), true);
  assert.equal(cardSatisfiesPackageCore(starryEyedSkyrider, "flying", intent), false);
  // The vanilla-flier trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(serraAngel, "flying", intent), false);
});

test("a real Sephara-shaped commander forges the flying-payoff over an otherwise-identical vanilla flier", () => {
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
    commander: sephara,
    cards: [...wFiller, favorableWinds, serraAngel, ...wLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("flying"), "Sephara's deck should carry the flying package");
  assert.ok(names.has("Favorable Winds"), "the real flying-payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(favorableWinds, "flying", intent), true);
  assert.equal(cardSatisfiesPackageCore(serraAngel, "flying", intent), false);
});
