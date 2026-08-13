// =============================================================================
// Field Intelligence — Source health dashboard (observatory status)
// =============================================================================

const freeze = (value) => Object.freeze(value);

const STATUS_LABEL = Object.freeze({
  healthy: "SUCCESS",
  degraded: "PARTIAL / DEGRADED",
  missing_credentials: "MISSING KEY",
  schema_mismatch: "SCHEMA MISMATCH",
  network_error: "NETWORK ERROR",
  auth_failed: "AUTH FAILED",
  http_error: "HTTP ERROR",
  not_attempted: "NOT ATTEMPTED",
  error: "ERROR",
  unavailable: "UNAVAILABLE",
});

function mapCoverageToHealth(id, coverage = {}) {
  if (!coverage || coverage.attempted === false || coverage.reason === "not_attempted") {
    return freeze({
      id,
      status: "not_attempted",
      label: STATUS_LABEL.not_attempted,
      latencyMs: coverage.elapsedMs ?? null,
      coverageDecks: coverage.decks ?? 0,
      coverageEvents: coverage.tournaments ?? 0,
      lastSuccessAt: null,
      detail: coverage.reason || "not_attempted",
      ok: false,
    });
  }

  const rawStatus = coverage.status || (coverage.ok ? "ok" : "error");
  let status = "error";
  if (coverage.ok && (rawStatus === "ok" || rawStatus === "partial")) {
    status = rawStatus === "partial" ? "degraded" : "healthy";
  } else if (rawStatus === "needs_credentials" || coverage.reason === "missing_SPICERACK_API_KEY" || coverage.reason === "missing_TOPDECK_API_KEY") {
    status = "missing_credentials";
  } else if (rawStatus === "schema_or_query_mismatch" || rawStatus === "graphql_errors") {
    status = "schema_mismatch";
  } else if (rawStatus === "network_error") {
    status = "network_error";
  } else if (rawStatus === "auth_failed") {
    status = "auth_failed";
  } else if (rawStatus === "http_error") {
    status = "http_error";
  } else if (rawStatus === "partial") {
    status = "degraded";
  }

  return freeze({
    id,
    status,
    label: STATUS_LABEL[status] || STATUS_LABEL.error,
    latencyMs: coverage.elapsedMs ?? null,
    coverageDecks: coverage.decks ?? 0,
    coverageEvents: coverage.tournaments ?? 0,
    lastSuccessAt: coverage.ok ? (coverage.lastSuccessAt || new Date().toISOString()) : null,
    detail: coverage.reason || coverage.actionable?.summary || rawStatus,
    ok: Boolean(coverage.ok),
  });
}

/**
 * Build a compact observatory health dashboard from liveCoverage.
 */
export function buildSourceHealthDashboard(liveCoverage = {}, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const sources = freeze([
    mapCoverageToHealth("topdeck", liveCoverage.topdeck),
    mapCoverageToHealth("spicerack", liveCoverage.spicerack),
    mapCoverageToHealth("edhtop16", liveCoverage.edhtop16),
  ]);

  return freeze({
    version: "source-health-v1",
    generatedAt,
    sources,
    byId: freeze(Object.fromEntries(sources.map((s) => [s.id, s]))),
  });
}

export function provenanceSourceLabel(healthEntry) {
  if (!healthEntry) return "UNKNOWN";
  return healthEntry.label || STATUS_LABEL.error;
}

export { STATUS_LABEL };
