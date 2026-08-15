import assert from "node:assert/strict";
import test from "node:test";
import { applyPracticalTiebreak, budgetScoreFor, classifyNativeCard, colorPipsFromCost, commanderConnectionSignalsFor, commanderMechanicalScopes, comparePracticalImpact, complexityScoreFor, conceptSignals, curveAwareLandAdjustment, curveTargets, evaluatePracticalImpact, fieldCounterRolesFor, forgeNativeMasterwork, hypergeometricAtLeast, interactionQualityFor, manaConsistencyReport, oracleTextComplexity, parseNativeBlueprintIntent, poolMechanicalSignals, popularityScoreFromRank, powerTierScoreFor, practicalOutranks, proportionalBasicCounts, rankPracticalOneSlotCounterfactuals, runPracticalOneSlotCounterfactualLab, synergyPotentialFor } from "../app/native-masterwork-engine.mjs";
import { runOneSlotCounterfactualLab } from "../app/native-one-slot-lab.mjs";

const card = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const pool = [
  ...Array.from({ length: 28 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("classifies native deck-building roles from verified rules text", () => {
  assert.deepEqual(classifyNativeCard(card("Answer", "Destroy target creature. Draw a card.")), ["draw", "interaction", "threat"]);
});

test("classifies hand disruption as its own role, distinct from removal and self-loot", () => {
  assert.deepEqual(classifyNativeCard(card("Thoughtseize", "Target player reveals their hand. You choose a nonland card from it. That player discards that card.", "Sorcery")), ["discard"]);
  assert.deepEqual(classifyNativeCard(card("Mind Rot", "Target opponent discards two cards.", "Sorcery")), ["discard"]);
  // "you may discard a card, then draw" is self-loot filtering, not hand
  // disruption, and must not be tagged discard (it still separately reads
  // as "draw" too, since it does draw cards — that part is unrelated to
  // this distinction).
  assert.deepEqual(classifyNativeCard(card("Careful Study", "You may discard a card. If you do, draw two cards.", "Sorcery")), ["draw", "selection"]);
});

test("classifyNativeCard adds a role confirmed by the card-mechanics database even when the oracle text alone wouldn't match", () => {
  // Real cards from app/card-mechanics.mjs, each tagged with the mechanic
  // named in the test but given no oracle text here — any role that still
  // comes back can only have come from the database lookup, not the regex.
  assert.deepEqual(classifyNativeCard(card("_____ goblin", "", "Sorcery")), ["ramp"]);
  // Also tagged mana_acceleration — a real card can carry more than one
  // database-confirmed role at once, same as regex classification already
  // allows.
  assert.deepEqual(classifyNativeCard(card("a-jade orb of dragonkind", "", "Sorcery")), ["ramp", "protection"]);
  assert.deepEqual(classifyNativeCard(card("a good day to pie", "", "Sorcery")), ["recursion"]);
  // Also tagged lifegain.
  assert.deepEqual(classifyNativeCard(card("a-cosmos elixir", "", "Sorcery")), ["selection", "lifegain"]);
  assert.deepEqual(classifyNativeCard(card("a girl and her dogs", "", "Sorcery")), ["tokens"]);
  assert.deepEqual(classifyNativeCard(card("_____-o-saurus", "", "Sorcery")), ["counters"]);
  assert.deepEqual(classifyNativeCard(card("17-year cicadas", "", "Sorcery")), ["spells"]);
  assert.deepEqual(classifyNativeCard(card("a golden opportunity", "", "Sorcery")), ["sacrifice"]);
  assert.deepEqual(classifyNativeCard(card("_____ bird gets the worm", "", "Sorcery")), ["lifegain"]);
});

test("classifyNativeCard never calls a basic land \"ramp\" just because the database tags it mana_acceleration", () => {
  // Every basic land is tagged mana_acceleration in the database — true of
  // any land, and not what the "ramp" role means (accelerating ahead of
  // your land drops). Real mana rocks/dorks are never lands, so this must
  // stay scoped to land cards specifically, not a blanket tag distrust.
  assert.deepEqual(classifyNativeCard(card("Island", "", "Basic Land — Island")), ["land"]);
  assert.deepEqual(classifyNativeCard(card("_____ goblin", "", "Sorcery")), ["ramp"]);
});

test("classifyNativeCard never invents a role for a card the database doesn't recognize", () => {
  assert.deepEqual(classifyNativeCard(card("Totally Made Up Card Name Xyz", "", "Sorcery")), []);
});

test("database-confirmed and regex-confirmed roles for the same card merge without duplicates", () => {
  // "A Golden Opportunity" is tagged sacrifice_outlet in the database; give
  // it oracle text that also regex-matches "sacrifice" to prove the merge
  // is a deduplicated union, not two separate entries.
  assert.deepEqual(classifyNativeCard(card("A Golden Opportunity", "Sacrifice a creature.", "Sorcery")), ["sacrifice"]);
});

test("conceptSignals reads a commander's own database-confirmed roles, not just its oracle-text regex matches", () => {
  // Same real card/tag pairs as classifyNativeCard's database tests above,
  // now read through conceptSignals — the function that turns a commander's
  // text into the "does this card do what my commander cares about" synergy
  // signal. Empty oracle text means any signal here can only have come from
  // the database lookup.
  assert.deepEqual(conceptSignals(card("_____ goblin", "", "Legendary Creature")), ["ramp"]);
  assert.deepEqual(conceptSignals(card("a golden opportunity", "", "Legendary Enchantment")), ["sacrifice"]);
  // A commander's real rules text still contributes its regex-matched
  // signals alongside any database-confirmed ones, deduplicated.
  assert.deepEqual(
    conceptSignals(card("Blood Artist Commander", "Whenever a creature dies, you gain 1 life.", "Legendary Creature")),
    ["sacrifice", "lifegain"],
  );
});

test("conceptSignals never calls a commander printed on a basic land \"ramp\" from the mana_acceleration tag", () => {
  assert.deepEqual(conceptSignals(card("Island", "", "Basic Land — Island")), []);
});

test("commander connections preserve Ayula's Bear-only counter and ETB scope", () => {
  const ayula = card(
    "Ayula, Queen Among Bears",
    "Whenever another Bear you control enters, choose one — Put two +1/+1 counters on target Bear. Target Bear you control fights target creature you don't control.",
    "Legendary Creature — Bear",
    "{1}{G}",
    ["G"],
  );
  const scopes = commanderMechanicalScopes(ayula);
  const commanderMechanics = { produces: ["counters"], rewards: ["etb"] };
  assert.deepEqual(scopes.produces.counters, ["bear"]);
  assert.deepEqual(scopes.rewards.etb, ["bear"]);

  assert.deepEqual(commanderConnectionSignalsFor(
    card("Basking Broodscale", "Whenever one or more +1/+1 counters are put on this creature, create a token.", "Creature — Eldrazi Lizard"),
    { produces: [], rewards: ["counters"] }, commanderMechanics, scopes,
  ), [], "a non-Bear self-counter payoff is not an Ayula connection");
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Bear Counter Student", "Whenever one or more +1/+1 counters are put on this creature, draw a card.", "Creature — Bear"),
    { produces: [], rewards: ["counters"] }, commanderMechanics, scopes,
  ), ["counters", "etb"], "a Bear permanent both receives Ayula's counters and triggers her Bear ETB ability");
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Plant Parade", "Create three 0/1 green Plant creature tokens.", "Sorcery"),
    { produces: ["etb"], rewards: [] }, commanderMechanics, scopes,
  ), [], "generic creature tokens do not trigger Ayula");
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Bear Parade", "Create three 2/2 green Bear creature tokens.", "Sorcery"),
    { produces: ["etb"], rewards: [] }, commanderMechanics, scopes,
  ), ["etb"]);
});

test("commander connections preserve named Clue production while admitting real artifact payoffs", () => {
  const malcolm = card(
    "Malcolm, the Eyes",
    "Whenever you cast your second spell each turn, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")",
    "Legendary Creature — Siren Pirate",
    "{U}{R}",
    ["U", "R"],
  );
  const scopes = commanderMechanicalScopes(malcolm);
  const commanderMechanics = { produces: ["tokens", "artifacts", "clues"], rewards: ["spells"] };
  assert.deepEqual(scopes.produces.artifacts, ["clue"]);
  assert.deepEqual(scopes.produces.clues, ["clue"]);
  assert.ok(!scopes.produces.tokens.includes("colorless"), "reminder-text colors are not token identities");

  assert.deepEqual(commanderConnectionSignalsFor(
    card("Clue Archivist", "Whenever an artifact enters under your control, draw a card.", "Creature — Human Artificer"),
    { produces: [], rewards: ["artifacts"] }, commanderMechanics, scopes,
  ), ["artifacts"], "a generic artifact payoff genuinely rewards every Clue Malcolm makes");
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Treasure Clerk", "Whenever you sacrifice a Treasure, create a 1/1 token.", "Creature — Human"),
    { produces: ["tokens"], rewards: ["treasure"] }, commanderMechanics, scopes,
  ), [], "Treasure-specific text gets no false Clue credit or generic-token shortcut");
});

test("commander connections preserve named Food production without granting Treasure payoffs", () => {
  const cook = card(
    "Gyome, Master Chef",
    "At the beginning of your end step, create a Food token for each nontoken creature you controlled that entered this turn.",
    "Legendary Creature — Troll Warlock",
    "{2}{B}{G}",
    ["B", "G"],
  );
  const scopes = commanderMechanicalScopes(cook);
  const commanderMechanics = { produces: ["tokens", "artifacts", "food"], rewards: [] };
  assert.deepEqual(scopes.produces.artifacts, ["food"]);
  assert.deepEqual(scopes.produces.food, ["food"]);

  assert.deepEqual(commanderConnectionSignalsFor(
    card("Feast Celebrant", "Whenever you sacrifice a Food, draw a card.", "Creature — Halfling"),
    { produces: [], rewards: ["food"] }, commanderMechanics, scopes,
  ), ["food"]);
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Treasure Celebrant", "Whenever you sacrifice a Treasure, draw a card.", "Creature — Human"),
    { produces: [], rewards: ["treasure"] }, commanderMechanics, scopes,
  ), [], "a Food commander does not grant a Treasure-only commander edge");
});

test("commander connections preserve named Blood production without granting Food payoffs", () => {
  const anje = card(
    "Anje, Maid of Dishonor",
    "Whenever Anje or one or more other Vampires enter under your control, create a Blood token. This ability triggers only once each turn.",
    "Legendary Creature — Vampire",
    "{2}{B}{R}",
    ["B", "R"],
  );
  const scopes = commanderMechanicalScopes(anje);
  const commanderMechanics = { produces: ["tokens", "artifacts", "blood"], rewards: [] };
  assert.deepEqual(scopes.produces.artifacts, ["blood"]);
  assert.deepEqual(scopes.produces.blood, ["blood"]);

  assert.deepEqual(commanderConnectionSignalsFor(
    card("Blood Celebrant", "Whenever you sacrifice a Blood token, draw a card.", "Creature — Vampire"),
    { produces: [], rewards: ["blood"] }, commanderMechanics, scopes,
  ), ["blood"]);
  assert.deepEqual(commanderConnectionSignalsFor(
    card("Feast Celebrant", "Whenever you sacrifice a Food, draw a card.", "Creature — Halfling"),
    { produces: [], rewards: ["food"] }, commanderMechanics, scopes,
  ), [], "a Blood commander does not grant a Food-only commander edge");
});

test("interactionQualityFor scores unconditional removal at full quality", () => {
  assert.equal(interactionQualityFor("Destroy target creature."), 1);
  assert.equal(interactionQualityFor("Exile target permanent."), 1);
  assert.equal(interactionQualityFor("Counter target spell."), 1);
  assert.equal(interactionQualityFor("Deals 3 damage to target creature."), 1);
  // "Nonland permanent" excludes lands, which is what makes this template
  // (Anguished Unmaking, Vindicate) one of the broadest, most flexible
  // removal effects in the game — it must not read as a restriction just
  // because the word starts with "non".
  assert.equal(interactionQualityFor("Exile target nonland permanent."), 1);
});

test("interactionQualityFor downweights restricted removal that can simply whiff", () => {
  assert.equal(interactionQualityFor("Destroy target creature with mana value 3 or less."), 0.66);
  assert.equal(interactionQualityFor("Exile target creature with power 4 or greater."), 0.74);
  assert.equal(interactionQualityFor("Counter target spell unless its controller pays {3}."), 0.74);
  // Combat-state and color/type restrictions have no clean numeric severity
  // signal to grade against, so they keep the original flat penalty.
  assert.equal(interactionQualityFor("Destroy target attacking or blocking creature."), 0.65);
  assert.equal(interactionQualityFor("Destroy target nonblack creature."), 0.65);
});

