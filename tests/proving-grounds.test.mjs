import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildProvingGroundsBrief, interpretProvingGroundsResult } from "../app/proving-grounds.mjs";

test("Proving Grounds turns a piloting diagnosis into one bounded decision test", () => {
  const brief = buildProvingGroundsBrief({ coachingDiagnosis: { primary: {
    category: "piloting-decision",
    evidence: ["2 exact-revision reports captured a sequencing decision"],
    measurement: "Record the alternative line in two comparable games.",
  } } });
  assert.match(brief.question, /mulligan or sequencing/i);
  assert.match(brief.watchFor, /alternative line/i);
  assert.match(brief.boundary, /one clue, not a verdict/i);
});

test("Proving Grounds uses a real structural next test while evidence is sparse", () => {
  const brief = buildProvingGroundsBrief({
    coachingDiagnosis: { primary: { category: "collect-more-evidence" } },
    failureAnalysis: { nextTest: "Watch whether the draw engine stalls before turn five." },
  });
  assert.equal(brief.watchFor, "Watch whether the draw engine stalls before turn five.");
});

test("Proving Grounds result reads remain cautious", () => {
  assert.match(interpretProvingGroundsResult("observed").guidance, /once more/i);
  assert.match(interpretProvingGroundsResult("not-tested").headline, /did not test/i);
  assert.match(interpretProvingGroundsResult("unsure").guidance, /unchanged/i);
});

test("Proving Grounds preserves hypothesis identity and advances repeated evidence", () => {
  const diagnosis = { revision: 3, primary: {
    category: "construction-pressure",
    evidence: ["Repeated interaction pressure"],
    recommendation: "Run one bounded interaction change.",
    measurement: "Watch whether interaction arrives before the critical turn.",
  } };
  const initial = buildProvingGroundsBrief({ coachingDiagnosis: diagnosis });
  const matches = ["one", "two"].map((id) => ({
    id,
    revision: 3,
    fieldTest: { hypothesisId: initial.hypothesisId, source: initial.source, outcome: "observed" },
  }));
  const learned = buildProvingGroundsBrief({ coachingDiagnosis: diagnosis, matches });
  assert.equal(learned.hypothesisId, initial.hypothesisId);
  assert.equal(learned.status, "supported");
  assert.equal(learned.evidence.supporting, 2);
  assert.match(learned.nextAction, /bounded interaction change/i);
});

test("Proving Grounds ignores results from another hypothesis or revision", () => {
  const diagnosis = { revision: 3, primary: { category: "piloting-decision", measurement: "Test one alternative line." } };
  const brief = buildProvingGroundsBrief({ coachingDiagnosis: diagnosis, matches: [
    { revision: 2, fieldTest: { source: "piloting-decision", outcome: "observed" } },
    { revision: 3, fieldTest: { hypothesisId: "different", source: "piloting-decision", outcome: "observed" } },
  ] });
  assert.deepEqual(brief.evidence, { supporting: 0, contradicting: 0, uninformative: 0 });
});

test("Proving Grounds carries the player goal into the coaching plan", () => {
  const brief = buildProvingGroundsBrief({ coachingDiagnosis: {
    revision: 1,
    playerGoal: "Better interaction",
    primary: { category: "collect-more-evidence", evidence: [], measurement: "Watch one decisive turn." },
  } });
  assert.equal(brief.playerGoal, "Better interaction");
  assert.match(brief.why, /player goal: better interaction/i);
});

test("an active revision experiment preserves its original evidence target", () => {
  const brief = buildProvingGroundsBrief({ coachingDiagnosis: {
    revision: 4,
    activeIntervention: { targetCategory: "construction-pressure" },
    primary: { category: "revision-effect", measurement: "Watch the original pressure." },
  } });
  assert.equal(brief.diagnosisCategory, "revision-effect");
  assert.equal(brief.source, "construction-pressure");
});

test("Proving Grounds intelligence stays out of the client bundle", () => {
  const source = fs.readFileSync(new URL("../app/proving-grounds.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Doctor Doom|Vivi Ornitier|Yawgmoth|Ancient Copper Dragon/i);
});
