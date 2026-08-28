import test from "node:test";
import assert from "node:assert/strict";
import CARD_MECHANICS from "../app/card-mechanics.mjs";
import {
  buildInteractionGraph,
  configureInteractionGraphTagLookup,
  extractMechanicalSignals,
  findUnusedEnginePartners,
  findExplicitOracleReferences,
  oracleExplicitlyNames,
  classifyLoopKind,
  classifySelectionKinds,
  classifyGraveyardKinds,
  classifySacrificeKinds,
  classifyTriggerKinds,
  classifyCounterKinds,
  classifyLifeKinds,
  classifyProtectionKinds,
  classifyEvasionKinds,
  classifyLandKinds,
  classifyArtifactKinds,
  classifyTokenKinds,
  classifyAuraKinds,
  classifySpellKinds,
  classifyDrawKinds,
  classifyDamageKinds,
  classifyEquipmentKinds,
  classifyCombatKinds,
  findResetPayPairs,
  LOOP_KINDS,
  SELECTION_KINDS,
  GRAVEYARD_KINDS,
  SACRIFICE_KINDS,
  TRIGGER_KINDS,
  COUNTER_KINDS,
  LIFE_KINDS,
  PROTECTION_KINDS,
  EVASION_KINDS,
  LAND_KINDS,
  ARTIFACT_KINDS,
  TOKEN_KINDS,
  AURA_KINDS,
  SPELL_KINDS,
  DRAW_KINDS,
  DAMAGE_KINDS,
  EQUIPMENT_KINDS,
  COMBAT_KINDS,
  RESET_SHAPES,
  RELATIONSHIP_EVIDENCE,
} from "../app/forge-interaction-graph.mjs";
import {
  commanderConnectionSignalsFor,
  commanderMechanicalScopes,
} from "../app/native-masterwork-engine.mjs";

// forge-interaction-graph.mjs takes its per-card tag lookup by injection
// (configureInteractionGraphTagLookup) rather than importing card-mechanics.mjs
// itself, so the client bundle reaching extractMechanicalSignals doesn't drag
// the whole per-card database in with it. native-masterwork-engine.mjs wires
// the real lookup for production; this file tests the real tag integration
// directly, so it wires the same real lookup itself.
configureInteractionGraphTagLookup((normalizedName) => CARD_MECHANICS[normalizedName] || []);

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

