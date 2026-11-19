// MF-DECK-COACH-003 — transparent plan read (Phase 2) and player intent
// (Phase 3). Offline, from the Scryfall snapshots in tests/fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseDecklist, playedEntries } from "../app/deck-check-parse.mjs";
import { factFor, indexFact } from "../app/deck-check-facts.mjs";
import { buildDeckCheckReport, comparePlayerSwap } from "../app/deck-check-report.mjs";
import { PLAN_CHOICES, readDeckPlan } from "../app/deck-plan-read.mjs";

function load(dir, name) {
  const base = new URL(`./fixtures/${dir}/`, import.meta.url);
  const snapshot = JSON.parse(readFileSync(new URL(`${name}.facts.json`, base), "utf8"));
  const facts = {};
  for (const fact of Object.values(snapshot.facts)) indexFact(facts, fact);
  const parsed = parseDecklist(readFileSync(new URL(`${name}.txt`, base), "utf8"));
  return { parsed, facts, notFound: snapshot.notFound };
}
const report = (dir, name, extra = {}) => {
  const { parsed, facts, notFound } = load(dir, name);
  return buildDeckCheckReport({ parsed, facts, notFound, ...extra });
};
function planOf(dir, name) {
  const { parsed, facts } = load(dir, name);
  const commanderKeys = new Set(parsed.commanderNames.map((entry) => entry.toLowerCase()));
  const commanders = parsed.commanderNames.map((entry) => factFor(facts, entry)).filter(Boolean);
  const cards = playedEntries(parsed).filter((entry) => !commanderKeys.has(entry.name.toLowerCase())).map((entry) => ({ ...factFor(facts, entry.name), quantity: entry.quantity })).filter((card) => card.name);
  return readDeckPlan({ commanders, cards });
}

// ---------------------------------------------------------------- Phase 2

test("Ghalta reads as big creatures, from its own text and the deck", () => {
  const plan = planOf("deck-bench", "ghalta-stompy");
  assert.equal(plan.primary.id, "big-creatures");
  assert.equal(plan.primary.source, "commander-and-deck");
  assert.match(plan.primary.evidence.join(" "), /total power of creatures you control/);
  assert.match(plan.primary.evidence.join(" "), /creatures costing 6 or more in the list/);
});

test("Sram reads as Equipment with Auras as the second plan", () => {
  const plan = planOf("deck-bench", "sram-voltron");
  assert.equal(plan.primary.id, "equipment");
  assert.equal(plan.secondary.id, "auras");
  assert.match(plan.primary.evidence.join(" "), /Whenever you cast an Aura, Equipment, or Vehicle spell/);
});

test("Tymna's lifelink is not a life-gain plan; Thrasios + Tymna is an honest 'no single plan' with a named combo finish", () => {
  const plan = planOf("deck-bench", "thrasios-tymna-partners");
  assert.equal(plan.commanderRead.raw.id, "lifegain", "the raw commander read, kept for the record");
  assert.equal(plan.primary.id, "midrange");
  assert.equal(plan.primary.confidence, "low");
  assert.match(plan.primary.evidence.join(" "), /Lifelink on the commander is not a life-gain plan/);
  assert.equal(plan.secondary.id, "combo");
  assert.equal(plan.secondary.banded, false);
  const shown = report("deck-bench", "thrasios-tymna-partners");
  assert.equal(shown.plan.confidence.level, "low", "the coach no longer calls this read high confidence");
});

test("a Background does not make an enchantment plan, and an unclear deck is not given one", () => {
  const plan = planOf("deck-bench", "wilson-background");
  assert.equal(plan.primary.id, "midrange");
  assert.notEqual(plan.primary.id, "enchantress");
});

test("plans read from text that the deck confirms are high confidence, and every plan carries evidence", () => {
  for (const [dir, name, id] of [["deck-coach", "ezuri-elves-needs-work", "typal"], ["deck-bench", "tatyova-landfall", "landfall"], ["deck-bench", "meren-aristocrats", "aristocrats"], ["deck-bench", "brago-blink", "blink"], ["deck-bench", "urza-artifacts", "artifacts"], ["deck-bench", "sythis-enchantress", "enchantress"]]) {
    const plan = planOf(dir, name);
    assert.equal(plan.primary.id, id, name);
    assert.equal(plan.primary.confidence, "high", name);
    assert.ok(plan.primary.evidence.length >= 2, name);
  }
});

test("the report exposes the plan's source, evidence, signals and the choices a player can pick", () => {
  const shown = report("deck-bench", "sram-voltron");
  assert.equal(shown.plan.source, "commander-and-deck");
  assert.equal(shown.plan.readConfidence, "high");
  assert.ok(shown.plan.evidence.length >= 2);
  assert.ok(shown.plan.signals.some((signal) => signal.id === "equipment" && signal.count === 12));
  assert.deepEqual(shown.plan.choices.map((choice) => choice.id), PLAN_CHOICES.map((choice) => choice.id));
  assert.equal(shown.plan.confirmed, false);
});