test("interactionQualityFor grades a numeric cap's severity instead of one flat penalty for every conditional removal spell", () => {
  // "Mana value N or less" gets broader — and so better — as N rises: a
  // 1-or-less cap misses almost every real creature, a 6-or-less cap misses
  // almost none.
  const veryNarrow = interactionQualityFor("Destroy target creature with mana value 1 or less.");
  const midCap = interactionQualityFor("Destroy target creature with mana value 3 or less.");
  const wideCap = interactionQualityFor("Destroy target creature with mana value 6 or less.");
  assert.ok(veryNarrow < midCap && midCap < wideCap, `expected 1-or-less (${veryNarrow}) < 3-or-less (${midCap}) < 6-or-less (${wideCap})`);
  assert.ok(wideCap < 1, "even a wide cap should stay below a truly unconditional spell");

  // "N or greater" is the mirror image: a 1-or-greater bar clears almost
  // every creature, a 6-or-greater bar clears almost none.
  const easyBar = interactionQualityFor("Exile target creature with power 1 or greater.");
  const midBar = interactionQualityFor("Exile target creature with power 4 or greater.");
  const hardBar = interactionQualityFor("Exile target creature with power 7 or greater.");
  assert.ok(easyBar > midBar && midBar > hardBar, `expected 1-or-greater (${easyBar}) > 4-or-greater (${midBar}) > 7-or-greater (${hardBar})`);

  // A counterspell's tax is the opponent's restriction, not the caster's —
  // quality rises with the tax instead of falling.
  const lightTax = interactionQualityFor("Counter target spell unless its controller pays {1}.");
  const heavyTax = interactionQualityFor("Counter target spell unless its controller pays {5}.");
  assert.ok(lightTax < heavyTax, `expected a light {1} tax (${lightTax}) to score below a heavy {5} tax (${heavyTax})`);

  // An unparseable tax (no stated amount) keeps the original flat penalty
  // rather than inventing a severity from nothing.
  assert.equal(interactionQualityFor("Counter target spell unless its controller pays {X}."), 0.65);
});

test("a restricted removal spell still classifies as interaction — only its scoring weight changes, not its role", () => {
  assert.deepEqual(classifyNativeCard(card("Doom Blade", "Destroy target nonblack creature.", "Instant")), ["interaction"]);
});

test("prefers unconditional removal over otherwise-identical conditional removal once slots are scarce", () => {
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const unconditionalFiller = Array.from({ length: 3 }, (_, i) => card(`Clean Removal ${i}`, "Destroy target creature.", "Instant"));
  const conditionalFiller = Array.from({ length: 3 }, (_, i) => card(`Restricted Removal ${i}`, "Destroy target creature with mana value 3 or less.", "Instant"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, ...unconditionalFiller, ...conditionalFiller, ...lands],
  });
  const unconditionalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Clean Removal")).reduce((sum, row) => sum + row.quantity, 0);
  const conditionalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Restricted Removal")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(unconditionalQuantity > 0, "expected at least some unconditional removal to make the cut");
  assert.ok(
    unconditionalQuantity > conditionalQuantity,
    `expected unconditional removal (${unconditionalQuantity}) to outcompete otherwise-identical restricted removal (${conditionalQuantity})`,
  );
});

// Fixture builders for comparePracticalImpact — real evaluateSimulationGate/
// evaluateMatchupMatrix shapes, hand-built so the comparison logic itself
// can be tested deterministically without paying for real simulation runs.
const practical = (goldfishGate, keepableRate, planRealizationRate, matrixGate, scenarioPassRate, opponent = "Aggro") => ({
  goldfish: { gate: goldfishGate, expert: { keepableRate, planRealizationRate } },
  matrix: { gate: matrixGate, weakest: { scenarioPassRate, opponent } },
});

test("comparePracticalImpact passes when nothing meaningfully changes", () => {
  const before = practical("goldfish-pass", 0.8, 0.7, "matrix-pass", 0.65);
  const after = practical("goldfish-pass", 0.79, 0.71, "matrix-pass", 0.66);
  assert.deepEqual(comparePracticalImpact(before, after), { passed: true, reasons: [] });
});

test("comparePracticalImpact fails a swap that drops to a worse goldfish gate tier", () => {
  const before = practical("goldfish-pass", 0.8, 0.7, "matrix-pass", 0.65);
  const after = practical("consistency-fail", 0.8, 0.7, "matrix-pass", 0.65);
  const result = comparePracticalImpact(before, after);
  assert.equal(result.passed, false);
  assert.match(result.reasons[0], /consistency regresses from goldfish pass to consistency fail/i);
});

test("comparePracticalImpact fails a swap that drops to a worse matchup gate tier", () => {
  const before = practical("goldfish-pass", 0.8, 0.7, "matrix-pass", 0.65);
  const after = practical("goldfish-pass", 0.8, 0.7, "matrix-hold", 0.65);
  const result = comparePracticalImpact(before, after);
  assert.equal(result.passed, false);
  assert.match(result.reasons.join(" "), /matchup stress testing regresses from matrix pass to matrix hold/i);
});

test("comparePracticalImpact fails a meaningful rate drop even within the same gate tier", () => {
  const before = practical("goldfish-pass", 0.80, 0.70, "matrix-pass", 0.65);
  const after = practical("goldfish-pass", 0.68, 0.70, "matrix-pass", 0.65);
  const result = comparePracticalImpact(before, after);
  assert.equal(result.passed, false);
  assert.match(result.reasons.join(" "), /keepable rate falls by 12\.0 points/i);
});

test("comparePracticalImpact tolerates a small, ordinary rate wobble within the same gate tier", () => {
  const before = practical("goldfish-pass", 0.80, 0.70, "matrix-pass", 0.65);
  const after = practical("goldfish-pass", 0.75, 0.70, "matrix-pass", 0.65);
  assert.equal(comparePracticalImpact(before, after).passed, true);
});

test("comparePracticalImpact fails a meaningful drop in the hardest matchup's scenario pass rate", () => {
  const before = practical("goldfish-pass", 0.80, 0.70, "matrix-pass", 0.65, "Aggro");
  const after = practical("goldfish-pass", 0.80, 0.70, "matrix-pass", 0.50, "Aggro");
  const result = comparePracticalImpact(before, after);
  assert.equal(result.passed, false);
  assert.match(result.reasons.join(" "), /hardest stress-test pass rate falls by 15\.0 points against Aggro/i);
});

test("comparePracticalImpact never rewards an improvement as a failure", () => {
  const before = practical("consistency-fail", 0.5, 0.4, "matrix-hold", 0.3);
  const after = practical("goldfish-pass", 0.9, 0.8, "matrix-pass", 0.7);
  assert.deepEqual(comparePracticalImpact(before, after), { passed: true, reasons: [] });
});

test("evaluatePracticalImpact runs a real deterministic simulation against a supplied baseline", () => {
  const input = { format: "Standard", strategy: "Balanced midrange", target: 60, colors: ["U"], cards: pool };
  const rows = [
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Island Utility ${i}`, roles: ["land"], cmc: 0, quantity: 1 })),
    ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, roles: ["interaction"], cmc: 2, quantity: 1 })),
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Flow ${i}`, roles: ["draw"], cmc: 3, quantity: 1 })),
  ];
  // An intentionally unbeatable baseline so the real "after" run reported
  // below it is a stable, deterministic thing to assert on, not a coin
  // flip against an equally-real baseline.
  const perfectBaseline = { goldfish: { gate: "goldfish-pass", expert: { keepableRate: 1, planRealizationRate: 1 } }, matrix: { gate: "matrix-pass", weakest: { scenarioPassRate: 1, opponent: "Aggro" } } };
  const first = evaluatePracticalImpact(perfectBaseline, rows, input);
  const second = evaluatePracticalImpact(perfectBaseline, rows, input);
  assert.deepEqual(first, second, "same inputs must produce the same practical evaluation every time");
  assert.ok(first.after.goldfish.gate);
  assert.ok(first.after.matrix.gate);
  assert.equal(first.passed, false, "nothing beats a perfect baseline, so this should always report a regression");
  assert.ok(first.reasons.length > 0);
});

const practicalInput = { format: "Standard", target: 60, strategy: "Balanced midrange", colors: ["U"], seed: 9, cards: pool };

test("rankPracticalOneSlotCounterfactuals adds real practical evidence, and confident always means both gates passed", () => {
  const report = forgeNativeMasterwork(practicalInput);
  const first = rankPracticalOneSlotCounterfactuals(report.selected, report.candidates, practicalInput, { limit: 3 });
  const second = rankPracticalOneSlotCounterfactuals(report.selected, report.candidates, practicalInput, { limit: 3 });
  assert.deepEqual(first, second, "must be fully deterministic for the same inputs");
  assert.ok(["advance", "inconclusive"].includes(first.verdict));
  assert.ok(first.experiments.length <= 3);
  for (const experiment of first.experiments) {
    if (experiment.confident) {
      assert.ok(experiment.practical, "confident requires a real practical evaluation to back it");
      assert.equal(experiment.practical.passed, true);
    }
    // Never promotes a candidate the structural gate itself rejected —
    // practical evaluation can only demote a theoretical pass, never
    // rescue a theoretical failure.
    if (!experiment.gate.passed) assert.equal(experiment.confident, false);
  }
});

test("rankPracticalOneSlotCounterfactuals skips practical simulation for candidates that already failed the structural gate", () => {
  const report = forgeNativeMasterwork(practicalInput);
  const result = rankPracticalOneSlotCounterfactuals(report.selected, report.candidates, practicalInput, { limit: 3 });
  for (const experiment of result.experiments) {
    if (!experiment.gate.passed) assert.equal(experiment.practical, null);
  }
});

test("runPracticalOneSlotCounterfactualLab only advances when the theoretical winner also clears practical simulation", () => {
  const report = forgeNativeMasterwork(practicalInput);
  const first = runPracticalOneSlotCounterfactualLab(report.selected, report.candidates, report.reasoning, practicalInput);
  const second = runPracticalOneSlotCounterfactualLab(report.selected, report.candidates, report.reasoning, practicalInput);
  assert.deepEqual(first, second, "must be fully deterministic for the same inputs");
  assert.ok(["advance", "inconclusive"].includes(first.verdict));
  if (first.verdict === "advance") {
    assert.ok(first.practical);
    assert.equal(first.practical.passed, true);
  } else if (first.practical) {
    // Practical evaluation ran (the theoretical winner cleared its gate)
    // and failed — a real, distinct rejection reason from a plain
    // structural miss.
    assert.ok(first.experiment);
    assert.match(first.summary, /cleared every structural gate but failed practical simulation testing/i);
  } else {
    // Never reached practical evaluation at all — the theoretical gate
    // itself already held the list, same as the unwrapped function.
    assert.match(first.summary, /none cleared every structural gate/i);
  }
});

// A synthetic fixture reused from native-one-slot-lab.test.mjs's own
// "advances an exact one-slot improvement deterministically" test — known
// to clear the theoretical gate with a specific cut/add pair, so the
// practical wiring itself (does it actually run, does its result gate the
// final verdict) is deterministic to exercise here. These row names aren't
// in a real card pool, so buildSimulationModel's fallback applies (blank
// oracle text, every nonland card reads as the same "stabilizer" role) —
// degenerate role diversity, but a real, honest simulation run all the same.
const wiringBase = [
  { quantity: 24, name: "Wiring Island", roles: ["land"], cmc: 0 },
  { quantity: 4, name: "Wiring Slow Threat", roles: ["threat"], cmc: 6 },
  { quantity: 4, name: "Wiring Draw", roles: ["draw"], cmc: 3 },
  { quantity: 4, name: "Wiring Answer", roles: ["interaction"], cmc: 2 },
  { quantity: 4, name: "Wiring Ramp", roles: ["ramp"], cmc: 2 },
  { quantity: 4, name: "Wiring Shield", roles: ["protection"], cmc: 2 },
  { quantity: 4, name: "Wiring Return", roles: ["recursion"], cmc: 3 },
  { quantity: 4, name: "Wiring Sweep", roles: ["sweeper"], cmc: 4 },
  { quantity: 4, name: "Wiring Body", roles: ["threat"], cmc: 3 },
  { quantity: 4, name: "Wiring Second Body", roles: ["threat"], cmc: 3 },
];
const wiringRival = wiringBase.map((row) => ({ ...row, roles: [...row.roles] }));
wiringRival.find((row) => row.name === "Wiring Slow Threat").quantity = 3;
wiringRival.push({ quantity: 1, name: "Wiring Flexible Answer", roles: ["draw", "interaction", "protection"], cmc: 2 });
const wiringSelected = { id: "selected", rows: wiringBase };
const wiringRivalCandidate = { id: "rival", rows: wiringRival };
const wiringInput = { format: "Standard", strategy: "Balanced midrange", target: 60, cards: [] };

test("runPracticalOneSlotCounterfactualLab actually runs practical evaluation once the theoretical winner clears its gate", () => {
  const theoreticalOnly = runOneSlotCounterfactualLab(wiringSelected, [wiringSelected, wiringRivalCandidate], { rivalId: "rival" }, wiringInput);
  assert.equal(theoreticalOnly.verdict, "advance", "sanity check: this fixture must clear the theoretical gate on its own");

  const result = runPracticalOneSlotCounterfactualLab(wiringSelected, [wiringSelected, wiringRivalCandidate], { rivalId: "rival" }, wiringInput);
  assert.ok(result.practical, "practical evaluation must actually have run, not stayed null, once the theoretical gate passed");
  assert.equal(typeof result.practical.passed, "boolean");
  assert.equal(result.verdict, result.practical.passed ? "advance" : "inconclusive");
});

test("runPracticalOneSlotCounterfactualLab reports no practical evidence when the theoretical gate alone already holds the list", () => {
  const identicalCandidates = [{ id: "selected", rows: [{ quantity: 24, name: "Island Utility 0", roles: ["land"], cmc: 0 }] }];
  const result = runPracticalOneSlotCounterfactualLab(
    identicalCandidates[0],
    identicalCandidates,
    { rivalId: null },
    practicalInput,
  );
  assert.equal(result.verdict, "inconclusive");
  assert.equal(result.practical, null);
});

