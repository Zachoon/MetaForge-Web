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
