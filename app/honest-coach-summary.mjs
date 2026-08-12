// =============================================================================
// Honest Coach v0.2 — surface Brain v1 reasoning for players
// =============================================================================
// Presentation only. Does not change construction. Does not import research
// vocabulary (Coverage / Capability / Seat / Decision Pattern / Cognition).
// Allowed product language: plan, package, role, commander connection,
// weak slot, justification, cohesion, confidence.
// =============================================================================

import {
  buildHonestCoachAnalysisId,
  buildHonestCoachRecommendationId,
  classifyRecommendationReason,
} from "./honest-coach-ids.mjs";
import {
  buildStrategyVsSystemRead,
  deepForgeEmptyCopy,
} from "./deck-understanding.mjs";
import {
  evaluateNarrativeIntegrityForCoach,
  normalizeNarrativeName,
} from "./narrative-integrity.mjs";
import { buildStrategicRecognition } from "./strategic-recognition.mjs";
import { buildPilotStory } from "./pilot-model.mjs";
import { buildRequestRecognition } from "./request-recognition.mjs";
import {
  applyFantasyNarrator,
  buildCommissionContract,
} from "./commission-contract.mjs";
import {
  buildDeepForgeUnderstandingDossier,
  buildHonestCoachWatchingVoice,
} from "./strategic-stance-voice.mjs";
import {
  buildDeepForgeConceptDossier,
  buildHonestCoachConceptVoice,
} from "./concept-stance-voice.mjs";
import { evaluateCutAddRecommendation } from "./strategic-evaluation.mjs";

const freeze = (value) => Object.freeze(value);

/** Phrases that sound like coaching but do not tell a new player the plan. */
export const VAGUE_COACH_PHRASES = freeze([
  "Built for your commander",
  "Built For Your Commander",
  "Advance the main game plan",
  "Opening trials are still resolving",
  "Watch for things that stop the plan",
  "Still resolving",
  "Awaiting trials",
  "Balanced Midrange",
  "balanced midrange",
  "Adapted From Your List",
  "Turn momentum into pressure",
  "Reliable opening hands",
  "Reliable Opening Hands",
]);

const PACKAGE_PLAN_STORY = freeze({
  "Aura package": freeze({
    title: "Aura Engine",
    theme: "auras",
    plan: (commander) =>
      `Your deck wants to flood the board with auras, land ${commander}, and keep stacking enchantments until every spell advances multiple pieces of your board.`,
    early: (commander) =>
      `Develop mana, play cheap auras and setup pieces, land ${commander}, then begin stacking enchantments onto the protected threat.`,
    mid: (commander) =>
      `The deck becomes dangerous once ${commander} stays online for a turn or two with multiple auras attached and you can protect the stack.`,
    stop: (commander) =>
      `Removal aimed at ${commander} or enchantment sweepers will slow you down dramatically. If you expect those effects, hold a protective piece or a backup payoff instead of committing everything.`,
  }),
  "Equipment package": freeze({
    title: "Equipment Value Engine",
    theme: "equipment",
    plan: (commander) =>
      `Your deck wants to flood the battlefield with equipment and cheap artifacts, land ${commander}, and repeatedly turn those pieces into larger threats and value until opponents can't keep up.`,
    early: (commander) =>
      `Develop mana with rocks and cheap artifacts or equipment. Land ${commander}. Begin converting inexpensive pieces into larger threats. Protect ${commander} if possible.`,
    mid: (commander) =>
      `The deck becomes dangerous once ${commander} survives for several turns and each new artifact or equipment creates more pressure than the table can answer.`,
    stop: (commander) =>
      `Removal aimed at ${commander} or artifact sweepers will slow you down dramatically. If you expect those effects, hold back one value engine instead of committing everything.`,
  }),
  "Aristocrats package": freeze({
    title: "Sacrifice Engine",
    theme: "aristocrats",
    plan: (commander) =>
      `Your deck wants to make expendable creatures, sacrifice them for value, and let ${commander} convert those deaths into card advantage and lethal pressure.`,
    early: (commander) =>
      `Develop mana, deploy cheap token makers or fodder, land ${commander}, then start converting creatures into value without emptying your board entirely.`,
    mid: (commander) =>
      `The deck becomes dangerous once sacrifice outlets and death payoffs are both online and ${commander} turns every trade into a net gain.`,
    stop: (commander) =>
      `Graveyard hate, exile-based removal on ${commander}, and boards that refuse to die cleanly will stall the engine. Keep a second outlet or payoff in hand when those answers are likely.`,
  }),
  "Reanimator package": freeze({
    title: "Reanimator Plan",
    theme: "reanimator",
    plan: (commander) =>
      `Your deck wants to fill the graveyard with powerful targets, then use ${commander} and reanimation spells to cheat them into play ahead of curve.`,
    early: (commander) =>
      `Develop mana, mill or discard high-impact targets, land ${commander}, then reanimate the first big threat as soon as the setup is ready.`,
    mid: (commander) =>
      `The deck becomes dangerous the moment a reanimated threat sticks and you still have fuel to recur the next one.`,
    stop: (commander) =>
      `Graveyard hate and answers that exile from the yard stop the plan cold. If those are likely, keep a fair threat or alternate win path instead of over-committing to one reanimation.`,
  }),
  "Tokens package": freeze({
    title: "Token Swarm",
    theme: "tokens",
    plan: (commander) =>
      `Your deck wants to flood the board with tokens, let ${commander} amplify that army, and overwhelm the table through go-wide pressure and token payoffs.`,
    early: (commander) =>
      `Develop mana, play early token makers, land ${commander}, then grow the board before opponents can sweep it cleanly.`,
    mid: (commander) =>
      `The deck becomes dangerous once tokens and payoffs are both present and a single sweep no longer resets you to zero.`,
    stop: (commander) =>
      `Board wipes and exile sweepers punish overextension. Hold a follow-up token maker or protective piece when you expect mass removal.`,
  }),
  "Landfall package": freeze({
    title: "Landfall Engine",
    theme: "landfall",
    plan: (commander) =>
      `Your deck wants to keep putting lands into play, trigger landfall repeatedly, and let ${commander} turn those land drops into escalating value and pressure.`,
    early: (commander) =>
      `Develop mana, play ramp and land-search pieces, land ${commander}, then find ways to put an extra land into play each turn.`,
    mid: (commander) =>
      `The deck becomes dangerous once multiple landfall triggers fire in a turn and ${commander} converts them into irreversible board advantage.`,
    stop: (commander) =>
      `Land destruction, graveyard hate on fetch recursion, and removal on ${commander} blunt the snowball. Keep a backup ramp line when those answers are common.`,
  }),
  "Typal package": freeze({
    title: "Tribal Synergy",
    theme: "typal",
    plan: (commander) =>
      `Your deck wants to assemble a critical mass of related creatures, let ${commander} reward that tribe, and win through coordinated tribal pressure.`,
    early: (commander) =>
      `Develop mana, cast on-theme creatures early, land ${commander}, then keep deploying tribal pieces that make each other stronger.`,
    mid: (commander) =>
      `The deck becomes dangerous once the tribe is wide enough that ${commander}'s bonuses turn ordinary creatures into a real army.`,
    stop: (commander) =>
      `Board wipes and targeted removal on ${commander} reset the tribal bonuses. Keep a rebuild piece or protection when those answers are likely.`,
  }),
  "Spellslinger package": freeze({
    title: "Spellslinger Engine",
    theme: "spellslinger",
    plan: (commander) =>
      `Your deck wants to cast a stream of cheap instants and sorceries, let ${commander} reward each spell, and bury the table in incremental advantage.`,
    early: (commander) =>
      `Develop mana, cast cheap cantrips and interaction, land ${commander}, then keep the spell pipeline flowing without emptying your hand.`,
    mid: (commander) =>
      `The deck becomes dangerous once ${commander} is online and every spell draws, copies, or creates a threat as a side effect.`,
    stop: (commander) =>
      `Counter magic, hand disruption, and removal on ${commander} interrupt the loop. Hold interaction for the piece that actually stops your commander.`,
  }),
  "Blink package": freeze({
    title: "Blink Value",
    theme: "blink",
    plan: (commander) =>
      `Your deck wants to enter-the-battlefield value creatures, blink them repeatedly, and let ${commander} turn each flicker into compounding advantage.`,
    early: (commander) =>
      `Develop mana, play ETB creatures, land ${commander}, then start blinking key permanents once you have a reusable flicker effect.`,
    mid: (commander) =>
      `The deck becomes dangerous once blink effects and ETB payoffs are both online and every flicker draws or removes something.`,
    stop: (commander) =>
      `Exile removal and stax that stop flicker effects blunt the plan. Keep a hard cast threat when blink lines are answered.`,
  }),
  "Stax package": freeze({
    title: "Resource Denial",
    theme: "stax",
    plan: (commander) =>
      `Your deck wants to restrict opposing resources, keep ${commander} online as the asymmetric exception, and win before the table recovers.`,
    early: (commander) =>
      `Develop mana carefully, deploy early tax pieces, land ${commander}, then lock the most painful resource before opponents explode.`,
    mid: (commander) =>
      `The deck becomes dangerous once multiple stax pieces overlap and ${commander} still functions under the same constraints.`,
    stop: (commander) =>
      `Enchantment and artifact removal, plus haste threats that ignore the lock, can race you. Keep interaction for the answer that breaks your best piece.`,
  }),
});

