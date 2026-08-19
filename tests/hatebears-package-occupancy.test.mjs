import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectStaxCommander,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #034 (batch 7, final) — Hatebears
// =============================================================================
// Core is a real hard-denial restriction — broad-spectrum disruption aimed
// at casting/activating/searching/entering. CRITICAL overlap risk named by
// the task: BOTH #032's pillow_fort (attack-taxation specifically) and the
// original PACKAGE_CATALOG's own stax entry. False-friend shape:
// wrong-target-scope, mention pattern deliberately as broad as stax's own
// detectStaxCommander regex, required scope narrowed to hard denial only —
// Baird/Ghostly Prison (attack tax, pillow_fort's own territory), a
// Vryn-Wingmare/Thalia-style symmetric mana tax (stax's own territory), and
// Winter Orb's own untap tax (stax's own territory) all trip the broad
// mention but fail the required scope.
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

// Real card, verified via Scryfall (2026-08-19): Iona, Shield of Emeria —
// the archetype's own real commander fixture.
const iona = {
  name: "Iona, Shield of Emeria",
  oracleText: "Flying\nAs Iona enters, choose a color.\nYour opponents can't cast spells of the chosen color.",
  typeLine: "Legendary Creature — Angel",
  manaCost: "{6}{W}{W}{W}",
  colorIdentity: ["W"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Gaddock Teeg — a second
// independent real Hatebears commander fixture.
const gaddockTeeg = {
  name: "Gaddock Teeg",
  oracleText: "Noncreature spells with mana value 4 or greater can't be cast.\nNoncreature spells with {X} in their mana costs can't be cast.",
  typeLine: "Legendary Creature — Kithkin Advisor",
  manaCost: "{G}{W}",
  colorIdentity: ["G", "W"],
};

// Real card, verified via Scryfall (2026-08-19): Baird, Steward of Argive —
// #032's pillow_fort's own real commander fixture. Mentions "can't attack"
// as broadly as any real hatebears card, but is pillow_fort's own
// attack-taxation promise, not a cast/activate/search denial.
const baird = {
  name: "Baird, Steward of Argive",
  oracleText: "Vigilance\nCreatures can't attack you or planeswalkers you control unless their controller pays {1} for each of those creatures.",
  typeLine: "Legendary Creature — Human Soldier",
  manaCost: "{2}{W}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19, phrasing shared by Vryn
// Wingmare/Thalia, Guardian of Thraben): a symmetric mana tax — stax's own
// real territory, not hatebears' hard-denial promise.
const noncreatureTax = {
  name: "Test Noncreature Tax",
  oracleText: "Flying\nNoncreature spells cost {1} more to cast.",
  typeLine: "Creature — Pegasus",
  manaCost: "{2}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Winter Orb — stax's own
// untap-tax territory, not a cast/activate/search denial.
const winterOrb = {
  name: "Winter Orb",
  oracleText: "Players can't untap more than one land during their untap steps.",
  typeLine: "Artifact",
  manaCost: "{2}",
  colorIdentity: [],
};

// Real card, verified via Scryfall (2026-08-19): stax's own real commander
// fixture (see tests/stax-package-occupancy.test.mjs).
const grandArbiter = {
  name: "Test Grand Arbiter",
  oracleText: "Noncreature spells cost {1} more to cast. Spells you cast cost {1} less to cast.",
  typeLine: "Legendary Creature — Human Advisor",
  manaCost: "{1}{W}{U}",
  colorIdentity: ["W", "U"],
};

test("hatebears opens on a real Hatebears commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(iona).packageIds.includes("hatebears"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("hatebears"));
});

test("hatebears opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a hatebears disruptive creatures deck" } });
  assert.ok(intent.packageIds.includes("hatebears"));
});

test("a second real commander (Gaddock Teeg) independently opens hatebears", () => {
  assert.ok(intentFor(gaddockTeeg).packageIds.includes("hatebears"));
});

test("Iona's and Gaddock Teeg's own real text never trips stax's own commander detection", () => {
  assert.equal(detectStaxCommander(iona.oracleText), false);
  assert.equal(detectStaxCommander(gaddockTeeg.oracleText), false);
});

