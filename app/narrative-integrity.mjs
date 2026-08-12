// =============================================================================
// Narrative Integrity Gate — Product credibility boundary
// =============================================================================
// A correct engine with an incorrect explanation is perceived as an incorrect
// engine. Coach narrative must never render claims from a different analysis.
// Presentation only. Does not change Brain construction.
// =============================================================================

const freeze = (value) => Object.freeze(value);

export const KNOWN_SYSTEM_LABELS = freeze([
  "Token Engine",
  "Treasure Engine",
  "Artifact Engine",
  "Counter Engine",
  "Graveyard Engine",
  "Sacrifice Engine",
  "Card-Flow Engine",
  "Spellcraft Engine",
  "Land Engine",
  "Life Engine",
  "Enter-the-Battlefield Engine",
  "Combat Engine",
  "Evasion Engine",
  "Protection Engine",
]);

export function normalizeNarrativeName(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
}

export function deckNameSet(names = []) {
  return new Set(
    [...names]
      .filter(Boolean)
      .flatMap((name) => {
        const full = normalizeNarrativeName(name);
        const face = normalizeNarrativeName(String(name).split(/\s*\/\/\s*/)[0]);
        return face && face !== full ? [full, face] : [full];
      })
      .filter(Boolean),
  );
}

/**
 * Expand deck membership with printed/flavor ↔ canonical identity pairs.
 * Display alias may appear in the list while Brain/coach prose uses Oracle name.
 */
export function deckNameSetWithIdentities(deckCardNames = [], resolutions = []) {
  const expanded = [...deckCardNames];
  for (const entry of resolutions || []) {
    if (entry?.inputName) expanded.push(entry.inputName);
    if (entry?.displayName) expanded.push(entry.displayName);
    if (entry?.canonicalName) expanded.push(entry.canonicalName);
    for (const alias of entry?.aliasNames || []) {
      if (typeof alias === "string" && alias.trim()) expanded.push(alias);
    }
  }
  return deckNameSet(expanded);
}

/**
 * Structural systems may only inform coaching when bound to the active analysis.
 * Stale reports from a previous commander/deck are treated as absent.
 */
export function bindStructuralSystemsForCoach({
  report = null,
  generationId = "",
  commanderName = "",
  deckFingerprint = "",
} = {}) {
  if (!report || report.status === "empty-card-set") {
    return freeze({ ok: false, systems: null, reason: "no_report" });
  }
  const boundGeneration = report._boundGenerationId || null;
  const boundCommander = normalizeNarrativeName(report._boundCommander || report.commanderName || "");
  const boundDeck = report._boundDeckFingerprint || null;
  const activeCommander = normalizeNarrativeName(commanderName);
  const activeGeneration = generationId || null;
  const activeDeck = deckFingerprint || null;

  if (boundGeneration && activeGeneration && boundGeneration !== activeGeneration) {
    return freeze({ ok: false, systems: null, reason: "generation_mismatch" });
  }
  if (boundCommander && activeCommander && boundCommander !== activeCommander) {
    return freeze({ ok: false, systems: null, reason: "commander_mismatch" });
  }
  if (boundDeck && activeDeck && boundDeck !== activeDeck) {
    return freeze({ ok: false, systems: null, reason: "deck_mismatch" });
  }
  // Unbound legacy reports: still require commanderName on the report to match.
  if (!boundGeneration && !boundCommander && !boundDeck) {
    const reportCommander = normalizeNarrativeName(report.commanderName || "");
    if (reportCommander && activeCommander && reportCommander !== activeCommander) {
      return freeze({ ok: false, systems: null, reason: "commander_mismatch" });
    }
  }
  return freeze({ ok: true, systems: report.systems || null, reason: "bound" });
}

export function stampStructuralReportBinding(report, {
  generationId = "",
  commanderName = "",
  deckFingerprint = "",
} = {}) {
  if (!report) return null;
  return {
    ...report,
    _boundGenerationId: generationId || null,
    _boundCommander: commanderName || report.commanderName || "",
    _boundDeckFingerprint: deckFingerprint || null,
  };
}

export function deckFingerprintFromRows(rows = []) {
  const names = [...rows]
    .map((row) => normalizeNarrativeName(row?.name || row))
    .filter(Boolean)
    .sort();
  return fingerprintFromSortedKeys(names);
}

/**
 * Stable fingerprint across display aliases that share gameplay identity.
 * Prefer oracleId, else canonicalName.
 */
