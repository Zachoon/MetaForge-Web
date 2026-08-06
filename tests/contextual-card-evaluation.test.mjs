import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildForgeStructuralAnalysis } from "../app/forge-structural-pipeline.mjs";
import { buildContextualCardEvaluations } from "../app/contextual-card-evaluation.mjs";

const cards = [
  { name: "Garden Steward", typeLine: "Creature", oracleText: "Whenever a creature token enters under your control, draw a card." },
  { name: "Moss Foundry", typeLine: "Enchantment", oracleText: "At the beginning of combat, create a 1/1 green Saproling creature token." },
  { name: "Seed Chorus", typeLine: "Creature", oracleText: "Creature tokens you control get +1/+1." },
  { name: "Quiet Monument", typeLine: "Artifact", oracleText: "Creatures you control have vigilance." },
  { name: "Forest", typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", quantity: 20 },
];

function evaluate(input) {
  const structural = buildForgeStructuralAnalysis(input, {});
  return buildContextualCardEvaluations(input, structural.graph, structural.systems, structural.causality);
}

test("evaluates every card against the actual deck rather than a named-card fixture", () => {
  const report = evaluate(cards);
  assert.equal(report.cards.length, cards.length);
  const steward = report.cards.find((card) => card.name === "Moss Foundry");
  const monument = report.cards.find((card) => card.name === "Quiet Monument");
  assert.ok(steward.scores.synergy > monument.scores.synergy);
  assert.ok(steward.partners.includes("Seed Chorus"));
  assert.match(steward.whyHere, /Seed Chorus|system/i);
  assert.match(monument.whyHere, /testing question|no verified/i);
});

test("keeps all contextual scores bounded and explicitly non-universal", () => {
  const report = evaluate(cards);
  for (const card of report.cards) {
    for (const score of Object.values(card.scores)) assert.ok(score >= 0 && score <= 100);
  }
  assert.match(report.methodology, /not universal card ratings/i);
  assert.match(report.methodology, /not.*predicted win rates/i);
});

test("changes a card's evaluation when its surrounding deck changes", () => {
  const connected = evaluate(cards).cards.find((card) => card.name === "Moss Foundry");
  const isolated = evaluate([cards[1], cards[4]]).cards.find((card) => card.name === "Moss Foundry");
  assert.ok(connected.scores.synergy > isolated.scores.synergy);
  assert.ok(connected.scores.planFit > isolated.scores.planFit);
});

test("keeps contextual scoring implementation server-side", () => {
  const readTree = (directory) => fs.readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? readTree(target) : /\.(?:js|mjs)$/.test(entry.name) ? fs.readFileSync(target, "utf8") : "";
  }).join("\n");
  const client = fileURLToPath(new URL("../dist/client/", import.meta.url));
  const server = fileURLToPath(new URL("../dist/server/", import.meta.url));
  assert.ok(fs.existsSync(client) && fs.existsSync(server), "run the production build before bundle isolation tests");
  const clientSource = readTree(client);
  const serverSource = readTree(server);
  assert.doesNotMatch(clientSource, /metaforge-contextual-card-evaluation-v1/);
  assert.doesNotMatch(clientSource, /redundancyScore\(/);
  assert.match(serverSource, /metaforge-contextual-card-evaluation-v1/);
  // card-timing-reasoning.mjs (Intent + Clock) is a new dependency of this
  // module as of the same change that added the `timing` field above —
  // its sentence templates and category thresholds must stay server-only
  // too, the same way the rest of this file's reasoning does.
  assert.doesNotMatch(clientSource, /finds exactly the piece your plan needs/);
  assert.doesNotMatch(clientSource, /Scales with your plan/);
  assert.match(serverSource, /finds exactly the piece your plan needs/);
});
