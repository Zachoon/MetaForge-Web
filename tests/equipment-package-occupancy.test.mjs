import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  cardIsPackageFalseFriend,
  cardSatisfiesPackageCore,
  cardSatisfiesPackageSupport,
  detectEquipmentCommander,
} from "../app/strategic-intent.mjs";
import {
  commanderMechanicalScopes,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #028 gap closure — Equipment (original PACKAGE_CATALOG entry)
// =============================================================================
// Generic-dispatch package: coreSemantics is the broad "equipment" tag
// itself (Equipment is already a precise subtype, unlike artifacts_matter's
// "Artifact"), falseFriendSemantics is ["non_equipment_artifact"],
// supportSemantics is ["protection"]. Real-card evidence verified via
// Scryfall (2026-08-19).
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

// Real card, verified via Scryfall (2026-08-19): Kemba, Kha Regent.
const kemba = {
  name: "Kemba, Kha Regent",
  colors: ["W"],
  oracleText: "At the beginning of your upkeep, create a 2/2 white Cat creature token for each Equipment attached to Kemba.",
  typeLine: "Legendary Creature — Cat Cleric",
  manaCost: "{1}{W}{W}",
};

const inertNoble = {
  name: "Test Inert Noble",
  colors: ["W"],
  oracleText: "Vigilance.",
  typeLine: "Legendary Creature — Human Noble",
  manaCost: "{2}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Umezawa's Jitte.
const jitte = {
  name: "Umezawa's Jitte",
  oracleText: "Whenever equipped creature deals combat damage, put two charge counters on Umezawa's Jitte. Remove a charge counter from Umezawa's Jitte: Choose one — Equipped creature gets +2/+2 until end of turn. Target creature gets -1/-1 until end of turn. You gain 2 life. Equip {2}.",
  typeLine: "Legendary Artifact — Equipment",
  manaCost: "{2}",
};

// Real card, verified via Scryfall (2026-08-19): Sol Ring — a plain,
// non-Equipment artifact. The false-friend trap the "equipment" comment
// describes: generic artifacts must never satisfy Equipment density.
const solRing = {
  name: "Sol Ring",
  oracleText: "{T}: Add {C}{C}.",
  typeLine: "Artifact",
  manaCost: "{1}",
};

// Real card, verified via Scryfall (2026-08-19): Spirit Mantle — a real
// Aura (not Equipment) that carries the protection tag Equipment's own
// supportSemantics credits regardless of subtype.
const spiritMantle = {
  name: "Spirit Mantle",
  oracleText: "Enchant creature. Enchanted creature gets +1/+1 and has protection from creatures.",
  typeLine: "Enchantment — Aura",
  manaCost: "{1}{W}",
};

// Real card, verified via Scryfall (2026-08-19): Swiftfoot Boots — itself
// an Equipment that also carries the protection tag, so it satisfies both
// core (equipment) and support (protection) at once.
const swiftfootBoots = {
  name: "Swiftfoot Boots",
  oracleText: "Equipped creature has hexproof and haste. Equip {1}.",
  typeLine: "Artifact — Equipment",
  manaCost: "{2}",
};

test("equipment opens on a real Equipment-payoff commander (Kemba) and stays closed on an unrelated one", () => {
  assert.equal(detectEquipmentCommander(kemba.oracleText), true);
  assert.equal(detectEquipmentCommander(inertNoble.oracleText), false);
  assert.ok(intentFor(kemba).packageIds.includes("equipment"));
  assert.ok(!intentFor(inertNoble).packageIds.includes("equipment"));
});

test("equipment core is genuine Equipment type-line membership; a non-Equipment artifact is a false friend, not core", () => {
  const intent = intentFor(kemba);
  assert.equal(cardSatisfiesPackageCore(jitte, "equipment", intent), true);
  assert.equal(cardSatisfiesPackageCore(solRing, "equipment", intent), false);
  assert.equal(cardIsPackageFalseFriend(solRing, "equipment", intent), true);
  assert.equal(cardIsPackageFalseFriend(jitte, "equipment", intent), false);
  assert.equal(cardSatisfiesPackageSupport(solRing, "equipment", intent), false);
});

test("equipment support is real protection density, distinct from core Equipment membership", () => {
  const intent = intentFor(kemba);
  assert.equal(cardSatisfiesPackageCore(spiritMantle, "equipment", intent), false);
  assert.equal(cardSatisfiesPackageSupport(spiritMantle, "equipment", intent), true);
});

test("an Equipment can satisfy both core and support at once (Swiftfoot Boots: equipment tag and protection tag)", () => {
  const intent = intentFor(kemba);
  assert.equal(cardSatisfiesPackageCore(swiftfootBoots, "equipment", intent), true);
  assert.equal(cardSatisfiesPackageSupport(swiftfootBoots, "equipment", intent), true);
  assert.equal(cardIsPackageFalseFriend(swiftfootBoots, "equipment", intent), false);
});

test("a real Equipment-matters commander forges a real Equipment over a non-Equipment artifact false friend", () => {
  const wFiller = [
    ...Array.from({ length: 28 }, (_, i) => ({ name: `Flow ${i}`, oracleText: "When this enters, draw a card. Scry 1.", typeLine: "Creature — Knight", manaCost: "{2}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, oracleText: "Exile target nonland permanent.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Shield ${i}`, oracleText: "Target creature gains hexproof until end of turn.", typeLine: "Instant", manaCost: "{1}{W}", colorIdentity: ["W"], popularityRank: 40 })),
    ...Array.from({ length: 18 }, (_, i) => ({ name: `Stone ${i}`, oracleText: "Add one mana. Create a Treasure token.", typeLine: "Artifact", manaCost: "{2}", colorIdentity: [], popularityRank: 40 })),
  ];
  const plains = Array.from({ length: 20 }, (_, i) => ({
    name: `Test Plains ${i}`,
    oracleText: "{T}: Add {W}.",
    typeLine: "Land — Plains",
    manaCost: "",
    colorIdentity: ["W"],
    producedMana: ["W"],
    popularityRank: 5,
    priceUsd: 0.5,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 11,
    commander: kemba,
    cards: [...wFiller, jitte, solRing, spiritMantle, ...plains],
  });
  const names = report.selected.rows.map((row) => row.name);
  const intent = report.selected.strategicIntent;
  assert.ok(intent.packageIds.includes("equipment"), "Kemba's deck should carry the equipment package");
  assert.ok(names.includes("Umezawa's Jitte"), "the real Equipment should be reserved as package core");
  assert.equal(cardSatisfiesPackageCore(jitte, "equipment", intent), true);
  assert.equal(cardSatisfiesPackageCore(solRing, "equipment", intent), false);
  const solRingRow = report.selected.rows.find((row) => row.name === "Sol Ring");
  if (solRingRow) {
    assert.equal(cardSatisfiesPackageCore(solRingRow, "equipment", intent), false, "a non-Equipment artifact must not occupy Equipment core");
  }
});
