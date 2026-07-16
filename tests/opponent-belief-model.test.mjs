import assert from "node:assert/strict";
import test from "node:test";
import { adviseAgainstRange, estimateOpponentRange } from "../app/opponent-belief-model.mjs";

const candidates = [
  { name: "Red Aggro", metaShare: 0.6, tags: ["instant-speed", "combat-trick"], cards: [{ name: "Mountain", quantity: 20 }, { name: "Lightning Strike", quantity: 4 }, { name: "Hired Claw", quantity: 4 }] },
  { name: "Blue Control", metaShare: 0.4, tags: ["instant-speed"], cards: [{ name: "Island", quantity: 26 }, { name: "Three Steps Ahead", quantity: 4 }] },
];

test("revealed evidence updates an archetype prior without claiming certainty", () => {
  const range = estimateOpponentRange({ candidates, observations: [{ kind: "revealed-card", card: "Hired Claw" }] });
  assert.equal(range.archetypes[0].name, "Red Aggro");
  assert.ok(range.archetypes[0].probability < 1);
  assert.equal(range.confidence, "low");
});

test("sequencing evidence and revealed cards compound into a stronger belief", () => {
  const range = estimateOpponentRange({ candidates, observations: [{ kind: "revealed-card", card: "Island" }, { kind: "passed-priority-with-open-mana" }] });
  assert.equal(range.archetypes[0].name, "Blue Control");
  assert.ok(range.hiddenCards.some((item) => item.card === "Three Steps Ahead"));
});

test("line advice is deterministic and states the estimated exposure", () => {
  const range = { hiddenCards: [{ card: "Lightning Strike", probability: 0.62 }] };
  const advice = adviseAgainstRange(range, { losesTo: ["Lightning Strike"] });
  assert.equal(advice.posture, "play-around");
  assert.equal(advice.exposure, 0.62);
});

test("unsupported ranges do not manufacture veteran certainty", () => {
  assert.equal(adviseAgainstRange({ hiddenCards: [] }, { losesTo: ["Anything"] }).posture, "insufficient-evidence");
});