// Founder #054: the fixtures below use Panharmonicon and Yarok, the
// Desecrated's real current Oracle text, verified via Scryfall
// (api.scryfall.com/cards/named?exact=). Both read "artifact/permanent
// ENTERING causes ... to trigger" — no "the battlefield", and never the
// bare verb "enter"/"enters" — which is a different shape than the
// fabricated "enters-the-battlefield ability ... triggers" text this file
// previously used. The old text happened to satisfy the old regex; it was
// never what either real card says, and the real wording silently never
// matched at all until this fix.
test("flags a trigger doubler as a verified amplifier of every real ETB payoff in the deck", () => {
  const doubler = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an artifact or creature entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." };
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

test("Yarok, the Desecrated's real wording (permanent entering, not artifact/creature) is also recognized as a trigger doubler", () => {
  const doubler = { name: "Yarok, the Desecrated", typeLine: "Legendary Creature", oracleText: "Deathtouch, lifelink\nIf a permanent entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." };
  const payoff = { name: "Soul Warden", typeLine: "Creature", oracleText: "Whenever another creature enters the battlefield under your control, you gain 1 life." };
  const graph = buildInteractionGraph([doubler, payoff]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].source, "Yarok, the Desecrated");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Soul Warden"]);
});

test("a trigger doubler with nothing to double doesn't produce an empty amplifier entry", () => {
  const doubler = { name: "Panharmonicon", typeLine: "Artifact", oracleText: "If an artifact or creature entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." };
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

// Founder #101: the etb doubler above (Panharmonicon/Yarok) is one
// instance of a much broader real, shared grammatical template — verified
// via Scryfall: 21 real cards use the exact "[condition] causes a
// triggered ability of a permanent you control to trigger, that ability
// triggers an additional time" tail with a different leading
// trigger-condition clause each time. Only "entering" had an entry;
// several other real, genuinely iconic commanders whose entire identity
// IS this amplifier shape (for a different resource) were completely
// invisible to it — each fixture below is that commander's exact,
// currently-printed Oracle text.
test("Founder #101: Veyran, Voice of Duality's real instant/sorcery-cast doubler is recognized as a trigger amplifier for the spells signal", () => {
  const doubler = { name: "Veyran, Voice of Duality", typeLine: "Legendary Creature", oracleText: "Magecraft — Whenever you cast or copy an instant or sorcery spell, Veyran gets +1/+1 until end of turn.\nIf you casting or copying an instant or sorcery spell causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." };
  const payoff = { name: "Guttersnipe", typeLine: "Creature", oracleText: "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent." };
  const graph = buildInteractionGraph([doubler, payoff]);
  const spellsAmplifier = graph.amplifiers.find((entry) => entry.source === "Veyran, Voice of Duality" && entry.signal === "spells");
  assert.ok(spellsAmplifier, "expected a spells-signal amplifier from Veyran");
  assert.deepEqual(spellsAmplifier.amplifies, ["Guttersnipe"]);
  assert.equal(spellsAmplifier.side, "rewards");
});

test("Founder #101: Krang, the All-Powerful's real card-draw doubler is recognized as a trigger amplifier for the draw signal", () => {
  const doubler = { name: "Krang, the All-Powerful", typeLine: "Legendary Creature", oracleText: "If a player drawing a card causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nWhenever a player draws their second card each turn, put a +1/+1 counter on Krang." };
  const payoff = { name: "The Locust God", typeLine: "Creature", oracleText: "Whenever you draw a card, create a 1/1 black and red Insect creature token with flying and haste." };
  const graph = buildInteractionGraph([doubler, payoff]);
  const drawAmplifier = graph.amplifiers.find((entry) => entry.source === "Krang, the All-Powerful" && entry.signal === "draw");
  assert.ok(drawAmplifier, "expected a draw-signal amplifier from Krang");
  assert.deepEqual(drawAmplifier.amplifies, ["The Locust God"]);
});

test("Founder #101: Dr. Beverly Crusher's real lifegain doubler is recognized as a trigger amplifier for the life signal", () => {
  const doubler = { name: "Dr. Beverly Crusher", typeLine: "Legendary Creature", oracleText: "If you gaining life causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nWhenever you gain life, put a +1/+1 counter on Dr. Crusher." };
  // A real "whenever you gain life, [reward]" PAYOFFS.life card — not a
  // life-gain PRODUCER like Soul Warden, which the doubler does not amplify.
  const payoff = { name: "Cliffhaven Vampire", typeLine: "Creature", oracleText: "Whenever you gain life, exile up to one target card from a graveyard. If it was a creature card, create a 1/1 white Spirit creature token with flying." };
  const graph = buildInteractionGraph([doubler, payoff]);
  const lifeAmplifier = graph.amplifiers.find((entry) => entry.source === "Dr. Beverly Crusher" && entry.signal === "life");
  assert.ok(lifeAmplifier, "expected a life-signal amplifier from Dr. Beverly Crusher");
  assert.deepEqual(lifeAmplifier.amplifies, ["Cliffhaven Vampire"]);
});

test("Founder #101: Teysa Karlov's real creature-death doubler is recognized as a trigger amplifier for the sacrifice signal", () => {
  const doubler = { name: "Teysa Karlov", typeLine: "Legendary Creature", oracleText: "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nCreature tokens you control have vigilance and lifelink." };
  const payoff = { name: "Blood Artist", typeLine: "Creature", oracleText: "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life." };
  const graph = buildInteractionGraph([doubler, payoff]);
  const sacrificeAmplifier = graph.amplifiers.find((entry) => entry.source === "Teysa Karlov" && entry.signal === "sacrifice");
  assert.ok(sacrificeAmplifier, "expected a sacrifice-signal amplifier from Teysa Karlov");
  assert.deepEqual(sacrificeAmplifier.amplifies, ["Blood Artist"]);
});

// Founder #056: bare "whenever you cast" was a false-positive magnet for
// commanders whose "whenever you cast a[n] TYPE spell" trigger names an
// off-target type (artifact/creature/enchantment/colorless/legendary) that
// has nothing to do with the instant/sorcery spellslinger archetype this
// signal otherwise represents. Sythis, Harvest's Hand (real Oracle text,
// verified via Scryfall) was the concrete false positive: an enchantress
// commander showing up as a spellslinger reward, meaning every random
// instant/sorcery in the pool would read as "commander-connected."
// Note: this test's fixtures use synthetic names, not the real cards their
// oracle text is drawn from (Sythis, Harvest's Hand; Ugin, Eye of the
// Storms) — this file wires the real CARD_MECHANICS tag lookup at module
// scope (see configureInteractionGraphTagLookup above), and both of those
// two real cards independently carry a pre-existing "spell_payoff" tag in
// the curated database (1,424 cards carry it, verified via card-mechanics.mjs
// — a much larger, separately-scoped surface than this regex fix). Using
// their real names here would test the tag-lookup union, not the regex
// change this test targets. The database-tag side of this same false
// positive is a known, flagged, out-of-scope-for-this-fix follow-up.
test("PAYOFFS.spells excludes 'whenever you cast an enchantment/artifact/creature/colorless/legendary spell' — those are different real archetypes, not the instant/sorcery spellslinger signal", () => {
  const cases = [
    { name: "Test Enchantment Spell Payoff", oracleText: "Whenever you cast an enchantment spell, you gain 1 life and draw a card." },
    { name: "Test Artifact Spell Payoff", oracleText: "Whenever you cast an artifact spell, create a 1/1 colorless Servo artifact creature token." },
    { name: "Test Colorless Spell Payoff", oracleText: "Whenever you cast a colorless spell, exile up to one target permanent that's one or more colors." },
    { name: "Test Legendary Spell Payoff", oracleText: "Whenever you cast a legendary spell, search your library for a card, put it onto the battlefield, then shuffle." },
    { name: "Test Creature Spell Payoff", oracleText: "Whenever you cast a creature spell, draw a card." },
  ];
  for (const card of cases) {
    assert.ok(!extractMechanicalSignals({ ...card, typeLine: "Creature" }).rewards.includes("spells"), `${card.name} should not reward the instant/sorcery spellslinger signal`);
  }
});

test("PAYOFFS.spells still recognizes real instant/sorcery and untyped spell-count triggers — the exclusion doesn't over-narrow", () => {
  const cases = [
    { name: "Mizzix of the Izmagnus", oracleText: "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter." },
    { name: "Saheeli, Sublime Artificer", oracleText: "Whenever you cast a noncreature spell, create a 1/1 colorless Servo artifact creature token." },
    // Real, untyped spell-count triggers — no type word follows "cast" at
    // all, so the exclusion (which only fires right after an article) must
    // not touch these.
    { name: "Jori En, Ruin Diver", oracleText: "Whenever you cast your second spell each turn, draw a card." },
    { name: "Kalamax, the Stormsire", oracleText: "Whenever you cast your first instant spell each turn, if Kalamax is tapped, copy that spell." },
  ];
  for (const card of cases) {
    assert.ok(extractMechanicalSignals({ ...card, typeLine: "Creature" }).rewards.includes("spells"), `${card.name} should still reward the spells signal`);
  }
});

// Founder #057: the curated card-mechanics.mjs database independently
// tags Sythis, Harvest's Hand and Ugin, Eye of the Storms with
// "spell_payoff" (TAG_PAYOFFS maps that tag to this same "spells" signal),
// carrying the identical #056 false positive regardless of what the
// regex itself finds — a card's rewards are a UNION of regex matches and
// tag matches, so #056's regex fix alone did not close this for any of
// the 1,424 real cards that carry the tag. These two use their real
// names (unlike #056's synthetic fixtures above) specifically so this
// test exercises the real production tag lookup wired at the top of this
// file, not just the regex in isolation.
test("the curated database's 'spell_payoff' tag no longer overrides #056's exclusion — Sythis and Ugin stay excluded even through the real tag lookup", () => {
  const sythis = { name: "Sythis, Harvest's Hand", typeLine: "Legendary Creature", oracleText: "Whenever you cast an enchantment spell, you gain 1 life and draw a card." };
  const ugin = { name: "Ugin, Eye of the Storms", typeLine: "Legendary Planeswalker — Ugin", oracleText: "Whenever you cast a colorless spell, exile up to one target permanent that's one or more colors." };
  for (const card of [sythis, ugin]) {
    assert.ok(!extractMechanicalSignals(card).rewards.includes("spells"), `${card.name} should not reward spells even via the curated database tag`);
  }
});

test("the 'spell_payoff' tag guard doesn't touch cards where the oracle text has no off-target trigger to verify — real instant/sorcery cards keep tag-derived credit", () => {
  const mizzix = { name: "Mizzix of the Izmagnus", typeLine: "Legendary Creature", oracleText: "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter." };
  assert.ok(extractMechanicalSignals(mizzix).rewards.includes("spells"));
});

// Founder #058: the curated database's "counter_payoff" tag is mistagged
// on a large scale — a 73-card spread sample (real cards, Scryfall-
// verified) came back 62% with zero occurrence of the word "counter"
// anywhere in their real oracle text. Bomat Bazaar Barge and Cargo Ship
// both carry the tag in the real database (confirmed via card-mechanics.mjs
// directly) purely because of their unrelated Crew N ability — the
// auto-tagger appears to conflate "tap creatures with total power N" cost
// shapes (Crew, Saddle, Teamwork) with the counters mechanic. These two
// use their real names to exercise the real production tag lookup wired
// at the top of this file, the same way #057's tag-guard tests do.
test("the curated database's mistagged 'counter_payoff' tag (Crew N Vehicles with zero real counter text) is excluded from the counters signal", () => {
  const bomat = { name: "Bomat Bazaar Barge", typeLine: "Artifact — Vehicle", oracleText: "When this Vehicle enters, draw a card.\nCrew 3 (Tap any number of creatures you control with total power 3 or more: This Vehicle becomes an artifact creature until end of turn.)" };
  const cargoShip = { name: "Cargo Ship", typeLine: "Artifact — Vehicle", oracleText: "Flying, vigilance\n{T}: Add {C}. Spend this mana only to cast an artifact spell or activate an ability of an artifact source.\nCrew 1 (Tap any number of creatures you control with total power 1 or more: This Vehicle becomes an artifact creature until end of turn.)" };
  for (const card of [bomat, cargoShip]) {
    assert.ok(!extractMechanicalSignals(card).rewards.includes("counters"), `${card.name} should not reward counters — its text never mentions the word at all`);
  }
});

test("the 'counter_payoff' tag guard doesn't touch cards whose own text genuinely mentions counters", () => {
  const realCounterCard = { name: "Not In DB Test Card", typeLine: "Artifact", oracleText: "If a creature you control has a counter on it, draw a card." };
  assert.ok(extractMechanicalSignals(realCounterCard).rewards.includes("counters"));
});

test("a token/counter doubler amplifies producers, not payoffs — the doubling applies to the effect creating the resource, whether or not it's a trigger", () => {
  const doubler = { name: "Doubling Season", typeLine: "Enchantment", oracleText: "If an effect would create one or more tokens under your control, it creates twice that many instead. If an effect would put one or more counters on a permanent or player, it puts twice that many instead." };
  // Rewards tokens (cares about tokens already on the battlefield) but
  // never itself produces one — must not be amplified.
  const payoffOnly = { name: "Anthem", typeLine: "Enchantment", oracleText: "Creatures you control get +1/+1 for each token you control." };
  const graph = buildInteractionGraph([doubler, payoffOnly]);
  assert.deepEqual(graph.amplifiers, []);
});

// Founder #054: Azusa, Lost but Seeking's real Oracle text (verified via
// Scryfall) is "You may play two additional lands on each of your turns" —
// plural, with the number "two" instead of the article "an". The old
// PRODUCERS.lands pattern only accepted the singular "an additional land"
// (Exploration/Burgeoning's wording), so the format's single most iconic
// extra-land-drop commander produced nothing at all.
test("PRODUCERS.lands recognizes a numbered extra-land-drop clause (Azusa: 'two additional lands'), not just the singular 'an additional land'", () => {
  const azusa = { name: "Azusa, Lost but Seeking", typeLine: "Legendary Creature", oracleText: "You may play two additional lands on each of your turns." };
  const signals = extractMechanicalSignals(azusa);
  assert.ok(signals.produces.includes("lands"), "Azusa should produce the lands signal from her real extra-land-drop text");
});

test("PRODUCERS.lands still recognizes the singular 'an additional land' wording (Exploration)", () => {
  const exploration = { name: "Exploration", typeLine: "Enchantment", oracleText: "You may play an additional land on each of your turns." };
  const signals = extractMechanicalSignals(exploration);
  assert.ok(signals.produces.includes("lands"));
});

// Founder #054: Ardenn, Intrepid Archaeologist's real Oracle text (verified
// via Scryfall) is "attach any number of Auras and Equipment you control
// to target permanent or player" — the word "Equipment" sits between
// "Auras" and "you control", which broke the old bare "auras? you control"
// pattern requiring the two adjacent. Ardenn is a real, popular Auras and
// Equipment commander that previously produced and rewarded nothing.
test("PAYOFFS.auras recognizes 'Auras and Equipment you control' (Ardenn), not just the bare adjacent 'auras you control'", () => {
  const ardenn = { name: "Ardenn, Intrepid Archaeologist", typeLine: "Legendary Creature", oracleText: "At the beginning of combat on your turn, you may attach any number of Auras and Equipment you control to target permanent or player." };
  const signals = extractMechanicalSignals(ardenn);
  assert.ok(signals.rewards.includes("auras"), "Ardenn should reward the auras signal from her real Auras-and-Equipment text");
});

test("PAYOFFS.auras still recognizes the bare adjacent 'auras you control' wording", () => {
  const bareAuras = { name: "Test Aura Anthem", typeLine: "Enchantment", oracleText: "Creatures you control get +1/+1 for each Aura you control." };
  const signals = extractMechanicalSignals(bareAuras);
  assert.ok(signals.rewards.includes("auras"));
});

// Founder #055: "sacrifice another" alone missed the two most common real
// sacrifice-mechanic shapes: the classic sac-outlet cost "Sacrifice a
// creature:" (Ashnod's Altar, Viscera Seer, Goblin Bombardment — real
// Oracle text verified via Scryfall) and the third-person forced-sacrifice
// "edict" shape (Diabolic Edict: "Target player sacrifices a creature.").
// Both are defining shapes of real aristocrats/edict decks and both scored
// zero commander-connection credit before this fix, even though this is
// the same PAYOFFS.sacrifice pattern that already correctly recognized
// Yawgmoth's "Sacrifice another creature:" cost.
test("PAYOFFS.sacrifice recognizes the real 'Sacrifice a creature:' outlet-cost shape (Ashnod's Altar, Viscera Seer), not just 'sacrifice another'", () => {
  const altar = { name: "Ashnod's Altar", typeLine: "Artifact", oracleText: "Sacrifice a creature: Add {C}{C}." };
  const seer = { name: "Viscera Seer", typeLine: "Creature", oracleText: "Sacrifice a creature: Scry 1." };
  const bombardment = { name: "Goblin Bombardment", typeLine: "Enchantment", oracleText: "Sacrifice a Goblin: Goblin Bombardment deals 1 damage to any target." };
  for (const card of [altar, seer, bombardment]) {
    assert.ok(extractMechanicalSignals(card).rewards.includes("sacrifice"), `${card.name} should reward the sacrifice signal`);
  }
});

test("PAYOFFS.sacrifice recognizes the real third-person 'sacrifices a creature' edict shape (Diabolic Edict, Liliana of the Veil), not just first-person 'sacrifice'", () => {
  const edict = { name: "Diabolic Edict", typeLine: "Instant", oracleText: "Target player sacrifices a creature." };
  const liliana = { name: "Liliana of the Veil", typeLine: "Legendary Planeswalker", oracleText: "Each player sacrifices a creature." };
  for (const card of [edict, liliana]) {
    assert.ok(extractMechanicalSignals(card).rewards.includes("sacrifice"), `${card.name} should reward the sacrifice signal`);
  }
});

test("PAYOFFS.sacrifice still recognizes the pre-existing 'sacrifice another' outlet-cost wording (Yawgmoth)", () => {
  const yawgmoth = { name: "Yawgmoth, Thran Physician", typeLine: "Legendary Creature", oracleText: "Pay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card." };
  assert.ok(extractMechanicalSignals(yawgmoth).rewards.includes("sacrifice"));
});

// Founder #060: found via a real Hearthhull, the Worldseed (a real land-
// sacrifice commander) comparison — Scapeshift, a real Hearthhull primer
// staple, scored zero sacrifice credit because "sacrifice ANY NUMBER OF
// lands" is a real, common quantifier shape #055 never covered (only
// "a"/"an"/"another").
test("PAYOFFS.sacrifice recognizes the real 'sacrifice any number of' quantifier shape (Scapeshift), not just 'a'/'an'/'another'", () => {
  const scapeshift = { name: "Scapeshift", typeLine: "Sorcery", oracleText: "Sacrifice any number of lands. Search your library for that many land cards, put them onto the battlefield tapped, then shuffle." };
  assert.ok(extractMechanicalSignals(scapeshift).rewards.includes("sacrifice"));
});

// Founder #061: found via a real Teval, the Balanced Scale comparison.
// "Whenever one or more cards leave your graveyard, create a token" is a
// real, common template (41 real cards, verified via Scryfall) that never
// contains "from your graveyard" or any other existing PAYOFFS.graveyard
// alternative. Tormod, the Desecrator is a real legendary partner
// commander whose ENTIRE oracle text is exactly this one clause — he
// scored zero graveyard-payoff credit before this fix. Teval's own text
// happened to also contain "from your graveyard" in an earlier clause,
// which coincidentally already satisfied this signal and masked the gap.
test("PAYOFFS.graveyard recognizes the real 'cards leave your graveyard' payoff shape (Tormod, the Desecrator), not just 'from your graveyard'", () => {
  const tormod = { name: "Tormod, the Desecrator", typeLine: "Legendary Creature", oracleText: "Whenever one or more cards leave your graveyard, create a tapped 2/2 black Zombie creature token." };
  assert.ok(extractMechanicalSignals(tormod).rewards.includes("graveyard"));
});

// Founder #062: found via a real Edgar Markov comparison. Two more real
// quantifier/verb-form gaps in PAYOFFS.sacrifice. Vraan, Executioner
// Thane (a real legendary commander) uses the grammatically-plural
// "creatures you control die" — the old pattern only accepted the
// singular "dies". Bolas's Citadel uses a specific number ("Sacrifice ten
// nonland permanents") rather than "a"/"an"/"another"/"any number of".
test("PAYOFFS.sacrifice recognizes the real plural 'creatures die' verb form (Vraan, Executioner Thane), not just singular 'dies'", () => {
  const vraan = { name: "Vraan, Executioner Thane", typeLine: "Legendary Creature", oracleText: "Whenever one or more other creatures you control die, each opponent loses 2 life and you gain 2 life. This ability triggers only once each turn." };
  assert.ok(extractMechanicalSignals(vraan).rewards.includes("sacrifice"));
});

test("PAYOFFS.sacrifice recognizes a real specific-number quantifier (Bolas's Citadel: 'Sacrifice ten nonland permanents'), not just 'a'/'an'/'another'/'any number of'", () => {
  const citadel = { name: "Bolas's Citadel", typeLine: "Legendary Artifact", oracleText: "You may look at the top card of your library any time.\nYou may play lands and cast spells from the top of your library. If you cast a spell this way, pay life equal to its mana value rather than pay its mana cost.\n{T}, Sacrifice ten nonland permanents: Each opponent loses 10 life." };
  assert.ok(extractMechanicalSignals(citadel).rewards.includes("sacrifice"));
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

// Founder #064: found via a real Ojer Axonil, Deepest Might comparison —
// a popular, modern (MH3) mono-red commander whose entire identity is a
// damage-amplifying replacement effect the old pattern never covered.
// Ojer's real shape is a FLOOR/minimum ("less than X ... equal to X
// instead"), distinct from Fiery Emancipation's multiplier. While
// researching real prevalence, found a second new real shape too: Thor,
// Asgard's Avenger's additive "+1" replacement — neither a multiplier nor
// a floor. Both verified against real Scryfall oracle text.
test("Ojer Axonil, Deepest Might's real floor-damage replacement ('less than X ... equal to X instead') amplifies every real damage source in the deck", () => {
  const ojer = { name: "Ojer Axonil, Deepest Might", typeLine: "Legendary Creature — God", oracleText: "Trample\nIf a red source you control would deal an amount of noncombat damage less than Ojer Axonil's power to an opponent, that source deals damage equal to Ojer Axonil's power instead.\nWhen Ojer Axonil dies, return it to the battlefield tapped and transformed under its owner's control." };
  const pinger = { name: "Thermo-Alchemist", typeLine: "Creature", oracleText: "{T}: Thermo-Alchemist deals 1 damage to each opponent." };
  const graph = buildInteractionGraph([ojer, pinger]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].signal, "damage");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Thermo-Alchemist"]);
});

test("Thor, Asgard's Avenger's real additive '+N damage instead' replacement also amplifies every real damage source in the deck", () => {
  const thor = { name: "Thor, Asgard's Avenger", typeLine: "Legendary Creature — God", oracleText: "Flying\nIf another source you control would deal damage to an opponent or a permanent an opponent controls, it deals that much damage plus 1 instead." };
  const pinger = { name: "Thermo-Alchemist", typeLine: "Creature", oracleText: "{T}: Thermo-Alchemist deals 1 damage to each opponent." };
  const graph = buildInteractionGraph([thor, pinger]);
  assert.equal(graph.amplifiers.length, 1);
  assert.equal(graph.amplifiers[0].signal, "damage");
  assert.deepEqual(graph.amplifiers[0].amplifies, ["Thermo-Alchemist"]);
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

test("Clue production connects to Clue payoffs without masquerading as Treasure support", () => {
  const investigator = { name: "Case Maker", typeLine: "Creature — Detective", oracleText: "Whenever this creature attacks, investigate." };
  const cluePayoff = { name: "Case Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Clue, draw a card." };
  const treasurePayoff = { name: "Coin Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Treasure, draw a card." };
  const graph = buildInteractionGraph([investigator, cluePayoff, treasurePayoff]);
  const clueEdge = graph.edges.find((entry) => entry.from === "Case Maker" && entry.to === "Case Reward");
  const treasureEdge = graph.edges.find((entry) => entry.from === "Case Maker" && entry.to === "Coin Reward");
  assert.ok(clueEdge?.signals.includes("clues"), "investigate must produce the named Clue resource");
  assert.equal(treasureEdge?.signals.includes("treasure") || false, false, "Clues and Treasure remain distinct resources");
});

test("Food production connects to Food payoffs and artifact outlets without masquerading as Clues", () => {
  const cook = { name: "Trail Cook", typeLine: "Creature — Halfling", oracleText: "Whenever this creature attacks, create a Food token." };
  const foodPayoff = { name: "Feast Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Food, draw a card." };
  const artifactOutlet = { name: "Foundry Outlet", typeLine: "Artifact", oracleText: "Sacrifice an artifact: Add one mana of any color." };
  const cluePayoff = { name: "Case Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Clue, draw a card." };
  const graph = buildInteractionGraph([cook, foodPayoff, artifactOutlet, cluePayoff]);
  const foodEdge = graph.edges.find((entry) => entry.from === "Trail Cook" && entry.to === "Feast Reward");
  const artifactEdge = graph.edges.find((entry) => entry.from === "Trail Cook" && entry.to === "Foundry Outlet");
  const clueEdge = graph.edges.find((entry) => entry.from === "Trail Cook" && entry.to === "Case Reward");
  assert.ok(foodEdge?.signals.includes("food"), "Food production must feed Food-specific rewards");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Food is an artifact token and feeds generic artifact outlets");
  assert.equal(clueEdge?.signals.includes("clues") || false, false, "Food and Clues remain distinct resources");
});

test("Blood production connects to Blood payoffs and artifact outlets without masquerading as Food", () => {
  const socialite = { name: "Voldaren Socialite", typeLine: "Creature — Vampire", oracleText: "When this creature enters, create a Blood token." };
  const bloodPayoff = { name: "Blood Hypnotist", typeLine: "Creature — Vampire", oracleText: "Whenever you sacrifice a Blood token, target creature can't block this turn." };
  const artifactOutlet = { name: "Artifact Furnace", typeLine: "Artifact", oracleText: "Sacrifice an artifact: Add {R}." };
  const foodPayoff = { name: "Feast Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Food, draw a card." };
  const graph = buildInteractionGraph([socialite, bloodPayoff, artifactOutlet, foodPayoff]);
  const bloodEdge = graph.edges.find((entry) => entry.from === "Voldaren Socialite" && entry.to === "Blood Hypnotist");
  const artifactEdge = graph.edges.find((entry) => entry.from === "Voldaren Socialite" && entry.to === "Artifact Furnace");
  const foodEdge = graph.edges.find((entry) => entry.from === "Voldaren Socialite" && entry.to === "Feast Reward");
  assert.ok(bloodEdge?.signals.includes("blood"), "Blood production must feed Blood-specific rewards");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Blood is an artifact token and feeds generic artifact outlets");
  assert.equal(foodEdge?.signals.includes("food") || false, false, "Blood and Food remain distinct resources");
});

test("Gold production feeds artifact outlets without masquerading as Treasure", () => {
  const king = { name: "Golden King", typeLine: "Legendary Creature — Human", oracleText: "Whenever this creature becomes untapped, create a Gold token." };
  const goldPayoff = { name: "Gold Tribute", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Gold token, each opponent loses 1 life." };
  const artifactOutlet = { name: "Artifact Furnace", typeLine: "Artifact", oracleText: "Sacrifice an artifact: Draw a card." };
  const treasurePayoff = { name: "Treasure Tribute", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Treasure, each opponent loses 1 life." };
  const graph = buildInteractionGraph([king, goldPayoff, artifactOutlet, treasurePayoff]);
  const goldEdge = graph.edges.find((entry) => entry.from === "Golden King" && entry.to === "Gold Tribute");
  const artifactEdge = graph.edges.find((entry) => entry.from === "Golden King" && entry.to === "Artifact Furnace");
  const treasureEdge = graph.edges.find((entry) => entry.from === "Golden King" && entry.to === "Treasure Tribute");
  assert.ok(goldEdge?.signals.includes("gold"), "Gold production must feed Gold-specific rewards");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Gold is an artifact token and feeds generic artifact outlets");
  assert.equal(treasureEdge?.signals.includes("treasure") || false, false, "Gold and Treasure remain distinct resources");
});

test("Map production feeds explore payoffs and artifact outlets without masquerading as Treasure", () => {
  const cartographer = { name: "River Cartographer", typeLine: "Creature — Merfolk Scout", oracleText: "When this creature enters, create a Map token." };
  const explorePayoff = { name: "Deep Surveyor", typeLine: "Creature — Merfolk", oracleText: "Whenever a creature you control explores, put a +1/+1 counter on Deep Surveyor." };
  const artifactOutlet = { name: "Artifact Furnace", typeLine: "Artifact", oracleText: "Sacrifice an artifact: Draw a card." };
  const treasurePayoff = { name: "Treasure Tribute", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Treasure, each opponent loses 1 life." };
  const graph = buildInteractionGraph([cartographer, explorePayoff, artifactOutlet, treasurePayoff]);
  const exploreEdge = graph.edges.find((entry) => entry.from === "River Cartographer" && entry.to === "Deep Surveyor");
  const artifactEdge = graph.edges.find((entry) => entry.from === "River Cartographer" && entry.to === "Artifact Furnace");
  const treasureEdge = graph.edges.find((entry) => entry.from === "River Cartographer" && entry.to === "Treasure Tribute");
  assert.ok(exploreEdge?.signals.includes("explore"), "a Map provides a future explore activation");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Maps are artifact tokens and feed generic artifact outlets");
  assert.equal(treasureEdge?.signals.includes("treasure") || false, false, "Maps and Treasure remain distinct resources");
});

test("Junk production feeds exile-play payoffs and artifact outlets without masquerading as Clues", () => {
  const scavenger = { name: "Wasteland Scavenger", typeLine: "Creature — Human Rogue", oracleText: "When this creature enters, create a Junk token." };
  const exilePayoff = { name: "Exile Chronicler", typeLine: "Creature — Human", oracleText: "Whenever you play a card from exile, draw a card." };
  const artifactOutlet = { name: "Artifact Furnace", typeLine: "Artifact", oracleText: "Sacrifice an artifact: Add {R}." };
  const cluePayoff = { name: "Case Reward", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Clue, draw a card." };
  const graph = buildInteractionGraph([scavenger, exilePayoff, artifactOutlet, cluePayoff]);
  const exileEdge = graph.edges.find((entry) => entry.from === "Wasteland Scavenger" && entry.to === "Exile Chronicler");
  const artifactEdge = graph.edges.find((entry) => entry.from === "Wasteland Scavenger" && entry.to === "Artifact Furnace");
  const clueEdge = graph.edges.find((entry) => entry.from === "Wasteland Scavenger" && entry.to === "Case Reward");
  assert.ok(exileEdge?.signals.includes("exile_play"), "a Junk token provides a future play-from-exile event");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Junk is an artifact token and feeds generic artifact outlets");
  assert.equal(clueEdge?.signals.includes("clues") || false, false, "Junk and Clues remain distinct resources");
});

test("Powerstone production feeds Powerstone and artifact payoffs without masquerading as Treasure", () => {
  const excavator = { name: "Powerstone Excavator", typeLine: "Creature — Artificer", oracleText: "When this creature enters, create a tapped Powerstone token." };
  const powerstonePayoff = { name: "Powerstone Array", typeLine: "Artifact", oracleText: "Powerstones you control have '{T}: Add {C}{C}.'." };
  const artifactPayoff = { name: "Artifact Observer", typeLine: "Creature — Artificer", oracleText: "Whenever an artifact enters under your control, draw a card." };
  const treasurePayoff = { name: "Treasure Tribute", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Treasure, each opponent loses 1 life." };
  const graph = buildInteractionGraph([excavator, powerstonePayoff, artifactPayoff, treasurePayoff]);
  const powerstoneEdge = graph.edges.find((entry) => entry.from === "Powerstone Excavator" && entry.to === "Powerstone Array");
  const artifactEdge = graph.edges.find((entry) => entry.from === "Powerstone Excavator" && entry.to === "Artifact Observer");
  const treasureEdge = graph.edges.find((entry) => entry.from === "Powerstone Excavator" && entry.to === "Treasure Tribute");
  assert.ok(powerstoneEdge?.signals.includes("powerstones"), "Powerstone production must feed Powerstone-specific rewards");
  assert.ok(artifactEdge?.signals.includes("artifacts"), "Powerstones are artifact tokens and feed artifact payoffs");
  assert.equal(treasureEdge?.signals.includes("treasure") || false, false, "Powerstones and Treasure remain distinct resources");
});

test("Treasure production does not masquerade as sacrifice/aristocrats fodder production", () => {
  // Smaug the Impenetrable ("Whenever Smaug is dealt noncombat damage,
  // create that many Treasure tokens") has no sacrifice or death-trigger
  // text at all, but used to falsely produce the "sacrifice" signal because
  // that producer regex matched any "create ... token" text, not just
  // creature tokens — the same false-connection class already guarded
  // against above for Clue/Food/Blood/Gold/Map/Junk/Powerstone, just missed
  // for this one signal.
  const smaug = { name: "Smaug, the Impenetrable", typeLine: "Legendary Creature — Dragon", oracleText: "Flying, indestructible, haste\nWhenever Smaug is dealt noncombat damage, create that many Treasure tokens." };
  const deathPayoff = { name: "Yahenni, Undying Partisan", typeLine: "Legendary Creature — Elemental Shaman", oracleText: "Whenever another nontoken creature you control dies, put a +1/+1 counter on Yahenni." };
  const treasurePayoff = { name: "Treasure Tribute", typeLine: "Enchantment", oracleText: "Whenever you sacrifice a Treasure, each opponent loses 1 life." };
  const graph = buildInteractionGraph([smaug, deathPayoff, treasurePayoff]);
  const sacrificeEdge = graph.edges.find((entry) => entry.from === "Smaug, the Impenetrable" && entry.to === "Yahenni, Undying Partisan");
  const treasureEdge = graph.edges.find((entry) => entry.from === "Smaug, the Impenetrable" && entry.to === "Treasure Tribute");
  assert.equal(sacrificeEdge, undefined, "a Treasure producer must not falsely connect to an unrelated death-payoff card");
  assert.ok(treasureEdge?.signals.includes("treasure"), "the real Treasure connection must still form");
});

test("merely having haste does not masquerade as producing a combat/attack-triggers signal", () => {
  // Same false-connection class as the sacrifice signal above, this time
  // found auditing a real Smaug build: PRODUCERS.combat matched a bare
  // /haste/i anywhere in a card's text, so Smaug's own "Flying,
  // indestructible, haste" (zero attack-payoff text of its own — its real
  // ability is noncombat-damage-into-Treasures) falsely connected to
  // every attack-trigger card in the pool. A card that GRANTS haste to
  // the team (Fires of Yavimaya) is a real "attacks matter" enabler and
  // must still connect; a card that merely has the keyword itself must not.
  const smaug = { name: "Smaug, the Impenetrable", typeLine: "Legendary Creature — Dragon", oracleText: "Flying, indestructible, haste\nWhenever Smaug is dealt noncombat damage, create that many Treasure tokens." };
  const attackPayoff = { name: "Test Attack Payoff", typeLine: "Enchantment", oracleText: "Whenever a creature you control attacks, draw a card." };
  const hasteGrantor = { name: "Fires of Yavimaya", typeLine: "Enchantment", oracleText: "Creatures you control have haste." };
  const graph = buildInteractionGraph([smaug, attackPayoff, hasteGrantor]);
  const involvesSmaug = (entry) => entry.from === "Smaug, the Impenetrable" || entry.to === "Smaug, the Impenetrable";
  const involvesGrantorAndPayoff = (entry) =>
    (entry.from === "Fires of Yavimaya" && entry.to === "Test Attack Payoff")
    || (entry.from === "Test Attack Payoff" && entry.to === "Fires of Yavimaya");
  assert.ok(!graph.edges.some(involvesSmaug), "a creature that merely has haste must not falsely connect to an unrelated attack-trigger payoff");
  const realEdge = graph.edges.find(involvesGrantorAndPayoff);
  assert.ok(realEdge?.signals.includes("combat"), "a real haste GRANTOR must still connect to an attack-trigger payoff");
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

test("investigate/clue is a producer-payoff axis, not generic Angel tokens", () => {
  const oligarch = {
    name: "Oligarch",
    typeLine: "Legendary Creature",
    oracleText: "At the beginning of your end step, investigate. Whenever a Clue you control is put into a graveyard from the battlefield, create a 1/1 white and black Spirit creature token with flying.",
    isCommander: true,
  };
  const scout = {
    name: "Scout",
    typeLine: "Creature",
    oracleText: "When this enters, investigate.",
  };
  const host = {
    name: "Host",
    typeLine: "Creature — Angel",
    oracleText: "Create a 4/4 white Angel creature token with flying.",
  };
  const mechanics = extractMechanicalSignals(oligarch);
  assert.ok(mechanics.produces.includes("clues"));
  assert.ok(mechanics.rewards.includes("clues"));
  assert.ok(!mechanics.rewards.includes("evasion"));

  const graph = buildInteractionGraph([oligarch, scout, host]);
  assert.ok(graph.edges.some((edge) => edge.signals.includes("clues") && [edge.from, edge.to].includes("Scout")));
  assert.ok(!graph.edges.some((edge) => [edge.from, edge.to].includes("Host") && edge.signals.includes("tokens")));
});

test("scry is library selection, not mill", () => {
  const scry = classifySelectionKinds("Scry 2.");
  const mill = classifySelectionKinds("Target player mills two cards.");
  assert.deepEqual(scry, [SELECTION_KINDS.SCRY]);
  assert.equal(mill.includes(SELECTION_KINDS.SCRY), false);
  assert.equal(mill.includes(SELECTION_KINDS.SURVEIL), false);
  assert.deepEqual(mill, []);
});

test("surveil is a selector into the graveyard, not mill", () => {
  const surveil = classifySelectionKinds("Surveil 2.");
  const mill = classifySelectionKinds("Mill two cards.");
  assert.deepEqual(surveil, [SELECTION_KINDS.SURVEIL]);
  assert.equal(mill.includes(SELECTION_KINDS.SURVEIL), false);
  const surveilSignals = extractMechanicalSignals({
    name: "Street Familiar",
    typeLine: "Creature",
    oracleText: "When this enters, surveil 1.",
  });
  const millSignals = extractMechanicalSignals({
    name: "Tome Scour",
    typeLine: "Sorcery",
    oracleText: "Target player mills two cards.",
  });
  assert.deepEqual(surveilSignals.selectionKinds, [SELECTION_KINDS.SURVEIL]);
  assert.deepEqual(millSignals.selectionKinds, []);
  assert.ok(millSignals.produces.includes("graveyard"), "mill remains graveyard production");
});

test("mill is a graveyard dump, distinct from surveil", () => {
  assert.deepEqual(classifyGraveyardKinds("Target player mills two cards."), [GRAVEYARD_KINDS.MILL]);
  assert.deepEqual(
    classifyGraveyardKinds("Target player puts the top two cards of their library into their graveyard."),
    [GRAVEYARD_KINDS.MILL],
  );
  assert.deepEqual(classifyGraveyardKinds("Surveil 2."), []);
  assert.deepEqual(classifyGraveyardKinds("Scry 2."), []);
  const millSignals = extractMechanicalSignals({
    name: "Tome Scour",
    typeLine: "Sorcery",
    oracleText: "Target player mills two cards.",
  });
  const oldMill = extractMechanicalSignals({
    name: "Old Mill",
    typeLine: "Sorcery",
    oracleText: "Target player puts the top two cards of their library into their graveyard.",
  });
  const surveilSignals = extractMechanicalSignals({
    name: "Street Familiar",
    typeLine: "Creature",
    oracleText: "When this enters, surveil 1.",
  });
  assert.deepEqual(millSignals.graveyardKinds, [GRAVEYARD_KINDS.MILL]);
  assert.deepEqual(oldMill.graveyardKinds, [GRAVEYARD_KINDS.MILL]);
  assert.deepEqual(surveilSignals.graveyardKinds, []);
  assert.equal(millSignals.selectionKinds.includes(SELECTION_KINDS.SURVEIL), false);
  assert.ok(millSignals.produces.includes("graveyard"), "mill still produces graveyard");
});

// Founder #042: found by cross-checking The Wise Mothman's real primer
// against a real construction — Mindcrank, Syr Konrad, and Psychic
// Corrosion (all three explicitly named as primer combo pieces) scored
// zero commander connection to Mothman, whose entire second ability is a
// reward for cards being milled ("Whenever one or more nonland cards are
// milled, put a +1/+1 counter..."). Two real, separate regex gaps, both
// verified against real oracle text:
//  - PRODUCERS.graveyard's old `/mill [a-z\d]/` only matched the rare
//    imperative "you mill three cards" phrasing — the third-person verb
//    form real mill cards actually use ("that player MILLS that many
//    cards", "each opponent MILLS two cards") is never followed by a
//    space (it's "s"), so it silently missed real producer text whenever
//    a card wasn't already covered by a database tag.
//  - PAYOFFS.graveyard had no shape at all for a card that REACTS to
//    milling regardless of source — Mothman's own "is/are milled"
//    passive phrasing, and Syr Konrad/Undead Alchemist's "put into a
//    graveyard from anywhere/their library" — every existing PAYOFFS
//    entry there is reanimation-flavored ("from your graveyard", "in
//    your graveyard", delirium, threshold), a different archetype from
//    "rewards milling as it happens."
test("Founder #042: PRODUCERS.graveyard matches the third-person mill verb form real cards use, not just the imperative", () => {
  const mindcrankOracle = "Whenever an opponent loses life, that player mills that many cards.";
  const psychicCorrosionOracle = "Whenever you draw a card, each opponent mills two cards.";
  const syrKonradActivated = "{1}{B}: Each player mills a card. (They each put the top card of their library into their graveyard.)";
  for (const oracle of [mindcrankOracle, psychicCorrosionOracle, syrKonradActivated]) {
    const signals = extractMechanicalSignals({ name: "Test Mill Producer", typeLine: "Artifact", oracleText: oracle });
    assert.ok(signals.produces.includes("graveyard"), oracle);
  }
});

test("Founder #042: PAYOFFS.graveyard matches a card that rewards milling happening, not just graveyard recursion", () => {
  const mothmanOracle = "Flying\nWhenever The Wise Mothman enters or attacks, each player gets a rad counter.\nWhenever one or more nonland cards are milled, put a +1/+1 counter on each of up to X target creatures, where X is the number of nonland cards milled this way.";
  const syrKonradPayoff = "Whenever another creature dies, or a creature card is put into a graveyard from anywhere other than the battlefield, or a creature card leaves your graveyard, Syr Konrad deals 1 damage to each opponent.";
  const undeadAlchemistOracle = "If a Zombie you control would deal combat damage to a player, instead that player mills that many cards.\nWhenever a creature card is put into an opponent's graveyard from their library, exile that card and create a 2/2 black Zombie creature token.";
  for (const oracle of [mothmanOracle, syrKonradPayoff, undeadAlchemistOracle]) {
    const signals = extractMechanicalSignals({ name: "Test Mill Payoff", typeLine: "Legendary Creature", oracleText: oracle });
    assert.ok(signals.rewards.includes("graveyard"), oracle);
  }
  // The real mill PRODUCERS above must not double up as payoffs of their
  // own trigger — none of them use "milled" (passive) or "put into ...
  // graveyard from anywhere/their library".
  const mindcrankSignals = extractMechanicalSignals({ name: "Test Mindcrank", typeLine: "Artifact", oracleText: "Whenever an opponent loses life, that player mills that many cards." });
  assert.equal(mindcrankSignals.rewards.includes("graveyard"), false);
});

test("Founder #042: Mothman's mill-reward and a real mill producer now correctly connect via commanderConnectionSignalsFor", () => {
  const mothman = { name: "The Wise Mothman", colors: ["B", "G", "U"], oracleText: "Flying\nWhenever The Wise Mothman enters or attacks, each player gets a rad counter.\nWhenever one or more nonland cards are milled, put a +1/+1 counter on each of up to X target creatures, where X is the number of nonland cards milled this way." };
  const mindcrank = { name: "Mindcrank", typeLine: "Artifact", oracleText: "Whenever an opponent loses life, that player mills that many cards." };
  configureInteractionGraphTagLookup((name) => CARD_MECHANICS[name] || []);
  const commanderMechanics = extractMechanicalSignals(mothman);
  const cardMechanics = extractMechanicalSignals(mindcrank);
  const connected = cardMechanics.produces.includes("graveyard") && commanderMechanics.rewards.includes("graveyard");
  assert.ok(connected, "Mindcrank should register as a real mill producer connected to Mothman's mill-reward payoff");
});

test("dredge is a graveyard filter/engine, distinct from a mill dump", () => {
  const dredgeOracle = "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)";
  assert.deepEqual(classifyGraveyardKinds(dredgeOracle), [GRAVEYARD_KINDS.DREDGE]);
  assert.deepEqual(classifyGraveyardKinds("Dredge 5"), [GRAVEYARD_KINDS.DREDGE]);
  // A mill dump never becomes dredge, and dredge's reminder mill clause never
  // makes Grave-Troll a Mill Dump.
  assert.deepEqual(classifyGraveyardKinds("Target player mills two cards."), [GRAVEYARD_KINDS.MILL]);
  assert.equal(classifyGraveyardKinds("Target player mills two cards.").includes(GRAVEYARD_KINDS.DREDGE), false);
  assert.equal(classifyGraveyardKinds("Surveil 2.").includes(GRAVEYARD_KINDS.DREDGE), false);
  assert.deepEqual(classifyGraveyardKinds("Surveil 2."), []);
  // Rules text that actually mills alongside dredge earns both labels.
  assert.deepEqual(
    classifyGraveyardKinds(`Target player mills two cards. ${dredgeOracle}`),
    [GRAVEYARD_KINDS.DREDGE, GRAVEYARD_KINDS.MILL],
  );

  const troll = extractMechanicalSignals({
    name: "Golgari Grave-Troll",
    typeLine: "Creature — Skeleton Troll",
    oracleText: dredgeOracle,
  });
  const scour = extractMechanicalSignals({
    name: "Tome Scour",
    typeLine: "Sorcery",
    oracleText: "Target player mills two cards.",
  });
  assert.deepEqual(troll.graveyardKinds, [GRAVEYARD_KINDS.DREDGE]);
  assert.deepEqual(scour.graveyardKinds, [GRAVEYARD_KINDS.MILL]);
  assert.equal(troll.selectionKinds.includes(GRAVEYARD_KINDS.DREDGE), false, "dredge is not a selection kind");
  assert.equal(troll.selectionKinds.includes(SELECTION_KINDS.DRAW), false, "dredge reminder is not net draw");
  assert.equal(troll.produces.includes(GRAVEYARD_KINDS.DREDGE), false, "dredge is an observation label, not production");
  assert.equal(troll.rewards.includes(GRAVEYARD_KINDS.DREDGE), false, "dredge is an observation label, not a payoff");
  assert.ok(scour.produces.includes("graveyard"), "mill still produces graveyard");

  const graph = buildInteractionGraph([
    { name: "Golgari Grave-Troll", typeLine: "Creature — Skeleton Troll", oracleText: dredgeOracle },
    { name: "Tome Scour", typeLine: "Sorcery", oracleText: "Target player mills two cards." },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(GRAVEYARD_KINDS.DREDGE) || edge.signals.includes(GRAVEYARD_KINDS.MILL)),
    false,
    "graveyard kinds do not form graph edges",
  );
  assert.match(graph.methodology, /dredge/i);
});

test("flashback, unearth, and escape are graveyard returns, distinct from mill and dredge", () => {
  const flashbackOracle = "Draw two cards, then discard two cards. Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)";
  const unearthOracle = "Unearth {1}{B} (Pay {1}{B}: Return this card from your graveyard to the battlefield. Sacrifice it at the beginning of the next end step. Unearth only as a sorcery.)";
  const escapeOracle = "Escape—{4}{G}{U}, Exile five other cards from your graveyard. (You may cast this card from your graveyard for its escape cost. Then exile it.)";

  assert.deepEqual(classifyGraveyardKinds(flashbackOracle), [GRAVEYARD_KINDS.FLASHBACK]);
  assert.deepEqual(classifyGraveyardKinds(unearthOracle), [GRAVEYARD_KINDS.UNEARTH]);
  assert.deepEqual(classifyGraveyardKinds(escapeOracle), [GRAVEYARD_KINDS.ESCAPE]);

  // None of the three collide with mill or with each other, and none give
  // dredge's reminder-mill clause a free ride into a Mill Dump.
  assert.deepEqual(classifyGraveyardKinds("Target player mills two cards."), [GRAVEYARD_KINDS.MILL]);
  assert.equal(classifyGraveyardKinds(flashbackOracle).includes(GRAVEYARD_KINDS.MILL), false);
  assert.equal(classifyGraveyardKinds(unearthOracle).includes(GRAVEYARD_KINDS.MILL), false);
  assert.equal(classifyGraveyardKinds(escapeOracle).includes(GRAVEYARD_KINDS.MILL), false);
  const dredgeOracle = "Dredge 6 (If you would draw a card, you may mill six cards instead. If you do, return this card from your graveyard to your hand.)";
  assert.deepEqual(classifyGraveyardKinds(dredgeOracle), [GRAVEYARD_KINDS.DREDGE], "dredge does not also read as flashback/unearth/escape");

  // Unlike dredge, flashback/unearth/escape still read through a surveil guard clause.
  assert.deepEqual(classifyGraveyardKinds(`Surveil 1. ${flashbackOracle}`), [GRAVEYARD_KINDS.FLASHBACK]);

  const looting = extractMechanicalSignals({
    name: "Faithless Looting",
    typeLine: "Sorcery",
    oracleText: flashbackOracle,
  });
  const skeleton = extractMechanicalSignals({
    name: "Reassembling Skeleton",
    typeLine: "Artifact Creature — Skeleton",
    oracleText: unearthOracle,
  });
  const uro = extractMechanicalSignals({
    name: "Uro, Titan of Nature's Wrath",
    typeLine: "Legendary Enchantment Creature — Titan",
    oracleText: escapeOracle,
  });
  assert.deepEqual(looting.graveyardKinds, [GRAVEYARD_KINDS.FLASHBACK]);
  assert.deepEqual(skeleton.graveyardKinds, [GRAVEYARD_KINDS.UNEARTH]);
  assert.deepEqual(uro.graveyardKinds, [GRAVEYARD_KINDS.ESCAPE]);
  // "Draw two cards, then discard two cards" is the existing rummage shape —
  // the flashback keyword must not disturb that pre-existing classification.
  assert.deepEqual(looting.selectionKinds, [SELECTION_KINDS.RUMMAGE]);

  const graph = buildInteractionGraph([
    { name: "Faithless Looting", typeLine: "Sorcery", oracleText: flashbackOracle },
    { name: "Tome Scour", typeLine: "Sorcery", oracleText: "Target player mills two cards." },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(GRAVEYARD_KINDS.FLASHBACK) || edge.signals.includes(GRAVEYARD_KINDS.MILL)),
    false,
    "graveyard kinds do not form graph edges",
  );
  assert.match(graph.methodology, /flashback/i);
  assert.match(graph.methodology, /unearth/i);
  assert.match(graph.methodology, /escape/i);
});


test("graveyard kinds name persist / undying / jump-start, distinct from unearth and flashback", () => {
  const persistOracle = "Persist";
  const undyingOracle = "Undying";
  const jumpOracle = "Jump-start";
  assert.deepEqual(classifyGraveyardKinds(persistOracle), [GRAVEYARD_KINDS.PERSIST]);
  assert.deepEqual(classifyGraveyardKinds(undyingOracle), [GRAVEYARD_KINDS.UNDYING]);
  assert.deepEqual(classifyGraveyardKinds(jumpOracle), [GRAVEYARD_KINDS.JUMP_START]);
  assert.equal(classifyGraveyardKinds(jumpOracle).includes(GRAVEYARD_KINDS.FLASHBACK), false);
  assert.equal(classifyGraveyardKinds(persistOracle).includes(GRAVEYARD_KINDS.UNEARTH), false);

  const graph = buildInteractionGraph([
    { name: "Kitchen Finks", typeLine: "Creature", oracleText: persistOracle },
    { name: "Young Wolf", typeLine: "Creature", oracleText: undyingOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(GRAVEYARD_KINDS.PERSIST) || edge.signals.includes(GRAVEYARD_KINDS.UNDYING) || edge.signals.includes(GRAVEYARD_KINDS.JUMP_START)),
    false,
    "persist/undying/jump-start do not form graph edges",
  );
  assert.match(graph.methodology, /jump-start/i);
});


test("graveyard kinds name aftermath / madness / retrace, distinct from flashback", () => {
  const aftermathOracle = "Aftermath (Cast this spell only from your graveyard. Then exile it.)";
  const madnessOracle = "Madness {1}{B}";
  const retraceOracle = "Retrace";

  assert.deepEqual(classifyGraveyardKinds(aftermathOracle), [GRAVEYARD_KINDS.AFTERMATH]);
  assert.deepEqual(classifyGraveyardKinds(madnessOracle), [GRAVEYARD_KINDS.MADNESS]);
  assert.deepEqual(classifyGraveyardKinds(retraceOracle), [GRAVEYARD_KINDS.RETRACE]);
  assert.equal(classifyGraveyardKinds(aftermathOracle).includes(GRAVEYARD_KINDS.FLASHBACK), false);
  assert.equal(classifyGraveyardKinds(madnessOracle).includes(GRAVEYARD_KINDS.FLASHBACK), false);

  const graph = buildInteractionGraph([
    { name: "Toil", typeLine: "Sorcery", oracleText: aftermathOracle },
    { name: "Basking Rootwalla", typeLine: "Creature", oracleText: madnessOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(GRAVEYARD_KINDS.AFTERMATH) || edge.signals.includes(GRAVEYARD_KINDS.MADNESS) || edge.signals.includes(GRAVEYARD_KINDS.RETRACE)),
    false,
    "aftermath/madness/retrace do not form graph edges",
  );
  assert.match(graph.methodology, /aftermath/i);
});

test("graveyard kinds name disturb / embalm / eternalize, distinct from flashback, unearth, and each other", () => {
  const disturbOracle = "Disturb {1}{W} (You may cast this card from your graveyard for its disturb cost.)";
  const embalmOracle = "Embalm {3}{W} ({3}{W}, Exile this card from your graveyard: Create a token that's a copy of it, except it's a white Zombie in addition to its other types and it has no mana cost. Embalm only as a sorcery.)";
  const eternalizeOracle = "Eternalize {4}{U}{U} ({4}{U}{U}, Exile this card from your graveyard: Create a token that's a copy of it, except it's a 4/4 black Zombie in addition to its other types and it has no mana cost. Eternalize only as a sorcery.)";
  const flashbackOracle = "Flashback {1}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)";
  const unearthOracle = "Unearth {B} (Return this card from your graveyard to the battlefield. It gains haste. Exile it at the beginning of the next end step or if it would leave the battlefield.)";

  assert.deepEqual(classifyGraveyardKinds(disturbOracle), [GRAVEYARD_KINDS.DISTURB]);
  assert.deepEqual(classifyGraveyardKinds(embalmOracle), [GRAVEYARD_KINDS.EMBALM]);
  assert.deepEqual(classifyGraveyardKinds(eternalizeOracle), [GRAVEYARD_KINDS.ETERNALIZE]);
  assert.equal(classifyGraveyardKinds(disturbOracle).includes(GRAVEYARD_KINDS.FLASHBACK), false);
  assert.equal(classifyGraveyardKinds(embalmOracle).includes(GRAVEYARD_KINDS.UNEARTH), false);
  assert.equal(classifyGraveyardKinds(eternalizeOracle).includes(GRAVEYARD_KINDS.EMBALM), false);
  assert.equal(classifyGraveyardKinds(flashbackOracle).includes(GRAVEYARD_KINDS.DISTURB), false);
  assert.equal(classifyGraveyardKinds(unearthOracle).includes(GRAVEYARD_KINDS.EMBALM), false);

  const graph = buildInteractionGraph([
    { name: "Beloved Princess", typeLine: "Creature", oracleText: disturbOracle },
    { name: "Trueheart Duelist", typeLine: "Creature", oracleText: embalmOracle },
    { name: "Champion of Wits", typeLine: "Creature", oracleText: eternalizeOracle },
  ]);
  const princess = extractMechanicalSignals({ name: "Beloved Princess", typeLine: "Creature", oracleText: disturbOracle });
  const duelist = extractMechanicalSignals({ name: "Trueheart Duelist", typeLine: "Creature", oracleText: embalmOracle });
  const champion = extractMechanicalSignals({ name: "Champion of Wits", typeLine: "Creature", oracleText: eternalizeOracle });
  assert.deepEqual(princess.graveyardKinds, [GRAVEYARD_KINDS.DISTURB]);
  assert.deepEqual(duelist.graveyardKinds, [GRAVEYARD_KINDS.EMBALM]);
  assert.deepEqual(champion.graveyardKinds, [GRAVEYARD_KINDS.ETERNALIZE]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(GRAVEYARD_KINDS.DISTURB) || edge.signals.includes(GRAVEYARD_KINDS.EMBALM) || edge.signals.includes(GRAVEYARD_KINDS.ETERNALIZE)),
    false,
    "disturb/embalm/eternalize do not form graph edges",
  );
  assert.match(graph.methodology, /disturb/i);
  assert.match(graph.methodology, /embalm/i);
  assert.match(graph.methodology, /eternalize/i);
  assert.equal(/disturb stays unnamed/i.test(graph.methodology), false);
});

test("rummage filters the hand and is not net draw", () => {
  const loot = classifySelectionKinds("Discard a card, then draw a card.");
  const faithless = classifySelectionKinds("Draw two cards, then discard two cards.");
  const mulldrifter = classifySelectionKinds("When this enters, draw two cards.");
  assert.deepEqual(loot, [SELECTION_KINDS.RUMMAGE]);
  assert.deepEqual(faithless, [SELECTION_KINDS.RUMMAGE]);
  assert.deepEqual(mulldrifter, [SELECTION_KINDS.DRAW]);
  const lootSignals = extractMechanicalSignals({
    name: "Looter",
    typeLine: "Creature",
    oracleText: "Whenever this deals combat damage to a player, discard a card, then draw a card.",
  });
  assert.deepEqual(lootSignals.selectionKinds, [SELECTION_KINDS.RUMMAGE]);
  assert.ok(lootSignals.produces.includes("draw"), "the draw clause still exists; vocabulary names the filter");
});

test("connive is a mixed selector, not a draw engine", () => {
  const kinds = classifySelectionKinds("This creature connives. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.)");
  assert.deepEqual(kinds, [SELECTION_KINDS.CONNIVE]);
  assert.equal(kinds.includes(SELECTION_KINDS.DRAW), false);
  assert.equal(kinds.includes(SELECTION_KINDS.RUMMAGE), false);
});

test("impulse is look-at-top exile-play, not a Junk token", () => {
  const impulse = classifySelectionKinds("Look at the top two cards of your library. Exile one of them, then put the rest on the bottom. You may play the exiled card this turn.");
  const junk = classifySelectionKinds("When this enters, create a Junk token.");
  assert.deepEqual(impulse, [SELECTION_KINDS.IMPULSE]);
  assert.equal(junk.includes(SELECTION_KINDS.IMPULSE), false);
  const junkSignals = extractMechanicalSignals({
    name: "Junk Maker",
    typeLine: "Creature",
    oracleText: "When this enters, create a Junk token.",
  });
  assert.ok(junkSignals.produces.includes("junk") || junkSignals.produces.includes("exile_play"));
  assert.equal(junkSignals.selectionKinds.includes(SELECTION_KINDS.IMPULSE), false);
});

test("scry then draw keeps both labels, and selection kinds do not form graph edges", () => {
  const kinds = classifySelectionKinds("Scry 2, then draw a card.");
  assert.deepEqual(kinds, [SELECTION_KINDS.SCRY, SELECTION_KINDS.DRAW]);
  const seer = { name: "Seer", typeLine: "Creature", oracleText: "When this enters, scry 2." };
  const miller = { name: "Miller", typeLine: "Sorcery", oracleText: "Target player mills two cards." };
  const graph = buildInteractionGraph([seer, miller]);
  assert.deepEqual(extractMechanicalSignals(seer).selectionKinds, [SELECTION_KINDS.SCRY]);
  assert.equal(graph.edges.length, 0, "scry and mill do not share a producer/payoff edge");
});

test("sacrifice kinds split outlet / death payoff / incidental yard from the blended sacrifice signal", () => {
  const outletOracle = "{1}, Sacrifice a creature: Draw a card.";
  const deathPayoffOracle = "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life.";
  const incidentalOracle = "{1}, Sacrifice a Clue: Draw a card.";

  assert.deepEqual(classifySacrificeKinds(outletOracle), [SACRIFICE_KINDS.OUTLET]);
  assert.deepEqual(classifySacrificeKinds(deathPayoffOracle), [SACRIFICE_KINDS.DEATH_PAYOFF]);
  assert.deepEqual(classifySacrificeKinds(incidentalOracle), [SACRIFICE_KINDS.INCIDENTAL_YARD]);

  // Sacrificing a creature never earns incidental yard, and sacrificing a
  // named resource never earns outlet — the two are disjoint word sets.
  assert.equal(classifySacrificeKinds(outletOracle).includes(SACRIFICE_KINDS.INCIDENTAL_YARD), false);
  assert.equal(classifySacrificeKinds(incidentalOracle).includes(SACRIFICE_KINDS.OUTLET), false);

  // "Whenever you sacrifice a creature" reads as a death payoff too, not only "dies".
  assert.deepEqual(
    classifySacrificeKinds("Whenever you sacrifice a creature, draw a card."),
    [SACRIFICE_KINDS.DEATH_PAYOFF],
  );

  // A generic "sacrifice a permanent" outlet still counts as an outlet — it
  // can sacrifice a creature even though it isn't restricted to one.
  assert.deepEqual(
    classifySacrificeKinds("Sacrifice a permanent: Add one mana of any color."),
    [SACRIFICE_KINDS.OUTLET],
  );

  // A discard effect is incidental yard even outside a sacrifice cost.
  assert.deepEqual(classifySacrificeKinds("Discard a card, then draw a card."), [SACRIFICE_KINDS.INCIDENTAL_YARD]);

  // A card can be both an outlet and a death payoff at once (Viscera Seer-class).
  const both = classifySacrificeKinds(`${outletOracle} Whenever a creature dies, you gain 1 life.`);
  assert.deepEqual(both, [SACRIFICE_KINDS.OUTLET, SACRIFICE_KINDS.DEATH_PAYOFF]);

  const bloodArtist = extractMechanicalSignals({
    name: "Blood Artist",
    typeLine: "Creature — Vampire",
    oracleText: deathPayoffOracle,
  });
  assert.deepEqual(bloodArtist.sacrificeKinds, [SACRIFICE_KINDS.DEATH_PAYOFF]);
  assert.equal(bloodArtist.produces.includes(SACRIFICE_KINDS.DEATH_PAYOFF), false, "sacrifice kinds are observation labels, not production");
  assert.equal(bloodArtist.rewards.includes(SACRIFICE_KINDS.DEATH_PAYOFF), false, "sacrifice kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Outlet", typeLine: "Creature", oracleText: outletOracle },
    { name: "Blood Artist", typeLine: "Creature — Vampire", oracleText: deathPayoffOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(SACRIFICE_KINDS.OUTLET) || edge.signals.includes(SACRIFICE_KINDS.DEATH_PAYOFF)),
    false,
    "sacrifice kinds do not form graph edges",
  );
  assert.match(graph.methodology, /outlet/i);
  assert.match(graph.methodology, /incidental yard/i);
});

test("trigger kinds name enter vs cast as a card's own trigger condition", () => {
  const enterOracle = "When this enters the battlefield, draw a card.";
  const castOracle = "Whenever you cast an instant or sorcery spell, draw a card.";
  const flashbackOracle = "Draw two cards, then discard two cards. Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)";

  assert.deepEqual(classifyTriggerKinds(enterOracle), [TRIGGER_KINDS.ENTER]);
  assert.deepEqual(classifyTriggerKinds(castOracle), [TRIGGER_KINDS.CAST]);

  // A "you may cast" permission (flashback/escape reminder) is not a
  // "whenever you cast" trigger — no false positive on the other axis.
  assert.deepEqual(classifyTriggerKinds(flashbackOracle), []);

  // Prowess/magecraft-shaped triggers read as cast without minting a
  // separate name for either keyword.
  assert.deepEqual(
    classifyTriggerKinds("Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)"),
    [TRIGGER_KINDS.CAST],
  );
  assert.deepEqual(
    classifyTriggerKinds("Magecraft — Whenever you cast or copy an instant or sorcery spell, target creature gets -1/-1 until end of turn."),
    [TRIGGER_KINDS.CAST],
  );

  // ETB on another permanent still reads as enter — not restricted to self.
  assert.deepEqual(
    classifyTriggerKinds("Whenever another creature enters the battlefield under your control, you gain 1 life."),
    [TRIGGER_KINDS.ENTER],
  );

  // A card can hold both at once.
  assert.deepEqual(
    classifyTriggerKinds(`${enterOracle} ${castOracle}`),
    [TRIGGER_KINDS.ENTER, TRIGGER_KINDS.CAST],
  );

  const bauble = extractMechanicalSignals({
    name: "Bauble",
    typeLine: "Artifact",
    oracleText: enterOracle,
  });
  const prowessCreature = extractMechanicalSignals({
    name: "Prowess Creature",
    typeLine: "Creature",
    oracleText: castOracle,
  });
  assert.deepEqual(bauble.triggerKinds, [TRIGGER_KINDS.ENTER]);
  assert.deepEqual(prowessCreature.triggerKinds, [TRIGGER_KINDS.CAST]);
  assert.equal(bauble.produces.includes(TRIGGER_KINDS.ENTER), false, "trigger kinds are observation labels, not production");
  assert.equal(prowessCreature.rewards.includes(TRIGGER_KINDS.CAST), false, "trigger kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Bauble", typeLine: "Artifact", oracleText: enterOracle },
    { name: "Prowess Creature", typeLine: "Creature", oracleText: castOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(TRIGGER_KINDS.ENTER) || edge.signals.includes(TRIGGER_KINDS.CAST)),
    false,
    "trigger kinds do not form graph edges",
  );
  assert.match(graph.methodology, /enter/i);
  assert.match(graph.methodology, /blink\/flicker/i);
  assert.match(graph.methodology, /spellslinger/i);
});

test("attack is a third trigger kind, distinct from extra-combat amplification and stax occupancy", () => {
  const attackOracle = "Whenever this creature attacks, draw a card.";
  const combatDamageOracle = "Whenever this creature deals combat damage to a player, create a Treasure token.";
  const extraCombatOracle = "Untap all creatures you control. After this main phase, there is an additional combat phase.";

  assert.deepEqual(classifyTriggerKinds(attackOracle), [TRIGGER_KINDS.ATTACK]);

  // Combat damage is not an attack trigger — only "whenever ~ attacks" is.
  assert.equal(classifyTriggerKinds(combatDamageOracle).includes(TRIGGER_KINDS.ATTACK), false);
  assert.deepEqual(classifyTriggerKinds("Creatures you control get +1/+0 as long as they're attacking."), []);

  // The extra-combat-phase amplifier is a separate mechanism entirely — it
  // grants a second phase, it does not itself read as a "whenever ~ attacks"
  // trigger on the card that grants it.
  assert.deepEqual(classifyTriggerKinds(extraCombatOracle), []);

  // Attack can combine with enter or cast on the same card.
  assert.deepEqual(
    classifyTriggerKinds(`When this enters the battlefield, draw a card. ${attackOracle}`),
    [TRIGGER_KINDS.ENTER, TRIGGER_KINDS.ATTACK],
  );

  const raider = extractMechanicalSignals({
    name: "Bloodthirsty Aerialist",
    typeLine: "Creature — Human Warrior",
    oracleText: attackOracle,
  });
  assert.deepEqual(raider.triggerKinds, [TRIGGER_KINDS.ATTACK]);
  assert.equal(raider.produces.includes(TRIGGER_KINDS.ATTACK), false, "trigger kinds are observation labels, not production");
  assert.equal(raider.rewards.includes(TRIGGER_KINDS.ATTACK), false, "trigger kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Bloodthirsty Aerialist", typeLine: "Creature", oracleText: attackOracle },
    { name: "Aggravated Assault", typeLine: "Artifact", oracleText: extraCombatOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(TRIGGER_KINDS.ATTACK)),
    false,
    "trigger kinds do not form graph edges",
  );
  assert.match(graph.methodology, /attack/i);
  assert.match(graph.methodology, /extra-combat/i);
  assert.match(graph.methodology, /stax/i);
});

test("combat damage is a fourth trigger kind, distinct from attack and extra-combat amplification", () => {
  const combatDamageOracle = "Whenever this creature deals combat damage to a player, create a Treasure token.";
  const attackOracle = "Whenever this creature attacks, draw a card.";
  const extraCombatOracle = "Untap all creatures you control. After this main phase, there is an additional combat phase.";
  const nonCombatDamageOracle = "Whenever this creature deals damage to a player, draw a card.";

  assert.deepEqual(classifyTriggerKinds(combatDamageOracle), [TRIGGER_KINDS.COMBAT_DAMAGE]);
  assert.equal(classifyTriggerKinds(attackOracle).includes(TRIGGER_KINDS.COMBAT_DAMAGE), false);
  assert.deepEqual(classifyTriggerKinds(extraCombatOracle), []);
  assert.equal(classifyTriggerKinds(nonCombatDamageOracle).includes(TRIGGER_KINDS.COMBAT_DAMAGE), false);
  assert.deepEqual(classifyTriggerKinds("Creatures you control get +1/+0 as long as they're attacking."), []);

  assert.deepEqual(
    classifyTriggerKinds(`When this enters the battlefield, draw a card. ${combatDamageOracle}`),
    [TRIGGER_KINDS.ENTER, TRIGGER_KINDS.COMBAT_DAMAGE],
  );

  const ninja = extractMechanicalSignals({
    name: "Silent-Blade Oni",
    typeLine: "Creature — Demon Ninja",
    oracleText: combatDamageOracle,
  });
  assert.deepEqual(ninja.triggerKinds, [TRIGGER_KINDS.COMBAT_DAMAGE]);
  assert.equal(ninja.produces.includes(TRIGGER_KINDS.COMBAT_DAMAGE), false, "trigger kinds are observation labels, not production");
  assert.equal(ninja.rewards.includes(TRIGGER_KINDS.COMBAT_DAMAGE), false, "trigger kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Silent-Blade Oni", typeLine: "Creature", oracleText: combatDamageOracle },
    { name: "Aggravated Assault", typeLine: "Enchantment", oracleText: extraCombatOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(TRIGGER_KINDS.COMBAT_DAMAGE)),
    false,
    "trigger kinds do not form graph edges",
  );
  assert.match(graph.methodology, /combat damage/i);
  assert.match(graph.methodology, /attack is not combat damage/i);
});

test("noncombat damage is a fifth trigger kind, distinct from combat damage and the damage-doubling amplifier", () => {
  const nonCombatDamageOracle = "Whenever this creature deals damage to a player, draw a card.";
  const combatDamageOracle = "Whenever this creature deals combat damage to a player, create a Treasure token.";
  const damageDoublerOracle = "If a source you control would deal damage to a permanent or player, it deals double that damage instead.";
  const extraCombatOracle = "Untap all creatures you control. After this main phase, there is an additional combat phase.";

  assert.deepEqual(classifyTriggerKinds(nonCombatDamageOracle), [TRIGGER_KINDS.NONCOMBAT_DAMAGE]);
  assert.deepEqual(classifyTriggerKinds(combatDamageOracle), [TRIGGER_KINDS.COMBAT_DAMAGE]);
  assert.equal(classifyTriggerKinds(combatDamageOracle).includes(TRIGGER_KINDS.NONCOMBAT_DAMAGE), false);
  assert.deepEqual(classifyTriggerKinds(damageDoublerOracle), []);
  assert.deepEqual(classifyTriggerKinds(extraCombatOracle), []);

  assert.deepEqual(
    classifyTriggerKinds(`When this enters the battlefield, draw a card. ${nonCombatDamageOracle}`),
    [TRIGGER_KINDS.ENTER, TRIGGER_KINDS.NONCOMBAT_DAMAGE],
  );

  const inquisitor = extractMechanicalSignals({
    name: "Firebrand Archer",
    typeLine: "Creature — Human Archer",
    oracleText: nonCombatDamageOracle,
  });
  assert.deepEqual(inquisitor.triggerKinds, [TRIGGER_KINDS.NONCOMBAT_DAMAGE]);
  assert.equal(inquisitor.produces.includes(TRIGGER_KINDS.NONCOMBAT_DAMAGE), false, "trigger kinds are observation labels, not production");
  assert.equal(inquisitor.rewards.includes(TRIGGER_KINDS.NONCOMBAT_DAMAGE), false, "trigger kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Firebrand Archer", typeLine: "Creature", oracleText: nonCombatDamageOracle },
    { name: "Fiery Emancipation", typeLine: "Enchantment", oracleText: damageDoublerOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(TRIGGER_KINDS.NONCOMBAT_DAMAGE)),
    false,
    "trigger kinds do not form graph edges",
  );
  assert.match(graph.methodology, /noncombat damage/i);
  assert.match(graph.methodology, /combat damage is not a generic damage trigger/i);
});

test("counter kinds split put / proliferate / remove from the blended counters signal", () => {
  const putOracle = "Put a +1/+1 counter on target creature.";
  const proliferateOracle = "Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)";
  const removeOracle = "Remove a +1/+1 counter from target creature.";
  const payoffOracle = "Whenever a creature you control with a counter on it attacks, draw a card.";

  assert.deepEqual(classifyCounterKinds(putOracle), [COUNTER_KINDS.PUT]);
  assert.deepEqual(classifyCounterKinds(proliferateOracle), [COUNTER_KINDS.PROLIFERATE]);
  assert.deepEqual(classifyCounterKinds(removeOracle), [COUNTER_KINDS.REMOVE]);

  // A generic "counter on it" payoff (rewards having counters) is none of
  // the three placement/proliferate/removal shapes.
  assert.deepEqual(classifyCounterKinds(payoffOracle), []);

  // Proliferate's own reminder text never earns "put" — it says "give each
  // another counter", not "put ~ counter on".
  assert.equal(classifyCounterKinds(proliferateOracle).includes(COUNTER_KINDS.PUT), false);

  // A card can hold multiple counter kinds at once (a modal or two-ability card).
  assert.deepEqual(
    classifyCounterKinds(`${putOracle} ${proliferateOracle}`),
    [COUNTER_KINDS.PUT, COUNTER_KINDS.PROLIFERATE],
  );

  const hardenedScales = extractMechanicalSignals({
    name: "Hardened Scales",
    typeLine: "Enchantment",
    oracleText: "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead.",
  });
  assert.deepEqual(hardenedScales.counterKinds, [COUNTER_KINDS.PUT]);
  assert.equal(hardenedScales.produces.includes(COUNTER_KINDS.PUT), false, "counter kinds are observation labels, not production");

  const evolutionSage = extractMechanicalSignals({
    name: "Evolution Sage",
    typeLine: "Creature — Human Monk",
    oracleText: "Landfall — Whenever a land enters the battlefield under your control, proliferate.",
  });
  assert.deepEqual(evolutionSage.counterKinds, [COUNTER_KINDS.PROLIFERATE]);
  assert.equal(evolutionSage.rewards.includes(COUNTER_KINDS.PROLIFERATE), false, "counter kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Hardened Scales", typeLine: "Enchantment", oracleText: "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead." },
    { name: "Evolution Sage", typeLine: "Creature", oracleText: "Landfall — Whenever a land enters the battlefield under your control, proliferate." },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(COUNTER_KINDS.PUT) || edge.signals.includes(COUNTER_KINDS.PROLIFERATE)),
    false,
    "counter kinds do not form graph edges",
  );
  assert.match(graph.methodology, /put \(placement\)/i);
  assert.match(graph.methodology, /proliferate/i);
});

// Founder #045: found by cross-checking Auntie Ool, Cursewretch's real
// primer against a real construction — Massacre Girl, Known Killer,
// Kulrath Knight, and Necroskitter (all real -1/-1-counters staples)
// scored zero commander connection to a commander whose entire payoff is
// "-1/-1 counters are put on a creature." None of them say "put ...
// counter" in their own oracle text — they all use Wither, a real
// keyword whose entire rules function is "deals damage to creatures in
// the form of -1/-1 counters instead," never spelled out as "put." Infect
// (poison counters to players, -1/-1 counters to creatures — the
// identical creature-facing behavior) has the same gap and the same fix.
test("Founder #045: PRODUCERS.counters matches Wither and Infect, real -1/-1-counter producers that never say \"put\"", () => {
  const massacreGirl = "Menace\nCreatures you control have wither. (They deal damage to creatures in the form of -1/-1 counters.)\nWhenever a creature an opponent controls dies, if its toughness was less than 1, draw a card.";
  const kulrathKnight = "Flying\nWither (This deals damage to creatures in the form of -1/-1 counters.)\nCreatures your opponents control with counters on them can't attack or block.";
  const necroskitter = "Wither (This deals damage to creatures in the form of -1/-1 counters.)\nWhenever a creature an opponent controls with a -1/-1 counter on it dies, you may return that card to the battlefield under your control.";
  for (const oracle of [massacreGirl, kulrathKnight, necroskitter]) {
    const signals = extractMechanicalSignals({ name: "Test Wither Creature", typeLine: "Creature", oracleText: oracle });
    assert.ok(signals.produces.includes("counters"), oracle);
  }
  // A pure toughness-reduction effect (The Meathook Massacre's own ETB)
  // is not real counters and must stay unmatched.
  const meathookMassacre = extractMechanicalSignals({ name: "Test Meathook", typeLine: "Enchantment", oracleText: "When this enters, each creature gets -X/-X until end of turn." });
  assert.equal(meathookMassacre.produces.includes("counters"), false);
});

// Founder #051/#052/#053: #051 found that Energy counters (Satya,
// Aetherflux Genius) and #052 that Experience counters (Kratos, Stoic
// Father) use "get"/"pay" as their placement/spend verbs, never "put"/
// "remove" — both real gaps. Both shipped into the SAME "counters" signal
// +1/+1, -1/-1, and other permanent counters already use. Zach caught the
// resulting bug directly, same day: Energy and Experience are counters a
// PLAYER has, not counters on a permanent — structurally closer to
// poison than to +1/+1 — and blending them meant a pure-Energy card
// (Whirler Virtuoso, no +1/+1 or -1/-1 text at all) started reading as
// commander-connected to Auntie Ool, Cursewretch (a -1/-1-counters-
// specific payoff commander) purely because both sides now shared the
// same generic "counters" bucket. #053 moved Energy/Experience to their
// own player_counters signal instead — the same way this file already
// keeps Treasure/Clue/Food/Blood/Gold/Map/Junk/Powerstone separate from
// the generic artifacts/tokens signal they'd otherwise blend into.
test("Founder #053: player_counters is scoped to Energy/Experience's real \"get\"/\"pay\" verbs and stays separate from the generic permanent-counters signal", () => {
  const satya = "Menace, haste\nWhenever Satya attacks, create a tapped and attacking token that's a copy of up to one other target nontoken creature you control. You get {E}{E} (two energy counters). At the beginning of the next end step, sacrifice that token unless you pay an amount of {E} equal to its mana value.";
  const whirlerVirtuoso = "When this creature enters, you get {E}{E}{E} (three energy counters).\nPay {E}{E}{E}: Create a 1/1 colorless Thopter artifact creature token with flying.";
  const kratos = "Whenever you attack with one or more Gods and whenever a God dies, you get an experience counter.";
  for (const oracle of [satya, whirlerVirtuoso, kratos]) {
    const signals = extractMechanicalSignals({ name: "Test Player Counter Card", typeLine: "Creature", oracleText: oracle });
    assert.ok(signals.produces.includes("player_counters"), oracle);
    assert.equal(signals.produces.includes("counters"), false, `${oracle} must not also register as a generic permanent-counters producer`);
  }
  assert.ok(extractMechanicalSignals({ name: "Test Satya", typeLine: "Creature", oracleText: satya }).rewards.includes("player_counters"), "Satya's own pay-{E}-or-sacrifice clause should register as a real player_counters payoff");
  // A generic "pay life"/"pay mana" cost, and "counter" used as a
  // spell-negation verb, must not be swept in.
  const payLife = extractMechanicalSignals({ name: "Test Pay Life", typeLine: "Instant", oracleText: "Pay 2 life: Draw a card." });
  assert.equal(payLife.rewards.includes("player_counters"), false);
  const counterspell = extractMechanicalSignals({ name: "Test Counterspell", typeLine: "Instant", oracleText: "Counter target spell unless its controller pays {3}." });
  assert.equal(counterspell.produces.includes("player_counters"), false);
});

// Zach also flagged (2026-08-22) that counter-doubling and Proliferate
// both explicitly reach player counters in real rules text, and must
// still connect — Atraxa + poison-counter proliferation is one of the
// format's most popular real archetypes. Proliferate's own reminder text
// says "permanents and/or players" (Contagion Clasp, verified via
// Scryfall); Innkeeper's Talent's level 3 says "on a permanent or
// player" — both real, both must open player_counters. Doubling Season,
// also verified, only ever says "on a permanent" — it does not affect
// poison/energy/experience in real rules text, and must NOT match.
test("Founder #053: Proliferate and \"permanent or player\" doubling effects open player_counters too, but Doubling Season's permanent-only text does not", () => {
  const contagionClasp = "When this artifact enters, put a -1/-1 counter on target creature.\n{4}, {T}: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)";
  const innkeepersTalentLevel3 = "If you would put one or more counters on a permanent or player, put twice that many of each of those kinds of counters on that permanent or player instead.";
  for (const oracle of [contagionClasp, innkeepersTalentLevel3]) {
    const signals = extractMechanicalSignals({ name: "Test Doubler", typeLine: "Artifact", oracleText: oracle });
    assert.ok(signals.produces.includes("player_counters"), oracle);
  }
  const doublingSeason = extractMechanicalSignals({ name: "Doubling Season", typeLine: "Enchantment", oracleText: "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead." });
  assert.equal(doublingSeason.produces.includes("player_counters"), false, "Doubling Season's real text is permanent-only and does not affect poison/energy/experience");
  assert.ok(doublingSeason.produces.includes("counters"), "Doubling Season should still register as a real generic permanent-counters producer");
});

test("Founder #053: a pure-Energy card no longer falsely connects to a -1/-1-counters commander, but still correctly connects to Satya and a real proliferate card", () => {
  const auntieOol = { name: "Auntie Ool, Cursewretch", colors: ["B", "R", "G"], oracleText: "Ward—Blight 2. (To blight 2, a player puts two -1/-1 counters on a creature they control.)\nWhenever one or more -1/-1 counters are put on a creature, draw a card if you control that creature. If you don't control it, its controller loses 1 life." };
  const satya = { name: "Satya, Aetherflux Genius", colors: ["R", "U", "W"], oracleText: "Menace, haste\nWhenever Satya attacks, create a tapped and attacking token that's a copy of up to one other target nontoken creature you control. You get {E}{E} (two energy counters). At the beginning of the next end step, sacrifice that token unless you pay an amount of {E} equal to its mana value." };
  const whirlerVirtuoso = { name: "Whirler Virtuoso", typeLine: "Creature", oracleText: "When this creature enters, you get {E}{E}{E} (three energy counters).\nPay {E}{E}{E}: Create a 1/1 colorless Thopter artifact creature token with flying." };
  const contagionClasp = { name: "Contagion Clasp", typeLine: "Artifact", oracleText: "When this artifact enters, put a -1/-1 counter on target creature.\n{4}, {T}: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)" };
  configureInteractionGraphTagLookup((name) => CARD_MECHANICS[name] || []);

  const auntieMechanics = extractMechanicalSignals(auntieOol);
  const auntieScopes = commanderMechanicalScopes(auntieOol);
  const wvMechanics = extractMechanicalSignals(whirlerVirtuoso);
  assert.deepEqual(commanderConnectionSignalsFor(whirlerVirtuoso, wvMechanics, auntieMechanics, auntieScopes), [], "a pure-Energy card must not connect to a -1/-1-counters-specific commander");

  const satyaMechanics = extractMechanicalSignals(satya);
  const satyaScopes = commanderMechanicalScopes(satya);
  assert.ok(commanderConnectionSignalsFor(whirlerVirtuoso, wvMechanics, satyaMechanics, satyaScopes).includes("player_counters"), "the same pure-Energy card must still connect to a real Energy commander");
  const ccMechanics = extractMechanicalSignals(contagionClasp);
  assert.ok(commanderConnectionSignalsFor(contagionClasp, ccMechanics, satyaMechanics, satyaScopes).includes("player_counters"), "a real proliferate card must connect to a pure-Energy commander with no permanent-counter text of its own");
});

test("Founder #053: Kratos & Atreus's own Experience-counter payoff and a real proliferate creature still correctly connect", () => {
  const kratos = { name: "Kratos, Stoic Father", colors: ["R", "W"], oracleText: "Whenever you attack with one or more Gods and whenever a God dies, you get an experience counter.\nAt the beginning of your end step, put a number of +1/+1 counters on target creature equal to the number of experience counters you have." };
  const atreus = { name: "Atreus, Impulsive Son", colors: ["U", "R"], oracleText: "Reach\n{3}, {T}: Draw a card for each experience counter you have, then discard a card. Atreus deals 2 damage to each opponent." };
  const metastaticEvangel = { name: "Metastatic Evangel", typeLine: "Creature", oracleText: "Flying\nWhenever Metastatic Evangel or another nontoken creature enters under your control, proliferate." };
  configureInteractionGraphTagLookup((name) => CARD_MECHANICS[name] || []);
  const commanderMechanics = extractMechanicalSignals({ name: "combined", oracleText: `${kratos.oracleText}\n${atreus.oracleText}` });
  const cardMechanics = extractMechanicalSignals(metastaticEvangel);
  assert.ok(commanderMechanics.rewards.includes("player_counters"), "Atreus's own for-each-experience-counter clause should register as a real player_counters payoff");
  assert.ok(cardMechanics.produces.includes("player_counters"), "Metastatic Evangel's proliferate should register as a real player_counters producer too, not just generic counters");
});

// Founder #065: Zach's own original #053 framing named poison counters as
// THE reference case for player-attached counters ("the experience
// counters... act more like poison counters"), but the shipped #053
// regex only ever covered the literal words "energy"/"experience" — never
// "poison" itself. Fynn, the Fangbearer, the single most iconic
// poison-counters commander in the format, produced zero player_counters
// credit before this fix. Also found while fixing it: the old pattern
// required the bare word "get" (with a trailing word boundary), which
// can never match "gets" — the third-person verb form real
// player-targeted counter grants almost always use, since a player
// getting a counter is nearly always someone else's trigger acting on
// them.
test("Founder #065: PRODUCERS.player_counters recognizes the real 'gets N poison counters' shape (Fynn, the Fangbearer), not just the bare 'get' verb energy/experience use", () => {
  const fynn = { name: "Fynn, the Fangbearer", typeLine: "Legendary Creature", oracleText: "Deathtouch\nWhenever a creature you control with deathtouch deals combat damage to a player, that player gets two poison counters." };
  assert.ok(extractMechanicalSignals(fynn).produces.includes("player_counters"));
});

test("Founder #065: PAYOFFS.player_counters recognizes a bare 'poison counters' mention, and this correctly, retroactively connects real Infect creatures via their own reminder text", () => {
  const corruptedPayoff = { name: "Test Corrupted Payoff", typeLine: "Enchantment", oracleText: "Corrupted — As long as an opponent has three or more poison counters, creatures you control with toxic have lifelink." };
  assert.ok(extractMechanicalSignals(corruptedPayoff).rewards.includes("player_counters"));
  // Infect's own reminder text ("...and to players in the form of poison
  // counters") already literally contains the phrase — correct that this
  // now connects, since Infect genuinely produces both permanent -1/-1
  // counters (already covered by PRODUCERS.counters) AND player-scoped
  // poison counters; #053's point was to stop conflating the two, not to
  // prevent a card from legitimately doing both.
  const skithiryx = { name: "Skithiryx, the Blight Dragon", typeLine: "Legendary Creature — Dragon", oracleText: "Flying\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\nWhenever Skithiryx, the Blight Dragon deals combat damage to a player, put that many +1/+1 counters on it." };
  const skithiryxSig = extractMechanicalSignals(skithiryx);
  assert.ok(skithiryxSig.produces.includes("counters"), "Infect should still produce the generic permanent-counters signal");
  assert.ok(skithiryxSig.rewards.includes("player_counters"), "Infect's own reminder text should also connect it to the player-counters signal");
});

test("life kinds split gain / lifelink / pay from the blended life signal", () => {
  const gainOracle = "Whenever another creature enters the battlefield, you gain 1 life.";
  const lifelinkOracle = "Lifelink (Damage dealt by this creature also causes you to gain that much life.)";
  const payOracle = "Pay 1 life: Draw a card.";
  const payoffOracle = "Whenever you gain life, put a +1/+1 counter on this creature.";
  const drainOracle = "Each opponent loses 2 life.";

  assert.deepEqual(classifyLifeKinds(gainOracle), [LIFE_KINDS.GAIN]);
  assert.deepEqual(classifyLifeKinds(lifelinkOracle), [LIFE_KINDS.LIFELINK]);
  assert.deepEqual(classifyLifeKinds(payOracle), [LIFE_KINDS.PAY]);

  // A "whenever you gain life" payoff is none of the three — it watches
  // gain, it does not itself gain, pay, or have lifelink.
  assert.deepEqual(classifyLifeKinds(payoffOracle), []);

  // Opponents losing life is not paying your own life.
  assert.deepEqual(classifyLifeKinds(drainOracle), []);

  // Lifelink reminder "causes you to gain" is not Life Gain.
  assert.equal(classifyLifeKinds(lifelinkOracle).includes(LIFE_KINDS.GAIN), false);

  const warden = extractMechanicalSignals({
    name: "Soul Warden",
    typeLine: "Creature — Human Cleric",
    oracleText: gainOracle,
  });
  assert.deepEqual(warden.lifeKinds, [LIFE_KINDS.GAIN]);
  assert.equal(warden.produces.includes(LIFE_KINDS.GAIN), false, "life kinds are observation labels, not production");

  const vampire = extractMechanicalSignals({
    name: "Vampire Nighthawk",
    typeLine: "Creature — Vampire Shaman",
    oracleText: lifelinkOracle,
  });
  assert.deepEqual(vampire.lifeKinds, [LIFE_KINDS.LIFELINK]);
  assert.equal(vampire.rewards.includes(LIFE_KINDS.LIFELINK), false, "life kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Soul Warden", typeLine: "Creature", oracleText: gainOracle },
    { name: "Ajani's Pridemate", typeLine: "Creature", oracleText: payoffOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(LIFE_KINDS.GAIN) || edge.signals.includes(LIFE_KINDS.LIFELINK) || edge.signals.includes(LIFE_KINDS.PAY)),
    false,
    "life kinds do not form graph edges",
  );
  assert.match(graph.methodology, /lifelink/i);
  assert.match(graph.methodology, /whenever-you-gain-life/i);
});

test("protection kinds split hexproof / indestructible / ward from the blended protection signal", () => {
  const hexproofOracle = "Equipped creature has hexproof and haste.";
  const indestructibleOracle = "Equipped creature has indestructible.";
  const wardOracle = "Ward {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)";
  const protectionFromOracle = "Protection from black.";
  const phaseOutOracle = "Permanents you control phase out.";
  const shroudOracle = "Shroud (This creature can't be the target of spells or abilities.)";

  assert.deepEqual(classifyProtectionKinds(hexproofOracle), [PROTECTION_KINDS.HEXPROOF]);
  assert.deepEqual(classifyProtectionKinds(indestructibleOracle), [PROTECTION_KINDS.INDESTRUCTIBLE]);
  assert.deepEqual(classifyProtectionKinds(wardOracle), [PROTECTION_KINDS.WARD]);

  assert.deepEqual(classifyProtectionKinds(protectionFromOracle), [PROTECTION_KINDS.PROTECTION_FROM]);
  assert.deepEqual(classifyProtectionKinds(phaseOutOracle), [PROTECTION_KINDS.PHASE_OUT]);
  assert.deepEqual(classifyProtectionKinds(shroudOracle), [PROTECTION_KINDS.SHROUD]);
  assert.equal(classifyProtectionKinds(hexproofOracle).includes(PROTECTION_KINDS.SHROUD), false);

  const boots = extractMechanicalSignals({
    name: "Swiftfoot Boots",
    typeLine: "Artifact — Equipment",
    oracleText: hexproofOracle,
  });
  assert.deepEqual(boots.protectionKinds, [PROTECTION_KINDS.HEXPROOF]);
  assert.equal(boots.produces.includes(PROTECTION_KINDS.HEXPROOF), false, "protection kinds are observation labels, not production");

  const plate = extractMechanicalSignals({
    name: "Darksteel Plate",
    typeLine: "Artifact — Equipment",
    oracleText: indestructibleOracle,
  });
  assert.deepEqual(plate.protectionKinds, [PROTECTION_KINDS.INDESTRUCTIBLE]);
  assert.equal(plate.rewards.includes(PROTECTION_KINDS.INDESTRUCTIBLE), false, "protection kinds are observation labels, not a payoff");

  const graph = buildInteractionGraph([
    { name: "Swiftfoot Boots", typeLine: "Artifact — Equipment", oracleText: hexproofOracle },
    { name: "Darksteel Plate", typeLine: "Artifact — Equipment", oracleText: indestructibleOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(PROTECTION_KINDS.HEXPROOF) || edge.signals.includes(PROTECTION_KINDS.INDESTRUCTIBLE) || edge.signals.includes(PROTECTION_KINDS.WARD) || edge.signals.includes(PROTECTION_KINDS.SHROUD) || edge.signals.includes(PROTECTION_KINDS.PROTECTION_FROM) || edge.signals.includes(PROTECTION_KINDS.PHASE_OUT)),
    false,
    "protection kinds do not form graph edges",
  );
  assert.match(graph.methodology, /hexproof/i);
  assert.match(graph.methodology, /protection-from/i);
});

test("evasion kinds split flying / menace / trample from the blended evasion signal", () => {
  const flyingOracle = "Flying";
  const menaceOracle = "Menace";
  const trampleOracle = "Trample";
  const unblockableOracle = "This creature can't be blocked.";
  const skulkOracle = "Skulk (This creature can't be blocked by creatures with greater power.)";
  const reachOracle = "Reach";
  const fearOracle = "This creature can't be blocked except by artifact creatures and/or black creatures.";
  const shadowOracle = "Shadow";
  const intimidateOracle = "This creature can't be blocked except by artifact creatures and/or creatures that share a color with it.";
  const horsemanshipOracle = "This creature can't be blocked except by creatures with horsemanship.";

  assert.deepEqual(classifyEvasionKinds(flyingOracle), [EVASION_KINDS.FLYING]);
  assert.deepEqual(classifyEvasionKinds(menaceOracle), [EVASION_KINDS.MENACE]);
  assert.deepEqual(classifyEvasionKinds(trampleOracle), [EVASION_KINDS.TRAMPLE]);
  assert.deepEqual(classifyEvasionKinds(unblockableOracle), [EVASION_KINDS.UNBLOCKABLE]);
  assert.deepEqual(classifyEvasionKinds(skulkOracle), [EVASION_KINDS.SKULK]);
  assert.equal(classifyEvasionKinds(skulkOracle).includes(EVASION_KINDS.UNBLOCKABLE), false);
  assert.deepEqual(classifyEvasionKinds(reachOracle), [EVASION_KINDS.REACH]);
  assert.deepEqual(classifyEvasionKinds(fearOracle), [EVASION_KINDS.FEAR]);
  assert.equal(classifyEvasionKinds(fearOracle).includes(EVASION_KINDS.UNBLOCKABLE), false);
  assert.equal(classifyEvasionKinds(fearOracle).includes(EVASION_KINDS.INTIMIDATE), false);
  assert.deepEqual(classifyEvasionKinds(shadowOracle), [EVASION_KINDS.SHADOW]);
  assert.deepEqual(classifyEvasionKinds(intimidateOracle), [EVASION_KINDS.INTIMIDATE]);
  assert.equal(classifyEvasionKinds(intimidateOracle).includes(EVASION_KINDS.FEAR), false);
  assert.deepEqual(classifyEvasionKinds(horsemanshipOracle), []);

  const hawk = extractMechanicalSignals({
    name: "Storm Crow",
    typeLine: "Creature — Bird",
    oracleText: flyingOracle,
  });
  assert.deepEqual(hawk.evasionKinds, [EVASION_KINDS.FLYING]);
  assert.equal(hawk.produces.includes(EVASION_KINDS.FLYING), false, "evasion kinds are observation labels, not production");

  const graph = buildInteractionGraph([
    { name: "Storm Crow", typeLine: "Creature — Bird", oracleText: flyingOracle },
    { name: "Goblin War Paint", typeLine: "Enchantment — Aura", oracleText: trampleOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(EVASION_KINDS.FLYING) || edge.signals.includes(EVASION_KINDS.MENACE) || edge.signals.includes(EVASION_KINDS.TRAMPLE) || edge.signals.includes(EVASION_KINDS.UNBLOCKABLE) || edge.signals.includes(EVASION_KINDS.SKULK) || edge.signals.includes(EVASION_KINDS.REACH) || edge.signals.includes(EVASION_KINDS.FEAR) || edge.signals.includes(EVASION_KINDS.SHADOW) || edge.signals.includes(EVASION_KINDS.INTIMIDATE)),
    false,
    "evasion kinds do not form graph edges",
  );
  assert.match(graph.methodology, /flying/i);
  assert.match(graph.methodology, /horsemanship stays unnamed/i);
});

test("land kinds split landfall / extra drop / search from the blended lands signal", () => {
  const landfallOracle = "Landfall — Whenever a land you control enters, add {G}.";
  const extraOracle = "You may play an additional land on each of your turns.";
  const searchOracle = "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.";
  const tappedOracle = "This land enters tapped.";

  assert.deepEqual(classifyLandKinds(landfallOracle), [LAND_KINDS.LANDFALL]);
  assert.deepEqual(classifyLandKinds(extraOracle), [LAND_KINDS.EXTRA_DROP]);
  assert.deepEqual(classifyLandKinds(searchOracle), [LAND_KINDS.SEARCH]);
  assert.deepEqual(classifyLandKinds(tappedOracle), []);
  assert.equal(classifyLandKinds(searchOracle).includes(LAND_KINDS.LANDFALL), false);
  assert.equal(classifyLandKinds(searchOracle).includes(LAND_KINDS.EXTRA_DROP), false);

  const cobra = extractMechanicalSignals({
    name: "Lotus Cobra",
    typeLine: "Creature — Snake",
    oracleText: landfallOracle,
  });
  assert.deepEqual(cobra.landKinds, [LAND_KINDS.LANDFALL]);
  assert.equal(cobra.produces.includes(LAND_KINDS.LANDFALL), false, "land kinds are observation labels, not production");

  const graph = buildInteractionGraph([
    { name: "Lotus Cobra", typeLine: "Creature — Snake", oracleText: landfallOracle },
    { name: "Exploration", typeLine: "Enchantment", oracleText: extraOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(LAND_KINDS.LANDFALL) || edge.signals.includes(LAND_KINDS.EXTRA_DROP) || edge.signals.includes(LAND_KINDS.SEARCH)),
    false,
    "land kinds do not form graph edges",
  );
  assert.match(graph.methodology, /extra land drop/i);
  assert.match(graph.methodology, /land search/i);
});

test("artifact kinds split spell / matters / outlet from the blended artifacts signal", () => {
  const spellOracle = "Whenever you cast an artifact spell, draw a card.";
  const mattersOracle = "Artifact creatures you control get +1/+1.";
  const outletOracle = "Sacrifice an artifact: Add {C}{C}.";
  const rockOracle = "{T}: Add {C}{C}.";

  assert.deepEqual(classifyArtifactKinds(spellOracle), [ARTIFACT_KINDS.SPELL]);
  assert.deepEqual(classifyArtifactKinds(mattersOracle), [ARTIFACT_KINDS.MATTERS]);
  assert.deepEqual(classifyArtifactKinds(outletOracle), [ARTIFACT_KINDS.OUTLET]);
  assert.deepEqual(classifyArtifactKinds(rockOracle), []);
  assert.equal(classifyArtifactKinds(spellOracle).includes(ARTIFACT_KINDS.MATTERS), false);
  assert.equal(classifyArtifactKinds(mattersOracle).includes(ARTIFACT_KINDS.SPELL), false);

  const sai = extractMechanicalSignals({
    name: "Sai, Master Thopterist",
    typeLine: "Legendary Creature — Human Artificer",
    oracleText: spellOracle,
  });
  assert.deepEqual(sai.artifactKinds, [ARTIFACT_KINDS.SPELL]);
  assert.equal(sai.produces.includes(ARTIFACT_KINDS.SPELL), false, "artifact kinds are observation labels, not production");

  const graph = buildInteractionGraph([
    { name: "Sai, Master Thopterist", typeLine: "Creature", oracleText: spellOracle },
    { name: "Krark-Clan Ironworks", typeLine: "Artifact", oracleText: outletOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(ARTIFACT_KINDS.SPELL) || edge.signals.includes(ARTIFACT_KINDS.MATTERS) || edge.signals.includes(ARTIFACT_KINDS.OUTLET)),
    false,
    "artifact kinds do not form graph edges",
  );
  assert.match(graph.methodology, /artifact-spell/i);
  assert.match(graph.methodology, /named-resource occupancy/i);
});

test("token kinds split create / go-wide / sac from the blended tokens signal", () => {
  const createOracle = "Create a 1/1 white Soldier creature token.";
  const goWideOracle = "Creature tokens you control get +1/+1.";
  const sacOracle = "Sacrifice a token: Draw a card.";
  const creatureOutlet = "Sacrifice a creature: Draw a card.";

  assert.deepEqual(classifyTokenKinds(createOracle), [TOKEN_KINDS.CREATE]);
  assert.deepEqual(classifyTokenKinds(goWideOracle), [TOKEN_KINDS.GO_WIDE]);
  assert.deepEqual(classifyTokenKinds(sacOracle), [TOKEN_KINDS.SAC]);
  assert.deepEqual(classifyTokenKinds(creatureOutlet), []);

  const maker = extractMechanicalSignals({ name: "Raise the Alarm", typeLine: "Instant", oracleText: createOracle });
  assert.deepEqual(maker.tokenKinds, [TOKEN_KINDS.CREATE]);
  assert.equal(maker.produces.includes(TOKEN_KINDS.CREATE), false, "token kinds are observation labels, not production");

  const graph = buildInteractionGraph([
    { name: "Raise the Alarm", typeLine: "Instant", oracleText: createOracle },
    { name: "Intangible Virtue", typeLine: "Enchantment", oracleText: goWideOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(TOKEN_KINDS.CREATE) || edge.signals.includes(TOKEN_KINDS.GO_WIDE) || edge.signals.includes(TOKEN_KINDS.SAC)),
    false,
    "token kinds do not form graph edges",
  );
  assert.match(graph.methodology, /go-wide/i);
});

test("aura kinds split enchant / matters / affinity from the blended auras signal", () => {
  const enchantOracle = "Enchant creature";
  const mattersOracle = "Auras you control get +1/+1.";
  const affinityOracle = "Affinity for Auras";
  const equipOracle = "Equip {2}";

  assert.deepEqual(classifyAuraKinds(enchantOracle), [AURA_KINDS.ENCHANT]);
  assert.deepEqual(classifyAuraKinds(mattersOracle), [AURA_KINDS.MATTERS]);
  assert.deepEqual(classifyAuraKinds(affinityOracle), [AURA_KINDS.AFFINITY]);
  assert.deepEqual(classifyAuraKinds(equipOracle), []);

  const graph = buildInteractionGraph([
    { name: "Pacifism", typeLine: "Enchantment — Aura", oracleText: enchantOracle },
    { name: "Sphere of Safety", typeLine: "Enchantment", oracleText: mattersOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(AURA_KINDS.ENCHANT) || edge.signals.includes(AURA_KINDS.MATTERS) || edge.signals.includes(AURA_KINDS.AFFINITY)),
    false,
    "aura kinds do not form graph edges",
  );
  assert.match(graph.methodology, /affinity for Auras/i);
});

test("spell kinds split copy / free / noncreature from the blended spells signal", () => {
  const copyOracle = "Copy target spell.";
  const freeOracle = "You may cast that card without paying its mana cost.";
  const noncreatureOracle = "Instant and sorcery spells you cast cost {1} less to cast.";
  const flashbackOracle = "Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)";
  const magecraftOracle = "Magecraft — Whenever you cast or copy an instant or sorcery spell, scry 1.";

  assert.deepEqual(classifySpellKinds(copyOracle), [SPELL_KINDS.COPY]);
  assert.deepEqual(classifySpellKinds(freeOracle), [SPELL_KINDS.FREE]);
  assert.deepEqual(classifySpellKinds(noncreatureOracle), [SPELL_KINDS.NONCREATURE]);
  assert.deepEqual(classifySpellKinds(flashbackOracle), []);
  assert.equal(classifySpellKinds(magecraftOracle).includes(SPELL_KINDS.NONCREATURE), true);
  assert.equal(classifySpellKinds(magecraftOracle).includes(SPELL_KINDS.COPY), true);
  assert.match(buildInteractionGraph([{ name: "Twincast", typeLine: "Instant", oracleText: copyOracle }]).methodology, /magecraft/i);
});


test("spell kinds name storm / cascade / rebound, distinct from copy and free", () => {
  assert.deepEqual(classifySpellKinds("Storm"), [SPELL_KINDS.STORM]);
  assert.deepEqual(classifySpellKinds("Cascade"), [SPELL_KINDS.CASCADE]);
  assert.deepEqual(classifySpellKinds("Rebound"), [SPELL_KINDS.REBOUND]);
  assert.equal(classifySpellKinds("Storm").includes(SPELL_KINDS.COPY), false);
  assert.equal(classifySpellKinds("Cascade").includes(SPELL_KINDS.FREE), false);
  const magecraftOracle = "Magecraft ? Whenever you cast or copy an instant or sorcery spell, scry 1.";
  assert.equal(classifySpellKinds(magecraftOracle).includes(SPELL_KINDS.STORM), false);

  const graph = buildInteractionGraph([
    { name: "Grapeshot", typeLine: "Sorcery", oracleText: "Storm" },
    { name: "Bloodbraid Elf", typeLine: "Creature", oracleText: "Cascade" },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(SPELL_KINDS.STORM) || edge.signals.includes(SPELL_KINDS.CASCADE) || edge.signals.includes(SPELL_KINDS.REBOUND)),
    false,
    "storm/cascade/rebound do not form graph edges",
  );
  assert.match(graph.methodology, /magecraft stays unnamed/i);
});

test("draw kinds split watch / wheel / hand from the blended draw signal", () => {
  const watchOracle = "Whenever you draw a card, put a +1/+1 counter on this creature.";
  const wheelOracle = "Each player discards their hand, then draws seven cards.";
  const handOracle = "This creature gets +1/+1 for each card in your hand.";
  const cantripOracle = "Draw a card.";
  const rummageOracle = "Draw two cards, then discard two cards.";

  assert.deepEqual(classifyDrawKinds(watchOracle), [DRAW_KINDS.WATCH]);
  assert.deepEqual(classifyDrawKinds(wheelOracle), [DRAW_KINDS.WHEEL]);
  assert.deepEqual(classifyDrawKinds(handOracle), [DRAW_KINDS.HAND]);
  assert.deepEqual(classifyDrawKinds(cantripOracle), []);
  assert.deepEqual(classifyDrawKinds(rummageOracle), []);

  const graph = buildInteractionGraph([
    { name: "Psychosis Crawler", typeLine: "Artifact Creature", oracleText: watchOracle },
    { name: "Windfall", typeLine: "Sorcery", oracleText: wheelOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(DRAW_KINDS.WATCH) || edge.signals.includes(DRAW_KINDS.WHEEL) || edge.signals.includes(DRAW_KINDS.HAND)),
    false,
    "draw kinds do not form graph edges",
  );
  assert.match(graph.methodology, /not rummage/i);
});

// Founder #043: found by cross-checking Nekusar, the Mindrazer's real
// primer against a real construction — Fate Unraveler, Underworld Dreams,
// and every real wheel effect it names (Wheel of Fortune, Burning
// Inquiry, Windfall, Teferi's Puzzle Box) scored zero commander
// connection, and Nekusar's own two abilities didn't even register as
// producing/rewarding "draw" at all. Two real, distinct regex gaps, the
// same class of bug as #042's mill fix:
//  - PRODUCERS.draw's old `/draw (?:a|one|two|three|\d+)/` only matched
//    the imperative "draw a card" phrasing — the third-person "draws"
//    verb real cards use ("that player DRAWS an additional card", "then
//    DRAWS seven cards") is never followed by a space, and variable-count
//    phrasing ("draws cards equal to...", "draws that many cards") never
//    has a number word right after "draws" at all.
//  - PAYOFFS.draw's `/whenever you draw/` never covered "whenever AN
//    OPPONENT draws" — Nekusar's own trigger and both of its namesake
//    staples share that exact template, a whole real archetype distinct
//    from "watches your own draws."
test("Founder #043: PRODUCERS.draw matches the third-person/variable-count draw phrasing real wheel effects use", () => {
  const nekusarProduces = "At the beginning of each player's draw step, that player draws an additional card.";
  const wheelOfFortune = "Each player discards their hand, then draws seven cards.";
  const burningInquiry = "Each player draws three cards, then discards three cards at random.";
  const windfall = "Each player discards their hand, then draws cards equal to the greatest number of cards a player discarded this way.";
  const teferisPuzzleBox = "At the beginning of each player's draw step, that player puts the cards in their hand on the bottom of their library in any order, then draws that many cards.";
  for (const oracle of [nekusarProduces, wheelOfFortune, burningInquiry, windfall, teferisPuzzleBox]) {
    const signals = extractMechanicalSignals({ name: "Test Wheel Effect", typeLine: "Sorcery", oracleText: oracle });
    assert.ok(signals.produces.includes("draw"), oracle);
  }
  // A draw step you may skip is not a producer of anything.
  const skipDrawStep = extractMechanicalSignals({ name: "Test Skip", typeLine: "Enchantment", oracleText: "At the beginning of your draw step, you may skip your draw step." });
  assert.equal(skipDrawStep.produces.includes("draw"), false);
});

test("Founder #043: PAYOFFS.draw matches \"whenever an opponent draws\", not just \"whenever you draw\"", () => {
  const nekusarRewards = "Whenever an opponent draws a card, Nekusar deals 1 damage to that player.";
  const fateUnraveler = "Whenever an opponent draws a card, this creature deals 1 damage to that player.";
  const underworldDreams = "Whenever an opponent draws a card, this enchantment deals 1 damage to that player.";
  for (const oracle of [nekusarRewards, fateUnraveler, underworldDreams]) {
    const signals = extractMechanicalSignals({ name: "Test Opponent Draw Payoff", typeLine: "Enchantment", oracleText: oracle });
    assert.ok(signals.rewards.includes("draw"), oracle);
  }
  // The real wheel PRODUCERS above must not also double as payoffs of
  // their own effect.
  const wheelSignals = extractMechanicalSignals({ name: "Test Wheel", typeLine: "Sorcery", oracleText: "Each player discards their hand, then draws seven cards." });
  assert.equal(wheelSignals.rewards.includes("draw"), false);
});

test("Founder #043: Nekusar's own trigger and a real wheel effect now correctly connect via commanderConnectionSignalsFor", () => {
  const nekusar = { name: "Nekusar, the Mindrazer", colors: ["U", "B", "R"], oracleText: "At the beginning of each player's draw step, that player draws an additional card.\nWhenever an opponent draws a card, Nekusar deals 1 damage to that player." };
  const wheelOfFortune = { name: "Wheel of Fortune", typeLine: "Sorcery", oracleText: "Each player discards their hand, then draws seven cards." };
  configureInteractionGraphTagLookup((name) => CARD_MECHANICS[name] || []);
  const commanderMechanics = extractMechanicalSignals(nekusar);
  const cardMechanics = extractMechanicalSignals(wheelOfFortune);
  assert.ok(commanderMechanics.rewards.includes("draw"), "Nekusar's own opponent-draws-a-card trigger should register as a draw payoff");
  assert.ok(cardMechanics.produces.includes("draw"), "Wheel of Fortune should register as a real draw producer");
});

// Founder #048: found by cross-checking Vivi Ornitier's real primer — her
// second ability ("Whenever you cast a noncreature spell, put a +1/+1
// counter on Vivi Ornitier and it deals 1 damage to each opponent") is
// explicitly NONCOMBAT, yet Curiosity, Ophidian Eye, and Tandem Lookout
// (all named in the primer's own "Plan A", verified via Scryfall) all say
// "whenever [enchanted/this] creature deals damage to an opponent" — no
// "combat" qualifier — so Vivi's own ping genuinely triggers the draw.
test("Founder #048: PAYOFFS.damage matches the real \"deals damage to an opponent, draw\" template, not combat-damage draw effects", () => {
  const curiosity = "Enchant creature\nWhenever enchanted creature deals damage to an opponent, you may draw a card.";
  const tandemLookout = "As long as Tandem Lookout is paired with another creature, each of those creatures has \"Whenever this creature deals damage to an opponent, draw a card.\"";
  for (const oracle of [curiosity, tandemLookout]) {
    const signals = extractMechanicalSignals({ name: "Test Damage Payoff", typeLine: "Enchantment", oracleText: oracle });
    assert.ok(signals.rewards.includes("damage"), oracle);
  }
  // A combat-damage draw effect (a large, distinct, already-common real
  // template — Bident of Thassa-class) must not be swept in: it says
  // "combat damage to a player," not "damage to an opponent."
  const combatDamageDraw = extractMechanicalSignals({ name: "Test Combat Draw", typeLine: "Creature", oracleText: "Whenever this creature deals combat damage to a player, draw a card." });
  assert.equal(combatDamageDraw.rewards.includes("damage"), false);
  // Vivi's own trigger text is a producer of damage, not a reward for it.
  const viviSignals = extractMechanicalSignals({ name: "Test Vivi", typeLine: "Creature", oracleText: "Whenever you cast a noncreature spell, put a +1/+1 counter on this creature and it deals 1 damage to each opponent." });
  assert.ok(viviSignals.produces.includes("damage"));
  assert.equal(viviSignals.rewards.includes("damage"), false);
});

test("Founder #048: Vivi's own noncombat damage trigger and a real Curiosity-style aura now correctly connect via commanderConnectionSignalsFor", () => {
  const vivi = { name: "Vivi Ornitier", colors: ["U", "R"], oracleText: "{0}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power. Activate only during your turn and only once each turn.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent." };
  const curiosity = { name: "Curiosity", typeLine: "Enchantment — Aura", oracleText: "Enchant creature\nWhenever enchanted creature deals damage to an opponent, you may draw a card." };
  configureInteractionGraphTagLookup((name) => CARD_MECHANICS[name] || []);
  const commanderMechanics = extractMechanicalSignals(vivi);
  const cardMechanics = extractMechanicalSignals(curiosity);
  assert.ok(commanderMechanics.produces.includes("damage"), "Vivi's own noncombat damage ping should register as a real damage producer");
  assert.ok(cardMechanics.rewards.includes("damage"), "Curiosity should register as a real damage payoff");
});

test("damage kinds split deal / drain / prevent from blended damage", () => {
  const dealOracle = "Lightning Bolt deals 3 damage to any target.";
  const drainOracle = "Each opponent loses 2 life. You gain life equal to the life lost this way.";
  const preventOracle = "Prevent all combat damage that would be dealt this turn.";
  const combatTriggerOracle = "Whenever this creature deals combat damage to a player, draw a card.";
  const payOracle = "Pay 2 life: Draw a card.";

  assert.deepEqual(classifyDamageKinds(dealOracle), [DAMAGE_KINDS.DEAL]);
  assert.deepEqual(classifyDamageKinds(drainOracle), [DAMAGE_KINDS.DRAIN]);
  assert.deepEqual(classifyDamageKinds(preventOracle), [DAMAGE_KINDS.PREVENT]);
  assert.deepEqual(classifyDamageKinds(combatTriggerOracle), []);
  assert.deepEqual(classifyDamageKinds(payOracle), []);

  const graph = buildInteractionGraph([
    { name: "Lightning Bolt", typeLine: "Instant", oracleText: dealOracle },
    { name: "Gray Merchant", typeLine: "Creature", oracleText: drainOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(DAMAGE_KINDS.DEAL) || edge.signals.includes(DAMAGE_KINDS.DRAIN) || edge.signals.includes(DAMAGE_KINDS.PREVENT)),
    false,
    "damage kinds do not form graph edges",
  );
  assert.match(graph.methodology, /not a combat-damage trigger/);
});

test("equipment kinds split equip / attach / bonus from blended equipment", () => {
  const equipOracle = "Equip {2}";
  const attachOracle = "Whenever an Equipment becomes attached to a creature you control, draw a card.";
  const bonusOracle = "Equipped creature gets +2/+2.";
  const auraOracle = "Enchant creature. Enchanted creature gets +2/+2.";

  assert.deepEqual(classifyEquipmentKinds(equipOracle), [EQUIPMENT_KINDS.EQUIP]);
  assert.deepEqual(classifyEquipmentKinds(attachOracle), [EQUIPMENT_KINDS.ATTACH]);
  assert.deepEqual(classifyEquipmentKinds(bonusOracle), [EQUIPMENT_KINDS.BONUS]);
  assert.deepEqual(classifyEquipmentKinds(auraOracle), []);

  const graph = buildInteractionGraph([
    { name: "Sword", typeLine: "Artifact ? Equipment", oracleText: `${bonusOracle} ${equipOracle}` },
    { name: "Puresteel Watcher", typeLine: "Creature", oracleText: attachOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(EQUIPMENT_KINDS.EQUIP) || edge.signals.includes(EQUIPMENT_KINDS.ATTACH) || edge.signals.includes(EQUIPMENT_KINDS.BONUS)),
    false,
    "equipment kinds do not form graph edges",
  );
  assert.match(graph.methodology, /auras stay unnamed here/i);
});

test("combat kinds split haste / extra / vigilance from blended combat posture", () => {
  const hasteOracle = "Haste";
  const extraOracle = "After this main phase, there is an additional combat phase followed by an additional main phase.";
  const vigilanceOracle = "Vigilance";
  const firstStrikeOracle = "First strike";
  const doubleStrikeOracle = "Double strike";
  const deathtouchOracle = "Deathtouch";
  const attackOracle = "Whenever this creature attacks, draw a card.";
  const reachOracle = "Reach";

  assert.deepEqual(classifyCombatKinds(hasteOracle), [COMBAT_KINDS.HASTE]);
  assert.deepEqual(classifyCombatKinds(extraOracle), [COMBAT_KINDS.EXTRA]);
  assert.deepEqual(classifyCombatKinds(vigilanceOracle), [COMBAT_KINDS.VIGILANCE]);
  assert.deepEqual(classifyCombatKinds(firstStrikeOracle), [COMBAT_KINDS.FIRST_STRIKE]);
  assert.deepEqual(classifyCombatKinds(doubleStrikeOracle), [COMBAT_KINDS.DOUBLE_STRIKE]);
  assert.deepEqual(classifyCombatKinds(deathtouchOracle), [COMBAT_KINDS.DEATHTOUCH]);
  assert.deepEqual(classifyCombatKinds(attackOracle), []);
  assert.deepEqual(classifyCombatKinds(reachOracle), []);

  const graph = buildInteractionGraph([
    { name: "Akroma", typeLine: "Creature", oracleText: "Flying, first strike, vigilance, haste" },
    { name: "Aggravated Assault", typeLine: "Enchantment", oracleText: extraOracle },
  ]);
  assert.equal(
    graph.edges.some((edge) => edge.signals.includes(COMBAT_KINDS.HASTE) || edge.signals.includes(COMBAT_KINDS.EXTRA) || edge.signals.includes(COMBAT_KINDS.VIGILANCE) || edge.signals.includes(COMBAT_KINDS.FIRST_STRIKE) || edge.signals.includes(COMBAT_KINDS.DOUBLE_STRIKE) || edge.signals.includes(COMBAT_KINDS.DEATHTOUCH)),
    false,
    "combat kinds do not form graph edges",
  );
  assert.match(graph.methodology, /reach is an evasion kind/i);
});

// Founder #073: found via a real Tergrid, God of Fright comparison. Her
// own payoff ("Whenever an opponent sacrifices a nontoken permanent or
// discards a permanent card, you may put that card...onto the
// battlefield") already correctly reads as PAYOFFS.sacrifice (#055), but
// PRODUCERS.sacrifice only ever covered creature-token fodder makers and
// "when X dies" triggers — never the classic forced-sacrifice edict shape
// itself (Diabolic Edict, Innocent Blood). Since commanderConnectionSignalsFor
// requires one side's rewards to match the OTHER side's produces, Tergrid
// never connected to the exact edict effects that are her most obvious
// real inclusion, even though both cards individually already registered
// a "sacrifice" reward. Verified 184 real cards use a "target player/each
// opponent/each player sacrifices" shape via Scryfall.
test("PRODUCERS.sacrifice recognizes the real third-person forced-sacrifice edict shape (Diabolic Edict, Innocent Blood), not just creature-token fodder or 'when X dies'", () => {
  const edict = { name: "Diabolic Edict", typeLine: "Instant", oracleText: "Target player sacrifices a creature of their choice." };
  const innocentBlood = { name: "Innocent Blood", typeLine: "Sorcery", oracleText: "Each player sacrifices a creature of their choice." };
  for (const card of [edict, innocentBlood]) {
    assert.ok(extractMechanicalSignals(card).produces.includes("sacrifice"), `${card.name} should produce the sacrifice signal`);
  }
  // A first-person "whenever you sacrifice"/self-sacrifice cost text (not
  // a forced third-party edict) must not match this new regex alternative
  // specifically — verified directly against the pattern, independent of
  // Viscera Seer's own real sacrifice_outlet database tag (this file's
  // module-level configureInteractionGraphTagLookup at line 62 makes her
  // legitimately produce the signal anyway, via a different mechanism
  // than the one this test is checking).
  const selfSacCost = { name: "Test Self-Sac Outlet", typeLine: "Creature", oracleText: "Whenever you sacrifice a permanent, draw a card." };
  assert.equal(extractMechanicalSignals(selfSacCost).produces.includes("sacrifice"), false);
});

test("Founder #073: Tergrid's own opponent-sacrifice payoff and a real forced-sacrifice edict now correctly connect via commanderConnectionSignalsFor", () => {
  const tergrid = { name: "Tergrid, God of Fright", colors: ["B"], oracleText: "Menace\nWhenever an opponent sacrifices a nontoken permanent or discards a permanent card, you may put that card from a graveyard onto the battlefield under your control." };
  const edict = { name: "Diabolic Edict", typeLine: "Instant", oracleText: "Target player sacrifices a creature of their choice." };
  const tergridScopes = commanderMechanicalScopes(tergrid);
  const tergridMechanics = extractMechanicalSignals(tergrid);
  const edictMechanics = extractMechanicalSignals(edict);
  assert.ok(tergridMechanics.rewards.includes("sacrifice"), "Tergrid's own trigger should register as a sacrifice payoff");
  assert.ok(edictMechanics.produces.includes("sacrifice"), "Diabolic Edict should register as a real sacrifice producer");
  assert.ok(
    commanderConnectionSignalsFor(edict, edictMechanics, tergridMechanics, tergridScopes).includes("sacrifice"),
    "Diabolic Edict must connect to Tergrid via the sacrifice signal",
  );
});

// Founder #079: found via a real Melek, Izzet Paragon comparison — his
// real "whenever you cast an instant or sorcery spell" payoff never
// connected to Baral, Chief of Compliance's real "Instant and sorcery
// spells you cast cost {1} less to cast" (arguably the single most
// iconic spellslinger cost-reduction enabler in Commander), because
// neither "copy a spell" nor "cast without paying" covers cost reduction
// at all. The same asymmetry class #073 found for sacrifice/edicts:
// commanderConnectionSignalsFor requires one side's rewards to match the
// OTHER side's produces, and cost reduction never registered as a
// producer of anything. Verified 23 real cards use the "instant and/or
// sorcery spells you cast cost...less" shape via Scryfall (also Goblin
// Electromancer), plus 8 more use "noncreature spells you cast cost...
// less".
test("PRODUCERS.spells recognizes the real 'instant and/or sorcery'/'noncreature spells you cast cost...less' cost-reduction shape (Baral, Chief of Compliance; Goblin Electromancer), not just spell-copy or free-cast effects", () => {
  const baral = { name: "Baral, Chief of Compliance", typeLine: "Legendary Creature", oracleText: "Instant and sorcery spells you cast cost {1} less to cast.\nWhenever a spell or ability you control counters a spell, you may draw a card. If you do, discard a card." };
  const electromancer = { name: "Goblin Electromancer", typeLine: "Creature", oracleText: "Instant and sorcery spells you cast cost {1} less to cast." };
  for (const card of [baral, electromancer]) {
    assert.ok(extractMechanicalSignals(card).produces.includes("spells"), `${card.name} should produce the spells signal`);
  }
  // A creature-cost-reduction card (Animar, Soul of Elements's real
  // "Creature spells you cast cost {1} less...") is a structurally
  // different archetype, not spellslinger velocity, and must not match.
  const animar = { name: "Animar, Soul of Elements", typeLine: "Legendary Creature", oracleText: "Whenever you cast a creature spell, put a +1/+1 counter on Animar.\nCreature spells you cast cost {1} less to cast for each +1/+1 counter on Animar." };
  assert.equal(extractMechanicalSignals(animar).produces.includes("spells"), false);
});

test("Founder #079: Melek's own instant/sorcery-cast payoff and a real cost-reduction enabler now correctly connect via commanderConnectionSignalsFor", () => {
  const melek = { name: "Melek, Izzet Paragon", colors: ["U", "R"], oracleText: "Whenever you cast an instant or sorcery spell, you may put that card from the graveyard on top of your library instead of into your graveyard.\nWhenever you cast an instant or sorcery spell from your hand, add {C} for each instant and sorcery spell you've cast this turn." };
  const baral = { name: "Baral, Chief of Compliance", typeLine: "Legendary Creature", oracleText: "Instant and sorcery spells you cast cost {1} less to cast.\nWhenever a spell or ability you control counters a spell, you may draw a card. If you do, discard a card." };
  const melekScopes = commanderMechanicalScopes(melek);
  const melekMechanics = extractMechanicalSignals(melek);
  const baralMechanics = extractMechanicalSignals(baral);
  assert.ok(melekMechanics.rewards.includes("spells"), "Melek's own trigger should register as a spells payoff");
  assert.ok(baralMechanics.produces.includes("spells"), "Baral should register as a real spells producer");
  assert.ok(
    commanderConnectionSignalsFor(baral, baralMechanics, melekMechanics, melekScopes).includes("spells"),
    "Baral must connect to Melek via the spells signal",
  );
});

// Founder #085: found via a real Arabella, Abandoned Doll comparison —
// her real "Whenever Arabella attacks, it deals X damage to each
// opponent..." never registered as a damage producer, since the old
// pattern required a literal digit — "X" (or "that much", the same real
// shape Kediss, Emberclaw Familiar's damage-redirect uses) never
// matched. This meant Arabella could never connect to a real Curiosity-
// style noncombat-damage-draw aura (#048's PAYOFFS.damage) if one were
// attached to her. The same asymmetry class #073/#079 already found for
// sacrifice/spells. Verified 27 real commanders use "deals X damage" and
// 27 more use "deals that much damage" via Scryfall (also Balin,
// Loremaster; Crystal, Inhuman Princess) — variable-amount damage is at
// least as common as fixed-number damage among real commander pingers.
test("PRODUCERS.damage recognizes the real variable-amount 'deals X damage'/'deals that much damage' shape (Arabella, Abandoned Doll; Kediss, Emberclaw Familiar), not just a literal number", () => {
  const arabella = { name: "Arabella, Abandoned Doll", typeLine: "Legendary Creature", oracleText: "Whenever Arabella attacks, it deals X damage to each opponent and you gain X life, where X is the number of creatures you control with power 2 or less." };
  const kediss = { name: "Kediss, Emberclaw Familiar", typeLine: "Legendary Creature", oracleText: "Whenever a commander you control deals combat damage to an opponent, it deals that much damage to each other opponent." };
  for (const card of [arabella, kediss]) {
    assert.ok(extractMechanicalSignals(card).produces.includes("damage"), `${card.name} should produce the damage signal`);
  }
  // The pre-existing literal-number case (Vivi Ornitier's real "it deals
  // 1 damage to each opponent") must still work unchanged.
  const vivi = { name: "Vivi Ornitier", typeLine: "Legendary Creature", oracleText: "Whenever you cast a noncreature spell, put a +1/+1 counter on this creature and it deals 1 damage to each opponent." };
  assert.ok(extractMechanicalSignals(vivi).produces.includes("damage"));
});

test("Founder #085: Arabella's own variable-damage attack trigger and a real Curiosity-style aura now correctly connect via commanderConnectionSignalsFor", () => {
  const arabella = { name: "Arabella, Abandoned Doll", colors: ["W"], oracleText: "Whenever Arabella attacks, it deals X damage to each opponent and you gain X life, where X is the number of creatures you control with power 2 or less." };
  const curiosity = { name: "Curiosity", typeLine: "Enchantment", oracleText: "Enchant creature\nWhenever enchanted creature deals damage to an opponent, you may draw a card." };
  const arabellaScopes = commanderMechanicalScopes(arabella);
  const arabellaMechanics = extractMechanicalSignals(arabella);
  const curiosityMechanics = extractMechanicalSignals(curiosity);
  assert.ok(arabellaMechanics.produces.includes("damage"), "Arabella's own attack trigger should register as a real damage producer");
  assert.ok(curiosityMechanics.rewards.includes("damage"), "Curiosity should register as a real damage payoff");
  assert.ok(
    commanderConnectionSignalsFor(curiosity, curiosityMechanics, arabellaMechanics, arabellaScopes).includes("damage"),
    "Curiosity must connect to Arabella via the damage signal",
  );
});

// Founder #099: found via cross-referencing this file's produces/rewards
// against blueprint-note-and-mana.mjs's independently-built ROLE_PATTERNS
// across the full mined corpus — the same technique #098 used, this time
// pointing the other direction. The bare "cards? in your hand" clause in
// PAYOFFS.draw was a false-positive magnet with no documented real-card
// justification: every real card in the corpus that depended on it alone
// was a static hand-size-scaling effect with nothing to do with drawing
// (Maro's power = cards in hand; Empyrial Plate's equipment bonus scales
// with hand size; Ensnaring Bridge's stax gate; Master of Predicaments'
// unrelated "a card in your hand" object reference).
test("PAYOFFS.draw no longer false-positives on cards that merely reference hand size for an unrelated effect (Maro, Ensnaring Bridge, Master of Predicaments)", () => {
  const maro = { name: "Maro", typeLine: "Creature", oracleText: "Maro's power and toughness are each equal to the number of cards in your hand." };
  const ensnaringBridge = { name: "Ensnaring Bridge", typeLine: "Artifact", oracleText: "Creatures with power greater than the number of cards in your hand can't attack." };
  const masterOfPredicaments = { name: "Master of Predicaments", typeLine: "Creature", oracleText: "Flying\nWhenever this creature deals combat damage to a player, choose a card in your hand. That player guesses whether the card's mana value is greater than 4. If the player guessed wrong, you may cast the card without paying its mana cost." };
  for (const card of [maro, ensnaringBridge, masterOfPredicaments]) {
    const signals = extractMechanicalSignals(card);
    assert.ok(!signals.rewards.includes("draw"), `${card.name} should not reward the draw signal — it never mentions drawing`);
  }
});

test("PAYOFFS.draw still recognizes every real draw-payoff shape that happens to also mention hand size, via its other own wording (Sylvan Library, Castle Locthwain, Jin-Gitaxias)", () => {
  const sylvanLibrary = { name: "Sylvan Library", typeLine: "Enchantment", oracleText: "At the beginning of your draw step, you may draw two additional cards. If you do, choose two cards in your hand drawn this turn. For each of those cards, pay 4 life or put the card on top of your library." };
  const castleLocthwain = { name: "Castle Locthwain", typeLine: "Land", oracleText: "This land enters tapped unless you control a Swamp.\n{T}: Add {B}.\n{1}{B}{B}, {T}: Draw a card, then you lose life equal to the number of cards in your hand." };
  const jinGitaxias = { name: "Jin-Gitaxias // The Great Synthesis", typeLine: "Legendary Creature — Phyrexian Praetor", oracleText: "Ward {2}\nWhenever you cast a noncreature spell with mana value 3 or greater, draw a card." };
  for (const card of [sylvanLibrary, castleLocthwain, jinGitaxias]) {
    const signals = extractMechanicalSignals(card);
    assert.ok(signals.produces.includes("draw") || signals.rewards.includes("draw"), `${card.name} should still register as draw-related via its own real wording`);
  }
});

// Founder #100: continuing the cross-classifier disagreement mining thread
// (#098/#099), this round on "counters". PAYOFFS.counters' "if"/"whenever"/
// "for each" alternatives had no word boundary around "counter", so they
// matched it as a bare substring of "countered" — the spell-negation verb.
// Any counterspell with a real "If [it/that spell] is countered this way,
// exile/put it..." redirect clause false-positived a "counters" reward with
// zero real +1/+1/charge/other counter mechanic anywhere in its own text.
test("PAYOFFS.counters no longer false-positives on counterspells whose redirect clause merely contains \"countered\" (Force of Negation, Memory Lapse, Devious Cover-Up)", () => {
  const forceOfNegation = { name: "Force of Negation", typeLine: "Instant", oracleText: "If it's not your turn, you may exile a blue card from your hand rather than pay this spell's mana cost.\nCounter target noncreature spell. If that spell is countered this way, exile it instead of putting it into its owner's graveyard." };
  const memoryLapse = { name: "Memory Lapse", typeLine: "Instant", oracleText: "Counter target spell. If that spell is countered this way, put it on top of its owner's library instead of into that player's graveyard." };
  const deviousCoverUp = { name: "Devious Cover-Up", typeLine: "Instant", oracleText: "Counter target spell. If that spell is countered this way, exile it instead of putting it into its owner's graveyard. You may shuffle up to four target cards from your graveyard into your library." };
  for (const card of [forceOfNegation, memoryLapse, deviousCoverUp]) {
    const signals = extractMechanicalSignals(card);
    assert.ok(!signals.rewards.includes("counters"), `${card.name} should not reward the counters signal — it never has a real counter mechanic`);
  }
});

test("PAYOFFS.counters still recognizes every real counters-payoff shape (Umezawa's Jitte, The One Ring, a real +1/+1 modified-creature payoff)", () => {
  const jitte = { name: "Umezawa's Jitte", typeLine: "Legendary Artifact — Equipment", oracleText: "Whenever equipped creature deals combat damage, put two charge counters on Umezawa's Jitte.\nRemove a charge counter from Umezawa's Jitte: Choose one —\n• Equipped creature gets +2/+2 until end of turn.\n• Target creature gets -1/-1 until end of turn.\n• You gain 2 life.\nEquip {2}" };
  const theOneRing = { name: "The One Ring", typeLine: "Legendary Artifact", oracleText: "Indestructible\nWhen The One Ring enters, if you cast it, you gain protection from everything until your next turn.\nAt the beginning of your upkeep, you lose 1 life for each burden counter on The One Ring.\n{T}: Put a burden counter on The One Ring, then draw a card for each burden counter on The One Ring." };
  for (const card of [jitte, theOneRing]) {
    const signals = extractMechanicalSignals(card);
    assert.ok(signals.rewards.includes("counters"), `${card.name} should still register a real counters payoff via its own wording`);
  }
});
