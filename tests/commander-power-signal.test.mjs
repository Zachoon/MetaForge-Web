import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCommanderPowerSignal } from "../app/commander-power-signal.mjs";

// Real oracle text for well-known, unambiguous cards — each chosen because
// it's the canonical example of the exact signal it's meant to exercise.
const card = (name, typeLine, oracleText, cmc, isCommander = false, quantity = 1) =>
  ({ name, typeLine, oracleText, cmc, isCommander, quantity });

const solRing = card("Sol Ring", "Artifact", "{T}: Add {C}{C}.", 1);
const manaCrypt = card("Mana Crypt", "Artifact", "Add {C}{C}. Mana Crypt deals 1 damage to you.", 0);
const birdsOfParadise = card("Birds of Paradise", "Creature — Bird", "{T}: Add one mana of any color.", 1);
const darkRitual = card("Dark Ritual", "Instant", "Add {B}{B}{B}.", 1);
const demonicTutor = card("Demonic Tutor", "Sorcery", "Search your library for a card, put that card into your hand, then shuffle.", 2);
const rampantGrowth = card("Rampant Growth", "Sorcery", "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", 2);
const timeWarp = card("Time Warp", "Sorcery", "Target player takes an extra turn after this one.", 4);
const armageddon = card("Armageddon", "Sorcery", "Destroy all lands.", 3);
const vanillaBear = card("Grizzly Bears", "Creature — Bear", "", 2);
const plains = card("Plains", "Basic Land — Plains", "({T}: Add {W}.)", 0);

test("evaluateCommanderPowerSignal detects an artifact mana rock at mana value 1", () => {
  const result = evaluateCommanderPowerSignal([solRing, vanillaBear, plains]);
  assert.deepEqual(result.fastMana, ["Sol Ring"]);
});

test("evaluateCommanderPowerSignal detects a zero-cost mana rock", () => {
  const result = evaluateCommanderPowerSignal([manaCrypt, vanillaBear, plains]);
  assert.deepEqual(result.fastMana, ["Mana Crypt"]);
});

test("evaluateCommanderPowerSignal detects a one-mana-value mana dork", () => {
  const result = evaluateCommanderPowerSignal([birdsOfParadise, vanillaBear, plains]);
  assert.deepEqual(result.fastMana, ["Birds of Paradise"]);
});

test("evaluateCommanderPowerSignal detects a ritual that nets more mana than it costs", () => {
  const result = evaluateCommanderPowerSignal([darkRitual, vanillaBear, plains]);
  assert.deepEqual(result.fastMana, ["Dark Ritual"]);
});

test("evaluateCommanderPowerSignal never calls an ordinary vanilla creature or a basic land fast mana", () => {
  const result = evaluateCommanderPowerSignal([vanillaBear, plains]);
  assert.deepEqual(result.fastMana, []);
});

test("evaluateCommanderPowerSignal classifies an unrestricted tutor separately from a basic-land tutor", () => {
  const result = evaluateCommanderPowerSignal([demonicTutor, rampantGrowth, vanillaBear, plains]);
  assert.deepEqual(result.tutors.unrestricted, ["Demonic Tutor"]);
  assert.deepEqual(result.tutors.restricted, ["Rampant Growth"]);
});

test("evaluateCommanderPowerSignal detects an extra-turn effect using real third-person phrasing", () => {
  const result = evaluateCommanderPowerSignal([timeWarp, vanillaBear, plains]);
  assert.deepEqual(result.extraTurns, ["Time Warp"]);
});

test("evaluateCommanderPowerSignal detects the unmistakable mass-land-denial template", () => {
  const result = evaluateCommanderPowerSignal([armageddon, vanillaBear, plains]);
  assert.deepEqual(result.massLandDenial, ["Armageddon"]);
});

test("evaluateCommanderPowerSignal never flags a card whose text merely mentions destroying a single land or a creature's lands-matter ability", () => {
  const conditional = card("Wasteland", "Land", "{T}, Sacrifice Wasteland: Destroy target nonbasic land.", 0);
  const result = evaluateCommanderPowerSignal([conditional, vanillaBear, plains]);
  assert.deepEqual(result.massLandDenial, []);
});

test("evaluateCommanderPowerSignal excludes the commander itself from the average CMC calculation", () => {
  const bigCommander = card("Some Legendary Dragon", "Legendary Creature — Dragon", "", 8, true);
  const result = evaluateCommanderPowerSignal([bigCommander, vanillaBear]);
  assert.equal(result.averageCmc, 2, "only Grizzly Bears (cmc 2) should count; the commander must be excluded");
});

test("evaluateCommanderPowerSignal excludes lands from every signal check and from average CMC", () => {
  const result = evaluateCommanderPowerSignal([plains, vanillaBear]);
  assert.equal(result.averageCmc, 2);
  assert.deepEqual(result.fastMana, []);
});

test("evaluateCommanderPowerSignal reports a real quantity-weighted average CMC for multi-copy rows", () => {
  const result = evaluateCommanderPowerSignal([
    { ...vanillaBear, quantity: 3 },
    { ...card("Colossal Dreadmaw", "Creature — Dinosaur", "", 6), quantity: 1 },
  ]);
  // (2*3 + 6*1) / 4 = 3
  assert.equal(result.averageCmc, 3);
});

test("evaluateCommanderPowerSignal escalates tier with signal density and stays honest about being a heuristic, not a rule", () => {
  const casual = evaluateCommanderPowerSignal([vanillaBear, plains]);
  assert.equal(casual.tier, "Casual");
  const vampiricTutor = card("Vampiric Tutor", "Instant", "Search your library for a card and put that card on top of your library. You lose 2 life.", 1);
  const maximum = evaluateCommanderPowerSignal([solRing, manaCrypt, birdsOfParadise, darkRitual, demonicTutor, vampiricTutor, timeWarp, armageddon, vanillaBear, plains]);
  assert.equal(maximum.tier, "Maximum");
  for (const result of [casual, maximum]) {
    assert.match(result.evidence, /forge theory/i);
    assert.match(result.evidence, /not a claim to match any official bracket system/i);
  }
});

test("evaluateCommanderPowerSignal deduplicates repeated card name occurrences within each signal list", () => {
  const result = evaluateCommanderPowerSignal([solRing, { ...solRing, quantity: 1 }]);
  assert.deepEqual(result.fastMana, ["Sol Ring"]);
});

test("evaluateCommanderPowerSignal is a pure function of its input — same cards, same result", () => {
  const cards = [solRing, demonicTutor, timeWarp, armageddon, vanillaBear, plains];
  assert.deepEqual(evaluateCommanderPowerSignal(cards), evaluateCommanderPowerSignal(cards));
});
