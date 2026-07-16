import assert from "node:assert/strict";
import test from "node:test";
import { GAMES, gameStorageKey, sharedPlayerProfile } from "../app/game-registry.mjs";

test("each forge has an isolated game namespace",()=>{
  assert.notEqual(gameStorageKey("mtg","deck"),gameStorageKey("riftbound","deck"));
  assert.equal(GAMES.riftbound.status,"alpha");
});

test("shared Player DNA excludes game-specific records",()=>{
  const profile=sharedPlayerProfile({coachingNotes:"Show me the tradeoff.",riskPosture:"measured",mtgDecks:["must not cross"]});
  assert.equal(profile.coachingNotes,"Show me the tradeoff.");
  assert.equal("mtgDecks" in profile,false);
});
