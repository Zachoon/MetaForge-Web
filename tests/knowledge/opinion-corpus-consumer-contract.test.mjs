import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildValidationRecord,
  buildValidationReport,
  VALIDATION_REPORT_VERSION,
} from "../../app/validation-harness.mjs";
import {
  loadOfflineFieldCorpusCases,
  opinionEvidenceFromCorpusObservation,
  withCorpusProvenance,
} from "../../app/validation-harness-corpus.mjs";
import { forgeImportedMasterwork } from "../../app/native-masterwork-engine.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Opinion ↔ corpus consumer contract", () => {
  it("exposes weak, non-Brain evidence from corpusObservation", () => {
    const packed = loadOfflineFieldCorpusCases({ limit: 1, seeds: [11] });
    const caseSpec = packed.cases[0];
    const report = forgeImportedMasterwork(caseSpec.forgeInput);
    const record = withCorpusProvenance(
      buildValidationRecord(caseSpec, report, null, 1),
      caseSpec,
    );
    const harness = buildValidationReport([record], {
      mode: "real-corpus",
      includeRecords: true,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });

    assert.equal(harness.version, VALIDATION_REPORT_VERSION);
    assert.equal(harness.corpusObservation.present, true);

    const evidence = opinionEvidenceFromCorpusObservation(harness.corpusObservation);
    assert.equal(evidence.usable, true);
    assert.equal(evidence.writesToBrain, false);
    assert.equal(evidence.liveTruth, false);
    assert.equal(evidence.authorityClass, "competitive_fixture_corpus");
    assert.ok(evidence.maxConfidenceHint <= 0.3);
    assert.match(evidence.claims[0].statement, /does not establish live/i);
  });

  it("keeps Opinion Engine fixture authority capped when that module is present", () => {
    const oePath = join(root, "app/knowledge/opinion-engine.mjs");
    if (!existsSync(oePath)) {
      assert.ok(true, "Opinion Engine not landed yet — corpus contract still holds");
      return;
    }
    const source = readFileSync(oePath, "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.match(source, /competitive_fixture_corpus/);
    // Soft cap must remain weak vs commission / oracle.
    const match = source.match(/competitive_fixture_corpus:\s*([0-9.]+)/);
    assert.ok(match, "Opinion Engine must declare fixture corpus authority");
    assert.ok(Number(match[1]) <= 0.35, "fixture corpus must stay weak evidence");
  });
});
