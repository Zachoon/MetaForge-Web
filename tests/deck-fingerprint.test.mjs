import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDeck, deckFingerprint } from "../app/deck-fingerprint.mjs";

test("fingerprint contract normalizes case, Unicode, order, and duplicate rows", async () => {
  const rows = [
    { name: "MJO\u0308LNIR, HAMMER OF THOR", quantity: 1 },
    { name: "Island", quantity: 8 },
    { name: "mj\u00f6lnir, hammer of thor", quantity: 2 },
    { name: "island", quantity: 4 },
  ];
  assert.equal(canonicalDeck(rows), "12 island\n3 mj\u00f6lnir, hammer of thor");
  assert.equal(await deckFingerprint(rows), "81c4210774a624b74377a0eb");
});
