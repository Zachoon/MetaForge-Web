// =============================================================================
// Field Intelligence v1.2 — Blind spots + Brain v1 classification + transfer
// =============================================================================
// Observation only. Does not expand package catalog or Brain semantics.
// =============================================================================

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

export const BRAIN_CLASSIFICATIONS = Object.freeze([
  "brain_agrees",
  "brain_underweights",
  "brain_overweights",
  "brain_missing_concept",
  "semantic_resolution_insufficient",
]);

/**
 * Concepts Brain v1 already models in observation/construction surfaces.
 * Used for classification only — not a score change.
 */
const BRAIN_ENCODED = Object.freeze({
  interactionDensity: { encoded: true, surface: "interaction_graph + role interaction" },
  interactionCount: { encoded: true, surface: "role:interaction" },
  interactionShare: { encoded: true, surface: "role:interaction share" },
  threatDensity: { encoded: true, surface: "role:threat" },
  threatShare: { encoded: true, surface: "role:threat share" },
  ramp: { encoded: true, surface: "role:ramp" },
  draw: { encoded: true, surface: "role:draw" },
  tutor: { encoded: true, surface: "role/search heuristics" },
  protection: { encoded: true, surface: "role:protection" },
  recursion: { encoded: true, surface: "role:recursion" },
  packageCore: { encoded: true, surface: "PACKAGE_CATALOG density" },
  packageSupport: { encoded: true, surface: "PACKAGE_CATALOG support" },
  packageHealth: { encoded: true, surface: "package healthScore" },
  weakSlotDensity: { encoded: true, surface: "slot justification ledger" },
  unsupportedAnchors: { encoded: true, surface: "underSupportedAnchors" },
  commanderAlignment: { encoded: true, surface: "commanderConnection" },
  redundancy: { encoded: true, surface: "redundantCount" },
  roleDiversity: { encoded: true, surface: "roleDistribution breadth" },
  // Diagnostic-only subtypes — not Brain construction semantics yet.
  threat_combo_component: { encoded: false, surface: "diagnostic_only" },
  threat_standalone: { encoded: false, surface: "diagnostic_only" },
  threat_value_engine: { encoded: false, surface: "diagnostic_only" },
  threat_primary_win: { encoded: false, surface: "diagnostic_only" },
  spell_interaction: { encoded: false, surface: "diagnostic_only" },
  spell_tutor_for_win: { encoded: false, surface: "diagnostic_only" },
  spell_generic_cantrip: { encoded: false, surface: "diagnostic_only" },
  ix_stack: { encoded: false, surface: "diagnostic_only" },
  ix_flexible: { encoded: false, surface: "diagnostic_only" },
  ix_stax_tax: { encoded: false, surface: "diagnostic_only" },
  ix_silence: { encoded: false, surface: "diagnostic_only" },
  ix_narrow_or_heavy: { encoded: false, surface: "diagnostic_only" },
});

/**
 * Classify replicated (or strong) hypotheses against Brain v1 encoding.
 */
