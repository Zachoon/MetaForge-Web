import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInteractionGraph,
  extractMechanicalSignals,
  findUnusedEnginePartners,
  findExplicitOracleReferences,
  oracleExplicitlyNames,
  classifyLoopKind,
  findResetPayPairs,
  LOOP_KINDS,
  RESET_SHAPES,
  RELATIONSHIP_EVIDENCE,
} from "../app/forge-interaction-graph.mjs";

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

test("placing counters is production, not evidence the same card rewards counters", () => {
  const ayula = extractMechanicalSignals({
    name: "Ayula, Queen Among Bears",
    typeLine: "Legendary Creature — Bear",
    oracleText: "Whenever another Bear enters the battlefield under your control, put two +1/+1 counters on target Bear.",
  });
  assert.ok(ayula.produces.includes("counters"));
  assert.ok(!ayula.rewards.includes("counters"));
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

test("detects a symmetric draw lock as a nonbo against the deck's own draw package", () => {
  // Mornsong Aria's real printed text: "Players can't draw cards or gain
  // life." — a genuine symmetric draw-and-life lock, verified against
  // app/standard-set-cards.mjs rather than assumed from memory.
  const payoff = { name: "Bookworm", typeLine: "Creature", oracleText: "Whenever you draw a card, put a +1/+1 counter on this creature." };
  const graph = buildInteractionGraph([payoff, { name: "Mornsong Aria", typeLine: "Enchantment", oracleText: "Players can't draw cards or gain life. At the beginning of each player's draw step, that player loses 3 life, searches their library for a card, puts it into their hand, then shuffles." }]);
  assert.equal(graph.nonbos.length, 1);
  assert.equal(graph.nonbos[0].signal, "draw");
});

test("flags a trigger doubler as a verified amplifier of every real ETB payoff in the deck", () => {
  const doubler = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an enters-the-battlefield ability of a permanent you control triggers, that ability triggers an additional time." };
  const payoff = { name: "Soul Warden", typeLine: "Creature", oracleText: "Whenever another creature enters the battlefield under your control, you gain 1 life." };
  const graph = buildInteractionGraph([doubler, payoff]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].source, "Panharmonicon");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Soul Warden"]);
  assert.equal(graph.amplifiers[0].evidence, "verified rules-text trigger amplifier");
  // Exposed so a caller evaluating a not-yet-added candidate card (Meta
  // Breaker Lab) can check card.mechanics[side].includes(signal) directly.
  assert.equal(graph.amplifiers[0].side, "rewards");
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

test("Doubling Season amplifies both the token producers and the counter producers already in the deck, as two distinct entries", () => {
  const doubler = { name: "Doubling Season", typeLine: "Enchantment", oracleText: "If an effect would create one or more tokens under your control, it creates twice that many instead. If an effect would put one or more counters on a permanent or player, it puts twice that many instead." };
  const tokenMaker = { name: "Token Maker", typeLine: "Sorcery", oracleText: "Create two 1/1 creature tokens." };
  const counterMaker = { name: "Counter Maker", typeLine: "Sorcery", oracleText: "Put three +1/+1 counters on target creature." };
  const graph = buildInteractionGraph([doubler, tokenMaker, counterMaker]);
  assert.equal(graph.amplifiers.length, 2);
  const tokenAmplifier = graph.amplifiers.find((entry) => entry.signal === "tokens");
  const counterAmplifier = graph.amplifiers.find((entry) => entry.signal === "counters");
  assert.deepEqual(tokenAmplifier.amplifies, ["Token Maker"]);
  assert.deepEqual(counterAmplifier.amplifies, ["Counter Maker"]);
});

test("Parallel Lives amplifies token producers only — real cards can double one resource without doubling both", () => {
  const doubler = { name: "Parallel Lives", typeLine: "Enchantment", oracleText: "If an effect would create one or more tokens under your control, it creates twice that many instead." };
  const tokenMaker = { name: "Token Maker", typeLine: "Sorcery", oracleText: "Create two 1/1 creature tokens." };
  const counterMaker = { name: "Counter Maker", typeLine: "Sorcery", oracleText: "Put three +1/+1 counters on target creature." };
  const graph = buildInteractionGraph([doubler, tokenMaker, counterMaker]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].signal, "tokens");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Token Maker"]);
});

test("a token/counter doubler amplifies producers, not payoffs — the doubling applies to the effect creating the resource, whether or not it's a trigger", () => {
  const doubler = { name: "Doubling Season", typeLine: "Enchantment", oracleText: "If an effect would create one or more tokens under your control, it creates twice that many instead. If an effect would put one or more counters on a permanent or player, it puts twice that many instead." };
  // Rewards tokens (cares about tokens already on the battlefield) but
  // never itself produces one — must not be amplified.
  const payoffOnly = { name: "Anthem", typeLine: "Enchantment", oracleText: "Creatures you control get +1/+1 for each token you control." };
  const graph = buildInteractionGraph([doubler, payoffOnly]);
  assert.deepEqual(graph.amplifiers, []);
});

test("an ordinary token producer's own oracle text is not mistaken for Doubling Season's exact doubling clause", () => {
  const ordinary = { name: "Token Maker", typeLine: "Sorcery", oracleText: "Create two 1/1 creature tokens." };
  const anotherMaker = { name: "Another Maker", typeLine: "Sorcery", oracleText: "Create four 1/1 creature tokens." };
  const graph = buildInteractionGraph([ordinary, anotherMaker]);
  assert.deepEqual(graph.amplifiers, []);
});

test("Aggravated Assault-style extra combat phase amplifies every real attack-trigger payoff in the deck", () => {
  const extraCombat = { name: "Aggravated Assault", typeLine: "Artifact", oracleText: "{2}{R}{R}, {T}: Untap all creatures you control. After this main phase, there is an additional combat phase followed by an additional main phase." };
  const attackPayoff = { name: "Battle Cry Herald", typeLine: "Creature", oracleText: "Whenever this creature attacks, draw a card." };
  const graph = buildInteractionGraph([extraCombat, attackPayoff]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].signal, "combat");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Battle Cry Herald"]);
});

test("an ordinary attack trigger's own text is not mistaken for a literal extra combat phase", () => {
  const ordinary = { name: "Battle Cry Herald", typeLine: "Creature", oracleText: "Whenever this creature attacks, draw a card." };
  const another = { name: "Second Striker", typeLine: "Creature", oracleText: "Whenever this creature attacks, you gain 1 life." };
  const graph = buildInteractionGraph([ordinary, another]);
  assert.deepEqual(graph.amplifiers, []);
});

test("Fiery Emancipation-style damage replacement amplifies every real damage source already in the deck", () => {
  const doubler = { name: "Fiery Emancipation", typeLine: "Enchantment", oracleText: "If a source you control would deal damage to an opponent or a permanent or planeswalker an opponent controls, it deals triple that damage to that permanent, planeswalker, or player instead." };
  const burnSpell = { name: "Bolt of Fire", typeLine: "Instant", oracleText: "Deals 3 damage to any target." };
  const graph = buildInteractionGraph([doubler, burnSpell]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].signal, "damage");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Bolt of Fire"]);
});

