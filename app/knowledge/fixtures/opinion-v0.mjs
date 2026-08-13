import {
  compileOpinionContext,
  createOpinionClaim,
  synthesizeStrategicOpinion,
} from "../opinion-engine.mjs";

export const JAY_ATRAXA_COMMISSION = Object.freeze({
  fantasyLabel: "Doubling Season Superfriends",
  priorities: Object.freeze(["Theme over optimization", "Planeswalker spectacle"]),
  playerFantasy: Object.freeze({
    label: "Superfriends",
    anchors: Object.freeze(["Doubling Season"]),
    priorities: Object.freeze(["Doubling Season is one of the stars of the show"]),
  }),
});

export function buildJayDoublingSeasonOpinion({ now = "2026-08-13T00:00:00.000Z" } = {}) {
  const context = compileOpinionContext({
    question: "Should Jay's Atraxa Superfriends deck play Doubling Season?",
    format: "Commander",
    commanderName: "Atraxa, Praetors' Voice",
    subject: "Doubling Season",
    decision: "include_or_cut",
    deckRevision: "jay-atraxa-founder-025",
    commission: JAY_ATRAXA_COMMISSION,
    constraints: ["Theme fidelity is more important than maximum win rate"],
    timeHorizon: { window: "before resolving a high-impact planeswalker" },
  });

  const claims = [
    createOpinionClaim({
      id: "jay-contract-anchor-doubling-season",
      statement: "Keep Doubling Season: Jay explicitly commissioned it as a star of the deck.",
      direction: "support",
      strength: 1,
      source: { kind: "commission_contract", label: "Jay founder commission", independenceKey: "jay-commission" },
      scope: { formats: ["Commander"], commanders: ["Atraxa, Praetors' Voice"], subjects: ["Doubling Season"], requiresCommissionAnchor: true },
      reasoning: "Removing the named centerpiece would improve a different deck instead of fulfilling this player's request.",
      falsifier: "Jay changes the commission and no longer wants Doubling Season to be a centerpiece.",
    }),
    createOpinionClaim({
      id: "doubling-season-planeswalker-counter-replacement",
      statement: "Doubling Season increases the loyalty counters with which Jay's planeswalkers enter, raising their immediate ceiling.",
      direction: "support",
      strength: 0.92,
      source: { kind: "oracle_mechanics", label: "Card mechanics", independenceKey: "doubling-season-oracle" },
      scope: { formats: ["Commander"], subjects: ["Doubling Season"] },
      reasoning: "That interaction directly serves the requested Superfriends experience rather than merely adding generic value.",
      falsifier: "The finished list no longer contains enough planeswalkers for the counter replacement effect to be a central payoff.",
    }),
    createOpinionClaim({
      id: "doubling-season-five-mana-tempo-risk",
      statement: "A five-mana enchantment that does not immediately protect itself can lose tempo against fast or removal-heavy pods.",
      direction: "oppose",
      strength: 0.78,
      source: { kind: "structural_evaluation", label: "Commitment timing", independenceKey: "commitment-timing" },
      scope: { formats: ["Commander"], subjects: ["Doubling Season"] },
      reasoning: "Casting it without a follow-up planeswalker or protection window exposes a full turn of mana for no immediate board recovery.",
      falsifier: "Observed games show the deck consistently deploys and converts Doubling Season in the same protected turn window.",
    }),
    createOpinionClaim({
      id: "fixture-corpus-not-live-truth",
      statement: "The tournament-shaped fixture corpus is useful for exercising the evaluation path, but it cannot establish live metagame correctness.",
      direction: "uncertain",
      strength: 1,
      source: { kind: "competitive_fixture_corpus", label: "Field Validation fixture", fixture: true, independenceKey: "competitive-fixture-corpus-v1" },
      scope: { formats: ["Commander"] },
      reasoning: "Fixture provenance limits what MetaForge is entitled to infer from it.",
      falsifier: "A separately authorized live corpus with auditable provenance replaces this observation.",
    }),
  ];

  return synthesizeStrategicOpinion({
    context,
    claims,
    now,
    proposedTest: {
      id: "jay-doubling-season-window-test-v0",
      change: "Keep Doubling Season and track its cast windows without changing the rest of the revision.",
      expected: "It produces a meaningful planeswalker conversion in games where it is cast with a follow-up or protection window.",
      weakensOpinionWhen: "Across at least five comparable games, it repeatedly strands in hand or is cast without producing a planeswalker payoff before the next turn cycle.",
      minimumComparableObservations: 5,
    },
  });
}

