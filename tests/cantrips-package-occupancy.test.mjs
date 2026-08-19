import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectSpellslingerCommander,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #034 (batch 7, final) — Cantrips
// =============================================================================
// Core is cheap, replacement-value spells and payoffs for casting many of
// them, deliberately narrower than the original PACKAGE_CATALOG's own
// `spellslinger` entry (ANY instant/sorcery with mana value <= 2, regardless
// of text). CRITICAL overlap risk named by the task. Card-level overlap is
// real and legitimate (every cantrip is also spellslinger fuel, the same
// graveyard/reanimator precedent), but commander-level detection is clean:
// Jori En, Ruin Diver's own real trigger ("Whenever you cast your second
// spell each turn, draw a card.") never says "instant"/"sorcery"/
// "noncreature"/magecraft, so it never trips spellslinger's own
// detectSpellslingerCommander. False-friend shape: wrong-target-scope —
// Kalamax, the Stormsire mentions the same "cast your Nth spell each turn"
// construction but rewards a COPY (spell_copy's own territory), not a draw.
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

// Real card, verified via Scryfall (2026-08-19): Jori En, Ruin Diver — the
// canonical real Cantrips commander.
const joriEn = {
  name: "Jori En, Ruin Diver",
  oracleText: "Whenever you cast your second spell each turn, draw a card.",
  typeLine: "Legendary Creature — Merfolk Wizard",
  manaCost: "{1}{U}{R}",
  colorIdentity: ["U", "R"],
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Kraum, Violent Cacophony —
// a second independent real Cantrips commander fixture.
const kraum = {
  name: "Kraum, Violent Cacophony",
  oracleText: "Flying\nWhenever you cast your second spell each turn, put a +1/+1 counter on Kraum and draw a card.",
  typeLine: "Legendary Creature — Zombie Horror",
  manaCost: "{2}{U}{R}",
  colorIdentity: ["U", "R"],
};

// Real card, verified via Scryfall (2026-08-19): Opt — the card-neutral
// scry-then-draw cantrip template.
const opt = {
  name: "Opt",
  oracleText: "Scry 1. (Look at the top card of your library. You may put that card on the bottom.)\nDraw a card.",
  typeLine: "Instant",
  manaCost: "{U}",
  colorIdentity: ["U"],
};

// Real card, verified via Scryfall (2026-08-19): Shock — spellslinger's own
// cheap-spell fixture, with no draw/cantrip text at all.
const shock = {
  name: "Shock",
  oracleText: "Shock deals 2 damage to any target.",
  typeLine: "Instant",
  manaCost: "{R}",
  colorIdentity: ["R"],
};

// Real card, verified via Scryfall (2026-08-19): Kalamax, the Stormsire —
// mentions the same "cast your Nth spell each turn" construction as Jori En,
// but its reward is a COPY, not a draw — spell_copy's own real fixture (see
// tests/spell-copy-package-occupancy.test.mjs).
const kalamax = {
  name: "Kalamax, the Stormsire",
  oracleText: "Whenever you cast your first instant spell each turn, if Kalamax is tapped, copy that spell. You may choose new targets for the copy.\nWhenever you copy an instant spell, put a +1/+1 counter on Kalamax.",
  typeLine: "Legendary Creature — Elemental Dinosaur",
  manaCost: "{1}{G}{U}{R}",
  colorIdentity: ["G", "U", "R"],
};

// Real card, verified via Scryfall (2026-08-19): Baral, Chief of
// Compliance — a cost-reduction enabler, not the payoff or the cantrip
// itself.
const baral = {
  name: "Baral, Chief of Compliance",
  oracleText: "Instant and sorcery spells you cast cost {1} less to cast.\nWhenever a spell or ability you control counters a spell, you may draw a card. If you do, discard a card.",
  typeLine: "Legendary Creature — Human Wizard",
  manaCost: "{1}{U}",
  colorIdentity: ["U"],
};

test("cantrips opens on a real Cantrips commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(joriEn).packageIds.includes("cantrips"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("cantrips"));
});

