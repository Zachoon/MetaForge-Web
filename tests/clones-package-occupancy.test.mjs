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
// Founder #030 (batch 3) — Clones
// =============================================================================
// False-friend shape: wrong-target-scope (reused — see
// app/archetype-catalog.mjs's shared-evaluator comment for why this
// generalizes past player-scope). Twincast mentions "copy" broadly, exactly
// like a real clone effect, but the object being copied is a SPELL, not a
// creature/permanent — an object-TYPE scope mismatch rather than mill/
// wheels' player-scope mismatch.
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

// Real card, verified via Scryfall (2026-08-19): Sakashima of a Thousand
// Faces — the archetype's own namesake clone-legend commander.
const sakashima = {
  name: "Sakashima of a Thousand Faces",
  colors: ["U"],
  oracleText: "You may have Sakashima enter as a copy of another creature you control, except it has Sakashima's other abilities.\nThe \"legend rule\" doesn't apply to permanents you control.",
  typeLine: "Legendary Creature — Human Rogue",
  manaCost: "{3}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Progenitor Mimic.
const progenitorMimic = {
  name: "Progenitor Mimic",
  oracleText: "You may have this creature enter as a copy of any creature on the battlefield, except it has \"At the beginning of your upkeep, if this creature isn't a token, create a token that's a copy of this creature.\"",
  typeLine: "Creature — Shapeshifter",
  manaCost: "{4}{G}{U}",
};

// Real card, verified via Scryfall (2026-08-19): Twincast — copies a SPELL,
// not a creature/permanent.
const twincast = {
  name: "Twincast",
  oracleText: "Copy target instant or sorcery spell. You may choose new targets for the copy.",
  typeLine: "Instant",
  manaCost: "{U}{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): Mirror Gallery — clone-
// shell support that lets a deck stack multiple legendary copies.
const mirrorGallery = {
  name: "Mirror Gallery",
  oracleText: "The \"legend rule\" doesn't apply.",
  typeLine: "Artifact",
  manaCost: "{5}",
  colorIdentity: [],
};

test("clones opens on a real creature-copy commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(sakashima).packageIds.includes("clones"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("clones"));
});

test("clones opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a clone deck that copies creatures" } });
  assert.ok(intent.packageIds.includes("clones"));
});

test("clones core is copying a creature/permanent, not copying a spell (wrong-target-scope)", () => {
  const intent = intentFor(sakashima);
  assert.equal(cardSatisfiesPackageCore(progenitorMimic, "clones", intent), true);
  assert.equal(cardSatisfiesPackageCore(twincast, "clones", intent), false);
  assert.equal(cardIsPackageFalseFriend(twincast, "clones", intent), true);
  assert.equal(cardIsPackageFalseFriend(progenitorMimic, "clones", intent), false);
});

test("clones support is clone-shell enabling (anti-legend-rule), not the copy effect itself", () => {
  const intent = intentFor(sakashima);
  assert.equal(cardSatisfiesPackageSupport(mirrorGallery, "clones", intent), true);
  assert.equal(cardSatisfiesPackageCore(mirrorGallery, "clones", intent), false);
  // The spell-copy trap is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(twincast, "clones", intent), false);
});

test("a real Sakashima-shaped commander forges the creature-copy payoff over an otherwise-identical spell-copy trap", () => {
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
    commander: sakashima,
    cards: [...uFiller, progenitorMimic, twincast, ...uLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("clones"), "Sakashima's deck should carry the clones package");
  assert.ok(names.has("Progenitor Mimic"), "the real creature-copy payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(progenitorMimic, "clones", intent), true);
  assert.equal(cardSatisfiesPackageCore(twincast, "clones", intent), false);
});
