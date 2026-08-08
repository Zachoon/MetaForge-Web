import assert from "node:assert/strict";
import test from "node:test";
import { budgetScoreFor, forgeNativeMasterwork, forgeMultiSlotRefills } from "../app/native-masterwork-engine.mjs";

// Regression suite for the screenshot bug: Ayula, Queen Among Bears +
// Budget Conscious + Casual produced an initial mana base stuffed with
// $30-50+ premium utility lands, because buildManaBase used a separate,
// preference-blind formula from the rest of construction. See
// app/native-masterwork-engine.mjs's buildManaBase (now budget-aware),
// prepareForgeAnalysis/relaxAnalysisPreferences (now preserve analyzed
// land entries instead of stripping them to bare cards), and
// buildCandidate's recovery ladder (now handles land scarcity alongside
// spell scarcity).

const gCard = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{G}") => ({
  name, oracleText, typeLine, manaCost, colorIdentity: ["G"],
});

// Deep enough (88 unique cards) that a full singleton 100-card Commander
// deck can always be filled regardless of exactly how many land slots
// curveAwareLandAdjustment lands on — same depth as the shared `pool`
// fixture in native-masterwork-engine.test.mjs, just recolored green for
// an Ayula-shaped deck.
const ayulaSpells = [
  ...Array.from({ length: 28 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => gCard(`Answer ${i}`, "Fight target creature you don't control.")),
  ...Array.from({ length: 18 }, (_, i) => gCard(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
];
const ayula = { name: "Ayula, Queen Among Bears", colors: ["G"], oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature." };

const gLand = (name, extra = {}) => ({
  name, oracleText: "{T}: Add {G}.", manaCost: "", typeLine: "Land", colorIdentity: ["G"], ...extra,
});

// The five real cards named in the screenshot regression, with realistic
// (not exact-market, just representative) fixture prices in the $8-45
// range the bug actually surfaced at. Oracle text is paraphrased, not
// reproduced verbatim, since only the "add"/"tapped" substrings the
// ranking heuristic reads are functionally relevant.
const boseiju = { name: "Boseiju, Who Endures", priceUsd: 35, oracleText: "Channel — Discard this land: destroy target artifact, enchantment, or nonbasic land an opponent controls. {T}: Add {G}.", typeLine: "Legendary Land", manaCost: "", colorIdentity: ["G"], producedMana: ["G"] };
const nykthos = { name: "Nykthos, Shrine to Nyx", priceUsd: 8, oracleText: "{T}: Add one mana of any color among your devotion. {2}, {T}: Add mana of any one color equal to your devotion to that color.", typeLine: "Legendary Land", manaCost: "", colorIdentity: [], producedMana: ["W", "U", "B", "R", "G"] };
const cavernOfSouls = { name: "Cavern of Souls", priceUsd: 45, oracleText: "As this land enters, choose a creature type. {T}: Add one mana of any color, spent only to cast a creature spell of the chosen type.", typeLine: "Land", manaCost: "", colorIdentity: [], producedMana: ["W", "U", "B", "R", "G"] };
const gemstoneCaverns = { name: "Gemstone Caverns", priceUsd: 12, oracleText: "If this land is in your opening hand, you may exile it for value. {T}: Add one mana of any color.", typeLine: "Land", manaCost: "", colorIdentity: [], producedMana: ["W", "U", "B", "R", "G"] };
const manaConfluence = { name: "Mana Confluence", priceUsd: 30, oracleText: "{T}: Add one mana of any color. If you do, this land deals 1 damage to you.", typeLine: "Land", manaCost: "", colorIdentity: [], producedMana: ["W", "U", "B", "R", "G"] };
const PREMIUM_LANDS = [boseiju, nykthos, cavernOfSouls, gemstoneCaverns, manaConfluence];

const cheapAlternatives = (popularityRank) =>
  Array.from({ length: 20 }, (_, i) => gLand(`Cheap Grove ${i}`, { priceUsd: 0.5, popularityRank }));

// --- Primary regression: Ayula / Commander / Budget Conscious ---

test("Ayula + Commander + Budget Conscious: none of the five real premium lands from the screenshot regression survive into the initial mana base when cheap legal green lands are available", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: ayula, budget: "Budget conscious",
    cards: [...ayulaSpells, ...PREMIUM_LANDS.map((land) => ({ ...land, popularityRank: 0 })), ...cheapAlternatives(0)],
  });
  for (const land of PREMIUM_LANDS) {
    assert.ok(!report.selected.rows.some((row) => row.name === land.name), `${land.name} should have been outranked by cheap alternatives under Budget conscious`);
  }
  assert.ok(report.selected.rows.some((row) => row.name.startsWith("Cheap Grove")), "cheap alternatives should have actually filled the nonbasic slots");
  assert.equal(report.selected.recoveryStage, "ideal", "enough cheap lands exist — this must not need the recovery ladder at all");
});

// --- Per-land proof: price available, budget affects ranking, cheap beats it, explicit cap rejects it ---

for (const land of PREMIUM_LANDS) {
  test(`${land.name}: price participates in land scoring and a same-popularity cheap alternative outranks it under Budget conscious`, () => {
    assert.ok(Number.isFinite(land.priceUsd), "fixture sanity: price must be known");
    assert.ok(budgetScoreFor(land.priceUsd, "Budget conscious") < 0, "a priced land must receive a real budget penalty under Budget conscious");

    // Isolate price as the only variable: identical popularity on both
    // sides, same color, same "add" text, same untapped status — matches
    // the isolation style of the existing spell-level budget test.
    const matchedPopularity = 3;
    const pool = [
      ...ayulaSpells,
      { ...land, popularityRank: matchedPopularity },
      ...cheapAlternatives(matchedPopularity),
    ];
    const report = forgeNativeMasterwork({
      format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
      commander: ayula, budget: "Budget conscious", cards: pool,
    });
    assert.ok(!report.selected.rows.some((row) => row.name === land.name), `${land.name} must lose to an equally-popular cheap alternative once Budget conscious is selected`);
  });

  test(`${land.name}: an explicit maxCardPrice below its price makes it ineligible in the ideal attempt, exactly like an over-cap spell`, () => {
    const pool = [...ayulaSpells, { ...land, popularityRank: 0 }, ...cheapAlternatives(500)];
    const report = forgeNativeMasterwork({
      format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
      commander: ayula, maxCardPrice: land.priceUsd - 1, cards: pool,
    });
    assert.ok(!report.selected.rows.some((row) => row.name === land.name), `${land.name} must be hard-excluded once maxCardPrice is below its price`);
    assert.ok(report.candidates.every((candidate) => !candidate.rows.some((row) => row.name === land.name)), `${land.name} must not appear in any exposed candidate, not just the selected one`);
  });
}

// --- The opposite case: no budget preference lets structural value win ---

test("without a budget preference, a more popular premium land still beats an obscure cheap one — budget only acts when actually requested", () => {
  const pool = [
    ...ayulaSpells,
    { ...cavernOfSouls, popularityRank: 0 },
    ...cheapAlternatives(400),
  ];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: ayula, cards: pool,
  });
  assert.ok(report.selected.rows.some((row) => row.name === cavernOfSouls.name), "with no budget preference stated, real popularity/structural value must still be able to win");
});

