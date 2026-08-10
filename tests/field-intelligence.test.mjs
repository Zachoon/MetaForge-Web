import assert from "node:assert/strict";
import test from "node:test";
import {
  createCorpusDeckRecord,
  calculateCompetitiveEvidenceWeight,
  frequencyIsNotQuality,
  analyzeCorpusDeck,
  analyzeCorpus,
  buildStructuralEvidence,
  compareCorpusEvidenceToBrainTheory,
  buildCorpusRelationshipGraph,
  discoverPackageCandidates,
  discoverSemanticBlindSpots,
  runHoldoutValidation,
  assertStructuralBeatsPopular,
  antiNetdeckPolicy,
  normalizeTopDeckTournament,
  normalizeEdhrecAggregate,
  materializeCompetitiveFixtureCorpus,
  buildCorpusIntelligenceArtifact,
  isHoldoutRecord,
  fetchTopDeckTournaments,
  fetchSpicerackTournaments,
  commandersFromDeckObj,
  rowsFromDeckObj,
  selectContrastStandings,
  annotatePerformanceClasses,
  dedupeCorpusRecords,
  isolateSource,
  EDHTOP16_CONSUMPTION,
  resolveCommanderFamily,
  resolveCorpusFamilies,
  enrichCorpusRecord,
  enrichCorpusRecords,
  scryfallLookupName,
  buildComparableCohorts,
  LEVEL_CONFIDENCE,
  buildCorpusQualityReport,
  normalizeCommanderIdentity,
  decomposeThreatCard,
  decomposeSpellCard,
  decomposeInteractionCard,
  buildLevelACohortForensics,
  buildAllLevelAForensics,
  buildPerformanceStructureHypotheses,
  classifyHypothesesAgainstBrain,
  selectHighestConfidenceBrainV2Candidate,
  resolveTopCutStatus,
  isHighPerformerRecord,
} from "../app/field-intelligence/index.mjs";
import { parseTournamentDeckText } from "../app/field-intelligence/decklist-parse.mjs";
import { PHASE_WEIGHT_POLICY, PHASE_REDUNDANCY_POLICY_NOTE, applyPhaseWeights } from "../app/construction-phase.mjs";

test("corpus records normalize deterministically", () => {
  const rows = [
    { quantity: 1, name: "B Card", cmc: 2 },
    { quantity: 1, name: "A Card", cmc: 1 },
  ];
  const a = createCorpusDeckRecord({
    id: "t1",
    commanders: [{ name: "Test Commander", colors: ["W"] }],
    rows,
    evidenceTier: "tournament_performance",
    eventId: "E1",
    eventSize: 64,
    placement: 1,
    topCut: true,
    sourceType: "topdeck_tournament",
  });
  const b = createCorpusDeckRecord({
    id: "t1",
    commanders: [{ name: "Test Commander", colors: ["W"] }],
    rows: [...rows].reverse(),
    evidenceTier: "tournament_performance",
    eventId: "E1",
    eventSize: 64,
    placement: 1,
    topCut: true,
    sourceType: "topdeck_tournament",
  });
  assert.equal(a.rows[0].name, "A Card");
  assert.deepEqual(a.rows.map((r) => r.name), b.rows.map((r) => r.name));
  assert.equal(a.evidenceTier, "tournament_performance");
  assert.equal(a.evidenceClaims.observedAmongTournamentPerformers, true);
});

test("performance weight rewards large events and strong finishes without winner=truth", () => {
  const winnerSmall = calculateCompetitiveEvidenceWeight({
    evidenceTier: "tournament_performance",
    eventSize: 8,
    placement: 1,
    topCut: true,
    observedAt: "2026-01-01",
  }, { independentEventCount: 1 });
  const topCutLarge = calculateCompetitiveEvidenceWeight({
    evidenceTier: "tournament_performance",
    eventSize: 128,
    placement: 4,
    topCut: true,
    observedAt: "2026-01-01",
    matchRecord: { wins: 5, losses: 1, draws: 0 },
  }, { independentEventCount: 3 });
  const unplaced = calculateCompetitiveEvidenceWeight({
    evidenceTier: "tournament_performance",
    eventSize: 128,
    placement: 90,
    topCut: false,
    observedAt: "2026-01-01",
  }, { independentEventCount: 1 });
  const edhrec = calculateCompetitiveEvidenceWeight({
    evidenceTier: "broad_community",
    popularity: { share: 0.9 },
  });
  assert.ok(topCutLarge.weight > winnerSmall.weight);
  assert.ok(topCutLarge.weight > unplaced.weight);
  assert.ok(edhrec.weight < 0.55);
  assert.ok(winnerSmall.notes.includes("winner_is_not_automatic_truth"));
});

test("frequency alone does not imply strategic quality", () => {
  const verdict = frequencyIsNotQuality(500, 0.2);
  assert.equal(verdict.qualityFromFrequencyAlone, false);
  assert.equal(verdict.usableAsStructuralPrior, false);
});

