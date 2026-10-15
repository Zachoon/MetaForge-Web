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
    // "1 · I HEARD YOU" left page.tsx in the chamber decomposition and now
    // lives on the masterworks and research surfaces. "HERE ARE THE
    // PHILOSOPHIES" was removed in Player Compass v1.1 (8524364); the
    // philosophy stage is the "CHOOSE YOUR EXPERIENCE" compare.
    const masterworks = readFileSync(join(root, "app/components/forge/masterworks-chamber.tsx"), "utf8");
    const philosophy = readFileSync(join(root, "app/components/forge/philosophy-compare.tsx"), "utf8");
    const workbench = readFileSync(join(root, "app/components/forge/workbench-chamber.tsx"), "utf8");
    const research = readFileSync(join(root, "app/research/page.tsx"), "utf8");
    const surfaces = [page, masterworks, philosophy, workbench, research].join("\n");
    assert.match(contract, /I heard you/i);
    assert.match(contract, /philosophies/i);
    assert.match(contract, /how to win|how to pilot/i);
    assert.match(contract, /Player Surface Law/);
    assert.match(masterworks, /1 · I HEARD YOU/);
    assert.match(masterworks, /You asked for/);
    assert.match(philosophy, /CHOOSE YOUR EXPERIENCE/);
    assert.match(philosophy, /Choose a philosophy/);
    assert.match(workbench, /honest-coach-v0/);
    assert.match(workbench, /YOUR COACH/);
    assert.match(surfaces, /Deep Forge|deep-forge|openDeepForgeEvidence/i);
    assert.doesNotMatch(surfaces, /HONEST COACH · BRAIN v1/);
  });

  it("marks #021 inventory complete without claiming Founder Confirmed", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    // system-core/support/producers/payoffs, bridge-card, causality-*, and
    // graph-* moved to app/research/page.tsx with the rest of the Deep
    // Forge vault — check the union of both files.
    const researchPage = readFileSync(join(root, "app/research/page.tsx"), "utf8");
    // Some inspect surfaces moved into forge-session-context.tsx and the
    // extracted chamber components during the page.tsx decomposition
    // (Phase 4 Stages 2-3).
    const forgeSessionContext = readFileSync(join(root, "app/forge-session-context.tsx"), "utf8");
    const masterworksChamber = readFileSync(join(root, "app/components/forge/masterworks-chamber.tsx"), "utf8");
    // The workbench chamber's own inspect surfaces moved to its own
    // component during the page.tsx decomposition (Phase 4 Stage 4).
    const workbenchChamber = readFileSync(join(root, "app/components/forge/workbench-chamber.tsx"), "utf8");
    const combined = `${page}\n${researchPage}\n${forgeSessionContext}\n${masterworksChamber}\n${workbenchChamber}`;
    const charter = readFileSync(join(root, "docs/ERA3_COMPLETE.md"), "utf8");
    assert.match(charter, /engineering complete/i);
    assert.match(charter, /Founder Confirmed is not claimed/i);
    assert.doesNotMatch(charter, /Founder Confirmed\*\*/);
    for (const surface of ERA3_CARD_INSPECT_SURFACES) {
      assert.ok(combined.includes(`"${surface}"`), surface);
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
