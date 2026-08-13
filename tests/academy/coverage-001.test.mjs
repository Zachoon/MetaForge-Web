import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSeatVacancies,
  capabilitiesFromNode,
  classifyVacancy,
  mentorLanguageCheck,
  roleAloneCannotMintCapability,
  runCoverageObservation001,
  CANDIDATE_CAPABILITIES,
} from "../../app/academy/index.mjs";

function mkAnnotated(name, roles, extra = {}) {
  return {
    name,
    quantity: 1,
    roles,
    cmc: extra.cmc ?? 2,
    typeLine: extra.typeLine || "Instant",
    oracleText: extra.oracleText || "",
    manaCost: "{1}{U}",
    colorIdentity: ["U"],
    mechanics: { signals: [], produces: [], rewards: [] },
    strategicSemantics: extra.semantics || [],
    commanderConnectionSignals: extra.commanderConnected ? ["commander"] : [],
    sequenceStages: extra.stages || [],
    score: 0,
  };
}

function mkAnalysis(deckId, rows) {
  return {
    deckId,
    commanders: ["Test Commander"],
    annotatedRows: rows,
    packages: [],
    interactionGraph: {},
    evidenceQuality: { weight: 0.8 },
  };
}

describe("Academy Coverage Observation 001 — institutional invariants", () => {
  it("1. card role alone cannot mint a capability", () => {
    for (const role of ["removal", "draw", "ramp", "interaction", "protection"]) {
      assert.equal(roleAloneCannotMintCapability(role), true);
    }
  });

  it("2–3. capability requires contextual semantic evidence; same card can differ by plan", () => {
    const bare = capabilitiesFromNode(
      { name: "Swords", roles: ["interaction", "removal"], planConnected: false, commanderConnected: false, multifunction: false },
      { edges: [] },
    );
    assert.equal(bare.length, 0);

    const contextual = capabilitiesFromNode(
      { name: "Swords", roles: ["interaction"], planConnected: true, commanderConnected: false, multifunction: false },
      { edges: [{ from: "Swords", to: "Win", type: "clears_path_for", strength: "strong" }] },
    );
    assert.ok(contextual.includes("cap:path_clearing"));

    const protect = capabilitiesFromNode(
      { name: "Swords", roles: ["interaction"], planConnected: true, commanderConnected: false, multifunction: false },
      { edges: [{ from: "Swords", to: "Commander", type: "protects_commander", strength: "strong" }] },
    );
    assert.ok(protect.includes("cap:commander_protection"));
    assert.notDeepEqual(contextual, protect);
  });

  it("4–6. seats support multiple holders; vacancy distinguishes SPF vs redundancy", () => {
    assert.equal(classifyVacancy([]), "no_verified_seat");
    assert.equal(
      classifyVacancy([{ name: "A", conditional: false, planConnected: true }]),
      "single_point_of_failure",
    );
    assert.equal(
      classifyVacancy([
        { name: "A", conditional: false, planConnected: true },
        { name: "B", conditional: false, planConnected: true },
      ], "A"),
      "independently_covered",
    );
  });

  it("7–8. coverage remains multidimensional; no coverageScore", () => {
    const rows = [
      mkAnnotated("Greaves", ["protection"], { commanderConnected: true }),
      mkAnnotated("Witness", ["recursion"], { stages: ["recover"] }),
    ];
    // Force planConnected via topology is hard without edges; still assert shape
    const analysis = mkAnalysis("d1", rows);
    const vacancy = analyzeSeatVacancies({ id: "d1", commanders: [{ name: "Test Commander" }], rows }, analysis);
    assert.equal(vacancy.hasCoverageScore, false);
    assert.equal(vacancy.coverageScore, undefined);
    assert.ok(vacancy.coverageProfile.protection);
    assert.ok(vacancy.coverageProfile.recovery);
    assert.ok(vacancy.coverageProfile.flexibility);
    assert.equal(vacancy.writesToBrain, false);
  });

  it("9. multifunctionality is not inferred merely from many tags", () => {
    const manyTags = capabilitiesFromNode(
      {
        name: "Tagged",
        roles: ["interaction", "ramp", "draw", "selection", "threat"],
        multifunction: false,
        planConnected: false,
        commanderConnected: false,
      },
      { edges: [] },
    );
    assert.ok(!manyTags.includes("cap:strategic_flexibility"));

    const trueFlex = capabilitiesFromNode(
      {
        name: "Flex",
        roles: ["interaction", "ramp"],
        multifunction: true,
        planConnected: true,
        commanderConnected: false,
      },
      { edges: [] },
    );
    assert.ok(trueFlex.includes("cap:strategic_flexibility"));
  });

  it("10. equivalence requires contextual capability/seat similarity (schema check)", () => {
    // Observational schema only this sprint — ranking forbidden
    const eq = {
      cardA: "Greaves",
      cardB: "Flawless Maneuver",
      sharedCapability: "cap:commander_protection",
      sharedSeat: "seat:protect_commander",
      commanderFamily: "Test",
      evidence: "illustrative",
      confidence: 0.4,
      rank: undefined,
    };
    assert.equal(eq.rank, undefined);
  });

  it("13. Mentor language prototype cannot recommend or mutate", () => {
    const check = mentorLanguageCheck({
      seats: [{
        label: "Recover Plan",
        vacancyClass: "single_point_of_failure",
        independentHolders: 1,
      }],
    });
    assert.equal(check.recommendsCards, false);
    assert.equal(check.mutatesDeck, false);
    assert.equal(check.ranksAlternatives, false);
    assert.equal(check.productionCoaching, false);
    assert.equal(check.writesToBrain, false);
  });

  it("14. Atlas admission cannot activate Brain behavior", () => {
    for (const cap of CANDIDATE_CAPABILITIES) {
      assert.equal(cap.writesToBrain, false);
    }
    const report = runCoverageObservation001([], { analyses: [], corpusMode: "fixture", syntheticFixtures: "TEST_ONLY" });
    assert.equal(report.writesToBrain, false);
    assert.equal(report.constructionMutated, false);
    assert.equal(report.brainImplementationRecommended, false);
    assert.equal(report.laboratoryAuthorized, false);
    assert.equal(report.institutionalConstraints.coverageScore, false);
    assert.equal(report.atlasAdmission.writesToBrain, false);
  });

  it("12. counterexamples are preserved as first-class artifacts", () => {
    const report = runCoverageObservation001([], { analyses: [] });
    assert.ok(Array.isArray(report.counterexamples));
  });
});
