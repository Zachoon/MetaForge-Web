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
// Founder #031 (batch 4) — Planeswalkers / Superfriends
// =============================================================================
// Core is a real payoff for having MANY planeswalkers together — a
// loyalty-counter-specific promise, deliberately distinct from #028's
// counters_matter (generic +1/+1-counter synergy). False-friend shape:
// wrong-target-scope, a mention-vs-count-reward mismatch (new sub-domain,
// shared with goad). Baird, Steward of Argive mentions "planeswalkers you
// control" as broadly as any real payoff card, but is a flat tax that
// never rewards having many.
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

// Real card, verified via Scryfall (2026-08-19): Mila, Crafty Companion —
// front face of the Mila // Lukka MDFC, a real legendary-creature
// commander with a genuinely planeswalker-loyalty-specific payoff.
const mila = {
  name: "Mila, Crafty Companion",
  colors: ["W"],
  colorIdentity: ["R", "W"],
  oracleText: "Whenever an opponent attacks one or more planeswalkers you control, put a loyalty counter on each planeswalker you control.\nWhenever a permanent you control becomes the target of a spell or ability an opponent controls, you may draw a card.",
  typeLine: "Legendary Creature — Fox",
  manaCost: "{1}{W}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Chandra, Legacy of Fire —
// a planeswalker-count payoff using a different real corePattern.
const chandraLegacy = {
  name: "Chandra, Legacy of Fire",
  oracleText: "At the beginning of your end step, Chandra deals X damage to each opponent, where X is the number of planeswalkers you control.\n+1: Add {R} for each planeswalker you control.",
  typeLine: "Legendary Planeswalker — Chandra",
  manaCost: "{4}{R}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Baird, Steward of Argive —
// mentions "planeswalkers you control" but is a flat attack-tax, not a
// many-planeswalkers reward.
const baird = {
  name: "Baird, Steward of Argive",
  oracleText: "Vigilance\nCreatures can't attack you or planeswalkers you control unless their controller pays {1} for each of those creatures.",
  typeLine: "Legendary Creature — Human Soldier",
  manaCost: "{2}{W}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): counters_matter's own
// commander fixture (see tests/counters-matter-package-occupancy.test.mjs)
// — Vorel doubles counters on artifact/creature/land ONLY, structurally
// excluding planeswalkers from its own target list.
const vorel = {
  name: "Vorel of the Hull Clade",
  oracleText: "{G}{U}, {T}: Double the number of each kind of counter on target artifact, creature, or land.",
  typeLine: "Legendary Creature — Human Merfolk",
  manaCost: "{1}{G}{U}",
  colorIdentity: ["G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): Atraxa, Praetors' Voice —
// this codebase's own canonical "Superfriends commander" flavor reference
// (docs/FOUNDER_ISSUES.md #023/#024). Deliberately NOT used as this
// entry's own commander fixture: her only mechanical tie is bare
// proliferate, which opens counters_matter but has no planeswalker-specific
// text at all.
const atraxa = {
  name: "Atraxa, Praetors' Voice",
  oracleText: "Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  manaCost: "{G}{W}{U}{B}",
  colorIdentity: ["W", "U", "B", "G"],
};

test("superfriends opens on a real planeswalker-loyalty commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(mila).packageIds.includes("superfriends"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("superfriends"));
});

test("superfriends opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a superfriends deck with lots of planeswalkers" } });
  assert.ok(intent.packageIds.includes("superfriends"));
});

test("superfriends core is a many-planeswalkers reward, not mere mention (wrong-target-scope)", () => {
  const intent = intentFor(mila);
  assert.equal(cardSatisfiesPackageCore(chandraLegacy, "superfriends", intent), true);
  assert.equal(cardSatisfiesPackageCore(baird, "superfriends", intent), false);
  assert.equal(cardIsPackageFalseFriend(baird, "superfriends", intent), true);
  assert.equal(cardIsPackageFalseFriend(chandraLegacy, "superfriends", intent), false);
});

test("superfriends support is proliferate, not the many-planeswalkers payoff itself", () => {
  const intent = intentFor(mila);
  assert.equal(cardSatisfiesPackageSupport(atraxa, "superfriends", intent), true);
  assert.equal(cardSatisfiesPackageCore(atraxa, "superfriends", intent), false);
  // The flat attack-tax trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(baird, "superfriends", intent), false);
});

test("superfriends and counters_matter are disjoint: a loyalty-counter commander and a +1/+1-counter commander don't cross-open", () => {
  const milaIntent = intentFor(mila);
  const vorelIntent = intentFor(vorel);
  assert.ok(milaIntent.packageIds.includes("superfriends"));
  assert.ok(!milaIntent.packageIds.includes("counters_matter"));
  assert.ok(vorelIntent.packageIds.includes("counters_matter"));
  assert.ok(!vorelIntent.packageIds.includes("superfriends"));
});

test("Atraxa's bare proliferate opens counters_matter but deliberately not superfriends — no planeswalker text at all", () => {
  const intent = intentFor(atraxa);
  assert.ok(intent.packageIds.includes("counters_matter"));
  assert.ok(!intent.packageIds.includes("superfriends"));
});

test("a real Mila-shaped commander forges the planeswalker payoff over an otherwise-identical flat attack-tax trap", () => {
  const rwFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rwDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Battlefield Forge ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {R} or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["R", "W"],
    producedMana: ["R", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const rwChandra = { ...chandraLegacy, colorIdentity: ["R"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: mila,
    cards: [...rwFiller, rwChandra, baird, ...rwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("superfriends"), "Mila's deck should carry the superfriends package");
  assert.ok(names.has("Chandra, Legacy of Fire"), "the real planeswalker-count payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(rwChandra, "superfriends", intent), true);
  assert.equal(cardSatisfiesPackageCore(baird, "superfriends", intent), false);
});
