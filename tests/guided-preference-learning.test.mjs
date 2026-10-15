import assert from "node:assert/strict";
import test from "node:test";
import {
  DECLINE_REASONS,
  PREFERENCE_LIMITS,
  buildPreferenceProfile,
  explainOffer,
  orderRemainingCategories,
  preferenceAdjustment,
  sanitizeDeclineFeedback,
} from "../app/guided-preference-learning.mjs";
import "../app/native-masterwork-engine.mjs"; // configures the card-tag lookup suggestCardForCategory relies on
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";
import { guidedSeedNames } from "../app/guided-draft.mjs";

// Flat analyzed-row fixtures: the fields the learning module reads.
const row = (name, { produces = [], rewards = [], roles = ["ramp"], cmc = 2, priceUsd = 0.5, score = 10, oracleText = "Add one mana." } = {}) => ({
  name,
  card: { name, priceUsd, cmc, oracleText, typeLine: "Artifact" },
  roles,
  cmc,
  score,
  mechanics: { produces, rewards },
});
const CATEGORIES = ["ramp", "draw", "interaction", "protection", "recursion", "sweeper", "winConditions", "synergyPieces"];

test("decline reasons are the five one-tap options and unknown reasons are dropped, not trusted", () => {
  assert.deepEqual(DECLINE_REASONS.map((reason) => reason.id), ["wrong-plan", "budget", "power-level", "style", "have-better"]);
  const clean = sanitizeDeclineFeedback([
    { name: "Sol Ring", reason: "budget" },
    { name: "Mana Crypt", reason: "drop table" },
    { name: "", reason: "budget" },
    "nonsense",
  ]);
  assert.deepEqual(clean.map((entry) => ({ ...entry })), [{ name: "Sol Ring", reason: "budget" }, { name: "Mana Crypt", reason: null }]);
  assert.deepEqual(sanitizeDeclineFeedback("x"), []);
});

test("no signals means no adjustment, so ranking is unchanged for a fresh session", () => {
  const profile = buildPreferenceProfile({});
  assert.equal(preferenceAdjustment(row("Arcane Signet"), profile).delta, 0);
  assert.equal(preferenceAdjustment(row("Arcane Signet"), null).delta, 0);
});

test("a budget decline pushes cards at or above that price down and leaves cheap cards alone", () => {
  const profile = buildPreferenceProfile({ declined: [{ row: row("Chrome Mox", { priceUsd: 40 }), reason: "budget" }] });
  assert.equal(profile.priceCeiling, 32);
  assert.ok(preferenceAdjustment(row("Mox Diamond", { priceUsd: 60 }), profile).delta < 0);
  assert.equal(preferenceAdjustment(row("Mind Stone", { priceUsd: 0.3 }), profile).delta, 0);
});

test("wrong-plan declines penalize the declined card's mechanics; accepts reward shared mechanics", () => {
  const profile = buildPreferenceProfile({
    acceptedRows: [row("Skullclamp", { produces: ["sacrifice"] })],
    declined: [{ row: row("Doubling Season", { produces: ["counters"] }), reason: "wrong-plan" }],
  });
  assert.ok(preferenceAdjustment(row("Viscera Seer", { produces: ["sacrifice"] }), profile).delta > 0);
  assert.ok(preferenceAdjustment(row("Hardened Scales", { produces: ["counters"] }), profile).delta < 0);
});

test("power-level declines push down equally strong or stronger cards", () => {
  const profile = buildPreferenceProfile({ declined: [{ row: row("Cyclonic Rift", { score: 40 }), reason: "power-level" }] });
  assert.ok(preferenceAdjustment(row("Mana Drain", { score: 45 }), profile).delta < 0);
  assert.equal(preferenceAdjustment(row("Cancel", { score: 5 }), profile).delta, 0);
});

test("'have a better card' only removes that card; it does not reshape ranking", () => {
  const profile = buildPreferenceProfile({ declined: [{ row: row("Swords to Plowshares", { priceUsd: 50, score: 50 }), reason: "have-better" }] });
  assert.equal(profile.priceCeiling, null);
  assert.equal(profile.qualityCeiling, null);
});

test("each Player Compass answer counts on its own, before all four are given", () => {
  const profile = buildPreferenceProfile({ compass: { pace: "early" } });
  assert.equal(profile.compass.pace, "early");
  assert.equal(profile.compass.risk, null);
  assert.ok(preferenceAdjustment(row("Sol Ring", { cmc: 1 }), profile).delta > 0);
  assert.ok(preferenceAdjustment(row("Gilded Lotus", { cmc: 5 }), profile).delta < 0);
});

