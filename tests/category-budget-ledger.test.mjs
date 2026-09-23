import assert from "node:assert/strict";
import test from "node:test";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import {
  buildCategoryBudgetLedger,
  CATEGORY_SEQUENCE,
} from "../app/category-budget-ledger.mjs";

const row = (name, roles, quantity = 1) => ({ name, roles, quantity, oracleText: "", typeLine: "Instant" });

function fundamentalsFixture() {
  return [
    ...Array.from({ length: 10 }, (_, i) => row(`Ramp ${i}`, ["ramp"])),
    ...Array.from({ length: 9 }, (_, i) => row(`Draw ${i}`, ["draw"])),
    ...Array.from({ length: 9 }, (_, i) => row(`Removal ${i}`, ["interaction"])),
    ...Array.from({ length: 3 }, (_, i) => row(`Ward ${i}`, ["protection"])),
    ...Array.from({ length: 2 }, (_, i) => row(`Regrowth ${i}`, ["recursion"])),
    ...Array.from({ length: 1 }, (_, i) => row(`Wrath ${i}`, ["sweeper"])),
    row("Big Beater", ["threat"]),
    row("Barren Glory", [], 1),
  ];
}

test("CATEGORY_SEQUENCE matches the spec's fixed teaching order", () => {
  assert.deepEqual(CATEGORY_SEQUENCE, [
    "ramp", "interaction", "protection", "sweeper", "recursion", "draw", "winConditions", "synergyPieces",
  ]);
});

test("fundamentals rows count actual per role and compare against the Focused target", () => {
  const candidate = { rows: fundamentalsFixture() };
  const ledger = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  assert.equal(ledger.byCategory.ramp.actual, 10);
  assert.equal(ledger.byCategory.draw.actual, 9);
  assert.equal(ledger.byCategory.interaction.actual, 9);
  assert.equal(ledger.byCategory.protection.actual, 3);
  assert.equal(ledger.byCategory.recursion.actual, 2);
  assert.equal(ledger.byCategory.sweeper.actual, 1);
  for (const role of ["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]) {
    assert.ok(ledger.byCategory[role].target, `expected a target for ${role}`);
    assert.equal(ledger.byCategory[role].status, "in-range", `${role} should read in-range for this fixture`);
  }
});

test("deckTarget scales fundamentals targets for a 60-card deck instead of assuming 100", () => {
  const candidate = { rows: fundamentalsFixture() };
  const ledgerFull = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  const ledgerBrawl = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused", deckTarget: 60 });
  assert.equal(ledgerFull.byCategory.ramp.target.min, 10);
  assert.equal(ledgerBrawl.byCategory.ramp.target.min, 6, "a 60-card deck should not be held to the 100-card ramp floor");
  // Omitting deckTarget must be identical to today's behavior — no caller
  // that doesn't know about deck size should see anything change.
  const ledgerOmitted = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  assert.deepEqual(ledgerOmitted.byCategory.ramp.target, ledgerFull.byCategory.ramp.target);
});

test("fundamentals status reads under/over correctly against tier targets", () => {
  const scarceRamp = { rows: [row("Only Ramp", ["ramp"])] };
  const ledgerScarce = buildCategoryBudgetLedger(scarceRamp, {}, { targetPowerTier: "Focused" });
  assert.equal(ledgerScarce.byCategory.ramp.status, "under");

  const floodedRamp = { rows: Array.from({ length: 20 }, (_, i) => row(`Ramp ${i}`, ["ramp"])) };
  const ledgerFlooded = buildCategoryBudgetLedger(floodedRamp, {}, { targetPowerTier: "Casual" });
  assert.equal(ledgerFlooded.byCategory.ramp.status, "over");
});

test("fundamentals fall back to no-target when the power tier is unset or unrecognized", () => {
  const candidate = { rows: [row("Some Ramp", ["ramp"])] };
  const ledger = buildCategoryBudgetLedger(candidate, {}, {});
  assert.equal(ledger.byCategory.ramp.target, null);
  assert.equal(ledger.byCategory.ramp.status, "no-target");
});

test("lands and the commander are excluded from every fundamentals count", () => {
  const candidate = {
    rows: [
      row("Forest", ["land", "ramp"]),
      row("Commander Person", ["commander", "ramp"]),
      row("Real Rock", ["ramp"]),
    ],
  };
  const ledger = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  assert.equal(ledger.byCategory.ramp.actual, 1);
});

test("win conditions row counts threat-role and explicit-win-condition cards, with no numeric target", () => {
  const candidate = { rows: fundamentalsFixture() };
  const ledger = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  assert.equal(ledger.byCategory.winConditions.actual, 1);
  assert.deepEqual(ledger.byCategory.winConditions.names, ["Big Beater"]);
  assert.equal(ledger.byCategory.winConditions.target, null);
  assert.equal(ledger.byCategory.winConditions.status, "no-target");
});

test("win conditions row also credits explicit win-condition text without the threat role", () => {
  const altWin = {
    name: "Barren Glory",
    roles: [],
    quantity: 1,
    typeLine: "Enchantment",
    oracleText: "At the beginning of your upkeep, if you control no permanents other than this enchantment and you have no cards in hand, you win the game.",
  };
  const candidate = { rows: [altWin] };
  const ledger = buildCategoryBudgetLedger(candidate, {}, { targetPowerTier: "Focused" });
  assert.equal(ledger.byCategory.winConditions.actual, 1);
});

test("synergy pieces row sums package core+support counts and coreMin+supportMin targets, unchanged from packageCounts", () => {
  const candidate = {
    rows: [],
    slotJustificationLedger: {
      packageCounts: {
        auras: { core: 10, support: 3, falseFriend: 0, coreMin: 8, supportMin: 2 },
        equipment: { core: 2, support: 1, falseFriend: 0, coreMin: 6, supportMin: 2 },
      },
    },
  };
  const ledger = buildCategoryBudgetLedger(candidate, {}, {});
  const synergy = ledger.byCategory.synergyPieces;
  assert.equal(synergy.actual, 10 + 3 + 2 + 1);
  assert.equal(synergy.target.min, 8 + 6);
  assert.equal(synergy.target.max, (8 + 6) + (2 + 2));
  assert.equal(synergy.byPackage.auras.core, 10);
});

test("synergy pieces row has no target when no packages are triggered", () => {
  const candidate = { rows: [], slotJustificationLedger: { packageCounts: {} } };
  const ledger = buildCategoryBudgetLedger(candidate, {}, {});
  assert.equal(ledger.byCategory.synergyPieces.target, null);
  assert.equal(ledger.byCategory.synergyPieces.status, "no-target");
});

// --- Integration: prototyped against an already-completed real deck ---

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2, manaCost) => ({
  name,
  typeLine,
  oracleText,
  cmc,
  manaCost: manaCost || `{${Math.max(0, cmc - 1)}}{W}`,
  colorIdentity: ["W"],
  priceUsd,
});

