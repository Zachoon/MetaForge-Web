// =============================================================================
// Deck Understanding Reliability — Product Sprint Alpha A4
// =============================================================================
// Product Loop only. Does not change Brain construction.
// Principle: Unknown is not absent.
// =============================================================================

const freeze = (value) => Object.freeze(value);

export const RESOLUTION_REASON_CODES = freeze([
  "resolved",
  "resolved_via_flavor_name",
  "resolved_via_fuzzy",
  "resolved_via_face_name",
  "basic_land",
  "name_parse_failure",
  "card_not_real",
  "upstream_lookup_failure",
  "illegal_format",
  "ambiguous_name",
]);

export const COACH_RELIABILITY_STATES = freeze([
  "complete",
  "mostly_complete",
  "limited",
  "insufficient",
]);

/**
 * Build deterministic deck-understanding completeness for an import.
 */
export function buildDeckUnderstanding({
  submittedNames = [],
  resolvedNames = [],
  unresolved = [],
  illegal = [],
  commanderName = "",
  commanderResolved = true,
  oracleAvailableCount = null,
  structuralEligibleCount = null,
  resolutions = [],
} = {}) {
  const submitted = uniqueNames(submittedNames);
  const resolved = uniqueNames(resolvedNames);
  const unresolvedCards = normalizeUnresolved(unresolved);
  const illegalCards = uniqueNames(illegal.map((entry) => (typeof entry === "string" ? entry : entry.name)));
  const submittedCount = submitted.length;
  const resolvedCount = resolved.length;
  const unresolvedCount = unresolvedCards.length;
  const understoodCount = Math.max(0, submittedCount - unresolvedCount);
  const percent = submittedCount ? Math.round((understoodCount / submittedCount) * 1000) / 10 : 0;
  const structuralEligible = structuralEligibleCount == null ? understoodCount : Number(structuralEligibleCount);
  const oracleAvailable = oracleAvailableCount == null ? understoodCount : Number(oracleAvailableCount);
  const resolutionRecords = normalizeResolutions(resolutions);

  const reliability = coachReliabilityState({
    percent,
    unresolvedCount,
    commanderResolved: Boolean(commanderResolved && commanderName),
    submittedCount,
  });

  return freeze({
    version: "deck-understanding-v1.1",
    cardsSubmitted: submittedCount,
    cardsResolved: resolvedCount,
    cardsUnresolved: unresolvedCount,
    cardsIllegal: illegalCards.length,
    commanderName: commanderName || null,
    commanderResolved: Boolean(commanderResolved && commanderName),
    oracleTypeDataAvailable: oracleAvailable,
    structuralAnalysisEligible: structuralEligible,
    percentStructurallyUnderstood: percent,
    unresolved: freeze(unresolvedCards),
    illegal: freeze(illegalCards),
    resolutions: freeze(resolutionRecords),
    reliability,
    playerSummary: playerFacingCompleteness({
      understoodCount,
      submittedCount,
      unresolvedCount,
      unresolvedCards,
      reliability,
      resolutions: resolutionRecords,
    }),
  });
}

export function coachReliabilityState({
  percent = 100,
  unresolvedCount = 0,
  commanderResolved = true,
  submittedCount = 0,
} = {}) {
  if (!commanderResolved || submittedCount === 0 || percent < 85) {
    return freeze({
      state: "insufficient",
      label: "Insufficient understanding",
      detail: "I don't understand enough of this list yet to coach it responsibly.",
    });
  }
  if (percent < 95 || unresolvedCount >= 3) {
    return freeze({
      state: "limited",
      label: "Limited understanding",
      detail: "I can discuss the plan I can see, but missing cards may change structural conclusions.",
    });
  }
  if (percent < 100 || unresolvedCount > 0) {
    return freeze({
      state: "mostly_complete",
      label: "Mostly complete",
      detail: "Nearly the whole list is verified. Treat remaining holes as uncertainty, not absence.",
    });
  }
  return freeze({
    state: "complete",
    label: "Complete understanding",
    detail: "Every submitted card was verified for coaching.",
  });
}

function playerFacingCompleteness({
  understoodCount,
  submittedCount,
  unresolvedCount,
  unresolvedCards,
  reliability,
  resolutions = [],
}) {
  const headline = `Deck understanding: ${understoodCount} / ${submittedCount} cards verified`;
  const aliasHits = resolutions.filter((entry) =>
    entry?.resolutionKind === "flavor_name_alias"
    || entry?.resolutionKind === "exact_printed_name"
    || (entry?.displayName && entry?.canonicalName && normalizeCardLookupKey(entry.displayName) !== normalizeCardLookupKey(entry.canonicalName)),
  );
  if (!unresolvedCount) {
    return freeze({
      headline,
      detail: aliasHits.length
        ? `${reliability.detail} ${aliasHits.length} printed/flavor name${aliasHits.length === 1 ? "" : "s"} resolved to canonical Oracle identity.`
        : reliability.detail,
      unresolvedNames: freeze([]),
      aliasResolutions: freeze(aliasHits.map((entry) => `${entry.displayName} → ${entry.canonicalName}`)),
    });
  }
  const sample = unresolvedCards.slice(0, 3).map((entry) => entry.name).join(", ");
  const more = unresolvedCount > 3 ? `, and ${unresolvedCount - 3} more` : "";
  return freeze({
    headline,
    detail: `${unresolvedCount} card${unresolvedCount === 1 ? "" : "s"} could not be fully resolved (${sample}${more}), so some synergy and engine conclusions may be incomplete.`,
    unresolvedNames: freeze(unresolvedCards.map((entry) => entry.name)),
    aliasResolutions: freeze(aliasHits.map((entry) => `${entry.displayName} → ${entry.canonicalName}`)),
  });
}

