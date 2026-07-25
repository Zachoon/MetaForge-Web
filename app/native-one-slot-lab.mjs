// MetaForge One-Slot Counterfactual Laboratory
// Exhaustively evaluates exact nonland-for-nonland swaps between a selected
// Masterwork and its closest viable rival. Results are structural hypotheses.

const CORE_ROLES = Object.freeze(["ramp", "draw", "interaction", "protection", "recursion", "sweeper"]);
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const isLand = (row) => row.roles.includes("land");
const isCommander = (row) => row.roles.includes("commander");
const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};


function roleTargets(format, strategy) {
  const commander = format === "Commander" || format === "Brawl";
  const scale = commander ? 1 : 0.55;
  const control = /Control/i.test(strategy);
  return {
    ramp: Math.round(10 * scale), draw: Math.round(10 * scale),
    interaction: Math.round((control ? 13 : 10) * scale), protection: Math.round(5 * scale),
    recursion: Math.round(4 * scale), sweeper: Math.round((control ? 4 : 2) * scale),
  };
}

function totalCards(rows) {
  return rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}

function copyLimit(format) {
  return ["Commander", "Brawl", "Standard Brawl"].includes(format) ? 1 : 4;
}

function evaluate(rows, options) {
  const nonlands = rows.filter((row) => !isLand(row) && !isCommander(row));
  const nonlandCount = Math.max(1, nonlands.reduce((sum, row) => sum + row.quantity, 0));
  const counts = Object.fromEntries(CORE_ROLES.map((role) => [role, 0]));
  for (const row of nonlands) for (const role of row.roles) {
    if (role in counts) counts[role] += row.quantity;
  }
  const targets = roleTargets(options.format, options.strategy);
  const roleCoverage = Object.entries(targets).reduce((sum, [role, target]) => sum + Math.min(1, counts[role] / Math.max(1, target)), 0) / Object.keys(targets).length;
  const multiRoleDensity = nonlands.filter((row) => row.roles.filter((role) => CORE_ROLES.includes(role)).length >= 2)
    .reduce((sum, row) => sum + row.quantity, 0) / nonlandCount;
  const averageCmc = nonlands.reduce((sum, row) => sum + Number(row.cmc || 0) * row.quantity, 0) / nonlandCount;
  const curveIdeal = /Aggressive|Tempo/i.test(options.strategy) ? 2.5 : /Control/i.test(options.strategy) ? 3.3 : 3;
  const curveHealth = clamp(100 - Math.abs(averageCmc - curveIdeal) * 24);
  const resilienceDensity = (counts.interaction + counts.protection + counts.recursion) / nonlandCount;
  const score = roleCoverage * 50 + multiRoleDensity * 18 + curveHealth * 0.2 + clamp(resilienceDensity * 100) * 0.12;
  return {
    score: round(score), roleCoverage: round(roleCoverage), multiRoleDensity: round(multiRoleDensity),
    averageCmc: round(averageCmc, 2), curveHealth: round(curveHealth), resilienceDensity: round(resilienceDensity), roles: counts,
  };
}

function applyOneSlot(rows, cutName, addRow) {
  const next = rows.map((row) => ({ ...row, roles: [...row.roles] }));
  const cut = next.find((row) => normalized(row.name) === normalized(cutName));
  if (!cut || isLand(cut) || isCommander(cut)) return null;
  cut.quantity -= 1;
  const existing = next.find((row) => normalized(row.name) === normalized(addRow.name));
  if (existing) existing.quantity += 1;
  else next.push({ ...addRow, quantity: 1, roles: [...addRow.roles] });
  return next.filter((row) => row.quantity > 0);
}

