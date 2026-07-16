import assert from "node:assert/strict";
import test from "node:test";
import { collectorEnvelope, DATA_GOBLINS } from "../app/data-goblin-config.mjs";

test("Riftbound and MTG goblins share verification gates but not namespaces",()=>{
  assert.equal(DATA_GOBLINS.mtg.corroborationMinimum,DATA_GOBLINS.riftbound.corroborationMinimum);
  assert.notEqual(DATA_GOBLINS.mtg.game,DATA_GOBLINS.riftbound.game);
  assert.equal(collectorEnvelope("riftbound",{principle:"Test"}).status,"quarantined");
});
