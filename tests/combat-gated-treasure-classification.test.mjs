import test from "node:test";
import assert from "node:assert/strict";
import { displayRoleFor, simulationRoleFor } from "../app/adaptive-recommendation.mjs";
import { classifyNativeCard } from "../app/card-role-classification.mjs";

const greatTrainHeist = {
  name: "Great Train Heist",
  typeLine: "Sorcery",
  manaCost: "{R}",
  cmc: 1,
  oracleText: "Spree — Pay one or more additional costs. Creatures you control get +1/+0 and gain first strike until end of turn. Untap all creatures you control. If it's your main phase, there is an additional combat phase after this phase. Choose target opponent. Until end of turn, whenever a creature you control deals combat damage to that player, create a tapped Treasure token.",
};

test("combat-gated Treasure production is not classified as acceleration", () => {
  assert.notEqual(displayRoleFor(greatTrainHeist), "Acceleration");
  assert.notEqual(simulationRoleFor(greatTrainHeist), "ramp");
  assert.ok(!classifyNativeCard(greatTrainHeist).includes("ramp"));
});

test("Strike It Rich is resource setup, not true acceleration", () => {
  const strikeItRich = {
    name: "Strike It Rich",
    typeLine: "Sorcery",
    manaCost: "{R}",
    cmc: 1,
    oracleText: "Create a Treasure token.",
  };
  assert.notEqual(displayRoleFor(strikeItRich), "Acceleration");
  assert.notEqual(simulationRoleFor(strikeItRich), "ramp");
  assert.ok(!classifyNativeCard(strikeItRich).includes("ramp"));
});

test("a variable Treasure burst remains acceleration", () => {
  const dockside = {
    name: "Dockside Extortionist",
    typeLine: "Creature — Goblin Pirate",
    manaCost: "{1}{R}",
    cmc: 2,
    oracleText: "When Dockside Extortionist enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.",
  };
  assert.equal(displayRoleFor(dockside), "Acceleration");
  assert.ok(classifyNativeCard(dockside).includes("ramp"));
});