function sampleNames(names = [], limit = 3) {
  const list = [...names].filter(Boolean);
  if (!list.length) return "";
  if (list.length <= limit) return list.join(", ");
  return `${list.slice(0, limit).join(", ")}, and ${list.length - limit} more`;
}

/**
 * Four-beat coaching story: plan → early game → danger window → what stops it.
 * Presentation only. Driven by Brain v1 package labels + commander name.
 */
export function buildCoachPlanStory({
  packageLabels = [],
  commanders = [],
  strategy = null,
  strongestSystemName = null,
  weakestSystemName = null,
  fixFirst = null,
} = {}) {
  const commander = commanders[0] || "your commander";
  const labels = [...(packageLabels || [])].filter(Boolean);
  const primaryLabel = labels.find((label) => PACKAGE_PLAN_STORY[label]) || null;
  const primary = primaryLabel ? PACKAGE_PLAN_STORY[primaryLabel] : null;
  const secondaryLabel = labels.find((label) => label !== primaryLabel && PACKAGE_PLAN_STORY[label]) || null;

  // When Brain has no catalog package but structural analysis named an artifact/equipment system,
  // still speak like an artifact engine instead of falling back to vague commander boilerplate.
  const systemHint = String(strongestSystemName || "").toLowerCase();
  const artifactFallback = !primary && /artifact|equipment|treasure|mana rock/i.test(systemHint)
    ? PACKAGE_PLAN_STORY["Equipment package"]
    : null;
  const story = primary || artifactFallback;

  let title = story?.title || null;
  if (!title && labels[0]) title = String(labels[0]).replace(/\s+package$/i, " Plan");
  if (!title && strategy) title = `${String(strategy)} Plan`;
  if (!title && strongestSystemName) title = strongestSystemName;
  if (!title) title = "Commander Plan";

  const plan = story
    ? story.plan(commander)
    : labels.length
      ? `Your deck is organized around ${labels.slice(0, 2).join(" and ")} with ${commander}. The aim is to develop that support early, get ${commander} online, and keep converting package pieces into board advantage.`
      : strategy
        ? `Your deck follows a ${String(strategy).toLowerCase()} approach with ${commander}: develop the early setup, deploy ${commander} at a safe moment, and convert resources into a finish before the table stabilizes.`
        : `Your deck is built to get ${commander} online, support that identity with cohesive pieces, and convert that advantage into a win before opponents stabilize.`;

  const early = story
    ? story.early(commander)
    : `Develop mana, play the cheap setup pieces that support the plan, land ${commander}, then begin converting those early investments into real board presence. Protect ${commander} if possible.`;

  const mid = story
    ? story.mid(commander)
    : strongestSystemName
      ? `The deck becomes dangerous once ${strongestSystemName} is online and ${commander} has survived long enough to convert that structure into pressure.`
      : `The deck becomes dangerous once ${commander} has been on board for a few turns and your support pieces start chaining into each other.`;

  let stop = story
    ? story.stop(commander)
    : `Removal aimed at ${commander}, plus sweepers that reset your setup, will slow the plan dramatically. If you expect those effects, hold one key piece instead of committing everything.`;
  if (weakestSystemName) {
    stop = `${stop} Right now the clearest soft spot on paper is ${weakestSystemName}.`;
  } else if (fixFirst) {
    stop = `${stop} The first card I'd watch in real games is ${fixFirst}.`;
  }
  if (secondaryLabel && story) {
    stop = `${stop} You also have ${secondaryLabel} support — clarify which package should dominate before thickening both.`;
  }

  return freeze({
    title,
    plan,
    early,
    mid,
    stop,
    packageLabels: freeze(labels),
    commander,
  });
}

