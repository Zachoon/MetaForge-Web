import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildStrategicRecognition } from "../app/strategic-recognition.mjs";
import { buildCoachPlanStoryFromRecognition } from "../app/honest-coach-summary.mjs";

// A live Y'shtola deck's coach read said "several overlapping systems… none
// dominates" three times in a row (guide line, verdict heading, verdict
// body) and told a Spellslinger deck to watch its "landfall pieces".

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

const peers = {
  systems: [
    system("spells", "Spellcraft Engine", { health: 80, members: 9 }),
    system("draw", "Card Flow Engine", { health: 79, members: 9 }),
    system("landfall", "Landfall Engine", { health: 30, members: 2, edges: 1 }),
  ],
  strongestSystem: { name: "Spellcraft Engine" },
  weakestSystem: { name: "Landfall Engine" },
};

test("an ambiguous plan names its contenders instead of repeating the table-why line", () => {
  const recognition = buildStrategicRecognition({ structuralSystems: peers, commanderName: "Y'shtola, Night's Blessed" });
  assert.equal(recognition.ambiguous, true);
  assert.match(recognition.tableWhy, /several overlapping systems/);
  assert.doesNotMatch(recognition.primaryPlan, /several overlapping systems/, "the plan must not restate the table-why line");
  assert.match(recognition.primaryPlan, /None is dominant enough/i, "still declines to name a main plan");
  assert.match(recognition.primaryPlan, /closest contenders are /);
  assert.doesNotMatch(recognition.primaryPlan, /Engine/, "player language only, never engine names");
  assert.doesNotMatch(recognition.primaryPlan, /landfall/i, "an incidental cluster is not a contender");
});

test("the CHANGE beat never warns about a soft spot outside the plan", () => {
  const recognition = buildStrategicRecognition({ structuralSystems: peers, commanderName: "Y'shtola, Night's Blessed" });
  const story = buildCoachPlanStoryFromRecognition({ recognition, commanders: ["Y'shtola, Night's Blessed"] });
  assert.doesNotMatch(story.stop, /landfall/i);
  assert.doesNotMatch(story.stop, /soft spot collapses/);
});

test("the guide line points at the verdict instead of printing its heading again", async () => {
  const source = await readFile(new URL("../app/honest-coach-summary.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /`\$\{planStory\.title\} — start here\.`/);
  assert.doesNotMatch(source, /`\$\{title\} — start here\.`/);
  assert.match(source, /"Start with the verdict below, then take one change into your next game\."/);
});
