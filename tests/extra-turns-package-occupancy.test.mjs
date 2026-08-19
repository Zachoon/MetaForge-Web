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
// Founder #032 (batch 5, final) — Extra Turns
// =============================================================================
// Core is a real granted extra turn, deliberately distinct from #031's
// extra_combats (extra COMBAT PHASES within a turn, not extra turns).
// False-friend shape: wrong-target-scope, the same grant-vs-negate POLARITY
// mismatch #031's infect/extra_combats already established. Stranglehold
// mentions "extra turn" as broadly as any real grant, but denies one rather
// than granting it.
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

// Real card, verified via Scryfall (2026-08-19): Medomai the Ageless — a
// real legendary-creature commander whose own trigger grants a real extra
// turn.
const medomai = {
  name: "Medomai the Ageless",
  oracleText: "Flying\nWhenever Medomai deals combat damage to a player, take an extra turn after this one.\nMedomai can't attack during extra turns.",
  typeLine: "Legendary Creature — Sphinx",
  manaCost: "{4}{U}{U}",
  colorIdentity: ["U"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Time Stretch — a real
// extra-turn grant using the "two extra turns" template variant.
const timeStretch = {
  name: "Time Stretch",
  oracleText: "Target player takes two extra turns after this one.",
  typeLine: "Sorcery",
  manaCost: "{5}{U}{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): Stranglehold — mentions
// "extra turn" as broadly as any real grant, but denies one instead of
// granting it (a real stax staple).
const stranglehold = {
  name: "Stranglehold",
  oracleText: "Your opponents can't search libraries.\nIf an opponent would begin an extra turn, that player skips that turn instead.",
  typeLine: "Enchantment",
  manaCost: "{3}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): extra_combats' own
// commander fixture (see tests/extra-combats-package-occupancy.test.mjs) —
// Aurelia, the Warleader has no "extra turn" text at all.
const aurelia = {
  name: "Aurelia, the Warleader",
  oracleText: "Flying, vigilance, haste\nWhenever Aurelia attacks for the first time each turn, untap all creatures you control. After this phase, there is an additional combat phase.",
  typeLine: "Legendary Creature — Angel",
  manaCost: "{2}{R}{R}{W}{W}",
  colorIdentity: ["R", "W"],
};

test("extra_turns opens on a real extra-turn commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(medomai).packageIds.includes("extra_turns"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("extra_turns"));
});

test("extra_turns opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an extra turns time walk deck" } });
  assert.ok(intent.packageIds.includes("extra_turns"));
});

test("extra_turns core is a real grant, not a denial (wrong-target-scope polarity mismatch)", () => {
  const intent = intentFor(medomai);
  assert.equal(cardSatisfiesPackageCore(timeStretch, "extra_turns", intent), true);
  assert.equal(cardSatisfiesPackageCore(stranglehold, "extra_turns", intent), false);
  assert.equal(cardIsPackageFalseFriend(stranglehold, "extra_turns", intent), true);
  assert.equal(cardIsPackageFalseFriend(timeStretch, "extra_turns", intent), false);
});

test("extra_turns support is a cross-turn untap enabler, not the grant/denial itself", () => {
  const intent = intentFor(medomai);
  const seedbornMuse = { name: "Seedborn Muse", oracleText: "Untap all permanents you control during each other player's untap step.", typeLine: "Creature — Spirit", manaCost: "{3}{G}{G}" };
  assert.equal(cardSatisfiesPackageSupport(seedbornMuse, "extra_turns", intent), true);
  assert.equal(cardSatisfiesPackageCore(seedbornMuse, "extra_turns", intent), false);
  // The denial trap is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(stranglehold, "extra_turns", intent), false);
});

test("extra_turns and extra_combats are disjoint: Medomai doesn't open extra_combats, and Aurelia doesn't open extra_turns", () => {
  const medomaiIntent = intentFor(medomai);
  assert.ok(medomaiIntent.packageIds.includes("extra_turns"));
  assert.ok(!medomaiIntent.packageIds.includes("extra_combats"));

  const aureliaIntent = intentFor(aurelia);
  assert.ok(aureliaIntent.packageIds.includes("extra_combats"));
  assert.ok(!aureliaIntent.packageIds.includes("extra_turns"));
});

test("a real Medomai-shaped commander forges the extra-turn payoff over an otherwise-identical denial trap", () => {
  const uFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const uDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Island ${i}`,
    oracleText: "{T}: Add {U}.",
    typeLine: "Basic Land — Island",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["U"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const uTimeStretch = { ...timeStretch, colorIdentity: ["U"] };
  const uStranglehold = { ...stranglehold, colorIdentity: ["U"], oracleText: stranglehold.oracleText, manaCost: "{3}{U}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: medomai,
    cards: [...uFiller, uTimeStretch, uStranglehold, ...uDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("extra_turns"), "Medomai's deck should carry the extra_turns package");
  assert.ok(names.has("Time Stretch"), "the real extra-turn payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(uTimeStretch, "extra_turns", intent), true);
  assert.equal(cardSatisfiesPackageCore(uStranglehold, "extra_turns", intent), false);
});