/**
 * Four-beat story from Strategic Recognition + Pilot Model (#020).
 */
export function buildCoachPlanStoryFromRecognition({
  recognition = null,
  pilot = null,
  commanders = [],
  fixFirst = null,
} = {}) {
  const commander = commanders[0] || recognition?.hierarchy?.primary || "your commander";
  const commanderName = typeof commander === "string" ? commander : "your commander";
  const title = recognition?.tableWhy || recognition?.planLabel || "Commander Plan";
  const plan = recognition?.primaryPlan
    || `Your deck is built to get ${commanderName} online and convert that identity into a win.`;
  const early = pilot?.establish
    || `Develop mana, play the cheap setup pieces that support the plan, then land ${commanderName}.`;
  const mid = pilot?.whenDangerous
    || pilot?.compound
    || `The deck becomes dangerous once ${commanderName} and the primary support system are both online.`;
  let stop = recognition?.hierarchy?.pressurePoint
    ? `Watch ${recognition.hierarchy.pressurePoint} first — if that soft spot collapses, the primary plan loses its support. ${pilot?.protect || ""}`.trim()
    : (pilot?.protect
      || `Removal aimed at ${commanderName}, plus sweepers that reset your setup, will slow the plan dramatically.`);
  if (fixFirst && !String(stop).includes(String(fixFirst))) {
    stop = `${stop} The first card I'd watch in real games is ${fixFirst}.`;
  }
  return freeze({
    title,
    plan,
    early,
    mid,
    stop,
    packageLabels: freeze([]),
    commander: commanderName,
    fromRecognition: true,
    planLabel: recognition?.planLabel || null,
    tableWhy: recognition?.tableWhy || null,
    sections: freeze({
      whatTrying: plan,
      howStarted: early,
      whenDangerous: mid,
      whatDerails: stop,
      why: recognition?.whyEvidence || null,
    }),
  });
}

function confidenceBand({ cohesion = null, weaklyJustifiedCount = 0, packageCount = 0, gatePassed = null }) {
  const cohesionNum = Number(cohesion);
  if (gatePassed === false || weaklyJustifiedCount >= 6) {
    return freeze({
      level: "limited",
      label: "Limited evidence",
      detail: "Several slots are weakly connected to the plan, or cohesion checks are still contested.",
      reason: weaklyJustifiedCount >= 6
        ? "Several cards look weakly justified for the current plan, so confidence stays limited."
        : "Cohesion checks are still contested for this list.",
    });
  }
  if (Number.isFinite(cohesionNum) && cohesionNum >= 70 && weaklyJustifiedCount <= 2 && packageCount >= 1) {
    return freeze({
      level: "high",
      label: "High confidence",
      detail: "Plan packages and slot justifications look consistent with each other.",
      reason: "Your commander, package structure, and card roles all point to the same primary plan.",
    });
  }
  if (Number.isFinite(cohesionNum) && cohesionNum >= 45) {
    return freeze({
      level: "moderate",
      label: "Moderate confidence",
      detail: "The main plan is readable, but some slots still need playtesting to confirm.",
      reason: packageCount >= 2
        ? "Your list supports more than one package direction, so the Forge is moderately sure about the primary read."
        : "The main plan is readable, but some slots still need playtesting to confirm.",
    });
  }
  return freeze({
    level: "limited",
    label: "Limited evidence",
    detail: "The Forge sees a direction, but evidence for this exact list is still thin.",
    reason: packageCount >= 2
      ? "Your list supports several competing plans and no single package clearly dominates."
      : "The Forge sees a direction, but evidence for this exact list is still thin.",
  });
}

function isGenericStrategyLabel(strategy = "") {
  return /^(balanced\s+)?midrange$|^aggro$|^control$|^combo$|^tempo$|^value$|^focused$/i.test(
    String(strategy || "").trim(),
  );
}

function planIdentity(selected = {}) {
  const intent = selected.strategicIntent || {};
  const packages = intent.packages || [];
  const plan = selected.strategicPlan || intent.activePlan || null;
  const packageLabels = packages.map((p) => p.label).filter(Boolean);
  const strategy = intent.strategy || selected.strategy || null;
  const commanderNames = (intent.commanders || [])
    .map((c) => (typeof c === "string" ? c : c.name))
    .filter(Boolean);

  let identityLine = "This list does not yet show a single dominant package.";
  if (packageLabels.length === 1) {
    identityLine = `Your deck reads primarily as ${packageLabels[0]}${strategy && !isGenericStrategyLabel(strategy) ? ` under a ${String(strategy).toLowerCase()} approach` : ""}.`;
  } else if (packageLabels.length >= 2) {
    identityLine = `I see competing package directions: ${packageLabels.slice(0, 3).join(" · ")}.`;
  } else if (strategy && !isGenericStrategyLabel(strategy)) {
    identityLine = `This list is shaped around a ${String(strategy).toLowerCase()} approach${commanderNames.length ? ` with ${commanderNames.join(" / ")}` : ""}.`;
  } else if (commanderNames.length) {
    identityLine = `This list is built around ${commanderNames.join(" / ")} — waiting on structural systems to name the primary plan.`;
  }

  let competitionNote = null;
  if (packageLabels.length >= 2) {
    competitionNote = `Both ${packageLabels[0]} and ${packageLabels[1]} are supported, but neither currently has clear room to fully dominate the list.`;
  }

  return freeze({
    identityLine,
    competitionNote,
    planLabel: plan?.label || plan?.id || null,
    packageLabels: freeze(packageLabels),
    strategy,
    commanders: freeze(commanderNames),
  });
}

