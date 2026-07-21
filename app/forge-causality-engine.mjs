// =============================================================================
// Forge Causality Engine
// =============================================================================
//
// Interprets the existing interaction graph and Forge Systems report to produce
// deterministic structural-impact hypotheses.
//
// This module does not claim real-world or match-result causation. Its scores
// describe changes inside the supplied model only: relationships inferred from
// card text, detected systems, structural health, and optional simulations.
// =============================================================================

const SCORE_MIN = 0;
const SCORE_MAX = 100;

const THRESHOLDS = Object.freeze({
  criticalNode: 55,
  bottleneck: 62,
  amplifier: 58,
  highReplacementDifficulty: 65,
  fragileSystem: 58,
  resilientSystem: 70,
  meaningfulSimulationCoverage: 0.5,
});

const EVIDENCE = Object.freeze({
  methodology:
    "Structural-impact scores are deterministic hypotheses derived from the supplied interaction graph, detected systems, and optional modeled trials. They do not prove real-game causation, card quality, or predicted win rate.",
  insufficient:
    "The Forge requires at least one detected multi-card system before it can form a bounded structural-impact hypothesis.",
  card:
    "Card impact measures modeled connectivity, role concentration, cross-system reach, and existing critical-failure evidence.",
  system:
    "System resilience measures detected redundancy, health, dependency concentration, and optional modeled plan realization.",
});

function clamp(value, minimum = SCORE_MIN, maximum = SCORE_MAX) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, number),
  );
}

function round(value) {
  return Math.round(clamp(value));
}

function compareNames(left, right) {
  return String(left || "").localeCompare(
    String(right || ""),
    "en",
    { sensitivity: "base" },
  );
}

function unique(values) {
  return [...new Set(
    (values || [])
      .filter(Boolean)
      .map(String),
  )];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object"
    ? value
    : {};
}

function deepFreeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

function normalizedGraph(graph) {
  const source = safeObject(graph);

  return {
    nodes: safeArray(source.nodes),
    edges: safeArray(source.edges),
    packages: safeArray(source.packages),
    isolated: safeArray(source.isolated),
    nonbos: safeArray(source.nonbos),
    commanderLinks: safeArray(source.commanderLinks),
    coverage: clamp(Number(source.coverage || 0) * 100) / 100,
    confidence: String(source.confidence || "LOW Â· INSUFFICIENT GRAPH"),
    commanderName: String(source.commanderName || ""),
  };
}

function normalizedSystemsReport(report) {
  const source = safeObject(report);

  return {
    systems: safeArray(source.systems),
    bridgeCards: safeArray(source.bridgeCards),
    isolatedCards: safeArray(source.isolatedCards),
    conflicts: safeArray(source.conflicts),
    systemCoverage:
      clamp(Number(source.systemCoverage || 0) * 100) / 100,
    graphCoverage:
      clamp(Number(source.graphCoverage || 0) * 100) / 100,
    confidence: String(
      source.confidence ||
      "LOW Â· INSUFFICIENT SYSTEM COVERAGE",
    ),
  };
}

function createMembershipIndex(systems) {
  const membership = new Map();

  for (const system of systems) {
    for (const name of unique(system.members)) {
      const current = membership.get(name) || [];
      current.push(String(system.name || system.id || "Unnamed System"));
      membership.set(name, current);
    }
  }

  for (const [name, systemNames] of membership) {
    membership.set(
      name,
      unique(systemNames).sort(compareNames),
    );
  }

  return membership;
}

function createBridgeIndex(bridgeCards) {
  return new Map(
    bridgeCards
      .filter((entry) => entry?.name)
      .map((entry) => [
        String(entry.name),
        {
          systems: unique(entry.systems).sort(compareNames),
          score: round(entry.score || 0),
          graphDegree: Number(entry.graphDegree || 0),
          signalCount: Number(entry.signalCount || 0),
        },
      ]),
  );
}