function normalizeResolutions(resolutions = []) {
  return resolutions.map((entry) => freeze({
    inputName: String(entry?.inputName || "").trim(),
    displayName: String(entry?.displayName || entry?.inputName || "").trim(),
    canonicalName: entry?.canonicalName ? String(entry.canonicalName).trim() : null,
    oracleId: entry?.oracleId || null,
    printingId: entry?.printingId || null,
    resolutionKind: String(entry?.resolutionKind || "unresolved"),
    confidence: String(entry?.confidence || "none"),
  })).filter((entry) => entry.inputName || entry.displayName);
}

/**
 * Separate strategy recognition from repeatable-system verification.
 * Unknown is not absent.
 */
export function buildStrategyVsSystemRead({
  understanding = null,
  packageLabels = [],
  strategyLine = "",
  systemsDetected = 0,
  systemsConfidence = "",
  incompleteCardSet = false,
  recognitionLabel = "",
  recognitionConfidence = "",
  recognitionWhy = "",
} = {}) {
  const packages = [...(packageLabels || [])].filter(Boolean);
  const reliability = understanding?.reliability?.state || "complete";
  const holes = Number(understanding?.cardsUnresolved || 0);
  const incomplete = incompleteCardSet || holes > 0 || reliability === "limited" || reliability === "insufficient";

  // Prefer Strategic Recognition label over commission strategy fluff
  // ("Balanced midrange") when we have a real plan name.
  let strategyConfidence = "moderate";
  let strategyLabel = recognitionLabel
    || strategyLine
    || (packages.length
      ? packages.length === 1
        ? packages[0]
        : `Competing package directions: ${packages.slice(0, 3).join(" · ")}`
      : "Plan still forming from the verified list");
  if (recognitionConfidence) strategyConfidence = recognitionConfidence;
  else if (packages.length >= 1 && reliability !== "insufficient") strategyConfidence = packages.length === 1 ? "high" : "moderate";
  if (reliability === "insufficient") strategyConfidence = "limited";

  const engineVerified = Number(systemsDetected) > 0;
  const engine = freeze({
    status: engineVerified ? "verified" : incomplete ? "not_fully_verified" : "none_verified",
    confidence: engineVerified
      ? (/HIGH/i.test(systemsConfidence) ? "high" : "moderate")
      : "limited",
    label: engineVerified
      ? `${systemsDetected} repeatable system${systemsDetected === 1 ? "" : "s"} verified`
      : incomplete
        ? "Not fully verified yet"
        : "No repeatable system verified from the complete card set",
    why: engineVerified
      ? (recognitionWhy || "Producer/payoff structure is present in the verified graph.")
      : incomplete
        ? `${holes || "Some"} card${holes === 1 ? "" : "s"} in the submitted list ${holes === 1 ? "is" : "are"} unresolved, and/or the verified graph does not yet contain enough complete producer/payoff relationships to name a repeatable engine honestly.`
        : "The full verified list still does not show a repeatable producer/payoff engine the Forge can name honestly.",
  });

  return freeze({
    strategy: freeze({
      label: strategyLabel,
      confidence: strategyConfidence,
      packages: freeze(packages),
    }),
    engine,
    incompleteEvidence: incomplete,
    principle: "unknown_is_not_absent",
  });
}

/** Deep Forge empty-state copy that respects incompleteness. */
export function deepForgeEmptyCopy({ incomplete = false, topic = "package" } = {}) {
  if (incomplete) {
    if (topic === "package") {
      return "No multi-card package can be verified from the currently resolved card set.";
    }
    if (topic === "relationship") {
      return "No oracle-derived relationship is strong enough to claim from the currently resolved card set.";
    }
    if (topic === "system") {
      return "No repeatable system can be verified yet from the currently resolved card set.";
    }
    return "Insufficient evidence in the currently resolved card set.";
  }
  if (topic === "package") return "No multi-card package is verified on this complete card set.";
  if (topic === "relationship") return "No oracle-derived relationship is strong enough to claim on this complete card set.";
  if (topic === "system") return "No repeatable system can be named honestly on this complete card set.";
  return "Insufficient evidence.";
}

export function normalizeCardLookupKey(name = "") {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function scryfallLookupName(name = "") {
  return String(name || "").split(/\s*\/\/\s*/)[0].trim();
}

/** Alias keys for a Scryfall card, including Universes Beyond flavor_name. */
export function scryfallAliasKeys(rawCard = {}) {
  const aliases = [
    rawCard.name,
    scryfallLookupName(rawCard.name),
    rawCard.flavor_name,
    rawCard.printed_name,
    ...(rawCard.card_faces || []).flatMap((face) => [face?.name, face?.flavor_name, face?.printed_name]),
  ].filter(Boolean);
  return [...new Set(aliases.map((alias) => normalizeCardLookupKey(alias)))];
}

function uniqueNames(names = []) {
  const seen = new Set();
  const out = [];
  for (const name of names) {
    const cleaned = String(name || "").trim();
    if (!cleaned) continue;
    const key = normalizeCardLookupKey(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function normalizeUnresolved(unresolved = []) {
  return unresolved.map((entry) => {
    if (typeof entry === "string") {
      return freeze({ name: entry, reasonCode: "card_not_real" });
    }
    return freeze({
      name: String(entry?.name || "").trim(),
      reasonCode: RESOLUTION_REASON_CODES.includes(entry?.reasonCode)
        ? entry.reasonCode
        : "card_not_real",
    });
  }).filter((entry) => entry.name);
}