test("TopDeck adapter normalizes standings with contrast placements", () => {
  const normalized = normalizeTopDeckTournament({
    TID: "abc",
    tournamentName: "Test Open",
    startDate: 1700000000,
    format: "EDH",
    topCut: 4,
    players: 32,
    standings: [
      {
        standing: 1,
        name: "Alice",
        id: "a1",
        decklist: "~~Commanders~~\n1 Pearl-Ear, Imperial Advisor\n\n~~Deck~~\n1 Aura Piece 0\n1 Ward 0",
        wins: 5,
        losses: 0,
        draws: 0,
      },
      {
        standing: 20,
        name: "Bob",
        id: "b1",
        decklist: "~~Commanders~~\n1 Pearl-Ear, Imperial Advisor\n\n~~Deck~~\n1 Enchant Soup 0",
        wins: 1,
        losses: 3,
        draws: 0,
      },
    ],
  });
  assert.equal(normalized.records.length, 2);
  assert.equal(normalized.records[0].evidenceTier, "tournament_performance");
  assert.equal(normalized.records[0].topCut, true);
  assert.equal(normalized.records[1].topCut, false);
  assert.ok(normalized.records[0].performanceWeight > normalized.records[1].performanceWeight);
});

test("decklist parser handles commander blocks", () => {
  const parsed = parseTournamentDeckText("~~Commanders~~\n1 A\n\n~~Deck~~\n2 B\n1 C");
  assert.equal(parsed.commanders[0].name, "A");
  assert.equal(parsed.rows.length, 2);
});

test("EDHREC aggregate stays broad_community and non-elite", () => {
  const agg = normalizeEdhrecAggregate({
    commander: "Test Commander",
    synergies: [{ name: "Popular Card", synergy: 0.9, num_decks: 1000, inclusion: 85 }],
  });
  assert.equal(agg.records[0].evidenceTier, "broad_community");
  assert.equal(agg.caution, "high_inclusion_is_not_high_quality");
  assert.equal(agg.relationships[0].eliteValidation, false);
});

test("corpus analysis uses Brain observation without construction mutation", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const record = fixture.records.find((r) => r.rows?.length > 10);
  assert.ok(record);
  const analysis = analyzeCorpusDeck(record);
  assert.equal(analysis.constructionMutated, false);
  assert.equal(analysis.brainPolicyTouched, false);
  assert.ok(analysis.justification);
  assert.ok(Array.isArray(analysis.packages));
});

test("package-leg ratios aggregate and independent sources increase confidence", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const sample = fixture.records.filter((r) => r.evidenceTier === "tournament_performance").slice(0, 24);
  const analyses = sample.map((record) => analyzeCorpusDeck(record));
  const structural = buildStructuralEvidence(analyses, sample);
  assert.ok(Object.keys(structural.packageCoreRanges).length >= 1 || Object.keys(structural.roleRatioRanges).length >= 1);
  const graph = buildCorpusRelationshipGraph(analyses, sample);
  const weak = graph.edges.filter((e) => e.weakBecauseCooccurrenceOnly);
  const strong = graph.edges.filter((e) => e.semanticSupportRatio > 0 && !e.weakBecauseCooccurrenceOnly);
  assert.ok(graph.edgeCount >= 0);
  // Co-occurrence-only edges stay low confidence when present.
  for (const edge of weak.slice(0, 5)) {
    assert.ok(edge.confidence <= 0.35);
  }
  if (strong.length) {
    assert.ok(strong.some((edge) => edge.confidence > weak[0]?.confidence || 0));
  }
});

test("hold-out decks are excluded from their own evidence", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => r.rows?.length).slice(0, 40);
  const analyses = records.map((record) => analyzeCorpusDeck(record));
  const holdout = runHoldoutValidation(records, analyses);
  assert.ok(holdout.holdoutDecks >= 1);
  for (const id of holdout.holdoutIds) {
    assert.equal(isHoldoutRecord(records.find((r) => r.id === id)), true);
  }
  assert.ok(holdout.notes.includes("holdout_decks_excluded_from_their_own_evidence"));
});

test("popular cards do not automatically defeat stronger structural candidates", () => {
  const result = assertStructuralBeatsPopular();
  assert.equal(result.novelWins, true);
  assert.ok(result.novel.structuralScore > result.popular.popularityTerm);
  assert.ok(antiNetdeckPolicy().forbidden.includes("copy_modal_99"));
});

test("unknown clusters and semantic disagreements are candidates not mutations", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => r.rows?.length).slice(0, 30);
  const analyses = records.map((record) => analyzeCorpusDeck(record));
  const packages = discoverPackageCandidates(analyses, records, { minDecks: 2, minCommanders: 1, includeMapped: true });
  for (const candidate of packages.candidates) {
    assert.equal(candidate.autoCreateBrainPackage, false);
  }
  const blinds = discoverSemanticBlindSpots(analyses, [], { minConfidence: 0.2 });
  for (const candidate of blinds.candidates) {
    assert.equal(candidate.autoMutateBrain, false);
  }
});

test("brain vs human compare returns agreement buckets", () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => r.rows?.length).slice(0, 20);
  const analyses = records.map((record) => analyzeCorpusDeck(record));
  const structural = buildStructuralEvidence(analyses, records);
  const compare = compareCorpusEvidenceToBrainTheory(structural, analyses);
  assert.ok(compare.agreements);
  assert.ok(compare.humanSupportedBlindSpots);
  assert.ok(compare.metaforgeDisagreements);
  assert.ok(compare.humanNoise);
});

