#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAtlasVocabularyRegistry } from "../../app/knowledge/atlas-vocabulary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "tests/knowledge/out");

function main() {
  mkdirSync(outDir, { recursive: true });
  const registry = buildAtlasVocabularyRegistry();
  const report = [
    "# Atlas Vocabulary / Age of Vocabulary",
    "",
    registry.ageOfVocabulary.label,
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Core terms | ${registry.summary.coreTermCount} |`,
    `| Capability drafts | ${registry.summary.capabilityDraftCount} |`,
    `| Capability admitted | ${registry.summary.capabilityAdmittedCount} |`,
    `| Coverage dimensions | ${registry.summary.coverageDimensionCount} |`,
    `| Equivalence bindings | ${registry.summary.equivalenceBindingCount} |`,
    `| Named resource seats | ${registry.summary.namedResourceSeatCount} |`,
    `| Typal seats | ${registry.summary.typalSeatCount} |`,
    `| Aristocrats seats | ${registry.summary.aristocratsSeatCount} |`,
    `| Spellslinger seats | ${registry.summary.spellslingerSeatCount} |`,
    `| Selection seats | ${registry.summary.selectionSeatCount} |`,
    `| Graveyard seats | ${registry.summary.graveyardSeatCount} |`,
    `| Sacrifice seats | ${registry.summary.sacrificeSeatCount} |`,
    `| Trigger seats | ${registry.summary.triggerSeatCount} |`,
    `| Counter seats | ${registry.summary.counterSeatCount} |`,
    `| Life seats | ${registry.summary.lifeSeatCount} |`,
    `| Protection seats | ${registry.summary.protectionSeatCount} |`,
    `| Evasion seats | ${registry.summary.evasionSeatCount} |`,
    `| Land seats | ${registry.summary.landSeatCount} |`,
    `| Artifact seats | ${registry.summary.artifactSeatCount} |`,
    `| Token seats | ${registry.summary.tokenSeatCount} |`,
    `| Aura seats | ${registry.summary.auraSeatCount} |`,
    `| Spell seats | ${registry.summary.spellSeatCount} |`,
    `| Draw seats | ${registry.summary.drawSeatCount} |`,
    `| Damage seats | ${registry.summary.damageSeatCount} |`,
    `| Equipment seats | ${registry.summary.equipmentSeatCount} |`,
    `| Combat seats | ${registry.summary.combatSeatCount} |`,
    `| Loop seats | ${registry.summary.loopSeatCount} |`,
    `| Reset shape seats | ${registry.summary.resetShapeSeatCount} |`,
    `| coverageScore | ${registry.summary.coverageScoreExists} |`,
    `| Brain | none |`,
    "",
    `Observation 001: ${registry.observation001.verdict}`,
    "",
    "## Revisions",
    "",
    ...registry.revisions.map((rev) => `- ${rev.date}: ${rev.change}`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  writeFileSync(join(outDir, "atlas-vocabulary.md"), report, "utf8");
  writeFileSync(join(outDir, "atlas-vocabulary.json"), JSON.stringify(registry, null, 2), "utf8");
  console.log(report);
}

main();
