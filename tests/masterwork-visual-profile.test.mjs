import assert from "node:assert/strict";
import test from "node:test";
import { resolveMasterworkVisualProfile } from "../app/masterwork-visual-profile.mjs";

const row = (name, roles, quantity = 4) => ({ name, roles, quantity, cmc: 2 });

test("is deterministic for the same deck composition", () => {
  const selectedRows = [row("Island", ["land"], 24), row("Slash", ["combat", "threat"])];
  const first = resolveMasterworkVisualProfile({ selectedRows, colors: ["R"], revisionCount: 1 });
  const second = resolveMasterworkVisualProfile({ selectedRows, colors: ["R"], revisionCount: 1 });
  assert.deepEqual(first, second);
});

test("ranks the motif with the most real structural weight first", () => {
  const selectedRows = [
    row("Island", ["land"], 24),
    row("Slash", ["combat", "threat"], 12),
    row("Ward", ["protection"], 4),
  ];
  const profile = resolveMasterworkVisualProfile({ selectedRows, colors: ["R"], revisionCount: 1 });
  assert.equal(profile.primaryMotif, "blade");
  assert.ok(profile.motifs[0].weight > profile.motifs[1].weight);
});

test("never invents a motif with no structural support", () => {
  const selectedRows = [row("Island", ["land"], 60)];
  const profile = resolveMasterworkVisualProfile({ selectedRows, colors: [], revisionCount: 1 });
  assert.deepEqual(profile.motifs, []);
  assert.equal(profile.primaryMotif, null);
});

test("excludes lands and the commander from the structural weighting", () => {
  const selectedRows = [
    row("Island", ["land"], 30),
    row("Some Commander", ["commander"], 1),
    row("Root Weaver", ["recursion"], 4),
  ];
  const profile = resolveMasterworkVisualProfile({ selectedRows, colors: [], revisionCount: 1 });
  assert.equal(profile.primaryMotif, "root");
  assert.equal(profile.motifs[0].weight, 1);
});

test("resolves a color-identity accent, falling back to a neutral tone", () => {
  const selectedRows = [row("Island", ["land"], 60)];
  assert.equal(resolveMasterworkVisualProfile({ selectedRows, colors: ["U"] }).accent, "#6dddf0");
  assert.equal(resolveMasterworkVisualProfile({ selectedRows, colors: [] }).accent, "#9fb0ac");
});

test("marks a deck as evolved only once it has real revision history, not fabricated", () => {
  const selectedRows = [row("Island", ["land"], 60)];
  assert.equal(resolveMasterworkVisualProfile({ selectedRows, revisionCount: 1 }).evolved, false);
  assert.equal(resolveMasterworkVisualProfile({ selectedRows, revisionCount: 2 }).evolved, true);
});
