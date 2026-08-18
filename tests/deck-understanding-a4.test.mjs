import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  buildDeckUnderstanding,
  buildStrategyVsSystemRead,
  deepForgeEmptyCopy,
  scryfallAliasKeys,
  coachReliabilityState,
} from "../app/deck-understanding.mjs";
import { buildHonestCoachSummary } from "../app/honest-coach-summary.mjs";

const TONY_STARK_FOUNDER_UNRESOLVED_BEFORE = [
  "Black Panther's Claws",
  "Megatron",
  "Skybreaker, Sword of Bashenga",
];

describe("Deck Understanding Reliability A4", () => {
  it("reports verification percentage and keeps unresolved cards visible", () => {
    const understanding = buildDeckUnderstanding({
      submittedNames: ["Sol Ring", "Counterspell", "Black Panther's Claws", "Tony Stark"],
      resolvedNames: ["Sol Ring", "Counterspell", "Tony Stark"],
      unresolved: [{ name: "Black Panther's Claws", reasonCode: "resolved_via_flavor_name" }],
      commanderName: "Tony Stark",
      commanderResolved: true,
    });
    assert.equal(understanding.cardsSubmitted, 4);
    assert.equal(understanding.cardsUnresolved, 1);
    assert.equal(understanding.percentStructurallyUnderstood, 75);
    assert.match(understanding.playerSummary.headline, /3 \/ 4/);
    assert.ok(understanding.playerSummary.unresolvedNames.includes("Black Panther's Claws"));
  });

  it("treats incomplete evidence as not-fully-verified, not absent", () => {
    const understanding = buildDeckUnderstanding({
      submittedNames: Array.from({ length: 100 }, (_, i) => `Card ${i}`),
      resolvedNames: Array.from({ length: 97 }, (_, i) => `Card ${i}`),
      unresolved: TONY_STARK_FOUNDER_UNRESOLVED_BEFORE.map((name) => ({ name, reasonCode: "card_not_real" })),
      commanderName: "Tony Stark",
      commanderResolved: true,
    });
    const read = buildStrategyVsSystemRead({
      understanding,
      packageLabels: ["Artifact package"],
      strategyLine: "Artifact value snowball",
      systemsDetected: 0,
      incompleteCardSet: true,
    });
    assert.equal(read.strategy.confidence, "high");
    assert.equal(read.engine.status, "not_fully_verified");
    assert.match(read.engine.label, /Not fully verified/i);
    assert.doesNotMatch(read.engine.label, /does not exist|no engine exists/i);
    assert.match(deepForgeEmptyCopy({ incomplete: true, topic: "system" }), /currently resolved card set/i);
    assert.match(deepForgeEmptyCopy({ incomplete: false, topic: "system" }), /complete card set/i);
  });

  it("gates definitive coaching when understanding is insufficient", () => {
    const low = coachReliabilityState({ percent: 80, unresolvedCount: 20, commanderResolved: true, submittedCount: 100 });
    assert.equal(low.state, "insufficient");
    const summary = buildHonestCoachSummary({
      selected: {
        evaluation: { cohesion: 70, roleCoverage: 0.8 },
        strategicIntent: { packages: [{ label: "Artifact package" }], commanders: [{ name: "Tony Stark" }] },
        slotJustificationLedger: { critique: { weaklyJustified: [] } },
      },
      isImported: true,
      generationId: "a4",
      deckUnderstanding: buildDeckUnderstanding({
        submittedNames: Array.from({ length: 20 }, (_, i) => `C${i}`),
        resolvedNames: Array.from({ length: 10 }, (_, i) => `C${i}`),
        unresolved: Array.from({ length: 10 }, (_, i) => ({ name: `Missing ${i}`, reasonCode: "card_not_real" })),
        commanderName: "Tony Stark",
        commanderResolved: true,
      }),
    });
    assert.equal(summary.coachingAllowed, false);
    assert.ok(summary.version.startsWith("honest-coach-v0"));
    assert.ok(summary.intentions.accomplish);
  });

  it("indexes Universes Beyond flavor_name aliases without special-casing founder cards", () => {
    const hammer = scryfallAliasKeys({
      name: "Hammer of Nazahn",
      flavor_name: "Black Panther's Claws",
    });
    const sword = scryfallAliasKeys({
      name: "Sword of the Animist",
      flavor_name: "Skybreaker, Sword of Bashenga",
    });
    const megatron = scryfallAliasKeys({
      name: "Blightsteel Colossus // Blightsteel Colossus",
      card_faces: [{ name: "Blightsteel Colossus", flavor_name: "Megatron" }],
    });
    assert.ok(hammer.includes("black panther's claws"));
    assert.ok(sword.includes("skybreaker, sword of bashenga"));
    assert.ok(megatron.includes("megatron"));
  });

  it("wires A4 principle and product surfaces without Brain construction imports", async () => {
    const root = new URL("../", import.meta.url);
    const principles = await readFile(new URL("docs/ENGINEERING_PRINCIPLES.md", root), "utf8");
    const page = await readFile(new URL("app/page.tsx", root), "utf8");
    // strategyVsSystem/deepForgeEmpty (the systems-chamber and interaction-
    // graph empty states) moved to /research along with the rest of the
    // Deep Forge vault.
    const researchPage = await readFile(new URL("app/research/page.tsx", root), "utf8");
    const understanding = await readFile(new URL("app/deck-understanding.mjs", root), "utf8");
    assert.match(principles, /Unknown is not absent/);
    assert.match(page, /deckUnderstanding/);
    // System verification stays available to Deep Forge; coach default must not
    // headline "WHAT MAKES IT RUN" / system-count jargon.
    assert.match(researchPage, /strategyVsSystem|deepForgeEmpty/);
    assert.match(page, /How do you know\? → Deep Forge evidence/);
    assert.doesNotMatch(page, /WHAT MAKES IT RUN/);
    assert.doesNotMatch(understanding, /native-masterwork-engine|prospective-slot-delta|construction-phase/);
  });
});
