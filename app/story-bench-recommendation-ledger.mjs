import {
  compareForgeRecommendationRecords,
} from "./forge-recommendation-ledger.mjs";


function safeObject(
  value,
) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : {};
}


function normalizedText(
  value,
) {
  return String(
    value ?? "",
  ).trim();
}


function validRecommendationRecord(
  value,
) {
  const record =
    safeObject(value);

  return Boolean(
    normalizedText(
      record.recommendationId,
    ) &&
    normalizedText(
      record.deckFingerprint,
    ),
  );
}


function cloneSerializable(
  value,
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value),
  );
}


function freezeDeep(
  value,
  visited = new WeakSet(),
) {
  if (
    !value ||
    typeof value !== "object" ||
    visited.has(value)
  ) {
    return value;
  }

  visited.add(value);

  for (
    const child
    of Object.values(value)
  ) {
    freezeDeep(
      child,
      visited,
    );
  }

  return Object.freeze(
    value,
  );
}


export function normalizeStoryBenchRevision(
  input = {},
) {
  const source =
    safeObject(input);

  const recommendationRecord =
    validRecommendationRecord(
      source.recommendationRecord,
    )
      ? cloneSerializable(
          source.recommendationRecord,
        )
      : null;

  const comparisonToPrevious =
    source.comparisonToPrevious &&
    typeof source.comparisonToPrevious ===
      "object"
      ? cloneSerializable(
          source.comparisonToPrevious,
        )
      : null;

  const normalized = {
    deck:
      normalizedText(
        source.deck,
      ) ||
      normalizedText(
        source.deckText,
      ),

    note:
      normalizedText(
        source.note,
      ),

    createdAt:
      normalizedText(
        source.createdAt,
      ),

    recommendationRecord,

    comparisonToPrevious,
  };

  return freezeDeep(
    normalized,
  );
}


export function prepareStoryBenchRevisions(
  revisions = [],
) {
  const prepared = [];

  for (
    const candidate
    of Array.isArray(revisions)
      ? revisions
      : []
  ) {
    const normalized =
      normalizeStoryBenchRevision(
        candidate,
      );

    const previous =
      prepared.at(-1) || null;

    let comparisonToPrevious =
      normalized
        .comparisonToPrevious;

    if (
      !comparisonToPrevious &&
      previous
        ?.recommendationRecord &&
      normalized
        .recommendationRecord
    ) {
      comparisonToPrevious =
        compareForgeRecommendationRecords(
          previous
            .recommendationRecord,
          normalized
            .recommendationRecord,
        );
    }

    prepared.push({
      ...normalized,
      comparisonToPrevious:
        comparisonToPrevious
          ? cloneSerializable(
              comparisonToPrevious,
            )
          : null,
    });
  }

  return freezeDeep(
    prepared,
  );
}


export function serializeStoryBenchRevision(
  revision,
  context = {},
) {
  const normalized =
    normalizeStoryBenchRevision(
      revision,
    );

  const source =
    safeObject(context);

  const index =
    Number.isInteger(
      source.index,
    )
      ? source.index
      : 0;

  const record =
    safeObject(
      source.record,
    );

  const matches =
    Array.isArray(
      source.matches,
    )
      ? source.matches
      : [];

  const revisionCount =
    Number.isInteger(
      source.revisionCount,
    )
      ? source.revisionCount
      : index + 1;

  const serialized = {
    fingerprint:
      `story-${index + 1}-${normalized.createdAt}`,

    version:
      index + 1,

    source:
      index
        ? "forge"
        : "original",

    deckText:
      normalized.deck,

    note:
      normalized.note,

    createdAt:
      normalized.createdAt,

    evidence: {
      wins:
        Number(
          record.wins || 0,
        ),

      losses:
        Number(
          record.losses || 0,
        ),

      sampleSize:
        Number(
          record.wins || 0,
        ) +
        Number(
          record.losses || 0,
        ),

      confidence:
        Number(
          record.wins || 0,
        ) +
          Number(
            record.losses || 0,
          ) <
        3
          ? "early signal"
          : "developing",
    },

    matches:
      matches.filter(
        (match) =>
          Number(
            match?.revision ||
              revisionCount,
          ) ===
          index + 1,
      ),

    recommendationRecord:
      normalized
        .recommendationRecord,

    comparisonToPrevious:
      normalized
        .comparisonToPrevious,
  };

  return freezeDeep(
    serialized,
  );
}


export function restoreStoryBenchRevisions(
  revisions = [],
) {
  return prepareStoryBenchRevisions(
    (
      Array.isArray(revisions)
        ? revisions
        : []
    ).map(
      (revision) => ({
        deck:
          revision?.deckText ??
          revision?.deck ??
          "",

        note:
          revision?.note ??
          "",

        createdAt:
          revision?.createdAt ??
          "",

        recommendationRecord:
          revision
            ?.recommendationRecord ??
          null,

        comparisonToPrevious:
          revision
            ?.comparisonToPrevious ??
          null,
      }),
    ),
  );
}
