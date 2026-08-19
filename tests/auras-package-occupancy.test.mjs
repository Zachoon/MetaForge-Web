import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectAurasCommander,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #028 gap closure — Auras (original PACKAGE_CATALOG entry)
// =============================================================================
// Generic-dispatch package: coreSemantics is the broad "aura" tag itself
// (Aura is already a precise subtype, unlike artifacts_matter's "Artifact"),
// falseFriendSemantics is ["non_aura_enchantment"], supportSemantics is
// ["aura_payoff", "protection"]. Real-card evidence verified via Scryfall
// (2026-08-19).
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

// Real card, verified via Scryfall (2026-08-19): Eriette of the Charmed
// Apple (Wilds of Eldraine Commander). "Auras you control" trips the
// literal auras-you-control alternative in detectAurasCommander.
const eriette = {
  name: "Eriette of the Charmed Apple",
  colors: ["B", "W"],
  oracleText: "Each creature that's enchanted by an Aura you control can't attack you or planeswalkers you control. At the beginning of your end step, each opponent loses X life and you gain X life, where X is the number of Auras you control.",
  typeLine: "Legendary Creature — Human Warlock",
  manaCost: "{1}{W}{B}",
};

const inertNoble = {
  name: "Test Inert Noble",
  colors: ["W", "B"],
  oracleText: "Vigilance.",
  typeLine: "Legendary Creature — Human Noble",
  manaCost: "{2}{W}{B}",
};

// Real card, verified via Scryfall (2026-08-19): Uril, the Miststalker's
// current oracle text is a static +2/+2-per-Aura ability only — no
// "whenever", no "auras you control", no "enchanted creature" phrasing.
// It never trips detectAurasCommander despite being the format's most
// iconic Aura-Voltron commander. Documented, not fixed — see report.
const urilMiststalker = {
  name: "Uril, the Miststalker",
  colors: ["G", "R", "W"],
  oracleText: "Hexproof. Uril gets +2/+2 for each Aura attached to it.",
  typeLine: "Legendary Creature — Beast",
  manaCost: "{2}{R}{G}{W}",
};

// Real card, verified via Scryfall (2026-08-19).
const pacifism = {
  name: "Pacifism",
  oracleText: "Enchant creature. Enchanted creature can't attack or block.",
  typeLine: "Enchantment — Aura",
  manaCost: "{1}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Rhystic Study — a
// non-Aura Enchantment whose payoff (spell-tax draw) has nothing to do
// with Auras. The false-friend trap the "auras" comment describes.
const rhysticStudy = {
  name: "Rhystic Study",
  oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",
  typeLine: "Enchantment",
  manaCost: "{2}{U}",
};

// Real card, verified via Scryfall (2026-08-19): Bitterblossom — a
// non-Aura Enchantment (Kindred Enchantment type line still carries the
// literal word "Enchantment") legal in Eriette's WB identity.
const bitterblossom = {
  name: "Bitterblossom",
  oracleText: "At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying.",
  typeLine: "Kindred Enchantment — Faerie",
  manaCost: "{1}{B}",
};

// Real card, verified via Scryfall (2026-08-19): Swiftfoot Boots —
// colorless Equipment, not an Aura, but carries the protection tag
// (hexproof) that supportSemantics credits regardless of subtype.
const swiftfootBoots = {
  name: "Swiftfoot Boots",
  oracleText: "Equipped creature has hexproof and haste. Equip {1}.",
  typeLine: "Artifact — Equipment",
  manaCost: "{2}",
};

// Real card, verified via Scryfall (2026-08-19): Hateful Eidolon — an
// Enchantment Creature (not Aura) whose "Whenever an enchanted creature
// dies, draw a card for each Aura you controlled..." trips aura_payoff.
// It ALSO trips non_aura_enchantment. cardIsPackageFalseFriend only
// checks coreSemantics/falseFriendSemantics and never consults
// supportSemantics, so this card is simultaneously a real aura_payoff
// support hit (cardSatisfiesPackageSupport) and a flagged false friend
// (cardIsPackageFalseFriend) — a genuine coherence gap. Documented, not
// fixed — see report.
const hatefulEidolon = {
  name: "Hateful Eidolon",
  oracleText: "Lifelink. Whenever an enchanted creature dies, draw a card for each Aura you controlled that was attached to it.",
  typeLine: "Enchantment Creature — Spirit",
  manaCost: "{B}",
};

test("auras opens on a real Auras-you-control commander (Eriette) and stays closed on an unrelated one", () => {
  assert.equal(detectAurasCommander(eriette.oracleText), true);
  assert.equal(detectAurasCommander(inertNoble.oracleText), false);
  assert.ok(intentFor(eriette).packageIds.includes("auras"));
  assert.ok(!intentFor(inertNoble).packageIds.includes("auras"));
});

test("a real Aura-Voltron commander (Uril, the Miststalker) does not trip detectAurasCommander under the current oracle-text regex", () => {
  assert.equal(detectAurasCommander(urilMiststalker.oracleText), false);
  assert.ok(!intentFor(urilMiststalker).packageIds.includes("auras"));
});

test("auras core is genuine Aura type-line membership; a non-Aura enchantment is a false friend, not core", () => {
  const intent = intentFor(eriette);
  assert.equal(cardSatisfiesPackageCore(pacifism, "auras", intent), true);
  assert.equal(cardSatisfiesPackageCore(rhysticStudy, "auras", intent), false);
  assert.equal(cardIsPackageFalseFriend(rhysticStudy, "auras", intent), true);
  assert.equal(cardIsPackageFalseFriend(pacifism, "auras", intent), false);
  assert.equal(cardSatisfiesPackageSupport(rhysticStudy, "auras", intent), false);
});

test("auras support is real aura-payoff/protection density, distinct from core Aura membership", () => {
  const intent = intentFor(eriette);
  assert.equal(cardSatisfiesPackageCore(swiftfootBoots, "auras", intent), false);
  assert.equal(cardSatisfiesPackageSupport(swiftfootBoots, "auras", intent), true);
});

test("a card can simultaneously trip aura_payoff support and non_aura_enchantment false-friend (Hateful Eidolon) — cardIsPackageFalseFriend never consults supportSemantics", () => {
  const intent = intentFor(eriette);
  assert.equal(cardSatisfiesPackageCore(hatefulEidolon, "auras", intent), false);
  assert.equal(cardSatisfiesPackageSupport(hatefulEidolon, "auras", intent), true);
  assert.equal(cardIsPackageFalseFriend(hatefulEidolon, "auras", intent), true);
});

test("a real Auras-matter commander forges a real Aura over a non-Aura enchantment false friend", () => {
  const wbFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Advisor", manaCost: "{2}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}{B}", colorIdentity: ["W", "B"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
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
    commander: eriette,
    cards: [...wbFiller, pacifism, bitterblossom, swiftfootBoots, ...wbDuals],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("auras"), "Eriette's deck should carry the auras package");
  assert.ok(names.includes("Pacifism"), "the real Aura should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(pacifism, "auras", intent), true);
  assert.equal(cardSatisfiesPackageCore(bitterblossom, "auras", intent), false);
  const bitterblossomRow = report.selected.rows.find((row) => row.name === "Bitterblossom");
  if (bitterblossomRow) {
    assert.equal(cardSatisfiesPackageCore(bitterblossomRow, "auras", intent), false, "a non-Aura enchantment must not occupy Aura core");
  }
});
