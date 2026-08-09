import assert from "node:assert/strict";
import test from "node:test";
import { buildCoachingSession } from "../app/coaching-session.mjs";

const provingGrounds = { hypothesisId: "coach-one", question: "Does it repeat?", watchFor: "The critical turn", nextAction: "Run the question", evidence: { supporting: 1, contradicting: 0, uninformative: 0 }, boundary: "One clue is not a verdict." };

test("construction pressure can surface one confident card-exact experiment", () => {
  const session = buildCoachingSession({ coachingDiagnosis: { playerGoal: "Better interaction", primary: { category: "construction-pressure", label: "Construction pressure", confidence: "repeated", evidence: ["two reports"] } }, provingGrounds, experimentTablets: { tablets: [{ id: "one", type: "experiment", confident: true, change: { cut: "Slow Card", add: "Fast Answer" }, testContract: "Play five games", expectedBenefit: "Earlier interaction", tradeoff: "Less top-end" }] } });
  assert.equal(session.mode, "experiment");
  assert.deepEqual(session.change, { cut: "Slow Card", add: "Fast Answer", tabletId: "one" });
});

test("piloting diagnosis protects the deck even when a swap exists", () => {
  const session = buildCoachingSession({ coachingDiagnosis: { primary: { category: "piloting-decision", label: "Decision pressure", evidence: [] } }, provingGrounds, experimentTablets: { tablets: [{ id: "one", type: "experiment", confident: true, change: { cut: "A", add: "B" } }] } });
  assert.equal(session.mode, "practice");
  assert.equal(session.change, null);
});

test("an active field test always outranks a new recommendation", () => {
  const session = buildCoachingSession({ coachingDiagnosis: { primary: { category: "construction-pressure", evidence: [] } }, provingGrounds, activeFieldTest: { question: "Watch the current test" }, experimentTablets: { tablets: [{ id: "one", type: "experiment", confident: true, change: { cut: "A", add: "B" } }] } });
  assert.equal(session.mode, "observe");
  assert.equal(session.action, "Watch the current test");
});

test("speculative experiments never become the primary coaching action", () => {
  const session = buildCoachingSession({ coachingDiagnosis: { primary: { category: "construction-pressure", evidence: [] } }, provingGrounds, experimentTablets: { tablets: [{ id: "one", type: "experiment", confident: false, change: { cut: "A", add: "B" } }] } });
  assert.equal(session.change, null);
});
