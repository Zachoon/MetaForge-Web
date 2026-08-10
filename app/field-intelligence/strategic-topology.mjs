// =============================================================================
// Field Intelligence v1.3 — Per-deck strategic topology (static)
// =============================================================================
// Builds observational edges from Brain semantics + interaction graph.
// Co-occurrence alone never produces a strong edge.
// Does not mutate Brain. Dynamic pressure topology is deferred.
// =============================================================================

import {
  STRATEGIC_TOPOLOGY_VERSION,
  CONSTRUCTIVE_ROLES,
  INTERACTIONISH_ROLES,
  SEQUENCE_STAGE_ORDER,
  edgeConfidence,
  classifyEdgeStrength,
  EDGE_STRENGTH,
} from "./strategic-edge-ontology.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const unique = (values) => [...new Set(values)];

function rolesOf(row) {
  return row.roles || [];
}

function isLandOrCommander(row) {
  return rolesOf(row).includes("land") || rolesOf(row).includes("commander");
}

function semanticsOf(row) {
  if (row.strategicSemantics instanceof Set) return [...row.strategicSemantics];
  return [...(row.strategicSemantics || [])];
}

function textOf(row) {
  return `${row.typeLine || ""}\n${row.oracleText || ""}`;
}

function isInteractive(row) {
  const roles = rolesOf(row);
  if (roles.some((role) => INTERACTIONISH_ROLES.includes(role))) return true;
  return /counter target|destroy target|exile target|hexproof|indestructible|protection from|can't be countered|silence|stifle|ward /i
    .test(textOf(row));
}

function isTutor(row) {
  return rolesOf(row).includes("tutor")
    || /search your library for/i.test(textOf(row));
}

function isRecursion(row) {
  return rolesOf(row).includes("recursion")
    || /return .+ from (?:your )?graveyard/i.test(textOf(row));
}

function isSilenceOrPathClear(row) {
  return /players can't cast|can't cast spells|silence|can't activate|stifle|can't be countered|grand abolisher|defense grid|veil of summer/i
    .test(textOf(row))
    || semanticsOf(row).some((s) => /silence|stax|tax/i.test(s));
}