test("forges three deterministic personalized candidates without a model", () => {
  const input = { format: "Commander", target: 100, strategy: "Control", path: "Reactive Precision", note: "I love card draw and protection", seed: 42, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." }, cards: pool };
  const first = forgeNativeMasterwork(input);
  const second = forgeNativeMasterwork(input);
  // Timing / recommendation-id fields are observational and may differ
  // across runs; construction identity must not.
  assert.equal(first.engine, second.engine);
  assert.equal(first.selected.id, second.selected.id);
  assert.deepEqual(first.selected.rows, second.selected.rows);
  assert.deepEqual(
    first.candidates.map((c) => ({ id: c.id, rows: c.rows })),
    second.candidates.map((c) => ({ id: c.id, rows: c.rows })),
  );
  assert.equal(
    first.engine,
    "metaforge-native-masterwork-v6",
  );
  assert.equal(first.candidates.length, 3);
  assert.equal(first.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  assert.equal(first.selected.rows[0].name, "Scholar of Tests");
  assert.equal(first.selected.tournament.verdict, "advance");
  assert.equal(first.candidates.every((candidate) => candidate.tournament), true);
  assert.equal(
    first.diagnostics.analysisPasses,
    1,
  );

  assert.equal(
    first.diagnostics.cardsAnalyzed,
    pool.length,
  );

  assert.equal(
    first.diagnostics.candidatesBuilt,
    3,
  );

  assert.equal(
    first.diagnostics
      .structuralCardsAnalyzed,
    first.selected.rows.length,
  );

  assert.equal(
    first.diagnostics.detectedSystems,
    first.structuralAnalysis
      .systems
      .systems
      .length,
  );
  assert.equal(
    first.structuralAnalysis.engine,
    "metaforge-structural-pipeline-v1",
  );

  assert.equal(
    first.structuralAnalysis.cardCount,
    100,
  );

  assert.equal(
    first.structuralAnalysis
      .commanderName,
    "Scholar of Tests",
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .graph
        .nodes,
    ),
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .systems
        .systems,
    ),
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .causality
        .criticalNodes,
    ),
  );

  assert.equal(
    Object.isFrozen(
      first.structuralAnalysis,
    ),
    true,
  );

  assert.match(first.reasoning.summary, /advanced over|only complete candidate/i);
  assert.ok(["advance", "inconclusive"].includes(first.laboratory.verdict));
  assert.ok(first.laboratory.experimentsTested >= 0);
  assert.equal(new Set(first.candidates.map((candidate) => candidate.deckText)).size, 3);
  assert.match(first.methodology, /MetaForge analyzed each verified card once/i);
});

test("treats an explicit typal and mechanical Blueprint as a construction promise", () => {
  const gammaCards = [
    card("Red Hulk", "Whenever one or more +1/+1 counters are put on this creature, it deals damage.", "Legendary Creature — Gamma Mutant", "{3}{R}", ["R"]),
    card("Doc Samson", "If one or more +1/+1 counters would be put on a creature you control, put that many plus one instead.", "Legendary Creature — Gamma Hero", "{2}{G}", ["G"]),
    card("She-Hulk", "This creature enters with two +1/+1 counters on it.", "Legendary Creature — Gamma Hero", "{2}{G}", ["G"]),
    ...Array.from({ length: 12 }, (_, i) => card(`Gamma Growth ${i}`, "Put a +1/+1 counter on target creature you control. Proliferate.", "Creature — Gamma Scientist", "{1}{G}", ["G"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    note: "Gamma Tribal and +1 +1 Counters",
    seed: 616,
    commander: { name: "Bruce Banner // The Incredible Hulk", colors: ["G", "R"], oracleText: "Transform Bruce Banner. Put +1/+1 counters on The Incredible Hulk." },
    cards: [...pool, ...gammaCards],
  });

  assert.deepEqual(report.blueprintIntent.tribalTypes, ["gamma"]);
  assert.ok(report.blueprintIntent.desiredRoles.includes("counters"));
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
  assert.equal(report.selected.blueprintAlignment.selectedTribeCards, gammaCards.length);
  assert.ok(report.selected.blueprintAlignment.requestedRoleCoverage.counters >= 10);
  assert.match(report.methodology, /Blueprint promise: gamma typal, \+1\/\+1 counter growth/i);
});

test("a selected snow payoff receives a functional snow mana base instead of dead ordinary basics", () => {
  const snowPayoff = card(
    "Spirit of the Aldergard",
    "When Spirit of the Aldergard enters the battlefield, search your library for a snow land card, reveal it, put it into your hand, then shuffle. Spirit of the Aldergard gets +1/+0 for each other snow permanent you control.",
    "Snow Creature — Bear Spirit",
    "{3}{G}",
    ["G"],
  );
  const bearPool = Array.from({ length: 30 }, (_, index) =>
    card(`Bear ${index}`, "When this enters, draw a card.", "Creature — Bear", "{2}{G}", ["G"]),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Bear tribal", seed: 620,
    commander: { name: "Ayula, Queen Among Bears", colors: ["G"], oracleText: "Whenever another Bear enters, put two +1/+1 counters on target Bear." },
    cards: [...pool, ...bearPool, snowPayoff],
  });

  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(names.has("Spirit of the Aldergard"), "the reported payoff must actually be selected for this regression");
  assert.ok(names.has("Snow-Covered Forest"), "snow-dependent cards must cause the generated basics to become snow basics");
  assert.ok(!names.has("Forest"), "the generated mana base must not leave the selected snow payoff unsupported");
});

test("Ayula Bear tribal cannot fill its commander package with unrelated counter and token cards", () => {
  const bears = Array.from({ length: 48 }, (_, index) => ({
    ...card(`Bear Cohort ${index}`, index % 2 ? "When this enters, draw a card." : "Put a +1/+1 counter on target Bear.", "Creature — Bear", `{${index % 4 + 1}}{G}`, ["G"]),
    popularityRank: 700 + index,
  }));
  const unrelated = Array.from({ length: 30 }, (_, index) => ({
    ...card(
      `Generic Counter Engine ${index}`,
      index % 2
        ? "Create three 0/1 green Plant creature tokens."
        : "Whenever one or more +1/+1 counters are put on this creature, create a 0/1 colorless Eldrazi Spawn creature token.",
      index % 2 ? "Sorcery" : "Creature — Eldrazi Lizard",
      "{2}{G}",
      ["G"],
    ),
    popularityRank: index,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Bear Tribal", seed: 621,
    commander: {
      name: "Ayula, Queen Among Bears", colors: ["G"],
      oracleText: "Whenever another Bear you control enters, choose one — Put two +1/+1 counters on target Bear. Target Bear you control fights target creature you don't control.",
    },
    cards: [...pool, ...bears, ...unrelated],
  });

  assert.ok(report.selected.blueprintAlignment.selectedIdentityCards >= 40, "Bear tribal must remain the deck's center of gravity");
  assert.ok(report.selected.commanderCompatibility.connectedCardCount >= 8);
  for (const row of report.selected.rows.filter((entry) => entry.name.startsWith("Generic Counter Engine"))) {
    assert.deepEqual(row.commanderConnectionSignals, [], `${row.name} must not masquerade as an Ayula connection`);
  }
});

test("reports an unsupported requested tribe instead of pretending it was honored", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Control",
    note: "Muppet tribal",
    seed: 42,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." },
    cards: pool,
  });

  assert.equal(report.selected.blueprintAlignment.status, "unsupported-identity-in-verified-pool");
  assert.match(report.selected.blueprintAlignment.boundary, /No legal card naming or carrying the muppet identity/i);
});

test("honors a lore identity found in card text even when it is not a creature type", () => {
  const gammaTheme = Array.from({ length: 12 }, (_, i) =>
    card(`Experiment ${i}`, `Gamma radiation puts a +1/+1 counter on this creature.`, "Creature — Human Scientist", "{2}{G}", ["G"]),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Gamma Tribal", seed: 617,
    commander: { name: "Bruce Banner // The Incredible Hulk", colors: ["G", "R"], oracleText: "Transform Bruce Banner." },
    cards: [...pool, ...gammaTheme],
  });
  assert.equal(report.selected.blueprintAlignment.availableTribeCards, 0);
  assert.equal(report.selected.blueprintAlignment.availableIdentityCards, 12);
  assert.equal(report.selected.blueprintAlignment.selectedIdentityCards, 12);
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
});

test("normalizes ordinary-language counter requests", () => {
  assert.deepEqual(
    parseNativeBlueprintIntent({ note: "Gamma Tribal and plus one plus one counters" }).promises,
    ["gamma typal", "+1/+1 counter growth"],
  );
});

test("recognizes a Power-Up focus and creature activated abilities as explicit mechanics", () => {
  const intent = parseNativeBlueprintIntent({
    note: "Creature Activated abilities, with a focus on Power-Up activated abilities",
  });
  assert.deepEqual(intent.requestedMechanics, ["power_up", "creature_activated_ability"]);
  assert.deepEqual(intent.promises, ["Power-Up", "creature activated abilities"]);
});

test("reserves supported Power-Up and creature activated-ability cards ahead of generic good-card filler", () => {
  const powerUpCards = Array.from({ length: 8 }, (_, index) => ({
    ...card(`Power-Up Hero ${index}`, `Power-Up — {${index % 3 + 1}}: Put a +1/+1 counter on this creature.`, "Creature — Hero", "{2}{U}"),
    keywords: ["Power-Up"],
  }));
  const activatedCards = Array.from({ length: 14 }, (_, index) =>
    card(`Ability Hero ${index}`, "{1}: This creature gains flying until end of turn.", "Creature — Hero", "{2}{U}"),
  );
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    note: "Creature Activated abilities, with a focus on Power-Up activated abilities",
    seed: 818,
    commander: { name: "Ability Mentor", colors: ["U"], oracleText: "Activated abilities you activate cost {1} less to activate." },
    cards: [...pool, ...powerUpCards, ...activatedCards],
  });

  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(powerUpCards.every(({ name }) => names.has(name)));
  assert.equal(report.selected.blueprintAlignment.availableMechanicCoverage.power_up, 8);
  assert.equal(report.selected.blueprintAlignment.requestedMechanicCoverage.power_up, 8);
  assert.ok(report.selected.blueprintAlignment.requestedMechanicCoverage.creature_activated_ability >= 10);
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
  assert.match(report.selected.blueprintAlignment.boundary, /8 legal Power-Up cards and selected 8/i);
});

test("keeps an explicit strategy as the deck's center of gravity after structural role floors are met", () => {
  const strategyCards = Array.from({ length: 36 }, (_, index) =>
    card(`Connected Ability Piece ${index}`, `{1}: Put a +1/+1 counter on this creature. Activate only as a sorcery.`, "Creature — Artificer", `{${index % 3 + 1}}{U}`),
  );
  const famousButDisconnected = Array.from({ length: 36 }, (_, index) => ({
    ...card(`Famous Generic Staple ${index}`, "When this creature enters, draw a card. It has ward {1}.", "Creature — Wizard", "{2}{U}"),
    popularityRank: 0,
  }));
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Focus on creature activated abilities", seed: 820,
    commander: { name: "Ability Mentor", colors: ["U"], oracleText: "Activated abilities you activate cost {1} less to activate." },
    cards: [...pool, ...famousButDisconnected, ...strategyCards],
  });

  const alignment = report.selected.blueprintAlignment;
  const chosenStrategyCards = report.selected.rows.filter((row) => row.name.startsWith("Connected Ability Piece"));
  const chosenGenericStaples = report.selected.rows.filter((row) => row.name.startsWith("Famous Generic Staple"));
  assert.ok(alignment.selectedContractCards >= alignment.requiredContractCards);
  assert.ok(alignment.strategyDensity >= 0.4);
  assert.ok(chosenStrategyCards.length > chosenGenericStaples.length);
  assert.equal(alignment.status, "honored-best-effort");
});

test("admits when a named requested mechanic is absent instead of calling generic soup aligned", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Focus on Power-Up", seed: 819,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." },
    cards: pool,
  });
  assert.equal(report.selected.blueprintAlignment.status, "unsupported-mechanic-in-verified-pool");
  assert.match(report.selected.blueprintAlignment.boundary, /No legal Power-Up card was present/i);
});

test("compiles different official mechanics and plain-language archetypes without one-off parser branches", () => {
  assert.deepEqual(parseNativeBlueprintIntent({ note: "Landfall with Cycling" }).requestedMechanics, ["landfall", "cycling"]);
  assert.deepEqual(parseNativeBlueprintIntent({ note: "Mutate and Toxic" }).requestedMechanics, ["mutate", "toxic"]);
  assert.deepEqual(parseNativeBlueprintIntent({ note: "Blink creatures and copy spells" }).requestedMechanics, ["blink", "spell_copying"]);
  assert.deepEqual(parseNativeBlueprintIntent({ note: "An Aristocrats deck" }).requestedMechanics, ["aristocrats"]);
  assert.deepEqual(parseNativeBlueprintIntent({ note: "Play cards from exile" }).requestedMechanics, ["cast_from_exile"]);
  assert.deepEqual(
    parseNativeBlueprintIntent({ note: "Use Landfall to create tokens, then sacrifice those tokens for value" }).packageSignals,
    ["lands", "tokens", "sacrifice"],
  );
});