export function deckFingerprintFromResolutions(resolutions = []) {
  const keys = [...resolutions]
    .map((entry) => {
      if (entry?.oracleId) return `oracle:${entry.oracleId}`;
      const canonical = normalizeNarrativeName(entry?.canonicalName || "");
      if (canonical) return `canonical:${canonical}`;
      return normalizeNarrativeName(entry?.displayName || entry?.inputName || "");
    })
    .filter(Boolean)
    .sort();
  return fingerprintFromSortedKeys(keys);
}

function fingerprintFromSortedKeys(names = []) {
  let hash = 0x811c9dc5;
  const text = names.join("|");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `deck-${(hash >>> 0).toString(16).padStart(8, "0")}-${names.length}`;
}

function collectNarrativeTexts(summary = {}) {
  const story = summary.planStory || {};
  const intentions = summary.intentions || {};
  return [
    summary.headline,
    summary.guideLine,
    summary.whatIThink,
    summary.whatLooksStrong,
    summary.whatToFixFirst,
    summary.why,
    summary.observedLead,
    summary.inferredLead,
    summary.uncertaintyLead,
    story.title,
    story.plan,
    story.early,
    story.mid,
    story.stop,
    story.commander,
    intentions.accomplish,
    intentions.establish,
    intentions.dependsOn,
    intentions.firstVulnerability,
    intentions.title,
    ...(summary.strengths || []),
    ...(summary.weaknesses || []),
    ...(summary.observedFindings || []),
    ...(summary.interpretiveGuidance || []),
    summary.strategyVsSystem?.strategy?.label,
    summary.strategyVsSystem?.engine?.label,
    summary.strategyVsSystem?.engine?.why,
  ]
    .filter(Boolean)
    .map(String);
}

function textMentionsName(blob, name) {
  const needle = normalizeNarrativeName(name);
  if (!needle || needle.length < 3) return false;
  // Word-ish boundary so "Art" does not match "Artifact".
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(blob);
}

/**
 * Narrative Integrity Gate.
 * Fail closed: any foreign commander, card, package, system, or analysisId mismatch
 * rejects the narrative.
 */
export function evaluateNarrativeIntegrity({
  summary = null,
  activeCommanderNames = [],
  deckCardNames = [],
  allowedPackageLabels = null,
  allowedSystemNames = null,
  expectedAnalysisId = "",
  expectedGenerationId = "",
  foreignSuspectNames = [],
  resolutions = [],
} = {}) {
  const violations = [];
  if (!summary) {
    return freeze({ ok: false, violations: freeze([{ type: "missing_summary", name: null }]), regenerated: false });
  }

  const activeCommanders = deckNameSet(activeCommanderNames);
  const deckCards = deckNameSetWithIdentities(deckCardNames, resolutions);
  const allowedPackages = allowedPackageLabels == null
    ? null
    : new Set([...(allowedPackageLabels || [])].map(String));
  const allowedSystems = allowedSystemNames == null
    ? null
    : new Set([...(allowedSystemNames || [])].map(String));

  const analysisId = summary.analysisIds?.analysisId || null;
  const generationId = summary.analysisIds?.generationId || null;
  if (expectedAnalysisId && analysisId && analysisId !== expectedAnalysisId) {
    violations.push({ type: "analysis_id_mismatch", name: analysisId });
  }
  if (expectedGenerationId && generationId && generationId !== expectedGenerationId) {
    violations.push({ type: "generation_id_mismatch", name: generationId });
  }

  for (const commander of summary.identity?.commanders || []) {
    const key = normalizeNarrativeName(commander);
    if (key && !activeCommanders.has(key) && !deckCards.has(key)) {
      violations.push({ type: "foreign_commander", name: commander });
    }
  }
  const storyCommander = summary.planStory?.commander;
  if (
    storyCommander
    && storyCommander !== "your commander"
    && !activeCommanders.has(normalizeNarrativeName(storyCommander))
    && !deckCards.has(normalizeNarrativeName(storyCommander))
  ) {
    violations.push({ type: "foreign_commander", name: storyCommander });
  }

  for (const label of summary.identity?.packageLabels || []) {
    if (allowedPackages && !allowedPackages.has(label)) {
      violations.push({ type: "foreign_package", name: label });
    }
  }

  const claimedCards = [
    summary.fixFirst,
    ...(summary.weaknesses || []),
    ...(summary.observedFindings || []),
  ];
  // Structured card claims from the ledger critique only — not free prose mining.
  for (const card of summary.identity?.packageLabels ? [] : []) {
    void card;
  }
  const critiqueCards = [];
  if (summary.fixFirst && !String(summary.fixFirst).includes(" ")) {
    // single-token fixFirst might be a system name; skip
  }
  // Prefer explicit card lists when present on the summary.
  for (const card of [
    ...(Array.isArray(summary.namedCards) ? summary.namedCards : []),
    ...critiqueCards,
  ]) {
    if (!deckCards.has(normalizeNarrativeName(card))) {
      violations.push({ type: "foreign_card", name: card });
    }
  }

  const narrativeBlob = collectNarrativeTexts(summary).join("\n");
  const narrativeLower = narrativeBlob.toLocaleLowerCase("en");

  for (const systemLabel of KNOWN_SYSTEM_LABELS) {
    if (!textMentionsName(narrativeLower, systemLabel)) continue;
    if (allowedSystems && !allowedSystems.has(systemLabel)) {
      violations.push({ type: "foreign_system", name: systemLabel });
    }
  }

  // Any suspect foreign commander (previous analysis, stale UI selection, etc.)
  // mentioned in narrative while not active → hard fail.
  for (const suspect of foreignSuspectNames || []) {
    const key = normalizeNarrativeName(suspect);
    if (!key || activeCommanders.has(key) || deckCards.has(key)) continue;
    if (textMentionsName(narrativeLower, suspect)) {
      violations.push({ type: "foreign_commander", name: suspect });
    }
  }

  // Active commander(s) must be the ones the plan story speaks about when a
  // concrete commander is named.
  if (
    storyCommander
    && storyCommander !== "your commander"
    && activeCommanders.size > 0
    && !activeCommanders.has(normalizeNarrativeName(storyCommander))
  ) {
    violations.push({ type: "commander_mismatch", name: storyCommander });
  }

  return freeze({
    ok: violations.length === 0,
    violations: freeze(violations),
    regenerated: false,
    analysisId,
    generationId,
  });
}

