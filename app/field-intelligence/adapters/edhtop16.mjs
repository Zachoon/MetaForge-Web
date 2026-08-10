// =============================================================================
// Field Intelligence — EDHTop16 corroboration adapter
// =============================================================================
// Safe: GraphQL API at https://edhtop16.com/api/graphql (when schema allows)
// Unsafe / out of scope: scraping fragile presentation HTML
// Role: corroborating competitive meta — NOT primary decklist ingest
// =============================================================================

import { liveFetch } from "../live-http.mjs";

const freeze = (value) => Object.freeze(value);

export const EDHTOP16_ATTRIBUTION = Object.freeze({
  name: "EDHTop16",
  url: "https://edhtop16.com",
  graphql: "https://edhtop16.com/api/graphql",
  required: true,
});

export const EDHTOP16_CONSUMPTION = Object.freeze({
  canSafelyConsume: freeze([
    "GraphQL API when queries validate against the live schema",
    "Commander-level tournament conversion / entry aggregates",
    "Corroboration of which commanders appear in competitive events",
  ]),
  cannotSafelyConsume: freeze([
    "Fragile presentation HTML scraping",
    "Undocumented private endpoints",
    "Assuming a stable REST /req contract without schema confirmation",
  ]),
  role: "corroborating_competitive_evidence",
  notPrimaryDecklistSource: true,
  note: "EDHTop16 aggregates competitive EDH data and exposes GraphQL. Schema fields evolve; soft-fail on GraphQL errors and never scrape HTML as a fallback.",
});

// Intentionally minimal / exploratory — fields may  not match live schema.
const COMMANDER_PROBE_QUERY = `
query CommanderProbe($first: Int) {
  commanders(first: $first) {
    nodes {
      name
    }
  }
}
`;

/**
 * Soft corroboration query. Failures are non-fatal and never fall back to HTML.
 */
export async function fetchEdhTop16CommanderStats(options = {}) {
  const url = options.url || EDHTOP16_ATTRIBUTION.graphql;
  const query = options.query || COMMANDER_PROBE_QUERY;
  const variables = options.variables || { first: options.first ?? 20 };

  try {
    const response = await liveFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    }, {
      fetchImpl: options.fetchImpl,
      minIntervalMs: options.minIntervalMs ?? 800,
      maxRetries: options.maxRetries ?? 2,
    });

    if (!response.ok) {
      return freeze({
        ok: false,
        status: "http_error",
        reason: `http_${response.status}`,
        actionable: freeze({
          summary: "EDHTop16 GraphQL HTTP failure. Do not scrape HTML; retry or inspect GraphiQL schema.",
          graphql: EDHTOP16_ATTRIBUTION.graphql,
          consumption: EDHTOP16_CONSUMPTION,
        }),
        commanders: freeze([]),
        attribution: EDHTOP16_ATTRIBUTION,
        consumption: EDHTOP16_CONSUMPTION,
      });
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      return freeze({
        ok: false,
        status: "schema_or_query_mismatch",
        reason: "graphql_errors",
        errors: freeze(payload.errors.map((e) => e.message || null)),
        actionable: freeze({
          summary: "EDHTop16 GraphQL rejected the probe query. Inspect https://edhtop16.com/api/graphql schema before expanding fields. Do not scrape HTML.",
          graphql: EDHTOP16_ATTRIBUTION.graphql,
          consumption: EDHTOP16_CONSUMPTION,
        }),
        commanders: freeze([]),
        attribution: EDHTOP16_ATTRIBUTION,
        consumption: EDHTOP16_CONSUMPTION,
      });
    }

    const nodes = payload.data?.commanders?.nodes
      || payload.data?.commanders
      || [];
    return freeze({
      ok: true,
      status: "ok",
      reason: null,
      actionable: null,
      commanders: freeze(nodes),
      attribution: EDHTOP16_ATTRIBUTION,
      consumption: EDHTOP16_CONSUMPTION,
    });
  } catch (error) {
    return freeze({
      ok: false,
      status: "network_error",
      reason: error.message || "fetch_failed",
      actionable: freeze({
        summary: "Network failure reaching EDHTop16 GraphQL. Soft-skip corroboration; never scrape HTML.",
        consumption: EDHTOP16_CONSUMPTION,
      }),
      commanders: freeze([]),
      attribution: EDHTOP16_ATTRIBUTION,
      consumption: EDHTOP16_CONSUMPTION,
    });
  }
}

export function normalizeEdhTop16Corroboration(commanders = []) {
  return freeze({
    source: "edhtop16",
    kind: "commander_conversion_corroboration",
    entries: freeze(commanders.map((row) => freeze({
      commander: row.name,
      entries: Number(row.entries) || null,
      topCuts: Number(row.topCuts) || null,
      wins: Number(row.wins) || null,
      conversionRate: Number(row.conversionRate ?? row.topCutConversion) || null,
      claim: "observed_among_tournament_performers",
    }))),
    attribution: EDHTOP16_ATTRIBUTION,
    consumption: EDHTOP16_CONSUMPTION,
  });
}
