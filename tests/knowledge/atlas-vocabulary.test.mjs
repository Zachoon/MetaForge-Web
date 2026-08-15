import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  seatsImplementedBy,
  cardsImplementingSeat,
  seatNamedResourceImplementation,
  seatSelectionImplementation,
  seatGraveyardImplementation,
  seatLoopImplementation,
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

  it("seats selection kinds from graph labels without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.selectionSeatCount, 6);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.selectionSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const loot = seatSelectionImplementation({
      name: "Looter",
      oracleText: "Whenever this deals combat damage to a player, discard a card, then draw a card.",
    });
    assert.equal(loot.length, 1);
    assert.equal(loot[0].kind, "rummage");
    assert.equal(loot[0].seat.label, "Rummage Filter");
    assert.equal(loot[0].contrast, "not net draw");
    assert.equal(loot[0].writesToBrain, false);

    const mill = seatSelectionImplementation({
      name: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.deepEqual(mill, [], "mill is not a selection seat");

    const seer = seatSelectionImplementation({
      name: "Seer",
      oracleText: "When this enters, scry 2.",
    });
    assert.equal(seer[0].kind, "scry");
    assert.equal(seer[0].contrast, "not mill");

    const fromGraph = seatSelectionImplementation({
      name: "Pre-classified",
      mechanics: { selectionKinds: ["impulse"], produces: [], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].kind, "impulse");
    assert.equal(fromGraph[0].contrast, "not a Junk token");
  });

  it("seats mill as a graveyard dump, distinct from surveil, without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.graveyardSeatCount, 1);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.graveyardSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const mill = seatGraveyardImplementation({
      name: "Tome Scour",
      oracleText: "Target player mills two cards.",
    });
    assert.equal(mill.length, 1);
    assert.equal(mill[0].kind, "mill");
    assert.equal(mill[0].seat.label, "Mill Dump");
    assert.equal(mill[0].contrast, "not surveil");
    assert.equal(mill[0].writesToBrain, false);

    const surveil = seatGraveyardImplementation({
      name: "Street Wraith",
      oracleText: "When this enters, surveil 1.",
    });
    assert.deepEqual(surveil, [], "surveil is selection, not a mill dump");

    const fromGraph = seatGraveyardImplementation({
      name: "Pre-classified",
      mechanics: { graveyardKinds: ["mill"], produces: ["graveyard"], rewards: [], signals: [] },
    });
    assert.equal(fromGraph[0].kind, "mill");
    assert.equal(fromGraph[0].writesToBrain, false);
  });

  it("seats loop kinds and reset shapes from graph labels without admitting Capabilities", () => {
    const registry = buildAtlasVocabularyRegistry();
    assert.equal(registry.summary.loopSeatCount, 3);
    assert.equal(registry.summary.resetShapeSeatCount, 4);
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
    assert.ok(registry.loopSeats.every((row) => row.writesToBrain === false && row.capability.atlasAdmitted === false));

    const engine = seatLoopImplementation({
      left: { name: "Token Herald", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." },
      right: { name: "Card Herald", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." },
      loopKind: "engine",
    });
    assert.equal(engine[0].kind, "engine");
    assert.equal(engine[0].seat.label, "Mutual Engine");
    assert.equal(engine[0].contrast, "not a verified infinite");
    assert.equal(engine[0].writesToBrain, false);

    const unlabeled = seatLoopImplementation({
      left: { name: "Vanilla A", oracleText: "Vigilance." },
      right: { name: "Vanilla B", oracleText: "Reach." },
    });
    assert.deepEqual(unlabeled, [], "unlabeled pairs stay unknown rather than defaulting to engine");

    const reset = seatLoopImplementation({
      left: { name: "Basalt Monolith", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact." },
      right: { name: "Voltaic Key", oracleText: "{1}, {T}: Untap target artifact." },
    });
    assert.equal(reset[0].kind, "closed_loop");
    assert.equal(reset[0].shape, "artifact_untap");
    assert.equal(reset[0].resetSeat.label, "Artifact Untap Reset");
    assert.equal(reset[0].contrast, "investigate, not a verified infinite");

    const fromGraph = seatLoopImplementation({
      cards: ["Isochron Scepter", "Dramatic Reversal"],
      loopKind: "closed_loop",
      shape: "imprint_untap_all",
    });
    assert.equal(fromGraph[0].resetSeat.label, "Imprint Untap Reset");
    assert.deepEqual(fromGraph[0].implementation.roles, ["reset_shape"]);

    const win = seatLoopImplementation({
      leftOracle: "Whenever an opponent dies, create a Treasure token. At the beginning of your upkeep, if you control ten or more Treasures, you win the game.",
      rightOracle: "Whenever you attack, create a Treasure token.",
      cards: ["Revel in Riches", "Dockside Extortionist"],
    });
    assert.equal(win[0].kind, "conditional_win");
    assert.equal(win[0].seat.label, "Conditional Board Win");
    assert.equal(win[0].contrast, "a board-state win, not a loop");
  });
});