test("an ordinary burn spell's own text is not mistaken for a damage-doubling replacement effect", () => {
  const ordinary = { name: "Bolt of Fire", typeLine: "Instant", oracleText: "Deals 3 damage to any target." };
  const another = { name: "Second Bolt", typeLine: "Instant", oracleText: "Deals 4 damage to target creature." };
  const graph = buildInteractionGraph([ordinary, another]);
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
  assert.equal(graph.enginePairs[0].loopKind, LOOP_KINDS.ENGINE);
  assert.match(graph.enginePairs[0].reason, /two-way loop/i);
});

test("loop kinds distinguish engines, closed reset shapes, and conditional wins without claiming infinites", () => {
  assert.equal(
    classifyLoopKind(tokenHerald.oracleText, cardHerald.oracleText),
    LOOP_KINDS.ENGINE,
  );
  assert.equal(
    classifyLoopKind(
      "{T}: Add {C}{C}{C}. {3}: Untap this artifact.",
      "{1}, {T}: Untap target artifact.",
    ),
    LOOP_KINDS.CLOSED_LOOP,
  );
  assert.equal(
    classifyLoopKind(
      "Whenever an opponent dies, create a Treasure token. At the beginning of your upkeep, if you control ten or more Treasures, you win the game.",
      "Whenever you attack, create a Treasure token.",
    ),
    LOOP_KINDS.CONDITIONAL_WIN,
  );
});

