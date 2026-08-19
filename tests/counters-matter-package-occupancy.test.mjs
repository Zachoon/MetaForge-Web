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
// Founder #028 (proof of concept) — +1/+1 Counters matter
// =============================================================================
// False-friend shape: incidental-rider. A card whose dominant effect is
// something else entirely (removal, exile, damage, draw) that mentions a
// +1/+1 counter only as a minor rider clause gated behind an unrelated
// condition is not counters-matter core, even though the oracle text
// technically contains "+1/+1 counter".
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

// Real card, verified via Scryfall (2026-08-18): Vorel of the Hull Clade.
// Its doubling ability is worded generically ("each kind of counter"), the
// way real Magic templating always phrases doubling effects (Doubling
// Season does the same) — never literally "+1/+1 counter".
const vorel = {
  name: "Vorel of the Hull Clade",
  colors: ["G", "U"],
  oracleText: "{G}{U}, {T}: Double the number of each kind of counter on target artifact, creature, or land.",
  typeLine: "Legendary Creature — Human Merfolk",
  manaCost: "{1}{G}{U}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

const steadyGrowth = {
  name: "Steady Growth",
  oracleText: "Put a +1/+1 counter on target creature you control.",
  typeLine: "Sorcery",
  manaCost: "{1}{G}",
};

// The brief's own false-friend example: a removal spell whose +1/+1 counter
// clause is a minor rider gated behind an unrelated condition, not the
// spell's own dominant effect.
const sunderingGrowth = {
  name: "Sundering Growth",
  oracleText: "Destroy target creature. If you control a Human, put a +1/+1 counter on target creature you control.",
  typeLine: "Instant",
  manaCost: "{2}{G}",
};

// Bare keyword line (no reminder text) — genuinely support, not core: it
// never mentions "+1/+1 counter" at all, so it can't accidentally clear any
// core pattern the way a fully-reminder-texted keyword card would.
const ridgelineDrake = {
  name: "Ridgeline Drake",
  oracleText: "Flying. Adapt 3",
  typeLine: "Creature — Drake",
  manaCost: "{3}{G}",
};

test("counters_matter opens on a doubling-effect commander (generic wording, not literal '+1/+1') and stays closed on an unrelated one", () => {
  assert.ok(intentFor(vorel).packageIds.includes("counters_matter"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("counters_matter"));
});

test("counters_matter opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "Building a hardened scales +1/+1 counters matter shell" } });
  assert.ok(intent.packageIds.includes("counters_matter"));
});

test("counters_matter core is real counter placement, not an incidental removal-spell rider", () => {
  const intent = intentFor(vorel);
  assert.equal(cardSatisfiesPackageCore(steadyGrowth, "counters_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(sunderingGrowth, "counters_matter", intent), false);
  assert.equal(cardIsPackageFalseFriend(sunderingGrowth, "counters_matter", intent), true);
  assert.equal(cardIsPackageFalseFriend(steadyGrowth, "counters_matter", intent), false);
});

test("counters_matter support is self-buff counter keywords, not core placement", () => {
  const intent = intentFor(vorel);
  assert.equal(cardSatisfiesPackageSupport(ridgelineDrake, "counters_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(ridgelineDrake, "counters_matter", intent), false);
  // The rider trap is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(sunderingGrowth, "counters_matter", intent), false);
});

test("a real Vorel-shaped commander forges the counter payoff over an otherwise-identical rider trap", () => {
  const guFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}{U}", colorIdentity: ["G", "U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const guDuals = Array.from({ length: 20 }, (_, i) => ({
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
    commander: vorel,
    cards: [...guFiller, steadyGrowth, sunderingGrowth, ...guDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("counters_matter"), "Vorel's deck should carry the counters_matter package");
  assert.ok(names.has("Steady Growth"), "the real counter-placement payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(steadyGrowth, "counters_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(sunderingGrowth, "counters_matter", intent), false);
});
