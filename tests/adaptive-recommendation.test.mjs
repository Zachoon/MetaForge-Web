import assert from "node:assert/strict";
import test from "node:test";
import CANDIDATE from "../app/forge-candidate.mjs";
import { buildSideboard, evaluateLastMatchSignal, evaluateMatchupEvidence, simulationRoleFor, strategyArchetypeFor } from "../app/adaptive-recommendation.mjs";

const aggroCards = ["Hired Claw", "Emberheart Challenger", "Slickshot Show-Off", "Lightning Strike", "Mountain"];
const match = (id, result, cards = aggroCards) => ({ id, result, revealedOpponentCards: cards });

test("does not rewrite a deck from one noisy matchup result", () => {
  const result = evaluateMatchupEvidence([match("1", "loss")], CANDIDATE);
  assert.equal(result.status, "observe");
  assert.equal(result.proposedDeck, undefined);
});

test("turns the latest match into immediate coaching without rewriting the deck", () => {
  const result = evaluateLastMatchSignal(match("latest", "loss"), CANDIDATE);
  assert.equal(result.status, "watch");
  assert.equal(result.strategy, "Aggro");
  assert.equal(result.candidateOption.card, "Floodpits Drowner");
  assert.match(result.narrative, /One match updates the watchlist, not the deck/i);
  assert.equal(result.proposedDeck, undefined);
});

test("creates a card-for-card repair for a repeated classified weakness", () => {
  const result = evaluateMatchupEvidence([match("1", "loss"), match("2", "loss"), match("3", "win")], CANDIDATE);
  assert.equal(result.status, "repair-ready");
  assert.equal(result.weakness.strategy, "Aggro");
  assert.equal(result.changes.reduce((sum, change) => sum + change.quantity, 0), 0);
  assert.match(result.proposedDeck, /Floodpits Drowner/);
  assert.notEqual(result.proposedDeck, CANDIDATE.deckText);
});

test("simulationRoleFor classifies into the exact vocabulary PLANS.add already searches by", () => {
  assert.equal(simulationRoleFor({ typeLine: "Land", oracleText: "" }), "land");
  assert.equal(simulationRoleFor({ typeLine: "Sorcery", oracleText: "Destroy all creatures." }), "sweeper");
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Destroy target creature." }), "removal");
  // A land-tutor spell's own text contains the word "land," which the
  // "Mana source" check above matches first — real, pre-existing behavior
  // of this classifier (ported unchanged from page.tsx), not something
  // introduced here. A manarock with no "land" in its text lands on "ramp"
  // as expected.
  assert.equal(simulationRoleFor({ typeLine: "Sorcery", oracleText: "Search your library for a land card." }), "land");
  assert.equal(simulationRoleFor({ typeLine: "Artifact", oracleText: "Add one mana of any color." }), "ramp");
  assert.equal(simulationRoleFor({ typeLine: "Sorcery", oracleText: "Draw two cards." }), "draw");
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Target creature gains hexproof." }), "protection");
  assert.equal(simulationRoleFor({ typeLine: "Creature", oracleText: "Vigilance." }), "finisher");
  assert.equal(simulationRoleFor({ typeLine: "Artifact", oracleText: "Equip {2}." }), "stabilizer");
  // "nonland" contains "land" as a bare substring — one of the broadest
  // removal templates in the game (Anguished Unmaking, Vindicate) must
  // classify as removal, not get misread as a mana source. Same class of
  // bug already fixed once in native-masterwork-engine.mjs's
  // interactionQualityFor and forge-interaction-graph.mjs's
  // COLOR_TYPE_RESTRICTION for the same reason.
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Exile target nonland permanent." }), "removal");
});

test("strategyArchetypeFor maps a Blueprint strategy string to the exact archetype key matchup-simulation.mjs's PROFILES uses", () => {
  // "Aggressive" is the exact real strategy key native-masterwork-engine.mjs's
  // own STRATEGY_WEIGHTS uses (confirmed in its own test suite) — must map
  // to Aggro, not fall through to Midrange.
  assert.equal(strategyArchetypeFor("Aggressive"), "Aggro");
  assert.equal(strategyArchetypeFor("Aggro"), "Aggro");
  assert.equal(strategyArchetypeFor("Full aggro pressure"), "Aggro");
  assert.equal(strategyArchetypeFor("Control"), "Control");
  assert.equal(strategyArchetypeFor("Tempo"), "Tempo");
  assert.equal(strategyArchetypeFor("Balanced midrange"), "Midrange");
  assert.equal(strategyArchetypeFor("Combo"), "Midrange");
  assert.equal(strategyArchetypeFor(""), "Midrange");
});