function strengthsAndWeaknesses(selected = {}, structuralSystems = null, commissionContract = null) {
  const ledger = selected.slotJustificationLedger;
  const critique = ledger?.critique || {};
  const gate = selected.strategicCohesionGate;
  const evaluation = selected.evaluation || {};
  const strengths = [];
  const weaknesses = [];

  const packageLabels = (selected.strategicIntent?.packages || []).map((p) => p.label).filter(Boolean);
  const fantasy = commissionContract?.playerFantasy || null;
  const fantasyGrade = (commissionContract?.whatIBuilt || []).find(
    (entry) => entry.role === "fantasy" || entry.id === fantasy?.id,
  );
  const softHeard = Number(commissionContract?.softHeardCount || 0) > 0;

  // Commission Contract leads when the player named a fantasy — never let
  // Evasion/Treasure steal Stage 4 before "Did I keep the promise?"
  if (fantasy?.label) {
    if (fantasyGrade?.status === "met") {
      strengths.push(`Your ${fantasy.label} commission reads fulfilled on this list.`);
    } else if (fantasyGrade?.status === "partial") {
      weaknesses.push(
        fantasyGrade.detail
          || `This list only partially matches your ${fantasy.label} commission.`,
      );
    } else if (fantasyGrade?.status === "missed") {
      weaknesses.push(
        fantasyGrade.detail
          || `This finished list does not look like the ${fantasy.label} deck you commissioned.`,
      );
    } else {
      strengths.push(`Commissioned fantasy: ${fantasy.label}.`);
    }
  }
  if (commissionContract?.matchHonesty) {
    weaknesses.push(commissionContract.matchHonesty);
  } else if (softHeard && commissionContract?.matchLabel) {
    weaknesses.push(`Commission read: ${commissionContract.matchLabel}.`);
  }

  if (packageLabels.length) {
    strengths.push(`Detected package support: ${packageLabels.slice(0, 3).join(", ")}.`);
  }
  if (Number(evaluation.cohesion) >= 65) {
    strengths.push("Cards are contributing to a shared plan more often than not.");
  }
  if (Number(evaluation.roleCoverage) >= 0.75) {
    strengths.push(`Role coverage looks solid (about ${Math.round(Number(evaluation.roleCoverage) * 100)}% of usual needs).`);
  }
  // System names stay Deep Forge evidence when a Player Fantasy is active.
  if (!fantasy && structuralSystems?.strongestSystem?.name) {
    strengths.push(`Clearest engine so far: ${structuralSystems.strongestSystem.name}.`);
  }
  if ((critique.packageCritical || []).length === 0 && packageLabels.length) {
    strengths.push("No single package-critical slot is obviously collapsing the plan on paper.");
  }

  const weak = critique.weaklyJustified || [];
  const redundant = critique.redundant || [];
  const overSupported = critique.overSupported || [];
  const underAnchors = critique.underSupportedAnchors || [];
  const rawPower = critique.rawPowerDominant || [];

  if (weak.length) {
    weaknesses.push(`${weak.length} card${weak.length === 1 ? "" : "s"} look weakly justified for the plan${weak.length ? ` (including ${sampleNames(weak)})` : ""}.`);
  }
  if (redundant.length) {
    weaknesses.push(`Redundant package pieces: ${sampleNames(redundant)}.`);
  }
  if (overSupported.length) {
    weaknesses.push(`Package density may be over-supported: ${sampleNames(overSupported)}.`);
  }
  if (underAnchors.length) {
    weaknesses.push(`High-cost package anchors lack enough support: ${sampleNames(underAnchors)}.`);
  }
  if (rawPower.length) {
    weaknesses.push(`Some expensive cards read more like raw power than plan support: ${sampleNames(rawPower)}.`);
  }
  if (gate && gate.ok === false && (gate.reasons || []).length) {
    weaknesses.push(gate.reasons[0]);
  }
  if (!fantasy && structuralSystems?.weakestSystem?.name) {
    weaknesses.push(`Least supported system right now: ${structuralSystems.weakestSystem.name}.`);
  }

  if (!strengths.length) strengths.push("The finished list is complete; named package strengths are still thin in the evidence.");
  if (!weaknesses.length) weaknesses.push("No major weakly justified slots stood out in the ledger — watch real games for the first pressure point.");

  return freeze({
    strengths: freeze(strengths.slice(0, 4)),
    weaknesses: freeze(weaknesses.slice(0, 5)),
    weaklyJustified: freeze(weak),
    fixFirst: fantasyGrade?.status === "partial" || fantasyGrade?.status === "missed"
      ? fantasy?.label || weak[0] || redundant[0] || overSupported[0] || underAnchors[0] || rawPower[0] || structuralSystems?.weakestSystem?.name || null
      : weak[0] || redundant[0] || overSupported[0] || underAnchors[0] || rawPower[0] || structuralSystems?.weakestSystem?.name || null,
    observedFindings: freeze([
      ...(fantasy?.label ? [`Observed: commissioned fantasy ${fantasy.label}.`] : []),
      ...(packageLabels.length ? [`Observed: package support for ${packageLabels.slice(0, 3).join(", ")}.`] : []),
      ...(weak.length ? [`Observed: ${weak.length} weakly justified slot${weak.length === 1 ? "" : "s"}${weak.length ? ` including ${sampleNames(weak)}` : ""}.`] : []),
      ...(redundant.length ? [`Observed: redundant package pieces (${sampleNames(redundant)}).`] : []),
      ...(Number.isFinite(Number(evaluation.roleCoverage))
        ? [`Observed: role coverage about ${Math.round(Number(evaluation.roleCoverage) * 100)}%.`]
        : []),
    ].slice(0, 4)),
    interpretiveGuidance: freeze([
      ...(fantasyGrade?.status === "partial" || fantasyGrade?.status === "missed"
        ? [`I'd treat the ${fantasy.label} commission grade as the first honesty check before thickening secondary engines.`]
        : []),
      ...(weak[0] || redundant[0] || overSupported[0]
        ? [`I'd address ${weak[0] || redundant[0] || overSupported[0]} before adding another similar payoff.`]
        : []),
      ...(packageLabels.length >= 2
        ? ["I'd clarify which package should dominate before thickening both sides."]
        : []),
      ...(!fantasy && structuralSystems?.weakestSystem?.name
        ? [`I'd watch ${structuralSystems.weakestSystem.name} first in real games.`]
        : []),
    ].slice(0, 3)),
  });
}

/**
 * Explain why a cut→add recommendation helps.
 * Brain v1 fields for structural why; optional Strategic Evaluation for judgment.
 */