export function classifyHypothesesAgainstBrain(hypothesesBatch = null, quality = null) {
  const rows = [];
  const list = [
    ...(hypothesesBatch?.replicated || []),
    ...(hypothesesBatch?.singleEventLeads || []).filter((h) => h.confidence >= 0.35),
  ];

  for (const hyp of list) {
    const meta = BRAIN_ENCODED[hyp.feature] || BRAIN_ENCODED[`${hyp.featureFamily}`] || null;
    let classification = "semantic_resolution_insufficient";
    let note = "";

    if ((quality?.packageDetectionRate ?? 1) < 0.2 && hyp.featureFamily === "package") {
      classification = "semantic_resolution_insufficient";
      note = "packageDetectionRate too low to judge Brain package weighting";
    } else if (!meta || meta.encoded === false) {
      classification = "brain_missing_concept";
      note = meta?.surface === "diagnostic_only"
        ? "diagnostic subtype exists in forensics only; Brain construction uses coarser role"
        : "concept not found in Brain v1 encoded surfaces";
    } else if (hyp.featureFamily === "threats" && Math.abs(hyp.weightedEffect) >= 5) {
      // Broad threat role may be wrong weight OR wrong taxonomy — flag for review.
      classification = "brain_missing_concept";
      note = "large threat delta with coarse role:threat; taxonomy may be hiding combo vs standalone";
    } else if (hyp.featureFamily === "interaction" && hyp.observedDirection === "high_greater") {
      classification = "brain_underweights";
      note = "converters show more/better interaction than Brain density-first priors emphasize";
    } else if (hyp.featureFamily === "package" && hyp.observedDirection === "high_lesser") {
      classification = "brain_overweights";
      note = "converters leaner on package core than Brain package-density priors expect";
    } else if (Math.abs(hyp.weightedEffect) < 1) {
      classification = "brain_agrees";
      note = "small effect; Brain and corpus not strongly divergent";
    } else {
      classification = "brain_underweights";
      note = "Brain encodes the surface but Level-A effect suggests reweight review after replication";
    }

    rows.push(freeze({
      hypothesisId: hyp.id,
      feature: hyp.feature,
      featureFamily: hyp.featureFamily,
      replicationStatus: hyp.replicationStatus,
      weightedEffect: hyp.weightedEffect,
      confidence: hyp.confidence,
      classification,
      brainSurface: meta?.surface || null,
      note,
      brainV2Eligible: hyp.brainV2Eligible === true && classification !== "semantic_resolution_insufficient",
    }));
  }

  return freeze({
    version: "brain-v1-hypothesis-classification-v1",
    classifications: freeze(rows.sort((a, b) => b.confidence - a.confidence)),
    counts: freeze(Object.fromEntries(
      BRAIN_CLASSIFICATIONS.map((c) => [c, rows.filter((r) => r.classification === c).length]),
    )),
  });
}

/**
 * Package catalog blind spots — record only, do not expand catalog.
 */
export function findPackageBlindSpotCandidates(levelABatch = null, analyses = [], records = []) {
  const candidates = [];
  const cohorts = levelABatch?.cohorts || [];
  const analysisById = new Map(analyses.map((a) => [a.deckId, a]));

  // Structures that repeat across independent decks/events without package hits.
  const signatureMap = new Map();
  for (const cohort of cohorts) {
    for (const placement of cohort.placements || []) {
      const analysis = analysisById.get(placement.deckId);
      const record = records.find((r) => r.id === placement.deckId);
      if (!analysis || !record) continue;
      if ((analysis.packages || []).length > 0) continue;
      const roles = Object.entries(analysis.roleDistribution || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role]) => role);
      const signature = roles.join("+") || "empty";
      const entry = signatureMap.get(signature) || {
        signature,
        decks: new Set(),
        events: new Set(),
        commanders: new Set(),
        high: 0,
        low: 0,
      };
      entry.decks.add(placement.deckId);
      entry.events.add(cohort.eventId);
      entry.commanders.add(cohort.commanderIdentity);
      if (placement.bucket === "high") entry.high += 1;
      else entry.low += 1;
      signatureMap.set(signature, entry);
    }
  }

  for (const entry of signatureMap.values()) {
    if (entry.decks.size < 2 || entry.events.size < 1) continue;
    // Prefer multi-event or multi-commander coherence.
    const confidence = round(Math.min(0.75,
      0.25 + 0.1 * entry.decks.size + 0.1 * entry.events.size + (entry.commanders.size > 1 ? 0.1 : 0)));
    if (confidence < 0.35) continue;
    candidates.push(freeze({
      kind: "package_blind_spot_candidate",
      signature: entry.signature,
      deckCount: entry.decks.size,
      eventCount: entry.events.size,
      commanders: freeze([...entry.commanders].sort()),
      highDecks: entry.high,
      lowDecks: entry.low,
      confidence,
      expandCatalog: false,
      note: "Repeated structure Brain cannot currently describe as a package. Observation only.",
    }));
  }

  return freeze({
    version: "package-blind-spot-v1",
    candidates: freeze(candidates.sort((a, b) => b.confidence - a.confidence)),
  });
}

/**
 * Role taxonomy blind spots — flag when broad roles hide distinct functions.
 */