test("simulationRoleFor gives counterspells their own role instead of collapsing them into removal", () => {
  // Control's PLANS entry specifically searches sideboard-counter, and
  // Aggro's/Midrange's specifically cut counter — dead search terms until
  // a counterspell could actually earn this role.
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Counter target spell." }), "counter");
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Counter target spell unless its controller pays {3}." }), "counter");
  // A counterspell with a damage rider clause is still a counterspell
  // first, not misread as removal because the text also mentions damage.
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Counter target spell. If that spell is countered this way, exile it instead and its controller loses 2 life." }), "counter");
  // Real removal (no "counter target spell" phrasing) is unaffected.
  assert.equal(simulationRoleFor({ typeLine: "Instant", oracleText: "Destroy target creature." }), "removal");
});

test("buildSideboard fills a real 15-card sideboard from the unused pool, spread across the roles PLANS.add can actually search", () => {
  const card = (name, typeLine, oracleText, score) => ({ name, typeLine, oracleText, score });
  const pool = [
    card("Ashen Ambush", "Sorcery", "Destroy all creatures.", 40),
    card("Cinder Blast", "Instant", "Destroy target creature.", 38),
    card("Snapping Answer", "Instant", "Counter target spell.", 37),
    card("Reclaim the Field", "Sorcery", "Target creature gains hexproof.", 20),
    card("Grand Finisher", "Creature", "Flying.", 30),
    card("Already Playing", "Creature", "Vigilance.", 50),
  ];
  const sideboard = buildSideboard(pool, ["Already Playing"], { target: 5 });
  assert.ok(sideboard.every((row) => row.role.startsWith("sideboard-")), "every entry must use the sideboard-* role prefix PLANS.add expects");
  assert.ok(!sideboard.some((row) => row.card === "Already Playing"), "never re-offers a card already in the main deck");
  const totalQuantity = sideboard.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(totalQuantity, 5, "fills exactly the requested target size");
  const roles = new Set(sideboard.map((row) => row.role));
  assert.ok(roles.size > 1, "spreads across more than one role instead of dumping the whole target into the single highest-scoring role");
});

test("buildSideboard never includes a land, even a high-scoring one", () => {
  const pool = [{ name: "Overgrown Basic", typeLine: "Basic Land — Forest", oracleText: "", score: 999 }];
  assert.deepEqual(buildSideboard(pool, [], { target: 15 }), []);
});

test("a sideboard built from a real pool actually connects to a matchup repair recommendation end to end", () => {
  const card = (name, typeLine, oracleText, score) => ({ name, typeLine, oracleText, score });
  const pool = [
    // Genuinely bland text (no trigger words, no creature/planeswalker type
    // line) is what actually lands on "stabilizer" through
    // simulationRoleFor's fallback — verified directly, not assumed —
    // which is exactly the role Aggro's plan searches for first.
    card("Bench Reinforcement", "Artifact", "Equip {2}.", 33),
    card("Quiet Ward", "Enchantment", "Enchant permanent.", 25),
  ];
  const candidate = {
    deck: [{ quantity: 4, card: "Aggro Punisher", role: "finisher", quantity_available: 4 }],
    sideboard: buildSideboard(pool, [], { target: 3 }),
  };
  // Proves buildSideboard's output is real input evaluateMatchupEvidence
  // can act on, not just independently valid data.
  const aggroCards = ["Hired Claw", "Emberheart Challenger", "Slickshot Show-Off", "Lightning Strike", "Mountain"];
  const matches = [
    { id: "1", result: "loss", revealedOpponentCards: aggroCards },
    { id: "2", result: "loss", revealedOpponentCards: aggroCards },
    { id: "3", result: "win", revealedOpponentCards: aggroCards },
  ];
  const result = evaluateMatchupEvidence(matches, candidate);
  assert.equal(result.status, "repair-ready");
  assert.equal(result.changes.find((change) => change.quantity > 0).card, "Bench Reinforcement");
});

test("keeps matchup histories separate instead of averaging away a weakness", () => {
  const controlCards = ["Day of Judgment", "Three Steps Ahead", "Get Lost", "Winternight Stories"];
  const matches = [match("a1", "loss"), match("a2", "loss"), match("a3", "win"), ...Array.from({ length: 6 }, (_, index) => match(`c${index}`, "win", controlCards))];
  const result = evaluateMatchupEvidence(matches, CANDIDATE);
  assert.equal(result.status, "repair-ready");
  assert.equal(result.weakness.strategy, "Aggro");
});
