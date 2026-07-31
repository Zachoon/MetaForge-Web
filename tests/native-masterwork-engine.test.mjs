import assert from "node:assert/strict";
import test from "node:test";
import { budgetScoreFor, classifyNativeCard, colorPipsFromCost, complexityScoreFor, conceptSignals, curveAwareLandAdjustment, curveTargets, fieldCounterRolesFor, forgeNativeMasterwork, hypergeometricAtLeast, interactionQualityFor, manaConsistencyReport, oracleTextComplexity, parseNativeBlueprintIntent, poolMechanicalSignals, popularityScoreFromRank, proportionalBasicCounts, synergyPotentialFor } from "../app/native-masterwork-engine.mjs";

const card = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const pool = [
  ...Array.from({ length: 28 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("classifies native deck-building roles from verified rules text", () => {
  assert.deepEqual(classifyNativeCard(card("Answer", "Destroy target creature. Draw a card.")), ["draw", "interaction", "threat"]);
});

test("classifies hand disruption as its own role, distinct from removal and self-loot", () => {
  assert.deepEqual(classifyNativeCard(card("Thoughtseize", "Target player reveals their hand. You choose a nonland card from it. That player discards that card.", "Sorcery")), ["discard"]);
  assert.deepEqual(classifyNativeCard(card("Mind Rot", "Target opponent discards two cards.", "Sorcery")), ["discard"]);
  // "you may discard a card, then draw" is self-loot filtering, not hand
  // disruption, and must not be tagged discard (it still separately reads
  // as "draw" too, since it does draw cards — that part is unrelated to
  // this distinction).
  assert.deepEqual(classifyNativeCard(card("Careful Study", "You may discard a card. If you do, draw two cards.", "Sorcery")), ["draw", "selection"]);
});

test("classifyNativeCard adds a role confirmed by the card-mechanics database even when the oracle text alone wouldn't match", () => {
  // Real cards from app/card-mechanics.mjs, each tagged with the mechanic
  // named in the test but given no oracle text here — any role that still
  // comes back can only have come from the database lookup, not the regex.
  assert.deepEqual(classifyNativeCard(card("_____ goblin", "", "Sorcery")), ["ramp"]);
  // Also tagged mana_acceleration — a real card can carry more than one
  // database-confirmed role at once, same as regex classification already
  // allows.
  assert.deepEqual(classifyNativeCard(card("a-jade orb of dragonkind", "", "Sorcery")), ["ramp", "protection"]);
  assert.deepEqual(classifyNativeCard(card("a good day to pie", "", "Sorcery")), ["recursion"]);
  // Also tagged lifegain.
  assert.deepEqual(classifyNativeCard(card("a-cosmos elixir", "", "Sorcery")), ["selection", "lifegain"]);
  assert.deepEqual(classifyNativeCard(card("a girl and her dogs", "", "Sorcery")), ["tokens"]);
  assert.deepEqual(classifyNativeCard(card("_____-o-saurus", "", "Sorcery")), ["counters"]);
  assert.deepEqual(classifyNativeCard(card("17-year cicadas", "", "Sorcery")), ["spells"]);
  assert.deepEqual(classifyNativeCard(card("a golden opportunity", "", "Sorcery")), ["sacrifice"]);
  assert.deepEqual(classifyNativeCard(card("_____ bird gets the worm", "", "Sorcery")), ["lifegain"]);
});

test("classifyNativeCard never calls a basic land \"ramp\" just because the database tags it mana_acceleration", () => {
  // Every basic land is tagged mana_acceleration in the database — true of
  // any land, and not what the "ramp" role means (accelerating ahead of
  // your land drops). Real mana rocks/dorks are never lands, so this must
  // stay scoped to land cards specifically, not a blanket tag distrust.
  assert.deepEqual(classifyNativeCard(card("Island", "", "Basic Land — Island")), ["land"]);
  assert.deepEqual(classifyNativeCard(card("_____ goblin", "", "Sorcery")), ["ramp"]);
});

test("classifyNativeCard never invents a role for a card the database doesn't recognize", () => {
  assert.deepEqual(classifyNativeCard(card("Totally Made Up Card Name Xyz", "", "Sorcery")), []);
});

test("database-confirmed and regex-confirmed roles for the same card merge without duplicates", () => {
  // "A Golden Opportunity" is tagged sacrifice_outlet in the database; give
  // it oracle text that also regex-matches "sacrifice" to prove the merge
  // is a deduplicated union, not two separate entries.
  assert.deepEqual(classifyNativeCard(card("A Golden Opportunity", "Sacrifice a creature.", "Sorcery")), ["sacrifice"]);
});

test("conceptSignals reads a commander's own database-confirmed roles, not just its oracle-text regex matches", () => {
  // Same real card/tag pairs as classifyNativeCard's database tests above,
  // now read through conceptSignals — the function that turns a commander's
  // text into the "does this card do what my commander cares about" synergy
  // signal. Empty oracle text means any signal here can only have come from
  // the database lookup.
  assert.deepEqual(conceptSignals(card("_____ goblin", "", "Legendary Creature")), ["ramp"]);
  assert.deepEqual(conceptSignals(card("a golden opportunity", "", "Legendary Enchantment")), ["sacrifice"]);
  // A commander's real rules text still contributes its regex-matched
  // signals alongside any database-confirmed ones, deduplicated.
  assert.deepEqual(
    conceptSignals(card("Blood Artist Commander", "Whenever a creature dies, you gain 1 life.", "Legendary Creature")),
    ["sacrifice", "lifegain"],
  );
});

test("conceptSignals never calls a commander printed on a basic land \"ramp\" from the mana_acceleration tag", () => {
  assert.deepEqual(conceptSignals(card("Island", "", "Basic Land — Island")), []);
});

test("interactionQualityFor scores unconditional removal at full quality", () => {
  assert.equal(interactionQualityFor("Destroy target creature."), 1);
  assert.equal(interactionQualityFor("Exile target permanent."), 1);
  assert.equal(interactionQualityFor("Counter target spell."), 1);
  assert.equal(interactionQualityFor("Deals 3 damage to target creature."), 1);
  // "Nonland permanent" excludes lands, which is what makes this template
  // (Anguished Unmaking, Vindicate) one of the broadest, most flexible
  // removal effects in the game — it must not read as a restriction just
  // because the word starts with "non".
  assert.equal(interactionQualityFor("Exile target nonland permanent."), 1);
});

test("interactionQualityFor downweights restricted removal that can simply whiff", () => {
  assert.equal(interactionQualityFor("Destroy target creature with mana value 3 or less."), 0.66);
  assert.equal(interactionQualityFor("Exile target creature with power 4 or greater."), 0.74);
  assert.equal(interactionQualityFor("Counter target spell unless its controller pays {3}."), 0.74);
  // Combat-state and color/type restrictions have no clean numeric severity
  // signal to grade against, so they keep the original flat penalty.
  assert.equal(interactionQualityFor("Destroy target attacking or blocking creature."), 0.65);
  assert.equal(interactionQualityFor("Destroy target nonblack creature."), 0.65);
});

test("interactionQualityFor grades a numeric cap's severity instead of one flat penalty for every conditional removal spell", () => {
  // "Mana value N or less" gets broader — and so better — as N rises: a
  // 1-or-less cap misses almost every real creature, a 6-or-less cap misses
  // almost none.
  const veryNarrow = interactionQualityFor("Destroy target creature with mana value 1 or less.");
  const midCap = interactionQualityFor("Destroy target creature with mana value 3 or less.");
  const wideCap = interactionQualityFor("Destroy target creature with mana value 6 or less.");
  assert.ok(veryNarrow < midCap && midCap < wideCap, `expected 1-or-less (${veryNarrow}) < 3-or-less (${midCap}) < 6-or-less (${wideCap})`);
  assert.ok(wideCap < 1, "even a wide cap should stay below a truly unconditional spell");

  // "N or greater" is the mirror image: a 1-or-greater bar clears almost
  // every creature, a 6-or-greater bar clears almost none.
  const easyBar = interactionQualityFor("Exile target creature with power 1 or greater.");
  const midBar = interactionQualityFor("Exile target creature with power 4 or greater.");
  const hardBar = interactionQualityFor("Exile target creature with power 7 or greater.");
  assert.ok(easyBar > midBar && midBar > hardBar, `expected 1-or-greater (${easyBar}) > 4-or-greater (${midBar}) > 7-or-greater (${hardBar})`);

  // A counterspell's tax is the opponent's restriction, not the caster's —
  // quality rises with the tax instead of falling.
  const lightTax = interactionQualityFor("Counter target spell unless its controller pays {1}.");
  const heavyTax = interactionQualityFor("Counter target spell unless its controller pays {5}.");
  assert.ok(lightTax < heavyTax, `expected a light {1} tax (${lightTax}) to score below a heavy {5} tax (${heavyTax})`);

  // An unparseable tax (no stated amount) keeps the original flat penalty
  // rather than inventing a severity from nothing.
  assert.equal(interactionQualityFor("Counter target spell unless its controller pays {X}."), 0.65);
});

test("a restricted removal spell still classifies as interaction — only its scoring weight changes, not its role", () => {
  assert.deepEqual(classifyNativeCard(card("Doom Blade", "Destroy target nonblack creature.", "Instant")), ["interaction"]);
});

test("prefers unconditional removal over otherwise-identical conditional removal once slots are scarce", () => {
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const unconditionalFiller = Array.from({ length: 3 }, (_, i) => card(`Clean Removal ${i}`, "Destroy target creature.", "Instant"));
  const conditionalFiller = Array.from({ length: 3 }, (_, i) => card(`Restricted Removal ${i}`, "Destroy target creature with mana value 3 or less.", "Instant"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, ...unconditionalFiller, ...conditionalFiller, ...lands],
  });
  const unconditionalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Clean Removal")).reduce((sum, row) => sum + row.quantity, 0);
  const conditionalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Restricted Removal")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(unconditionalQuantity > 0, "expected at least some unconditional removal to make the cut");
  assert.ok(
    unconditionalQuantity > conditionalQuantity,
    `expected unconditional removal (${unconditionalQuantity}) to outcompete otherwise-identical restricted removal (${conditionalQuantity})`,
  );
});

test("forges three deterministic personalized candidates without a model", () => {
  const input = { format: "Commander", target: 100, strategy: "Control", path: "Reactive Precision", note: "I love card draw and protection", seed: 42, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." }, cards: pool };
  const first = forgeNativeMasterwork(input);
  const second = forgeNativeMasterwork(input);
  assert.deepEqual(first, second);
  assert.equal(
    first.engine,
    "metaforge-native-masterwork-v6",
  );
  assert.equal(first.candidates.length, 3);
  assert.equal(first.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  assert.equal(first.selected.rows[0].name, "Scholar of Tests");
  assert.equal(first.selected.tournament.verdict, "advance");
  assert.equal(first.candidates.every((candidate) => candidate.tournament), true);
  assert.equal(
    first.diagnostics.analysisPasses,
    1,
  );

  assert.equal(
    first.diagnostics.cardsAnalyzed,
    pool.length,
  );

  assert.equal(
    first.diagnostics.candidatesBuilt,
    3,
  );

  assert.equal(
    first.diagnostics
      .structuralCardsAnalyzed,
    first.selected.rows.length,
  );

  assert.equal(
    first.diagnostics.detectedSystems,
    first.structuralAnalysis
      .systems
      .systems
      .length,
  );
  assert.equal(
    first.structuralAnalysis.engine,
    "metaforge-structural-pipeline-v1",
  );

  assert.equal(
    first.structuralAnalysis.cardCount,
    100,
  );

  assert.equal(
    first.structuralAnalysis
      .commanderName,
    "Scholar of Tests",
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .graph
        .nodes,
    ),
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .systems
        .systems,
    ),
  );

  assert.ok(
    Array.isArray(
      first.structuralAnalysis
        .causality
        .criticalNodes,
    ),
  );

  assert.equal(
    Object.isFrozen(
      first.structuralAnalysis,
    ),
    true,
  );

  assert.match(first.reasoning.summary, /advanced over|only complete candidate/i);
  assert.ok(["advance", "inconclusive"].includes(first.laboratory.verdict));
  assert.ok(first.laboratory.experimentsTested >= 0);
  assert.equal(new Set(first.candidates.map((candidate) => candidate.deckText)).size, 3);
  assert.match(first.methodology, /MetaForge analyzed each verified card once/i);
});

test("treats an explicit typal and mechanical Blueprint as a construction promise", () => {
  const gammaCards = [
    card("Red Hulk", "Whenever one or more +1/+1 counters are put on this creature, it deals damage.", "Legendary Creature — Gamma Mutant", "{3}{R}", ["R"]),
    card("Doc Samson", "If one or more +1/+1 counters would be put on a creature you control, put that many plus one instead.", "Legendary Creature — Gamma Hero", "{2}{G}", ["G"]),
    card("She-Hulk", "This creature enters with two +1/+1 counters on it.", "Legendary Creature — Gamma Hero", "{2}{G}", ["G"]),
    ...Array.from({ length: 12 }, (_, i) => card(`Gamma Growth ${i}`, "Put a +1/+1 counter on target creature you control. Proliferate.", "Creature — Gamma Scientist", "{1}{G}", ["G"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Balanced midrange",
    note: "Gamma Tribal and +1 +1 Counters",
    seed: 616,
    commander: { name: "Bruce Banner // The Incredible Hulk", colors: ["G", "R"], oracleText: "Transform Bruce Banner. Put +1/+1 counters on The Incredible Hulk." },
    cards: [...pool, ...gammaCards],
  });

  assert.deepEqual(report.blueprintIntent.tribalTypes, ["gamma"]);
  assert.ok(report.blueprintIntent.desiredRoles.includes("counters"));
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
  assert.equal(report.selected.blueprintAlignment.selectedTribeCards, gammaCards.length);
  assert.ok(report.selected.blueprintAlignment.requestedRoleCoverage.counters >= 10);
  assert.match(report.methodology, /Blueprint promise: gamma typal, \+1\/\+1 counter growth/i);
});

test("reports an unsupported requested tribe instead of pretending it was honored", () => {
  const report = forgeNativeMasterwork({
    format: "Commander",
    target: 100,
    strategy: "Control",
    note: "Muppet tribal",
    seed: 42,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw your second card, create a token." },
    cards: pool,
  });

  assert.equal(report.selected.blueprintAlignment.status, "unsupported-identity-in-verified-pool");
  assert.match(report.selected.blueprintAlignment.boundary, /No legal card naming or carrying the muppet identity/i);
});

test("honors a lore identity found in card text even when it is not a creature type", () => {
  const gammaTheme = Array.from({ length: 12 }, (_, i) =>
    card(`Experiment ${i}`, `Gamma radiation puts a +1/+1 counter on this creature.`, "Creature — Human Scientist", "{2}{G}", ["G"]),
  );
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange",
    note: "Gamma Tribal", seed: 617,
    commander: { name: "Bruce Banner // The Incredible Hulk", colors: ["G", "R"], oracleText: "Transform Bruce Banner." },
    cards: [...pool, ...gammaTheme],
  });
  assert.equal(report.selected.blueprintAlignment.availableTribeCards, 0);
  assert.equal(report.selected.blueprintAlignment.availableIdentityCards, 12);
  assert.equal(report.selected.blueprintAlignment.selectedIdentityCards, 12);
  assert.equal(report.selected.blueprintAlignment.status, "honored-best-effort");
});

test("normalizes ordinary-language counter requests", () => {
  assert.deepEqual(
    parseNativeBlueprintIntent({ note: "Gamma Tribal and plus one plus one counters" }).promises,
    ["gamma typal", "+1/+1 counter growth"],
  );
});

test("recognizes plain-language role requests, not just rules-text phrasing", () => {
  const intent = parseNativeBlueprintIntent({ note: "I want removal, ramp, and card draw" });
  assert.deepEqual(intent.desiredRoles, ["ramp", "draw", "interaction"]);
  assert.deepEqual(intent.excludedRoles, []);
});

test("recognizes hand disruption requests in plain language", () => {
  // "disruption" alone already aliases to the broader "interaction" role
  // (existing behavior); "discard" is the specific, distinct signal this
  // adds on top, so both are legitimately desired here.
  const intent = parseNativeBlueprintIntent({ note: "I want hand disruption and discard" });
  assert.deepEqual(intent.desiredRoles, ["interaction", "discard"]);
  assert.deepEqual(intent.excludedRoles, []);
});

test("treats a negated role request as an exclusion, not a desire", () => {
  const intent = parseNativeBlueprintIntent({ note: "no sacrifice, but plenty of removal" });
  assert.deepEqual(intent.desiredRoles, ["interaction"]);
  assert.deepEqual(intent.excludedRoles, ["sacrifice"]);
});

test("keeps an excluded role's cards out of the built deck entirely", () => {
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange",
    note: "no ramp", seed: 11, cards: pool,
  });
  assert.ok(report.selected.rows.every((row) => !row.roles.includes("ramp")));
});

