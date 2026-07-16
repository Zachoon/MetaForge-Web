import test from "node:test";
import assert from "node:assert/strict";
import { riftboundMetaContext } from "../app/riftbound-meta-context.mjs";

test("Riftbound Coach receives a dated tournament field without asking the player",()=>{
  const meta=riftboundMetaContext(new Date("2026-07-16T12:00:00Z"));
  assert.equal(meta.freshness,"usable-with-caution");
  assert.match(meta.coverage,/38 tournaments/);
  assert.deepEqual(meta.tier1.map(item=>item.legend),["Diana","Irelia","Master Yi — Wuju Bladesman","Azir"]);
  assert.match(meta.pressures.join(" "),/Vendetta releases July 31/);
});
