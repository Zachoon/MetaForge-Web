import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStrategicRecognition, rankSystemHierarchy } from "../app/strategic-recognition.mjs";
import { buildPilotModel } from "../app/pilot-model.mjs";
import {
  buildHonestCoachSummary,
  buildIntegrityGuardedCoachSummary,
  VAGUE_COACH_PHRASES,
} from "../app/honest-coach-summary.mjs";
import { stampStructuralReportBinding } from "../app/narrative-integrity.mjs";

function system(signal, name, { health = 80, members = 6, edges = 4 } = {}) {
  return {
    id: signal,
    signal,
    name,
    members: Array.from({ length: members }, (_, i) => `${name} Piece ${i}`),
    edges: Array.from({ length: edges }, () => ({})),
    health: { overall: health, cohesion: health },
    producers: [],
    payoffs: [],
  };
}

const kastralSystems = {
  systems: [
    system("evasion", "Evasion Engine", { health: 92, members: 14, edges: 20 }),
    system("etb", "Enter-the-Battlefield Engine", { health: 78, members: 9, edges: 8 }),
    system("tokens", "Token Engine", { health: 74, members: 8, edges: 7 }),
    system("treasure", "Treasure Engine", { health: 55, members: 4, edges: 3 }),
  ],
  strongestSystem: { name: "Evasion Engine", signal: "evasion" },
  weakestSystem: { name: "Treasure Engine", signal: "treasure" },
  confidence: "HIGH · ORACLE-DERIVED",
};

const tonySystems = {
  systems: [
    system("artifacts", "Artifact Engine", { health: 90, members: 18, edges: 22 }),
    system("etb", "Enter-the-Battlefield Engine", { health: 60, members: 5, edges: 3 }),
  ],
  strongestSystem: { name: "Artifact Engine", signal: "artifacts" },
  weakestSystem: { name: "Enter-the-Battlefield Engine", signal: "etb" },
  confidence: "HIGH · ORACLE-DERIVED",
};

function tonySelected() {
  return {
    evaluation: { cohesion: 78, roleCoverage: 0.8 },
    strategicIntent: {
      strategy: "Focused",
      packages: [{ id: "equipment", label: "Equipment package" }],
      commanders: [{ name: "Tony Stark, Iron Man" }],
    },
    strategicCohesionGate: { ok: true },
    slotJustificationLedger: { critique: { weaklyJustified: [] } },
    rows: [
      { name: "Tony Stark, Iron Man", quantity: 1, roles: ["commander"] },
      { name: "Sol Ring", quantity: 1 },
    ],
  };
}

function kastralSelected() {
  return {
    evaluation: { cohesion: 72, roleCoverage: 0.75 },
    strategicIntent: {
      strategy: "Midrange",
      packages: [],
      commanders: [{ name: "Kastral, the Windnidus" }],
    },
    strategicCohesionGate: { ok: true },
    slotJustificationLedger: { critique: { weaklyJustified: [] } },
    rows: [
      { name: "Kastral, the Windnidus", quantity: 1, roles: ["commander"] },
      { name: "Sol Ring", quantity: 1 },
    ],
  };
}