function createCriticalFailureIndex(system) {
  return new Map(
    safeArray(system.criticalFailures)
      .filter((failure) => failure?.name)
      .map((failure) => [
        String(failure.name),
        {
          impact: clamp(
            Number(failure.impact || 0) * 100,
          ),
          lostConnections: Number(
            failure.lostConnections || 0,
          ),
          classification: String(
            failure.classification ||
            "structural dependency",
          ),
        },
      ]),
  );
}

function createDegreeIndex(members, edges) {
  const degree = new Map(
    members.map((name) => [name, 0]),
  );

  for (const edge of edges) {
    if (degree.has(edge.from)) {
      degree.set(
        edge.from,
        degree.get(edge.from) + 1,
      );
    }

    if (degree.has(edge.to)) {
      degree.set(
        edge.to,
        degree.get(edge.to) + 1,
      );
    }
  }

  return degree;
}

function normalizedSystem(system) {
  const source = safeObject(system);
  const members = unique(source.members).sort(compareNames);
  const memberSet = new Set(members);

  const edges = safeArray(source.edges)
    .filter(
      (edge) =>
        memberSet.has(edge?.from) &&
        memberSet.has(edge?.to),
    )
    .map((edge) => ({
      ...edge,
      from: String(edge.from),
      to: String(edge.to),
    }));

  return {
    ...source,
    id: String(source.id || source.signal || source.name || "system"),
    signal: String(source.signal || source.id || "system"),
    name: String(source.name || source.signal || "Unnamed System"),
    members,
    core: unique(source.core).filter((name) => memberSet.has(name)),
    support: unique(source.support).filter((name) => memberSet.has(name)),
    producers: unique(source.producers).filter((name) => memberSet.has(name)),
    payoffs: unique(source.payoffs).filter((name) => memberSet.has(name)),
    dependencies: safeArray(source.dependencies),
    criticalFailures: safeArray(source.criticalFailures),
    edges,
    redundancy: safeObject(source.redundancy),
    health: safeObject(source.health),
    confidence: String(source.confidence || "LOW"),
  };
}

function roleFlags(system, name) {
  return {
    core: system.core.includes(name),
    support: system.support.includes(name),
    producer: system.producers.includes(name),
    payoff: system.payoffs.includes(name),
  };
}

function roleCount(flags) {
  return Object.values(flags).filter(Boolean).length;
}

function alternativesForRole(system, name, flags) {
  const alternatives = new Set();

  if (flags.producer) {
    for (const producer of system.producers) {
      if (producer !== name) {
        alternatives.add(producer);
      }
    }
  }

  if (flags.payoff) {
    for (const payoff of system.payoffs) {
      if (payoff !== name) {
        alternatives.add(payoff);
      }
    }
  }

  if (flags.core) {
    for (const core of system.core) {
      if (core !== name) {
        alternatives.add(core);
      }
    }
  }

  return [...alternatives].sort(compareNames);
}

function identifyPrimaryRole(flags, bridge) {
  if (bridge && flags.core) {
    return "cross-system core";
  }

  if (flags.producer && flags.payoff) {
    return "engine converter";
  }

  if (flags.core) {
    return "core dependency";
  }

  if (bridge) {
    return "system bridge";
  }

  if (flags.producer) {
    return "producer";
  }

  if (flags.payoff) {
    return "payoff";
  }

  return "support";
}

function describeCardImpact(profile, systemName) {
  const statements = [];

  if (profile.criticalFailureImpact >= 50) {
    statements.push(
      `Removing ${profile.name} would erase approximately ${profile.criticalFailureImpact}% of the system's measured internal connections in this model.`,
    );
  } else if (profile.edgeShare >= 35) {
    statements.push(
      `${profile.name} participates in ${profile.edgeShare}% of the modeled relationships inside ${systemName}.`,
    );
  } else {
    statements.push(
      `${profile.name} contributes to ${profile.degree} modeled internal relationship${profile.degree === 1 ? "" : "s"} in ${systemName}.`,
    );
  }

  if (profile.systems.length >= 2) {
    statements.push(
      `It also bridges ${profile.systems.length} detected systems, so changing it may affect more than one machine.`,
    );
  }

  if (profile.alternatives.length) {
    statements.push(
      `${profile.alternatives.length} same-system alternative${profile.alternatives.length === 1 ? "" : "s"} may preserve part of its structural role.`,
    );
  } else if (
    profile.roles.producer ||
    profile.roles.payoff
  ) {
    statements.push(
      "No same-system alternative currently carries the same detected producer or payoff role.",
    );
  }

  return statements;
}

