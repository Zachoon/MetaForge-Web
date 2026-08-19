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
// Founder #034 (batch 7, final) — Spell Copy
// =============================================================================
// Core is copying instants/sorceries specifically — the NATURAL
// complementary pair to #030's clones, whose own documented false friend is
// Twincast ("the object being copied is a SPELL, not a creature/permanent").
// This entry grounds its own core in exactly that rejected card. False-
// friend shape: wrong-target-scope, reusing #030's object-TYPE-mismatch
// sub-domain from the opposite direction (the same reuse #033's populate
// already established for the clones/populate pair) — Sakashima/Progenitor
// Mimic (clones' own real core) mention "copy" broadly but copy a creature,
// not a spell.
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

// Real card, verified via Scryfall (2026-08-19): Kalamax, the Stormsire —
// the archetype's own real commander fixture.
const kalamax = {
  name: "Kalamax, the Stormsire",
  oracleText: "Whenever you cast your first instant spell each turn, if Kalamax is tapped, copy that spell. You may choose new targets for the copy.\nWhenever you copy an instant spell, put a +1/+1 counter on Kalamax.",
  typeLine: "Legendary Creature — Elemental Dinosaur",
  manaCost: "{1}{G}{U}{R}",
  colorIdentity: ["G", "U", "R"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Stella Lee, Wild Card — a
// second independent real Spell Copy commander fixture.
const stellaLee = {
  name: "Stella Lee, Wild Card",
  oracleText: "Whenever you cast your second spell each turn, exile the top card of your library. Until the end of your next turn, you may play that card.\n{T}: Copy target instant or sorcery spell you control. You may choose new targets for the copy. Activate only if you've cast three or more spells this turn.",
  typeLine: "Legendary Creature — Human Rogue",
  manaCost: "{1}{U}{R}",
  colorIdentity: ["U", "R"],
};

// Real card, verified via Scryfall (2026-08-19): Twincast — the archetype's
// own namesake, and #030's clones' own documented false friend.
const twincast = {
  name: "Twincast",
  oracleText: "Copy target instant or sorcery spell. You may choose new targets for the copy.",
  typeLine: "Instant",
  manaCost: "{U}{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): Sakashima of a Thousand
// Faces — clones' own namesake commander. Mentions "copy" broadly but
// copies a CREATURE, not a spell.
const sakashima = {
  name: "Sakashima of a Thousand Faces",
  oracleText: "You may have Sakashima enter as a copy of another creature you control, except it has Sakashima's other abilities.\nThe \"legend rule\" doesn't apply to permanents you control.",
  typeLine: "Legendary Creature — Human Rogue",
  manaCost: "{3}{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): clones' own real core
// fixture (see tests/clones-package-occupancy.test.mjs).
const progenitorMimic = {
  name: "Progenitor Mimic",
  oracleText: "You may have this creature enter as a copy of any creature on the battlefield, except it has \"At the beginning of your upkeep, if this creature isn't a token, create a token that's a copy of this creature.\"",
  typeLine: "Creature — Shapeshifter",
  manaCost: "{4}{G}{U}",
  colorIdentity: ["G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): Baral, Chief of
// Compliance — a cost-reduction enabler, not the copy effect itself.
const baral = {
  name: "Baral, Chief of Compliance",
  oracleText: "Instant and sorcery spells you cast cost {1} less to cast.\nWhenever a spell or ability you control counters a spell, you may draw a card. If you do, discard a card.",
  typeLine: "Legendary Creature — Human Wizard",
  manaCost: "{1}{U}",
  colorIdentity: ["U"],
};

test("spell_copy opens on a real Spell Copy commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(kalamax).packageIds.includes("spell_copy"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("spell_copy"));
});

test("spell_copy opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a spell copy storm deck" } });
  assert.ok(intent.packageIds.includes("spell_copy"));
});

test("a second real commander (Stella Lee) independently opens spell_copy", () => {
  assert.ok(intentFor(stellaLee).packageIds.includes("spell_copy"));
});

test("spell_copy core is copying an instant/sorcery, not copying a creature/permanent (wrong-target-scope)", () => {
  const intent = intentFor(kalamax);
  assert.equal(cardSatisfiesPackageCore(twincast, "spell_copy", intent), true);
  assert.equal(cardSatisfiesPackageCore(sakashima, "spell_copy", intent), false);
  assert.equal(cardIsPackageFalseFriend(sakashima, "spell_copy", intent), true);
  assert.equal(cardSatisfiesPackageCore(progenitorMimic, "spell_copy", intent), false);
  assert.equal(cardIsPackageFalseFriend(progenitorMimic, "spell_copy", intent), true);
  assert.equal(cardIsPackageFalseFriend(twincast, "spell_copy", intent), false);
});

test("spell_copy support is a cost-reduction enabler, not the copy effect itself", () => {
  const intent = intentFor(kalamax);
  assert.equal(cardSatisfiesPackageSupport(baral, "spell_copy", intent), true);
  assert.equal(cardSatisfiesPackageCore(baral, "spell_copy", intent), false);
});

test("spell_copy and clones are the complementary pair proven from both directions: Kalamax doesn't open clones, and Sakashima (clones' own commander) doesn't open spell_copy", () => {
  const kalamaxIntent = intentFor(kalamax);
  assert.ok(kalamaxIntent.packageIds.includes("spell_copy"));
  assert.ok(!kalamaxIntent.packageIds.includes("clones"));

  const sakashimaIntent = intentFor(sakashima);
  assert.ok(sakashimaIntent.packageIds.includes("clones"));
  assert.ok(!sakashimaIntent.packageIds.includes("spell_copy"));
});

test("Twincast and Sakashima/Progenitor Mimic legitimately occupy opposite roles across the two archetypes, proven symmetrically", () => {
  const kalamaxIntent = intentFor(kalamax);
  const sakashimaIntent = intentFor(sakashima);
  // Twincast: CORE for spell_copy, FALSE FRIEND for clones (clones' own
  // existing, unchanged behavior).
  assert.equal(cardSatisfiesPackageCore(twincast, "spell_copy", kalamaxIntent), true);
  assert.equal(cardSatisfiesPackageCore(twincast, "clones", sakashimaIntent), false);
  assert.equal(cardIsPackageFalseFriend(twincast, "clones", sakashimaIntent), true);
  // Progenitor Mimic: CORE for clones, FALSE FRIEND for spell_copy.
  assert.equal(cardSatisfiesPackageCore(progenitorMimic, "clones", sakashimaIntent), true);
  assert.equal(cardSatisfiesPackageCore(progenitorMimic, "spell_copy", kalamaxIntent), false);
  assert.equal(cardIsPackageFalseFriend(progenitorMimic, "spell_copy", kalamaxIntent), true);
});

test("a real Kalamax-shaped commander forges the real spell-copy payoff over an otherwise-identical creature-copy trap", () => {
  const gurFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gurLands = Array.from({ length: 20 }, (_, i) => ({
    name: `Tropical Grove ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G}, {U}, or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "U", "R"],
    producedMana: ["G", "U", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const gurTwincast = { ...twincast, colorIdentity: ["G", "U", "R"] };
  const gurProgenitorMimic = { ...progenitorMimic, colorIdentity: ["G", "U", "R"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: kalamax,
    cards: [...gurFiller, gurTwincast, gurProgenitorMimic, ...gurLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("spell_copy"), "Kalamax's deck should carry the spell_copy package");
  assert.ok(names.has("Twincast"), "the real spell-copy payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(gurTwincast, "spell_copy", intent), true);
  assert.equal(cardSatisfiesPackageCore(gurProgenitorMimic, "spell_copy", intent), false);
});
