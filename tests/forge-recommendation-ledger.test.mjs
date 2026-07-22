import assert from "node:assert/strict";
import test from "node:test";

import {
  compareForgeRecommendationRecords,
  createForgeDeckFingerprint,
  createForgeRecommendationRecord,
  findPriorForgeRecommendations,
} from "../app/forge-recommendation-ledger.mjs";


const baseDeck = [
  {
    quantity: 1,
    name: "Foundry Sage",
    roles: ["commander"],
  },
  {
    quantity: 2,
    name: "Ember Fabricator",
    roles: ["tokens"],
  },
  {
    quantity: 36,
    name: "Island",
    roles: ["land"],
  },
];


const structuralAnalysis = {
  engine:
    "metaforge-structural-pipeline-v1",
  status:
    "structural-analysis-complete",
  cardCount: 39,
  uniqueCardCount: 3,
  graph: {
    nodes: [
      { name: "Foundry Sage" },
      { name: "Ember Fabricator" },
      { name: "Island" },
    ],
    edges: [
      {
        from: "Foundry Sage",
        to: "Ember Fabricator",
      },
    ],
    packages: [
      {
        signal: "tokens",
      },
    ],
    isolated: ["Island"],
  },
  systems: {
    systems: [
      {
        id: "tokens",
      },
    ],
    systemCoverage: 2 / 3,
    bridgeCards: [],
  },
  causality: {
    status:
      "bounded-structural-hypothesis",
    criticalNodes: [
      {
        name: "Foundry Sage",
      },
    ],
    highestValueUpgrade: {
      systemName:
        "Token Engine",
      recommendation:
        "Test one additional token payoff.",
    },
  },
};


function buildRecord(
  overrides = {},
) {
  return createForgeRecommendationRecord({
    engineVersion:
      "metaforge-native-masterwork-v6",
    format: "Commander",
    strategy:
      "Balanced midrange",
    commanderName:
      "Foundry Sage",
    deckRows: baseDeck,
    recommendation: {
      candidateId: "cohesion",
      label:
        "Synergy Temper",
      score: 81.5,
      tournamentScore: 84.2,
      reason:
        "Best bounded structural tradeoff.",
    },
    alternatives: [
      {
        id: "resilience",
        label:
          "Resilient Temper",
        score: 79.1,
        tournamentScore: 82.4,
        reason:
          "More resilient but less cohesive.",
      },
    ],
    reasoning: {
      summary:
        "The selected candidate preserves the strongest connected system.",
      boundary:
        "Real match performance remains unproven.",
    },
    blueprintIntent: {
      promises: [
        "artifact typal",
      ],
      tribalTypes: [
        "artifact",
      ],
      desiredRoles: [
        "tokens",
      ],
    },
    structuralAnalysis,
    ...overrides,
  });
}


test(
  "creates a deterministic deck fingerprint independent of row order",
  () => {
    const first =
      createForgeDeckFingerprint(
        baseDeck,
        {
          format: "Commander",
          commanderName:
            "Foundry Sage",
        },
      );

    const second =
      createForgeDeckFingerprint(
        [...baseDeck].reverse(),
        {
          format: "Commander",
          commanderName:
            "Foundry Sage",
        },
      );

    assert.equal(
      first,
      second,
    );

    assert.match(
      first,
      /^deck-[a-f0-9]{16}$/,
    );
  },
);


test(
  "creates the same recommendation ID for the same evidence",
  () => {
    const first =
      buildRecord();

    const second =
      buildRecord();

    assert.equal(
      first.recommendationId,
      second.recommendationId,
    );

    assert.equal(
      first.deckFingerprint,
      second.deckFingerprint,
    );

    assert.match(
      first.recommendationId,
      /^recommendation-[a-f0-9]{16}$/,
    );
  },
);


test(
  "preserves the selected recommendation, alternatives, and structural summary",
  () => {
    const record =
      buildRecord();

    assert.equal(
      record.recommendation
        .candidateId,
      "cohesion",
    );

    assert.equal(
      record.alternatives[0].id,
      "resilience",
    );

    assert.equal(
      record.structural
        .systems
        .detected,
      1,
    );

    assert.equal(
      record.structural
        .causality
        .criticalNodes,
      1,
    );

    assert.equal(
      record.playerDecision
        .status,
      "unreviewed",
    );

    assert.equal(
      record.outcome.status,
      "not-measured",
    );
  },
);


test(
  "does not mutate supplied deck records",
  () => {
    const before =
      structuredClone(
        baseDeck,
      );

    buildRecord();

    assert.deepEqual(
      baseDeck,
      before,
    );
  },
);


test(
  "deep-freezes the recommendation contract",
  () => {
    const record =
      buildRecord();

    assert.equal(
      Object.isFrozen(record),
      true,
    );

    assert.equal(
      Object.isFrozen(
        record.deck,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        record.structural,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        record.playerDecision,
      ),
      true,
    );
  },
);


test(
  "finds prior recommendations for the exact deck fingerprint",
  () => {
    const older =
      buildRecord({
        createdAt:
          "2026-07-20T12:00:00.000Z",
      });

    const newer =
      buildRecord({
        createdAt:
          "2026-07-21T12:00:00.000Z",
      });

    const unrelated =
      buildRecord({
        deckRows: [
          ...baseDeck,
          {
            quantity: 1,
            name:
              "Archive Crucible",
          },
        ],
      });

    const matches =
      findPriorForgeRecommendations(
        [
          older,
          unrelated,
          newer,
        ],
        {
          deckFingerprint:
            newer.deckFingerprint,
        },
      );

    assert.equal(
      matches.length,
      2,
    );

    assert.equal(
      matches[0].createdAt,
      "2026-07-21T12:00:00.000Z",
    );
  },
);


test(
  "compares exact deck changes without claiming an outcome",
  () => {
    const previous =
      buildRecord();

    const current =
      buildRecord({
        deckRows: [
          {
            quantity: 1,
            name:
              "Foundry Sage",
          },
          {
            quantity: 1,
            name:
              "Ember Fabricator",
          },
          {
            quantity: 1,
            name:
              "Archive Crucible",
          },
          {
            quantity: 36,
            name: "Island",
          },
        ],
      });

    const comparison =
      compareForgeRecommendationRecords(
        previous,
        current,
      );

    assert.equal(
      comparison.status,
      "deck-changed",
    );

    assert.deepEqual(
      comparison.added,
      [
        {
          name:
            "Archive Crucible",
          quantity: 1,
        },
      ],
    );

    assert.deepEqual(
      comparison.quantityChanges,
      [
        {
          name:
            "Ember Fabricator",
          before: 2,
          after: 1,
          delta: -1,
        },
      ],
    );

    assert.match(
      comparison.boundary,
      /does not attribute match outcomes/i,
    );
  },
);
