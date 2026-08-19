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
// Founder #033 (batch 6) — Energy
// =============================================================================
// Core is the Energy counter RESOURCE POOL itself — producing it ("you get
// {E}") and spending it ("pay {E}: [effect]"), not a permanent-attached
// counter. False-friend shape: wrong-target-scope, a bare-word-vs-mana-symbol
// mismatch. Death Tyrant's own ability name "Negative Energy Cone" mentions
// "energy" as broadly as any real payoff card, but never uses the {E} symbol
// anywhere in its actual oracle text.
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

// Real card, verified via Scryfall (2026-08-19): Nissa, Worldsoul Speaker —
// a real legendary-creature commander whose own Landfall trigger produces
// Energy directly.
const nissa = {
  name: "Nissa, Worldsoul Speaker",
  oracleText: "Landfall — Whenever a land you control enters, you get {E}{E} (two energy counters).\nYou may pay eight {E} rather than pay the mana cost for permanent spells you cast.",
  typeLine: "Legendary Creature — Elf Druid",
  manaCost: "{3}{G}",
  colorIdentity: ["G"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Longtusk Cub — a genuine
// core payoff that spends energy for a permanent +1/+1 counter, proving a
// single real card can legitimately occupy both energy and counters_matter
// without breaking commander-level disjointness.
const longtuskCub = {
  name: "Longtusk Cub",
  oracleText: "Whenever this creature deals combat damage to a player, you get {E}{E} (two energy counters).\nPay {E}{E}: Put a +1/+1 counter on this creature.",
  typeLine: "Creature — Cat",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): Death Tyrant — an ability
// named "Negative Energy Cone" mentions "energy" but never uses the {E}
// symbol; its actual effect is an unrelated death-trigger token maker.
const deathTyrant = {
  name: "Death Tyrant",
  oracleText: "Menace\nNegative Energy Cone — Whenever an attacking creature you control or a blocking creature an opponent controls dies, create a 2/2 black Zombie creature token.\n{5}{B}: Return this card from your graveyard to the battlefield tapped.",
  typeLine: "Creature — Beholder Skeleton",
  manaCost: "{4}{B}{B}",
  colorIdentity: ["B"],
};

// Real card, verified via Scryfall (2026-08-19): counters_matter's own
// commander fixture — Vorel of the Hull Clade never says "{E}" anywhere.
const vorel = {
  name: "Vorel of the Hull Clade",
  oracleText: "{G}{U}, {T}: Double the number of each kind of counter on target artifact, creature, or land.",
  typeLine: "Legendary Creature — Human Merfolk",
  manaCost: "{1}{G}{U}",
  colorIdentity: ["G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): neg_counters' own commander
// fixture — Hapatra, Vizier of Poisons never says "{E}" anywhere.
const hapatra = {
  name: "Hapatra, Vizier of Poisons",
  oracleText: "Whenever Hapatra deals combat damage to a player, you may put a -1/-1 counter on target creature.\nWhenever you put one or more -1/-1 counters on a creature, create a 1/1 green Snake creature token with deathtouch.",
  typeLine: "Legendary Creature — Human Cleric",
  manaCost: "{B}{G}",
  colorIdentity: ["B", "G"],
};

test("energy opens on a real Energy commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(nissa).packageIds.includes("energy"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("energy"));
});

test("energy opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an energy counters matter deck" } });
  assert.ok(intent.packageIds.includes("energy"));
});

test("energy core is the {E} resource pool, not the bare word 'energy' (wrong-target-scope)", () => {
  const intent = intentFor(nissa);
  assert.equal(cardSatisfiesPackageCore(longtuskCub, "energy", intent), true);
  assert.equal(cardSatisfiesPackageCore(deathTyrant, "energy", intent), false);
  assert.equal(cardIsPackageFalseFriend(deathTyrant, "energy", intent), true);
  assert.equal(cardIsPackageFalseFriend(longtuskCub, "energy", intent), false);
});

test("energy support is a cost-discount enabler, not the pool itself", () => {
  const intent = intentFor(nissa);
  const blasterHulkClause = { name: "Test Energy Discount Fragment", oracleText: "This spell costs {1} less to cast for each {E} (energy counter) you've paid or lost this turn.", typeLine: "Artifact Creature — Test", manaCost: "{3}" };
  assert.equal(cardSatisfiesPackageSupport(blasterHulkClause, "energy", intent), true);
  assert.equal(cardSatisfiesPackageCore(blasterHulkClause, "energy", intent), false);
  // The bare-word trap is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(deathTyrant, "energy", intent), false);
});

test("energy, counters_matter, and neg_counters are disjoint: a real Energy commander doesn't cross-open either, and vice versa", () => {
  const nissaIntent = intentFor(nissa);
  assert.ok(nissaIntent.packageIds.includes("energy"));
  assert.ok(!nissaIntent.packageIds.includes("counters_matter"));
  assert.ok(!nissaIntent.packageIds.includes("neg_counters"));

  const vorelIntent = intentFor(vorel);
  assert.ok(vorelIntent.packageIds.includes("counters_matter"));
  assert.ok(!vorelIntent.packageIds.includes("energy"));

  const hapatraIntent = intentFor(hapatra);
  assert.ok(hapatraIntent.packageIds.includes("neg_counters"));
  assert.ok(!hapatraIntent.packageIds.includes("energy"));
});

test("Longtusk Cub legitimately occupies two roles: CORE for energy's own promise, CORE for counters_matter's own +1/+1 promise too", () => {
  const nissaIntent = intentFor(nissa);
  assert.equal(cardSatisfiesPackageCore(longtuskCub, "energy", nissaIntent), true);
  assert.equal(cardSatisfiesPackageCore(longtuskCub, "counters_matter", nissaIntent), true);
});

test("a real Nissa-shaped commander forges the {E} resource payoff over an otherwise-identical bare-word trap", () => {
  const gFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target artifact or enchantment.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Forest ${i}`,
    oracleText: "{T}: Add {G}.",
    typeLine: "Basic Land — Forest",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["G"],
    popularityRank: 5,
    priceUsd: 0.1,
  }));
  const gLongtuskCub = { ...longtuskCub, colorIdentity: ["G"] };
  const gDeathTyrant = { ...deathTyrant, colorIdentity: ["G"], manaCost: "{4}{G}{G}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: nissa,
    cards: [...gFiller, gLongtuskCub, gDeathTyrant, ...gDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("energy"), "Nissa's deck should carry the energy package");
  assert.ok(names.has("Longtusk Cub"), "the real {E} resource payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(gLongtuskCub, "energy", intent), true);
  assert.equal(cardSatisfiesPackageCore(gDeathTyrant, "energy", intent), false);
});
