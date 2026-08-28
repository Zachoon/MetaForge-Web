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
// Founder #029 (batch 2) — Enchantress
// =============================================================================
// False-friend shape: broad-type-superset, reused from Founder #028's
// artifacts_matter with typePattern /\bEnchantment\b/i. Rhystic Study's type
// line says Enchantment, but its payoff is a spell-tax draw engine with
// nothing to do with enchantments — structurally identical to a vanilla
// Artifact not being core to artifacts_matter.
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

// Real card, verified via Scryfall (2026-08-19): Sythis, Harvest's Hand.
const sythis = {
  name: "Sythis, Harvest's Hand",
  colors: ["G", "W"],
  oracleText: "Whenever you cast an enchantment spell, you gain 1 life and draw a card.",
  typeLine: "Legendary Enchantment Creature — Nymph",
  manaCost: "{G}{W}",
};

const inertGolem = {
  name: "Test Inert Golem",
  colors: [],
  oracleText: "Trample.",
  typeLine: "Legendary Creature — Golem",
  manaCost: "{4}",
};

// Real card, verified via Scryfall (2026-08-19): Argothian Enchantress —
// the archetype's own namesake.
const argothianEnchantress = {
  name: "Argothian Enchantress",
  oracleText: "Shroud (This creature can't be the target of spells or abilities.)\nWhenever you cast an enchantment spell, draw a card.",
  typeLine: "Creature — Human Druid",
  manaCost: "{1}{G}",
};

// Real card, verified via Scryfall (2026-08-19): Rhystic Study. Recolored to
// {1}{G} to fit the construction pool below — oracle text is unchanged. Its
// type line says Enchantment; its payoff is entirely unrelated to
// enchantments.
const rhysticStudy = {
  name: "Rhystic Study",
  oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",
  typeLine: "Enchantment",
  manaCost: "{1}{G}",
  colorIdentity: ["G"],
};

// Real card, verified via Scryfall (2026-08-19): Idyllic Tutor.
const idyllicTutor = {
  name: "Idyllic Tutor",
  oracleText: "Search your library for an enchantment card, reveal it, put it into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{W}",
};

test("enchantress opens on a real enchantment-cast-draw commander and stays closed on an unrelated one", () => {
  assert.ok(intentFor(sythis).packageIds.includes("enchantress"));
  assert.ok(!intentFor(inertGolem).packageIds.includes("enchantress"));
});

test("enchantress opens from a free-text note alias with an unrelated commander (note.aliases path)", () => {
  const intent = intentFor(inertGolem, { blueprint: { ...emptyBlueprint, source: "I want an enchantress deck that draws off constellation" } });
  assert.ok(intent.packageIds.includes("enchantress"));
});

test("enchantress core is the enchantment-triggered draw ability, not being an Enchantment", () => {
  const intent = intentFor(sythis);
  assert.equal(cardSatisfiesPackageCore(argothianEnchantress, "enchantress", intent), true);
  assert.equal(cardSatisfiesPackageCore(rhysticStudy, "enchantress", intent), false);
  assert.equal(cardIsPackageFalseFriend(rhysticStudy, "enchantress", intent), true);
  assert.equal(cardIsPackageFalseFriend(argothianEnchantress, "enchantress", intent), false);
});

test("enchantress support is enchantment tutoring/recursion/protection, not raw type density", () => {
  const intent = intentFor(sythis);
  assert.equal(cardSatisfiesPackageSupport(idyllicTutor, "enchantress", intent), true);
  // A generic-payoff Enchantment is excluded from support too — it is a
  // false friend, not real occupancy at either density level.
  assert.equal(cardSatisfiesPackageSupport(rhysticStudy, "enchantress", intent), false);
});

// Real cards, verified via Scryfall (2026-08-27): Enlightened Tutor and
// Three Dreams. Founder #101 — the support pattern only ever matched
// Idyllic Tutor's literal "an enchantment card"; these two real, iconic
// enchantress-support tutors use different real templates entirely.
const enlightenedTutor = {
  name: "Enlightened Tutor",
  oracleText: "Search your library for an artifact or enchantment card, reveal it, then shuffle and put that card on top.",
  typeLine: "Instant",
  manaCost: "{W}",
};
const threeDreams = {
  name: "Three Dreams",
  oracleText: "Search your library for up to three Aura cards with different names, reveal them, put them into your hand, then shuffle.",
  typeLine: "Sorcery",
  manaCost: "{2}{G}",
};

test("Founder #101: enchantress support recognizes real artifact-or-enchantment and Aura-specific tutors, not just the bare singular 'enchantment card' phrasing", () => {
  const intent = intentFor(sythis);
  assert.equal(cardSatisfiesPackageSupport(enlightenedTutor, "enchantress", intent), true, "Enlightened Tutor's 'an artifact or enchantment card' never contains the literal substring 'an enchantment card'");
  assert.equal(cardSatisfiesPackageSupport(threeDreams, "enchantress", intent), true, "Three Dreams tutors for Aura cards specifically, plural and quantified — a real, common enchantress-support template the old pattern never covered");
});

test("a real Sythis-shaped commander forges the enchantment payoff over an otherwise-identical off-theme Enchantment", () => {
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
    commander: sythis,
    cards: [...gwFiller, argothianEnchantress, rhysticStudy, ...gwDuals],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("enchantress"), "Sythis's deck should carry the enchantress package");
  assert.ok(names.has("Argothian Enchantress"), "the real enchantment-cast-draw payoff should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(argothianEnchantress, "enchantress", intent), true);
  assert.equal(cardSatisfiesPackageCore(rhysticStudy, "enchantress", intent), false);
});
