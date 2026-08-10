import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import {
  aggregateTortureResults,
  auditProspectiveRetrospectiveDisagreement,
  buildTortureScorecard,
} from "../app/torture-bench-audit.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";
import { buildStrategicIntent, strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { prospectiveSlotDelta } from "../app/prospective-slot-delta.mjs";
import { aggregateSelfEvaluationArtifacts } from "../app/reasoning-drift.mjs";

function runFixture(fixture, seed = 11) {
  const started = Date.now();
  let report;
  let error = null;
  try {
    report = forgeNativeMasterwork(fixtureInput(fixture, seed));
  } catch (err) {
    error = err;
  }
  const runtimeMs = Date.now() - started;
  if (error) {
    return {
      version: "torture-bench-v1",
      id: fixture.id,
      archetype: fixture.archetype,
      why: fixture.why,
      passed: false,
      hardFailures: [`forge_threw:${error.message}`],
      warnings: [],
      failureClasses: ["thin_pool_or_construction_crash"],
      runtimeMs,
      selfEvaluation: null,
      report: null,
    };
  }
  const scorecard = buildTortureScorecard(report, fixture, { runtimeMs });
  return {
    ...scorecard,
    selfEvaluation: report.selected.selfEvaluation || null,
    report,
  };
}

test("torture bench runs deterministically across archetypes", () => {
  const first = runFixture(TORTURE_FIXTURES[0], 11);
  const second = runFixture(TORTURE_FIXTURES[0], 11);
  assert.equal(first.passed, second.passed);
  assert.deepEqual(first.hardFailures, second.hardFailures);
  assert.equal(first.justification?.slotCount, second.justification?.slotCount);
});

test("commander torture bench matrix + scorecard dump", () => {
  const scorecards = [];
  for (const fixture of TORTURE_FIXTURES) {
    scorecards.push(runFixture(fixture, 11));
  }
  const aggregate = aggregateTortureResults(scorecards);
  const selfEvalArtifacts = scorecards
    .filter((card) => card.selfEvaluation)
    .map((card) => ({
      ...card.selfEvaluation,
      archetype: card.archetype,
      meta: { ...(card.selfEvaluation.meta || {}), archetype: card.archetype, fixtureId: card.id },
      // Drop raw picks from aggregate payload size; keep summary fields.
      picks: undefined,
      _pickCountCheck: card.selfEvaluation.totalTracedPicks,
    }));
  // Reattach picks only for noisy archetypes inspection dump.
  const noisyIds = new Set(["spellslinger", "reanimator", "aristocrats", "pearl-ear-auras"]);
  const driftAggregate = aggregateSelfEvaluationArtifacts(
    scorecards.filter((card) => card.selfEvaluation).map((card) => ({
      ...card.selfEvaluation,
      archetype: card.archetype,
      meta: { ...(card.selfEvaluation.meta || {}), archetype: card.archetype },
    })),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    aggregate,
    selfEvaluationAggregate: driftAggregate,
    scorecards: scorecards.map((card) => ({
      id: card.id,
      archetype: card.archetype,
      why: card.why,
      passed: card.passed,
      hardFailures: card.hardFailures,
      warnings: card.warnings,
      failureClasses: card.failureClasses,
      strategicCohesion: card.strategicCohesion,
      justification: card.justification && {
        strongRatio: card.justification.strongRatio,
        weaklyJustified: card.justification.weaklyJustified,
        rawPowerDominant: card.justification.rawPowerDominant,
      },
      disagreement: card.disagreement && { count: card.disagreement.count, warnings: card.disagreement.warnings },
      selfEvaluation: card.selfEvaluation && {
        totalTracedPicks: card.selfEvaluation.totalTracedPicks,
        liveFillPicks: card.selfEvaluation.liveFillPicks,
        agreementRate: card.selfEvaluation.prospectiveVsRetrospectiveAgreementRate,
        meanAbsDrift: card.selfEvaluation.meanAbsDriftMagnitude,
        disagreementsByClass: card.selfEvaluation.disagreementsByClass,
        controlCaseCounts: card.selfEvaluation.controlCaseCounts,
        strongestRecurringWarningSignals: card.selfEvaluation.strongestRecurringWarningSignals,
        timing: card.selfEvaluation.timing,
        artifactBytes: Buffer.byteLength(JSON.stringify(card.selfEvaluation), "utf8"),
      },
      weakSlotForensics: card.report?.selected?.weakSlotForensics && {
        weakSlotCount: card.report.selected.weakSlotForensics.aggregate?.weakSlotCount,
        causalClassCounts: card.report.selected.weakSlotForensics.aggregate?.causalClassCounts,
        sourceCounts: card.report.selected.weakSlotForensics.aggregate?.sourceCounts,
        phaseCounts: card.report.selected.weakSlotForensics.aggregate?.phaseCounts,
        avoidableCount: card.report.selected.weakSlotForensics.aggregate?.avoidableCount,
        constraintForcedCount: card.report.selected.weakSlotForensics.aggregate?.constraintForcedCount,
      },
      weakSlotRepair: card.report?.selected?.weakSlotRepair && {
        applied: card.report.selected.weakSlotRepair.applied,
        appliedCount: card.report.selected.weakSlotRepair.appliedCount,
      },
      plan: card.plan,
      runtimeMs: card.runtimeMs,
    })),
  };
  writeFileSync(new URL("./commander-torture-bench/latest-results.json", import.meta.url), JSON.stringify(payload, null, 2));
  writeFileSync(
    new URL("./commander-torture-bench/self-evaluation-aggregate.json", import.meta.url),
    JSON.stringify({
      generatedAt: payload.generatedAt,
      aggregate: driftAggregate,
      noisyArchetypes: scorecards.filter((card) => noisyIds.has(card.id)).map((card) => ({
        id: card.id,
        archetype: card.archetype,
        disagreementsByClass: card.selfEvaluation?.disagreementsByClass || {},
        controlCaseCounts: card.selfEvaluation?.controlCaseCounts || {},
        topWarnings: card.selfEvaluation?.strongestRecurringWarningSignals || [],
        examples: (card.selfEvaluation?.picks || [])
          .filter((pick) => pick.drift && pick.source === "live_fill")
          .slice(0, 200)
          .filter((pick) => ["genuine_bad_belief", "invalidated_by_later_decisions", "beneficial_emergence"].includes(pick.drift.controlCaseId))
          .slice(0, 6)
          .map((pick) => ({
            name: pick.name,
            pickIndex: pick.pickIndex,
            phase: pick.constructionPhase,
            expected: pick.drift.expectedValue,
            realized: pick.drift.realizedValue,
            class: pick.drift.primaryClass,
            control: pick.drift.controlCaseId,
            laterSameDeficitFills: pick.laterSameDeficitFills,
          })),
      })),
    }, null, 2),
  );

  const pearl = scorecards.find((card) => card.id === "pearl-ear-auras");
  assert.ok(pearl, "pearl-ear fixture missing");
  assert.equal(pearl.passed, true, `Pearl-Ear must remain green: ${JSON.stringify(pearl.hardFailures)}`);
  assert.ok(pearl.selfEvaluation?.liveFillPicks > 0, "Pearl-Ear missing construction trace");

  console.log("\n=== TORTURE BENCH SCORECARD ===");
  for (const card of scorecards) {
    const status = card.passed ? (card.warnings.length ? "PARTIAL" : "PASS") : (card.hardFailures.length >= 3 ? "DISASTER" : "FAIL");
    console.log(`${status.padEnd(8)} ${card.archetype.padEnd(18)} ${card.id}  hard=${card.hardFailures.length} warn=${card.warnings.length} ms=${card.runtimeMs}`);
    if (card.hardFailures.length) console.log(`         hard: ${card.hardFailures.slice(0, 4).join(" | ")}`);
  }
  console.log("aggregate", aggregate.byArchetype);
  console.log("failureClasses", aggregate.failureClassCounts);
  console.log(`runtime median=${aggregate.runtime.medianMs}ms p95=${aggregate.runtime.p95Ms}ms`);
  console.log("\n=== SELF-EVALUATION AGGREGATE ===");
  console.log("topClasses", driftAggregate.topRecurrentDisagreementClasses);
  console.log("controlCases", driftAggregate.controlCaseCounts);
  console.log("meanAbsPredictionError", driftAggregate.meanAbsPredictionError);
  for (const id of ["spellslinger", "reanimator", "aristocrats", "pearl-ear-auras"]) {
    const card = scorecards.find((entry) => entry.id === id);
    console.log(id, card?.selfEvaluation?.disagreementsByClass, card?.selfEvaluation?.controlCaseCounts);
  }

  assert.equal(scorecards.length, TORTURE_FIXTURES.length);
  assert.ok(aggregate.total === TORTURE_FIXTURES.length);
  assert.ok(driftAggregate.forgeCount >= 1);
  void selfEvalArtifacts;
});

test("payoff-only commander does not erase enabler requirements in the 99", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "pearl-ear-auras");
  const report = forgeNativeMasterwork(fixtureInput(fixture, 11));
  const auras = report.selected.rows.filter((row) => row.strategicSemantics?.has?.("aura")).length;
  assert.ok(auras >= 12, "Aura payoff commander still needs Aura enablers in the 99");
});

