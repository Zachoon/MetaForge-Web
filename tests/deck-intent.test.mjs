import assert from "node:assert/strict";
import test from "node:test";
import { coachForIntent, normalizeDeckIntent, shouldShowIntentPrompt, tierForIntent } from "../app/deck-intent.mjs";

const added = { name: "Awaken the Woods", rank: 8, priceUsd: 4, role: "Other", factors: { powerSignal: null } };
const passed = [
  { name: "Springleaf Parade", rank: 18, priceUsd: 0.15, factors: { powerSignal: null } },
  { name: "The Cabbage Merchant", rank: 11, priceUsd: null, factors: { powerSignal: "fastMana" } },
];

test("the prompt shows only on an override, and a deck setting or dismissal replaces it", () => {
  assert.equal(shouldShowIntentPrompt(null, { overriding: false }), false);
  assert.equal(shouldShowIntentPrompt(null, { overriding: true }), true);
  assert.equal(shouldShowIntentPrompt({ chip: "theme" }, { overriding: true }), false);
  assert.equal(shouldShowIntentPrompt({ bracket: "2" }, { overriding: true }), false);
  assert.equal(shouldShowIntentPrompt({ dismissed: true }, { overriding: true }), false);
  assert.equal(shouldShowIntentPrompt({ prompts: "off" }, { overriding: true }), false);
  assert.equal(tierForIntent("lower", null).tier, "Casual");
  assert.equal(tierForIntent("push", null).bracket, "5");
  assert.equal(tierForIntent("like", "4").tier, "High-Power");
  assert.equal(normalizeDeckIntent({ chip: "nope", bracket: "9" }).chip, null);
});

test("coaching uses the real scores and stays quiet about prices it does not have", () => {
  const unowned = coachForIntent({ chip: "unowned", categoryLabel: "Ramp", added, passed });
  assert.match(unowned, /Awaken the Woods stays because you own it/);
  assert.match(unowned, /Springleaf Parade is the upgrade/);
  assert.match(unowned, /18 against 8/);
  assert.match(unowned, /\$0\.15/);
  assert.match(unowned, /\$4\.00/);
  assert.doesNotMatch(unowned, /Cabbage/);

  const lower = coachForIntent({ chip: "lower", categoryLabel: "Ramp", added, passed });
  assert.match(lower, /bracket 2/);
  assert.match(lower, /fast mana signal/);
  assert.doesNotMatch(lower, /you should|nag|instead take/i);

  const push = coachForIntent({ chip: "push", bracket: "5", categoryLabel: "Ramp", added, passed });
  assert.match(push, /cEDH/);
  assert.match(push, /Springleaf Parade ranks higher/);
  assert.match(push, /fast mana/);

  const noPrice = coachForIntent({
    chip: "unowned",
    categoryLabel: "Ramp",
    added: { ...added, priceUsd: null },
    passed: [{ ...passed[0], priceUsd: null }],
  });
  assert.doesNotMatch(noPrice, /\$/);

  const theme = coachForIntent({ chip: "theme", categoryLabel: "Ramp", added, passed, differentRole: "Awaken the Woods does not fill the ramp role." });
  assert.match(theme, /Theme is the reason/);
  assert.match(theme, /does not fill the ramp role/);

  const like = coachForIntent({ chip: "like", added, passed: [] });
  assert.match(like, /because you like it/);
});
