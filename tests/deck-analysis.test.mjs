import assert from "node:assert/strict";
import test from "node:test";

import { createRecommendation, evaluateLandEngine, isLand, mechanicProfile, normalizeCardName, parseDeck } from "../app/deck-analysis.mjs";

const arenaDeck = `Deck
4 Mossborn Hydra (FDN) 107
16 Forest (EOE) 266
4 Fabled Passage (TLE) 57
4 Evolving Wilds (AFR) 256
4 Llanowar Elves (FDN) 227`;

test("normalizes Arena set and collector metadata", () => {
  assert.equal(normalizeCardName("Fabled Passage (TLE) 57"), "Fabled Passage");
});

test("counts fetch-style utility lands as lands", () => {
  const rows = parseDeck(arenaDeck);
  const landCount = rows
    .filter((row) => isLand(row.name))
    .reduce((total, row) => total + row.quantity, 0);

  assert.equal(landCount, 24);
});

test("uses catalog types for generated dual lands instead of name suffixes", () => {
  assert.equal(isLand("Spirebluff Canal"), true);
  assert.equal(isLand("Riverpyre Verge"), true);
});

test("does not include sideboard cards in main-deck composition", () => {
  const rows = parseDeck("Deck\n20 Forest\nSideboard\n4 Evolving Wilds");
  assert.equal(rows.reduce((total, row) => total + row.quantity, 0), 20);
});

test("creates a different explicit proposal for a mono-basic fetch package", () => {
  const deck = "16 Forest\n4 Fabled Passage\n4 Evolving Wilds\n4 Llanowar Elves\n32 Spell";
  const recommendation = createRecommendation(parseDeck(deck));
  assert.notEqual(recommendation.proposedDeck, deck);
  assert.deepEqual(recommendation.changes, [
    { card: "Evolving Wilds", quantity: -2 },
    { card: "Forest", quantity: 2 },
  ]);
});

test("creates a mana experiment instead of copying a low-land deck", () => {
  const recommendation = createRecommendation(parseDeck("22 Mountain\n2 Expensive Spell\n36 Core Spell"));
  assert.match(recommendation.title, /mana/i);
  assert.notEqual(recommendation.proposedDeck, "22 Mountain\n2 Expensive Spell\n36 Core Spell");
});

test("preserves fetch lands when the deck contains landfall payoffs", () => {
  const rows = parseDeck("4 Mossborn Hydra\n4 Earthbender Ascension\n16 Forest\n4 Fabled Passage\n4 Evolving Wilds\n28 Llanowar Elves");
  const profile = mechanicProfile(rows);
  const result = createRecommendation(rows, "Standard");
  assert.equal(profile.landfall_payoff, 8);
  assert.equal(result.title, "Preserve the landfall engine");
  assert.deepEqual(result.changes, []);
  assert.match(result.reasoning, /two separate land-entering events/i);
});

test("preserves landfall while proposing a concrete flex-slot experiment", () => {
  const rows = parseDeck("16 Forest\n4 Fabled Passage\n4 Evolving Wilds\n4 Mossborn Hydra\n4 Icetill Explorer\n4 Earthbender Ascension\n1 Lumra, Bellow of the Woods\n4 Sapling Nursery\n4 Badgermole Cub\n4 Llanowar Elves\n3 Terrasymbiosis\n4 Studious First-Year");
  const result = createRecommendation(rows, "Standard");
  assert.equal(result.title, "Preserve the landfall engine");
  assert.deepEqual(result.changes, [
    { card: "Lumra, Bellow of the Woods", quantity: -1 },
    { card: "Terrasymbiosis", quantity: 1 },
  ]);
  assert.match(result.reasoning, /hypothesis to compare/i);
});

test("trims rather than blindly preserves an oversized slow fetch package with weak landfall density", () => {
  const rows = parseDeck("1 Mossborn Hydra\n16 Forest\n4 Fabled Passage\n4 Evolving Wilds\n35 Core Spell");
  const evaluation = evaluateLandEngine(rows);
  const result = createRecommendation(rows, "Standard");
  assert.equal(evaluation.posture, "trim-test");
  assert.match(result.title, /tempo tax/i);
  assert.deepEqual(result.changes, [{ card: "Evolving Wilds", quantity: -2 }, { card: "Forest", quantity: 2 }]);
});

test("flags excessive land count even when landfall synergy is strong", () => {
  const rows = parseDeck("4 Mossborn Hydra\n4 Earthbender Ascension\n20 Forest\n4 Fabled Passage\n4 Evolving Wilds\n24 Core Spell");
  const evaluation = evaluateLandEngine(rows);
  const result = createRecommendation(rows, "Standard");
  assert.equal(evaluation.posture, "excess-land-risk");
  assert.match(result.title, /flood risk/i);
  assert.deepEqual(result.changes, []);
});

test("every recommendation explains gain, risk, and a measurable test contract", () => {
  const result = createRecommendation(parseDeck("24 Mountain\n4 Core Threat\n3 Support Spell\n2 Flex Spell\n27 Other Spell"));
  assert.ok(result.expectedGain.length > 20);
  assert.ok(result.risk.length > 20);
  assert.equal(result.testPlan.openingHands, 2500);
  assert.equal(result.testPlan.earlyMatches, 5);
  assert.equal(result.testPlan.reviewMatches, 12);
});

test("offers named runner-up experiments with complete same-size decklists", () => {
  const rows = parseDeck("24 Mountain\n4 Core Threat\n3 Support Spell\n2 Flex Spell\n27 Other Spell");
  const result = createRecommendation(rows);
  const option = result.manualChallenges.find((candidate) => candidate.proposedDeck);
  assert.ok(option);
  assert.match(option.reason, /one fewer/i);
  assert.equal(parseDeck(option.proposedDeck).reduce((sum, row) => sum + row.quantity, 0), 60);
});
