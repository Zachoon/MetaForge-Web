import assert from "node:assert/strict";
import test from "node:test";
import { buildExperimentTablets } from "../app/experiment-tablet.mjs";
import { forgeNativeMasterwork } from "../app/native-masterwork-engine.mjs";

const base = [
  { quantity: 24, name: "Island", roles: ["land"], cmc: 0 },
  { quantity: 4, name: "Slow Threat", roles: ["threat"], cmc: 6 },
  { quantity: 4, name: "Weak Draw", roles: ["draw"], cmc: 3 },
  { quantity: 4, name: "Weak Interaction", roles: ["interaction"], cmc: 2 },
  { quantity: 4, name: "Ramp", roles: ["ramp"], cmc: 2 },
  { quantity: 4, name: "Shield", roles: ["protection"], cmc: 2 },
  { quantity: 4, name: "Return", roles: ["recursion"], cmc: 3 },
  { quantity: 4, name: "Sweep", roles: ["sweeper"], cmc: 4 },
  { quantity: 4, name: "Body", roles: ["threat"], cmc: 3 },
  { quantity: 4, name: "Second Body", roles: ["threat"], cmc: 3 },
];
const rival = base.map((row) => ({ ...row, roles: [...row.roles] }));
rival.find((row) => row.name === "Slow Threat").quantity = 3;
rival.find((row) => row.name === "Weak Draw").quantity = 3;
rival.find((row) => row.name === "Weak Interaction").quantity = 3;
rival.push({ quantity: 1, name: "Flexible Draw", roles: ["draw", "interaction"], cmc: 2 });

const selected = { id: "selected", rows: base };
const candidates = [selected, { id: "rival", rows: rival }];
const options = { format: "Standard", strategy: "Balanced midrange", target: 60 };

const matches = (wins, losses) => [...Array(wins)].map((_, id) => ({ id: `w${id}`, result: "win" })).concat([...Array(losses)].map((_, id) => ({ id: `l${id}`, result: "loss" })));

const aggroInteractionComplaint = () => [
  { id: "m1", result: "loss", opponent: "Aggro", signal: "I died before I could answer anything" },
  { id: "m2", result: "loss", opponent: "Aggro", signal: "I needed more early interaction" },
  { id: "m3", result: "loss", opponent: "Aggro", signal: "I needed more early interaction" },
  { id: "m4", result: "win", opponent: "Aggro", signal: "" },
];

test("tailors the recommendation to the specific opponent the deck has actually been losing to", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: aggroInteractionComplaint(), options });
  const relevant = report.tablets.find((tablet) => tablet.matchupRelevant);
  assert.ok(relevant, "expected at least one tablet to be flagged as matchup-relevant");
  assert.match(relevant.summary, /losing to against Aggro/i);
  assert.match(relevant.matchupNote, /losing to against Aggro/i);
});

test("without enough recorded matches, matchup preference stays silent and behaves exactly as before", () => {
  const withNoHistory = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  const withThinHistory = buildExperimentTablets({ selected, candidates, matchLog: [{ id: "m1", result: "loss", opponent: "Aggro", signal: "I needed more early interaction" }], options });
  assert.deepEqual(withNoHistory.tablets.map((tablet) => tablet.change), withThinHistory.tablets.map((tablet) => tablet.change));
  assert.ok(withThinHistory.tablets.every((tablet) => !tablet.matchupRelevant));
});

test("produces up to three tablets naming distinct cards", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  assert.equal(report.status, "advance");
  assert.equal(report.tablets.length, 3);
  const cuts = report.tablets.map((tablet) => tablet.change.cut);
  assert.equal(new Set(cuts).size, 3);
});

test("every tablet names a real motif from the added card's own roles", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  for (const tablet of report.tablets) {
    assert.ok(["blade", "shield", "rune", "gear", "root"].includes(tablet.motif));
  }
});

test("every tablet carries all seven required fields", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: matches(2, 1), options });
  for (const tablet of report.tablets) {
    assert.ok(tablet.fieldObservation);
    assert.ok(tablet.pressurePoint);
    assert.ok(tablet.change.cut && tablet.change.add);
    assert.match(tablet.testContract, /observed match evidence/i);
    assert.ok(tablet.expectedBenefit);
    assert.ok(tablet.tradeoff);
    assert.ok(tablet.evidenceStatus);
  }
});

