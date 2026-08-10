import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_WEIGHT_POLICY,
  applyPhaseWeights,
  constructionPhase,
  createConstructionPhaseTracker,
  phaseAfterStructuralChange,
  phaseWeights,
} from "../app/construction-phase.mjs";
import {
  evaluateStrategicPlan,
  generateStrategicPlanCandidates,
  planDistance,
  selectStrategicPlans,
} from "../app/strategic-plan-competition.mjs";
import { buildStrategicIntent } from "../app/strategic-intent.mjs";
import { buildLiveDeficitState } from "../app/prospective-slot-delta.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import {
  classifyNativeCard,
  forgeNativeMasterwork,
} from "../app/native-masterwork-engine.mjs";
import { strategicSemanticsFor } from "../app/strategic-intent.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2) => ({
  name, typeLine, oracleText, cmc, manaCost: `{${Math.max(0, cmc - 1)}}{W}`, colorIdentity: ["W"], priceUsd,
});
const aura = (name, cmc = 2) => card(name, "Enchantment — Aura", "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.", cmc);
const draw = (name) => card(name, "Instant", "Draw two cards.", 3);
const removal = (name) => card(name, "Instant", "Exile target nonland permanent.", 3);
const ramp = (name) => card(name, "Artifact", "Add one mana. Create a Treasure token.", 2);
const protection = (name) => card(name, "Instant", "Target creature gains hexproof and indestructible until end of turn.", 2);
const recursion = (name) => card(name, "Sorcery", "Return target creature card from your graveyard to the battlefield.", 4);

function intentForPearl() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] },
      roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
      commanderMechanics: extractMechanicalSignals(pearlEar),
    },
  );
}

function enriched(entry) {
  return {
    quantity: 1,
    name: entry.name,
    card: entry,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics: extractMechanicalSignals(entry),
    commanderConnectionSignals: extractMechanicalSignals(pearlEar).rewards.filter((signal) =>
      extractMechanicalSignals(entry).produces.includes(signal)),
    score: 50,
  };
}

