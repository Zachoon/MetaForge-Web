import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStrategicIntent,
  strategicSemanticsFor,
} from "../app/strategic-intent.mjs";
import {
  buildLiveDeficitState,
  counterfactualSwapDelta,
  marginalUtility,
  prospectiveSlotDelta,
} from "../app/prospective-slot-delta.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { rankOneSlotCounterfactuals } from "../app/native-one-slot-lab.mjs";
import {
  classifyNativeCard,
  colorPipsFromCost,
  forgeNativeMasterwork,
  repairBudgetOffenders,
} from "../app/native-masterwork-engine.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2, manaCost) => ({
  name,
  typeLine,
  oracleText,
  cmc,
  manaCost: manaCost || `{${Math.max(0, cmc - 1)}}{W}`,
  colorIdentity: ["W"],
  priceUsd,
});

const aura = (name, cmc = 2, oracle = "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.") =>
  card(name, "Enchantment — Aura", oracle, cmc);
const genericEnchantment = (name, cmc = 3) =>
  card(name, "Enchantment", "Creatures you control get +1/+1.", cmc);
const draw = (name) => card(name, "Instant", "Draw two cards.", 3);
const removal = (name) => card(name, "Instant", "Exile target nonland permanent.", 3);
const ramp = (name) => card(name, "Artifact", "Add one mana. Create a Treasure token.", 2, 0.2, "{2}");
const protection = (name) => card(name, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2);
const ulamog = card("Ulamog, the Ceaseless Hunger", "Legendary Creature — Eldrazi", "When you cast this spell, exile two target permanents.", 10, 25, "{10}");

function intentForPearl() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] },
      roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    },
  );
}

function intentForAristocrats() {
  const commander = {
    name: "Test Aristocrat",
    colors: ["B"],
    oracleText: "Whenever a creature you control dies, each opponent loses 1 life. Sacrifice a creature: Draw a card.",
    typeLine: "Legendary Creature — Vampire",
    manaCost: "{2}{B}",
  };
  return {
    commander,
    intent: buildStrategicIntent(
      { format: "Commander", strategy: "Balanced midrange", commander, note: "aristocrats" },
      {
        blueprint: { source: "aristocrats", requestedMechanics: ["aristocrats"], desiredRoles: ["sacrifice"], packageSignals: [], promises: [] },
        roleTargets: { ramp: 8, draw: 8, interaction: 8, protection: 4, recursion: 4, sweeper: 2 },
      },
    ),
  };
}

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
    ...Array.from({ length: 8 }, (_, i) => genericEnchantment(`Enchant Soup ${i}`, 3)),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => card(`Threat ${i}`, "Creature — Fox", "Vigilance", 3 + (i % 3))),
  ];
}

