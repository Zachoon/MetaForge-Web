import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRemainingDetect } from "./run-epic6-remaining-detect-closeout.mjs";

describe("Epic 6 remaining occupancy detect closeout", () => {
  it("opens Korvold aristocrats on oracle-only intent and keeps Magda closed", () => {
    const classification = classifyRemainingDetect([
      {
        commanders: [{
          name: "Korvold, Fae-Cursed King",
          oracleText: "Whenever you sacrifice a permanent, draw a card.",
        }],
      },
      {
        commanders: [{
          name: "Magda, Brazen Outlaw",
          oracleText: "Sacrifice an artifact: Create a Treasure token.",
        }],
      },
      {
        commanders: [{
          name: "Brago, King Eternal",
          oracleText: "Flying. Whenever Brago, King Eternal deals combat damage to a player, exile any number of target nonland permanents you control, then return those cards to the battlefield under their owner's control.",
        }],
      },
    ]);
    const korvold = classification.watched.aristocrats.find((row) => row.name.startsWith("Korvold"));
    const magda = classification.rejects.aristocrats.find((row) => row.name.startsWith("Magda"));
    const brago = classification.watched.blink.find((row) => row.name.startsWith("Brago"));
    assert.equal(korvold.opens, true);
    assert.equal(magda.opens, false);
    assert.equal(brago.opens, false, "Brago's exile-any-number line is the blink detect hole if it appears live");
  });
});
