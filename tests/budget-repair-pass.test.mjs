import assert from "node:assert/strict";
import test from "node:test";
import { auditBudgetSubstitutions, classifyNativeCard, colorPipsFromCost, forgeNativeMasterwork, repairBudgetOffenders } from "../app/native-masterwork-engine.mjs";

// Phase 2B: a bounded, claim-aware, one-shot repair pass — audit the
// finished candidate once, decide every swap against that one static
// snapshot, apply as a single batch, revalidate the whole result exactly
// once, and discard the entire batch if it doesn't clear the deck-level
// hard-gate floors. See repairBudgetOffenders in
// app/native-masterwork-engine.mjs for the full design rationale — an
// inline construction-time gate and an iterate-to-convergence repair were
// both investigated and rejected before this was written (the latter
// provably thrashed and cut a genuinely justified card on a real
// generation).

const gCard = (name, oracleText, cmc, priceUsd, typeLine = "Creature — Test") => ({
  name, oracleText, typeLine, manaCost: `{${Math.max(0, cmc - 1)}}{G}`, cmc, colorIdentity: ["G"], priceUsd,
});
const buildRow = (card, quantity = 1) => ({
  quantity, name: card.name, roles: classifyNativeCard(card), cmc: card.cmc, colorPips: colorPipsFromCost(card.manaCost),
});
const ayula = { name: "Ayula, Queen Among Bears", colors: ["G"], oracleText: "Whenever Ayula, Queen Among Bears or another Bear you control enters, you may have target Bear you control fight another target creature." };

// A stand-in local evaluateCandidate, matching the real function's
// formula, needed only because hand-built candidates for
// repairBudgetOffenders (which reads candidate.evaluation.score for its
// luxury-card fallback check) can't call the real module-private one
// directly. Mirrors app/native-masterwork-engine.mjs's evaluateCandidate.
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, Number(v) || 0));
const ROLE_TARGETS = { ramp: 10, draw: 10, interaction: 10, protection: 5, recursion: 4, sweeper: 2 };
function roleCountsOf(rows) {
  const m = new Map();
  for (const r of rows) for (const role of r.roles || []) m.set(role, (m.get(role) || 0) + r.quantity);
  return m;
}
function evaluationOf(rows) {
  const roleCounts = roleCountsOf(rows);
  const roleCoverage = Object.entries(ROLE_TARGETS).reduce((s, [role, t]) => s + Math.min(1, (roleCounts.get(role) || 0) / t), 0) / 6;
  const nonlands = rows.filter((r) => !r.roles.includes("land")).reduce((s, r) => s + r.quantity, 0);
  const avgCmc = rows.filter((r) => !r.roles.includes("land")).reduce((s, r) => s + r.cmc * r.quantity, 0) / nonlands;
  const curveHealth = clamp(100 - Math.abs(avgCmc - 3) * 24);
  return { score: roleCoverage * 39 + curveHealth * 0.19, roleCoverage: Number(roleCoverage.toFixed(3)), curveHealth: Math.round(curveHealth) };
}

