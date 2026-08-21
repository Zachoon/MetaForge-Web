import assert from "node:assert/strict";
import test from "node:test";
import { classifyNativeCard } from "../app/card-role-classification.mjs";
import { displayRoleFor, simulationRoleFor } from "../app/adaptive-recommendation.mjs";
// Side-effect import: configures the real card-mechanics tag lookup.
import "../app/native-masterwork-engine.mjs";

// =============================================================================
// Founder #032: a damage-ping engine is not a board wipe
// =============================================================================
// Found in the same audit pass as #030/#031. "deals N damage to each" with
// no target requirement let Impact Tremors and Kessig Flamebreather
// ("... deals 1 damage to each opponent") — real, popular damage-ping
// engines that never touch a creature — classify into the load-bearing
// "sweeper" role, the exact opposite deck-building implication of a real
// board wipe: a sweeper kills your own board too and works against a
// go-wide/token strategy, while a damage-ping engine is often paired WITH
// one. Fixed by requiring "creature" as the actual target.
//
// The same gap existed in displayRoleFor's "Board reset" check from the
// other direction: it required the literal substring "all creatures",
// which real damage-based sweepers (Pyroclasm: "deals 2 damage to each
// creature") never say, so they fell through to the generic, target-blind
// "Interaction" bucket instead. Fixed alongside the same way.
// =============================================================================

const impactTremors = { name: "Impact Tremors", oracleText: "Whenever a creature you control enters, this enchantment deals 1 damage to each opponent.", typeLine: "Enchantment", manaCost: "{1}{R}" };
const kessigFlamebreather = { name: "Kessig Flamebreather", oracleText: "Whenever you cast a noncreature spell, this creature deals 1 damage to each opponent.", typeLine: "Creature — Goblin Shaman", manaCost: "{2}{R}" };
const pyroclasm = { name: "Pyroclasm", oracleText: "Pyroclasm deals 2 damage to each creature.", typeLine: "Sorcery", manaCost: "{1}{R}" };
const blasphemousAct = { name: "Blasphemous Act", oracleText: "This spell costs {1} less to cast for each creature on the battlefield.\nBlasphemous Act deals 13 damage to each creature.", typeLine: "Sorcery", manaCost: "{8}{R}" };
const angerOfTheGods = { name: "Anger of the Gods", oracleText: "Anger of the Gods deals 3 damage to each creature. Exile all creatures dealt damage this way.", typeLine: "Sorcery", manaCost: "{1}{R}{R}" };
const pestilence = { name: "Pestilence", oracleText: "{B}: Pestilence deals 1 damage to each creature and each player. If there are no creatures on the battlefield, sacrifice Pestilence.", typeLine: "Enchantment", manaCost: "{2}{B}{B}" };
// Follow-up (Founder #036): a fixed \d+ after "deals" missed this real,
// well-known sweeper entirely — Chain Reaction's damage scales with board
// state and has no printed number at all. Widened alongside the new
// self-damage-synergy detector that shares this exact pattern.
const chainReaction = { name: "Chain Reaction", oracleText: "Chain Reaction deals damage equal to the number of creatures on the battlefield to each creature.", typeLine: "Sorcery", manaCost: "{4}{R}{R}" };

const DAMAGE_PING_ENGINES = [impactTremors, kessigFlamebreather];
const REAL_DAMAGE_SWEEPERS = [pyroclasm, blasphemousAct, angerOfTheGods, pestilence, chainReaction];

test("classifyNativeCard: a damage-ping engine that only hits opponents is not the sweeper role", () => {
  for (const card of DAMAGE_PING_ENGINES) {
    assert.ok(!classifyNativeCard(card).includes("sweeper"), `${card.name} never deals damage to a creature`);
  }
  for (const card of REAL_DAMAGE_SWEEPERS) {
    assert.ok(classifyNativeCard(card).includes("sweeper"), `${card.name} is a real damage-based board wipe`);
  }
});

test("displayRoleFor/simulationRoleFor: the UI badge follows the same creature-target line", () => {
  for (const card of DAMAGE_PING_ENGINES) {
    assert.notEqual(displayRoleFor(card), "Board reset", `${card.name} is not a board wipe`);
    assert.notEqual(simulationRoleFor(card), "sweeper", `${card.name} is not a board wipe`);
  }
  for (const card of REAL_DAMAGE_SWEEPERS) {
    assert.equal(displayRoleFor(card), "Board reset", `${card.name} is a real board wipe`);
    assert.equal(simulationRoleFor(card), "sweeper", `${card.name} is a real board wipe`);
  }
});
