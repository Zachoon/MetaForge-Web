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
// Founder #029 (batch 2) — Mill
// =============================================================================
// False-friend shape: wrong-target-scope (new — see app/archetype-catalog.mjs
// for the full justification of why none of Founder #028's 3 shapes fit and
// why this shape is genuinely shared, not mill-specific). Stitcher's
// Supplier mills, but only its own controller — a graveyard/reanimator
// enabler (self-mill), not the Mill archetype, which is specifically about
// depleting an opponent's library.
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

// Real card, verified via Scryfall (2026-08-19): Bruvac the Grandiloquent —
// the archetype's own mill doubler.
const bruvac = {
  name: "Bruvac the Grandiloquent",
  colors: ["U"],
  oracleText: "If an opponent would mill one or more cards, they mill twice that many cards instead. (To mill a card, a player puts the top card of their library into their graveyard.)",
  typeLine: "Legendary Creature — Human Advisor",
  manaCost: "{2}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Hedron Crab.
const hedronCrab = {
  name: "Hedron Crab",
  oracleText: "Landfall — Whenever a land you control enters, target player mills three cards. (They put the top three cards of their library into their graveyard.)",
  typeLine: "Creature — Crab",
  manaCost: "{U}",
};

// Real card, verified via Scryfall (2026-08-19): Stitcher's Supplier.
// Recolored to {U} to fit the construction pool below — oracle text is
// unchanged. It mills, but only its own controller's library.
const stitchersSupplier = {
  name: "Stitcher's Supplier",
  oracleText: "When this creature enters or dies, mill three cards. (Put the top three cards of your library into your graveyard.)",
  typeLine: "Creature — Zombie",
  manaCost: "{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): Consuming Aberration.
// Recolored to mono-{3}{U} to fit the construction pool below — oracle text
// is unchanged. Its power/toughness clause is a genuine secondary payoff for
// opponents' graveyards the mill effect produces (support), while its own
// mill clause independently satisfies core.
const consumingAberration = {
  name: "Consuming Aberration",
  oracleText: "Consuming Aberration's power and toughness are each equal to the number of cards in your opponents' graveyards.\nWhenever you cast a spell, each opponent reveals cards from the top of their library until they reveal a land card, then puts those cards into their graveyard.",
  typeLine: "Creature — Horror",
  manaCost: "{3}{U}",
  colorIdentity: ["U"],
};

test("mill opens on a real opponent-mill commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(bruvac).packageIds.includes("mill"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("mill"));
});

test("mill opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a mill deck that decks out the table" } });
  assert.ok(intent.packageIds.includes("mill"));
});

test("mill core is milling your opponents, not milling yourself (wrong-target-scope)", () => {
  const intent = intentFor(bruvac);
  assert.equal(cardSatisfiesPackageCore(hedronCrab, "mill", intent), true);
  assert.equal(cardSatisfiesPackageCore(stitchersSupplier, "mill", intent), false);
  assert.equal(cardIsPackageFalseFriend(stitchersSupplier, "mill", intent), true);
  assert.equal(cardIsPackageFalseFriend(hedronCrab, "mill", intent), false);
});

test("mill support scales off the opponent graveyards mill produces, not raw mill density", () => {
  const intent = intentFor(bruvac);
  assert.equal(cardSatisfiesPackageSupport(consumingAberration, "mill", intent), true);
  // The self-mill trap is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(stitchersSupplier, "mill", intent), false);
});

test("a real Bruvac-shaped commander forges the opponent-mill payoff over an otherwise-identical self-mill trap", () => {
  const uFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const uLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Island Test ${i}`,
    oracleText: "({T}: Add {U}.)",
    typeLine: "Basic Land — Island",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["U"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: bruvac,
    cards: [...uFiller, hedronCrab, stitchersSupplier, ...uLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("mill"), "Bruvac's deck should carry the mill package");
  assert.ok(names.has("Hedron Crab"), "the real opponent-mill payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(hedronCrab, "mill", intent), true);
  assert.equal(cardSatisfiesPackageCore(stitchersSupplier, "mill", intent), false);
});