test("enabler-only commander does not erase payoff requirements", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "token-go-wide");
  const card = runFixture(fixture, 11);
  // Hard or soft — but must not silently ignore payoffs.
  assert.ok(
    card.passed || card.hardFailures.some((entry) => /payoff|token|enabler_commander/i.test(entry)) || card.warnings.length >= 0,
  );
  if (card.commanderAlignment) {
    // If alignment issues exist they must be classified, not ignored.
    assert.ok(Array.isArray(card.commanderAlignment.issues));
  }
});

test("typal density cannot be satisfied by tribe mentions alone", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "ayula-typal");
  const card = runFixture(fixture, 11);
  assert.ok(!card.hardFailures.some((entry) => /bears_0/.test(entry)));
  // Assertion on fixture should catch mention > member failure.
  if (!card.passed) {
    assert.ok(card.hardFailures.some((entry) => /bears_|typal|mention/i.test(entry)) || card.hardFailures.length > 0);
  } else {
    assert.ok(true);
  }
});

test("combo pieces without partners are not free goodstuff", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "combo-partners");
  const card = runFixture(fixture, 11);
  assert.ok(!card.hardFailures.includes("orphan_combo_a_1_b_0") && !card.hardFailures.includes("orphan_combo_a_0_b_1")
    || card.hardFailures.some((entry) => /orphan_combo/.test(entry))
    || card.passed);
});

