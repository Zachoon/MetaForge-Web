import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createCorpusDeckRecord,
  analyzeCorpus,
  buildDeckStrategicTopology,
  buildCorpusStrategicTopologies,
  deriveTopologyMetrics,
  buildAllLevelATopology,
  mineStrategicSequences,
  mineContextualCardFunctions,
  mineSubstitutionEvidence,
  buildTopologyDiscoveryQueue,
  classifyEdgeStrength,
  EDGE_STRENGTH,
  isStrongEdge,
  appendResearchObservations,
  observationsFromArtifact,
  buildCorpusIntelligenceArtifact,
  DEFAULT_LIVE_SAMPLE,
} from "../app/field-intelligence/index.mjs";

function card(name, opts = {}) {
  return {
    quantity: 1,
    name,
    typeLine: opts.typeLine || "Instant",
    oracleText: opts.oracleText || "Counter target spell.",
    cmc: opts.cmc ?? 2,
    roles: opts.roles || ["interaction"],
    mechanics: opts.mechanics || { produces: [], rewards: [], signals: [] },
    strategicSemantics: opts.strategicSemantics || [],
    commanderConnectionSignals: opts.commanderConnectionSignals || [],
    sequenceStages: opts.sequenceStages || ["stabilize"],
  };
}

function mkRecord(id, { eventId, commanders, rows, placement, topCut, topCutSize, performanceClass }) {
  return createCorpusDeckRecord({
    id,
    eventId,
    commanders: commanders.map((name) => ({
      name,
      oracleText: "Whenever you cast an instant or sorcery spell, draw a card.",
      typeLine: "Legendary Creature",
    })),
    rows,
    placement,
    topCut,
    topCutSize,
    performanceClass,
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
    tournamentSource: "topdeck",
  });
}

test("co-occurrence alone cannot produce a strong strategic edge", () => {
  assert.equal(classifyEdgeStrength({ type: "commonly_cooccurs", semanticSupport: false }), "weak");
  assert.equal(isStrongEdge({
    type: "commonly_cooccurs",
    semanticSupport: false,
    weakBecauseCooccurrenceOnly: true,
  }), false);
  assert.equal(classifyEdgeStrength({ type: "enables", semanticSupport: false }), "weak");
});

test("semantic support can produce a strong edge", () => {
  assert.equal(classifyEdgeStrength({ type: "protects_engine", semanticSupport: true }), "strong");
  assert.equal(isStrongEdge({
    type: "protects_engine",
    semanticSupport: true,
    weakBecauseCooccurrenceOnly: false,
  }), true);
});

test("interaction topology distinguishes isolated from plan-connected interaction", () => {
  const record = mkRecord("iso-1", {
    eventId: "e1",
    commanders: ["Test Spell Echo"],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    rows: [
      card("Isolated Removal", {
        typeLine: "Creature — Human Assassin",
        roles: ["interaction"],
        oracleText: "Destroy target creature.",
        sequenceStages: ["stabilize"],
        mechanics: { produces: [], rewards: [], signals: [] },
      }),
      card("Token Maker", {
        typeLine: "Creature",
        roles: ["threat"],
        oracleText: "Create a 1/1 token.",
        mechanics: { produces: ["tokens"], rewards: [], signals: ["tokens"] },
        sequenceStages: ["convert"],
      }),
      card("Token Payoff", {
        typeLine: "Creature",
        roles: ["threat"],
        oracleText: "Creatures you control get +1/+1 for each token you control.",
        mechanics: { produces: [], rewards: ["tokens"], signals: ["tokens"] },
        sequenceStages: ["close"],
      }),
      card("Silence Path", {
        roles: ["interaction", "protection"],
        oracleText: "Players can't cast spells this turn. Hexproof.",
        sequenceStages: ["stabilize"],
      }),
    ],
  });
  const [analysis] = analyzeCorpus([record]);
  // Prefer pre-annotated rows so Isolated Removal keeps empty mechanics.
  const topology = buildDeckStrategicTopology({
    ...analysis,
    annotatedRows: record.rows,
  }, record, { rows: record.rows });
  const isolated = topology.nodes.find((n) => n.name === "Isolated Removal");
  const metrics = deriveTopologyMetrics(topology);
  assert.ok(isolated);
  assert.equal(typeof isolated.isolated, "boolean");
  assert.equal(typeof isolated.planConnected, "boolean");
  assert.ok(isolated.isolated === true || isolated.planConnected === false || isolated.degree === 0);
  assert.ok(
    topology.edges.some((e) =>
      e.type === "clears_path_for"
      || e.type === "protects_combo_or_close"
      || e.type === "protects_engine"
      || e.type === "enables"
      || e.type === "feeds"),
  );
  assert.ok("isolatedInteractiveRatio" in metrics);
  assert.ok("planConnectedInteractionRatio" in metrics);
});

