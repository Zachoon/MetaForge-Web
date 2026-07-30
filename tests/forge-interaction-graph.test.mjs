import test from "node:test";
import assert from "node:assert/strict";
import { buildInteractionGraph, extractMechanicalSignals, findUnusedEnginePartners } from "../app/forge-interaction-graph.mjs";

test("connects producers to payoffs and forms packages", () => {
  const graph = buildInteractionGraph([
    { name: "Smith", typeLine: "Legendary Creature", oracleText: "Whenever you cast an artifact spell, create a 1/1 colorless Servo artifact creature token.", isCommander: true },
    { name: "Foundry", typeLine: "Artifact", oracleText: "Whenever an artifact enters the battlefield under your control, draw a card." },
    { name: "Bauble", typeLine: "Artifact", oracleText: "When Bauble enters the battlefield, draw a card." },
  ]);
  assert.ok(graph.edges.some((edge) => edge.from === "Smith" && edge.to === "Foundry"));
  assert.ok(graph.packages.some((group) => group.signal === "artifacts"));
  assert.ok(graph.commanderLinks.length > 0);
});

test("detects true symmetrical nonbos but ignores opponent-only hate", () => {
  const base = { name: "Reanimator", typeLine: "Creature", oracleText: "Return target creature card from your graveyard to the battlefield." };
  const symmetrical = buildInteractionGraph([base, { name: "Void", typeLine: "Artifact", oracleText: "If a card would be put into a graveyard, exile it instead." }]);
  assert.equal(symmetrical.nonbos.length, 1);
  const oneSided = buildInteractionGraph([base, { name: "Cage", typeLine: "Artifact", oracleText: "Cards in your opponents' graveyards can't enter the battlefield." }]);
  assert.equal(oneSided.nonbos.length, 0);
});

test("keeps unsupported cards visible as isolated slots", () => {
  const graph = buildInteractionGraph([
    { name: "Token Maker", typeLine: "Sorcery", oracleText: "Create two 1/1 creature tokens." },
    { name: "Vanilla", typeLine: "Creature", oracleText: "Vigilance" },
  ]);
  assert.deepEqual(graph.isolated, ["Token Maker", "Vanilla"]);
  assert.ok(extractMechanicalSignals({ typeLine: "Sorcery", oracleText: "Create a Treasure token." }).produces.includes("treasure"));
});

test("flags a genuine two-way loop as an engine pair, distinct from an ordinary one-way synergy edge", () => {
  // Token Herald produces tokens (rewarded by Card Herald) and rewards draw
  // (via "second card"); Card Herald produces draw (via "draw two cards")
  // and rewards tokens (via "token you control") — each card feeds the
  // other through a *different* signal, a real two-way loop shape, not
  // just two cards that happen to share one theme.
  const tokenHerald = { name: "Token Herald", typeLine: "Creature", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." };
  const cardHerald = { name: "Card Herald", typeLine: "Creature", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." };
  const graph = buildInteractionGraph([tokenHerald, cardHerald]);
  const edge = graph.edges.find((entry) => entry.from === "Token Herald" && entry.to === "Card Herald");
  assert.ok(edge, "expected an edge between the two cards");
  assert.equal(edge.mutual, true);
  assert.equal(graph.enginePairs.length, 1);
  assert.deepEqual(graph.enginePairs[0].cards, ["Token Herald", "Card Herald"]);
  assert.match(graph.enginePairs[0].reason, /two-way loop/i);
});

test("a one-way synergy (only one card feeds the other) is not flagged as an engine pair", () => {
  const producer = { name: "Only Producer", typeLine: "Sorcery", oracleText: "Create two 1/1 creature tokens." };
  const payoff = { name: "Only Payoff", typeLine: "Enchantment", oracleText: "Creatures you control get +1/+1 for each token you control." };
  const graph = buildInteractionGraph([producer, payoff]);
  const edge = graph.edges.find((entry) => entry.from === "Only Producer" && entry.to === "Only Payoff");
  assert.ok(edge);
  assert.equal(edge.mutual, false);
  assert.equal(graph.enginePairs.length, 0);
});

const tokenHerald = { name: "Token Herald", typeLine: "Creature", oracleText: "Whenever you draw your second card each turn, create a 1/1 colorless Servo artifact creature token." };
const cardHerald = { name: "Card Herald", typeLine: "Creature", oracleText: "Draw two cards. Whenever a token you control attacks, this creature gets +1/+0 until end of turn." };

test("suggests a pool card that would form a genuine two-way loop with something already in the deck", () => {
  const deck = [tokenHerald];
  const pool = [tokenHerald, cardHerald, { name: "Vanilla", typeLine: "Creature", oracleText: "Vigilance." }];
  const suggestions = findUnusedEnginePartners(deck, pool);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].card, "Card Herald");
  assert.equal(suggestions[0].partner, "Token Herald");
  assert.match(suggestions[0].reason, /sitting unused in your pool/i);
});

test("never suggests a card that's already in the deck", () => {
  const deck = [tokenHerald, cardHerald];
  const pool = [tokenHerald, cardHerald];
  assert.deepEqual(findUnusedEnginePartners(deck, pool), []);
});

test("ignores lands in the pool and respects the limit option", () => {
  const deck = [tokenHerald];
  const pool = Array.from({ length: 5 }, (_, i) => ({ ...cardHerald, name: `Card Herald ${i}` }));
  // Same matching text, but it's a land — must never be suggested as a
  // "combo piece," regardless of what its oracle text happens to say.
  pool.push({ name: "Unused Land", typeLine: "Land", oracleText: cardHerald.oracleText });
  const suggestions = findUnusedEnginePartners(deck, pool, { limit: 2 });
  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((entry) => entry.card !== "Unused Land"));
});
