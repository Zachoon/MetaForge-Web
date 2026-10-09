import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// A guest build claimed into an account used to be saved with
// commander: null and named after the engine's internal candidate label, so
// it appeared in My Decks as "Resilient Temper" with "No commander". The
// claim's stored generation options don't carry the commander, but the
// report's strategic intent does.
const context = await readFile(new URL("../app/forge-session-context.tsx", import.meta.url), "utf8");

test("a claimed guest deck keeps its commander and a commander-based name", () => {
  const start = context.indexOf("const claimed = pendingClaimResult;");
  assert.ok(start >= 0, "expected the claim restoration effect");
  const block = context.slice(start, context.indexOf("}, [pendingClaimResult, format]);", start));

  assert.match(block, /claimed\.nativeReport\.selected\?\.strategicIntent\?\.commanders\?\.\[0\]/);
  assert.match(block, /name: claimedCommander \? `\$\{claimedCommander\.name\}, Forged` : "Your First Deck"/);
  assert.doesNotMatch(block, /name: claimed\.nativeReport\.selected\?\.label/, "the internal candidate label is not a deck name");
  assert.match(block, /commander: claimedCommander,/);
  assert.doesNotMatch(block, /commander: null,/);
});