test("the generalized mechanic contract reserves official keyword packages such as Landfall", () => {
  const landfallCards = Array.from({ length: 9 }, (_, index) => ({
    ...card(`Landfall Scout ${index}`, "Landfall — Whenever a land enters under your control, put a +1/+1 counter on this creature.", "Creature — Scout", "{2}{G}", ["G"]),
    keywords: ["Landfall"],
  }));
  const landEnablers = Array.from({ length: 6 }, (_, index) =>
    card(`Land Guide ${index}`, "Search your library for a basic land card, put it onto the battlefield, then shuffle.", "Sorcery", "{2}{G}", ["G"]),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Focus on Landfall", seed: 820,
    commander: { name: "Landfall Mentor", colors: ["G", "U"], oracleText: "Whenever a land enters, draw a card." },
    cards: [...pool, ...landfallCards, ...landEnablers],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(landfallCards.every(({ name }) => names.has(name)));
  assert.equal(report.selected.blueprintAlignment.requestedMechanicCoverage.landfall, 9);
  assert.ok(report.selected.blueprintAlignment.packageCoverage.lands.producers >= 5);
  assert.ok(report.selected.blueprintAlignment.packageCoverage.lands.payoffs >= 9);
  assert.equal(report.selected.blueprintAlignment.packageCoverage.lands.connected, true);
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
});

test("plain-language concepts such as blink are grounded in rules text and shape construction", () => {
  const blinkCards = Array.from({ length: 8 }, (_, index) =>
    card(`Blink Guide ${index}`, "Exile another target creature you control, then return that card to the battlefield under its owner's control.", "Creature — Wizard"),
  );
  const etbPayoffs = Array.from({ length: 6 }, (_, index) =>
    card(`Arrival Student ${index}`, "Whenever another creature enters the battlefield under your control, draw a card.", "Creature — Wizard"),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "I want to blink creatures", seed: 821,
    commander: { name: "Blink Mentor", colors: ["U"], oracleText: "Whenever a creature enters, draw a card." },
    cards: [...pool, ...blinkCards, ...etbPayoffs],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(blinkCards.every(({ name }) => names.has(name)));
  assert.equal(report.selected.blueprintAlignment.requestedMechanicCoverage.blink, 8);
  assert.ok(report.selected.blueprintAlignment.packageCoverage.etb.producers >= 5);
  assert.ok(report.selected.blueprintAlignment.packageCoverage.etb.payoffs >= 5);
  assert.equal(report.selected.blueprintAlignment.packageCoverage.etb.connected, true);
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
});

test("reserves cards that consume a resource the commander itself produces", () => {
  const tokenPayoffs = Array.from({ length: 8 }, (_, index) =>
    card(`Commander Token Payoff ${index}`, "Creature tokens you control get +1/+1 and have vigilance.", "Enchantment", "{2}{U}"),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", note: "", seed: 822,
    commander: { name: "Token Mentor", colors: ["U"], oracleText: "At the beginning of your end step, create a 1/1 blue Creature token." },
    cards: [...pool, ...tokenPayoffs],
  });
  const selectedPayoffs = report.selected.rows.filter((row) => row.name.startsWith("Commander Token Payoff"));
  assert.equal(selectedPayoffs.length, 8);
  assert.equal(report.selected.commanderCompatibility.status, "connected");
  assert.equal(report.selected.commanderCompatibility.bySignal.tokens, 8);
  assert.ok(report.selected.commanderCompatibility.commanderProduces.includes("tokens"));
  assert.ok(report.selected.strategicCoherence.connectedSignals.includes("tokens"));
  assert.ok(report.selected.strategicCoherence.connectedCardCount >= 8);
  assert.ok(report.selected.strategicSequence.stages.setup.count >= 10);
  assert.ok(report.selected.strategicSequence.stages.convert.count >= 8);
  assert.equal(report.selected.strategicSequence.weakestStage, "close");
});

test("strategicCoherence never flags a real enters-payoff as orphaned just because its fuel is vanilla creatures", () => {
  // Real regression: commanderConnectionSignalsFor already treats any
  // permanent entering as a real ETB event (see its own comment on Ayula —
  // every Bear is a true engine piece even with vanilla rules text), but
  // computeStrategicCoherence read entry.mechanics.produces directly and
  // missed that same fact, so a genuine "whenever a creature enters" payoff
  // read as an orphan payoff whenever its actual fuel was ordinary
  // creatures with no oracle text of their own mentioning "enters".
  const vanillaCreatures = Array.from({ length: 40 }, (_, index) =>
    card(`Vanilla Beast ${index}`, "Vigilance", "Creature — Beast", "{3}"),
  );
  const enterPayoff = card("Arrival Watcher", "Whenever another creature you control enters, draw a card.", "Creature — Human Wizard", "{2}");
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", note: "", seed: 823,
    commander: { name: "Enters Mentor", colors: ["G"], oracleText: "Whenever another creature you control enters, put a +1/+1 counter on it." },
    cards: [...pool, ...vanillaCreatures, enterPayoff],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "Arrival Watcher"), "payoff must actually be in the finished deck for this assertion to mean anything");
  assert.ok(
    !report.selected.strategicCoherence.orphanPayoffs.includes("Arrival Watcher"),
    `Arrival Watcher has real vanilla-creature fuel and must not be flagged orphaned: ${JSON.stringify(report.selected.strategicCoherence.orphanPayoffs)}`,
  );
  assert.equal(report.selected.strategicCoherence.status, "connected");
});

test("recognizes plain-language role requests, not just rules-text phrasing", () => {
  const intent = parseNativeBlueprintIntent({ note: "I want removal, ramp, and card draw" });
  assert.deepEqual(intent.desiredRoles, ["ramp", "draw", "interaction"]);
  assert.deepEqual(intent.excludedRoles, []);
});

test("recognizes hand disruption requests in plain language", () => {
  // "disruption" alone already aliases to the broader "interaction" role
  // (existing behavior); "discard" is the specific, distinct signal this
  // adds on top, so both are legitimately desired here.
  const intent = parseNativeBlueprintIntent({ note: "I want hand disruption and discard" });
  assert.deepEqual(intent.desiredRoles, ["interaction", "discard"]);
  assert.deepEqual(intent.excludedRoles, []);
});

test("treats a negated role request as an exclusion, not a desire", () => {
  const intent = parseNativeBlueprintIntent({ note: "no sacrifice, but plenty of removal" });
  assert.deepEqual(intent.desiredRoles, ["interaction"]);
  assert.deepEqual(intent.excludedRoles, ["sacrifice"]);
});

test("keeps an excluded role's cards out of the built deck entirely", () => {
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange",
    note: "no ramp", seed: 11, cards: pool,
  });
  assert.ok(report.selected.rows.every((row) => !row.roles.includes("ramp")));
});

test("prioritizes hand disruption when explicitly requested in the note", () => {
  const duress = card("Duress", "Target player reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.", "Sorcery");
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange",
    note: "I want hand disruption", seed: 7, cards: [duress, ...pool],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "Duress"));
});

test("scores a card higher for connecting to a producer/payoff pair already in the pool", () => {
  const miniPool = [
    card("Token Maker", "Create a 1/1 white Soldier creature token."),
    card("Token Reward", "Tokens you control get +1/+1."),
    card("Isolated Vanilla", "A creature with no special text."),
  ];
  const signals = poolMechanicalSignals(miniPool);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[0], signals), 1);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[1], signals), 1);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[2], signals), 0);
});

test("does not credit a card for producing or rewarding its own signal", () => {
  const soloPool = [card("Self-Contained", "Create a token. Tokens you control get +1/+1.")];
  const signals = poolMechanicalSignals(soloPool);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[0], signals), 0);
});

test("only leans on live field data for Standard, and only when it's actually usable", () => {
  const readyMidrange = { readyForCurrentFieldUse: true, leadingStrategy: "Midrange" };
  assert.deepEqual(fieldCounterRolesFor("Standard", readyMidrange), ["interaction", "draw"]);
  // Wrong format: a real, ready Commander-format signal should never leak in,
  // since this table only encodes what a Standard tournament field measured.
  assert.deepEqual(fieldCounterRolesFor("Commander", readyMidrange), []);
  // Not enough sample size or coverage yet - stay neutral rather than guess.
  assert.deepEqual(fieldCounterRolesFor("Standard", { readyForCurrentFieldUse: false, leadingStrategy: "Midrange" }), []);
  // A strategy name outside the known table shouldn't throw or wildcard-match.
  assert.deepEqual(fieldCounterRolesFor("Standard", { readyForCurrentFieldUse: true, leadingStrategy: "Some New Archetype" }), []);
  assert.deepEqual(fieldCounterRolesFor("Standard", null), []);
});

test("prefers a connected producer/payoff pair over blank filler once slots are scarce", () => {
  // Baseline archetype supply is capped tightly (7 unique cards, 4 copies
  // each = 28) so it cannot fill all 36 Standard spell slots on its own -
  // the remaining 8 slots must come from either the connected pair or the
  // blank filler competing against it. Neither the pair nor the filler
  // carries any classified role, so nothing but the mechanical connection
  // (tracked as cards actually get selected, not just pool presence)
  // explains a difference.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const producer = card("Chain Maker", "Create a 1/1 white Soldier creature token.", "Sorcery");
  const payoff = card("Chain Reward", "Tokens you control get +1/+1.", "Sorcery");
  const filler = Array.from({ length: 10 }, (_, i) => card(`Vanilla ${i}`, "Nothing happens.", "Sorcery"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, producer, payoff, ...filler, ...lands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(names.has("Chain Maker"));
  assert.ok(names.has("Chain Reward"));
  assert.equal([...names].filter((name) => name.startsWith("Vanilla")).length, 0);
});

test("shapes curve targets by strategy and scales them to the deck's own spell count", () => {
  const aggro = curveTargets("Aggressive pressure", 36);
  const control = curveTargets("Reactive control", 36);
  assert.ok(aggro["1"] + aggro["2"] > control["1"] + control["2"]);
  assert.ok(control["4"] + control["5+"] > aggro["4"] + aggro["5+"]);
  const smaller = curveTargets("Balanced midrange", 36);
  const larger = curveTargets("Balanced midrange", 63);
  assert.ok(larger["5+"] > smaller["5+"]);
});

test("spreads picks across the mana curve instead of collapsing to one cost", () => {
  // Ten unique cards at each cost 1-6, mixing four different roles evenly so
  // nothing about role weighting favors one cost over another - only curve
  // targeting explains the deck not clustering around a single value.
  const texts = [
    "Add one mana. Create a Treasure token.",
    "Draw a card. Scry 1.",
    "Exile target nonland permanent.",
    "Target creature gains hexproof and indestructible until end of turn.",
  ];
  const curveCard = (name, cmc, text) => card(name, text, text.includes("mana") ? "Artifact" : "Creature — Test", `{${cmc}}`);
  const spread = [];
  for (let cmc = 1; cmc <= 6; cmc += 1) {
    for (let i = 0; i < 10; i += 1) spread.push(curveCard(`CMC${cmc}_${i}`, cmc, texts[i % texts.length]));
  }
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["U"], cards: [...spread, ...lands] });
  const buckets = { "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
  for (const row of report.selected.rows) {
    if (row.roles.includes("land")) continue;
    buckets[row.cmc <= 1 ? "1" : row.cmc >= 5 ? "5+" : String(row.cmc)] += row.quantity;
  }
  assert.ok(Object.values(buckets).every((count) => count > 0));
  assert.ok(Math.max(...Object.values(buckets)) <= 16);
});

test("keeps singleton nonbasic spells at one copy", () => {
  const report = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." }, cards: pool });
  assert.equal(report.selected.rows.filter((row) => !row.roles.includes("land") && !row.roles.includes("commander")).every((row) => row.quantity === 1), true);
});

test("creates exact-size constructed candidates with four-copy limits", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Tempo", path: "Tempo Conversion", note: "cheap interaction", colors: ["U"], seed: 9, cards: pool });
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.equal(report.selected.rows.every((row) => row.roles.includes("land") || row.quantity <= 4), true);
});

test("a Standard build gets a real sideboard from the unused pool; a singleton Commander build gets none", () => {
  const standard = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Tempo", path: "Tempo Conversion", note: "cheap interaction", colors: ["U"], seed: 9, cards: pool });
  assert.ok(Array.isArray(standard.selected.sideboard), "Standard is best-of-3 and should get a real sideboard");
  assert.ok(standard.selected.sideboard.length > 0);
  assert.ok(standard.selected.sideboard.every((row) => row.role.startsWith("sideboard-") && row.quantity > 0 && row.card));
  const mainDeckNames = new Set(standard.selected.rows.map((row) => row.name));
  assert.ok(standard.selected.sideboard.every((row) => !mainDeckNames.has(row.card)), "never offers a card already in the main deck");

  const commander = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Control", seed: 13, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." }, cards: pool });
  assert.equal(commander.selected.sideboard, undefined, "Commander is singleton and has no best-of-3 sideboard");
});

test("ranks candidates with explicit role coverage and curve health", () => {
  const report = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Control", seed: 13, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." }, cards: pool });
  assert.ok(report.selected.evaluation.roleCoverage > 0.5);
  assert.ok(report.selected.evaluation.curveHealth >= 0);
  // report.candidates is ordered by tournamentScore (a distinct weighted
  // verdict), not raw evaluation score, so that's the order to assert on.
  assert.deepEqual(
    report.candidates.map((candidate) => candidate.tournament.tournamentScore),
    [...report.candidates.map((candidate) => candidate.tournament.tournamentScore)].sort((a, b) => b - a),
  );
});

test("counts colored mana pips, including hybrid symbols toward every named color", () => {
  assert.deepEqual(colorPipsFromCost("{2}{B}{B}"), { W: 0, U: 0, B: 2, R: 0, G: 0 });
  assert.deepEqual(colorPipsFromCost("{W/U}"), { W: 1, U: 1, B: 0, R: 0, G: 0 });
  assert.deepEqual(colorPipsFromCost("{3}"), { W: 0, U: 0, B: 0, R: 0, G: 0 });
});

test("splits basic lands proportionally to actual pip demand, not evenly by color", () => {
  assert.deepEqual(proportionalBasicCounts(["W", "B"], { W: 2, B: 8 }, 10), { W: 2, B: 8 });
  // Largest-remainder rounding must still sum to exactly `remaining`.
  const uneven = proportionalBasicCounts(["W", "B"], { W: 1, B: 2 }, 7);
  assert.equal(uneven.W + uneven.B, 7);
  // No pip signal at all (e.g. an all-colorless pool) falls back to the
  // previous even-split behavior instead of dividing by zero.
  assert.deepEqual(proportionalBasicCounts(["W", "U"], {}, 4), { W: 2, U: 2 });
});