test("prioritizes hand disruption when explicitly requested in the note", () => {
  const duress = card("Duress", "Target player reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.", "Sorcery");
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange",
    note: "I want hand disruption", seed: 7, cards: [duress, ...pool],
  });
  assert.ok(report.selected.rows.some((row) => row.name === "Duress"));
});

test("scores a card higher for connecting to a producer/payoff pair already in the pool", () => {
  const miniPool = [
    card("Token Maker", "Create a 1/1 white Soldier creature token."),
    card("Token Reward", "Tokens you control get +1/+1."),
    card("Isolated Vanilla", "A creature with no special text."),
  ];
  const signals = poolMechanicalSignals(miniPool);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[0], signals), 1);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[1], signals), 1);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[2], signals), 0);
});

test("does not credit a card for producing or rewarding its own signal", () => {
  const soloPool = [card("Self-Contained", "Create a token. Tokens you control get +1/+1.")];
  const signals = poolMechanicalSignals(soloPool);
  assert.equal(synergyPotentialFor(signals.mechanicsByIndex[0], signals), 0);
});

test("only leans on live field data for Standard, and only when it's actually usable", () => {
  const readyMidrange = { readyForCurrentFieldUse: true, leadingStrategy: "Midrange" };
  assert.deepEqual(fieldCounterRolesFor("Standard", readyMidrange), ["interaction", "draw"]);
  // Wrong format: a real, ready Commander-format signal should never leak in,
  // since this table only encodes what a Standard tournament field measured.
  assert.deepEqual(fieldCounterRolesFor("Commander", readyMidrange), []);
  // Not enough sample size or coverage yet - stay neutral rather than guess.
  assert.deepEqual(fieldCounterRolesFor("Standard", { readyForCurrentFieldUse: false, leadingStrategy: "Midrange" }), []);
  // A strategy name outside the known table shouldn't throw or wildcard-match.
  assert.deepEqual(fieldCounterRolesFor("Standard", { readyForCurrentFieldUse: true, leadingStrategy: "Some New Archetype" }), []);
  assert.deepEqual(fieldCounterRolesFor("Standard", null), []);
});