export function explainRecommendationWhy({
  selected = {},
  cut = "",
  add = "",
  tablet = null,
  commission = null,
  commanderName = "",
  hypotheses = null,
  includeStrategicEvaluation = true,
} = {}) {
  const ledger = selected.slotJustificationLedger;
  const cutSlot = ledger?.byName?.[String(cut).toLocaleLowerCase("en")]
    || ledger?.slots?.find((s) => String(s.name).toLocaleLowerCase("en") === String(cut).toLocaleLowerCase("en"));
  const parts = [];

  if (cutSlot?.flags?.weaklyJustified) {
    parts.push(`${cut} is weakly connected to the commander and main packages, so it is a fair cut candidate.`);
  } else if (cutSlot?.flags?.redundant) {
    parts.push(`${cut} looks redundant with other cards already doing a similar package job.`);
  } else if (cutSlot?.flags?.overSupported) {
    parts.push(`${cut} sits in a package that already looks over-supported.`);
  } else if (cutSlot?.flags?.rawPowerDominant) {
    parts.push(`${cut} reads more like raw power than a plan-connected piece.`);
  } else if (cut) {
    parts.push(`Rotating out ${cut} frees a slot that is not carrying enough plan responsibility.`);
  }

  if (add) {
    parts.push(`Adding ${add} is meant to cover more of the deck's important jobs and tighten the plan.`);
  }

  if (tablet?.expectedBenefit) {
    // Soften metric-heavy benefit into a secondary clause without saying "higher score"
    parts.push(tablet.expectedBenefit.replace(/\(.*?%.*?\)/g, "").replace(/\s+/g, " ").trim());
  }
  if (tablet?.tradeoff) {
    parts.push(`Tradeoff: ${tablet.tradeoff}`);
  }
  if (tablet?.pressurePoint) {
    parts.push(tablet.pressurePoint);
  }

  const preserved = [];
  if (cutSlot?.footprint?.packageCore?.length) preserved.push("try not to collapse the same package core elsewhere");
  if (cutSlot?.confidence?.commanderLinked) preserved.push("commander connection elsewhere in the list still matters");

  let strategicEvaluation = null;
  if (includeStrategicEvaluation && (cut || add)) {
    strategicEvaluation = evaluateCutAddRecommendation({
      selected,
      cut,
      add,
      tablet,
      commission,
      commanderName,
      hypotheses,
    });
  }

  return freeze({
    cut,
    add,
    summary: parts.filter(Boolean).slice(0, 4).join(" "),
    whyCut: parts[0] || null,
    whyAdd: add ? `This change aims to improve a strategic responsibility the list is under-serving.` : null,
    preserved: freeze(preserved),
    tradeoff: tablet?.tradeoff || null,
    confidence: tablet?.confident === false ? "limited" : "moderate",
    forbiddenPhrasesUsed: false,
    strategicEvaluation,
  });
}

/**
 * Build Honest Coach v0 summary from an imported/native forge result.
 * activeCommanderName is the workbench authority — never invent a commander
 * from a stale structural report or a previous commission.
 */