function buildCardProfile(
  system,
  name,
  context,
) {
  const flags = roleFlags(system, name);
  const degree = context.degree.get(name) || 0;
  const totalEdgeEnds = Math.max(
    1,
    system.edges.length * 2,
  );
  const edgeShare = clamp(
    degree / totalEdgeEnds * 100,
  );

  const critical =
    context.criticalFailures.get(name) || {
      impact: 0,
      lostConnections: 0,
      classification: "",
    };

  const bridge = context.bridgeIndex.get(name) || null;
  const systems =
    context.membership.get(name) || [system.name];
  const alternatives =
    alternativesForRole(system, name, flags);

  const concentratedRole =
    (flags.producer && system.producers.length <= 1) ||
    (flags.payoff && system.payoffs.length <= 1);

  const roleConcentration = concentratedRole
    ? 100
    : flags.core
      ? 68
      : flags.producer || flags.payoff
        ? 48
        : 24;

  const crossSystemReach = clamp(
    Math.max(0, systems.length - 1) * 38 +
    Number(bridge?.score || 0) * 0.32,
  );

  const alternativeRelief = clamp(
    alternatives.length * 16,
    0,
    48,
  );

const crossSystemCoreBonus =
  bridge && flags.core
    ? 15
    : 0;

const replacementDifficulty = round(
  roleConcentration * 0.32 +
  critical.impact * 0.27 +
  edgeShare * 0.18 +
  crossSystemReach * 0.23 +
  crossSystemCoreBonus -
  alternativeRelief,
);

  const collapseRisk = round(
    critical.impact * 0.38 +
    edgeShare * 0.27 +
    roleConcentration * 0.2 +
    crossSystemReach * 0.15 -
    alternativeRelief * 0.45,
  );

  const amplifierScore = round(
    edgeShare * 0.34 +
    crossSystemReach * 0.34 +
    roleCount(flags) * 12 +
    (bridge ? 14 : 0),
  );

  const bottleneckScore = round(
    collapseRisk * 0.52 +
    replacementDifficulty * 0.33 +
    (concentratedRole ? 15 : 0),
  );

  const profile = {
    name,
    primaryRole:
      identifyPrimaryRole(flags, bridge),
    roles: flags,
    systems,
    degree,
    edgeShare: round(edgeShare),
    criticalFailureImpact:
      round(critical.impact),
    lostConnections:
      critical.lostConnections,
    alternatives,
    replacementDifficulty,
    collapseRisk,
    amplifierScore,
    bottleneckScore,
    isCritical:
      collapseRisk >= THRESHOLDS.criticalNode,
    isAmplifier:
      amplifierScore >= THRESHOLDS.amplifier &&
      (
        systems.length >= 2 ||
        roleCount(flags) >= 2 ||
        degree >= 3
      ),
    isBottleneck:
      bottleneckScore >= THRESHOLDS.bottleneck,
    evidence: EVIDENCE.card,
  };

  return {
    ...profile,
    hypothesis:
      describeCardImpact(
        profile,
        system.name,
      ),
  };
}

function extractPlanRealization(simulationDossier) {
  const expert =
    simulationDossier
      ?.goldfish
      ?.expert;

  const raw = Number(
    expert?.planRealizationRate,
  );

  if (!Number.isFinite(raw)) {
    return null;
  }

  return clamp(raw * 100);
}