test("weights the actual built deck's basic lands toward its heavier color, not an even split", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const swamp = report.selected.rows.find((row) => row.name === "Swamp")?.quantity || 0;
  const plains = report.selected.rows.find((row) => row.name === "Plains")?.quantity || 0;
  assert.ok(swamp > plains, `expected more Swamp than Plains given the heavier black pip cost, got ${swamp} vs ${plains}`);
});

test("scores real-world popularity rank with diminishing returns and treats a missing rank as neutral", () => {
  assert.ok(popularityScoreFromRank(0) > popularityScoreFromRank(10));
  assert.ok(popularityScoreFromRank(10) > popularityScoreFromRank(100));
  assert.ok(popularityScoreFromRank(100) >= 0);
  assert.equal(popularityScoreFromRank(undefined), 0);
  assert.equal(popularityScoreFromRank(-1), 0);
});

test("prefers cards with strong real-world adoption over otherwise-identical blank filler once slots are scarce", () => {
  // Same scarce-supply shape as the producer/payoff test above: 7 unique
  // base cards (28 copies) leave exactly 8 of Standard's 36 spell slots
  // open. Six filler cards share identical text, type, and cost — the only
  // difference is popularityRank, so if it has no effect, which two of the
  // six fill those 8 slots is essentially a coin flip on the tiebreak hash.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const popularFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Popular Vanilla ${i}`, "Nothing happens.", "Sorcery"), popularityRank: i }));
  const obscureFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Obscure Vanilla ${i}`, "Nothing happens.", "Sorcery"), popularityRank: 500 + i }));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, ...popularFiller, ...obscureFiller, ...lands],
  });
  const popularQuantity = report.selected.rows.filter((row) => row.name.startsWith("Popular Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const obscureQuantity = report.selected.rows.filter((row) => row.name.startsWith("Obscure Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(popularQuantity, 8, `expected all 8 open slots to go to the popular filler, got ${popularQuantity}`);
  assert.equal(obscureQuantity, 0, `expected no obscure filler to make the cut, got ${obscureQuantity}`);
});

test("penalizes expensive cards only when the budget selector actually constrains spending", () => {
  assert.equal(budgetScoreFor(50, "No strict limit"), 0);
  assert.equal(budgetScoreFor(50, "Competitive optimization"), 0);
  assert.equal(budgetScoreFor(50, undefined), 0);
  assert.equal(budgetScoreFor(NaN, "Budget conscious"), 0);
  assert.ok(budgetScoreFor(50, "Budget conscious") < 0);
  assert.ok(budgetScoreFor(50, "Budget conscious") < budgetScoreFor(50, "Moderate investment"));
  assert.ok(budgetScoreFor(50, "Budget conscious") < budgetScoreFor(5, "Budget conscious"));
});

test("honors the budget selector by preferring cheap cards over otherwise-identical expensive ones", () => {
  // Same scarce-supply shape as the popularity test above: 7 unique base
  // cards (28 copies) leave exactly 8 of Standard's 36 spell slots open.
  // Six filler cards share identical text, type, and cost — the only
  // difference is price — so "Budget conscious" should sweep the cheap ones
  // and shut the expensive ones out entirely.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const cheapFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Cheap Vanilla ${i}`, "Nothing happens.", "Sorcery"), priceUsd: 0.25 }));
  const pricyFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Pricy Vanilla ${i}`, "Nothing happens.", "Sorcery"), priceUsd: 60 }));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"], budget: "Budget conscious",
    cards: [...scarceBase, ...cheapFiller, ...pricyFiller, ...lands],
  });
  const cheapQuantity = report.selected.rows.filter((row) => row.name.startsWith("Cheap Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const pricyQuantity = report.selected.rows.filter((row) => row.name.startsWith("Pricy Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(cheapQuantity, 8, `expected all 8 open slots to go to the cheap filler, got ${cheapQuantity}`);
  assert.equal(pricyQuantity, 0, `expected no pricy filler to make the cut, got ${pricyQuantity}`);
});

test("scores oracle text complexity from choice points, triggers, and activated abilities, not just word count", () => {
  const vanilla = "Nothing happens.";
  const technical = "At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.";
  assert.ok(oracleTextComplexity(technical) > oracleTextComplexity(vanilla));
  assert.equal(oracleTextComplexity(""), 0);
});

test("pressures complexity only when the selector actually asks for it, and in the right direction", () => {
  const technicalScore = oracleTextComplexity("At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.");
  assert.equal(complexityScoreFor(technicalScore, "Balanced"), 0);
  assert.equal(complexityScoreFor(technicalScore, undefined), 0);
  assert.ok(complexityScoreFor(technicalScore, "Accessible") < 0);
  assert.ok(complexityScoreFor(technicalScore, "Technical") > 0);
  assert.ok(complexityScoreFor(technicalScore, "Maximum depth") > complexityScoreFor(technicalScore, "Technical"));
});

test("honors the complexity selector by preferring simple cards over otherwise-identical technical ones once Accessible is chosen", () => {
  // Same scarce-supply shape as the budget test above. Six filler cards
  // carry no classified role at all (so nothing but complexity explains a
  // difference) and identical cost — only the oracle text's choice points,
  // triggers, and activated ability differ.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const simpleFiller = Array.from({ length: 3 }, (_, i) => card(`Simple Vanilla ${i}`, "Nothing happens.", "Sorcery"));
  const technicalFiller = Array.from({ length: 3 }, (_, i) => card(`Technical Trickster ${i}`, "At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.", "Sorcery"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"], complexity: "Accessible",
    cards: [...scarceBase, ...simpleFiller, ...technicalFiller, ...lands],
  });
  const simpleQuantity = report.selected.rows.filter((row) => row.name.startsWith("Simple Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const technicalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Technical Trickster")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(simpleQuantity, 8, `expected all 8 open slots to go to the simple filler, got ${simpleQuantity}`);
  assert.equal(technicalQuantity, 0, `expected no technical filler to make the cut, got ${technicalQuantity}`);
});

test("prefers nonbasic lands that fix the deck's heavier-demand color over otherwise-identical off-focus lands", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const utilityLand = (name, color) => ({ name, oracleText: "{T}: Add one mana of the indicated color.", manaCost: "", typeLine: "Land", colorIdentity: [color] });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`Black Utility Land ${i}`, "B")),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`White Utility Land ${i}`, "W")),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const blackUtilityCount = report.selected.rows.filter((row) => row.name.startsWith("Black Utility Land")).length;
  const whiteUtilityCount = report.selected.rows.filter((row) => row.name.startsWith("White Utility Land")).length;
  assert.equal(blackUtilityCount, 4, "expected all four black utility lands to be chosen ahead of any white ones");
  assert.ok(whiteUtilityCount < 4, `expected fewer white utility lands picked than black, got ${whiteUtilityCount}`);
});

test("prefers well-adopted nonbasic lands over an otherwise-identical obscure one", () => {
  const bCard = (name, oracleText, manaCost, typeLine = "Creature — Test") => ({ name, oracleText, manaCost, typeLine, colorIdentity: ["B"] });
  const utilityLand = (name, popularityRank) => ({ name, oracleText: "{T}: Add {B}.", manaCost: "", typeLine: "Land", colorIdentity: ["B"], popularityRank });
  const bPool = [
    ...Array.from({ length: 10 }, (_, i) => bCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}")),
    ...Array.from({ length: 10 }, (_, i) => bCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => bCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact")),
    // Same color, same "add" text, same untapped status — only real-world
    // adoption (popularityRank) differs. Six popular lands exactly fill
    // Standard's 6-nonbasic limit, so if the signal works, none of the
    // four obscure ones should make the cut at all.
    ...Array.from({ length: 6 }, (_, i) => utilityLand(`Popular Swamp Land ${i}`, i)),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`Obscure Swamp Land ${i}`, 500 + i)),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["B"], cards: bPool });
  const popularCount = report.selected.rows.filter((row) => row.name.startsWith("Popular Swamp Land")).length;
  const obscureCount = report.selected.rows.filter((row) => row.name.startsWith("Obscure Swamp Land")).length;
  assert.equal(popularCount, 6, "expected all six popular lands to be chosen ahead of any obscure ones");
  assert.equal(obscureCount, 0, "expected no obscure lands to make the cut given the 6-nonbasic limit");
});

test("computes exact hypergeometric probabilities on small, hand-checkable populations", () => {
  // N=4, K=2 successes, draw 2: P(both successes) = C(2,2)*C(2,0)/C(4,2) = 1/6.
  assert.ok(Math.abs(hypergeometricAtLeast(4, 2, 2, 2) - 1 / 6) < 1e-9);
  // P(at least 1 success) = 1 - P(0 successes) = 1 - C(2,0)*C(2,2)/C(4,2) = 5/6.
  assert.ok(Math.abs(hypergeometricAtLeast(4, 2, 2, 1) - 5 / 6) < 1e-9);
  // Needing zero copies is a certainty regardless of population shape.
  assert.equal(hypergeometricAtLeast(60, 5, 7, 0), 1);
  // Every card in the population is a "success" — any draw guarantees enough.
  assert.equal(hypergeometricAtLeast(60, 60, 7, 5), 1);
  // No successes exist in the population at all — impossible to draw one.
  assert.equal(hypergeometricAtLeast(60, 0, 7, 1), 0);
  // Needing more successes than exist in either the population or the draw
  // is impossible.
  assert.equal(hypergeometricAtLeast(60, 10, 7, 8), 0);
});

test("hypergeometric probability rises with more sources or more draws, and falls with a stricter requirement", () => {
  assert.ok(hypergeometricAtLeast(60, 20, 7, 1) > hypergeometricAtLeast(60, 10, 7, 1));
  assert.ok(hypergeometricAtLeast(60, 10, 14, 1) > hypergeometricAtLeast(60, 10, 7, 1));
  assert.ok(hypergeometricAtLeast(60, 10, 7, 1) > hypergeometricAtLeast(60, 10, 7, 2));
});

test("scores mana consistency from real land color sources against each spell's actual pip cost and casting turn", () => {
  const rows = [
    { name: "Swamp", quantity: 12, roles: ["land"], colorIdentity: ["B"], cmc: 0 },
    { name: "Plains", quantity: 4, roles: ["land"], colorIdentity: ["W"], cmc: 0 },
    { name: "Easy Black One-Drop", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 1, colorPips: { W: 0, U: 0, B: 1, R: 0, G: 0 } },
    { name: "Hard White Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 2, colorPips: { W: 2, U: 0, B: 0, R: 0, G: 0 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  const easy = report.cards.find((entry) => entry.name === "Easy Black One-Drop");
  const hard = report.cards.find((entry) => entry.name === "Hard White Double-Pip");
  assert.ok(easy.probability > hard.probability, "a single black pip off 12 Swamps should be far more reliable than double-white off only 4 Plains");
  assert.ok(report.risky.some((entry) => entry.name === "Hard White Double-Pip"));
  assert.ok(report.overall > 0 && report.overall <= 1);
  assert.deepEqual(report.sourcesByColor, { W: 4, U: 0, B: 12, R: 0, G: 0, C: 0 });
});

test("an X spell uses a meaningful casting window instead of treating X as zero", () => {
  const report = manaConsistencyReport([
    { quantity: 20, name: "Mountain", roles: ["land"], colorIdentity: ["R"] },
    { quantity: 1, name: "Nahiri's Lithoforming", roles: [], cmc: 2, manaCost: "{X}{R}{R}", colorPips: { R: 2 } },
  ], 60);
  const nahiri = report.cards.find((entry) => entry.name === "Nahiri's Lithoforming");
  assert.equal(nahiri.turn, 4);
});

test("a nonland card with color identity but no real producedMana is never credited as a source", () => {
  // The land-oriented helper falls back to colorIdentity when producedMana
  // is absent — reusing it for nonland rows would wrongly turn every
  // colored creature/spell in the deck into a "mana source" just because
  // it shares a color identity, which would blow the whole consistency
  // model up to near-100% for every deck. A blue creature with no mana
  // ability must contribute nothing.
  const rows = [
    { name: "Island", quantity: 4, roles: ["land"], colorIdentity: ["U"], cmc: 0 },
    { name: "Vanilla Blue Bear", quantity: 4, roles: ["threat"], colorIdentity: ["U"], cmc: 2, colorPips: { W: 0, U: 1, B: 0, R: 0, G: 0 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  assert.deepEqual(report.sourcesByColor, { W: 0, U: 4, B: 0, R: 0, G: 0, C: 0 });
});

test("a mana rock or dork counts as a real color source, same as a land", () => {
  const rows = [
    { name: "Swamp", quantity: 10, roles: ["land"], colorIdentity: ["B"], cmc: 0 },
    // A colorless rock (no producesColors matching W/U/B/R/G) shouldn't
    // fix anything — Sol Ring doesn't make green mana just by existing.
    { name: "Sol Ring", quantity: 1, roles: ["ramp"], cmc: 1, colorPips: {}, producesColors: ["C"] },
    // A green-producing dork is a real source, same as a Forest would be.
    { name: "Llanowar Elves", quantity: 1, roles: ["ramp"], cmc: 1, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 1 }, producesColors: ["G"] },
    { name: "Hard Green Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 2, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 2 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  assert.deepEqual(report.sourcesByColor, { W: 0, U: 0, B: 10, R: 0, G: 1, C: 1 });
});

test("mana-rock-aware sourcing raises consistency vs. the same deck without crediting the rock", () => {
  const baseline = [
    { name: "Forest", quantity: 8, roles: ["land"], colorIdentity: ["G"], cmc: 0 },
    { name: "Hard Green Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 3, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 2 } },
  ];
  const withDorks = [
    ...baseline,
    { name: "Llanowar Elves", quantity: 4, roles: ["ramp"], cmc: 1, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 1 }, producesColors: ["G"] },
  ];
  const before = manaConsistencyReport(baseline, 60).cards.find((entry) => entry.name === "Hard Green Double-Pip");
  const after = manaConsistencyReport(withDorks, 60).cards.find((entry) => entry.name === "Hard Green Double-Pip");
  assert.ok(after.probability > before.probability, "four more green sources from dorks should measurably improve the double-pip card's odds");
});

test("a real built deck reports mana consistency alongside the rest of the masterwork", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  assert.ok(report.manaConsistency.overall >= 0 && report.manaConsistency.overall <= 1);
  assert.ok(Array.isArray(report.manaConsistency.cards));
  assert.ok(Array.isArray(report.manaConsistency.risky));
});

test("refines the basic land split using real per-turn consistency, not just raw pip totals", () => {
  // White's demand is all cheap and urgent (a single pip on turn-1 cards);
  // black's is all late and forgiving (double pips, but not until turn 6,
  // by which point far more cards have been seen). A split based only on
  // raw pip totals has no way to know one color's need is far more
  // time-sensitive than the other's — this checks the built deck's real
  // consistency instead of trusting pip count alone.
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Early White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Late Black Answer ${i}`, "Destroy target creature.", "{4}{B}{B}", "Creature — Test", ["B"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Draw ${i}`, "Draw a card. Scry 1.", "{2}", "Sorcery", [])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const byColor = {};
  for (const card of report.manaConsistency.cards) {
    for (const color of card.colors) {
      (byColor[color] ||= []).push(card.probability);
    }
  }
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const whiteAverage = average(byColor.W || [0]);
  const blackAverage = average(byColor.B || [0]);
  assert.ok(
    Math.abs(whiteAverage - blackAverage) < 0.15,
    `expected the refined mana base to keep both colors' real consistency reasonably close, got W=${whiteAverage.toFixed(2)} B=${blackAverage.toFixed(2)}`,
  );
});

