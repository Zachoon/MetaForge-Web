import { buildPackageState, evaluatePackageHealth } from "./package-plan-optimizer.mjs";
import { expensiveThreatSupport } from "./strategic-intent.mjs";

// =============================================================================
// Commander Torture Bench Audit
// =============================================================================
// Structural scorecards + prospective/retrospective disagreement classification.
// Failures are useful data — do not lower standards to force green.
// =============================================================================

export const TORTURE_BENCH_VERSION = "torture-bench-v1";

const normalized = (value = "") => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function nonlands(rows = []) {
  return rows.filter((row) => !(row.roles || []).includes("land") && !(row.roles || []).includes("commander"));
}

/**
 * Compare pick-time prospective belief vs finished-deck justification.
 */
export function auditProspectiveRetrospectiveDisagreement(candidate, intent = {}) {
  const ledger = candidate.slotJustificationLedger;
  const rows = nonlands(candidate.rows || []);
  const disagreements = [];

  for (const row of rows) {
    const prospective = row.prospectiveDelta;
    if (!prospective) continue;
    const slot = ledger?.byName?.[normalized(row.name)];
    if (!slot) continue;

    const pickTotal = Number(prospective.total) || 0;
    const finalStrength = Number(slot.strength) || 0;
    const becameRedundant = Boolean(slot.flags?.redundant) && pickTotal >= 20;
    const becameWeak = Boolean(slot.flags?.weaklyJustified || slot.flags?.rawPowerDominant) && pickTotal >= 18;
    const becameCritical = Boolean(slot.flags?.packageCritical) && pickTotal < 12;
    const overSupplyLater = Boolean(slot.flags?.overSupported) && (prospective.deficitsFilled || []).some((entry) => /package_core/.test(entry));

    let kind = null;
    if (becameRedundant) kind = "early_value_became_redundant";
    else if (becameWeak) kind = "strong_pick_finished_weak";
    else if (becameCritical) kind = "weak_pick_became_package_critical";
    else if (overSupplyLater) kind = "deficit_fill_became_oversupply";
    else if (pickTotal >= 25 && finalStrength < 20) kind = "prospective_overestimated_contribution";
    else if (pickTotal <= 5 && finalStrength >= 55) kind = "prospective_underestimated_contribution";

    if (!kind) continue;
    disagreements.push(Object.freeze({
      name: row.name,
      kind,
      pickTotal: round(pickTotal),
      finalStrength: round(finalStrength),
      deficitsFilled: Object.freeze([...(prospective.deficitsFilled || [])]),
      flags: slot.flags,
      // Not every disagreement is a bug — these are diagnostic classes.
      severity: kind === "strong_pick_finished_weak" || kind === "early_value_became_redundant" ? "warning" : "info",
    }));
  }

  return Object.freeze({
    count: disagreements.length,
    warnings: disagreements.filter((entry) => entry.severity === "warning").length,
    items: Object.freeze(disagreements.sort((a, b) => a.name.localeCompare(b.name))),
  });
}

