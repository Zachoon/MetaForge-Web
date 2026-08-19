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
// Founder #033 (batch 6) — Monarch
// =============================================================================
// Core is the Monarch mechanic itself — becoming the monarch and reward
// clauses conditioned on holding/observing the crown. False-friend shape:
// incidental-rider. Fight for the Throne mentions "you become the monarch"
// as literally as any real payoff card, but its dominant effect is an
// unrelated fight-style removal spell, and the monarch grant is a minor
// bonus gated behind an unrelated commander-control condition.
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

// Real card, verified via Scryfall (2026-08-19): Queen Marchesa — the
// archetype's own canonical EDH Monarch commander.
const marchesa = {
  name: "Queen Marchesa",
  oracleText: "Deathtouch, haste\nWhen Queen Marchesa enters, you become the monarch.\nAt the beginning of your upkeep, if an opponent is the monarch, create a 1/1 black Assassin creature token with deathtouch and haste.",
  typeLine: "Legendary Creature — Human Assassin",
  manaCost: "{1}{R}{W}{B}",
  colorIdentity: ["B", "R", "W"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Court of Ire — the Throne
// of Eldraine Court cycle's own conditional-payoff shape.
const courtOfIre = {
  name: "Court of Ire",
  oracleText: "When this enchantment enters, you become the monarch.\nAt the beginning of your upkeep, this enchantment deals 2 damage to any target. If you're the monarch, it deals 7 damage instead.",
  typeLine: "Enchantment",
  manaCost: "{2}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Fight for the Throne — a
// fight-style removal spell whose monarch grant is a minor rider gated
// behind an unrelated commander-control condition.
const fightForThrone = {
  name: "Fight for the Throne",
  oracleText: "Put a +1/+1 counter on target creature you control. Then it fights target creature an opponent controls. When the creature an opponent controls dies this turn, if you control your commander, you become the monarch.",
  typeLine: "Instant",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

test("monarch opens on a real Monarch commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(marchesa).packageIds.includes("monarch"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("monarch"));
});

test("monarch opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a monarch crown deck" } });
  assert.ok(intent.packageIds.includes("monarch"));
});

test("monarch core is the become/payoff construction itself, not any bare mention gated behind an unrelated dominant effect (incidental-rider)", () => {
  const intent = intentFor(marchesa);
  assert.equal(cardSatisfiesPackageCore(courtOfIre, "monarch", intent), true);
  assert.equal(cardSatisfiesPackageCore(fightForThrone, "monarch", intent), false);
  assert.equal(cardIsPackageFalseFriend(fightForThrone, "monarch", intent), true);
  assert.equal(cardIsPackageFalseFriend(courtOfIre, "monarch", intent), false);
});

test("monarch support is monarch-conditioned evasion/attack-restriction, not the grant/payoff itself", () => {
  const intent = intentFor(marchesa);
  const azureFleetAdmiralClause = { name: "Test Monarch Evasion Fragment", oracleText: "This creature can't be blocked by creatures the monarch controls.", typeLine: "Creature — Test", manaCost: "{2}{U}" };
  assert.equal(cardSatisfiesPackageSupport(azureFleetAdmiralClause, "monarch", intent), true);
  assert.equal(cardSatisfiesPackageCore(azureFleetAdmiralClause, "monarch", intent), false);
  // The gated-rider trap is excluded from support too — it is a false
  // friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(fightForThrone, "monarch", intent), false);
});

test("a real Marchesa-shaped commander forges the real become/payoff construction over an otherwise-identical gated-rider trap", () => {
  const rwbFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const rwbDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Blood Crypt ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {B} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R"],
    producedMana: ["B", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const rwbCourtOfIre = { ...courtOfIre, colorIdentity: ["B", "R", "W"] };
  const rwbFightForThrone = { ...fightForThrone, colorIdentity: ["B", "R", "W"], manaCost: "{1}{B}" };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: marchesa,
    cards: [...rwbFiller, rwbCourtOfIre, rwbFightForThrone, ...rwbDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("monarch"), "Marchesa's deck should carry the monarch package");
  assert.ok(names.has("Court of Ire"), "the real become/payoff construction should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(rwbCourtOfIre, "monarch", intent), true);
  assert.equal(cardSatisfiesPackageCore(rwbFightForThrone, "monarch", intent), false);
});