export function findRoleTaxonomyBlindSpots(levelABatch = null) {
  const flags = [];
  for (const cohort of levelABatch?.cohorts || []) {
    const threatDelta = (cohort.deltas || []).find((d) => d.feature === "threatDensity");
    const combo = (cohort.deltas || []).find((d) => d.feature === "threat_combo_component");
    const standalone = (cohort.deltas || []).find((d) => d.feature === "threat_standalone");
    if (threatDelta && Math.abs(threatDelta.delta) >= 4) {
      const subtypeSplit = Math.abs((combo?.delta || 0) - (standalone?.delta || 0));
      if (subtypeSplit >= 2 || Math.abs(combo?.delta || 0) >= 2 || Math.abs(standalone?.delta || 0) >= 2) {
        flags.push(freeze({
          kind: "role_taxonomy_blind_spot",
          candidate: "threat_vs_combo_piece",
          eventId: cohort.eventId,
          commanderIdentity: cohort.commanderIdentity,
          threatDelta: threatDelta.delta,
          comboComponentDelta: combo?.delta ?? null,
          standaloneDelta: standalone?.delta ?? null,
          expandSemantics: false,
          note: "Broad threat role may hide strategically different functions.",
        }));
      }
    }

    const spellDelta = (cohort.deltas || []).find((d) => d.feature === "spells");
    const ixSpell = (cohort.deltas || []).find((d) => d.feature === "spell_interaction");
    const cantrip = (cohort.deltas || []).find((d) => d.feature === "spell_generic_cantrip");
    if (spellDelta && Math.abs(spellDelta.delta) >= 3) {
      flags.push(freeze({
        kind: "role_taxonomy_blind_spot",
        candidate: "spell_count_vs_spell_composition",
        eventId: cohort.eventId,
        commanderIdentity: cohort.commanderIdentity,
        spellDelta: spellDelta.delta,
        interactionSpellDelta: ixSpell?.delta ?? null,
        cantripDelta: cantrip?.delta ?? null,
        expandSemantics: false,
        note: "Raw spell count hides interaction vs cantrip vs tutor composition.",
      }));
    }

    const ixCount = (cohort.deltas || []).find((d) => d.feature === "interactionCount");
    const ixFlex = (cohort.deltas || []).find((d) => d.feature === "ix_flexible");
    const ixNarrow = (cohort.deltas || []).find((d) => d.feature === "ix_narrow_or_heavy");
    if (ixCount && Math.abs(ixCount.delta) >= 2) {
      if ((ixFlex && Math.abs(ixFlex.delta) >= 1) || (ixNarrow && Math.abs(ixNarrow.delta) >= 1)) {
        flags.push(freeze({
          kind: "role_taxonomy_blind_spot",
          candidate: "interaction_quantity_vs_shape",
          eventId: cohort.eventId,
          commanderIdentity: cohort.commanderIdentity,
          interactionCountDelta: ixCount.delta,
          flexibleDelta: ixFlex?.delta ?? null,
          narrowHeavyDelta: ixNarrow?.delta ?? null,
          expandSemantics: false,
          note: "More interaction ≠ better-shaped interaction.",
        }));
      }
    }
  }

  return freeze({
    version: "role-taxonomy-blind-spot-v1",
    candidates: freeze(flags),
  });
}

/**
 * Cross-commander transfer validation — never assume transfer.
 */
