import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const entrance = await readFile(new URL("../app/components/forge/entrance-chamber.tsx", import.meta.url), "utf8");
const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

test("entry leads with one guided action and keeps the other two ways to begin as secondary links", () => {
  assert.match(entrance, /title="Start with your commander"/);
  assert.equal([...entrance.matchAll(/<ForgeCommissionCard/g)].length, 1, "exactly one primary call to action");
  assert.match(entrance, /Have a partial list\? Review it step by step/);
  assert.match(entrance, /Open an empty decklist/);
  assert.doesNotMatch(entrance, /fill the open slots/);
  // A first-time visitor has no Player Compass yet, so the intro must not
  // claim one already exists.
  assert.doesNotMatch(entrance, /Player Compass already carries/);
  assert.match(entrance, /Tell us how you like to play below and the suggestions adapt as you go/);
});

test("the deck setup asks for the commander and never offers another format", () => {
  assert.doesNotMatch(commission, /<option>Standard<\/option>/);
  assert.doesNotMatch(commission, /build-choice-format/);
  assert.doesNotMatch(commission, /FORMAT \+ COMMANDER|Guided building supports Commander formats/);
  assert.match(commission, /DISCOVER A DECK · COMMANDER/);
  assert.match(commission, /isCommanderFormat\(format\)/);
  assert.doesNotMatch(commission, /TARGET POWER TIER|MAX PRICE PER CARD|COMPLEXITY|OPTIONAL · CARDS OR PLAY STYLES/);
});
