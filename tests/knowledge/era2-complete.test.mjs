import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStrategicConceptLibrary } from "../../app/knowledge/strategic-concept.mjs";
import { summarizeConceptPlayCoverage } from "../../app/knowledge/concept-play-evidence.mjs";
import { summarizeConceptSimulationCoverage } from "../../app/knowledge/concept-simulation-evidence.mjs";
import { witnessSituationalLine } from "../../app/gameplay/simulation-witness.mjs";
import { SITUATIONAL_FIXTURES_V0 } from "../../app/gameplay/fixtures/situational-v0.mjs";
import { evaluateSituationalFixture } from "../../app/gameplay/situational-evaluation.mjs";
import { buildSessionConceptVoice } from "../../app/concept-stance-voice.mjs";

describe("Era 2 Complete", () => {
  it("marks Era 2 complete without Brain inheritance", () => {
    const library = buildStrategicConceptLibrary();
    assert.equal(library.era2Founding.complete, true);
    assert.match(library.era2Founding.label, /Era 2 Complete/i);
    assert.equal(library.brainInheritance, "none");
    assert.equal(library.writesToBrain, false);
    assert.ok(library.era2Founding.deferredToLaterEras.some((d) => /Brain inheritance/i.test(d)));
    assert.ok(library.era2Founding.deferredToLaterEras.some((d) => /Monte Carlo|rules engine/i.test(d)));
  });

  it("ships play-capture path — Information Asymmetry no longer play-blind", () => {
    const library = buildStrategicConceptLibrary();
    const play = summarizeConceptPlayCoverage();
    assert.ok(play.captureCount >= 6);
    assert.equal(library.summary.tournamentBands["information-asymmetry"], "none");
    assert.ok(["medium", "high"].includes(library.summary.playBands["information-asymmetry"]));
    assert.ok(library.byId["information-asymmetry"].evidence.playDetail.captureCount >= 3);
  });

  it("ships honest simulation witness on situational fixtures", () => {
    const fixture = SITUATIONAL_FIXTURES_V0.find((f) => f.id === "fixture-counter-terminal-on-stack");
    const evaluation = evaluateSituationalFixture(fixture);
    assert.ok(evaluation.simulationWitness?.ok);
    assert.equal(evaluation.simulationWitness.role, "witness_not_judge");
    assert.equal(evaluation.simulationWitness.verdict, "supports");
    assert.ok(evaluation.coachVoice.mustNotSay.some((line) => /Simulation proved/i.test(line)));
    assert.notEqual(evaluation.evidence.simulation, "none");
  });

  it("aggregates simulation bands per concept without claiming an engine", () => {
    const summary = summarizeConceptSimulationCoverage();
    for (const row of summary.friday.concepts) {
      assert.ok(row.sampleSize >= 2, row.conceptId);
      assert.ok(["none", "low", "medium", "high"].includes(row.simulation));
    }
    assert.match(summary.friday.note, /not Monte Carlo/i);
  });

  it("keeps concept stance voice as part of the completed era", () => {
    const voice = buildSessionConceptVoice({ fantasyLabel: "Superfriends", priorities: ["theme"] });
    assert.equal(voice.requestRecognition.includeConcepts, false);
    assert.ok(voice.philosophy?.paragraph);
  });

  it("witness refuses empty context", () => {
    const empty = witnessSituationalLine({});
    assert.equal(empty.ok, false);
    assert.equal(empty.status, "unavailable");
  });
});
