// Evidence-backed review-focus evaluation — the server side of the
// Review-path "Before we dive in" coaching focus. Split out of
// review-focus.mjs (which stays client-safe and ships in the browser
// bundle) so none of this — the evidence-reading logic, the coaching
// thresholds, or the sentence templates themselves — ever reaches the
// client. worker/forge-generate.ts is this module's only caller, the same
// way it already calls the other native/server reasoning modules in this
// directory (native-masterwork-reasoning.mjs, commander-power-signal.mjs,
// forge-structural-pipeline.mjs, etc. — see
// tests/affiliate-links-isolation.test.mjs's ENGINE_MODULES list for the
// established convention this follows).
//
// Turns the player's one-click coaching focus into a structured coaching
// result, read directly off this generation's own nativeReport (worker/
// forge-generate.ts's forgeImportedMasterwork output) — the same numbers
// and card names the Forge already computed to build the deck, never a
// fresh judgment call and never a label-triggered fabrication. Selecting
// "Better interaction" does not, by itself, manufacture an interaction
// problem: if the evidence shows the deck is well covered, the result says
// so. Every claim stays inside what was actually detected — a combo pair
// or a repeatable engine is reported as "contributes to" or "a verified
// combination," never as proof it wins the game on its own, and an empty
// detection list is reported as "not detected in the evidence tracked,"
// never as an absolute "there is no way to do this."
//
// Every evaluator below reads only fields that already exist on
// nativeReport for the imported/refine path: selected.rows,
// selected.evaluation, manaConsistency, powerSignal (Commander-format
// builds only — null otherwise), structuralAnalysis, and
// unusedEnginePartners. Nothing here calls an external model, adds a new
// classifier, or invents a field the engine doesn't already report.
//
// Voice: every sentence below is written for a player who started playing
// Commander yesterday, not for someone reading an engine log. Internal
// metric names (power signal, resilience score, curve health, strongest
// system, average CMC, "engine" as a bare unexplained term) are
// deliberately never printed on their own — the numbers behind them still
// drive every judgment call, they're just translated into what a player
// would actually notice at the table, with jargon introduced only after
// the plain-language version, never instead of it. Each result follows
// the same three-beat rhythm: acknowledge what the player wanted help
// with, explain what the Forge actually observed, then end by naming one
// concrete thing to watch for in a future game — never a bare "here's the
// answer."
import { isValidReviewFocus } from "./review-focus.mjs";

const nonlandRows = (rows) => rows.filter((row) => !row.roles?.includes("land"));

const rowsWithRole = (rows, role) => nonlandRows(rows).filter((row) => row.roles?.includes(role));

const roleNamesFrom = (rows, role) => rowsWithRole(rows, role).map((row) => row.name);

const cardListSample = (names, limit = 3) =>
  names.length <= limit ? names.join(", ") : `${names.slice(0, limit).join(", ")}, and ${names.length - limit} more`;

// Translates the engine's 0-100 curveHealth score (a heuristic distance
// from an ideal average cost for the deck's strategy, not an objective
// "healthy/unhealthy" verdict the engine itself asserts) into what a
// player would notice at the table — deliberately descriptive, not
// evaluative, since the underlying score carries no explicit "this is
// healthy" threshold to stand behind.
function curveFeel(curveHealth) {
  if (curveHealth >= 75) return "should let the deck begin making meaningful plays reasonably early";
  if (curveHealth >= 50) return "runs a little higher than that, though not unusually so";
  return "sits high enough that slow starts are likely more often than not";
}

// Translates the engine's 0-1 roleCoverage fraction (how much of the
// format's usual functional needs — draw, removal, threats, etc. — the
// deck fills) into plain language. This one IS a direct, real percentage
// (not a synthetic heuristic score like curveHealth above), so it's
// reported as the actual number rather than a bucketed label.
function coverageFeel(roleCoverage) {
  return `covers about ${Math.round(roleCoverage * 100)}% of what a deck like this usually needs`;
}

