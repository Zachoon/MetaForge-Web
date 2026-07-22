// =============================================================================
// Forge Structural Pipeline
// =============================================================================
//
// Provides one shared integration seam for MetaForge engines that need to turn
// verified card records into:
//
//   1. an interaction graph,
//   2. a systems-intelligence report,
//   3. a bounded causality report.
//
// The underlying engines remain independently testable. This module owns only
// orchestration, normalization, and the stable result contract.
// =============================================================================

import {
  buildInteractionGraph,
} from "./forge-interaction-graph.mjs";

import {
  buildForgeSystemsReport,
} from "./forge-systems-intelligence.mjs";

import {
  buildForgeCausalityReport,
} from "./forge-causality-engine.mjs";


const PIPELINE_VERSION =
  "metaforge-structural-pipeline-v1";


function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


function safeObject(value) {
  return value &&
    typeof value === "object"
    ? value
    : {};
}


function normalizedName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en");
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


function normalizeCard(card) {
  const source = safeObject(card);

  return {
    ...source,
    name: String(source.name || "").trim(),
    typeLine: String(
      source.typeLine ||
      source.type_line ||
      "",
    ),
    oracleText: String(
      source.oracleText ||
      source.oracle_text ||
      "",
    ),
    quantity: Math.max(
      1,
      Number(source.quantity || 1),
    ),
    isCommander:
      source.isCommander === true,
  };
}


function normalizeCards(cards) {
  const normalized = [];
  const indexByName = new Map();

  for (const rawCard of safeArray(cards)) {
    const card = normalizeCard(rawCard);

    if (!card.name) {
      continue;
    }

    const key =
      normalizedName(card.name);

    const existingIndex =
      indexByName.get(key);

    if (existingIndex === undefined) {
      indexByName.set(
        key,
        normalized.length,
      );

      normalized.push(card);
      continue;
    }

    const existing =
      normalized[existingIndex];

    normalized[existingIndex] = {
      ...existing,
      ...card,
      quantity:
        existing.quantity +
        card.quantity,
      isCommander:
        existing.isCommander ||
        card.isCommander,
    };
  }

  return normalized;
}


function describePipelineStatus(
  graph,
  systems,
  causality,
) {
  if (!graph.nodes.length) {
    return "empty-card-set";
  }

  if (
    causality.status ===
    "insufficient-structure"
  ) {
    return "insufficient-structure";
  }

  if (!systems.systems.length) {
    return "graph-only";
  }

  return "structural-analysis-complete";
}


export function buildForgeStructuralAnalysis(
  cards,
  options = {},
) {
  const normalizedOptions =
    safeObject(options);

  const normalizedCards =
    normalizeCards(cards);

  const commanderName =
    String(
      normalizedOptions.commanderName ||
      normalizedCards.find(
        (card) => card.isCommander,
      )?.name ||
      "",
    );

  const graph =
    buildInteractionGraph(
      normalizedCards,
      {
        commanderName,
      },
    );

  const systems =
    buildForgeSystemsReport(
      graph,
      {
        commanderName,
      },
    );

  const causality =
    buildForgeCausalityReport(
      graph,
      systems,
      normalizedOptions
        .simulationDossier ||
        null,
    );

  const result = {
    engine: PIPELINE_VERSION,
    status:
      describePipelineStatus(
        graph,
        systems,
        causality,
      ),
    commanderName,
    cardCount:
      normalizedCards.reduce(
        (total, card) =>
          total + card.quantity,
        0,
      ),
    uniqueCardCount:
      normalizedCards.length,
    graph,
    systems,
    causality,
    methodology:
      "MetaForge converts verified card text into an interaction graph, interprets repeatable systems, and then forms bounded structural-impact hypotheses. These results do not prove real-game causation or predict match outcomes.",
  };

  return deepFreeze(result);
}