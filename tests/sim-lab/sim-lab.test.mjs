#!/usr/bin/env node
// Sim-Lab isolated tests — never touches Brain construction.
import assert from "node:assert/strict";
import test from "node:test";

import { materializeCompetitiveFixtureCorpus } from "../../app/field-intelligence/fixtures/competitive-corpus.mjs";
import { analyzeCorpus } from "../../app/field-intelligence/corpus-analyze.mjs";
import {
  assertSandboxInvariants,
  buildPlanGraphFromDeck,
  measureRecovery,
  simulateRemoveKind,
  runSimLab001,
} from "../../app/sim-lab/index.mjs";

test("plan graph builds from fixture deck without Brain writes", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => (r.rows || []).length > 20).slice(0, 3);
  const analyses = analyzeCorpus(records);
  const graph = buildPlanGraphFromDeck(records[0], analyses[0]);
  assert.equal(graph.writesToBrain, false);
  assert.equal(graph.constructionMutated, false);
  assert.ok(graph.nodes.length > 0);
  assertSandboxInvariants(graph);
});

test("what-if remove protection yields reasoning report, not a score", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => (r.rows || []).length > 20).slice(0, 3);
  const analyses = analyzeCorpus(records);
  const graph = buildPlanGraphFromDeck(records[0], analyses[0]);
  const report = simulateRemoveKind(graph, "protection");
  assert.equal(report.writesToBrain, false);
  assert.equal(report.scoring.constructionScore, null);
  assert.equal(report.scoring.cardRanking, null);
  assert.ok(report.narrative.length >= 1);
  assert.ok(report.recovery);
  assert.equal(typeof report.recovery.recoveryProbability, "number");
});

test("recovery metrics respond to engine deletion", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => (r.rows || []).length > 20).slice(0, 3);
  const analyses = analyzeCorpus(records);
  const graph = buildPlanGraphFromDeck(records[0], analyses[0]);
  const engines = graph.nodes.filter((n) => n.kind === "engine");
  const recovery = measureRecovery(graph, {
    removedKind: "engine",
    removedNodeIds: engines.map((n) => n.id),
  });
  assert.ok(recovery.recoveryDistance >= 1);
  assert.ok(Array.isArray(recovery.missingKinds));
});

test("Sim-Lab-001 runs on fixtures and never recommends Brain promotion", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => (r.rows || []).length > 15).slice(0, 40);
  const analyses = analyzeCorpus(records);
  const report = runSimLab001(records, { analyses });
  assert.equal(report.experimentId, "Sim-Lab-001");
  assert.equal(report.writesToBrain, false);
  assert.equal(report.constructionMutated, false);
  assert.equal(report.recommendation.promoteToBrain, false);
  assert.equal(report.recommendation.runValidationHarness, false);
  assert.ok(report.decksAnalyzed >= 10);
  assert.ok(report.correlationsWithMeanRecoveryProbability);
  assert.ok(["supports_topology", "mixed", "inconclusive", "rejects_topology"].includes(report.verdict));
});