export function testCrossCommanderTransfer(hypothesesBatch = null, levelABatch = null) {
  const results = [];
  const replicated = hypothesesBatch?.replicated || [];
  const cohorts = levelABatch?.cohorts || [];

  for (const hyp of replicated) {
    // Find other commander identities with same feature family observation.
    const others = cohorts.filter((c) =>
      c.commanderIdentity !== hyp.commanderFamily
      && (c.deltas || []).some((d) => {
        const sameFamily = d.feature === hyp.feature
          || d.feature.startsWith(hyp.featureFamily)
          || (hyp.featureFamily === "threats" && d.feature.startsWith("threat"))
          || (hyp.featureFamily === "interaction" && (d.feature.startsWith("ix_") || d.feature.includes("interaction")));
        if (!sameFamily) return false;
        const dir = d.delta > 0.05 ? "high_greater" : d.delta < -0.05 ? "high_lesser" : "near_zero";
        return dir === hyp.observedDirection;
      }));

    const contradicting = cohorts.filter((c) =>
      c.commanderIdentity !== hyp.commanderFamily
      && (c.deltas || []).some((d) => {
        const relevant = d.feature === hyp.feature
          || (hyp.featureFamily === "threats" && d.feature === "threatDensity")
          || (hyp.featureFamily === "interaction" && d.feature === "interactionDensity");
        if (!relevant || Math.abs(d.delta) < 1) return false;
        const dir = d.delta > 0.05 ? "high_greater" : "high_lesser";
        return dir !== hyp.observedDirection && dir !== "near_zero";
      }));

    let status = "insufficient_sample";
    if (others.length >= 2 && contradicting.length === 0) status = "transfer_supported";
    else if (others.length >= 1 && contradicting.length >= 1) status = "transfer_mixed";
    else if (contradicting.length >= 2) status = "transfer_rejected";
    else if (others.length === 1) status = "transfer_lead";

    results.push(freeze({
      hypothesisId: hyp.id,
      featureFamily: hyp.featureFamily,
      sourceCommander: hyp.commanderFamily,
      supportingCommanders: freeze([...new Set(others.map((c) => c.commanderIdentity))]),
      contradictingCommanders: freeze([...new Set(contradicting.map((c) => c.commanderIdentity))]),
      status,
      assumeTransfer: false,
      note: "Validation only — do not assume transfer into Brain v2.",
    }));
  }

  // Also probe compact-combo partner shells for threat-lean hypothesis specifically.
  const threatLeads = (hypothesesBatch?.hypotheses || []).filter((h) =>
    h.featureFamily === "threats" && h.observedDirection === "high_lesser");
  if (threatLeads.length) {
    const partnerShells = cohorts.filter((c) => c.partner === true);
    const lean = partnerShells.filter((c) =>
      (c.deltas || []).some((d) => d.feature === "threatDensity" && d.delta < -2));
    const fat = partnerShells.filter((c) =>
      (c.deltas || []).some((d) => d.feature === "threatDensity" && d.delta > 2));
    results.push(freeze({
      hypothesisId: "probe:compact_combo_threat_lean",
      featureFamily: "threats",
      sourceCommander: threatLeads[0].commanderFamily,
      supportingCommanders: freeze(lean.map((c) => c.commanderIdentity)),
      contradictingCommanders: freeze(fat.map((c) => c.commanderIdentity)),
      status: lean.length && fat.length
        ? "transfer_mixed"
        : lean.length >= 2
          ? "transfer_supported"
          : lean.length === 1
            ? "transfer_lead"
            : "insufficient_sample",
      assumeTransfer: false,
      note: "Compact-combo / partner shell probe for lean threat density.",
    }));
  }

  return freeze({
    version: "cross-commander-transfer-v1",
    results: freeze(results),
  });
}

/**
 * Focused Rograkh/Thrasios + Kinnan + interaction/role synthesis.
 */