function evaluateFasterStarts(report) {
  const { averageCmc, curveHealth } = report.selected.evaluation;
  const earlyRisky = (report.manaConsistency?.risky || []).filter((card) => card.turn <= 3);
  const fastMana = report.powerSignal?.fastMana || [];
  const parts = [`Most of your spells cost around ${Math.round(averageCmc)} mana, which ${curveFeel(curveHealth)}.`];
  if (fastMana.length) {
    parts.push(`You've also got ${fastMana.length} card${fastMana.length === 1 ? "" : "s"} that get you extra mana early (${cardListSample(fastMana)}), which helps offset that.`);
  }
  if (earlyRisky.length) {
    parts.push(`One thing worth knowing: ${cardListSample(earlyRisky.map((card) => card.name))} — castable as early as turn ${earlyRisky[0].turn} — has only around a ${Math.round(earlyRisky[0].probability * 100)}% chance of having the right color of mana on time, which can leave it stuck in your hand.`);
  }
  return {
    evidence: parts.join(" "),
    nextStep: earlyRisky.length
      ? `Over your next few games, watch whether ${earlyRisky[0].name} is the card that stalls in your hand early — if that keeps happening, it's your mana, not your deck's plan, that's slowing you down.`
      : `Over your next few games, pay attention to which turn you're actually casting your first real spell — that tells you more about your starts than any list of cards can.`,
    insufficientEvidence: false,
  };
}

function evaluateConsistency(report) {
  const consistency = report.manaConsistency;
  const overallPct = Math.round((consistency?.overall ?? 1) * 100);
  const risky = consistency?.risky || [];
  const parts = [`About ${overallPct}% of the time, you'll have the colors of mana you need exactly when you need them.`];
  if (risky.length) {
    parts.push(`${cardListSample(risky.map((card) => card.name))} ${risky.length === 1 ? "is" : "are"} the shakiest — roughly a ${Math.round(risky[0].probability * 100)}% shot at having the right colors by the turn you'd want to cast ${risky.length === 1 ? "it" : "them"}.`);
  } else {
    parts.push(`Nothing in the deck is a real risk on colors, so if games still feel inconsistent, the mana base probably isn't why.`);
  }
  return {
    evidence: parts.join(" "),
    nextStep: risky.length
      ? `Next few games, keep an eye on ${risky[0].name} specifically — notice whether it's genuinely stuck on color, or just ordinary bad luck on lands.`
      : `Next few games, notice which part of your hand actually lets you down when things feel inconsistent — draw, ramp, answers — since it likely isn't your colors.`,
    insufficientEvidence: false,
  };
}

function evaluateClosingGames(report) {
  const signal = report.powerSignal;
  if (!signal) {
    // Non-Commander formats never get a powerSignal read (forge-generate.ts
    // only computes it for Commander/Brawl/Standard Brawl) — there's no
    // direct "how does this deck close games" measurement for this format.
    // Rather than end on that gap, pivot to the strongest evidence that IS
    // available: the deck's own functional coverage and curve.
    const { roleCoverage, curveHealth } = report.selected.evaluation;
    return {
      evidence: `I don't have a reliable way to measure how this deck closes games outside Commander or Brawl. What I can tell you: the deck ${coverageFeel(roleCoverage)}, and its curve ${curveFeel(curveHealth)}.`,
      nextStep: `The real answer only shows up at the table — over your next few games, notice which turn games actually end, and whether it's usually the same card or the same plan getting you there.`,
      insufficientEvidence: true,
    };
  }
  const closers = [...new Set([...signal.extraTurns, ...signal.repeatableValueEngine])];
  const comboPairs = signal.comboProximity?.pairs || [];
  if (!closers.length && !comboPairs.length) {
    return {
      evidence: `The Forge did not detect a dedicated finisher or a known two-card combination in the evidence it currently tracks — and that's not necessarily a flaw, it usually just means you win through steady pressure over a few turns instead of one big moment.`,
      nextStep: `Next few games, notice how your wins actually happen — if it's always a grind to the finish line, that's worth remembering next time you're choosing between two cards for this deck.`,
      insufficientEvidence: true,
    };
  }
  const parts = [];
  if (closers.length) parts.push(`${cardListSample(closers)} contribute${closers.length === 1 ? "s" : ""} directly to how this deck can finish a game.`);
  if (comboPairs.length) parts.push(`You've also got a verified two-card combination in the deck (${cardListSample(comboPairs)}) — a real interaction, though that alone doesn't guarantee it wins the game outright.`);
  return {
    evidence: parts.join(" "),
    nextStep: `Next time you play, notice whether ${closers[0] || comboPairs[0]} is actually the thing that ends your games — or whether something else usually gets there first. That'll tell you if the deck's real closer matches the one on paper.`,
    insufficientEvidence: false,
  };
}

