import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildCoachingDiagnosis } from "../app/coaching-diagnosis.mjs";

const match = (id, overrides = {}) => ({
  id,
  revision: 2,
  result: "loss",
  opponent: "Unknown / not sure",
  signal: "No single lesson isolated",
  ...overrides,
});

test("one loss never becomes a deck or piloting verdict", () => {
  const report = buildCoachingDiagnosis({ matches: [match("one")], currentRevision: 2 });
  assert.equal(report.primary.category, "collect-more-evidence");
  assert.match(report.evidenceBoundary, /loss alone never proves/i);
});

test("repeated exact-revision function failures open a bounded construction test", () => {
  const report = buildCoachingDiagnosis({
    matches: [
      match("one", { signal: "Interaction arrived at the wrong time" }),
      match("two", { signal: "I needed more early interaction" }),
      match("old", { revision: 1, signal: "I needed more early interaction" }),
    ],
    currentRevision: 2,
  });
  assert.equal(report.primary.category, "construction-pressure");
  assert.equal(report.sampleSize, 2, "neighboring revisions must not contaminate the read");
  assert.match(report.primary.recommendation, /smallest controlled construction test/i);
});

test("piloting pressure requires explicit repeated decision evidence", () => {
  const report = buildCoachingDiagnosis({
    matches: [
      match("one", { signal: "I kept the wrong hand" }),
      match("two", { coachDebrief: { decisionMoments: [{ choice: "cast" }] } }),
    ],
    currentRevision: 2,
  });
  assert.equal(report.primary.category, "piloting-decision");
  assert.match(report.primary.recommendation, /keep the deck stable/i);
});

test("a concentrated matchup needs at least four classified games", () => {
  const early = buildCoachingDiagnosis({
    matches: [0, 1, 2].map((index) => match(`e${index}`, { opponent: "Aggro" })),
    currentRevision: 2,
  });
  assert.equal(early.primary.category, "collect-more-evidence");
  const developed = buildCoachingDiagnosis({
    matches: [0, 1, 2, 3].map((index) => match(`d${index}`, { opponent: "Aggro", result: index === 0 ? "win" : "loss" })),
    currentRevision: 2,
  });
  assert.equal(developed.primary.category, "matchup-pressure");
  assert.match(developed.primary.measurement, /four more Aggro matches/i);
});

test("mixed outcomes with repeated no-lesson reports recommend holding for variance", () => {
  const report = buildCoachingDiagnosis({
    matches: [
      match("one", { result: "win" }),
      match("two", { result: "loss" }),
      match("three", { result: "win" }),
      match("four", { result: "loss" }),
    ],
    currentRevision: 2,
  });
  assert.equal(report.primary.category, "ordinary-variance");
  assert.match(report.primary.recommendation, /unchanged/i);
});

test("a comparable accepted revision effect outranks secondary diagnoses", () => {
  const report = buildCoachingDiagnosis({
    matches: [match("one", { signal: "I needed more early interaction" }), match("two", { signal: "I needed more early interaction" })],
    currentRevision: 2,
    interventionLearning: {
      experiments: [{ revision: 2, comparable: true, verdict: "promising", beforeSample: 4, afterSample: 4 }],
    },
  });
  assert.equal(report.primary.category, "revision-effect");
  assert.equal(report.alternatives[0].category, "construction-pressure");
});

test("diagnosis implementation remains server-only", () => {
  const readBundle = (dir) => fs.readdirSync(dir, { recursive: true })
    .filter((name) => /\.(?:js|mjs)$/.test(String(name)))
    .map((name) => fs.readFileSync(path.join(dir, String(name)), "utf8"))
    .join("\n");
  const client = readBundle(fileURLToPath(new URL("../dist/client/", import.meta.url)));
  const server = readBundle(fileURLToPath(new URL("../dist/server/", import.meta.url)));
  assert.doesNotMatch(client, /explicitDecisionEvidence|NEGATIVE_SIGNAL_LABELS/);
  assert.match(server, /explicitDecisionEvidence|NEGATIVE_SIGNAL_LABELS|metaforge-exact-revision-coach-v1/);
});
