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
// Founder #060 — Land sacrifice
// =============================================================================
// Found via a real Hearthhull, the Worldseed decklist + Moxfield primer
// comparison. Before this fix, "sacrifice a land for value" had zero
// structural recognition anywhere in the engine: detectAristocratsCommander
// explicitly excludes non-creature sacrifice by its own design comment
// ("Artifact-sac commanders are not aristocrats"), lands_matter's four core
// patterns (landfall / a land entering / land-to-graveyard-then-draw) never
// match Hearthhull's real trigger, and the generic mechanical "sacrifice"
// signal never connects Hearthhull to its own real payoff cards (Squandered
// Resources, Zuran Orb, Crop Rotation, Sylvan Safekeeper) because both sides
// land on the REWARDS half of that signal with no producer counterpart —
// verified directly via commanderConnectionSignalsFor before building this.
// False-friend shape: wrong-target-scope, the same shape lands_matter's own
// neighbor entries (mill/wheels/clones) use for a broad-mention-vs-precise-
// scope mismatch.
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

// Real card, verified via Scryfall (2026-08-22): Hearthhull, the Worldseed.
const hearthhull = {
  name: "Hearthhull, the Worldseed",
  colors: ["B", "R", "G"],
  oracleText: "Station (Tap another creature you control: Put charge counters equal to its power on this Spacecraft. Station only as a sorcery. It's an artifact creature at 8+.)\n2+ | {1}, {T}, Sacrifice a land: Draw two cards. You may play an additional land this turn.\n8+ | Flying, vigilance, haste\nWhenever you sacrifice a land, each opponent loses 2 life.",
  typeLine: "Legendary Artifact — Spacecraft",
  manaCost: "{1}{B}{R}{G}",
};

// Real card, verified via Scryfall (2026-08-22): The Gitrog Monster — the
// other real commander most associated with this archetype, whose own
// trigger is the broader land-to-graveyard shape rather than pure sacrifice.
const gitrog = {
  name: "The Gitrog Monster",
  colors: ["B", "G"],
  oracleText: "Deathtouch\nAt the beginning of your upkeep, sacrifice The Gitrog Monster unless you sacrifice a land.\nYou may play an additional land on each of your turns.\nWhenever one or more land cards are put into your graveyard from anywhere, draw a card.",
  typeLine: "Legendary Creature — Frog Horror",
  manaCost: "{3}{B}{G}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-22): Squandered Resources.
const squanderedResources = {
  name: "Squandered Resources",
  oracleText: "Sacrifice a land: Add one mana of any type the sacrificed land could produce.",
  typeLine: "Enchantment",
  manaCost: "{1}{G}",
};

// Real card, verified via Scryfall (2026-08-22): Zuran Orb.
const zuranOrb = {
  name: "Zuran Orb",
  oracleText: "Sacrifice a land: You gain 2 life.",
  typeLine: "Artifact",
  manaCost: "{0}",
};

// Real card, verified via Scryfall (2026-08-22): Scapeshift — the "any
// number of" quantifier shape, the same one Founder #060 also widened
// PAYOFFS.sacrifice in forge-interaction-graph.mjs to cover.
const scapeshift = {
  name: "Scapeshift",
  oracleText: "Sacrifice any number of lands. Search your library for that many land cards, put them onto the battlefield tapped, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};

// Real card, verified via Scryfall (2026-08-22): Azusa, Lost but Seeking —
// an extra land drop refills the resource being sacrificed; enabler, not
// the payoff itself, the same role Rampant Growth plays for lands_matter.
const azusa = {
  name: "Azusa, Lost but Seeking",
  oracleText: "You may play two additional lands on each of your turns.",
  typeLine: "Legendary Creature — Human Monk",
  manaCost: "{1}{G}",
};

// A creature-sac edict whose effect happens to also destroy a land — false
// friend: mentions "sacrifice" near "land" without sacrificing a land itself.
const falseFriend = {
  name: "Test Land Edict",
  oracleText: "Sacrifice a creature. If you do, destroy target land.",
  typeLine: "Sorcery",
  manaCost: "{1}{B}",
};

test("land_sacrifice opens on a real land-sacrifice commander (Hearthhull) and a real land-to-graveyard commander (Gitrog), and stays closed on an unrelated one", () => {
  assert.ok(intentFor(hearthhull).packageIds.includes("land_sacrifice"));
  assert.ok(intentFor(gitrog).packageIds.includes("land_sacrifice"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("land_sacrifice"));
});

test("land_sacrifice opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want a land sacrifice deck" } });
  assert.ok(intent.packageIds.includes("land_sacrifice"));
});

test("land_sacrifice core is the real sacrifice-a-land-for-value shape (Squandered Resources, Zuran Orb, Scapeshift's 'any number of' quantifier), and correctly excludes a false friend that only mentions sacrifice near land", () => {
  const intent = intentFor(hearthhull);
  assert.equal(cardSatisfiesPackageCore(squanderedResources, "land_sacrifice", intent), true);
  assert.equal(cardSatisfiesPackageCore(zuranOrb, "land_sacrifice", intent), true);
  assert.equal(cardSatisfiesPackageCore(scapeshift, "land_sacrifice", intent), true);
  assert.equal(cardSatisfiesPackageCore(falseFriend, "land_sacrifice", intent), false);
  assert.equal(cardIsPackageFalseFriend(falseFriend, "land_sacrifice", intent), true);
  assert.equal(cardIsPackageFalseFriend(squanderedResources, "land_sacrifice", intent), false);
});

test("land_sacrifice support is refilling the resource (extra land drops), not the sacrifice-for-value payoff itself", () => {
  const intent = intentFor(hearthhull);
  assert.equal(cardSatisfiesPackageSupport(azusa, "land_sacrifice", intent), true);
  assert.equal(cardSatisfiesPackageCore(azusa, "land_sacrifice", intent), false);
  assert.equal(cardSatisfiesPackageSupport(falseFriend, "land_sacrifice", intent), false);
});

test("a real Hearthhull-shaped commander forges the real land-sacrifice payoff over an otherwise-identical false friend", () => {
  const brgFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{B}", colorIdentity: ["B"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Bolt ${i}`, oracleText: "This deals 2 damage to any target.", typeLine: "Instant", manaCost: "{R}", colorIdentity: ["R"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const brgDuals = Array.from({ length: 19 }, (_, i) => ({
    name: `Jund Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {B}, {R}, or {G}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["B", "R", "G"],
    producedMana: ["B", "R", "G"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: hearthhull,
    cards: [...brgFiller, squanderedResources, zuranOrb, falseFriend, ...brgDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("land_sacrifice"), "Hearthhull's deck should carry the land_sacrifice package");
  assert.ok(names.has("Squandered Resources") || names.has("Zuran Orb"), "a real land-sacrifice payoff is an engine piece");
  assert.equal(cardSatisfiesPackageCore(squanderedResources, "land_sacrifice", intent), true);
  assert.equal(cardSatisfiesPackageCore(falseFriend, "land_sacrifice", intent), false);
});
