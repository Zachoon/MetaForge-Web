// =============================================================================
// Atlas Vocabulary Registry — drift protection
// =============================================================================
// Not new vocabulary. Guards the invariant Age of Vocabulary depends on:
// "Atlas terms stay stable across papers" (docs/AGE_OF_VOCABULARY.md success
// criterion #1) and "Capability admissions: 0" (Coverage Observation 001).
// A graph enum growing a new kind with no matching Atlas seat, or vice versa,
// is exactly the kind of silent drift this suite exists to catch.
// writesToBrain: false
// =============================================================================
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAtlasVocabularyRegistry,
  ATLAS_CAPABILITY_DRAFT,
  ATLAS_EQUIVALENCE_ILLUSTRATIVE,
  ATLAS_SELECTION_SEATS,
  ATLAS_GRAVEYARD_SEATS,
  ATLAS_SACRIFICE_SEATS,
  ATLAS_TRIGGER_SEATS,
  ATLAS_COUNTER_SEATS,
  ATLAS_LOOP_SEATS,
  ATLAS_RESET_SHAPE_SEATS,
} from "../../app/knowledge/atlas-vocabulary.mjs";
import {
  SELECTION_KINDS,
  GRAVEYARD_KINDS,
  SACRIFICE_KINDS,
  TRIGGER_KINDS,
  COUNTER_KINDS,
  LOOP_KINDS,
  RESET_SHAPES,
} from "../../app/forge-interaction-graph.mjs";

function assertSameSet(actual, expected, label) {
  const actualSet = [...new Set(actual)].sort();
  const expectedSet = [...new Set(expected)].sort();
  assert.deepEqual(actualSet, expectedSet, `${label}: ${JSON.stringify(actualSet)} vs ${JSON.stringify(expectedSet)}`);
}

describe("Atlas Vocabulary Registry — drift protection", () => {
  it("seats exactly the graph's selection kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_SELECTION_SEATS.map((row) => row.kind),
      Object.values(SELECTION_KINDS),
      "selection kinds",
    );
  });

  it("seats exactly the graph's graveyard kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_GRAVEYARD_SEATS.map((row) => row.kind),
      Object.values(GRAVEYARD_KINDS),
      "graveyard kinds",
    );
  });

  it("seats exactly the graph's sacrifice kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_SACRIFICE_SEATS.map((row) => row.kind),
      Object.values(SACRIFICE_KINDS),
      "sacrifice kinds",
    );
  });

  it("seats exactly the graph's trigger kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_TRIGGER_SEATS.map((row) => row.kind),
      Object.values(TRIGGER_KINDS),
      "trigger kinds",
    );
  });

  it("seats exactly the graph's counter kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_COUNTER_SEATS.map((row) => row.kind),
      Object.values(COUNTER_KINDS),
      "counter kinds",
    );
  });

  it("seats exactly the graph's loop kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_LOOP_SEATS.map((row) => row.kind),
      Object.values(LOOP_KINDS),
      "loop kinds",
    );
  });

  it("seats exactly the graph's reset/pay shapes, no more, no fewer", () => {
    assertSameSet(
      ATLAS_RESET_SHAPE_SEATS.map((row) => row.shape),
      Object.values(RESET_SHAPES),
      "reset shapes",
    );
  });

  it("never assigns the same seat id or capability id to two different seats", () => {
    const registry = buildAtlasVocabularyRegistry();
    const seatRows = [
      ...registry.namedResourceSeats,
      ...registry.selectionSeats,
      ...registry.graveyardSeats,
      ...registry.sacrificeSeats,
      ...registry.triggerSeats,
      ...registry.counterSeats,
      ...registry.loopSeats,
      ...registry.resetShapeSeats,
    ];
    const seatIds = seatRows.map((row) => row.seat.id);
    const capabilityIds = seatRows.filter((row) => row.capability).map((row) => row.capability.id);
    assert.equal(seatIds.length, new Set(seatIds).size, `duplicate seat id in ${JSON.stringify(seatIds)}`);
    assert.equal(capabilityIds.length, new Set(capabilityIds).size, `duplicate capability id in ${JSON.stringify(capabilityIds)}`);
  });

  it("never admits a Capability anywhere in the registry (Coverage Observation 001 stands)", () => {
    const registry = buildAtlasVocabularyRegistry();
    const allCapabilities = [
      ...registry.capabilityDraft,
      ...registry.namedResourceSeats.map((row) => row.capability),
      ...registry.selectionSeats.map((row) => row.capability),
      ...registry.graveyardSeats.map((row) => row.capability),
      ...registry.sacrificeSeats.map((row) => row.capability),
      ...registry.triggerSeats.map((row) => row.capability),
      ...registry.counterSeats.map((row) => row.capability),
      ...registry.loopSeats.map((row) => row.capability),
    ];
    assert.ok(allCapabilities.length > 0);
    assert.ok(allCapabilities.every((cap) => cap.atlasAdmitted === false));
    assert.equal(registry.summary.capabilityAdmittedCount, 0);
  });

  it("only speaks equivalence bindings in words the Capability draft vocabulary already knows", () => {
    const knownLabels = new Set(ATLAS_CAPABILITY_DRAFT.map((cap) => cap.label));
    for (const binding of ATLAS_EQUIVALENCE_ILLUSTRATIVE) {
      for (const seatLabel of binding.seats) {
        assert.ok(
          knownLabels.has(seatLabel),
          `${binding.card} implements "${seatLabel}", which is not in ATLAS_CAPABILITY_DRAFT — a new word slipped in without being added to the working vocabulary`,
        );
      }
    }
  });
});
