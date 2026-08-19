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
// Founder #034 (batch 7, final) — Exile-matters
// =============================================================================
// Core is impulse draw and the exile zone as a real resource. CRITICAL
// overlap risk named by the task: #030's graveyard already covers "alternate
// zone as a resource". Kept disjoint by construction, verified with real
// fixtures: exile_matters' own corePatterns require the literal "exile the
// top ... you may play/cast" or "whenever you play a card from exile"
// construction, never satisfied by graveyard's own delirium/threshold/
// flashback/escape/"cast ... from your graveyard" wording. The sharpest real
// proof is Kroxa, Titan of Death's Hunger — graveyard's own documented
// Escape fixture — whose cost text literally contains the word "exile"
// ("Exile five other cards from your graveyard") but is graveyard's own
// escape mechanic, not this archetype's impulse-draw promise.
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

// Real card, verified via Scryfall (2026-08-19): Prosper, Tome-Bound — the
// canonical real Exile-matters commander.
const prosper = {
  name: "Prosper, Tome-Bound",
  oracleText: "Deathtouch\nMystic Arcanum — At the beginning of your end step, exile the top card of your library. Until the end of your next turn, you may play that card.\nPact Boon — Whenever you play a card from exile, create a Treasure token.",
  typeLine: "Legendary Creature — Tiefling Warlock",
  manaCost: "{2}{B}{R}",
  colorIdentity: ["B", "R"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Laelia, the Blade
// Reforged — a second independent real Exile-matters commander fixture.
const laelia = {
  name: "Laelia, the Blade Reforged",
  oracleText: "Haste\nWhenever Laelia attacks, exile the top card of your library. You may play that card this turn.\nWhenever one or more cards are put into exile from your library and/or your graveyard, put a +1/+1 counter on Laelia.",
  typeLine: "Legendary Creature — Spirit Warrior",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Kroxa, Titan of Death's
// Hunger — graveyard's own documented Escape fixture (see this file's own
// #030 graveyard entry comment). Its cost text literally contains "exile"
// but is graveyard's own escape mechanic.
const kroxa = {
  name: "Kroxa, Titan of Death's Hunger",
  oracleText: "Escape—{2}{B}{R}, Exile five other cards from your graveyard. (You may cast this card from your graveyard for its escape cost.)\nWhenever this creature deals combat damage to a player, that player discards two cards.",
  typeLine: "Legendary Creature — Elder Incarnation",
  manaCost: "{B}{R}",
  colorIdentity: ["B", "R"],
};

// Real card, verified via Scryfall (2026-08-19): graveyard's own real
// commander fixture (see tests/graveyard-package-occupancy.test.mjs) —
// Muldrotha, the Gravetide has no "exile" text at all.
const muldrotha = {
  name: "Muldrotha, the Gravetide",
  oracleText: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard.",
  typeLine: "Legendary Creature — Elemental Horror",
  manaCost: "{3}{B}{G}{U}",
  colorIdentity: ["B", "G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): Nico Minoru, Runaway — a
// reward for casting from exile without itself producing the impulse draw.
const nico = {
  name: "Nico Minoru, Runaway",
  oracleText: "Whenever you cast a spell from anywhere other than your hand, Nico Minoru deals 2 damage to each opponent.\n{2}{R}, {T}, Discard a card: Exile cards from the top of your library until you exile a nonland card. You may cast that card without paying its mana cost.",
  typeLine: "Legendary Creature — Human Warlock Hero",
  manaCost: "{3}{R}",
  colorIdentity: ["R"],
};

test("exile_matters opens on a real Exile-matters commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(prosper).packageIds.includes("exile_matters"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("exile_matters"));
});

test("exile_matters opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an impulse draw exile matters deck" } });
  assert.ok(intent.packageIds.includes("exile_matters"));
});

test("a second real commander (Laelia) independently opens exile_matters", () => {
  assert.ok(intentFor(laelia).packageIds.includes("exile_matters"));
});

test("exile_matters core requires the literal exile-then-play construction, never satisfied by graveyard's own escape/delirium/threshold/flashback wording (wrong-target-scope)", () => {
  const intent = intentFor(prosper);
  assert.equal(cardSatisfiesPackageCore(laelia, "exile_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(kroxa, "exile_matters", intent), false);
  assert.equal(cardIsPackageFalseFriend(kroxa, "exile_matters", intent), true);
  assert.equal(cardIsPackageFalseFriend(laelia, "exile_matters", intent), false);
});

test("exile_matters support rewards casting from exile without itself producing the impulse draw", () => {
  const intent = intentFor(prosper);
  assert.equal(cardSatisfiesPackageSupport(nico, "exile_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(nico, "exile_matters", intent), false);
});

test("exile_matters and graveyard are disjoint: Prosper doesn't open graveyard, and graveyard's own commander (Muldrotha) doesn't open exile_matters", () => {
  const prosperIntent = intentFor(prosper);
  assert.ok(prosperIntent.packageIds.includes("exile_matters"));
  assert.ok(!prosperIntent.packageIds.includes("graveyard"));

  const muldrothaIntent = intentFor(muldrotha);
  assert.ok(muldrothaIntent.packageIds.includes("graveyard"));
  assert.ok(!muldrothaIntent.packageIds.includes("exile_matters"));
});

test("Kroxa legitimately occupies two roles: CORE for graveyard's own escape promise, FALSE FRIEND for exile_matters' narrower one", () => {
  const kroxaIntent = intentFor(kroxa);
  assert.ok(kroxaIntent.packageIds.includes("graveyard"));
  assert.ok(!kroxaIntent.packageIds.includes("exile_matters"));
  const prosperIntent = intentFor(prosper);
  assert.equal(cardSatisfiesPackageCore(kroxa, "graveyard", kroxaIntent), true);
  assert.equal(cardSatisfiesPackageCore(kroxa, "exile_matters", prosperIntent), false);
  assert.equal(cardIsPackageFalseFriend(kroxa, "exile_matters", prosperIntent), true);
});

test("a real Prosper-shaped commander forges the real impulse-draw payoff over an otherwise-identical escape trap", () => {
  const brFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This deals 2 damage to any target.", typeLine: "Instant", manaCost: "{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const brDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Blood Crypt ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {B} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R"],
    producedMana: ["B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const brLaelia = { ...laelia, colorIdentity: ["B", "R"] };
  const brKroxa = { ...kroxa };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: prosper,
    cards: [...brFiller, brLaelia, brKroxa, ...brDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("exile_matters"), "Prosper's deck should carry the exile_matters package");
  assert.ok(names.has("Laelia, the Blade Reforged"), "the real impulse-draw payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(brLaelia, "exile_matters", intent), true);
  assert.equal(cardSatisfiesPackageCore(brKroxa, "exile_matters", intent), false);
});