function compare(before, after) {
  const roleDeltas = Object.fromEntries(CORE_ROLES.map((role) => [role, after.roles[role] - before.roles[role]]));
  return {
    score: round(after.score - before.score),
    roleCoverage: round(after.roleCoverage - before.roleCoverage),
    multiRoleDensity: round(after.multiRoleDensity - before.multiRoleDensity),
    curveHealth: round(after.curveHealth - before.curveHealth),
    resilienceDensity: round(after.resilienceDensity - before.resilienceDensity),
    roles: roleDeltas,
  };
}

function gateSwap(rows, before, after, delta, options) {
  const reasons = [];
  const expected = Number(options.target || totalCards(rows));
  const limit = copyLimit(options.format);
  if (totalCards(rows) !== expected) reasons.push("The swap changed deck size.");
  const illegal = rows.filter((row) => !isLand(row) && !isCommander(row) && row.quantity > limit);
  if (illegal.length) reasons.push(`The swap exceeds the copy limit for ${illegal.map((row) => row.name).join(", ")}.`);
  if (delta.roleCoverage < -0.005) reasons.push("The swap reduces required-role coverage.");
  if (delta.curveHealth < -2) reasons.push("The swap materially worsens curve health.");
  if (delta.resilienceDensity < -0.015) reasons.push("The swap materially reduces interaction, protection, or recursion density.");
  // score's components (roleCoverage, multiRoleDensity, resilienceDensity) are
  // all normalized by nonland count, so one card moves the needle far less in
  // a ~90-nonland Commander deck than a ~36-nonland 60-card deck. Scale the
  // minimum meaningful gain to the deck's real size instead of holding every
  // format to the same flat bar calibrated for 60-card decks.
  const nonlandCount = rows.filter((row) => !isLand(row) && !isCommander(row)).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const scoreFloor = 0.35 * (36 / Math.max(1, nonlandCount));
  if (delta.score < scoreFloor) reasons.push("The modeled structural gain is too small to justify a new revision.");
  return {
    passed: reasons.length === 0,
    reasons,
    openingHand: {
      verdict: "preserved",
      reason: "A nonland replaced a nonland, so deck size and land count are unchanged; therefore the opening-hand land distribution is unchanged.",
    },
    beforeScore: before.score,
    afterScore: after.score,
  };
}

function buildExperiments(selected, rival, options) {
  const selectedQuantities = new Map(selected.rows.map((row) => [normalized(row.name), row.quantity]));
  const rivalQuantities = new Map(rival.rows.map((row) => [normalized(row.name), row.quantity]));
  const cuts = selected.rows.filter((row) =>
    !isLand(row) && !isCommander(row) && row.quantity > (rivalQuantities.get(normalized(row.name)) || 0),
  );
  const additions = rival.rows.filter((row) =>
    !isLand(row) && !isCommander(row) && row.quantity > (selectedQuantities.get(normalized(row.name)) || 0),
  );
  const before = evaluate(selected.rows, options);
  const experiments = [];
  for (const cut of cuts) for (const addition of additions) {
    const rows = applyOneSlot(selected.rows, cut.name, addition);
    if (!rows) continue;
    const after = evaluate(rows, options);
    const delta = compare(before, after);
    const gate = gateSwap(rows, before, after, delta, options);
    experiments.push({ cut: cut.name, add: addition.name, cutRoles: cut.roles, addRoles: addition.roles, rows, before, after, delta, gate });
  }
  experiments.sort((left, right) => Number(right.gate.passed) - Number(left.gate.passed) || right.delta.score - left.delta.score || left.cut.localeCompare(right.cut) || left.add.localeCompare(right.add));
  return experiments;
}

