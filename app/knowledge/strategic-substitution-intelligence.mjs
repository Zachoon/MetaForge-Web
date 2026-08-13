// =============================================================================
// Knowledge — Strategic Substitution Intelligence (Epic 3)
// =============================================================================
// Learn substitution families · near-equivalents · when-not-to-substitute.
// Observation only. Does not netdeck. Does not change selection.
// writesToBrain: false
// =============================================================================

import { analyzeCorpus } from "../field-intelligence/corpus-analyze.mjs";
import { materializeCompetitiveFixtureCorpus } from "../field-intelligence/fixtures/competitive-corpus.mjs";
import { normalizeCommanderIdentity, isHighPerformer } from "../field-intelligence/level-a-forensics.mjs";
import { buildCorpusStrategicTopologies } from "../field-intelligence/strategic-topology.mjs";
import { mineSubstitutionEvidence } from "../field-intelligence/substitution-evidence.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function seatKey(fp = {}) {
  return [
    (fp.roles || []).join("+") || "none",
    (fp.stages || []).join("+") || "none",
    (fp.packages || []).join("+") || "none",
    fp.topologyPosition || "wired",
    fp.cmcBand || "mid",
  ].join("::");
}

function nodeFootprint(node = {}, analysis = null) {
  const roles = [...(node.roles || [])].sort();
  const stages = [...(node.sequenceStages || [])].sort();
  const packages = (analysis?.packages || [])
    .filter((pkg) => [...(pkg.coreMembers || []), ...(pkg.supportMembers || [])]
      .some((name) => normalized(name) === normalized(node.name)))
    .map((pkg) => pkg.id)
    .sort();
  return freeze({
    roles: freeze(roles),
    stages: freeze(stages),
    packages: freeze(packages),
    topologyPosition: node.planConnected ? "plan_connected" : node.isolated ? "isolated" : "wired",
    multifunction: Boolean(node.multifunction),
    cmcBand: (Number(node.cmc) || 0) <= 2 ? "low" : (Number(node.cmc) || 0) <= 4 ? "mid" : "high",
  });
}

function confidenceForFamily({ memberCount = 0, decks = 0, nearEquivalents = 0 } = {}) {
  if (memberCount < 2 || decks < 3) {
    return freeze({ level: "insufficient_sample", score: 0.15 });
  }
  if (nearEquivalents >= 2 && decks >= 8 && memberCount >= 3) {
    return freeze({ level: "high", score: 0.8 });
  }
  if (decks >= 5 && memberCount >= 2) {
    return freeze({ level: "moderate", score: 0.55 });
  }
  return freeze({ level: "limited", score: 0.35 });
}

/**
 * Group cards that occupy the same strategic seat within a commander identity.
 * Same seat ≠ automatic substitute — co-occurrence decides near-equivalent vs complement.
 */
