// MetaForge Masterwork Visual Profile Resolver
// Deterministic: the same deck composition always resolves to the same
// motif weighting. Every motif traces back to a real structural role the
// native engine already classified on each row — nothing here is decorative
// guesswork. Starts with five motifs (blade, shield, rune, gear, root);
// tokens/spell-velocity/innovation are deliberately deferred until there's a
// real signal to key them off rather than inventing one.

export const MOTIF_ROLE_MAP = Object.freeze({
  blade: ["combat", "threat", "sacrifice"],
  shield: ["protection", "lifegain"],
  rune: ["interaction", "sweeper", "selection"],
  gear: ["artifacts", "ramp"],
  root: ["recursion", "graveyard"],
});

// Single-card version of the same real-role mapping the deck-level resolver
// uses, so a card's motif badge (e.g. on an experiment tablet) is always
// consistent with the deck identity badge — one motif vocabulary, not two.
export function motifForRoles(roles = []) {
  for (const [motif, motifRoles] of Object.entries(MOTIF_ROLE_MAP)) {
    if (roles.some((role) => motifRoles.includes(role))) return motif;
  }
  return null;
}

export const COLOR_ACCENT = Object.freeze({
  W: "#e8d9a8",
  U: "#6dddf0",
  B: "#a98fd6",
  R: "#f2895a",
  G: "#7ed6a0",
  C: "#9fb0ac",
});

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

function resolveAccent(colors = []) {
  const known = colors.filter((color) => COLOR_ACCENT[color]);
  if (!known.length) return COLOR_ACCENT.C;
  if (known.length === 1) return COLOR_ACCENT[known[0]];
  // A multicolor identity blends its two most relevant accents rather than
  // arbitrarily picking one color to represent the whole deck.
  return COLOR_ACCENT[known[0]];
}

// selectedRows: the native engine's rows for the current build — each row
// already carries `.roles` (classifyNativeCard) and `.quantity`.
// colors: the commander/pool color identity.
// revisionCount: how many revisions this Masterwork has been through —
// an honest, already-recorded signal that the deck has been refined at
// least once, without pretending to know which exact swap mattered most.
export function resolveMasterworkVisualProfile({ selectedRows = [], colors = [], revisionCount = 1 } = {}) {
  const nonlandRows = selectedRows.filter(
    (row) => !row.roles?.includes("land") && !row.roles?.includes("commander"),
  );
  const totalQuantity = nonlandRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0) || 1;

  const motifCounts = Object.fromEntries(Object.keys(MOTIF_ROLE_MAP).map((motif) => [motif, 0]));
  for (const row of nonlandRows) {
    const roles = row.roles || [];
    for (const [motif, motifRoles] of Object.entries(MOTIF_ROLE_MAP)) {
      if (roles.some((role) => motifRoles.includes(role))) {
        motifCounts[motif] += Number(row.quantity || 0);
      }
    }
  }

  const motifs = Object.entries(motifCounts)
    .map(([id, count]) => ({ id, weight: round(count / totalQuantity) }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  return Object.freeze({
    motifs,
    primaryMotif: motifs[0]?.id || null,
    accent: resolveAccent(colors),
    evolved: Number(revisionCount) > 1,
    signature: motifs.map((entry) => `${entry.id}:${entry.weight}`).join(","),
  });
}