test("prefers a connected producer/payoff pair over blank filler once slots are scarce", () => {
  // Baseline archetype supply is capped tightly (7 unique cards, 4 copies
  // each = 28) so it cannot fill all 36 Standard spell slots on its own -
  // the remaining 8 slots must come from either the connected pair or the
  // blank filler competing against it. Neither the pair nor the filler
  // carries any classified role, so nothing but the mechanical connection
  // (tracked as cards actually get selected, not just pool presence)
  // explains a difference.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const producer = card("Chain Maker", "Create a 1/1 white Soldier creature token.", "Sorcery");
  const payoff = card("Chain Reward", "Tokens you control get +1/+1.", "Sorcery");
  const filler = Array.from({ length: 10 }, (_, i) => card(`Vanilla ${i}`, "Nothing happens.", "Sorcery"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, producer, payoff, ...filler, ...lands],
  });
  const names = new Set(report.selected.rows.map((row) => row.name));
  assert.ok(names.has("Chain Maker"));
  assert.ok(names.has("Chain Reward"));
  assert.equal([...names].filter((name) => name.startsWith("Vanilla")).length, 0);
});

test("shapes curve targets by strategy and scales them to the deck's own spell count", () => {
  const aggro = curveTargets("Aggressive pressure", 36);
  const control = curveTargets("Reactive control", 36);
  assert.ok(aggro["1"] + aggro["2"] > control["1"] + control["2"]);
  assert.ok(control["4"] + control["5+"] > aggro["4"] + aggro["5+"]);
  const smaller = curveTargets("Balanced midrange", 36);
  const larger = curveTargets("Balanced midrange", 63);
  assert.ok(larger["5+"] > smaller["5+"]);
});