export function buildSubstitutionSeatFamilies({
  topologies = [],
  analyses = [],
  records = [],
  options = {},
} = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const recordById = new Map(records.map((r) => [r.id, r]));
  const minDecks = options.minDecksPerIdentity || 3;
  const minMembers = options.minMembers || 2;

  const byIdentity = new Map();
  for (const topology of topologies) {
    const record = recordById.get(topology.deckId);
    const analysis = analysisById.get(topology.deckId);
    if (!record || !analysis) continue;
    const identity = normalizeCommanderIdentity(record.commanders || analysis.commanders);
    if (!identity) continue;
    if (!byIdentity.has(identity)) byIdentity.set(identity, []);
    byIdentity.get(identity).push({ topology, analysis, record });
  }

  const families = [];
  const whenNot = [];

  for (const [identity, decks] of byIdentity) {
    if (decks.length < minDecks) continue;

    const seats = new Map(); // seat -> Map(cardNorm -> meta)
    const coOccur = new Map();

    for (const { topology, analysis, record } of decks) {
      const present = [];
      for (const node of topology.nodes || []) {
        if (!node?.name) continue;
        const fp = nodeFootprint(node, analysis);
        const key = seatKey(fp);
        if (!seats.has(key)) seats.set(key, { footprint: fp, cards: new Map() });
        const cardKey = normalized(node.name);
        const bucket = seats.get(key).cards;
        if (!bucket.has(cardKey)) {
          bucket.set(cardKey, {
            name: node.name,
            decks: new Set(),
            converter: 0,
            total: 0,
          });
        }
        const meta = bucket.get(cardKey);
        meta.decks.add(topology.deckId);
        meta.total += 1;
        if (isHighPerformer(record)) meta.converter += 1;
        present.push({ cardKey, seat: key });
      }

      const names = [...new Set(present.map((entry) => entry.cardKey))].sort();
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const pair = `${names[i]}||${names[j]}`;
          coOccur.set(pair, (coOccur.get(pair) || 0) + 1);
        }
      }
    }

    for (const [key, seat] of seats) {
      const members = [...seat.cards.values()]
        .map((meta) => freeze({
          name: meta.name,
          decks: meta.decks.size,
          converterAssociation: round(meta.total ? meta.converter / meta.total : 0),
        }))
        .filter((member) => member.decks >= 2)
        .sort((a, b) => b.decks - a.decks || a.name.localeCompare(b.name));

      if (members.length < minMembers) continue;

      const nearEquivalents = [];
      const complements = [];
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          const left = normalized(members[i].name);
          const right = normalized(members[j].name);
          const pairKey = left < right ? `${left}||${right}` : `${right}||${left}`;
          const together = coOccur.get(pairKey) || 0;
          const union = new Set([
            ...[...seat.cards.get(left)?.decks || []],
            ...[...seat.cards.get(right)?.decks || []],
          ]).size;
          const xorRate = union ? 1 - (together / union) : 0;
          const coexistRate = union ? together / union : 0;
          const pair = freeze({
            cardA: members[i].name,
            cardB: members[j].name,
            together,
            union,
            xorRate: round(xorRate),
            coexistRate: round(coexistRate),
          });
          // High XOR → candidates for near-equivalent substitution.
          if (xorRate >= (options.nearEquivalentXor || 0.55) && together <= Math.min(members[i].decks, members[j].decks) * 0.5) {
            nearEquivalents.push(pair);
          }
          // High coexistence in the same seat → do not treat as substitutes.
          if (coexistRate >= (options.complementCoexist || 0.5) && together >= 2) {
            complements.push(pair);
            whenNot.push(freeze({
              writesToBrain: false,
              kind: "when_not_to_substitute",
              commanderIdentity: identity,
              seatKey: key,
              cardA: pair.cardA,
              cardB: pair.cardB,
              reason: "same_seat_high_coexistence",
              coexistRate: pair.coexistRate,
              note: "Similar strategic seat, but these cards often appear together — likely complements, not replacements.",
            }));
          }
        }
      }

      families.push(freeze({
        writesToBrain: false,
        version: "substitution-seat-family-v1",
        familyId: `${identity}::${key}`,
        commanderIdentity: identity,
        seatKey: key,
        seat: seat.footprint,
        memberCount: members.length,
        decksRepresented: decks.length,
        members: freeze(members.slice(0, options.maxMembers || 12)),
        nearEquivalents: freeze(nearEquivalents.slice(0, 12)),
        complements: freeze(complements.slice(0, 12)),
        confidence: confidenceForFamily({
          memberCount: members.length,
          decks: decks.length,
          nearEquivalents: nearEquivalents.length,
        }),
        antiNetdeck: freeze({
          frequencyIsNotQuality: true,
          note: "Seat family membership is structural — never popularity rank as truth.",
        }),
      }));
    }
  }

  return freeze({
    writesToBrain: false,
    families: freeze(
      families.sort((a, b) =>
        b.memberCount - a.memberCount
        || b.decksRepresented - a.decksRepresented
        || a.commanderIdentity.localeCompare(b.commanderIdentity),
      ),
    ),
    whenNotToSubstitute: freeze(whenNot.slice(0, options.whenNotLimit || 80)),
  });
}

/**
 * Project mined SubstitutionEvidence into inspectable knowledge claims.
 */
export function projectNearEquivalentClaims(substitutionEvidence = null) {
  const rows = substitutionEvidence?.evidence || [];
  return freeze(rows.map((row) => freeze({
    writesToBrain: false,
    kind: "near_equivalent",
    commanderIdentity: row.commanderIdentity,
    cardA: row.cardA,
    cardB: row.cardB,
    xorRate: row.xorRate,
    confidence: row.confidence,
    footprintKey: row.footprintKey || null,
    note: row.note || "Similar strategic footprint; rarely need to coexist.",
    selectionBehaviorChanged: false,
  })));
}

