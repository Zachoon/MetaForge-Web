// Native Masterwork Counterfactual Reasoning
// Explains structural tradeoffs between already-complete candidates. It does
// not claim that a modeled difference causes wins or predicts performance.

const AXIS_LABELS = Object.freeze({
  coverage: "role coverage",
  curve: "curve health",
  flexibility: "multi-role flexibility",
  cohesion: "package cohesion",
  resilience: "structural resilience",
});

const spellMap = (candidate) => new Map(candidate.rows
  .filter((row) => !row.roles.includes("land") && !row.roles.includes("commander"))
  .map((row) => [row.name, row]));

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

export function explainNativeMasterworkDecision(candidates, tournament) {
  const selected = candidates.find((candidate) => candidate.id === tournament.selectedId);
  if (!selected) throw new Error("Counterfactual reasoning requires the selected candidate");
  const selectedVerdict = tournament.results.find((result) => result.id === selected.id);
  const alternatives = candidates
    .filter((candidate) => candidate.id !== selected.id)
    .map((candidate) => ({
      candidate,
      verdict: tournament.results.find((result) => result.id === candidate.id),
      similarity: tournament.similarities.find((entry) => entry.pair.includes(selected.id) && entry.pair.includes(candidate.id))?.similarity || 0,
    }))
    .sort((left, right) => Number(right.verdict?.gate.passed) - Number(left.verdict?.gate.passed) || right.similarity - left.similarity || left.candidate.id.localeCompare(right.candidate.id));
  const rival = alternatives[0] || null;
  if (!rival) return freeze({ selectedId: selected.id, rivalId: null, additions: [], removals: [], gains: [], tradeoffs: [], summary: `${selected.label} is the only complete candidate available for structural comparison.`, boundary: "No real-game causal or performance claim is made." });

  const selectedCards = spellMap(selected);
  const rivalCards = spellMap(rival.candidate);
  const additions = [...selectedCards.keys()].filter((name) => !rivalCards.has(name)).slice(0, 6);
  const removals = [...rivalCards.keys()].filter((name) => !selectedCards.has(name)).slice(0, 6);
  const rivalVerdict = rival.verdict;
  const deltas = Object.keys(AXIS_LABELS).map((axis) => ({
    axis,
    label: AXIS_LABELS[axis],
    delta: Number((selectedVerdict.axes[axis] - rivalVerdict.axes[axis]).toFixed(1)),
  }));
  const gains = deltas.filter((entry) => entry.delta > 0).sort((a, b) => b.delta - a.delta || a.axis.localeCompare(b.axis));
  const tradeoffs = deltas.filter((entry) => entry.delta < 0).sort((a, b) => a.delta - b.delta || a.axis.localeCompare(b.axis));
  const leadingGain = gains[0];
  const leadingTradeoff = tradeoffs[0];
  const summary = [
    `${selected.label} advanced over the closest viable comparison, ${rival.candidate.label}.`,
    leadingGain ? `Its clearest modeled gain is ${leadingGain.label} (+${leadingGain.delta}).` : "It advances through the balanced tournament score rather than dominance on one axis.",
    leadingTradeoff ? `The cost is ${leadingTradeoff.label} (${leadingTradeoff.delta}); preserve that as a testing question.` : "No measured structural axis is lower in this comparison.",
    `${additions.length} selected spell${additions.length === 1 ? "" : "s"} differ from that rival.`,
  ].join(" ");

  return freeze({
    selectedId: selected.id,
    rivalId: rival.candidate.id,
    rivalLabel: rival.candidate.label,
    similarity: rival.similarity,
    additions,
    removals,
    gains,
    tradeoffs,
    summary,
    boundary: "This counterfactual compares deterministic deck structures. It does not prove causation, predict match results, or call a deck perfect.",
  });
}