test("spreads picks across the mana curve instead of collapsing to one cost", () => {
  // Ten unique cards at each cost 1-6, mixing four different roles evenly so
  // nothing about role weighting favors one cost over another - only curve
  // targeting explains the deck not clustering around a single value.
  const texts = [
    "Add one mana. Create a Treasure token.",
    "Draw a card. Scry 1.",
    "Exile target nonland permanent.",
    "Target creature gains hexproof and indestructible until end of turn.",
  ];
  const curveCard = (name, cmc, text) => card(name, text, text.includes("mana") ? "Artifact" : "Creature — Test", `{${cmc}}`);
  const spread = [];
  for (let cmc = 1; cmc <= 6; cmc += 1) {
    for (let i = 0; i < 10; i += 1) spread.push(curveCard(`CMC${cmc}_${i}`, cmc, texts[i % texts.length]));
  }
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["U"], cards: [...spread, ...lands] });
  const buckets = { "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
  for (const row of report.selected.rows) {
    if (row.roles.includes("land")) continue;
    buckets[row.cmc <= 1 ? "1" : row.cmc >= 5 ? "5+" : String(row.cmc)] += row.quantity;
  }
  assert.ok(Object.values(buckets).every((count) => count > 0));
  assert.ok(Math.max(...Object.values(buckets)) <= 16);
});

test("keeps singleton nonbasic spells at one copy", () => {
  const report = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Balanced midrange", seed: 7, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Draw a card." }, cards: pool });
  assert.equal(report.selected.rows.filter((row) => !row.roles.includes("land") && !row.roles.includes("commander")).every((row) => row.quantity === 1), true);
});

test("creates exact-size constructed candidates with four-copy limits", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Tempo", path: "Tempo Conversion", note: "cheap interaction", colors: ["U"], seed: 9, cards: pool });
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 60);
  assert.equal(report.selected.rows.every((row) => row.roles.includes("land") || row.quantity <= 4), true);
});

test("a Standard build gets a real sideboard from the unused pool; a singleton Commander build gets none", () => {
  const standard = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Tempo", path: "Tempo Conversion", note: "cheap interaction", colors: ["U"], seed: 9, cards: pool });
  assert.ok(Array.isArray(standard.selected.sideboard), "Standard is best-of-3 and should get a real sideboard");
  assert.ok(standard.selected.sideboard.length > 0);
  assert.ok(standard.selected.sideboard.every((row) => row.role.startsWith("sideboard-") && row.quantity > 0 && row.card));
  const mainDeckNames = new Set(standard.selected.rows.map((row) => row.name));
  assert.ok(standard.selected.sideboard.every((row) => !mainDeckNames.has(row.card)), "never offers a card already in the main deck");

  const commander = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Control", seed: 13, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." }, cards: pool });
  assert.equal(commander.selected.sideboard, undefined, "Commander is singleton and has no best-of-3 sideboard");
});