function commanderAlignment(candidate, fixture, intent) {
  const rows = nonlands(candidate.rows || []);
  const connected = rows.filter((row) => (row.commanderConnectionSignals || []).length > 0).length;
  const role = fixture.commanderRole || "unknown";
  const issues = [];
  const commanderRewards = intent.commanderMechanics?.rewards || [];
  const commanderProduces = intent.commanderMechanics?.produces || [];

  // Commander that is only a payoff must not erase enabler requirements.
  // Enablers are cards that produce a signal the commander rewards, OR
  // package-core cards for an active package the commander is built around.
  // Counting "any vaguely related card" is not enough; counting only graph
  // edges also fails when the package catalog is the real structural contract.
  if (role === "payoff_only") {
    const signalEnablers = rows.some((row) => (row.mechanics?.produces || []).some((signal) =>
      commanderRewards.includes(signal)));
    const packageEnablers = (intent.packages || []).some((pkg) =>
      rows.some((row) => {
        const semantics = row.strategicSemantics;
        if (semantics?.has && (pkg.coreSemantics || []).some((tag) => semantics.has(tag))) return true;
        return false;
      }));
    if (!signalEnablers && !packageEnablers) issues.push("payoff_commander_missing_enablers_in_99");
  }
  // Commander that is only an enabler must not erase payoff requirements.
  if (role === "enabler_only") {
    const signalPayoffs = rows.some((row) => (row.mechanics?.rewards || []).some((signal) =>
      commanderProduces.includes(signal)));
    const packagePayoffs = (intent.packages || []).some((pkg) =>
      rows.some((row) => {
        const semantics = row.strategicSemantics;
        if (!semantics?.has) return false;
        return (pkg.supportSemantics || []).some((tag) => semantics.has(tag));
      }));
    if (!signalPayoffs && !packagePayoffs) issues.push("enabler_commander_missing_payoffs_in_99");
  }

  // Connection floor is soft when package cores OR support legs are already
  // dense — graph wiring can lag subtype packages, and enabler-commanders
  // often put density in support (ETB bodies) rather than extra enablers.
  const packageDense = (intent.packages || []).some((pkg) => {
    const core = rows.filter((row) => row.strategicSemantics?.has
      && (pkg.coreSemantics || []).some((tag) => row.strategicSemantics.has(tag))).length;
    const support = rows.filter((row) => row.strategicSemantics?.has
      && (pkg.supportSemantics || []).some((tag) => row.strategicSemantics.has(tag))).length;
    return core >= Math.min(8, pkg.coreMin || 8)
      || support >= Math.min(8, pkg.supportMin || 8);
  });
  const minConnections = fixture.minCommanderConnections ?? 4;
  if (connected < minConnections && !packageDense) {
    issues.push(`commander_connections_${connected}_below_${minConnections}`);
  }

  return Object.freeze({
    role,
    connected,
    issues: Object.freeze(issues),
    passed: issues.length === 0,
  });
}

function packageStructure(candidate, intent) {
  const packages = [];
  const issues = [];
  for (const packageSpec of intent.packages || []) {
    const state = buildPackageState(candidate.rows, packageSpec, intent);
    const health = evaluatePackageHealth(state, intent);
    packages.push(Object.freeze({ id: packageSpec.id, health, density: state.density, legs: state.legs }));
    if (health.status === "unhealthy") issues.push(`${packageSpec.id}:${health.issues.map((entry) => entry.kind).join(",")}`);
    if (state.falseFriends.length && state.density.deficit > 0) {
      issues.push(`${packageSpec.id}:false_friend_mask`);
    }
  }
  return Object.freeze({
    packages: Object.freeze(packages),
    issues: Object.freeze(issues),
    passed: issues.length === 0,
  });
}

function justificationQuality(candidate) {
  const ledger = candidate.slotJustificationLedger;
  const critique = ledger?.critique || {};
  const slots = ledger?.slots || [];
  const strong = slots.filter((slot) => slot.strength >= 40).length;
  const ratio = slots.length ? strong / slots.length : 0;
  const issues = [];
  if (ratio < 0.45) issues.push(`strong_justification_ratio_${round(ratio)}`);
  if ((critique.weaklyJustified || []).length >= 12) issues.push(`weakly_justified_${critique.weaklyJustified.length}`);
  if ((critique.rawPowerDominant || []).length >= 3) issues.push(`raw_power_dominant_${critique.rawPowerDominant.length}`);
  if ((critique.underSupportedAnchors || []).length >= 2) issues.push(`unsupported_anchors_${critique.underSupportedAnchors.length}`);
  return Object.freeze({
    slotCount: slots.length,
    strongRatio: round(ratio),
    weaklyJustified: (critique.weaklyJustified || []).length,
    rawPowerDominant: (critique.rawPowerDominant || []).length,
    unsupportedAnchors: (critique.underSupportedAnchors || []).length,
    redundant: (critique.redundant || []).length,
    packageCritical: (critique.packageCritical || []).length,
    issues: Object.freeze(issues),
    passed: issues.length === 0,
  });
}

