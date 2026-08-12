// =============================================================================
// Strategic Concept Library v0
// =============================================================================
// Catalog strategy itself — not Magic tricks, not fixtures-as-ends.
// Concepts are TCG-agnostic research objects. Implementations are game-facing.
// Naming is not promotion. writesToBrain: false · Brain frozen.
// =============================================================================

import { expertEvidencePatch } from "./concept-expert-evidence.mjs";
import { tournamentEvidencePatch } from "./concept-tournament-evidence.mjs";
import { playEvidencePatch } from "./concept-play-evidence.mjs";
import { simulationEvidencePatch } from "./concept-simulation-evidence.mjs";

const freeze = (value) => Object.freeze(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

export const CONCEPT_STATUSES = freeze([
  "candidate",
  "emerging",
  "strongly_supported",
  "contradicted",
  "retired",
]);

export const FIXTURE_CONCEPT_RELATIONS = freeze([
  "introduces",
  "strengthens",
  "contradicts",
]);

/**
 * Create one Strategic Concept Candidate (research object).
 * Same institutional shape as Strategic Hypothesis — falsifiable, inspectable.
 */
export function createStrategicConcept({
  id,
  name,
  status = "candidate",
  description,
  implementations = [],
  evidence = {},
  predictions = [],
  knownCorrectImmediateSpends = [],
  contradictions = [],
  retirementCriteria = [],
  constructionImplications = "none",
  gameplayImplications = [],
  crossGameNotes = [],
  confidence = null,
  sources = [],
} = {}) {
  if (!id || !name || !description) {
    throw new Error("Strategic Concept requires id, name, and description");
  }
  const fixtureLinks = freeze(evidence.fixtures || []);
  const state = CONCEPT_STATUSES.includes(status) ? status : "candidate";
  const conf = confidence || confidenceFromConceptEvidence({
    fixtureLinks,
    experts: evidence.experts || "none",
    tournament: evidence.tournament || "none",
    play: evidence.play || "none",
    simulation: evidence.simulation || "none",
    status: state,
  });

  return freeze({
    writesToBrain: false,
    activated: false,
    promoted: false,
    namingIsNotPromotion: true,
    version: "strategic-concept-v0",
    kind: "StrategicConcept",
    id,
    name,
    status: state,
    description,
    implementations: freeze(implementations),
    evidence: freeze({
      fixtures: fixtureLinks,
      experts: evidence.experts || "none",
      tournament: evidence.tournament || "none",
      play: evidence.play || "none",
      simulation: evidence.simulation || "none",
      notes: freeze(evidence.notes || []),
      expertDetail: evidence.expertDetail || null,
      tournamentDetail: evidence.tournamentDetail || null,
      playDetail: evidence.playDetail || null,
      simulationDetail: evidence.simulationDetail || null,
    }),
    predictions: freeze(predictions),
    /** Nuance: surface heuristic flips that still live inside the concept. */
    knownCorrectImmediateSpends: freeze(knownCorrectImmediateSpends),
    contradictions: freeze(contradictions),
    retirementCriteria: freeze(retirementCriteria.length
      ? retirementCriteria
      : defaultConceptRetirement()),
    constructionImplications,
    gameplayImplications: freeze(gameplayImplications),
    crossGameNotes: freeze(crossGameNotes),
    confidence: freeze(conf),
    sources: freeze(sources),
    brainInheritance: "none",
  });
}

function defaultConceptRetirement() {
  return freeze([
    "Repeated contradictory evidence across independent fixtures / expert notes / games",
    "OR the concept fails to transfer: implementations diverge so far that no shared principle remains",
  ]);
}

function confidenceFromConceptEvidence({
  fixtureLinks = [],
  experts = "none",
  tournament = "none",
  play = "none",
  simulation = "none",
  status = "candidate",
} = {}) {
  if (status === "retired") return freeze({ level: "retired", score: 0 });
  if (status === "contradicted") return freeze({ level: "contested", score: 0.35 });

  const strengthens = fixtureLinks.filter((f) => f.relation === "strengthens" || f.relation === "introduces");
  const contradicts = fixtureLinks.filter((f) => f.relation === "contradicts");
  const implementations = new Set(strengthens.map((f) => f.implementation).filter(Boolean));

  let score = 0.2;
  score += Math.min(0.35, strengthens.length * 0.12);
  score += Math.min(0.2, implementations.size * 0.08);
  if (experts === "high") score += 0.2;
  else if (experts === "medium") score += 0.1;
  else if (experts === "low") score += 0.05;
  if (tournament === "high") score += 0.15;
  else if (tournament === "medium") score += 0.08;
  else if (tournament === "low") score += 0.04;
  if (play === "high") score += 0.15;
  else if (play === "medium") score += 0.1;
  else if (play === "low") score += 0.05;
  if (simulation === "high") score += 0.1;
  else if (simulation === "medium") score += 0.06;
  else if (simulation === "low") score += 0.03;
  score -= contradicts.length * 0.15;

  if (status === "strongly_supported") score = Math.max(score, 0.75);
  if (status === "candidate" && strengthens.length === 0) score = Math.min(score, 0.35);

  const level = score >= 0.75 ? "high" : score >= 0.5 ? "moderate" : score >= 0.3 ? "limited" : "insufficient";
  return freeze({ level, score: round(Math.max(0, Math.min(0.95, score))) });
}

/**
 * Era 2 fixture rule: every fixture must introduce, strengthen, or contradict a concept.
 */
export function assertFixtureTeachesConcept(fixture) {
  const teaches = fixture?.teaches;
  if (!teaches?.conceptId) {
    return freeze({
      ok: false,
      reason: "missing_concept",
      note: "Era 2 rule: every fixture must teach a strategic concept (introduce | strengthen | contradict).",
    });
  }
  if (!FIXTURE_CONCEPT_RELATIONS.includes(teaches.relation)) {
    return freeze({
      ok: false,
      reason: "invalid_relation",
      note: `Relation must be one of: ${FIXTURE_CONCEPT_RELATIONS.join(", ")}`,
    });
  }
  return freeze({ ok: true, teaches: freeze(teaches) });
}

/**
 * Attach fixture evidence onto a concept (immutable).
 */
export function attachFixtureToConcept(concept, {
  fixtureId,
  relation,
  implementation = null,
  note = null,
} = {}) {
  if (!concept || !fixtureId || !relation) {
    throw new Error("attachFixtureToConcept requires concept, fixtureId, relation");
  }
  if (!FIXTURE_CONCEPT_RELATIONS.includes(relation)) {
    throw new Error(`Invalid relation: ${relation}`);
  }
  const fixtures = [
    ...(concept.evidence?.fixtures || []).filter((f) => f.fixtureId !== fixtureId),
    freeze({
      fixtureId,
      relation,
      implementation,
      note,
    }),
  ];
  return createStrategicConcept({
    ...concept,
    evidence: {
      ...concept.evidence,
      fixtures,
    },
    confidence: null,
  });
}

export function buildCommitmentTimingConcept({ fixtureLinks = null } = {}) {
  const defaultLinks = freeze([
    freeze({
      fixtureId: "fixture-counter-terminal-on-stack",
      relation: "strengthens",
      implementation: "Permission Timing",
      note: "Spend now: terminal payoff on stack — commitment is correct immediately.",
    }),
    freeze({
      fixtureId: "fixture-hold-counter-vs-dangerous-tutor",
      relation: "strengthens",
      implementation: "Permission Timing",
      note: "Preserve now: dangerous non-terminal setup — commitment deferred.",
    }),
    freeze({
      fixtureId: "fixture-hold-permission-vs-tapout",
      relation: "strengthens",
      implementation: "Threat Timing",
      note: "Do not tap out / commit the finisher into unknown interaction.",
    }),
    freeze({
      fixtureId: "fixture-attack-into-unknown-blockers",
      relation: "strengthens",
      implementation: "Threat Timing",
      note: "Commit attacks when the lethal window is real — timing the board commitment.",
    }),
    freeze({
      fixtureId: "fixture-must-counter-tutor-no-later-window",
      relation: "strengthens",
      implementation: "Permission Timing",
      note: "Nuance: spend on setup when preserving loses immediately.",
    }),
  ]);

  return createStrategicConcept({
    id: "commitment-timing",
    name: "Commitment Timing",
    status: "candidate",
    description:
      "The strategic decision of whether to spend a limited resource now or preserve it for a potentially higher-value future exchange.",
    implementations: [
      "Permission Timing",
      "Removal Timing",
      "Threat Timing",
      "Protection Timing",
      "Engine Timing",
      "Combo Timing",
    ],
    evidence: {
      fixtures: fixtureLinks || defaultLinks,
      experts: "none",
      tournament: "none",
      simulation: "none",
      notes: [
        "Magic-expressed founding set; concept is TCG-agnostic.",
        "Terminal vs non-terminal stack contrast founds Permission Timing.",
      ],
    },
    predictions: [
      "Players who time commitment (spend on payoff / preserve through setup) should outperform reflex spenders in comparable incomplete-information contexts.",
      "The same principle should be recognizable in other TCGs under different card names.",
    ],
    knownCorrectImmediateSpends: [
      "Terminal (or near-terminal) payoff already on the stack / resolving",
      "Lethal or game-ending exchange that will not wait for a future window",
      "Forced commitment where preserving the resource loses immediately",
    ],
    contradictions: [
      "Repeated evidence that 'always spend on setup' or 'never spend on setup' dominates — timing ceases to be the principle",
      "OR cross-game transfer fails under different resource systems",
    ],
    retirementCriteria: [
      "Repeated contradictory evidence across independent fixtures, expert notes, or games",
      "OR the concept collapses into game-rule trivia with no transferable strategic content",
    ],
    constructionImplications: "none",
    gameplayImplications: [
      "Interaction evaluation",
      "Threat assessment under incomplete information",
      "Opportunity-cost framing for limited answers",
    ],
    crossGameNotes: [
      "Magic: counter tutor vs payoff; hold removal; commit threat into open mana",
      "Pokémon: burn Boss's Orders now or later",
      "Lorcana: spend ink now or hold interaction",
      "Flesh and Blood: block now vs preserve hand",
      "One Piece: counter from hand vs keep pressure",
    ],
    sources: defaultLinks.map((link) => ({ kind: "era2_fixture", id: link.fixtureId })),
  });
}

/**
 * Seat Pressure — who must be answered / pressured *now*.
 */
export function buildSeatPressureConcept({ fixtureLinks = null } = {}) {
  const defaultLinks = freeze([
    freeze({
      fixtureId: "fixture-pressure-combo-seat-not-grudge",
      relation: "introduces",
      implementation: "Threat Hierarchy",
      note: "Point lethal / removal at the seat that wins next — not the seat that wronged you.",
    }),
    freeze({
      fixtureId: "fixture-leave-table-check-intact",
      relation: "strengthens",
      implementation: "Table Check Preservation",
      note: "Eliminating the check on the favorite can hand them the game — leave the useful seat.",
    }),
    freeze({
      fixtureId: "fixture-grudge-seat-is-the-clock",
      relation: "strengthens",
      implementation: "Clock Priority",
      note: "Nuance: grudge seating is correct when they are also the only clock.",
    }),
  ]);

  return createStrategicConcept({
    id: "seat-pressure",
    name: "Seat Pressure",
    status: "candidate",
    description:
      "The strategic decision of which opposing seat (or role) must absorb pressure, answers, or elimination right now — ranked by who actually ends the game, not by grievance or convenience.",
    implementations: [
      "Threat Hierarchy",
      "Political Seating",
      "Clock Priority",
      "Kingmaker Avoidance",
      "Table Check Preservation",
    ],
    evidence: {
      fixtures: fixtureLinks || defaultLinks,
      experts: "none",
      tournament: "none",
      simulation: "none",
      notes: [
        "Founding contrast: combo/lethal hierarchy vs grudge seating; table-check preservation vs greed kill.",
      ],
    },
    predictions: [
      "Players who pressure the true winning seat outperform players who allocate answers by revenge or ease.",
      "The same hierarchy language appears in multiplayer and 1v1 TCGs whenever multiple opposing clocks exist.",
    ],
    knownCorrectImmediateSpends: [
      "The 'grudge' seat is also the only real clock — hierarchy and grievance coincide",
      "A soft seat must die to stop an immediate kingmake that locks you out",
    ],
    contradictions: [
      "Evidence that politics/grudge seating systematically outperforms threat hierarchy in comparable pods",
      "OR the concept fails outside multiplayer and has no 1v1 / alternate-TCG analogue",
    ],
    constructionImplications: "none",
    gameplayImplications: [
      "Attack assignment",
      "Removal targeting",
      "Who to leave alive",
    ],
    crossGameNotes: [
      "Magic EDH: kill the combo player, not the guy who Path'd you",
      "Pokémon: pressure the active threat, not the benched grudge",
      "Lorcana: challenge the board that wins the race",
      "FAB / One Piece: assign blocks and counters to the real lethal line",
    ],
    sources: defaultLinks.map((link) => ({ kind: "era2_fixture", id: link.fixtureId })),
  });
}

/**
 * Plan Integrity — protect the primary line vs dilute it.
 */
export function buildPlanIntegrityConcept({ fixtureLinks = null } = {}) {
  const defaultLinks = freeze([
    freeze({
      fixtureId: "fixture-dont-chump-with-wincon",
      relation: "introduces",
      implementation: "Win Condition Preservation",
      note: "Do not spend the plan piece as a chump — keep the line intact.",
    }),
    freeze({
      fixtureId: "fixture-decline-greedy-overextend",
      relation: "strengthens",
      implementation: "Overextension Discipline",
      note: "Decline dumping the hand into open wrath/interaction when those cards are the plan.",
    }),
    freeze({
      fixtureId: "fixture-must-chump-with-wincon-lethal",
      relation: "strengthens",
      implementation: "Win Condition Preservation",
      note: "Nuance: chump with wincon when it is the only defender vs lethal.",
    }),
  ]);

  return createStrategicConcept({
    id: "plan-integrity",
    name: "Plan Integrity",
    status: "candidate",
    description:
      "The strategic decision of whether an action protects, advances, or dilutes the primary winning plan — refusing locally attractive plays that break the line.",
    implementations: [
      "Win Condition Preservation",
      "Overextension Discipline",
      "Role Compression",
      "Package Cohesion",
      "False Tempo Refusal",
    ],
    evidence: {
      fixtures: fixtureLinks || defaultLinks,
      experts: "none",
      tournament: "none",
      simulation: "none",
      notes: [
        "Founding contrast: chump-with-wincon vs keep plan; greedy overextend vs hold for the line.",
        "Bridge concept: Era 1 list judgment and Era 2 play both speak Plan Integrity.",
      ],
    },
    predictions: [
      "Lines that preserve the primary plan under pressure outperform greedier local-value lines in comparable spots.",
      "Construction and gameplay critiques that cite the same plan should agree more often as evidence grows.",
    ],
    knownCorrectImmediateSpends: [
      "The 'plan piece' is also the only legal defender and dying now loses harder",
      "Overextending is required because the race ends this turn otherwise",
    ],
    contradictions: [
      "Evidence that locally greedy dilution systematically wins more than plan-preserving lines",
      "OR 'primary plan' cannot be identified stably enough for the concept to be research-useful",
    ],
    constructionImplications: "era1_may_cite_later_brain_still_none",
    gameplayImplications: [
      "What to block with",
      "What to cast into open mana",
      "Which cards are load-bearing",
    ],
    crossGameNotes: [
      "Magic: don't chump with the combo creature; don't dump into board wipes",
      "Pokémon: don't attach into a known KO if it strands the wincon",
      "Lorcana: don't quest away the song piece you need next turn",
      "FAB: don't block with the attack that is the turn's only lethal",
    ],
    sources: defaultLinks.map((link) => ({ kind: "era2_fixture", id: link.fixtureId })),
  });
}

/**
 * Information Asymmetry — act under unknown vs known information.
 */
export function buildInformationAsymmetryConcept({ fixtureLinks = null } = {}) {
  const defaultLinks = freeze([
    freeze({
      fixtureId: "fixture-play-around-unknown-open-mana",
      relation: "introduces",
      implementation: "Play-Around Discipline",
      note: "Unknown open mana is not empty — sequence as if interaction exists.",
    }),
    freeze({
      fixtureId: "fixture-convert-when-hand-known-empty",
      relation: "strengthens",
      implementation: "Known-Empty Conversion",
      note: "When information collapses (known empty), conversion becomes coherent.",
    }),
    freeze({
      fixtureId: "fixture-convert-into-unknown-race-ends",
      relation: "strengthens",
      implementation: "Partial-Information Sequencing",
      note: "Nuance: race math can force a play into unknown.",
    }),
  ]);

  return createStrategicConcept({
    id: "information-asymmetry",
    name: "Information Asymmetry",
    status: "candidate",
    description:
      "The strategic decision of how to act when critical information is hidden, partial, or suddenly revealed — never treating unknown as absent, and updating commitment when information collapses.",
    implementations: [
      "Play-Around Discipline",
      "Known-Empty Conversion",
      "Partial-Information Sequencing",
      "Reveal Exploitation",
      "Range Respect",
    ],
    evidence: {
      fixtures: fixtureLinks || defaultLinks,
      experts: "none",
      tournament: "none",
      simulation: "none",
      notes: [
        "Founding contrast: play around unknown open mana vs convert when the hand is known empty.",
        "Institutional lock: Unknown is not absent.",
      ],
    },
    predictions: [
      "Players who respect hidden ranges and update on reveals outperform players who treat blanks as empty.",
      "The principle transfers to any TCG with hidden hands, face-down zones, or private resources.",
    ],
    knownCorrectImmediateSpends: [
      "Race math forces a play even into unknown — delay loses harder than the punish",
      "The 'unknown' has been constrained so tightly that the range is effectively empty",
    ],
    contradictions: [
      "Evidence that ignoring hidden information is systematically correct in the domains we study",
      "OR 'unknown ≠ absent' fails as a transferable principle outside one game's rules quirks",
    ],
    constructionImplications: "none",
    gameplayImplications: [
      "Sequencing into open mana",
      "When to go for it after a reveal",
      "Confidence calibration under incomplete boards",
    ],
    crossGameNotes: [
      "Magic: open mana ≠ no counter; revealed empty hand changes the line",
      "Pokémon: unknown hand prizes / supporters",
      "Lorcana: inkwell and hand as hidden interaction",
      "FAB / One Piece: pitch / counter ranges from hand",
    ],
    sources: defaultLinks.map((link) => ({ kind: "era2_fixture", id: link.fixtureId })),
  });
}

function earnedEmergingStatus(concept) {
  if (!concept || concept.status === "retired" || concept.status === "contradicted") return false;
  if (concept.status === "strongly_supported" || concept.status === "emerging") return false;
  const expertsOk = concept.evidence?.experts === "medium" || concept.evidence?.experts === "high";
  const fixtures = concept.evidence?.fixtures?.length || 0;
  const conf = concept.confidence || {};
  if (conf.level === "high" && expertsOk) return true;
  if (conf.score >= 0.7 && expertsOk && fixtures >= 3) return true;
  return false;
}

function withEvidenceBridges(builder) {
  const base = builder();
  const expert = expertEvidencePatch(base.id);
  const tournament = tournamentEvidencePatch(base.id);
  const play = playEvidencePatch(base.id);
  const simulation = simulationEvidencePatch(base.id);
  const notes = freeze([
    ...(base.evidence.notes || []),
    ...expert.notes,
    ...tournament.notes,
    ...play.notes,
    ...simulation.notes,
  ]);
  let concept = createStrategicConcept({
    ...base,
    evidence: {
      ...base.evidence,
      experts: expert.experts,
      tournament: tournament.tournament,
      play: play.play,
      simulation: simulation.simulation,
      notes,
      expertDetail: expert.expertDetail,
      tournamentDetail: tournament.tournamentDetail,
      playDetail: play.playDetail,
      simulationDetail: simulation.simulationDetail,
    },
    sources: freeze([
      ...(base.sources || []),
      ...expert.sources,
      ...tournament.sources,
      ...play.sources,
      ...simulation.sources,
    ]),
    confidence: null,
  });
  if (earnedEmergingStatus(concept)) {
    concept = createStrategicConcept({
      ...concept,
      status: "emerging",
      confidence: null,
      evidence: {
        ...concept.evidence,
        notes: freeze([
          ...(concept.evidence.notes || []),
          "Status elevated to emerging — multi-source evidence; naming is still not promotion.",
        ]),
      },
    });
  }
  return concept;
}

/**
 * The Strategic Concept Library (v0) — Era 2 founding complete.
 */
export function buildStrategicConceptLibrary() {
  const concepts = freeze([
    withEvidenceBridges(buildCommitmentTimingConcept),
    withEvidenceBridges(buildSeatPressureConcept),
    withEvidenceBridges(buildPlanIntegrityConcept),
    withEvidenceBridges(buildInformationAsymmetryConcept),
  ]);
  const emergingCount = concepts.filter((c) => c.status === "emerging").length;
  return freeze({
    writesToBrain: false,
    version: "strategic-concept-library-v0",
    kind: "StrategicConceptLibrary",
    era: 2,
    era2Founding: freeze({
      complete: true,
      label: "Era 2 Complete",
      note: "Vocabulary + evidence bridges + stance voice + play captures + simulation witness locked. Not Brain. Not combat engine.",
      deferredToLaterEras: freeze([
        "Live expert scrape authorization",
        "Live play telemetry ingest",
        "Monte Carlo / full multiplayer rules engine",
        "Brain inheritance of principles",
      ]),
    }),
    namingIsNotPromotion: true,
    brainInheritance: "none",
    fixtureRule: freeze({
      statement:
        "Every new Era 2 fixture must introduce, strengthen, or contradict an existing strategic concept — otherwise do not build it.",
      relations: FIXTURE_CONCEPT_RELATIONS,
    }),
    evidenceRule: freeze({
      statement:
        "Confidence jumps preferably come from expert/tournament evidence — not fixture spam on the same implementation.",
    }),
    foundingSet: freeze([
      "commitment-timing",
      "seat-pressure",
      "plan-integrity",
      "information-asymmetry",
    ]),
    concepts,
    byId: freeze(Object.fromEntries(concepts.map((c) => [c.id, c]))),
    summary: freeze({
      conceptCount: concepts.length,
      candidateCount: concepts.filter((c) => c.status === "candidate").length,
      emergingCount,
      fixtureEvidenceCount: concepts.reduce((n, c) => n + (c.evidence.fixtures?.length || 0), 0),
      expertBands: freeze(Object.fromEntries(concepts.map((c) => [c.id, c.evidence.experts]))),
      tournamentBands: freeze(Object.fromEntries(concepts.map((c) => [c.id, c.evidence.tournament]))),
      playBands: freeze(Object.fromEntries(concepts.map((c) => [c.id, c.evidence.play]))),
      simulationBands: freeze(Object.fromEntries(concepts.map((c) => [c.id, c.evidence.simulation]))),
      byConcept: freeze(Object.fromEntries(concepts.map((c) => [c.id, freeze({
        name: c.name,
        status: c.status,
        confidence: c.confidence,
        fixtureCount: c.evidence.fixtures.length,
        experts: c.evidence.experts,
        tournament: c.evidence.tournament,
        play: c.evidence.play,
        simulation: c.evidence.simulation,
        independentVoices: c.evidence.expertDetail?.independentVoices || 0,
        tournamentObservations: c.evidence.tournamentDetail?.independentObservations || 0,
        playCaptures: c.evidence.playDetail?.captureCount || 0,
      })]))),
    }),
  });
}

export function getStrategicConcept(id) {
  return buildStrategicConceptLibrary().byId[id] || null;
}