// --- Land-side scarcity + recovery ---

const scarceCheapAlt = (n) => gLand(`Scarce Grove ${n}`, { priceUsd: 1, popularityRank: 10 + n });
const abundantPricyAlt = (n) => gLand(`Pricy Thicket ${n}`, { priceUsd: 60, popularityRank: 10 + n });
const offColorDecoy = (n) => ({ name: `Offcolor Trap ${n}`, oracleText: "{T}: Add {U}.", manaCost: "", typeLine: "Land", colorIdentity: ["U"], priceUsd: 0.05, popularityRank: 0 });

test("enough budget-eligible lands under an explicit cap: ideal attempt succeeds, no recovery needed", () => {
  const pool = [...ayulaSpells, ...Array.from({ length: 20 }, (_, i) => scarceCheapAlt(i)), ...Array.from({ length: 10 }, (_, i) => abundantPricyAlt(i))];
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 17,
    commander: ayula, maxCardPrice: 5, cards: pool,
  });
  assert.equal(report.selected.recoveryStage, "ideal");
  assert.equal(report.selected.recoveryNote, undefined);
  assert.equal(report.budgetDiagnostics.budgetRecoveryOccurred, false);
});

test("not enough budget-eligible lands under an explicit cap: one relaxed-preference retry fills the legal deck and discloses it", () => {
  // Only 3 lands survive the $5 cap in the whole pool — below any
  // plausible nonbasicLimit (14-18 for a Commander/100 build) — but 20
  // more exist above the cap, so relaxing the price/rarity preference
  // (never legality/color identity) gives the retry comfortably enough
  // real lands to complete the deck.
  const pool = [
    ...ayulaSpells,
    ...Array.from({ length: 3 }, (_, i) => scarceCheapAlt(i)),
    ...Array.from({ length: 20 }, (_, i) => abundantPricyAlt(i)),
    ...Array.from({ length: 4 }, (_, i) => offColorDecoy(i)),
  ];
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 17,
    commander: ayula, maxCardPrice: 5, cards: pool,
  };
  const report = forgeNativeMasterwork(input);
  assert.equal(report.selected.recoveryStage, "relaxed-preferences");
  assert.ok(report.selected.recoveryNote, "a real recoveryNote must be present whenever recovery was used");
  assert.match(report.selected.recoveryNote, /mana base/i);
  assert.equal(report.selected.recoveryDiagnostics.kind, "lands");
  assert.equal(report.budgetDiagnostics.budgetRecoveryOccurred, true);
  // Legality/color identity are never relaxed: the off-color decoys are
  // cheaper and more popular than everything else in the pool, so if
  // color identity had leaked, they would dominate the ranking.
  assert.ok(!report.selected.rows.some((row) => row.name.startsWith("Offcolor Trap")), "an off-color land must never appear, even after recovery relaxed price/rarity");
  assert.equal(report.selected.rows.reduce((sum, row) => sum + row.quantity, 0), 100, "the recovered candidate must still be a complete, legal deck");

  // Deterministic for the same seed/input.
  const again = forgeNativeMasterwork(input);
  assert.deepEqual(again.selected.rows, report.selected.rows, "land recovery must be deterministic for the same seed/input");
  assert.equal(again.selected.recoveryStage, "relaxed-preferences");
});