function isDisruption(row) {
  return /counter target|destroy target|exile target|bounce target|return target .+ to (?:its owner's|their) hand/i
    .test(textOf(row))
    || rolesOf(row).includes("interaction");
}

function packageMemberSet(packages = []) {
  const set = new Set();
  for (const pkg of packages) {
    for (const name of [...(pkg.coreMembers || []), ...(pkg.supportMembers || [])]) {
      set.add(normalized(name));
    }
  }
  return set;
}

function engineNames(packages = [], rows = []) {
  const names = new Set();
  for (const pkg of packages) {
    for (const name of pkg.coreMembers || []) names.add(normalized(name));
  }
  for (const row of rows) {
    if (isLandOrCommander(row)) continue;
    const text = textOf(row);
    if (/whenever you cast|whenever .+ enters|at the beginning of|create .+ token|draw a card/i.test(text)
      && rolesOf(row).includes("threat")) {
      names.add(normalized(row.name));
    }
  }
  return names;
}

function closeOrComboNames(rows = []) {
  const names = new Set();
  for (const row of rows) {
    if (isLandOrCommander(row)) continue;
    const stages = row.sequenceStages || [];
    const text = textOf(row);
    if (stages.includes("close")
      || /you win the game|wins? the game|infinite|thoracle|consultation|underworld breach|dockside|dramatic|isomera/i.test(`${row.name}\n${text}`)) {
      names.add(normalized(row.name));
    }
  }
  return names;
}

function commanderNames(commanders = [], rows = []) {
  const names = new Set(
    (commanders || []).map((c) => normalized(typeof c === "string" ? c : c.name)).filter(Boolean),
  );
  for (const row of rows) {
    if (rolesOf(row).includes("commander")) names.add(normalized(row.name));
  }
  return names;
}

function partnerDegree(name, edges = []) {
  const key = normalized(name);
  let degree = 0;
  for (const edge of edges) {
    if (normalized(edge.from) === key || normalized(edge.to) === key) degree += 1;
  }
  return degree;
}

function pushEdge(list, edge) {
  const strength = classifyEdgeStrength(edge);
  list.push(freeze({
    ...edge,
    strength,
    confidence: round(edgeConfidence(edge)),
    weakBecauseCooccurrenceOnly: strength === EDGE_STRENGTH.weak && !edge.semanticSupport,
  }));
}

/**
 * Build static strategic topology for one analyzed deck.
 * @param {object} analysis — analyzeCorpusDeck output (may include rows if attached)
 * @param {object} record — CorpusDeckRecord
 * @param {object} [options]
 */
export function buildDeckStrategicTopology(analysis, record, options = {}) {
  const rows = options.rows
    || analysis.annotatedRows
    || analysis.rows
    || (record.rows || []).filter((row) => row.roles || row.oracleText || row.typeLine);
  const packages = analysis.packages || [];
  const graph = analysis.interactionGraph || {};
  const evidenceWeight = analysis.evidenceQuality?.weight ?? record.performanceWeight ?? 0.4;
  const commanders = analysis.commanders || (record.commanders || []).map((c) => c.name);
  const commanderSet = commanderNames(commanders, rows);
  const packageMembers = packageMemberSet(packages);
  const engines = engineNames(packages, rows);
  const closePieces = closeOrComboNames(rows);
  const graphEdges = [
    ...(graph.edges || []),
    ...(graph.topEdges || []),
  ];
  const isolatedSet = new Set((graph.isolated || []).map(normalized));
  const edges = [];
  const nodeMeta = [];

  // Mechanical supports / enables / payoff_for from interaction graph.
  for (const edge of graphEdges) {
    const semanticSupport = (edge.signals || []).length > 0
      && edge.evidence !== "shared oracle signal";
    if (semanticSupport) {
      pushEdge(edges, {
        type: "supports",
        from: edge.from,
        to: edge.to,
        semanticSupport: true,
        evidenceWeight,
        signals: freeze([...(edge.signals || [])]),
        evidence: edge.evidence || "inferred mechanical edge",
        partnerCount: 1,
      });
      for (const signal of edge.forwardSignals || edge.signals || []) {
        pushEdge(edges, {
          type: "enables",
          from: edge.from,
          to: edge.to,
          semanticSupport: true,
          evidenceWeight,
          signals: freeze([signal]),
          evidence: "produce_reward_wiring",
          partnerCount: 1,
        });
        pushEdge(edges, {
          type: "payoff_for",
          from: edge.to,
          to: edge.from,
          semanticSupport: true,
          evidenceWeight,
          signals: freeze([signal]),
          evidence: "produce_reward_wiring",
          partnerCount: 1,
        });
        pushEdge(edges, {
          type: "feeds",
          from: edge.from,
          to: edge.to,
          semanticSupport: true,
          evidenceWeight,
          signals: freeze([signal]),
          evidence: "produce_reward_wiring",
          partnerCount: 1,
        });
      }
    } else {
      pushEdge(edges, {
        type: "commonly_cooccurs",
        from: edge.from,
        to: edge.to,
        semanticSupport: false,
        evidenceWeight,
        signals: freeze([...(edge.signals || [])]),
        evidence: edge.evidence || "cooccurrence",
        partnerCount: 1,
      });
    }
  }

  const interactiveRows = rows.filter((row) => !isLandOrCommander(row) && isInteractive(row));

  for (const row of interactiveRows) {
    const degree = partnerDegree(row.name, graphEdges);
    const multifunction = rolesOf(row).some((role) => CONSTRUCTIVE_ROLES.includes(role))
      && degree > 0;
    const planConnected = degree > 0
      || packageMembers.has(normalized(row.name))
      || (row.commanderConnectionSignals || []).length > 0;

    nodeMeta.push(freeze({
      name: row.name,
      interactive: true,
      cmc: Number(row.cmc) || 0,
      roles: freeze([...rolesOf(row)]),
      sequenceStages: freeze([...(row.sequenceStages || [])]),
      degree,
      isolated: isolatedSet.has(normalized(row.name)) || degree === 0,
      multifunction,
      planConnected,
      commanderConnected: (row.commanderConnectionSignals || []).length > 0,
      packageMember: packageMembers.has(normalized(row.name)),
    }));

    if (multifunction) {
      pushEdge(edges, {
        type: "multifunction_with",
        from: row.name,
        to: row.name,
        semanticSupport: true,
        evidenceWeight,
        evidence: "interaction_plus_constructive_role_and_wiring",
        partnerCount: degree,
      });
    }

    // Protection / interaction relationships — only when targets exist.
    if (rolesOf(row).includes("protection") || /hexproof|indestructible|protection from|ward |phase out/i.test(textOf(row))) {
      for (const name of commanderSet) {
        pushEdge(edges, {
          type: "protects_commander",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "protection_semantics_plus_commander_present",
          partnerCount: 1,
        });
      }
      for (const name of engines) {
        if (commanderSet.has(name)) continue;
        pushEdge(edges, {
          type: "protects_engine",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "protection_semantics_plus_engine_or_package_core",
          partnerCount: 1,
        });
      }
      for (const name of closePieces) {
        if (commanderSet.has(name) || engines.has(name)) continue;
        pushEdge(edges, {
          type: "protects_combo_or_close",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "protection_semantics_plus_close_or_combo_piece",
          partnerCount: 1,
        });
      }
    }

    if (isSilenceOrPathClear(row) && (closePieces.size || engines.size)) {
      for (const name of [...closePieces, ...engines].slice(0, 12)) {
        pushEdge(edges, {
          type: "clears_path_for",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "silence_or_path_clear_plus_win_or_engine_present",
          partnerCount: 1,
        });
      }
    }

    if (isDisruption(row) && (engines.size || closePieces.size || packageMembers.size)) {
      const targets = [...engines, ...closePieces].slice(0, 8);
      for (const name of targets) {
        pushEdge(edges, {
          type: "disrupts_for",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "interaction_preserving_plan_pieces",
          partnerCount: 1,
        });
      }
    }
  }

  for (const row of rows) {
    if (isLandOrCommander(row)) continue;
    if (isTutor(row)) {
      const targets = [...closePieces, ...engines, ...packageMembers].slice(0, 10);
      for (const name of targets) {
        if (normalized(name) === normalized(row.name)) continue;
        pushEdge(edges, {
          type: "tutors_for",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "tutor_semantics_plus_package_or_close_target",
          partnerCount: 1,
        });
      }
    }
    if (isRecursion(row)) {
      const targets = [...closePieces, ...engines].slice(0, 8);
      for (const name of targets) {
        pushEdge(edges, {
          type: "recovers",
          from: row.name,
          to: name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "recursion_semantics_plus_recoverable_plan_piece",
          partnerCount: 1,
        });
      }
    }
  }

  // Structural sequence_precedes: stage adjacency within shared package/engine —
  // never decklist order.
  const byStage = new Map(SEQUENCE_STAGE_ORDER.map((stage) => [stage, []]));
  for (const row of rows) {
    if (isLandOrCommander(row)) continue;
    for (const stage of row.sequenceStages || []) {
      if (byStage.has(stage)) byStage.get(stage).push(row);
    }
  }
  for (let i = 0; i < SEQUENCE_STAGE_ORDER.length - 1; i += 1) {
    const earlier = SEQUENCE_STAGE_ORDER[i];
    const later = SEQUENCE_STAGE_ORDER[i + 1];
    for (const left of byStage.get(earlier) || []) {
      for (const right of byStage.get(later) || []) {
        if (normalized(left.name) === normalized(right.name)) continue;
        const sharePackage = packageMembers.has(normalized(left.name))
          && packageMembers.has(normalized(right.name));
        const shareSignal = (left.mechanics?.produces || []).some((s) => (right.mechanics?.rewards || []).includes(s))
          || (right.mechanics?.produces || []).some((s) => (left.mechanics?.rewards || []).includes(s));
        if (!sharePackage && !shareSignal && !(left.commanderConnectionSignals || []).length) continue;
        pushEdge(edges, {
          type: "sequence_precedes",
          from: left.name,
          to: right.name,
          semanticSupport: true,
          evidenceWeight,
          evidence: "structural_stage_adjacency_not_play_order",
          stages: freeze([earlier, later]),
          partnerCount: 1,
        });
      }
    }
  }

  // Deduplicate edges by type+from+to, keep highest confidence.
  const byKey = new Map();
  for (const edge of edges) {
    const key = `${edge.type}::${normalized(edge.from)}::${normalized(edge.to)}`;
    const prev = byKey.get(key);
    if (!prev || edge.confidence > prev.confidence) byKey.set(key, edge);
  }
  const finalEdges = [...byKey.values()]
    .sort((a, b) => b.confidence - a.confidence || a.type.localeCompare(b.type));

  const interactiveCount = nodeMeta.length || 1;
  const strongEdges = finalEdges.filter((e) => e.strength === EDGE_STRENGTH.strong);

  return freeze({
    version: STRATEGIC_TOPOLOGY_VERSION,
    deckId: analysis.deckId || record.id,
    commanders: freeze([...(commanders || [])]),
    eventId: record.eventId || null,
    performanceClass: record.performanceClass || null,
    topCut: record.topCut ?? null,
    layer: "static",
    dynamicPressureDeferred: true,
    nodes: freeze(nodeMeta),
    edges: freeze(finalEdges.slice(0, options.maxEdges || 400)),
    strongEdgeCount: strongEdges.length,
    weakEdgeCount: finalEdges.length - strongEdges.length,
    interactiveCardCount: nodeMeta.length,
    isolatedInteractiveCount: nodeMeta.filter((n) => n.isolated).length,
    multifunctionInteractiveCount: nodeMeta.filter((n) => n.multifunction).length,
    planConnectedInteractiveCount: nodeMeta.filter((n) => n.planConnected).length,
    meanStrategicDegree: round(
      nodeMeta.reduce((sum, n) => sum + n.degree, 0) / interactiveCount,
    ),
    constructionMutated: false,
    brainPolicyTouched: false,
  });
}

export function buildCorpusStrategicTopologies(analyses = [], records = [], options = {}) {
  const byId = new Map(records.map((r) => [r.id, r]));
  return freeze(analyses.map((analysis) => {
    const record = byId.get(analysis.deckId) || { id: analysis.deckId, rows: [] };
    return buildDeckStrategicTopology(analysis, record, options);
  }));
}