function systemRedundancyScore(system) {
  const redundancy = system.redundancy;
  const repeatedCards =
    Number(redundancy.repeatedCards || 0);
  const producerVariety =
    Number(
      redundancy.producerVariety ??
      system.producers.length,
    );
  const payoffVariety =
    Number(
      redundancy.payoffVariety ??
      system.payoffs.length,
    );
  const producerDepth =
    Number(redundancy.producerDepth || 0);
  const payoffDepth =
    Number(redundancy.payoffDepth || 0);
  const balanced =
    redundancy.balanced === true;

  return round(
    repeatedCards * 7 +
    Math.min(3, producerVariety) * 10 +
    Math.min(3, payoffVariety) * 10 +
    Math.min(4, producerDepth) * 4 +
    Math.min(4, payoffDepth) * 4 +
    (balanced ? 12 : 0),
  );
}

function describeSystemImpact(profile) {
  const statements = [];

  if (profile.criticalNodes.length) {
    statements.push(
      `${profile.criticalNodes[0].name} is the strongest current structural-impact hypothesis, with ${profile.criticalNodes[0].collapseRisk}/100 modeled collapse risk.`,
    );
  } else {
    statements.push(
      "No single member currently crosses the Forge's critical-node threshold.",
    );
  }

  if (profile.redundancy >= 65) {
    statements.push(
      "Multiple detected role alternatives give this machine meaningful structural redundancy.",
    );
  } else if (profile.redundancy < 40) {
    statements.push(
      "Producer, payoff, or repeated-effect depth is limited, so one-slot changes deserve controlled testing.",
    );
  }

  if (profile.planRealization !== null) {
    statements.push(
      `The optional deterministic trial model realized the broader deck plan at ${profile.planRealization}%; this is a viability signal, not a predicted win rate.`,
    );
  }

  return statements;
}

function buildSystemProfile(
  rawSystem,
  context,
) {
  const system = normalizedSystem(rawSystem);
  const degree = createDegreeIndex(
    system.members,
    system.edges,
  );
  const criticalFailures =
    createCriticalFailureIndex(system);

  const cardContext = {
    ...context,
    degree,
    criticalFailures,
  };

  const cards = system.members
    .map((name) =>
      buildCardProfile(
        system,
        name,
        cardContext,
      ),
    )
    .sort(
      (left, right) =>
        right.collapseRisk -
          left.collapseRisk ||
        right.replacementDifficulty -
          left.replacementDifficulty ||
        compareNames(left.name, right.name),
    );

  const redundancy =
    systemRedundancyScore(system);

  const health = {
    overall: round(system.health.overall || 0),
    consistency: round(system.health.consistency || 0),
    resilience: round(system.health.resilience || 0),
    leverage: round(system.health.leverage || 0),
    cohesion: round(system.health.cohesion || 0),
    dependencyRisk: round(
      system.health.dependencyRisk || 0,
    ),
  };

  const planRealization =
    context.planRealization;

  const simulationContribution =
    planRealization === null
      ? health.consistency
      : planRealization;

  const structuralResilience = round(
    health.resilience * 0.3 +
    health.consistency * 0.2 +
    health.cohesion * 0.16 +
    redundancy * 0.2 +
    (100 - health.dependencyRisk) * 0.09 +
    simulationContribution * 0.05,
  );

  const highestCollapseRisk =
    cards[0]?.collapseRisk || 0;

  const collapseRisk = round(
    highestCollapseRisk * 0.52 +
    health.dependencyRisk * 0.3 +
    (100 - redundancy) * 0.18,
  );

  const recoveryPotential = round(
    redundancy * 0.38 +
    health.resilience * 0.28 +
    health.consistency * 0.2 +
    simulationContribution * 0.14,
  );

  const replacementDifficulty = round(
    cards
      .slice(0, Math.min(3, cards.length))
      .reduce(
        (sum, card) =>
          sum + card.replacementDifficulty,
        0,
      ) /
      Math.max(
        1,
        Math.min(3, cards.length),
      ),
  );

  const criticalNodes = cards
    .filter((card) => card.isCritical)
    .slice(0, 4);

  const bottlenecks = cards
    .filter((card) => card.isBottleneck)
    .slice(0, 4);

  const amplifiers = cards
    .filter((card) => card.isAmplifier)
    .sort(
      (left, right) =>
        right.amplifierScore -
          left.amplifierScore ||
        compareNames(left.name, right.name),
    )
    .slice(0, 4);

  const status =
    structuralResilience >= THRESHOLDS.resilientSystem &&
    collapseRisk < 50
      ? "tempered"
      : collapseRisk >= THRESHOLDS.fragileSystem
        ? "fragile"
        : "watch";

  const profile = {
    id: system.id,
    name: system.name,
    signal: system.signal,
    status,
    members: system.members,
    cards,
    criticalNodes,
    bottlenecks,
    amplifiers,
    redundancy,
    structuralResilience,
    collapseRisk,
    recoveryPotential,
    replacementDifficulty,
    planRealization:
      planRealization === null
        ? null
        : round(planRealization),
    health,
    confidence: system.confidence,
    evidence: EVIDENCE.system,
  };

  return {
    ...profile,
    hypothesis:
      describeSystemImpact(profile),
  };
}

