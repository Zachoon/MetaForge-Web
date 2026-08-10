// =============================================================================
// Field Intelligence v1.2 — Level-A converter forensics
// =============================================================================
// Same commander(s) + same event. Observation only. No Brain mutation.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

export function normalizeCommanderIdentity(commanders = []) {
  return [...(commanders || [])]
    .map((c) => (typeof c === "string" ? c : c.name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(" / ");
}

export function isHighPerformer(record) {
  if (record.topCut === true) return true;
  if (record.placement === 1) return true;
  if (Boolean(record.performance?.strongFinish)) return true;
  if (
    Number.isFinite(record.topCutSize)
    && record.topCutSize > 0
    && Number.isFinite(record.placement)
    && record.placement > 0
    && record.placement <= record.topCutSize
  ) {
    return true;
  }
  return false;
}

function nonlandSlots(record) {
  return (record.rows || [])
    .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .reduce((sum, row) => sum + (Number(row.quantity) || 1), 0) || 99;
}

function rowSemantics(row) {
  if (row.strategicSemantics instanceof Set) return [...row.strategicSemantics];
  return [...(row.strategicSemantics || [])];
}

function countRole(rows, role) {
  return rows
    .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .filter((row) => (row.roles || []).includes(role))
    .reduce((sum, row) => sum + (Number(row.quantity) || 1), 0);
}

function countSemantic(rows, semantic) {
  return rows
    .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .filter((row) => rowSemantics(row).includes(semantic))
    .reduce((sum, row) => sum + (Number(row.quantity) || 1), 0);
}

function countType(rows, pattern) {
  return rows
    .filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"))
    .filter((row) => pattern.test(row.typeLine || "") || pattern.test(row.oracleText || ""))
    .reduce((sum, row) => sum + (Number(row.quantity) || 1), 0);
}

function curveBuckets(rows) {
  const buckets = { "0-1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
  for (const row of rows) {
    if ((row.roles || []).includes("land") || (row.roles || []).includes("commander")) continue;
    const qty = Number(row.quantity) || 1;
    const cmc = Number(row.cmc) || 0;
    if (cmc <= 1) buckets["0-1"] += qty;
    else if (cmc === 2) buckets["2"] += qty;
    else if (cmc === 3) buckets["3"] += qty;
    else if (cmc === 4) buckets["4"] += qty;
    else buckets["5+"] += qty;
  }
  return buckets;
}

/**
 * Diagnostic threat subtypes — observation only, does not change Brain roles.
 */
export function decomposeThreatCard(row) {
  const text = `${row.typeLine || ""}\n${row.oracleText || ""}`;
  const roles = row.roles || [];
  const semantics = rowSemantics(row);
  const tags = [];
  if (!roles.includes("threat") && !/\bCreature\b|\bPlaneswalker\b/i.test(row.typeLine || "")) {
    return freeze({ name: row.name, subtypes: freeze([]), quantity: Number(row.quantity) || 1 });
  }
  if (/you win the game|wins? the game|infinite|combo with|assemble/i.test(text)
    || /thoracle|consultation|underworld breach|dockside|dramatic|isomera/i.test(row.name)) {
    tags.push("combo_component");
  }
  if (/whenever you cast|whenever .+ enters|at the beginning|draw a card|create .+ token/i.test(text)
    && !tags.includes("combo_component")) {
    tags.push("value_engine");
  }
  if (semantics.includes("reanimation_target") || (Number(row.cmc) || 0) >= 6) {
    tags.push("standalone_threat");
  }
  if ((row.commanderConnectionSignals || []).length) {
    tags.push("commander_support_body");
  }
  if (/deal \d+ damage to (each opponent|target player)|combat damage|trample|haste/i.test(text)
    && (Number(row.cmc) || 0) >= 4) {
    tags.push("primary_win_piece");
  }
  if (!tags.length) tags.push("standalone_threat");
  if (tags.includes("standalone_threat") && tags.includes("value_engine")) {
    tags.push("redundant_finisher_candidate");
  }
  return freeze({
    name: row.name,
    subtypes: freeze([...new Set(tags)]),
    quantity: Number(row.quantity) || 1,
    cmc: Number(row.cmc) || 0,
  });
}

/**
 * Spell composition diagnostics for Instant/Sorcery density deltas.
 */
export function decomposeSpellCard(row) {
  const typeLine = row.typeLine || "";
  if (!/\bInstant\b|\bSorcery\b/i.test(typeLine)) {
    return freeze({ name: row.name, kinds: freeze([]), quantity: Number(row.quantity) || 1 });
  }
  const text = row.oracleText || "";
  const roles = row.roles || [];
  const kinds = [];
  if (roles.includes("interaction") || /counter target|destroy target|exile target|bounce|return .+ to (its|their) owner/i.test(text)) {
    kinds.push("interaction");
  }
  if (roles.includes("protection") || /hexproof|indestructible|protection from|phase out|ward/i.test(text)) {
    kinds.push("protection");
  }
  if (/search your library|tutor/i.test(text) || roles.includes("tutor")) {
    kinds.push(/win the game|thoracle|consultation|breach/i.test(text) ? "tutor_for_win" : "tutor");
  }
  if (roles.includes("draw") || roles.includes("selection") || /draw (a|one|two|three|\d+)/i.test(text)) {
    kinds.push("card_advantage");
  }
  if (/you win the game|infinite|untap all|copy target spell/i.test(text)) {
    kinds.push("combo_assembly");
  }
  if ((Number(row.cmc) || 0) <= 1 && /draw a card/i.test(text) && kinds.length <= 1) {
    kinds.push("generic_cantrip");
  }
  if (!kinds.length) kinds.push("other_spell");
  return freeze({
    name: row.name,
    kinds: freeze([...new Set(kinds)]),
    quantity: Number(row.quantity) || 1,
    cmc: Number(row.cmc) || 0,
  });
}

/**
 * Interaction composition — more/better shaped are different lessons.
 */
export function decomposeInteractionCard(row) {
  const roles = row.roles || [];
  const text = `${row.typeLine || ""}\n${row.oracleText || ""}`;
  const kinds = [];
  const isInteract = roles.includes("interaction")
    || roles.includes("protection")
    || /counter target|destroy target|exile target|can't cast|players can't|skip (their|your)|tax|unless .+ pays/i.test(text);
  if (!isInteract) {
    return freeze({ name: row.name, kinds: freeze([]), quantity: Number(row.quantity) || 1 });
  }
  if (/counter target/i.test(text)) kinds.push("stack_interaction");
  if (/destroy (target|all)|exile (target|all)|damage to target|fight| -X\/-X/i.test(text)) kinds.push("removal");
  if (roles.includes("protection") || /hexproof|indestructible|protection from|phase out/i.test(text)) kinds.push("protection");
  if (/discard|mill|can't activate|silence|rule of law|deafening silence|winter orb|stasis|sphere of resistance|thorn of amethyst/i.test(text)
    || /unless .+ pays|cost \{.\} more/i.test(text)) {
    kinds.push(/sphere|thorn|tax|more to cast|pays \{/i.test(text) ? "stax_tax" : "disruption");
  }
  if (/silence|orim's chant|grand abolisher|teferi.+time|defense grid/i.test(row.name) || /can't cast spells/i.test(text)) {
    kinds.push("silence_effects");
  }
  if (/choose one|modal|•/i.test(text) || roles.includes("interaction") && roles.includes("draw")) {
    kinds.push("flexible_modal");
  }
  if ((row.commanderConnectionSignals || []).length) kinds.push("commander_connected");
  if ((Number(row.cmc) || 0) >= 4 && kinds.includes("removal") && kinds.length === 1) {
    kinds.push("narrow_or_heavy");
  }
  if (!kinds.length) kinds.push("generic_interaction");
  return freeze({
    name: row.name,
    kinds: freeze([...new Set(kinds)]),
    quantity: Number(row.quantity) || 1,
    cmc: Number(row.cmc) || 0,
  });
}

function featureStat(highValues, lowValues, sampleHigh, sampleLow) {
  const highMean = mean(highValues);
  const lowMean = mean(lowValues);
  const delta = highMean - lowMean;
  const magnitude = Math.abs(delta);
  // Soft confidence: more decks + larger effect → higher, single pair stays a lead.
  const n = sampleHigh + sampleLow;
  const confidence = round(Math.min(0.95, (Math.log2(1 + n) / 5) * 0.55 + Math.min(0.4, magnitude / 20)));
  return freeze({
    highMean: round(highMean),
    lowMean: round(lowMean),
    delta: round(delta),
    magnitude: round(magnitude),
    sampleHigh,
    sampleLow,
    sampleSize: n,
    confidence,
  });
}

function deckFeatureVector(record, analysis) {
  const rows = record.rows || [];
  const slots = nonlandSlots(record);
  const share = (count) => slots ? count / slots : 0;
  const packages = analysis.packages || [];
  const justification = analysis.justification || {};
  const curve = analysis.curve || curveBuckets(rows);
  const threats = rows.filter((r) => (r.roles || []).includes("threat"));
  const threatDecomp = threats.flatMap((row) => {
    const d = decomposeThreatCard(row);
    return d.subtypes.map((subtype) => ({ subtype, quantity: d.quantity }));
  });
  const spells = rows.filter((r) => /\bInstant\b|\bSorcery\b/i.test(r.typeLine || ""));
  const spellDecomp = spells.flatMap((row) => {
    const d = decomposeSpellCard(row);
    return d.kinds.map((kind) => ({ kind, quantity: d.quantity }));
  });
  const interactions = rows.filter((r) => {
    const d = decomposeInteractionCard(r);
    return d.kinds.length > 0;
  });
  const interactionDecomp = interactions.flatMap((row) => {
    const d = decomposeInteractionCard(row);
    return d.kinds.map((kind) => ({ kind, quantity: d.quantity, cmc: d.cmc }));
  });

  const countSubtype = (list, key, field) => list
    .filter((entry) => entry[field] === key)
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const features = {
    interactionDensity: analysis.interactionGraph?.edgeCount || 0,
    interactionCount: interactions.reduce((s, r) => s + (Number(r.quantity) || 1), 0),
    interactionShare: share(interactions.reduce((s, r) => s + (Number(r.quantity) || 1), 0)),
    threatDensity: countRole(rows, "threat"),
    threatShare: share(countRole(rows, "threat")),
    ramp: countRole(rows, "ramp"),
    rampShare: share(countRole(rows, "ramp")),
    draw: countRole(rows, "draw"),
    drawShare: share(countRole(rows, "draw")),
    tutor: countRole(rows, "tutor") + countType(rows, /search your library/i),
    protection: countRole(rows, "protection"),
    recursion: countRole(rows, "recursion"),
    removal: countRole(rows, "interaction"),
    spells: spells.reduce((s, r) => s + (Number(r.quantity) || 1), 0),
    spellShare: share(spells.reduce((s, r) => s + (Number(r.quantity) || 1), 0)),
    packageCore: mean(packages.map((p) => p.density?.core ?? 0)),
    packageSupport: mean(packages.map((p) => p.density?.support ?? 0)),
    packageHealth: mean(packages.map((p) => p.healthScore ?? 0)),
    packageCount: packages.length,
    curveHigh: curve["5+"] || 0,
    curveLow: (curve["0-1"] || 0) + (curve["2"] || 0),
    commanderAlignment: analysis.commanderConnection?.ratio || 0,
    commanderConnectedCount: analysis.commanderConnection?.connectedCount || 0,
    redundancy: justification.redundantCount || 0,
    weakSlotDensity: justification.slotCount
      ? (justification.weaklyJustifiedCount || 0) / justification.slotCount
      : 0,
    rawPowerDominant: (justification.rawPowerDominant || justification.critique?.rawPowerDominant || []).length
      || 0,
    unsupportedAnchors: (justification.underSupportedAnchors || []).length,
    roleDiversity: Object.keys(analysis.roleDistribution || {}).length,
    // threat subtypes
    threat_combo_component: countSubtype(threatDecomp, "combo_component", "subtype"),
    threat_standalone: countSubtype(threatDecomp, "standalone_threat", "subtype"),
    threat_value_engine: countSubtype(threatDecomp, "value_engine", "subtype"),
    threat_commander_support: countSubtype(threatDecomp, "commander_support_body", "subtype"),
    threat_primary_win: countSubtype(threatDecomp, "primary_win_piece", "subtype"),
    threat_redundant_finisher: countSubtype(threatDecomp, "redundant_finisher_candidate", "subtype"),
    // spell kinds
    spell_interaction: countSubtype(spellDecomp, "interaction", "kind"),
    spell_protection: countSubtype(spellDecomp, "protection", "kind"),
    spell_tutor: countSubtype(spellDecomp, "tutor", "kind"),
    spell_tutor_for_win: countSubtype(spellDecomp, "tutor_for_win", "kind"),
    spell_card_advantage: countSubtype(spellDecomp, "card_advantage", "kind"),
    spell_combo_assembly: countSubtype(spellDecomp, "combo_assembly", "kind"),
    spell_generic_cantrip: countSubtype(spellDecomp, "generic_cantrip", "kind"),
    spell_other: countSubtype(spellDecomp, "other_spell", "kind"),
    // interaction kinds
    ix_stack: countSubtype(interactionDecomp, "stack_interaction", "kind"),
    ix_removal: countSubtype(interactionDecomp, "removal", "kind"),
    ix_protection: countSubtype(interactionDecomp, "protection", "kind"),
    ix_disruption: countSubtype(interactionDecomp, "disruption", "kind"),
    ix_stax_tax: countSubtype(interactionDecomp, "stax_tax", "kind"),
    ix_silence: countSubtype(interactionDecomp, "silence_effects", "kind"),
    ix_flexible: countSubtype(interactionDecomp, "flexible_modal", "kind"),
    ix_commander_connected: countSubtype(interactionDecomp, "commander_connected", "kind"),
    ix_narrow_or_heavy: countSubtype(interactionDecomp, "narrow_or_heavy", "kind"),
    ix_mean_cmc: interactionDecomp.length
      ? mean(interactionDecomp.map((entry) => entry.cmc || 0))
      : 0,
  };

  return freeze({
    deckId: record.id,
    slots,
    features: freeze(features),
    roleFingerprint: freeze(Object.fromEntries(
      Object.entries(analysis.roleDistribution || {}).map(([role, count]) => [
        role,
        freeze({ count, share: round(share(count)) }),
      ]),
    )),
    threatCards: freeze(threats.map(decomposeThreatCard)),
    spellCards: freeze(spells.map(decomposeSpellCard)),
    interactionCards: freeze(interactions.map(decomposeInteractionCard)),
  });
}

/**
 * Build one Level-A forensic artifact for a same-commander / same-event cohort.
 */
export function buildLevelACohortForensics({
  eventId,
  commanderIdentity,
  records = [],
  analyses = [],
} = {}) {
  const identity = normalizeCommanderIdentity(
    commanderIdentity?.includes?.(" / ")
      ? commanderIdentity.split(" / ").map((name) => ({ name }))
      : (records[0]?.commanders || []),
  ) || commanderIdentity;

  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const cohort = records.filter((record) =>
    record.eventId === eventId
    && normalizeCommanderIdentity(record.commanders) === identity
    && analysisById.has(record.id));

  // Identity gate: refuse mixed commander cohorts.
  const identities = new Set(cohort.map((r) => normalizeCommanderIdentity(r.commanders)));
  if (identities.size !== 1) {
    return freeze({
      ok: false,
      reason: "commander_identity_mismatch",
      eventId,
      commanderIdentity: identity,
    });
  }

  const high = cohort.filter(isHighPerformer);
  const low = cohort.filter((r) => !isHighPerformer(r));
  if (high.length < 1 || low.length < 1) {
    return freeze({
      ok: false,
      reason: "missing_high_or_low",
      eventId,
      commanderIdentity: identity,
      cohortSize: cohort.length,
    });
  }

  const highVec = high.map((r) => deckFeatureVector(r, analysisById.get(r.id)));
  const lowVec = low.map((r) => deckFeatureVector(r, analysisById.get(r.id)));
  const featureKeys = [...new Set([
    ...highVec.flatMap((v) => Object.keys(v.features)),
    ...lowVec.flatMap((v) => Object.keys(v.features)),
  ])].sort();

  const deltas = featureKeys.map((key) => {
    const stat = featureStat(
      highVec.map((v) => Number(v.features[key]) || 0),
      lowVec.map((v) => Number(v.features[key]) || 0),
      high.length,
      low.length,
    );
    return freeze({ feature: key, ...stat });
  }).sort((a, b) => b.magnitude - a.magnitude || a.feature.localeCompare(b.feature));

  const semanticCoverage = mean(cohort.map((r) =>
    Number(r.evidenceQualityHints?.semanticCoverageRate) || 1));

  return freeze({
    ok: true,
    version: "level-a-forensics-v1",
    level: "A",
    eventId,
    eventName: cohort[0]?.eventName || null,
    eventSize: cohort[0]?.eventSize ?? null,
    commanderIdentity: identity,
    partner: identity.includes(" / "),
    highCount: high.length,
    lowCount: low.length,
    cohortSize: cohort.length,
    placements: freeze(cohort.map((r) => freeze({
      deckId: r.id,
      placement: r.placement,
      topCut: r.topCut,
      matchRecord: r.matchRecord,
      performanceClass: r.performanceClass,
      bucket: isHighPerformer(r) ? "high" : "low",
    })).sort((a, b) => (a.placement || 99) - (b.placement || 99))),
    semanticCoverage: round(semanticCoverage),
    evidenceConfidence: round(mean(cohort.map((r) => Number(r.performanceWeight) || 0.5))),
    strongestDeltas: freeze(deltas.slice(0, 16)),
    deltas: freeze(deltas),
    highFingerprint: freeze(averageFingerprints(highVec)),
    lowFingerprint: freeze(averageFingerprints(lowVec)),
    highThreatDecomposition: freeze(aggregateThreatDecomp(highVec)),
    lowThreatDecomposition: freeze(aggregateThreatDecomp(lowVec)),
    highSpellDecomposition: freeze(aggregateSpellDecomp(highVec)),
    lowSpellDecomposition: freeze(aggregateSpellDecomp(lowVec)),
    highInteractionDecomposition: freeze(aggregateInteractionDecomp(highVec)),
    lowInteractionDecomposition: freeze(aggregateInteractionDecomp(lowVec)),
    note: "single_event_lead_until_replicated",
  });
}

function averageFingerprints(vectors) {
  const roles = {};
  for (const vector of vectors) {
    for (const [role, entry] of Object.entries(vector.roleFingerprint || {})) {
      roles[role] = roles[role] || [];
      roles[role].push(entry.share);
    }
  }
  return Object.fromEntries(
    Object.entries(roles)
      .map(([role, shares]) => [role, round(mean(shares))])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function aggregateThreatDecomp(vectors) {
  const counts = {};
  for (const vector of vectors) {
    for (const card of vector.threatCards || []) {
      for (const subtype of card.subtypes || []) {
        counts[subtype] = (counts[subtype] || 0) + card.quantity;
      }
    }
  }
  const n = Math.max(1, vectors.length);
  return Object.fromEntries(
    Object.entries(counts)
      .map(([key, value]) => [key, round(value / n)])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function aggregateSpellDecomp(vectors) {
  const counts = {};
  for (const vector of vectors) {
    for (const card of vector.spellCards || []) {
      for (const kind of card.kinds || []) {
        counts[kind] = (counts[kind] || 0) + card.quantity;
      }
    }
  }
  const n = Math.max(1, vectors.length);
  return Object.fromEntries(
    Object.entries(counts)
      .map(([key, value]) => [key, round(value / n)])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function aggregateInteractionDecomp(vectors) {
  const counts = {};
  const cmcs = [];
  for (const vector of vectors) {
    for (const card of vector.interactionCards || []) {
      cmcs.push(card.cmc);
      for (const kind of card.kinds || []) {
        counts[kind] = (counts[kind] || 0) + card.quantity;
      }
    }
  }
  const n = Math.max(1, vectors.length);
  return freeze({
    kinds: freeze(Object.fromEntries(
      Object.entries(counts)
        .map(([key, value]) => [key, round(value / n)])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    )),
    meanCmc: round(mean(cmcs)),
  });
}

/**
 * Enumerate all usable Level-A cohorts and forensic each.
 * Nested Maps — never reconstruct event/identity from delimiter keys.
 */
export function buildAllLevelAForensics(records = [], analyses = []) {
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));
  const byEventIdentity = new Map(); // eventId -> Map(identity -> records[])
  for (const record of records) {
    if (!record.eventId || !analysisById.has(record.id)) continue;
    const identity = normalizeCommanderIdentity(record.commanders);
    if (!identity) continue;
    if (!byEventIdentity.has(record.eventId)) byEventIdentity.set(record.eventId, new Map());
    const byIdentity = byEventIdentity.get(record.eventId);
    byIdentity.set(identity, (byIdentity.get(identity) || []).concat([record]));
  }

  const forensics = [];
  for (const [eventId, byIdentity] of byEventIdentity) {
    for (const [identity, cohort] of byIdentity) {
      const high = cohort.filter(isHighPerformer).length;
      const low = cohort.length - high;
      if (cohort.length < 2 || high < 1 || low < 1) continue;
      const artifact = buildLevelACohortForensics({
        eventId,
        commanderIdentity: identity,
        records: cohort,
        analyses,
      });
      if (artifact.ok) forensics.push(artifact);
    }
  }

  return freeze({
    version: "level-a-forensics-batch-v1",
    usableCohorts: forensics.length,
    cohorts: freeze(forensics.sort((a, b) =>
      b.cohortSize - a.cohortSize
      || a.commanderIdentity.localeCompare(b.commanderIdentity)
      || String(a.eventId).localeCompare(String(b.eventId)))),
  });
}
