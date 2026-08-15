import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainCardAsMentor, buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

describe("Mentor Shadow v0", () => {
  it("explains seats without scores or Brain writes", () => {
    const explanation = explainCardAsMentor({
      cardName: "Teferi's Protection",
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.ok(explanation.seats.includes("Commander Protection"));
    assert.doesNotMatch(explanation.paragraph, /score of|Protection score/i);
    assert.ok(explanation.mustNotSay.some((line) => /score/i.test(line)));
  });

  it("builds a shadow report for multiple cards", () => {
    const report = buildMentorShadowReport({
      cardNames: ["Lightning Greaves", "Force of Will", "Doubling Season"],
      commanderName: "Atraxa, Praetors' Voice",
      fantasyLabel: "Superfriends",
      commissionMismatch: true,
      limit: 3,
    });
    assert.equal(report.status, "first_embodiment");
    assert.equal(report.explanations.length, 3);
    assert.equal(report.brainInheritance, "none");
  });

  it("names a Clue engine without calling it a generic go-wide tokens deck", () => {
    const explanation = explainCardAsMentor({
      cardName: "Investigate Scout",
      oracleText: "When this enters, investigate.",
      commanderName: "Clue Oligarch",
      activeResources: ["clue"],
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.resourceSeating[0].resource, "clue");
    assert.match(explanation.paragraph, /Clue Engine Piece/);
    assert.match(explanation.paragraph, /not evidence of a generic go-wide tokens plan/);
  });
});
