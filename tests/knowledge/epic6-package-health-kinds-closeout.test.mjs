import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  tallyOccupiedHealthKinds,
  tallyUnnamedOccupiedHealthKinds,
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
});