test("reset/pay shapes are found even when the pair is not a producer/payoff engine", () => {
  const monolith = { name: "Basalt Monolith", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}{C}. {3}: Untap this artifact." };
  const key = { name: "Voltaic Key", typeLine: "Artifact", oracleText: "{1}, {T}: Untap target artifact." };
  const rings = { name: "Rings of Brighthearth", typeLine: "Artifact", oracleText: "{1}, {T}: Copy target activated or triggered ability you control. You may choose new targets for the copy." };
  const kiki = { name: "Kiki-Jiki, Mirror Breaker", typeLine: "Legendary Creature — Goblin Shaman", oracleText: "{T}: Create a token that's a copy of target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step." };
  const pestermite = { name: "Pestermite", typeLine: "Creature — Faerie Rogue", oracleText: "Flash, flying. When this creature enters, you may tap or untap target permanent." };
  const scepter = { name: "Isochron Scepter", typeLine: "Artifact", oracleText: "Imprint — When this artifact enters, you may exile an instant card with mana value 2 or less from your hand. {2}, {T}: You may copy the exiled card. If you do, you may cast the copy without paying its mana cost." };
  const reversal = { name: "Dramatic Reversal", typeLine: "Instant", oracleText: "Untap all nonland permanents you control." };

  const keyGraph = buildInteractionGraph([monolith, key]);
  assert.equal(keyGraph.resetPairs.length, 1);
  assert.deepEqual(keyGraph.resetPairs[0].cards, ["Basalt Monolith", "Voltaic Key"]);
  assert.equal(keyGraph.resetPairs[0].shape, RESET_SHAPES.ARTIFACT_UNTAP);
  assert.equal(keyGraph.resetPairs[0].loopKind, LOOP_KINDS.CLOSED_LOOP);

  const ringsGraph = buildInteractionGraph([monolith, rings]);
  assert.equal(ringsGraph.resetPairs.length, 1);
  assert.equal(ringsGraph.resetPairs[0].shape, RESET_SHAPES.COPY_ACTIVATED);

  const kikiGraph = buildInteractionGraph([kiki, pestermite]);
  assert.equal(kikiGraph.resetPairs.length, 1);
  assert.equal(kikiGraph.resetPairs[0].shape, RESET_SHAPES.COPY_ETB_UNTAP);

  const scepterGraph = buildInteractionGraph([scepter, reversal]);
  assert.equal(scepterGraph.resetPairs.length, 1);
  assert.equal(scepterGraph.resetPairs[0].shape, RESET_SHAPES.IMPRINT_UNTAP_ALL);

  assert.equal(findResetPayPairs([tokenHerald, cardHerald]).length, 0, "an ordinary engine pair is not a reset shape");
});

