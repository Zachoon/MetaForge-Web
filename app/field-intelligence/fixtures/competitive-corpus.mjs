// =============================================================================
// Competitive corpus fixtures — offline Tier-1 shaped sample
// =============================================================================
// Mimics TopDeck/Spicerack tournament payloads with high vs low placers.
// Uses torture-bench synthetic cards so Brain observation stays offline.
// Not real tournament data — provenance is synthetic_competitive_fixture.
// =============================================================================

import { TORTURE_FIXTURES } from "../../../tests/commander-torture-bench/fixtures.mjs";
import { annotateCorpusCard } from "../corpus-analyze.mjs";
import { extractMechanicalSignals } from "../../forge-interaction-graph.mjs";
import { commanderMechanicalScopes, conceptSignals } from "../../native-masterwork-engine.mjs";
import { normalizeTopDeckCorpus } from "../adapters/topdeck.mjs";
import { normalizeSpicerackCorpus } from "../adapters/spicerack.mjs";
import { normalizeCedhDdbEntries } from "../adapters/cedh-ddb.mjs";
import { normalizeEdhrecAggregate } from "../adapters/edhrec.mjs";
import { createCorpusDeckRecord } from "../corpus-schema.mjs";
import { calculateCompetitiveEvidenceWeight } from "../evidence-quality.mjs";

const freeze = (value) => Object.freeze(value);
const unique = (values) => [...new Set(values)];

function contextFor(commander) {
  const mechanics = extractMechanicalSignals(commander);
  const scopes = commanderMechanicalScopes(commander);
  return freeze({
    commanderMechanics: freeze({
      produces: freeze([...(mechanics.produces || [])]),
      rewards: freeze([...(mechanics.rewards || [])]),
    }),
    commanderScopes: scopes,
    commanderSignals: unique(conceptSignals(commander)),
  });
}

function pickByName(cards, pattern, count) {
  return cards.filter((card) => pattern.test(card.name)).slice(0, count);
}

function annotateRows(cards, commander) {
  const ctx = contextFor(commander);
  return cards.map((card) => {
    const annotated = annotateCorpusCard(card, ctx);
    // Serialize semantics as array for schema freeze.
    return {
      ...annotated,
      strategicSemantics: [...(annotated.strategicSemantics || [])],
    };
  });
}

function supportSlice(cards, prefix, n) {
  return cards.filter((card) => card.name.startsWith(`${prefix} `)).slice(0, n);
}

/**
 * Build high- vs low-performing human-proxy lists for one archetype fixture.
 */
function buildArchetypeVariants(fixture) {
  const cards = fixture.cards || [];
  const commander = fixture.commander;
  const variants = [];

  if (fixture.id === "pearl-ear-auras") {
    variants.push({
      label: "converter",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Aura Piece/, 18),
        ...pickByName(cards, /^Ward /, 6),
        ...supportSlice(cards, "Aura", 40),
      ],
    });
    variants.push({
      label: "low_aura_soup",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Aura Piece/, 6),
        ...pickByName(cards, /^Enchant Soup/, 14),
        ...pickByName(cards, /Ulamog/, 1),
        ...supportSlice(cards, "Aura", 40),
      ],
    });
  } else if (fixture.id === "aristocrats") {
    variants.push({
      label: "balanced_legs",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Outlet /, 5),
        ...pickByName(cards, /^Death Pay /, 6),
        ...pickByName(cards, /^Fodder /, 6),
        ...supportSlice(cards, "Aristo", 40),
      ],
    });
    variants.push({
      label: "outlet_starved",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Outlet /, 1),
        ...pickByName(cards, /^Death Pay /, 10),
        ...pickByName(cards, /^Fodder /, 2),
        ...supportSlice(cards, "Aristo", 40),
      ],
    });
  } else if (fixture.id === "reanimator") {
    variants.push({
      label: "triangle_ok",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Reanimate /, 6),
        ...pickByName(cards, /^Mill /, 6),
        ...pickByName(cards, /^Giant /, 6),
        ...supportSlice(cards, "Reanim", 40),
      ],
    });
    variants.push({
      label: "targets_without_enablers",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Reanimate /, 1),
        ...pickByName(cards, /^Mill /, 1),
        ...pickByName(cards, /^Giant /, 10),
        ...supportSlice(cards, "Reanim", 35),
      ],
    });
  } else if (fixture.id === "equipment-voltron") {
    variants.push({
      label: "equipment_dense",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Sword /, 12),
        ...pickByName(cards, /^Ward /, 5),
        ...supportSlice(cards, "Equip", 40),
      ],
    });
    variants.push({
      label: "rocks_not_swords",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Sword /, 3),
        ...pickByName(cards, /^Rock /, 12),
        ...supportSlice(cards, "Equip", 40),
      ],
    });
  } else if (fixture.id === "blink-etb") {
    variants.push({
      label: "blink_plus_etb",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Blink /, 8),
        ...pickByName(cards, /^ETB Prize /, 10),
        ...supportSlice(cards, "Blink", 40),
      ],
    });
    variants.push({
      label: "blink_without_targets",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Blink /, 8),
        ...pickByName(cards, /^Vanilla /, 10),
        ...supportSlice(cards, "Blink", 40),
      ],
    });
  } else if (fixture.id === "token-go-wide") {
    variants.push({
      label: "makers_and_payoffs",
      placementBias: "high",
      cards: [
        ...pickByName(cards, /^Maker /, 8),
        ...pickByName(cards, /^Payoff /, 7),
        ...supportSlice(cards, "Token", 40),
      ],
    });
    variants.push({
      label: "makers_only",
      placementBias: "low",
      cards: [
        ...pickByName(cards, /^Maker /, 12),
        ...pickByName(cards, /^Payoff /, 1),
        ...supportSlice(cards, "Token", 40),
      ],
    });
  } else {
    // Generic: dense package vs sparse package
    const half = Math.ceil(cards.length / 2);
    variants.push({
      label: "dense",
      placementBias: "high",
      cards: cards.slice(0, Math.min(60, cards.length)),
    });
    variants.push({
      label: "sparse_or_noisy",
      placementBias: "low",
      cards: cards.slice(half).concat(cards.slice(0, 8)).slice(0, 45),
    });
  }

  return variants.map((variant) => freeze({
    ...variant,
    commander,
    archetype: fixture.archetype,
    fixtureId: fixture.id,
    rows: annotateRows(variant.cards, commander),
  }));
}