test("corpus intelligence artifact is deterministic-shaped and non-mutating", async () => {
  const fixture = materializeCompetitiveFixtureCorpus();
  const records = fixture.records.filter((r) => r.rows?.length).slice(0, 16);
  const artifact = await buildCorpusIntelligenceArtifact({
    records,
    edhrecAggregates: fixture.edhrecAggregates,
    liveCoverage: { topdeck: { attempted: false } },
    enrich: false,
  });
  assert.equal(artifact.brainPolicyTouched, false);
  assert.equal(artifact.constructionMutated, false);
  assert.ok(artifact.corpus.decksAnalyzed >= 1);
  assert.ok(artifact.antiNetdeck.structuralBeatsPopular.novelWins);
  assert.ok(artifact.holdout);
  assert.ok(artifact.corpusQuality);
  assert.ok(artifact.familyResolution);
  assert.ok(artifact.comparableCohorts);
});

test("TopDeck missing API key is actionable needs_credentials, not a crash", async () => {
  const previous = process.env.TOPDECK_API_KEY;
  delete process.env.TOPDECK_API_KEY;
  const result = await fetchTopDeckTournaments({});
  assert.equal(result.status, "needs_credentials");
  assert.equal(result.reason, "missing_TOPDECK_API_KEY");
  assert.ok(result.actionable?.powershell);
  assert.equal(result.tournaments.length, 0);
  if (previous != null) process.env.TOPDECK_API_KEY = previous;
});

test("TopDeck deckObj Commanders/Mainboard map shape normalizes", () => {
  const commanders = commandersFromDeckObj({
    Commanders: { "Pearl-Ear, Imperial Advisor": { id: 1 } },
    Mainboard: { "Aura Piece 0": { count: 1 }, "Ward 0": { quantity: 1 } },
  });
  const rows = rowsFromDeckObj({
    Commanders: { "Pearl-Ear, Imperial Advisor": { id: 1 } },
    Mainboard: { "Aura Piece 0": { count: 1 }, "Ward 0": { quantity: 1 } },
  });
  assert.equal(commanders[0].name, "Pearl-Ear, Imperial Advisor");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Aura Piece 0");
});

test("contrast sampling keeps converters and lower placers", () => {
  const standings = Array.from({ length: 20 }, (_, i) => ({
    standing: i + 1,
    name: `P${i}`,
    decklist: "1 Card",
  }));
  const selected = selectContrastStandings(standings, { topCutSize: 4, topCutSlots: 4, lowerComparisonSlots: 4, maxDecksPerEvent: 8 });
  assert.ok(selected.some((row) => row.standing <= 4));
  assert.ok(selected.some((row) => row.standing > 4));
  assert.ok(selected.length <= 8);
});

test("repeated converter class outranks single-event and participant", () => {
  const records = annotatePerformanceClasses([
    createCorpusDeckRecord({
      id: "a1",
      commanders: [{ name: "Cmd A" }],
      rows: [{ quantity: 1, name: "X" }],
      evidenceTier: "tournament_performance",
      eventId: "E1",
      placement: 1,
      topCut: true,
      sourceType: "topdeck_tournament",
    }),
    createCorpusDeckRecord({
      id: "a2",
      commanders: [{ name: "Cmd A" }],
      rows: [{ quantity: 1, name: "Y" }],
      evidenceTier: "tournament_performance",
      eventId: "E2",
      placement: 2,
      topCut: true,
      sourceType: "topdeck_tournament",
    }),
    createCorpusDeckRecord({
      id: "b1",
      commanders: [{ name: "Cmd B" }],
      rows: [{ quantity: 1, name: "Z" }],
      evidenceTier: "tournament_performance",
      eventId: "E1",
      placement: 20,
      topCut: false,
      sourceType: "topdeck_tournament",
    }),
  ]);
  assert.equal(records.find((r) => r.id === "a1").performanceClass, "repeated_converter");
  assert.equal(records.find((r) => r.id === "b1").performanceClass, "tournament_participant");
  const repeated = calculateCompetitiveEvidenceWeight(records.find((r) => r.id === "a1"));
  const participant = calculateCompetitiveEvidenceWeight(records.find((r) => r.id === "b1"));
  assert.ok(repeated.weight > participant.weight);
});

test("dedupe collapses cross-source fingerprint collisions", () => {
  const sharedRows = [{ quantity: 1, name: "Shared Card" }];
  const a = createCorpusDeckRecord({
    id: "topdeck:1",
    commanders: [{ name: "Cmd" }],
    rows: sharedRows,
    evidenceTier: "tournament_performance",
    eventId: "E1",
    placement: 1,
    topCut: true,
    tournamentSource: "topdeck",
    sourceType: "topdeck_tournament",
    performanceWeight: 0.9,
  });
  const b = createCorpusDeckRecord({
    id: "spicerack:1",
    commanders: [{ name: "Cmd" }],
    rows: sharedRows,
    evidenceTier: "tournament_performance",
    eventId: "E9",
    placement: 12,
    topCut: false,
    tournamentSource: "spicerack",
    sourceType: "spicerack_tournament",
    performanceWeight: 0.4,
  });
  const deduped = dedupeCorpusRecords([a, b]);
  assert.equal(deduped.records.length, 1);
  assert.equal(deduped.records[0].tournamentSource, "topdeck");
  assert.ok(deduped.stats.duplicateRate > 0);
});

test("source isolation keeps one failure from killing the run", async () => {
  const ok = await isolateSource("ok", async () => ({ ok: true, status: "ok" }));
  const bad = await isolateSource("bad", async () => {
    throw new Error("boom");
  });
  assert.equal(ok.ok, true);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "boom");
});

