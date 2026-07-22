// =============================================================================
// Forge Recommendation Ledger
// =============================================================================
//
// Creates deterministic, inspectable records of MetaForge recommendations.
//
// Phase One deliberately owns the recommendation contract, identity,
// comparison, and history lookup behavior. It does not claim durable storage.
// Records can later be persisted by a database, account service, or local
// workspace without changing the recommendation format.
// =============================================================================


const LEDGER_VERSION =
  "metaforge-recommendation-ledger-v1";


function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}


function normalizedText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim();
}


function normalizedKey(value) {
  return normalizedText(value)
    .toLocaleLowerCase("en");
}


function finiteNumber(
  value,
  fallback = 0,
) {
  const numeric =
    Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : fallback;
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

  for (
    const child of Object.values(value)
  ) {
    deepFreeze(child);
  }

  return value;
}


function stableSerialize(value) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(",")}]`;
  }

  if (typeof value === "object") {
    const entries =
      Object.entries(value)
        .filter(
          ([, child]) =>
            child !== undefined,
        )
        .sort(
          ([left], [right]) =>
            left.localeCompare(right),
        );

    return `{${entries
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${stableSerialize(child)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}


function stableHash(value) {
  const source =
    stableSerialize(value);

  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    const code =
      source.charCodeAt(index);

    first ^= code;
    first = Math.imul(
      first,
      0x01000193,
    );

    second ^= (
      code +
      index +
      (first >>> 16)
    );

    second = Math.imul(
      second,
      0x85ebca6b,
    );
  }

  return [
    first >>> 0,
    second >>> 0,
  ]
    .map(
      (part) =>
        part
          .toString(16)
          .padStart(8, "0"),
    )
    .join("");
}


function normalizeDeckRows(rows) {
  const merged =
    new Map();

  for (
    const rawRow of safeArray(rows)
  ) {
    const source =
      safeObject(rawRow);

    const name =
      normalizedText(source.name);

    if (!name) {
      continue;
    }

    const key =
      normalizedKey(name);

    const quantity =
      Math.max(
        1,
        Math.trunc(
          finiteNumber(
            source.quantity,
            1,
          ),
        ),
      );

    const current =
      merged.get(key);

    if (current) {
      current.quantity +=
        quantity;

      continue;
    }

    merged.set(
      key,
      {
        name,
        quantity,
        roles:
          safeArray(source.roles)
            .map(normalizedText)
            .filter(Boolean)
            .sort(),
      },
    );
  }

  return [
    ...merged.values(),
  ]
    .sort(
      (left, right) =>
        normalizedKey(left.name)
          .localeCompare(
            normalizedKey(
              right.name,
            ),
          ),
    );
}


function normalizeAlternatives(
  alternatives,
) {
  return safeArray(alternatives)
    .map((rawAlternative) => {
      const alternative =
        safeObject(
          rawAlternative,
        );

      return {
        id:
          normalizedText(
            alternative.id,
          ),
        label:
          normalizedText(
            alternative.label,
          ),
        score:
          finiteNumber(
            alternative.score,
            0,
          ),
        tournamentScore:
          finiteNumber(
            alternative
              .tournamentScore,
            0,
          ),
        reason:
          normalizedText(
            alternative.reason,
          ),
      };
    })
    .filter(
      (alternative) =>
        alternative.id ||
        alternative.label,
    )
    .sort(
      (left, right) =>
        right.tournamentScore -
          left.tournamentScore ||
        right.score -
          left.score ||
        left.id.localeCompare(
          right.id,
        ),
    );
}


function normalizeRecommendation(
  recommendation,
) {
  const source =
    safeObject(recommendation);

  return {
    candidateId:
      normalizedText(
        source.candidateId,
      ),
    label:
      normalizedText(
        source.label,
      ),
    score:
      finiteNumber(
        source.score,
        0,
      ),
    tournamentScore:
      finiteNumber(
        source.tournamentScore,
        0,
      ),
    reason:
      normalizedText(
        source.reason,
      ),
  };
}


function structuralSummary(
  structuralAnalysis,
) {
  const source =
    safeObject(
      structuralAnalysis,
    );

  const graph =
    safeObject(source.graph);

  const systems =
    safeObject(source.systems);

  const causality =
    safeObject(source.causality);

  return {
    engine:
      normalizedText(
        source.engine,
      ),
    status:
      normalizedText(
        source.status,
      ),
    cardCount:
      finiteNumber(
        source.cardCount,
        0,
      ),
    uniqueCardCount:
      finiteNumber(
        source.uniqueCardCount,
        0,
      ),
    graph: {
      nodes:
        safeArray(
          graph.nodes,
        ).length,
      edges:
        safeArray(
          graph.edges,
        ).length,
      packages:
        safeArray(
          graph.packages,
        ).length,
      isolated:
        safeArray(
          graph.isolated,
        ).length,
    },
    systems: {
      detected:
        safeArray(
          systems.systems,
        ).length,
      coverage:
        finiteNumber(
          systems.systemCoverage,
          0,
        ),
      bridgeCards:
        safeArray(
          systems.bridgeCards,
        ).length,
    },
    causality: {
      status:
        normalizedText(
          causality.status,
        ),
      criticalNodes:
        safeArray(
          causality.criticalNodes,
        ).length,
      highestValueUpgrade:
        causality
          .highestValueUpgrade
          ? {
              systemName:
                normalizedText(
                  causality
                    .highestValueUpgrade
                    .systemName,
                ),
              recommendation:
                normalizedText(
                  causality
                    .highestValueUpgrade
                    .recommendation,
                ),
            }
          : null,
    },
  };
}


function reasoningSummary(reasoning) {
  const source =
    safeObject(reasoning);

  return {
    summary:
      normalizedText(
        source.summary,
      ),
    boundary:
      normalizedText(
        source.boundary,
      ),
    selectedReason:
      normalizedText(
        source.selectedReason,
      ),
    tradeoff:
      normalizedText(
        source.tradeoff,
      ),
  };
}


function blueprintSummary(
  blueprintIntent,
) {
  const source =
    safeObject(
      blueprintIntent,
    );

  return {
    promises:
      safeArray(
        source.promises,
      )
        .map(normalizedText)
        .filter(Boolean),
    tribalTypes:
      safeArray(
        source.tribalTypes,
      )
        .map(normalizedText)
        .filter(Boolean),
    desiredRoles:
      safeArray(
        source.desiredRoles,
      )
        .map(normalizedText)
        .filter(Boolean),
  };
}


export function createForgeDeckFingerprint(
  rows,
  options = {},
) {
  const normalizedOptions =
    safeObject(options);

  const deck =
    normalizeDeckRows(rows);

  const identity = {
    format:
      normalizedText(
        normalizedOptions.format,
      ),
    commanderName:
      normalizedText(
        normalizedOptions
          .commanderName,
      ),
    cards:
      deck.map(
        ({ name, quantity }) => ({
          name:
            normalizedKey(name),
          quantity,
        }),
      ),
  };

  return (
    "deck-" +
    stableHash(identity)
  );
}


export function createForgeRecommendationRecord(
  input = {},
) {
  const source =
    safeObject(input);

  const deck =
    normalizeDeckRows(
      source.deckRows,
    );

  const format =
    normalizedText(
      source.format,
    );

  const commanderName =
    normalizedText(
      source.commanderName,
    );

  const deckFingerprint =
    createForgeDeckFingerprint(
      deck,
      {
        format,
        commanderName,
      },
    );

  const recommendation =
    normalizeRecommendation(
      source.recommendation,
    );

  const alternatives =
    normalizeAlternatives(
      source.alternatives,
    );

  const structural =
    structuralSummary(
      source.structuralAnalysis,
    );

  const reasoning =
    reasoningSummary(
      source.reasoning,
    );

  const blueprint =
    blueprintSummary(
      source.blueprintIntent,
    );

  const identityPayload = {
    ledgerVersion:
      LEDGER_VERSION,
    engineVersion:
      normalizedText(
        source.engineVersion,
      ),
    deckFingerprint,
    format,
    strategy:
      normalizedText(
        source.strategy,
      ),
    commanderName,
    recommendation,
    alternatives,
    structural,
    reasoning,
    blueprint,
  };

  const recommendationId =
    "recommendation-" +
    stableHash(identityPayload);

  const record = {
    ledger:
      LEDGER_VERSION,
    recommendationId,
    deckFingerprint,
    engineVersion:
      normalizedText(
        source.engineVersion,
      ),
    createdAt:
      source.createdAt
        ? normalizedText(
            source.createdAt,
          )
        : null,
    format,
    strategy:
      normalizedText(
        source.strategy,
      ),
    commanderName,
    deck,
    recommendation,
    alternatives,
    reasoning,
    blueprint,
    structural,
    playerDecision: {
      status: "unreviewed",
      decidedAt: null,
      note: "",
    },
    outcome: {
      status: "not-measured",
      measuredAt: null,
      evidence: [],
    },
    boundary:
      "This ledger record preserves what MetaForge recommended and why. It does not prove that the recommendation improved real-game performance.",
  };

  return deepFreeze(record);
}


export function findPriorForgeRecommendations(
  records,
  reference,
) {
  const source =
    safeObject(reference);

  const fingerprint =
    normalizedText(
      source.deckFingerprint ||
      (
        source.deckRows
          ? createForgeDeckFingerprint(
              source.deckRows,
              {
                format:
                  source.format,
                commanderName:
                  source.commanderName,
              },
            )
          : ""
      ),
    );

  if (!fingerprint) {
    return [];
  }

  return safeArray(records)
    .filter(
      (record) =>
        normalizedText(
          record?.deckFingerprint,
        ) === fingerprint,
    )
    .sort(
      (left, right) => {
        const leftDate =
          normalizedText(
            left?.createdAt,
          );

        const rightDate =
          normalizedText(
            right?.createdAt,
          );

        return (
          rightDate.localeCompare(
            leftDate,
          ) ||
          normalizedText(
            right
              ?.recommendationId,
          ).localeCompare(
            normalizedText(
              left
                ?.recommendationId,
            ),
          )
        );
      },
    );
}


function rowMap(rows) {
  return new Map(
    normalizeDeckRows(rows)
      .map(
        (row) => [
          normalizedKey(
            row.name,
          ),
          row,
        ],
      ),
  );
}


export function compareForgeRecommendationRecords(
  previousRecord,
  currentRecord,
) {
  const previous =
    safeObject(
      previousRecord,
    );

  const current =
    safeObject(
      currentRecord,
    );

  const previousRows =
    rowMap(previous.deck);

  const currentRows =
    rowMap(current.deck);

  const names =
    [
      ...new Set([
        ...previousRows.keys(),
        ...currentRows.keys(),
      ]),
    ]
      .sort();

  const added = [];
  const removed = [];
  const quantityChanges = [];

  for (const key of names) {
    const before =
      previousRows.get(key);

    const after =
      currentRows.get(key);

    if (!before && after) {
      added.push({
        name:
          after.name,
        quantity:
          after.quantity,
      });

      continue;
    }

    if (before && !after) {
      removed.push({
        name:
          before.name,
        quantity:
          before.quantity,
      });

      continue;
    }

    if (
      before.quantity !==
      after.quantity
    ) {
      quantityChanges.push({
        name:
          after.name,
        before:
          before.quantity,
        after:
          after.quantity,
        delta:
          after.quantity -
          before.quantity,
      });
    }
  }

  const sameDeck =
    added.length === 0 &&
    removed.length === 0 &&
    quantityChanges.length === 0;

  const sameRecommendation =
    normalizedText(
      previous
        .recommendationId,
    ) ===
    normalizedText(
      current
        .recommendationId,
    );

  const comparison = {
    status:
      sameRecommendation
        ? "same-recommendation"
        : sameDeck
          ? "same-deck-new-recommendation"
          : "deck-changed",
    previousRecommendationId:
      normalizedText(
        previous
          .recommendationId,
      ),
    currentRecommendationId:
      normalizedText(
        current
          .recommendationId,
      ),
    previousDeckFingerprint:
      normalizedText(
        previous
          .deckFingerprint,
      ),
    currentDeckFingerprint:
      normalizedText(
        current
          .deckFingerprint,
      ),
    sameDeck,
    sameRecommendation,
    added,
    removed,
    quantityChanges,
    structuralChange: {
      previousSystems:
        finiteNumber(
          previous
            .structural
            ?.systems
            ?.detected,
          0,
        ),
      currentSystems:
        finiteNumber(
          current
            .structural
            ?.systems
            ?.detected,
          0,
        ),
      previousCriticalNodes:
        finiteNumber(
          previous
            .structural
            ?.causality
            ?.criticalNodes,
          0,
        ),
      currentCriticalNodes:
        finiteNumber(
          current
            .structural
            ?.causality
            ?.criticalNodes,
          0,
        ),
    },
    boundary:
      "This comparison reports observable recommendation and deck changes. It does not attribute match outcomes to those changes.",
  };

  return deepFreeze(
    comparison,
  );
}