test("candidate filling unmet package core beats higher raw-score candidate that fills no deficit", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Have Aura ${i}`)));
  const deficitAura = enriched(aura("Needed Aura", 2));
  const rawPower = enriched(card("Raw Staple", "Creature — Angel", "Flying. Vigilance.", 4));
  rawPower.score = 95;
  deficitAura.score = 40;
  const auraDelta = prospectiveSlotDelta(partial, deficitAura, intent, {
    roleTargets: intent.roleTargets,
    curveGoals: { 1: 8, 2: 12, 3: 12, 4: 8, "5+": 8 },
  });
  const stapleDelta = prospectiveSlotDelta(partial, rawPower, intent, {
    roleTargets: intent.roleTargets,
    curveGoals: { 1: 8, 2: 12, 3: 12, 4: 8, "5+": 8 },
  });
  const auraAdjusted = deficitAura.score * 0.42 + auraDelta.total;
  const stapleAdjusted = rawPower.score * 0.42 + stapleDelta.total;
  assert.ok(auraDelta.deficitsFilled.some((entry) => entry.includes("package_core:auras")));
  assert.ok(auraAdjusted > stapleAdjusted, `aura ${auraAdjusted} should beat staple ${stapleAdjusted}`);
});

test("once package floor is satisfied, additional copies receive diminishing marginal value", () => {
  const intent = intentForPearl();
  const short = Array.from({ length: 10 }, (_, i) => enriched(aura(`Short ${i}`)));
  const saturated = Array.from({ length: 22 }, (_, i) => enriched(aura(`Full ${i}`)));
  const candidate = enriched(aura("Another Aura", 2));
  const shortDelta = prospectiveSlotDelta(short, candidate, intent);
  const saturatedDelta = prospectiveSlotDelta(saturated, candidate, intent);
  const shortCore = shortDelta.positives.find((entry) => entry.kind === "package_core");
  const satCore = saturatedDelta.positives.find((entry) => entry.kind === "package_core");
  assert.ok(shortCore.weight > satCore.weight, `deficit weight ${shortCore.weight} should exceed surplus ${satCore.weight}`);
  assert.ok(marginalUtility(6, 0, 26) > marginalUtility(0, 10, 26));
});

test("missing package leg is prioritized over an already oversupplied package leg", () => {
  const { intent } = intentForAristocrats();
  assert.ok(intent.packageIds.includes("aristocrats"), "aristocrats package must be active");
  const shell = [
    ...Array.from({ length: 6 }, (_, i) => {
      const row = enriched(card(`Payoff ${i}`, "Creature", "Whenever a creature you control dies, each opponent loses 1 life.", 2));
      row.strategicSemantics = new Set(["creature", "death_payoff"]);
      return row;
    }),
    ...Array.from({ length: 6 }, (_, i) => {
      const row = enriched(card(`Token ${i}`, "Creature", "When this enters, create a 1/1 token.", 2));
      row.strategicSemantics = new Set(["creature", "token_generator"]);
      return row;
    }),
    (() => {
      const row = enriched(card("One Outlet", "Creature", "{T}, Sacrifice a creature: Add {B}.", 2));
      row.strategicSemantics = new Set(["creature", "sacrifice_outlet"]);
      return row;
    })(),
  ];
  const morePayoff = enriched(card("Extra Payoff", "Creature", "Whenever a creature you control dies, gain 1 life.", 2));
  morePayoff.strategicSemantics = new Set(["creature", "death_payoff"]);
  const missingOutlet = enriched(card("Needed Outlet", "Creature", "{T}, Sacrifice a creature: Draw a card.", 2));
  missingOutlet.strategicSemantics = new Set(["creature", "sacrifice_outlet"]);
  const payoffDelta = prospectiveSlotDelta(shell, morePayoff, intent);
  const outletDelta = prospectiveSlotDelta(shell, missingOutlet, intent);
  assert.ok(outletDelta.total > payoffDelta.total, `outlet ${outletDelta.total} should beat payoff ${payoffDelta.total}`);
  assert.ok(outletDelta.deficitsFilled.some((entry) => entry.includes("sacrifice_outlet")) || outletDelta.positives.some((entry) => entry.kind === "package_leg"));
});

test("commander-connected candidate beats unrelated raw-power candidate when otherwise comparable", () => {
  const intent = intentForPearl();
  const partial = [
    ...Array.from({ length: 16 }, (_, i) => enriched(aura(`Aura ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(draw(`Flow ${i}`))),
  ];
  const connected = enriched(aura("Connected Aura", 2));
  const bomb = enriched(ulamog);
  bomb.commanderConnectionSignals = [];
  const connectedDelta = prospectiveSlotDelta(partial, connected, intent);
  const bombDelta = prospectiveSlotDelta(partial, bomb, intent);
  assert.ok(connectedDelta.total > bombDelta.total);
  assert.ok(bombDelta.unsupportedHighCmcRisk);
});

test("unsupported anchor is penalized during selection rather than only final validation", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 4 }, (_, i) => enriched(draw(`Flow ${i}`)));
  const orphanPayoff = enriched(card("Orphan Payoff", "Enchantment", "Creatures you control get +1/+1.", 3));
  orphanPayoff.mechanics = { produces: [], rewards: ["auras"] };
  orphanPayoff.commanderConnectionSignals = [];
  orphanPayoff.strategicSemantics = new Set(["enchantment", "non_aura_enchantment"]);
  orphanPayoff.roles = ["threat"];
  const delta = prospectiveSlotDelta(partial, orphanPayoff, intent);
  assert.ok(delta.unsupportedAnchorRisk || delta.negatives.some((entry) => entry.kind === "interaction_missing" || entry.kind === "unsupported_anchor" || entry.kind === "orphan_payoff"));
  assert.ok(delta.total < 10, `orphan payoff should be weak prospectively, got ${delta.total}`);
});