export function synthesizeLevelAFindings(levelABatch = null) {
  const cohorts = levelABatch?.cohorts || [];
  const rogThras = cohorts.filter((c) =>
    /rograkh/i.test(c.commanderIdentity) && /thrasios/i.test(c.commanderIdentity));
  const kinnan = cohorts.filter((c) => /^kinnan,/i.test(c.commanderIdentity));

  const threatFindings = rogThras.map((c) => freeze({
    eventId: c.eventId,
    threatDelta: (c.deltas || []).find((d) => d.feature === "threatDensity") || null,
    highDecomposition: c.highThreatDecomposition,
    lowDecomposition: c.lowThreatDecomposition,
    interpretation: interpretThreatDecomp(c),
  }));

  const spellFindings = kinnan.map((c) => freeze({
    eventId: c.eventId,
    spellDelta: (c.deltas || []).find((d) => d.feature === "spells") || null,
    highDecomposition: c.highSpellDecomposition,
    lowDecomposition: c.lowSpellDecomposition,
    interpretation: interpretSpellDecomp(c),
  }));

  const interactionFindings = cohorts.map((c) => {
    const density = (c.deltas || []).find((d) => d.feature === "interactionDensity");
    const count = (c.deltas || []).find((d) => d.feature === "interactionCount");
    const flex = (c.deltas || []).find((d) => d.feature === "ix_flexible");
    const narrow = (c.deltas || []).find((d) => d.feature === "ix_narrow_or_heavy");
    const stack = (c.deltas || []).find((d) => d.feature === "ix_stack");
    let shape = "unclear";
    if (count && flex && count.delta > 0 && flex.delta > 0) shape = "more_and_better_shaped";
    else if (count && count.delta > 0 && (flex?.delta || 0) <= 0) shape = "more_but_not_better_shaped";
    else if (flex && flex.delta > 0 && (count?.delta || 0) <= 0) shape = "better_shaped_not_more";
    else if (narrow && narrow.delta < 0 && (count?.delta || 0) >= 0) shape = "less_narrow_heavy";
    return freeze({
      eventId: c.eventId,
      commanderIdentity: c.commanderIdentity,
      interactionDensityDelta: density?.delta ?? null,
      interactionCountDelta: count?.delta ?? null,
      stackDelta: stack?.delta ?? null,
      flexibleDelta: flex?.delta ?? null,
      narrowHeavyDelta: narrow?.delta ?? null,
      highIx: c.highInteractionDecomposition,
      lowIx: c.lowInteractionDecomposition,
      shapeVerdict: shape,
    });
  });

  const roleBalance = cohorts.map((c) => freeze({
    eventId: c.eventId,
    commanderIdentity: c.commanderIdentity,
    highFingerprint: c.highFingerprint,
    lowFingerprint: c.lowFingerprint,
    winningSignal: inferWinningSignal(c),
  }));

  return freeze({
    version: "level-a-synthesis-v1",
    rograkhThrasiosThreat: freeze({
      cohorts: threatFindings,
      summary: threatFindings.length
        ? threatFindings[0].interpretation
        : "No Rograkh/Thrasios Level-A cohort in this batch.",
    }),
    kinnanSpells: freeze({
      cohorts: spellFindings,
      summary: spellFindings.length
        ? spellFindings[0].interpretation
        : "No Kinnan Level-A cohort in this batch.",
    }),
    interactionDensity: freeze({
      findings: freeze(interactionFindings),
      moreVsBetter: summarizeMoreVsBetter(interactionFindings),
    }),
    roleBalance: freeze({
      fingerprints: freeze(roleBalance),
      dominantSignals: freeze(roleBalance.map((r) => r.winningSignal).filter(Boolean)),
    }),
  });
}