describe("Founder Issue #020 — Strategic Recognition + Pilot Model", () => {
  it("1. does not invent Brain construction imports", async () => {
    const { readFile } = await import("node:fs/promises");
    const recognition = await readFile(new URL("../app/strategic-recognition.mjs", import.meta.url), "utf8");
    const pilot = await readFile(new URL("../app/pilot-model.mjs", import.meta.url), "utf8");
    assert.doesNotMatch(recognition, /native-masterwork-engine|package-plan-optimizer|prospective-slot-delta/);
    assert.doesNotMatch(pilot, /native-masterwork-engine|package-plan-optimizer|prospective-slot-delta/);
  });

  it("2. ranks systems into primary / supporting / incidental", () => {
    const hierarchy = rankSystemHierarchy(kastralSystems.systems, {
      strongestSystem: kastralSystems.strongestSystem,
      weakestSystem: kastralSystems.weakestSystem,
    });
    assert.equal(hierarchy.primary.signal, "evasion");
    assert.ok(hierarchy.supporting.some((entry) => entry.signal === "etb" || entry.signal === "tokens"));
    assert.ok(hierarchy.incidental.some((entry) => entry.signal === "treasure") || hierarchy.supporting.every((e) => e.signal !== "treasure"));
    assert.equal(hierarchy.pressurePoint, "Treasure Engine");
  });

  it("3. Kastral recognition avoids balanced midrange and names evasive combat-value", () => {
    const recognition = buildStrategicRecognition({
      structuralSystems: kastralSystems,
      packageLabels: [],
      commanderName: "Kastral, the Windnidus",
      strategy: "Midrange",
    });
    assert.match(recognition.planLabel, /evasive|combat/i);
    assert.doesNotMatch(recognition.planLabel, /balanced midrange/i);
    assert.doesNotMatch(recognition.primaryPlan, /balanced midrange|advance the main game plan|built for your commander/i);
    assert.match(recognition.primaryPlan, /evasive|combat|connect/i);
    assert.equal(recognition.hierarchy.primary.signal, "evasion");
    assert.ok(recognition.confidence.level === "high" || recognition.confidence.level === "moderate");
  });

  it("3b. Atraxa-class recognition leads with table why, not engine taxonomy", () => {
    const atraxaSystems = {
      systems: [
        system("evasion", "Evasion Engine", { health: 88, members: 10, edges: 12 }),
        system("counters", "Counter Engine", { health: 84, members: 9, edges: 11 }),
        system("treasure", "Treasure Engine", { health: 50, members: 3, edges: 2 }),
      ],
      strongestSystem: { name: "Evasion Engine", signal: "evasion" },
      weakestSystem: { name: "Treasure Engine", signal: "treasure" },
    };
    const recognition = buildStrategicRecognition({
      structuralSystems: atraxaSystems,
      packageLabels: ["+1/+1 counter growth"],
      commanderName: "Atraxa, Praetors' Voice",
    });
    assert.match(recognition.tableWhy, /planeswalker|counter|longer it survives/i);
    assert.match(recognition.primaryPlan, /planeswalker|proliferate|counter/i);
    assert.doesNotMatch(recognition.tableWhy, /^Evasion Engine$/i);
  });

  it("4. Kastral pilot sequence explains how the commander comes online", () => {
    const recognition = buildStrategicRecognition({
      structuralSystems: kastralSystems,
      commanderName: "Kastral, the Windnidus",
    });
    const pilot = buildPilotModel({ recognition, commanderName: "Kastral, the Windnidus" });
    assert.match(pilot.establish, /connect|Don't rush|empty board/i);
    assert.match(pilot.deploy, /Kastral/i);
    assert.match(pilot.compound, /combat|compounds|token|card/i);
    assert.deepEqual(pilot.sequence, ["Establish", "Deploy", "Compound", "Protect / Recover", "Close"]);
  });

  it("5. Tony Stark recognition names artifact value direction", () => {
    const recognition = buildStrategicRecognition({
      structuralSystems: tonySystems,
      packageLabels: ["Equipment package"],
      commanderName: "Tony Stark, Iron Man",
    });
    assert.match(recognition.planLabel, /artifact/i);
    assert.match(recognition.primaryPlan, /artifact|equipment/i);
    assert.doesNotMatch(recognition.primaryPlan, /balanced midrange|built for your commander/i);
    const pilot = buildPilotModel({ recognition, commanderName: "Tony Stark, Iron Man" });
    assert.match(pilot.establish, /artifact|equipment|rock/i);
    assert.match(pilot.deploy, /Tony Stark/i);
  });

  it("6. ambiguous peer systems stay limited — not falsely specific", () => {
    const peers = {
      systems: [
        system("evasion", "Evasion Engine", { health: 80, members: 8 }),
        system("artifacts", "Artifact Engine", { health: 79, members: 8 }),
        system("spells", "Spellcraft Engine", { health: 78, members: 8 }),
      ],
      strongestSystem: { name: "Evasion Engine" },
      weakestSystem: { name: "Spellcraft Engine" },
    };
    const recognition = buildStrategicRecognition({
      structuralSystems: peers,
      commanderName: "Mystery Commander",
    });
    assert.equal(recognition.ambiguous, true);
    assert.equal(recognition.confidence.level, "limited");
    assert.match(recognition.primaryPlan, /overlapping systems|none is dominant/i);
  });

  it("7. Honest Coach Kastral copy leads with plan language, not system taxonomy alone", () => {
    const summary = buildHonestCoachSummary({
      selected: kastralSelected(),
      structuralSystems: kastralSystems,
      isImported: true,
      generationId: "kastral-020",
      activeCommanderName: "Kastral, the Windnidus",
      deckCardNames: ["Kastral, the Windnidus", "Sol Ring", "Murmuring Mystic"],
    });
    const blob = [
      summary.planStory.title,
      summary.planStory.plan,
      summary.intentions.accomplish,
      summary.intentions.establish,
      summary.intentions.dependsOn,
    ].join("\n");
    assert.ok(summary.planStory.fromRecognition);
    assert.match(blob, /evasive|combat|connect|wins by turning successful combat|successful attack feeds/i);
    assert.match(summary.planStory.title, /wins because|successful attack|combat/i);
    assert.ok(summary.strategicRecognition.tableWhy);
    assert.doesNotMatch(blob, /balanced midrange/i);
    for (const phrase of VAGUE_COACH_PHRASES) {
      assert.doesNotMatch(blob, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    assert.ok(summary.strategicRecognition);
    assert.ok(summary.pilotModel);
    assert.match(summary.version, /honest-coach-v0\.[6789]/);
  });

  it("8. Honest Coach Tony Stark copy explains artifact snowball", () => {
    const summary = buildHonestCoachSummary({
      selected: tonySelected(),
      structuralSystems: tonySystems,
      isImported: true,
      generationId: "tony-020",
      activeCommanderName: "Tony Stark, Iron Man",
      deckCardNames: ["Tony Stark, Iron Man", "Sol Ring", "Hammer of Nazahn"],
    });
    assert.match(summary.planStory.plan, /artifact|equipment/i);
    assert.match(summary.intentions.establish, /artifact|equipment|rock|Don't rush|connect/i);
    assert.doesNotMatch(summary.planStory.plan, /balanced midrange/i);
  });

  it("9. Narrative Integrity still blocks cross-deck contamination with recognition", () => {
    const isshinSystems = stampStructuralReportBinding(
      {
        status: "structural-analysis-complete",
        commanderName: "Isshin, Two Heavens as One",
        systems: {
          systems: [system("combat", "Combat Engine")],
          strongestSystem: { name: "Combat Engine" },
          weakestSystem: { name: "Combat Engine" },
          confidence: "HIGH",
        },
      },
      {
        generationId: "gen-isshin",
        commanderName: "Isshin, Two Heavens as One",
        deckFingerprint: "deck-isshin",
      },
    );

    // Page would bind-fail; guarded builder with foreign systems still must not leak Isshin.
    const summary = buildIntegrityGuardedCoachSummary({
      selected: tonySelected(),
      structuralSystems: isshinSystems.systems,
      isImported: true,
      generationId: "gen-tony",
      activeCommanderName: "Tony Stark, Iron Man",
      deckCardNames: ["Tony Stark, Iron Man", "Sol Ring"],
      foreignSuspectNames: ["Isshin, Two Heavens as One"],
      allowedSystemNames: ["Artifact Engine", "Enter-the-Battlefield Engine"],
    });
    const blob = JSON.stringify(summary);
    assert.doesNotMatch(blob, /Isshin/i);
    assert.equal(summary.narrativeIntegrity.ok, true);
  });

  it("10. coach copy stays bounded for mobile (no wall of text)", () => {
    const summary = buildHonestCoachSummary({
      selected: kastralSelected(),
      structuralSystems: kastralSystems,
      activeCommanderName: "Kastral, the Windnidus",
      deckCardNames: ["Kastral, the Windnidus"],
    });
    assert.ok(summary.intentions.accomplish.length < 280);
    assert.ok(summary.intentions.establish.length < 220);
    assert.ok(summary.intentions.dependsOn.length < 220);
    assert.ok(summary.intentions.firstVulnerability.length < 320);
    // Player Surface Law: Engine taxonomy stays off the coach default stop line.
    assert.doesNotMatch(summary.intentions.firstVulnerability, /Treasure Engine|Evasion Engine/);
    assert.match(summary.intentions.firstVulnerability, /treasure and ramp pieces|Watch your/i);
  });
});