function toDeckText(commander, rows) {
  const main = rows.map((row) => `${row.quantity || 1} ${row.name}`).join("\n");
  return `~~Commanders~~\n1 ${commander.name}\n\n~~Deck~~\n${main}`;
}

/**
 * Build a TopDeck-shaped multi-event competitive sample with contrast decks.
 */
export function buildCompetitiveFixtureTournaments() {
  const focus = TORTURE_FIXTURES.filter((fixture) => [
    "pearl-ear-auras",
    "equipment-voltron",
    "aristocrats",
    "reanimator",
    "blink-etb",
    "token-go-wide",
    "spellslinger",
  ].includes(fixture.id));

  const tournaments = [];
  let eventIndex = 0;
  for (const fixture of focus) {
    const variants = buildArchetypeVariants(fixture);
    // Two events per archetype for independent-event replication signal.
    for (let copy = 0; copy < 2; copy += 1) {
      eventIndex += 1;
      const eventSize = 32 + copy * 16;
      const standings = [];
      // 3 high, 5 low for contrast
      const high = variants.filter((v) => v.placementBias === "high");
      const low = variants.filter((v) => v.placementBias === "low");
      let place = 1;
      for (let i = 0; i < 3; i += 1) {
        const variant = high[i % high.length];
        standings.push({
          standing: place,
          name: `Pilot H${i}`,
          id: `pilot-h-${fixture.id}-${copy}-${i}`,
          decklist: toDeckText(variant.commander, variant.rows),
          wins: 5 - i,
          losses: i,
          draws: 0,
          winsSwiss: 4,
          lossesSwiss: 0,
          winsBracket: Math.max(0, 2 - i),
          lossesBracket: 0,
        });
        place += 1;
      }
      for (let i = 0; i < 5; i += 1) {
        const variant = low[i % low.length];
        standings.push({
          standing: 12 + i,
          name: `Pilot L${i}`,
          id: `pilot-l-${fixture.id}-${copy}-${i}`,
          decklist: toDeckText(variant.commander, variant.rows),
          wins: 1,
          losses: 3,
          draws: 1,
          winsSwiss: 1,
          lossesSwiss: 3,
          winsBracket: 0,
          lossesBracket: 0,
        });
      }
      tournaments.push(freeze({
        TID: `fixture-cedh-${fixture.id}-${copy}`,
        tournamentName: `Fixture ${fixture.archetype} Open ${copy + 1}`,
        swissNum: 5,
        startDate: 1735689600 + eventIndex * 86400, // 2025+
        game: "Magic: The Gathering",
        format: "EDH",
        topCut: 8,
        players: eventSize,
        standings: freeze(standings),
        _fixtureRowsByStanding: freeze(standings.map((standing, idx) => {
          const bias = idx < 3 ? "high" : "low";
          const variant = (bias === "high" ? high : low)[(bias === "high" ? idx : idx - 3) % (bias === "high" ? high.length : low.length)];
          return freeze({
            standingId: standing.id,
            commander: variant.commander,
            rows: variant.rows,
            archetype: variant.archetype,
            fixtureId: variant.fixtureId,
            label: variant.label,
          });
        })),
      }));
    }
  }
  return freeze(tournaments);
}

/**
 * Enrich TopDeck-normalized records with annotated rows from fixture metadata
 * (so Brain analysis has semantics without live Scryfall).
 */