test("adjustments are always capped so learning nudges and never buries a card outright", () => {
  const declined = Array.from({ length: 20 }, (_, index) => ({ row: row(`Plan ${index}`, { produces: ["tokens"], priceUsd: 1, score: 1 }), reason: index % 2 ? "wrong-plan" : "power-level" }));
  const profile = buildPreferenceProfile({ declined, compass: { pace: "early", complexity: "straightforward" } });
  const adjustment = preferenceAdjustment(row("Token Bomb", { produces: ["tokens"], priceUsd: 900, score: 99, cmc: 8, oracleText: "x".repeat(400) }), profile);
  assert.equal(adjustment.delta, PREFERENCE_LIMITS.maxPenalty);
});

test("suggestCardForCategory re-ranks with the learned profile and leaves ordering alone without one", () => {
  const pricey = row("Expensive Rock", { priceUsd: 7, score: 30 });
  const cheap = row("Cheap Rock", { priceUsd: 0.2, score: 24 });
  const pool = [pricey, cheap];
  const base = suggestCardForCategory({ category: "ramp", pool, intent: {}, partialRows: [] });
  assert.equal(base.offer.name, "Expensive Rock");
  const profile = buildPreferenceProfile({ declined: [{ row: row("Fancy Rock", { priceUsd: 6 }), reason: "budget" }] });
  const learned = suggestCardForCategory({ category: "ramp", pool, intent: {}, partialRows: [], declinedNames: ["Fancy Rock"], options: { preferenceProfile: profile } });
  assert.equal(learned.offer.name, "Cheap Rock");
  assert.ok(learned.adjustment);
});

test("only the steps after the current one are reordered, toward open ledger gaps", () => {
  const ledger = [
    { category: "ramp", actual: 10, target: { min: 10, max: 12 }, status: "in-range" },
    { category: "draw", actual: 9, target: { min: 10, max: 12 }, status: "under" },
    { category: "interaction", actual: 0, target: { min: 8, max: 10 }, status: "under" },
  ];
  const order = orderRemainingCategories(CATEGORIES, 1, { ledger });
  assert.deepEqual(order.slice(0, 2), ["ramp", "draw"]);
  assert.equal(order[2], "interaction");
  assert.deepEqual([...order].sort(), [...CATEGORIES].sort());
  // No signal at all keeps the original sequence.
  assert.deepEqual(orderRemainingCategories(CATEGORIES, 0, {}), CATEGORIES);
});

test("compass answers pull matching steps earlier as soon as they're given", () => {
  const profile = buildPreferenceProfile({ compass: { interaction: "reactive" } });
  const order = orderRemainingCategories(CATEGORIES, 0, { profile });
  assert.equal(order[1], "interaction");
});

test("explainOffer names the role, what it works with among the picks, and the trade-off", () => {
  const offer = row("Smothering Tithe", { produces: ["treasure"], priceUsd: 20 });
  const explanation = explainOffer({
    offer,
    category: "ramp",
    acceptedRows: [row("Goldspan Dragon", { rewards: ["treasure"] }), row("Counterspell", { roles: ["interaction"] })],
    adjustment: { delta: 3, notes: ["builds on cards you've already picked"] },
  });
  assert.equal(explanation.role, "Ramp");
  assert.deepEqual([...explanation.worksWith], ["Goldspan Dragon"]);
  assert.match(explanation.tradeOff, /\$20\.00/);
  assert.deepEqual([...explanation.learned], ["builds on cards you've already picked"]);
  assert.equal(explainOffer({ offer: null }), null);
});

test("a pasted partial list becomes guided seed picks without commanders, basics, or side sections", () => {
  const names = guidedSeedNames([
    "Commander",
    "1 Atraxa, Praetors' Voice",
    "Deck",
    "1 Sol Ring (C21) 263",
    "1x Arcane Signet",
    "12 Forest",
    "1 Atraxa, Praetors' Voice",
    "Swords to Plowshares",
    "1 sol ring",
    "",
    "Sideboard",
    "1 Mana Crypt",
  ].join("\n"), ["Atraxa, Praetors' Voice"]);
  assert.deepEqual(names, ["Sol Ring", "Arcane Signet", "Swords to Plowshares"]);
});