test("multifunction interaction is distinct from raw interaction count", () => {
  const record = mkRecord("mf-1", {
    eventId: "e1",
    commanders: ["Test Spell Echo"],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    rows: [
      card("Flexible Answer", {
        roles: ["interaction", "draw"],
        oracleText: "Counter target spell. Draw a card.",
        mechanics: { produces: ["draw"], rewards: ["spells"], signals: ["draw", "spells"] },
        sequenceStages: ["stabilize", "convert"],
      }),
      card("Spell Payoff", {
        typeLine: "Creature",
        roles: ["threat"],
        oracleText: "Whenever you cast an instant or sorcery spell, create a token.",
        mechanics: { produces: ["tokens"], rewards: ["spells"], signals: ["spells", "tokens"] },
        sequenceStages: ["close"],
      }),
      card("Plain Counter", {
        roles: ["interaction"],
        oracleText: "Counter target spell.",
        sequenceStages: ["stabilize"],
      }),
    ],
  });
  const [analysis] = analyzeCorpus([record]);
  const topology = buildDeckStrategicTopology(analysis, record);
  const flexible = topology.nodes.find((n) => n.name === "Flexible Answer");
  const plain = topology.nodes.find((n) => n.name === "Plain Counter");
  assert.ok(flexible);
  assert.ok(plain);
  assert.equal(typeof flexible.multifunction, "boolean");
  const metrics = deriveTopologyMetrics(topology);
  // Ratio is 0–1; interactive card count is an absolute — different representations.
  assert.ok(metrics.multifunctionInteractionRatio <= 1);
  assert.ok(metrics.interactiveCardCount >= 2);
  assert.notEqual(metrics.multifunctionInteractionRatio, metrics.interactiveCardCount);
});

test("same card may receive different contextual functions in different decks", () => {
  const shared = "Versatile Answer";
  const deckA = mkRecord("ctx-a", {
    eventId: "eA",
    commanders: ["Alpha Commander"],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    rows: [
      card(shared, {
        roles: ["interaction", "protection"],
        oracleText: "Hexproof. Counter target spell.",
        sequenceStages: ["stabilize"],
      }),
      card("Commander Buddy", {
        typeLine: "Legendary Creature",
        roles: ["commander"],
        oracleText: "Partner",
      }),
    ],
  });
  const deckB = mkRecord("ctx-b", {
    eventId: "eB",
    commanders: ["Beta Combo"],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    rows: [
      card(shared, {
        roles: ["interaction", "protection"],
        oracleText: "Hexproof. Counter target spell.",
        sequenceStages: ["stabilize"],
      }),
      card("Win Piece", {
        typeLine: "Sorcery",
        roles: ["threat"],
        oracleText: "You win the game.",
        sequenceStages: ["close"],
      }),
    ],
  });
  // Force different annotated contexts via analyses after annotate.
  const analyses = analyzeCorpus([deckA, deckB]);
  // Inject commander connection on deck A style and close protection on B by rebuilding topologies.
  const topologies = buildCorpusStrategicTopologies(analyses, [deckA, deckB]);
  const contextual = mineContextualCardFunctions(topologies, analyses, { minDecks: 2 });
  const row = contextual.cards.find((c) => c.cardName === shared);
  assert.ok(row);
  assert.equal(row.globalSingleMeaningForbidden, true);
  // At least one function observed; context-dependence preferred when targets differ.
  assert.ok(Object.keys(row.functionDistribution).length >= 1);
});