test("cantrips opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a cantrips deck full of cheap card draw" } });
  assert.ok(intent.packageIds.includes("cantrips"));
});

test("Jori En's own real trigger never trips spellslinger's own commander detection", () => {
  assert.equal(detectSpellslingerCommander(joriEn.oracleText), false);
  const joriIntent = intentFor(joriEn);
  assert.ok(!joriIntent.packageIds.includes("spellslinger"));
});

test("cantrips core is the Nth-spell-each-turn draw payoff and the scry/surveil-then-draw spell shape", () => {
  const intent = intentFor(joriEn);
  assert.equal(cardSatisfiesPackageCore(opt, "cantrips", intent), true);
  assert.equal(cardSatisfiesPackageCore(kraum, "cantrips", intent), true);
  assert.equal(cardSatisfiesPackageCore(shock, "cantrips", intent), false);
});

test("a cheap replacement spell is legitimately BOTH cantrips core and spellslinger's own cheap_spell core — the same real graveyard/reanimator style co-occupancy", () => {
  const spellslingerArchmage = {
    name: "Test Archmage",
    colors: ["U", "R"],
    oracleText: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
    typeLine: "Legendary Creature — Wizard",
    manaCost: "{2}{U}{R}",
  };
  assert.equal(cardSatisfiesPackageCore(opt, "spellslinger", intentFor(spellslingerArchmage)), true);
  assert.equal(cardSatisfiesPackageCore(opt, "cantrips", intentFor(joriEn)), true);
});

test("cantrips core requires an explicit draw reward, not merely the Nth-spell-each-turn mention (wrong-target-scope)", () => {
  const intent = intentFor(joriEn);
  assert.equal(cardSatisfiesPackageCore(kalamax, "cantrips", intent), false);
  assert.equal(cardIsPackageFalseFriend(kalamax, "cantrips", intent), true);
  assert.equal(cardIsPackageFalseFriend(kraum, "cantrips", intent), false);
});

test("cantrips support is a cost-reduction enabler, not the payoff or the cantrip itself", () => {
  const intent = intentFor(joriEn);
  assert.equal(cardSatisfiesPackageSupport(baral, "cantrips", intent), true);
  assert.equal(cardSatisfiesPackageCore(baral, "cantrips", intent), false);
  assert.equal(cardSatisfiesPackageSupport(kalamax, "cantrips", intent), false);
});

test("cantrips and spell_copy are disjoint at the commander level: Jori En doesn't open spell_copy, Kalamax doesn't open cantrips", () => {
  const joriIntent = intentFor(joriEn);
  assert.ok(joriIntent.packageIds.includes("cantrips"));
  assert.ok(!joriIntent.packageIds.includes("spell_copy"));

  const kalamaxIntent = intentFor(kalamax);
  assert.ok(kalamaxIntent.packageIds.includes("spell_copy"));
  assert.ok(!kalamaxIntent.packageIds.includes("cantrips"));
});

test("a real Jori-En-shaped commander forges the real draw payoff over an otherwise-identical spell-copy trap", () => {
  const urFiller = [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Counter target spell.", typeLine: "Instant", manaCost: "{1}{U}", colorIdentity: ["U"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const urDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Steam Vents ${i}`,
    oracleText: "This land enters the battlefield tapped unless you pay 2 life. {T}: Add {U} or {R}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["U", "R"],
    producedMana: ["U", "R"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const urOpt = { ...opt, colorIdentity: ["U"] };
  const urKalamax = { ...kalamax };
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: joriEn,
    cards: [...urFiller, urOpt, urKalamax, ...urDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("cantrips"), "Jori En's deck should carry the cantrips package");
  assert.ok(names.has("Opt"), "the real cantrip should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(urOpt, "cantrips", intent), true);
  assert.equal(cardSatisfiesPackageCore(urKalamax, "cantrips", intent), false);
});
