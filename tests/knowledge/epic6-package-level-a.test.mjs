import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  tokensCoreBands,
  typalFalseOpenStatus,
} from "./run-epic6-package-level-a-report.mjs";

describe("Epic 6 package Level-A diagnostics", () => {
  it("bands token cores against the 6 and 10 floors without implying a Lab", () => {
    const bands = tokensCoreBands([
      { cores: [3, 4, 5] },
      { cores: [6, 8, 9] },
      { cores: [10, 11] },
    ]);
    assert.equal(bands.total, 8);
    assert.equal(bands.below6, 3);
    assert.equal(bands.from6to9, 3);
    assert.equal(bands.atLeast10, 2);
  });

  it("treats prior false typal opens as closed only when those commanders leave the set", () => {
    const closed = typalFalseOpenStatus([{ commander: "Ayula, Queen Among Bears", cores: [12, 14] }]);
    assert.equal(closed.closed, true);
    assert.deepEqual(closed.remaining, []);

    const leftover = typalFalseOpenStatus([
      { commander: "Tayam, Luminous Enigma", cores: [0, 0, 0] },
    ]);
    assert.equal(leftover.closed, false);
    assert.deepEqual(leftover.remainingZero, ["Tayam, Luminous Enigma"]);
  });
});