/**
 * Cards explicitly claimed by coach structured fields (ledger-backed).
 */
export function claimedCoachCardNames(summary = {}, selected = {}) {
  const critique = selected?.slotJustificationLedger?.critique || {};
  // fixFirst is only ever a card claim when its own producer said so —
  // it can also resolve to a fantasy/theme label, a construction-stage
  // label, or "commander connection", none of which appear in any deck's
  // card list and would otherwise false-positive as a foreign card and
  // fail-close a legitimate narrative. Fall back to the old KNOWN_SYSTEM_LABELS
  // guess only when an older summary shape has no fixFirstKind at all.
  const fixFirstIsCard = "fixFirstKind" in summary
    ? summary.fixFirstKind === "card"
    : Boolean(summary.fixFirst) && !KNOWN_SYSTEM_LABELS.includes(summary.fixFirst);
  return [
    ...(critique.weaklyJustified || []),
    ...(critique.redundant || []),
    ...(critique.overSupported || []),
    ...(critique.underSupportedAnchors || []),
    ...(critique.rawPowerDominant || []),
    fixFirstIsCard ? summary.fixFirst : null,
  ].filter(Boolean);
}

export function evaluateNarrativeIntegrityForCoach({
  summary,
  selected = null,
  activeCommanderNames = [],
  deckCardNames = [],
  allowedPackageLabels = null,
  allowedSystemNames = null,
  expectedAnalysisId = "",
  expectedGenerationId = "",
  foreignSuspectNames = [],
  resolutions = [],
} = {}) {
  const cards = claimedCoachCardNames(summary, selected);
  const deck = deckNameSetWithIdentities(deckCardNames, resolutions);
  const base = evaluateNarrativeIntegrity({
    summary,
    activeCommanderNames,
    deckCardNames,
    allowedPackageLabels,
    allowedSystemNames,
    expectedAnalysisId,
    expectedGenerationId,
    foreignSuspectNames,
    resolutions,
  });
  const extra = [];
  for (const card of cards) {
    if (!deck.has(normalizeNarrativeName(card))) {
      extra.push({ type: "foreign_card", name: card });
    }
  }
  const violations = freeze([...(base.violations || []), ...extra]);
  return freeze({
    ...base,
    ok: violations.length === 0,
    violations,
  });
}
