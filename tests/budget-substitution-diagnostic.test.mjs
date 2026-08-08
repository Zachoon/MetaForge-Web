import assert from "node:assert/strict";
import test from "node:test";
import { auditBudgetSubstitutions, forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

// Phase 2A: before touching any spell-budget weight (Phase 2B), measure
// whether an expensive selected nonland card is actually earning its price
// (a real role-floor dependency) or is only surviving because scoreCard's
// unweighted budgetScore is drowned out by larger structural terms — the
// same shape Phase 1 found and fixed for lands. This tool does not change
// scoring; it only reports. See auditBudgetSubstitutions in
// app/native-masterwork-engine.mjs.

const gCard = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{G}", extra = {}) => ({
  name, oracleText, typeLine, manaCost, colorIdentity: ["G"], ...extra,
});
const ayula = { name: "Ayula, Queen Among Bears", colors: ["G"], oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature." };

// Fictional fixture names, deliberately — a real card name (e.g. the
// actual "Badgermole Cub") can pick up unrelated database-confirmed roles
// from app/card-mechanics.mjs, which would make this fixture's role math
// unpredictable. "Test Premium Bear" is representative of that real
// screenshot offender, not a reproduction of its exact real text/roles.
const premiumSmallEdge = gCard(
  "Test Premium Bear",
  "When this enters, draw a card. Target creature gains hexproof and indestructible until end of turn.",
  "Creature — Test", "{2}{G}", { priceUsd: 53 },
);
const cheapSameRoleAlt = gCard("Test Cheap Cub", "When this enters, draw a card.", "Creature — Test", "{2}{G}", { priceUsd: 1.4 });

const abundantProtection = [
  ...Array.from({ length: 27 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.")),
  ...Array.from({ length: 24 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  // 8 Wards, well above the protection role's target of 5 — losing one
  // protection source (by cutting the premium card) still leaves plenty.
  ...Array.from({ length: 8 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
];
const scarceProtection = [
  ...Array.from({ length: 27 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.")),
  ...Array.from({ length: 24 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 22 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  // Exactly 4 Wards: with the premium card's own protection role, that's
  // exactly the target of 5. Cutting the premium card drops it to 4.
  ...Array.from({ length: 4 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
];

test("a role-headroom offender is reported as budget being ignored relative to a small structural gain", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, premiumSmallEdge, cheapSameRoleAlt],
  };
  assert.ok(forgeNativeMasterwork(input).selected.rows.some((row) => row.name === "Test Premium Bear"), "fixture sanity: the premium card must actually be selected");
  const audit = auditBudgetSubstitutions(input, { priceThresholdUsd: 15 });
  const offender = audit.offenders.find((entry) => entry.name === "Test Premium Bear");
  assert.ok(offender, "expected the premium card to be flagged as an offender above the price threshold");
  assert.equal(offender.priceUsd, 53);
  assert.ok(offender.roles.includes("draw") && offender.roles.includes("protection"));
  assert.ok(offender.budgetContribution < 0, "a priced card under Budget conscious must show a real negative budget contribution");
  assert.ok(offender.alternative, "a cheaper same-role alternative must be found");
  assert.equal(offender.alternative.name, "Test Cheap Cub");
  assert.equal(offender.hardGateImpact, "none");
  assert.equal(offender.conclusion, "budget preference is being ignored relative to a small structural gain");
});

test("an offender protecting a role at its exact floor is reported as structurally justified, not flagged", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...scarceProtection, premiumSmallEdge, cheapSameRoleAlt],
  };
  const audit = auditBudgetSubstitutions(input, { priceThresholdUsd: 15 });
  const offender = audit.offenders.find((entry) => entry.name === "Test Premium Bear");
  assert.ok(offender, "expected the premium card to still be flagged as an offender (it is still expensive)");
  assert.match(offender.hardGateImpact, /role floor: protection would fall below 5/);
  assert.equal(offender.conclusion, "expensive inclusion has a structural justification");
});

test("the exact same card/price/roles produce identical scoring in both scenarios — only the surrounding role scarcity changes the verdict", () => {
  const headroomInput = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, premiumSmallEdge, cheapSameRoleAlt],
  };
  const floorInput = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...scarceProtection, premiumSmallEdge, cheapSameRoleAlt],
  };
  const headroom = auditBudgetSubstitutions(headroomInput, { priceThresholdUsd: 15 }).offenders.find((e) => e.name === "Test Premium Bear");
  const floor = auditBudgetSubstitutions(floorInput, { priceThresholdUsd: 15 }).offenders.find((e) => e.name === "Test Premium Bear");
  assert.equal(headroom.score, floor.score);
  assert.equal(headroom.scoreDifference, floor.scoreDifference);
  assert.notEqual(headroom.conclusion, floor.conclusion, "identical score/price math must still diverge on the real structural question — whether a role floor is actually at stake");
});

test("priceThresholdUsd is respected — cards below it are never flagged as offenders", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, premiumSmallEdge, cheapSameRoleAlt],
  };
  const audit = auditBudgetSubstitutions(input, { priceThresholdUsd: 100 });
  assert.equal(audit.offenders.length, 0, "nothing in this fixture costs $100+, so nothing should be flagged");
});

test("survivability across three budget settings: the premium card currently survives regardless of preference, while its own budget contribution moves correctly and monotonically — this is the Phase 2B evidence gap", () => {
  const cards = [...abundantProtection, premiumSmallEdge, cheapSameRoleAlt];
  const bearUnder = (budget) => {
    const input = { format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, commander: ayula, budget, cards };
    return auditBudgetSubstitutions(input, { priceThresholdUsd: 15 }).offenders.find((entry) => entry.name === "Test Premium Bear");
  };
  const budgetConscious = bearUnder("Budget conscious");
  const moderate = bearUnder("Moderate investment");
  const noPreference = bearUnder(undefined);

  // The mechanical part already works correctly: real, monotonically
  // increasing (less negative) budget contribution as the preference
  // relaxes.
  assert.ok(budgetConscious.budgetContribution < moderate.budgetContribution, "Budget conscious must penalize the price more than Moderate investment");
  assert.ok(moderate.budgetContribution < noPreference.budgetContribution, "Moderate investment must penalize the price more than no preference");
  assert.equal(noPreference.budgetContribution, 0, "no budget preference stated must apply zero price pressure");

  // The gap this diagnostic exists to surface: despite that real,
  // correctly-directed pressure, the card survives every single setting.
  // Under Budget Conscious and Moderate investment specifically, a real
  // cheaper alternative is found and still loses on score — proving the
  // structural edge currently always outweighs the budget penalty, no
  // matter how hard the preference pushes back within today's weighting.
  assert.ok(budgetConscious, "premium card must still be present (selected) under Budget conscious");
  assert.ok(moderate, "premium card must still be present (selected) under Moderate investment");
  assert.ok(noPreference, "premium card must still be present (selected) with no budget preference");
  assert.equal(budgetConscious.conclusion, "budget preference is being ignored relative to a small structural gain");
  assert.equal(moderate.conclusion, "budget preference is being ignored relative to a small structural gain");
  assert.ok(budgetConscious.scoreDifference > 0 && moderate.scoreDifference > 0, "the structural edge must still net positive under both budget-aware settings");
});
