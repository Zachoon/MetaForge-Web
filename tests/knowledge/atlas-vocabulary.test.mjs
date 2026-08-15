import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
  seatNamedResourceImplementation,
} from "../../app/knowledge/atlas-vocabulary.mjs";

describe("Atlas Vocabulary Registry v0", () => {
  it("ships stable core terms with zero Capability admissions and no coverageScore", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.writesToBrain, false);
    assert.equal(registry.ageOfVocabulary.complete, true);
    assert.ok(registry.summary.coreTermCount >= 10);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.equal(registry.summary.coverageScoreExists, false);
    assert.equal(registry.observation001.capabilityLabelsAdmitted, 0);
    assert.equal(registry.brainInheritance, "none");
  });

  it("supports seat equivalence without shared-card ranking", () => {
    assert.ok(seatsImplementedBy("Lightning Greaves").includes("Commander Protection"));
    const holders = cardsImplementingSeat("Commander Protection");
    assert.ok(holders.includes("Flawless Maneuver"));
    assert.ok(holders.includes("Lightning Greaves"));
    assert.ok(holders.includes("Skrelv, Defector Mite"));
  });

  it("seats the closed named-resource vocabulary without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.namedResourceSeatCount, 8);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.namedResourceSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const clue = seatNamedResourceImplementation({ name: "Investigator", oracleText: "When this enters, investigate." });
    assert.deepEqual(clue[0].implementation.roles, ["producer"]);
    assert.equal(clue[0].seat.label, "Clue Engine Piece");

    const outlet = seatNamedResourceImplementation(
      { name: "Dispute", oracleText: "Sacrifice an artifact: Draw two cards." },
      { activeResources: ["clue"] },
    );
    assert.deepEqual(outlet[0].implementation.roles, ["generic_artifact_outlet"]);
    assert.equal(outlet[0].resource, "clue");

    const angel = seatNamedResourceImplementation({ name: "Angel Host", oracleText: "Create a 4/4 white Angel creature token with flying." });
    assert.deepEqual(angel, [], "generic creature tokens do not occupy a named-resource Atlas seat");
  });

  it("maps each shipped graph signal through Capability to Seat to Implementation", () => {
    const expected = [
      ["clue", "clues"],
      ["treasure", "treasure"],
      ["food", "food"],
      ["blood", "blood"],
      ["gold", "gold"],
      ["map", "maps"],
      ["junk", "junk"],
      ["powerstone", "powerstones"],
    ];
    for (const [resource, signal] of expected) {
      const [seating] = seatNamedResourceImplementation({
        name: `${resource} producer`,
        mechanics: { produces: [signal], rewards: [], signals: [signal] },
      });
      assert.equal(seating.resource, resource);
      assert.equal(seating.capability.id, `cap:${resource}_resource_engine`);
      assert.equal(seating.seat.id, `seat:${resource}_engine_piece`);
      assert.deepEqual(seating.implementation.roles, ["producer"]);
      assert.equal(seating.writesToBrain, false);
    }
  });
});
