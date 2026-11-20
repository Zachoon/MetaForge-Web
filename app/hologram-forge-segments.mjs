// Turns the deck profile the forge already tracks into hologram shells.
// A shell fills as its count approaches the existing target. The emblem
// is forged only when every shell, including the deck-size frame, is full.

const LABELS = Object.freeze({
  commander: ["Commander", "Cmd"],
  lands: ["Lands", "Land"],
  ramp: ["Ramp", "Ramp"],
  draw: ["Draw", "Draw"],
  interaction: ["Removal", "Cut"],
  wipes: ["Wipes", "Wipe"],
  wincons: ["Win cons", "Win"],
  protection: ["Protection", "Ward"],
  recursion: ["Recursion", "Recur"],
  synergy: ["Plan", "Plan"],
  curve: ["Curve", "Curve"],
  size: ["Deck size", "Size"],
});

function shell(id, actual, target) {
  const safeTarget = Math.max(0, Number(target) || 0);
  const safeActual = Math.max(0, Number(actual) || 0);
  const ratio = safeTarget ? Math.max(0, Math.min(1, safeActual / safeTarget)) : 0;
  const names = LABELS[id] || [id, id];
  return {
    id,
    label: names[0],
    short: names[1],
    actual: safeActual,
    target: safeTarget,
    ratio,
  };
}

/**
 * @param {{ steps?: any[], cardCount?: number }} [diagnosis]
 * @param {{ commander?: boolean, deckSize?: number, cardCount?: number }} [options]
 */
export function segmentsFromDiagnosis(diagnosis = {}, options = {}) {
  const deckSize = Math.max(1, Number(options.deckSize) || 100);
  const cardCount = Math.max(0, Number(options.cardCount ?? diagnosis.cardCount) || 0);
  const steps = Array.isArray(diagnosis.steps) ? diagnosis.steps : [];
  // Synergy is a plan-confidence count, not one of the structural slots
  // (lands, ramp, draw, removal, and the rest) the hologram is built from.
  const categories = steps
    .filter((step) => step && step.id !== "synergy" && step.status !== "waiting" && Number(step.target) > 0 && LABELS[step.id])
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((step) => shell(step.id, step.actual, step.target));
  const shells = [
    ...categories,
    shell("commander", options.commander ? 1 : 0, 1),
  ];
  const frame = shell("size", cardCount, deckSize);
  const complete = frame.ratio >= 1 && shells.every((item) => item.ratio >= 1);
  return { shells, frame, complete };
}
