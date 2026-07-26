import assert from "node:assert/strict";
import test from "node:test";
import { computePlayerIdentity, diffPlayerIdentity } from "../app/player-identity.mjs";

const family = (overrides = {}) => ({
  id: overrides.id || "f1",
  format: overrides.format || "Commander",
  strategy: overrides.strategy || "Balanced midrange",
  commander: overrides.commander || { name: "Test Commander", colors: ["U", "B"] },
  archived: overrides.archived || false,
  revisions: overrides.revisions || [{ deck: "1 Island", note: "", createdAt: "", matches: [] }],
});

test("is honest that nothing is known yet with no saved families", () => {
  const identity = computePlayerIdentity({ families: [] });
  assert.equal(identity.dominantColors.length, 0);
  assert.equal(identity.dominantMotif, null);
  assert.equal(identity.style, null);
  assert.equal(identity.temper, "unproven");
  assert.equal(identity.depth, 0);
  assert.equal(identity.nextMilestone.id, "first-spark");
});

test("resolves dominant colors from saved commander color identities", () => {
  const identity = computePlayerIdentity({
    families: [
      family({ id: "a", commander: { name: "A", colors: ["U", "B"] } }),
      family({ id: "b", commander: { name: "B", colors: ["U"] } }),
    ],
  });
  assert.deepEqual(identity.dominantColors, ["U", "B"]);
  assert.equal(identity.accent, "#6dddf0");
});

test("only reports a dominant motif once the player has actually explored a deck's structure", () => {
  const noMotif = computePlayerIdentity({ families: [family()], motifWeightsByFamily: {} });
  assert.equal(noMotif.dominantMotif, null);

  const withMotif = computePlayerIdentity({
    families: [family()],
    motifWeightsByFamily: { f1: { rune: 0.7, gear: 0.3 } },
  });
  assert.equal(withMotif.dominantMotif, "rune");
  assert.equal(withMotif.motifWeights.rune, 0.7);
});

test("combines motif weights across every deck the player has inspected", () => {
  const identity = computePlayerIdentity({
    families: [family({ id: "a" }), family({ id: "b" })],
    motifWeightsByFamily: {
      a: { blade: 1 },
      b: { blade: 0.2, root: 0.8 },
    },
  });
  assert.equal(identity.dominantMotif, "blade");
});

test("classifies experimentation style from real revision counts, not a guess", () => {
  const curator = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: [] }] })],
  });
  assert.equal(curator.style, "curator");

  const tinkerer = computePlayerIdentity({
    families: [
      family({
        revisions: [
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
        ],
      }),
    ],
  });
  assert.equal(tinkerer.style, "tinkerer");
});

test("refuses to call a temper from fewer than four recorded matches", () => {
  const matches = (wins, losses) =>
    [...Array(wins)].map((_, i) => ({ id: `w${i}`, result: "win" })).concat([...Array(losses)].map((_, i) => ({ id: `l${i}`, result: "loss" })));
  const thin = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: matches(3, 0) }] })],
  });
  assert.equal(thin.temper, "unproven");

  const proven = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: matches(4, 1) }] })],
  });
  assert.equal(proven.temper, "tempered");
});

test("counts milestones as real, ordered, already-true facts rather than an arbitrary level", () => {
  const identity = computePlayerIdentity({
    families: [
      family({ id: "a", archived: true, revisions: Array.from({ length: 6 }, () => ({ deck: "1 Island", note: "", matches: [] })) }),
    ],
  });
  assert.ok(identity.depth >= 3);
  assert.ok(identity.milestonesReached.some((m) => m.id === "first-masterwork"));
  assert.ok(identity.milestonesReached.some((m) => m.id === "five-experiments"));
});

test("diffPlayerIdentity: reports no change with no previous baseline", () => {
  const diff = diffPlayerIdentity(null, computePlayerIdentity({ families: [] }));
  assert.equal(diff.changed, false);
  assert.deepEqual(diff.newMilestones, []);
});

test("diffPlayerIdentity: reports no change between identical identities", () => {
  const identity = computePlayerIdentity({ families: [family()] });
  const diff = diffPlayerIdentity(identity, identity);
  assert.equal(diff.changed, false);
});

test("diffPlayerIdentity: reports a newly reached milestone as a gain", () => {
  const before = computePlayerIdentity({ families: [] });
  const after = computePlayerIdentity({
    families: [
      family({
        revisions: [
          { deck: "1 Island", note: "", matches: [{ id: "w0", result: "win" }] },
        ],
      }),
    ],
  });
  const diff = diffPlayerIdentity(before, after);
  assert.equal(diff.changed, true);
  assert.ok(diff.newMilestones.some((milestone) => milestone.id === "first-spark"));
});

test("diffPlayerIdentity: does not report a milestone that regresses", () => {
  const withMilestone = computePlayerIdentity({
    families: [family({ archived: true })],
  });
  const withoutMilestone = computePlayerIdentity({
    families: [family({ archived: false })],
  });
  const diff = diffPlayerIdentity(withMilestone, withoutMilestone);
  assert.equal(diff.newMilestones.length, 0);
});

test("diffPlayerIdentity: reports a temper transition in either direction", () => {
  const matches = (wins, losses) =>
    [...Array(wins)].map((_, i) => ({ id: `w${i}`, result: "win" })).concat([...Array(losses)].map((_, i) => ({ id: `l${i}`, result: "loss" })));
  const unproven = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: matches(2, 0) }] })],
  });
  const tempered = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: matches(4, 1) }] })],
  });
  const up = diffPlayerIdentity(unproven, tempered);
  assert.equal(up.temperChanged, true);
  const down = diffPlayerIdentity(tempered, unproven);
  assert.equal(down.temperChanged, true);
});

test("diffPlayerIdentity: reports a motif reveal and a later motif change", () => {
  const hidden = computePlayerIdentity({ families: [family()], motifWeightsByFamily: {} });
  const revealed = computePlayerIdentity({
    families: [family()],
    motifWeightsByFamily: { f1: { rune: 1 } },
  });
  const revealDiff = diffPlayerIdentity(hidden, revealed);
  assert.equal(revealDiff.motifRevealed, true);
  assert.equal(revealDiff.motifChanged, false);

  const changed = computePlayerIdentity({
    families: [family()],
    motifWeightsByFamily: { f1: { blade: 1 } },
  });
  const changeDiff = diffPlayerIdentity(revealed, changed);
  assert.equal(changeDiff.motifRevealed, false);
  assert.equal(changeDiff.motifChanged, true);
});

test("diffPlayerIdentity: reports a style change", () => {
  const curator = computePlayerIdentity({
    families: [family({ revisions: [{ deck: "1 Island", note: "", matches: [] }] })],
  });
  const tinkerer = computePlayerIdentity({
    families: [
      family({
        revisions: [
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
          { deck: "1 Island", note: "", matches: [] },
        ],
      }),
    ],
  });
  const diff = diffPlayerIdentity(curator, tinkerer);
  assert.equal(diff.styleChanged, true);
});
