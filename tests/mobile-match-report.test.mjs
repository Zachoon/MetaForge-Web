import assert from "node:assert/strict";
import test from "node:test";
import { createMobileMatchReport } from "../app/mobile-match-report.mjs";

test("mobile evidence requires an exact revision and remains self-reported", () => {
  assert.throws(() => createMobileMatchReport({ result: "win" }), /exact active deck revision/i);
  const record = createMobileMatchReport({ result: "win", deckFingerprint: "a".repeat(24), opponentStrategy: "Aggro", playDraw: "draw", mulligans: 1 }, { id: "mobile-1", now: "2026-07-15T00:00:00Z" });
  assert.equal(record.source, "self-reported-mobile");
  assert.equal(record.game, "mtg");
  assert.equal(record.evidenceConfidence, "self-reported");
  assert.equal(record.experimentVariant, "proposed");
  assert.deepEqual(record.playDraw, ["draw"]);
});

test("mobile fields are bounded and unknown archetypes are not invented", () => {
  const record = createMobileMatchReport({ result: "loss", deckFingerprint: "b".repeat(24), opponentStrategy: "Made Up", mulligans: 99 }, { id: "mobile-2" });
  assert.equal(record.opponentStrategy, "Unknown");
  assert.equal(record.mulligans, 9);
  assert.equal(record.gamesLost, 1);
});
