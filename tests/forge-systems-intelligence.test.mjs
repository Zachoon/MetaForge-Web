import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBoundedFailureAnalysis,
  buildForgeSystemsReport,
} from "../app/forge-systems-intelligence.mjs";

const interactionGraph = {
  nodes: [
    {
      name: "Commander",
      typeLine: "Legendary Creature",
      quantity: 1,
      mechanics: {
        signals: [
          "artifacts",
          "tokens",
        ],
        produces: [
          "artifacts",
          "tokens",
        ],
        rewards: [],
      },
    },
    {
      name: "Foundry",
      typeLine: "Artifact",
      quantity: 1,
      mechanics: {
        signals: [
          "artifacts",
          "tokens",
        ],
        produces: [
          "tokens",
        ],
        rewards: [
          "artifacts",
        ],
      },
    },
    {
      name: "Payoff",
      typeLine: "Creature",
      quantity: 2,
      mechanics: {
        signals: [
          "artifacts",
        ],
        produces: [],
        rewards: [
          "artifacts",
        ],
      },
    },
    {
      name: "Bridge",
      typeLine: "Artifact Creature",
      quantity: 1,
      mechanics: {
        signals: [
          "artifacts",
          "tokens",
          "sacrifice",
        ],
        produces: [
          "tokens",
        ],
        rewards: [
          "artifacts",
          "tokens",
        ],
      },
    },
    {
      name: "Loose Card",
      typeLine: "Creature",
      quantity: 1,
      mechanics: {
        signals: [],
        produces: [],
        rewards: [],
      },
    },
    {
      name: "Island",
      typeLine: "Basic Land",
      quantity: 20,
      mechanics: {
        signals: [],
        produces: [],
        rewards: [],
      },
    },
  ],
  edges: [
    {
      from: "Commander",
      to: "Foundry",
      signals: [
        "artifacts",
        "tokens",
      ],
      strength: 88,
    },
    {
      from: "Commander",
      to: "Payoff",
      signals: [
        "artifacts",
      ],
      strength: 74,
    },
    {
      from: "Commander",
      to: "Bridge",
      signals: [
        "artifacts",
        "tokens",
      ],
      strength: 88,
    },
    {
      from: "Foundry",
      to: "Payoff",
      signals: [
        "artifacts",
      ],
      strength: 74,
    },
    {
      from: "Foundry",
      to: "Bridge",
      signals: [
        "artifacts",
        "tokens",
      ],
      strength: 88,
    },
    {
      from: "Payoff",
      to: "Bridge",
      signals: [
        "artifacts",
      ],
      strength: 74,
    },
  ],
  packages: [
    {
      signal: "artifacts",
      members: [
        "Commander",
        "Foundry",
        "Payoff",
        "Bridge",
      ],
    },
    {
      signal: "tokens",
      members: [
        "Commander",
        "Foundry",
        "Bridge",
      ],
    },
  ],
  isolated: [
    "Loose Card",
  ],
  nonbos: [],
  commanderLinks: [],
  coverage: 0.8,
  commanderName: "Commander",
};

test(
  "builds deterministic systems with core and support members",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    assert.equal(
      report.systems.length,
      2,
    );

    const artifactSystem =
      report.systems.find(
        (system) =>
          system.name ===
          "Artifact Engine",
      );

    assert.ok(artifactSystem);

    assert.ok(
      artifactSystem.core.includes(
        "Commander",
      ),
    );

    assert.ok(
      artifactSystem.producers.includes(
        "Commander",
      ),
    );

    assert.ok(
      artifactSystem.payoffs.includes(
        "Payoff",
      ),
    );

    assert.ok(
      artifactSystem.support.length >= 0,
    );
  },
);

test(
  "preserves explicit health dimensions",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    const system =
      report.strongestSystem;

    assert.ok(system);

    assert.ok(
      Number.isInteger(
        system.health.overall,
      ),
    );

    assert.ok(
      Number.isInteger(
        system.health.consistency,
      ),
    );

    assert.ok(
      Number.isInteger(
        system.health.resilience,
      ),
    );

    assert.ok(
      Number.isInteger(
        system.health.leverage,
      ),
    );

    assert.ok(
      Number.isInteger(
        system.health.cohesion,
      ),
    );

    assert.ok(
      Number.isInteger(
        system.health.dependencyRisk,
      ),
    );

    for (
      const value of Object.values(
        system.health,
      )
    ) {
      assert.ok(value >= 0);
      assert.ok(value <= 100);
    }
  },
);

test(
  "identifies cross-system bridge cards",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    const bridge =
      report.bridgeCards.find(
        (card) =>
          card.name === "Bridge",
      );

    assert.ok(bridge);

    assert.deepEqual(
      bridge.systems,
      [
        "Artifact Engine",
        "Token Engine",
      ],
    );

    assert.ok(
      bridge.score > 0,
    );
  },
);

test(
  "preserves isolated cards and measures nonland system coverage",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    assert.deepEqual(
      report.isolatedCards,
      [
        "Loose Card",
      ],
    );

    assert.equal(
      report.systemCoverage,
      4 / 5,
    );
  },
);

test(
  "records dependencies and redundancy inside each system",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    const artifactSystem =
      report.systems.find(
        (system) =>
          system.name ===
          "Artifact Engine",
      );

    assert.ok(artifactSystem);

    assert.ok(
      artifactSystem.dependencies.some(
        (dependency) =>
          dependency.name ===
          "Commander",
      ),
    );

    assert.equal(
      artifactSystem.redundancy
        .repeatedCards
        .includes("Payoff"),
      true,
    );

    assert.equal(
      artifactSystem.redundancy
        .producerVariety,
      1,
    );

    assert.equal(
      artifactSystem.redundancy
        .payoffVariety,
      3,
    );
  },
);

test(
  "produces a bounded failure hypothesis instead of a causal claim",
  () => {
    const report =
      buildForgeSystemsReport(
        interactionGraph,
      );

    const analysis =
      buildBoundedFailureAnalysis(
        report,
        {
          goldfish: {
            expert: {
              planRealizationRate:
                0.52,
            },
          },
          matrix: {
            weakest: {
              opponent: "Aggro",
            },
          },
        },
      );

    assert.equal(
      analysis.status,
      "bounded-hypothesis",
    );

    assert.match(
      analysis.evidence,
      /Forge Theory/i,
    );

    assert.ok(
      analysis.chain.some(
        (line) =>
          /Aggro/.test(line),
      ),
    );

    assert.ok(
      analysis.chain.some(
        (line) =>
          /below 60%/.test(line),
      ),
    );

    assert.doesNotMatch(
      analysis.headline,
      /proved|guaranteed|caused/i,
    );
  },
);

test(
  "refuses to invent failure analysis without connected systems",
  () => {
    const report =
      buildForgeSystemsReport({
        nodes: [],
        edges: [],
        packages: [],
        isolated: [],
        nonbos: [],
        coverage: 0,
      });

    const analysis =
      buildBoundedFailureAnalysis(
        report,
      );

    assert.equal(
      analysis.status,
      "insufficient-structure",
    );

    assert.deepEqual(
      analysis.chain,
      [],
    );

    assert.match(
      analysis.evidence,
      /Insufficient evidence/i,
    );
  },
);

test(
  "returns deterministic output for the same graph",
  () => {
    const first =
      buildForgeSystemsReport(
        interactionGraph,
      );

    const second =
      buildForgeSystemsReport(
        interactionGraph,
      );

    assert.deepEqual(
      first,
      second,
    );
  },
);