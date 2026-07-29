import assert from "node:assert/strict";
import test from "node:test";
import { classifyNativeCard, fieldCounterRolesFor, forgeNativeMasterwork, parseNativeBlueprintIntent, poolMechanicalSignals, synergyPotentialFor } from "../app/native-masterwork-engine.mjs";

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