export function buildHonestCoachSummary({
  nativeReport = null,
  selected = null,
  structuralSystems = null,
  reviewFocusResult = null,
  isImported = false,
  generationId = "",
  deckUnderstanding = null,
  activeCommanderName = "",
  deckCardNames = null,
  commissionNote = "",
  cardFacts = null,
  strategicHypotheses = null,
} = {}) {
  const deck = selected || nativeReport?.selected || {};
  const baseIdentity = planIdentity(deck);
  const deckSet = new Set(
    [...(deckCardNames || (deck.rows || []).map((row) => row.name) || [])]
      .filter(Boolean)
      .map((name) => normalizeNarrativeName(name)),
  );
  const authoritativeCommanders = resolveAuthoritativeCommanders({
    identityCommanders: baseIdentity.commanders,
    activeCommanderName,
    deckSet,
  });
  const identity = freeze({
    ...baseIdentity,
    commanders: freeze(authoritativeCommanders),
  });
  const commissionContract = buildCommissionContract({
    note: commissionNote,
    commanderName: authoritativeCommanders[0] || activeCommanderName || "",
    selected: deck,
    structuralSystems,
    cardFacts,
    deckCardNames: deckCardNames || (deck.rows || []).map((row) => row.name),
    blueprint: deck.strategicIntent?.blueprint || nativeReport?.blueprintIntent || null,
  });
  const sw = strengthsAndWeaknesses(deck, structuralSystems, commissionContract);
  const evaluation = deck.evaluation || {};
  const confidence = confidenceBand({
    cohesion: evaluation.cohesion,
    weaklyJustifiedCount: (sw.weaklyJustified || []).length,
    packageCount: identity.packageLabels.length,
    gatePassed: deck.strategicCohesionGate?.ok,
  });
  const analysisIds = buildHonestCoachAnalysisId({
    generationId: generationId || nativeReport?.generationId || "",
    commanderName: authoritativeCommanders[0] || activeCommanderName || "",
    packageLabels: identity.packageLabels,
    brainVersion: "brain_v1",
  });

  const recognitionRaw = buildStrategicRecognition({
    structuralSystems,
    packageLabels: identity.packageLabels,
    commanderName: authoritativeCommanders[0] || activeCommanderName || "",
    strategy: identity.strategy,
  });
  const recognition = applyFantasyNarrator({
    recognition: recognitionRaw,
    commissionContract,
  });
  const pilot = buildPilotStory({
    recognition,
    commanderName: authoritativeCommanders[0] || activeCommanderName || "",
  });
  const requestRecognition = commissionContract.requestRecognition
    || buildRequestRecognition({
      note: commissionNote,
      blueprint: deck.strategicIntent?.blueprint || nativeReport?.blueprintIntent || null,
      selected: deck,
      structuralSystems,
      cardFacts,
      deckCardNames: deckCardNames || (deck.rows || []).map((row) => row.name),
    });

  const strategyVsSystem = buildStrategyVsSystemRead({
    understanding: deckUnderstanding,
    packageLabels: identity.packageLabels,
    strategyLine: identity.identityLine,
    systemsDetected: structuralSystems?.systems?.length || 0,
    systemsConfidence: structuralSystems?.confidence || "",
    incompleteCardSet: Boolean(deckUnderstanding?.cardsUnresolved > 0),
    recognitionLabel: recognition.ambiguous ? "" : recognition.planLabel,
    recognitionConfidence: recognition.confidence?.level || "",
    recognitionWhy: recognition.whyEvidence || "",
  });

  // Prefer Recognition + Pilot Story when structural systems (or clear package hints) exist.
  // Fall back to legacy package templates only when recognition has nothing specific.
  const useRecognition = Boolean(
    structuralSystems?.systems?.length
    || (recognition.planLabel && recognition.planLabel !== "Plan still forming" && !recognition.ambiguous)
    || recognition.hierarchy?.primary
    || commissionContract?.playerFantasy,
  );
  const planStory = useRecognition
    ? buildCoachPlanStoryFromRecognition({
      recognition,
      pilot,
      commanders: authoritativeCommanders,
      fixFirst: sw.fixFirst,
    })
    : buildCoachPlanStory({
      packageLabels: identity.packageLabels,
      commanders: authoritativeCommanders,
      strategy: isGenericStrategyLabel(identity.strategy) ? null : identity.strategy,
      strongestSystemName: structuralSystems?.strongestSystem?.name || null,
      weakestSystemName: structuralSystems?.weakestSystem?.name || null,
      fixFirst: sw.fixFirst,
    });
  const whatIThink = planStory.plan;
  const whatToFixFirst = planStory.stop;
  const why = sw.weaknesses[0];
  const observedLead = sw.observedFindings[0] || why;
  const inferredLead = sw.interpretiveGuidance[0] || (sw.fixFirst ? `I would look at ${sw.fixFirst} first.` : planStory.stop);
  const uncertaintyLead = deckUnderstanding?.cardsUnresolved
    ? `${deckUnderstanding.cardsUnresolved} unresolved card${deckUnderstanding.cardsUnresolved === 1 ? "" : "s"} may strengthen or change that conclusion.`
    : recognition.ambiguous && !commissionContract?.playerFantasy
      ? recognition.primaryPlan
      : null;

  const fantasyGrade = (commissionContract?.whatIBuilt || []).find(
    (entry) => entry.role === "fantasy" || entry.id === commissionContract?.playerFantasy?.id,
  );
  const commissionMismatch = fantasyGrade?.status === "partial" || fantasyGrade?.status === "missed";
  const fantasyHeadline = commissionMismatch
    ? `I heard ${commissionContract.playerFantasy.label} — this list only partly kept that promise.`
    : commissionContract?.playerFantasy?.label
      ? `Here's how I read your ${commissionContract.playerFantasy.label} commission.`
      : null;
  const fantasyGuide = commissionMismatch
    ? `${commissionContract.matchLabel || "Partial match"} on your ${commissionContract.playerFantasy.label} contract — start with the grade before secondary engines.`
    : commissionContract?.playerFantasy?.label && planStory.title
      ? `${planStory.title} — start here.`
      : null;

  const commanderForVoice = authoritativeCommanders[0] || activeCommanderName || "";
  const fantasyForVoice = commissionContract?.playerFantasy?.label
    || commissionContract?.fantasyLabel
    || "";
  const prioritiesForVoice = [
    ...(commissionContract?.playerFantasy?.priorities || []),
    ...(commissionContract?.priorities || []),
  ];
  const watchingVoice = buildHonestCoachWatchingVoice({
    commanderName: commanderForVoice,
    hypotheses: strategicHypotheses,
  });
  const principleVoice = buildHonestCoachConceptVoice({
    fantasyLabel: fantasyForVoice,
    priorities: prioritiesForVoice,
  });
  const deepForgeUnderstanding = buildDeepForgeUnderstandingDossier({
    commanderName: commanderForVoice,
    hypotheses: strategicHypotheses,
  });
  const deepForgePrinciples = buildDeepForgeConceptDossier({
    fantasyLabel: fantasyForVoice,
    priorities: prioritiesForVoice,
  });

  const reliability = deckUnderstanding?.reliability || null;
  const coachingAllowed = !reliability || reliability.state !== "insufficient";
  const namedCards = freeze([
    ...(sw.weaklyJustified || []),
    ...(deck.slotJustificationLedger?.critique?.redundant || []),
    ...(deck.slotJustificationLedger?.critique?.overSupported || []),
    ...(deck.slotJustificationLedger?.critique?.underSupportedAnchors || []),
    ...(deck.slotJustificationLedger?.critique?.rawPowerDominant || []),
  ].filter(Boolean));

  return freeze({
    version: "honest-coach-v0.9",
    isImported: Boolean(isImported),
    brainAuthority: "brain_v1",
    researchVocabularyUsed: false,
    headline: fantasyHeadline
      || (isImported
        ? "Here's what I think you're building."
        : "Here's what I think this deck is trying to do."),
    guideLine: fantasyGuide
      || (planStory.title
        ? `${planStory.title} — start here.`
        : "Here's the first thing I'd address."),
    whyPrompt: "Want to see why?",
    planStory,
    strategicRecognition: recognition,
    pilotModel: pilot,
    pilotStory: pilot,
    requestRecognition,
    commissionContract,
    commissionMismatch: Boolean(commissionMismatch),
    intentions: freeze({
      accomplish: planStory.plan,
      establish: planStory.early,
      dependsOn: planStory.mid,
      firstVulnerability: planStory.stop,
      title: planStory.title,
    }),
    whatIThink,
    whatLooksStrong: sw.strengths[0],
    whatToFixFirst,
    why,
    observedLead,
    inferredLead,
    uncertaintyLead,
    // Stance voice — not a section title. Request Recognition never gets this.
    watchingVoice,
    principleVoice,
    deepForgeUnderstanding,
    deepForgePrinciples,
    strategyVsSystem,
    deckUnderstanding: deckUnderstanding || null,
    coachingAllowed,
    identity,
    namedCards,
    strengths: sw.strengths,
    weaknesses: sw.weaknesses,
    observedFindings: sw.observedFindings,
    interpretiveGuidance: freeze([
      recognition?.whyEvidence,
      ...(recognition?.playerSystemLines || []),
      ...sw.interpretiveGuidance,
    ].filter(Boolean)),
    fixFirst: sw.fixFirst,
    confidence,
    analysisIds,
    reviewFocus: reviewFocusResult
      ? freeze({
        focus: reviewFocusResult.focus,
        evidence: reviewFocusResult.evidence,
        nextStep: reviewFocusResult.nextStep,
      })
      : null,
    fieldsUsed: freeze([
      "strategicIntent.packages",
      "strategicPlan|activePlan",
      "slotJustificationLedger.critique",
      "strategicCohesionGate",
      "evaluation.cohesion",
      "evaluation.roleCoverage",
      "structuralSystems (optional, integrity-bound)",
      "reviewFocusResult (optional)",
      "deckUnderstanding (A4)",
      "activeCommanderName (narrative integrity)",
      "commissionNote (request recognition #023)",
    ]),
    deepForgeEmpty: freeze({
      package: deepForgeEmptyCopy({ incomplete: strategyVsSystem.incompleteEvidence, topic: "package" }),
      relationship: deepForgeEmptyCopy({ incomplete: strategyVsSystem.incompleteEvidence, topic: "relationship" }),
      system: deepForgeEmptyCopy({ incomplete: strategyVsSystem.incompleteEvidence, topic: "system" }),
    }),
  });
}