test("uses Scryfall's produced_mana as the authoritative color source, not the broader color_identity", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    // color_identity claims W+B (from a colored activated ability that
    // costs {W} but doesn't produce it), while produced_mana — the
    // authoritative field — says it only ever actually taps for B.
    {
      name: "Deceptive Land", typeLine: "Land",
      oracleText: "{T}: Add {B}. {1}{W}, {T}: Scry 1.",
      colorIdentity: ["W", "B"], producedMana: ["B"],
    },
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const row = report.selected.rows.find((entry) => entry.name === "Deceptive Land");
  assert.ok(row, "expected the deceptive land to be selected");
  assert.deepEqual(row.colorIdentity, ["B"], "the row's stored color source should follow produced_mana, not the broader color_identity");
});

test("a real built deck also reports unused engine partners from the fetched pool", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  assert.ok(Array.isArray(report.unusedEnginePartners));
});

test("supports a second commander (Partner or Background) with combined color identity and both slots reserved", () => {
  const primary = { name: "Primary Commander", colors: ["U"], oracleText: "Partner" };
  const secondCommander = { name: "Second Commander", colors: ["B"], oracleText: "Partner" };
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const twoColorPool = [
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Blue Draw ${i}`, "Draw a card. Scry 1.", "{1}{U}", "Creature — Test", ["U"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Black Answer ${i}`, "Destroy target creature.", "{1}{B}{B}", "Creature — Test", ["B"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Protect ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{U}", "Creature — Test", ["U"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Recur ${i}`, "Return target creature card from your graveyard to your hand.", "{2}{B}", "Creature — Test", ["B"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 9,
    commander: primary, secondCommander,
    cards: twoColorPool,
  });
  const commanderRows = report.selected.rows.filter((row) => row.roles.includes("commander"));
  assert.equal(commanderRows.length, 2, "expected both commanders to occupy their own row");
  assert.deepEqual(commanderRows.map((row) => row.name).sort(), ["Primary Commander", "Second Commander"]);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  // Black cards are only legally includable because the second commander's
  // color identity was unioned into the deck's colors, not discarded.
  assert.ok(report.selected.rows.some((row) => row.name.startsWith("Black Answer")), "expected the second commander's color to actually be usable, not just declared");
});

test("a single commander with no partner behaves exactly as before", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  const commanderRows = report.selected.rows.filter((row) => row.roles.includes("commander"));
  assert.equal(commanderRows.length, 1);
  assert.equal(commanderRows[0].name, "Scholar of Tests");
});

test("curveAwareLandAdjustment nudges up for a high average CMC with no ramp", () => {
  const samples = [
    { quantity: 20, cmc: 6, roles: ["threat"] },
  ];
  // avgCmc 6.0 is +3.0 above the 3.0 baseline -> +6 raw, clamped to +4.
  assert.equal(curveAwareLandAdjustment(samples), 4);
});

test("curveAwareLandAdjustment nudges down for heavy ramp even at a normal curve, after its grace allowance", () => {
  const samples = [
    { quantity: 12, cmc: 3, roles: ["threat"] },
    { quantity: 9, cmc: 3, roles: ["ramp"] },
  ];
  // avgCmc stays at 3.0 (no curve adjustment). The first 3 ramp pieces are
  // a free grace allowance (nearly every deck runs a few staple rocks
  // regardless of strategy), leaving 6 effective ramp pieces -> -2.
  assert.equal(curveAwareLandAdjustment(samples), -2);
});

test("curveAwareLandAdjustment does not penalize an ordinary handful of staple ramp pieces", () => {
  const samples = [
    { quantity: 20, cmc: 3, roles: ["threat"] },
    { quantity: 3, cmc: 3, roles: ["ramp"] },
  ];
  assert.equal(curveAwareLandAdjustment(samples), 0);
});

test("heavy ramp in a genuinely high-curve deck reduces lands modestly, not to the floor", () => {
  // Regression case from a real live-fetched 5-color Commander pool (The
  // Ur-Dragon, avg spell CMC 3.7, 16 ramp/fixing pieces): before the grace
  // allowance and ramp cap existed, 16 ordinary ramp pieces alone swamped
  // a real +1 curve signal all the way down to the -4 floor.
  const samples = [
    { quantity: 49, cmc: 4.06, roles: ["threat"] },
    { quantity: 16, cmc: 2, roles: ["ramp"] },
  ];
  const adjustment = curveAwareLandAdjustment(samples);
  assert.ok(adjustment > -4, `expected heavy ramp to be capped short of the floor even at a high curve, got ${adjustment}`);
  assert.ok(adjustment < 0, `expected heavy ramp to still pull lands down somewhat, got ${adjustment}`);
});

test("curveAwareLandAdjustment is bounded on both sides regardless of how extreme the sample is", () => {
  const extremeHigh = [{ quantity: 10, cmc: 12, roles: ["threat"] }];
  const extremeLow = [
    { quantity: 3, cmc: 0, roles: ["threat"] },
    { quantity: 30, cmc: 1, roles: ["ramp"] },
  ];
  assert.equal(curveAwareLandAdjustment(extremeHigh), 4);
  assert.equal(curveAwareLandAdjustment(extremeLow), -4);
});

test("curveAwareLandAdjustment returns no nudge for an empty or all-ramp-free average deck", () => {
  assert.equal(curveAwareLandAdjustment([]), 0);
  assert.equal(curveAwareLandAdjustment([{ quantity: 10, cmc: 3, roles: ["threat"] }]), 0);
});

// Diverse across every role roleTargets checks (ramp/draw/interaction/
// protection/recursion/sweeper) so the tournament's 45% role-coverage floor
// clears easily, while still skewing heavily toward a high curve with only
// a light dose of ramp — isolating the curve half of the adjustment.
const highCurvePool = [
  ...Array.from({ length: 20 }, (_, i) => card(`Draw ${i}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{4}{U}{U}")),
  ...Array.from({ length: 20 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.", "Creature — Test", "{4}{U}{U}")),
  ...Array.from({ length: 15 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "Creature — Test", "{3}{U}{U}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Recur ${i}`, "Return target creature card from your graveyard to your hand.", "Creature — Test", "{3}{U}{U}")),
  ...Array.from({ length: 8 }, (_, i) => card(`Sweep ${i}`, "Exile all creatures.", "Sorcery", "{5}{U}{U}")),
  ...Array.from({ length: 8 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("a high-curve, ramp-light Commander deck gets more lands than the flat 37% baseline", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 21,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: highCurvePool,
  });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(landSlots > 37, `expected more than the flat 37-land baseline for a high-curve deck, got ${landSlots}`);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100, "total deck size must still hit the target regardless of how the land/spell split shifted");
});

test("a low-curve, ramp-heavy Commander deck gets fewer lands than the flat 37% baseline", () => {
  const rampPool = [
    ...Array.from({ length: 30 }, (_, i) => card(`Dork ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{1}")),
    ...Array.from({ length: 15 }, (_, i) => card(`Cheap Draw ${i}`, "Draw a card. Scry 1.", "Creature — Test", "{U}")),
    ...Array.from({ length: 15 }, (_, i) => card(`Cheap Answer ${i}`, "Exile target nonland permanent.", "Creature — Test", "{U}")),
    ...Array.from({ length: 8 }, (_, i) => card(`Cheap Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "Creature — Test", "{U}")),
    ...Array.from({ length: 6 }, (_, i) => card(`Cheap Recur ${i}`, "Return target creature card from your graveyard to your hand.", "Creature — Test", "{1}{U}")),
    ...Array.from({ length: 5 }, (_, i) => card(`Cheap Sweep ${i}`, "Exile all creatures.", "Sorcery", "{1}{U}")),
    ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Aggressive", seed: 23,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: rampPool,
  });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(landSlots < 37, `expected fewer than the flat 37-land baseline for a low-curve, ramp-heavy deck, got ${landSlots}`);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
});

test("curve-aware land scaling never touches non-singleton formats, which stay at a flat 40%", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Control", seed: 25, colors: ["U"], cards: highCurvePool });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(landSlots, 24, "60-card Standard must stay at the flat 40% baseline (24 lands) regardless of curve");
});

// practicalOutranks — direct unit tests against the same hand-built
// goldfish/matrix shapes comparePracticalImpact's own tests already use,
// so the ranking logic is deterministic to exercise without paying for a
// real simulation run per case.
test("practicalOutranks prefers a strictly better goldfish gate tier regardless of rates", () => {
  const better = practical("goldfish-pass", 0.5, 0.5, "matrix-hold", 0.3);
  const worse = practical("goldfish-fail", 0.95, 0.95, "matrix-pass", 0.9);
  assert.equal(practicalOutranks(better, worse), true);
  assert.equal(practicalOutranks(worse, better), false);
});

test("practicalOutranks falls through to matchup gate tier once goldfish gates tie", () => {
  const better = practical("goldfish-pass", 0.7, 0.7, "matrix-pass", 0.5);
  const worse = practical("goldfish-pass", 0.7, 0.7, "matrix-hold", 0.9);
  assert.equal(practicalOutranks(better, worse), true);
  assert.equal(practicalOutranks(worse, better), false);
});

test("practicalOutranks only prefers a rate difference once it clears the same noise floor comparePracticalImpact uses", () => {
  const a = practical("goldfish-pass", 0.71, 0.7, "matrix-pass", 0.5);
  const b = practical("goldfish-pass", 0.70, 0.7, "matrix-pass", 0.5);
  assert.equal(practicalOutranks(a, b), false, "a 1-point keepable gap is noise, not a real preference");
  assert.equal(practicalOutranks(b, a), false, "neither direction should invent a preference from noise");
  const c = practical("goldfish-pass", 0.80, 0.7, "matrix-pass", 0.5);
  assert.equal(practicalOutranks(c, b), true, "a gap past the noise floor is a real preference");
});

