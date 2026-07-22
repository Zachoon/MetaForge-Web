import assert from "node:assert/strict";
import test from "node:test";
import { classifyNativeCard, forgeNativeMasterwork, parseNativeBlueprintIntent } from "../app/native-masterwork-engine.mjs";

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
  assert.equal(first.engine, "metaforge-native-masterwork-v5");
  assert.equal(first.candidates.length, 3);
  assert.equal(first.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  assert.equal(first.selected.rows[0].name, "Scholar of Tests");
  assert.equal(first.selected.tournament.verdict, "advance");
  assert.equal(first.candidates.every((candidate) => candidate.tournament), true);
  assert.deepEqual(first.diagnostics, { analysisPasses: 1, cardsAnalyzed: pool.length, candidatesBuilt: 3 });
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

  assert.equal(report.selected.blueprintAlignment.status, "unsupported-tribe-in-verified-pool");
  assert.match(report.selected.blueprintAlignment.boundary, /No legal muppet creature/i);
});

test("normalizes ordinary-language counter requests", () => {
  assert.deepEqual(
    parseNativeBlueprintIntent({ note: "Gamma Tribal and plus one plus one counters" }).promises,
    ["gamma typal", "+1/+1 counter growth"],
  );
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
  assert.deepEqual(report.candidates.map((candidate) => candidate.score), [...report.candidates.map((candidate) => candidate.score)].sort((a, b) => b - a));
});
