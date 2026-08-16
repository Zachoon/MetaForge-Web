import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCatalogCoverage,
  STRATEGIC_PACKAGE_IDS,
} from "./run-epic6-unseen-packages-report.mjs";

describe("Epic 6 unseen catalog packages", () => {
  it("treats a canary commander with no package row as a detection failure", () => {
    const coverage = classifyCatalogCoverage([
      { commanders: ["Light-Paws, Emperor's Voice"], packages: [{ id: "tokens" }] },
    ]);
    assert.ok(STRATEGIC_PACKAGE_IDS.includes("auras"));
    assert.ok(coverage.unseen.includes("auras"));
    assert.ok(coverage.detectionFailures.includes("auras"));
    assert.ok(!coverage.sampleGaps.includes("auras"));
  });

  it("does not treat Balance/Balancer names as Balan equipment canaries", () => {
    const coverage = classifyCatalogCoverage([
      { commanders: ["Leonardo, the Balance+Michelangelo, the Heart"], packages: [{ id: "tokens" }] },
      { commanders: ["Witherbloom, the Balancer"], packages: [{ id: "tokens" }] },
    ]);
    assert.ok(coverage.unseen.includes("equipment"));
    assert.ok(coverage.sampleGaps.includes("equipment"));
    assert.ok(!coverage.detectionFailures.includes("equipment"));
  });

  it("treats missing canaries as a sample gap, not a healthy package", () => {
    const coverage = classifyCatalogCoverage([
      { commanders: ["Magda, Brazen Outlaw"], packages: [{ id: "tokens" }, { id: "typal" }] },
    ]);
    assert.ok(coverage.sampleGaps.includes("auras"));
    assert.ok(coverage.sampleGaps.includes("blink"));
    assert.deepEqual(coverage.detectionFailures, []);
    assert.ok(coverage.seen.includes("tokens"));
  });
});