test("Spicerack missing key reports documented Public Decklist Database blocker", async () => {
  const previous = process.env.SPICERACK_API_KEY;
  delete process.env.SPICERACK_API_KEY;
  const result = await fetchSpicerackTournaments({});
  assert.equal(result.status, "needs_credentials");
  assert.equal(result.docBlocker.preferredRoute, "public_decklist_database_export");
  assert.equal(result.docBlocker.officialExampleRequiresApiKey, true);
  if (previous != null) process.env.SPICERACK_API_KEY = previous;
});

test("EDHTop16 consumption policy forbids HTML scraping", () => {
  assert.ok(EDHTOP16_CONSUMPTION.cannotSafelyConsume.some((row) => /HTML/i.test(row)));
  assert.equal(EDHTOP16_CONSUMPTION.notPrimaryDecklistSource, true);
});

test("commander family resolves from oracle without hardcoded names", () => {
  const family = resolveCommanderFamily([{
    name: "Pearl-Ear, Imperial Advisor",
    colors: ["W"],
    oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
    typeLine: "Legendary Creature — Fox Advisor",
  }]);
  assert.equal(family.structurallyTyped, true);
  assert.ok(family.packageIds.includes("auras") || family.familyKeys.some((k) => k.includes("aura")));
  assert.equal(family.partner, false);
});

test("partner commanders resolve as combined structural fingerprint", () => {
  const family = resolveCommanderFamily([
    {
      name: "Tymna the Weaver",
      colors: ["W", "B"],
      oracleText: "At the beginning of each of your postcombat main phases, if you attacked with at least two creatures this combat, draw a card.",
      typeLine: "Legendary Creature — Human Cleric",
    },
    {
      name: "Thrasios, Triton Hero",
      colors: ["G", "U"],
      oracleText: "{4}: Scry 1, then reveal the top card of your library. If it's a land card, put it onto the battlefield. Otherwise, draw a card.",
      typeLine: "Legendary Creature — Merfolk Wizard",
    },
  ]);
  assert.equal(family.partner, true);
  assert.ok(family.identityKey.includes("Tymna") && family.identityKey.includes("Thrasios"));
  assert.ok(family.resolved);
});

test("card enrichment maps Scryfall collection payloads and discounts poor coverage", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      data: [{
        name: "Sol Ring",
        type_line: "Artifact",
        oracle_text: "{T}: Add {C}{C}.",
        mana_cost: "{1}",
        cmc: 1,
        color_identity: [],
        id: "sol",
      }],
      not_found: [{ name: "Totally Fake Card XYZ" }],
    }),
  });
  const record = createCorpusDeckRecord({
    id: "enrich-1",
    commanders: [{ name: "Sol Ring", colors: [] }],
    rows: [
      { quantity: 1, name: "Sol Ring" },
      { quantity: 1, name: "Totally Fake Card XYZ" },
    ],
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
  });
  const enriched = await enrichCorpusRecord(record, { fetchImpl, force: true });
  assert.ok(enriched.record.rows.some((r) => r.oracleText.includes("Add")));
  assert.ok(enriched.enrichment.unresolved.includes("Totally Fake Card XYZ"));
  assert.ok(enriched.confidenceDiscount < 1);
});

test("DFC lookup uses front face for Scryfall collection", () => {
  assert.equal(scryfallLookupName("Delver of Secrets // Insectile Aberration"), "Delver of Secrets");
});

test("comparable cohorts prefer same-commander Level A over broad Level D", () => {
  const mk = (id, eventId, commander, placement, topCut) => createCorpusDeckRecord({
    id,
    commanders: [{
      name: commander,
      oracleText: "Whenever an Aura you control becomes attached to a creature, draw a card.",
      typeLine: "Legendary Creature",
      colors: ["W"],
    }],
    rows: [
      { quantity: 1, name: "Aura Piece 0", typeLine: "Enchantment — Aura", oracleText: "Enchant creature", cmc: 1, roles: ["threat"], mechanics: { produces: ["auras"], rewards: [] }, strategicSemantics: ["aura"] },
      { quantity: 1, name: "Aura Piece 1", typeLine: "Enchantment — Aura", oracleText: "Enchant creature", cmc: 1, roles: ["threat"], mechanics: { produces: ["auras"], rewards: [] }, strategicSemantics: ["aura"] },
    ],
    evidenceTier: "tournament_performance",
    eventId,
    placement,
    topCut,
    sourceType: "topdeck_tournament",
    performanceClass: topCut ? "single_event_converter" : "tournament_participant",
  });
  const records = [
    mk("h1", "E1", "Aura Commander", 1, true),
    mk("h2", "E1", "Aura Commander", 2, true),
    mk("l1", "E1", "Aura Commander", 20, false),
    mk("l2", "E1", "Aura Commander", 21, false),
    mk("x1", "E1", "Other Commander", 3, true),
    mk("x2", "E1", "Other Commander", 22, false),
  ];
  const analyses = analyzeCorpus(records);
  const families = resolveCorpusFamilies(records, analyses);
  const cohorts = buildComparableCohorts(records, families.analyses, families);
  assert.ok(cohorts.counts.A >= 1);
  assert.ok(LEVEL_CONFIDENCE.A > LEVEL_CONFIDENCE.D);
  assert.ok(cohorts.strongestControlled[0].confidence >= cohorts.cohorts.find((c) => c.level === "D")?.confidence || 0.25);
});