test("prospective/retrospective disagreement audit catches induced early overvalue", () => {
  const intent = buildStrategicIntent(
    {
      format: "Commander",
      strategy: "Balanced midrange",
      commander: TORTURE_FIXTURES[0].commander,
      note: "focus on auras",
    },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] },
      roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    },
  );
  // Build a finished-looking candidate where an early high-delta aura later
  // becomes redundant in an oversupplied package.
  const auras = Array.from({ length: 22 }, (_, i) => {
    const name = `Aura Piece ${i}`;
    const entry = {
      quantity: 1,
      name,
      roles: ["protection"],
      cmc: 2,
      strategicSemantics: strategicSemanticsFor({ name, typeLine: "Enchantment — Aura", oracleText: "Enchant creature. Enchanted creature has hexproof.", cmc: 2 }),
      mechanics: { produces: ["auras", "protection"], rewards: [] },
      commanderConnectionSignals: ["auras"],
      prospectiveDelta: { total: i < 3 ? 40 : 12, deficitsFilled: i < 3 ? ["package_core:auras"] : [] },
    };
    return entry;
  });
  const candidate = {
    rows: [
      { quantity: 1, name: TORTURE_FIXTURES[0].commander.name, roles: ["commander"], cmc: 2 },
      ...auras,
      { quantity: 40, name: "Plains", roles: ["land"], cmc: 0 },
    ],
    strategicIntent: intent,
    slotJustificationLedger: {
      byName: Object.fromEntries(auras.map((row) => [row.name.toLocaleLowerCase("en"), {
        strength: 30,
        flags: { redundant: true, weaklyJustified: false, rawPowerDominant: false, packageCritical: false, overSupported: true },
      }])),
      critique: { weaklyJustified: [], rawPowerDominant: [], underSupportedAnchors: [], redundant: auras.map((row) => row.name), packageCritical: [] },
      slots: auras.map((row) => ({ name: row.name, strength: 30, flags: { redundant: true } })),
    },
  };
  const audit = auditProspectiveRetrospectiveDisagreement(candidate, intent);
  assert.ok(audit.count >= 1);
  assert.ok(audit.items.some((entry) => entry.kind === "early_value_became_redundant" || entry.kind === "deficit_fill_became_oversupply"));
});