const aura = (name, cmc = 2, priceUsd = 0.2, oracle = "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.") =>
  card(name, "Enchantment — Aura", oracle, cmc, priceUsd);
const protection = (name) =>
  card(name, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2);
const ramp = (name, cmc = 2) =>
  card(name, "Artifact", "Add one mana. Create a Treasure token.", cmc, 0.2, `{${cmc}}`);
const draw = (name) =>
  card(name, "Instant", "Draw two cards.", 3);
const removal = (name) =>
  card(name, "Instant", "Exile target nonland permanent.", 3);

function pearlPool() {
  return [
    ...Array.from({ length: 24 }, (_, i) => aura(`Aura Piece ${i}`, 1 + (i % 3))),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => card(`Threat ${i}`, "Creature — Fox", "Vigilance", 3 + (i % 3))),
  ];
}

test("buildCategoryBudgetLedger works read-only against a real completed deck", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 41,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  });
  const selected = report.selected;
  const ledger = buildCategoryBudgetLedger(selected, selected.strategicIntent, { targetPowerTier: "Focused" });
  assert.equal(ledger.categories.length, 8);
  // Real spell picks should register nonzero actuals on at least some
  // fundamentals — the fixture pool has real draw/removal/ramp/protection.
  assert.ok(ledger.byCategory.draw.actual > 0);
  assert.ok(ledger.byCategory.interaction.actual > 0);
  assert.ok(ledger.byCategory.ramp.actual > 0);
  assert.ok(ledger.byCategory.protection.actual > 0);
  // Auras package should show up as synergy-piece core, matching the
  // ledger's own packageCounts for "auras" one-for-one.
  assert.equal(ledger.byCategory.synergyPieces.byPackage.auras.core, selected.slotJustificationLedger.packageCounts.auras.core);
});