test("names the structural pressure point when the causality report identifies a critical node", () => {
  const causalityReport = {
    criticalNodes: [{ name: "Slow Threat", systemName: "Aggro Core", collapseRisk: 82 }],
    bottlenecks: [],
    mostFragileSystem: null,
    headline: "",
  };
  const report = buildExperimentTablets({ selected, candidates, causalityReport, matchLog: [], options });
  const tablet = report.tablets.find((entry) => entry.change.cut === "Slow Threat");
  assert.match(tablet.pressurePoint, /leans on most/i);
  assert.match(tablet.pressurePoint, /Aggro Core/);
});

test("falls back to the most fragile system when no node names the cut card", () => {
  const causalityReport = {
    criticalNodes: [],
    bottlenecks: [],
    mostFragileSystem: { name: "Card Draw" },
    headline: "Card Draw is the clearest current structural-risk hypothesis; controlled testing is required before treating that pattern as a real-game cause.",
  };
  const report = buildExperimentTablets({ selected, candidates, causalityReport, matchLog: [], options });
  for (const tablet of report.tablets) {
    assert.equal(tablet.pressurePoint, causalityReport.headline);
  }
});

test("is honest that no structural hypothesis exists when no causality report is supplied", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  for (const tablet of report.tablets) {
    assert.match(tablet.pressurePoint, /no single weakness/i);
  }
});

test("reports no field observation instead of fabricating one when no matches are recorded", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  for (const tablet of report.tablets) {
    assert.equal(tablet.fieldObservation, "No Arena matches recorded against this build yet.");
  }
});

test("summarizes real recorded match evidence without a premature verdict", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: matches(1, 2), options });
  for (const tablet of report.tablets) {
    assert.match(tablet.fieldObservation, /1-2 across 3 recorded matches/);
    assert.equal(tablet.evidenceStatus, "early signal");
  }
});

test("offers an honest confidence tablet instead of an empty slot when no experiment clears the gates", () => {
  const identicalRival = { id: "rival", rows: base.map((row) => ({ ...row, roles: [...row.roles] })) };
  const report = buildExperimentTablets({ selected, candidates: [selected, identicalRival], matchLog: [], options });
  assert.equal(report.status, "advance");
  assert.equal(report.tablets.length, 1);
  assert.equal(report.tablets[0].type, "confidence");
  assert.match(report.tablets[0].headline, /no structural swap clears the bar/i);
  assert.ok(report.tablets[0].detail);
  // A truthy check alone passed even when detail was the literal string
  // "undefined That silence is itself a signal..." — ranked.summary was
  // missing on native-one-slot-lab.mjs's "advance" verdict, and this
  // fallback text always starts with it. Caught live before this check
  // existed; guards the actual symptom, not just presence of some string.
  assert.doesNotMatch(report.tablets[0].detail, /^undefined\b/);
});

