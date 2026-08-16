import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAristocratsDetect } from "./run-epic6-aristocrats-detect-closeout.mjs";

describe("Epic 6 aristocrats detect closeout", () => {
  it("opens Korvold/Chatterfang shapes and keeps Magda closed", () => {
    const classification = classifyAristocratsDetect([
      {
        commanders: [{
          name: "Korvold, Fae-Cursed King",
          oracleText: "Whenever you sacrifice a permanent, draw a card.",
        }],
      },
      {
        commanders: [{
          name: "Chatterfang, Squirrel General",
          oracleText: "If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead. {B}, Sacrifice X Squirrels: Target creature gets +X/-X until end of turn.",
        }],
      },
      {
        commanders: [{
          name: "Magda, Brazen Outlaw",
          oracleText: "Sacrifice an artifact: Create a Treasure token.",
        }],
      },
    ]);
    assert.equal(classification.openCount, 2);
    assert.ok(classification.open.some((row) => row.name.startsWith("Korvold")));
    assert.ok(classification.open.some((row) => row.name.startsWith("Chatterfang")));
    const magda = classification.watchedRows.find((row) => row.needle === "Magda");
    assert.equal(magda.hits[0].opens, false);
  });
});
