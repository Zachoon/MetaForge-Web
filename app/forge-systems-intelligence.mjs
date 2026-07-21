// =============================================================================
// Forge Systems Intelligence
// =============================================================================
//
// Converts an existing Forge interaction graph into explainable deck systems,
// structural health measurements, bridge-card insights, and bounded failure
// hypotheses.
//
// This module does not rebuild the interaction graph. It interprets the graph
// produced by the existing Forge graph engine.
//
// Public API:
//
//   buildForgeSystemsReport(graph, options)
//   buildBoundedFailureAnalysis(systemsReport, simulationDossier)
//
// =============================================================================


// =============================================================================
// Configuration
// =============================================================================

const SYSTEM_LABELS = Object.freeze({
  tokens: "Token Engine",
  treasure: "Treasure Engine",
  artifacts: "Artifact Engine",
  counters: "Counter Engine",
  graveyard: "Graveyard Engine",
  sacrifice: "Sacrifice Engine",
  draw: "Card-Flow Engine",
  spells: "Spellcraft Engine",
  lands: "Land Engine",
  life: "Life Engine",
  etb: "Enter-the-Battlefield Engine",
  combat: "Combat Engine",
});

const SCORE_LIMITS = Object.freeze({
  minimum: 0,
  maximum: 100,
});

const SYSTEM_LIMITS = Object.freeze({
  minimumMembers: 2,
  minimumFailureMembers: 3,
  minimumFailureEdges: 2,
  maximumCriticalFailures: 3,
  maximumBridgeCards: 5,
});

const STRUCTURAL_THRESHOLDS = Object.freeze({
  criticalFailureImpact: 0.45,
  highGraphCoverage: 0.7,
  highSystemCohesion: 70,
  mediumSystemCohesion: 52,
  highReportSystemCount: 3,
  highReportCoverage: 0.55,
  elevatedDependencyRisk: 55,
  weakConsistency: 60,
  lowPlanRealization: 0.6,
});

const HEALTH_WEIGHTS = Object.freeze({
  consistency: 0.27,
  resilience: 0.25,
  leverage: 0.2,
  cohesion: 0.28,
});

const CONSISTENCY_SCORING = Object.freeze({
  base: 28,
  member: 7,
  edge: 5,
  producerVariety: 5,
  payoffVariety: 5,
  repeatedCard: 4,
});

const RESILIENCE_SCORING = Object.freeze({
  base: 78,
  failureImpact: 58,
  supportMember: 4,
  repeatedCard: 4,
});

const LEVERAGE_SCORING = Object.freeze({
  base: 24,
  crossSignalMember: 13,
  coreMember: 5,
  edge: 4,
  maximumEdgeContribution: 20,
});

const COHESION_SCORING = Object.freeze({
  base: 26,
  connectedMemberContribution: 42,
  densityContribution: 82,
  maximumDensityContribution: 32,
});

const DEPENDENCY_SCORING = Object.freeze({
  base: 20,
  failureImpact: 65,
  supportMember: 4,
  repeatedCard: 3,
});

const BRIDGE_SCORING = Object.freeze({
  base: 18,
  system: 20,
  signal: 5,
  graphDegree: 6,
});

const EVIDENCE_TEXT = Object.freeze({
  system:
    "Inferred from current Oracle text, card type lines, and producer/payoff graph relationships.",

  methodology:
    "Systems are inferred from verified card text, producer/payoff relationships, and graph structure. Health scores compare structural support inside this deck; they are not predicted win rates.",

  failure:
    "Forge Theory · inferred from Oracle-derived structure and deterministic stress gates.",

  insufficient:
    "Insufficient evidence for a structural hypothesis.",
});

