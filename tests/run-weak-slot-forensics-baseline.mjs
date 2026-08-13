/**
 * Diagnostic-only runner: forge all torture fixtures and dump weak-slot
 * forensic aggregates. Does not change construction policy.
 */
import { writeFileSync } from "node:fs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";
import { aggregateWeakSlotForensics } from "../app/weak-slot-forensics.mjs";
import { aggregateSelfEvaluationArtifacts } from "../app/reasoning-drift.mjs";
import { TORTURE_FIXTURES, fixtureInput } from "./commander-torture-bench/fixtures.mjs";

const byArchetype = [];
const allRecords = [];
const seArtifacts = [];

for (const fixture of TORTURE_FIXTURES) {
  const started = Date.now();
  const report = forgeNativeMasterwork(fixtureInput(fixture, 11));
  const forensics = report.selected.weakSlotForensics;
  const records = (forensics?.records || []).map((record) => ({
    ...record,
    archetype: fixture.archetype,
    fixtureId: fixture.id,
  }));
  allRecords.push(...records);
  seArtifacts.push({
    ...report.selected.selfEvaluation,
    archetype: fixture.archetype,
    meta: { ...(report.selected.selfEvaluation?.meta || {}), archetype: fixture.archetype },
  });
  byArchetype.push({
    id: fixture.id,
    archetype: fixture.archetype,
    runtimeMs: Date.now() - started,
    weakSlotCount: records.length,
    aggregate: forensics?.aggregate || null,
    records: records.map((record) => ({
      card: record.card,
      source: record.source,
      constructionPhase: record.constructionPhase,
      causalClass: record.causalClass,
      avoidable: record.avoidable,
      constraintForced: record.constraintForced,
      pickTimeProspectiveTotal: record.pickTimeProspectiveTotal,
      pickTimeRawScore: record.pickTimeRawScore,
      finalJustificationStrength: record.finalJustificationStrength,
      bestAlternative: record.counterfactual?.bestAlternative || null,
      candidateDepth: record.counterfactual?.candidateDepth ?? null,
      driftPrimaryClass: record.driftPrimaryClass,
    })),
  });
  console.log(`${fixture.id}: weak=${records.length} causal=${JSON.stringify(forensics?.aggregate?.causalClassCounts || {})}`);
}

const aggregate = aggregateWeakSlotForensics(allRecords);
const seAggregate = aggregateSelfEvaluationArtifacts(seArtifacts);
const payload = {
  generatedAt: new Date().toISOString(),
  note: "Diagnostic baseline for final_weak_justification — no production fix applied yet.",
  weakSlotAggregate: aggregate,
  selfEvaluationControls: {
    driftClassCounts: seAggregate.driftClassCounts,
    controlCaseCounts: seAggregate.controlCaseCounts,
    totalTracedPicks: seAggregate.totalTracedPicks,
  },
  byArchetype,
};

writeFileSync(
  new URL("./commander-torture-bench/weak-slot-forensics-baseline.json", import.meta.url),
  JSON.stringify(payload, null, 2),
);
console.log("\nBASELINE AGGREGATE");
console.log(JSON.stringify(aggregate, null, 2));
console.log("\nSE CONTROLS");
console.log(JSON.stringify(payload.selfEvaluationControls, null, 2));