test("curve congestion affects prospective ranking", () => {
  const intent = intentForPearl();
  const congested = Array.from({ length: 18 }, (_, i) => enriched(card(`Fat ${i}`, "Creature — Beast", "Trample", 6)));
  const low = enriched(aura("Cheap Aura", 1));
  const high = enriched(card("Another Fat", "Creature — Beast", "Trample", 6));
  const options = { curveGoals: { 1: 10, 2: 12, 3: 10, 4: 8, "5+": 6 }, roleTargets: intent.roleTargets };
  const lowDelta = prospectiveSlotDelta(congested, low, intent, options);
  const highDelta = prospectiveSlotDelta(congested, high, intent, options);
  assert.ok(lowDelta.total > highDelta.total);
  assert.ok(highDelta.negatives.some((entry) => entry.kind === "curve_congestion"));
});

test("multifunction candidate filling multiple genuine deficits receives appropriate advantage", () => {
  const intent = intentForPearl();
  const partial = [
    ...Array.from({ length: 8 }, (_, i) => enriched(aura(`Aura ${i}`))),
    ...Array.from({ length: 2 }, (_, i) => enriched(draw(`Flow ${i}`))),
  ];
  const multi = enriched(aura("Protective Aura", 2, "Enchant creature. Enchanted creature gets +1/+1 and has hexproof and indestructible."));
  multi.roles = [...new Set([...multi.roles, "protection"])];
  const plainDraw = enriched(draw("Only Draw"));
  const multiDelta = prospectiveSlotDelta(partial, multi, intent, {
    roleTargets: intent.roleTargets,
    curveGoals: { 1: 8, 2: 14, 3: 10, 4: 8, "5+": 6 },
  });
  const drawDelta = prospectiveSlotDelta(partial, plainDraw, intent, {
    roleTargets: intent.roleTargets,
    curveGoals: { 1: 8, 2: 14, 3: 10, 4: 8, "5+": 6 },
  });
  assert.ok(multiDelta.deficitsFilled.length >= 2);
  assert.ok(multiDelta.total > drawDelta.total);
});

test("false-friend candidate does not satisfy the precise deficit", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Aura ${i}`)));
  const falseFriend = enriched(genericEnchantment("Soup"));
  const real = enriched(aura("Real Aura"));
  const falseDelta = prospectiveSlotDelta(partial, falseFriend, intent);
  const realDelta = prospectiveSlotDelta(partial, real, intent);
  assert.equal(falseDelta.falseFriendRisk, true);
  assert.ok(!falseDelta.deficitsFilled.includes("package_core:auras"));
  assert.ok(realDelta.deficitsFilled.includes("package_core:auras"));
  assert.ok(realDelta.total > falseDelta.total);
});

test("one-slot lab ranks by whole-deck delta rather than isolated card score", () => {
  const intent = intentForPearl();
  const auras = Array.from({ length: 16 }, (_, i) => enriched(aura(`Aura ${i}`)));
  const support = [
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    ...Array.from({ length: 8 }, (_, i) => enriched(removal(`Answer ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(ramp(`Stone ${i}`))),
  ];
  const selectedRows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras,
    ...support,
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const rivalAura = enriched(aura("Rival Aura"));
  const rivalRows = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras.slice(1),
    rivalAura,
    ...support,
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const ranked = rankOneSlotCounterfactuals(
    { id: "cohesion", rows: selectedRows, strategicIntent: intent, score: 70 },
    [
      { id: "cohesion", rows: selectedRows, score: 70 },
      { id: "resilience", rows: rivalRows, score: 68 },
    ],
    { format: "Commander", strategy: "Balanced midrange", target: 100, strategicIntent: intent, limit: 3 },
  );
  assert.ok(ranked.experiments.length >= 1);
  assert.ok(ranked.experiments[0].strategicDelta);
});

