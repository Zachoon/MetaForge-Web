// =============================================================================
// Context-preserving card inspection — Founder Issue #021
// =============================================================================
// Presentation only. Deep Forge card clicks must not update an off-screen pane
// without local feedback. Why-it-matters lines are derived from existing
// structural report fields — not new Brain facts.
// =============================================================================

const freeze = (value) => Object.freeze(value);

/**
 * Every named surface that must route card names through context inspection.
 * Inventory gate for Era 3 / Founder #021 — partial coverage ≠ done.
 */
export const ERA3_CARD_INSPECT_SURFACES = freeze([
  "system-core",
  "system-support",
  "system-producers",
  "system-payoffs",
  "bridge-card",
  "causality-critical",
  "causality-amplifier",
  "causality-bottleneck",
  "graph-package",
  "graph-edge",
  "graph-nonbo",
  "graph-amplifier",
  "graph-isolated",
  "gallery-companion",
  "dossier-connection",
  "pre-choice-diff",
  "mana-risky",
  "coach-fix-first",
  "experiment-tablet",
]);

/**
 * Short "why this card?" lines from systems / bridge evidence already on the report.
 */
export function reasonsCardMatters(cardName = "", systemsReport = null) {
  const name = String(cardName || "").trim();
  if (!name || !systemsReport) return freeze([]);

  const reasons = [];
  const bridge = (systemsReport.bridgeCards || []).find(
    (entry) => String(entry?.name || "") === name,
  );
  if (bridge?.systems?.length) {
    reasons.push(`Bridge across ${bridge.systems.join(" · ")}`);
  }

  for (const system of systemsReport.systems || []) {
    const members = [
      ...(system.members || []),
      ...(system.core || []),
      ...(system.support || []),
      ...(system.producers || []),
      ...(system.payoffs || []),
    ]
      .map((entry) => (typeof entry === "string" ? entry : entry?.name))
      .filter(Boolean);
    if (members.includes(name) && system.name) {
      reasons.push(system.name);
    }
  }

  const unique = [...new Set(reasons)];
  if (
    systemsReport.strongestSystem?.name &&
    unique.includes(systemsReport.strongestSystem.name)
  ) {
    const strongest = systemsReport.strongestSystem.name;
    const bridgeLine = unique.find((line) => line.startsWith("Bridge"));
    const rest = unique.filter(
      (line) => line !== strongest && !line.startsWith("Bridge"),
    );
    return freeze([strongest, bridgeLine, ...rest].filter(Boolean).slice(0, 5));
  }

  return freeze(unique.slice(0, 5));
}
