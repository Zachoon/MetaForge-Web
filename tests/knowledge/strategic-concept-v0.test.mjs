import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFixtureTeachesConcept,
  buildStrategicConceptLibrary,
  createStrategicConcept,
} from "../../app/knowledge/strategic-concept.mjs";
import {
  summarizeConceptExpertCoverage,
  CONCEPT_EXPERT_OBSERVATIONS,
} from "../../app/knowledge/concept-expert-evidence.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Strategic Concept Library v0 — founding set", () => {
  it("does not mutate Brain and catalogs TCG-agnostic principles", () => {
    const source = readFileSync(join(root, "app/knowledge/strategic-concept.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /Commitment Timing/);
    assert.match(source, /Seat Pressure/);
    assert.match(source, /Plan Integrity/);
    assert.match(source, /Information Asymmetry/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells/);
  });

  it("ships the four-concept founding set", () => {
    const library = buildStrategicConceptLibrary();
    assert.equal(library.summary.conceptCount, 4);
    assert.deepEqual([...library.foundingSet], [
      "commitment-timing",
      "seat-pressure",
      "plan-integrity",
      "information-asymmetry",
    ]);
    assert.equal(library.byId["seat-pressure"].name, "Seat Pressure");
    assert.equal(library.byId["plan-integrity"].constructionImplications, "era1_may_cite_later_brain_still_none");
    assert.ok(["candidate", "emerging"].includes(library.byId["information-asymmetry"].status));
    assert.ok(library.summary.fixtureEvidenceCount >= 10);
    assert.equal(library.summary.expertBands["commitment-timing"], "high");
    assert.equal(library.summary.expertBands["seat-pressure"], "high");
    assert.equal(library.summary.expertBands["plan-integrity"], "high");
    assert.equal(library.summary.expertBands["information-asymmetry"], "high");
    assert.equal(library.summary.tournamentBands["plan-integrity"], "medium");
    assert.equal(library.summary.tournamentBands["commitment-timing"], "medium");
    assert.equal(library.summary.tournamentBands["information-asymmetry"], "none");
    assert.ok(["low", "medium"].includes(library.summary.tournamentBands["seat-pressure"]));
    assert.ok(library.era2Founding.complete);
    assert.ok(library.summary.emergingCount >= 2);
    assert.ok(library.evidenceRule.statement.includes("expert/tournament"));
  });

  it("attaches independent expert voices without live scrape theater", () => {
    const library = buildStrategicConceptLibrary();
    const commit = library.byId["commitment-timing"];
    assert.ok(commit.evidence.expertDetail.independentVoices >= 2);
    assert.ok(commit.evidence.expertDetail.observationCount >= 2);
    assert.match(commit.evidence.expertDetail.notes[0], /Academy fixtures/i);
    assert.equal(commit.writesToBrain, false);
  });

  it("enforces Era 2 fixture → concept rule on every fixture", () => {
    assert.equal(assertFixtureTeachesConcept({ id: "orphan" }).ok, false);
    assert.ok(SITUATIONAL_FIXTURES_V0.length >= 10);
    for (const fixture of SITUATIONAL_FIXTURES_V0) {
      assert.equal(assertFixtureTeachesConcept(fixture).ok, true, fixture.id);
      assert.ok(libraryHas(fixture.teaches.conceptId), fixture.id);
    }
  });

  it("Seat Pressure fixtures teach hierarchy not grievance", () => {
    const combo = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-pressure-combo-seat-not-grudge"),
    );
    assert.equal(combo.concept.name, "Seat Pressure");
    assert.equal(combo.teaches.implementation, "Threat Hierarchy");
    assert.ok(combo.pros.some((p) => /highest real threat|Seat Pressure/i.test(p)));

    const check = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-leave-table-check-intact"),
    );
    assert.equal(check.teaches.implementation, "Table Check Preservation");
    assert.ok(check.pros.some((p) => /constrains the favorite|table/i.test(p)));
  });

  it("Plan Integrity fixtures protect the line", () => {
    const chump = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-dont-chump-with-wincon"),
    );
    assert.equal(chump.concept.name, "Plan Integrity");
    assert.ok(chump.pros.some((p) => /primary line|plan/i.test(p)));

    const over = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-decline-greedy-overextend"),
    );
    assert.equal(over.teaches.implementation, "Overextension Discipline");
  });

  it("Information Asymmetry fixtures respect unknown then update on reveal", () => {
    const playAround = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-play-around-unknown-open-mana"),
    );
    assert.equal(playAround.concept.name, "Information Asymmetry");
    assert.ok(playAround.pros.some((p) => /hidden information|not treated as empty/i.test(p)));

    const convert = evaluateSituationalFixture(
      SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-convert-when-hand-known-empty"),
    );
    assert.equal(convert.teaches.implementation, "Known-Empty Conversion");
    assert.ok(convert.pros.some((p) => /collapsed|revealed/i.test(p)));
  });

  it("createStrategicConcept requires the research schema core fields", () => {
    assert.throws(() => createStrategicConcept({ id: "x" }));
    const concept = createStrategicConcept({
      id: "test-concept",
      name: "Test Concept",
      description: "A disposable test principle.",
    });
    assert.equal(concept.kind, "StrategicConcept");
    assert.equal(concept.writesToBrain, false);
  });

  it("concept expert coverage spans all four founding concepts", () => {
    const summary = summarizeConceptExpertCoverage();
    assert.equal(summary.observationCount, CONCEPT_EXPERT_OBSERVATIONS.length);
    assert.ok(summary.observationCount >= 12);
    for (const row of summary.friday.concepts) {
      assert.ok(row.independentVoices >= 3, row.conceptId);
      assert.equal(row.experts, "high");
    }
  });
});

function libraryHas(id) {
  return Boolean(buildStrategicConceptLibrary().byId[id]);
}
