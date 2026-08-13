// =============================================================================
// Opinion Claim Registry v0 — server-owned, contextual, versioned knowledge
// =============================================================================
// The registry decides which evidence MetaForge is authorized to consider.
// API callers select a registered question; they cannot submit claims.
// writesToBrain: false
// =============================================================================

import { compileOpinionContext, createOpinionClaim, synthesizeStrategicOpinion } from "./opinion-engine.mjs";

const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const OPINION_CLAIM_REGISTRY_VERSION = "opinion-claim-registry-v0";

export const CONTEXTUAL_CARD_IDENTITIES = freeze({
  "doubling-season": {
    card: "Doubling Season",
    roles: ["counter multiplier", "token multiplier", "planeswalker ceiling payoff"],
    earliestRealisticWindow: "Turn five without acceleration; strongest when a payoff can follow before opponents untap.",
    setupRequirements: ["Enough counter or token payoffs", "A protected conversion window"],
    floor: "A five-mana enchantment that may not affect the current board.",
    ceiling: "Doubles relevant counters and tokens; planeswalkers can enter with substantially more loyalty.",
    opportunityCost: "Consumes a high-leverage turn that could deploy a threat, interaction, or recovery piece.",
    dependencies: ["Counter/token density", "Follow-up payoff", "Protection or low opponent pressure"],
    replaceability: "Its multiplier job is unusual; its five-mana setup job is replaceable by cheaper, narrower enablers.",
    goodStates: ["Payoff in hand", "Stable mana", "Opponents cannot punish an exposed setup turn"],
    badStates: ["Behind on board", "No payoff available", "Fast pod threatening a win"],
  },
  "black-market-connections": {
    card: "Black Market Connections",
    roles: ["repeatable card flow", "treasure production", "optional body production"],
    earliestRealisticWindow: "Turn three, but only when spending the turn does not break required color development or interaction posture.",
    setupRequirements: ["Life total as a resource", "Time to receive an upkeep trigger"],
    floor: "Pays life and a full card for value that begins on the next upkeep.",
    ceiling: "Flexible recurring cards, mana, and bodies from one permanent.",
    opportunityCost: "Competes with commander setup, three-mana interaction, and color fixing.",
    dependencies: ["Surviving to upkeep", "Life buffer"],
    replaceability: "The combined flexibility is distinctive; individual jobs are replaceable.",
    goodStates: ["Life total is safe", "Development is already on schedule"],
    badStates: ["Under pressure", "Commander colors are not secured", "Immediate interaction is required"],
  },
  "supreme-verdict": {
    card: "Supreme Verdict",
    roles: ["board reset", "recovery"],
    earliestRealisticWindow: "Turn four with exact colors; correct timing depends on threats caught, not mana value alone.",
    setupRequirements: ["White-white-blue access", "Opponent board worth resetting"],
    floor: "Dead or harmful when your own board is the one worth preserving.",
    ceiling: "Reliable creature reset that cannot be countered.",
    opportunityCost: "Resets your creatures and leaves less mana to redeploy.",
    dependencies: ["Color access", "Asymmetric recovery plan"],
    replaceability: "Many sweepers fill the reset job with different timing and collateral costs.",
    goodStates: ["Multiple opposing threats", "You recover faster"],
    badStates: ["Creature-light opponents", "Your engine depends on creatures already in play"],
  },
  "teferis-protection": {
    card: "Teferi's Protection",
    roles: ["board protection", "loss prevention", "commitment insurance"],
    earliestRealisticWindow: "Held up once the board or life total is worth protecting; not an automatic turn-three cast.",
    setupRequirements: ["Three open mana", "A meaningful threat to answer"],
    floor: "Three mana held open without a relevant opposing action.",
    ceiling: "Preserves life and permanents through many resets or lethal turns.",
    opportunityCost: "Holding mana can delay development.",
    dependencies: ["Correct read of the threat window"],
    replaceability: "Broad coverage is difficult to replace; narrower protection may be cheaper.",
    goodStates: ["Developed board", "Telegraphed reset", "Lethal attack"],
    badStates: ["No meaningful board", "Development is already far behind"],
  },
  "swan-song": {
    card: "Swan Song",
    roles: ["cheap permission", "plan protection"],
    earliestRealisticWindow: "From turn one, but only for enchantment, instant, or sorcery threats.",
    setupRequirements: ["Blue mana held open", "A target in its legal range"],
    floor: "Cannot answer creatures or artifacts and gives the opponent a flying body.",
    ceiling: "Protects a high-investment line for one mana.",
    opportunityCost: "Narrow target range compared with broader counters.",
    dependencies: ["Threat-class prediction"],
    replaceability: "The one-mana insurance profile is strong; broader alternatives cost more.",
    goodStates: ["Protecting a centerpiece", "Stopping a decisive noncreature spell"],
    badStates: ["Creature-combo pressure", "Bird token materially changes combat"],
  },
});

