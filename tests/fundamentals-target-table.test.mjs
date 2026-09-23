import assert from "node:assert/strict";
import test from "node:test";
import { TRACKED_ROLES } from "../app/slot-justification-ledger.mjs";
import { POWER_TIERS } from "../app/commander-power-signal.mjs";
import {
  FUNDAMENTAL_ROLE_TARGETS,
  fundamentalTargetFor,
  isWinConditionCard,
} from "../app/fundamentals-target-table.mjs";

test("TRACKED_ROLES is exported and matches the known fundamentals list", () => {
  assert.deepEqual(TRACKED_ROLES, ["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);
});

test("POWER_TIERS is exported and matches the known tier list", () => {
  assert.deepEqual(POWER_TIERS, ["Casual", "Focused", "High-Power", "Maximum"]);
});

test("every tracked role has a target for every power tier", () => {
  for (const role of TRACKED_ROLES) {
    for (const tier of POWER_TIERS) {
      const target = fundamentalTargetFor(role, tier);
      assert.ok(target, `expected a target for role=${role} tier=${tier}`);
      assert.ok(Number.isFinite(target.min));
      assert.ok(Number.isFinite(target.max));
    }
  }
});

test("every target range has min <= max", () => {
  for (const role of TRACKED_ROLES) {
    for (const tier of POWER_TIERS) {
      const { min, max } = fundamentalTargetFor(role, tier);
      assert.ok(min <= max, `role=${role} tier=${tier} has min ${min} > max ${max}`);
    }
  }
});

test("FUNDAMENTAL_ROLE_TARGETS has no extra roles beyond TRACKED_ROLES", () => {
  assert.deepEqual(Object.keys(FUNDAMENTAL_ROLE_TARGETS).sort(), [...TRACKED_ROLES].sort());
});

test("fundamentalTargetFor returns null for an untracked role", () => {
  assert.equal(fundamentalTargetFor("land", "Casual"), null);
  assert.equal(fundamentalTargetFor("commander", "Focused"), null);
});

test("fundamentalTargetFor returns null for an unrecognized tier", () => {
  assert.equal(fundamentalTargetFor("ramp", "Cutthroat"), null);
});

test("interaction targets climb monotonically from Casual to Maximum", () => {
  const tiers = POWER_TIERS.map((tier) => fundamentalTargetFor("interaction", tier));
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(tiers[i].min >= tiers[i - 1].min, "interaction min should not shrink at higher power tiers");
  }
});

test("sweeper targets allow zero at Maximum but not at lower tiers", () => {
  assert.equal(fundamentalTargetFor("sweeper", "Maximum").min, 0);
  for (const tier of ["Casual", "Focused", "High-Power"]) {
    assert.ok(fundamentalTargetFor("sweeper", tier).min >= 1);
  }
});

// RAW_TARGETS is hand-authored for a 100-card deck. Standard Brawl (the only
// guided-build format that isn't 100 cards — see format-catalog.ts's
// targetDeckSize) used to get the exact same absolute counts anyway: a
// 60-card deck was told to find 10-12 ramp + 8-10 draw + 8-10 interaction +
// 3-5 protection + 2-3 recursion + 1-3 sweeper, 32 cards of fundamentals
// alone before a single land or win condition — an unreachable, permanently
// "under" ledger for a deck that was never actually built wrong.
test("omitting deckTarget (every pre-existing caller) is unchanged — the 100-card numbers exactly", () => {
  for (const role of TRACKED_ROLES) {
    for (const tier of POWER_TIERS) {
      assert.deepEqual(fundamentalTargetFor(role, tier, 100), fundamentalTargetFor(role, tier));
    }
  }
});

test("a 60-card deckTarget scales every target down proportionally, never below zero, and keeps min <= max", () => {
  for (const role of TRACKED_ROLES) {
    for (const tier of POWER_TIERS) {
      const full = fundamentalTargetFor(role, tier);
      const scaled = fundamentalTargetFor(role, tier, 60);
      assert.ok(scaled.min <= full.min, `role=${role} tier=${tier}: scaled min ${scaled.min} should not exceed the 100-card min ${full.min}`);
      assert.ok(scaled.max <= full.max, `role=${role} tier=${tier}: scaled max ${scaled.max} should not exceed the 100-card max ${full.max}`);
      assert.ok(scaled.min >= 0);
      assert.ok(scaled.min <= scaled.max);
    }
  }
  // Spot-check the exact numbers for one real tier, so a future edit to the
  // rounding rule shows up here instead of only in the general bounds check.
  assert.deepEqual(fundamentalTargetFor("ramp", "Focused", 60), { min: 6, max: 7 });
  assert.deepEqual(fundamentalTargetFor("protection", "Focused", 60), { min: 2, max: 3 });
});

test("the sum of scaled fundamentals minimums leaves real room for lands and win conditions in a 60-card deck", () => {
  const floorSum = TRACKED_ROLES.reduce((sum, role) => sum + fundamentalTargetFor(role, "Focused", 60).min, 0);
  // A 60-card Standard Brawl deck has 59 non-commander slots and typically
  // wants ~22-24 lands; fundamentals alone must leave meaningful room for
  // that plus win conditions/synergy pieces, not consume nearly all of it
  // the way the unscaled 32-card floor used to.
  assert.ok(floorSum <= 24, `fundamentals floor ${floorSum} leaves too little of a 59-card non-commander pool for lands and win conditions`);
});

test("isWinConditionCard is true for a card with the threat role, regardless of oracle text", () => {
  const beater = { name: "Big Dumb Beater", oracleText: "Trample.", typeLine: "Creature — Giant" };
  assert.equal(isWinConditionCard(beater, ["threat"]), true);
});

test("isWinConditionCard is true for an explicit win-condition card even without the threat role", () => {
  const altWin = {
    name: "Barren Glory",
    oracleText: "At the beginning of your upkeep, if you control no permanents other than this enchantment and you have no cards in hand, you win the game.",
    typeLine: "Enchantment",
  };
  assert.equal(isWinConditionCard(altWin, []), true);
});

test("isWinConditionCard is false for a plain support card with neither signal", () => {
  const cantrip = { name: "Opt", oracleText: "Scry 1. Draw a card.", typeLine: "Instant" };
  assert.equal(isWinConditionCard(cantrip, ["draw"]), false);
});

test("isWinConditionCard tolerates a missing/non-array roles argument", () => {
  const cantrip = { name: "Opt", oracleText: "Scry 1. Draw a card.", typeLine: "Instant" };
  assert.equal(isWinConditionCard(cantrip), false);
  assert.equal(isWinConditionCard(cantrip, undefined), false);
});
