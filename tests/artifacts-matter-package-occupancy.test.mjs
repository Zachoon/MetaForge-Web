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
// Founder #028 (proof of concept) — Artifacts-matter
// =============================================================================
// False-friend shape: broad-type-superset. A plain vanilla artifact is not
// automatically core just because its type line says "Artifact" — core is
// the payoff (metalcraft / affinity / artifacts-you-control / artifact-enters
// watchers), not the type. Also proves the archetype-catalog commander path
// reuses Founder #027's commanderPayoffMagnitudeGates for a T'Challa-shaped
// commander whose only artifact tie is a magnitude-qualified cast trigger,
// rather than re-deriving that parse.
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

const metalworkAegis = {
  name: "Test Metalwork Aegis",
  colors: ["W"],
  oracleText: "Metalcraft — As long as you control three or more artifacts, creatures you control get +1/+1.",
  typeLine: "Legendary Creature — Human Artificer",
  manaCost: "{2}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-18): T'Challa, the Black Panther
// (Marvel Super Heroes Commander). Its only artifact tie is a magnitude-
// qualified cast trigger — no "artifacts you control" / metalcraft / affinity
// phrasing anywhere in its text.
const tchalla = {
  name: "T'Challa, the Black Panther",
  colors: ["G", "W"],
  oracleText: "Whenever T'Challa enters or attacks, create a tapped Vibranium token. (It's an artifact with indestructible and \"{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.\")\nWhenever you cast an artifact spell with mana value 4 or greater, put two +1/+1 counters on T'Challa.",
  typeLine: "Legendary Creature — Human Noble Hero",
  manaCost: "{1}{G}{W}",
};

// Synthetic, magnitude-gated-only commander — invented name, mirrors Founder
// #027's own test fixtures. Its wording ("whenever you play an artifact
// permanent") deliberately does not match any of the generic
// artifacts_matter oracle patterns, so opening the package for it can only
// happen through the commanderPayoffMagnitudeGates reuse, proving that path
// is doing real, independent work rather than being redundant with the
// generic patterns.
const magnitudeOnlyCommander = {
  name: "Test Forge Sentinel",
  colors: ["R"],
  oracleText: "Whenever you play an artifact permanent with mana value 6 or greater, this creature deals 3 damage to any target.",
  typeLine: "Legendary Creature — Construct",
  manaCost: "{3}{R}",
};

const artifactPayoffCore = {
  name: "Circuit Breaker",
  oracleText: "Whenever an artifact enters the battlefield under your control, draw a card.",
  typeLine: "Creature — Human Artificer",
  manaCost: "{2}{U}",
};

const vanillaArtifact = {
  name: "Iron Cog",
  oracleText: "This artifact enters tapped.",
  typeLine: "Artifact",
  manaCost: "{2}",
};

const relicSeeker = {
  name: "Relic Seeker",
  oracleText: "Search your library for an artifact card, reveal it, put it into your hand, then shuffle.",
  typeLine: "Creature — Human Scout",
  manaCost: "{2}{W}",
};

test("artifacts_matter opens on a metalcraft/anthem commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(metalworkAegis).packageIds.includes("artifacts_matter"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("artifacts_matter"));
});

test("artifacts_matter opens on a real T'Challa-shaped commander via the #027 magnitude-gate reuse, not a generic pattern only", () => {
  const intent = intentFor(tchalla);
  assert.ok(intent.packageIds.includes("artifacts_matter"), "T'Challa's own magnitude-qualified artifact trigger should open the package");
});

test("artifacts_matter opens on a magnitude-gated-only commander whose wording never matches the generic archetype patterns", () => {
  const intent = intentFor(magnitudeOnlyCommander);
  assert.ok(intent.packageIds.includes("artifacts_matter"), "commanderPayoffMagnitudeGates reuse must independently open the package");
});

test("artifacts_matter opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an artifacts matter shell with big colorless threats" } });
  assert.ok(intent.packageIds.includes("artifacts_matter"));
});

test("artifacts_matter core is the payoff, not the type; a vanilla artifact is a broad-type-superset false friend", () => {
  const intent = intentFor(metalworkAegis);
  assert.equal(cardSatisfiesPackageCore(artifactPayoffCore, "artifacts_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(vanillaArtifact, "artifacts_matter", intent), false);
  assert.equal(cardIsPackageFalseFriend(vanillaArtifact, "artifacts_matter", intent), true);
  assert.equal(cardIsPackageFalseFriend(artifactPayoffCore, "artifacts_matter", intent), false);
});

test("artifacts_matter support is artifact tutoring/recursion/protection, not raw type density", () => {
  const intent = intentFor(metalworkAegis);
  assert.equal(cardSatisfiesPackageSupport(relicSeeker, "artifacts_matter", intent), true);
  // A vanilla artifact is excluded from support too — it is a false friend,
  // not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(vanillaArtifact, "artifacts_matter", intent), false);
});

test("a real T'Challa-shaped commander forges the payoff card over an otherwise-identical vanilla artifact", () => {
  const gwFiller = [
    ...Array.from({ length: 26 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Test", manaCost: "{2}{G}{W}", colorIdentity: ["G", "W"] })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{G}", colorIdentity: ["G"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof and indestructible until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"] })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [] })),
  ];
  const gwDuals = Array.from({ length: 20 }, (_, i) => ({
    name: `Canopy Gate ${i}`,
    oracleText: "This land enters the battlefield tapped. {T}: Add {G} or {W}.",
    typeLine: "Land",
    manaCost: "",
    colorIdentity: ["G", "W"],
    producedMana: ["G", "W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: tchalla,
    cards: [...gwFiller, artifactPayoffCore, vanillaArtifact, ...gwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("artifacts_matter"), "T'Challa's deck should carry the artifacts_matter package");
  assert.ok(names.has("Circuit Breaker"), "the real artifact-enters payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(artifactPayoffCore, "artifacts_matter", intent), true);
  assert.equal(cardSatisfiesPackageCore(vanillaArtifact, "artifacts_matter", intent), false);
});