test("ranks candidates with explicit role coverage and curve health", () => {
  const report = forgeNativeMasterwork({ format: "Commander", target: 100, strategy: "Control", seed: 13, commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." }, cards: pool });
  assert.ok(report.selected.evaluation.roleCoverage > 0.5);
  assert.ok(report.selected.evaluation.curveHealth >= 0);
  // report.candidates is ordered by tournamentScore (a distinct weighted
  // verdict), not raw evaluation score, so that's the order to assert on.
  assert.deepEqual(
    report.candidates.map((candidate) => candidate.tournament.tournamentScore),
    [...report.candidates.map((candidate) => candidate.tournament.tournamentScore)].sort((a, b) => b - a),
  );
});

test("counts colored mana pips, including hybrid symbols toward every named color", () => {
  assert.deepEqual(colorPipsFromCost("{2}{B}{B}"), { W: 0, U: 0, B: 2, R: 0, G: 0 });
  assert.deepEqual(colorPipsFromCost("{W/U}"), { W: 1, U: 1, B: 0, R: 0, G: 0 });
  assert.deepEqual(colorPipsFromCost("{3}"), { W: 0, U: 0, B: 0, R: 0, G: 0 });
});

test("splits basic lands proportionally to actual pip demand, not evenly by color", () => {
  assert.deepEqual(proportionalBasicCounts(["W", "B"], { W: 2, B: 8 }, 10), { W: 2, B: 8 });
  // Largest-remainder rounding must still sum to exactly `remaining`.
  const uneven = proportionalBasicCounts(["W", "B"], { W: 1, B: 2 }, 7);
  assert.equal(uneven.W + uneven.B, 7);
  // No pip signal at all (e.g. an all-colorless pool) falls back to the
  // previous even-split behavior instead of dividing by zero.
  assert.deepEqual(proportionalBasicCounts(["W", "U"], {}, 4), { W: 2, U: 2 });
});

test("weights the actual built deck's basic lands toward its heavier color, not an even split", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const swamp = report.selected.rows.find((row) => row.name === "Swamp")?.quantity || 0;
  const plains = report.selected.rows.find((row) => row.name === "Plains")?.quantity || 0;
  assert.ok(swamp > plains, `expected more Swamp than Plains given the heavier black pip cost, got ${swamp} vs ${plains}`);
});

test("scores real-world popularity rank with diminishing returns and treats a missing rank as neutral", () => {
  assert.ok(popularityScoreFromRank(0) > popularityScoreFromRank(10));
  assert.ok(popularityScoreFromRank(10) > popularityScoreFromRank(100));
  assert.ok(popularityScoreFromRank(100) >= 0);
  assert.equal(popularityScoreFromRank(undefined), 0);
  assert.equal(popularityScoreFromRank(-1), 0);
});

test("prefers cards with strong real-world adoption over otherwise-identical blank filler once slots are scarce", () => {
  // Same scarce-supply shape as the producer/payoff test above: 7 unique
  // base cards (28 copies) leave exactly 8 of Standard's 36 spell slots
  // open. Six filler cards share identical text, type, and cost — the only
  // difference is popularityRank, so if it has no effect, which two of the
  // six fill those 8 slots is essentially a coin flip on the tiebreak hash.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const popularFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Popular Vanilla ${i}`, "Nothing happens.", "Sorcery"), popularityRank: i }));
  const obscureFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Obscure Vanilla ${i}`, "Nothing happens.", "Sorcery"), popularityRank: 500 + i }));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"],
    cards: [...scarceBase, ...popularFiller, ...obscureFiller, ...lands],
  });
  const popularQuantity = report.selected.rows.filter((row) => row.name.startsWith("Popular Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const obscureQuantity = report.selected.rows.filter((row) => row.name.startsWith("Obscure Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(popularQuantity, 8, `expected all 8 open slots to go to the popular filler, got ${popularQuantity}`);
  assert.equal(obscureQuantity, 0, `expected no obscure filler to make the cut, got ${obscureQuantity}`);
});

test("penalizes expensive cards only when the budget selector actually constrains spending", () => {
  assert.equal(budgetScoreFor(50, "No strict limit"), 0);
  assert.equal(budgetScoreFor(50, "Competitive optimization"), 0);
  assert.equal(budgetScoreFor(50, undefined), 0);
  assert.equal(budgetScoreFor(NaN, "Budget conscious"), 0);
  assert.ok(budgetScoreFor(50, "Budget conscious") < 0);
  assert.ok(budgetScoreFor(50, "Budget conscious") < budgetScoreFor(50, "Moderate investment"));
  assert.ok(budgetScoreFor(50, "Budget conscious") < budgetScoreFor(5, "Budget conscious"));
});

test("honors the budget selector by preferring cheap cards over otherwise-identical expensive ones", () => {
  // Same scarce-supply shape as the popularity test above: 7 unique base
  // cards (28 copies) leave exactly 8 of Standard's 36 spell slots open.
  // Six filler cards share identical text, type, and cost — the only
  // difference is price — so "Budget conscious" should sweep the cheap ones
  // and shut the expensive ones out entirely.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const cheapFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Cheap Vanilla ${i}`, "Nothing happens.", "Sorcery"), priceUsd: 0.25 }));
  const pricyFiller = Array.from({ length: 3 }, (_, i) => ({ ...card(`Pricy Vanilla ${i}`, "Nothing happens.", "Sorcery"), priceUsd: 60 }));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"], budget: "Budget conscious",
    cards: [...scarceBase, ...cheapFiller, ...pricyFiller, ...lands],
  });
  const cheapQuantity = report.selected.rows.filter((row) => row.name.startsWith("Cheap Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const pricyQuantity = report.selected.rows.filter((row) => row.name.startsWith("Pricy Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(cheapQuantity, 8, `expected all 8 open slots to go to the cheap filler, got ${cheapQuantity}`);
  assert.equal(pricyQuantity, 0, `expected no pricy filler to make the cut, got ${pricyQuantity}`);
});

test("scores oracle text complexity from choice points, triggers, and activated abilities, not just word count", () => {
  const vanilla = "Nothing happens.";
  const technical = "At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.";
  assert.ok(oracleTextComplexity(technical) > oracleTextComplexity(vanilla));
  assert.equal(oracleTextComplexity(""), 0);
});

test("pressures complexity only when the selector actually asks for it, and in the right direction", () => {
  const technicalScore = oracleTextComplexity("At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.");
  assert.equal(complexityScoreFor(technicalScore, "Balanced"), 0);
  assert.equal(complexityScoreFor(technicalScore, undefined), 0);
  assert.ok(complexityScoreFor(technicalScore, "Accessible") < 0);
  assert.ok(complexityScoreFor(technicalScore, "Technical") > 0);
  assert.ok(complexityScoreFor(technicalScore, "Maximum depth") > complexityScoreFor(technicalScore, "Technical"));
});

