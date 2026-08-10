// =============================================================================
// Strategic Principle Engine — lift FI evidence into principles
// =============================================================================
// Rules, not staples. No Brain mutation. No card-frequency principles.
// =============================================================================

import {
  createStrategicPrinciple,
  derivePrincipleStatus,
  principleFingerprint,
} from "./strategic-principle-schema.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");

const FEATURE_LESSONS = Object.freeze({
  interactionDensity: {
    title: "Connected interaction beats raw interaction count",
    description: "Successful lists distinguish themselves by how interaction wires into the plan, not by packing more counters and removal.",
    missing: "construction_preference_for_plan_connected_interaction",
    understands: "interaction_role_floors_and_density_scores",
  },
  interactionCount: {
    title: "More interaction pieces are not automatically better",
    description: "Raising interaction count without protecting irreplaceable dependencies is a weak strategic signal.",
    missing: "dependency_aware_interaction_selection",
    understands: "interaction_count_floors",
  },
  meaningfulEdgeDensity: {
    title: "Meaningful strategic edges matter more than card co-occurrence",
    description: "Converters tend to show denser semantically supported relationships among interactive and plan pieces.",
    missing: "strategic_edge_density_in_construction",
    understands: "producer_payoff_graph_without_topology_roles",
  },
  planConnectedInteractionRatio: {
    title: "Interaction should connect to the deck's own plan",
    description: "Isolated answers underperform plan-connected interaction that protects or advances engines and win sequences.",
    missing: "plan_connected_interaction_preference",
    understands: "generic_interaction_roles",
  },
  isolatedInteractiveRatio: {
    title: "Isolated interactive pieces are a liability",
    description: "Converters show fewer interactive cards that lack partners, package membership, or commander connection.",
    missing: "penalty_for_isolated_interaction",
    understands: "interaction_slots_without_partner_requirement",
  },
  multifunctionInteractionRatio: {
    title: "Multifunction interaction outperforms single-purpose answers",
    description: "Interaction that also draws, tutors, ramps, or enables a package carries more strategic weight when wired.",
    missing: "multifunction_interaction_preference",
    understands: "single_role_classification",
  },
  commanderProtectionCoverage: {
    title: "Protect irreplaceable commanders when they are the plan",
    description: "Successful lists cover commander-critical lines with protection rather than only generic stack interaction.",
    missing: "commander_protection_coverage_target",
    understands: "protection_role_floor",
  },
  engineProtectionCoverage: {
    title: "Protect engines, not just permanents in general",
    description: "Converters more often place protection on value engines that the strategy cannot easily replace.",
    missing: "engine_protection_targeting",
    understands: "generic_protection_roles",
  },
  winSequenceProtectionCoverage: {
    title: "Protect the combo or close turn",
    description: "Winning lists more consistently cover win-sequence pieces than merely increasing interaction volume.",
    missing: "win_sequence_protection_coverage",
    understands: "interaction_without_sequence_targeting",
  },
  strongEdgeCount: {
    title: "Strong semantic relationships outperform co-occurrence",
    description: "High performers accumulate more semantically supported strategic edges than lower placers with the same commander.",
    missing: "strong_edge_construction_signal",
    understands: "weak_cooccurrence_edges",
  },
});

const SEQUENCE_LESSONS = Object.freeze({
  setup_engine_payoff: {
    title: "Setup must reach an engine before a payoff",
    description: "Structural chains of setup → engine → payoff recur in successful lists; decklist order is not play order.",
    missing: "sequence_coverage_for_setup_engine_payoff",
  },
  tutor_win_protection: {
    title: "Tutors need a protected path to the win piece",
    description: "Successful structures repeatedly pair tutoring with protection around the close, not tutor density alone.",
    missing: "tutor_to_win_protection_sequence",
  },
  gy_fill_reanimate_protect: {
    title: "Graveyard plans need fill, reanimation, and protection together",
    description: "Reanimator-shaped success covers the full structural chain rather than isolated recursion pieces.",
    missing: "gy_fill_reanimate_protect_sequence",
  },
  mana_commander_payoff: {
    title: "Mana acceleration should unlock commander-linked payoffs",
    description: "Acceleration without a convert/close path is a weaker structural signal than sequenced mana → commander → payoff.",
    missing: "mana_commander_payoff_sequence",
  },
  silence_combo_sequence: {
    title: "Silence and path-clear belong next to the combo turn",
    description: "Path-clear and silence effects gain value when structurally associated with close pieces.",
    missing: "silence_combo_sequence_coverage",
  },
});

