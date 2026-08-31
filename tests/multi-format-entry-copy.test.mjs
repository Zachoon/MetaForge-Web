import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const entrance = await readFile(new URL("../app/components/forge/entrance-chamber.tsx", import.meta.url), "utf8");
const commission = await readFile(new URL("../app/components/forge/commission-chamber.tsx", import.meta.url), "utf8");

test("entry presents three format-neutral ways to begin", () => {
  assert.match(entrance, /title="Start from scratch"/);
  assert.match(entrance, /title="Complete a decklist"/);
  assert.match(entrance, /title="Discover a deck"/);
  assert.match(entrance, /Player Compass already carries your play preferences/);
});

test("the deck setup asks only for format, deck material, and commander when relevant", () => {
  assert.match(commission, /<option>Standard<\/option>/);
  assert.match(commission, /isCommanderFormat\(format\)/);
  assert.doesNotMatch(commission, /TARGET POWER TIER|MAX PRICE PER CARD|COMPLEXITY|OPTIONAL · CARDS OR PLAY STYLES/);
});
