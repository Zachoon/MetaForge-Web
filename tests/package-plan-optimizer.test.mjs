import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  strategicSemanticsFor,
  validateStrategicCohesion,
} from "../app/strategic-intent.mjs";
import {
  buildPackageState,
  counterfactualPackageDelta,
  evaluatePackageHealth,
  optimizePackagePlan,
} from "../app/package-plan-optimizer.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import {
  classifyNativeCard,
  colorPipsFromCost,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const aristocratCommander = {
  name: "Test Aristocrat",
  colors: ["B"],
  oracleText: "Whenever a creature you control dies, each opponent loses 1 life. Sacrifice a creature: Draw a card.",
  typeLine: "Legendary Creature — Vampire",
  manaCost: "{2}{B}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2, manaCost, colors = ["W"]) => ({
  name,
  typeLine,
  oracleText,
  cmc,
  manaCost: manaCost || `{${Math.max(0, cmc - 1)}}{${colors[0]}}`,
  colorIdentity: colors,
  priceUsd,
});

const aura = (name, cmc = 2) => card(name, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", cmc);
const draw = (name, colors = ["W"]) => card(name, "Instant", "Draw two cards.", 3, 0.2, undefined, colors);
const removal = (name, colors = ["W"]) => card(name, "Instant", "Exile target nonland permanent.", 3, 0.2, undefined, colors);
const ramp = (name) => card(name, "Artifact", "Add one mana. Create a Treasure token.", 2, 0.2, "{2}", []);

function enriched(entry, commander = pearlEar) {
  const commanderSignals = extractMechanicalSignals(commander);
  const mechanics = extractMechanicalSignals(entry);
  return {
    quantity: 1,
    name: entry.name,
    card: entry,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    colorPips: colorPipsFromCost(entry.manaCost),
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics,
    commanderConnectionSignals: commanderSignals.rewards.filter((signal) => mechanics.produces.includes(signal)),
    sequenceStages: entry.cmc <= 2 ? ["setup"] : entry.cmc >= 5 ? ["close"] : ["convert"],
    score: 50,
  };
}

function pearlPool() {
  return [
    ...Array.from({ length: 24 }, (_, i) => aura(`Aura Piece ${i}`, 1 + (i % 3))),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => card(`Ward ${i}`, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2)),
    ...Array.from({ length: 8 }, (_, i) => card(`Threat ${i}`, "Creature — Fox", "Vigilance", 3 + (i % 3))),
  ];
}

function aristocratsIntent() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: aristocratCommander, note: "aristocrats" },
    {
      blueprint: { source: "aristocrats", requestedMechanics: ["aristocrats"], desiredRoles: ["sacrifice"], packageSignals: [], promises: [] },
      roleTargets: { ramp: 8, draw: 8, interaction: 8, protection: 4, recursion: 4, sweeper: 2 },
    },
  );
}

function forceSemantics(row, tags) {
  row.strategicSemantics = new Set(tags);
  return row;
}

