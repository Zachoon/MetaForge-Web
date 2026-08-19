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
// Founder #032 (batch 5, final) — Sagas
// =============================================================================
// Core is the Saga enchantment subtype's own chapter-based mechanic
// specifically — a deliberately narrow substitute for what EDHREC calls
// "Historic" (skipped in #031 because its literal definition — legendary +
// artifact + Saga — overlaps both #030's legends and #029's artifacts_matter).
// NOT generic Enchantment matters (#029's enchantress already owns that) and
// NOT generic Legendary matters (#030's legends already owns that).
// False-friend shape: broad-type-superset, reused DIRECTLY from
// enchantress/legends/vehicles, one Enchantment-subtype layer deeper — every
// Saga is already an Enchantment by rules text.
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

// Real card, verified via Scryfall (2026-08-19): Narci, Fable Singer — a
// real legendary-creature commander whose own final-chapter trigger is
// genuinely Saga-chapter-specific.
const narci = {
  name: "Narci, Fable Singer",
  oracleText: "Lifelink\nWhenever you sacrifice an enchantment, draw a card.\nWhenever the final chapter ability of a Saga you control resolves, each opponent loses X life and you gain X life, where X is that Saga's mana value.",
  typeLine: "Legendary Creature — Human Bard",
  manaCost: "{1}{W}{B}{G}",
  colorIdentity: ["W", "B", "G"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Garnet, Princess of
// Alexandria — a lore-counter payoff using a different real corePattern.
const garnet = {
  name: "Garnet, Princess of Alexandria",
  oracleText: "Lifelink\nWhenever Garnet attacks, you may remove a lore counter from each of any number of Sagas you control. Put a +1/+1 counter on Garnet for each lore counter removed this way.",
  typeLine: "Legendary Creature — Human Noble Cleric",
  manaCost: "{G}{W}",
  colorIdentity: ["G", "W"],
};

// Real card, verified via Scryfall (2026-08-19): The Eldest Reborn — a
// vanilla Saga. Type line carries "Saga", and its own reminder text even
// says "lore counter", but that reminder text is generic to every Saga ever
// printed and never reaches the archetype's own required construction.
const theEldestReborn = {
  name: "The Eldest Reborn",
  oracleText: "(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)\nI — Each opponent sacrifices a creature or planeswalker of their choice.\nII — Each opponent discards a card.\nIII — Put target creature or planeswalker card from a graveyard onto the battlefield under your control.",
  typeLine: "Enchantment — Saga",
  manaCost: "{4}{B}",
  colorIdentity: ["B"],
};

test("sagas opens on a real Saga-chapter-payoff commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(narci).packageIds.includes("sagas"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("sagas"));
});

test("sagas opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a sagas chapter matters deck" } });
  assert.ok(intent.packageIds.includes("sagas"));
});

test("sagas core is the chapter/lore-counter mechanic, not the Saga type (broad-type-superset)", () => {
  const intent = intentFor(narci);
  assert.equal(cardSatisfiesPackageCore(garnet, "sagas", intent), true);
  assert.equal(cardSatisfiesPackageCore(theEldestReborn, "sagas", intent), false);
  assert.equal(cardIsPackageFalseFriend(theEldestReborn, "sagas", intent), true);
  assert.equal(cardIsPackageFalseFriend(garnet, "sagas", intent), false);
});

test("sagas support is Saga-specific recursion, not raw type density", () => {
  const intent = intentFor(narci);
  const rydiaRecursion = { name: "Test Rydia Recursion Fragment", oracleText: "{X}, {T}: Return target Saga card with mana value X from your graveyard to the battlefield with a finality counter on it.", typeLine: "Legendary Creature — Human Shaman", manaCost: "{R}{G}" };
  assert.equal(cardSatisfiesPackageSupport(rydiaRecursion, "sagas", intent), true);
  // A vanilla Saga is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(theEldestReborn, "sagas", intent), false);
});

test("sagas is disjoint from enchantress and legends: Narci's own text never opens either from generic wording alone", () => {
  const intent = intentFor(narci);
  assert.ok(intent.packageIds.includes("sagas"));
  assert.ok(!intent.packageIds.includes("enchantress"));
  assert.ok(!intent.packageIds.includes("legends"));
});

test("a real Narci-shaped commander forges the Saga-chapter payoff over an otherwise-identical vanilla Saga", () => {
  const wbgFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wbgDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Godless Shrine ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const wbgGarnet = { ...garnet, colorIdentity: ["W", "B", "G"] };
  const wbgEldestReborn = { ...theEldestReborn, colorIdentity: ["W", "B", "G"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: narci,
    cards: [...wbgFiller, wbgGarnet, wbgEldestReborn, ...wbgDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("sagas"), "Narci's deck should carry the sagas package");
  assert.ok(names.has("Garnet, Princess of Alexandria"), "the real Saga-chapter payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wbgGarnet, "sagas", intent), true);
  assert.equal(cardSatisfiesPackageCore(wbgEldestReborn, "sagas", intent), false);
});