test("true structural land scarcity (relaxation cannot help) surfaces an honest error instead of silently completing", () => {
  // Every land in the pool is off-color — relaxing price/rarity preferences
  // can never manufacture a legal green land that doesn't exist, so this
  // must fail loudly rather than quietly falling back to a budget-blind
  // or color-blind mana base.
  const pool = [...ayulaSpells, ...Array.from({ length: 6 }, (_, i) => offColorDecoy(i))];
  assert.throws(
    () => forgeNativeMasterwork({
      format: "Commander", target: 100, strategy: "Balanced midrange", seed: 17,
      commander: ayula, maxCardPrice: 0.1, cards: pool,
    }),
    /could not fill \d+ legal land slot/,
  );
});

// --- Initial build vs. multi-refill consistency ---

test("initial land construction and multi-refill respond to Budget conscious in the same direction", () => {
  // Same isolation as the per-land tests above: identical plain "add {G}"
  // text and popularity, price the only real difference. A "Mana
  // Confluence"-shaped fixture (any-color, "deals damage") was
  // deliberately avoided here — its text happens to also match the
  // unrelated ramp/interaction role regexes, which would confound this
  // test's directional comparison with role-restoration merit instead of
  // isolating budget the way this test is actually about.
  const matchedPopularity = 3;
  const premiumPlainLand = gLand("Pricy Grove", { priceUsd: 40, popularityRank: matchedPopularity });
  const cards = [...ayulaSpells, premiumPlainLand, ...cheapAlternatives(matchedPopularity)];
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: ayula, budget: "Budget conscious", cards,
  };
  const initial = forgeNativeMasterwork(input);
  assert.ok(!initial.selected.rows.some((row) => row.name === premiumPlainLand.name), "initial construction must not favor the pricier, equally-popular land");

  // Cut one cheap land the initial build actually used, then ask
  // multi-refill (the already-proven scoreCard-based replacement path) to
  // fill that exact slot from the same budget-conscious pool.
  const cutLand = initial.selected.rows.find((row) => row.roles.includes("land") && row.name.startsWith("Cheap Grove"));
  assert.ok(cutLand, "fixture sanity: the cheap alternatives must have actually been chosen");
  const afterCut = initial.selected.rows.map((row) => (row.name === cutLand.name ? { ...row, quantity: row.quantity - 1 } : row)).filter((row) => row.quantity > 0);
  const refill = forgeMultiSlotRefills(input, afterCut, [{ name: cutLand.name, quantity: 1 }]);
  assert.ok(refill.packages.length > 0, "fixture sanity: a refill package must be produced");
  for (const pkg of refill.packages) {
    assert.ok(!pkg.additions.some((addition) => addition.name === premiumPlainLand.name), "multi-refill must not favor the pricier land either — same directional preference as initial construction");
  }
});

// --- Post-build budget diagnostics (Phase 1E) ---

test("budgetDiagnostics reports arithmetically-consistent totals for the delivered deck", () => {
  const report = forgeNativeMasterwork({
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 11,
    commander: ayula, budget: "Budget conscious",
    cards: [...ayulaSpells, { ...manaConfluence, popularityRank: 3 }, ...cheapAlternatives(3)],
  });
  const priceByName = new Map([manaConfluence, ...cheapAlternatives(3)].map((card) => [card.name, card.priceUsd]));
  const expectedTotal = report.selected.rows.reduce((sum, row) => {
    const price = priceByName.get(row.name);
    return Number.isFinite(price) ? sum + price * row.quantity : sum;
  }, 0);
  assert.ok(Math.abs(report.budgetDiagnostics.knownDeckPriceUsd - expectedTotal) < 0.01);
  assert.ok(report.budgetDiagnostics.knownLandPriceUsd <= report.budgetDiagnostics.knownDeckPriceUsd);
  assert.equal(report.budgetDiagnostics.budgetRecoveryOccurred, false);
  assert.ok(report.budgetDiagnostics.cardsAbovePriceBand[10] >= 0);
});
