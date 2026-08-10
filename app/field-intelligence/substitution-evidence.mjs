// =============================================================================
// Field Intelligence v1.3 — Substitution evidence
// =============================================================================
// Similar strategic footprint + rare co-occurrence within commander/family.
// Does NOT change selection behavior.
// =============================================================================

import { normalizeCommanderIdentity } from "./level-a-forensics.mjs";
import { isHighPerformer } from "./level-a-forensics.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function footprint(node = {}, analysis = null) {
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

function footprintKey(fp) {
  return [
    (fp.roles || []).join("+") || "none",
    (fp.stages || []).join("+") || "none",
    (fp.packages || []).join("+") || "none",
    fp.topologyPosition,
    fp.multifunction ? "mf" : "sf",
    fp.cmcBand,
  ].join("::");
}

function similarFootprints(a, b) {
  if (a.topologyPosition !== b.topologyPosition) return false;
  if (a.cmcBand !== b.cmcBand) return false;
  const roleOverlap = a.roles.filter((r) => b.roles.includes(r)).length;
  if (roleOverlap < 1) return false;
  const stageOverlap = a.stages.filter((s) => b.stages.includes(s)).length;
  if (a.stages.length && b.stages.length && stageOverlap < 1) return false;
  return true;
}

/**
 * Mine SubstitutionEvidence within commander/family cohorts.
 */
export function mineSubstitutionEvidence(topologies = [], analyses = [], records = [], options = {}) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const recordById = new Map(records.map((r) => [r.id, r]));

  // Group decks by commander identity.
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

  const evidence = [];

  for (const [identity, decks] of byIdentity) {
    if (decks.length < (options.minDecksPerIdentity || 3)) continue;

    // Card presence across decks in this identity.
    const cardDecks = new Map(); // name -> Set(deckId)
    const cardFootprints = new Map();
    const cardConverter = new Map();

    for (const { topology, analysis, record } of decks) {
      const present = new Set();
      for (const node of topology.nodes || []) {
        const key = normalized(node.name);
        present.add(key);
        if (!cardFootprints.has(key)) {
          cardFootprints.set(key, footprint(node, analysis));
          cardDecks.set(key, new Set());
          cardConverter.set(key, { converter: 0, total: 0, name: node.name });
        }
        cardDecks.get(key).add(topology.deckId);
        const conv = cardConverter.get(key);
        conv.total += 1;
        if (isHighPerformer(record)) conv.converter += 1;
      }
      // Track co-occurrence within each deck for XOR later.
      for (const left of present) {
        for (const right of present) {
          if (left >= right) continue;
          // Mark co-occurrence on a side channel via nested map later.
        }
      }
    }

    const coOccur = new Map(); // "a||b" -> count
    for (const { topology } of decks) {
      const names = (topology.nodes || []).map((n) => normalized(n.name)).sort();
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const key = `${names[i]}||${names[j]}`;
          coOccur.set(key, (coOccur.get(key) || 0) + 1);
        }
      }
    }

    const cardNames = [...cardFootprints.keys()];
    for (let i = 0; i < cardNames.length; i += 1) {
      for (let j = i + 1; j < cardNames.length; j += 1) {
        const left = cardNames[i];
        const right = cardNames[j];
        const fpA = cardFootprints.get(left);
        const fpB = cardFootprints.get(right);
        if (!similarFootprints(fpA, fpB)) continue;
        // Frequency alone is insufficient — footprint similarity required (already checked).
        const decksA = cardDecks.get(left);
        const decksB = cardDecks.get(right);
        if (decksA.size < 2 || decksB.size < 2) continue;
        const pairKey = left < right ? `${left}||${right}` : `${right}||${left}`;
        const together = coOccur.get(pairKey) || 0;
        const union = new Set([...decksA, ...decksB]).size;
        const xorRate = union ? 1 - (together / union) : 0;
        if (xorRate < (options.minXorRate || 0.6)) continue;
        if (together > Math.min(decksA.size, decksB.size) * 0.5) continue;

        const leftMeta = cardConverter.get(left);
        const rightMeta = cardConverter.get(right);
        const confidence = round(Math.min(0.88,
          0.3
          + xorRate * 0.25
          + Math.log2(1 + union) * 0.08
          + (fpA.packages.length && fpB.packages.length ? 0.1 : 0)));

        evidence.push(freeze({
          kind: "SubstitutionEvidence",
          commanderIdentity: identity,
          cardA: leftMeta.name,
          cardB: rightMeta.name,
          footprintA: fpA,
          footprintB: fpB,
          footprintKey: footprintKey(fpA),
          decksWithA: decksA.size,
          decksWithB: decksB.size,
          decksWithBoth: together,
          xorRate: round(xorRate),
          converterAssociationA: round(leftMeta.total ? leftMeta.converter / leftMeta.total : 0),
          converterAssociationB: round(rightMeta.total ? rightMeta.converter / rightMeta.total : 0),
          confidence,
          selectionBehaviorChanged: false,
          note: "Similar strategic footprint; rarely need to coexist.",
        }));
      }
    }
  }

  evidence.sort((a, b) => b.confidence - a.confidence || b.xorRate - a.xorRate);

  return freeze({
    version: "substitution-evidence-v1",
    evidence: freeze(evidence.slice(0, options.limit || 60)),
    brainPolicyTouched: false,
    selectionBehaviorChanged: false,
  });
}