function lessonForFeature(feature, direction, family) {
  const pack = FEATURE_LESSONS[feature] || {
    title: `Structural signal on ${feature}`,
    description: direction === "high_greater"
      ? `Converters show more/better ${feature} than lower placers in controlled same-commander comparisons.`
      : `Converters show less ${feature} than lower placers — quantity alone is not the lesson.`,
    missing: `construction_representation_of_${normalized(feature)}`,
    understands: "role_and_density_priors",
  };
  const scope = family ? ` within ${family}` : "";
  return freeze({
    title: pack.title,
    description: `${pack.description}${scope}`,
    whatAppearsMissing: pack.missing,
    whatBrainV1Understands: pack.understands,
    lesson: [
      `Academy lesson${scope}: ${pack.title}.`,
      pack.description,
      direction === "high_greater"
        ? "Do not learn a staple list — learn the structural rule that produced the density advantage."
        : "The absence or reduction of this signal among converters is itself informative.",
      "This remains a candidate principle until a Validation Harness experiment earns promotion.",
    ].join(" "),
  });
}

function lessonForDiscovery(candidate = {}) {
  const kind = String(candidate.kind || "");
  if (kind.startsWith("sequence")) {
    const seqId = candidate.observedEvidence?.sequenceId || "sequence";
    const pack = SEQUENCE_LESSONS[seqId] || {
      title: `Sequence coverage: ${seqId}`,
      description: "Successful decks cover a recurring structural stage chain.",
      missing: `sequence_coverage_${seqId}`,
    };
    return freeze({
      title: pack.title,
      description: pack.description,
      whatAppearsMissing: candidate.whatAppearsMissing || pack.missing,
      whatBrainV1Understands: candidate.whatBrainV1Understands || "sequenceStages_as_annotations",
      lesson: [
        `Academy lesson: ${pack.title}.`,
        pack.description,
        "Structural sequence dependencies are not reconstructed game orders.",
        "Candidate only — Brain unchanged.",
      ].join(" "),
    });
  }
  if (kind.startsWith("substitution")) {
    return freeze({
      title: "Strategic substitutes share footprints, not frequency",
      description: "Cards that occupy similar topology/package/sequence roles can replace each other without coexisting.",
      whatAppearsMissing: candidate.whatAppearsMissing || "strategic_footprint_substitution",
      whatBrainV1Understands: candidate.whatBrainV1Understands || "budget_power_substitution_audits",
      lesson: "Academy lesson: interchangeable strategic pieces are defined by footprint similarity and rare co-occurrence, not by popularity. Selection behavior remains unchanged.",
    });
  }
  return freeze({
    title: candidate.whatAppearsMissing
      ? `Brain blind spot: ${candidate.whatAppearsMissing}`
      : "Topology blind spot candidate",
    description: "Replicated or high-confidence Field Intelligence evidence points at a structural gap Brain v1 does not represent.",
    whatAppearsMissing: candidate.whatAppearsMissing || "unknown",
    whatBrainV1Understands: candidate.whatBrainV1Understands || "partial_observation",
    lesson: [
      "Academy lesson: MetaForge observed a structural pattern Brain v1 cannot yet express as construction policy.",
      `Missing representation: ${candidate.whatAppearsMissing || "unknown"}.`,
      "Do not activate this as a heuristic — register it as a principle candidate.",
    ].join(" "),
  });
}

function transferFromProbe(hypothesisId, transferBatch = null) {
  const row = (transferBatch?.results || []).find((r) => r.hypothesisId === hypothesisId);
  if (!row) return "commander_specific";
  if (row.status === "transfer_supported") return "cross_family";
  if (row.status === "transfer_mixed") return "mixed";
  if ((row.supportingCommanders || []).length > 1) return "family_specific";
  return "commander_specific";
}

function brainNote(hypothesisId, classifications = null) {
  const row = (classifications?.classifications || []).find((c) => c.hypothesisId === hypothesisId);
  if (!row) return null;
  return freeze({
    classification: row.classification,
    note: row.note,
    brainSurface: row.brainSurface,
  });
}

