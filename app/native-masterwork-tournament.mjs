// MetaForge Native Masterwork Tournament
// Hard gates reject structurally invalid lists. The surviving tradeoff frontier
// is ranked deterministically without pretending modeled quality is win rate.

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function cardQuantity(candidate) {
  return candidate.rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}

function spellNames(candidate) {
  return new Set(candidate.rows
    .filter((row) => !row.roles.includes("land") && !row.roles.includes("commander"))
    .map((row) => normalized(row.name)));
}

export function candidateSimilarity(left, right) {
  const a = spellNames(left);
  const b = spellNames(right);
  const union = new Set([...a, ...b]);
  if (!union.size) return 1;
  return round([...a].filter((name) => b.has(name)).length / union.size);
}

function hardGate(candidate, options) {
  const reasons = [];
  const target = Number(options.target || 60);
  const singleton = ["Commander", "Brawl", "Standard Brawl"].includes(options.format);
  const total = cardQuantity(candidate);
  const landCount = candidate.rows.filter((row) => row.roles.includes("land"))
    .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const landShare = total ? landCount / total : 0;
  const illegalCopies = candidate.rows.filter((row) => {
    if (row.roles.includes("land") && /^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/i.test(row.name)) return false;
    return Number(row.quantity || 0) > (singleton ? 1 : 4);
  });

  if (total !== target) reasons.push(`Deck size is ${total}; ${target} is required.`);
  if (illegalCopies.length) reasons.push(`Copy limit failed for ${illegalCopies.map((row) => row.name).join(", ")}.`);
  if (candidate.evaluation.roleCoverage < 0.45) reasons.push("Role coverage is below the 45% structural floor.");
  if (candidate.evaluation.curveHealth < 45) reasons.push("Curve health is below the 45/100 floor.");
  if (landShare < 0.28 || landShare > 0.5) reasons.push(`Mana-base share ${(landShare * 100).toFixed(0)}% is outside the bounded 28–50% gate.`);
  return { passed: reasons.length === 0, reasons, total, landCount, landShare: round(landShare) };
}

function axes(candidate) {
  const evaluation = candidate.evaluation;
  return {
    coverage: round(evaluation.roleCoverage * 100),
    curve: round(evaluation.curveHealth),
    flexibility: round(evaluation.multiRoleDensity * 100),
    cohesion: round(evaluation.cohesion || 0),
    resilience: round(evaluation.resilience || 0),
  };
}

function dominates(left, right) {
  const keys = Object.keys(left);
  return keys.every((key) => left[key] >= right[key]) && keys.some((key) => left[key] > right[key]);
}

function verdictReason(candidate, result) {
  if (!result.gate.passed) return result.gate.reasons[0];
  if (result.verdict === "advance") return `${candidate.label} advances from the nondominated frontier with ${result.axes.coverage}% role coverage, ${result.axes.curve}/100 curve health, and ${result.axes.flexibility}% multi-role density.`;
  if (result.verdict === "hold") return `${candidate.label} remains a viable tradeoff, but another candidate offers the stronger balanced structural case.`;
  return `${candidate.label} is held back because another complete candidate equals or improves every measured structural axis.`;
}

export function runNativeMasterworkTournament(candidates, options = {}) {
  if (!Array.isArray(candidates) || !candidates.length) throw new Error("Native tournament requires at least one candidate");
  const preliminary = candidates.map((candidate) => ({ candidate, gate: hardGate(candidate, options), axes: axes(candidate) }));
  for (let index = 0; index < preliminary.length; index += 1) {
    const entry = preliminary[index];
    if (!entry.gate.passed) continue;
    const duplicate = preliminary.slice(0, index).find((earlier) =>
      earlier.gate.passed && candidateSimilarity(earlier.candidate, entry.candidate) >= 0.9,
    );
    if (duplicate) {
      entry.gate.passed = false;
      entry.gate.reasons.push(`${entry.candidate.label} overlaps ${duplicate.candidate.label} by at least 90%; the Forge requires a materially different design.`);
    }
  }
  const eligible = preliminary.filter((entry) => entry.gate.passed);
  if (!eligible.length) throw new Error(`Every native candidate failed a hard gate: ${preliminary.flatMap((entry) => entry.gate.reasons).join(" ")}`);

  const frontier = eligible.filter((entry) => !eligible.some((other) => other !== entry && dominates(other.axes, entry.axes)));
  const weighted = (entry) => round(
    entry.axes.coverage * 0.34 + entry.axes.curve * 0.23 + entry.axes.flexibility * 0.18 +
    entry.axes.cohesion * 0.13 + entry.axes.resilience * 0.12,
  );
  const rankedFrontier = [...frontier].sort((left, right) => weighted(right) - weighted(left) || right.candidate.score - left.candidate.score || left.candidate.id.localeCompare(right.candidate.id));
  const winner = rankedFrontier[0];

  const results = preliminary.map((entry) => {
    const onFrontier = frontier.includes(entry);
    const verdict = !entry.gate.passed ? "reject" : entry === winner ? "advance" : onFrontier ? "hold" : "reject";
    const result = { ...entry, verdict, onFrontier, tournamentScore: entry.gate.passed ? weighted(entry) : 0 };
    return { id: entry.candidate.id, label: entry.candidate.label, verdict, onFrontier, gate: entry.gate, axes: entry.axes, tournamentScore: result.tournamentScore, reason: verdictReason(entry.candidate, result) };
  }).sort((left, right) => right.tournamentScore - left.tournamentScore || left.id.localeCompare(right.id));

  const similarities = [];
  for (let i = 0; i < candidates.length; i += 1) for (let j = i + 1; j < candidates.length; j += 1) {
    similarities.push({ pair: [candidates[i].id, candidates[j].id], similarity: candidateSimilarity(candidates[i], candidates[j]) });
  }
  return Object.freeze({ selectedId: winner.candidate.id, results, frontier: results.filter((result) => result.onFrontier).map((result) => result.id), similarities, methodology: "MetaForge applied exact-size, copy-limit, mana-share, role-coverage, and curve gates; then compared nondominated structural tradeoffs. No tournament score is a predicted win rate." });
}