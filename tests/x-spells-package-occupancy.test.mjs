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
// Founder #034 (batch 7, final) — X Spells
// =============================================================================
// Core is a real payoff scaling off casting spells with {X} in their own
// mana cost. No CRITICAL overlap risk was named for this entry. False-friend
// shape: wrong-target-scope, the same grant-vs-negate POLARITY mismatch
// #031's infect/extra_combats already established — Frontline Medic mentions
// "{X} in its mana cost" but COUNTERS an X spell rather than rewarding one.
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

// Real card, verified via Scryfall (2026-08-19): Zaxara, the Exemplary —
// the archetype's own real commander fixture.
const zaxara = {
  name: "Zaxara, the Exemplary",
  oracleText: "Deathtouch\n{T}: Add two mana of any one color.\nWhenever you cast a spell with {X} in its mana cost, create a 0/0 green Hydra creature token, then put X +1/+1 counters on it.",
  typeLine: "Legendary Creature — Nightmare Hydra",
  manaCost: "{1}{B}{G}{U}",
  colorIdentity: ["B", "G", "U"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Zimone, Infinite Analyst —
// a second independent real X Spells commander fixture.
const zimone = {
  name: "Zimone, Infinite Analyst",
  oracleText: "The first spell you cast with {X} in its mana cost each turn costs {1} less to cast for each +1/+1 counter on Zimone.\nWhenever you cast your first spell with {X} in its mana cost each turn, put two +1/+1 counters on Zimone.",
  typeLine: "Legendary Creature — Human Wizard",
  manaCost: "{1}{G}{U}",
  colorIdentity: ["G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): Frontline Medic — mentions
// "{X} in its mana cost" but COUNTERS the X spell, opposite polarity.
const frontlineMedic = {
  name: "Frontline Medic",
  oracleText: "Battalion — Whenever this creature and at least two other creatures attack, creatures you control gain indestructible until end of turn.\nSacrifice this creature: Counter target spell with {X} in its mana cost.",
  typeLine: "Creature — Human Cleric",
  manaCost: "{2}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Rosheen, Roaring Prophet —
// ramp scoped specifically to X spells, not the scaling payoff itself.
const rosheen = {
  name: "Rosheen, Roaring Prophet",
  oracleText: "When Rosheen enters, mill six cards. You may put a card with {X} in its mana cost from among them into your hand.\n{T}: Reveal any number of cards with {X} in their mana cost in your hand. Add {C}{C} for each card revealed this way. Spend this mana only on costs that contain {X}.",
  typeLine: "Legendary Creature — Giant Shaman",
  manaCost: "{2}{R}{G}",
  colorIdentity: ["R", "G"],
};

test("x_spells opens on a real X Spells commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(zaxara).packageIds.includes("x_spells"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("x_spells"));
});

test("x_spells opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a big X spells deck" } });
  assert.ok(intent.packageIds.includes("x_spells"));
});

test("a second real commander (Zimone) independently opens x_spells", () => {
  assert.ok(intentFor(zimone).packageIds.includes("x_spells"));
});

test("x_spells core requires rewarding an X spell being cast, not countering one (wrong-target-scope)", () => {
  const intent = intentFor(zaxara);
  assert.equal(cardSatisfiesPackageCore(zimone, "x_spells", intent), true);
  assert.equal(cardSatisfiesPackageCore(frontlineMedic, "x_spells", intent), false);
  assert.equal(cardIsPackageFalseFriend(frontlineMedic, "x_spells", intent), true);
  assert.equal(cardIsPackageFalseFriend(zimone, "x_spells", intent), false);
});

test("x_spells support is ramp scoped to X spells, not the scaling payoff itself", () => {
  const intent = intentFor(zaxara);
  assert.equal(cardSatisfiesPackageSupport(rosheen, "x_spells", intent), true);
  assert.equal(cardSatisfiesPackageCore(rosheen, "x_spells", intent), false);
  assert.equal(cardSatisfiesPackageSupport(frontlineMedic, "x_spells", intent), false);
});

test("a real Zaxara-shaped commander forges the real X-spell payoff over an otherwise-identical X-hate trap", () => {
  const bguFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const bguDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Watery Grave ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {U} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["U", "B"],
    producedMana: ["U", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const bguZimone = { ...zimone, colorIdentity: ["B", "G", "U"] };
  const bguFrontlineMedic = { ...frontlineMedic, colorIdentity: ["B", "G", "U"], manaCost: "{2}{B}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: zaxara,
    cards: [...bguFiller, bguZimone, bguFrontlineMedic, ...bguDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("x_spells"), "Zaxara's deck should carry the x_spells package");
  assert.ok(names.has("Zimone, Infinite Analyst"), "the real X-spell payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(bguZimone, "x_spells", intent), true);
  assert.equal(cardSatisfiesPackageCore(bguFrontlineMedic, "x_spells", intent), false);
});
