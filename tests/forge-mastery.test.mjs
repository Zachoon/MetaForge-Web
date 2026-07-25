import assert from "node:assert/strict";
import test from "node:test";
import { computeMastery } from "../app/forge-mastery.mjs";

const family = (overrides = {}) => ({
  id: "f1",
  name: "Test Deck",
  format: "Standard",
  strategy: "Balanced midrange",
  archived: false,
  revisions: [{ deckText: "60 Island", note: "original", createdAt: "2026-01-01", matches: [] }],
  ...overrides,
});

test("counts real matches across every revision, not just the latest", () => {
  const families = [
    family({
      revisions: [
        { deckText: "a", note: "", createdAt: "1", matches: [{ id: "1", result: "win" }] },
        { deckText: "b", note: "", createdAt: "2", matches: [{ id: "2", result: "loss" }, { id: "3", result: "win" }] },
      ],
    }),
  ];
  const mastery = computeMastery(families);
  assert.equal(mastery.wins, 2);
  assert.equal(mastery.losses, 1);
  assert.equal(mastery.totalMatches, 3);
});

test("counts one accepted experiment per revision beyond the first", () => {
  const families = [
    family({ revisions: [{ deckText: "a", note: "", createdAt: "1" }, { deckText: "b", note: "", createdAt: "2" }, { deckText: "c", note: "", createdAt: "3" }] }),
    family({ id: "f2", revisions: [{ deckText: "a", note: "", createdAt: "1" }] }),
  ];
  const mastery = computeMastery(families);
  assert.equal(mastery.experimentsAccepted, 2);
});

test("separates finished from in-progress Masterworks", () => {
  const families = [family({ id: "f1", archived: true }), family({ id: "f2", archived: false }), family({ id: "f3", archived: false })];
  const mastery = computeMastery(families);
  assert.equal(mastery.finished, 1);
  assert.equal(mastery.active, 2);
});

test("counts distinct formats and strategies, not raw deck count", () => {
  const families = [
    family({ id: "f1", format: "Standard", strategy: "Balanced midrange" }),
    family({ id: "f2", format: "Standard", strategy: "Aggressive pressure" }),
    family({ id: "f3", format: "Commander", strategy: "Balanced midrange" }),
  ];
  const mastery = computeMastery(families);
  assert.equal(mastery.distinctFormats, 2);
  assert.equal(mastery.distinctStrategies, 2);
});

test("never fabricates evidence for an empty archive", () => {
  const mastery = computeMastery([]);
  assert.deepEqual(mastery, {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    experimentsAccepted: 0,
    finished: 0,
    active: 0,
    distinctFormats: 0,
    distinctStrategies: 0,
  });
});
