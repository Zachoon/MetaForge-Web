import assert from "node:assert/strict";
import test from "node:test";
import { buildPostGameCoach } from "../app/post-game-coach.mjs";

test("treats one post-game read as a clue", () => {
  const pulse = buildPostGameCoach({ id:"1", deckFingerprint:"a" }, "My mana", []);
  assert.equal(pulse.urgency, "clue"); assert.match(pulse.pattern, /not a deck verdict/i);
});

test("promotes a repeated same-revision read into a pattern", () => {
  const history = [{ read:"My mana", deckFingerprint:"a" }, { read:"My mana", deckFingerprint:"a" }];
  const pulse = buildPostGameCoach({ id:"3", deckFingerprint:"a" }, "My mana", history);
  assert.equal(pulse.urgency, "pattern"); assert.equal(pulse.repeats, 3);
});

test("does not contaminate one deck revision with another", () => {
  const history = [{ read:"Their speed", deckFingerprint:"old" }, { read:"Their speed", deckFingerprint:"old" }];
  assert.equal(buildPostGameCoach({ id:"3", deckFingerprint:"new" }, "Their speed", history).urgency, "clue");
});

test("uses explicit turn telemetry without inventing missed land drops", () => {
  const pulse = buildPostGameCoach({ id:"1", turnTelemetry:{ landPlayTurns:[1,3], coverage:"explicit-events-only" } }, "My mana", []);
  assert.match(pulse.observedFact, /turns 1, 3/); assert.match(pulse.observedFact, /not enough to label/i);
});
