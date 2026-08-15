import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainCardAsMentor, explainPairAsMentor, buildMentorShadowReport } from "../../app/knowledge/mentor-shadow.mjs";

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

  it("names rummage as a hand filter, not net draw", () => {
    const explanation = explainCardAsMentor({
      cardName: "Faithless Looting",
      oracleText: "Draw two cards, then discard two cards.",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.selectionSeating[0].kind, "rummage");
    assert.match(explanation.paragraph, /Rummage Filter/);
    assert.match(explanation.paragraph, /not net draw/);
  });

  it("names scry as library selection, not mill", () => {
    const explanation = explainCardAsMentor({
      cardName: "Preordain",
      oracleText: "Scry 2, then draw a card.",
    });
    assert.equal(explanation.selectionSeating.some((row) => row.kind === "scry"), true);
    assert.match(explanation.paragraph, /Scry Filter/);
    assert.match(explanation.paragraph, /not mill/);
  });

  it("names mill as a graveyard dump, not surveil", () => {
    const explanation = explainCardAsMentor({
      cardName: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.graveyardSeating[0].kind, "mill");
    assert.match(explanation.paragraph, /Mill Dump/);
    assert.match(explanation.paragraph, /not surveil/);
    assert.doesNotMatch(explanation.paragraph, /Surveil Filter/);
    assert.doesNotMatch(explanation.paragraph, /Dredge Recursion/);
  });

  it("names dredge as graveyard recursion, not a mill dump", () => {
    const explanation = explainCardAsMentor({
      cardName: "Golgari Grave-Troll",
      oracleText: "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)",
    });
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.graveyardSeating.length, 1);
    assert.equal(explanation.graveyardSeating[0].kind, "dredge");
    assert.match(explanation.paragraph, /Dredge Recursion/);
    assert.match(explanation.paragraph, /not mill/);
    assert.doesNotMatch(explanation.paragraph, /Mill Dump/);
    assert.doesNotMatch(explanation.paragraph, /Surveil Filter/);
    assert.doesNotMatch(explanation.paragraph, /Net Draw/);
  });

  it("names a reset pair as a closed loop, not a verified infinite", () => {
    const explanation = explainPairAsMentor({
      left: { name: "Basalt Monolith", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact." },
      right: { name: "Voltaic Key", oracleText: "{1}, {T}: Untap target artifact." },
    });
    assert.equal(explanation.ok, true);
    assert.equal(explanation.writesToBrain, false);
    assert.equal(explanation.loopSeating[0].kind, "closed_loop");
    assert.match(explanation.paragraph, /Reset Closed Loop/);
    assert.match(explanation.paragraph, /Artifact Untap Reset/);
    assert.match(explanation.paragraph, /Not a verified infinite/);
    assert.doesNotMatch(explanation.paragraph, /this combo wins/i);
  });

  it("names a graph engine pair without claiming it goes infinite", () => {
    const explanation = explainPairAsMentor({
      left: { name: "Token Herald" },
      right: { name: "Card Herald" },
      loopKind: "engine",
    });
    assert.equal(explanation.loopSeating[0].kind, "engine");
    assert.match(explanation.paragraph, /Mutual Engine/);
    assert.match(explanation.paragraph, /not a verified infinite/);
  });
});
