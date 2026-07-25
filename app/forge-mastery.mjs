// Forge Mastery record: a minimal, honest evidence summary. Every number is
// counted directly from persisted matches, revisions, and archived
// families — never an arbitrary point value or predicted score. Deliberately
// not an XP system: the Forge shows what actually happened, not a made-up
// progress bar.

export function computeMastery(families = []) {
  const revisions = families.flatMap((family) => family.revisions || []);
  const matches = revisions.flatMap((revision) => revision.matches || []);
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  const experimentsAccepted = families.reduce(
    (sum, family) => sum + Math.max(0, (family.revisions?.length || 1) - 1),
    0,
  );
  const finished = families.filter((family) => family.archived).length;
  const active = families.length - finished;
  const formats = new Set(families.map((family) => family.format).filter(Boolean));
  const strategies = new Set(families.map((family) => family.strategy).filter(Boolean));
  return {
    totalMatches: wins + losses,
    wins,
    losses,
    experimentsAccepted,
    finished,
    active,
    distinctFormats: formats.size,
    distinctStrategies: strategies.size,
  };
}
