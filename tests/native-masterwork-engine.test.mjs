import assert from "node:assert/strict";
import test from "node:test";
import { budgetScoreFor, classifyNativeCard, colorPipsFromCost, complexityScoreFor, curveTargets, fieldCounterRolesFor, forgeNativeMasterwork, hypergeometricAtLeast, manaConsistencyReport, oracleTextComplexity, parseNativeBlueprintIntent, poolMechanicalSignals, popularityScoreFromRank, proportionalBasicCounts, synergyPotentialFor } from "../app/native-masterwork-engine.mjs";

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

test("forges three deterministic personalized candidates without a model", () => {
  const input = { format: "Commander", target: 100, strategy: "Control", path: "Reactive Precision", note: "I love card draw and protection", seed: 42, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." }, cards: pool };
  const first = forgeNativeMasterwork(input);
  const second = forgeNativeMasterwork(input);
  assert.deepEqual(first, second);
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
  assert.deepEqual(report.sourcesByColor, { W: 4, U: 0, B: 12, R: 0, G: 0 });
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