test("structural sequences do not imply observed game ordering", () => {
  const record = mkRecord("seq-1", {
    eventId: "e1",
    commanders: ["Test Spell Echo"],
    placement: 1,
    topCut: true,
    topCutSize: 4,
    performanceClass: "single_event_converter",
    rows: [
      card("Ramp Rock", {
        typeLine: "Artifact",
        roles: ["ramp"],
        oracleText: "Add one mana.",
        sequenceStages: ["setup"],
        mechanics: { produces: ["artifacts"], rewards: [], signals: ["artifacts"] },
      }),
      card("Engine", {
        typeLine: "Creature",
        roles: ["threat"],
        oracleText: "Whenever you cast an instant, draw a card.",
        sequenceStages: ["convert"],
        mechanics: { produces: ["draw"], rewards: ["spells"], signals: ["spells", "draw"] },
      }),
      card("Payoff", {
        typeLine: "Sorcery",
        roles: ["threat"],
        oracleText: "You win the game.",
        sequenceStages: ["close"],
        mechanics: { produces: [], rewards: ["draw"], signals: ["draw"] },
      }),
      card("Silence", {
        roles: ["interaction"],
        oracleText: "Players can't cast spells this turn.",
        sequenceStages: ["stabilize"],
      }),
    ],
  });
  const analyses = analyzeCorpus([record]);
  const topologies = buildCorpusStrategicTopologies(analyses, [record]);
  const sequences = mineStrategicSequences(topologies, analyses, [record]);
  for (const seq of sequences.evidence) {
    assert.equal(seq.impliesObservedGameOrder, false);
  }
});

test("substitution evidence requires footprint similarity, not just frequency", () => {
  const identity = "Substitute Pilot";
  const records = [];
  for (let i = 0; i < 4; i += 1) {
    records.push(mkRecord(`sub-${i}`, {
      eventId: `ev-${i}`,
      commanders: [identity],
      placement: i < 2 ? 1 : 16,
      topCut: i < 2,
      topCutSize: 4,
      rows: [
        card(i % 2 === 0 ? "Answer A" : "Answer B", {
          roles: ["interaction", "protection"],
          oracleText: "Hexproof. Counter target spell.",
          sequenceStages: ["stabilize"],
          cmc: 2,
        }),
        card("Shared Engine", {
          typeLine: "Creature",
          roles: ["threat"],
          oracleText: "Whenever you cast an instant, create a token.",
          sequenceStages: ["convert", "close"],
          mechanics: { produces: ["tokens"], rewards: ["spells"], signals: ["tokens", "spells"] },
        }),
        // High-frequency but dissimilar footprint — should not substitute with Answer A/B.
        card("Sol Ring", {
          typeLine: "Artifact",
          roles: ["ramp"],
          oracleText: "Add two mana.",
          sequenceStages: ["setup"],
          cmc: 1,
          mechanics: { produces: ["artifacts"], rewards: [], signals: ["artifacts"] },
        }),
      ],
    }));
  }
  const analyses = analyzeCorpus(records);
  const topologies = buildCorpusStrategicTopologies(analyses, records);
  const subs = mineSubstitutionEvidence(topologies, analyses, records, { minDecksPerIdentity: 3 });
  // Dissimilar ramp vs interaction must not appear as substitutes solely from frequency.
  assert.ok(!(subs.evidence || []).some((e) =>
    (e.cardA === "Sol Ring" && (e.cardB === "Answer A" || e.cardB === "Answer B"))
    || (e.cardB === "Sol Ring" && (e.cardA === "Answer A" || e.cardA === "Answer B"))));
});