export function runOneSlotCounterfactualLab(selected, candidates, reasoning, options = {}) {
  if (!selected?.rows?.length) throw new Error("One-slot laboratory requires a selected Masterwork");
  const rival = candidates.find((candidate) => candidate.id === reasoning?.rivalId);
  if (!rival) return deepFreeze({ verdict: "inconclusive", experimentsTested: 0, experiment: null, summary: "No viable rival supplied a bounded one-slot experiment.", boundary: "The Forge preserved the selected list instead of inventing an upgrade." });

  const experiments = buildExperiments(selected, rival, options);
  const best = experiments[0] || null;
  if (!best || !best.gate.passed) {
    return deepFreeze({
      verdict: "inconclusive", experimentsTested: experiments.length, experiment: best,
      summary: experiments.length ? `The Forge tested ${experiments.length} exact one-slot changes; none cleared every structural gate, so the selected Masterwork remains unchanged.` : "The rival contains no distinct nonland pair suitable for a one-slot test.",
      boundary: "No revision is created without a measurable gain and preserved structural floors.",
    });
  }
  return deepFreeze({
    verdict: "advance", experimentsTested: experiments.length, experiment: best,
    summary: `Controlled experiment: replace ${best.cut} with ${best.add}. The modeled structural score improves by ${best.delta.score.toFixed(1)} while required-role coverage, curve health, resilience density, deck size, copy limits, and opening-hand land distribution remain inside their gates.`,
    contract: "Create exactly one revision, play it as a separate test, and require observed match evidence before calling the change successful.",
    boundary: "This is a deterministic structural experiment, not proof of better match performance.",
  });
}

// Returns up to `options.limit` (default 3) passing one-slot experiments, each
// naming a distinct card to cut, so the player sees different structural
// pressure points rather than several additions competing for the same cut.
// Diffs against every other candidate in the pool (not just one designated
// rival) since real tournament candidates often differ from their single
// closest rival by only one card, which otherwise starves this of options.
export function rankOneSlotCounterfactuals(selected, candidates, options = {}) {
  if (!selected?.rows?.length) throw new Error("One-slot laboratory requires a selected Masterwork");
  const rivals = candidates.filter((candidate) => candidate.id !== selected.id);
  if (!rivals.length) {
    return deepFreeze({
      verdict: "inconclusive", experimentsTested: 0, experiments: [],
      summary: "No viable rival supplied a bounded one-slot experiment.",
      boundary: "The Forge preserved the selected list instead of inventing an upgrade.",
    });
  }

  const experiments = rivals.flatMap((rival) => buildExperiments(selected, rival, options));
  experiments.sort((left, right) => Number(right.gate.passed) - Number(left.gate.passed) || right.delta.score - left.delta.score || left.cut.localeCompare(right.cut) || left.add.localeCompare(right.add));
  const limit = options.limit || 3;
  const seenCuts = new Set();
  const distinct = [];
  for (const experiment of experiments) {
    if (!experiment.gate.passed || seenCuts.has(experiment.cut)) continue;
    seenCuts.add(experiment.cut);
    distinct.push(experiment);
    if (distinct.length >= limit) break;
  }

  if (!distinct.length) {
    return deepFreeze({
      verdict: "inconclusive", experimentsTested: experiments.length, experiments: [],
      summary: experiments.length ? `The Forge tested ${experiments.length} exact one-slot changes; none cleared every structural gate, so the selected Masterwork remains unchanged.` : "The rival contains no distinct nonland pair suitable for a one-slot test.",
      boundary: "No revision is created without a measurable gain and preserved structural floors.",
    });
  }

  return deepFreeze({
    verdict: "advance", experimentsTested: experiments.length,
    experiments: distinct.map((experiment) => ({
      cut: experiment.cut,
      add: experiment.add,
      cutRoles: experiment.cutRoles,
      addRoles: experiment.addRoles,
      delta: experiment.delta,
      gate: experiment.gate,
      summary: `Controlled experiment: replace ${experiment.cut} with ${experiment.add}. The modeled structural score improves by ${experiment.delta.score.toFixed(1)} while required-role coverage, curve health, resilience density, deck size, copy limits, and opening-hand land distribution remain inside their gates.`,
      contract: "Create exactly one revision, play it as a separate test, and require observed match evidence before calling the change successful.",
    })),
    boundary: "These are deterministic structural experiments, not proof of better match performance.",
  });
}