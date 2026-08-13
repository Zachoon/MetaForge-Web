import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStrategicSubstitutionIntelligenceFromFixtures,
  buildSubstitutionSeatFamilies,
  projectNearEquivalentClaims,
  summarizeLiveSubstitutionArtifact,
} from "../../app/knowledge/strategic-substitution-intelligence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Epic 3 — Strategic Substitution Intelligence", () => {
  it("does not import Brain construction mutators", () => {
    const source = readFileSync(join(root, "app/knowledge/strategic-substitution-intelligence.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta|package-plan-optimizer/);
    assert.match(source, /selectionBehaviorChanged:\s*false/);
  });

  it("builds seat families and when-not-to-substitute from topologies", () => {
    const topologies = [
      {
        deckId: "d1",
        nodes: [
          { name: "Path to Exile", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
          { name: "Swords to Plowshares", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
          { name: "Sol Ring", roles: ["ramp"], sequenceStages: ["setup"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
        ],
      },
      {
        deckId: "d2",
        nodes: [
          { name: "Path to Exile", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
          { name: "Swords to Plowshares", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
          { name: "Sol Ring", roles: ["ramp"], sequenceStages: ["setup"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
        ],
      },
      {
        deckId: "d3",
        nodes: [
          { name: "Path to Exile", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
          { name: "Abrupt Decay", roles: ["interaction"], sequenceStages: ["stabilize"], cmc: 2, isolated: false, planConnected: true, multifunction: false },
          { name: "Sol Ring", roles: ["ramp"], sequenceStages: ["setup"], cmc: 1, isolated: false, planConnected: true, multifunction: false },
        ],
      },
    ];
    const records = topologies.map((topology, idx) => ({
      id: topology.deckId,
      commanders: [{ name: "Atraxa, Praetors' Voice" }],
      topCut: idx === 0,
      placement: idx + 1,
    }));
    const analyses = records.map((record) => ({
      deckId: record.id,
      commanders: ["Atraxa, Praetors' Voice"],
      packages: [],
    }));

    const bundle = buildSubstitutionSeatFamilies({ topologies, analyses, records });
    assert.ok(bundle.families.length >= 1);
    assert.equal(bundle.families[0].writesToBrain, false);
    assert.ok(bundle.families[0].memberCount >= 2);
    assert.ok(bundle.whenNotToSubstitute.length >= 1);
    assert.match(bundle.whenNotToSubstitute[0].reason, /coexistence/i);
  });

  it("projects mined near-equivalents without selection changes", () => {
    const claims = projectNearEquivalentClaims({
      evidence: [{
        commanderIdentity: "Ral, Monsoon Mage",
        cardA: "Lightning Bolt",
        cardB: "Volcanic Spite",
        xorRate: 1,
        confidence: 0.8,
        footprintKey: "interaction::stabilize::none::wired::low",
        note: "Similar strategic footprint; rarely need to coexist.",
      }],
    });
    assert.equal(claims.length, 1);
    assert.equal(claims[0].kind, "near_equivalent");
    assert.equal(claims[0].selectionBehaviorChanged, false);
  });

  it("fixture corpus produces seat families (even when XOR mining is empty)", () => {
    const intel = buildStrategicSubstitutionIntelligenceFromFixtures();
    assert.equal(intel.writesToBrain, false);
    assert.equal(intel.brainChanges, 0);
    assert.equal(intel.antiNetdeck.selectionBehaviorChanged, false);
    assert.ok(intel.seatFamilies.length >= 3);
    assert.ok(intel.whenNotToSubstitute.length >= 1);
    assert.ok(intel.corpus.topologies >= 50);
  });

  it("live artifact substitution summary is read-only when present", () => {
    const path = join(root, "tests/field-intelligence/corpus-intelligence-v1.json");
    if (!existsSync(path)) return;
    const artifact = JSON.parse(readFileSync(path, "utf8"));
    const summary = summarizeLiveSubstitutionArtifact(artifact);
    assert.equal(summary.writesToBrain, false);
    assert.equal(summary.selectionBehaviorChanged, false);
    assert.ok(Number.isFinite(summary.nearEquivalentPairs));
    assert.ok(summary.nearEquivalentPairs >= 0);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 3/);
    assert.match(docs, /Strategic Substitution Intelligence/);
    const page = readFileSync(join(root, "tests/knowledge/run-epic3-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
