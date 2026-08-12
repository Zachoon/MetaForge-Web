// =============================================================================
// Strategic Evaluation v0 — judgment without construction
// =============================================================================
// Answers: "Was this strategic decision coherent?"
// Does NOT pick cards. Does NOT mutate Brain. Does NOT simulate games.
// Simulation (later) is a witness for the Evaluator — not the judge.
// writesToBrain: false
// =============================================================================

import { selectRelevantHypotheses, badgeForHypothesis } from "./strategic-stance-voice.mjs";
import { getStrategicConcept } from "./knowledge/strategic-concept.mjs";

const freeze = (value) => Object.freeze(value);

/**
 * Evaluate a player or Forge strategic decision against commission + knowledge.
 *
 * @example
 * evaluateStrategicDecision({
 *   decision: { kind: "cut_add", cut: "Smothering Tithe", add: "Swan Song", rationale: "..." },
 *   commission: { fantasyLabel: "Superfriends", priorities: ["theme"] },
 *   commanderName: "Atraxa, Praetors' Voice",
 * })
 */
export function evaluateStrategicDecision({
  decision = null,
  commission = null,
  commanderName = "",
  selected = null,
  hypotheses = null,
  tablet = null,
} = {}) {
  if (!decision || (!decision.kind && !decision.summary && !decision.cut && !decision.add)) {
    return freeze({
      writesToBrain: false,
      ok: false,
      reason: "missing_decision",
      note: "Strategic Evaluation needs a decision to critique — not a deck score.",
    });
  }

  const kind = decision.kind
    || (decision.cut || decision.add ? "cut_add" : "freeform");
  const summary = decision.summary
    || (kind === "cut_add"
      ? `Cut ${decision.cut || "—"} for ${decision.add || "—"}`
      : String(decision.text || decision.rationale || "Strategic decision"));

  const pros = [];
  const cons = [];
  const tradeoff = [];
  const evidenceNotes = [];

  const fantasy = commission?.playerFantasy?.label
    || commission?.fantasyLabel
    || null;
  const priorities = [
    ...(commission?.playerFantasy?.priorities || []),
    ...(commission?.priorities || []),
    ...(commission?.requestRecognition?.priorities || []),
  ].map((p) => String(p).toLocaleLowerCase("en"));
  const themeFirst = priorities.some((p) => /theme|fantasy|walker|planeswalker|superfriend/i.test(p))
    || /superfriend|planeswalker|theme/i.test(fantasy || "");

  const ledger = selected?.slotJustificationLedger;
  const cutName = decision.cut || "";
  const addName = decision.add || "";
  const cutSlot = cutName
    ? ledger?.byName?.[String(cutName).toLocaleLowerCase("en")]
      || ledger?.slots?.find((s) => String(s.name).toLocaleLowerCase("en") === String(cutName).toLocaleLowerCase("en"))
    : null;

  if (cutSlot?.flags?.weaklyJustified) {
    pros.push(`Cutting ${cutName} removes a weakly justified slot relative to the plan.`);
  }
  if (cutSlot?.flags?.redundant) {
    pros.push(`Cutting ${cutName} reduces redundancy in a package that already looks thick.`);
  }
  if (cutSlot?.flags?.rawPowerDominant) {
    pros.push(`Cutting ${cutName} drops a raw-power piece that was not carrying the commission.`);
  }
  if (addName) {
    pros.push(`Adding ${addName} is framed as covering a strategic job the list under-serves.`);
  }
  if (tablet?.expectedBenefit) {
    pros.push(String(tablet.expectedBenefit).replace(/\(.*?%.*?\)/g, "").replace(/\s+/g, " ").trim());
  }

  if (themeFirst && /cut two planeswalkers|cut.*walker|fewer planeswalker/i.test(summary)) {
    cons.push("Thinning planeswalkers can weaken the requested fantasy even when interaction improves resilience.");
    tradeoff.push("Supports removal-heavy metas. Weakens inevitability / theme payoff density.");
  }
  if (themeFirst && cutName && /tithe|rhystic|smothering|esper sentinel|esper/i.test(cutName)) {
    cons.push(`If the commission prioritized theme/planeswalker density, cutting ${cutName} may be coherent — but verify you are not thinning generic value the table still punishes.`);
  }
  if (themeFirst && addName && /counterspell|swan song|force of will|force of negation|dovin's veto/i.test(addName)) {
    pros.push(`${addName} can protect the commission's payoff pieces without forcing a generic midrange shell.`);
    tradeoff.push("Supports removal-/permission-heavy metas; may slightly reduce raw ramp/value density.");
  }
  if (tablet?.tradeoff) {
    tradeoff.push(String(tablet.tradeoff));
  }
  if (!cons.length && cutName && !cutSlot) {
    cons.push(`Limited ledger evidence on ${cutName} — evaluation is incomplete, not absent.`);
  }
  if (!pros.length) {
    pros.push("Decision is intelligible as a structural trade, but evidence is still thin.");
  }
  if (!tradeoff.length) {
    tradeoff.push("Exact table impact depends on whether the pod punishes the kept plan or the cut plan.");
  }

  // Era 1 ↔ Era 2 bridge: cite Strategic Concepts when the list decision earns them.
  // Naming is not promotion. Brain inheritance stays none.
  const conceptsCited = [];
  const planIntegrity = getStrategicConcept("plan-integrity");
  const commitmentTiming = getStrategicConcept("commitment-timing");
  const citesPlanIntegrity = Boolean(
    cutSlot?.flags?.weaklyJustified
    || cutSlot?.flags?.rawPowerDominant
    || (themeFirst && addName && /counterspell|swan song|force of will|force of negation|dovin's veto|protection|teferi/i.test(addName))
    || (themeFirst && cutName && /tithe|rhystic|smothering|esper sentinel/i.test(cutName)),
  );
  const citesCommitmentTiming = Boolean(
    addName && /counterspell|swan song|force of will|force of negation|dovin's veto|path to exile|swords to plowshares|generous gift/i.test(addName)
    || (cutName && /counterspell|force of will|swan song/i.test(cutName)),
  );
  if (citesPlanIntegrity && planIntegrity) {
    conceptsCited.push(freeze({
      id: planIntegrity.id,
      name: planIntegrity.name,
      relation: "strengthens",
      note: "List decision framed as protecting / concentrating the primary commission plan.",
      confidence: planIntegrity.confidence,
    }));
    pros.push(`Plan Integrity: this cut/add reads as protecting the commission's primary line rather than diluting it with local value.`);
    evidenceNotes.push(`Strategic Concept: ${planIntegrity.name} (${planIntegrity.status}, ${planIntegrity.confidence.level})`);
  }
  if (citesCommitmentTiming && commitmentTiming && !conceptsCited.some((c) => c.id === "commitment-timing")) {
    // Cite when adding finite answers (list prepares scarce resources) — not when cutting them away without plan frame.
    if (addName && /counterspell|swan song|force of will|force of negation|dovin's veto|path to exile|swords to plowshares|generous gift/i.test(addName)) {
      conceptsCited.push(freeze({
        id: commitmentTiming.id,
        name: commitmentTiming.name,
        relation: "strengthens",
        note: "List prepares a finite answer budget — structural precondition for Commitment Timing in play.",
        confidence: commitmentTiming.confidence,
      }));
      pros.push(`Commitment Timing: adding ${addName} prepares a scarce answer for higher-leverage future exchanges.`);
      evidenceNotes.push(`Strategic Concept: ${commitmentTiming.name} (${commitmentTiming.status}, ${commitmentTiming.confidence.level})`);
    }
  }

  const relevant = selectRelevantHypotheses({ commanderName, hypotheses, limit: 2 });
  for (const hyp of relevant) {
    evidenceNotes.push(`${badgeForHypothesis(hyp)?.title || hyp.state}: ${hyp.claim}`);
  }
  if (commission?.matchPercent != null) {
    evidenceNotes.push(`Commission match context: ${commission.matchPercent}%`);
  }

  const evidence = freeze({
    tournament: relevant.some((h) => h.evidence?.tournament === "high") ? "high"
      : relevant.some((h) => h.evidence?.tournament === "medium") ? "medium"
        : planIntegrity && citesPlanIntegrity && planIntegrity.evidence?.tournament === "medium" ? "medium"
          : commanderName ? "low" : "none",
    experts: relevant.some((h) => h.evidence?.experts === "high") ? "medium"
      : (citesPlanIntegrity && planIntegrity?.evidence?.experts === "medium")
        || (citesCommitmentTiming && commitmentTiming?.evidence?.experts === "high")
        || (citesCommitmentTiming && commitmentTiming?.evidence?.experts === "medium")
        ? "medium"
        : "none",
    shadow: relevant.some((h) => h.evidence?.shadow && h.evidence.shadow !== "none") ? "mixed" : "none",
    hypothesis: relevant.length ? "linked" : "none",
    concepts: conceptsCited.length ? "linked" : "none",
    notes: freeze(evidenceNotes),
  });

  const confidence = confidenceForEvaluation({ pros, cons, evidence, themeFirst, cutSlot, conceptsCited });

  const alternatives = [];
  if (addName && /swan song/i.test(addName)) {
    alternatives.push(freeze({
      card: "Counterspell",
      tradeoff: "Higher certainty on the stack; less tempo / less modal upside than Swan Song.",
    }));
  }
  if (decision.alternative) {
    alternatives.push(freeze({
      card: decision.alternative.card || decision.alternative,
      tradeoff: decision.alternative.tradeoff || "Different certainty / tempo profile.",
    }));
  }

  return freeze({
    writesToBrain: false,
    ok: true,
    version: "strategic-evaluation-v0.1",
    kind: "StrategicEvaluation",
    activated: false,
    promoted: false,
    brainInheritance: "none",
    decision: freeze({
      kind,
      summary,
      cut: cutName || null,
      add: addName || null,
      rationale: decision.rationale || decision.text || null,
    }),
    pros: freeze(pros.slice(0, 5)),
    cons: freeze(cons.slice(0, 4)),
    strategicTradeoff: freeze(tradeoff.slice(0, 3)),
    evidence,
    confidence,
    alternatives: freeze(alternatives.slice(0, 3)),
    hypothesesLinked: freeze(relevant.map((h) => h.id)),
    conceptsCited: freeze(conceptsCited),
    coachVoice: freeze({
      lead: "Strategic evaluation",
      paragraph: buildCoachEvaluationParagraph({
        summary,
        pros,
        cons,
        tradeoff,
        confidence,
        fantasy,
        conceptsCited,
      }),
      mustNotSay: freeze(["Low score", "Definitely correct", "Brain requires this"]),
    }),
    designForFutureGameplay: freeze({
      question: "Could this evaluation eventually help evaluate an in-game decision?",
      answer: "Yes — tradeoff language (resilience vs inevitability, permission vs value) is state-relevant, not just list-relevant. Concept citations (e.g. Plan Integrity) are shared Era 1/Era 2 vocabulary.",
    }),
  });
}

function confidenceForEvaluation({ pros, cons, evidence, themeFirst, cutSlot, conceptsCited = [] }) {
  let score = 0.35;
  if (cutSlot) score += 0.15;
  if (themeFirst) score += 0.1;
  if (evidence.tournament === "high") score += 0.2;
  else if (evidence.tournament === "medium") score += 0.1;
  if (evidence.hypothesis === "linked") score += 0.1;
  if (conceptsCited.length) score += 0.08;
  if (pros.length >= 2 && cons.length >= 1) score += 0.05;
  const level = score >= 0.75 ? "high" : score >= 0.5 ? "moderate" : score >= 0.35 ? "limited" : "insufficient";
  return freeze({ level, score: Number(score.toFixed(3)) });
}

function buildCoachEvaluationParagraph({
  summary,
  pros,
  cons,
  tradeoff,
  confidence,
  fantasy,
  conceptsCited = [],
}) {
  const pro = pros[0] || "";
  const con = cons[0] || "";
  const trade = tradeoff[0] || "";
  const commissionBit = fantasy ? ` under a "${fantasy}" commission` : "";
  const conceptBit = conceptsCited[0] ? ` Concept: ${conceptsCited[0].name}.` : "";
  return `Evaluating “${summary}”${commissionBit}: ${pro}${con ? ` However, ${con.charAt(0).toLowerCase()}${con.slice(1)}` : ""}${trade ? ` Tradeoff: ${trade}` : ""}${conceptBit} Confidence: ${confidence.level}.`;
}

/**
 * Enrich cut→add recommendation why with a Strategic Evaluation (presentation).
 */
export function evaluateCutAddRecommendation({
  selected = null,
  cut = "",
  add = "",
  tablet = null,
  commission = null,
  commanderName = "",
  hypotheses = null,
} = {}) {
  return evaluateStrategicDecision({
    decision: { kind: "cut_add", cut, add },
    selected,
    tablet,
    commission,
    commanderName,
    hypotheses,
  });
}
