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
// Founder #033 (batch 6) — Cascade
// =============================================================================
// Core is the Cascade keyword mechanic itself — having it or granting it.
// False-friend shape: incidental-rider. Rain of Riches mentions "cascade" as
// literally as any real grant, gated behind an unrelated Treasure-spending
// condition, on a card whose dominant identity is Treasure-token production,
// not a "cascade matters" payoff.
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

// Real card, verified via Scryfall (2026-08-19): Maelstrom Wanderer — the
// archetype's own canonical EDH Cascade commander.
const maelstromWanderer = {
  name: "Maelstrom Wanderer",
  oracleText: "Creatures you control have haste.\nCascade, cascade (When you cast this spell, exile cards from the top of your library until you exile a nonland card that costs less. You may cast it without paying its mana cost. Put the exiled cards on the bottom in a random order. Then do it again.)",
  typeLine: "Legendary Creature — Elemental",
  manaCost: "{5}{G}{U}{R}",
  colorIdentity: ["G", "R", "U"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Imoti, Celebrant of
// Bounty — a second independent real Cascade commander, a granted-cascade
// fixture rather than a printed-keyword one.
const imoti = {
  name: "Imoti, Celebrant of Bounty",
  oracleText: "Cascade (When you cast this spell, exile cards from the top of your library until you exile a nonland card that costs less. You may cast it without paying its mana cost. Put the exiled cards on the bottom in a random order.)\nSpells you cast with mana value 6 or greater have cascade.",
  typeLine: "Legendary Creature — Snake Druid",
  manaCost: "{2}{G}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): Rain of Riches — a real
// Treasure-token enchantment whose cascade grant is gated behind an
// unrelated Treasure-spending condition.
const rainOfRiches = {
  name: "Rain of Riches",
  oracleText: "When this enchantment enters, create two Treasure tokens.\nThe first spell you cast each turn that mana from a Treasure was spent to cast has cascade. (When you cast the spell, exile cards from the top of your library until you exile a nonland card that costs less. You may cast it without paying its mana cost. Put the exiled cards on the bottom in a random order.)",
  typeLine: "Enchantment",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

test("cascade opens on a real Cascade commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(maelstromWanderer).packageIds.includes("cascade"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("cascade"));
});

test("cascade opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a cascade free spells deck" } });
  assert.ok(intent.packageIds.includes("cascade"));
});

test("cascade core is having/granting the keyword itself, not a gated rider on an unrelated dominant effect (incidental-rider)", () => {
  const intent = intentFor(maelstromWanderer);
  assert.equal(cardSatisfiesPackageCore(imoti, "cascade", intent), true);
  assert.equal(cardSatisfiesPackageCore(rainOfRiches, "cascade", intent), false);
  assert.equal(cardIsPackageFalseFriend(rainOfRiches, "cascade", intent), true);
  assert.equal(cardIsPackageFalseFriend(imoti, "cascade", intent), false);
});

test("cascade support is a reward for casting cascade spells, not having/granting cascade itself", () => {
  const intent = intentFor(maelstromWanderer);
  const firstDoctorClause = { name: "Test Cascade Reward Fragment", oracleText: "Whenever you cast a spell with cascade, put a +1/+1 counter on target artifact or creature.", typeLine: "Legendary Creature — Test", manaCost: "{1}{W}{U}" };
  assert.equal(cardSatisfiesPackageSupport(firstDoctorClause, "cascade", intent), true);
  assert.equal(cardSatisfiesPackageCore(firstDoctorClause, "cascade", intent), false);
  // A reactive reward is real support, not a false friend — the "with
  // cascade" reactive phrasing never satisfies core's own negative
  // lookbehind, and it never trips the gated-rider check either.
  assert.equal(cardIsPackageFalseFriend(firstDoctorClause, "cascade", intent), false);
  // The Treasure-token trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(rainOfRiches, "cascade", intent), false);
});

test("a real Maelstrom-Wanderer-shaped commander forges the real cascade payoff over an otherwise-identical gated-rider trap", () => {
  const gurFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Deals 3 damage to target creature.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gurDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Steam Vents ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {U} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["U", "R"],
    producedMana: ["U", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const gurImoti = { ...imoti, colorIdentity: ["G", "U", "R"] };
  const gurRainOfRiches = { ...rainOfRiches, colorIdentity: ["G", "U", "R"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: maelstromWanderer,
    cards: [...gurFiller, gurImoti, gurRainOfRiches, ...gurDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("cascade"), "Maelstrom Wanderer's deck should carry the cascade package");
  assert.ok(names.has("Imoti, Celebrant of Bounty"), "the real cascade payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(gurImoti, "cascade", intent), true);
  assert.equal(cardSatisfiesPackageCore(gurRainOfRiches, "cascade", intent), false);
});
