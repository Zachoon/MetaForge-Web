// =============================================================================
// Honest Coach v0.2 — stable analysis / recommendation IDs
// =============================================================================
// Product identifiers only. No PII. Deterministic where possible so feedback
// and telemetry can join without storing decklists.
// =============================================================================

const freeze = (value) => Object.freeze(value);

function normalizeToken(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function shortHash(input = "") {
  // FNV-1a 32-bit — deterministic, non-cryptographic, fine for product IDs.
  let hash = 0x811c9dc5;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable analysis/session identity for a forge generation.
 */
export function buildHonestCoachAnalysisId({
  generationId = "",
  commanderName = "",
  packageLabels = [],
  brainVersion = "brain_v1",
} = {}) {
  const packages = [...(packageLabels || [])].map(normalizeToken).filter(Boolean).sort().join("+");
  const material = [
    normalizeToken(generationId) || "nogeneration",
    normalizeToken(commanderName) || "nocommander",
    packages || "nopackage",
    normalizeToken(brainVersion) || "brain-v1",
  ].join("|");
  return freeze({
    analysisId: `hca-${shortHash(material)}`,
    generationId: generationId || null,
    commanderName: commanderName || null,
    inferredPlan: freeze([...(packageLabels || [])]),
    brainVersion: brainVersion || "brain_v1",
    materialFingerprint: shortHash(material),
  });
}

/**
 * Stable recommendation identity for a cut→add (or diagnostic-only) action.
 */
export function buildHonestCoachRecommendationId({
  analysisId = "",
  cut = "",
  add = "",
  diagnosticClass = "swap",
  reasonClass = "unspecified",
} = {}) {
  const material = [
    normalizeToken(analysisId) || "noanalysis",
    normalizeToken(diagnosticClass) || "swap",
    normalizeToken(reasonClass) || "unspecified",
    normalizeToken(cut) || "nocut",
    normalizeToken(add) || "noadd",
  ].join("|");
  return freeze({
    recommendationId: `hcr-${shortHash(material)}`,
    analysisId: analysisId || null,
    cut: cut || null,
    add: add || null,
    diagnosticClass: diagnosticClass || "swap",
    reasonClass: reasonClass || "unspecified",
  });
}

export function classifyRecommendationReason({ cutSlot = null, tablet = null } = {}) {
  if (cutSlot?.flags?.weaklyJustified) return "weak_slot";
  if (cutSlot?.flags?.redundant) return "redundant_package";
  if (cutSlot?.flags?.overSupported) return "over_supported_package";
  if (cutSlot?.flags?.rawPowerDominant) return "raw_power";
  if (cutSlot?.flags?.underSupportedAnchor) return "under_supported_anchor";
  if (tablet?.confident === false) return "speculative_flex";
  if (tablet?.matchupRelevant) return "matchup_counter";
  return "structural_swap";
}