test("Fear of Missing Out and Trading Post are related cards, not a reciprocal combo loop", () => {
  const graph = buildInteractionGraph([
    { name: "Fear of Missing Out", typeLine: "Enchantment Creature — Nightmare", oracleText: "When this creature enters, discard a card, then draw a card. Delirium — Whenever this creature attacks for the first time each turn, if there are four or more card types among cards in your graveyard, untap target creature. After this phase, there is an additional combat phase." },
    { name: "Trading Post", typeLine: "Artifact", oracleText: "{1}, {T}, Discard a card: You gain 4 life. {1}, {T}, Pay 1 life: Create a 0/1 white Goat creature token. {1}, {T}, Sacrifice a creature: Return target artifact card from your graveyard to your hand. {1}, {T}, Sacrifice an artifact: Draw a card." },
  ]);
  assert.ok(graph.edges.length > 0, "their genuine shared mechanical relationship remains visible");
  assert.equal(graph.enginePairs.length, 0, "sharing broad graveyard/draw signals is not a closed loop");
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
  assert.equal(suggestions[0].loopKind, LOOP_KINDS.ENGINE);
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

// --- Founder #018 — Relationship Evidence: Explicit Oracle ---

test("oracle_explicit: named CardName in Oracle links to that card in the deck", () => {
  const tutor = {
    name: "Blech Tutor",
    typeLine: "Sorcery",
    oracleText: "Search your library for a card named Blech, reveal it, put it into your hand, then shuffle.",
  };
  const target = {
    name: "Blech",
    typeLine: "Legendary Creature — Alien",
    oracleText: "Flying",
  };
  const graph = buildInteractionGraph([tutor, target]);
  const edge = graph.edges.find(
    (entry) => entry.evidence === RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT
      || entry.evidenceClass === RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT,
  );
  assert.ok(edge, "expected an oracle_explicit edge");
  assert.equal(edge.from, "Blech Tutor");
  assert.equal(edge.to, "Blech");
  assert.ok(edge.signals.includes("oracle_explicit"));
  assert.match(edge.reason, /explicitly names Blech/i);
  assert.ok(graph.explicitReferences.some((ref) => ref.from === "Blech Tutor" && ref.to === "Blech"));
  assert.ok(graph.packages.some((group) => group.signal === "oracle_explicit"));
});

test("oracle_explicit: Partner with creates an authoritative edge", () => {
  const graph = buildInteractionGraph([
    {
      name: "Reyhan, Last of the Abzan",
      typeLine: "Legendary Creature",
      oracleText: "Partner with Pako, Arcane Retriever",
    },
    {
      name: "Pako, Arcane Retriever",
      typeLine: "Legendary Creature",
      oracleText: "Partner with Reyhan, Last of the Abzan",
    },
  ]);
  const refs = findExplicitOracleReferences(graph.nodes);
  assert.ok(refs.some((ref) => ref.from === "Reyhan, Last of the Abzan" && ref.to === "Pako, Arcane Retriever"));
  assert.ok(refs.some((ref) => ref.from === "Pako, Arcane Retriever" && ref.to === "Reyhan, Last of the Abzan"));
});

test("oracle_explicit: does not invent edges from bare name mentions or arbitrary nicknames", () => {
  assert.equal(oracleExplicitlyNames("Create a Sol Ring token.", "Sol Ring"), false);
  assert.equal(oracleExplicitlyNames("Search your library for a card named Blech.", "Tony's Favorite Rock"), false);

  const graph = buildInteractionGraph([
    {
      name: "Loose Talker",
      typeLine: "Creature",
      oracleText: "Whenever you cast Sol Ring, draw a card.",
    },
    { name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." },
  ]);
  assert.ok(!graph.edges.some((edge) => edge.evidenceClass === RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT));
  assert.equal(graph.explicitReferences.length, 0);
});

test("oracle_explicit: ignores self-references via named own name", () => {
  const graph = buildInteractionGraph([
    {
      name: "Self Referencer",
      typeLine: "Creature",
      oracleText: "Search your library for a card named Self Referencer and put it onto the battlefield.",
    },
    { name: "Unrelated", typeLine: "Creature", oracleText: "Flying" },
  ]);
  assert.equal(graph.explicitReferences.length, 0);
});

test("oracle_explicit: mechanical edges still form without named references", () => {
  const graph = buildInteractionGraph([
    { name: "Smith", typeLine: "Legendary Creature", oracleText: "Whenever you cast an artifact spell, create a 1/1 colorless Servo artifact creature token.", isCommander: true },
    { name: "Foundry", typeLine: "Artifact", oracleText: "Whenever an artifact enters the battlefield under your control, draw a card." },
  ]);
  assert.ok(graph.edges.some((edge) => edge.from === "Smith" && edge.to === "Foundry"));
  assert.ok(graph.edges.every((edge) => edge.evidenceClass !== RELATIONSHIP_EVIDENCE.ORACLE_EXPLICIT));
});