test("honors the complexity selector by preferring simple cards over otherwise-identical technical ones once Accessible is chosen", () => {
  // Same scarce-supply shape as the budget test above. Six filler cards
  // carry no classified role at all (so nothing but complexity explains a
  // difference) and identical cost — only the oracle text's choice points,
  // triggers, and activated ability differ.
  const scarceBase = [
    ...Array.from({ length: 2 }, (_, i) => card(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.")),
    ...Array.from({ length: 1 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
    ...Array.from({ length: 2 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ];
  const lands = Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"]));
  const simpleFiller = Array.from({ length: 3 }, (_, i) => card(`Simple Vanilla ${i}`, "Nothing happens.", "Sorcery"));
  const technicalFiller = Array.from({ length: 3 }, (_, i) => card(`Technical Trickster ${i}`, "At the beginning of your upkeep, choose one — This permanent becomes a copy of itself; or it becomes larger until your next turn. {3}: This permanent becomes untargetable until your next turn.", "Sorcery"));
  const report = forgeNativeMasterwork({
    format: "Standard", target: 60, strategy: "Balanced midrange", seed: 33, colors: ["U"], complexity: "Accessible",
    cards: [...scarceBase, ...simpleFiller, ...technicalFiller, ...lands],
  });
  const simpleQuantity = report.selected.rows.filter((row) => row.name.startsWith("Simple Vanilla")).reduce((sum, row) => sum + row.quantity, 0);
  const technicalQuantity = report.selected.rows.filter((row) => row.name.startsWith("Technical Trickster")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(simpleQuantity, 8, `expected all 8 open slots to go to the simple filler, got ${simpleQuantity}`);
  assert.equal(technicalQuantity, 0, `expected no technical filler to make the cut, got ${technicalQuantity}`);
});

test("prefers nonbasic lands that fix the deck's heavier-demand color over otherwise-identical off-focus lands", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const utilityLand = (name, color) => ({ name, oracleText: "{T}: Add one mana of the indicated color.", manaCost: "", typeLine: "Land", colorIdentity: [color] });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`Black Utility Land ${i}`, "B")),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`White Utility Land ${i}`, "W")),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const blackUtilityCount = report.selected.rows.filter((row) => row.name.startsWith("Black Utility Land")).length;
  const whiteUtilityCount = report.selected.rows.filter((row) => row.name.startsWith("White Utility Land")).length;
  assert.equal(blackUtilityCount, 4, "expected all four black utility lands to be chosen ahead of any white ones");
  assert.ok(whiteUtilityCount < 4, `expected fewer white utility lands picked than black, got ${whiteUtilityCount}`);
});

test("prefers well-adopted nonbasic lands over an otherwise-identical obscure one", () => {
  const bCard = (name, oracleText, manaCost, typeLine = "Creature — Test") => ({ name, oracleText, manaCost, typeLine, colorIdentity: ["B"] });
  const utilityLand = (name, popularityRank) => ({ name, oracleText: "{T}: Add {B}.", manaCost: "", typeLine: "Land", colorIdentity: ["B"], popularityRank });
  const bPool = [
    ...Array.from({ length: 10 }, (_, i) => bCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}")),
    ...Array.from({ length: 10 }, (_, i) => bCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => bCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact")),
    // Same color, same "add" text, same untapped status — only real-world
    // adoption (popularityRank) differs. Six popular lands exactly fill
    // Standard's 6-nonbasic limit, so if the signal works, none of the
    // four obscure ones should make the cut at all.
    ...Array.from({ length: 6 }, (_, i) => utilityLand(`Popular Swamp Land ${i}`, i)),
    ...Array.from({ length: 4 }, (_, i) => utilityLand(`Obscure Swamp Land ${i}`, 500 + i)),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["B"], cards: bPool });
  const popularCount = report.selected.rows.filter((row) => row.name.startsWith("Popular Swamp Land")).length;
  const obscureCount = report.selected.rows.filter((row) => row.name.startsWith("Obscure Swamp Land")).length;
  assert.equal(popularCount, 6, "expected all six popular lands to be chosen ahead of any obscure ones");
  assert.equal(obscureCount, 0, "expected no obscure lands to make the cut given the 6-nonbasic limit");
});

test("computes exact hypergeometric probabilities on small, hand-checkable populations", () => {
  // N=4, K=2 successes, draw 2: P(both successes) = C(2,2)*C(2,0)/C(4,2) = 1/6.
  assert.ok(Math.abs(hypergeometricAtLeast(4, 2, 2, 2) - 1 / 6) < 1e-9);
  // P(at least 1 success) = 1 - P(0 successes) = 1 - C(2,0)*C(2,2)/C(4,2) = 5/6.
  assert.ok(Math.abs(hypergeometricAtLeast(4, 2, 2, 1) - 5 / 6) < 1e-9);
  // Needing zero copies is a certainty regardless of population shape.
  assert.equal(hypergeometricAtLeast(60, 5, 7, 0), 1);
  // Every card in the population is a "success" — any draw guarantees enough.
  assert.equal(hypergeometricAtLeast(60, 60, 7, 5), 1);
  // No successes exist in the population at all — impossible to draw one.
  assert.equal(hypergeometricAtLeast(60, 0, 7, 1), 0);
  // Needing more successes than exist in either the population or the draw
  // is impossible.
  assert.equal(hypergeometricAtLeast(60, 10, 7, 8), 0);
});

test("hypergeometric probability rises with more sources or more draws, and falls with a stricter requirement", () => {
  assert.ok(hypergeometricAtLeast(60, 20, 7, 1) > hypergeometricAtLeast(60, 10, 7, 1));
  assert.ok(hypergeometricAtLeast(60, 10, 14, 1) > hypergeometricAtLeast(60, 10, 7, 1));
  assert.ok(hypergeometricAtLeast(60, 10, 7, 1) > hypergeometricAtLeast(60, 10, 7, 2));
});

test("scores mana consistency from real land color sources against each spell's actual pip cost and casting turn", () => {
  const rows = [
    { name: "Swamp", quantity: 12, roles: ["land"], colorIdentity: ["B"], cmc: 0 },
    { name: "Plains", quantity: 4, roles: ["land"], colorIdentity: ["W"], cmc: 0 },
    { name: "Easy Black One-Drop", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 1, colorPips: { W: 0, U: 0, B: 1, R: 0, G: 0 } },
    { name: "Hard White Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 2, colorPips: { W: 2, U: 0, B: 0, R: 0, G: 0 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  const easy = report.cards.find((entry) => entry.name === "Easy Black One-Drop");
  const hard = report.cards.find((entry) => entry.name === "Hard White Double-Pip");
  assert.ok(easy.probability > hard.probability, "a single black pip off 12 Swamps should be far more reliable than double-white off only 4 Plains");
  assert.ok(report.risky.some((entry) => entry.name === "Hard White Double-Pip"));
  assert.ok(report.overall > 0 && report.overall <= 1);
  assert.deepEqual(report.sourcesByColor, { W: 4, U: 0, B: 12, R: 0, G: 0 });
});

test("a nonland card with color identity but no real producedMana is never credited as a source", () => {
  // The land-oriented helper falls back to colorIdentity when producedMana
  // is absent — reusing it for nonland rows would wrongly turn every
  // colored creature/spell in the deck into a "mana source" just because
  // it shares a color identity, which would blow the whole consistency
  // model up to near-100% for every deck. A blue creature with no mana
  // ability must contribute nothing.
  const rows = [
    { name: "Island", quantity: 4, roles: ["land"], colorIdentity: ["U"], cmc: 0 },
    { name: "Vanilla Blue Bear", quantity: 4, roles: ["threat"], colorIdentity: ["U"], cmc: 2, colorPips: { W: 0, U: 1, B: 0, R: 0, G: 0 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  assert.deepEqual(report.sourcesByColor, { W: 0, U: 4, B: 0, R: 0, G: 0 });
});

test("a mana rock or dork counts as a real color source, same as a land", () => {
  const rows = [
    { name: "Swamp", quantity: 10, roles: ["land"], colorIdentity: ["B"], cmc: 0 },
    // A colorless rock (no producesColors matching W/U/B/R/G) shouldn't
    // fix anything — Sol Ring doesn't make green mana just by existing.
    { name: "Sol Ring", quantity: 1, roles: ["ramp"], cmc: 1, colorPips: {}, producesColors: ["C"] },
    // A green-producing dork is a real source, same as a Forest would be.
    { name: "Llanowar Elves", quantity: 1, roles: ["ramp"], cmc: 1, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 1 }, producesColors: ["G"] },
    { name: "Hard Green Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 2, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 2 } },
  ];
  const report = manaConsistencyReport(rows, 60);
  assert.deepEqual(report.sourcesByColor, { W: 0, U: 0, B: 10, R: 0, G: 1 });
});

test("mana-rock-aware sourcing raises consistency vs. the same deck without crediting the rock", () => {
  const baseline = [
    { name: "Forest", quantity: 8, roles: ["land"], colorIdentity: ["G"], cmc: 0 },
    { name: "Hard Green Double-Pip", quantity: 4, roles: ["threat"], colorIdentity: [], cmc: 3, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 2 } },
  ];
  const withDorks = [
    ...baseline,
    { name: "Llanowar Elves", quantity: 4, roles: ["ramp"], cmc: 1, colorPips: { W: 0, U: 0, B: 0, R: 0, G: 1 }, producesColors: ["G"] },
  ];
  const before = manaConsistencyReport(baseline, 60).cards.find((entry) => entry.name === "Hard Green Double-Pip");
  const after = manaConsistencyReport(withDorks, 60).cards.find((entry) => entry.name === "Hard Green Double-Pip");
  assert.ok(after.probability > before.probability, "four more green sources from dorks should measurably improve the double-pip card's odds");
});

test("a real built deck reports mana consistency alongside the rest of the masterwork", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  assert.ok(report.manaConsistency.overall >= 0 && report.manaConsistency.overall <= 1);
  assert.ok(Array.isArray(report.manaConsistency.cards));
  assert.ok(Array.isArray(report.manaConsistency.risky));
});

test("refines the basic land split using real per-turn consistency, not just raw pip totals", () => {
  // White's demand is all cheap and urgent (a single pip on turn-1 cards);
  // black's is all late and forgiving (double pips, but not until turn 6,
  // by which point far more cards have been seen). A split based only on
  // raw pip totals has no way to know one color's need is far more
  // time-sensitive than the other's — this checks the built deck's real
  // consistency instead of trusting pip count alone.
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Early White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Late Black Answer ${i}`, "Destroy target creature.", "{4}{B}{B}", "Creature — Test", ["B"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Draw ${i}`, "Draw a card. Scry 1.", "{2}", "Sorcery", [])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const byColor = {};
  for (const card of report.manaConsistency.cards) {
    for (const color of card.colors) {
      (byColor[color] ||= []).push(card.probability);
    }
  }
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const whiteAverage = average(byColor.W || [0]);
  const blackAverage = average(byColor.B || [0]);
  assert.ok(
    Math.abs(whiteAverage - blackAverage) < 0.15,
    `expected the refined mana base to keep both colors' real consistency reasonably close, got W=${whiteAverage.toFixed(2)} B=${blackAverage.toFixed(2)}`,
  );
});

test("uses Scryfall's produced_mana as the authoritative color source, not the broader color_identity", () => {
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const wbPool = [
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Draw ${i}`, "Draw a card. Scry 1.", "{1}{B}{B}")),
    ...Array.from({ length: 10 }, (_, i) => wbCard(`Black Answer ${i}`, "Exile target nonland permanent.", "{1}{B}{B}")),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`White Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{W}", "Creature — Test", ["W"])),
    ...Array.from({ length: 6 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    // color_identity claims W+B (from a colored activated ability that
    // costs {W} but doesn't produce it), while produced_mana — the
    // authoritative field — says it only ever actually taps for B.
    {
      name: "Deceptive Land", typeLine: "Land",
      oracleText: "{T}: Add {B}. {1}{W}, {T}: Scry 1.",
      colorIdentity: ["W", "B"], producedMana: ["B"],
    },
  ];
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Balanced midrange", seed: 5, colors: ["W", "B"], cards: wbPool });
  const row = report.selected.rows.find((entry) => entry.name === "Deceptive Land");
  assert.ok(row, "expected the deceptive land to be selected");
  assert.deepEqual(row.colorIdentity, ["B"], "the row's stored color source should follow produced_mana, not the broader color_identity");
});

test("a real built deck also reports unused engine partners from the fetched pool", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  assert.ok(Array.isArray(report.unusedEnginePartners));
});

test("supports a second commander (Partner or Background) with combined color identity and both slots reserved", () => {
  const primary = { name: "Primary Commander", colors: ["U"], oracleText: "Partner" };
  const secondCommander = { name: "Second Commander", colors: ["B"], oracleText: "Partner" };
  const wbCard = (name, oracleText, manaCost, typeLine = "Creature — Test", colorIdentity = ["B"]) => ({ name, oracleText, manaCost, typeLine, colorIdentity });
  const twoColorPool = [
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Blue Draw ${i}`, "Draw a card. Scry 1.", "{1}{U}", "Creature — Test", ["U"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Black Answer ${i}`, "Destroy target creature.", "{1}{B}{B}", "Creature — Test", ["B"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Ramp Stone ${i}`, "Add one mana. Create a Treasure token.", "{2}", "Artifact", [])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Protect ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "{1}{U}", "Creature — Test", ["U"])),
    ...Array.from({ length: 16 }, (_, i) => wbCard(`Recur ${i}`, "Return target creature card from your graveyard to your hand.", "{2}{B}", "Creature — Test", ["B"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 9,
    commander: primary, secondCommander,
    cards: twoColorPool,
  });
  const commanderRows = report.selected.rows.filter((row) => row.roles.includes("commander"));
  assert.equal(commanderRows.length, 2, "expected both commanders to occupy their own row");
  assert.deepEqual(commanderRows.map((row) => row.name).sort(), ["Primary Commander", "Second Commander"]);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
  // Black cards are only legally includable because the second commander's
  // color identity was unioned into the deck's colors, not discarded.
  assert.ok(report.selected.rows.some((row) => row.name.startsWith("Black Answer")), "expected the second commander's color to actually be usable, not just declared");
});

test("a single commander with no partner behaves exactly as before", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 13,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: pool,
  });
  const commanderRows = report.selected.rows.filter((row) => row.roles.includes("commander"));
  assert.equal(commanderRows.length, 1);
  assert.equal(commanderRows[0].name, "Scholar of Tests");
});

test("curveAwareLandAdjustment nudges up for a high average CMC with no ramp", () => {
  const samples = [
    { quantity: 20, cmc: 6, roles: ["threat"] },
  ];
  // avgCmc 6.0 is +3.0 above the 3.0 baseline -> +6 raw, clamped to +4.
  assert.equal(curveAwareLandAdjustment(samples), 4);
});

test("curveAwareLandAdjustment nudges down for heavy ramp even at a normal curve, after its grace allowance", () => {
  const samples = [
    { quantity: 12, cmc: 3, roles: ["threat"] },
    { quantity: 9, cmc: 3, roles: ["ramp"] },
  ];
  // avgCmc stays at 3.0 (no curve adjustment). The first 3 ramp pieces are
  // a free grace allowance (nearly every deck runs a few staple rocks
  // regardless of strategy), leaving 6 effective ramp pieces -> -2.
  assert.equal(curveAwareLandAdjustment(samples), -2);
});

test("curveAwareLandAdjustment does not penalize an ordinary handful of staple ramp pieces", () => {
  const samples = [
    { quantity: 20, cmc: 3, roles: ["threat"] },
    { quantity: 3, cmc: 3, roles: ["ramp"] },
  ];
  assert.equal(curveAwareLandAdjustment(samples), 0);
});

test("heavy ramp in a genuinely high-curve deck reduces lands modestly, not to the floor", () => {
  // Regression case from a real live-fetched 5-color Commander pool (The
  // Ur-Dragon, avg spell CMC 3.7, 16 ramp/fixing pieces): before the grace
  // allowance and ramp cap existed, 16 ordinary ramp pieces alone swamped
  // a real +1 curve signal all the way down to the -4 floor.
  const samples = [
    { quantity: 49, cmc: 4.06, roles: ["threat"] },
    { quantity: 16, cmc: 2, roles: ["ramp"] },
  ];
  const adjustment = curveAwareLandAdjustment(samples);
  assert.ok(adjustment > -4, `expected heavy ramp to be capped short of the floor even at a high curve, got ${adjustment}`);
  assert.ok(adjustment < 0, `expected heavy ramp to still pull lands down somewhat, got ${adjustment}`);
});

test("curveAwareLandAdjustment is bounded on both sides regardless of how extreme the sample is", () => {
  const extremeHigh = [{ quantity: 10, cmc: 12, roles: ["threat"] }];
  const extremeLow = [
    { quantity: 3, cmc: 0, roles: ["threat"] },
    { quantity: 30, cmc: 1, roles: ["ramp"] },
  ];
  assert.equal(curveAwareLandAdjustment(extremeHigh), 4);
  assert.equal(curveAwareLandAdjustment(extremeLow), -4);
});

test("curveAwareLandAdjustment returns no nudge for an empty or all-ramp-free average deck", () => {
  assert.equal(curveAwareLandAdjustment([]), 0);
  assert.equal(curveAwareLandAdjustment([{ quantity: 10, cmc: 3, roles: ["threat"] }]), 0);
});

// Diverse across every role roleTargets checks (ramp/draw/interaction/
// protection/recursion/sweeper) so the tournament's 45% role-coverage floor
// clears easily, while still skewing heavily toward a high curve with only
// a light dose of ramp — isolating the curve half of the adjustment.
const highCurvePool = [
  ...Array.from({ length: 20 }, (_, i) => card(`Draw ${i}`, "When this enters, draw a card. Scry 1.", "Creature — Test", "{4}{U}{U}")),
  ...Array.from({ length: 20 }, (_, i) => card(`Answer ${i}`, "Exile target nonland permanent.", "Creature — Test", "{4}{U}{U}")),
  ...Array.from({ length: 15 }, (_, i) => card(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "Creature — Test", "{3}{U}{U}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Recur ${i}`, "Return target creature card from your graveyard to your hand.", "Creature — Test", "{3}{U}{U}")),
  ...Array.from({ length: 8 }, (_, i) => card(`Sweep ${i}`, "Exile all creatures.", "Sorcery", "{5}{U}{U}")),
  ...Array.from({ length: 8 }, (_, i) => card(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];

test("a high-curve, ramp-light Commander deck gets more lands than the flat 37% baseline", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Control", seed: 21,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: highCurvePool,
  });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(landSlots > 37, `expected more than the flat 37-land baseline for a high-curve deck, got ${landSlots}`);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100, "total deck size must still hit the target regardless of how the land/spell split shifted");
});

test("a low-curve, ramp-heavy Commander deck gets fewer lands than the flat 37% baseline", () => {
  const rampPool = [
    ...Array.from({ length: 30 }, (_, i) => card(`Dork ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{1}")),
    ...Array.from({ length: 15 }, (_, i) => card(`Cheap Draw ${i}`, "Draw a card. Scry 1.", "Creature — Test", "{U}")),
    ...Array.from({ length: 15 }, (_, i) => card(`Cheap Answer ${i}`, "Exile target nonland permanent.", "Creature — Test", "{U}")),
    ...Array.from({ length: 8 }, (_, i) => card(`Cheap Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.", "Creature — Test", "{U}")),
    ...Array.from({ length: 6 }, (_, i) => card(`Cheap Recur ${i}`, "Return target creature card from your graveyard to your hand.", "Creature — Test", "{1}{U}")),
    ...Array.from({ length: 5 }, (_, i) => card(`Cheap Sweep ${i}`, "Exile all creatures.", "Sorcery", "{1}{U}")),
    ...Array.from({ length: 10 }, (_, i) => card(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Aggressive", seed: 23,
    commander: { name: "Scholar of Tests", colors: ["U"], oracleText: "Whenever you draw a card, create a token." },
    cards: rampPool,
  });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.ok(landSlots < 37, `expected fewer than the flat 37-land baseline for a low-curve, ramp-heavy deck, got ${landSlots}`);
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100);
});

test("curve-aware land scaling never touches non-singleton formats, which stay at a flat 40%", () => {
  const report = forgeNativeMasterwork({ format: "Standard", target: 60, strategy: "Control", seed: 25, colors: ["U"], cards: highCurvePool });
  const landSlots = report.selected.rows.filter((row) => row.roles.includes("land")).reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(landSlots, 24, "60-card Standard must stay at the flat 40% baseline (24 lands) regardless of curve");
});
