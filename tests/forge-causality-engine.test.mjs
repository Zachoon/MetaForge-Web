import assert from "node:assert/strict";
import test from "node:test";

import {
  buildForgeCausalityReport,
} from "../app/forge-causality-engine.mjs";

const graph = {
  nodes: [
    { name: "Spark Foundry" },
    { name: "Ember Smith" },
    { name: "Furnace Crown" },
    { name: "Archive Lens" },
    { name: "Lonely Blade" },
  ],
  edges: [
    {
      from: "Spark Foundry",
      to: "Ember Smith",
      signals: ["tokens"],
      strength: 84,
    },
    {
      from: "Spark Foundry",
      to: "Furnace Crown",
      signals: ["tokens"],
      strength: 76,
    },
    {
      from: "Ember Smith",
      to: "Furnace Crown",
      signals: ["tokens"],
      strength: 72,
    },
    {
      from: "Furnace Crown",
      to: "Archive Lens",
      signals: ["artifacts"],
      strength: 67,
    },
  ],
  packages: [],
  isolated: ["Lonely Blade"],
  nonbos: [],
  commanderLinks: [],
  coverage: 0.8,
  confidence: "HIGH Â· ORACLE-DERIVED",
  commanderName: "",
};

const systemsReport = {
  systems: [
    {
      id: "tokens",
      signal: "tokens",
      name: "Token Foundry",
      members: [
        "Spark Foundry",
        "Ember Smith",
        "Furnace Crown",
      ],
      core: [
        "Spark Foundry",
        "Furnace Crown",
      ],
      support: ["Ember Smith"],
      producers: [
        "Spark Foundry",
        "Ember Smith",
      ],
      payoffs: ["Furnace Crown"],
      dependencies: [],
      redundancy: {
        repeatedCards: 2,
        producerDepth: 3,
        payoffDepth: 1,
        producerVariety: 2,
        payoffVariety: 1,
        balanced: false,
      },
      criticalFailures: [
        {
          name: "Furnace Crown",
          lostConnections: 2,
          impact: 0.67,
          classification: "core dependency",
        },
      ],
      edges: graph.edges.slice(0, 3),
      health: {
        overall: 70,
        consistency: 68,
        resilience: 62,
        leverage: 78,
        cohesion: 84,
        dependencyRisk: 64,
      },
      confidence: "HIGH",
    },
    {
      id: "artifacts",
      signal: "artifacts",
      name: "Artifact Archive",
      members: [
        "Furnace Crown",
        "Archive Lens",
      ],
      core: ["Furnace Crown"],
      support: ["Archive Lens"],
      producers: ["Furnace Crown"],
      payoffs: ["Archive Lens"],
      dependencies: [],
      redundancy: {
        repeatedCards: 0,
        producerDepth: 1,
        payoffDepth: 1,
        producerVariety: 1,
        payoffVariety: 1,
        balanced: false,
      },
      criticalFailures: [
        {
          name: "Furnace Crown",
          lostConnections: 1,
          impact: 1,
          classification: "core dependency",
        },
      ],
      edges: [graph.edges[3]],
      health: {
        overall: 48,
        consistency: 42,
        resilience: 36,
        leverage: 64,
        cohesion: 72,
        dependencyRisk: 88,
      },
      confidence: "MEDIUM",
    },
  ],
  strongestSystem: null,
  weakestSystem: null,
  bridgeCards: [
    {
      name: "Furnace Crown",
      systems: [
        "Artifact Archive",
        "Token Foundry",
      ],
      signalCount: 2,
      graphDegree: 3,
      score: 88,
    },
  ],
  isolatedCards: ["Lonely Blade"],
  conflicts: [],
  systemCoverage: 0.8,
  graphCoverage: 0.8,
  confidence: "HIGH",
  methodology: "Fixture",
};

const simulation = {
  goldfish: {
    expert: {
      planRealizationRate: 0.74,
    },
  },
};

