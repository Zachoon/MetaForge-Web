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

test("Proving Grounds intelligence stays out of the client bundle", () => {
  const source = fs.readFileSync(new URL("../app/proving-grounds.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Doctor Doom|Vivi Ornitier|Yawgmoth|Ancient Copper Dragon/i);
});