test("hatebears core requires a hard cast/activate/search denial, not an attack tax or a mana/untap tax (wrong-target-scope)", () => {
  const intent = intentFor(iona);
  assert.equal(cardSatisfiesPackageCore(gaddockTeeg, "hatebears", intent), true);
  assert.equal(cardSatisfiesPackageCore(baird, "hatebears", intent), false);
  assert.equal(cardIsPackageFalseFriend(baird, "hatebears", intent), true);
  assert.equal(cardSatisfiesPackageCore(noncreatureTax, "hatebears", intent), false);
  assert.equal(cardIsPackageFalseFriend(noncreatureTax, "hatebears", intent), true);
  assert.equal(cardSatisfiesPackageCore(winterOrb, "hatebears", intent), false);
  assert.equal(cardIsPackageFalseFriend(winterOrb, "hatebears", intent), true);
  assert.equal(cardIsPackageFalseFriend(gaddockTeeg, "hatebears", intent), false);
});

test("hatebears support reuses the protection semantic — keeping the disruptive piece alive, not the disruption itself", () => {
  const intent = intentFor(iona);
  const protectionSpell = { name: "Test Ward Spell", oracleText: "Target creature you control gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{W}" };
  assert.equal(cardSatisfiesPackageSupport(protectionSpell, "hatebears", intent), true);
  assert.equal(cardSatisfiesPackageCore(protectionSpell, "hatebears", intent), false);
});

test("hatebears is disjoint from pillow_fort: Iona doesn't open pillow_fort, and Baird (pillow_fort's own commander) doesn't open hatebears", () => {
  const ionaIntent = intentFor(iona);
  assert.ok(ionaIntent.packageIds.includes("hatebears"));
  assert.ok(!ionaIntent.packageIds.includes("pillow_fort"));

  const bairdIntent = intentFor(baird);
  assert.ok(bairdIntent.packageIds.includes("pillow_fort"));
  assert.ok(!bairdIntent.packageIds.includes("hatebears"));
});

test("hatebears is disjoint from stax: Iona doesn't open stax, and Grand Arbiter (stax's own commander) doesn't open hatebears", () => {
  const ionaIntent = intentFor(iona);
  assert.ok(!ionaIntent.packageIds.includes("stax"));

  const grandArbiterIntent = intentFor(grandArbiter);
  assert.ok(grandArbiterIntent.packageIds.includes("stax"));
  assert.ok(!grandArbiterIntent.packageIds.includes("hatebears"));
  assert.equal(cardSatisfiesPackageCore(winterOrb, "stax", grandArbiterIntent), true);
});

test("Baird and Winter-Orb-style tax legitimately occupy two roles: CORE for pillow_fort/stax's own promise, FALSE FRIEND for hatebears' narrower one", () => {
  const bairdIntent = intentFor(baird);
  const grandArbiterIntent = intentFor(grandArbiter);
  const ionaIntent = intentFor(iona);
  assert.equal(cardSatisfiesPackageCore(baird, "pillow_fort", bairdIntent), true);
  assert.equal(cardSatisfiesPackageCore(baird, "hatebears", ionaIntent), false);
  assert.equal(cardIsPackageFalseFriend(baird, "hatebears", ionaIntent), true);
  assert.equal(cardSatisfiesPackageCore(winterOrb, "stax", grandArbiterIntent), true);
  assert.equal(cardSatisfiesPackageCore(winterOrb, "hatebears", ionaIntent), false);
  assert.equal(cardIsPackageFalseFriend(winterOrb, "hatebears", ionaIntent), true);
});

test("a real Iona-shaped commander forges the real hard-denial payoff over an otherwise-identical attack-tax trap", () => {
  const wFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Plains ${i}`,
    oracleText: "{T}: Add {W}.",
    typeLine: "Basic Land — Plains",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const wGaddockTeeg = { ...gaddockTeeg, colorIdentity: ["W"], manaCost: "{1}{W}" };
  const wBaird = { ...baird };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: iona,
    cards: [...wFiller, wGaddockTeeg, wBaird, ...wDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("hatebears"), "Iona's deck should carry the hatebears package");
  assert.ok(names.has("Gaddock Teeg"), "the real hard-denial payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wGaddockTeeg, "hatebears", intent), true);
  assert.equal(cardSatisfiesPackageCore(wBaird, "hatebears", intent), false);
});
