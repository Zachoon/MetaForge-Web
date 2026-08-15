import assert from "node:assert/strict";
import fs from "node:fs";
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
  assert.deepEqual(result.interconnection.resetShapes, []);
  assert.equal(result.interconnection.resetShapeTotal, 0);
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

test("reset/pay shapes are informational and do not count toward combo proximity", () => {
  const monolith = { name: "Basalt Monolith", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact.", cmc: 2 };
  const rings = { name: "Rings of Brighthearth", typeLine: "Artifact", oracleText: "{1}, {T}: Copy target activated or triggered ability you control. You may choose new targets for the copy.", cmc: 3 };
  const graph = buildInteractionGraph([monolith, rings]);
  const result = evaluateCommanderPowerSignal([monolith, rings], graph);
  assert.equal(graph.resetPairs.length, 1);
  assert.equal(result.interconnection.resetShapeTotal, 1);
  assert.deepEqual(result.interconnection.resetShapes, ["Basalt Monolith + Rings of Brighthearth"]);
  assert.equal(result.comboProximity.count, 0, "reset shapes must not enter the scored combo-proximity bar");
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

// A card matching both a light category (fastMana, weight 1) and a heavy
// one (repeatableValueEngine, weight 2) must be biased by its real
// strongest signal — previously this returned "fastMana" simply because
// powerCategoriesFor checks it first, regardless of weight.
const dualSignalCard = card("Test Dual Signal Rock", "Artifact", "Add {C}. Sacrifice a creature: Draw a card.", 0);

test("powerSignalCategoryFor returns the strongest matched category by weight, not the first one evaluated", () => {
  // Confirm the fixture genuinely matches both categories first —
  // otherwise the assertion below would pass vacuously if either
  // detector regressed.
  const bothCategories = evaluateCommanderPowerSignal([dualSignalCard]);
  assert.ok(bothCategories.fastMana.includes("Test Dual Signal Rock"), "sanity check: the fixture must actually match fastMana");
  assert.ok(bothCategories.repeatableValueEngine.includes("Test Dual Signal Rock"), "sanity check: the fixture must actually match repeatableValueEngine");
  assert.equal(powerSignalCategoryFor(dualSignalCard), "repeatableValueEngine", "repeatableValueEngine (weight 2) must win over fastMana (weight 1) even though fastMana is checked first");
});

test("POWER_TIERS is the same ordered tier list evaluateCommanderPowerSignal itself assigns from", () => {
  assert.deepEqual(POWER_TIERS, ["Casual", "Focused", "High-Power", "Maximum"]);
});

// --- Honest power-tier auditing redesign -----------------------------
// New card-level signals beyond the original four: efficient interaction,
// repeatable value engines (the fix for the reported failure below), and
// resource multiplication — plus deck-level redundancy, density, combo
// proximity, and commander-synergy aggregation. No named-card dataset is
// used anywhere in this module or its tests below — every fixture is
// chosen because its *oracle text* is a clean, unambiguous example of the
// mechanical shape being tested, the same convention the fixtures above
// already follow.

const efficientBolt = card("Test Efficient Removal", "Instant", "Destroy target creature.", 2);
const conditionalRemoval = card("Test Conditional Removal", "Instant", "Destroy target creature unless its controller pays {3}.", 2);
const expensiveRemoval = card("Test Expensive Removal", "Instant", "Destroy target creature.", 5);
const hardCounter = card("Test Hard Counter", "Instant", "Counter target spell.", 2);

test("isEfficientInteraction-driven category: a cheap, unconditional removal or counterspell is flagged; a conditional or expensive one is not", () => {
  assert.deepEqual(evaluateCommanderPowerSignal([efficientBolt]).efficientInteraction, ["Test Efficient Removal"]);
  assert.deepEqual(evaluateCommanderPowerSignal([hardCounter]).efficientInteraction, ["Test Hard Counter"]);
  assert.deepEqual(evaluateCommanderPowerSignal([conditionalRemoval]).efficientInteraction, [], "a pay-to-not-happen tax must not read as unconditional");
  assert.deepEqual(evaluateCommanderPowerSignal([expensiveRemoval]).efficientInteraction, [], "efficient interaction requires mana value 2 or less");
});

// --- Efficient interaction is a real signal, but not a high-ceiling one ---
// A healthy, entirely ordinary Commander interaction suite — six to ten
// cheap, unconditional removal/counterspells and nothing else — is
// exactly the shape a genuinely casual deck is expected to run. It must
// never, by itself, read as a repeatable engine, a compact combo piece,
// or mass land denial: none of these cards belong in highCeilingCards,
// none of them earn the redundancy bonus, and the density floor must
// never fire from this category alone.
const casualAnswer = (n) => card(`Test Casual Answer ${n}`, "Instant", "Destroy target creature.", 2);

test("six to ten efficient interaction spells alone do not push a casual deck to High-Power from interaction density", () => {
  for (const count of [6, 8, 10]) {
    const interactionSuite = Array.from({ length: count }, (_, i) => casualAnswer(i));
    const filler = Array.from({ length: 96 - count }, (_, i) => card(`Test Interaction Filler ${i}`, "Creature — Test", "", 3));
    const result = evaluateCommanderPowerSignal([...interactionSuite, ...filler]);
    assert.notEqual(result.tier, "High-Power", `${count} efficient interaction spells alone must not reach High-Power`);
    assert.notEqual(result.tier, "Maximum");
    assert.equal(result.highCeilingCount, 0, "efficient interaction must never count toward highCeilingCards");
    assert.equal(result.comboProximity.count, 0);
    assert.equal(result.efficientInteraction.length, count, "sanity check: the suite was actually detected as efficient interaction");
  }
});

test("generalPowerSignalCards includes efficient interaction; highCeilingCards deliberately excludes it", () => {
  const result = evaluateCommanderPowerSignal([efficientBolt, ...Array.from({ length: 95 }, (_, i) => card(`Test Filler ${i}`, "Creature — Test", "", 3))]);
  assert.deepEqual(result.generalPowerSignalCards, ["Test Efficient Removal"]);
  assert.deepEqual(result.highCeilingCards, []);
  assert.equal(result.highCeilingCount, 0);
});

const cheapCopyCombat = card("Test Warstrike", "Sorcery", "Target creature you control takes an additional combat phase this turn.", 3);
const manaDoubler = card("Test Mana Doubler", "Artifact", "Double the amount of mana this land produces.", 2);
const spellCopier = card("Test Reflection", "Instant", "Copy target instant or sorcery spell. You may choose new targets for the copy.", 3);

test("isResourceMultiplier-driven category: extra combat, mana doubling, and spell copying are all flagged; an ordinary spell is not", () => {
  assert.deepEqual(evaluateCommanderPowerSignal([cheapCopyCombat]).resourceMultiplier, ["Test Warstrike"]);
  assert.deepEqual(evaluateCommanderPowerSignal([manaDoubler]).resourceMultiplier, ["Test Mana Doubler"]);
  assert.deepEqual(evaluateCommanderPowerSignal([spellCopier]).resourceMultiplier, ["Test Reflection"]);
  assert.deepEqual(evaluateCommanderPowerSignal([vanillaBear]).resourceMultiplier, []);
});

// --- The reported failure and its fix ---------------------------------
// Exact current oracle text and mana values for the three cards named in
// the original bug report (a generated Doctor Doom villains Commander
// deck labeled Casual despite containing them), fetched live from the
// Scryfall API (api.scryfall.com/cards/named?exact=...) while writing
// this test — not paraphrased, not remembered, not guessed:
//   - Vivi Ornitier: oracle_id 0452be2a-e97a-4269-a9e3-b616265ecb2e,
//     set "fin" (Final Fantasy) #248, mana_cost {1}{U}{R}, cmc 3.
//   - Yawgmoth, Thran Physician: oracle_id
//     a1e232c0-dc38-47be-a5a0-f68bc1d86a29, set "dmr" (Dominaria
//     Remastered) #110, mana_cost {2}{B}{B}, cmc 4.
//   - Ancient Copper Dragon: oracle_id
//     48daee9d-ddaf-410f-8c3a-12fa1064ab56, set "clb" (Commander
//     Legends: Battle for Baldur's Gate) #161, mana_cost {4}{R}{R},
//     cmc 6.
// Reproduced here as the regression example, not as a rule: no code
// anywhere in commander-power-signal.mjs or native-masterwork-engine.mjs
// checks for these names (see the grep-based test further below). Each
// card's real ability lands in a different detected category — a
// noncreature-spell trigger with a per-opponent damage payoff, a
// repeatable pay-life-and-sacrifice engine with counter placement and
// card draw, and a combat-damage trigger that creates a d20-scaled
// number of Treasures — proving the fix catches the real cards' actual
// mechanics, not text invented to match a regex.
const vivi = card(
  "Vivi Ornitier",
  "Legendary Creature — Wizard",
  "{0}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power. Activate only during your turn and only once each turn.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.",
  3,
);
const yawgmoth = card(
  "Yawgmoth, Thran Physician",
  "Legendary Creature — Human Cleric",
  "Protection from Humans\nPay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card.\n{B}{B}, Discard a card: Proliferate.",
  4,
);
const ancientCopperDragon = card(
  "Ancient Copper Dragon",
  "Creature — Elder Dragon",
  "Flying\nWhenever this creature deals combat damage to a player, roll a d20. You create a number of Treasure tokens equal to the result.",
  6,
);

test("Ancient Copper Dragon's real Treasure-generation ability (combat damage to a player, roll a d20, create that many Treasures) is detected as a repeatable value engine — its text has nothing to do with legendary spells or tutoring", () => {
  const result = evaluateCommanderPowerSignal([ancientCopperDragon]);
  assert.deepEqual(result.repeatableValueEngine, ["Ancient Copper Dragon"]);
  assert.deepEqual(result.tutors.unrestricted, [], "the real card never searches a library — it must not be misclassified as a tutor");
});

test("Vivi Ornitier's real ability (a noncreature-spell trigger dealing damage to each opponent) is detected without needing a card-draw or token clause", () => {
  const result = evaluateCommanderPowerSignal([vivi]);
  assert.deepEqual(result.repeatableValueEngine, ["Vivi Ornitier"]);
});

test("Yawgmoth's real ability (pay life and sacrifice another creature for a counter and a card) is detected as a repeatable sacrifice engine", () => {
  const result = evaluateCommanderPowerSignal([yawgmoth]);
  assert.deepEqual(result.repeatableValueEngine, ["Yawgmoth, Thran Physician"]);
});
const villainCommander = card("Test Villain Commander", "Legendary Creature — Test", "", 3, true);
const villainFiller = Array.from({ length: 90 }, (_, i) => card(`Villain Filler ${i}`, "Creature — Test", "", 3));
const villainLands = Array.from({ length: 6 }, (_, i) => card(`Villain Island ${i}`, "Land", "", 0));

test("the reported failure no longer lands in Casual: three real, independently powerful repeatable engines escape the average of an otherwise ordinary 96-card shell", () => {
  const result = evaluateCommanderPowerSignal([villainCommander, vivi, yawgmoth, ancientCopperDragon, ...villainFiller, ...villainLands]);
  assert.notEqual(result.tier, "Casual");
  assert.deepEqual(result.repeatableValueEngine.slice().sort(), ["Ancient Copper Dragon", "Vivi Ornitier", "Yawgmoth, Thran Physician"]);
  assert.equal(result.highCeilingCount, 3);
});

test("no Doom-, Vivi-, Yawgmoth-, or Ancient Copper Dragon-specific code is involved in the fix", () => {
  const source = fs.readFileSync(new URL("../app/commander-power-signal.mjs", import.meta.url), "utf8")
    + fs.readFileSync(new URL("../app/native-masterwork-engine.mjs", import.meta.url), "utf8");
  for (const name of ["Doctor Doom", "Vivi Ornitier", "Yawgmoth", "Ancient Copper Dragon"]) {
    assert.doesNotMatch(source, new RegExp(name, "i"), `${name} must never appear as a name-matched special case in the engine source`);
  }
});

// A completely different theme/archetype/card pool, chosen specifically
// to prove the fix generalizes rather than only working for the three
// cards named in the bug report — different names, different flavor,
// same underlying mechanical shapes (a spell-cast trigger with a value
// payoff, a repeatable sacrifice-outlet engine, and a legendary-cast
// tutor-and-cheat engine).
const grandArchivist = card("Test Grand Archivist", "Legendary Creature — Test", "Whenever you cast an instant or sorcery spell, draw a card.", 3);
const boneHarvester = card("Test Bone Harvester", "Creature — Test", "Sacrifice a creature: Draw a card.", 2);
const chronicleThief = card("Test Chronicle Thief", "Legendary Creature — Test", "Whenever you cast a legendary spell, search your library for a card, put it onto the battlefield, then shuffle.", 5);
const otherFiller = Array.from({ length: 90 }, (_, i) => card(`Other Filler ${i}`, "Creature — Test", "", 3));

test("generalizes to an unrelated commander, theme, and card pool: three independently powerful, differently-named cards also escape Casual", () => {
  const result = evaluateCommanderPowerSignal([grandArchivist, boneHarvester, chronicleThief, ...otherFiller]);
  assert.notEqual(result.tier, "Casual");
  assert.ok(result.repeatableValueEngine.includes("Test Grand Archivist"));
  assert.ok(result.repeatableValueEngine.includes("Test Bone Harvester"));
  assert.ok(result.repeatableValueEngine.includes("Test Chronicle Thief"));
});

test("multiple unrelated high-ceiling cards are not hidden by an otherwise ordinary average, however large the shell", () => {
  const small = evaluateCommanderPowerSignal([grandArchivist, boneHarvester, chronicleThief, ...otherFiller.slice(0, 10)]);
  const large = evaluateCommanderPowerSignal([grandArchivist, boneHarvester, chronicleThief, ...otherFiller]);
  assert.equal(small.tier, large.tier, "the same three high-ceiling cards must read the same regardless of how much ordinary filler surrounds them — this score is never divided by deck size");
  assert.notEqual(large.tier, "Casual");
});

test("a single splashy card does not automatically elevate a genuinely casual shell", () => {
  const result = evaluateCommanderPowerSignal([yawgmoth, ...villainFiller.slice(0, 95)]);
  assert.equal(result.tier, "Casual");
  assert.equal(result.highCeilingCount, 1);
});

test("an expensive but low-powered deck is not inflated — price is never read by this module at all", () => {
  const pricey = Array.from({ length: 96 }, (_, i) => ({ ...card(`Pricey Filler ${i}`, "Creature — Test", "", 3), priceUsd: 400, rarity: "mythic" }));
  const result = evaluateCommanderPowerSignal(pricey);
  assert.equal(result.tier, "Casual");
});

test("a synergy-dense casual deck without verified high-power characteristics is not automatically promoted", () => {
  // Reuses the exact fixtures the pre-existing interconnection test above
  // already proves form a real mutual loop and a real amplifier — none of
  // these four cards independently match any power category, so a
  // synergy-dense shell built entirely from them must stay Casual.
  const graph = buildInteractionGraph([tokenHerald, cardHerald, panharmonicon, soulWarden]);
  const result = evaluateCommanderPowerSignal([tokenHerald, cardHerald, panharmonicon, soulWarden, vanillaBear, plains], graph);
  assert.equal(result.tier, "Casual");
  assert.equal(result.highCeilingCount, 0);
});

// --- Compact combo proximity -------------------------------------------
// Two cheap cards, each independently a verified repeatable-value engine
// on its own oracle text, that also form a real mutual interaction-graph
// loop (Bone Reaper feeds Card Reaper's draw payoff; Card Reaper feeds
// Bone Reaper's sacrifice payoff back) — verified directly against
// buildInteractionGraph before writing this test, not assumed.
const boneReaper = card("Test Bone Reaper", "Creature — Test", "Sacrifice a creature: Draw a card, then this deals 1 damage to any target. Whenever another creature you control dies, you may sacrifice another creature.", 2);
const cardReaper = card("Test Card Reaper", "Creature — Test", "When this creature dies, draw a card if you have seven or more cards in your hand. Sacrifice another creature: This deals 2 damage to any target.", 1);

test("an inexpensive, compact two-card combo can measure high on its own, via a verified mutual interaction-graph loop between two independently high-ceiling cards", () => {
  const graph = buildInteractionGraph([boneReaper, cardReaper]);
  assert.equal(graph.enginePairs.length, 1, "sanity check: these two cards must actually form a real mutual loop");
  const result = evaluateCommanderPowerSignal([boneReaper, cardReaper], graph);
  assert.notEqual(result.tier, "Casual");
  assert.equal(result.comboProximity.count, 1);
  assert.deepEqual(result.comboProximity.pairs, ["Test Bone Reaper + Test Card Reaper"]);
});

test("comboProximity never credits a mutual loop unless both cards are independently verified high-ceiling — an ordinary synergy pair earns nothing", () => {
  const graph = buildInteractionGraph([tokenHerald, cardHerald]);
  const result = evaluateCommanderPowerSignal([tokenHerald, cardHerald], graph);
  assert.equal(result.comboProximity.count, 0);
  assert.deepEqual(result.comboProximity.pairs, []);
});

// --- Redundancy ----------------------------------------------------------
test("redundancy within a category earns real credit beyond the first card's own weight", () => {
  const one = evaluateCommanderPowerSignal([demonicTutor, ...villainFiller.slice(0, 95)]);
  const vampiricTutor = card("Test Vampiric Tutor", "Instant", "Search your library for a card and put that card on top of your library. You lose 2 life.", 1);
  const another = card("Test Mystical Tutor", "Instant", "Search your library for an instant or sorcery card, reveal it, then shuffle and put it on top.", 1);
  const three = evaluateCommanderPowerSignal([demonicTutor, vampiricTutor, another, ...villainFiller.slice(0, 93)]);
  assert.ok(three.signalScore > one.signalScore * 3, "three tutors must score more than a naive 3x an already-generous per-card weight, from the redundancy bonus on top");
});

// --- Commander-specific synergy -----------------------------------------
const spellsMatterCommander = card("Test Archmage Commander", "Legendary Creature — Test", "Instant and sorcery spells you cast cost {1} less to cast. Whenever you cast an instant or sorcery spell, create a 1/1 token.", 3, true);
const neutralCommander = card("Test Neutral Commander", "Legendary Creature — Test", "", 3, true);
const realSpells = Array.from({ length: 16 }, (_, i) => card(`Test Bolt ${i}`, "Instant", "This deals 3 damage to any target.", 1));
const tooFewSpells = Array.from({ length: 8 }, (_, i) => card(`Test Bolt ${i}`, "Instant", "This deals 3 damage to any target.", 1));
const genericFiller = Array.from({ length: 70 }, (_, i) => card(`Test Filler ${i}`, "Creature — Test", "", 3));

test("commander-specific synergy elevates the assessment only once the deck actually carries the resource the commander amplifies in real quantity", () => {
  const withEnoughSpells = evaluateCommanderPowerSignal([spellsMatterCommander, ...realSpells, ...genericFiller]);
  assert.equal(withEnoughSpells.commanderSynergy.spellSynergy, true);
  assert.notEqual(withEnoughSpells.tier, "Casual");

  const withTooFewSpells = evaluateCommanderPowerSignal([spellsMatterCommander, ...tooFewSpells, ...genericFiller]);
  assert.equal(withTooFewSpells.commanderSynergy.spellSynergy, false);
  assert.equal(withTooFewSpells.tier, "Casual", "the same commander text without a real spell shell behind it must not be credited");

  const withNeutralCommander = evaluateCommanderPowerSignal([neutralCommander, ...realSpells, ...genericFiller]);
  assert.equal(withNeutralCommander.commanderSynergy.spellSynergy, false);
  assert.equal(withNeutralCommander.tier, "Casual", "the same real spell count without a commander that actually amplifies it must not be credited");
});

test("a commander that independently carries its own power signal is credited beyond its one-of-99 weight, since it is guaranteed access every game", () => {
  const commanderYawgmoth = { ...yawgmoth, isCommander: true };
  const asCommander = evaluateCommanderPowerSignal([commanderYawgmoth, ...villainFiller.slice(0, 95)]);
  const asOrdinaryCard = evaluateCommanderPowerSignal([yawgmoth, ...villainFiller.slice(0, 95)]);
  assert.ok(asCommander.signalScore > asOrdinaryCard.signalScore, "the exact same card must score higher when it's the guaranteed-access commander than a random 1-of-99 inclusion");
  assert.equal(asCommander.commanderSynergy.ownSignal, true);
});