// applyPracticalTiebreak — runNativeMasterworkTournament's own structural
// score is explicitly not a predicted win rate, so two candidates that
// land within a few points of each other are a genuine toss-up, not real
// evidence one is better. These fixtures hand-build the tournament shape
// applyPracticalTiebreak actually reads (id/verdict/tournamentScore/
// onFrontier per result) so the margin-detection logic itself is
// deterministic to exercise, independent of how a real tournament score
// gets computed.
const clearLeaderTournament = Object.freeze({
  selectedId: "leader",
  results: [
    { id: "leader", label: "Clear Leader", verdict: "advance", tournamentScore: 90, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
    { id: "second", label: "Second", verdict: "hold", tournamentScore: 60, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
    { id: "third", label: "Third", verdict: "reject", tournamentScore: 0, onFrontier: false, gate: { passed: false, reasons: ["structurally invalid"] }, axes: {}, reason: "" },
  ],
});

test("applyPracticalTiebreak never spends simulation budget when the structural leader is clearly ahead of the field", () => {
  const { tournament: result, practicalTiebreak } = applyPracticalTiebreak(clearLeaderTournament, [
    { id: "leader", label: "Clear Leader", rows: healthyRows },
    { id: "second", label: "Second", rows: healthyRows },
    { id: "third", label: "Third", rows: healthyRows },
  ], practicalInput);
  assert.equal(practicalTiebreak, null);
  assert.equal(result, clearLeaderTournament, "must return the exact same tournament object, not a copy, when the margin never triggers");
});

test("applyPracticalTiebreak triggers on a close structural margin but doesn't invent an override between practically-identical candidates", () => {
  const identicalTournament = Object.freeze({
    selectedId: "leader",
    results: [
      { id: "leader", label: "Leader", verdict: "advance", tournamentScore: 80, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
      { id: "rival", label: "Rival", verdict: "hold", tournamentScore: 77, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
    ],
  });
  const { tournament: result, practicalTiebreak } = applyPracticalTiebreak(identicalTournament, [
    { id: "leader", label: "Leader", rows: healthyRows },
    { id: "rival", label: "Rival", rows: healthyRows.map((row) => ({ ...row })) },
  ], practicalInput);
  assert.ok(practicalTiebreak.triggered);
  assert.equal(practicalTiebreak.overridden, false, "practically-identical rows must never produce an invented override");
  assert.equal(result, identicalTournament, "an untriggered override must return the exact same tournament object");
});

// A healthy, well-landed baseline shared by the tiebreak tests below, and
// a land-starved deck (14/60) — a robust, well-understood worse-goldfish
// case relative to it with otherwise identical role shape — real mana
// screw the keepability model is built to catch, not a contrived edge
// case that depends on reading the simulator's internals.
const healthyRows = [
  ...Array.from({ length: 24 }, (_, i) => ({ name: `Island Utility ${i}`, roles: ["land"], cmc: 0, quantity: 1 })),
  ...Array.from({ length: 24 }, (_, i) => ({ name: `Answer ${i}`, roles: ["interaction"], cmc: 2, quantity: 1 })),
  ...Array.from({ length: 12 }, (_, i) => ({ name: `Flow ${i}`, roles: ["draw"], cmc: 3, quantity: 1 })),
];
const starvedRows = [
  ...Array.from({ length: 14 }, (_, i) => ({ name: `Island Utility ${i}`, roles: ["land"], cmc: 0, quantity: 1 })),
  ...Array.from({ length: 34 }, (_, i) => ({ name: `Answer ${i}`, roles: ["interaction"], cmc: 2, quantity: 1 })),
  ...Array.from({ length: 12 }, (_, i) => ({ name: `Flow ${i}`, roles: ["draw"], cmc: 3, quantity: 1 })),
];

test("applyPracticalTiebreak overrides a structural leader that is meaningfully weaker in real goldfish simulation", () => {
  const tiebreakTournament = Object.freeze({
    selectedId: "starved",
    results: [
      { id: "starved", label: "Starved Leader", verdict: "advance", tournamentScore: 80, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
      { id: "healthy", label: "Healthy Rival", verdict: "hold", tournamentScore: 77, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
    ],
  });
  const { tournament: result, practicalTiebreak } = applyPracticalTiebreak(tiebreakTournament, [
    { id: "starved", label: "Starved Leader", rows: starvedRows },
    { id: "healthy", label: "Healthy Rival", rows: healthyRows },
  ], practicalInput);

  assert.ok(practicalTiebreak.triggered);
  assert.equal(practicalTiebreak.overridden, true);
  assert.equal(practicalTiebreak.fromId, "starved");
  assert.equal(practicalTiebreak.toId, "healthy");
  assert.equal(result.selectedId, "healthy");
  assert.equal(result.results.find((entry) => entry.id === "healthy").verdict, "advance");
  assert.equal(result.results.find((entry) => entry.id === "starved").verdict, "hold");
  // Every other field on the original tournament (frontier membership,
  // gate reasons, axes) must survive untouched — only verdict/selectedId
  // and the two affected reasons change.
  assert.equal(result.results.find((entry) => entry.id === "healthy").onFrontier, true);
});

test("applyPracticalTiebreak is fully deterministic for the same inputs", () => {
  const tiebreakTournament = Object.freeze({
    selectedId: "starved",
    results: [
      { id: "starved", label: "Starved Leader", verdict: "advance", tournamentScore: 80, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
      { id: "healthy", label: "Healthy Rival", verdict: "hold", tournamentScore: 77, onFrontier: true, gate: { passed: true, reasons: [] }, axes: {}, reason: "" },
    ],
  });
  const candidates = [{ id: "starved", label: "Starved Leader", rows: starvedRows }, { id: "healthy", label: "Healthy Rival", rows: healthyRows }];
  const first = applyPracticalTiebreak(tiebreakTournament, candidates, practicalInput);
  const second = applyPracticalTiebreak(tiebreakTournament, candidates, practicalInput);
  assert.deepEqual(first.practicalTiebreak, second.practicalTiebreak);
});

// End-to-end: forgeNativeMasterwork's own practicalTiebreak field must stay
// internally consistent with which candidate actually won, whether or not
// this particular pool's three structural tempers happen to land close
// enough together to trigger it.
test("forgeNativeMasterwork's practicalTiebreak field, when it fires, stays consistent with the final selected candidate", () => {
  const report = forgeNativeMasterwork(practicalInput);
  assert.ok("practicalTiebreak" in report);
  if (report.practicalTiebreak?.overridden) {
    assert.equal(report.tournament.selectedId, report.practicalTiebreak.toId);
    assert.equal(report.selected.id, report.practicalTiebreak.toId);
    assert.equal(report.reasoning.selectedId, report.practicalTiebreak.toId);
  }
  const again = forgeNativeMasterwork(practicalInput);
  assert.deepEqual(report.practicalTiebreak, again.practicalTiebreak, "must be deterministic for the same seed/input");
});

test("forgeNativeMasterwork populates a real Commander power signal for Commander format and leaves it null everywhere else", () => {
  const commanderReport = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." },
    cards: pool,
  });
  assert.ok(commanderReport.powerSignal, "Commander format must always produce a power signal");
  assert.equal(typeof commanderReport.powerSignal.tier, "string");
  assert.match(commanderReport.powerSignal.evidence, /forge theory/i);
  // Confirms the wired-through interaction graph is the real one this
  // exact report already computed for structuralAnalysis, not a fresh,
  // disconnected recomputation — same field shape, same underlying data.
  assert.ok(Array.isArray(commanderReport.powerSignal.interconnection.comboLoops));
  assert.ok(Array.isArray(commanderReport.powerSignal.interconnection.amplifiers));
  // The shared `pool` fixture has no fast-mana, tutor, extra-turn, or
  // mass-land-denial cards in it, so the honest answer here is "Casual" —
  // asserting that instead of just presence guards against a signal that
  // always fires regardless of the actual deck.
  assert.equal(commanderReport.powerSignal.tier, "Casual");

  const standardReport = forgeNativeMasterwork(practicalInput);
  assert.equal(standardReport.powerSignal, null, "power signal is a Commander-specific concept and must stay null for other formats");
});

test("powerSignal also populates for Brawl and Standard Brawl, the other singleton commander-style formats", () => {
  for (const format of ["Brawl", "Standard Brawl"]) {
    const report = forgeNativeMasterwork({
      format, target: 60, strategy: "Balanced midrange", seed: 7,
      commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." },
      cards: pool,
    });
    assert.ok(report.powerSignal, `${format} must also produce a power signal, not just Commander`);
  }
});

test("powerAudit stays null for a non-Commander-family format even when a targetPowerTier is somehow supplied — the Commander tier vocabulary never leaks into a competitive 60-card format", () => {
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 7,
    cards: pool, colors: ["U"], targetPowerTier: "Casual",
  });
  assert.equal(report.powerSignal, null);
  assert.equal(report.powerAudit, null);
});

// --- Requested-tier vs. measured-tier audit and rebuild -----------------
// Four cards, each independently verified high-ceiling on its own oracle
// text (two different repeatable-value-engine shapes, one via a
// combo-proximate mutual pair) added to the shared, role-diverse `pool`
// fixture, which by itself already measures Casual (see the "populates a
// real Commander power signal" test above). Real construction picks them
// up when unconstrained; a Casual request should exclude them via one
// real rebuild.
const powerTierEngineCards = [
  card("Test Bone Reaper", "Sacrifice a creature: Draw a card, then this deals 1 damage to any target. Whenever another creature you control dies, you may sacrifice another creature.", "Creature — Test", "{1}{U}"),
  card("Test Card Reaper", "When this creature dies, draw a card if you have seven or more cards in your hand. Sacrifice another creature: This deals 2 damage to any target.", "Creature — Test", "{U}"),
  card("Test Grand Archivist", "Whenever you cast an instant or sorcery spell, draw a card.", "Creature — Test", "{1}{U}"),
  card("Test Chronicle Thief", "Whenever you cast a legendary spell, search your library for a card, put it onto the battlefield, then shuffle.", "Creature — Test", "{3}{U}{U}"),
];
const powerTierPool = [...pool, ...powerTierEngineCards];
// Deliberately carries no producer/payoff edge into the four high-ceiling
// fixture cards. Commander compatibility is tested separately above; this
// fixture's contract is specifically that the pool cannot reach Maximum.
const powerTierCommander = { name: "Scholar of Tests", colors: ["U"], oracleText: "This creature has vigilance." };

test("a Maximum target that the pool can't fully reach is disclosed honestly, not silently relabeled", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: [...pool, powerTierEngineCards[0]], targetPowerTier: "Maximum",
  });
  assert.ok(powerTierEngineCards.some((c) => report.selected.rows.some((row) => row.name === c.name)), "the bias should actually pull in at least one flagged card when targeting Maximum");
  assert.equal(report.powerAudit.requested, "Maximum");
  // This fixture pool cannot actually reach Maximum — an honest,
  // undisguised report is the entire point of this feature.
  assert.equal(report.powerAudit.mismatch, true);
  assert.equal(report.powerAudit.direction, "lowerThanRequested");
  assert.equal(report.powerAudit.rebuildAttempted, false, "rebuild only ever applies to a requested-Casual-but-measured-higher mismatch");
  assert.equal(report.powerAudit.rebuildImproved, false);
  assert.equal(report.powerAudit.rebuildReachedTarget, false);
});

test("a requested Casual build that measures materially higher is rebuilt within the constraint when a legal alternative exists", () => {
  const unconstrained = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: powerTierPool, targetPowerTier: "Maximum",
  });
  assert.notEqual(unconstrained.powerSignal.tier, "Casual", "sanity check: this pool must actually be capable of measuring above Casual when unconstrained");

  const casualReport = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: powerTierPool, targetPowerTier: "Casual",
  });
  assert.equal(casualReport.powerSignal.tier, "Casual");
  assert.equal(casualReport.powerAudit.mismatch, false);
  assert.equal(casualReport.powerAudit.rebuildAttempted, true);
  assert.equal(casualReport.powerAudit.rebuildImproved, true);
  assert.equal(casualReport.powerAudit.rebuildReachedTarget, true, "a rebuild that genuinely reaches the requested tier must say so, not just 'improved'");
  assert.ok(powerTierEngineCards.every((c) => !casualReport.selected.rows.some((row) => row.name === c.name)), "every flagged high-ceiling card must actually be excluded from the rebuilt list, not just relabeled");
  assert.equal(casualReport.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100, "the rebuilt candidate must still be a complete, legal deck");
  // The delivered list (selected) and the candidates array (ranked) must
  // describe the same, post-rebuild deck — never the pre-rebuild one.
  const deliveredCandidate = casualReport.candidates.find((c) => c.id === casualReport.selected.id);
  assert.deepEqual(deliveredCandidate.rows, casualReport.selected.rows, "candidates/ranked must reflect the rebuilt rows, not the original pre-rebuild candidate");
  assert.equal(casualReport.reasoning.selectedId, casualReport.selected.id);
  assert.equal(casualReport.tournament.selectedId, casualReport.selected.id);
});

// A pool deep enough in redundant, identically-flagged engine cards that
// excluding the first-selected batch still leaves the rebuild no choice
// but to pull in more of the same flagged template to complete a legal
// 100-card deck — Maximum rebuilds down to High-Power, a real
// improvement, but never reaches the requested Casual. This is the
// live-observed shape (verified against a real Commander generation
// against live Scryfall data before writing this fixture): rebuildImproved
// must be true, rebuildReachedTarget must stay false, and the measured
// tier must be exactly what's disclosed — never silently called "reached."
const deepEngineCards = Array.from({ length: 15 }, (_, i) =>
  card(`Test Deep Engine ${i}`, "Whenever you cast an instant or sorcery spell, draw a card.", "Creature — Test", "{1}{U}"),
);
const scarceDrawPool = [
  ...Array.from({ length: 6 }, (_, i) => card(`Scarce Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => card(`Scarce Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Scarce Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Scarce Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Scarce Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("a bounded repair with no safe unused alternatives preserves and honestly discloses the original Maximum profile", () => {
  const casualReport = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: [...scarceDrawPool, ...deepEngineCards], targetPowerTier: "Casual",
  });
  assert.equal(casualReport.powerAudit.originalMeasuredTier, "Maximum", "sanity check: the pre-rebuild pass must have actually measured Maximum for this fixture");
  assert.equal(casualReport.powerSignal.tier, "Maximum");
  assert.equal(casualReport.powerAudit.measured, "Maximum");
  assert.equal(casualReport.powerAudit.mismatch, true);
  assert.equal(casualReport.powerAudit.rebuildAttempted, true);
  assert.equal(casualReport.powerAudit.rebuildImproved, false);
  assert.equal(casualReport.powerAudit.rebuildReachedTarget, false);
});

test("a requested Casual build stays honestly disclosed when no rebuild can fix it — the commander itself is the only offending card", () => {
  const powerfulCommander = { name: "Test Archmage Commander", colors: ["U"], oracleText: "Whenever you cast an instant or sorcery spell, draw a card." };
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerfulCommander, cards: pool, targetPowerTier: "Casual",
  });
  assert.notEqual(report.powerSignal.tier, "Casual", "sanity check: the commander's own signal must actually be what's driving the measured tier here");
  assert.equal(report.powerAudit.mismatch, true);
  assert.equal(report.powerAudit.direction, "higherThanRequested");
  assert.equal(report.powerAudit.rebuildAttempted, true, "the bounded pass runs, finds no removable non-commander offender, and preserves the mismatch honestly");
  assert.equal(report.powerAudit.rebuildImproved, false);
  assert.equal(report.powerAudit.rebuildReachedTarget, false);
  assert.equal(report.powerAudit.measured, report.powerSignal.tier, "the disclosed measured tier must match what actually shipped, not a stale pre-check value");
});