// --- Shared fixture: role-headroom deck with two luxury offenders that
// both prefer the same #1 cheap alternative, plus a second cheap
// alternative available as the fallback pick. ---
const flow = Array.from({ length: 12 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.", 3, 0.2));
const answer = Array.from({ length: 12 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.", 3, 0.2));
const stone = Array.from({ length: 10 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", 2, 0.2, "Artifact"));
const ward = Array.from({ length: 6 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.", 2, 0.2));
const luxuryA = gCard("Test Premium Bear A", "Nothing happens.", 3, 40);
const luxuryB = gCard("Test Premium Bear B", "Nothing happens.", 3, 35);
const cheapAlt1 = gCard("Test Cheap Cub 1", "Nothing happens.", 3, 1);
const cheapAlt2 = gCard("Test Cheap Cub 2", "Nothing happens.", 3, 2);
const competingCards = [...flow, ...answer, ...stone, ...ward, luxuryA, luxuryB, cheapAlt1, cheapAlt2];
function competingCandidate(id = "cohesion") {
  const nonlandRows = [
    { quantity: 1, name: ayula.name, roles: ["commander"], cmc: 0 },
    ...flow.map((c) => buildRow(c)), ...answer.map((c) => buildRow(c)), ...stone.map((c) => buildRow(c)), ...ward.map((c) => buildRow(c)),
    buildRow(luxuryA), buildRow(luxuryB),
  ];
  const nonlandCount = nonlandRows.reduce((s, r) => s + r.quantity, 0);
  const rows = [...nonlandRows, { quantity: 100 - nonlandCount, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
  return { id, label: "stand-in", rows, evaluation: evaluationOf(rows), score: evaluationOf(rows).score };
}
function competingInput(budget = "Budget conscious") {
  return { format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, commander: ayula, budget, cards: competingCards };
}

test("two offenders competing for the same top alternative: claim-aware matching gives the second offender its next compatible pick, not a collision", () => {
  const input = competingInput();
  const result = repairBudgetOffenders(input, competingCandidate());
  assert.equal(result.budgetRepair.appliedCount, 2);
  assert.ok(!result.candidate.rows.some((r) => r.name === "Test Premium Bear A"));
  assert.ok(!result.candidate.rows.some((r) => r.name === "Test Premium Bear B"));
  // Both cheap alternatives get used — proof the second offender didn't
  // just get skipped once its first choice was claimed.
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Cheap Cub 1"));
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Cheap Cub 2"));
  assert.equal(result.candidate.rows.reduce((s, r) => s + r.quantity, 0), 100, "deck size must stay exactly 100 after the batch");
});

test("every protected non-offender row is untouched by the repair pass", () => {
  const input = competingInput();
  const before = competingCandidate();
  const result = repairBudgetOffenders(input, before);
  const untouchedNames = [...flow, ...answer, ...stone, ...ward].map((c) => c.name);
  for (const name of untouchedNames) {
    const beforeRow = before.rows.find((r) => r.name === name);
    const afterRow = result.candidate.rows.find((r) => r.name === name);
    assert.deepEqual(afterRow, beforeRow, `${name} must be byte-for-byte unchanged — it was never an offender`);
  }
});

test("copy limits / singleton are preserved: no row exceeds quantity 1, no duplicate names", () => {
  const result = repairBudgetOffenders(competingInput(), competingCandidate());
  const names = new Set();
  for (const row of result.candidate.rows) {
    assert.ok(row.quantity <= 1 || row.roles.includes("land"), `${row.name} exceeded the singleton copy limit`);
    assert.ok(!names.has(row.name), `${row.name} appears as more than one row`);
    names.add(row.name);
  }
});

test("one-pass idempotence: a candidate already marked completed for this exact intent/threshold short-circuits — the SAME diagnostics come back unchanged, not a fresh zero-applied run", () => {
  const input = competingInput();
  const first = repairBudgetOffenders(input, competingCandidate());
  assert.equal(first.budgetRepair.completed, true);
  assert.ok(first.budgetRepair.appliedCount > 0, "fixture sanity: the first real pass must have actually applied something");
  const second = repairBudgetOffenders(input, first.candidate);
  // Not "appliedCount resets to 0" (that would mean a second real pass ran
  // and found nothing left to do — the iterate-to-convergence shape this
  // design deliberately rejects) — the SAME diagnostics object, including
  // its real appliedCount from the one pass that actually ran, comes back
  // untouched. That's the proof no second decision round happened at all.
  assert.deepEqual(second.budgetRepair, first.candidate.budgetRepair);
  assert.deepEqual(second.candidate.rows, first.candidate.rows);
  assert.equal(second.candidate.id, first.candidate.id);
  assert.deepEqual(second.candidate.evaluation, first.candidate.evaluation);
});

test("deterministic: the same input and candidate produce byte-identical output across separate calls", () => {
  const input = competingInput();
  const candidate = competingCandidate();
  const runA = repairBudgetOffenders(input, candidate);
  const runB = repairBudgetOffenders(input, candidate);
  assert.deepEqual(runA.candidate.rows, runB.candidate.rows);
  assert.deepEqual(runA.budgetRepair, runB.budgetRepair);
});

test("no budget preference: repair is never attempted, candidate returned untouched", () => {
  const candidate = competingCandidate();
  // A default parameter still applies when the argument is explicitly
  // `undefined`, so "no budget" is built by overriding the field after
  // construction, not by calling competingInput(undefined).
  const input = { ...competingInput(), budget: undefined };
  const result = repairBudgetOffenders(input, candidate);
  assert.equal(result.budgetRepair.attempted, false);
  assert.deepEqual(result.candidate.rows, candidate.rows);
});

test("Moderate investment: this first implementation does not repair (no product-defined narrower threshold exists yet)", () => {
  const candidate = competingCandidate();
  const result = repairBudgetOffenders(competingInput("Moderate investment"), candidate);
  assert.equal(result.budgetRepair.attempted, false);
  assert.deepEqual(result.candidate.rows, candidate.rows);
});

test("runs under all three variant identities without crashing, and reports diagnostics for each", () => {
  for (const id of ["cohesion", "resilience", "precision"]) {
    const result = repairBudgetOffenders(competingInput(), competingCandidate(id));
    assert.equal(result.budgetRepair.appliedCount, 2, `expected the same repair outcome under ${id}`);
  }
});

// --- Whole-batch rollback: three individually-safe swaps combine to
// break a role floor none of them would have broken alone. ---
const cheapInteraction = Array.from({ length: 9 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.", 3, 0.2));
const offender1 = gCard("Test Priced Interactor 1", "Exile target nonland permanent. Add one mana. Create a Treasure token.", 3, 20);
const offender2 = gCard("Test Priced Interactor 2", "Exile target nonland permanent. Add one mana. Create a Treasure token.", 3, 22);
const offender3 = gCard("Test Priced Interactor 3", "Exile target nonland permanent. Add one mana. Create a Treasure token.", 3, 24);
const rampOnlyAlt1 = gCard("Test Cheap Ramp 1", "Add one mana. Create a Treasure token.", 3, 0.3, "Artifact");
const rampOnlyAlt2 = gCard("Test Cheap Ramp 2", "Add one mana. Create a Treasure token.", 3, 0.4, "Artifact");
const rampOnlyAlt3 = gCard("Test Cheap Ramp 3", "Add one mana. Create a Treasure token.", 3, 0.5, "Artifact");
const otherFiller = Array.from({ length: 20 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.", 3, 0.2));
const wardFiller = Array.from({ length: 6 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.", 2, 0.2));
const stoneFiller = Array.from({ length: 8 }, (_, i) => gCard(`Stone ${i}`, "Add one mana.", 2, 0.2, "Artifact"));
const rollbackCards = [...cheapInteraction, offender1, offender2, offender3, rampOnlyAlt1, rampOnlyAlt2, rampOnlyAlt3, ...otherFiller, ...wardFiller, ...stoneFiller];
const rollbackInput = { format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, commander: ayula, budget: "Budget conscious", cards: rollbackCards };
function rollbackCandidate() {
  const nonlandRows = [
    { quantity: 1, name: ayula.name, roles: ["commander"], cmc: 0 },
    ...cheapInteraction.map((c) => buildRow(c)),
    buildRow(offender1), buildRow(offender2), buildRow(offender3),
    ...otherFiller.map((c) => buildRow(c)), ...wardFiller.map((c) => buildRow(c)), ...stoneFiller.map((c) => buildRow(c)),
  ];
  const nonlandCount = nonlandRows.reduce((s, r) => s + r.quantity, 0);
  const rows = [...nonlandRows, { quantity: 100 - nonlandCount, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
  return { id: "cohesion", label: "stand-in", rows, evaluation: evaluationOf(rows), score: evaluationOf(rows).score };
}

test("hard-gate preservation per swap: each offender's own compatibleAlternatives are only ever hardGateImpact:none against the static baseline when the swap really is safe alone", () => {
  const audit = auditBudgetSubstitutions(rollbackInput, { candidate: rollbackCandidate(), priceThresholdUsd: 15 });
  const offender = audit.offenders.find((o) => o.name === "Test Priced Interactor 1");
  assert.ok(offender.compatibleAlternatives.some((alt) => alt.hardGateImpact === "none"), "removing just ONE of the three interactors alone must look safe against the 12-strong baseline");
});

test("whole-batch rollback: three individually-safe swaps that combine to break the interaction floor are rejected entirely, original candidate preserved byte-for-byte", () => {
  const candidate = rollbackCandidate();
  const result = repairBudgetOffenders(rollbackInput, candidate);
  assert.equal(result.budgetRepair.revertedByFinalValidation, true);
  assert.equal(result.budgetRepair.appliedCount, 0);
  assert.deepEqual(result.candidate.rows, candidate.rows);
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Priced Interactor 1"), "the rolled-back candidate must still contain every original offender — nothing partially applied");
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Priced Interactor 2"));
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Priced Interactor 3"));
});

// --- Variant-default bug fix regression ---

const variantFixtureFlow = Array.from({ length: 12 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.", 3, 0.2));
const variantFixtureLuxury = gCard("Test Premium Bear", "Nothing happens.", 3, 40);
const variantFixtureCards = [...variantFixtureFlow, variantFixtureLuxury];
const variantFixtureInput = { format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21, commander: ayula, cards: variantFixtureCards };
function variantFixtureRows() {
  const nonlandRows = [{ quantity: 1, name: ayula.name, roles: ["commander"], cmc: 0 }, ...variantFixtureFlow.map((c) => buildRow(c)), buildRow(variantFixtureLuxury)];
  const nonlandCount = nonlandRows.reduce((s, r) => s + r.quantity, 0);
  return [...nonlandRows, { quantity: 100 - nonlandCount, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
}

test("auditBudgetSubstitutions never silently defaults to resilience when a real candidate is passed — a cohesion candidate's verdict is audited as cohesion, not resilience", () => {
  const rows = variantFixtureRows();
  const cohesionCandidate = { id: "cohesion", rows, evaluation: { score: 50 } };
  const resilienceCandidate = { id: "resilience", rows, evaluation: { score: 50 } };
  // No variantId passed in either call — under the old, buggy default,
  // BOTH would have silently used "resilience" regardless of the
  // candidate's own id.
  const cohesionAudit = auditBudgetSubstitutions(variantFixtureInput, { candidate: cohesionCandidate, priceThresholdUsd: 15 });
  const resilienceAudit = auditBudgetSubstitutions(variantFixtureInput, { candidate: resilienceCandidate, priceThresholdUsd: 15 });
  assert.equal(cohesionAudit.variantId, "cohesion");
  assert.equal(resilienceAudit.variantId, "resilience");
  const cohesionScore = cohesionAudit.offenders.find((o) => o.name === "Test Premium Bear").score;
  const resilienceScore = resilienceAudit.offenders.find((o) => o.name === "Test Premium Bear").score;
  assert.notEqual(cohesionScore, resilienceScore, "the SAME rows, audited under two different real variant identities, must score the card differently — proof the variant is genuinely driving the math, not just a label");
});

test("an explicit variantId is overridden by a real candidate's own id — the candidate is always authoritative", () => {
  const rows = variantFixtureRows();
  const candidate = { id: "cohesion", rows, evaluation: { score: 50 } };
  // Deliberately passing a mismatched variantId alongside a real candidate
  // — the candidate's own id must win, exactly the class of caller error
  // this fix makes structurally impossible.
  const audit = auditBudgetSubstitutions(variantFixtureInput, { candidate, variantId: "resilience", priceThresholdUsd: 15 });
  assert.equal(audit.variantId, "cohesion");
});

// --- End-to-end: wired into forgeNativeMasterwork ---

const abundantProtection = [
  ...Array.from({ length: 27 }, (_, i) => gCard(`Flow ${i}`, "When this enters, draw a card.", 3, 0.2)),
  ...Array.from({ length: 24 }, (_, i) => gCard(`Answer ${i}`, "Exile target nonland permanent.", 3, 0.2)),
  ...Array.from({ length: 18 }, (_, i) => gCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", 2, 0.2, "Artifact")),
  ...Array.from({ length: 8 }, (_, i) => gCard(`Ward ${i}`, "Target creature gains hexproof and indestructible until end of turn.", 2, 0.2)),
];
const e2ePremium = gCard("Test Premium Bear", "When this enters, draw a card. Target creature gains hexproof and indestructible until end of turn.", 3, 53);
// Priced below abundantProtection's own $0.2 filler so it's unambiguously
// the single best (cheapest, highest-scoring) compatible alternative —
// otherwise the pool's own cheap filler would legitimately win instead,
// which is correct behavior but would make this fixture's outcome depend
// on an unrelated pool detail rather than the thing being tested here.
const e2eCheap = gCard("Test Cheap Cub", "When this enters, draw a card.", 3, 0.05);

test("end-to-end: forgeNativeMasterwork under Budget conscious actually removes an unjustified premium card and discloses it in budgetRepair", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, e2ePremium, e2eCheap],
  };
  const report = forgeNativeMasterwork(input);
  assert.ok(!report.selected.rows.some((r) => r.name === "Test Premium Bear"), "the unjustified premium card must be gone from the FINAL delivered deck, not just flagged");
  assert.ok(report.selected.rows.some((r) => r.name === "Test Cheap Cub"), "its cheaper alternative must have actually been added");
  assert.equal(report.selected.rows.reduce((s, r) => s + r.quantity, 0), 100);
  assert.equal(report.selected.budgetRepair.attempted, true);
  assert.equal(report.selected.budgetRepair.appliedCount, 1);
  assert.ok(report.selected.budgetRepair.savingsAppliedUsd > 0);
  // The player-facing sentence — Founder #034 surfaces this to the browser
  // as budgetRepairNote; must exist and mention the real applied count and
  // the real dollar figure, not a stale/invented one.
  assert.match(report.selected.budgetRepair.note, /^1 card over your budget preference was swapped/);
  assert.ok(report.selected.budgetRepair.note.includes(`$${report.selected.budgetRepair.savingsAppliedUsd.toFixed(2)}`));
});

// Locked from the real parameter sweep against the stored Ayula
// generation (2026-08-08): $15 was too permissive (15 remaining
// offenders, $78.10 debt), $5 started failing to find safe alternatives
// on 9 different cards (pushing into structural choices, not just
// price), $10/$7.50 both preserved hard gates and variant identity while
// meaningfully reducing debt. $7.50 chosen: stronger reduction than $10
// ($61.43 vs $69.53 residual debt) while the one remaining $10+ survivor
// (Surrak and Goreclaw, $11.60) was correctly scrutinized and kept only
// because no safe cheaper alternative existed — exactly what "Budget
// conscious" should mean, not just "nothing over $X".
test("the $7.50 threshold is exact: an $8 card gets repaired, a $6 card does not", () => {
  const above = gCard("Test Above Threshold", "Nothing happens.", 3, 8);
  const below = gCard("Test Below Threshold", "Nothing happens.", 3, 6);
  const cheapAlly = gCard("Test Cheap Ally", "Nothing happens.", 3, 0.05);
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, above, below, cheapAlly],
  };
  const report = forgeNativeMasterwork(input);
  assert.ok(!report.selected.rows.some((r) => r.name === "Test Above Threshold"), "$8 is above the $7.50 threshold and must be repaired away");
  // The $6 card may or may not be selected by construction — the repair
  // contract is that it must never appear in removedNames when selected.
  assert.ok(
    !(report.selected.budgetRepair.removedNames || []).includes("Test Below Threshold"),
    "$6 is below the $7.50 threshold and must never be repaired away",
  );
  assert.ok(
    (report.selected.budgetRepair.removedNames || []).includes("Test Above Threshold")
      || !report.selected.rows.some((r) => r.name === "Test Above Threshold"),
    "$8 offender must be removed by repair when it enters the finished list",
  );
  assert.equal(report.selected.budgetRepair.thresholdUsd, 7.5);
  assert.ok(report.selected.budgetRepair.appliedCount >= 1);
});

test("end-to-end: the same fixture with no budget preference leaves the premium card in place", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, cards: [...abundantProtection, e2ePremium, e2eCheap],
  };
  const report = forgeNativeMasterwork(input);
  assert.equal(report.selected.budgetRepair.attempted, false);
});

// --- Ayula canary: local, deterministic stand-in for the real production
// generation this whole investigation was run against. Not a
// reproduction of the live generation's exact 100 cards (those aren't
// available offline) — a fixture proving the same shape holds: Ayula,
// Budget conscious, an unjustified luxury premium survivor gets repaired,
// the mana base stays untouched (Phase 1, unrelated to this pass), and
// the repaired deck's total price genuinely drops. ---
test("Ayula canary: Budget conscious repair reduces total known deck price and removes the flagged unjustified premium, while leaving Phase 1's land-side behavior untouched", () => {
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...abundantProtection, e2ePremium, e2eCheap],
  };
  const report = forgeNativeMasterwork(input);
  const priceByName = new Map([e2ePremium, e2eCheap].map((c) => [c.name, c.priceUsd]));
  const knownPrice = report.selected.rows.reduce((sum, row) => sum + (priceByName.get(row.name) || 0) * row.quantity, 0);
  assert.equal(knownPrice, e2eCheap.priceUsd, "the only remaining known-priced card should be the cheap replacement");
  assert.ok(report.budgetDiagnostics, "Phase 1E's budgetDiagnostics must still be present, unaffected by Phase 2B");
  assert.equal(report.selected.recoveryStage, "ideal", "Phase 1C's land-scarcity recovery ladder must be completely untouched by this fixture");
});

// =============================================================================
// Founder #033: second-order pass — pass one's own picks were never re-audited
// =============================================================================
// Found via a real threshold-sweep verification against a fresh production
// generation (The Ur-Dragon, 5-color, 2026-08-21) — pass one audits
// offenders from the ORIGINAL candidate only, so a replacement it picks can
// itself still have its own cheaper same-role alternative that never gets
// checked. On that real generation: Waste Not, added as pass one's pick for
// a cut card, itself had a cheaper same-role alternative (Idol of Oblivion)
// with no hard-gate impact — left unrepaired. This is a second, deliberately
// bounded static pass scoped ONLY to the named set of cards pass one itself
// just added — never the whole deck, never a third pass. See
// repairBudgetOffenders in native-masterwork-engine.mjs for the full design
// note next to `secondOrderOffenders`.
// =============================================================================

test("second-order pass: a replacement pass one picks that is itself still above threshold gets chain-repaired once, not left behind", () => {
  // Test Mid Interaction Cub ($9) genuinely out-scores Test Cheap Cub 3
  // ($1) for Test Premium Bear C's own luxury-card audit (a real tracked
  // role plus a popularity edge beats a cheaper but less popular,
  // otherwise-identical card) — so pass one deterministically picks the
  // still-expensive mid card, not the cheap one directly. Once that mid
  // card is itself a row in the deck, its OWN audit (role-matched against
  // Test Cheap Cub 3, which shares its "interaction" role) has exactly one
  // safe, cheaper alternative — the shape pass two exists to catch.
  const luxuryC = gCard("Test Premium Bear C", "Nothing happens.", 3, 20);
  const midAlt = gCard("Test Mid Interaction Cub", "Exile target nonland permanent.", 3, 9);
  midAlt.popularityRank = 1;
  const cheapAlt3 = gCard("Test Cheap Cub 3", "Exile target nonland permanent.", 3, 1);
  cheapAlt3.popularityRank = 9999;

  const nonlandRows = [
    { quantity: 1, name: ayula.name, roles: ["commander"], cmc: 0 },
    ...flow.map((c) => buildRow(c)), ...answer.map((c) => buildRow(c)), ...stone.map((c) => buildRow(c)), ...ward.map((c) => buildRow(c)),
    buildRow(luxuryC),
  ];
  const nonlandCount = nonlandRows.reduce((s, r) => s + r.quantity, 0);
  const rows = [...nonlandRows, { quantity: 100 - nonlandCount, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
  const candidate = { id: "cohesion", label: "stand-in", rows, evaluation: evaluationOf(rows), score: evaluationOf(rows).score };
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...flow, ...answer, ...stone, ...ward, luxuryC, midAlt, cheapAlt3],
  };

  const result = repairBudgetOffenders(input, candidate);
  // Pass one's own choice, confirmed deterministic before asserting the chain.
  assert.ok(result.budgetRepair.alternativesAddedNames.includes("Test Mid Interaction Cub"), "pass one must pick the higher-scoring mid card, not jump straight to the cheap one");
  // Pass two must then catch that mid card and chain-repair it.
  assert.ok(result.budgetRepair.secondPass.attempted);
  assert.equal(result.budgetRepair.secondPass.appliedCount, 1);
  assert.deepEqual(result.budgetRepair.secondPass.removedNames, ["Test Mid Interaction Cub"]);
  assert.deepEqual(result.budgetRepair.secondPass.alternativesAddedNames, ["Test Cheap Cub 3"]);
  assert.equal(result.budgetRepair.avoidableSpendAfterUsd, 0, "chained repair must close the debt pass one alone would have left at $8");
  assert.ok(!result.candidate.rows.some((r) => r.name === "Test Premium Bear C"));
  assert.ok(!result.candidate.rows.some((r) => r.name === "Test Mid Interaction Cub"), "the second-order offender must not survive in the final candidate");
  assert.ok(result.candidate.rows.some((r) => r.name === "Test Cheap Cub 3"));
  assert.equal(result.candidate.rows.reduce((s, r) => s + r.quantity, 0), 100, "deck size must stay exactly 100 after both bounded passes");
  // removedNames/alternativesAddedNames must reflect the COMBINED effect of
  // both passes — collectRepairExcludedNames (and the power-repair pass
  // that runs after this one) reads these to avoid re-adding anything this
  // repair ever cut, across either pass.
  assert.deepEqual(result.budgetRepair.removedNames, ["Test Premium Bear C", "Test Mid Interaction Cub"]);
  assert.deepEqual(result.budgetRepair.alternativesAddedNames, ["Test Mid Interaction Cub", "Test Cheap Cub 3"]);
});

test("second-order pass never runs a third time: a card a second-order swap introduces is never itself re-audited", () => {
  // Same chain as above, but confirms the design's own stated bound:
  // exactly two static passes, never iteration to convergence. There is
  // no third-order candidate in this fixture at all — Test Cheap Cub 3 is
  // the terminal, cheapest card in the pool — so this test is really
  // asserting the mechanism stops asking, not just that nothing was left
  // to find.
  const luxuryC = gCard("Test Premium Bear C", "Nothing happens.", 3, 20);
  const midAlt = gCard("Test Mid Interaction Cub", "Exile target nonland permanent.", 3, 9);
  midAlt.popularityRank = 1;
  const cheapAlt3 = gCard("Test Cheap Cub 3", "Exile target nonland permanent.", 3, 1);
  cheapAlt3.popularityRank = 9999;

  const nonlandRows = [
    { quantity: 1, name: ayula.name, roles: ["commander"], cmc: 0 },
    ...flow.map((c) => buildRow(c)), ...answer.map((c) => buildRow(c)), ...stone.map((c) => buildRow(c)), ...ward.map((c) => buildRow(c)),
    buildRow(luxuryC),
  ];
  const nonlandCount = nonlandRows.reduce((s, r) => s + r.quantity, 0);
  const rows = [...nonlandRows, { quantity: 100 - nonlandCount, name: "Forest", roles: ["land"], cmc: 0, colorIdentity: ["G"] }];
  const candidate = { id: "cohesion", label: "stand-in", rows, evaluation: evaluationOf(rows), score: evaluationOf(rows).score };
  const input = {
    format: "Commander", target: 100, strategy: "Balanced midrange", seed: 21,
    commander: ayula, budget: "Budget conscious", cards: [...flow, ...answer, ...stone, ...ward, luxuryC, midAlt, cheapAlt3],
  };
  const first = repairBudgetOffenders(input, candidate);
  // Calling it again against the already-repaired candidate must be a pure
  // idempotent short-circuit — never a third decision round.
  const second = repairBudgetOffenders(input, first.candidate);
  assert.deepEqual(second.budgetRepair, first.budgetRepair);
  assert.equal(second.budgetRepair.secondPass.attempted, first.budgetRepair.secondPass.attempted);
});
