import assert from "node:assert/strict";
import test from "node:test";
import { buildPostGameCoach,POST_GAME_READS } from "../app/post-game-coach.mjs";

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

test("surfaces one bounded decision moment when Companion observed it",()=>{
  const insight=buildPostGameCoach({id:"decision",playerDecisions:[{kind:"attack-window",turn:4,tookPressureLine:true,actors:2}]},"My plan worked",[]);
  assert.equal(insight.decisionMoment.title,"You chose pressure.");
  assert.match(insight.observedFact,/not proof/);
});
test("asks winners and losers different useful reflection questions",()=>{assert.notDeepEqual(POST_GAME_READS.win,POST_GAME_READS.loss);assert.ok(POST_GAME_READS.win.includes("My plan worked"));assert.ok(!POST_GAME_READS.loss.includes("My plan worked"));assert.ok(POST_GAME_READS.loss.includes("My plan never started"));for(const read of [...POST_GAME_READS.win,...POST_GAME_READS.loss])assert.ok(buildPostGameCoach({id:"x"},read,[]).headline)});
