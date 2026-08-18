import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMulliganHand } from "../app/mulligan-coach.mjs";

const land = (name, colors = ["G"]) => ({ name, role: "Mana source", typeLine: "Land", colorIdentity: colors, manaCost: "", cmc: 0 });
const spell = (name, cmc, role = "Threat", manaCost = "{G}") => ({ name, role, typeLine: "Creature", colorIdentity: [], manaCost, cmc });

test("recommends keeping a functional hand and explains the playable start", () => {
  const result = evaluateMulliganHand([land("A"), land("B"), land("C"), spell("One", 1), spell("Two", 2), spell("Answer", 2, "Interaction"), spell("Top", 5)]);
  assert.equal(result.verdict, "keep");
  assert.match(result.headline, /keep/i);
  assert.equal(result.counts.lands, 3);
  assert.equal(result.counts.otherMana, 0);
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
  assert.match(result.warnings.join(" "), /no reachable red source.*Red spell/i);
  assert.match(result.disclaimer, /not a prediction/i);
});

test("credits verified any-color lands instead of inventing a color screw", () => {
  const city = { ...land("City of Brass", []), oracleText: "Whenever City of Brass becomes tapped, it deals 1 damage to you. Add one mana of any color." };
  const result = evaluateMulliganHand([
    city,
    land("Forest 1"),
    land("Forest 2"),
    spell("White spell", 2, "Threat", "{1}{W}"),
    spell("Black spell", 2, "Threat", "{1}{B}"),
    spell("Green spell", 2),
    spell("Top", 5),
  ]);
  assert.equal(result.verdict, "keep");
  assert.doesNotMatch(result.warnings.join(" "), /no reachable .* source/i);
});

test("credits a castable Talisman that bridges a color the opening lands cannot make", () => {
  const talisman = {
    name: "Talisman of Creativity",
    role: "Acceleration",
    typeLine: "Artifact",
    colorIdentity: ["U", "R"],
    producedMana: ["C", "U", "R"],
    oracleText: "{T}: Add {C}. {T}: Add {U} or {R}. Talisman of Creativity deals 1 damage to you.",
    manaCost: "{2}",
    cmc: 2,
  };
  const result = evaluateMulliganHand([
    land("The Great Mound", ["U"]),
    land("Island", ["U"]),
    talisman,
    spell("Curse of Opulence", 1, "Threat", "{R}"),
    spell("Artificer Class", 2, "Threat", "{1}{U}"),
    spell("Champion's Helm", 3, "Protection", "{3}"),
    spell("Iron Spider, Stark Upgrade", 3, "Threat", "{3}"),
  ]);
  assert.equal(result.verdict, "keep");
  assert.equal(result.counts.otherMana, 1);
  assert.doesNotMatch(result.warnings.join(" "), /no reachable .* source/i);
  assert.match(result.reasons.join(" "), /Talisman of Creativity.*extend its available mana colors/i);
  assert.equal(result.sequence.recommendedCard, "Talisman of Creativity");
  assert.match(result.sequence.reason, /unlocks red.*Curse of Opulence/i);
});

test("does not credit an uncastable mana rock as a color bridge", () => {
  const rock = {
    name: "Red Rock",
    role: "Acceleration",
    typeLine: "Artifact",
    producedMana: ["R"],
    oracleText: "{T}: Add {R}.",
    manaCost: "{3}",
    cmc: 3,
  };
  const result = evaluateMulliganHand([
    land("Island 1", ["U"]),
    land("Island 2", ["U"]),
    rock,
    spell("Red spell", 1, "Threat", "{R}"),
    spell("Blue spell", 2, "Threat", "{1}{U}"),
    spell("Five", 5),
    spell("Six", 6),
  ]);
  assert.equal(result.verdict, "mulligan");
  assert.match(result.warnings.join(" "), /no reachable .*red.* source/i);
});

test("calls a mana-functional but action-light hand close", () => {
  const result = evaluateMulliganHand([land("A"), land("B"), land("C"), spell("Three", 3), spell("Four", 4), spell("Five", 5), spell("Six", 6)]);
  assert.equal(result.verdict, "close");
});

test("never counts a nonland mana card as an opening land", () => {
  const manaSpell = { name: "Archdruid's Charm", role: "Mana source", typeLine: "Instant", colorIdentity: ["G"], manaCost: "{G}{G}{G}", cmc: 3 };
  const hand = [manaSpell, ...Array.from({ length: 6 }, (_, i) => spell(`S${i}`, i + 1))];
  const result = evaluateMulliganHand(hand);
  assert.equal(result.counts.lands, 0);
  assert.equal(result.counts.otherMana, 1);
  assert.equal(result.verdict, "mulligan");
  assert.equal(result.confidence, "high");
  assert.match(result.warnings.join(" "), /no lands/i);
});

test("treats five lands and only one early play as close, not a confident keep", () => {
  const result = evaluateMulliganHand([land("A"), land("B"), land("C"), land("D"), land("E"), spell("Early", 2), spell("Late", 6)]);
  assert.equal(result.verdict, "close");
  assert.match(result.warnings.join(" "), /Five lands/);
});