function interpretThreatDecomp(cohort) {
  const high = cohort.highThreatDecomposition || {};
  const low = cohort.lowThreatDecomposition || {};
  const keys = [...new Set([...Object.keys(high), ...Object.keys(low)])];
  const diffs = keys.map((k) => ({
    subtype: k,
    high: high[k] || 0,
    low: low[k] || 0,
    delta: round((high[k] || 0) - (low[k] || 0)),
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = diffs[0];
  if (!top) return "Threat role present but subtypes unresolved.";
  if (top.subtype === "standalone_threat" && top.delta < 0) {
    return "Converters appear leaner on standalone threats; combo/value components may be preserved — taxonomy may be too broad.";
  }
  if (top.subtype === "combo_component" && top.delta >= 0 && (diffs.find((d) => d.subtype === "standalone_threat")?.delta || 0) < 0) {
    return "Threat Δ is driven by fewer standalone bodies while combo components stay similar — supports taxonomy blind spot over raw threat aversion.";
  }
  return `Largest threat-subtype shift: ${top.subtype} Δ ${top.delta}. Broad role:threat may be aggregating dissimilar functions.`;
}

function interpretSpellDecomp(cohort) {
  const high = cohort.highSpellDecomposition || {};
  const low = cohort.lowSpellDecomposition || {};
  const keys = [...new Set([...Object.keys(high), ...Object.keys(low)])];
  const diffs = keys.map((k) => ({
    kind: k,
    high: high[k] || 0,
    low: low[k] || 0,
    delta: round((high[k] || 0) - (low[k] || 0)),
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = diffs.slice(0, 3);
  if (!top.length) return "Spell composition unresolved.";
  return `Extra spells in converters concentrate in: ${top.map((t) => `${t.kind} (Δ ${t.delta})`).join(", ")} — not raw spell count alone.`;
}

function inferWinningSignal(cohort) {
  const deltas = cohort.strongestDeltas || [];
  if (!deltas.length) return null;
  const top = deltas[0];
  const shareTwin = deltas.find((d) => d.feature === `${top.feature}Share` || d.feature.endsWith("Share"));
  if (shareTwin && Math.sign(shareTwin.delta) === Math.sign(top.delta)) {
    return freeze({ kind: "quantity_and_share", feature: top.feature, delta: top.delta });
  }
  if (/ix_flexible|spell_interaction|threat_combo/.test(top.feature)) {
    return freeze({ kind: "composition_or_multifunction", feature: top.feature, delta: top.delta });
  }
  if (/packageCore|weakSlot|redundancy/.test(top.feature)) {
    return freeze({ kind: "balance_or_tightness", feature: top.feature, delta: top.delta });
  }
  return freeze({ kind: "raw_quantity", feature: top.feature, delta: top.delta });
}

function summarizeMoreVsBetter(findings) {
  const counts = {};
  for (const f of findings) {
    counts[f.shapeVerdict] = (counts[f.shapeVerdict] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return freeze({
    distribution: freeze(Object.fromEntries(sorted)),
    dominant: sorted[0]?.[0] || "unclear",
  });
}

/**
 * Pick highest-confidence Brain v2 *candidate* (report only — never implement).
 */
export function selectHighestConfidenceBrainV2Candidate({
  hypothesesBatch = null,
  brainClassifications = null,
  synthesis = null,
  quality = null,
} = {}) {
  const gate = freeze({
    requiresLevelA: true,
    requiresReplicationOrStrongTransfer: true,
    requiresSemanticCoverage: true,
    requiresEffectMagnitude: true,
    requiresAntiNetdeck: true,
    singleEventIsLeadOnly: true,
  });

  const eligible = (brainClassifications?.classifications || [])
    .filter((row) => row.brainV2Eligible && row.replicationStatus === "replicated")
    .sort((a, b) => b.confidence - a.confidence);

  if (eligible.length) {
    return freeze({
      implementBrainV2: false,
      brainV1RemainsFrozen: true,
      evidenceGate: gate,
      candidate: freeze({
        kind: "replicated_level_a_structure",
        hypothesisId: eligible[0].hypothesisId,
        feature: eligible[0].feature,
        classification: eligible[0].classification,
        confidence: eligible[0].confidence,
        weightedEffect: eligible[0].weightedEffect,
        summary: `Replicated Level-A signal on ${eligible[0].featureFamily || eligible[0].feature}: Brain classification ${eligible[0].classification}`,
        priority: "high",
      }),
      note: "Highest-confidence replicated evidence. Still observation-only — Validation Harness required before any Brain change.",
    });
  }

  // Fall back to strongest single-event lead with diagnostic value (still not Brain v2 evidence).
  const threat = synthesis?.rograkhThrasiosThreat?.cohorts?.[0];
  const kinnan = synthesis?.kinnanSpells?.cohorts?.[0];
  const interaction = synthesis?.interactionDensity?.moreVsBetter;

  let candidate = null;
  if (threat?.threatDelta && Math.abs(threat.threatDelta.delta) >= 8) {
    candidate = freeze({
      kind: "single_event_taxonomy_lead",
      summary: "Rograkh/Thrasios threat Δ is large — decompose threat role before any Brain weight change",
      evidence: threat,
      priority: "research_lead",
      brainV2Eligible: false,
    });
  } else if (kinnan?.spellDelta && Math.abs(kinnan.spellDelta.delta) >= 3) {
    candidate = freeze({
      kind: "single_event_composition_lead",
      summary: "Kinnan spell Δ needs composition explanation before treating spell count as a principle",
      evidence: kinnan,
      priority: "research_lead",
      brainV2Eligible: false,
    });
  } else if (interaction?.dominant && interaction.dominant !== "unclear") {
    candidate = freeze({
      kind: "interaction_shape_lead",
      summary: `Interaction signal leans ${interaction.dominant}`,
      evidence: interaction,
      priority: "research_lead",
      brainV2Eligible: false,
    });
  }

  return freeze({
    implementBrainV2: false,
    brainV1RemainsFrozen: true,
    evidenceGate: gate,
    semanticCoverageRate: quality?.semanticCoverageRate ?? null,
    candidate,
    note: candidate
      ? "No replicated Level-A hypothesis cleared the Brain v2 evidence gate. Returning strongest research lead only."
      : "No Brain v2 candidate cleared the evidence gate in this batch.",
  });
}