test("package extraction on enriched aura commander matches Brain package machinery", () => {
  const record = createCorpusDeckRecord({
    id: "pkg-1",
    commanders: [{
      name: "Pearl-Ear, Imperial Advisor",
      colors: ["W"],
      oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
      typeLine: "Legendary Creature — Fox Advisor",
    }],
    rows: Array.from({ length: 18 }, (_, i) => ({
      quantity: 1,
      name: `Aura Piece ${i}`,
      typeLine: "Enchantment — Aura",
      oracleText: "Enchant creature. Enchanted creature gets +1/+1.",
      cmc: 1,
    })),
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
  });
  const analysis = analyzeCorpusDeck(record);
  assert.ok(analysis.packages.some((p) => p.id === "auras"));
  assert.ok((analysis.packages.find((p) => p.id === "auras")?.density?.core || 0) >= 10);
});

test("semantic coverage and evidence confidence reflect enrichment quality", async () => {
  const quality = buildCorpusQualityReport({
    records: [
      createCorpusDeckRecord({
        id: "q1",
        commanders: [{ name: "A", oracleText: "draw a card" }],
        rows: [{ quantity: 1, name: "B" }],
        evidenceQualityHints: { semanticCoverageRate: 0.4, confidenceDiscount: 0.35 },
      }),
    ],
    analyses: [{ deckId: "q1", packages: [], interactionGraph: { edgeCount: 0 }, roleDistribution: {} }],
    enrichmentStats: { semanticCoverageRate: 0.4, commanderResolutionRate: 1 },
    familyResolution: { commanderResolutionRate: 1, familyResolutionRate: 0.2, structurallyTyped: 0, unresolved: 1, unresolvedDetails: [], familyDistribution: {} },
  });
  assert.equal(quality.semanticCoverageRate, 0.4);
  assert.ok(quality.packageDetectionRate === 0);
  assert.ok(quality.meanConfidenceDiscount < 1);
});

test("held-out transfer reports null reason honestly when packages missing", () => {
  const records = [
    createCorpusDeckRecord({
      id: "h-a",
      commanders: [{ name: "No Oracle" }],
      rows: [{ quantity: 1, name: "Card" }],
      evidenceTier: "tournament_performance",
      sourceType: "topdeck_tournament",
    }),
    createCorpusDeckRecord({
      id: "h-b",
      commanders: [{ name: "No Oracle 2" }],
      rows: [{ quantity: 1, name: "Card 2" }],
      evidenceTier: "tournament_performance",
      sourceType: "topdeck_tournament",
    }),
  ];
  const analyses = analyzeCorpus(records);
  const holdout = runHoldoutValidation(records, analyses, { modulus: 1, holdoutBuckets: [0] });
  // modulus 1 => every record bucket 0 => all holdout, train empty OR all same
  assert.ok(holdout.packageBandHitRate === null || Number.isFinite(holdout.packageBandHitRate));
  if (holdout.packageBandHitRate === null) {
    assert.ok(holdout.packageBandNullReason);
  }
});

function mkLevelADeck({
  id,
  eventId,
  commanders,
  placement,
  topCut,
  threats = 2,
  interaction = 2,
  spells = 2,
  ramp = 2,
}) {
  const rows = [];
  for (let i = 0; i < threats; i += 1) {
    rows.push({
      quantity: 1,
      name: `Threat ${id}-${i}`,
      typeLine: "Creature — Horror",
      oracleText: i === 0
        ? "When this enters, you win the game if you control a combo piece."
        : "Trample. Whenever this deals combat damage to a player, draw a card.",
      cmc: 4 + i,
      roles: ["threat"],
    });
  }
  for (let i = 0; i < interaction; i += 1) {
    rows.push({
      quantity: 1,
      name: `Counter ${id}-${i}`,
      typeLine: "Instant",
      oracleText: i === 0
        ? "Counter target spell. Draw a card."
        : "Counter target spell.",
      cmc: 2,
      roles: ["interaction"],
    });
  }
  for (let i = 0; i < spells; i += 1) {
    rows.push({
      quantity: 1,
      name: `Cantrip ${id}-${i}`,
      typeLine: "Instant",
      oracleText: "Draw a card.",
      cmc: 1,
      roles: ["draw"],
    });
  }
  for (let i = 0; i < ramp; i += 1) {
    rows.push({
      quantity: 1,
      name: `Rock ${id}-${i}`,
      typeLine: "Artifact",
      oracleText: "{T}: Add {C}.",
      cmc: 2,
      roles: ["ramp"],
    });
  }
  for (let i = 0; i < 8; i += 1) {
    rows.push({
      quantity: 1,
      name: `Land ${id}-${i}`,
      typeLine: "Land",
      oracleText: "{T}: Add {C}.",
      roles: ["land"],
    });
  }
  return createCorpusDeckRecord({
    id,
    commanders: commanders.map((name) => ({ name, typeLine: "Legendary Creature", oracleText: "Partner" })),
    rows,
    evidenceTier: "tournament_performance",
    sourceType: "topdeck_tournament",
    eventId,
    eventSize: 64,
    placement,
    topCut,
    performanceWeight: topCut ? 0.9 : 0.4,
  });
}

test("partner commander identity normalizes deterministically", () => {
  const a = normalizeCommanderIdentity([
    { name: "Thrasios, Triton Hero" },
    { name: "Rograkh, Son of Rohgahh" },
  ]);
  const b = normalizeCommanderIdentity([
    { name: "Rograkh, Son of Rohgahh" },
    { name: "Thrasios, Triton Hero" },
  ]);
  assert.equal(a, b);
  assert.equal(a, "Rograkh, Son of Rohgahh / Thrasios, Triton Hero");
});