function resolveAuthoritativeCommanders({
  identityCommanders = [],
  activeCommanderName = "",
  deckSet = new Set(),
} = {}) {
  const active = String(activeCommanderName || "").trim();
  if (active) {
    const key = normalizeNarrativeName(active);
    if (!deckSet.size || deckSet.has(key) || deckSet.has(normalizeNarrativeName(active.split(/\s*\/\/\s*/)[0]))) {
      return [active];
    }
  }
  const fromIntent = [...identityCommanders].filter((name) => {
    const key = normalizeNarrativeName(name);
    return key && (!deckSet.size || deckSet.has(key) || deckSet.has(normalizeNarrativeName(String(name).split(/\s*\/\/\s*/)[0])));
  });
  if (fromIntent.length) return fromIntent;
  return active ? [active] : [];
}

/**
 * Build coach summary, then Narrative Integrity Gate.
 * On failure: discard narrative and regenerate without unbound structural systems.
 * Never return cross-analysis content.
 */
export function buildIntegrityGuardedCoachSummary({
  nativeReport = null,
  selected = null,
  structuralSystems = null,
  reviewFocusResult = null,
  isImported = false,
  generationId = "",
  deckUnderstanding = null,
  activeCommanderName = "",
  deckCardNames = [],
  foreignSuspectNames = [],
  allowedSystemNames = null,
  commissionNote = "",
  cardFacts = null,
  strategicHypotheses = null,
} = {}) {
  const deck = selected || nativeReport?.selected || {};
  const packageLabels = (deck.strategicIntent?.packages || []).map((p) => p.label).filter(Boolean);
  const cards = deckCardNames.length
    ? deckCardNames
    : (deck.rows || []).map((row) => row.name).filter(Boolean);
  const expectedIds = buildHonestCoachAnalysisId({
    generationId: generationId || "",
    commanderName: activeCommanderName || "",
    packageLabels,
    brainVersion: "brain_v1",
  });

  const buildOnce = (systems) => buildHonestCoachSummary({
    nativeReport,
    selected,
    structuralSystems: systems,
    reviewFocusResult,
    isImported,
    generationId,
    deckUnderstanding,
    activeCommanderName,
    deckCardNames: cards,
    commissionNote,
    cardFacts,
    strategicHypotheses,
  });

  const gateFor = (summary, systemsAllowlist) => evaluateNarrativeIntegrityForCoach({
    summary,
    selected: deck,
    activeCommanderNames: activeCommanderName ? [activeCommanderName] : summary.identity.commanders,
    deckCardNames: cards,
    allowedPackageLabels: packageLabels,
    allowedSystemNames: systemsAllowlist,
    expectedAnalysisId: expectedIds.analysisId,
    expectedGenerationId: generationId || "",
    foreignSuspectNames,
    resolutions: deckUnderstanding?.resolutions || [],
  });

  const boundSystemNames = allowedSystemNames == null
    ? systemsNamesFrom(structuralSystems)
    : allowedSystemNames;

  let summary = buildOnce(structuralSystems);
  let gate = gateFor(summary, boundSystemNames);
  if (gate.ok) {
    return freeze({ ...summary, narrativeIntegrity: freeze({ ...gate, regenerated: false }) });
  }

  const priorViolations = gate.violations;

  // Discard contaminated narrative. Regenerate from Brain fields only —
  // no structural systems that may belong to another analysis.
  summary = buildOnce(null);
  gate = gateFor(summary, freeze([]));
  if (gate.ok) {
    return freeze({
      ...summary,
      narrativeIntegrity: freeze({
        ...gate,
        regenerated: true,
        priorViolations,
      }),
    });
  }

  // Nuclear safe fallback — still never emit foreign names.
  const safe = buildSafeCoachFallback({
    activeCommanderName,
    packageLabels,
    generationId,
    isImported,
    deckUnderstanding,
  });
  return freeze({
    ...safe,
    narrativeIntegrity: freeze({
      ok: true,
      regenerated: true,
      fallback: true,
      violations: freeze([]),
      priorViolations: freeze([...(priorViolations || []), ...(gate.violations || [])]),
      analysisId: safe.analysisIds.analysisId,
      generationId: generationId || null,
    }),
  });
}

function systemsNamesFrom(structuralSystems) {
  if (!structuralSystems) return freeze([]);
  const names = [
    structuralSystems.strongestSystem?.name,
    structuralSystems.weakestSystem?.name,
    ...((structuralSystems.systems || []).map((system) => system?.name)),
  ].filter(Boolean);
  return freeze([...new Set(names)]);
}

