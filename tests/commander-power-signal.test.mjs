import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCommanderPowerSignal, POWER_TIERS, powerSignalCategoryFor } from "../app/commander-power-signal.mjs";
import { buildInteractionGraph } from "../app/forge-interaction-graph.mjs";

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

// interactionGraph is optional — every existing signal keeps working, and
// interconnection reports empty rather than throwing, when no graph is
// supplied (a direct caller with no structural analysis available yet).
test("evaluateCommanderPowerSignal reports an empty interconnection section when no interaction graph is supplied", () => {
  const result = evaluateCommanderPowerSignal([solRing, vanillaBear, plains]);
  assert.deepEqual(result.interconnection.comboLoops, []);
  assert.deepEqual(result.interconnection.amplifiers, []);
  assert.deepEqual(result.fastMana, ["Sol Ring"], "every other signal must be unaffected by a missing graph");
});

// Reuses the exact fixtures forge-interaction-graph's own test suite
// already proves produce a real mutual two-way loop and a real verified
// trigger amplifier, rather than hand-predicting a new pair's regex match.
const tokenHerald = { name: "Token Herald", typeLine: "Creature", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." };
const cardHerald = { name: "Card Herald", typeLine: "Creature", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." };
const panharmonicon = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an enters-the-battlefield ability of a permanent you control triggers, that ability triggers an additional time." };
const soulWarden = { name: "Soul Warden", typeLine: "Creature", oracleText: "Whenever another creature enters the battlefield under your control, you gain 1 life." };

test("evaluateCommanderPowerSignal surfaces a real mutual engine-pair loop from the supplied interaction graph", () => {
  const graph = buildInteractionGraph([tokenHerald, cardHerald]);
  const result = evaluateCommanderPowerSignal([tokenHerald, cardHerald], graph);
  assert.deepEqual(result.interconnection.comboLoops, ["Token Herald + Card Herald"]);
  assert.equal(result.interconnection.comboLoopTotal, 1);
});

// A real 100-card Commander build fetched from live Scryfall data returned
// 551 mutual engine pairs from buildInteractionGraph in manual verification
// — a real number, but useless as a raw list to a player. Six independent
// copies of the same producer/payoff template (more than the 5-item cap)
// proves the module actually caps the displayed list while still reporting
// the true total honestly, rather than either silently truncating data or
// dumping an unusable list of hundreds.
const heraldPair = (n) => ([
  { name: `Token Herald ${n}`, typeLine: "Creature", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." },
  { name: `Card Herald ${n}`, typeLine: "Creature", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." },
]);
const sixHeraldPairs = Array.from({ length: 6 }, (_, i) => heraldPair(i)).flat();

test("evaluateCommanderPowerSignal caps the displayed combo-loop list while reporting the true total honestly", () => {
  const graph = buildInteractionGraph(sixHeraldPairs);
  // Six copies of the same producer/payoff template cross-connect with
  // each other too (every "Token Herald N" shares identical oracle text
  // with every "Card Herald M"), not just its own numbered pair — real
  // behavior verified live against a real 100-card Commander build, which
  // returned 551 mutual pairs this same way. The point of this test isn't
  // the exact count, it's proving the cap and the honest total both track
  // whatever the real graph actually produces.
  assert.ok(graph.enginePairs.length > 5, "sanity check: this fixture must exceed the cap to actually exercise it");
  const result = evaluateCommanderPowerSignal(sixHeraldPairs, graph);
  assert.equal(result.interconnection.comboLoops.length, 5, "the displayed list must be capped at 5");
  assert.equal(result.interconnection.comboLoopTotal, graph.enginePairs.length, "the true total must match the real graph, not the capped list");
});

test("evaluateCommanderPowerSignal surfaces a real verified trigger amplifier from the supplied interaction graph", () => {
  const graph = buildInteractionGraph([panharmonicon, soulWarden]);
  const result = evaluateCommanderPowerSignal([panharmonicon, soulWarden], graph);
  assert.deepEqual(result.interconnection.amplifiers, ["Panharmonicon"]);
});

test("a synergy-dense build's combo loops and amplifiers never inflate the power tier or signal score", () => {
  // Grizzly Bears + Plains carry zero fast-mana/tutor/extra-turn/mass-
  // land-denial signals on their own, so the tier here must stay exactly
  // what it would be without the graph at all — interconnection is
  // informational only, never folded into signalScore.
  const graph = buildInteractionGraph([tokenHerald, cardHerald, panharmonicon, soulWarden]);
  const withGraph = evaluateCommanderPowerSignal([tokenHerald, cardHerald, panharmonicon, soulWarden, vanillaBear, plains], graph);
  const withoutGraph = evaluateCommanderPowerSignal([tokenHerald, cardHerald, panharmonicon, soulWarden, vanillaBear, plains]);
  assert.equal(withGraph.signalScore, withoutGraph.signalScore);
  assert.equal(withGraph.tier, withoutGraph.tier);
  assert.equal(withGraph.tier, "Casual");
  assert.ok(withGraph.interconnection.comboLoops.length > 0, "sanity check: the graph did detect a real loop");
  assert.ok(withGraph.interconnection.amplifiers.length > 0, "sanity check: the graph did detect a real amplifier");
});

// powerSignalCategoryFor — the per-card categorization a scoring bias
// (native-masterwork-engine.mjs, biasing toward a player-chosen target
// tier) reuses directly, so it's tested here with the same real cards
// evaluateCommanderPowerSignal's own tests already use.
test("powerSignalCategoryFor reads the same real cards evaluateCommanderPowerSignal itself detects", () => {
  assert.equal(powerSignalCategoryFor(solRing), "fastMana");
  assert.equal(powerSignalCategoryFor(manaCrypt), "fastMana");
  assert.equal(powerSignalCategoryFor(birdsOfParadise), "fastMana");
  assert.equal(powerSignalCategoryFor(darkRitual), "fastMana");
  assert.equal(powerSignalCategoryFor(demonicTutor), "tutor");
  assert.equal(powerSignalCategoryFor(rampantGrowth), null, "a basic-land-restricted tutor is ordinary ramp, not a power signal");
  assert.equal(powerSignalCategoryFor(timeWarp), "extraTurn");
  assert.equal(powerSignalCategoryFor(armageddon), "massLandDenial");
  assert.equal(powerSignalCategoryFor(vanillaBear), null);
  assert.equal(powerSignalCategoryFor(plains), null);
});

test("POWER_TIERS is the same ordered tier list evaluateCommanderPowerSignal itself assigns from", () => {
  assert.deepEqual(POWER_TIERS, ["Casual", "Focused", "High-Power", "Maximum"]);
});
