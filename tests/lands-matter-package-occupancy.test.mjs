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
// Founder #029 (batch 2) — Lands matter
// =============================================================================
// False-friend shape: broad-type-superset, reused from Founder #028's
// artifacts_matter with typePattern /\bLand\b/i. A plain dual land is not
// core just because its type line says Land — core is the landfall-shaped
// payoff, the same way core for artifacts_matter is the payoff, not the type.
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

// Real card, verified via Scryfall (2026-08-19): Aesi, Tyrant of Gyre Strait.
const aesi = {
  name: "Aesi, Tyrant of Gyre Strait",
  colors: ["G", "U"],
  oracleText: "You may play an additional land on each of your turns.\nLandfall — Whenever a land you control enters, you may draw a card.",
  typeLine: "Legendary Creature — Serpent",
  manaCost: "{4}{G}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Command Tower. Colorless
// land, so it fits any commander's identity — a false friend for every
// possible construction pool, not just this one.
const commandTower = {
  name: "Command Tower",
  oracleText: "{T}: Add one mana of any color in your commander's color identity.",
  typeLine: "Land",
  manaCost: "",
  colorIdentity: [],
};

// Genuine landfall payoff, mirrors Aesi's own clause shape (invented, the
// same way artifacts_matter's Circuit Breaker fixture is invented).
const landfallPayoff = {
  name: "Test Riverbed Oracle",
  oracleText: "Whenever a land you control enters, draw a card.",
  typeLine: "Creature — Human Wizard",
  manaCost: "{2}{U}",
};

// Real card, verified via Scryfall (2026-08-19): Rampant Growth — an extra
// land drop / land tutor is an enabler, not the payoff itself.
const rampantGrowth = {
  name: "Rampant Growth",
  oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};

test("lands_matter opens on a real landfall-payoff commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(aesi).packageIds.includes("lands_matter"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("lands_matter"));
});

test("lands_matter opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a lands matter deck built around landfall" } });
  assert.ok(intent.packageIds.includes("lands_matter"));
});

test("lands_matter core is the landfall-shaped payoff, not the Land type line", () => {
  const intent = intentFor(aesi);
  assert.equal(cardSatisfiesPackageCore(landfallPayoff, "lands_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(commandTower, "lands_matter", intent), false);
  assert.equal(cardIsPackageFalseFriend(commandTower, "lands_matter", intent), true);
  assert.equal(cardIsPackageFalseFriend(landfallPayoff, "lands_matter", intent), false);
});

test("lands_matter support is land tutoring/extra land drops, not raw land density", () => {
  const intent = intentFor(aesi);
  assert.equal(cardSatisfiesPackageSupport(rampantGrowth, "lands_matter", intent), true);
  // A vanilla land is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(commandTower, "lands_matter", intent), false);
});

test("a real Aesi-shaped commander forges the landfall payoff over an otherwise-identical vanilla land", () => {
  const guFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}{U}", colorIdentity: ["G", "U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const guDuals = Array.from({ length: 19 }, (_, i) => ({
    name: `Simic Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {U}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "U"],
    producedMana: ["G", "U"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: aesi,
    cards: [...guFiller, landfallPayoff, commandTower, ...guDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("lands_matter"), "Aesi's deck should carry the lands_matter package");
  assert.ok(names.has("Test Riverbed Oracle"), "the real landfall payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(landfallPayoff, "lands_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(commandTower, "lands_matter", intent), false);
});
