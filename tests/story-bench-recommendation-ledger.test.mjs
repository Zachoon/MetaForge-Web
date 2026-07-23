import assert from "node:assert/strict";
import test from "node:test";

import {
  createForgeRecommendationRecord,
} from "../app/forge-recommendation-ledger.mjs";

import {
  normalizeStoryBenchRevision,
  prepareStoryBenchRevisions,
  restoreStoryBenchRevisions,
  serializeStoryBenchRevision,
} from "../app/story-bench-recommendation-ledger.mjs";


function recommendation(
  deckRows,
  candidateId,
) {
  return createForgeRecommendationRecord({
    engineVersion:
      "metaforge-native-masterwork-v6",

    format:
      "Commander",

    strategy:
      "Balanced midrange",

    commanderName:
      "Foundry Sage",

    deckRows,

    recommendation: {
      candidateId,
      label:
        "Synergy Temper",
      score: 82,
      tournamentScore: 84,
      reason:
        "Best bounded structural tradeoff.",
    },

    alternatives: [],

    structuralAnalysis: {
      status:
        "structural-analysis-complete",
      systems: {
        systems: [],
      },
    },

    blueprintIntent: {
      requested: [
        "artifact tokens",
      ],
    },
  });
}


const firstRecord =
  recommendation(
    [
      {
        quantity: 1,
        name: "Foundry Sage",
      },
      {
        quantity: 2,
        name: "Ember Fabricator",
      },
      {
        quantity: 36,
        name: "Island",
      },
    ],
    "cohesion",
  );


const secondRecord =
  recommendation(
    [
      {
        quantity: 1,
        name: "Foundry Sage",
      },
      {
        quantity: 1,
        name: "Ember Fabricator",
      },
      {
        quantity: 1,
        name: "Archive Crucible",
      },
      {
        quantity: 36,
        name: "Island",
      },
    ],
    "resilience",
  );


test(
  "normalizes legacy Story Bench revisions without inventing ledger evidence",
  () => {
    const restored =
      normalizeStoryBenchRevision({
        deckText:
          "1 Foundry Sage",
        note:
          "Legacy preserved work",
        createdAt:
          "2026-07-01T00:00:00.000Z",
      });

    assert.equal(
      restored.deck,
      "1 Foundry Sage",
    );

    assert.equal(
      restored.recommendationRecord,
      null,
    );

    assert.equal(
      restored.comparisonToPrevious,
      null,
    );
  },
);


test(
  "preserves a recommendation record with its exact Story Bench revision",
  () => {
    const prepared =
      prepareStoryBenchRevisions([
        {
          deck:
            "1 Foundry Sage",
          note:
            "Original native candidate",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
      ]);

    assert.equal(
      prepared[0]
        .recommendationRecord
        .recommendationId,
      firstRecord
        .recommendationId,
    );

    assert.equal(
      prepared[0]
        .comparisonToPrevious,
      null,
    );
  },
);


test(
  "creates a bounded comparison only when consecutive revisions have records",
  () => {
    const prepared =
      prepareStoryBenchRevisions([
        {
          deck:
            "1 Foundry Sage",
          note:
            "First native candidate",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
        {
          deck:
            "1 Foundry Sage\n1 Archive Crucible",
          note:
            "Second native candidate",
          createdAt:
            "2026-07-21T00:00:00.000Z",
          recommendationRecord:
            secondRecord,
        },
      ]);

    assert.equal(
      prepared[1]
        .comparisonToPrevious
        .status,
      "deck-changed",
    );

    assert.deepEqual(
      prepared[1]
        .comparisonToPrevious
        .added,
      [
        {
          name:
            "Archive Crucible",
          quantity: 1,
        },
      ],
    );
  },
);


test(
  "does not claim a comparison when a refinement has no new engine record",
  () => {
    const prepared =
      prepareStoryBenchRevisions([
        {
          deck:
            "1 Foundry Sage",
          note:
            "Native candidate",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
        {
          deck:
            "1 Foundry Sage\n1 Manual Change",
          note:
            "Player refinement",
          createdAt:
            "2026-07-21T00:00:00.000Z",
        },
      ]);

    assert.equal(
      prepared[1]
        .recommendationRecord,
      null,
    );

    assert.equal(
      prepared[1]
        .comparisonToPrevious,
      null,
    );
  },
);


test(
  "serializes recommendation evidence into the persisted family revision",
  () => {
    const prepared =
      prepareStoryBenchRevisions([
        {
          deck:
            "1 Foundry Sage",
          note:
            "Original native candidate",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
      ]);

    const serialized =
      serializeStoryBenchRevision(
        prepared[0],
        {
          index: 0,
          revisionCount: 1,
          record: {
            wins: 2,
            losses: 1,
          },
          matches: [
            {
              id: "match-1",
              revision: 1,
              result: "win",
            },
          ],
        },
      );

    assert.equal(
      serialized
        .recommendationRecord
        .recommendationId,
      firstRecord
        .recommendationId,
    );

    assert.equal(
      serialized
        .evidence
        .sampleSize,
      3,
    );

    assert.equal(
      serialized.matches.length,
      1,
    );
  },
);


test(
  "restores modern and legacy family revisions through the same contract",
  () => {
    const restored =
      restoreStoryBenchRevisions([
        {
          deckText:
            "1 Legacy Card",
          note:
            "Old revision",
          createdAt:
            "2026-06-01T00:00:00.000Z",
        },
        {
          deckText:
            "1 Foundry Sage",
          note:
            "Native revision",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
      ]);

    assert.equal(
      restored.length,
      2,
    );

    assert.equal(
      restored[0]
        .recommendationRecord,
      null,
    );

    assert.equal(
      restored[1]
        .recommendationRecord
        .recommendationId,
      firstRecord
        .recommendationId,
    );
  },
);


test(
  "does not mutate supplied revision or recommendation objects",
  () => {
    const source = {
      deck:
        "1 Foundry Sage",
      note:
        "Immutable source",
      createdAt:
        "2026-07-20T00:00:00.000Z",
      recommendationRecord:
        firstRecord,
    };

    const before =
      JSON.stringify(source);

    prepareStoryBenchRevisions([
      source,
    ]);

    assert.equal(
      JSON.stringify(source),
      before,
    );
  },
);


test(
  "deep-freezes prepared Story Bench ledger contracts",
  () => {
    const prepared =
      prepareStoryBenchRevisions([
        {
          deck:
            "1 Foundry Sage",
          note:
            "Frozen revision",
          createdAt:
            "2026-07-20T00:00:00.000Z",
          recommendationRecord:
            firstRecord,
        },
      ]);

    assert.equal(
      Object.isFrozen(prepared),
      true,
    );

    assert.equal(
      Object.isFrozen(
        prepared[0],
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        prepared[0]
          .recommendationRecord,
      ),
      true,
    );
  },
);