test("surfaces a speculative experiment tablet instead of only a confidence card when the only candidate misses the gate", () => {
  const badRival = base.map((row) => ({ ...row, roles: [...row.roles] }));
  badRival.find((row) => row.name === "Weak Interaction").quantity = 3;
  badRival.push({ quantity: 1, name: "Vanilla Giant", roles: ["threat"], cmc: 8 });
  const report = buildExperimentTablets({
    selected,
    candidates: [selected, { id: "bad-rival", rows: badRival }],
    matchLog: [],
    options,
  });
  assert.equal(report.status, "advance");
  const experimentTablets = report.tablets.filter((tablet) => tablet.type === "experiment");
  assert.equal(experimentTablets.length, 1);
  assert.equal(experimentTablets[0].confident, false);
  assert.equal(experimentTablets[0].evidenceStatus, "speculative");
  assert.match(experimentTablets[0].tradeoff, /below the forge's gain threshold/i);
});

const realCard = (name, oracleText, typeLine = "Creature — Test", manaCost = "{2}{U}", colorIdentity = ["U"]) => ({ name, oracleText, typeLine, manaCost, colorIdentity });
const realPool = [
  ...Array.from({ length: 28 }, (_, i) => realCard(`Flow ${i}`, "When this enters, draw a card. Scry 1.")),
  ...Array.from({ length: 24 }, (_, i) => realCard(`Answer ${i}`, "Exile target nonland permanent.")),
  ...Array.from({ length: 18 }, (_, i) => realCard(`Shield ${i}`, "Target creature gains hexproof and indestructible until end of turn.")),
  ...Array.from({ length: 18 }, (_, i) => realCard(`Stone ${i}`, "Add one mana. Create a Treasure token.", "Artifact", "{2}")),
  ...Array.from({ length: 10 }, (_, i) => realCard(`Island Utility ${i}`, "{T}: Add {U}.", "Land", "", ["U"])),
];
const realInput = { format: "Standard", target: 60, strategy: "Balanced midrange", colors: ["U"], seed: 9, cards: realPool };

test("without an input, behaves exactly as before: no practicalEvidence field populated", () => {
  const report = buildExperimentTablets({ selected, candidates, matchLog: [], options });
  for (const tablet of report.tablets.filter((t) => t.type === "experiment")) {
    assert.equal(tablet.practicalEvidence, null);
  }
});

test("with a real input supplied, confident tablets carry real practical simulation evidence", () => {
  const report = forgeNativeMasterwork(realInput);
  const tablets = buildExperimentTablets({ selected: report.selected, candidates: report.candidates, matchLog: [], options: { format: realInput.format, strategy: realInput.strategy, target: realInput.target }, input: realInput });
  const experimentTablets = tablets.tablets.filter((t) => t.type === "experiment");
  for (const tablet of experimentTablets) {
    if (tablet.confident) {
      assert.ok(tablet.practicalEvidence, "a confident tablet must carry real practical evidence backing that confidence");
      assert.equal(tablet.practicalEvidence.passed, true);
    }
  }
});

test("with a real input supplied, a tablet that failed practical simulation explains why in its tradeoff, not just the structural gate reasons", () => {
  const report = forgeNativeMasterwork(realInput);
  const tablets = buildExperimentTablets({ selected: report.selected, candidates: report.candidates, matchLog: [], options: { format: realInput.format, strategy: realInput.strategy, target: realInput.target }, input: realInput });
  const practicallyRejected = tablets.tablets.filter((t) => t.type === "experiment" && t.practicalEvidence && !t.practicalEvidence.passed);
  for (const tablet of practicallyRejected) {
    assert.equal(tablet.confident, false);
    assert.match(tablet.tradeoff, /failed practical simulation testing/i);
  }
});

test("pads a partial set of real experiments with exactly one confidence tablet, never more", () => {
  // Two of the three "Body"/"Second Body" style rows are identical between
  // base and rival, but Slow Threat/Weak Draw/Weak Interaction differ and a
  // brand-new Flexible Draw row exists — expect fewer than three real swaps
  // to clear the gate here, padded to a stable, non-duplicated shape.
  const partialRival = base.map((row) => ({ ...row, roles: [...row.roles] }));
  partialRival.find((row) => row.name === "Slow Threat").quantity = 3;
  partialRival.push({ quantity: 1, name: "Flexible Draw", roles: ["draw", "interaction"], cmc: 2 });
  const report = buildExperimentTablets({
    selected,
    candidates: [selected, { id: "partial-rival", rows: partialRival }],
    matchLog: [],
    options,
  });
  assert.equal(report.status, "advance");
  const confidenceTablets = report.tablets.filter((tablet) => tablet.type === "confidence");
  assert.ok(confidenceTablets.length <= 1);
  assert.equal(report.tablets.length, report.tablets.filter((t) => t.type === "experiment").length + confidenceTablets.length);
  // Same "advance" + fewer-than-3-experiments shape a live deck hit —
  // confirms the confidence tablet's detail text is real, not
  // "undefined ...", specifically when verdict is "advance" (as opposed
  // to the "offers an honest confidence tablet" test above, which is the
  // "inconclusive" case that already worked before this fix).
  for (const tablet of confidenceTablets) {
    assert.doesNotMatch(tablet.detail, /undefined/);
  }
});
