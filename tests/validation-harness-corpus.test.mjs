import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { forgeImportedMasterwork } from "../app/native-masterwork-engine.mjs";
import {
  buildValidationRecord,
  buildValidationReport,
  VALIDATION_REPORT_VERSION,
} from "../app/validation-harness.mjs";
import {
  CORPUS_HARNESS_ADAPTER_VERSION,
  corpusRecordToHarnessCase,
  expandCorpusRecords,
  loadOfflineFieldCorpusCases,
  summarizeCorpusObservation,
  withCorpusProvenance,
} from "../app/validation-harness-corpus.mjs";
import { materializeCompetitiveFixtureCorpus } from "../app/field-intelligence/fixtures/competitive-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Field Validation — corpus into shared harness report shape", () => {
  it("does not invent Brain construction imports", () => {
    const source = readFileSync(join(root, "app/validation-harness-corpus.mjs"), "utf8");
    assert.doesNotMatch(source, /package-plan-optimizer|prospective-slot-delta|strategic-plan-competition/);
    assert.match(source, /writesToBrain:\s*false/);
    assert.equal(CORPUS_HARNESS_ADAPTER_VERSION, "validation-harness-corpus-v1");
  });

  it("maps tournament-shaped corpus decks into harness cases with forge inputs", () => {
    const corpus = materializeCompetitiveFixtureCorpus();
    const topCut = corpus.records.find((record) => record.topCut);
    assert.ok(topCut);
    const caseSpec = corpusRecordToHarnessCase(topCut, { seed: 11 });
    assert.ok(caseSpec);
    assert.equal(caseSpec.forgePath, "imported");
    assert.ok(caseSpec.forgeInput.importedRows.length > 0);
    assert.ok(caseSpec.forgeInput.cards.length > 0);
    assert.equal(caseSpec.corpus.sourceType, "synthetic_competitive_fixture");
    assert.match(caseSpec.corpus.note || "", /not_live|offline|fixture/i);
  });

  it("emits the same validation report version as the synthetic harness", () => {
    const packed = loadOfflineFieldCorpusCases({ limit: 2, seeds: [11] });
    assert.ok(packed.cases.length >= 1);
    assert.equal(packed.writesToBrain, false);

    const records = packed.cases.map((caseSpec) => {
      let report = null;
      let error = null;
      const started = Date.now();
      try {
        report = forgeImportedMasterwork(caseSpec.forgeInput);
      } catch (err) {
        error = err;
      }
      return withCorpusProvenance(
        buildValidationRecord(caseSpec, report, error, Date.now() - started),
        caseSpec,
      );
    });

    const report = buildValidationReport(records, {
      mode: "real-corpus",
      includeRecords: true,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });

    assert.equal(report.version, VALIDATION_REPORT_VERSION);
    assert.equal(report.mode, "real-corpus");
    assert.equal(report.architectureFrozen, true);
    assert.ok(report.aggregate);
    assert.ok(report.nextFocus?.primary?.id);
    assert.equal(report.corpusObservation.present, true);
    assert.ok(report.corpusObservation.cases >= 1);
    assert.ok(report.records.every((entry) => entry.corpus?.recordId));
  });

  it("preferTopCut expands converters first and summarizes tiers", () => {
    const corpus = materializeCompetitiveFixtureCorpus();
    const cases = expandCorpusRecords(corpus.records, { limit: 4, seeds: [11], preferTopCut: true });
    assert.equal(cases.length, 4);
    assert.ok(cases.every((entry) => entry.corpus.topCut === true));
    const summary = summarizeCorpusObservation(
      cases.map((entry) => ({ corpus: entry.corpus })),
    );
    assert.equal(summary.present, true);
    assert.equal(summary.topCutCases, 4);
  });

  it("wires the real-corpus runner and docs milestone", () => {
    const runner = readFileSync(join(root, "tests/validation-harness/run-real-corpus.mjs"), "utf8");
    const docs = readFileSync(join(root, "docs/VALIDATION_HARNESS.md"), "utf8");
    const pkg = readFileSync(join(root, "package.json"), "utf8");
    assert.match(runner, /forgeImportedMasterwork/);
    assert.match(runner, /mode:\s*"real-corpus"/);
    assert.match(pkg, /validate:harness:real-corpus/);
    assert.match(docs, /real-corpus|tournament-shaped/);
  });
});
