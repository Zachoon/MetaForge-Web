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
// Founder #032 (batch 5, final) — -1/-1 Counters
// =============================================================================
// Core is real -1/-1-counter placement and its payoffs, deliberately
// distinct from #028's counters_matter (+1/+1-shaped) and #031's infect
// (poison counters on players, not -1/-1 counters on creatures). False-
// friend shape: wrong-target-scope, a self-cost-vs-payoff scope mismatch.
// Devoted Druid mentions "-1/-1 counter" as broadly as any real payoff card,
// but the counter goes on "this creature" (itself, as a mana-ramp cost),
// never on a target/another/each creature the way every real core fixture
// does.
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

// Real card, verified via Scryfall (2026-08-19): Hapatra, Vizier of Poisons —
// the archetype's own canonical EDH -1/-1 counters commander.
const hapatra = {
  name: "Hapatra, Vizier of Poisons",
  colors: ["B", "G"],
  oracleText: "Whenever Hapatra deals combat damage to a player, you may put a -1/-1 counter on target creature.\nWhenever you put one or more -1/-1 counters on a creature, create a 1/1 green Snake creature token with deathtouch.",
  typeLine: "Legendary Creature — Human Cleric",
  manaCost: "{B}{G}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): The Scorpion God — a
// -1/-1-counter death payoff using a different real corePattern.
const scorpionGod = {
  name: "The Scorpion God",
  oracleText: "Whenever a creature with a -1/-1 counter on it dies, draw a card.\n{1}{B}{R}: Put a -1/-1 counter on another target creature.\nWhen The Scorpion God dies, return it to its owner's hand at the beginning of the next end step.",
  typeLine: "Legendary Creature — God",
  manaCost: "{3}{B}{R}",
  colorIdentity: ["B", "R"],
};

// Real card, verified via Scryfall (2026-08-19): Devoted Druid — mentions
// "-1/-1 counter" but only as a self-targeted activation cost for mana ramp,
// never a target/another/each placement or payoff.
const devotedDruid = {
  name: "Devoted Druid",
  oracleText: "{T}: Add {G}.\nPut a -1/-1 counter on this creature: Untap this creature.",
  typeLine: "Creature — Elf Druid",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): counters_matter's own
// commander fixture (see tests/counters-matter-package-occupancy.test.mjs)
// — Vorel doubles counters on artifact/creature/land generically and never
// says "-1/-1" anywhere.
const vorel = {
  name: "Vorel of the Hull Clade",
  oracleText: "{G}{U}, {T}: Double the number of each kind of counter on target artifact, creature, or land.",
  typeLine: "Legendary Creature — Human Merfolk",
  manaCost: "{1}{G}{U}",
  colorIdentity: ["G", "U"],
};

// Real card, verified via Scryfall (2026-08-19): infect's own commander
// fixture (see tests/infect-package-occupancy.test.mjs) — Skithiryx's own
// Infect reminder text literally says "-1/-1 counters", but the verb is
// "deals damage ... in the form of", never "put ... on target/another/each",
// so she never satisfies this entry's own corePatterns.
const skithiryx = {
  name: "Skithiryx, the Blight Dragon",
  oracleText: "Flying\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\n{B}: Skithiryx gains haste until end of turn.\n{B}{B}: Regenerate Skithiryx.",
  typeLine: "Legendary Creature — Phyrexian Dragon Skeleton",
  manaCost: "{3}{B}{B}",
  colorIdentity: ["B"],
};

test("neg_counters opens on a real -1/-1 counters commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(hapatra).packageIds.includes("neg_counters"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("neg_counters"));
});

test("neg_counters opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a -1/-1 counters wither deck" } });
  assert.ok(intent.packageIds.includes("neg_counters"));
});

test("neg_counters core is real placement/payoff, not a self-targeted cost (wrong-target-scope)", () => {
  const intent = intentFor(hapatra);
  assert.equal(cardSatisfiesPackageCore(scorpionGod, "neg_counters", intent), true);
  assert.equal(cardSatisfiesPackageCore(devotedDruid, "neg_counters", intent), false);
  assert.equal(cardIsPackageFalseFriend(devotedDruid, "neg_counters", intent), true);
  assert.equal(cardIsPackageFalseFriend(scorpionGod, "neg_counters", intent), false);
});

test("neg_counters support is proliferate, not the placement/payoff itself", () => {
  const intent = intentFor(hapatra);
  const proliferateCard = { name: "Test Proliferator", oracleText: "{2}: Proliferate.", typeLine: "Artifact", manaCost: "{2}" };
  assert.equal(cardSatisfiesPackageSupport(proliferateCard, "neg_counters", intent), true);
  assert.equal(cardSatisfiesPackageCore(proliferateCard, "neg_counters", intent), false);
  // The self-cost trap is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(devotedDruid, "neg_counters", intent), false);
});

test("neg_counters, counters_matter, and infect are disjoint: a -1/-1-counter commander doesn't cross-open either", () => {
  const hapatraIntent = intentFor(hapatra);
  assert.ok(hapatraIntent.packageIds.includes("neg_counters"));
  assert.ok(!hapatraIntent.packageIds.includes("counters_matter"));
  assert.ok(!hapatraIntent.packageIds.includes("infect"));

  const vorelIntent = intentFor(vorel);
  assert.ok(vorelIntent.packageIds.includes("counters_matter"));
  assert.ok(!vorelIntent.packageIds.includes("neg_counters"));

  const skithiryxIntent = intentFor(skithiryx);
  assert.ok(skithiryxIntent.packageIds.includes("infect"));
  assert.ok(!skithiryxIntent.packageIds.includes("neg_counters"));
});

test("a real Hapatra-shaped commander forges the -1/-1 counters payoff over an otherwise-identical self-cost trap", () => {
  const bgFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const bgDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Overgrown Tomb ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {B} or {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "G"],
    producedMana: ["B", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const bgScorpionGod = { ...scorpionGod, colorIdentity: ["B", "G"] };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: hapatra,
    cards: [...bgFiller, bgScorpionGod, devotedDruid, ...bgDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("neg_counters"), "Hapatra's deck should carry the neg_counters package");
  assert.ok(names.has("The Scorpion God"), "the real -1/-1 counters payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(bgScorpionGod, "neg_counters", intent), true);
  assert.equal(cardSatisfiesPackageCore(devotedDruid, "neg_counters", intent), false);
});
