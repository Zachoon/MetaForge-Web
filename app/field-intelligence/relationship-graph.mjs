// =============================================================================
// Field Intelligence — Corpus Relationship Graph
// =============================================================================
// Evidence edges only. Co-occurrence alone stays weak unless semantics support it.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

function edgeKey(type, from, to) {
  return `${type}::${normalized(from)}::${normalized(to)}`;
}

function bumpEdge(map, {
  type, from, to, weight = 1, deckId, commander, semanticSupport = false, provenance,
}) {
  const key = edgeKey(type, from, to);
  const entry = map.get(key) || {
    type,
    from,
    to,
    evidenceCount: 0,
    weightedEvidence: 0,
    decks: new Set(),
    commanders: new Set(),
    semanticSupportCount: 0,
    provenance: new Set(),
  };
  entry.evidenceCount += 1;
  entry.weightedEvidence += weight;
  entry.decks.add(deckId);
  if (commander) entry.commanders.add(commander);
  if (semanticSupport) entry.semanticSupportCount += 1;
  if (provenance) entry.provenance.add(provenance);
  map.set(key, entry);
}

/**
 * Build relationship graph from analyses + records.
 * Card co-occurrence is weak unless interaction/semantics support the link.
 */
export function buildCorpusRelationshipGraph(analyses = [], records = []) {
  const recordById = new Map(records.map((r) => [r.id, r]));
  const edges = new Map();
  const nodes = new Map();

  const addNode = (id, kind, label = id) => {
    if (!nodes.has(id)) nodes.set(id, { id, kind, label });
  };

  for (const analysis of analyses) {
    const record = recordById.get(analysis.deckId);
    if (!record) continue;
    const weight = analysis.evidenceQuality?.weight ?? record.performanceWeight ?? 0.4;
    const commander = (analysis.commanders || [])[0] || "unknown";
    const provenance = `${record.tournamentSource || record.sourceType}:${record.evidenceTier}`;
    addNode(`commander:${commander}`, "commander", commander);

    for (const pkg of analysis.packages || []) {
      addNode(`package:${pkg.id}`, "package", pkg.id);
      bumpEdge(edges, {
        type: "commander_affinity",
        from: commander,
        to: pkg.id,
        weight: weight * ((pkg.healthScore || 0) / 100),
        deckId: analysis.deckId,
        commander,
        semanticSupport: true,
        provenance,
      });
      for (const name of [...(pkg.coreMembers || []), ...(pkg.supportMembers || [])].slice(0, 40)) {
        addNode(`card:${name}`, "card", name);
        bumpEdge(edges, {
          type: "package_member_evidence",
          from: pkg.id,
          to: name,
          weight,
          deckId: analysis.deckId,
          commander,
          semanticSupport: true,
          provenance,
        });
      }
    }

    for (const [signal, count] of Object.entries(analysis.signals?.produces || {})) {
      addNode(`mechanic:${signal}`, "mechanic", signal);
      const rewardCount = analysis.signals?.rewards?.[signal] || 0;
      if (rewardCount > 0) {
        bumpEdge(edges, {
          type: "supports",
          from: `produce:${signal}`,
          to: `reward:${signal}`,
          weight: weight * Math.min(count, rewardCount),
          deckId: analysis.deckId,
          commander,
          semanticSupport: true,
          provenance,
        });
        bumpEdge(edges, {
          type: "enables",
          from: `produce:${signal}`,
          to: `reward:${signal}`,
          weight: weight,
          deckId: analysis.deckId,
          commander,
          semanticSupport: true,
          provenance,
        });
        bumpEdge(edges, {
          type: "payoff_for",
          from: `reward:${signal}`,
          to: `produce:${signal}`,
          weight: weight,
          deckId: analysis.deckId,
          commander,
          semanticSupport: true,
          provenance,
        });
      }
    }

    // Weak co-occurrence among top interaction-graph edges only when semantics exist.
    for (const edge of analysis.interactionGraph?.topEdges || []) {
      addNode(`card:${edge.from}`, "card", edge.from);
      addNode(`card:${edge.to}`, "card", edge.to);
      const semanticSupport = (edge.signals || []).length > 0 && edge.evidence !== "shared oracle signal";
      bumpEdge(edges, {
        type: semanticSupport ? "supports" : "commonly_cooccurs",
        from: edge.from,
        to: edge.to,
        weight: weight * (semanticSupport ? 1 : 0.25),
        deckId: analysis.deckId,
        commander,
        semanticSupport,
        provenance,
      });
    }

    // Role nodes
    for (const [role, count] of Object.entries(analysis.roleDistribution || {})) {
      addNode(`role:${role}`, "role", role);
      bumpEdge(edges, {
        type: "commander_affinity",
        from: commander,
        to: `role:${role}`,
        weight: weight * (count / 20),
        deckId: analysis.deckId,
        commander,
        semanticSupport: true,
        provenance,
      });
    }
  }

  const finalized = [...edges.values()].map((entry) => {
    const independentDecks = entry.decks.size;
    const independentCommanders = entry.commanders.size;
    const semanticRatio = entry.evidenceCount ? entry.semanticSupportCount / entry.evidenceCount : 0;
    // Co-occurrence alone remains weak.
    const confidence = entry.type === "commonly_cooccurs"
      ? round(Math.min(0.35, (entry.weightedEvidence / 10) * 0.2))
      : round(Math.min(0.95,
        (Math.log2(1 + independentDecks) / 6) * 0.45
        + (Math.log2(1 + independentCommanders) / 5) * 0.2
        + semanticRatio * 0.35));
    return freeze({
      type: entry.type,
      from: entry.from,
      to: entry.to,
      evidenceCount: entry.evidenceCount,
      weightedEvidence: round(entry.weightedEvidence),
      independentDecks,
      independentCommanders,
      semanticSupportRatio: round(semanticRatio),
      confidence,
      weakBecauseCooccurrenceOnly: entry.type === "commonly_cooccurs",
      provenanceSummary: freeze([...entry.provenance].sort().slice(0, 8)),
    });
  }).sort((a, b) => b.confidence - a.confidence || b.weightedEvidence - a.weightedEvidence);

  return freeze({
    version: "corpus-relationship-graph-v1",
    nodeCount: nodes.size,
    edgeCount: finalized.length,
    nodes: freeze([...nodes.values()].sort((a, b) => a.id.localeCompare(b.id))),
    edges: freeze(finalized),
    highConfidence: freeze(finalized.filter((e) => e.confidence >= 0.55 && !e.weakBecauseCooccurrenceOnly).slice(0, 40)),
    weakCooccurrence: freeze(finalized.filter((e) => e.weakBecauseCooccurrenceOnly).slice(0, 40)),
  });
}