function buildSafeCoachFallback({
  activeCommanderName = "",
  packageLabels = [],
  generationId = "",
  isImported = false,
  deckUnderstanding = null,
} = {}) {
  const commander = activeCommanderName || "your commander";
  const title = packageLabels[0]
    ? String(packageLabels[0]).replace(/\s+package$/i, " Plan")
    : "Commander Plan";
  const plan = packageLabels.length
    ? `Your deck is organized around ${packageLabels.slice(0, 2).join(" and ")} with ${commander}. Develop that support, get ${commander} online, and convert those pieces into board advantage.`
    : `Your deck is built to get ${commander} online and convert that identity into a win. I'm withholding a deeper structural read until this analysis is fully bound to this list.`;
  const early = `Develop mana, play setup pieces that support the plan, land ${commander}, then begin converting those investments into board presence.`;
  const mid = `The deck becomes dangerous once ${commander} has been online long enough for your support pieces to start chaining.`;
  const stop = `Removal aimed at ${commander}, plus sweepers that reset your setup, will slow the plan. Hold one key piece when you expect those answers.`;
  const analysisIds = buildHonestCoachAnalysisId({
    generationId,
    commanderName: activeCommanderName || "",
    packageLabels,
    brainVersion: "brain_v1",
  });
  const reliability = deckUnderstanding?.reliability || null;
  return freeze({
    version: "honest-coach-v0.5",
    isImported: Boolean(isImported),
    brainAuthority: "brain_v1",
    researchVocabularyUsed: false,
    headline: isImported
      ? "Here's what I think you're building."
      : "Here's what I think this deck is trying to do.",
    guideLine: `${title} — start here.`,
    whyPrompt: "Want to see why?",
    planStory: freeze({ title, plan, early, mid, stop, packageLabels: freeze(packageLabels), commander }),
    intentions: freeze({
      accomplish: plan,
      establish: early,
      dependsOn: mid,
      firstVulnerability: stop,
      title,
    }),
    whatIThink: plan,
    whatLooksStrong: packageLabels.length ? `Detected package support: ${packageLabels.slice(0, 3).join(", ")}.` : "The finished list is complete; named package strengths are still thin in the evidence.",
    whatToFixFirst: stop,
    why: stop,
    observedLead: packageLabels.length ? `Observed: package support for ${packageLabels.slice(0, 3).join(", ")}.` : "Observed: waiting on a bound structural read for this analysis.",
    inferredLead: stop,
    uncertaintyLead: null,
    strategyVsSystem: freeze({
      strategy: freeze({ label: title, confidence: "limited", packages: freeze(packageLabels) }),
      engine: freeze({
        status: "not_fully_verified",
        confidence: "limited",
        label: "Structural systems not yet bound to this analysis",
        why: "A previous analysis's systems were discarded to protect narrative integrity.",
      }),
      incompleteEvidence: true,
      principle: "unknown_is_not_absent",
    }),
    deckUnderstanding: deckUnderstanding || null,
    coachingAllowed: !reliability || reliability.state !== "insufficient",
    identity: freeze({
      identityLine: plan,
      competitionNote: null,
      planLabel: null,
      packageLabels: freeze(packageLabels),
      strategy: null,
      commanders: freeze(activeCommanderName ? [activeCommanderName] : []),
    }),
    namedCards: freeze([]),
    strengths: freeze([]),
    weaknesses: freeze([stop]),
    observedFindings: freeze([]),
    interpretiveGuidance: freeze([]),
    fixFirst: null,
    confidence: freeze({
      level: "limited",
      label: "Limited evidence",
      detail: "Coach narrative was regenerated after an integrity mismatch.",
      reason: "Cross-analysis content was discarded before display.",
    }),
    analysisIds,
    reviewFocus: null,
    fieldsUsed: freeze(["narrative-integrity-fallback"]),
    deepForgeEmpty: freeze({
      package: deepForgeEmptyCopy({ incomplete: true, topic: "package" }),
      relationship: deepForgeEmptyCopy({ incomplete: true, topic: "relationship" }),
      system: deepForgeEmptyCopy({ incomplete: true, topic: "system" }),
    }),
  });
}

export function enrichTabletWithHonestWhy(tablet, selected, analysisIds = null) {
  if (!tablet || tablet.type === "confidence") return tablet;
  const why = explainRecommendationWhy({
    selected,
    cut: tablet.change?.cut,
    add: tablet.change?.add,
    tablet,
  });
  const ledger = selected?.slotJustificationLedger;
  const cutKey = String(tablet.change?.cut || "").toLocaleLowerCase("en");
  const cutSlot = ledger?.byName?.[cutKey]
    || ledger?.slots?.find((s) => String(s.name).toLocaleLowerCase("en") === cutKey);
  const reasonClass = classifyRecommendationReason({ cutSlot, tablet });
  const recommendation = buildHonestCoachRecommendationId({
    analysisId: analysisIds?.analysisId || "",
    cut: tablet.change?.cut,
    add: tablet.change?.add,
    diagnosticClass: "swap",
    reasonClass,
  });
  const observed = why.whyCut || (typeof why.summary === "string" ? why.summary.split(/(?<=\.)\s/)[0] : null);
  const inferred = why.whyAdd
    || (tablet.change?.add
      ? `I'd try ${tablet.change.add} to strengthen the plan before adding another similar piece.`
      : null);
  return freeze({
    ...tablet,
    honestWhy: freeze({
      ...why,
      observed,
      inferred,
      claimKinds: freeze({
        observed: "direct_structural_finding",
        inferred: "interpretive_recommendation",
      }),
    }),
    recommendationIds: recommendation,
  });
}

/** Categories for alpha feedback — guest + signed-in share the same taxonomy. */
export const HONEST_COACH_FEEDBACK_OPTIONS = freeze([
  freeze({ id: "helpful", label: "Helpful", apiCategory: "helped", needsFollowUp: false }),
  freeze({ id: "not-helpful", label: "Not helpful", apiCategory: "confusing", needsFollowUp: true }),
  freeze({ id: "misunderstands-plan", label: "Misunderstands my plan", apiCategory: "missed-interaction", needsFollowUp: false }),
  freeze({ id: "wrong-constraints", label: "Wrong for my budget/power level", apiCategory: "idea", needsFollowUp: false }),
  freeze({ id: "other", label: "Other", apiCategory: "idea", needsFollowUp: false }),
]);

/** One-click reasons when trust broke on "Not helpful". */
export const HONEST_COACH_NOT_HELPFUL_REASONS = freeze([
  freeze({ id: "wrong-plan", label: "Wrong plan" }),
  freeze({ id: "wrong-card", label: "Wrong card" }),
  freeze({ id: "missed-synergy", label: "Missed synergy" }),
  freeze({ id: "budget-issue", label: "Budget issue" }),
  freeze({ id: "power-level-mismatch", label: "Power-level mismatch" }),
  freeze({ id: "explanation-unclear", label: "Explanation unclear" }),
  freeze({ id: "other", label: "Other" }),
]);
