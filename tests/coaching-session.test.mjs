import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
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

test("repeated construction feedback is translated into plain language", () => {
  const session = buildCoachingSession({
    coachingDiagnosis: { primary: { category: "construction-pressure", focus: "lower curve / faster deployment", occurrences: 2, evidence: [] } },
    provingGrounds,
  });
  assert.equal(session.diagnosis, "The deck may take too long to get started");
  assert.equal(session.confidence, "SEEN IN 2 GAMES");
  assert.equal(session.cta, "Start this one-question test");
});

test("the coaching return path is a three-tap check-in and accepts a server-validated generation", () => {
  const era = fs.readFileSync(new URL("../app/proving-grounds-era.tsx", import.meta.url), "utf8");
  // fieldTestResult's fallback moved to forge-session-context.tsx during the
  // page.tsx decomposition (Phase 4 Stage 2); the deckIntegrity JSX check
  // moved to the workbench chamber's own component during Stage 4.
  const forgeSessionContext = fs.readFileSync(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");
  const workbenchChamber = fs.readFileSync(new URL("../app/components/forge/workbench-chamber.tsx", import.meta.url), "utf8");
  assert.match(workbenchChamber, /deckIntegrity\.passed \|\| Boolean\(nativeMasterworkContext\?\.generationId\)/);
  assert.match(forgeSessionContext, /fieldTestResult \|\| "not-recorded"/);
  assert.match(era, /Three taps\. Keep the memory fresh/);
  assert.match(era, /Did the issue appear\?/);
  assert.match(era, /How did the deck handle that moment\?/);
  assert.match(era, /How did the deck feel overall\?/);
  assert.doesNotMatch(workbenchChamber, /One tap\. No match report or essay required/);
});