export function materializeCompetitiveFixtureCorpus() {
  const tournaments = buildCompetitiveFixtureTournaments();
  const topdeck = normalizeTopDeckCorpus(tournaments, { allowEmptyDecklists: false });
  const rowLookup = new Map();
  for (const tournament of tournaments) {
    for (const entry of tournament._fixtureRowsByStanding || []) {
      rowLookup.set(entry.standingId, entry);
    }
  }

  const records = topdeck.records.map((record) => {
    const meta = rowLookup.get(record.sourceKey);
    if (!meta) return record;
    const draft = {
      ...record,
      commanders: [meta.commander],
      rows: meta.rows,
      statedArchetype: meta.archetype,
      archetypeTags: [meta.archetype, meta.fixtureId, meta.label, "cedh_fixture"],
      sourceType: "synthetic_competitive_fixture",
      evidenceTier: "tournament_performance",
      provenance: {
        adapter: "competitive-fixture",
        attribution: { name: "MetaForge competitive fixtures", url: null },
        note: "offline_tier1_shaped_sample_not_live_tournament_data",
        ingestedAt: "2026-08-10",
      },
    };
    const weight = calculateCompetitiveEvidenceWeight(draft, { independentEventCount: 2 });
    return createCorpusDeckRecord({ ...draft, performanceWeight: weight.weight });
  });

  // Spicerack-shaped mirror of first two events (independent source diversity).
  const spicerackTournaments = tournaments.slice(0, 2).map((tournament) => freeze({
    TID: `sp-${tournament.TID}`,
    tournamentName: `Spicerack Mirror ${tournament.tournamentName}`,
    format: "COMMANDER2",
    players: tournament.players,
    startDate: tournament.startDate,
    swissRounds: tournament.swissNum,
    topCut: tournament.topCut,
    standings: tournament.standings.map((standing) => freeze({
      name: standing.name,
      standing: standing.standing,
      decklist_text: standing.decklist,
      winsSwiss: standing.winsSwiss,
      lossesSwiss: standing.lossesSwiss,
      draws: standing.draws,
      winsBracket: standing.winsBracket,
      lossesBracket: standing.lossesBracket,
    })),
  }));
  const spicerackNorm = normalizeSpicerackCorpus(spicerackTournaments);
  const spicerackRecords = spicerackNorm.records.map((record) => {
    // Attach annotated rows by matching deckText commander line when possible.
    const parent = records.find((r) => r.deckText === record.deckText);
    if (!parent) return record;
    return createCorpusDeckRecord({
      ...record,
      commanders: parent.commanders,
      rows: parent.rows,
      statedArchetype: parent.statedArchetype,
      archetypeTags: [...parent.archetypeTags, "spicerack_mirror"],
      sourceType: "synthetic_competitive_fixture",
      evidenceTier: "tournament_performance",
      tournamentSource: "spicerack",
      provenance: {
        adapter: "competitive-fixture-spicerack-shape",
        note: "independent_source_shape_fixture",
        ingestedAt: "2026-08-10",
      },
    });
  });

  // Tier 2 curated expert snapshots (subset of high converters).
  const curated = normalizeCedhDdbEntries(
    records.filter((r) => r.topCut && r.placement <= 2).slice(0, 8).map((record, idx) => ({
      id: `ddb-${idx}`,
      name: `${record.statedArchetype} Primer`,
      commanders: record.commanders,
      rows: record.rows,
      deckText: record.deckText,
      archetype: record.statedArchetype,
      section: "Competitive",
      updatedAt: "2026-06-01",
      sourceUri: "https://cedh-decklist-database.com/",
    })),
  );

  // Tier 3 EDHREC secondary aggregates (popularity must stay secondary).
  const edhrec = [];
  for (const commanderName of unique(records.map((r) => r.commanders[0]?.name).filter(Boolean)).slice(0, 6)) {
    const related = records.filter((r) => r.commanders[0]?.name === commanderName);
    const cardCounts = new Map();
    for (const record of related) {
      for (const row of record.rows || []) {
        cardCounts.set(row.name, (cardCounts.get(row.name) || 0) + 1);
      }
    }
    const synergies = [...cardCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({
        name,
        synergy: count / Math.max(1, related.length),
        num_decks: count,
        inclusion: Math.round((count / Math.max(1, related.length)) * 100),
      }));
    edhrec.push(normalizeEdhrecAggregate({ commander: commanderName, synergies }));
  }

  return freeze({
    version: "competitive-fixture-corpus-v1",
    tournaments: freeze(tournaments.map((t) => freeze({
      TID: t.TID,
      tournamentName: t.tournamentName,
      players: t.players,
      topCut: t.topCut,
      standingCount: t.standings.length,
    }))),
    records: freeze([...records, ...spicerackRecords, ...curated.records]),
    edhrecAggregates: freeze(edhrec),
    stats: freeze({
      topdeckShapedEvents: tournaments.length,
      topdeckShapedDecks: records.length,
      spicerackShapedDecks: spicerackRecords.length,
      curatedExpertDecks: curated.records.length,
      edhrecAggregates: edhrec.length,
      uniqueCommanders: unique(records.map((r) => r.commanders[0]?.name).filter(Boolean)).length,
      topCutDecks: records.filter((r) => r.topCut).length,
      winningDecks: records.filter((r) => r.placement === 1).length,
      lowerPerformingDecks: records.filter((r) => !r.topCut).length,
    }),
  });
}
