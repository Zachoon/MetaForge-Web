import assert from "node:assert/strict";
import test from "node:test";
import { buildStrategicIntent, strategicSemanticsFor } from "../app/strategic-intent.mjs";
import { extractMechanicalSignals } from "../app/forge-interaction-graph.mjs";
import { classifyNativeCard, colorPipsFromCost, analyzeForgePool } from "../app/native-masterwork-engine.mjs";
import { suggestCardForCategory } from "../app/guided-suggestion.mjs";

const pearlEar = {
  name: "Pearl-Ear, Imperial Advisor",
  colors: ["W"],
  oracleText: "Enchantment spells you cast have affinity for Auras. Whenever an Aura you control becomes attached to a nonland permanent, draw a card.",
  typeLine: "Legendary Creature — Fox Advisor",
  manaCost: "{1}{W}",
};

const card = (name, typeLine, oracleText, cmc, priceUsd = 0.2, manaCost) => ({
  name,
  typeLine,
  oracleText,
  cmc,
  manaCost: manaCost || `{${Math.max(0, cmc - 1)}}{W}`,
  colorIdentity: ["W"],
  priceUsd,
});

const aura = (name, cmc = 2, oracle = "Enchant creature. Enchanted creature gets +1/+1 and has hexproof.") =>
  card(name, "Enchantment — Aura", oracle, cmc);
const draw = (name) => card(name, "Instant", "Draw two cards.", 3);
const removal = (name) => card(name, "Instant", "Exile target nonland permanent.", 3);
const ramp = (name, cmc = 2) => card(name, "Artifact", "Add one mana. Create a Treasure token.", cmc, 0.2, `{${cmc}}`);
const beater = (name) => card(name, "Creature — Angel", "Flying. Vigilance.", 4);
const altWin = (name) => card(name, "Enchantment",
  "At the beginning of your upkeep, if you control no permanents other than this enchantment and you have no cards in hand, you win the game.", 5);

function intentForPearl() {
  return buildStrategicIntent(
    { format: "Commander", strategy: "Balanced midrange", commander: pearlEar, note: "focus on auras" },
    {
      blueprint: { source: "focus on auras", requestedMechanics: ["voltron"], desiredRoles: [], packageSignals: [], promises: [] },
      roleTargets: { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 },
    },
  );
}

function enriched(entry, commander = pearlEar) {
  const commanderSignals = extractMechanicalSignals(commander);
  const mechanics = extractMechanicalSignals(entry);
  return {
    quantity: 1,
    name: entry.name,
    card: entry,
    typeLine: entry.typeLine,
    oracleText: entry.oracleText,
    roles: classifyNativeCard(entry),
    cmc: entry.cmc,
    colorPips: colorPipsFromCost(entry.manaCost),
    strategicSemantics: strategicSemanticsFor(entry),
    mechanics,
    commanderConnectionSignals: commanderSignals.rewards.filter((signal) => mechanics.produces.includes(signal)),
    sequenceStages: entry.cmc <= 2 ? ["setup"] : entry.cmc >= 5 ? ["close"] : ["convert"],
    score: 50,
  };
}

function mixedPool() {
  return [
    ...Array.from({ length: 6 }, (_, i) => enriched(aura(`Aura ${i}`, 1 + (i % 3)))),
    ...Array.from({ length: 6 }, (_, i) => enriched(draw(`Flow ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(removal(`Answer ${i}`))),
    ...Array.from({ length: 6 }, (_, i) => enriched(ramp(`Stone ${i}`))),
    enriched(beater("Big Angel")),
    enriched(altWin("Barren Glory")),
  ];
}

test("suggests the highest-scoring eligible card for a fundamentals category", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Have Aura ${i}`)));
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: partial, pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.ok(suggestion.offer.roles.includes("ramp"), "offer should actually be a ramp card");
  assert.ok(suggestion.reason.nearestAlternative, "should report a nearest alternative when more than one ramp card exists");
});