function curveMana(candidate, intent) {
  const rows = nonlands(candidate.rows || []);
  const high = rows.filter((row) => Number(row.cmc) >= 6).length;
  const bombs = [];
  for (const row of rows) {
    const support = expensiveThreatSupport(row, candidate.rows, intent);
    if (support.needsSupport && support.isBomb && !support.supported) bombs.push(row.name);
  }
  const issues = [];
  if (high >= Math.max(10, Math.ceil(rows.length * 0.28))) issues.push(`high_cmc_concentration_${high}`);
  if (bombs.length) issues.push(`unsupported_bombs_${bombs.length}`);
  return Object.freeze({
    highCmcCount: high,
    unsupportedBombs: Object.freeze(bombs),
    issues: Object.freeze(issues),
    passed: issues.length === 0,
  });
}

function interactionStructure(candidate) {
  const rows = nonlands(candidate.rows || []);
  const produced = new Map();
  const rewarded = new Map();
  for (const row of rows) {
    for (const signal of row.mechanics?.produces || []) produced.set(signal, (produced.get(signal) || 0) + 1);
    for (const signal of row.mechanics?.rewards || []) rewarded.set(signal, (rewarded.get(signal) || 0) + 1);
  }
  const orphanRewards = [...rewarded.keys()].filter((signal) => !(produced.get(signal) > 0));
  const unusedProduces = [...produced.keys()].filter((signal) => !(rewarded.get(signal) > 0));
  let edges = 0;
  for (const [signal, count] of produced) edges += Math.min(count, rewarded.get(signal) || 0);
  const issues = [];
  if (orphanRewards.length >= 4) issues.push(`orphan_rewards_${orphanRewards.length}`);
  if (edges < 3 && rows.length > 40) issues.push(`thin_interaction_graph_${edges}`);
  return Object.freeze({
    edges,
    orphanRewards: Object.freeze(orphanRewards.slice(0, 12)),
    unusedProduces: Object.freeze(unusedProduces.slice(0, 12)),
    issues: Object.freeze(issues),
    passed: issues.length === 0,
  });
}

function classifyFailure(hardFailures = [], warnings = []) {
  const classes = [];
  const text = [...hardFailures, ...warnings].join(" | ").toLowerCase();
  const push = (name) => { if (!classes.includes(name)) classes.push(name); };
  if (/false_friend|semantic|aura|token_payoff|sacrifice_outlet|typal|tribe/.test(text)) push("semantic_misunderstanding");
  if (/package|leg|enabler|payoff|outlet/.test(text)) push("package_catalog_or_leg_gap");
  if (/commander_connections|payoff_commander|enabler_commander/.test(text)) push("commander_role_misunderstanding");
  if (/plan|prediction|underperformed/.test(text)) push("plan_generation_or_realization");
  if (/phase|prospective_overestimated|early_value_became_redundant/.test(text)) push("prospective_or_phase_failure");
  if (/orphan_rewards|interaction_graph|combo/.test(text)) push("interaction_graph_failure");
  if (/raw_power|bomb/.test(text)) push("raw_score_leakage");
  if (/high_cmc|curve/.test(text)) push("curve_failure");
  if (/cohesion/.test(text)) push("cohesion_gate_issue");
  if (/weakly_justified|strong_justification/.test(text)) push("justification_quality");
  if (!classes.length && hardFailures.length) push("unclassified_hard_failure");
  return Object.freeze(classes);
}

/**
 * Build a machine-readable torture scorecard for one forged candidate.
 */
