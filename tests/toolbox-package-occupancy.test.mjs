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
// Founder #034 (batch 7, final) — Toolbox
// =============================================================================
// Core is a versatile, TYPE-CONDITIONED search — the deck's own repeatable
// answer-fetching plan — distinct from generic tutoring (already SUPPORT in
// several existing archetypes). False-friend shape: wrong-target-scope —
// Demonic Tutor mentions "search your library for" as broadly as any real
// toolbox card, but has no type/characteristic qualifier at all — an
// unconditional any-card tutor, not this archetype's narrower promise.
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

// Real card, verified via Scryfall (2026-08-19): Prime Speaker Vannifar —
// the modern Birthing Pod as a commander, the archetype's own real fixture.
const vannifar = {
  name: "Prime Speaker Vannifar",
  oracleText: "{T}, Sacrifice another creature: Search your library for a creature card with mana value equal to 1 plus the sacrificed creature's mana value, put that card onto the battlefield, then shuffle. Activate only as a sorcery.",
  typeLine: "Legendary Creature — Elf Ooze Wizard",
  manaCost: "{2}{G}{U}",
  colorIdentity: ["G", "U"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Yisan, the Wanderer Bard —
// a second independent real Toolbox commander fixture.
const yisan = {
  name: "Yisan, the Wanderer Bard",
  oracleText: "{2}{G}, {T}, Put a verse counter on Yisan: Search your library for a creature card with mana value equal to the number of verse counters on Yisan, put it onto the battlefield, then shuffle.",
  typeLine: "Legendary Creature — Human Rogue Bard",
  manaCost: "{2}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): Demonic Tutor — an
// unconditional, any-card tutor with no type qualifier at all.
const demonicTutor = {
  name: "Demonic Tutor",
  oracleText: "Search your library for a card, put that card into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{1}{B}",
  colorIdentity: ["B"],
};

// Real card, verified via Scryfall (2026-08-19): Bitterblossom — raw
// sacrifice fodder, feeding a Birthing-Pod-style engine's required raw
// material without itself being the search.
const bitterblossom = {
  name: "Bitterblossom",
  oracleText: "At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying.",
  typeLine: "Kindred Enchantment — Faerie",
  manaCost: "{1}{B}",
  colorIdentity: ["B"],
};

test("toolbox opens on a real Toolbox commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(vannifar).packageIds.includes("toolbox"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("toolbox"));
});

test("toolbox opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a Birthing Pod toolbox deck" } });
  assert.ok(intent.packageIds.includes("toolbox"));
});

test("a second real commander (Yisan) independently opens toolbox", () => {
  assert.ok(intentFor(yisan).packageIds.includes("toolbox"));
});

test("toolbox core requires a type/characteristic-qualified search, not any-card tutoring (wrong-target-scope)", () => {
  const intent = intentFor(vannifar);
  assert.equal(cardSatisfiesPackageCore(yisan, "toolbox", intent), true);
  assert.equal(cardSatisfiesPackageCore(demonicTutor, "toolbox", intent), false);
  assert.equal(cardIsPackageFalseFriend(demonicTutor, "toolbox", intent), true);
  assert.equal(cardIsPackageFalseFriend(yisan, "toolbox", intent), false);
});

test("toolbox support is raw sacrifice fodder, not the search effect itself", () => {
  const intent = intentFor(vannifar);
  assert.equal(cardSatisfiesPackageSupport(bitterblossom, "toolbox", intent), true);
  assert.equal(cardSatisfiesPackageCore(bitterblossom, "toolbox", intent), false);
  assert.equal(cardSatisfiesPackageSupport(demonicTutor, "toolbox", intent), false);
});

test("a real Vannifar-shaped commander forges the type-conditioned search over an otherwise-identical any-card tutor trap", () => {
  const guFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const guDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Breeding Pool ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {G} or {U}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "U"],
    producedMana: ["G", "U"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const guYisan = { ...yisan, colorIdentity: ["G", "U"] };
  const guDemonicTutor = { ...demonicTutor, colorIdentity: ["G", "U"], manaCost: "{1}{G}{U}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: vannifar,
    cards: [...guFiller, guYisan, guDemonicTutor, ...guDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("toolbox"), "Vannifar's deck should carry the toolbox package");
  assert.ok(names.has("Yisan, the Wanderer Bard"), "the real type-conditioned search should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(guYisan, "toolbox", intent), true);
  assert.equal(cardSatisfiesPackageCore(guDemonicTutor, "toolbox", intent), false);
});
