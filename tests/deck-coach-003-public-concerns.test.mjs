// MF-DECK-COACH-003, public concerns 2 and 3 (concern 1 is in
// tests/public-report-land-count.test.mjs). Card text from Scryfall
// snapshots; offline.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyNativeCard } from "../app/card-role-classification.mjs";
import { buildManaBaseCoaching } from "../app/mana-base-coach.mjs";
import { parseDecklist } from "../app/deck-check-parse.mjs";
import { indexFact } from "../app/deck-check-facts.mjs";
import { buildDeckCheckReport } from "../app/deck-check-report.mjs";

const read = (dir, name) => {
  const base = new URL(`./fixtures/${dir}/`, import.meta.url);
  const snapshot = JSON.parse(readFileSync(new URL(`${name}.facts.json`, base), "utf8"));
  const facts = {};
  for (const fact of Object.values(snapshot.facts)) indexFact(facts, fact);
  return { parsed: parseDecklist(readFileSync(new URL(`${name}.txt`, base), "utf8")), facts, raw: snapshot.facts, notFound: snapshot.notFound };
};

// ---------------------------------------------------------------- concern 2

test("in the browser path (no tag database), Sol Ring and other symbol rocks and dorks are ramp", () => {
  const cards = [
    ["Sol Ring", "Artifact", "{T}: Add {C}{C}."],
    ["Mind Stone", "Artifact", "{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card."],
    ["Llanowar Elves", "Creature — Elf Druid", "{T}: Add {G}."],
    ["Talisman of Dominance", "Artifact", "{T}: Add {U} or {B}. Talisman of Dominance deals 1 damage to you."],
    ["Thran Dynamo", "Artifact", "{T}: Add {C}{C}{C}."],
  ];
  for (const [name, typeLine, oracleText] of cards) {
    const roles = classifyNativeCard({ name, typeLine, oracleText });
    assert.ok(roles.includes("ramp"), `${name}: ${roles}`);
  }
  assert.deepEqual(classifyNativeCard({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." }), ["artifacts", "ramp"]);
});

test("a land is not ramp, and paying life to a pain land or Talisman is not interaction", () => {
  assert.deepEqual(classifyNativeCard({ name: "Forest", typeLine: "Basic Land — Forest", oracleText: "({T}: Add {G}.)" }), ["land"]);
  assert.deepEqual(classifyNativeCard({ name: "Llanowar Wastes", typeLine: "Land", oracleText: "{T}: Add {C}.\n{T}: Add {B} or {G}. Llanowar Wastes deals 1 damage to you." }), ["land"]);
  assert.ok(!classifyNativeCard({ name: "Talisman of Dominance", typeLine: "Artifact", oracleText: "{T}: Add {U} or {B}. Talisman of Dominance deals 1 damage to you." }).includes("interaction"));
  assert.ok(classifyNativeCard({ name: "Lightning Bolt", typeLine: "Instant", oracleText: "Lightning Bolt deals 3 damage to any target." }).includes("interaction"));
});

test("a filter-only rock is still not ramp (the existing isManaFilterOnly guard holds)", () => {
  const roles = classifyNativeCard({ name: "Filter Rock", typeLine: "Artifact", oracleText: "{1}, {T}: Add {W}{U}." });
  assert.ok(!roles.includes("ramp"), String(roles));
});

// ---------------------------------------------------------------- concern 3

test("the real Baru list (38 lands, 4.11 curve) is not told it has too many lands", () => {
  const { parsed, facts, notFound } = read("deck-bench-003", "baru-public-report");
  const report = buildDeckCheckReport({ parsed, facts, notFound });
  assert.equal(report.mana.lands.count, 38);
  assert.equal(report.mana.lands.targetLow, 34, "full ramp credit");
  assert.equal(report.mana.lands.targetHigh, 40, "no ramp credit");
  assert.equal(report.mana.lands.creditedHigh, 36);
  assert.equal(report.mana.lands.status, "ok");
  assert.doesNotMatch(report.mana.lands.summary, /more than the/);
});

test("a land-light list is still short, and a far-over list is still over", () => {
  const light = read("deck-bench", "ghalta-land-light");
  const lightReport = buildDeckCheckReport({ parsed: light.parsed, facts: light.facts, notFound: light.notFound });
  assert.equal(lightReport.mana.lands.status, "short");
  const heavy = read("deck-bench", "tatyova-landfall");
  const heavyReport = buildDeckCheckReport({ parsed: heavy.parsed, facts: heavy.facts, notFound: heavy.notFound });
  assert.equal(heavyReport.mana.lands.count, 52);
  assert.equal(heavyReport.mana.lands.status, "over", "52 lands is past even the uncredited band");
});

test("the mana coach reports the inputs behind the band", () => {
  const { raw } = read("deck-bench-003", "baru-public-report");
  const cards = Object.values(raw).filter((fact) => fact.name !== "Baru, Wurmspeaker").map((fact) => ({ ...fact, quantity: fact.name === "Forest" ? 37 : 1 }));
  const report = buildManaBaseCoaching({ commander: raw["Baru, Wurmspeaker"], cards });
  for (const key of ["averageCmc", "earlyRocks", "landRamp", "creditedHigh", "baselineLow", "baselineHigh", "rockRelief", "rampRelief", "commanderCmc"]) {
    assert.ok(key in report.lands, key);
  }
});