test("declining excludes that name and the next call offers a different card", () => {
  const intent = intentForPearl();
  const partial = Array.from({ length: 8 }, (_, i) => enriched(aura(`Have Aura ${i}`)));
  const pool = mixedPool();
  const first = suggestCardForCategory({ category: "ramp", partialRows: partial, pool, intent });
  const second = suggestCardForCategory({
    category: "ramp",
    partialRows: partial,
    pool,
    intent,
    declinedNames: [first.offer.name],
  });
  assert.notEqual(second.offer.name, first.offer.name);
  assert.ok(second.offer.roles.includes("ramp"));
});

test("a card already in the partial deck is never re-offered (singleton)", () => {
  const intent = intentForPearl();
  const pool = mixedPool();
  const alreadyIn = pool.find((c) => c.roles.includes("ramp"));
  const partial = [alreadyIn];
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: partial, pool, intent });
  assert.notEqual(suggestion.offer.name, alreadyIn.name);
});

test("winConditions category only offers threat/explicit-win-condition cards", () => {
  const intent = intentForPearl();
  const suggestion = suggestCardForCategory({ category: "winConditions", partialRows: [], pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.ok(["Big Angel", "Barren Glory"].includes(suggestion.offer.name));
});

test("synergyPieces category only offers package core/support cards", () => {
  const intent = intentForPearl();
  const suggestion = suggestCardForCategory({ category: "synergyPieces", partialRows: [], pool: mixedPool(), intent });
  assert.equal(suggestion.exhausted, false);
  assert.equal(suggestion.offer.typeLine, "Enchantment — Aura");
});

test("reports exhausted when no eligible candidate remains", () => {
  const intent = intentForPearl();
  const pool = [enriched(draw("Only Draw"))];
  const suggestion = suggestCardForCategory({ category: "sweeper", partialRows: [], pool, intent });
  assert.equal(suggestion.exhausted, true);
  assert.equal(suggestion.offer, null);
});

test("works against the real engine's nested {card, roles, ...} shape (analyzeForgePool), not just flat test fixtures", () => {
  const analysis = analyzeForgePool({
    format: "Commander",
    strategy: "Balanced midrange",
    target: 100,
    commander: pearlEar,
    note: "focus on auras",
    cards: mixedPool().map((entry) => entry.card),
  });
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool: analysis.spells, intent: analysis.strategicIntent });
  assert.equal(suggestion.exhausted, false);
  assert.ok(suggestion.offer.card.name, "real engine rows nest the card under .card");
  assert.ok(suggestion.offer.roles.includes("ramp"));
  assert.ok(suggestion.reason.nearestAlternative?.name, "nearestAlternative must resolve a real name, not undefined, for nested rows");

  const declined = [suggestion.offer.card.name];
  const second = suggestCardForCategory({ category: "ramp", partialRows: [], pool: analysis.spells, intent: analysis.strategicIntent, declinedNames: declined });
  assert.notEqual(second.offer?.card.name, suggestion.offer.card.name);
});

// --- Ranking behavior measured against real Scryfall pools (2026-09-20) ---

const analyzeCards = (cards, extra = {}) => analyzeForgePool({
  format: "Commander", strategy: "Balanced midrange", target: 100, commander: pearlEar, note: "focus on auras", cards, ...extra,
});

test("a plain single-purpose ramp spell leads the ramp step over a multi-tagged card that only matches incidental wording", () => {
  const plain = { ...card("Plain Cultivator", "Sorcery", "Search your library for two basic land cards, put them onto the battlefield tapped. Add one mana.", 3), rarity: "common" };
  // Matches ramp, draw AND interaction regexes at once, and is an Aura-shell core piece.
  const sprawl = { ...card("Everything Aura", "Enchantment — Aura", "Enchant creature. Add one mana. Draw a card. Destroy target creature you don't control.", 3), rarity: "common" };
  const analysis = analyzeCards([plain, sprawl, ...mixedPool().map((entry) => entry.card)]);
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool: analysis.scoredSpells, intent: analysis.strategicIntent });
  assert.equal(suggestion.offer.card.name, "Plain Cultivator");
});