test("a player-confirmed plan replaces the read, is labelled as the player's, and changes the coaching", () => {
  const read = report("deck-bench", "wilson-background");
  const confirmed = report("deck-bench", "wilson-background", { confirmedPlan: "equipment" });
  assert.equal(confirmed.plan.confirmed, true);
  assert.equal(confirmed.plan.source, "player");
  assert.equal(confirmed.plan.readConfidence, "player-confirmed");
  assert.equal(confirmed.plan.sentence, "You confirmed the plan: Equipment. The counts and suggestions below use it.");
  assert.equal(confirmed.plan.bandId, "equipment");
  assert.notDeepEqual(confirmed.roles.map((role) => `${role.id}:${role.min}-${role.max}`), read.roles.map((role) => `${role.id}:${role.min}-${role.max}`), "the bands follow the confirmed plan");
  const unknown = report("deck-bench", "wilson-background", { confirmedPlan: "not-a-plan" });
  assert.equal(unknown.plan.confirmed, false, "an unknown plan id is ignored");
});

test("a confirmed go-wide plan is never offered a symmetric wipe", () => {
  const shown = report("deck-bench", "atraxa-counters", { confirmedPlan: "tokens" });
  const adds = [...shown.comparisons.map((entry) => entry.add), ...shown.suggestedAdds.map((entry) => entry.add)];
  for (const add of ["Blasphemous Act", "Wrath of God", "Damnation", "Toxic Deluge"]) assert.ok(!adds.includes(add), add);
});

// ---------------------------------------------------------------- Phase 3

test("a protected card is never suggested as a cut; the next safe cut is used instead", () => {
  const before = report("deck-coach", "ezuri-elves-needs-work");
  assert.equal(before.comparisons[0].cut, "Thragtusk");
  const after = report("deck-coach", "ezuri-elves-needs-work", { protectedNames: ["Thragtusk"] });
  assert.deepEqual(after.protectedNames, ["Thragtusk"]);
  for (const comparison of after.comparisons) assert.notEqual(comparison.cut, "Thragtusk");
});

test("when every card is protected, Deck Check declines to name a cut and still offers what to test", () => {
  const { parsed } = load("deck-coach", "ezuri-elves-needs-work");
  const everything = playedEntries(parsed).map((entry) => entry.name);
  const shown = report("deck-coach", "ezuri-elves-needs-work", { protectedNames: everything });
  assert.equal(shown.comparisons.length, 0, "no cut is named");
  assert.ok(shown.suggestedAdds.length > 0, "adds are still offered for the player to test");
  for (const finding of shown.weaknesses) assert.doesNotMatch(finding.change || "", /^Swap /);
});

test("names that are not in the list are not 'protected'", () => {
  const shown = report("deck-coach", "ezuri-elves-needs-work", { protectedNames: ["Black Lotus", "thragtusk"] });
  assert.deepEqual(shown.protectedNames, ["Thragtusk"]);
});

test("testing a change never edits the player's list, and a protected cut is called out", () => {
  const { parsed, facts } = load("deck-bench", "edgar-no-interaction");
  const snapshot = JSON.stringify(parsed);
  const catalog = JSON.parse(readFileSync(new URL("./fixtures/deck-bench/swap-catalog.facts.json", import.meta.url), "utf8")).facts;
  const result = comparePlayerSwap({ parsed, facts, cut: "Bloodlord of Vaasgoth", addFact: catalog["Chaos Warp"], protectedNames: ["Bloodlord of Vaasgoth"] });
  assert.equal(result.ok, true);
  assert.match(result.comparison.cutFlag, /You marked Bloodlord of Vaasgoth as protected/);
  assert.equal(JSON.stringify(parsed), snapshot, "the parsed list is untouched");
  assert.match(result.comparison.afterText, /Chaos Warp/, "the change lives only in the copy");
});

test("suggested adds come from real card data and are legal in the deck's colors", () => {
  const catalog = JSON.parse(readFileSync(new URL("./fixtures/deck-bench/swap-catalog.facts.json", import.meta.url), "utf8")).facts;
  for (const [dir, name] of [["deck-coach", "ezuri-elves-needs-work"], ["deck-bench", "edgar-no-interaction"], ["deck-bench", "meren-aristocrats"]]) {
    const shown = report(dir, name);
    const identity = new Set(shown.identity);
    for (const add of [...shown.comparisons.map((entry) => entry.add), ...shown.suggestedAdds.map((entry) => entry.add)]) {
      const fact = catalog[add];
      assert.ok(fact, `${add} has Scryfall facts`);
      assert.equal(fact.legalities.commander, "legal", add);
      assert.ok(fact.colorIdentity.every((color) => identity.has(color)), `${add} fits ${name}`);
    }
  }
});
