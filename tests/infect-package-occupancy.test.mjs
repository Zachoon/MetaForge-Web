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
// Founder #031 (batch 4) — Infect
// =============================================================================
// Core is the Infect/Toxic keyword mechanic itself and real poison-counter
// payoffs. False-friend shape: wrong-target-scope, generalized to a
// grant-vs-negate POLARITY mismatch. Melira, Sylvok Outcast mentions
// "infect"/"poison counters" as broadly as any real payoff card, but every
// clause is a negation (lose/can't) — infect HATE, not infect.
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

// Real card, verified via Scryfall (2026-08-19): Skithiryx, the Blight
// Dragon — the archetype's own namesake infect commander.
const skithiryx = {
  name: "Skithiryx, the Blight Dragon",
  colors: ["B"],
  oracleText: "Flying\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\n{B}: Skithiryx gains haste until end of turn.\n{B}{B}: Regenerate Skithiryx.",
  typeLine: "Legendary Creature — Phyrexian Dragon Skeleton",
  manaCost: "{3}{B}{B}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Vishgraz, the Doomhive —
// a granted-toxic, poison-scaling payoff distinct from the keyword itself.
const vishgraz = {
  name: "Vishgraz, the Doomhive",
  oracleText: "Menace, toxic 1 (Players dealt combat damage by this creature also get a poison counter.)\nWhen Vishgraz enters, create three 1/1 colorless Phyrexian Mite artifact creature tokens with toxic 1 and \"This token can't block.\"\nVishgraz gets +1/+1 for each poison counter your opponents have.",
  typeLine: "Legendary Creature — Phyrexian Insect",
  manaCost: "{2}{W}{B}{G}",
  colorIdentity: ["B", "G", "W"],
};

// Real card, verified via Scryfall (2026-08-19): Melira, Sylvok Outcast —
// infect HATE, not infect. Every clause negates the archetype's promise.
const melira = {
  name: "Melira, Sylvok Outcast",
  oracleText: "You can't get poison counters.\nCreatures you control can't have -1/-1 counters put on them.\nCreatures your opponents control lose infect.",
  typeLine: "Legendary Creature — Human Scout",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): a proliferate enabler —
// grows poison counters without itself being the payoff.
const proliferateEngine = {
  name: "Tekuthal, Inquiry Dominus",
  oracleText: "Flying\nIf you would proliferate, proliferate twice instead.",
  typeLine: "Legendary Creature — Phyrexian Horror",
  manaCost: "{2}{U}{U}",
  colorIdentity: ["U"],
};

test("infect opens on a real infect commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(skithiryx).packageIds.includes("infect"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("infect"));
});

test("infect opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an infect deck built around poison counters" } });
  assert.ok(intent.packageIds.includes("infect"));
});

test("infect core is the keyword/poison payoff, not mere mention; a hate card is a wrong-target-scope false friend", () => {
  const intent = intentFor(skithiryx);
  assert.equal(cardSatisfiesPackageCore(vishgraz, "infect", intent), true);
  assert.equal(cardSatisfiesPackageCore(melira, "infect", intent), false);
  assert.equal(cardIsPackageFalseFriend(melira, "infect", intent), true);
  assert.equal(cardIsPackageFalseFriend(vishgraz, "infect", intent), false);
});

test("infect support is proliferate, not the infect/poison payoff itself", () => {
  const intent = intentFor(skithiryx);
  assert.equal(cardSatisfiesPackageSupport(proliferateEngine, "infect", intent), true);
  assert.equal(cardSatisfiesPackageCore(proliferateEngine, "infect", intent), false);
  // The infect-hate trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(melira, "infect", intent), false);
});

test("a real Skithiryx-shaped commander forges the poison payoff over an otherwise-identical hate card", () => {
  const bFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const bLands = Array.from({ length: 18 }, (_, i) => ({
    name: `Swamp Test ${i}`,
    oracleText: "({T}: Add {B}.)",
    typeLine: "Basic Land — Swamp",
    manaCost: "",
    colorIdentity: [],
    producedMana: ["B"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  // Recolored to mono-black so both fit inside Skithiryx's own color
  // identity — oracle text (what corePatterns/false-friend evaluate) is
  // unchanged from the real, Scryfall-verified cards above.
  const bVishgraz = { ...vishgraz, colorIdentity: ["B"], manaCost: "{4}{B}" };
  const bMelira = { ...melira, colorIdentity: ["B"], manaCost: "{1}{B}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: skithiryx,
    cards: [...bFiller, bVishgraz, bMelira, ...bLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("infect"), "Skithiryx's deck should carry the infect package");
  assert.ok(names.has("Vishgraz, the Doomhive"), "the real poison payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(bVishgraz, "infect", intent), true);
  assert.equal(cardSatisfiesPackageCore(bMelira, "infect", intent), false);
});
