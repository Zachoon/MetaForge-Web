import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRegisteredOpinion,
  getContextualCardIdentity,
  registeredOpinionCatalog,
} from "../../app/knowledge/opinion-claim-registry.mjs";

describe("Opinion Claim Registry v0", () => {
  it("forms different Doubling Season stances for three exact revisions", () => {
    const theme = buildRegisteredOpinion("founder-025-jay-atraxa-doubling-season", { now: "2026-08-13T00:00:00.000Z" });
    const speed = buildRegisteredOpinion("speed-atraxa-superfriends-doubling-season", { now: "2026-08-13T00:00:00.000Z" });
    const counters = buildRegisteredOpinion("counters-atraxa-doubling-season", { now: "2026-08-13T00:00:00.000Z" });
    assert.equal(theme.verdict, "recommend");
    assert.equal(speed.verdict, "do_not_recommend");
    assert.equal(counters.verdict, "unresolved");
    assert.notEqual(theme.context.deckRevision, speed.context.deckRevision);
    assert.notEqual(speed.context.deckRevision, counters.context.deckRevision);
    assert.match(theme.answer, /named star/i);
    assert.match(speed.answer, /Cut Doubling Season/i);
    assert.equal(theme.writesToBrain, false);
  });

  it("publishes contextual identities with timing, floor, ceiling, and opportunity cost", () => {
    const card = getContextualCardIdentity("Black Market Connections");
    assert.match(card.earliestRealisticWindow, /Turn three/i);
    assert.match(card.opportunityCost, /commander setup|color fixing/i);
    assert.ok(card.goodStates.length > 0);
    assert.ok(card.badStates.length > 0);
    assert.ok(registeredOpinionCatalog().cardIdentities.length >= 5);
  });

  it("does not resolve unregistered opinion keys", () => {
    assert.equal(buildRegisteredOpinion("caller-invented-belief"), null);
  });
});