/**
 * Full Epic 3 intelligence artifact.
 */
export function buildStrategicSubstitutionIntelligence({
  records = [],
  label = "strategic-substitution-intelligence",
} = {}) {
  const analyses = analyzeCorpus(records, { includeHoldout: false });
  // Signature: buildCorpusStrategicTopologies(analyses, records)
  const topologies = buildCorpusStrategicTopologies(analyses, records);
  const topologyList = Array.isArray(topologies) ? topologies : (topologies.topologies || []);
  const mined = mineSubstitutionEvidence(topologyList, analyses, records, { limit: 80 });
  const seatBundle = buildSubstitutionSeatFamilies({
    topologies: topologyList,
    analyses,
    records,
  });
  const nearEquivalents = projectNearEquivalentClaims(mined);

  const commanders = new Set(
    seatBundle.families.map((family) => family.commanderIdentity),
  );

  return freeze({
    writesToBrain: false,
    version: "strategic-substitution-intelligence-v1",
    label,
    brainChanges: 0,
    antiNetdeck: freeze({
      policy: "popular card ≠ correct card",
      frequencyIsNotQuality: true,
      selectionBehaviorChanged: false,
    }),
    corpus: freeze({
      decks: records.length,
      topologies: topologyList.length,
      uniqueCommandersInFamilies: commanders.size,
    }),
    seatFamilies: seatBundle.families,
    nearEquivalents,
    whenNotToSubstitute: seatBundle.whenNotToSubstitute,
    minedEvidence: freeze({
      version: mined.version,
      count: mined.evidence.length,
      brainPolicyTouched: mined.brainPolicyTouched === true,
      selectionBehaviorChanged: mined.selectionBehaviorChanged === true,
    }),
    contradictions: freeze(
      seatBundle.families
        .filter((family) => family.nearEquivalents.length && family.complements.length)
        .map((family) => freeze({
          commanderIdentity: family.commanderIdentity,
          seatKey: family.seatKey,
          text: `Seat ${family.seatKey} has both near-equivalent XOR pairs and high-coexistence complements — context decides replaceability.`,
        })),
    ),
    strongestClaims: freeze([
      ...nearEquivalents.slice(0, 8).map((claim) => freeze({
        kind: claim.kind,
        text: `${claim.cardA} ↔ ${claim.cardB} (${claim.commanderIdentity})`,
        confidence: claim.confidence,
      })),
      ...seatBundle.families.slice(0, 8).map((family) => freeze({
        kind: "seat_family",
        text: `${family.commanderIdentity}: ${family.memberCount} cards share seat ${family.seat.roles?.join("+") || "unknown"}`,
        confidence: family.confidence.score,
      })),
    ]),
  });
}

export function buildStrategicSubstitutionIntelligenceFromFixtures() {
  const materialized = materializeCompetitiveFixtureCorpus();
  return buildStrategicSubstitutionIntelligence({
    records: materialized.records || [],
    label: "competitive-fixtures",
  });
}

/**
 * Read-only projection of a Field Intelligence artifact's substitution block.
 */
export function summarizeLiveSubstitutionArtifact(artifact = null) {
  if (!artifact) return null;
  const block = artifact.substitutionEvidence || {};
  const evidence = block.evidence || [];
  return freeze({
    writesToBrain: false,
    source: "corpus-intelligence-artifact",
    generatedAt: artifact.generatedAt || null,
    brainPolicyTouched: artifact.brainPolicyTouched === true || block.brainPolicyTouched === true,
    selectionBehaviorChanged: block.selectionBehaviorChanged === true,
    constructionMutated: artifact.constructionMutated === true,
    nearEquivalentPairs: evidence.length,
    sample: freeze(evidence.slice(0, 12).map((row) => freeze({
      commanderIdentity: row.commanderIdentity,
      cardA: row.cardA,
      cardB: row.cardB,
      xorRate: row.xorRate,
      confidence: row.confidence,
    }))),
  });
}