function identifyDeckAmplifiers(systemProfiles) {
  const cards = new Map();

  for (const system of systemProfiles) {
    for (const card of system.cards) {
      const current = cards.get(card.name);

      if (
        !current ||
        card.amplifierScore >
          current.amplifierScore
      ) {
        cards.set(card.name, {
          name: card.name,
          systems: card.systems,
          amplifierScore:
            card.amplifierScore,
          collapseRisk:
            card.collapseRisk,
          primaryRole:
            card.primaryRole,
        });
      }
    }
  }

  return [...cards.values()]
    .filter(
      (card) =>
        card.amplifierScore >=
        THRESHOLDS.amplifier,
    )
    .sort(
      (left, right) =>
        right.amplifierScore -
          left.amplifierScore ||
        compareNames(left.name, right.name),
    )
    .slice(0, 6);
}

function highestValueUpgrade(systemProfiles) {
  const target = [...systemProfiles]
    .sort(
      (left, right) =>
        right.collapseRisk -
          left.collapseRisk ||
        left.redundancy -
          right.redundancy ||
        compareNames(left.name, right.name),
    )[0];

  if (!target) {
    return null;
  }

  const node =
    target.criticalNodes[0] ||
    target.bottlenecks[0] ||
    target.cards[0] ||
    null;

  return {
    systemId: target.id,
    systemName: target.name,
    targetCard: node?.name || "",
    priority: round(
      target.collapseRisk * 0.55 +
      (100 - target.redundancy) * 0.3 +
      (node?.replacementDifficulty || 0) *
        0.15,
    ),
    recommendation: node
      ? `Test one additional card that performs ${node.name}'s detected ${node.primaryRole} function without removing another ${target.name} core member.`
      : `Test one additional producer or payoff inside ${target.name}, then rerun the same deterministic gates.`,
    contract:
      "Change one slot, preserve deck size and legality, then compare system resilience, collapse risk, opening-hand consistency, and the same modeled stress profiles.",
  };
}

function describeReportConfidence(
  systemsReport,
  systemProfiles,
) {
  if (!systemProfiles.length) {
    return "INSUFFICIENT Â· NO DETECTED SYSTEMS";
  }

  const coverage =
    systemsReport.systemCoverage;

  if (
    coverage >= 0.7 &&
    systemProfiles.length >= 2
  ) {
    return "HIGH Â· MULTI-SYSTEM STRUCTURAL MODEL";
  }

  if (coverage >= 0.45) {
    return "MEDIUM Â· PARTIAL STRUCTURAL MODEL";
  }

  return "LOW Â· LIMITED SYSTEM COVERAGE";
}