function pearlPool() {
  return [
    ...Array.from({ length: 24 }, (_, i) => aura(`Aura Piece ${i}`, 1 + (i % 3))),
    ...Array.from({ length: 12 }, (_, i) => draw(`Flow ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => removal(`Answer ${i}`)),
    ...Array.from({ length: 12 }, (_, i) => ramp(`Stone ${i}`)),
    ...Array.from({ length: 10 }, (_, i) => protection(`Ward ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => recursion(`Return ${i}`)),
    ...Array.from({ length: 8 }, (_, i) => card(`Threat ${i}`, "Creature — Fox", "Vigilance", 3)),
  ];
}

test("structural deficits dominate raw score during foundation phase", () => {
  const foundation = applyPhaseWeights({
    rawScore: 95,
    prospectiveDelta: 20,
    synergy: 0,
    orphanPenalty: 0,
    disconnectTax: 0,
    phase: "foundation",
  });
  const structural = applyPhaseWeights({
    rawScore: 40,
    prospectiveDelta: 80,
    synergy: 0,
    orphanPenalty: 0,
    disconnectTax: 0,
    phase: "foundation",
  });
  assert.ok(structural.adjusted > foundation.adjusted);
  assert.equal(phaseWeights("foundation").rawQuality, PHASE_WEIGHT_POLICY.foundation.rawQuality);
});

test("raw quality gains relative importance once mandatory floors are satisfied", () => {
  const early = applyPhaseWeights({ rawScore: 90, prospectiveDelta: 30, phase: "foundation" });
  const late = applyPhaseWeights({ rawScore: 90, prospectiveDelta: 30, phase: "completion" });
  assert.ok(late.adjusted > early.adjusted);
  assert.ok(PHASE_WEIGHT_POLICY.completion.rawQuality > PHASE_WEIGHT_POLICY.foundation.rawQuality);
});

test("missing package leg prevents premature refinement phase", () => {
  const intent = intentForPearl();
  // Simulate satisfied aura core but missing nothing for auras (no legs).
  // Use aristocrats-like leg deficit via synthetic deficit state.
  const deficitState = {
    packages: {
      aristocrats: {
        core: { deficit: 0, surplus: 2, current: 10, target: 8, status: "satisfied" },
        support: { deficit: 0, surplus: 0, current: 4, target: 4, status: "satisfied" },
        legs: {
          sacrifice_outlet: { deficit: 2, surplus: 0, current: 1, target: 3 },
          death_payoff: { deficit: 0, surplus: 4, current: 7, target: 3 },
        },
      },
    },
    roles: {
      ramp: { deficit: 0, surplus: 0, current: 10, target: 10, status: "satisfied" },
      draw: { deficit: 0, surplus: 0, current: 10, target: 10, status: "satisfied" },
      interaction: { deficit: 0, surplus: 0, current: 10, target: 10, status: "satisfied" },
      protection: { deficit: 0, surplus: 0, current: 5, target: 5, status: "satisfied" },
      recursion: { deficit: 0, surplus: 0, current: 4, target: 4, status: "satisfied" },
      sweeper: { deficit: 0, surplus: 0, current: 2, target: 2, status: "satisfied" },
    },
    commanderConnections: 8,
    underfilledCurveBands: [],
    congestedCurveBands: [],
  };
  const phase = constructionPhase(deficitState, Array.from({ length: 40 }, () => ({ roles: ["threat"], quantity: 1 })), intent);
  assert.equal(phase.phase, "development");
  assert.ok(phase.reasons.some((reason) => /leg/i.test(reason)));
});

test("phase can regress after a destructive simulated change", () => {
  const intent = intentForPearl();
  const healthy = {
    packages: { auras: { core: { deficit: 0, surplus: 2, current: 18, target: 16, status: "satisfied" }, support: { deficit: 0 }, legs: {} } },
    roles: Object.fromEntries(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"].map((role) => [role, { deficit: 0, surplus: 0, current: 10, target: 10, status: "satisfied" }])),
    commanderConnections: 8,
    underfilledCurveBands: [],
    congestedCurveBands: [],
  };
  const damaged = {
    ...healthy,
    packages: { auras: { core: { deficit: 8, surplus: 0, current: 8, target: 16, status: "deficient" }, support: { deficit: 0 }, legs: {} } },
  };
  const result = phaseAfterStructuralChange(healthy, damaged, intent);
  assert.equal(result.regressed, true);
  assert.equal(result.phase, "foundation");
});

test("phase outputs and transitions are deterministic", () => {
  const intent = intentForPearl();
  const tracker = createConstructionPhaseTracker();
  const partial = Array.from({ length: 5 }, (_, i) => enriched(aura(`Aura ${i}`)));
  const state = buildLiveDeficitState(partial, intent, {
    roleTargets: intent.roleTargets,
    curveGoals: { 1: 8, 2: 12, 3: 10, 4: 8, "5+": 6 },
  });
  const first = constructionPhase(state, partial, intent, { spellTarget: 63 });
  const second = constructionPhase(state, partial, intent, { spellTarget: 63 });
  assert.deepEqual(first, second);
  tracker.observe(first, { card: { name: "Aura 0" }, score: 40 }, { total: 50, deficitsFilled: ["package_core:auras"] });
  tracker.observe(first, { card: { name: "Aura 1" }, score: 41 }, { total: 48, deficitsFilled: ["package_core:auras"] });
  const snapA = tracker.snapshot();
  const trackerB = createConstructionPhaseTracker();
  trackerB.observe(first, { card: { name: "Aura 0" }, score: 40 }, { total: 50, deficitsFilled: ["package_core:auras"] });
  trackerB.observe(first, { card: { name: "Aura 1" }, score: 41 }, { total: 48, deficitsFilled: ["package_core:auras"] });
  assert.deepEqual(snapA.summary, trackerB.snapshot().summary);
});

test("phase diagnostics describe transition reasons", () => {
  const intent = intentForPearl();
  const empty = buildLiveDeficitState([], intent, { roleTargets: intent.roleTargets });
  const phase = constructionPhase(empty, [], intent, { spellTarget: 63 });
  assert.equal(phase.phase, "foundation");
  assert.ok(phase.reasons.length >= 1);
});

test("two legitimate supporting plans are generated when evidence exists for both", () => {
  const intent = intentForPearl();
  const spells = pearlPool().map((entry) => enriched(entry));
  const generated = generateStrategicPlanCandidates({ spells }, intent, {});
  const supportPlans = generated.plans.filter((plan) => (plan.supportingProfiles || []).length);
  assert.ok(supportPlans.length >= 2, `expected multiple support plans, got ${supportPlans.map((plan) => plan.id).join(",")}`);
  assert.ok(supportPlans.some((plan) => plan.supportingProfiles.includes("protection_support")));
});

test("unsupported thematic plan is not generated from broad type overlap alone", () => {
  const intent = intentForPearl();
  // Creature-heavy pool without aristocrats/recursion evidence.
  const spells = Array.from({ length: 40 }, (_, i) => enriched(card(`Bear ${i}`, "Creature — Bear", "Vigilance", 2)));
  const generated = generateStrategicPlanCandidates({ spells }, intent, {});
  assert.ok(!generated.plans.some((plan) => (plan.supportingProfiles || []).includes("recursion_support") && plan.evidence.reasons.some((reason) => /aristocrats/i.test(reason))));
  // Aristocrats must not appear as a primary plan without intent evidence.
  assert.ok(!generated.plans.some((plan) => (plan.primaryPackages || []).includes("aristocrats")));
});

test("plan with better commander/package structure beats higher raw-score plan", () => {
  const intent = intentForPearl();
  const spells = pearlPool().map((entry) => enriched(entry));
  const structured = {
    id: "structured",
    primaryPackages: ["auras"],
    supportingProfiles: ["protection_support"],
    supportProfile: { id: "protection_support", roles: ["protection"], require: { minRoleCards: 6 }, packageAffinity: ["auras"], signals: ["protection"] },
    expectedSlotAllocation: { estimatedNonlandPressure: 55 },
    confidence: 0.8,
    evidence: { score: 50, reasons: [] },
  };
  const rawHeavy = {
    id: "raw",
    primaryPackages: [],
    supportingProfiles: ["engine_value"],
    supportProfile: { id: "engine_value", roles: ["draw"], require: { minRoleCards: 8 }, packageAffinity: [], signals: [] },
    expectedSlotAllocation: { estimatedNonlandPressure: 55 },
    confidence: 0.5,
    evidence: { score: 10, reasons: [] },
  };
  const a = evaluateStrategicPlan(structured, { spells }, intent);
  const b = evaluateStrategicPlan(rawHeavy, { spells }, intent);
  assert.ok(a.predictedScore > b.predictedScore);
});

test("plan with impossible slot pressure loses", () => {
  const intent = intentForPearl();
  const spells = pearlPool().map((entry) => enriched(entry));
  const plan = {
    id: "pressure",
    primaryPackages: ["auras"],
    supportingProfiles: [],
    expectedSlotAllocation: { estimatedNonlandPressure: 90 },
    confidence: 0.7,
    evidence: { score: 40, reasons: [] },
  };
  const evaluation = evaluateStrategicPlan(plan, { spells }, intent, { spellTarget: 63 });
  assert.equal(evaluation.reject, true);
});

test("plan with insufficient candidate depth receives low confidence or rejection path", () => {
  const intent = intentForPearl();
  const spells = Array.from({ length: 5 }, (_, i) => enriched(protection(`Ward ${i}`)));
  const plan = {
    id: "thin",
    primaryPackages: ["auras"],
    supportingProfiles: ["protection_support"],
    supportProfile: { id: "protection_support", roles: ["protection"], require: { minRoleCards: 6 }, packageAffinity: ["auras"], signals: ["protection"] },
    expectedSlotAllocation: { estimatedNonlandPressure: 50 },
    confidence: 0.8,
    evidence: { score: 40, reasons: [] },
  };
  const evaluation = evaluateStrategicPlan(plan, { spells }, intent);
  assert.ok(evaluation.predictedScore < 40 || evaluation.reasons.some((reason) => /insufficient support/i.test(reason)));
});

test("budget constraints affect plan feasibility before full construction", () => {
  const intent = intentForPearl();
  const expensive = pearlPool().map((entry) => enriched({ ...entry, priceUsd: 20 }));
  const evaluation = evaluateStrategicPlan(
    {
      id: "budget",
      primaryPackages: ["auras"],
      supportingProfiles: [],
      expectedSlotAllocation: { estimatedNonlandPressure: 50 },
      confidence: 0.7,
      evidence: { score: 40, reasons: [] },
    },
    { spells: expensive },
    intent,
    { budgetConstraint: true },
  );
  assert.ok(evaluation.reasons.some((reason) => /budget/i.test(reason)));
});

test("near-identical plans are deduplicated; distinct plans survive", () => {
  const left = { primaryPackages: ["auras"], supportingProfiles: ["protection_support"] };
  const right = { primaryPackages: ["auras"], supportingProfiles: ["protection_support"] };
  const other = { primaryPackages: ["auras"], supportingProfiles: ["recursion_support"] };
  assert.ok(planDistance(left, right) < 0.34);
  assert.ok(planDistance(left, other) >= 0.34);
});

test("forge attaches phase diagnostics and plan competition metadata", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    seed: 101,
    commander: pearlEar,
    note: "focus on auras",
    cards: pearlPool(),
  });
  assert.ok(report.selected.constructionPhaseDiagnostics);
  assert.ok(report.selected.constructionPhaseDiagnostics.summary);
  assert.ok(report.planCompetition);
  assert.ok(report.planCompetition.built >= 1);
  assert.ok(report.planCompetition.built <= 3);
  assert.equal(report.selected.strategicCohesionGate.passed, true);
  assert.ok(report.selected.slotJustificationLedger);
});

test("selectStrategicPlans remains bounded and deterministic", () => {
  const intent = intentForPearl();
  const spells = pearlPool().map((entry) => enriched(entry));
  const analysis = { spells, strategicIntent: intent };
  const first = selectStrategicPlans(analysis, intent, {}, { limits: { maxBuilt: 3 } });
  const second = selectStrategicPlans(analysis, intent, {}, { limits: { maxBuilt: 3 } });
  assert.ok(first.selected.length <= 3);
  assert.deepEqual(
    first.selected.map((entry) => entry.plan.id),
    second.selected.map((entry) => entry.plan.id),
  );
});