/**
 * Lift performance structure hypotheses into principles.
 * Card frequency alone never creates a principle.
 */
export function liftPrinciplesFromHypotheses(hypothesesBatch = null, options = {}) {
  const principles = [];
  for (const hyp of hypothesesBatch?.hypotheses || []) {
    // Reject near-zero / insufficient — not principles yet.
    if (hyp.replicationStatus === "insufficient_sample") continue;
    if (Math.abs(hyp.weightedEffect || 0) < 0.05 && (hyp.confidence || 0) < 0.4) continue;

    const text = lessonForFeature(hyp.feature, hyp.observedDirection, hyp.commanderFamily);
    const brain = brainNote(hyp.id, options.brainClassifications);
    const supporting = hyp.levelAEventsSupporting || [];
    const contradicting = hyp.levelAEventsContradicting || [];
    const status = derivePrincipleStatus({
      supportingCount: supporting.length,
      contradictingCount: contradicting.length,
      confidence: hyp.confidence,
    });
    // Map contradicted/mixed hypothesis statuses explicitly.
    const finalStatus = hyp.replicationStatus === "contradicted"
      ? "contradicted"
      : hyp.replicationStatus === "mixed"
        ? "mixed"
        : status;

    principles.push(createStrategicPrinciple({
      id: principleFingerprint({
        kind: "structure",
        feature: hyp.feature,
        featureFamily: hyp.featureFamily,
        direction: hyp.observedDirection,
        scope: hyp.familyKey || hyp.commanderFamily || "broad",
      }),
      title: text.title,
      description: text.description,
      kind: "structure",
      status: finalStatus,
      feature: hyp.feature,
      featureFamily: hyp.featureFamily,
      observedDirection: hyp.observedDirection,
      confidence: hyp.confidence,
      evidence: {
        supportingEvents: supporting,
        contradictingEvents: contradicting,
        sampleSize: (hyp.totalHighDecks || 0) + (hyp.totalLowDecks || 0),
        independentEvents: supporting.length + contradicting.length,
        commanderFamilies: [hyp.commanderFamily].filter(Boolean),
        transferClass: transferFromProbe(hyp.id, options.crossCommanderTransfer),
        converterAssociation: hyp.observedDirection,
        weightedEffect: hyp.weightedEffect,
      },
      origins: [hyp.id],
      whatBrainV1Understands: brain?.note || text.whatBrainV1Understands,
      whatAppearsMissing: text.whatAppearsMissing,
      lesson: text.lesson,
    }));
  }
  return freeze(principles);
}

/**
 * Lift topology discovery queue candidates into principles.
 */
