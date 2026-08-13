import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deckDisplaySection,
  primaryDisplayTypeLine,
} from "../app/deck-display-classification.mjs";

describe("Founder Issue #017 — MDFC primary-face display classification", () => {
  it("puts Vorinclex under Creatures, not Enchantments", () => {
    const vorinclex = {
      name: "Vorinclex // The Grand Evolution",
      type_line: "Legendary Creature — Phyrexian Praetor // Enchantment — Saga",
      card_faces: [
        { name: "Vorinclex", type_line: "Legendary Creature — Phyrexian Praetor" },
        { name: "The Grand Evolution", type_line: "Enchantment — Saga" },
      ],
    };
    assert.equal(primaryDisplayTypeLine(vorinclex), "Legendary Creature — Phyrexian Praetor");
    assert.equal(deckDisplaySection(vorinclex), "Creatures");
  });

  it("uses front face when only joined type_line is present", () => {
    const fact = {
      name: "Vorinclex // The Grand Evolution",
      type_line: "Legendary Creature — Phyrexian Praetor // Enchantment — Saga",
    };
    assert.equal(deckDisplaySection(fact), "Creatures");
  });

  it("keeps land-front MDFCs under Lands", () => {
    const fact = {
      type_line: "Land // Creature — Elemental",
      card_faces: [
        { type_line: "Land" },
        { type_line: "Creature — Elemental" },
      ],
    };
    assert.equal(deckDisplaySection(fact), "Lands");
  });

  it("keeps artifact-front cards under Artifacts when not creatures", () => {
    assert.equal(
      deckDisplaySection({ type_line: "Artifact — Equipment" }),
      "Artifacts",
    );
  });

  it("puts artifact creatures under Creatures", () => {
    assert.equal(
      deckDisplaySection({ type_line: "Artifact Creature — Golem" }),
      "Creatures",
    );
  });

  it("still sections plain enchantments as Enchantments", () => {
    assert.equal(
      deckDisplaySection({ type_line: "Enchantment — Aura" }),
      "Enchantments",
    );
  });
});
