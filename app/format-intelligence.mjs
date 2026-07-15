export const FORMAT_PROFILES = Object.freeze({
  Standard: { deckSize: 60, evidenceHalfLifeDays: 120, priorities: ["current legality", "rotation", "curve", "current field"] },
  Modern: { deckSize: 60, evidenceHalfLifeDays: 240, priorities: ["turn-three interaction", "mana efficiency", "hate resilience", "sideboard plan", "historical analogues"] },
  Commander: { deckSize: 100, evidenceHalfLifeDays: 540, priorities: ["commander identity", "pod power", "multiplayer scaling", "commander resilience", "redundancy", "social contract"] },
});

export const THEORY_STAGES = Object.freeze(["design-supported", "simulation-qualified", "personally-validated", "field-validated"]);

export function buildFormatContext(format, input = {}) {
  const profile = FORMAT_PROFILES[format] || FORMAT_PROFILES.Standard;
  if (format === "Commander") {
    const power = input.power || "unknown";
    const budget = input.budget || "unspecified";
    return { format, ...profile, power, budget, complete: power !== "unknown", warning: power === "unknown" ? "Choose the intended pod power before Forge ranks Commander upgrades." : null };
  }
  return { format, ...profile, complete: true, warning: null };
}

export function evaluateTheoryEvidence(theory, context, evidence = {}) {
  const failures = [];
  if (!theory.legal) failures.push("format legality failed");
  if (!theory.copyLimitsPass) failures.push("copy limits failed");
  if (!theory.roleFit) failures.push("the new card has no supported strategic role");
  if (!theory.supportCount || theory.supportCount < (theory.minimumSupport || 1)) failures.push("support density is below the theory minimum");
  if (!context.complete) failures.push(context.warning);
  if (context.format === "Modern" && !theory.earlyInteraction) failures.push("Modern early-interaction gate failed");
  if (context.format === "Commander" && theory.commanderDependent && !theory.commanderRecovery) failures.push("the plan collapses when the commander is removed");
  const stage = evidence.fieldMatches >= 30 ? "field-validated" : evidence.personalMatches >= 12 ? "personally-validated" : evidence.simulationPass ? "simulation-qualified" : "design-supported";
  return { stage, eligible: failures.length === 0, failures, priorities: context.priorities, warning: stage === "design-supported" ? "Card design supports a test hypothesis; it does not establish performance." : null };
}