test("the board-wipe step only offers cards that actually wipe creatures", () => {
  const wrath = card("Clean Slate", "Sorcery", "Destroy all creatures.", 4);
  const artifactWipe = card("Rust Storm", "Sorcery", "Destroy all artifacts and enchantments.", 4);
  const tokenWipe = card("Fade Away", "Sorcery", "Destroy all Saprolings.", 3);
  const analysis = analyzeCards([wrath, artifactWipe, tokenWipe, ...mixedPool().map((entry) => entry.card)]);
  const offered = [];
  const declined = [];
  for (let i = 0; i < 5; i += 1) {
    const suggestion = suggestCardForCategory({ category: "sweeper", partialRows: [], pool: analysis.scoredSpells, intent: analysis.strategicIntent, declinedNames: declined });
    if (suggestion.exhausted) break;
    offered.push(suggestion.offer.card.name);
    declined.push(suggestion.offer.card.name);
  }
  assert.deepEqual(offered, ["Clean Slate"]);
});

test("the explanation never cites a different step's role as the reason", () => {
  const drawAndRamp = { ...card("Rock That Draws", "Artifact", "{T}: Add one mana. {2}, {T}: Draw a card.", 3), rarity: "common" };
  const analysis = analyzeCards([drawAndRamp, ...mixedPool().map((entry) => entry.card)]);
  const suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool: analysis.scoredSpells, intent: analysis.strategicIntent });
  for (const tag of suggestion.reason.deficitsFilled) {
    assert.ok(!tag.startsWith("role:") || tag === "role:ramp", `ramp step explained itself with ${tag}`);
  }
});

test("the focused score blends the engine's card quality, and its weights are pinned", async () => {
  const { focusedScore, GUIDED_RANK_WEIGHTS, accessibilityPenalty } = await import("../app/guided-suggestion.mjs");
  assert.deepEqual(GUIDED_RANK_WEIGHTS, { quality: 0.45, primary: 1, shell: 0.6, otherRole: 0.1, other: 0.25 });
  const delta = {
    positives: [
      { kind: "tracked_role", detail: "ramp", weight: 22 },
      { kind: "tracked_role", detail: "draw", weight: 22 },
      { kind: "package_core", detail: "auras", weight: 50 },
      { kind: "curve_deficit", detail: "3", weight: 10 },
    ],
    negatives: [{ kind: "opportunity_cost", weight: -4 }],
  };
  // 22*1 + 50*0.6 + 22*0.1 + 10*0.25 - 4 + 80*0.45 = 22+30+2.2+2.5-4+36 = 88.7
  assert.equal(focusedScore("ramp", { score: 80 }, delta), 88.7);
  // In the draw step the same card's draw credit is the primary one.
  assert.equal(focusedScore("draw", { score: 80 }, delta), 88.7);
  assert.equal(accessibilityPenalty({ card: { priceUsd: 5 } }), 0);
  assert.equal(accessibilityPenalty({ card: { priceUsd: 24 } }), 8);
  assert.equal(accessibilityPenalty({ card: { priceUsd: 500 } }), 12);
  assert.equal(accessibilityPenalty({ card: {} }), 0);
});

test("declining every eligible card in turn eventually exhausts the category", () => {
  const intent = intentForPearl();
  const pool = Array.from({ length: 3 }, (_, i) => enriched(ramp(`Stone ${i}`)));
  const declined = [];
  let suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool, intent, declinedNames: declined });
  let guard = 0;
  while (!suggestion.exhausted && guard < 10) {
    declined.push(suggestion.offer.name);
    suggestion = suggestCardForCategory({ category: "ramp", partialRows: [], pool, intent, declinedNames: declined });
    guard += 1;
  }
  assert.equal(suggestion.exhausted, true);
  assert.equal(declined.length, 3);
});