export function liftPrinciplesFromDiscovery(discovery = null, options = {}) {
  const principles = [];
  for (const candidate of discovery?.candidates || []) {
    if ((candidate.confidence || 0) < (options.minConfidence || 0.45)) continue;
    // Never mint from empty evidence.
    if (!candidate.observedEvidence && !candidate.whatAppearsMissing) continue;

    const text = lessonForDiscovery(candidate);
    const kind = candidate.kind?.startsWith("sequence")
      ? "sequence"
      : candidate.kind?.startsWith("substitution")
        ? "substitution"
        : candidate.kind?.startsWith("package")
          ? "package"
          : candidate.kind?.startsWith("semantic")
            ? "semantic"
            : "topology";

    const supporting = [];
    if (candidate.observedEvidence?.eventId) supporting.push(candidate.observedEvidence.eventId);
    const independentEvents = Number(candidate.independentEvents) || supporting.length || 1;
    // Discovery candidates stay candidate/replicated_candidate until real multi-event
    // supporting IDs exist — do not fabricate promotable from independentEvents alone.
    let status = "candidate";
    if ((candidate.contradictions || []).length > 0) {
      status = supporting.length > 0 ? "mixed" : "contradicted";
    } else if (independentEvents >= 2 && candidate.confidence >= 0.55) {
      status = "replicated_candidate";
    }
    // Only true multi-event supporting lists can reach promotable from discovery.
    if (supporting.length >= 2 && (candidate.contradictions || []).length === 0 && candidate.confidence >= 0.75) {
      status = "promotable";
    }

    const feature = candidate.observedEvidence?.feature
      || candidate.observedEvidence?.sequenceId
      || candidate.whatAppearsMissing
      || candidate.id;

    principles.push(createStrategicPrinciple({
      id: principleFingerprint({
        kind,
        feature,
        featureFamily: feature,
        direction: candidate.observedEvidence?.direction || "signal",
        scope: candidate.observedEvidence?.commanderIdentity || candidate.transferClass || "broad",
        sequenceId: candidate.observedEvidence?.sequenceId,
        missing: candidate.whatAppearsMissing,
      }),
      title: text.title,
      description: text.description,
      kind,
      status: status,
      feature: typeof feature === "string" ? feature : null,
      sequenceId: candidate.observedEvidence?.sequenceId || null,
      confidence: candidate.confidence,
      evidence: {
        supportingEvents: supporting,
        contradictingEvents: candidate.contradictions || [],
        sampleSize: candidate.sampleSize || 0,
        independentEvents,
        commanderFamilies: candidate.observedEvidence?.commanderIdentity
          ? [candidate.observedEvidence.commanderIdentity]
          : [],
        transferClass: candidate.transferClass || "commander_specific",
        converterAssociation: candidate.converterAssociation || null,
        weightedEffect: candidate.observedEvidence?.delta ?? null,
      },
      origins: [candidate.id],
      whatBrainV1Understands: text.whatBrainV1Understands,
      whatAppearsMissing: text.whatAppearsMissing,
      lesson: text.lesson,
    }));
  }
  return freeze(principles);
}

/**
 * Lift all FI surfaces into a deduped principle list (pre-merge).
 */
export function liftStrategicPrinciples({
  performanceHypotheses = null,
  topologyDiscovery = null,
  brainClassifications = null,
  crossCommanderTransfer = null,
} = {}) {
  const fromHyp = liftPrinciplesFromHypotheses(performanceHypotheses, {
    brainClassifications,
    crossCommanderTransfer,
  });
  const fromDisc = liftPrinciplesFromDiscovery(topologyDiscovery);
  const byId = new Map();
  for (const principle of [...fromHyp, ...fromDisc]) {
    const prev = byId.get(principle.id);
    if (!prev || principle.confidence > prev.confidence) {
      // Merge origins if colliding.
      if (prev) {
        byId.set(principle.id, createStrategicPrinciple({
          ...principle,
          origins: [...new Set([...(prev.origins || []), ...(principle.origins || [])])],
          evidence: {
            ...principle.evidence,
            supportingEvents: [...new Set([
              ...(prev.evidence?.supportingEvents || []),
              ...(principle.evidence?.supportingEvents || []),
            ])],
            contradictingEvents: [...new Set([
              ...(prev.evidence?.contradictingEvents || []),
              ...(principle.evidence?.contradictingEvents || []),
            ])],
            commanderFamilies: [...new Set([
              ...(prev.evidence?.commanderFamilies || []),
              ...(principle.evidence?.commanderFamilies || []),
            ])],
            sampleSize: Math.max(prev.evidence?.sampleSize || 0, principle.evidence?.sampleSize || 0),
            independentEvents: Math.max(
              prev.evidence?.independentEvents || 0,
              principle.evidence?.independentEvents || 0,
            ),
            transferClass: principle.evidence?.transferClass || prev.evidence?.transferClass,
            converterAssociation: principle.evidence?.converterAssociation,
            weightedEffect: principle.evidence?.weightedEffect ?? prev.evidence?.weightedEffect,
          },
        }));
      } else {
        byId.set(principle.id, principle);
      }
    }
  }
  return freeze([...byId.values()].sort((a, b) =>
    b.confidence - a.confidence || a.id.localeCompare(b.id)));
}

/**
 * Card frequency / co-occurrence alone must not mint principles.
 */
export function rejectFrequencyOnlyPrinciple({ cardName, frequency, semanticSupport = false } = {}) {
  if (!semanticSupport) {
    return freeze({
      accepted: false,
      reason: "card_frequency_or_cooccurrence_alone",
      cardName: cardName || null,
      frequency: frequency ?? null,
    });
  }
  return freeze({ accepted: false, reason: "frequency_path_forbidden_even_with_support_flag" });
}
