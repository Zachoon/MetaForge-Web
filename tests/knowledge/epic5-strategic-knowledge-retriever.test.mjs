import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCanonicalCardIntelligence } from "../../app/knowledge/canonical-card-intelligence.mjs";
import {
  loadKnowledgeSnapshot,
  retrieveCardKnowledge,
  retrieveCommanderProfile,
  retrieveDecisionConcepts,
  retrieveStrategicKnowledge,
  retrieveSubstitutionSeat,
  summarizeRetrieverCoverage,
} from "../../app/knowledge/strategic-knowledge-retriever.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function miniSnapshot() {
  return Object.freeze({
    writesToBrain: false,
    epic1Cards: Object.freeze([
      buildCanonicalCardIntelligence({
        card: {
          name: "Doubling Season",
          typeLine: "Enchantment",
          oracleText:
            "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.",
        },
      }),
    ]),
    epic2: Object.freeze({
      commanderProfiles: Object.freeze([
        Object.freeze({
          commanderIdentity: "Pearl-Ear, Imperial Advisor",
          sampleSize: 36,
          confidence: Object.freeze({ level: "high", score: 0.85 }),
          stronglyReplicated: Object.freeze([{ id: "auras", count: 36 }]),
          contradictions: Object.freeze([]),
        }),
      ]),
    }),
    epic3: Object.freeze({
      seatFamilies: Object.freeze([
        Object.freeze({
          commanderIdentity: "Pearl-Ear, Imperial Advisor",
          memberCount: 3,
          members: Object.freeze([
            Object.freeze({ name: "Aura Piece 0", decks: 10 }),
            Object.freeze({ name: "Aura Piece 1", decks: 10 }),
          ]),
          seat: Object.freeze({ roles: ["protection"], stages: ["stabilize"], cmcBand: "low" }),
        }),
      ]),
      whenNotToSubstitute: Object.freeze([
        Object.freeze({
          commanderIdentity: "Pearl-Ear, Imperial Advisor",
          cardA: "Aura Piece 0",
          cardB: "Aura Piece 1",
          reason: "same_seat_high_coexistence",
          coexistRate: 0.9,
          note: "complements",
        }),
      ]),
    }),
    epic4: Object.freeze({
      candidates: Object.freeze([
        Object.freeze({
          conceptId: "sequencing",
          label: "sequencing",
          independentExperts: 3,
          authors: Object.freeze(["a", "b", "c"]),
          promoted: false,
          activated: false,
        }),
      ]),
      rejects: Object.freeze([
        Object.freeze({
          conceptId: "risk",
          label: "risk",
          rejectReason: "insufficient_independent_replication",
          authors: Object.freeze(["a"]),
        }),
      ]),
    }),
  });
}

describe("Epic 5 — Strategic Knowledge Retriever", () => {
  it("does not import Brain construction mutators", () => {
    const source = readFileSync(join(root, "app/knowledge/strategic-knowledge-retriever.mjs"), "utf8");
    assert.match(source, /writesToBrain:\s*false/);
    assert.doesNotMatch(source, /forgeNativeMasterwork|chooseSpells|prospectiveSlotDelta/);
  });

  it("retrieves card / commander / seat / concept knowledge without inventing absence", () => {
    const snap = miniSnapshot();

    const card = retrieveCardKnowledge({ name: "Doubling Season" }, snap);
    assert.equal(card.ok, true);
    assert.equal(card.kind, "card_intelligence");
    assert.ok(card.card.knowledgeClasses.length >= 1);

    const missingCard = retrieveCardKnowledge({ name: "Completely Unknown Card XYZ" }, snap);
    assert.equal(missingCard.ok, false);
    assert.equal(missingCard.unknown, true);
    assert.match(missingCard.note, /Unknown is not absent/i);

    const commander = retrieveCommanderProfile({ commander: "Pearl-Ear" }, snap);
    assert.equal(commander.ok, true);
    assert.equal(commander.profile.sampleSize, 36);

    const seats = retrieveSubstitutionSeat({ commander: "Pearl-Ear", card: "Aura Piece 0" }, snap);
    assert.equal(seats.ok, true);
    assert.ok(seats.families.length >= 1);
    assert.ok(seats.whenNot.length >= 1);

    const concept = retrieveDecisionConcepts({ concept: "sequencing" }, snap);
    assert.equal(concept.ok, true);
    assert.equal(concept.candidate.promoted, false);

    const rejected = retrieveDecisionConcepts({ concept: "risk" }, snap);
    assert.equal(rejected.kind, "decision_concept_reject");
  });

  it("routes mixed queries and summarizes coverage", () => {
    const snap = miniSnapshot();
    const routed = retrieveStrategicKnowledge({ kind: "commander", commander: "Pearl-Ear" }, snap);
    assert.equal(routed.kind, "commander_profile");

    const coverage = summarizeRetrieverCoverage(snap);
    assert.equal(coverage.writesToBrain, false);
    assert.equal(coverage.brainChanges, 0);
    assert.equal(coverage.epic1Cards, 1);
    assert.equal(coverage.commanderProfiles, 1);
    assert.equal(coverage.decisionCandidates, 1);
  });

  it("fixture snapshot load is inspectable (integration)", () => {
    const snap = loadKnowledgeSnapshot();
    assert.equal(snap.writesToBrain, false);
    assert.ok(snap.epic2.commanderProfiles.length >= 3);
    assert.ok(snap.epic3.seatFamilies.length >= 3);
    assert.ok(snap.epic4.candidates.length >= 1);
    const hit = retrieveStrategicKnowledge({ commander: snap.epic2.commanderProfiles[0].commanderIdentity }, snap);
    assert.equal(hit.ok, true);
  });

  it("program docs and report script exist", () => {
    const docs = readFileSync(join(root, "docs/KNOWLEDGE_EXPANSION_PROGRAM.md"), "utf8");
    assert.match(docs, /Epic 5/);
    assert.match(docs, /Strategic Knowledge Retriever/);
    const page = readFileSync(join(root, "tests/knowledge/run-epic5-report.mjs"), "utf8");
    assert.match(page, /Strategic Knowledge Report/);
  });
});
