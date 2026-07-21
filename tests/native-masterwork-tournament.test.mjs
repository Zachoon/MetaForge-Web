import assert from "node:assert/strict";
import test from "node:test";
import { candidateSimilarity, runNativeMasterworkTournament } from "../app/native-masterwork-tournament.mjs";

const candidate = (id, evaluation, rows = null) => ({
  id, label: `${id} Temper`, score: 70,
  evaluation: { roleCoverage: 0.7, curveHealth: 80, multiRoleDensity: 0.45, cohesion: 70, resilience: 70, ...evaluation },
  rows: rows || [{ quantity: 24, name: "Island", roles: ["land"] }, ...Array.from({ length: 9 }, (_, index) => ({ quantity: 4, name: `${id} Spell ${index}`, roles: ["draw"] }))],
});

test("advances the strongest nondominated candidate deterministically", () => {
  const inputs = [candidate("balanced", {}), candidate("fragile", { roleCoverage: 0.55, curveHealth: 60, multiRoleDensity: 0.25, cohesion: 50, resilience: 45 })];
  assert.deepEqual(runNativeMasterworkTournament(inputs, { format: "Standard", target: 60 }), runNativeMasterworkTournament(inputs, { format: "Standard", target: 60 }));
  assert.equal(runNativeMasterworkTournament(inputs, { format: "Standard", target: 60 }).selectedId, "balanced");
});

test("rejects incomplete candidates at a hard gate", () => {
  const bad = candidate("short", {}, [{ quantity: 24, name: "Island", roles: ["land"] }, { quantity: 4, name: "Answer", roles: ["interaction"] }]);
  const good = candidate("complete", {});
  const result = runNativeMasterworkTournament([bad, good], { format: "Standard", target: 60 });
  assert.equal(result.results.find((entry) => entry.id === "short").verdict, "reject");
  assert.match(result.results.find((entry) => entry.id === "short").reason, /Deck size/i);
});

test("rejects singleton copy-limit violations", () => {
  const rows = [{ quantity: 37, name: "Island", roles: ["land"] }, { quantity: 2, name: "Duplicate", roles: ["draw"] }, ...Array.from({ length: 60 }, (_, i) => ({ quantity: 1, name: `Unique ${i}`, roles: ["interaction"] }))];
  const goodRows = [{ quantity: 37, name: "Island", roles: ["land"] }, ...Array.from({ length: 63 }, (_, i) => ({ quantity: 1, name: `Legal ${i}`, roles: ["interaction"] }))];
  const result = runNativeMasterworkTournament([candidate("bad", {}, rows), candidate("good", {}, goodRows)], { format: "Commander", target: 100 });
  assert.equal(result.results.find((entry) => entry.id === "bad").verdict, "reject");
  assert.match(result.results.find((entry) => entry.id === "bad").reason, /Deck size|Copy limit/i);
});

test("measures candidate diversity without claiming performance", () => {
  const a = candidate("a", {}); const b = candidate("b", {});
  const report = runNativeMasterworkTournament([a, b], { format: "Standard", target: 60 });
  assert.equal(candidateSimilarity(a, a), 1);
  assert.ok(candidateSimilarity(a, b) < 1);
  assert.match(report.methodology, /No tournament score is a predicted win rate/i);
});

test("rejects a cosmetic near-duplicate instead of presenting it as a choice", () => {
  const original = candidate("original", {});
  const duplicate = { ...candidate("duplicate", {}), rows: structuredClone(original.rows) };
  const distinct = candidate("distinct", { cohesion: 65 });
  const report = runNativeMasterworkTournament([original, duplicate, distinct], { format: "Standard", target: 60 });
  const verdict = report.results.find((entry) => entry.id === "duplicate");
  assert.equal(verdict.verdict, "reject");
  assert.match(verdict.reason, /materially different design/i);
});
