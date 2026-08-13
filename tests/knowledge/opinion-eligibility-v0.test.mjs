import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExactRevisionOpinion,
  evaluateRevisionOpinionEligibility,
  resolveExactRevision,
} from "../../app/knowledge/opinion-eligibility.mjs";

function bench({ commander = "Atraxa, Praetors' Voice", deckText = "1 Atraxa, Praetors' Voice\n1 Doubling Season\n1 Sol Ring", commissionNote = "A true Superfriends deck where Doubling Season is a star" } = {}) {
  return { schemaVersion: 1, families: [{
    id: "family-owner", game: "mtg", format: "Commander", name: "My Atraxa",
    commander: { name: commander }, commissionNote, promotedFingerprint: "deck-exact",
    revisions: [{ id: "revision-one", fingerprint: "deck-exact", deckText, version: 1 }],
  }] };
}

describe("Opinion v0.4 exact-revision eligibility", () => {
  it("binds an eligible question to family + immutable revision fingerprint", () => {
    const eligibility = evaluateRevisionOpinionEligibility({ bench: bench(), familyId: "family-owner", fingerprint: "deck-exact" });
    assert.equal(eligibility.eligible, true);
    assert.equal(eligibility.revision.familyId, "family-owner");
    assert.equal(eligibility.revision.fingerprint, "deck-exact");
    assert.equal(eligibility.revision.subject, "Doubling Season");
    assert.equal(eligibility.writesToBrain, false);
    const built = buildExactRevisionOpinion(eligibility, { now: "2026-08-13T00:00:00.000Z" });
    assert.equal(built.opinion.context.deckRevision, "deck-exact");
    assert.equal(built.opinion.writesToBrain, false);
    assert.match(built.presentation.answer, /saved commission/i);
  });

  it("accepts legacy fingerprint identity when a revision UUID is absent", () => {
    const value = bench(); delete value.families[0].revisions[0].id;
    const exact = resolveExactRevision(value, { familyId: "family-owner", revisionId: "deck-exact" });
    assert.equal(exact.ok, true);
    assert.equal(exact.revisionId, "deck-exact");
  });

  it("fails closed for stale revision, missing subject, and different commander", () => {
    assert.equal(evaluateRevisionOpinionEligibility({ bench: bench(), familyId: "family-owner", revisionId: "stale" }).reason, "stale_or_missing_revision");
    assert.equal(evaluateRevisionOpinionEligibility({ bench: bench({ deckText: "1 Atraxa, Praetors' Voice\n1 Sol Ring" }), familyId: "family-owner", revisionId: "revision-one" }).reason, "subject_not_in_revision");
    assert.equal(evaluateRevisionOpinionEligibility({ bench: bench({ commander: "Krenko, Mob Boss" }), familyId: "family-owner", revisionId: "revision-one" }).reason, "no_registered_question");
  });

  it("does not infer a commission from card and commander names", () => {
    const eligibility = evaluateRevisionOpinionEligibility({ bench: bench({ commissionNote: "Make it strong and fast" }), familyId: "family-owner", revisionId: "revision-one" });
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.reason, "commission_not_eligible");
  });
});