function evaluateInteraction(report) {
  const signal = report.powerSignal;
  const named = signal ? signal.efficientInteraction : roleNamesFrom(report.selected.rows, "interaction");
  const parts = [];
  if (named.length) {
    parts.push(`You've got ${named.length} card${named.length === 1 ? "" : "s"} that can answer an opponent's threat: ${cardListSample(named)}.`);
  } else {
    parts.push(`The Forge did not detect a card in the deck built to answer an opponent's creature, spell, or plan directly.`);
  }
  return {
    evidence: parts.join(" "),
    nextStep: named.length
      ? (named.length < 6
        ? `Next few games, notice the turns when an opponent does something scary and you've got nothing to answer it with — that's the real test of whether ${named.length} answer${named.length === 1 ? "" : "s"} is enough for your table.`
        : `With ${named.length} different answers, you're unlikely to be caught with nothing to do — next few games, pay attention to whether they're hitting the right kind of target, not just whether you have enough of them.`)
      : `Next few games, watch for the moment an opponent does something you can't respond to — that's exactly the gap this points to, and it'll tell you what kind of answer to look for first.`,
    insufficientEvidence: false,
  };
}

function evaluateUnderstanding(report) {
  const strongest = report.structuralAnalysis?.systems?.strongestSystem;
  const partners = report.unusedEnginePartners || [];
  const parts = [];
  if (strongest) {
    parts.push(`Those cards — ${cardListSample(strongest.members)} — work together to create this deck's clearest, most repeatable plan. Commander players often call a group of cards like this an "engine."`);
  }
  if (partners.length) {
    parts.push(`One thing worth noticing: ${partners[0].card} isn't in the deck, but it would feed directly into what ${partners[0].partner} is already doing — a sign of where this deck's plan could go further.`);
  }
  if (!strongest && !partners.length) {
    const { roleCoverage } = report.selected.evaluation;
    return {
      evidence: `This deck doesn't lean on one clear repeatable plan — it ${coverageFeel(roleCoverage)}, more like a well-rounded pile of good cards than a single theme.`,
      nextStep: `Next few games, notice which cards you're most excited to draw — that'll tell you what this deck's real plan is, even when the list itself doesn't spell it out.`,
      insufficientEvidence: true,
    };
  }
  return {
    evidence: parts.join(" "),
    nextStep: partners.length
      ? `Something to sit with before you next tune this deck: does ${partners[0].card} do more for it than your weakest current card?`
      : `Next few games, notice whether every other card is actually supporting that plan, or just along for the ride.`,
    insufficientEvidence: false,
  };
}

function evaluateNotSure(report) {
  const consistency = evaluateConsistency(report);
  const interaction = evaluateInteraction(report);
  return {
    evidence: `${consistency.evidence} ${interaction.evidence}`,
    nextStep: `${consistency.nextStep} From there, ${interaction.nextStep.charAt(0).toLowerCase()}${interaction.nextStep.slice(1)}`,
    insufficientEvidence: false,
  };
}

const FOCUS_ASKED = Object.freeze({
  "Faster starts": "You wanted to know why this deck sometimes feels like it's playing catch-up early on.",
  "More consistency": "You wanted to know why some games with this deck come together and others just don't.",
  "Closing games": "You wanted to know why this deck has trouble actually finishing games.",
  "Better interaction": "You wanted to know whether this deck can handle what your opponents throw at it.",
  "Understanding the deck": "You wanted a clearer picture of what this deck is actually trying to do.",
  "Not sure yet": "You weren't sure what to look at, so let's start with what stands out most.",
});

const FOCUS_EVALUATORS = Object.freeze({
  "Faster starts": evaluateFasterStarts,
  "More consistency": evaluateConsistency,
  "Closing games": evaluateClosingGames,
  "Better interaction": evaluateInteraction,
  "Understanding the deck": evaluateUnderstanding,
  "Not sure yet": evaluateNotSure,
});

// The one entry point worker/forge-generate.ts calls once reviewFocus has
// already been validated against REVIEW_FOCUS_OPTIONS (review-focus.mjs's
// canonical, client-safe list) and the imported deck has been built.
// Returns null for no selection — reviewFocus is never required.
export function evaluateReviewFocus(reviewFocus, nativeReport) {
  if (!isValidReviewFocus(reviewFocus)) return null;
  const evaluator = FOCUS_EVALUATORS[reviewFocus];
  const { evidence, nextStep, insufficientEvidence } = evaluator(nativeReport);
  const asked = FOCUS_ASKED[reviewFocus];
  return Object.freeze({
    focus: reviewFocus,
    asked,
    evidence,
    nextStep,
    insufficientEvidence,
    concise: `${asked} ${evidence} ${nextStep}`,
  });
}
