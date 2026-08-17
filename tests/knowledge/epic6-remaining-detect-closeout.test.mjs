import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRemainingDetect, formatReport } from "./run-epic6-remaining-detect-closeout.mjs";

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
      {
        commanders: [{
          name: "Chatterfang, Squirrel General",
          oracleText: "If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead.",
        }],
      },
      {
        commanders: [{
          name: "Derevi, Empyrial Tactician",
          oracleText: "Whenever Derevi, Empyrial Tactician enters the battlefield or a creature you control deals combat damage to a player, you may tap or untap target permanent.",
        }],
      },
      {
        commanders: [{
          name: "Kediss, Emberclaw Familiar",
          oracleText: "Whenever a commander you control deals combat damage to an opponent, it deals that much damage to each other opponent.",
        }],
      },
    ]);
    const korvold = classification.watched.aristocrats.find((row) => row.name.startsWith("Korvold"));
    const magda = classification.rejects.aristocrats.find((row) => row.name.startsWith("Magda"));
    const brago = classification.watched.blink.find((row) => row.name.startsWith("Brago"));
    const chatterfang = classification.rejects.tokens.find((row) => row.name.startsWith("Chatterfang"));
    const derevi = classification.rejects.stax.find((row) => row.name.startsWith("Derevi"));
    const kediss = classification.rejects.typal.find((row) => row.name.startsWith("Kediss"));
    assert.equal(korvold.opens, true);
    assert.equal(magda.opens, false);
    assert.equal(brago.opens, false, "Brago's exile-any-number line is the blink detect hole if it appears live");
    assert.equal(chatterfang.opens, false, "Chatterfang replacement is not tokens occupancy");
    assert.equal(derevi.opens, false, "Derevi tap/untap is not stax occupancy");
    assert.equal(kediss.opens, false, "a commander you control is not a tribe");
    const report = formatReport(classification);
    assert.match(report, /Sample gaps \(not detection misses\)/);
    assert.match(report, /Do not widen detectCommander/);
    assert.match(report, /\*\*auras\*\*/);
    assert.match(report, /Frozen construction non-widens this lane: auras, equipment, blink/);
  });
});
