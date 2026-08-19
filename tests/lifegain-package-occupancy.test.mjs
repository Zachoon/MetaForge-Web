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
// Founder #029 (batch 2) — Lifegain
// =============================================================================
// False-friend shape: incidental-rider, reused from Founder #028's counters_
// matter with lifegain-specific config. A card whose dominant effect is
// something else entirely (a fight-style combat-damage spell) that gains a
// minor, gated amount of life as a rider is not core, even though the oracle
// text technically contains "you gain N life".
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

// Real card, verified via Scryfall (2026-08-19): Karlov of the Ghost Council.
const karlov = {
  name: "Karlov of the Ghost Council",
  colors: ["W", "B"],
  oracleText: "Whenever you gain life, put two +1/+1 counters on Karlov.\n{W}{B}, Remove six +1/+1 counters from Karlov: Exile target creature.",
  typeLine: "Legendary Creature — Spirit Advisor",
  manaCost: "{W}{B}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Well of Lost Dreams. Colorless
// artifact, so it fits any commander's identity without recoloring.
const wellOfLostDreams = {
  name: "Well of Lost Dreams",
  oracleText: "Whenever you gain life, you may pay {X}, where X is less than or equal to the amount of life you gained. If you do, draw X cards.",
  typeLine: "Artifact",
  manaCost: "{4}",
  colorIdentity: [],
};

// Real card, verified via Scryfall (2026-08-19): Horrific Assault. Its
// dominant effect is a fight-style damage spell; the life gain is a minor
// rider gated behind an unrelated Eldrazi condition. Recolored to {1}{W} to
// fit the WB construction pool below — oracle text is unchanged.
const horrificAssault = {
  name: "Horrific Assault",
  oracleText: "Target creature you control deals damage equal to its power to target creature or planeswalker you don't control. If you control an Eldrazi, you gain 3 life.",
  typeLine: "Sorcery",
  manaCost: "{1}{W}",
  colorIdentity: ["W"],
};

// Real card, verified via Scryfall (2026-08-19): Rhox Faithmender — a
// reliable lifegain-doubling engine, not a reactive payoff.
const rhoxFaithmender = {
  name: "Rhox Faithmender",
  oracleText: "Lifelink\nIf you would gain life, you gain twice that much life instead.",
  typeLine: "Creature — Rhino Monk",
  manaCost: "{3}{W}",
};

test("lifegain opens on a real gain-life-payoff commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(karlov).packageIds.includes("lifegain"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("lifegain"));
});

test("lifegain opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a lifegain shell that turns life into cards" } });
  assert.ok(intent.packageIds.includes("lifegain"));
});

test("lifegain core is a real gain-life payoff or doubler, not an incidentally-gated life rider", () => {
  const intent = intentFor(karlov);
  assert.equal(cardSatisfiesPackageCore(wellOfLostDreams, "lifegain", intent), true);
  assert.equal(cardSatisfiesPackageCore(rhoxFaithmender, "lifegain", intent), true);
  assert.equal(cardSatisfiesPackageCore(horrificAssault, "lifegain", intent), false);
  assert.equal(cardIsPackageFalseFriend(horrificAssault, "lifegain", intent), true);
  assert.equal(cardIsPackageFalseFriend(wellOfLostDreams, "lifegain", intent), false);
});

test("lifegain support is raw production (lifelink granting, extort, flat gain-life sources), not the payoff itself", () => {
  const intent = intentFor(karlov);
  const teamLifelink = { name: "Test Vizkopa Charm", oracleText: "Creatures you control gain lifelink until end of turn.", typeLine: "Instant", manaCost: "{2}{W}" };
  assert.equal(cardSatisfiesPackageSupport(teamLifelink, "lifegain", intent), true);
  assert.equal(cardSatisfiesPackageCore(teamLifelink, "lifegain", intent), false);
  // The rider trap is excluded from support too — it is a false friend, not
  // real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(horrificAssault, "lifegain", intent), false);
});

test("a real Karlov-shaped commander forges the gain-life payoff over an otherwise-identical rider trap", () => {
  const wbFiller = [
    ...Array.from({ length: 26 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{W}{B}", colorIdentity: ["W", "B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const wbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Orzhov Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {W} or {B}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["W", "B"],
    producedMana: ["W", "B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: karlov,
    cards: [...wbFiller, wellOfLostDreams, horrificAssault, ...wbDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("lifegain"), "Karlov's deck should carry the lifegain package");
  assert.ok(names.has("Well of Lost Dreams"), "the real gain-life payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(wellOfLostDreams, "lifegain", intent), true);
  assert.equal(cardSatisfiesPackageCore(horrificAssault, "lifegain", intent), false);
});
