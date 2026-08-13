import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compileOpinionContext,
  createOpinionClaim,
  presentOpinionForMentor,
  reviseStrategicOpinion,
  synthesizeStrategicOpinion,
} from "../../app/knowledge/opinion-engine.mjs";
import { buildJayDoublingSeasonOpinion } from "../../app/knowledge/fixtures/opinion-v0.mjs";

describe("Opinion Engine v0", () => {
  it("forms a scoped, two-sided opinion for Jay's Doubling Season commission", () => {
    const opinion = buildJayDoublingSeasonOpinion();
    assert.equal(opinion.kind, "StrategicOpinionRecord");
    assert.equal(opinion.verdict, "recommend");
    assert.equal(opinion.writesToBrain, false);
    assert.equal(opinion.brainInheritance, "none");
    assert.match(opinion.answer, /Keep Doubling Season/i);
    assert.match(opinion.strongestCounterargument, /five-mana enchantment/i);
    assert.equal(opinion.evidence.contradictionPresent, true);
    assert.ok(opinion.whatWouldChangeMyMind.length >= 2);
    assert.equal(opinion.proposedTest.minimumComparableObservations, 5);
  });

  it("does not apply a commission-anchor claim outside that commission", () => {
    const context = compileOpinionContext({
      question: "Should this Atraxa list play Doubling Season?",
      commanderName: "Atraxa, Praetors' Voice",
      subject: "Doubling Season",
      commission: { priorities: ["maximum speed"] },
    });
    const anchored = createOpinionClaim({
      id: "anchor-only",
      statement: "Keep the named centerpiece.",
      direction: "support",
      strength: 1,
      source: { kind: "commission_contract" },
      scope: { subjects: ["Doubling Season"], requiresCommissionAnchor: true },
    });
    const opinion = synthesizeStrategicOpinion({ context, claims: [anchored] });
    assert.equal(opinion.verdict, "unresolved");
    assert.equal(opinion.evidence.claims.length, 0);
  });

  it("discounts duplicated provenance rather than counting copied claims as independent", () => {
    const context = compileOpinionContext({ question: "Is this card correct?", subject: "Example" });
    const claims = ["a", "b", "c"].map((id) => createOpinionClaim({
      id,
      statement: `Copied support ${id}`,
      direction: "support",
      strength: 1,
      source: { kind: "independent_expert", independenceKey: "same-article" },
    }));
    const opinion = synthesizeStrategicOpinion({ context, claims });
    assert.equal(opinion.evidence.independentSources, 1);
    assert.deepEqual(opinion.evidence.claims.map((claim) => claim.independenceDiscount), [1, 0.5, 0.333]);
    assert.notEqual(opinion.confidence.level, "high");
  });

  it("caps confidence when fixture evidence supplies most of the weight", () => {
    const context = compileOpinionContext({ question: "Does the corpus prove this?", subject: "Example" });
    const fixture = createOpinionClaim({
      id: "fixture",
      statement: "The tournament-shaped fixture supports it.",
      direction: "support",
      strength: 1,
      source: { kind: "competitive_fixture_corpus", fixture: true, independenceKey: "fixture" },
    });
    const opinion = synthesizeStrategicOpinion({ context, claims: [fixture] });
    assert.ok(opinion.confidence.score <= 0.44);
    assert.equal(opinion.evidence.fixtureEvidenceShare, 1);
    assert.equal(opinion.writesToBrain, false);
  });

  it("versions evidence updates and tells the Mentor when its verdict changes", () => {
    const original = buildJayDoublingSeasonOpinion();
    const changedCommission = createOpinionClaim({
      id: "jay-contract-anchor-doubling-season",
      statement: "Jay revised the commission toward maximum speed and no longer wants Doubling Season as a centerpiece.",
      direction: "oppose",
      strength: 1,
      source: { kind: "commission_contract", label: "Revised Jay commission", independenceKey: "jay-commission-revision-2" },
      scope: { formats: ["Commander"], commanders: ["Atraxa, Praetors' Voice"], subjects: ["Doubling Season"] },
      reasoning: "The controlling player contract changed.",
      falsifier: "Jay restores Doubling Season as a named centerpiece.",
    });
    const revised = reviseStrategicOpinion(original, {
      claims: [changedCommission],
      now: "2026-08-14T00:00:00.000Z",
    });
    assert.equal(revised.revision, 2);
    assert.equal(revised.supersedesRevision, 1);
    assert.match(revised.revisionNote, /Verdict changed/i);
    const presentation = presentOpinionForMentor(revised);
    assert.equal(presentation.revision, 2);
    assert.equal(presentation.writesToBrain, false);
    assert.ok(presentation.strongestCounterargument);
  });
});