function fixtureClaim({ id, statement, direction, strength, scope, reasoning, falsifier }) {
  return createOpinionClaim({
    id,
    statement,
    direction,
    strength,
    source: { kind: "illustrative_fixture", label: "Founder contextual proof fixture", fixture: true, independenceKey: id },
    scope,
    reasoning,
    falsifier,
  });
}

const REGISTRY = freeze({
  "founder-025-jay-atraxa-doubling-season": {
    label: "Theme-first Atraxa Superfriends",
    playerQuestion: "Why is Doubling Season here, and should Jay keep it?",
    context: {
      question: "Should Jay's Atraxa Superfriends deck keep Doubling Season?", format: "Commander",
      commanderName: "Atraxa, Praetors' Voice", subject: "Doubling Season", decision: "keep_or_cut",
      deckRevision: "jay-atraxa-founder-025", commission: { fantasyLabel: "Superfriends", priorities: ["Theme over optimization"], playerFantasy: { label: "Superfriends", anchors: ["Doubling Season"] } },
      constraints: ["Doubling Season is a named star", "Maximum win rate is not the primary goal"],
    },
    claimSpecs: [
      { id: "jay-contract", statement: "Keep Doubling Season: it is a named star of Jay's commission.", direction: "support", strength: 1, source: "commission" },
      { id: "walker-payoff", statement: "Its counter replacement directly advances this revision's planeswalker spectacle.", direction: "support", strength: 0.95, source: "mechanics" },
      { id: "five-mana-window", statement: "Its five-mana setup window can be punished before a planeswalker converts the investment.", direction: "oppose", strength: 0.78, source: "fixture" },
    ],
    proposedTest: { id: "jay-window-test", instruction: "Track five comparable games: was Doubling Season followed by a planeswalker before opponents untapped?", minimumComparableObservations: 5 },
  },
  "speed-atraxa-superfriends-doubling-season": {
    label: "Speed-first Atraxa Superfriends",
    playerQuestion: "Does Doubling Season earn its turn in a speed-first Atraxa revision?",
    context: {
      question: "Should a speed-first Atraxa Superfriends deck keep Doubling Season?", format: "Commander",
      commanderName: "Atraxa, Praetors' Voice", subject: "Doubling Season", decision: "keep_or_cut",
      deckRevision: "atraxa-speed-shadow-v0", commission: { fantasyLabel: "Fast Superfriends", priorities: ["Minimize exposed setup turns"] },
      constraints: ["Speed and protected conversion outrank spectacle"],
    },
    claimSpecs: [
      { id: "speed-exposed-window", statement: "Cut Doubling Season when this speed-first commission cannot convert a five-mana setup before opponents receive a winning window.", direction: "oppose", strength: 1, source: "commission" },
      { id: "speed-walker-ceiling", statement: "Doubling Season still creates unusually strong planeswalker ceilings when cast with immediate follow-up.", direction: "support", strength: 0.7, source: "mechanics" },
      { id: "speed-context-unknown", statement: "This is a shadow revision, not live evidence that every high-power Atraxa list should cut the card.", direction: "uncertain", strength: 1, source: "fixture" },
    ],
    proposedTest: { id: "speed-conversion-test", instruction: "Goldfish ten hands and record the first turn the card can be cast with a same-turn or protected follow-up.", minimumComparableObservations: 10 },
  },
  "counters-atraxa-doubling-season": {
    label: "Atraxa counters, low planeswalker density",
    playerQuestion: "Is Doubling Season justified without the Superfriends commission?",
    context: {
      question: "Should an Atraxa counters deck with low planeswalker density keep Doubling Season?", format: "Commander",
      commanderName: "Atraxa, Praetors' Voice", subject: "Doubling Season", decision: "keep_or_cut",
      deckRevision: "atraxa-counters-shadow-v0", commission: { fantasyLabel: "+1/+1 counters", priorities: ["Creature counter growth"] },
      constraints: ["Low planeswalker density", "Counter density not yet measured"],
    },
    claimSpecs: [
      { id: "counters-mechanical-fit", statement: "Doubling Season can multiply +1/+1 counters placed by this deck.", direction: "support", strength: 0.82, source: "mechanics" },
      { id: "counters-density-unknown", statement: "The exact revision has not yet proved enough counter-producing density to justify a five-mana multiplier.", direction: "oppose", strength: 1, source: "structural" },
      { id: "counters-no-walker-contract", statement: "The card has no commission-anchor protection here; mechanical fit alone is not a verdict.", direction: "uncertain", strength: 1, source: "fixture" },
    ],
    proposedTest: { id: "counter-density-test", instruction: "Measure how many cards in the exact 99 place counters and how often a multiplier has a live follow-up by turn six.", minimumComparableObservations: 10 },
  },
});

