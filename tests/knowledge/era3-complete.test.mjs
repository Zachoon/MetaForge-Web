import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ERA3_CARD_INSPECT_SURFACES } from "../../app/context-card-inspector.mjs";
import { buildCommissionContract } from "../../app/commission-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Era 3 Complete — Speak like a strategist", () => {
  it("locks Conversation Contract stages in product surfaces", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const contract = readFileSync(join(root, "docs/CONVERSATION_CONTRACT.md"), "utf8");
    assert.match(contract, /I heard you/i);
    assert.match(contract, /philosophies/i);
    assert.match(contract, /how to win|how to pilot/i);
    assert.match(contract, /Player Surface Law/);
    assert.match(page, /1 · I HEARD YOU|You asked for/);
    assert.match(page, /HERE ARE THE PHILOSOPHIES/);
    assert.match(page, /honest-coach-v0|YOUR COACH/);
    assert.match(page, /Deep Forge|deep-forge|openDeepForgeEvidence/i);
    assert.doesNotMatch(page, /HONEST COACH · BRAIN v1/);
  });

  it("marks #021 inventory complete without claiming Founder Confirmed", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const charter = readFileSync(join(root, "docs/ERA3_COMPLETE.md"), "utf8");
    assert.match(charter, /engineering complete/i);
    assert.match(charter, /Founder Confirmed is not claimed/i);
    assert.doesNotMatch(charter, /Founder Confirmed\*\*/);
    for (const surface of ERA3_CARD_INSPECT_SURFACES) {
      assert.ok(page.includes(`"${surface}"`), surface);
    }
  });

  it("keeps commission soft-credit honest and Brain-free", () => {
    const source = readFileSync(join(root, "app/commission-contract.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.doesNotMatch(source, /native-masterwork-engine|package-plan-optimizer/);
    const soft = buildCommissionContract({
      note: "token aristocrats fantasy",
      commanderName: "Teysa Karlov",
      selected: { rows: [{ name: "Teysa Karlov", quantity: 1 }] },
    });
    assert.ok(soft.softHeardCount >= 1);
    assert.equal(soft.matchPercent, null);
  });

  it("ships Era 3 charter", () => {
    const charter = readFileSync(join(root, "docs/ERA3_COMPLETE.md"), "utf8");
    assert.match(charter, /#020/);
    assert.match(charter, /#021/);
    assert.match(charter, /#022/);
    assert.match(charter, /#023/);
    assert.match(charter, /#024/);
    assert.match(charter, /Brain waits|Brain: 0/i);
  });
});
