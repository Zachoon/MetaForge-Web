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
// Founder #030 (batch 3) — Discard
// =============================================================================
// False-friend shape: incidental-rider, reused from Founder #028's
// counters_matter with discard-specific config. Big Score mentions discard,
// but only as a cost-gate paid to enable an unrelated dominant effect (card
// draw) — not a discard-matters payoff.
//
// Deliberately distinct from #029's wheels: wheels' own corePatterns require
// literal "whenever an opponent discards[^.]*(?:draw|create|add)" or a
// symmetric "each player discards their hand". Tergrid, God of Fright's
// actual text is "opponent sacrifices a nontoken permanent OR discards a
// permanent card" — "opponent discards" is never a contiguous substring — so
// she does not open wheels, and Nekusar, the Mindrazer's "whenever an
// opponent draws a card" never contains the word "discard" at all, so he
// does not open this package either.
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

// Real card, verified via Scryfall (2026-08-19): Tergrid, God of Fright —
// an opponent-discard value payoff, not a symmetric wheel or a punisher.
const tergrid = {
  name: "Tergrid, God of Fright",
  colors: ["B"],
  oracleText: "Menace\nWhenever an opponent sacrifices a nontoken permanent or discards a permanent card, you may put that card from a graveyard onto the battlefield under your control.",
  typeLine: "Legendary Creature — God",
  manaCost: "{3}{B}{B}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Mind Rot — targeted
// discard-as-removal, core rather than support.
const mindRot = {
  name: "Mind Rot",
  oracleText: "Target player discards two cards.",
  typeLine: "Sorcery",
  manaCost: "{2}{B}",
};

// Real card, verified via Scryfall (2026-08-19): Nekusar, the Mindrazer —
// a real wheels commander, confirming discard and wheels stay disjoint.
const nekusar = {
  name: "Nekusar, the Mindrazer",
  oracleText: "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar deals 1 damage to that player.",
  typeLine: "Legendary Creature — Zombie Wizard",
  manaCost: "{2}{U}{B}{R}",
};

// Real card, verified via Scryfall (2026-08-19): Big Score — discard is
// merely an additional cost paid to enable an unrelated draw spell.
const bigScore = {
  name: "Big Score",
  oracleText: "As an additional cost to cast this spell, discard a card.\nDraw two cards and create two Treasure tokens.",
  typeLine: "Instant",
  manaCost: "{3}{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Fauna Shaman — a discard
// outlet used as a tutor, support rather than the payoff itself.
const faunaShaman = {
  name: "Fauna Shaman",
  oracleText: "{G}, {T}, Discard a creature card: Search your library for a creature card, reveal it, put it into your hand, then shuffle.",
  typeLine: "Creature — Elf Shaman",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

test("discard opens on a real opponent-discard commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(tergrid).packageIds.includes("discard"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("discard"));
});

test("discard opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a discard matters deck full of madness and hand disruption" } });
  assert.ok(intent.packageIds.includes("discard"));
});

test("Tergrid does not open wheels and Nekusar does not open discard — disjoint triggers", () => {
  assert.ok(!intentFor(tergrid).packageIds.includes("wheels"));
  assert.ok(!intentFor(nekusar).packageIds.includes("discard"));
});

test("discard core is a real single-target/self-discard payoff, not a discard-gated draw spell (incidental-rider)", () => {
  const intent = intentFor(tergrid);
  assert.equal(cardSatisfiesPackageCore(mindRot, "discard", intent), true);
  assert.equal(cardSatisfiesPackageCore(bigScore, "discard", intent), false);
  assert.equal(cardIsPackageFalseFriend(bigScore, "discard", intent), true);
  assert.equal(cardIsPackageFalseFriend(mindRot, "discard", intent), false);
});

test("discard support is discard as a tool, not the payoff", () => {
  const intent = intentFor(tergrid);
  assert.equal(cardSatisfiesPackageSupport(faunaShaman, "discard", intent), true);
  assert.equal(cardSatisfiesPackageCore(faunaShaman, "discard", intent), false);
  // The cost-gated draw-spell trap is excluded from support too — it is a
  // false friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(bigScore, "discard", intent), false);
});

test("a real Tergrid-shaped commander forges the targeted-discard payoff over an otherwise-identical cost-gated draw spell", () => {
  const bFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Destroy target creature.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
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
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: tergrid,
    cards: [...bFiller, mindRot, bigScore, ...bLands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("discard"), "Tergrid's deck should carry the discard package");
  assert.ok(names.has("Mind Rot"), "the real targeted-discard payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(mindRot, "discard", intent), true);
  assert.equal(cardSatisfiesPackageCore(bigScore, "discard", intent), false);
});
