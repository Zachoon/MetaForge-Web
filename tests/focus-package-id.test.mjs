import assert from "node:assert/strict";
import test from "node:test";
import { buildStrategicIntent, commanderShellOptions } from "../app/strategic-intent.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
};

const dualShellCommander = {
  name: "Made-Up Dual Shell",
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an artifact you control enters the battlefield, draw a card.",
};

function intentFor(commander, extra = {}) {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander, ...extra },
    { blueprint: { source: "", requestedMechanics: [], desiredRoles: [], packageSignals: [], promises: [] } },
  );
}

test("no focusPackageId: every commander-triggered package is included, unchanged from existing behavior", () => {
  const intent = intentFor(dualShellCommander);
  assert.ok(intent.packageIds.includes("auras"));
  assert.ok(intent.packageIds.includes("artifacts_matter"));
  assert.equal(intent.focusPackageId, null);
});

test("focusPackageId narrows construction to just that one package", () => {
  const intent = intentFor(dualShellCommander, { focusPackageId: "auras" });
  assert.deepEqual(intent.packageIds, ["auras"]);
  assert.equal(intent.focusPackageId, "auras");
});

test("focusPackageId excludes an independently-triggered sibling package", () => {
  const intent = intentFor(dualShellCommander, { focusPackageId: "artifacts_matter" });
  assert.deepEqual(intent.packageIds, ["artifacts_matter"]);
  assert.ok(!intent.packageIds.includes("auras"));
});

test("focusPackageId that the commander never actually triggers yields no packages, not a silent fallback", () => {
  const intent = intentFor(pearlEar, { focusPackageId: "stax" });
  assert.deepEqual(intent.packageIds, []);
  assert.equal(intent.focusPackageId, "stax");
});

test("every id commanderShellOptions offers for a commander is honored by focusPackageId on that same commander", () => {
  const options = commanderShellOptions([dualShellCommander], { format: "Commander" });
  assert.ok(options.length >= 2, "fixture should trigger at least two shells");
  for (const option of options) {
    const intent = intentFor(dualShellCommander, { focusPackageId: option.id });
    assert.deepEqual(intent.packageIds, [option.id], `focusing ${option.id} should include only itself`);
  }
});