function claimFromSpec(spec, context) {
  const scope = { formats: [context.format], commanders: [context.commanderName], subjects: [context.subject] };
  if (spec.source === "commission") return createOpinionClaim({
    id: spec.id, statement: spec.statement, direction: spec.direction, strength: spec.strength,
    source: { kind: "commission_contract", label: context.deckRevision, independenceKey: `${context.deckRevision}:commission` }, scope,
    reasoning: "The player's commission controls what success means for this revision.", falsifier: "The player changes the commission.",
  });
  if (spec.source === "mechanics") return createOpinionClaim({
    id: spec.id, statement: spec.statement, direction: spec.direction, strength: spec.strength,
    source: { kind: "oracle_mechanics", label: "Card mechanics", independenceKey: `mechanics:${context.subject}` }, scope,
    reasoning: "Mechanical interaction establishes possibility, not universal desirability.", falsifier: "The relevant payoff density or rules interaction changes.",
  });
  if (spec.source === "structural") return createOpinionClaim({
    id: spec.id, statement: spec.statement, direction: spec.direction, strength: spec.strength,
    source: { kind: "structural_evaluation", label: `${context.deckRevision} structural coverage`, independenceKey: `${context.deckRevision}:structure` }, scope,
    reasoning: "Exact-revision coverage is required before mechanical possibility becomes a recommendation.", falsifier: "A complete revision audit demonstrates sufficient live payoff density.",
  });
  return fixtureClaim({ ...spec, scope, reasoning: "Founder proof context only; replication is still required.", falsifier: "Exact-revision observation contradicts this shadow assumption." });
}

export function registeredOpinionCatalog() {
  return freeze({
    version: OPINION_CLAIM_REGISTRY_VERSION,
    writesToBrain: false,
    questions: freeze(Object.entries(REGISTRY).map(([opinionKey, entry]) => freeze({
      opinionKey, label: entry.label, playerQuestion: entry.playerQuestion,
      commanderName: entry.context.commanderName, subject: entry.context.subject,
      deckRevision: entry.context.deckRevision, fantasy: entry.context.commission.fantasyLabel,
      cardIdentity: CONTEXTUAL_CARD_IDENTITIES["doubling-season"],
    }))),
    cardIdentities: freeze(Object.values(CONTEXTUAL_CARD_IDENTITIES)),
  });
}

export function buildRegisteredOpinion(opinionKey, { now = new Date().toISOString() } = {}) {
  const entry = REGISTRY[opinionKey];
  if (!entry) return null;
  const context = compileOpinionContext(entry.context);
  return synthesizeStrategicOpinion({
    context,
    claims: entry.claimSpecs.map((spec) => claimFromSpec(spec, context)),
    proposedTest: entry.proposedTest,
    now,
  });
}

export function getContextualCardIdentity(cardName = "") {
  const key = String(cardName).toLocaleLowerCase("en").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return CONTEXTUAL_CARD_IDENTITIES[key] || null;
}
