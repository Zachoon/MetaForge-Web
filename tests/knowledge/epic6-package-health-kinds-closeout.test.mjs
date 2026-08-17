import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  tallyOccupiedHealthKinds,
  tallyUnnamedOccupiedHealthKinds,
  diagnoseUnnamedOccupiedHealth,
  formatPackageHealthKindsReport,
} from "./run-epic6-package-health-kinds-closeout.mjs";

describe("Epic 6 package health kinds closeout", () => {
  it("counts named health kinds only on occupancy-opened packages", () => {
    const tally = tallyOccupiedHealthKinds([
      {
        occupiedPackageIds: ["tokens"],
        packages: [
          { id: "tokens", issues: [{ kind: "underfilled" }] },
          { id: "spellslinger", issues: [{ kind: "oversaturated" }] },
        ],
      },
      {
        occupiedPackageIds: ["spellslinger"],
        packages: [
          { id: "spellslinger", issues: [{ kind: "oversaturated" }, { kind: "excessive_redundancy" }] },
        ],
      },
      {
        occupiedPackageIds: ["tokens"],
        packages: [
          { id: "tokens", issues: [{ kind: "missing_leg" }, { kind: "underfilled" }] },
        ],
      },
      {
        occupiedPackageIds: [],
        packages: [
          { id: "stax", issues: [{ kind: "underfilled" }] },
        ],
      },
    ]);
    assert.equal(tally.tokens.decks, 2);
    assert.equal(tally.tokens.underfilled, 2);
    assert.equal(tally.tokens.oversaturated, 0);
    assert.equal(tally.spellslinger.decks, 1);
    assert.equal(tally.spellslinger.oversaturated, 1);
    assert.equal(tally.spellslinger.excessive_redundancy, 1);
    assert.equal(tally.stax.decks, 0);
    assert.equal(tally.stax.underfilled, 0);
  });

  it("stops without inventing a threshold when spellslinger does not replicate", () => {
    const tally = tallyOccupiedHealthKinds([
      {
        occupiedPackageIds: ["tokens"],
        packages: [{ id: "tokens", issues: [{ kind: "underfilled" }] }],
      },
    ]);
    const report = formatPackageHealthKindsReport(tally, { deckCount: 1 });
    assert.match(report, /writesToBrain:\*\* false/);
    assert.match(report, /STOP — spellslinger did not replicate/);
    assert.doesNotMatch(report, /propose|new floor|surplus >=|coreMin/i);
  });

  it("counts unnamed health kinds on occupancy-opened packages without seating them", () => {
    const unnamed = tallyUnnamedOccupiedHealthKinds([
      {
        occupiedPackageIds: ["tokens"],
        packages: [
          { id: "tokens", issues: [{ kind: "underfilled" }, { kind: "missing_leg" }] },
          { id: "spellslinger", issues: [{ kind: "curve_conflict" }] },
        ],
      },
    ]);
    assert.equal(unnamed.occupiedDecks, 1);
    assert.equal(unnamed.totals.missing_leg, 1);
    assert.equal(unnamed.totals.curve_conflict, 0);
    assert.equal(unnamed.byPackage.tokens.missing_leg, 1);
    assert.equal(unnamed.byPackage.spellslinger, undefined);
    const report = formatPackageHealthKindsReport({
      tokens: { id: "tokens", decks: 1, underfilled: 1, oversaturated: 0, excessive_redundancy: 0 },
    }, { unnamed });
    assert.match(report, /Unnamed health kinds/);
    assert.match(report, /Do not seat/);
    assert.match(report, /\*\*missing_leg\*\*: 1/);
    assert.match(report, /Per occupied package/);
    assert.match(report, /\*\*tokens\*\*: missing_leg 1\/1/);
  });

  it("diagnoses occupancy-opened ratio as missing_leg shadow and ignores composition-opened flags", () => {
    const diagnosis = diagnoseUnnamedOccupiedHealth([
      {
        occupiedPackageIds: ["reanimator"],
        packages: [
          {
            id: "reanimator",
            issues: [
              { kind: "missing_leg", detail: "reanimation_target" },
              { kind: "poor_enabler_payoff_ratio", detail: "0:9" },
            ],
          },
          {
            id: "spellslinger",
            issues: [{ kind: "poor_enabler_payoff_ratio", detail: "1:8" }],
          },
        ],
      },
      {
        occupiedPackageIds: ["tokens"],
        packages: [
          { id: "tokens", issues: [{ kind: "unsupported_anchor", detail: "Parallel Lives" }] },
        ],
      },
    ]);
    assert.equal(diagnosis.ratio.occupied, 1);
    assert.equal(diagnosis.ratio.minZero, 1);
    assert.equal(diagnosis.ratio.withMissingLeg, 1);
    assert.equal(diagnosis.ratio.byPackage.spellslinger, undefined);
    assert.equal(diagnosis.anchors.occupied, 1);
    assert.equal(diagnosis.anchors.byPackage.tokens.decks, 1);
    assert.equal(diagnosis.anchors.byDetail["Parallel Lives"], 1);
    const report = formatPackageHealthKindsReport({
      reanimator: { id: "reanimator", decks: 1, underfilled: 0, oversaturated: 0, excessive_redundancy: 0 },
      tokens: { id: "tokens", decks: 1, underfilled: 0, oversaturated: 0, excessive_redundancy: 0 },
    }, { diagnosis });
    assert.equal(diagnosis.ratio.byDetail["0:9"], 1);
    assert.match(report, /missing_leg's shadow/);
    assert.match(report, /Ratio details \(top\): 0:9 1/);
    assert.match(report, /Do not change evaluatePackageHealth or balancedLegFloor/);
    assert.match(report, /not a verified interaction graph/);
    assert.doesNotMatch(report, /propose|new floor|raise the floor|seat missing_leg/i);
  });
});
