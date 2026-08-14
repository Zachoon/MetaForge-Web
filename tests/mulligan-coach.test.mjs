import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMulliganHand } from "../app/mulligan-coach.mjs";

const land = (name, colors = ["G"]) => ({ name, role: "Mana source", typeLine: "Land", colorIdentity: colors, manaCost: "", cmc: 0 });
const spell = (name, cmc, role = "Threat", manaCost = "{G}") => ({ name, role, typeLine: "Creature", colorIdentity: [], manaCost, cmc });

test("recommends keeping a functional hand and explains the playable start", () => {
  const result = evaluateMulliganHand([land("A"), land("B"), land("C"), spell("One", 1), spell("Two", 2), spell("Answer", 2, "Interaction"), spell("Top", 5)]);
  assert.equal(result.verdict, "keep");
  assert.match(result.headline, /keep/i);
  assert.equal(result.counts.manaSources, 3);
  assert.equal(result.counts.earlyPlays, 3);
  assert.equal(result.writesToBrain, false);
});

test("mulligans obvious mana failures", () => {
  assert.equal(evaluateMulliganHand([land("A"), ...Array.from({ length: 6 }, (_, i) => spell(`S${i}`, i + 1))]).verdict, "mulligan");
  assert.equal(evaluateMulliganHand([...Array.from({ length: 6 }, (_, i) => land(`L${i}`)), spell("S", 2)]).verdict, "mulligan");
});

test("flags a color trap without pretending the game is decided", () => {
  const result = evaluateMulliganHand([land("Forest 1"), land("Forest 2"), land("Forest 3"), spell("Red spell", 2, "Threat", "{1}{R}"), spell("Green spell", 2), spell("Five", 5), spell("Six", 6)]);
  assert.equal(result.verdict, "mulligan");
  assert.match(result.warnings.join(" "), /cannot currently cast every color/i);
  assert.match(result.disclaimer, /not a prediction/i);
});

test("calls a mana-functional but action-light hand close", () => {
  const result = evaluateMulliganHand([land("A"), land("B"), land("C"), spell("Three", 3), spell("Four", 4), spell("Five", 5), spell("Six", 6)]);
  assert.equal(result.verdict, "close");
});

