import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [
  page,
  polish,
  anvil,
  globalsCss,
  walkthrough,
  proving,
  provingCss,
  opinion,
  opinionCss,
  dossier,
  dossierCss,
] = await Promise.all([
  read("app/page.tsx"),
  read("app/forge-polish.css"),
  read("app/testing-anvil.css"),
  read("app/globals.css"),
  read("app/forge-walkthrough.tsx"),
  read("app/proving-grounds-era.tsx"),
  read("app/proving-grounds-era.css"),
  read("app/components/forge/revision-opinion.tsx"),
  read("app/components/forge/revision-opinion.css"),
  read("app/components/forge/deep-forge-dossier.tsx"),
  read("app/components/forge/deep-forge-dossier.css"),
]);

test("ceremony, footer, and context inspector name occupancy from commander oracle", () => {
  assert.match(page, /className="ceremony-occupancy"/);
  assert.match(page, /Named from commander oracle while the 99 is still being forged/);
  assert.match(page, /className="masterwork-footer-occupancy"/);
  assert.match(page, /className="forge-context-occupancy"/);
  assert.match(page, /className="forge-context-pair"/);
  assert.match(page, /explainPairsForCardAsMentor\(\{/);
  assert.match(polish, /\.ceremony-copy > \.ceremony-occupancy/);
  assert.match(anvil, /\.masterwork-footer-occupancy/);
  assert.match(anvil, /\.forge-context-occupancy,\.forge-context-pair/);
});

test("awaken CTA names occupancy without changing the build button", () => {
  assert.match(page, /className="awaken-occupancy"/);
  assert.match(page, /Named from commander oracle, before the 99 exists/);
  assert.match(polish, /\.awaken-occupancy/);
  assert.doesNotMatch(page, /awaken-occupancy[\s\S]{0,80}onClick=\{awaken\}/);
});

test("walkthrough, proving grounds, and revision opinion keep occupancy separate from proof", () => {
  assert.match(walkthrough, /Occupancy engines are named from commander oracle before the 99 exists/);
  assert.match(walkthrough, /that is not a verified system map/);
  assert.match(proving, /occupancyEngines = \[\]/);
  assert.match(proving, /This trial does not verify occupancy/);
  assert.match(provingCss, /\.proving-occupancy/);
  assert.match(page, /occupancyEngines=\{coachOccupancyLabels\}/);
  assert.match(opinion, /That is not this revision's Mentor stance/);
  assert.match(opinion, /never invents a question from a card or commander name/);
  assert.match(opinionCss, /\.revision-opinion-occupancy/);
});

test("Share and export stay decklist-only — occupancy is not a list comment", () => {
  assert.match(page, /navigator\.clipboard\.writeText\(forgedDeck\)/);
  assert.doesNotMatch(page, /# Occupancy/);
  assert.doesNotMatch(page, /forgedDeck.*occupancy/i);
});

test("Deep Forge dossier names occupancy without calling it research", () => {
  assert.match(dossier, /That is not Deep Forge research/);
  assert.match(dossierCss, /\.deep-forge-occupancy/);
  assert.match(page, /<DeepForgeDossier\s+occupancyEngines=\{coachOccupancyLabels\}/);
});


test("stats bar and guest save gate name occupancy without treating it as proof", () => {
  assert.match(page, /className="masterwork-stats-occupancy"/);
  assert.match(page, /className="guest-result-occupancy"/);
  assert.match(anvil, /\.masterwork-stats-occupancy/);
  assert.match(globalsCss, /\.guest-result-occupancy/);
});

test("coach brief, experiments, graph, and post-accept keep occupancy off the verified-system path", () => {
  assert.match(page, /className="honest-coach-occupancy"/);
  assert.match(page, /Named from commander oracle, not a verified system map/);
  assert.match(page, /className="experiment-occupancy"/);
  assert.match(page, /These experiments do not reopen occupancy/);
  assert.match(page, /className="interaction-graph-occupancy"/);
  assert.match(page, /Named from commander oracle, not from this graph/);
  assert.match(page, /className="post-accept-occupancy"/);
  assert.match(page, /not from this revision/);
  assert.match(anvil, /\.honest-coach-occupancy/);
});