export function buildForgeCausalityReport(
  graph,
  systemsReport,
  simulationDossier = null,
) {
  const normalizedGraphValue =
    normalizedGraph(graph);
  const normalizedReport =
    normalizedSystemsReport(systemsReport);

  const systems = normalizedReport.systems
    .map(normalizedSystem);

  if (!systems.length) {
    return deepFreeze({
      status: "insufficient-structure",
      systems: [],
      strongestSystem: null,
      mostFragileSystem: null,
      criticalNodes: [],
      bottlenecks: [],
      amplifiers: [],
      isolatedCards:
        normalizedReport.isolatedCards,
      structuralResilience: 0,
      collapseRisk: 0,
      recoveryPotential: 0,
      highestValueUpgrade: null,
      confidence:
        "INSUFFICIENT Â· NO DETECTED SYSTEMS",
      headline:
        "The Forge cannot form a causal hypothesis without a detected multi-card system.",
      evidence: EVIDENCE.insufficient,
      methodology: EVIDENCE.methodology,
    });
  }

  const membership =
    createMembershipIndex(systems);
  const bridgeIndex =
    createBridgeIndex(
      normalizedReport.bridgeCards,
    );
  const planRealization =
    extractPlanRealization(
      simulationDossier,
    );

  const context = {
    graph: normalizedGraphValue,
    systemsReport: normalizedReport,
    membership,
    bridgeIndex,
    planRealization,
  };

  const systemProfiles = systems
    .map((system) =>
      buildSystemProfile(
        system,
        context,
      ),
    )
    .sort(
      (left, right) =>
        right.structuralResilience -
          left.structuralResilience ||
        compareNames(left.name, right.name),
    );

  const strongestSystem =
    systemProfiles[0] || null;

  const mostFragileSystem =
    [...systemProfiles].sort(
      (left, right) =>
        right.collapseRisk -
          left.collapseRisk ||
        left.structuralResilience -
          right.structuralResilience ||
        compareNames(left.name, right.name),
    )[0] || null;

  const structuralResilience = round(
    systemProfiles.reduce(
      (sum, system) =>
        sum + system.structuralResilience,
      0,
    ) / systemProfiles.length,
  );

  const collapseRisk = round(
    systemProfiles.reduce(
      (sum, system) =>
        sum + system.collapseRisk,
      0,
    ) / systemProfiles.length,
  );

  const recoveryPotential = round(
    systemProfiles.reduce(
      (sum, system) =>
        sum + system.recoveryPotential,
      0,
    ) / systemProfiles.length,
  );

  const criticalNodes = systemProfiles
    .flatMap((system) =>
      system.criticalNodes.map((card) => ({
        ...card,
        systemId: system.id,
        systemName: system.name,
      })),
    )
    .sort(
      (left, right) =>
        right.collapseRisk -
          left.collapseRisk ||
        compareNames(left.name, right.name),
    )
    .slice(0, 8);

  const bottlenecks = systemProfiles
    .flatMap((system) =>
      system.bottlenecks.map((card) => ({
        ...card,
        systemId: system.id,
        systemName: system.name,
      })),
    )
    .sort(
      (left, right) =>
        right.bottleneckScore -
          left.bottleneckScore ||
        compareNames(left.name, right.name),
    )
    .slice(0, 8);

  const amplifiers =
    identifyDeckAmplifiers(
      systemProfiles,
    );

  const confidence =
    describeReportConfidence(
      normalizedReport,
      systemProfiles,
    );

  const report = {
    status: "bounded-structural-hypothesis",
    systems: systemProfiles,
    strongestSystem,
    mostFragileSystem,
    criticalNodes,
    bottlenecks,
    amplifiers,
    isolatedCards:
      normalizedReport.isolatedCards,
    structuralResilience,
    collapseRisk,
    recoveryPotential,
    highestValueUpgrade:
      highestValueUpgrade(
        systemProfiles,
      ),
    confidence,
    headline: mostFragileSystem
      ? `${mostFragileSystem.name} is the clearest current structural-risk hypothesis; controlled testing is required before treating that pattern as a real-game cause.`
      : "No structural-risk hypothesis is currently available.",
    evidence:
      "This report compares modeled system structure. It does not prove that any card caused a win, loss, or matchup result.",
    methodology: EVIDENCE.methodology,
  };

  return deepFreeze(report);
}
