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
// Founder #033 (batch 6) — Populate
// =============================================================================
// Core is the Populate keyword/mechanic specifically — "create a token
// that's a copy of a token you control". CRITICAL overlap risk named by the
// task: #030's clones already covers creature-copying broadly. Kept disjoint
// by construction: clones' own corePatterns require the determiner
// "target"/"another"/"any" immediately before "creature", while every real
// Populate card's own reminder text uses the determiner "a" instead
// ("a copy of A creature token you control"), which never satisfies clones'
// pattern. False-friend shape: wrong-target-scope, reusing clones' own
// object-type-mismatch sub-domain from the opposite direction — Rite of
// Replication ("Create a token that's a copy of target creature.") mentions
// the same "create a token that's a copy of" construction as broadly as any
// real populate card, but copies "target creature" (any creature), not
// specifically a token you already control.
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

// Real card, verified via Scryfall (2026-08-19): Ghired, Conclave Exile —
// a real legendary-creature commander whose own attack trigger is genuinely
// Populate-specific.
const ghired = {
  name: "Ghired, Conclave Exile",
  oracleText: "When Ghired enters, create a 4/4 green Rhino creature token with trample.\nWhenever Ghired attacks, populate. The token enters tapped and attacking. (To populate, create a token that's a copy of a creature token you control.)",
  typeLine: "Legendary Creature — Human Shaman",
  manaCost: "{2}{R}{G}{W}",
  colorIdentity: ["G", "R", "W"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Trostani, Selesnya's Voice —
// a second independent real Populate commander fixture.
const trostani = {
  name: "Trostani, Selesnya's Voice",
  oracleText: "Whenever another creature you control enters, you gain life equal to that creature's toughness.\n{1}{G}{W}, {T}: Populate. (Create a token that's a copy of a creature token you control.)",
  typeLine: "Legendary Creature — Dryad",
  manaCost: "{G}{G}{W}{W}",
  colorIdentity: ["G", "W"],
};

// Real card, verified via Scryfall (2026-08-19): Rite of Replication — clones'
// own real core card ("Create a token that's a copy of target creature.").
const riteOfReplication = {
  name: "Rite of Replication",
  oracleText: "Kicker {5} (You may pay an additional {5} as you cast this spell.)\nCreate a token that's a copy of target creature. If this spell was kicked, create five of those tokens instead.",
  typeLine: "Sorcery",
  manaCost: "{2}{U}{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): clones' own commander
// fixture — Sakashima of a Thousand Faces has no "populate" text and no
// "copy of a/another token you control" construction.
const sakashima = {
  name: "Sakashima of a Thousand Faces",
  colors: ["U"],
  oracleText: "You may have Sakashima enter as a copy of another creature you control, except it has Sakashima's other abilities.\nThe \"legend rule\" doesn't apply to permanents you control.",
  typeLine: "Legendary Creature — Human Rogue",
  manaCost: "{3}{U}",
  colorIdentity: ["U"],
};

test("populate opens on a real Populate commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(ghired).packageIds.includes("populate"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("populate"));
});

test("populate opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a populate token copy deck" } });
  assert.ok(intent.packageIds.includes("populate"));
});

test("populate core requires the literal populate/token-you-control construction, not clones' broader 'copy of a creature' wording (wrong-target-scope)", () => {
  const intent = intentFor(ghired);
  assert.equal(cardSatisfiesPackageCore(trostani, "populate", intent), true);
  assert.equal(cardSatisfiesPackageCore(riteOfReplication, "populate", intent), false);
  assert.equal(cardIsPackageFalseFriend(riteOfReplication, "populate", intent), true);
  assert.equal(cardIsPackageFalseFriend(trostani, "populate", intent), false);
});

test("populate support is raw creature-token production, not the copy effect itself", () => {
  const intent = intentFor(ghired);
  const tokenMaker = { name: "Test Token Foundry Fragment", oracleText: "When this creature enters, create a 4/4 green Rhino creature token with trample.", typeLine: "Creature — Test", manaCost: "{3}{G}" };
  assert.equal(cardSatisfiesPackageSupport(tokenMaker, "populate", intent), true);
  assert.equal(cardSatisfiesPackageCore(tokenMaker, "populate", intent), false);
  // The clones-shaped trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(riteOfReplication, "populate", intent), false);
});

test("populate and clones are disjoint: a real Populate commander doesn't cross-open clones, and clones' own commander doesn't open populate", () => {
  const ghiredIntent = intentFor(ghired);
  assert.ok(ghiredIntent.packageIds.includes("populate"));
  assert.ok(!ghiredIntent.packageIds.includes("clones"));

  const trostaniIntent = intentFor(trostani);
  assert.ok(trostaniIntent.packageIds.includes("populate"));
  assert.ok(!trostaniIntent.packageIds.includes("clones"));

  const sakashimaIntent = intentFor(sakashima);
  assert.ok(sakashimaIntent.packageIds.includes("clones"));
  assert.ok(!sakashimaIntent.packageIds.includes("populate"));
});

test("Rite of Replication legitimately occupies two roles: CORE for clones' own promise, FALSE FRIEND for populate's narrower one", () => {
  const ghiredIntent = intentFor(ghired);
  const sakashimaIntent = intentFor(sakashima);
  assert.equal(cardSatisfiesPackageCore(riteOfReplication, "clones", sakashimaIntent), true);
  assert.equal(cardSatisfiesPackageCore(riteOfReplication, "populate", ghiredIntent), false);
  assert.equal(cardIsPackageFalseFriend(riteOfReplication, "populate", ghiredIntent), true);
});

test("a real Ghired-shaped commander forges the real Populate payoff over an otherwise-identical clones-shaped trap", () => {
  const rgwFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rgwDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Temple Garden ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {G} or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "W"],
    producedMana: ["G", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const rgwTrostani = { ...trostani, colorIdentity: ["G", "R", "W"] };
  const rgwRiteOfReplication = { ...riteOfReplication, colorIdentity: ["G", "R", "W"], manaCost: "{2}{R}{G}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: ghired,
    cards: [...rgwFiller, rgwTrostani, rgwRiteOfReplication, ...rgwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("populate"), "Ghired's deck should carry the populate package");
  assert.ok(names.has("Trostani, Selesnya's Voice"), "the real Populate payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(rgwTrostani, "populate", intent), true);
  assert.equal(cardSatisfiesPackageCore(rgwRiteOfReplication, "populate", intent), false);
});
