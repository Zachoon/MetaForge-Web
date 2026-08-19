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
// Founder #031 (batch 4) — Theft
// =============================================================================
// Core is gaining control of an opponent's live battlefield permanent.
// False-friend shape: wrong-target-scope, reusing #030's object-TYPE-
// mismatch sub-domain (clones' spell-vs-creature) scoped instead to a
// battlefield-permanent-vs-graveyard-card mismatch. Reanimate mentions
// "under your control" as broadly as any real theft card, but the object is
// a graveyard CARD, not a live permanent under an opponent's control.
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

// Real card, verified via Scryfall (2026-08-19): Dragonlord Silumgar — the
// archetype's own canonical EDH theft commander.
const dragonlordSilumgar = {
  name: "Dragonlord Silumgar",
  colors: ["B", "U"],
  oracleText: "Flying, deathtouch\nWhen Dragonlord Silumgar enters, gain control of target creature or planeswalker for as long as you control Dragonlord Silumgar.",
  typeLine: "Legendary Creature — Elder Dragon",
  manaCost: "{4}{U}{B}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Insurrection — real mass
// theft using a different real corePattern (control of ALL creatures).
const insurrection = {
  name: "Insurrection",
  oracleText: "Untap all creatures and gain control of them until end of turn. They gain haste until end of turn.",
  typeLine: "Sorcery",
  manaCost: "{4}{R}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Reanimate — mentions
// "under your control" but the object is a GRAVEYARD card, not a live
// permanent under another player's control. #030's own graveyard entry
// uses this exact card as a "doesn't even qualify" example; here it trips
// the broader mention and gets an explicit false-friend flag instead.
const reanimate = {
  name: "Reanimate",
  oracleText: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value.",
  typeLine: "Sorcery",
  manaCost: "{B}",
  colorIdentity: ["B"],
};

// Real card, verified via Scryfall (2026-08-19): Ashnod's Altar — converts
// a temporarily-stolen creature into value before it returns.
const ashnodsAltar = {
  name: "Ashnod's Altar",
  oracleText: "Sacrifice a creature: Add {C}{C}.",
  typeLine: "Artifact",
  manaCost: "{3}",
  colorIdentity: [],
};

test("theft opens on a real control-change commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(dragonlordSilumgar).packageIds.includes("theft"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("theft"));
});

test("theft opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a theft deck that steals creatures" } });
  assert.ok(intent.packageIds.includes("theft"));
});

test("theft core is control of a live battlefield permanent, not a graveyard card (wrong-target-scope)", () => {
  const intent = intentFor(dragonlordSilumgar);
  assert.equal(cardSatisfiesPackageCore(insurrection, "theft", intent), true);
  assert.equal(cardSatisfiesPackageCore(reanimate, "theft", intent), false);
  assert.equal(cardIsPackageFalseFriend(reanimate, "theft", intent), true);
  assert.equal(cardIsPackageFalseFriend(insurrection, "theft", intent), false);
});

test("theft support is a sacrifice outlet, not the control-change effect itself", () => {
  const intent = intentFor(dragonlordSilumgar);
  assert.equal(cardSatisfiesPackageSupport(ashnodsAltar, "theft", intent), true);
  assert.equal(cardSatisfiesPackageCore(ashnodsAltar, "theft", intent), false);
  // The reanimation trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(reanimate, "theft", intent), false);
});

test("a real Dragonlord Silumgar-shaped commander forges the control-change payoff over an otherwise-identical reanimation trap", () => {
  const ubFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const ubDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Drowned Catacomb ${i}`,
    oracleText: "This land enters the battlefield tapped unless you control a Swamp or an Island. {T}: Add {U} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["U", "B"],
    producedMana: ["U", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const ubInsurrection = { ...insurrection, colorIdentity: ["U", "B"], manaCost: "{4}{U}{B}" };
  const ubReanimate = { ...reanimate, colorIdentity: ["U", "B"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: dragonlordSilumgar,
    cards: [...ubFiller, ubInsurrection, ubReanimate, ...ubDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("theft"), "Dragonlord Silumgar's deck should carry the theft package");
  assert.ok(names.has("Insurrection"), "the real control-change payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(ubInsurrection, "theft", intent), true);
  assert.equal(cardSatisfiesPackageCore(ubReanimate, "theft", intent), false);
});