test("package rebalance beats three individually attractive but structurally redundant replacements", () => {
  const intent = aristocratsIntent();
  const payoffs = Array.from({ length: 8 }, (_, i) => forceSemantics(
    enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "death_payoff"],
  ));
  const outlets = Array.from({ length: 2 }, (_, i) => forceSemantics(
    enriched(card(`Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "sacrifice_outlet"],
  ));
  const fodder = Array.from({ length: 3 }, (_, i) => forceSemantics(
    enriched(card(`Fodder ${i}`, "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "token_generator"],
  ));
  const support = [
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`, ["B"]), aristocratCommander)),
    ...Array.from({ length: 8 }, (_, i) => enriched(removal(`Answer ${i}`, ["B"]), aristocratCommander)),
    ...Array.from({ length: 6 }, (_, i) => enriched(ramp(`Stone ${i}`), aristocratCommander)),
  ];
  const rows = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...payoffs, ...outlets, ...fodder, ...support,
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const betterOutlets = Array.from({ length: 3 }, (_, i) => {
    const entry = enriched(card(`Better Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander);
    forceSemantics(entry, ["creature", "sacrifice_outlet"]);
    entry.score = 40;
    return entry;
  });
  const shinyPayoffs = Array.from({ length: 3 }, (_, i) => {
    const entry = enriched(card(`Shiny Payoff ${i}`, "Creature", "Whenever a creature you control dies, gain 2 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander);
    forceSemantics(entry, ["creature", "death_payoff"]);
    entry.score = 90;
    return entry;
  });

  const removeSet = payoffs.slice(0, 3);
  const rebalanceAdd = betterOutlets.slice(0, 2).concat(fodder.slice(0, 1).map((row) => ({
    ...enriched(card("Extra Fodder", "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    strategicSemantics: new Set(["creature", "token_generator"]),
    score: 45,
  })));
  // size-match: cut 3 payoffs, add 2 outlets + 1 fodder
  const rebalance = counterfactualPackageDelta(rows, removeSet, [
    betterOutlets[0], betterOutlets[1],
    forceSemantics(enriched(card("Extra Fodder", "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "token_generator"]),
  ], intent);
  const redundant = counterfactualPackageDelta(rows, removeSet, shinyPayoffs, intent);
  assert.ok(rebalance.total > redundant.total, `rebalance ${rebalance.total} should beat redundant shiny swaps ${redundant.total}`);
  assert.ok(rebalance.setSynergy.total >= 0);
});

test("missing package leg triggers package-level correction", () => {
  const intent = aristocratsIntent();
  const pkg = intent.packages.find((entry) => entry.id === "aristocrats");
  const payoffs = Array.from({ length: 6 }, (_, i) => forceSemantics(
    enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "death_payoff"],
  ));
  const fodder = Array.from({ length: 6 }, (_, i) => forceSemantics(
    enriched(card(`Fodder ${i}`, "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "token_generator"],
  ));
  const outlet = forceSemantics(
    enriched(card("Only Outlet", "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "sacrifice_outlet"],
  );
  const rows = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...payoffs, ...fodder, outlet,
    ...Array.from({ length: 10 }, (_, i) => enriched(draw(`Flow ${i}`, ["B"]), aristocratCommander)),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const state = buildPackageState(rows, pkg, intent);
  const health = evaluatePackageHealth(state, intent);
  assert.ok(health.issues.some((issue) => issue.kind === "missing_leg" || issue.kind === "poor_enabler_payoff_ratio"));
});

test("oversaturated package can lose members without collapsing its floor", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    { blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] } },
  );
  const pkg = intent.packages.find((entry) => entry.id === "auras");
  const auras = Array.from({ length: 24 }, (_, i) => enriched(aura(`Aura ${i}`)));
  const rows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const removeSet = auras.slice(0, 2);
  const delta = counterfactualPackageDelta(rows, removeSet, [], intent);
  const afterCore = buildPackageState(delta.afterRows, pkg, intent).density.core;
  assert.ok(afterCore >= pkg.coreMin);
  assert.ok(!delta.afterHealth.auras.issues.some((issue) => issue.kind === "underfilled"));
});

test("package-critical cards are protected from destructive bulk replacement", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    { blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] } },
  );
  const pkg = intent.packages.find((entry) => entry.id === "auras");
  const auras = Array.from({ length: pkg.coreMin }, (_, i) => enriched(aura(`Floor Aura ${i}`)));
  const rows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const junk = Array.from({ length: 3 }, (_, i) => enriched(draw(`Junk ${i}`)));
  const delta = counterfactualPackageDelta(rows, auras.slice(0, 3), junk, intent);
  assert.ok(delta.total < 0 || delta.criticalPenalty < 0 || delta.thresholdDelta < 0);
  assert.ok(delta.thresholdDelta <= -70 || delta.criticalPenalty <= -80 || delta.total < -20);
});

test("counterfactual package delta accounts for interactions among added cards", () => {
  const intent = aristocratsIntent();
  const base = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...Array.from({ length: 4 }, (_, i) => forceSemantics(enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "death_payoff"])),
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`, ["B"]), aristocratCommander)),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const outlet = forceSemantics(enriched(card("Outlet", "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "sacrifice_outlet"]);
  outlet.mechanics = { produces: ["sacrifice"], rewards: [] };
  const fodder = forceSemantics(enriched(card("Fodder", "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "token_generator"]);
  fodder.mechanics = { produces: ["tokens"], rewards: ["sacrifice"] };
  const unrelated = [
    enriched(draw("Solo Draw A", ["B"]), aristocratCommander),
    enriched(draw("Solo Draw B", ["B"]), aristocratCommander),
  ];
  const synergistic = counterfactualPackageDelta(base, [], [outlet, fodder], intent);
  const isolated = counterfactualPackageDelta(base, [], unrelated, intent);
  assert.ok(synergistic.setSynergy.internal >= isolated.setSynergy.internal);
  assert.ok(synergistic.total !== isolated.individualSum * 0.08, "set evaluation must not be a pure individual sum");
});

test("six mediocre synergistic cards can beat six stronger disconnected cards", () => {
  const intent = aristocratsIntent();
  const shell = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...Array.from({ length: 10 }, (_, i) => enriched(draw(`Flow ${i}`, ["B"]), aristocratCommander)),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const packageSet = [
    ...Array.from({ length: 2 }, (_, i) => {
      const row = forceSemantics(enriched(card(`Med Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "sacrifice_outlet"]);
      row.score = 35;
      row.mechanics = { produces: ["sacrifice"], rewards: [] };
      return row;
    }),
    ...Array.from({ length: 2 }, (_, i) => {
      const row = forceSemantics(enriched(card(`Med Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "death_payoff"]);
      row.score = 35;
      row.mechanics = { produces: [], rewards: ["sacrifice"] };
      return row;
    }),
    ...Array.from({ length: 2 }, (_, i) => {
      const row = forceSemantics(enriched(card(`Med Fodder ${i}`, "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "token_generator"]);
      row.score = 35;
      row.mechanics = { produces: ["tokens"], rewards: ["sacrifice"] };
      return row;
    }),
  ];
  const strongSet = Array.from({ length: 6 }, (_, i) => {
    const row = enriched(card(`Strong Staple ${i}`, "Creature", "Flying. Vigilance. Lifelink.", 4, 0.2, "{2}{B}{B}", ["B"]), aristocratCommander);
    row.score = 95;
    row.mechanics = { produces: [], rewards: [] };
    return row;
  });
  const packageDelta = counterfactualPackageDelta(shell, [], packageSet, intent);
  const strongDelta = counterfactualPackageDelta(shell, [], strongSet, intent);
  assert.ok(packageDelta.total > strongDelta.total, `package set ${packageDelta.total} should beat strong staples ${strongDelta.total}`);
});

test("package alternative that breaks curve structure loses despite synergy", () => {
  const intent = buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    { blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] } },
  );
  const low = Array.from({ length: 12 }, (_, i) => enriched(aura(`Aura ${i}`, 2)));
  const rows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...low,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const fatAuras = Array.from({ length: 4 }, (_, i) => enriched(aura(`Fat Aura ${i}`, 6)));
  const leanAuras = Array.from({ length: 4 }, (_, i) => enriched(aura(`Lean Aura ${i}`, 2)));
  const fat = counterfactualPackageDelta(rows, low.slice(0, 4), fatAuras, intent, {
    curveGoals: { 1: 8, 2: 14, 3: 10, 4: 8, "5+": 4 },
  });
  const lean = counterfactualPackageDelta(rows, low.slice(0, 4), leanAuras, intent, {
    curveGoals: { 1: 8, 2: 14, 3: 10, 4: 8, "5+": 4 },
  });
  assert.ok(lean.total >= fat.total);
});

test("budget constraints survive package replacement", () => {
  const intent = aristocratsIntent();
  const shell = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...Array.from({ length: 4 }, (_, i) => forceSemantics(enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "death_payoff"])),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const cheap = forceSemantics(enriched(card("Cheap Outlet", "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "sacrifice_outlet"]);
  const expensive = forceSemantics(enriched(card("Expensive Outlet", "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 40, "{1}{B}", ["B"]), aristocratCommander), ["creature", "sacrifice_outlet"]);
  expensive.card = { ...expensive.card, priceUsd: 40 };
  cheap.card = { ...cheap.card, priceUsd: 0.2 };
  const budgeted = counterfactualPackageDelta(shell, [], [cheap], intent, { budgetConstraint: true });
  const lavish = counterfactualPackageDelta(shell, [], [expensive], intent, { budgetConstraint: true });
  assert.ok(budgeted.total > lavish.total);
});

test("optimizePackagePlan stays bounded and deterministic", () => {
  const intent = aristocratsIntent();
  const payoffs = Array.from({ length: 8 }, (_, i) => forceSemantics(
    enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "death_payoff"],
  ));
  const outlets = Array.from({ length: 2 }, (_, i) => forceSemantics(
    enriched(card(`Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "sacrifice_outlet"],
  ));
  const fodder = Array.from({ length: 3 }, (_, i) => forceSemantics(
    enriched(card(`Fodder ${i}`, "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander),
    ["creature", "token_generator"],
  ));
  const poolCards = [
    ...payoffs.map((row) => row.card),
    ...outlets.map((row) => row.card),
    ...fodder.map((row) => row.card),
    ...Array.from({ length: 6 }, (_, i) => card(`Better Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"])),
    ...Array.from({ length: 8 }, (_, i) => card(`Flow ${i}`, "Instant", "Draw two cards.", 3, 0.2, "{2}{B}", ["B"])),
  ];
  const rows = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...payoffs, ...outlets, ...fodder,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`, ["B"]), aristocratCommander)),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const analysis = {
    strategicIntent: intent,
    spells: poolCards.map((entry) => {
      const row = enriched(entry, aristocratCommander);
      if (/Outlet/.test(entry.name)) forceSemantics(row, ["creature", "sacrifice_outlet"]);
      if (/Payoff/.test(entry.name)) forceSemantics(row, ["creature", "death_payoff"]);
      if (/Fodder/.test(entry.name)) forceSemantics(row, ["creature", "token_generator"]);
      return row;
    }),
  };
  const candidate = {
    id: "cohesion",
    rows,
    strategicIntent: intent,
    strategicCohesionGate: validateStrategicCohesion({ rows }, intent),
    evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 },
  };
  const first = optimizePackagePlan(candidate, analysis, { format: "Commander", budget: null }, { limits: { maxConfigs: 16 } });
  const second = optimizePackagePlan(candidate, analysis, { format: "Commander", budget: null }, { limits: { maxConfigs: 16 } });
  assert.ok(first.packagePlanOptimization.instrumentation.configsEvaluated <= 16);
  const stripRuntime = (value) => ({
    ...value,
    instrumentation: {
      alternativesConsidered: value.instrumentation.alternativesConsidered,
      candidatesPruned: value.instrumentation.candidatesPruned,
      configsEvaluated: value.instrumentation.configsEvaluated,
    },
  });
  assert.deepEqual(stripRuntime(first.packagePlanOptimization), stripRuntime(second.packagePlanOptimization));
  assert.deepEqual(
    first.rows.map((row) => `${row.quantity} ${row.name}`),
    second.rows.map((row) => `${row.quantity} ${row.name}`),
  );
});

test("final ledger and cohesion remain valid after package optimization on Pearl-Ear forge", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 91,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  });
  assert.ok(report.selected.slotJustificationLedger);
  assert.equal(report.selected.slotJustificationLedger.agreesWithCohesion, true);
  assert.equal(report.selected.strategicCohesionGate.passed, true);
  assert.ok(report.selected.packagePlanOptimization);
  assert.ok(report.selected.packagePlanOptimization.instrumentation.configsEvaluated <= 24);
});

test("search remains bounded to configured evaluation limits", () => {
  const intent = aristocratsIntent();
  const rows = [
    { quantity: 1, name: aristocratCommander.name, roles: ["commander"], cmc: 3 },
    ...Array.from({ length: 8 }, (_, i) => forceSemantics(enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "death_payoff"])),
    ...Array.from({ length: 2 }, (_, i) => forceSemantics(enriched(card(`Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "sacrifice_outlet"])),
    ...Array.from({ length: 3 }, (_, i) => forceSemantics(enriched(card(`Fodder ${i}`, "Creature", "When this enters, create a 1/1 token.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander), ["creature", "token_generator"])),
    { quantity: 40, name: "Swamp", roles: ["land"], cmc: 0 },
  ];
  const pool = Array.from({ length: 20 }, (_, i) => {
    const entry = enriched(card(`Pool Outlet ${i}`, "Creature", "{T}, Sacrifice a creature: Draw a card.", 2, 0.2, "{1}{B}", ["B"]), aristocratCommander);
    forceSemantics(entry, ["creature", "sacrifice_outlet"]);
    return entry;
  });
  const result = optimizePackagePlan(
    { id: "cohesion", rows, strategicIntent: intent, strategicCohesionGate: { passed: true } },
    { strategicIntent: intent, spells: pool },
    {},
    { limits: { maxConfigs: 8, maxRemovals: 2, maxAdditions: 2, topKPerLeg: 4, topKRemovals: 3 } },
  );
  assert.ok(result.packagePlanOptimization.instrumentation.configsEvaluated <= 8);
});
