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

test("detects a symmetric lifegain lock as a nonbo against the deck's own lifegain package, but the pattern stays scoped to \"players\" and doesn't fire on an asymmetric opponents-only hoser", () => {
  const payoff = { name: "Healer", typeLine: "Creature", oracleText: "Whenever you gain life, draw a card." };
  const symmetrical = buildInteractionGraph([payoff, { name: "Vortex", typeLine: "Enchantment", oracleText: "Players can't gain life." }]);
  assert.equal(symmetrical.nonbos.length, 1);
  assert.equal(symmetrical.nonbos[0].signal, "life");
  // A one-sided hoser like Erebos ("Your opponents can't gain life.") is
  // worded around "opponents", not "players" — a genuinely different
  // phrase, not the same rule caught by the opponent-text filter below.
  const oneSided = buildInteractionGraph([payoff, { name: "Erebos", typeLine: "Enchantment Creature", oracleText: "Your opponents can't gain life." }]);
  assert.equal(oneSided.nonbos.length, 0);
});

test("detects a symmetric library-search lock as a nonbo against the deck's own land-tutoring package, but the pattern stays scoped to \"players\" and doesn't fire on an asymmetric opponents-only hoser", () => {
  const tutor = { name: "Fetcher", typeLine: "Sorcery", oracleText: "Search your library for a land card and put it onto the battlefield." };
  const symmetrical = buildInteractionGraph([tutor, { name: "Hold", typeLine: "Enchantment", oracleText: "Players can't search libraries." }]);
  assert.equal(symmetrical.nonbos.length, 1);
  assert.equal(symmetrical.nonbos[0].signal, "lands");
  // A one-sided hoser like Aven Mindcensor ("Your opponents can't search
  // libraries.") is worded around "opponents", not "players" — a
  // genuinely different phrase, same distinction as the lifegain case above.
  const oneSided = buildInteractionGraph([tutor, { name: "Mindcensor", typeLine: "Creature", oracleText: "Your opponents can't search libraries." }]);
  assert.equal(oneSided.nonbos.length, 0);
});

test("flags a trigger doubler as a verified amplifier of every real ETB payoff in the deck", () => {
  const doubler = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an enters-the-battlefield ability of a permanent you control triggers, that ability triggers an additional time." };
  const payoff = { name: "Soul Warden", typeLine: "Creature", oracleText: "Whenever another creature enters the battlefield under your control, you gain 1 life." };
  const graph = buildInteractionGraph([doubler, payoff]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].source, "Panharmonicon");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Soul Warden"]);
  assert.equal(graph.amplifiers[0].evidence, "verified rules-text trigger amplifier");
});

test("a trigger doubler with nothing to double doesn't produce an empty amplifier entry", () => {
  const doubler = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an enters-the-battlefield ability of a permanent you control triggers, that ability triggers an additional time." };
  const noPayoff = { name: "Vanilla Bear", typeLine: "Creature", oracleText: "Vigilance." };
  const graph = buildInteractionGraph([doubler, noPayoff]);
  assert.deepEqual(graph.amplifiers, []);
});

test("an ordinary ETB creature that merely mentions entering the battlefield is not mistaken for a trigger doubler", () => {
  const ordinary = { name: "Mulldrifter", typeLine: "Creature", oracleText: "When Mulldrifter enters the battlefield, draw two cards." };
  const payoff = { name: "Soul Warden", typeLine: "Creature", oracleText: "Whenever another creature enters the battlefield under your control, you gain 1 life." };
  const graph = buildInteractionGraph([ordinary, payoff]);
  assert.deepEqual(graph.amplifiers, []);
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

test("connects an evasion grantor to a payoff that specifically rewards flying creatures", () => {
  const grantor = { name: "Sky Blessing", typeLine: "Aura", oracleText: "Enchant creature. Enchanted creature gains flying." };
  const payoff = { name: "Wind Marshal", typeLine: "Creature", oracleText: "Creatures you control with flying get +1/+1." };
  const graph = buildInteractionGraph([grantor, payoff]);
  const edge = graph.edges.find((entry) => entry.from === "Sky Blessing" && entry.to === "Wind Marshal");
  assert.ok(edge, "expected an edge between the flying grantor and the flying payoff");
  assert.ok(edge.signals.includes("evasion"));
});

test("two unrelated fliers don't connect just for sharing a keyword", () => {
  // Merely both having flying isn't a synergy the way two graveyard cards
  // sharing a real theme is — evasion only forms an edge through an
  // actual producer/payoff relationship, never blanket shared-signal.
  const first = { name: "Griffin One", typeLine: "Creature", oracleText: "Flying." };
  const second = { name: "Griffin Two", typeLine: "Creature", oracleText: "Flying." };
  const graph = buildInteractionGraph([first, second]);
  assert.equal(graph.edges.length, 0);
});

test("connects a protection grantor to a payoff that specifically rewards indestructible creatures", () => {
  const grantor = { name: "Ward Ritual", typeLine: "Instant", oracleText: "Target creature you control gains indestructible until end of turn." };
  const payoff = { name: "Unbreakable Champion", typeLine: "Creature", oracleText: "Whenever a creature you control with indestructible attacks, draw a card." };
  const graph = buildInteractionGraph([grantor, payoff]);
  const edge = graph.edges.find((entry) => entry.from === "Ward Ritual" && entry.to === "Unbreakable Champion");
  assert.ok(edge, "expected an edge between the indestructible grantor and the indestructible payoff");
  assert.ok(edge.signals.includes("protection"));
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

test("connects a sacrifice outlet to a death payoff using the card-mechanics database even when the oracle text alone wouldn't match", () => {
  // "A Golden Opportunity" is tagged sacrifice_outlet and "A-Blood Artist" is
  // tagged death_payoff in app/card-mechanics.mjs. Oracle text is deliberately
  // vague/omitted here so the edge can only come from the tag lookup, proving
  // the database signal fires independently of the regex heuristics.
  const outlet = { name: "A Golden Opportunity", typeLine: "Enchantment", oracleText: "" };
  const payoff = { name: "A-Blood Artist", typeLine: "Creature", oracleText: "" };
  const graph = buildInteractionGraph([outlet, payoff]);
  const edge = graph.edges.find((entry) => entry.from === "A Golden Opportunity" && entry.to === "A-Blood Artist");
  assert.ok(edge, "expected a database-derived edge between the sac outlet and the death payoff");
  assert.equal(edge.evidence, "verified card-database mechanic");
  assert.ok(edge.signals.includes("sacrifice"));
});

test("card-mechanics tag lookup is case/whitespace-insensitive and silently absent for unknown cards", () => {
  const known = extractMechanicalSignals({ name: "  A-BLOOD ARTIST  ", typeLine: "Creature", oracleText: "" });
  assert.ok(known.tagRewards.includes("sacrifice"));
  const unknown = extractMechanicalSignals({ name: "Totally Made Up Card Name Xyz", typeLine: "Creature", oracleText: "" });
  assert.deepEqual(unknown.tagProduces, []);
  assert.deepEqual(unknown.tagRewards, []);
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