const CONFIDENCE_TEXT = Object.freeze({
  earlySystem:
    "LOW · EARLY STRUCTURAL CLUE",

  highSystem:
    "HIGH · ORACLE-DERIVED STRUCTURE",

  mediumSystem:
    "MEDIUM · PARTIAL STRUCTURAL SUPPORT",

  sparseSystem:
    "LOW · SPARSE CONNECTIONS",

  highReport:
    "HIGH · MULTIPLE ORACLE-DERIVED SYSTEMS",

  mediumReport:
    "MEDIUM · PARTIAL SYSTEM MAP",

  lowReport:
    "LOW · NO REPEATABLE SYSTEM DETECTED",
});


// =============================================================================
// General Utilities
// =============================================================================

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return SCORE_LIMITS.minimum;
  }

  return Math.min(
    SCORE_LIMITS.maximum,
    Math.max(
      SCORE_LIMITS.minimum,
      value,
    ),
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function compareNames(left, right) {
  return String(left).localeCompare(
    String(right),
  );
}

function isLand(node) {
  return /\bLand\b/i.test(
    node?.typeLine || "",
  );
}


// =============================================================================
// Graph Normalization and Analysis Context
// =============================================================================

function normalizeGraph(
  graph,
  options = {},
) {
  return {
    nodes: graph?.nodes || [],
    edges: graph?.edges || [],
    packages: graph?.packages || [],
    isolated: graph?.isolated || [],
    nonbos: graph?.nonbos || [],
    commanderLinks:
      graph?.commanderLinks || [],
    coverage: Number(
      graph?.coverage || 0,
    ),
    commanderName:
      options.commanderName ||
      graph?.commanderName ||
      "",
  };
}

function createNodeIndex(graph) {
  return new Map(
    graph.nodes.map((node) => [
      node.name,
      node,
    ]),
  );
}

function createQuantityIndex(graph) {
  return new Map(
    graph.nodes.map((node) => [
      node.name,
      Math.max(
        1,
        Number(node.quantity || 1),
      ),
    ]),
  );
}

function createDegreeIndex(graph) {
  const degrees = new Map();

  for (const edge of graph.edges) {
    degrees.set(
      edge.from,
      (degrees.get(edge.from) || 0) +
        1,
    );

    degrees.set(
      edge.to,
      (degrees.get(edge.to) || 0) +
        1,
    );
  }

  return degrees;
}

function createAnalysisContext(
  graph,
  options = {},
) {
  const safeGraph = normalizeGraph(
    graph,
    options,
  );

  return {
    graph: safeGraph,
    nodeIndex:
      createNodeIndex(safeGraph),
    quantityIndex:
      createQuantityIndex(safeGraph),
    globalDegrees:
      createDegreeIndex(safeGraph),
    commanderName:
      safeGraph.commanderName,
  };
}


// =============================================================================
// Graph Utilities
// =============================================================================

function getSystemEdges(
  context,
  signal,
  members,
) {
  const memberNames = new Set(
    members,
  );

  return context.graph.edges.filter(
    (edge) =>
      memberNames.has(edge.from) &&
      memberNames.has(edge.to) &&
      (edge.signals || []).includes(
        signal,
      ),
  );
}

function createLocalDegreeIndex(edges) {
  const degrees = new Map();

  for (const edge of edges) {
    degrees.set(
      edge.from,
      (degrees.get(edge.from) || 0) +
        1,
    );

    degrees.set(
      edge.to,
      (degrees.get(edge.to) || 0) +
        1,
    );
  }

  return degrees;
}

function rankMembers(
  context,
  members,
  localDegrees,
) {
  return [...members].sort(
    (left, right) => {
      const localDifference =
        (localDegrees.get(right) || 0) -
        (localDegrees.get(left) || 0);

      if (localDifference) {
        return localDifference;
      }

      const globalDifference =
        (
          context.globalDegrees.get(
            right,
          ) || 0
        ) -
        (
          context.globalDegrees.get(
            left,
          ) || 0
        );

      if (globalDifference) {
        return globalDifference;
      }

      if (
        left === context.commanderName
      ) {
        return -1;
      }

      if (
        right === context.commanderName
      ) {
        return 1;
      }

      return compareNames(
        left,
        right,
      );
    },
  );
}


// =============================================================================
// Structural Analysis
// =============================================================================

function classifySystemMembers(
  context,
  members,
  edges,
) {
  const localDegrees =
    createLocalDegreeIndex(edges);

  const ranked = rankMembers(
    context,
    members,
    localDegrees,
  );

  const strongestLocalDegree =
    localDegrees.get(ranked[0]) || 0;

  let core = ranked.filter((name) => {
    if (
      name === context.commanderName
    ) {
      return true;
    }

    const localDegree =
      localDegrees.get(name) || 0;

    return (
      localDegree >= 2 &&
      localDegree >=
        strongestLocalDegree - 1
    );
  });

  if (!core.length) {
    core = ranked.slice(
      0,
      Math.min(
        2,
        ranked.length,
      ),
    );
  }

  const support = ranked.filter(
    (name) => !core.includes(name),
  );

  return {
    ranked,
    core,
    support,
    localDegrees,
  };
}

function identifyDependencies(
  context,
  members,
  edges,
  classification,
) {
  const dependencies = [];

  for (const name of members) {
    const node =
      context.nodeIndex.get(name);

    const incoming = edges.filter(
      (edge) => edge.to === name,
    );

    const outgoing = edges.filter(
      (edge) => edge.from === name,
    );

    const connectedCards = unique([
      ...incoming.map(
        (edge) => edge.from,
      ),
      ...outgoing.map(
        (edge) => edge.to,
      ),
    ]).sort(compareNames);

    const produces =
      node?.mechanics?.produces || [];

    const rewards =
      node?.mechanics?.rewards || [];

    dependencies.push({
      name,
      classification:
        classification.core.includes(
          name,
        )
          ? "core"
          : "support",
      connectedCards,
      incomingConnections:
        incoming.length,
      outgoingConnections:
        outgoing.length,
      produces,
      rewards,
    });
  }

  return dependencies.sort(
    (left, right) => {
      const leftConnections =
        left.incomingConnections +
        left.outgoingConnections;

      const rightConnections =
        right.incomingConnections +
        right.outgoingConnections;

      return (
        rightConnections -
          leftConnections ||
        compareNames(
          left.name,
          right.name,
        )
      );
    },
  );
}

function identifyCriticalFailures(
  members,
  edges,
  classification,
) {
  if (
    members.length <
      SYSTEM_LIMITS.minimumFailureMembers ||
    edges.length <
      SYSTEM_LIMITS.minimumFailureEdges
  ) {
    return [];
  }

  const baselineConnections =
    edges.length;

  return members
    .map((name) => {
      const remainingConnections =
        edges.filter(
          (edge) =>
            edge.from !== name &&
            edge.to !== name,
        ).length;

      const lostConnections =
        baselineConnections -
        remainingConnections;

      const impact =
        baselineConnections
          ? lostConnections /
            baselineConnections
          : 0;

      return {
        name,
        lostConnections,
        impact,
        classification:
          classification.core.includes(
            name,
          )
            ? "core dependency"
            : "support dependency",
      };
    })
    .filter(
      (failure) =>
        failure.impact >=
        STRUCTURAL_THRESHOLDS
          .criticalFailureImpact,
    )
    .sort(
      (left, right) =>
        right.impact -
          left.impact ||
        compareNames(
          left.name,
          right.name,
        ),
    )
    .slice(
      0,
      SYSTEM_LIMITS
        .maximumCriticalFailures,
    );
}

function measureRedundancy(
  context,
  members,
  producers,
  payoffs,
) {
  const repeatedCards = members.filter(
    (name) =>
      (
        context.quantityIndex.get(
          name,
        ) || 1
      ) > 1,
  );

  const producerDepth =
    producers.reduce(
      (total, name) =>
        total +
        (
          context.quantityIndex.get(
            name,
          ) || 1
        ),
      0,
    );

  const payoffDepth =
    payoffs.reduce(
      (total, name) =>
        total +
        (
          context.quantityIndex.get(
            name,
          ) || 1
        ),
      0,
    );

  return {
    repeatedCards,
    producerDepth,
    payoffDepth,
    producerVariety:
      producers.length,
    payoffVariety:
      payoffs.length,
    balanced:
      producers.length >= 2 &&
      payoffs.length >= 2,
  };
}

function identifySystemRoles(
  context,
  members,
  signal,
) {
  const producers = members.filter(
    (name) =>
      (
        context.nodeIndex.get(name)
          ?.mechanics
          ?.produces || []
      ).includes(signal),
  );

  const payoffs = members.filter(
    (name) =>
      (
        context.nodeIndex.get(name)
          ?.mechanics
          ?.rewards || []
      ).includes(signal),
  );

  return {
    producers,
    payoffs,
  };
}


// =============================================================================
// Health Evaluation
// =============================================================================

function countConnectedMembers(edges) {
  return new Set(
    edges.flatMap((edge) => [
      edge.from,
      edge.to,
    ]),
  ).size;
}

function calculatePossibleConnections(
  memberCount,
) {
  return memberCount > 1
    ? (
        memberCount *
        (memberCount - 1)
      ) / 2
    : 1;
}

function countCrossSignalMembers(
  context,
  members,
) {
  return members.filter(
    (name) =>
      (
        context.nodeIndex.get(name)
          ?.mechanics
          ?.signals || []
      ).length >= 2,
  ).length;
}

function scoreConsistency({
  memberCount,
  edgeCount,
  redundancy,
}) {
  return clampScore(
    CONSISTENCY_SCORING.base +
      memberCount *
        CONSISTENCY_SCORING.member +
      edgeCount *
        CONSISTENCY_SCORING.edge +
      redundancy.producerVariety *
        CONSISTENCY_SCORING
          .producerVariety +
      redundancy.payoffVariety *
        CONSISTENCY_SCORING
          .payoffVariety +
      redundancy.repeatedCards.length *
        CONSISTENCY_SCORING
          .repeatedCard,
  );
}

function scoreResilience({
  worstFailureImpact,
  supportCount,
  repeatedCardCount,
}) {
  return clampScore(
    RESILIENCE_SCORING.base -
      worstFailureImpact *
        RESILIENCE_SCORING
          .failureImpact +
      supportCount *
        RESILIENCE_SCORING
          .supportMember +
      repeatedCardCount *
        RESILIENCE_SCORING
          .repeatedCard,
  );
}

function scoreLeverage({
  crossSignalMemberCount,
  coreCount,
  edgeCount,
}) {
  return clampScore(
    LEVERAGE_SCORING.base +
      crossSignalMemberCount *
        LEVERAGE_SCORING
          .crossSignalMember +
      coreCount *
        LEVERAGE_SCORING
          .coreMember +
      Math.min(
        LEVERAGE_SCORING
          .maximumEdgeContribution,
        edgeCount *
          LEVERAGE_SCORING.edge,
      ),
  );
}

function scoreCohesion({
  connectedMemberCount,
  memberCount,
  edgeDensity,
}) {
  return clampScore(
    COHESION_SCORING.base +
      (
        connectedMemberCount /
        Math.max(
          1,
          memberCount,
        )
      ) *
        COHESION_SCORING
          .connectedMemberContribution +
      Math.min(
        COHESION_SCORING
          .maximumDensityContribution,
        edgeDensity *
          COHESION_SCORING
            .densityContribution,
      ),
  );
}

function scoreDependencyRisk({
  worstFailureImpact,
  supportCount,
  repeatedCardCount,
}) {
  return clampScore(
    DEPENDENCY_SCORING.base +
      worstFailureImpact *
        DEPENDENCY_SCORING
          .failureImpact -
      supportCount *
        DEPENDENCY_SCORING
          .supportMember -
      repeatedCardCount *
        DEPENDENCY_SCORING
          .repeatedCard,
  );
}

function scoreOverallHealth({
  consistency,
  resilience,
  leverage,
  cohesion,
}) {
  return clampScore(
    consistency *
      HEALTH_WEIGHTS.consistency +
      resilience *
        HEALTH_WEIGHTS.resilience +
      leverage *
        HEALTH_WEIGHTS.leverage +
      cohesion *
        HEALTH_WEIGHTS.cohesion,
  );
}

function scoreSystemHealth(
  context,
  members,
  edges,
  classification,
  failures,
  redundancy,
) {
  const memberCount =
    members.length;

  const connectedMemberCount =
    countConnectedMembers(edges);

  const possibleConnections =
    calculatePossibleConnections(
      memberCount,
    );

  const edgeDensity =
    edges.length /
    possibleConnections;

  const crossSignalMemberCount =
    countCrossSignalMembers(
      context,
      members,
    );

  const worstFailureImpact =
    failures[0]?.impact || 0;

  const consistency =
    scoreConsistency({
      memberCount,
      edgeCount: edges.length,
      redundancy,
    });

  const resilience =
    scoreResilience({
      worstFailureImpact,
      supportCount:
        classification.support.length,
      repeatedCardCount:
        redundancy.repeatedCards.length,
    });

  const leverage =
    scoreLeverage({
      crossSignalMemberCount,
      coreCount:
        classification.core.length,
      edgeCount: edges.length,
    });

  const cohesion =
    scoreCohesion({
      connectedMemberCount,
      memberCount,
      edgeDensity,
    });

  const dependencyRisk =
    scoreDependencyRisk({
      worstFailureImpact,
      supportCount:
        classification.support.length,
      repeatedCardCount:
        redundancy.repeatedCards.length,
    });

  const overall =
    scoreOverallHealth({
      consistency,
      resilience,
      leverage,
      cohesion,
    });

  return {
    overall:
      Math.round(overall),
    consistency:
      Math.round(consistency),
    resilience:
      Math.round(resilience),
    leverage:
      Math.round(leverage),
    cohesion:
      Math.round(cohesion),
    dependencyRisk:
      Math.round(dependencyRisk),
  };
}


// =============================================================================
// Confidence Evaluation
// =============================================================================

function describeSystemConfidence(
  system,
  graph,
) {
  if (
    system.members.length < 3 ||
    system.edges.length < 2
  ) {
    return CONFIDENCE_TEXT
      .earlySystem;
  }

  if (
    graph.coverage >=
      STRUCTURAL_THRESHOLDS
        .highGraphCoverage &&
    system.health.cohesion >=
      STRUCTURAL_THRESHOLDS
        .highSystemCohesion
  ) {
    return CONFIDENCE_TEXT
      .highSystem;
  }

  if (
    system.health.cohesion >=
    STRUCTURAL_THRESHOLDS
      .mediumSystemCohesion
  ) {
    return CONFIDENCE_TEXT
      .mediumSystem;
  }

  return CONFIDENCE_TEXT
    .sparseSystem;
}

function describeReportConfidence(
  systems,
  systemCoverage,
) {
  if (
    systems.length >=
      STRUCTURAL_THRESHOLDS
        .highReportSystemCount &&
    systemCoverage >=
      STRUCTURAL_THRESHOLDS
        .highReportCoverage
  ) {
    return CONFIDENCE_TEXT
      .highReport;
  }

  if (systems.length) {
    return CONFIDENCE_TEXT
      .mediumReport;
  }

  return CONFIDENCE_TEXT
    .lowReport;
}


// =============================================================================
// System Construction
// =============================================================================

function createSystem(
  context,
  group,
) {
  const members = unique(
    group.members || [],
  ).sort(compareNames);

  const edges = getSystemEdges(
    context,
    group.signal,
    members,
  );

  const classification =
    classifySystemMembers(
      context,
      members,
      edges,
    );

  const {
    producers,
    payoffs,
  } = identifySystemRoles(
    context,
    members,
    group.signal,
  );

  const dependencies =
    identifyDependencies(
      context,
      members,
      edges,
      classification,
    );

  const criticalFailures =
    identifyCriticalFailures(
      members,
      edges,
      classification,
    );

  const redundancy =
    measureRedundancy(
      context,
      members,
      producers,
      payoffs,
    );

  const health =
    scoreSystemHealth(
      context,
      members,
      edges,
      classification,
      criticalFailures,
      redundancy,
    );

  const system = {
    id: group.signal,
    signal: group.signal,
    name:
      SYSTEM_LABELS[group.signal] ||
      `${group.signal} Engine`,
    members,
    core: classification.core,
    support:
      classification.support,
    producers,
    payoffs,
    dependencies,
    redundancy,
    criticalFailures,
    edges,
    health,
    confidence: "",
    evidence:
      EVIDENCE_TEXT.system,
  };

  return {
    ...system,
    confidence:
      describeSystemConfidence(
        system,
        context.graph,
      ),
  };
}


// =============================================================================
// Cross-System Analysis
// =============================================================================

function createSystemMembershipIndex(
  systems,
) {
  const membership = new Map();

  for (const system of systems) {
    for (const name of system.members) {
      const current =
        membership.get(name) || {
          name,
          systems: new Set(),
        };

      current.systems.add(
        system.name,
      );

      membership.set(
        name,
        current,
      );
    }
  }

  return membership;
}

function scoreBridgeCard(
  context,
  entry,
) {
  const node =
    context.nodeIndex.get(
      entry.name,
    );

  const systemNames = [
    ...entry.systems,
  ].sort(compareNames);

  const signalCount =
    node?.mechanics
      ?.signals?.length || 0;

  const graphDegree =
    context.globalDegrees.get(
      entry.name,
    ) || 0;

  const score = clampScore(
    BRIDGE_SCORING.base +
      systemNames.length *
        BRIDGE_SCORING.system +
      signalCount *
        BRIDGE_SCORING.signal +
      graphDegree *
        BRIDGE_SCORING
          .graphDegree,
  );

  return {
    name: entry.name,
    systems: systemNames,
    signalCount,
    graphDegree,
    score: Math.round(score),
  };
}

function identifyBridgeCards(
  context,
  systems,
) {
  const membership =
    createSystemMembershipIndex(
      systems,
    );

  return [...membership.values()]
    .map((entry) =>
      scoreBridgeCard(
        context,
        entry,
      ),
    )
    .filter(
      (entry) =>
        entry.systems.length >= 2,
    )
    .sort(
      (left, right) =>
        right.score -
          left.score ||
        compareNames(
          left.name,
          right.name,
        ),
    )
    .slice(
      0,
      SYSTEM_LIMITS
        .maximumBridgeCards,
    );
}

function calculateSystemCoverage(
  context,
  systems,
) {
  const totalNonlandCards =
    context.graph.nodes.filter(
      (node) => !isLand(node),
    ).length;

  const mappedCards = new Set(
    systems.flatMap(
      (system) => system.members,
    ),
  );

  return totalNonlandCards
    ? mappedCards.size /
        totalNonlandCards
    : 0;
}


// =============================================================================
// System Ranking
// =============================================================================

function compareSystemStrength(
  left,
  right,
) {
  return (
    right.health.overall -
      left.health.overall ||
    right.members.length -
      left.members.length ||
    compareNames(
      left.name,
      right.name,
    )
  );
}

function compareSystemWeakness(
  left,
  right,
) {
  return (
    left.health.overall -
      right.health.overall ||
    right.health.dependencyRisk -
      left.health.dependencyRisk ||
    compareNames(
      left.name,
      right.name,
    )
  );
}


// =============================================================================
// Failure Analysis
// =============================================================================

function createFailureChain(
  weakest,
  simulationDossier,
) {
  const weakestMatchup =
    simulationDossier
      ?.matrix
      ?.weakest;

  const expertSimulation =
    simulationDossier
      ?.goldfish
      ?.expert;

  const criticalFailure =
    weakest
      ?.criticalFailures
      ?.[0];

  const chain = [];

  if (
    weakest.health.dependencyRisk >=
      STRUCTURAL_THRESHOLDS
        .elevatedDependencyRisk &&
    criticalFailure
  ) {
    chain.push(
      `${criticalFailure.name} carries ${Math.round(
        criticalFailure.impact * 100,
      )}% of the measured internal connections in ${weakest.name}.`,
    );
  }

  if (
    weakest.health.consistency <
    STRUCTURAL_THRESHOLDS
      .weakConsistency
  ) {
    chain.push(
      `${weakest.name} has limited producer, payoff, or repeated-effect redundancy.`,
    );
  }

  if (
    expertSimulation &&
    Number(
      expertSimulation
        .planRealizationRate || 0,
    ) <
      STRUCTURAL_THRESHOLDS
        .lowPlanRealization
  ) {
    chain.push(
      "Modeled plan realization is below 60%, suggesting that supported systems may not assemble reliably in deterministic goldfish trials.",
    );
  }

  if (weakestMatchup?.opponent) {
    chain.push(
      `${weakestMatchup.opponent} is the hardest modeled pressure profile, but this identifies a stress condition rather than a predicted matchup result.`,
    );
  }

  if (!chain.length) {
    chain.push(
      `${weakest.name} is the lowest-scoring detected system, although no single deterministic failure explains that result.`,
    );
  }

  return {
    chain,
    criticalFailure,
  };
}

function createFailureNextTest(
  weakest,
  criticalFailure,
) {
  if (criticalFailure) {
    return (
      `Run a one-slot experiment that adds redundancy for ` +
      `${criticalFailure.name}'s function without removing another ` +
      `${weakest.name} core member.`
    );
  }

  return (
    `Test one additional producer or payoff for ${weakest.name}, ` +
    "then rerun the same deterministic gates."
  );
}


// =============================================================================
// Public API
// =============================================================================

export function buildForgeSystemsReport(
  graph,
  options = {},
) {
  const context =
    createAnalysisContext(
      graph,
      options,
    );

  const systems =
    context.graph.packages
      .map((group) =>
        createSystem(
          context,
          group,
        ),
      )
      .filter(
        (system) =>
          system.members.length >=
          SYSTEM_LIMITS
            .minimumMembers,
      )
      .sort(
        compareSystemStrength,
      );

  const strongestSystem =
    systems[0] || null;

  const weakestSystem =
    [...systems].sort(
      compareSystemWeakness,
    )[0] || null;

  const bridgeCards =
    identifyBridgeCards(
      context,
      systems,
    );

  const systemCoverage =
    calculateSystemCoverage(
      context,
      systems,
    );

  const confidence =
    describeReportConfidence(
      systems,
      systemCoverage,
    );

  return {
    systems,
    strongestSystem,
    weakestSystem,
    bridgeCards,
    isolatedCards:
      context.graph.isolated,
    conflicts:
      context.graph.nonbos,
    systemCoverage,
    graphCoverage:
      context.graph.coverage,
    confidence,
    methodology:
      EVIDENCE_TEXT.methodology,
  };
}

export function buildBoundedFailureAnalysis(
  systemsReport,
  simulationDossier = null,
) {
  if (
    !systemsReport
      ?.systems
      ?.length
  ) {
    return {
      status:
        "insufficient-structure",
      headline:
        "The Forge does not yet have enough connected card text to isolate a system pressure point.",
      chain: [],
      nextTest:
        "Resolve the remaining card records and collect classified match signals before changing the deck.",
      evidence:
        EVIDENCE_TEXT.insufficient,
    };
  }

  const weakest =
    systemsReport.weakestSystem;

  const {
    chain,
    criticalFailure,
  } = createFailureChain(
    weakest,
    simulationDossier,
  );

  const nextTest =
    createFailureNextTest(
      weakest,
      criticalFailure,
    );

  return {
    status:
      "bounded-hypothesis",
    headline:
      `${weakest.name} is the clearest current structural pressure point.`,
    chain,
    nextTest,
    evidence:
      EVIDENCE_TEXT.failure,
  };
}