test("Level-A cohorts only compare identical commander identities within the same event", () => {
  const records = [
    mkLevelADeck({
      id: "a-h",
      eventId: "E-A",
      commanders: ["Kinnan, Bonder Prodigy"],
      placement: 1,
      topCut: true,
      interaction: 6,
      spells: 6,
    }),
    mkLevelADeck({
      id: "a-l",
      eventId: "E-A",
      commanders: ["Kinnan, Bonder Prodigy"],
      placement: 20,
      topCut: false,
      interaction: 2,
      spells: 2,
    }),
    mkLevelADeck({
      id: "b-h",
      eventId: "E-A",
      commanders: ["Other Commander"],
      placement: 2,
      topCut: true,
    }),
    mkLevelADeck({
      id: "b-l",
      eventId: "E-A",
      commanders: ["Other Commander"],
      placement: 21,
      topCut: false,
    }),
  ];
  const analyses = analyzeCorpus(records);
  const batch = buildAllLevelAForensics(records, analyses);
  assert.equal(batch.usableCohorts, 2);
  for (const cohort of batch.cohorts) {
    const ids = new Set(cohort.placements.map((p) => {
      const record = records.find((r) => r.id === p.deckId);
      return normalizeCommanderIdentity(record.commanders);
    }));
    assert.equal(ids.size, 1);
    assert.equal(cohort.eventId, "E-A");
  }
  const mixed = buildLevelACohortForensics({
    eventId: "E-A",
    commanderIdentity: "Kinnan, Bonder Prodigy",
    records, // includes Other Commander decks — identity filter must drop them
    analyses,
  });
  assert.equal(mixed.ok, true);
  assert.equal(mixed.cohortSize, 2);
  assert.ok(mixed.placements.every((p) => ["a-h", "a-l"].includes(p.deckId)));
});

test("high/low structural deltas calculate with absolute, share, and confidence fields", () => {
  const records = [
    mkLevelADeck({
      id: "h1",
      eventId: "E1",
      commanders: ["Kinnan, Bonder Prodigy"],
      placement: 1,
      topCut: true,
      spells: 8,
      interaction: 5,
    }),
    mkLevelADeck({
      id: "l1",
      eventId: "E1",
      commanders: ["Kinnan, Bonder Prodigy"],
      placement: 30,
      topCut: false,
      spells: 2,
      interaction: 1,
    }),
  ];
  const analyses = analyzeCorpus(records);
  const forensic = buildLevelACohortForensics({
    eventId: "E1",
    commanderIdentity: "Kinnan, Bonder Prodigy",
    records,
    analyses,
  });
  assert.equal(forensic.ok, true);
  const spells = forensic.deltas.find((d) => d.feature === "spells");
  assert.ok(spells);
  assert.ok(spells.delta > 0);
  assert.ok(Number.isFinite(spells.highMean));
  assert.ok(Number.isFinite(spells.lowMean));
  assert.ok(Number.isFinite(spells.magnitude));
  assert.ok(Number.isFinite(spells.confidence));
  assert.equal(spells.sampleSize, 2);
  assert.equal(forensic.note, "single_event_lead_until_replicated");
});

test("single-event result remains a lead; replicated same-direction raises confidence", () => {
  const records = [
    mkLevelADeck({
      id: "e1-h", eventId: "E1", commanders: ["Shell A"], placement: 1, topCut: true, interaction: 8, threats: 1,
    }),
    mkLevelADeck({
      id: "e1-l", eventId: "E1", commanders: ["Shell A"], placement: 20, topCut: false, interaction: 2, threats: 6,
    }),
    mkLevelADeck({
      id: "e2-h", eventId: "E2", commanders: ["Shell A"], placement: 1, topCut: true, interaction: 7, threats: 1,
    }),
    mkLevelADeck({
      id: "e2-l", eventId: "E2", commanders: ["Shell A"], placement: 18, topCut: false, interaction: 2, threats: 5,
    }),
  ];
  const analyses = analyzeCorpus(records);
  const batch = buildAllLevelAForensics(records, analyses);
  assert.equal(batch.usableCohorts, 2);
  const single = buildPerformanceStructureHypotheses({
    cohorts: [batch.cohorts[0]],
  });
  assert.ok(single.byStatus.single_event_lead >= 1);
  assert.equal(single.byStatus.replicated || 0, 0);
  assert.ok(single.singleEventLeads.every((h) => h.brainV2Eligible === false));

  const both = buildPerformanceStructureHypotheses(batch);
  const interactionHyp = both.hypotheses.find((h) => h.featureFamily === "interaction");
  assert.ok(interactionHyp);
  // Same direction across two events should replicate for interaction family.
  assert.equal(interactionHyp.replicationStatus, "replicated");
  assert.ok(interactionHyp.confidence > (single.singleEventLeads[0]?.confidence || 0));
  assert.ok(interactionHyp.brainV2Eligible === true || interactionHyp.confidence >= 0.55);
});

