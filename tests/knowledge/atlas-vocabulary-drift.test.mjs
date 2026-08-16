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
  ATLAS_LIFE_SEATS,
  ATLAS_PROTECTION_SEATS,
  ATLAS_EVASION_SEATS,
  ATLAS_LAND_SEATS,
  ATLAS_ARTIFACT_SEATS,
  ATLAS_TOKEN_SEATS,
  ATLAS_AURA_SEATS,
  ATLAS_SPELL_SEATS,
  ATLAS_DRAW_SEATS,
  ATLAS_DAMAGE_SEATS,
  ATLAS_EQUIPMENT_SEATS,
  ATLAS_COMBAT_SEATS,
  ATLAS_LOOP_SEATS,
  ATLAS_RESET_SHAPE_SEATS,
} from "../../app/knowledge/atlas-vocabulary.mjs";
import {
  SELECTION_KINDS,
  GRAVEYARD_KINDS,
  SACRIFICE_KINDS,
  TRIGGER_KINDS,
  COUNTER_KINDS,
  LIFE_KINDS,
  PROTECTION_KINDS,
  EVASION_KINDS,
  LAND_KINDS,
  ARTIFACT_KINDS,
  TOKEN_KINDS,
  AURA_KINDS,
  SPELL_KINDS,
  DRAW_KINDS,
  DAMAGE_KINDS,
  EQUIPMENT_KINDS,
  COMBAT_KINDS,
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

  it("seats exactly the graph's life kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_LIFE_SEATS.map((row) => row.kind),
      Object.values(LIFE_KINDS),
      "life kinds",
    );
  });

  it("seats exactly the graph's protection kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_PROTECTION_SEATS.map((row) => row.kind),
      Object.values(PROTECTION_KINDS),
      "protection kinds",
    );
  });

  it("seats exactly the graph's evasion kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_EVASION_SEATS.map((row) => row.kind),
      Object.values(EVASION_KINDS),
      "evasion kinds",
    );
  });

  it("seats exactly the graph's land kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_LAND_SEATS.map((row) => row.kind),
      Object.values(LAND_KINDS),
      "land kinds",
    );
  });

  it("seats exactly the graph's artifact kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_ARTIFACT_SEATS.map((row) => row.kind),
      Object.values(ARTIFACT_KINDS),
      "artifact kinds",
    );
  });

  it("seats exactly the graph's token kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_TOKEN_SEATS.map((row) => row.kind),
      Object.values(TOKEN_KINDS),
      "token kinds",
    );
  });

  it("seats exactly the graph's aura kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_AURA_SEATS.map((row) => row.kind),
      Object.values(AURA_KINDS),
      "aura kinds",
    );
  });

  it("seats exactly the graph's spell kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_SPELL_SEATS.map((row) => row.kind),
      Object.values(SPELL_KINDS),
      "spell kinds",
    );
  });

  it("seats exactly the graph's draw kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_DRAW_SEATS.map((row) => row.kind),
      Object.values(DRAW_KINDS),
      "draw kinds",
    );
  });


  it("seats exactly the graph's damage kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_DAMAGE_SEATS.map((row) => row.kind),
      Object.values(DAMAGE_KINDS),
      "damage kinds",
    );
  });

  it("seats exactly the graph's equipment kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_EQUIPMENT_SEATS.map((row) => row.kind),
      Object.values(EQUIPMENT_KINDS),
      "equipment kinds",
    );
  });

  it("seats exactly the graph's combat kinds, no more, no fewer", () => {
    assertSameSet(
      ATLAS_COMBAT_SEATS.map((row) => row.kind),
      Object.values(COMBAT_KINDS),
      "combat kinds",
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
      ...registry.typalSeats,
      ...registry.aristocratsSeats,
      ...registry.spellslingerSeats,
      ...registry.reanimatorSeats,
      ...registry.landfallOccupancySeats,
      ...registry.staxSeats,
      ...registry.selectionSeats,
      ...registry.graveyardSeats,
      ...registry.sacrificeSeats,
      ...registry.triggerSeats,
      ...registry.counterSeats,
      ...registry.lifeSeats,
      ...registry.protectionSeats,
      ...registry.evasionSeats,
      ...registry.landSeats,
      ...registry.artifactSeats,
      ...registry.tokenSeats,
      ...registry.auraSeats,
      ...registry.spellSeats,
      ...registry.drawSeats,
      ...registry.damageSeats,
      ...registry.equipmentSeats,
      ...registry.combatSeats,
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
      ...registry.typalSeats.map((row) => row.capability),
      ...registry.aristocratsSeats.map((row) => row.capability),
      ...registry.spellslingerSeats.map((row) => row.capability),
      ...registry.reanimatorSeats.map((row) => row.capability),
      ...registry.landfallOccupancySeats.map((row) => row.capability),
      ...registry.staxSeats.map((row) => row.capability),
      ...registry.selectionSeats.map((row) => row.capability),
      ...registry.graveyardSeats.map((row) => row.capability),
      ...registry.sacrificeSeats.map((row) => row.capability),
      ...registry.triggerSeats.map((row) => row.capability),
      ...registry.counterSeats.map((row) => row.capability),
      ...registry.lifeSeats.map((row) => row.capability),
      ...registry.protectionSeats.map((row) => row.capability),
      ...registry.evasionSeats.map((row) => row.capability),
      ...registry.landSeats.map((row) => row.capability),
      ...registry.artifactSeats.map((row) => row.capability),
      ...registry.tokenSeats.map((row) => row.capability),
      ...registry.auraSeats.map((row) => row.capability),
      ...registry.spellSeats.map((row) => row.capability),
      ...registry.drawSeats.map((row) => row.capability),
      ...registry.damageSeats.map((row) => row.capability),
      ...registry.equipmentSeats.map((row) => row.capability),
      ...registry.combatSeats.map((row) => row.capability),
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
