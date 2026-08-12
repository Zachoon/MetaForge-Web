import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStrategicRecognition } from "../app/strategic-recognition.mjs";
import { buildPilotStory } from "../app/pilot-model.mjs";

// Real regression: a live Atraxa, Praetors' Voice generation measured Token
// Engine as the strongest structural system (Counter Engine merely
// supporting, Treasure Engine weakest), but strategic-recognition.mjs's
// counterish-commander override deliberately leads the table-why/primary-plan
// text with counters instead (see founder-issue-020-recognition.test.mjs
// "3b"). Before this fix, buildPilotStory read hierarchy.primary.signal
// directly and independently re-derived "tokens" — so the same coach report
// told two different stories: a counters verdict next to token-flavored
// opening priorities and protect advice. resolvedSignal exists so every
// consumer of Strategic Recognition tells the one story that was chosen.
describe("Strategic Recognition -> Pilot Model signal coherence", () => {
  const atraxaSystems = {
    systems: [
      { name: "Token Engine", signal: "tokens", health: { overall: 80 }, members: Array(6).fill("x") },
      { name: "Counter Engine", signal: "counters", health: { overall: 70 }, members: Array(4).fill("x") },
      { name: "Treasure Engine", signal: "treasure", health: { overall: 30 }, members: Array(2).fill("x") },
    ],
    strongestSystem: { name: "Token Engine" },
    weakestSystem: { name: "Treasure Engine" },
  };

  it("exposes the resolved (possibly overridden) signal separately from the raw measured primary", () => {
    const recognition = buildStrategicRecognition({
      structuralSystems: atraxaSystems,
      packageLabels: [],
      commanderName: "Atraxa, Praetors' Voice",
    });
    assert.equal(recognition.hierarchy.primary.signal, "tokens", "raw measurement should stay tokens — Token Engine really did score highest");
    assert.equal(recognition.resolvedSignal, "counters", "the counterish-commander override should still lead the narrative with counters");
    assert.match(recognition.tableWhy, /counter|planeswalker/i);
  });

  it("pilot sequence never mentions a different plan than the one the verdict just told", () => {
    const recognition = buildStrategicRecognition({
      structuralSystems: atraxaSystems,
      packageLabels: [],
      commanderName: "Atraxa, Praetors' Voice",
    });
    const pilot = buildPilotStory({ recognition, commanderName: "Atraxa, Praetors' Voice" });
    assert.doesNotMatch(pilot.establish, /token/i, `pilot text should not narrate tokens when the verdict narrated counters: ${pilot.establish}`);
    assert.doesNotMatch(pilot.protect, /token/i, `pilot text should not narrate tokens when the verdict narrated counters: ${pilot.protect}`);
    assert.match(pilot.establish, /counter/i);
    assert.match(pilot.protect, /counter/i);
  });

  it("without an override, pilot still follows the raw measured primary system", () => {
    const kastralSystems = {
      systems: [
        { name: "Evasion Engine", signal: "evasion", health: { overall: 85 }, members: Array(8).fill("x") },
        { name: "Artifact Engine", signal: "artifacts", health: { overall: 40 }, members: Array(2).fill("x") },
      ],
      strongestSystem: { name: "Evasion Engine" },
      weakestSystem: { name: "Artifact Engine" },
    };
    const recognition = buildStrategicRecognition({
      structuralSystems: kastralSystems,
      packageLabels: [],
      commanderName: "Kastral, the Windnidus",
    });
    assert.equal(recognition.resolvedSignal, "evasion");
    assert.equal(recognition.resolvedSignal, recognition.hierarchy.primary.signal);
    const pilot = buildPilotStory({ recognition, commanderName: "Kastral, the Windnidus" });
    assert.match(pilot.establish, /connect|blockers|attack/i);
  });
});
