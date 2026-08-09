import assert from "node:assert/strict";
import test from "node:test";
import { createPilotingDebrief } from "../app/piloting-debrief.mjs";

test("captures a bounded decision branch without declaring a misplay", () => {
  const debrief = createPilotingDebrief({ read: "I found a sequencing mistake", window: "sequencing", role: "defense", knownInformation: "Opponent had two cards and open mana.", chosenLine: "Cast the threat first.", alternativeLine: "Hold mana and pass.", observedPunishment: "The threat was removed." });
  assert.equal(debrief.decisionMoments[0].role, "defense");
  assert.match(debrief.detail, /Cast the threat first/);
  assert.match(debrief.boundary, /does not declare a misplay/i);
});

test("requires both a chosen line and a legal alternative", () => {
  assert.throws(() => createPilotingDebrief({ chosenLine: "Keep seven" }), /legal alternative/i);
});

test("sanitizes unsupported window and role labels", () => {
  const debrief = createPilotingDebrief({ window: "oracle", role: "winner", chosenLine: "A", alternativeLine: "B" });
  assert.equal(debrief.decisionMoments[0].window, "other");
  assert.equal(debrief.decisionMoments[0].role, "uncertain");
});