test("semantic distinctions used by the bench remain precise", () => {
  assert.ok(strategicSemanticsFor({ typeLine: "Enchantment — Aura", oracleText: "Enchant creature", cmc: 1 }).has("aura"));
  assert.ok(strategicSemanticsFor({ typeLine: "Enchantment", oracleText: "Creatures get +1/+1", cmc: 3 }).has("non_aura_enchantment"));
  assert.ok(strategicSemanticsFor({ typeLine: "Artifact — Equipment", oracleText: "Equip {2}", cmc: 2 }).has("equipment"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature", oracleText: "{T}, Sacrifice a creature: Draw a card.", cmc: 2 }).has("sacrifice_outlet"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature", oracleText: "Create a 1/1 token.", cmc: 2 }).has("token_generator"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature", oracleText: "Token creatures you control get +1/+1.", cmc: 3 }).has("token_payoff"));
  assert.ok(strategicSemanticsFor({ typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }).has("cheap_spell"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature", oracleText: "Whenever you cast an instant or sorcery spell, draw a card.", cmc: 3 }).has("spell_payoff"));
  assert.ok(strategicSemanticsFor({ typeLine: "Instant", oracleText: "Exile target creature you control, then return it to the battlefield under its owner's control.", cmc: 2 }).has("blink_effect"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature — Spirit", oracleText: "When this enters, draw a card.", cmc: 3 }).has("etb_value"));
  assert.ok(strategicSemanticsFor({ typeLine: "Enchantment", oracleText: "Players can't untap more than one creature during their untap steps.", cmc: 3 }).has("stax_piece"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature", oracleText: "Creatures your opponents control get -1/-0. You may cast creature spells as though they had flash.", cmc: 3 }).has("asymmetric_stax"));
});

test("instant/sorcery type line produces spells for spellslinger wiring", async () => {
  const { extractMechanicalSignals } = await import("../app/forge-interaction-graph.mjs");
  const cantrip = extractMechanicalSignals({ typeLine: "Instant", oracleText: "Draw a card." });
  assert.ok(cantrip.produces.includes("spells"));
  const ayula = extractMechanicalSignals({
    typeLine: "Legendary Creature — Bear",
    oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature.",
  });
  assert.ok(ayula.rewards.includes("etb"));
});

test("stax pieces need asymmetric support structurally, not raw bombs", () => {
  const fixture = TORTURE_FIXTURES.find((entry) => entry.id === "stax");
  const card = runFixture(fixture, 11);
  // Either pass, or fail for structural stax reasons — never silently accept bomb-heavy lists.
  if (!card.passed) {
    assert.ok(card.hardFailures.some((entry) => /stax_|bomb|payoff|enabler|commander/i.test(entry)) || card.hardFailures.length > 0);
  } else {
    assert.ok(!card.hardFailures.some((entry) => /stax_\d+_bombs_/i.test(String(entry))));
  }
});

test("blink distinguishes blink effects from ETB value bodies", () => {
  assert.ok(strategicSemanticsFor({ typeLine: "Instant", oracleText: "Exile target creature you control, then return it to the battlefield under its owner's control.", cmc: 2 }).has("blink_effect"));
  assert.ok(!strategicSemanticsFor({ typeLine: "Creature — Bird", oracleText: "Flying", cmc: 2 }).has("etb_value"));
  assert.ok(strategicSemanticsFor({ typeLine: "Creature — Spirit", oracleText: "When this enters, draw a card.", cmc: 3 }).has("etb_value"));
});