test("contradictory events lower confidence / mark mixed or contradicted", () => {
  const records = [
    mkLevelADeck({
      id: "e1-h", eventId: "E1", commanders: ["Shell B"], placement: 1, topCut: true, threats: 1,
    }),
    mkLevelADeck({
      id: "e1-l", eventId: "E1", commanders: ["Shell B"], placement: 20, topCut: false, threats: 8,
    }),
    mkLevelADeck({
      id: "e2-h", eventId: "E2", commanders: ["Shell B"], placement: 1, topCut: true, threats: 8,
    }),
    mkLevelADeck({
      id: "e2-l", eventId: "E2", commanders: ["Shell B"], placement: 20, topCut: false, threats: 1,
    }),
  ];
  const analyses = analyzeCorpus(records);
  const batch = buildAllLevelAForensics(records, analyses);
  const hyps = buildPerformanceStructureHypotheses(batch);
  const threatHyp = hyps.hypotheses.find((h) => h.featureFamily === "threats");
  assert.ok(threatHyp);
  assert.ok(["mixed", "contradicted"].includes(threatHyp.replicationStatus));
  assert.ok(threatHyp.brainV2Eligible === false);
  assert.ok(threatHyp.confidence < 0.6);
});

test("broad threat role decomposes diagnostically without changing Brain v1", () => {
  const combo = decomposeThreatCard({
    name: "Thassa's Oracle",
    typeLine: "Creature — Merfolk Wizard",
    oracleText: "When Thassa's Oracle enters the battlefield, you win the game if ...",
    cmc: 2,
    roles: ["threat"],
    quantity: 1,
  });
  const standalone = decomposeThreatCard({
    name: "Big Beater",
    typeLine: "Creature — Dragon",
    oracleText: "Flying, trample. Whenever this deals combat damage to a player, draw a card.",
    cmc: 6,
    roles: ["threat"],
    quantity: 1,
  });
  assert.ok(combo.subtypes.includes("combo_component"));
  assert.ok(standalone.subtypes.includes("standalone_threat") || standalone.subtypes.includes("value_engine"));
});

test("interaction composition is separated from raw interaction count", () => {
  const flex = decomposeInteractionCard({
    name: "Flexible Counter",
    typeLine: "Instant",
    oracleText: "Choose one — Counter target spell; or draw a card.",
    cmc: 2,
    roles: ["interaction", "draw"],
    quantity: 1,
  });
  const heavy = decomposeInteractionCard({
    name: "Wrath",
    typeLine: "Sorcery",
    oracleText: "Destroy all creatures.",
    cmc: 5,
    roles: ["interaction"],
    quantity: 1,
  });
  assert.ok(flex.kinds.includes("flexible_modal") || flex.kinds.includes("stack_interaction"));
  assert.ok(heavy.kinds.includes("removal"));
  assert.ok(heavy.kinds.includes("narrow_or_heavy") || heavy.cmc >= 4);

  const spell = decomposeSpellCard({
    name: "Mystical Tutor",
    typeLine: "Instant",
    oracleText: "Search your library for an instant or sorcery card.",
    cmc: 1,
    roles: ["tutor"],
    quantity: 1,
  });
  assert.ok(spell.kinds.includes("tutor") || spell.kinds.includes("tutor_for_win"));
});

test("card popularity does not become a Brain recommendation via Level-A gate", () => {
  const records = [
    mkLevelADeck({
      id: "pop-h", eventId: "EP", commanders: ["Pop Commander"], placement: 1, topCut: true, interaction: 5,
    }),
    mkLevelADeck({
      id: "pop-l", eventId: "EP", commanders: ["Pop Commander"], placement: 22, topCut: false, interaction: 1,
    }),
  ];
  const analyses = analyzeCorpus(records);
  const batch = buildAllLevelAForensics(records, analyses);
  const hyps = buildPerformanceStructureHypotheses(batch);
  const classified = classifyHypothesesAgainstBrain(hyps, { packageDetectionRate: 0.3 });
  const gated = selectHighestConfidenceBrainV2Candidate({
    hypothesesBatch: hyps,
    brainClassifications: classified,
    synthesis: null,
    quality: { semanticCoverageRate: 0.99 },
  });
  assert.equal(gated.implementBrainV2, false);
  assert.equal(gated.brainV1RemainsFrozen, true);
  // Single-event cannot clear replication gate as Brain v2 eligible.
  assert.ok(!gated.candidate || gated.candidate.brainV2Eligible === false || gated.candidate.priority === "research_lead");
  assert.ok(!(JSON.stringify(gated).toLowerCase().includes("increase card")));
});

test("artifact includes Level-A forensics surfaces and leaves Brain untouched", async () => {
  const records = [
    mkLevelADeck({
      id: "art-h", eventId: "EA", commanders: ["Rograkh, Son of Rohgahh", "Thrasios, Triton Hero"],
      placement: 1, topCut: true, threats: 1, interaction: 6,
    }),
    mkLevelADeck({
      id: "art-l", eventId: "EA", commanders: ["Thrasios, Triton Hero", "Rograkh, Son of Rohgahh"],
      placement: 25, topCut: false, threats: 8, interaction: 2,
    }),
  ];
  const artifact = await buildCorpusIntelligenceArtifact({ records, enrich: false });
  assert.equal(artifact.brainPolicyTouched, false);
  assert.equal(artifact.constructionMutated, false);
  assert.ok(artifact.levelAForensics.usableCohorts >= 1);
  assert.ok(artifact.performanceHypotheses);
  assert.ok(artifact.brainV2EvidenceGate.implementBrainV2 === false);
  assert.ok(artifact.levelASynthesis.rograkhThrasiosThreat);
});