test(
  "returns deterministic output for the same structural model",
  () => {
    const first =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    const second =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    assert.deepEqual(first, second);
  },
);

test(
  "identifies a cross-system core card as a major structural node",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    const crown =
      report.systems
        .flatMap((system) => system.cards)
        .find(
          (card) =>
            card.name === "Furnace Crown" &&
            card.systems.length === 2,
        );

    assert.ok(crown);
    assert.equal(
      crown.primaryRole,
      "cross-system core",
    );
    assert.ok(crown.collapseRisk >= 55);
    assert.ok(crown.replacementDifficulty >= 65);
  },
);

test(
  "keeps isolated cards out of critical-node claims",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
      );

    assert.deepEqual(
      report.isolatedCards,
      ["Lonely Blade"],
    );

    assert.equal(
      report.criticalNodes.some(
        (card) =>
          card.name === "Lonely Blade",
      ),
      false,
    );
  },
);

test(
  "scores the redundant system above the fragile single-path system",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    const tokenSystem =
      report.systems.find(
        (system) =>
          system.id === "tokens",
      );

    const artifactSystem =
      report.systems.find(
        (system) =>
          system.id === "artifacts",
      );

    assert.ok(
      tokenSystem.structuralResilience >
        artifactSystem.structuralResilience,
    );

    assert.ok(
      artifactSystem.collapseRisk >
        tokenSystem.collapseRisk,
    );
  },
);

test(
  "uses simulation as bounded support rather than a win-rate claim",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    assert.equal(
      report.systems[0].planRealization,
      74,
    );

    assert.match(
      report.methodology,
      /do not prove real-game causation/i,
    );

    assert.doesNotMatch(
      report.headline,
      /win rate is/i,
    );
  },
);

test(
  "does not mutate graph, systems, or simulation inputs",
  () => {
    const graphBefore =
      structuredClone(graph);
    const systemsBefore =
      structuredClone(systemsReport);
    const simulationBefore =
      structuredClone(simulation);

    buildForgeCausalityReport(
      graph,
      systemsReport,
      simulation,
    );

    assert.deepEqual(
      graph,
      graphBefore,
    );

    assert.deepEqual(
      systemsReport,
      systemsBefore,
    );

    assert.deepEqual(
      simulation,
      simulationBefore,
    );
  },
);

test(
  "returns an immutable bounded report",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    assert.equal(
      Object.isFrozen(report),
      true,
    );

    assert.equal(
      Object.isFrozen(report.systems),
      true,
    );

    assert.equal(
      Object.isFrozen(report.systems[0].cards),
      true,
    );

    assert.equal(
      report.status,
      "bounded-structural-hypothesis",
    );
  },
);

test(
  "refuses to invent causality without detected systems",
  () => {
    const report =
      buildForgeCausalityReport(
        {
          nodes: [{ name: "Solo Card" }],
          edges: [],
          isolated: ["Solo Card"],
          coverage: 0,
        },
        {
          systems: [],
          bridgeCards: [],
          isolatedCards: ["Solo Card"],
          systemCoverage: 0,
          graphCoverage: 0,
        },
      );

    assert.equal(
      report.status,
      "insufficient-structure",
    );

    assert.deepEqual(
      report.criticalNodes,
      [],
    );

    assert.equal(
      report.highestValueUpgrade,
      null,
    );

    assert.match(
      report.evidence,
      /requires at least one detected/i,
    );
  },
);

test(
  "creates a controlled highest-value upgrade contract",
  () => {
    const report =
      buildForgeCausalityReport(
        graph,
        systemsReport,
        simulation,
      );

    assert.ok(
      report.highestValueUpgrade,
    );

    assert.equal(
      report.highestValueUpgrade.systemName,
      "Artifact Archive",
    );

    assert.match(
      report.highestValueUpgrade.recommendation,
      /test one additional card/i,
    );

    assert.match(
      report.highestValueUpgrade.contract,
      /change one slot/i,
    );
  },
);
