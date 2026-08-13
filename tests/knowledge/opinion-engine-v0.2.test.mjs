import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStrategicHypothesis } from "../../app/knowledge/strategic-hypothesis.mjs";
import { buildPlayEvidenceForConcept } from "../../app/knowledge/concept-play-evidence.mjs";
import { buildTournamentEvidenceForConcept } from "../../app/knowledge/concept-tournament-evidence.mjs";
import { compileOpinionContext, synthesizeStrategicOpinion } from "../../app/knowledge/opinion-engine.mjs";
import {
  assembleOpinionClaims,
  claimsFromConceptPlayEvidence,
  claimsFromConceptTournamentEvidence,
  claimsFromStrategicHypothesis,
  claimsFromListDisagreement,
} from "../../app/knowledge/opinion-evidence-adapters.mjs";
import { createMemoryOpinionArchive } from "../../app/knowledge/opinion-archive.mjs";
import { buildJayDoublingSeasonOpinion } from "../../app/knowledge/fixtures/opinion-v0.mjs";

describe("Opinion Engine v0.2 — connected evidence and lineage", () => {
  it("adapts hypotheses while preserving falsifiers and Brain isolation", () => {
    const hypothesis = createStrategicHypothesis({
      id: "test-window",
      claim: "Protected commitment windows outperform exposed setup turns.",
      evidence: { tournament: "medium", notes: ["Observed in independent structures."] },
      retirementCriteria: ["Three independent event contradictions"],
    });
    const [claim] = claimsFromStrategicHypothesis(hypothesis, { formats: ["Commander"] });
    assert.equal(claim.source.kind, "live_tournament");
    assert.equal(claim.writesToBrain, false);
    assert.match(claim.falsifier, /Three independent/i);
  });

  it("connects play and tournament producers without collapsing their provenance", () => {
    const play = claimsFromConceptPlayEvidence(buildPlayEvidenceForConcept("commitment-timing"));
    const tournament = claimsFromConceptTournamentEvidence(buildTournamentEvidenceForConcept("commitment-timing"));
    assert.ok(play.length > 0);
    assert.ok(tournament.length > 0);
    assert.ok(play.every((claim) => claim.source.kind === "exact_revision_play"));
    assert.ok(tournament.every((claim) => ["live_tournament", "competitive_fixture_corpus"].includes(claim.source.kind)));
  });

  it("assembles heterogeneous evidence into one scoped opinion", () => {
    const context = compileOpinionContext({ question: "When should this deck commit?", subject: "commitment-timing" });
    const claims = assembleOpinionClaims({
      play: buildPlayEvidenceForConcept("commitment-timing"),
      tournament: buildTournamentEvidenceForConcept("commitment-timing"),
      scope: { subjects: ["commitment-timing"] },
    });
    const opinion = synthesizeStrategicOpinion({ context, claims });
    assert.ok(opinion.evidence.independentSources >= 2);
    assert.notEqual(opinion.verdict, "unresolved");
    assert.equal(opinion.writesToBrain, false);
  });

  it("stores immutable revisions and returns lineage in order", () => {
    const opinion = buildJayDoublingSeasonOpinion();
    const archive = createMemoryOpinionArchive();
    const first = archive.append(opinion, { actorKey: "founder", storedAt: "2026-08-13T00:00:00.000Z" });
    const duplicate = archive.append(opinion, { actorKey: "founder", storedAt: "2026-08-13T01:00:00.000Z" });
    assert.equal(first.written, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(archive.history(opinion.opinionId, { actorKey: "founder" }).length, 1);
    assert.equal(archive.latest(opinion.opinionId, { actorKey: "founder" }).record.verdict, "recommend");
    assert.equal(archive.writesToBrain, false);
  });

  it("treats Brain-vs-corpus disagreement as a question, never a winner", () => {
    const [claim] = claimsFromListDisagreement({ present: true, adapterVersion: "list-disagreement-v1", meanJaccard: 0.18, honesty: "Fixture corpus is not live truth." });
    assert.equal(claim.direction, "uncertain");
    assert.equal(claim.source.kind, "competitive_fixture_corpus");
    assert.match(claim.statement, /needs explanation/i);
    assert.equal(claim.writesToBrain, false);
  });
});