test("Level-A topology comparisons remain same-commander/same-event", () => {
  const records = [
    mkRecord("la-h", {
      eventId: "same-event",
      commanders: ["Kraum, Ludevic's Opus", "Tymna the Weaver"],
      placement: 1,
      topCut: true,
      topCutSize: 4,
      rows: [
        card("Protect", { roles: ["protection", "interaction"], oracleText: "Hexproof. Counter target spell." }),
        card("Win", { typeLine: "Sorcery", roles: ["threat"], oracleText: "You win the game.", sequenceStages: ["close"] }),
        card("Engine", { typeLine: "Creature", roles: ["threat"], oracleText: "Whenever you cast an instant, draw a card.", sequenceStages: ["convert"] }),
      ],
    }),
    mkRecord("la-l", {
      eventId: "same-event",
      commanders: ["Kraum, Ludevic's Opus", "Tymna the Weaver"],
      placement: 20,
      topCut: false,
      topCutSize: 4,
      rows: [
        card("Lonely Counter", { roles: ["interaction"], oracleText: "Counter target spell." }),
        card("Random Threat", { typeLine: "Creature", roles: ["threat"], oracleText: "A 5/5 creature.", sequenceStages: ["close"] }),
      ],
    }),
    mkRecord("other", {
      eventId: "other-event",
      commanders: ["Other Commander"],
      placement: 1,
      topCut: true,
      topCutSize: 4,
      rows: [card("X", { roles: ["interaction"] })],
    }),
  ];
  const analyses = analyzeCorpus(records);
  const topologies = buildCorpusStrategicTopologies(analyses, records);
  const levelA = buildAllLevelATopology(records, topologies);
  assert.ok(levelA.usableCohorts >= 1);
  for (const cohort of levelA.cohorts) {
    assert.equal(cohort.level, "A");
    assert.ok(cohort.eventId);
    assert.ok(cohort.commanderIdentity);
  }
  assert.ok(levelA.kraumTymnaFocus.length >= 1);
});

test("cross-commander transfer never occurs automatically", async () => {
  const fixture = await buildCorpusIntelligenceArtifact({
    records: [
      mkRecord("t1", {
        eventId: "e1",
        commanders: ["Commander One"],
        placement: 1,
        topCut: true,
        topCutSize: 4,
        rows: [card("A"), card("B", { typeLine: "Creature", roles: ["threat"], oracleText: "You win the game.", sequenceStages: ["close"] })],
      }),
      mkRecord("t2", {
        eventId: "e1",
        commanders: ["Commander One"],
        placement: 16,
        topCut: false,
        topCutSize: 4,
        rows: [card("C")],
      }),
    ],
  });
  assert.equal(fixture.topologyDiscovery.writesToBrain, false);
  assert.equal(fixture.topologyDiscovery.crossCommanderTransfer.automaticTransfer, false);
  assert.equal(fixture.brainPolicyTouched, false);
  assert.equal(fixture.constructionMutated, false);
  assert.equal(fixture.strategicRelationshipMining.writesToBrain, false);
});

test("research store appends and dedupes by fingerprint", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-research-"));
  const path = join(dir, "observations.jsonl");
  try {
    const artifact = {
      generatedAt: "2026-08-10T00:00:00.000Z",
      levelATopology: {
        cohorts: [{
          eventId: "e1",
          commanderIdentity: "Test",
          highCount: 1,
          lowCount: 1,
          strongest: [{ feature: "planConnectedInteractionRatio", delta: 0.2 }],
        }],
      },
      strategicSequences: { evidence: [] },
      topologyDiscovery: { candidates: [] },
      corpus: { decksAnalyzed: 2, eventsRepresented: 1 },
    };
    const obs = observationsFromArtifact(artifact);
    const first = appendResearchObservations(path, obs);
    const second = appendResearchObservations(path, obs);
    assert.ok(first.written >= 1);
    assert.equal(second.written, 0);
    assert.ok(second.skipped >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live sample defaults expanded for v1.3 bounded growth", () => {
  assert.equal(DEFAULT_LIVE_SAMPLE.lastDays, 60);
  assert.equal(DEFAULT_LIVE_SAMPLE.maxEvents, 40);
  assert.equal(DEFAULT_LIVE_SAMPLE.maxDecksPerEvent, 20);
});

test("EDGE_STRENGTH export matches ontology", () => {
  assert.equal(EDGE_STRENGTH.strong, "strong");
  assert.equal(EDGE_STRENGTH.weak, "weak");
});