export function buildTortureScorecard(report, fixture, options = {}) {
  const candidate = report.selected;
  const intent = candidate.strategicIntent || {};
  const started = options.startedAt || Date.now();
  const runtimeMs = options.runtimeMs ?? (Date.now() - started);

  const cohesionPassed = candidate.strategicCohesionGate?.passed !== false;
  const commander = commanderAlignment(candidate, fixture, intent);
  const packages = packageStructure(candidate, intent);
  const justification = justificationQuality(candidate);
  const curve = curveMana(candidate, intent);
  const interaction = interactionStructure(candidate);
  const disagreement = auditProspectiveRetrospectiveDisagreement(candidate, intent);
  const realization = candidate.strategicPlanRealization || null;

  const hardFailures = [];
  const warnings = [];
  if (!cohesionPassed) hardFailures.push("cohesion_failed");
  if (!commander.passed) hardFailures.push(...commander.issues);
  if (!packages.passed) hardFailures.push(...packages.issues);
  if (!justification.passed) {
    // Weak justification is a hard fail only when extreme; otherwise warning.
    if (justification.strongRatio < 0.35 || justification.rawPowerDominant >= 4) hardFailures.push(...justification.issues);
    else warnings.push(...justification.issues);
  }
  if (!curve.passed) hardFailures.push(...curve.issues);
  if (!interaction.passed) warnings.push(...interaction.issues);
  if (disagreement.warnings >= 8) warnings.push(`prospective_retrospective_warnings_${disagreement.warnings}`);
  if (realization?.underperformed) warnings.push("plan_realization_underperformed");

  // Fixture-specific structural expectations (not production special cases).
  for (const assertion of fixture.assertions || []) {
    const result = assertion.check(candidate, report, intent);
    if (result === true) continue;
    if (assertion.severity === "warning") warnings.push(result || assertion.id);
    else hardFailures.push(result || assertion.id);
  }

  const passed = hardFailures.length === 0;
  return Object.freeze({
    version: TORTURE_BENCH_VERSION,
    id: fixture.id,
    archetype: fixture.archetype,
    why: fixture.why,
    passed,
    hardFailures: Object.freeze([...new Set(hardFailures)]),
    warnings: Object.freeze([...new Set(warnings)]),
    failureClasses: classifyFailure(hardFailures, warnings),
    strategicCohesion: cohesionPassed,
    packageHealth: packages,
    justification,
    curve,
    commanderAlignment: commander,
    interaction,
    plan: Object.freeze({
      predicted: candidate.strategicPlanPrediction?.predictedScore ?? null,
      realized: realization?.realizedScore ?? null,
      gap: realization?.gap ?? null,
      underperformed: Boolean(realization?.underperformed),
    }),
    disagreement,
    construction: Object.freeze({
      finalPhase: candidate.constructionPhaseDiagnostics?.finalPhase || null,
      summary: candidate.constructionPhaseDiagnostics?.summary || null,
    }),
    runtimeMs,
  });
}

export function aggregateTortureResults(scorecards = []) {
  const byArchetype = {};
  const failureClassCounts = {};
  let pass = 0;
  const runtimes = [];
  for (const card of scorecards) {
    byArchetype[card.archetype] = card.passed ? "PASS" : (card.hardFailures.length >= 3 ? "DISASTER" : card.hardFailures.length ? "FAIL" : "PARTIAL");
    if (card.passed && card.warnings.length) byArchetype[card.archetype] = "PARTIAL";
    if (card.passed && !card.warnings.length) pass += 1;
    else if (card.passed) pass += 1;
    for (const cls of card.failureClasses || []) failureClassCounts[cls] = (failureClassCounts[cls] || 0) + 1;
    runtimes.push(card.runtimeMs);
  }
  runtimes.sort((a, b) => a - b);
  const median = runtimes.length ? runtimes[Math.floor(runtimes.length / 2)] : 0;
  const p95 = runtimes.length ? runtimes[Math.min(runtimes.length - 1, Math.floor(runtimes.length * 0.95))] : 0;
  return Object.freeze({
    total: scorecards.length,
    passed: pass,
    failed: scorecards.length - pass,
    byArchetype: Object.freeze(byArchetype),
    failureClassCounts: Object.freeze(failureClassCounts),
    runtime: Object.freeze({
      medianMs: median,
      p95Ms: p95,
      slowest: Object.freeze([...scorecards].sort((a, b) => b.runtimeMs - a.runtimeMs).slice(0, 5).map((card) => Object.freeze({ id: card.id, ms: card.runtimeMs }))),
    }),
  });
}