test("the rebuild is deterministic for the same seed and input", () => {
  const first = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: powerTierPool, targetPowerTier: "Casual",
  });
  const second = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7,
    commander: powerTierCommander, cards: powerTierPool, targetPowerTier: "Casual",
  });
  assert.deepEqual(first.powerAudit, second.powerAudit);
  assert.deepEqual(first.selected.rows, second.selected.rows);
});

test("powerTierScoreFor nudges a fast-mana/tutor/extra-turn/mass-land-denial card toward or away from a chosen target tier, and never touches an ordinary card", () => {
  const fastManaCard = { name: "Test Rock", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", cmc: 1 };
  const massLandDenialCard = { name: "Test Armageddon", typeLine: "Sorcery", oracleText: "Destroy all lands.", cmc: 3 };
  const vanilla = { name: "Test Bear", typeLine: "Creature", oracleText: "", cmc: 2 };

  assert.ok(powerTierScoreFor(fastManaCard, "Casual") < 0, "targeting Casual must penalize a fast-mana card");
  assert.ok(powerTierScoreFor(fastManaCard, "Maximum") > 0, "targeting Maximum must reward a fast-mana card");
  assert.ok(
    powerTierScoreFor(massLandDenialCard, "Maximum") > powerTierScoreFor(fastManaCard, "Maximum"),
    "mass land denial is weighted double, same as in evaluateCommanderPowerSignal's own signalScore",
  );
  assert.equal(powerTierScoreFor(vanilla, "Casual"), 0, "a card with no power signal is never nudged either way");
  assert.equal(powerTierScoreFor(vanilla, "Maximum"), 0);
  assert.equal(powerTierScoreFor(fastManaCard, undefined), 0, "no target tier at all means no bias");
  assert.equal(powerTierScoreFor(fastManaCard, "No preference"), 0, "an unrecognized/neutral target means no bias");
});

test("a multi-category card is biased by its strongest matched category's weight, not whichever category happens to be checked first", () => {
  // Matches both fastMana (weight 1) and repeatableValueEngine (weight
  // 2): a free mana ability plus a repeatable sacrifice-for-a-card
  // engine on the same card.
  const dualSignalCard = { name: "Test Dual Signal Rock", typeLine: "Artifact", oracleText: "Add {C}. Sacrifice a creature: Draw a card.", cmc: 0 };
  const fastManaOnlyCard = { name: "Test Fast Mana Only", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", cmc: 1 };
  assert.ok(
    Math.abs(powerTierScoreFor(dualSignalCard, "Casual")) > Math.abs(powerTierScoreFor(fastManaOnlyCard, "Casual")),
    "the dual-signal card must be penalized more (biased by repeatableValueEngine's weight 2) than a card matching only fastMana's weight 1",
  );
  assert.ok(
    Math.abs(powerTierScoreFor(dualSignalCard, "Maximum")) > Math.abs(powerTierScoreFor(fastManaOnlyCard, "Maximum")),
    "the same must hold in the rewarding direction",
  );
});

// Role-diverse, same shape as the shared `pool` fixture (draw/interaction/
// protection/ramp), so a generation attempt can actually clear the
// structural role-coverage gate on the cheap/common half alone once the
// pricey/rare half is excluded — a flat pile of one role (as an earlier,
// simpler version of this fixture used) fails that gate regardless of
// price or rarity, which would test nothing about the exclusion itself.
const tieredCard = (name, roleText, extra) => ({ name, oracleText: roleText, typeLine: "Creature — Test", manaCost: "{2}{U}", colorIdentity: ["U"], ...extra });
const ROLE_TEXTS = [
  "When this enters, draw a card. Scry 1.",
  "Exile target nonland permanent.",
  "Target creature gains hexproof and indestructible until end of turn.",
];
const pricedPool = [
  ...ROLE_TEXTS.flatMap((text, roleIndex) => Array.from({ length: 14 }, (_, i) => tieredCard(`Cheap Role${roleIndex} ${i}`, text, { priceUsd: 1 }))),
  ...ROLE_TEXTS.flatMap((text, roleIndex) => Array.from({ length: 8 }, (_, i) => tieredCard(`Pricey Role${roleIndex} ${i}`, text, { priceUsd: 100 }))),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("forgeNativeMasterwork's maxCardPrice is a hard exclusion, never just a deprioritization", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 11, colors: ["U"], cards: pricedPool, maxCardPrice: 5 });
  const overBudget = report.selected.rows.filter((row) => row.name.startsWith("Pricey"));
  assert.equal(overBudget.length, 0, "no card priced over the cap may ever be selected, regardless of how well it otherwise scores");
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60, "a complete legal deck must still be buildable from what's left under the cap");
});

const rarityPool = [
  ...ROLE_TEXTS.flatMap((text, roleIndex) => Array.from({ length: 14 }, (_, i) => tieredCard(`Common Role${roleIndex} ${i}`, text, { rarity: "common" }))),
  ...ROLE_TEXTS.flatMap((text, roleIndex) => Array.from({ length: 8 }, (_, i) => tieredCard(`Mythic Role${roleIndex} ${i}`, text, { rarity: "mythic" }))),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("forgeNativeMasterwork's commonsOnly is a hard exclusion, never just a deprioritization", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 13, colors: ["U"], cards: rarityPool, commonsOnly: true });
  const nonCommon = report.selected.rows.filter((row) => row.name.startsWith("Mythic"));
  assert.equal(nonCommon.length, 0, "no non-common card may ever be selected once commonsOnly is set");
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
});

test("maxCardPrice and commonsOnly never exclude a card whose price or rarity is simply unknown", () => {
  // The shared `pool` fixture carries neither priceUsd nor rarity on any
  // card — absence of data must never be treated as evidence a card is
  // over budget or non-common, same convention budgetScoreFor's soft
  // nudge already follows.
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 9, colors: ["U"], cards: pool, maxCardPrice: 1, commonsOnly: true });
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60, "a complete legal deck must still be buildable when the whole pool has unknown price/rarity data");
});

// A scarce, competitive resource (six candidates for far fewer real
// slots), same "prefers X once slots are scarce" shape other tests in
// this file already use to prove a scoring nudge has a real, measurable
// effect on actual construction — not just on the isolated per-card
// score powerTierScoreFor's own direct test already covers.
const quickRock = (n) => card(`Quick Rock ${n}`, "{T}: Add {C}{C}.", "Artifact", "{1}");
const tierPool = [
  ...Array.from({ length: 16 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 16 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 16 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 16 }, (_, i) => card(`Ordinary Bear ${i}`, "This creature has vigilance.", "Creature — Bear", "{2}{U}")),
  ...Array.from({ length: 6 }, (_, i) => quickRock(i)),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];
const quickRockCount = (report) => report.selected.rows.filter((row) => row.name.startsWith("Quick Rock")).reduce((sum, row) => sum + row.quantity, 0);

test("targetPowerTier actually changes real construction, not just an isolated card score", () => {
  const commander = { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." };
  const casual = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, colors: ["U"], commander, cards: tierPool, targetPowerTier: "Casual" });
  const maximum = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, colors: ["U"], commander, cards: tierPool, targetPowerTier: "Maximum" });
  assert.ok(
    quickRockCount(maximum) > quickRockCount(casual),
    `expected targeting Maximum (${quickRockCount(maximum)} fast-mana rocks) to select strictly more than targeting Casual (${quickRockCount(casual)}) from the same scarce, competitive pool`,
  );
});

// --- Construction recovery ladder (P0: a legal commander with a real,
// non-throwing scarce-pool condition used to surface as a total failure —
// see buildCandidate/buildImportedCandidate's recovery wrapper and
// relaxAnalysisPreferences) ---

// Singleton formats need one unique eligible card per spell slot (~62 of
// them for a 100-card Commander deck once lands/commander are set aside).
// A cheap-only pool with real role diversity (draw/interaction/protection/
// ramp, same shape as the proven `pool` fixture above) is deliberately
// short of 62 on its own — under a $2 cap it would previously throw
// "could not fill N spell slot(s)" straight out of chooseSpells. The
// equally diverse "premium" half pushes the total pool comfortably past
// 62, and past the format's own role-coverage gate, once the cap relaxes.
const cheapDraw = (n) => ({ ...card(`Cheap Draw ${n}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{1}{G}", ["G"]), priceUsd: 0.5 });
const cheapAnswer = (n) => ({ ...card(`Cheap Answer ${n}`, "Destroy target creature.", "Sorcery", "{1}{G}", ["G"]), priceUsd: 0.5 });
const cheapShield = (n) => ({ ...card(`Cheap Shield ${n}`, "Target creature gains hexproof and indestructible until end of turn.", "Instant", "{G}", ["G"]), priceUsd: 0.5 });
const premiumDraw = (n) => ({ ...card(`Premium Draw ${n}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{2}{G}", ["G"]), priceUsd: 45 });
const premiumAnswer = (n) => ({ ...card(`Premium Answer ${n}`, "Destroy target creature. Draw a card.", "Sorcery", "{2}{G}", ["G"]), priceUsd: 45 });
const premiumRamp = (n) => ({ ...card(`Premium Rock ${n}`, "Add one mana of any color.", "Artifact", "{1}", []), priceUsd: 45 });
const scarceCommanderPool = [
  ...Array.from({ length: 14 }, (_, i) => cheapDraw(i)),
  ...Array.from({ length: 13 }, (_, i) => cheapAnswer(i)),
  ...Array.from({ length: 13 }, (_, i) => cheapShield(i)),
  ...Array.from({ length: 14 }, (_, i) => premiumDraw(i)),
  ...Array.from({ length: 13 }, (_, i) => premiumAnswer(i)),
  ...Array.from({ length: 13 }, (_, i) => premiumRamp(i)),
  ...Array.from({ length: 20 }, (_, i) => card(`Forest Utility ${i}`, "{T}: Add {G}.", "Land", "", ["G"])),
];

test("a strict budget cap that would leave too few eligible cards to fill a singleton deck recovers instead of failing outright", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 7,
    colors: ["G"],
    cards: scarceCommanderPool,
    commander: { name: "Test Commander", colors: ["G"], oracleText: "" },
    maxCardPrice: 2,
  });
  const total = report.selected.rows.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(total, 100, "the deck must still reach the exact legal target size");
  assert.equal(report.selected.recoveryStage, "relaxed-preferences", "recovery must be recorded, not silently invisible");
  assert.match(report.selected.recoveryNote, /Budget or rarity preferences were relaxed/);
  // Recovery relaxed the budget cap, not color identity — every nonland,
  // non-basic-land row must still be from the supplied, already
  // color-legal pool.
  const poolNames = new Set(scarceCommanderPool.map((c) => c.name));
  for (const row of report.selected.rows) {
    if (row.roles?.includes("land") || row.name === "Test Commander") continue;
    assert.ok(poolNames.has(row.name), `${row.name} must come from the verified, already color-legal pool`);
  }
});

test("when relaxing budget/commons preferences would not actually grow the pool, the original scarcity error still surfaces (no infinite or misleading retry)", () => {
  // No maxCardPrice is set at all here — every nonland card is already
  // eligible, so relaxAnalysisPreferences has nothing left to relax. The
  // pool is just genuinely too small (5 unique spells for ~62 slots), and
  // recovery must not mask that real cause with a second, identical
  // failure disguised as a successful retry.
  const genuinelyTooSmallPool = [
    ...Array.from({ length: 5 }, (_, i) => cheapDraw(i)),
    ...Array.from({ length: 20 }, (_, i) => card(`Green Land ${i}`, "{T}: Add {G}.", "Land", "", ["G"])),
  ];
  assert.throws(
    () =>
      forgeNativeMasterwork({
        format: "Commander",
        target: 100,
        strategy: "Balanced midrange",
        seed: 7,
        colors: ["G"],
        cards: genuinelyTooSmallPool,
        commander: { name: "Test Commander", colors: ["G"], oracleText: "" },
      }),
    /could not fill \d+ spell slot/,
  );
});

// P0 Part 4 — the masterworks screen lets the player pick ANY exposed
// candidate, so a candidate that failed its own hard gate must never be
// one of the exposed choices, but a single bad candidate must also never
// take the other two down with it (previously: candidates: ranked
// exposed every VARIANTS entry unconditionally, gate-rejected or not).
// scarceCommanderPool above is tight enough that all three tempers
// (cohesion/resilience/precision) converge on nearly the same 100 cards —
// a real, deterministic way to trigger the tournament's own >=90%-overlap
// duplicate rejection without hand-faking a gate failure.
test("a candidate that fails its own hard gate (here: a >=90% duplicate of an already-passing design) is never exposed on the masterworks screen — but the other valid candidates still are", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 7,
    colors: ["G"],
    cards: scarceCommanderPool,
    commander: { name: "Test Commander", colors: ["G"], oracleText: "" },
    maxCardPrice: 2,
  });
  // Confirms the fixture actually produces a real gate rejection, not
  // just asserting the filter never removes anything.
  const rejectedInTournament = report.tournament.results.filter((result) => !result.gate.passed);
  assert.ok(rejectedInTournament.length > 0, "expected this scarce, tight pool to produce at least one real gate rejection");

  const exposedIds = new Set(report.candidates.map((candidate) => candidate.id));
  for (const rejected of rejectedInTournament) {
    assert.ok(!exposedIds.has(rejected.id), `${rejected.id} failed its hard gate (${rejected.gate.reasons.join(" ")}) and must not be a selectable candidate`);
  }
  // The tournament winner and any other candidate that actually passed
  // its gate must still be present — one bad candidate doesn't take the
  // valid ones down with it.
  assert.ok(exposedIds.has(report.selected.id));
  const passedInTournament = report.tournament.results.filter((result) => result.gate.passed);
  for (const passed of passedInTournament) {
    assert.ok(exposedIds.has(passed.id), `${passed.id} passed its hard gate and must remain a real, selectable option`);
  }
  assert.equal(report.candidates.length, passedInTournament.length);
});
