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
// Founder #030 (batch 3) — Graveyard
// =============================================================================
// Explicitly distinct from the existing PACKAGE_CATALOG `reanimator` entry:
// reanimator is about reanimation SPELLS (creature onto battlefield);
// graveyard is about using the graveyard as a general resource (delirium/
// threshold, flashback/escape, "from your graveyard" cast/scale payoffs). A
// real reanimation spell never satisfies this core in the first place —
// Reanimate's actual printed text ("Put target creature card from a
// graveyard onto the battlefield under your control. You lose life equal to
// that card's mana value.") has no delirium/threshold/flashback/escape
// keyword and no "cast ... from your graveyard" phrasing, so it simply never
// matches corePatterns, the same "doesn't even qualify" outcome burn's own
// Flame Slash demonstrates.
//
// False-friend shape: incidental-rider, reused with a genuinely different
// real fixture than Reanimate. Grim Lavamancer mentions "graveyard" and its
// activation cost is gated on spending graveyard cards, but its dominant
// effect is unrelated direct damage.
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

// Real card, verified via Scryfall (2026-08-19): Muldrotha, the Gravetide —
// a repeated cast-from-graveyard permission, not a reanimation spell.
const muldrotha = {
  name: "Muldrotha, the Gravetide",
  colors: ["B", "G", "U"],
  oracleText: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. (If a card has multiple permanent types, choose one as you play it.)",
  typeLine: "Legendary Creature — Elemental Avatar",
  manaCost: "{3}{B}{G}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Tarmogoyf — scales off
// card types among cards in graveyards generically.
const tarmogoyf = {
  name: "Tarmogoyf",
  oracleText: "Tarmogoyf's power is equal to the number of card types among cards in all graveyards and its toughness is equal to that number plus 1.",
  typeLine: "Creature — Lhurgoyf",
  manaCost: "{1}{G}",
};

// Real card, verified via Scryfall (2026-08-19): Reanimate — a real
// reanimation spell. Its actual printed text never satisfies graveyard's
// core (no delirium/threshold/escape/flashback/cast-from-graveyard wording)
// and never trips the incidental-rider false-friend gate either (no
// "exile ... cards from your graveyard" cost) — it simply belongs to
// reanimator, a different package entirely.
const reanimate = {
  name: "Reanimate",
  oracleText: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value.",
  typeLine: "Sorcery",
  manaCost: "{B}",
  colorIdentity: ["B"],
};

// Real card, verified via Scryfall (2026-08-19): Grim Lavamancer — mentions
// graveyard, gated behind a graveyard-spending cost, but its dominant effect
// is unrelated direct damage.
const grimLavamancer = {
  name: "Grim Lavamancer",
  oracleText: "{R}, {T}, Exile two cards from your graveyard: Grim Lavamancer deals 2 damage to any target.",
  typeLine: "Creature — Human Wizard",
  manaCost: "{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Stitcher's Supplier — the
// exact card #029's mill entry flags as a self-mill FALSE FRIEND for
// opponent-depletion mill is genuine SUPPORT here, since fueling your own
// graveyard is precisely this archetype's enabler role.
const stitchersSupplier = {
  name: "Stitcher's Supplier",
  oracleText: "When this creature enters or dies, mill three cards.",
  typeLine: "Creature — Zombie",
  manaCost: "{U}",
  colorIdentity: ["U"],
};

test("graveyard opens on a real graveyard-value commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(muldrotha).packageIds.includes("graveyard"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("graveyard"));
});

test("graveyard opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a graveyard value deck with delirium and threshold" } });
  assert.ok(intent.packageIds.includes("graveyard"));
});

test("graveyard core is general graveyard value, not a reanimation spell (incidental-rider)", () => {
  const intent = intentFor(muldrotha);
  assert.equal(cardSatisfiesPackageCore(tarmogoyf, "graveyard", intent), true);
  assert.equal(cardSatisfiesPackageCore(grimLavamancer, "graveyard", intent), false);
  assert.equal(cardIsPackageFalseFriend(grimLavamancer, "graveyard", intent), true);
  assert.equal(cardIsPackageFalseFriend(tarmogoyf, "graveyard", intent), false);
  // A real reanimation spell is neither core nor a flagged false friend —
  // it simply never matches graveyard's precise corePatterns, the same
  // out-of-scope outcome burn's own Flame Slash demonstrates.
  assert.equal(cardSatisfiesPackageCore(reanimate, "graveyard", intent), false);
  assert.equal(cardIsPackageFalseFriend(reanimate, "graveyard", intent), false);
});

test("graveyard support is self-mill/surveil setup, and the mill-package's own self-mill false friend is genuine support here", () => {
  const intent = intentFor(muldrotha);
  assert.equal(cardSatisfiesPackageSupport(stitchersSupplier, "graveyard", intent), true);
  assert.equal(cardSatisfiesPackageCore(stitchersSupplier, "graveyard", intent), false);
  // The graveyard-spending damage trap is excluded from support too — it is
  // a false friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(grimLavamancer, "graveyard", intent), false);
});

test("a real Muldrotha-shaped commander forges the graveyard-value payoff over an otherwise-identical graveyard-spending damage trap", () => {
  const bguFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const bguLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Bant Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B}, {G}, or {U}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "G", "U"],
    producedMana: ["B", "G", "U"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: muldrotha,
    cards: [...bguFiller, tarmogoyf, grimLavamancer, ...bguLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("graveyard"), "Muldrotha's deck should carry the graveyard package");
  assert.ok(names.has("Tarmogoyf"), "the real graveyard-value payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(tarmogoyf, "graveyard", intent), true);
  assert.equal(cardSatisfiesPackageCore(grimLavamancer, "graveyard", intent), false);
});
