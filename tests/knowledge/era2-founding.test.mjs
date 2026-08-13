import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStrategicConceptLibrary, assertFixtureTeachesConcept } from "../../app/knowledge/strategic-concept.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";
import { evaluateStrategicDecision } from "../../app/strategic-evaluation.mjs";
import { summarizeConceptExpertCoverage } from "../../app/knowledge/concept-expert-evidence.mjs";

describe("Era 2 Founding Complete", () => {
  it("marks founding complete with deferred non-goals", () => {
    const library = buildStrategicConceptLibrary();
    assert.equal(library.era2Founding.complete, true);
    assert.equal(library.brainInheritance, "none");
    assert.equal(library.writesToBrain, false);
    assert.ok(library.era2Founding.deferredToLaterEras.length >= 3);
    assert.equal(library.summary.conceptCount, 4);
  });

  it("has no orphan fixtures and includes nuance flips", () => {
    assert.equal(SITUATIONAL_FIXTURES_V0.length, 14);
    for (const fixture of SITUATIONAL_FIXTURES_V0) {
      assert.equal(assertFixtureTeachesConcept(fixture).ok, true, fixture.id);
      assert.equal(evaluateSituationalFixture(fixture).ok, true, fixture.id);
    }
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-must-counter-tutor-no-later-window"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-grudge-seat-is-the-clock"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-must-chump-with-wincon-lethal"));
    assert.ok(SITUATIONAL_FIXTURES_V0.some((f) => f.id === "fixture-convert-into-unknown-race-ends"));
  });

  it("earns expert high (≥3 voices) on founding concepts", () => {
    const summary = summarizeConceptExpertCoverage();
    for (const row of summary.friday.concepts) {
      assert.ok(row.independentVoices >= 3, row.conceptId);
      assert.equal(row.experts, "high");
    }
  });

  it("elevates earned concepts to emerging (not strongly_supported)", () => {
    const library = buildStrategicConceptLibrary();
    assert.ok(library.summary.emergingCount >= 2);
    for (const c of library.concepts) {
      assert.notEqual(c.status, "strongly_supported");
      assert.ok(["candidate", "emerging"].includes(c.status));
    }
    assert.equal(library.byId["commitment-timing"].status, "emerging");
    assert.equal(library.byId["plan-integrity"].status, "emerging");
  });

  it("Era 1 cites Plan Integrity and Commitment Timing on plan-protecting cut/add", () => {
    const evaluation = evaluateStrategicDecision({
      decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song" },
      commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
      selected: {
        slotJustificationLedger: {
          byName: { "smothering tithe": { flags: { rawPowerDominant: true } } },
        },
      },
    });
    const names = evaluation.conceptsCited.map((c) => c.name);
    assert.ok(names.includes("Plan Integrity"));
    assert.ok(names.includes("Commitment Timing"));
  });
});