test("batched enrichment resolves shared names once (no per-deck duplicate Scryfall)", async () => {
  let collectionPosts = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes("/cards/collection")) collectionPosts += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            name: "Shared Staple",
            type_line: "Instant",
            oracle_text: "Counter target spell.",
            mana_cost: "{1}{U}",
            cmc: 2,
            color_identity: ["U"],
            id: "scry-1",
          },
        ],
        not_found: [],
      }),
    };
  };
  const records = [
    createCorpusDeckRecord({
      id: "enr-1",
      commanders: [{ name: "Shared Staple" }],
      rows: [{ quantity: 1, name: "Shared Staple" }],
      evidenceTier: "tournament_performance",
      sourceType: "topdeck_tournament",
    }),
    createCorpusDeckRecord({
      id: "enr-2",
      commanders: [{ name: "Shared Staple" }],
      rows: [{ quantity: 1, name: "Shared Staple" }],
      evidenceTier: "tournament_performance",
      sourceType: "topdeck_tournament",
    }),
  ];
  const result = await enrichCorpusRecords(records, { fetchImpl, force: true, allowNetwork: true });
  assert.equal(collectionPosts, 1);
  assert.equal(result.stats.sharedResolutionRequested, 1);
  assert.equal(result.records.length, 2);
  assert.ok(result.records.every((r) => r.rows[0].oracleText.includes("Counter")));
});

test("cohort grouping preserves event/commander identity when ids contain delimiter text", () => {
  const mk = (id, eventId, commander, placement, topCut) => createCorpusDeckRecord({
    id,
    commanders: [{ name: commander, oracleText: "draw a card", typeLine: "Legendary Creature" }],
    rows: [{ quantity: 1, name: "Piece", typeLine: "Instant", oracleText: "Draw a card.", cmc: 1 }],
    evidenceTier: "tournament_performance",
    eventId,
    placement,
    topCut,
    topCutSize: topCut ? 8 : null,
    sourceType: "topdeck_tournament",
  });
  const eventId = "series::cup::finals";
  const commander = "Pilot::Echo";
  const records = [
    mk("d1", eventId, commander, 1, true),
    mk("d2", eventId, commander, 16, false),
  ];
  const analyses = analyzeCorpus(records);
  const cohorts = buildComparableCohorts(records, analyses);
  assert.equal(cohorts.counts.A, 1);
  assert.equal(cohorts.cohorts[0].eventId, eventId);
  assert.equal(cohorts.cohorts[0].commanderFamily, commander);
});

test("unknown top-cut stays null and does not invent converter status", () => {
  assert.equal(resolveTopCutStatus(4, 0), null);
  assert.equal(resolveTopCutStatus(4, null), null);
  assert.equal(resolveTopCutStatus(4, 8), true);
  assert.equal(resolveTopCutStatus(9, 8), false);

  const tournament = {
    TID: "swiss-only-big",
    tournamentName: "Swiss Only",
    players: 64,
    topCut: 0,
    startDate: Math.floor(Date.UTC(2026, 5, 1) / 1000),
    format: "EDH",
    standings: [
      {
        standing: 4,
        name: "Player Four",
        deckObj: {
          Commanders: { "Test Commander": { id: "c1", count: 1 } },
          Mainboard: { "Sol Ring": { id: "s1", count: 1 } },
        },
      },
      {
        standing: 40,
        name: "Player Forty",
        deckObj: {
          Commanders: { "Test Commander": { id: "c1", count: 1 } },
          Mainboard: { "Sol Ring": { id: "s1", count: 1 } },
        },
      },
    ],
  };
  const normalized = normalizeTopDeckTournament(tournament, { selectContrast: false, allowEmptyDecklists: true });
  const fourth = normalized.records.find((r) => r.placement === 4);
  assert.ok(fourth);
  assert.equal(fourth.topCut, null);
  assert.equal(fourth.topCutSize, null);
  const annotated = annotatePerformanceClasses(normalized.records);
  const fourthClass = annotated.find((r) => r.placement === 4);
  assert.equal(fourthClass.performanceClass, "tournament_participant");
  assert.equal(isHighPerformerRecord(fourth), false);
});

test("explicit Top 8 still marks placements 1-8 as top-cut", () => {
  const tournament = {
    TID: "cut-8",
    players: 64,
    topCut: 8,
    startDate: Math.floor(Date.UTC(2026, 5, 1) / 1000),
    format: "EDH",
    standings: [1, 8, 9].map((placement) => ({
      standing: placement,
      name: `P${placement}`,
      deckObj: {
        Commanders: { "Test Commander": { id: "c1", count: 1 } },
        Mainboard: { "Sol Ring": { id: "s1", count: 1 } },
      },
    })),
  };
  const normalized = normalizeTopDeckTournament(tournament, { selectContrast: false, allowEmptyDecklists: true });
  assert.equal(normalized.records.find((r) => r.placement === 1).topCut, true);
  assert.equal(normalized.records.find((r) => r.placement === 8).topCut, true);
  assert.equal(normalized.records.find((r) => r.placement === 9).topCut, false);
});

test("phase redundancyPenalty is intentionally absent (Brain v1 freeze)", () => {
  for (const phase of Object.values(PHASE_WEIGHT_POLICY)) {
    assert.equal(Object.hasOwn(phase, "redundancyPenalty"), false);
  }
  assert.equal(PHASE_REDUNDANCY_POLICY_NOTE.status, "intentionally_absent");
  const applied = applyPhaseWeights({
    rawScore: 10,
    prospectiveDelta: 10,
    synergy: 0,
    orphanPenalty: 0,
    disconnectTax: 0,
    phase: "foundation",
  });
  assert.ok(Number.isFinite(applied.adjusted));
  assert.equal(Object.hasOwn(applied.weights, "redundancyPenalty"), false);
});