test("swapping a package-critical card shows strongly negative counterfactual delta", () => {
  const intent = intentForPearl();
  const auras = Array.from({ length: intent.packages.find((pkg) => pkg.id === "auras").coreMin }, (_, i) =>
    enriched(aura(`Floor Aura ${i}`)));
  const before = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const cut = auras[0];
  const add = enriched(genericEnchantment("Soup Replacement"));
  const after = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...auras.slice(1),
    add,
    ...Array.from({ length: 8 }, (_, i) => enriched(draw(`Flow ${i}`))),
    { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
  ];
  const delta = counterfactualSwapDelta(before, after, cut, add, intent, { roleTargets: intent.roleTargets });
  assert.ok(delta.total < -20, `critical collapse should be strongly negative, got ${delta.total}`);
  assert.ok(delta.packageThresholds.some((entry) => entry.kind === "collapsed"));
});

test("prospective selection and final justification/cohesion agree on package floors", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 77,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  });
  const selected = report.selected;
  const ledger = selected.slotJustificationLedger;
  const cohesion = selected.strategicCohesionGate;
  assert.equal(ledger.agreesWithCohesion, true);
  assert.equal(cohesion.passed, true);
  assert.equal(ledger.packageCounts.auras.core, cohesion.packages.find((pkg) => pkg.id === "auras").coreCount);
  assert.ok(ledger.packageCounts.auras.core >= cohesion.packages.find((pkg) => pkg.id === "auras").coreTarget
    || cohesion.packages.find((pkg) => pkg.id === "auras").status === "honored");
});

test("deterministic seed produces deterministic selections and delta objects", () => {
  const input = {
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 88,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  };
  const first = forgeNativeMasterwork(input).selected;
  const second = forgeNativeMasterwork(input).selected;
  assert.deepEqual(
    first.rows.map((row) => `${row.quantity} ${row.name}`),
    second.rows.map((row) => `${row.quantity} ${row.name}`),
  );
  const firstDeltas = first.rows
    .filter((row) => row.prospectiveDelta)
    .map((row) => ({ name: row.name, ...row.prospectiveDelta }));
  const secondDeltas = second.rows
    .filter((row) => row.prospectiveDelta)
    .map((row) => ({ name: row.name, ...row.prospectiveDelta }));
  assert.deepEqual(firstDeltas, secondDeltas);
});

test("existing repair-preservation behavior remains green under prospective selection", () => {
  const filler = [
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 6 }, (_, i) => protection(`Ward ${i}`)),
  ];
  const expensiveAura = aura("Premium Aura", 2);
  expensiveAura.priceUsd = 40;
  const cheapAura = aura("Cheap Aura", 2);
  cheapAura.priceUsd = 0.05;
  const cheapEnchantment = genericEnchantment("Cheap Enchantment", 2);
  cheapEnchantment.priceUsd = 0.05;
  const cards = [...filler, expensiveAura, cheapAura, cheapEnchantment];
  const nonlands = [
    { quantity: 1, name: pearlEar.name, roles: ["commander"], cmc: 2 },
    ...filler.map((entry) => enriched(entry)),
    enriched(expensiveAura),
  ];
  const rows = [...nonlands, { quantity: 100 - nonlands.length, name: "Plains", roles: ["land"], cmc: 0 }];
  const repaired = repairBudgetOffenders({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 7,
    commander: pearlEar,
    budget: "Budget conscious",
    cards,
  }, { id: "cohesion", label: "cohesion", rows, evaluation: { score: 70, roleCoverage: 1, curveHealth: 80 }, score: 70 });
  if (repaired.budgetRepair.appliedCount > 0) {
    assert.ok(!repaired.candidate.rows.some((row) => row.name === cheapEnchantment.name));
    assert.ok(repaired.candidate.rows.some((row) => row.name === cheapAura.name));
  }
});

test("live deficit state reports package and role shortages", () => {
  const intent = intentForPearl();
  const state = buildLiveDeficitState(
    Array.from({ length: 5 }, (_, i) => enriched(aura(`Aura ${i}`))),
    intent,
    { roleTargets: intent.roleTargets, curveGoals: { 2: 12, "5+": 4 } },
  );
  assert.equal(state.packages.auras.core.status, "deficient");
  assert.ok(state.packages.auras.core.deficit >= 10);
  assert.equal(state.roles.draw.status, "deficient");
});
